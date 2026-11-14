# CAMPUS HELPER — UI 设计交接文档

> 用途：设计语言速查，供新成员和新的 AI 会话无缝继续 UI 工作。
> 状态：全部 UI 改版已通过 PR #62 合并进 `main`（提交 `1607a8c`）。代码即真相：
> `src/app/globals.css`（全部 Token）、`docs/design/ui-ux-spec.md`（§2.6.1–2.6.3、§4.17–4.19 为本次新增规范）、
> `src/components/ui/README.md`（组件用法）。有冲突时以仓库代码为准。

## 0. 背景与协作约定

- 项目：西交利物浦大学（太仓校区）校园助手 PWA。Next.js 16（Cache Components 开）+ React 19 + Tailwind v4 + Prisma。UI 英文，讨论中文。
- 我（用户）是 Member 1 / 前端负责人，**可以直接修改所有模块的前端页面**；其他成员主要做后端。原则：尽量不动后端、接口、数据库与权限逻辑。
- 每次改动：`npm run check` + `npm run build` 通过；375 / 768 / 1280px、浅色和深色都截图检查；无横向滚动。
- 不要 `"use cache"` 用户数据；渲染期不读当前时间（在 `<Suspense>` + `connection()` 后读，或在用户操作时读）。

## 1. 设计语言总述

"校园地图"风格：取色自学校官方校园地图（紫色教学楼标记、黄色设施标记、河流蓝、草坪绿），
**简约、柔和、不刺眼、无尖角**；浅色不用纯白，用淡紫雾白底 + 柔和彩色光斑；
浮层用毛玻璃，首页小组件和底部导航用"液态玻璃"（类 Apple 桌面小组件，更通透、立体）。
深色模式是**暖石墨灰**，**不要蓝紫色**（用户明确反感蓝紫，觉得有"AI 味"）。

## 2. 配色 Token（语义化，业务代码禁止原始色板和 hex）

### 浅色（`@theme`）

| Token                                                                           | 值                                                                           | 用途                                  |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------- |
| primary / hover / subtle / on-primary                                           | `#6b3fa0` / `#5a3389` / `#efe8f8` / `#fff`                                   | 校园地图紫：主按钮、选中、链接        |
| brand / brand-on / brand-accent                                                 | `#6b3fa0` / `#fdfcff` / `#f2b33d`                                            | Logo 固定色（两种主题不变）           |
| accent / accent-subtle                                                          | `#9a5a00` / `#fdf1d8`                                                        | 阳光黄系强调（少量，不用于按钮/状态） |
| background                                                                      | `#f3f1f8`                                                                    | 薰衣草雾白页面底（不用纯白）          |
| surface / surface-muted                                                         | `#fdfcff` / `#f0edf6`                                                        | 卡片 / 分组底                         |
| border / border-strong                                                          | `#e6e1ef` / `#d2cbe0`                                                        |                                       |
| text / text-muted / text-disabled                                               | `#1e1b2e` / `#635e78` / `#a49fb5`                                            | 带紫调墨色                            |
| focus-ring                                                                      | `#8a5cc4`                                                                    |                                       |
| 事件色 class / office / space                                                   | `#2c5e8a` / `#a3365e`（玫红，避免与主色撞）/ `#1f6766`，各带 `-subtle`       |                                       |
| lost / found                                                                    | `#a84a22` / `#2f6a3a`                                                        |                                       |
| 地图插画 map-lawn / lawn-deep / river / ring / building / track / pin / pin-alt | `#d9eec4` `#a9d38a` `#a7dcf2` `#fff` `#f6ecd9` `#e07a6a` `#8e3c96` `#f2b33d` |                                       |

### 深色（`:root[data-theme="dark"]` 覆盖同名 Token）

