// Private UIM document only. Preserve the school's RSA, WAF, CAPTCHA and redirect runtime.
type LoginSdk = {
  loginConfig?: { webLocalAuth?: { param?: { publicKey?: string; publicKeyId?: string } } };
  addEvent(name: string, listener: (event: { err?: { code?: string } }) => void): void;
  ajax: {
    axios: {
      interceptors: {
        request: {
          use(
            listener: (config: {
              url?: string;
              data?: { dataField?: { password?: string; publicKeyId?: string } };
            }) => unknown,
          ): void;
        };
      };
    };
  };
};
type AuthMemory = { revision: number; errorCode?: string; cancelled?: boolean };
const authWindow = () =>
  window as typeof window & {
    HTMLDesign?: { Sdk?: { $?: { sdk?: LoginSdk } } };
    __campusAuth?: AuthMemory;
  };
function authRuntime() {
  if (
    location.origin !== "https://uim.xjtlu.edu.cn" ||
    !/^\/esc-sso\/login(?:\/|$)/.test(location.pathname)
  )
    throw Error("INVALID_SCHOOL_PAGE");
  const w = authWindow();
  const sdk = w.HTMLDesign?.Sdk?.$?.sdk;
  if (!sdk) throw Error("NOT_READY");
  if (!w.__campusAuth) {
    const memory: AuthMemory = { revision: 0 };
    w.__campusAuth = memory;
    document.addEventListener(
      "click",
      (event) => {
        if (
          event.target instanceof Element &&
          event.target.closest(
            "#para-widget-dialog-box .slider-close,#para-widget-dialog-box .close-vcode",
          )
        )
          memory.cancelled = true;
      },
      true,
    );
    // The upstream helper has a plaintext fallback. Block it at the last request boundary.
    sdk.ajax.axios.interceptors.request.use((config) => {
      if (new URL(config.url || "", location.origin).pathname.endsWith("/api/v3/auth/doLogin")) {
        const fields = config.data?.dataField;
        if (
          !fields?.publicKeyId ||
          fields.publicKeyId !== sdk.loginConfig?.webLocalAuth?.param?.publicKeyId ||
          !fields.password ||
          !/^[A-Za-z0-9+/]{170,1024}={0,2}$/.test(fields.password)
        )
          throw Error("KEY_UNAVAILABLE");
      }
      return config;
    });
    sdk.addEvent("loginEnd", ({ err }) => {
      memory.revision++;
      memory.errorCode =
        err?.code && /^SSO\d{5}$/.test(err.code) ? err.code : err ? "AUTH_REJECTED" : undefined;
    });
  }
  return { sdk, memory: w.__campusAuth };
}
export function schoolAuthState() {
  const { memory } = authRuntime();
  if (memory.cancelled) return { status: "cancelled", revision: memory.revision };
  const slider = document.querySelector("#para-widget-dialog-box .para-widget-slider-captcha");
  if (slider) return { status: "interactiveRequired", revision: memory.revision };
  const image = document.querySelector<HTMLImageElement>(
    "#para-widget-dialog-box .vcode-box-content-img img",
  );
  if (image) {
    if (!image.complete || !image.naturalWidth)
      return { status: "preparing", revision: memory.revision };
    if (image.naturalWidth > 1200 || image.naturalHeight > 800) throw Error("INVALID_SCHOOL_DATA");
    // Only the current same-origin verification picture crosses the bridge, never its URL/token.
    const u = new URL(image.src);
    if (u.origin !== location.origin || u.pathname !== "/esc-sso/api/v1/image/getRandcode")
      throw Error("INVALID_SCHOOL_PAGE");
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d")!.drawImage(image, 0, 0);
    return {
      status: "imageRequired",
      revision: memory.revision,
      image: canvas.toDataURL("image/png"),
    };
  }
  if (memory.revision > 0 && !memory.errorCode)
    return { status: "preparing", revision: memory.revision };
  if (["SSO10023", "SSO10093", "SSO10024", "SSO10094"].includes(memory.errorCode || ""))
    return { status: "preparing", revision: memory.revision };
  if (
    !document.querySelector(".para-widget-account-psw__login-button") ||
    !document.querySelector(".para-widget-account-psw__input--psw input")
  )
    return { status: "preparing", revision: memory.revision };
  return {
    status: "credentialsRequired",
    revision: memory.revision,
    ...(memory.errorCode ? { errorCode: memory.errorCode } : {}),
  };
}
export function schoolAuthAction(action: string, input: Record<string, string>) {
  const { sdk } = authRuntime();
  const fill = (element: HTMLInputElement | null, value: string) => {
    if (!element) throw Error("NOT_READY");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  };
  if (action === "credentials") {
    const key = sdk.loginConfig?.webLocalAuth?.param;
    if (!key?.publicKey || !key.publicKeyId) throw Error("KEY_UNAVAILABLE");
    if (
      !input.username ||
      input.username.length > 64 ||
      !input.password ||
      input.password.length > 100
    )
      throw Error("INVALID_INPUT");
    if (document.querySelector("#para-widget-dialog-box")) throw Error("CHALLENGE_ACTIVE");
    fill(document.querySelector(".para-widget-account-psw__input--account input"), input.username);
    fill(document.querySelector(".para-widget-account-psw__input--psw input"), input.password);
    const button = document.querySelector<HTMLElement>(".para-widget-account-psw__login-button");
    if (!button) throw Error("NOT_READY");
    button.click();
    // The original component owns its temporary request/challenge context until navigation or cancel.
    return { ok: true };
  }
  if (action === "image" || action === "refreshImage") {
    const image = document.querySelector<HTMLImageElement>(
      "#para-widget-dialog-box .vcode-box-content-img img",
    );
    const inputs = [
      ...document.querySelectorAll<HTMLInputElement>(
        "#para-widget-dialog-box .vcode-box-content-input-box input",
      ),
    ];
    if (!image || inputs.length !== 4) throw Error("CHALLENGE_EXPIRED");
    if (action === "refreshImage") image.click();
    else {
      if (!/^[A-Za-z0-9]{4}$/.test(input.answer || "")) throw Error("INVALID_INPUT");
      inputs.forEach((element) => {
        element.value = "";
      });
      // The official handler defers its completeness check. Separate input tasks
      // prevent four queued checks from submitting the same challenge four times.
      inputs.forEach((element, i) => setTimeout(() => fill(element, input.answer[i]), i * 30));
    }
    return { ok: true };
  }
  if (action === "interactive") {
    if (!document.querySelector("#para-widget-dialog-box .para-widget-slider-captcha"))
      throw Error("CHALLENGE_EXPIRED");
    const style = document.createElement("style");
    style.textContent =
      "body *{visibility:hidden!important}#para-widget-dialog-box,#para-widget-dialog-box *{visibility:visible!important}#para-widget-dialog-box{position:fixed!important;inset:0!important}#para-widget-dialog-box .para-widget-dialog-content{padding-top:30px!important}";
    document.head.append(style);
    return { ok: true };
  }
  throw Error("INVALID_INPUT");
}
