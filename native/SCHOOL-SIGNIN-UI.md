# 学校登录 UI 与原生桥整合

本分支 `feat/school-signin-integration` 合并 Claude [PR #70](https://github.com/AndsomeR1110/campus-helper/pull/70) 的 `1714453` 与 Codex [PR #71](https://github.com/AndsomeR1110/campus-helper/pull/71) 的 `a641228`，两者均依赖 #65。保留 Claude 的弹层、设计 token 和预览页；新增真实状态适配与课表/区间车入口接线。没有合并到 main，也没有提交预约。

## 当前真实入口

- `/courses/sync`：有快照时尝试原生 silent 刷新；需要登录或学校会话绑定到另一 App 账号时打开我们自己的 SchoolSignIn 弹层。服务器保存完成后更新活动数与同步时间。
- `/services/shuttle`：Connect school account 打开同一弹层；目标 session 回读成功后开放班次/预约列表查询。页面按服务器 App actor 设置 key，切换账号后重置旧查询、乘车码及表单状态。未确认连接前不查询残留私有会话。
- `/services/school-account/preview`：仍是明确标注、无入口、noindex 的开发预览；不接学校网络，不作为真实接口失败时的回退。

## 模块与类型

- `SchoolAccountSignIn`：已经接好 native facade 的容器，外部传入服务端 actorId、service、onClose、onConnected。应在打开时挂载、关闭时卸载；父页面用 App actor 作为 key。
- `SchoolSignIn`：Claude 的展示组件，仍接受展示状态和命令，可供开发预览使用。
- `session.ts`：将 NativeState 转换为展示状态，持有每次操作 UUID，处理重复提交、取消、过期回包和服务接续。密码仅为方法参数，不写入 session 字段。
- 公开 `SchoolAuthState` 仍指 #71 原生 DTO；展示联合类型以 `SchoolSignInState` 导出，避免将两套状态误当作同一协议。

| 原生状态                | 真实展示 / 行为                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| credentialsRequired     | 自有账号密码表单；SSO10121 显示未激活，其他拒绝显示通用错误；账号保留、密码清空                                   |
| imageRequired           | 学校图片与 4 位输入；直接使用 submitSchoolImageCode / refreshSchoolImage，不自行拼接口                            |
| interactiveRequired     | official-challenge：使用 #71 的学校滑块验证控件，用户主动点击后原生显示控件，保留原认证上下文                     |
| authenticated           | continuing；await completeSchoolConnection，课表必须服务器保存确认，区间车必须 session 回读确认后才进入 connected |
| ACCOUNT_SWITCH_REQUIRED | 展示切换提示；用户 ConfirmDialog 确认后才 disconnectSchoolAccount(actorId, true)，再开启新操作                    |

**自绘滑块及 offsetRatio 仍仅供开发预览。** 现有原生桥没有自绘拼图 DTO 或比例答案接口；真实流程不向它传比例，不伪造拼图数据，也不模拟答题。真实滑块使用 #71 已实现的官方控件。未知 MFA 仍没有通用官方整页兜底能力，不宣称已支持。

## 不应改动的边界

- 不绕过 session.ts 把展示命令直接当原生方法；不把 types.ts 当成上游学校协议。
- 不重写 RSA/WAF/CAPTCHA、eBridge 一次性导航、课表校验/教学周/事务保存或区间车写入/乘车码逻辑。
- 新 APK 的 SchoolTimetable.connect 会校验 native school_auth_scope 的 actor；不能在另一 App 账号下用 silent 刷新绕过连接确认。新 Web UI 应搭配本分支 APK，缺少 SchoolAuth 插件时不回退到旧整页窗口。
- 取消、卸载和 actor 切换会使旧操作失效，并用原 actor/UUID 取消原生认证。已经提交给服务器的保存无法由关闭弹层回滚，因此取消文案不承诺“从未保存”；成功仍只来自服务器确认。
- 密码交付后即从可见输入清空，包括同步适配错误；不会进入项目服务器、日志或持久存储。不会自动提交错误密码来触发验证码。
- 提交前切到后台也清空输入：容器同时订阅 document visibility 和原生 SchoolAuth stateChanged 生命周期信号，取消原 actor/UUID；返回前台后由用户重新开始。新增通知只含 active 布尔值，不含任何认证信息。
- 原生 operationEnded 通知携带原 actor/UUID 和固定错误码，用于清空等待输入时已经过期的表单；不等下一次提交才发现失效。控制器只接受当前句柄，旧操作通知不能影响新登录。

## 验证记录

2026-11-14 MuMu Android 15 真实界面回归：

- 清理本 App 学校连接后，从 `/courses/sync` 打开 Claude 弹层；取消关闭后仍保留 7 条课程和原版本。
- 再次通过弹层输入真实学校账号密码并提交，立即检查到可见密码框为空；弹层先显示正在获取课表，服务器保存到本机快照 version 14 / count 7 后才显示 Timetable connection ready。Done 成功关闭。
- 从 `/services/shuttle` 连接学校账号，无需重复密码；显示 Shuttle booking ready 后开放查询。通过真实日期选择器选择 2026-11-15，查询返回 2 个太仓出发班次、无可操作预约，无横向溢出或错误提示，没有点击 Book trip。
- 另一 actor 的 native silent connect 返回 ACCOUNT_SWITCH_REQUIRED，原快照仍为 7 条。此项验证新 APK 的所有权守卫，React 测试另行覆盖切换账号的表单清空与原操作取消。
- 最终 APK 中，在真实弹层输入未提交的虚构测试密码后按 Android Home，再返回 App；密码输入框已移除、弹层显示取消，服务器仍为原版本 / 7 条课程。没有向学校提交错误密码。
- controller / React 集成测试覆盖保存确认、账号保留、密码原样交付及立即清空、原 actor 取消、迟到回包、重复提交、主动断开的用户确认。全量测试与构建结果记录在整合 PR。
- 全量测试与最终构建统计见整合 PR；已有 notifications prerender-cookie 日志仍存在，不是本次新增。没有重跑需要数据库专用环境的旧集成测试。过期通知的输入清理由模拟原生事件的 React 测试覆盖，不宣称实际等待了完整 5 分钟。

真实验证码仍待学校自然触发后人工完成；预览中图片/自绘滑块通过不能作为真实验证码验收。MuMu 是 Android 模拟器，不宣称实体手机或真实上车扫码验证。