- 背景 `#131211`，surface `#1c1b1a`，surface-muted `#262523`，border `#2f2d2b` / strong `#46433f`，text `#eeece8`，muted `#aaa59d`，disabled `#6f6b64`。
- primary **兰花紫** `#d9aee0`（hover `#e6c6ea`，subtle `#2f2630`，on-primary `#241726`）——取自地图标记的偏粉紫，不是蓝紫。
- accent `#f2c063`；状态色均为提亮版（success `#9bd17f`、warning `#f0b45a`、danger `#ff8f85`、info `#93c2e8`），`-solid` 保持可放白字的深色。
- 光斑极淡：路灯黄 / 草坪绿 / 河水蓝，透明度 0.04–0.07。阴影 tint 为纯黑。
- 地图插画深色：lawn `#1f2620`、river `#22414c`、ring `#3b3936`、building `#4a4336`、pin `#d9aee0`。

### 背景光斑（`body::before`，fixed）

浅色：右上紫 `rgb(190 160 240/.48)`、左中蓝 `rgb(150 205 235/.42)`、底部绿 `rgb(190 225 160/.38)`、右中粉 `rgb(245 190 215/.3)`，大半径 radial-gradient。作用：给玻璃提供可透的颜色。

### 半透明的写法（重要）

- 不要在主题色上用 `/NN` 透明度（如 `bg-surface/80`）：老安卓浏览器不支持 `color-mix()` 时会退回浅色值，深色模式出现白块（真机上发现过：首页 Hero 左上角发白）。
- 用按主题定义的 Token：`surface-translucent`（浅 `rgb(253 252 255/.7)`，深 `rgb(38 37 35/.7)`）、`primary-soft`（浅 `rgb(107 63 160/.4)`，深 `rgb(217 174 224/.45)`），或 `opacity-*`；`src/components/ui/theme-opacity.test.ts` 会拦截违规写法。

## 3. 玻璃效果（三档，均配合 `border` 类使用）

| 工具类         | 配方                                                                                                                                                            | 用在                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `glass`        | 底 `rgb(253 252 255/.66)` + `blur(20px) saturate(160%)` + 白色 .75 描边                                                                                         | TopBar、SideNav、StickyActionBar                                                                |
| `glass-strong` | 底 .86 + `blur(24px)`                                                                                                                                           | Modal / BottomSheet、Toast                                                                      |
| `liquid-glass` | 160° 渐变填充 白 .62→.30 + 左上径向高光 白 .65 + 顶部内亮线 `inset 0 1px 0 白.95` + 底部内线 白.12 + 深柔投影 `0 16px 36px -14px` + `blur(28px) saturate(180%)` | BottomNav 胶囊、`<Card variant="widget">`（首页卡片、Services 卡片、各页 Hero/搜索面板/统计卡） |

- 深色时 liquid 退化为"偏透的毛玻璃"：只有石墨底 `rgb(28 27 26/.5)`（`--color-liquid-base`，浅色为 transparent）+ 模糊，无白色渐变/光斑，顶部高光仅 .04、边 .07、选中胶囊 .08；`saturate` 110%（`--liquid-saturate`，浅色 180%）。否则部分手机上模糊+饱和会把卡片冲成灰白。
- 降级：不支持 backdrop-filter 或 `prefers-reduced-transparency` → 实色 `surface`。
- **长列表卡片不用玻璃**（性能 + 可读性），用默认实色 Card。
- BottomNav：悬浮胶囊（离底 12px、左右 12px、最大宽 480px），选中项为白色玻璃小胶囊 `bg-liquid-pill` + 内高光 + 小阴影。

## 4. 形状、字号、阴影、动效

- 圆角：sm 12 / md 20（卡片）/ lg 28（弹窗、Hero、widget）/ full（按钮、Chip、Badge、BottomNav）。**按钮一律胶囊形**。
- 字号：display 28/36 700，title-lg 22，title 18，subtitle 16/600，body 16，body-sm 14，caption 12/500。小节标题统一 `text-caption tracking-wide uppercase text-text-muted`。
- 阴影：card（双层柔和）、raised（悬停抬升）、overlay、primary（主按钮主色光晕）；颜色经 `--shadow-tint`（浅色 `60 30 110`，深色 `0 0 0`）。
- 动效：可点卡片 hover 上浮 2px + raised 阴影；按钮按下 scale .98；页面 `animate-enter`（320ms 淡入上移 6px）；全部尊重 reduced-motion。

## 5. 主题切换

