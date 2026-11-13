# Android 自定义学校登录桥：Claude 接口交接

2026-11-14。依赖 [PR #65](https://github.com/AndsomeR1110/campus-helper/pull/65) 的 Android 壳、课表与区间车插件。原生桥来自 #71；当前 `feat/school-signin-integration` 已接入 Claude #70 的真实弹层与两个业务入口，见 [SCHOOL-SIGNIN-UI.md](SCHOOL-SIGNIN-UI.md)。下面保留原生 facade 契约及其独立验证记录。

## Claude 应调用的接口

统一从 `@/features/school-auth` 导入，不能从 React 直接调用学校 API，不能把学校密码传到项目 `/api/auth/login`。

```ts
schoolAuthAvailable(): boolean
beginSchoolAuth(actorId, service, operationId?): Promise<SchoolAuthState>
submitSchoolCredentials(state, username, password): Promise<SchoolAuthState>
submitSchoolImageCode(state, answer): Promise<SchoolAuthState>
refreshSchoolImage(state): Promise<SchoolAuthState>
showSchoolChallenge(state): Promise<SchoolAuthState>
cancelSchoolAuth({ actorId, operationId }): Promise<void>
completeSchoolConnection(state, stillActive?): Promise<{
  service: "timetable" | "shuttle";
  synced?: { version: number; syncedAt: string | null; term: string | null; count: number };
}>
disconnectSchoolAccount(actorId, true): Promise<void>
schoolAuthError(errorOrCode): string
onSchoolAuthActivity(listener): Promise<PluginListenerHandle>
onSchoolAuthEnd(listener): Promise<PluginListenerHandle>
```

`service` 为 `"timetable" | "shuttle"`。`actorId` 必须来自服务端当前 App 用户，不能用学校账号字符串替代。`operationId` 为 UUID；建议 UI 在开始前生成并传入，以便等待 `beginSchoolAuth` 时也能取消。所有后续动作都必须使用原生返回的同一操作/账号状态，不允许并行提交或自动循环重试密码。

```ts
type SchoolAuthState = {
  actorId: string;
  operationId: string;
  service: "timetable" | "shuttle";
  status: "credentialsRequired" | "imageRequired" | "interactiveRequired" | "authenticated";
  errorCode?: string;
  image?: string; // 当前图片验证码 data:image/png;base64,...，不可持久化
};
```

状态由原生 DTO 白名单和客户端 strict schema 双重限制；Cookie、学校 token、重定向 URL 和加密请求 payload 不进入这个契约。`begin`/提交 Promise 等待下一步需要 UI 的状态，内部 preparing/submitting/跳转期间由 UI 持有 loading；一次操作总期限 5 分钟。回到后台会取消，恢复后重新 begin。

整合 UI 的 SchoolAccountSignIn 已负责订阅并释放两个通知：activity 为 `{ active: boolean }`，operationEnded 为 `{ actorId, operationId, code }`。后者用于在用户尚未提交输入时直接处理原生过期/失败，必须按原 actor/UUID 过滤旧通知，不含认证凭据。

## UI 接线顺序

1. 检查 `schoolAuthAvailable()`、离线状态和当前 actor，生成 `operationId = crypto.randomUUID()`；调用 begin。新 APK 缺少插件或普通浏览器不具备建立连接的能力。
2. `credentialsRequired` 显示自己的账号/密码输入；若存在 `errorCode`，用 `schoolAuthError(state.errorCode)` 显示拒绝信息。提交后立即清空 UI 密码状态；不要将其放入 URL、localStorage、全局 store、日志或分析事件。
3. `imageRequired` 用 `state.image` 显示验证码，收集 4 位大小写敏感字母/数字后调用 submitImageCode；刷新只调用 refreshSchoolImage。不要自己获取/缓存学校图片 URL，也不要保存答案。
4. `interactiveRequired` 表示学校滑块验证，调用 showSchoolChallenge。它只显示学校的验证控件及取消按钮，学生亲自完成滑动；不显示完整登录页，不自动解题。原生保留 challenge token、坐标和通过值，Claude 不实现滑块协议。该 Promise 完成后继续处理返回状态。
5. **`authenticated` 仅说明目标学校页面已确认登录**；接着 await completeSchoolConnection(state, stillActive)。课表会调用原有同步 facade（silent 模式），抓取并保存当前 App 用户快照；返回 synced 后才显示同步成功。区间车会重载私有运行时并进行 session 回读；完成后才显示服务已连接，之后复用原区间车查询/预约/取消/乘车码逻辑。
6. 操作取消、页面卸载、App 用户切换时使用原 actor/operationId 调用 cancelSchoolAuth，并确保 stillActive 为 false，忽略过期回包。不要在 effect cleanup 中读取已变更的新 actor 来取消旧操作。

在 begin 仍未返回时取消的示意（仅为流程，不规定 UI）：

```ts
const operation = { actorId, operationId: crypto.randomUUID() };
const next = beginSchoolAuth(actorId, "timetable", operation.operationId);
// Cancel / unmount: mark stillActive false, then cancelSchoolAuth(operation).
// Await next, render the returned state, and complete only while stillActive.
```

必须保留加载、网络失败、用户取消、操作过期、认证拒绝、按需图片/滑块、无法使用原生能力、账号切换及服务接续失败状态。凭据提交失败不自动重试；连接失败也不能显示假课程/假预约。不要将 UI 中的 authenticated 等同于 App 登录或预约成功。

## 断开与账号切换

`disconnectSchoolAccount(actorId, true)` 必须先经 UI ConfirmDialog 确认；参数 true 是确认标记。它清理本 App WebView 中已知学校域名/路径的 Cookie、原生学校 actor 绑定、该设备相关课表连接缓存，并让区间车运行时失效。**不删除已保存课程，也不退出 Campus Helper 自身账号；不影响外部 Chrome 的学校登录。** 普通页面关闭不应调用它。

开始首个学校请求前即持久绑定 App actor；取消/失败不解除绑定，因为已经发送的登录请求仍可能产生学校 Cookie。已有原生学校会话绑定到另一 App actor 时，新 begin 返回 `ACCOUNT_SWITCH_REQUIRED`，不能静默复用；用户可以确认断开后再为当前账号连接。学校自身会话/策略可随时失效；冷启动不保证学校 SSO 的 session cookie 永久存在，课表既有的 Keystore 快照连接缓存仍按 PR #65 工作。

旧 `forgetSchoolConnection(actorId)` 仍只清除设备课表缓存，不等于退出学校账号。旧 `shuttle.login()` / `syncSchoolTimetable()` 仍可用于已有页面的兼容路径；Claude 的新自定义登录主流程使用本 facade，无需复制旧官方窗口。

## 原生行为和禁止重写的逻辑

- SchoolAuth 私有 WebView 从所选业务入口开始，自动点击实见 SSO 入口。账号和密码只注入精确 UIM HTTPS 登录文档，由原有学校输入组件及 SDK 完成 RSA、WAF、验证码与 service/state/PKCE 跳转。SDK 的明文加密回退被请求拦截器阻止。
- 原生只允许固定学校主机与 HTTPS，校验 App 精确来源、actor 和操作 UUID，隔离过期文档回调；SSL 错误终止。没有任意 URL、JavaScript、Cookie 查询或代理接口。
- 密码不持久化；提交后从原生 PluginCall 数据移除。学校组件在本次私有文档中的临时认证上下文随成功、取消、超时或后台切换销毁；关闭私有 WebView 表单保存/自动填充，并消费学校 SDK 控制台输出，避免登录响应进入应用日志。登录期间 App 窗口禁止截图。
- 图片答案通过学校实际控件逐字符触发；保留独立事件任务，避免官方延迟检查导致同一答案提交四次。滑块沿用官方控件，不给客户端返回 token 或坐标答案。
- 成功认证课表后清除当前 actor 的旧设备连接，再从当前学校会话重新发现课表，防止同一 App 账号更换学校账号后误用旧 hash；服务器旧快照在新保存成功前保留。
- `completeSchoolConnection` 沿用 actor / stillActive / 乐观版本保护及校验。silent 课表模式若又进入 SSO 会返回 AUTH_REQUIRED，不偷偷弹回整张官方登录页。
- 区间车首次 resume 只加载一次学校入口，使用既有 session adapter 确认。不要恢复双重 loadUrl；此前会中断首次页内请求造成超时。
- 课表教学周、学期限制、保存事务、手工课程隔离，以及区间车 CSRF、所有权、未知结果、确认写入、动态码 TTL/前后台/防截图逻辑均不重写。

## 验证与限制

最终 debug APK 已在 MuMu Android 15 完成以下回归（2026-11-14，Asia/Hong_Kong）：

- 通过当前源码 facade 的临时测试 harness 在 App 主 WebView 调用新桥；真实账号密码经学校 SDK 提交后返回 authenticated，未显示整张官方登录页面。最终 UI 按钮/布局未实现，也不作为本轮验收结论。
- 区间车新建私有运行时的首次 resume 成功，读取 2 个 2026-11-15 太仓出发班次；可操作预约列表为 0。没有新增预约或取消真实预约。
- 同一进程的学校会话随后完成 timetable begin，无需再输入密码；silent 接续自动抓取并保存 7 条学校课程。最终 APK 的真实密码→课表保存→区间车班次回读再次成功，本地测试账号快照 version 13。版本号是本机测试记录，不是 UI 固定值。已有单个业务 Cookie 可复用不代表 UIM 联邦会话仍有效；每个目标服务的 begin 均以实际状态为准。
- begin 未返回时使用预先生成的操作 UUID 取消，Promise 返回 CANCELLED，已保存 7 条课程及当时版本保持不变；切后台也返回 CANCELLED。
- 另一 App actor 的 begin 返回 ACCOUNT_SWITCH_REQUIRED；确认 disconnect 后仍能读取当前 App 已保存课表（HTTP 200），随后再次进入 credentialsRequired 并成功重新登录。
- 取消中途登录后切换 actor 的回归先复现了错误放行；将绑定提前到首个请求前持久写入后，最终 APK 返回 ACCOUNT_SWITCH_REQUIRED。普通取消不会解除学校会话的 actor 绑定。
- 全量 npm run check 通过：393 tests passed / 19 skipped；其中本轮认证新增 17 项测试。跳过项包括既有数据库环境依赖测试，本轮不宣称重新跑过数据库集成验证。npm run build 与 Android debug build 均成功；本机使用单 worker 控制内存，既有 notifications prerender-cookie 日志仍存在。

**真实登录本轮没有触发验证码。** 图片/滑块分流、异步挑战渲染、图片逐字符单次提交、密码加密回退阻断及跨来源/过期状态由源码核验和单元测试覆盖；未实际完成一次服务端要求的图片答案或人手滑块通过。遇到真实挑战时仍需学生完成，并补充真验证码回归，不能标为“已实测全通过”。

上游可能新增 MFA 或改变 HTML/SDK；未知验证方式当前没有自定义处理。图片码为目前学校组件的 4 位约束；滑块通过官方控件。Web/PWA 不能直接跨域建立学校连接。没有新增数据库迁移，没有重新提交真实预约。

## 参考

- [Capacitor Android plugin lifecycle](https://capacitorjs.com/docs/plugins/android)
- [Android CookieManager](https://developer.android.com/reference/android/webkit/CookieManager)
- [学校登录页](https://uim.xjtlu.edu.cn/esc-sso/login)
- [学校 SDK](https://uim.xjtlu.edu.cn/snackbar/lib/html-design-sdk.js)
- [学校账号组件](https://uim.xjtlu.edu.cn/login/html-design-builtIn/accountPsw.js)
- [学校共享 loader](https://uim.xjtlu.edu.cn/login/html-design-builtIn/loader.js)
