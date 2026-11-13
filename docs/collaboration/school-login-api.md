# 学校账号自定义登录：接口交接给 Claude

核验日期：2026-11-14（Asia/Hong_Kong）。功能代码基线为 [PR #65](https://github.com/AndsomeR1110/campus-helper/pull/65)，分支 `feat/timetable-native-sync`，本次核验 HEAD `952dc33`。本文是接口调查与职责交接，没有实现或验证一套新的自定义登录器，也没有改 UI。

## 给 Claude 的任务正文

请为 Campus Helper 的学校账号连接提供与项目设计语言一致的账号、密码及按需验证码界面。用户不希望看到整张学校网页或浏览器式登录窗口。你负责 UI；本地 Codex 负责 Android 认证适配器、会话接续和 MuMu 回归。本文不规定视觉方案。

先阅读 PR #65 的 `native/TIMETABLE.md`、`native/README.md` 和公开 feature facade。PR #65 的学校登录仍使用内部官方 WebView；**不能把下面发现的上游接口当成项目已经实现的登录 API**。现有 `syncSchoolTimetable()` 和 `shuttle.login()` 均没有账号、密码或验证码参数。尚无供自定义表单调用的 `SchoolAuth` 插件。

本轮 UI 可以先围绕下述状态与事件完成明确标注的开发预览，真实模式必须等待 Codex 提供并验证公开认证 facade。不要在云端凭接口说明直接写新的学校登录协议或生产代理。需要的字段/事件请以契约变更清单交给 Codex；不要给旧函数强加参数后宣称完成接入。

## 已确认的学校上游入口

身份认证来源：[XJTLU Authentication Centre](https://uim.xjtlu.edu.cn/esc-sso/login)。入口页面使用 HTMLDesign SDK 和账号组件，不是普通 HTML form POST。

API 基础地址为 `https://uim.xjtlu.edu.cn/esc-sso`。下表均为**学校内部网页接口**，不是稳定开放 API，也不是 Campus Helper 的后端路由。

| 用途           | 方法及相对路径                                                  | 字段 / 处理                                                                           | 证据与限制                                                                           |
| -------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 登录策略、公钥 | `GET /api/v3/auth/policy`                                       | 响应 `data.login`、`data.config`、`data.param`；后者包含 `publicKey` 和 `publicKeyId` | 实测 HTTP 200，`code: "0"`，`webLocalAuth.status: "1"`，公钥及标识存在；不保存具体值 |
| 账号密码登录   | `POST /api/v3/auth/doLogin`                                     | JSON，见下一节                                                                        | 官方页面实际绑定的提交地址，提交结构和加密由公开脚本确认；本次没有发送真实密码请求   |
| 图片验证码     | `GET /api/v1/image/getRandcode?<cache-buster>`                  | 图片响应，显示给人输入；刷新重新请求                                                  | 实测 HTTP 200、`image/jpeg`；图片与登录必须属于同一学校会话                          |
| 滑块初始化     | `POST /api/v3/sliderCaptcha/init`                               | 官方 SDK 不提供业务 body；响应 `data` 包含 `sourceImage`、`newImage`、`Y`、`token`    | 使用空 JSON 实测 HTTP 200 及上述字段；图片为 base64 PNG，未保存挑战值                |
| 滑块校验       | `GET /api/v3/sliderCaptcha/check?X=<x>&Y=<y>&token=<challenge>` | 校验成功后读取响应 `data`，作为后续 `vcode`                                           | 方法、字段和后续使用由官方脚本确认；没有代解或提交滑块答案                           |

SDK 还列出 `/api/v3/auth/queryUserValid`，但本次账号组件未证明它是必经步骤；不要自行增加账号枚举、预检查或反复试错请求。短信登录、扫码、动态口令不在本轮账号密码流程中。

### 账号提交结构与密码处理

官方账号组件先读策略公钥，再构造如下 JSON（全为占位符）：

```json
{
  "authType": "webLocalAuth",
  "dataField": {
    "username": "<student account>",
    "password": "<RSA ciphertext encoded as base64>",
    "publicKeyId": "<current policy key id>"
  }
}
```

- 官方 helper 使用 JSEncrypt 风格 RSA 公钥加密；源码 padding 是 `00 02 <random nonzero bytes> 00 <message>`，即 PKCS#1 v1.5，不是 OAEP、AES、MD5 或密码哈希。输出 base64。公钥和 `publicKeyId` 每次从当前策略读取，不硬编码。
- 源码 helper 会把 `publicKeyId` 写入 `dataField`。官方源码存在加密失败回退原文行为；新适配器不应照抄该回退，公钥缺失或加密失败应停止提交并返回可重试错误。
- 官方输入约束：账号非空、最长 64；密码非空、最长 100。不要擅自 trim 密码，不自动补邮箱后缀。
- SDK 默认 `Content-Type: application/json; charset=utf-8`，并设置语言请求头；会话、动态请求签名和可能的浏览器标识应由官方运行时保留，不让 UI 拼装。
- 源码在特定环境可能增加 `extendField.mac` 等上下文；不要为这些值伪造固定内容。本文没有证明精简 JSON 脱离运行时也能完整登录。

### 按需验证码分支

官方 `loginEnd` handler 对以下错误码分流，普通提交时无需固定显示验证码：

| 学校错误码              | 官方行为                              | 再提交                                                                                                         |
| ----------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `SSO10023` / `SSO10093` | 打开图片验证码；当前组件为 4 个输入位 | 将用户输入文本放入 `dataField.vcode`，保留原登录上下文后再提交                                                 |
| `SSO10024` / `SSO10094` | 打开滑块拼图                          | 用户完成滑动，调用校验；将校验返回的值放入 `dataField.vcode` 再提交，不把初始 challenge token 当成最终通行凭据 |
| `SSO10121`              | 页面显示账号激活提示                  | 返回可解释的业务拒绝；不要循环自动重登                                                                         |

滑块 `X` 由显示坐标换算回源图像坐标并取整数，`Y` 使用服务端返回值；UI 缩放不能直接当成接口坐标。挑战、答案、通过值均限当前操作和当前学校会话，不上传项目服务器、不写日志、不加入 fixtures。验证码必须由学生本人完成。

其他错误保留上游错误码供原生层映射；没有核验的“密码错误/锁定”等具体码不要编造。网络超时不自动循环提交凭据。验证码刷新、失效、取消和重试都应作为独立状态处理。

### 成功后的接续

官方成功处理最终读取学校 JSON 的 `data.redirect` 并在学校浏览器上下文继续跳转。拿到 HTTP 200 不等于登录成功，收到跳转地址也不等于课表已经同步或区间车已经就绪。

必须从目标服务的官方入口发起认证，让现有流程保留 CAS/OIDC 的 service、state、PKCE 及一次性票据上下文。不要总是孤立打开 UIM 根地址后假定任意业务都会就绪；不要复制旧票据 URL、重复使用 eBridge 屏幕票据或手工编造 callback。

完成认证后继续复用 PR #65 的课表自动导航/抓取/保存，或区间车的登录后状态确认。学校会话仍归 Android 私有 WebView/native 管理，不能仅在另一个 HTTP 客户端拿到一份会话就认为原有插件能共享登录；跨 WebView/CookieManager 的接续需 Codex 实测。

## 自定义 UI 与认证引擎的边界

可以研究“我们自己的表单 + 私有学校 WebView 作为认证运行时”的接法：用户看到项目表单，原生层保留学校初始化、RSA、WAF 和重定向；图片验证码通过限界接口显示，复杂滑块必要时显示官方挑战控件。**这是待实现方向，不是已验证能力。** 如原生层暂不能安全承载某种挑战，应明确交回官方认证挑战，不伪造成功或跳过挑战。

UI 所需事件/状态清单（**待双方定型，不是现有 TS 类型/插件方法**）：

- 开始连接：目标服务（课表 / 区间车）和当前已认证 App actor；先判断原生可用性及现有学校会话。
- `preparing` → `credentialsRequired` → `submitting`。
- 按需 `imageChallengeRequired` / `sliderChallengeRequired`；提供刷新、提交、人为取消。
- `continuingService` → 目标服务确认后的 `connected`；课表仍需服务器保存成功才能显示 synced。
- 离线、会话过期、认证拒绝、挑战过期、不支持的验证方式、网络错误、取消；账号切换时取消在途操作并清空密码。
- 原生返回有限 DTO 和本次操作的不可解释句柄；不返回 Cookie、TGC、SESSION、OIDC code、enrollment hash、公私钥材料或完整重定向 URL。

纯网站运行时，本次以外站 Origin 请求策略接口，未返回 `Access-Control-Allow-Origin` / `Access-Control-Allow-Credentials`。因此没有证据支持让我们的 React 页面直接跨域调用；不要把原生可行性等同于 Web/PWA 可行性，也不要新增集中收集学校密码的 Next.js 代理。

密码只用于本次登录，不存 localStorage、数据库、环境文件、分析平台、console、HAR 或截图。用户输入学校密码的界面应说明学校账号用途，学校密码不能传给 Campus Helper 自身 `/api/auth/login`；项目登录和学校连接目前是两套身份。

## PR #65 中必须保留的逻辑

- `@/features/school-timetable` 的公开 facade、actor / stillActive 保护、版本冲突、服务端验证与原子快照保存；不要把学校密码加到学校快照 DTO。
- TimetablePlus 页内签名运行时、eBridge 一次性导航保护、精确教学周及当前学期限制、手动课程隔离。
- Android 受信来源和 HTTPS 主机限制、nonce/main-frame 校验、超时与取消、Keystore 加密设备连接缓存；不提供任意 URL / JS / Cookie 桥。
- 区间车的 CSRF、个人预约所有权核验、未知写入结果处理、取消确认，以及动态乘车码 TTL、前后台生命周期与防截图保护。
- 不重写项目账号登录、数据库模型、真实预约规则；不以假数据作为学校接口失败回退。

## 本次证据范围和待验证项

已核验：公开登录 HTML、SDK、账号组件和共享 loader 的提交、RSA、验证码及 redirect 源码；策略 GET、验证码图片 GET、滑块初始化 POST 和策略 CORS 响应。只输出结构与状态，没有保存真实密码、Cookie、挑战 token 或个人票据。

本次桌面浏览器控制遇到学校页面 load 超时及 renderer 无响应，已停止本次任务会话；以上接口证据来自学校公开页面/脚本和不带学校账号凭据的直接请求。**没有在本轮完成自定义表单真实登录、错误密码、触发验证码、滑块通过或 MuMu 新认证器端到端验证。** 不反复提交错误密码来制造验证码。

本地公开脚本调查文件在 `E:/ENT/school-services-review/login/`，不提交第三方整份脚本进仓库。Claude 可直接阅读以下原始来源复核（页面内容随学校部署改变）：

- [登录入口](https://uim.xjtlu.edu.cn/esc-sso/login)
- [HTMLDesign SDK](https://uim.xjtlu.edu.cn/snackbar/lib/html-design-sdk.js)
- [账号密码组件](https://uim.xjtlu.edu.cn/login/html-design-builtIn/accountPsw.js)
- [共享 loader / RSA 与验证码处理](https://uim.xjtlu.edu.cn/login/html-design-builtIn/loader.js)

后续验收由 Codex 负责：自定义表单首次登录、已有会话免输、两类验证码、取消与失效、切换 App 账号、冷启动、登录后自动课表保存、区间车接续，以及保证凭据不进入服务器和日志。UI 验收由 Claude 按项目规范完成。当前不把这些待验证项标记已完成。