- `<html data-theme>` 由 `<head>` 内联脚本（`@/components/theme` 的 `THEME_SCRIPT`）首帧前设置，默认跟随系统并监听系统变化；`localStorage.theme` = light / dark（缺省=system）。
- `ThemeSwitcher`（System / Light / Dark 三段胶囊）在 Profile → Appearance 和 `/design-system`。
- themeColor：浅 `#f3f1f8`、深 `#131211`；manifest theme `#6b3fa0`。

## 6. 品牌与插画

- Logo：学士帽 + 地图钉流苏（来自看板 logo），紫底圆角方块、白帽、阳光黄流苏。`AppLogo` 组件；`src/app/icon.svg` 与 `public/icons/*` 已重新生成（maskable 版图案缩到 88%）。
- `CampusIllustration`：扁平 SVG 校园地图（白色圆环 + 环内 A–G 楼、三支汇流的河、外圈放射楼、左侧跑道、紫/黄楼栋标记），颜色全走 `map-*` Token，`aria-hidden`。用在首页 Hero、Services 校园指南、登录页、404。常配 `mask-image: radial-gradient(...)` 柔化边缘。
- 曾尝试用 gpt-image 生成 3D 黏土校园图，结构总不准，**已放弃**，改用上述 SVG。

## 7. 共享组件（`@/components/ui`）

- `Card variant="widget"` / `cardStyles({ variant, interactive })`
- `LocationText`（自动识别 "Office C-308"/"Building D"/"B-301" 显示地图式楼栋圆标，`fallbackIcon`、`wrap` 选项）/ `BuildingPin`；楼栋数据 `src/lib/campus.ts`（A–G 教学楼紫、H/J/M/S 设施黄）
- `DateTile`（日历页式日期块：月/日/周几，服务色）
- `DateStrip`（未来 N 天日期胶囊，Today/Tomorrow）、`TimeSelect`（24h 下拉）
- `DatePicker` / `DateTimePicker`（月历：手机底部抽屉、桌面对话框，月/年跳转、Yesterday/Today/Tomorrow、min/max 可传 `"today"`、键盘导航；输出 `yyyy-mm-ddTHH:mm`，与 datetime-local 相同）——业务代码不再用原生 date/time/datetime-local
- `EmptyState`（图标放在 primary-subtle 圆形底座里）、`TypeIcon`/`typeColorClasses`、`AppLogo`、`CampusIllustration`、`ThemeSwitcher`（`@/components/theme`）
- 布局：所有页 `TopBar` + `PageContainer`；学生端、`/teacher`、`/admin` 共用 `src/app/_shell/app-frame.tsx`；角色页手机归 Profile 标签，桌面在 SideNav "Role tools" 高亮。

## 8. 页面模式（已落地）

- 列表卡片左侧服务色图标块：答疑玫红、自习青、课程蓝、失物橙/招领绿（与首页 Quick access 一致）。
- 搜索类"先结果后筛选"：筛选收进可折叠液态玻璃卡片，折叠时显示条件摘要（自习室）。
- 详情页：液态玻璃 Hero（大图标 + 标签 + 标题）+ 圆角信息行列表（图标 + 标签 + 右对齐值）。
- 统计：玻璃数字卡（教师端、管理后台、My posts）。
- 课表：时间线（左侧起止时间、彩色圆点、"Up next" 玻璃高亮）。
- 首页：Hero（`liquid-glass` 底 + 一层 primary-subtle→透明 的渐变光晕 + 地图插画 + 玻璃铃铛）、widget 卡片、手机端 Quick access 为无卡片的应用图标网格（单行标签，"Class Reminder" 手机显示 "Classes"）。
- Services：液态玻璃四入口 + "Good to know" 小贴士 + 校园指南（地图 + 楼栋目录）。
- 登录/注册：左地图 Hero + 功能亮点，右玻璃表单卡；手机只留 logo + 表单。

## 9. 已知遗留 / 可做的下一步

- `tests/e2e/lost-found.spec.ts` 早于登录功能，会被重定向到 /login（Member 5 需更新登录流程）。
- 可选：首页 "Next class" 空状态在手机上偏高，可改紧凑一行样式；手机首页无 logo（仅桌面侧栏有）。
- 需告知组员：新增共享组件、禁用原生日期时间控件、角色页进入 AppFrame。
