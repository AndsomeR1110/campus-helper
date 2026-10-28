# CAMPUS HELPER — Team Development Assignment

**Team Size:** 5 Members
**Development Workflow:** GitHub Repository + Feature Branches + Pull Requests
**Technology:** Next.js, TypeScript, Tailwind CSS, PostgreSQL, Prisma

## Member 1 — Project Lead & UI/UX Designer（Ran An）

**主要职责：项目管理、UI 设计、代码集成**

负责：

- 创建 GitHub Repository，邀请成员并设置 PR 工作规范。
- 初始化 Next.js、TypeScript、Tailwind CSS 项目。
- 设计完整 UI/UX、颜色、字体、页面布局和交互规范。
- 实现公共 UI 组件：Button、Input、Card、Modal、Navigation、Loading、Empty State。
- 实现 Home、Services、Profile 的页面框架。
- 负责移动端适配和响应式设计。
- 负责基础 PWA 配置、离线页面和最终部署协调。
- 审核、合并各成员提交的 PR，完成最终 UI 一致性检查。

**主要页面：** PG-02、PG-03、PG-18，以及全局 Layout。

**GitHub PR：**

- `chore/project-setup`
- `feat/design-system`
- `feat/app-layout`
- `feat/pwa-foundation`

**交付标准：** 所有成员能够基于统一 UI 规范开发；公共导航及组件正常运行；375px、768px、1280px 布局适配。

## Member 2 — Authentication & Office Hour Developer

**主要职责：用户认证、基础数据库和教师预约系统**

负责：

- 建立 PostgreSQL、Prisma 基础数据模型和数据库迁移。
- 实现 Student、Teacher、Admin 登录与权限验证。
- 实现注册、登录、退出及会话管理。
- 实现教师列表、教师搜索及详情查询。
- 实现教师创建和管理 Office Hour 时段。
- 实现学生创建及取消 Office Hour 预约。
- 使用数据库事务或约束防止同一时段重复预约。
- 提供 Office Hour 数据接口供 Schedule 和 My Bookings 使用。

**数据库实体：**
`User`、`TeacherProfile`、`OfficeSlot`、`OfficeBooking`

**主要页面：** PG-01、PG-04、PG-05、PG-07。

**GitHub PR：**

- `feat/auth-and-roles`
- `feat/database-foundation`
- `feat/office-hour-management`
- `feat/office-hour-booking`

**交付标准：**

- 学生能搜索教师、选择时段、预约和取消。
- 教师只能管理自己的时段。
- 两名学生同时预约同一名额，仅一人成功。
- 未授权用户不能访问管理接口。

**对应 PRD 验收：** AUTH-AC-01～05、OH-AC-01～08。

## Member 3 — Study Space & Booking Developer

**主要职责：学习空间预约系统和统一预约列表**

负责：

- 实现校园学习空间和座位的演示数据。
- 建立座位查询和筛选逻辑。
- 支持日期、时间、楼宇、楼层和座位类型筛选。
- 实现座位时间段可用性计算。
- 实现座位预约及取消功能。
- 使用数据库事务及约束处理并发预约冲突。
- 开发 My Bookings，汇总教师预约与座位预约。
- 开发 Booking Detail，展示预约状态和取消结果。

**数据库实体：**
`Space`、`SpaceBooking`

**主要页面：** PG-06、PG-08、PG-09、PG-10。

**GitHub PR：**

- `feat/space-list-and-filter`
- `feat/space-availability`
- `feat/space-booking`
- `feat/unified-bookings`

**交付标准：**

- 用户修改日期、时间后，可用座位列表随之变化。
- 用户能够完成预约和取消操作。
- 重叠时间不能重复预约同一个座位。
- 预约记录与教师预约记录能够在统一页面显示。

**对应 PRD 验收：** SP-AC-01～08。

## Member 4 — Class Reminder & Notification Developer

**主要职责：课程管理、统一日程、通知系统**

