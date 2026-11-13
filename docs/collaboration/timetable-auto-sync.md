# 自动学校课表同步：接入分析与交接

日期：2026-11-13。用户最新要求：学校账号登录后自动获取本人课表，用户不再上传/粘贴 JSON。当前实现已发布为 [Draft PR #65](https://github.com/AndsomeR1110/campus-helper/pull/65)，包含 MuMu 完整验证；以下保留研究过程，最新实现以该 PR 的 native/TIMETABLE.md 为准。

## 核验结论

- 当前正式产品代码只有 JSON 预览/上传入口及导入 API。`scripts/dev/import-school.mjs` 已有自动导航取数逻辑，但它是本机 Playwright 开发脚本，不是安装后 App 的运行能力。
- 已有 11 月 11 日实测：eBridge 菜单可进入个人课表，顶层读取 iframe.src，TimetablePlus 顶层页内 fetch 可取得活动 JSON。不能把桌面 Chrome 结果视为 Android WebView 已通过。
- 11 月 13 日复查代码、解析器和数据库规则；本轮已连接 BrowserSkill 并从 eBridge 正常入口进入 UIM，当前会话要求重新登录，已发起用户登录协助；当时尚无新的在线取数证据，后续验证成功见文末。自动调试采集被审批拦截后改为普通页面导航，没有采集登录请求，没有提取学校凭证或使用旧 hash 发请求。
- 原生壳和学校 SSO 窗口已存在于本地区间车分支，可复用容器的安全设计；不能把仅允许 shuttlebus 的插件白名单直接扩大成任意域名/脚本桥。

## 产品行为

首次：Connect school account → 用户在 App 内完成学校 SSO → App 自动走 eBridge 个人课表菜单 → 自动取数并显示课程/同步状态。首次保存至 Campus Helper 账号时明确说明会同步课程数据；无需展示 JSON、hash、票据或脚本。

以后：打开课程/课表时若超过刷新间隔则尝试刷新，并提供 Refresh timetable。已授权来源范围内可自动更新学校课程；手工课程保留。显示最后成功同步时间，失败时保留上次成功数据并标明尚未更新。登录过期则提示重新连接，恢复后继续；“登录一次”不是学校会话永久有效的保证。Android后台不承诺持续运行或及时刷新。

优先 Android App。普通 Web/PWA 没有设备桥时显示不支持自动连接，不退回要求 JSON 作为主要产品体验。已有个人课表同步到应用数据库后，可供该应用账号在其他设备读取；学校登录态仍留在原设备。

## 完整自动取数链

1. 原生 Timetable 组件加载 eBridge 官方 HTTPS 入口，首次由用户登录；优先验证与校车是否能在同一 App WebView 数据存储中复用 UIM 会话，不导出/复制 cookie。
2. 识别已认证门户，按当前 DOM 的 Timetables、My Personal Class Timetable 真实控件导航。屏幕票据一次性，不存储密文导航 URL，也不重放上次票据。找不到菜单要报可恢复的导航错误，不让用户粘贴 JSON。
3. 等待个人课表 iframe，验证其 URL 精确 HTTPS 主机和路径，再于原生私有流程中获取 64 hex enrollment hash。hash 等同凭证，不通过前端 DTO、后端、日志或错误消息传出。为支持冷启动免登录，当前实现仅将连接凭证用 Android Keystore 的非导出密钥及 AES-GCM 加密保存在设备私有区，按应用账号隔离、30天本地过期；不保存学校密码，失效则回退 SSO。
4. 在受限 WebView 顶层加载 TimetablePlus 页面；等待学校页面准备好，在该页面上下文执行固定读取操作：GET `/ptapi/api/enrollment/hash/<64hex>/activity?start=<范围起点>&end=<范围终点>`。使用学校运行时已有 fetch/XHR hook，不重放 WAF 签名，不把裸 HTTP 客户端视为可靠方案。
5. 校验响应状态、JSON 结构、大小、活动字段以及所选学期/覆盖范围。来自登录页、WAF页面、部分响应或未知学期的数据不能当空课表并删除旧课程。旧 start=1/end=13 或20只是实验范围；必须先验证当前学期周数，不能固定为所有学期的范围。
6. 在设备侧移除凭证信息后交给应用层课程解析器。服务器按应用当前用户校验课程 DTO，处理同步事务，再回读课程/日程。学校主体和当前应用账号的绑定需要显式确认；换学校账号要清理旧绑定并重新确认。
7. 课程全名可后续从 LM Core 关联补齐，但它是另一个待接入来源，匹配按课程编码/学期校验；不可把取不到全名当课表同步失败或编造名称。

## 两层接口与安全边界（待实现契约）

设备层建议公开：`connect()`、`refresh()`、`disconnect()`、状态事件。状态至少包括 unsupported、needs-login、connecting、discovering、fetching、ready、expired、unavailable、invalid-data。refresh 只返回标准化课程快照和已验证的学期/范围信息，不返回 cookie、token、hash、密文URL或完整页面。取消/超时后的迟到消息用请求 ID 丢弃；单次只运行一个流程。

原生许可来源按 eBridge / TimetablePlus / UIM / trust 分阶段限制。只有预期业务页面主 frame 才能返回对应阶段的结果，登录页不暴露业务权限。不关闭 SSL 校验、不让页面请求任意原生操作、不为了规避限制直接照搬旧规划中的第三方 cookie/UA 修改建议。是否需要改变 WebView配置须以实际运行证据决定。

服务器层的同步接口是新能力，不能直接把现有 `/api/courses/import` 的 replace 当自动同步。需校验快照完整性、学期、范围及课程内容；按服务器 session owner 处理，客户端不得指定 ownerId。客户端传入学校记录仍属不可信数据，不能据此授予学生身份或其他权限。

## 数据模型缺口与迁移要求

实际 Course 模型无 source、term、sourceActivityId 或任意 weekSet，唯一键是 ownerId+code+weekday+startTime。

- merge/createMany(skipDuplicates) 不更新已有时间相同但教室/教师变化的课程；时间变化会留下旧行。
- replace 仅按本次 payload 中的课程编码删除，可能删掉同编号手工课，也不能完整清理学校已删除的课程。
- 奇偶/连续教学周能表达；其他不规则周目前会跳过，不符合无损自动同步目标。
- 当前导入器没有学期边界，也没有可靠的来源活动标识，不能把“最新请求成功”视为完整学期快照。

建议与 Member 4、Member 2 评审：独立学校连接/学期/同步记录与来源活动标识，保存准确 weekSet，保留手工课程；同步以明确的来源+学期范围做增删改事务。若学校无稳定活动 ID，要先验证活动身份匹配规则和调课行为。更新现有课时应尽可能保留用户提醒设置，删除/重建对提醒与日程的影响也需测试。此处仅记录需求，不擅改 Prisma schema。

可先交付“自动获取并展示课程快照”的只读版本来验证 WebView链路；在来源与周次模型完备前，不开启自动破坏性替换，也不把跳过的活动隐藏为同步成功。

## 实施顺序与验收

| 阶段    | 负责               | 验收                                                                                                           |
| ------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| AUTO-01 | Codex              | 真正的 Android eBridge 登录后自动导航，动态发现本人课表；WebView 无凭证取数并对照官网，测试重开App和会话过期   |
| AUTO-02 | Codex + Member 4/2 | 标准化快照、完整教学周与学期/来源模型评审；提交 schema/迁移前获得 owner 评审                                   |
| AUTO-03 | Claude             | 使用连接/刷新/课程展示/最后同步时间/失败恢复 UI，删除 JSON 主入口；由 Codex 发布接口后接入，预览不得当真实连接 |
| AUTO-04 | Codex              | 服务器同步增删改、提醒保留、手工课隔离；重复请求幂等，并发/失败回滚不污染旧数据                                |
| AUTO-05 | Codex + Claude     | 实际登录→自动获取→保存→课表展示，重新启动自动刷新；课程数量/时间/教室/周次对照，失效重连和切账号测试           |

关键测试：第一次登录、校车登录后是否免二次 SSO、App重启/会话过期、WAF拒绝、菜单变化、重复同步、调课/删除、空快照、学期切换、非连续教学周、不同账号、人工修改课程与提醒。没有实际跑通的项保持待验证，JSON手动导入可暂作开发诊断但不再作为用户主流程。

## 2026-11-13 Chrome 在线复验结果（更新）

用户完成学校登录后，本轮自动点击门户 Timetables → My Personal Class Timetable - 2026/27 S1，读已验证 iframe 地址并在页面内进入 TimetablePlus 顶层页面。未向用户要求 JSON，也未复用旧票据/旧 hash。hash 只在页面上下文中参与取数，未输出或保存到交接文档。

- 在 TimetablePlus 页面内使用学校现有 fetch 上下文请求 activity，start=1/end=13，HTTP 200；7 条教学活动、4 个 moduleId，核心字段齐全。
- 每条 activity.name 和所有 weekPattern 均能在官网可见课表找到。随后重复取数两次，仍均为 7 条；没有执行数据库写入或预约操作。
- 实际字段：department、weekPattern、scheduledDay、startTime、endTime、activityType、staff、location、plannedSize、moduleId、templateId、sectionId、isLocked、realSize、identity、name。没有 id/activityId 字段；identity 为字符串，在当前7条中唯一且短时间多次读取稳定，可作为候选 sourceActivityId。sectionId 有 null，不能要求其必填。仍未验证调课后 identity 是否保持、跨学期命名空间或所有账号字段一致性。
- scheduledDay 为字符串，0=周一，与当前课表对应；时间为带 Z 的2000年占位日期，按 UTC+8解释与官网起始时间相符。逐项核对7条的结束时间，均为接口结束减10分钟，与官网换教室缓冲提示相符。自动同步应保留原始时段并明确展示结束时间规则，不能简单把原值当官网展示值。
- weekPattern 为 `1-3, 4-13` 或 `1-3, 4-10`。这是当前学期、当前范围快照，不证明 start/end=1/13 适用于下一学期。
- 另查本地 constants：TERM_START_DATE 固定为2026-09-07；跨学期自动同步需要真实的周一锚点/校历配置及休假规则，不可只取得周编号就声称完整学期日期正确。

验证结论：本轮已证明“登录后自动导航、发现个人课表、页面内自动取数”在 Chrome 当前学校会话下可行；不是 Android App 自动同步完成、自动登录永久有效或跨学期同步完成。没有保存原始私人课表和标识值；登录窗口及自建验证会话已关闭。下一步是 AUTO-01 的 Android 专用适配器与原生链路验收，不需要继续开发 JSON 主入口。

## Android 实现与验收更新

[PR #65](https://github.com/AndsomeR1110/campus-helper/pull/65) 已跑通 2026/27 S1：登录后自动导航/取数/保存、7条教学活动（4个课程编码）、再次刷新、课程列表与日程读取，以及强制结束进程再打开后无账号输入自动同步（版本7→8）。私有连接缓存仅含密文，没有明文课表地址。之前“只在 Chrome 验证/Android 未实现”的结论已被本段取代。学校凭证被撤销、本地缓存过期或其他学期仍需重连/新增配置，不是永久会话承诺。

当前采用独立 SchoolTimetable 快照表；按应用会话 owner 保存、版本冲突拒绝，精确保留不规则教学周，刷新不改手工 Course。旧 JSON 导入无来源标记，保留为手工数据，相同课次仅折叠展示。Member 2/4 对迁移与课程/日程接口的合并评审仍待完成。UI 是沿用共享组件的功能入口，Claude 继续负责最终视觉。

公开前端接口已在 `@/features/school-timetable` 导出：schoolTimetableAvailable、readSyncState、syncSchoolTimetable、forgetSchoolConnection、connectionError、SyncState；Claude 使用该接口，不另写原生取数或 JSON 主流程。具体状态、构建步骤和测试限制见 PR 中 native/TIMETABLE.md。
