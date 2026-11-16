# 太仓讨论室接入与本轮测试范围

基于 #76 学校功能集成分支，合入 Claude #68（`0ea9b8a`）的页面和预览，并同步 main 的 #78。分支 `feat/taicang-rooms-integration`。

## 当前可用与限制

真实路由 `/services/rooms` 已接 Android `SchoolRooms` 插件：学校账号登录、读取太仓楼层、日期与空闲时段、读取本人预约、检查预约草稿。保留 Claude 的页面组件与设计 token。首页和 Services 新增直接进入 `/courses/sync` 的入口，Services 另有 Discussion rooms 入口。

**本轮按用户要求不提交真实预约。** 运行版本明确显示 Booking review only，表单按钮为 Check booking details；原生只开放 GET 查询及 prepare，不包含创建/取消预约 POST。prepared 只表示草稿通过检查，绝不显示成已预约。真实创建、取消和有记录时的订单位掩码映射仍需后续完成与验收；不能把本轮当作完整预约上线。

- 当前本人预约查询返回空列表。非空列表返回 UNSUPPORTED_RESERVATION_STATE 并显示读取失败，不猜测 CONFIRMED、不使用他人的订单验证取消。
- 学校要求至少两人。真实设备验证了选时、时长、组员表单及本人不能重复计数；完整有效多人草稿使用虚构响应的单元测试，未用未获授权的其他学生账号做查询。
- 冻结间隔为非零或同一楼层房间规则不一致时，显式报告未支持；不使用另一房间的规则推断。已取消记录（位 128）不占用，课程安排 cls 仍占用。

## 接口给 Claude

模块 `src/features/school-rooms/bridge.ts` 提供：

```ts
resumeRoomsSession(actorId);
readRoomFloors(actorId); // 当前登录学生可见的太仓菜单，不能硬编码 2F/3F
readRoomAvailability(actorId, date, floorId);
readRoomReservations(actorId);
prepareRoomBooking(actorId, { floorId, roomId, date, start, minutes, memberIds });
```

真实容器 `SchoolRoomsConnection` 已完成这些调用的顺序、状态与错误处理。`actorId` 由服务端 App session 传入；先确认原生作用域和学校会话，才读取房间。跨功能调用继续经过公共 index。

`SchoolAccountSignIn` / `restoreSchoolConnection` 的 service 新增 `rooms`。登录成功后将同一个私有业务 WebView 交给 SchoolRooms，保留该页面的 sessionStorage 与 axios 拦截器；不复制 token 给主界面或服务器。WebMessage 对象在文档创建时注入，所以接管后只重载同一 WebView，不清 sessionStorage；随后验证 `/auth/userInfo`，确认成功才显示已连接。

私有学校端 GET 使用官网 `$axios`，路径：

- `/auth/userInfo`：只向主界面返回 authenticated / 本人账号前缀。
- `/roomMenu`：从实时菜单选 Taicang / 太仓组及其 children。
- `/reserve`：sysKind=1、resvDates=yyyyMMdd、labIds=实时楼层 ID。只回传房间、规则和匿名占用区间，不回传其他预约者或凭证。
- `/account/getMembers`：按用户输入的校园账号前缀精确解析，内部 accNo 不跨桥；防止本人、重复成员及同一内部 ID 的别名重复计数。
- `/reserve/resvInfo`：当前用户今后 7 天的查询；空列表已验证，非空状态暂不映射。

HTTP 403 / 网关 HTML 为 GATEWAY_BLOCKED，认证失效为 AUTH_REQUIRED；不渲染成“房间满了”。真实 1F/2F/3F 已核对为 labId 2/10/11，各 6 间，仍以实时菜单为准。实际规则是 5 分钟步长、30–180 分钟、2–5 人、08:00–22:00、0–3 天；cancelTime=30 是迟到取消，不是“提前 30 分钟取消”。