负责：

- 实现课程创建、编辑和删除功能。
- 实现周课表和课程列表。
- 支持教学周、星期、时间和地点管理。
- 将课程、教师预约、座位预约整合到 Schedule。
- 实现站内通知数据库和通知读取接口。
- 实现课程提醒及后台定时任务。
- 确保重复执行提醒任务不会产生重复通知。
- 实现 `.ics` 课程日历导出。
- 在基础 PWA 完成后集成支持设备上的 Web Push。

**数据库实体：**
`Course`、`CourseOccurrence`、`ReminderRule`、`Notification`

**主要页面：** PG-11、PG-12、PG-13。

**GitHub PR：**

- `feat/course-management`
- `feat/weekly-schedule`
- `feat/unified-calendar`
- `feat/notification-service`
- `feat/calendar-export`

**交付标准：**

- 添加或编辑课程后，周课表立即更新。
- 教师及座位预约能同步展示在统一日程。
- 到达提醒时间后产生正确的站内通知。
- 删除课程不会继续触发旧提醒。
- 日历文件能够正确导入兼容的日历应用。

**对应 PRD 验收：** CR-AC-01～08、NT-AC-01～04。

## Member 5 — Lost & Found & Admin Developer

**主要职责：失物招领系统和内容审核**

负责：

- 实现 Lost / Found 帖子发布、列表和详情。
- 实现物品分类、关键词、地点及帖子状态筛选。
- 实现图片上传及文件类型、大小验证。
- 实现用户认领申请、接受和拒绝流程。
- 实现帖子 Resolved、Closed、Hidden 状态管理。
- 实现 My Posts 页面。
- 实现用户举报和管理员审核功能。
- 确保认领材料只对授权用户可见。
- 记录关键管理员操作。

**数据库实体：**
`LostFoundPost`、`LostFoundClaim`、`Report`、`AuditLog`

**主要页面：** PG-14、PG-15、PG-16、PG-17、PG-19。

**GitHub PR：**

- `feat/lost-found-posts`
- `feat/lost-found-search`
- `feat/lost-found-claims`
- `feat/admin-moderation`

**交付标准：**

- 用户能够发布、搜索和查看失物招领帖子。
- 其他用户能够提交私密认领申请。
- 发布者可确认认领并关闭帖子。
- 管理员能够处理举报。
- 普通用户无法读取他人的私密认领信息。

**对应 PRD 验收：** LF-AC-01～09。

## 共同开发规范

1. 所有功能从最新 `main` 分支创建独立 Feature Branch。
2. 每个 PR 只处理一个明确任务。
3. 每个成员负责自己模块的前端、API、数据库逻辑和测试。
4. 公共 UI 组件由 Member 1 维护，功能页面由各模块负责人实现。
5. 数据库 Schema 改动需由 Member 2 Review。
6. 统一日程和通知的数据接口需由 Member 4 协调。
7. PR 至少获得一位非作者成员的 Review，再由仓库负责人合并。
8. 每个 PR 必须包含功能说明、测试步骤和结果截图。
9. 不允许直接向 `main` 推送日常功能代码。
10. 所有完成的功能必须通过对应 PRD 验收标准。

**最终目标：** 四项核心业务功能正常运行，前后端完整集成，统一 UI 风格，支持部署及 PWA 安装。

## 建议的代码所有权划分

src/components/ui/ · src/app/layout.tsx

你：共享 UI、全局布局

src/features/office-hours/ · src/lib/auth/

Member 2：认证及教师预约

src/features/spaces/ · src/features/bookings/

Member 3：空间及预约中心

src/features/courses/ · src/features/notifications/

Member 4：课程、日程与通知

src/features/lost-found/ · src/features/admin/

Member 5：失物招领及审核

这是建议的 Next.js 目录分工，不是 PRD 中已经确定的文件结构。各成员仍可为自己的模块创建对应的 app 路由和 API。
