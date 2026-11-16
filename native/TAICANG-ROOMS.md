# 太仓讨论室：Android 接口与验收交接

更新：2026-11-16，PR #79，分支 `feat/taicang-rooms-integration`。沿用 #68 的页面与组件；UI 设计仍由 Claude 负责。

## 当前功能

- 学校账号登录、太仓实时楼层/房间/占用、本人预约记录、预约前检查。
- 已实现预约和取消写接口、服务器结果核对、未知结果保护。**没有向学校提交真实预约或取消。** 写路径通过单元测试和 MuMu 原生桥的网络拦截响应验证，不能据此宣称真实预约已验收。
- 默认构建关闭真实写入，显示 Booking review only；普通网页或客户端参数不能打开原生写入开关。
- 开启 `roomsWritesEnabled=true` 的受控构建才允许预约/取消。现有容器读取 capabilities，沿用 #68 的预约表单、确认框与状态展示；没有新做视觉界面。
- Home 和 Services 保留直接进入 `/courses/sync` 的入口。

## Claude 应使用的接口

跨模块统一从 `@/features/school-rooms` 导入；本模块内可用 `bridge.ts`。真实容器 `SchoolRoomsConnection` 已接好顺序与错误处理，勿在 UI 重写学校请求、token、重试或 actor 逻辑。

```ts
readRoomsCapabilities(); // { writesEnabled: boolean }，默认 false
resumeRoomsSession(actorId);
readRoomFloors(actorId);
readRoomAvailability(actorId, date, floorId);
readRoomReservations(actorId); // { reservations, unsupportedCount }
prepareRoomBooking(actorId, { floorId, roomId, date, start, minutes, memberIds });
bookRoom(actorId, draft, { confirmed: true });
cancelRoom(actorId, reservationId, { confirmed: true });
readPendingRoomWrite(actorId); // { pending: boolean }
reconcileRoomWrite(actorId); // 只读；不提交或重试
```

- `actorId` 来自服务器 App session，原生在任何学校访问前检查绑定作用域；不能使用残留会话读取另一 App 账号的数据。
- `memberIds` 是其他成员的校园账号前缀，不含邮箱后缀；包含本人、重复前缀或内部 ID 别名都被阻止。账号解析只在私有学校页面执行；accNo、token、cookie 不返回主 WebView 或项目服务器。
- `bookRoom` 只有在学校确认且本人记录精确匹配房间、日期、起止、申请人和成员集合后，才返回 `confirmed` / `awaiting` 及脱敏 reservation。只有 POST 成功回执而没有匹配记录时仍返回 `unknown`。
- `cancelRoom` 先重新读取本人记录，验证申请人及学校可取消条件，再发送取消；返回 `cancelled` / `unknown` / `rejected`。UI 必须保留现有 ConfirmDialog。
- `reconcileRoomWrite` 返回 `confirmed` / `awaiting` / `unknown` / `none` / `not-active`。`not-active` 只表示不再有相应活动记录或时段已过，**不能展示成“已取消”**。
- `prepared` 只表示检查完成，不是预约成功。`unknown` 不等于失败，也不能重新发送同一个草稿。

## 写入与结果未知

原生方法只允许固定操作；book/cancel 同时要求构建开关、明确确认和 UUID。提交前把待确认操作与草稿加密落盘；保存失败则不发送请求。超时、进入后台或进程被杀时保留记录；同一 App actor 的后续写入被 `RESULT_UNKNOWN` 阻止。

恢复页面先读取并核对待确认记录；核对只 GET。精确匹配到本人记录才确认预约；取消记录消失/结束时只报告 not-active。记录缺失但预约时段未过时保持 unknown；不能把暂时没有查到当成失败再预约。列表达到分页上限时报告 INCOMPLETE_RESERVATIONS，不据此推断记录不存在。断开学校账号不会删除未知写入记录。

当前本机测试 APK 关闭真实写入。受控拦截测试的构建命令：

```powershell
$env:ORG_GRADLE_PROJECT_roomsWritesEnabled='true'
npm run native:android
# 必须在拦截已安装的测试环境内调用写接口；不要用真实预约验收。
```

测试结束后清除该环境变量并重新构建、安装默认版本。开关应由构建流程控制，不能由网页、桥接 input 或 UI 设置开启。

## 学校端接口依据

2026-11-16 从实际运行的学校 mobile/chunk bundle 中核对了官方 API、预约 payload、取消按钮条件及状态位。所有请求在私有 `roombookings.xjtlu.edu.cn` WebView 使用学校 `$axios` 的 token/lan 拦截器；没有添加项目服务器代理。

- GET `/auth/userInfo`：验证业务会话。
- GET `/roomMenu`：提取 Taicang / 太仓菜单，不能硬编码楼层 ID。
- GET `/reserve`：sysKind=1、resvDates=yyyyMMdd、labIds=实时楼层；只回传房间与匿名占用区间。
- GET `/account/getMembers`：key=校园账号前缀，精确匹配，过滤失效成员。
- GET `/reserve/resvInfo`：本人记录；按日期查询，page=1/pageNum=100，上限时拒绝推断完整性。
- POST `/reserve`：JSON 体包含 sysKind=1、appAccNo=当前学生、memberKind=2、resvBeginTime/resvEndTime（学校本地时间）、resvDev=[房间 ID]、resvMember=[本人及已解析成员]、resvKind=2、resvProperty=0，以及官网的空 captcha/appUrl/memo/testName/addServices 字段。
- POST `/reserve/delete`：JSON `{ uuid }`。不能使用 endAhaed 等“提前结束”接口代替取消。