组员输入由数字学号草案改为校园账号前缀（不含邮箱后缀）；保持展示组件，未另做 UI 设计。5 分钟步长导致选项比预览更密，后续可由 Claude 优化选时布局，勿改学校规则。

## 登录等待问题

用户报告手机 APK 的学校弹层一直停在 Signing in。MuMu 初次区间车登录使用授权学校账号成功；进一步测试讨论室网关，发现其使用 `sso.xjtlu.edu.cn`，并实际跳到 `sso-xjtlu-edu-cn-s.xjtlu.edu.cn`。原生未识别该认证路径，会拒绝跳转或无法识别登录状态。

已加入这两个**明确观察到的 HTTPS 学校域名**，保留精确域名、端口与页面路径检查；未开放通配域名、HTTP 或关闭 TLS 验证。认证适配器同时识别这些登录页，继续使用学校 RSA / WAF / 按需验证码，不重写密码协议。

- 提交账号密码/验证码后单次请求上限 45 秒，等待用户输入的原有总时限保留。超时清除表单并可重试，避免只靠长时间空转。
- 未支持跳转使用明确的 unsupported-redirect 提示，与普通网络错误区分。
- `readSchoolAuthDiagnostics()` 只返回本机最近错误码、被拦截域名和 scheme；不含账号、密码、完整 URL、票据或 cookie，不上传服务器。
- App 账号登录页也在提交时清空密码，避免 Next 隐藏缓存页面保留输入。它与学校账号登录仍是独立流程，学校密码不发给 `/api/auth/login`。
- **尚未直接验证用户的实体手机。** 已在 MuMu 复现并修复上述网关接续缺口；不能断言手机所有等待原因均已解决。真实验证码未自然触发，不以预览验收真实验证码。

## 已执行的设备验证（2026-11-16）

- MuMu Android 15 / WebView 110，私有 WebView 学校登录成功，密码输入清空。
- 太仓 1F、2F、3F 分别读取 6 间房；切换楼层、日期不再次输入密码。
- 冷启动复验：课表缓存可复用，但讨论室当前仍会要求学校登录。同进程私有 WebView 的业务会话可复用，跨进程恢复未通过。尝试的最小加密业务凭证缓存未解决学校网关接续，已撤回；不延长学校会话寿命，也不保存密码。
- 选次日 3F 房间 08:00–08:30，进入组员与规则表单。重复加入本人被阻止，原生调用次数为零；没有提交预约。
- 不同 App actor 的原生房间调用返回 ACCOUNT_SWITCH_REQUIRED。
- 已保存课表直接刷新成功；清除本机课表连接后，自动重新发现并保存，服务器 version 28 → 29 / count 7，没有 JSON 导入或重复密码。
- App 自身退出并用虚构 fixture 重新登录成功，之后仍能读取房间；发现隐藏登录页密码残留后加了提交清空及组件回归测试。
- 修复后再次实测 App 登录成功，包含隐藏页面在内，非空密码输入框数量为 0。
- Schedule 仍可读取已保存的学校课程；区间车复用已确认会话，实时查到当日太仓 → SIP 的 17:10 / 18:00 班次，本轮未预约或取消班车。
- `npm run check`：482 passed / 19 skipped；Web 构建及 Android debug 构建通过。真实图片验证码、实体手机和有效多人草稿尚未验收。
- MuMu 内首页、Services、讨论室、课表连接页按 375/768/1280px 与深浅主题共 24 个组合检查，无横向溢出或脚本异常；真实讨论室页面已截图。旧 WebView 下楼层/日期胶囊的深色文字对比仍请 Claude 结合截图复核，未另做视觉重构。
- 截图、最终全量检查与构建统计以本分支 PR 为准；测试截图在忽略的本机 .screenshots 中，不提交个人数据。

本轮没有改数据库、项目服务器认证或添加学校代理。继续沿用 #65/#71/#75 的课表事务保存、actor 隔离和会话策略；区间车写入、取消与动态码逻辑不重写。新增共享状态和入口需 Member 1 审查，App 登录表单也请 Member 2 审查。
