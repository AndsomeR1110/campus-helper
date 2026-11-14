# 学校会话复用：Claude 接线说明

后续 #74 新版页面的整合行为见 [新版页面说明](SCHOOL-PAGES-INTEGRATION.md)：自动恢复失效不直接弹表单，由用户点击登录；课表“忘记连接”与全局学校登出分开。

基于 PR #72 的 `feat/school-signin-integration`，本次功能分支为 `feat/school-session-reuse`。目标是减少有效连接下的重复登录和弹层，不保存学校密码，也不承诺永久登录。

## 当前行为

- 区间车页面进入时自动验证当前 App actor 的学校连接，成功后直接加载预约列表、开放查询，不显示登录或成功弹层。
- 课表连接页已有快照时自动刷新，优先使用 Android Keystore 加密、按 actor 隔离的课表凭证。服务器保存成功后才更新同步结果。
- 服务连接失效时尝试已有学校 SSO，只有确实需要用户认证时才进入自有登录表单。首次连接仍由用户主动发起。
- 已有连接的手动检查不再要求点击 Done。真正输入密码的流程保留 Claude 原有的成功反馈。
- 网络中断、学校服务不可用、超时不会自动变成密码提示；课表的临时网络/WAF/服务器错误不清除已加密保存的课表凭证。已确认认证失效或凭证内容无效时才重新发现连接。
- 学校 session cookie 仍遵守学校的有效期。CookieManager 在确认服务认证成功后 flush；不改 cookie 有效期、不保存密码、不自动重放密码。

## UI 应调用的接口

从 `@/features/school-auth` 使用：

```ts
const abort = new AbortController();
const result = await restoreSchoolConnection(
  actorId, // 来自当前服务端 App session
  "shuttle", // 或 "timetable"
  () => stillMounted,
  abort.signal,
);
// timetable: result.synced 是经过服务器保存确认的 SyncState。
// shuttle: 只确认连接；继续使用现有 shuttle 查询接口。
// 页面卸载/切换账号：abort.abort()，并使 stillMounted 为 false。
```

- `restoreSchoolConnection` 不展示表单：先校验 actor，再复用服务凭证，必要时静默联邦认证。`AUTH_REQUIRED` 才需要用户登录；`ACCOUNT_SWITCH_REQUIRED` 必须经过现有的明确断开确认；其他错误显示错误/重试。
- `SchoolAccountSignIn` 已包含复用检查。默认 `resumeFirst=true`；调用方若刚完成上述恢复并收到 AUTH_REQUIRED，可传 `resumeFirst={false}`，避免重复查询。其余 props 与 PR #72 相同。
- 区间车当前入口已接好自动恢复；不要再自行设置“每次进页都未登录”，或强制先打开弹层。
- 原生新增 `SchoolAuth.checkSessionScope({actorId})`、`SchoolAuth.begin({...operation, service, silent:true})`；`Shuttle.resumeSession` 现在必须传 `{actorId}`。前端统一通过 facade 调用，不在展示组件中直接调用原生方法。
- 新 Web 版本必须配套新 APK。旧 APK 缺少作用域检查时返回 NATIVE_UNAVAILABLE，提示更新，不回退到未隔离的旧会话。

## 不要重写

保留原有 RSA/WAF/验证码处理、一次性 eBridge 跳转、课表教学周与事务保存、actor 所有权守卫、取消/生命周期处理。区间车预约、取消和动态乘车码继续使用原接口；本次只自动恢复和读取，不自动重试任何预约/取消写操作。真实自绘滑块仍未实现，参见 [UI 接线文档](SCHOOL-SIGNIN-UI.md)。

## 2026-11-14 验证

- `npm run check`：424 passed / 19 skipped；`npm run build` 和 Android assembleDebug 成功。构建保留既有 notifications prerender-cookie 和 lost-found tracing 诊断。
- MuMu Android 15：昨天的区间车连接已无法恢复；通过自有表单完成一次必要登录，密码交付后清空。
- 随后进入课表页自动保存 7 条活动；返回区间车自动连接，无密码框、无成功弹层。
- `am force-stop` 后重新启动 App，区间车自动恢复，手动 Check school connection 静默完成；查询 2026-11-15 返回 2 个太仓出发班次。没有提交真实预约或取消。
- 冷启动后进入课表页，服务器确认快照 version 17 / count 7，无重复登录、无活动数量膨胀。
- 另一测试 actor 的原生 scope 检查和区间车 resume 均返回 ACCOUNT_SWITCH_REQUIRED。
- 单元/组件测试另覆盖网络错误不转认证、旧 APK 拦截、已有连接无弹层、静默认证取消和 HTTP 状态映射。真实验证码未自然触发；未验证实体手机、设备重启或数天后的服务端有效期。截图保存在本机 `.screenshots/session-reuse-mumu.png`，不提交个人测试数据。

首次安装、学校主动使会话失效、清除 App 数据、用户明确断开或切换绑定账号，仍可能需要重新认证。可支持的便利程度以学校会话有效期和现场恢复结果为准。