仅处理实时太仓菜单中的单间讨论室记录。8192/256 表示等待成员同意/审核；2/4/1024 的已识别组合映射 confirmed。128 是结束状态，不能一概称作 cancelled；拒绝、违约及未支持的组合不映射成功，通过 unsupportedCount 明示。取消条件沿用官网：当前学生为申请人，且没有 4 / 128 状态位。内部成员信息只转成 You / Group member 标签，不暴露姓名或完整账号。

如出现额外预约验证码、必填主题、说明或附件要求，写入前返回 UNSUPPORTED_ROOM_RULES，不跳过学校验证。真实预约验证码接入仍待后续完成。当前校方配置 resvCode=0。

规则仍来自学校：当前 5 分钟步长、30–180 分钟、2–5 人、08:00–22:00、0–3 天。cancelTime=30 指迟到取消，不是“提前 30 分钟取消”。冻结间隔非零、不同房间规则不一致等情况明确报未支持。5 分钟选项较密，选时布局与旧 WebView 深色胶囊文字对比请 Claude 优化，勿改变规则。

## 冷启动与登录

旧问题同时涉及业务 sessionStorage 和网关 cookie，仅恢复 token 不够。现在原生通过 AndroidKeyStore AES-GCM 保存最小业务 profile 与**仅房间站点可见**的 cookie 快照，AAD 绑定 App actor，固定最长 8 小时；相同 token 的读取不会续期。本地过期、解密失败或学校认证拒绝后失效，没有明文降级。

cookie 使用 [CookieManagerCompat.getCookieInfo](<https://developer.android.com/reference/androidx/webkit/CookieManagerCompat#getCookieInfo(android.webkit.CookieManager,java.lang.String)>) 获取原属性，保留 Domain/Path/Secure/HttpOnly/SameSite/Expires；去除会重新计时的 Max-Age，没有绝对到期时间的相对期限 cookie 不猜测恢复。旧 WebView 不支持此能力时不降级复制无属性 cookie。备份已由现有 Android manifest 禁用。

恢复先在可信的原生 bootstrap 中还原私有 sessionStorage，再打开学校 mobile 页面，避免官网路由先判未登录；不依赖老 WebView 没有的文档启动脚本能力。只有 GET `/auth/userInfo` 验证成功才算已连接。网关 403 可尝试一次静默联邦接续；网络错误不自动变成密码提示。服务器过期或撤销仍有效，本地缓存不能绕过。

明确断开会清除当前/旧 actor 的房间登录缓存、私有页面和学校 cookie；App 账号与已保存课程不受影响，未知写入仍保留以防重复。切换 App actor 必须走原有确认后断开流程。

学校登录识别实际观察到的 uim / sso / sso-xjtlu-edu-cn-s HTTPS 域名，继续使用学校 RSA/WAF/按需验证。提交上限 45 秒；本机诊断只返回错误码、受阻域名及恢复能力标志，不返回完整 URL、账号或凭证。没有直接测试用户的实体手机，不能断言所有 Signing in 等待原因都已解决。

## 本轮验证

- MuMu Android 15 / WebView 110：学校真实登录、读取太仓三层各 6 间房；真实 POST 为零。
- 加密缓存后多次强制停止/冷启动，学校 auth/userInfo 验证成功，未再次输入密码。
- 明确断开后房间缓存文件恢复为空、访问返回 AUTH_REQUIRED，App 账号保持登录；重新学校登录后查询恢复。不同 App actor 的调用仍被 ACCOUNT_SWITCH_REQUIRED 阻止。
- 写入开启的测试构建中，在私有 WebView 拦截全部网络请求，用虚构预约记录响应，真实原生桥跑通：响应丢失 → unknown → 重复写阻止 → GET 核对 awaiting → 取消 confirmed response → 他人/缺失预约拒绝。
- 模拟 unknown 后强制停止，重新打开仍 pending=true，同时业务会话恢复；拦截核对后 journal 清空。
- `scripts/test-rooms-native.mjs` 是上述设备拦截测试脚本；只针对已登录的本机测试 App。需要 ROOMS_TEST_ACTOR、ROOMS_TEST_ADB，并连接 9225 CDP；脚本退出前强制停止测试 App，再断开拦截，避免释放未完成的 POST。ROOM_QA_PHASE=leave/resume 可复验进程重启。
- 纯函数与 facade 测试覆盖身份、确认、输入、状态位、额外验证要求、未知结果、不重试与截断列表；Android 单元测试覆盖 cookie 属性及期限保存。
- 最终 `npm run check`：504 passed / 19 skipped；Android cookie 策略 5 项 JUnit 测试通过；Web 生产构建与 Android debug 构建通过。默认关闭真实写入的最新 APK 已用 install -r 安装到 MuMu。学校真实图片/滑块验证、实体手机、真实多人预约及取消仍未验收。

此前课表自动重新发现并保存 7 条课程、Schedule 展示及区间车班次查询已验证。本轮不重写课表事务保存、actor 隔离、区间车预约/取消/动态码，也不改数据库。
