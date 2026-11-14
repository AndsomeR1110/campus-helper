# 新版页面与会话复用整合

分支：`feat/school-pages-session-integration`。包含 Claude PR #74 (`ae3bf63`，含 #66/#67 新版页面) 和 Codex PR #75 (`e9b1cc1`，会话复用)。保留 Claude 的布局、状态展示、预约/取消/乘车码交互；使用现有认证 facade，不另建学校登录接口。

## 已确认的交互

- 课表进页自动刷新：先复用加密课表连接，再尝试已有 SSO；AUTH_REQUIRED 或 ACCOUNT_SWITCH_REQUIRED 只显示 Needs attention / Sign in to refresh，用户点击后才打开登录表单。
- 区间车进页可以做作用域检查和静默会话恢复；必须成功确认当前 App actor 后才读 My trips，之后开放班次查询。恢复失败不打开密码框，用户点击 Connect / Reconnect 才进入登录。
- 因而与 #74 的“进页零原生调用”不同：现在允许只读连接恢复，但禁止确认连接前读取预约/班次。这是保留用户后续减少重复登录需求所必需的接线，不是恢复 #67 的无条件 trips 查询。
- 卸载页面取消静默认证，使用原 actor/operationId；UI 仍遵循服务器保存确认及学校写入结果，不自动重试预约/取消。

## 忘记连接与全局断开

课表页原按钮 Disconnect this device 实际只调用 `forgetSchoolConnection(actorId)`。它删除该 actor 在本机的加密课表凭证，不会清除学校 cookie、学校账号作用域、服务器快照、手动课程或 App 登录。

现在按钮和确认文案改为 **Forget saved timetable connection / Forget connection**，明确保留 university sign-in 和 shuttle connection。这里不增加 `disconnectSchoolAccount`，避免一次课表操作退出全部学校服务。会话有效时，下次刷新允许自动重新发现课表连接；不能把这一操作宣传成学校账号登出。

`disconnectSchoolAccount(actorId, true)` 仍只用于现有明确的全局断开确认（包括切换绑定的 App actor），由认证控制器负责。它会清理学校会话与作用域，影响课表和区间车；展示组件不能绕过确认调用。

## 测试与交接

- 新增组件测试覆盖自动失效不弹表单、点击才登录、网络错误不转认证、确认后仅忘记课表缓存、卸载取消、区间车确认前禁止读取、另一 actor 拦截及迟到回包。
- 全量 `npm run check`：454 passed / 19 skipped。`npm run build` 成功，保留既有 notifications prerender-cookie / lost-found tracing 诊断。没有修改 Android 源码，使用 #75 的已验证 APK。
- 2026-11-14 MuMu Android 15：模拟器重启后学校会话已失效，区间车显示 Reconnect，无密码框；只观察到作用域检查、resume 和静默认证，没有业务读取。
- 同一设备课表仍可使用加密凭证，自动保存 7 条，服务器 version 18。确认忘记课表连接后，只调用 SchoolTimetable.forgetConnection；服务器仍为 version 18 / count 7。
- 清缓存并重新进页：真实 Needs attention / Sign in to refresh，无密码框。用户点击后才显示自有表单；登录后先显示正在获取课表，服务器保存 version 19 / count 7 后显示成功。
- 随后进入区间车自动连接，没有重复密码或成功弹层。观察到 checkSessionScope → resumeSession → invoke（读取行程）；查询 2026-11-15 返回无可预约班次，页面显示学校空结果，没有制造模拟班次。
- 在学校会话有效时再次通过课表确认框忘记缓存，返回区间车仍自动连接、查询按钮可用、无密码框。再进课表可自动重新发现连接，服务器 version 21 / count 7，测试结束时已恢复可用的课表连接。
- 本次不提交真实预约、取消或上车验证；验证码没有自然触发。没有宣称实体手机测试。截图保存在忽略的本机 .screenshots 中，不提交个人测试数据。
- MuMu WebView 的 375/768/1280 CSS px、实际 data-theme 深浅两套主题共 12 张截图：均无横向溢出。深色主题仍观察到部分浅灰背景与低对比度，属于既有样式问题；Claude 的 #64 深色兼容修复应在后续集成时一并复验，本次不改公共设计 token。
- Windows 虚拟内存压力曾使本地服务和调试命令退出。MuMu 临时以 2 GB / 2 CPU 启动后完成验证，已恢复原 middle 模式与原自定义参数；没有因该环境问题改学校认证协议。

后续 Claude 调整样式时保留 `restoreSchoolConnection`、`SchoolAccountSignIn`、`session.ts`、原生桥和既有区间车写入/乘车码逻辑。完整 API 见 [会话复用](SCHOOL-SESSION-REUSE.md) 与 [认证桥](SCHOOL-AUTH.md)。

## #77 合入后的旧 WebView 复验

2026-11-14 同步 main `13ad721`（已合并 #77），保留上述功能整合，未修改认证/课表/区间车业务协议。已读取新版 AGENTS.md 和 docs/design/ui-handoff.md。

- #77 的主题透明度测试在新学校功能中找到 4 处 bg-surface-muted/60：登录表单提示、课表统计区、区间车已连接/未连接区。统一使用已有 surface-translucent token；测试由失败转为通过，没有放宽检查或新增浅色回退。
- MuMu 实际 WebView 版本为 110.0.5481.154.1；CSS.supports 的 color-mix 检测为 false。首页、Schedule、Profile、自动课表、区间车在 375/768/1280 CSS px、深浅主题共 30 张截图中无横向溢出；等主题过渡完成后检查，深色透明底均为 rgba(38,37,35,0.7)，Profile 的 Log out 不再发白。先前提及的浅灰底问题在当前集成版本已修复。
- 发现 #77 的 Tailwind ring 在此 WebView 中计算为 none，虽然 focus-visible 已匹配，键盘仍无可见焦点。导航现用普通 CSS box-shadow 画 2px 的语义色焦点环，沿用原胶囊圆角，不恢复方形 outline。375px 底栏和 1280px 侧栏均实测焦点可见、blur 后移除。
- 截图在本机 .screenshots/main77-*.png，未提交。设备为模拟器，不代表实体手机验收；没有预约/取消操作，也没有清学校会话。
- 本次全量检查 455 passed / 19 skipped，构建成功；保留既有通知和文件追踪构建诊断。共享导航/CSS 兼容补丁仍需 Member 1 审查。
