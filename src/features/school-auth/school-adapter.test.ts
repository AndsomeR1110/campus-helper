import { afterEach, describe, expect, it, vi } from "vitest";
import { schoolAuthAction, schoolAuthState } from "./school-adapter";

const fixture = () => {
  vi.stubGlobal("location", new URL("https://uim.xjtlu.edu.cn/esc-sso/login/page"));
  document.body.innerHTML = `<div class="para-widget-account-psw__input--account"><input></div>
    <div class="para-widget-account-psw__input--psw"><input type="password"></div>
    <button class="para-widget-account-psw__login-button">Sign in</button>`;
  const events: Record<string, (data: unknown) => void> = {};
  const sdk = {
    loginConfig: { webLocalAuth: { param: { publicKey: "test-public", publicKeyId: "test-id" } } },
    addEvent: (name: string, cb: (data: unknown) => void) => (events[name] = cb),
    ajax: { axios: { interceptors: { request: { use: vi.fn() } } } },
  };
  Object.assign(window, { HTMLDesign: { Sdk: { $: { sdk } } } });
  return { sdk, events };
};
afterEach(() => {
  document.body.innerHTML = "";
  delete (window as unknown as Record<string, unknown>).__campusAuth;
  delete (window as unknown as Record<string, unknown>).HTMLDesign;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("AUTH native page boundary", () => {
  it("rejects credential submission on another origin without touching inputs", () => {
    fixture();
    vi.stubGlobal("location", new URL("https://example.org/"));
    expect(() =>
      schoolAuthAction("credentials", { username: "student", password: "secret" }),
    ).toThrow("INVALID_SCHOOL_PAGE");
    expect(document.querySelector("input")!.value).toBe("");
  });
  it("requires a current public key instead of falling back to plaintext", () => {
    const { sdk } = fixture();
    sdk.loginConfig.webLocalAuth.param.publicKey = "";
    expect(() =>
      schoolAuthAction("credentials", { username: "student", password: "secret" }),
    ).toThrow("KEY_UNAVAILABLE");
  });
  it("blocks the official helper's plaintext fallback at the request boundary", () => {
    const { sdk } = fixture();
    schoolAuthState();
    const intercept = sdk.ajax.axios.interceptors.request.use.mock.calls[0][0];
    expect(() =>
      intercept({
        url: "/api/v3/auth/doLogin",
        data: { dataField: { publicKeyId: "test-id", password: "plaintext" } },
      }),
    ).toThrow("KEY_UNAVAILABLE");
    const encrypted = {
      url: "/api/v3/auth/doLogin",
      data: { dataField: { publicKeyId: "test-id", password: "A".repeat(342) + "==" } },
    };
    expect(intercept(encrypted)).toBe(encrypted);
  });
  it("uses official input events and the official submit, returning no credentials", () => {
    fixture();
    schoolAuthState();
    const click = vi.spyOn(document.querySelector("button")!, "click");
    const input = vi.fn();
    document.querySelector('input[type="password"]')!.addEventListener("input", input);
    expect(schoolAuthAction("credentials", { username: "student", password: "secret" })).toEqual({
      ok: true,
    });
    expect(input).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(JSON.stringify(schoolAuthState())).not.toMatch(/secret|student|test-public|test-id/);
  });
  it("maps business rejection without leaking upstream messages or redirects", () => {
    const { events } = fixture();
    schoolAuthState();
    events.loginEnd({
      err: { code: "SSO10121", msg: "sensitive response" },
      data: { redirect: "private" },
    });
    expect(schoolAuthState()).toMatchObject({
      status: "credentialsRequired",
      errorCode: "SSO10121",
      revision: 1,
    });
    expect(JSON.stringify(schoolAuthState())).not.toMatch(/sensitive|private/);
  });
  it("waits for the service redirect after login success instead of requesting credentials again", () => {
    const { events } = fixture();
    schoolAuthState();
    events.loginEnd({ data: { redirect: "private" } });
    expect(schoolAuthState()).toMatchObject({ status: "preparing", revision: 1 });
  });
  it("waits for an asynchronously rendered CAPTCHA instead of reporting password rejection", () => {
    const { events } = fixture();
    schoolAuthState();
    events.loginEnd({ err: { code: "SSO10093" } });
    expect(schoolAuthState()).toMatchObject({ status: "preparing", revision: 1 });
  });
  it("does not accept image answers without an active official challenge", () => {
    fixture();
    expect(() => schoolAuthAction("image", { answer: "1234" })).toThrow("CHALLENGE_EXPIRED");
  });
  it("submits a four-character image answer only once through the official input handlers", async () => {
    vi.useFakeTimers();
    fixture();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div id="para-widget-dialog-box"><div class="vcode-box-content-img"><img></div><div class="vcode-box-content-input-box"><input><input><input><input></div></div>`,
    );
    const inputs = [
      ...document.querySelectorAll<HTMLInputElement>("#para-widget-dialog-box input"),
    ];
    const submitted = vi.fn();
    for (const element of inputs)
      element.addEventListener("input", () =>
        setTimeout(() => {
          if (inputs.every((input) => input.value)) submitted();
        }, 0),
      );
    schoolAuthAction("image", { answer: "A123" });
    await vi.runAllTimersAsync();
    expect(submitted).toHaveBeenCalledOnce();
  });
  it("returns an interactive challenge state for an official slider", () => {
    fixture();
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div id="para-widget-dialog-box"><div class="para-widget-slider-captcha"></div></div>',
    );
    expect(schoolAuthState()).toMatchObject({ status: "interactiveRequired" });
  });
});
