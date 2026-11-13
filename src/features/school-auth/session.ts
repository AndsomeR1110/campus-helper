import type {
  SchoolAuthState as NativeState,
  SchoolService,
  SchoolAuthOperation,
  completeSchoolConnection,
  SchoolAuthEnd,
} from "./bridge";
import type { SchoolAuthState as ViewState, SchoolAuthError } from "./types";
export type ConnectionResult = Awaited<ReturnType<typeof completeSchoolConnection>>;
export interface SchoolAuthPort {
  begin(actor: string, service: SchoolService, id: string): Promise<NativeState>;
  credentials(state: NativeState, account: string, password: string): Promise<NativeState>;
  image(state: NativeState, code: string): Promise<NativeState>;
  refresh(state: NativeState): Promise<NativeState>;
  official(state: NativeState): Promise<NativeState>;
  cancel(operation: SchoolAuthOperation): Promise<void>;
  complete(state: NativeState, active: () => boolean): Promise<ConnectionResult>;
  disconnect(actor: string, confirmed: true): Promise<void>;
}
const codeOf = (error: unknown) =>
  error && typeof error === "object" && "code" in error
    ? String(error.code)
    : error instanceof Error
      ? error.message
      : "";
function failure(error: unknown): SchoolAuthError {
  switch (codeOf(error)) {
    case "ACCOUNT_SWITCH_REQUIRED":
      return { kind: "account-switch" };
    case "CHALLENGE_EXPIRED":
      return { kind: "challenge-expired" };
    case "TIMED_OUT":
    case "STALE_OPERATION":
    case "AUTH_REQUIRED":
      return { kind: "session-expired" };
    case "NATIVE_UNAVAILABLE":
    case "UPDATE_WEBVIEW":
      return { kind: "unavailable" };
    default:
      return { kind: "network" };
  }
}
/** Owns one sheet lifetime. Credentials are arguments only, never session state. */
export class SchoolSignInSession {
  private epoch = 0;
  private disposed = false;
  private working = false;
  private operation?: SchoolAuthOperation;
  private native?: NativeState;
  private account = "";
  constructor(
    private actor: string,
    private service: SchoolService,
    private port: SchoolAuthPort,
    private view: (state: ViewState) => void,
    private connected: (result: ConnectionResult) => void,
  ) {}
  private active = (token: number) => !this.disposed && this.epoch === token;
  async start() {
    if (this.disposed) return;
    const token = ++this.epoch;
    this.working = true;
    this.native = undefined;
    this.view({ step: "preparing" });
    const previous = this.operation;
    this.operation = undefined;
    if (previous) await this.port.cancel(previous).catch(() => {});
    if (!this.active(token)) return;
    const id = crypto.randomUUID();
    this.operation = { actorId: this.actor, operationId: id };
    try {
      await this.accept(await this.port.begin(this.actor, this.service, id), token);
    } catch (error) {
      this.reject(error, token);
    } finally {
      if (this.active(token)) this.working = false;
    }
  }
  private async accept(state: NativeState, token: number, imageAttempt = false) {
    if (!this.active(token)) return;
    this.native = state;
    switch (state.status) {
      case "credentialsRequired":
        this.view({
          step: "credentials",
          ...(this.account ? { account: this.account } : {}),
          ...(state.errorCode
            ? {
                error: {
                  kind: state.errorCode === "SSO10121" ? "not-activated" : "rejected",
                } as SchoolAuthError,
              }
            : {}),
        });
        break;
      case "imageRequired":
        this.view({
          step: "image-challenge",
          image: state.image!,
          length: 4,
          ...(imageAttempt ? { error: "wrong-code" as const } : {}),
        });
        break;
      case "interactiveRequired":
        this.view({ step: "official-challenge" });
        break;
      case "authenticated": {
        this.operation = undefined;
        this.view({ step: "continuing", service: this.service });
        const result = await this.port.complete(state, () => this.active(token));
        if (!this.active(token)) return;
        this.connected(result);
        this.view({ step: "connected", service: this.service });
      }
    }
  }
  private reject(error: unknown, token: number) {
    if (!this.active(token)) return;
    this.native = undefined;
    this.view(
      codeOf(error) === "CANCELLED"
        ? { step: "cancelled" }
        : { step: "failed", error: failure(error) },
    );
  }
  private async act(
    action: (state: NativeState) => Promise<NativeState>,
    kind: "credentials" | "image" | "refresh" | "official",
  ) {
    if (this.disposed || this.working || !this.native) return;
    this.working = true;
    const token = this.epoch,
      state = this.native;
    if (kind === "credentials") this.view({ step: "submitting" });
    else if (state.status === "imageRequired")
      this.view({ step: "image-challenge", image: state.image!, length: 4, busy: true });
    else this.view({ step: "official-challenge", busy: true });
    try {
      await this.accept(await action(state), token, kind === "image");
    } catch (error) {
      this.reject(error, token);
    } finally {
      if (this.active(token)) this.working = false;
    }
  }
  submitCredentials(account: string, password: string) {
    if (this.working || this.disposed) return Promise.resolve();
    this.account = account;
    return this.act((state) => this.port.credentials(state, account, password), "credentials");
  }
  submitImageCode(code: string) {
    return this.act((state) => this.port.image(state, code), "image");
  }
  refreshImage() {
    return this.act((state) => this.port.refresh(state), "refresh");
  }
  showOfficial() {
    return this.act((state) => this.port.official(state), "official");
  }
  async disconnectAndRetry() {
    if (this.disposed || this.working) return;
    const token = this.epoch;
    this.working = true;
    try {
      await this.port.disconnect(this.actor, true);
    } catch (error) {
      this.reject(error, token);
      return;
    } finally {
      if (this.active(token)) this.working = false;
    }
    if (this.active(token)) await this.start();
  }
  cancel() {
    ++this.epoch;
    this.working = false;
    this.native = undefined;
    this.account = "";
    const operation = this.operation;
    this.operation = undefined;
    if (operation) void this.port.cancel(operation).catch(() => {});
    if (!this.disposed) this.view({ step: "cancelled" });
  }
  operationEnded(event: SchoolAuthEnd) {
    if (
      this.disposed ||
      !this.operation ||
      event.operationId !== this.operation.operationId ||
      event.actorId !== this.actor
    )
      return;
    ++this.epoch;
    this.working = false;
    this.operation = undefined;
    this.reject({ code: event.code }, this.epoch);
  }
  dispose() {
    this.disposed = true;
    this.cancel();
  }
}
