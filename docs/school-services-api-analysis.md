# 学校服务接口分析（eHall 六项服务）

> 目的：为学校服务接入栈（签到、试卷、图书馆、讨论室、班车、邮箱）提供统一的
> 端点参考。所有信息均来自**已登录状态下浏览器页面自身发出的网络请求观察**，
> 以及服务前端脚本中接口定义的静态整理；未使用任何越权手段，全部为本人账号
> 的正常会话。
>
> 合规约定：接入时只走用户本人会话（WebView cookie/token），不得缓存他人凭据；
> 遵守学校 Fair Use 政策；写操作（预约/签到）必须由用户在界面上主动触发。

方法说明：在浏览器登录各服务 → 用浏览器 Performance API 与页面请求日志列出
页面调用的端点 → 从服务自身的前端脚本中整理接口定义 → 用同源 fetch 验证
请求/响应结构 → 最后在 Android WebView 沙箱中按
[school-adapter 模式](../../src/features/shuttle/school-adapter.ts) 复验。

---

## 0. 统一身份认证（uim / esc-sso）

| 项 | 值 |
| --- | --- |
| 登录页 | `https://uim.xjtlu.edu.cn/esc-sso/login/page` |
| OAuth 授权 | `https://sso.xjtlu.edu.cn/esc-sso/oauth2.0/authorize?response_type=code&client_id=<per-app>&redirect_uri=<per-app>` |
| 会话特征 | 登录一次后，各服务首次访问经 302 票据链路自动完成登录（WebCookie 有效期内） |

要点：

- 各服务持有自己的 `client_id`（见 §2 / §3）。
- WebView 场景下只需保证 `uim.xjtlu.edu.cn` 与 `sso.xjtlu.edu.cn` 的 cookie 一并保留，
  服务侧首次跳转即可静默换票；无需为每个服务单独输密码。

---

## 1. AMS 签到系统（ams.xjtlu.edu.cn）

网关 `https://ams.xjtlu.edu.cn/xjtlu/`，请求头 `X-Token`（登录后由前端写入
`localStorage.Token`，32 位十六进制）。响应统一为 `{ code: 0 | 401 | 1001, data, message }`。

| 方法 | 端点 | 说明 |
| --- | --- | --- |
| GET | `/xjtlu/sys-maintenance-mode/detail` | 维护状态（免 token） |
| GET | `/xjtlu/sso/mobile/login?code=OC-xxx` | SSO code 换 token + userInfo |
| GET | `/xjtlu/xjtlu-base-student-timetables/getStudentTimetable` | 近期课表 + 每节课 `signInRecordId` |
| GET | `/xjtlu/xjtlu-base-student-timetables/getStudentAttendance` | 出勤统计 `{ exceed, attendance }` |
| GET | `/xjtlu/sign/qRCodeSign?code=<X>&type=1` | 扫码签到（`code` 为二维码内 state） |
| GET | `/xjtlu/sign/qRCodeSign?code=<X>&type=2` | 签到码签到（`code` 为 8 位签到码） |
| GET | `/xjtlu/sys-message/unReadCount` | 站内未读数 |
| GET | `/xjtlu/sys-dict-data/9` · `/13` | 字典（请假开关等） |

课表数据结构：

```jsonc
data: [{
  date: "11-19",
  timetableVoList: [{
    moduleCode: "SOE206TC", moduleTitle: "Database Development and Design",
    moduleDate: "2026-11-19", moduleTime: "10:00~12:00",
    location: "TC-E-TC-E-3031", room: "E-3031",
    moduleTypeGroup: "SOE206TC-Lab-D1/4",
    startTime: "2026-11-19 10:00:00",
    status: 0,            // 签到状态
    signTime: null,
    signInRecordId: 1865629500,
  }]
}]
```

签到机制（供 UI 文案与提示设计参考）：

- 教师端展示两种签到方式：**签到码**（1 位大写字母 + 7 位数字，自课程开始起
  72 小时内有效）与**二维码**（内容为
  `https://ams.xjtlu.edu.cn/studenth5/#/?state=<64hex>`，state 约 10 秒轮换）。
- 服务端判定（实测错误响应）：无效码 → `The Sign-in code has expired.`；
  非本人课程 → `This is not your session.`；二维码过期 →
  `The QR code has expired. Please scan the QR code again.`
- 签到为**写操作**：接入时必须在用户主动点击后调用，并在结果页展示服务端返回消息。

接入建议：沿用 `feat/attendance-ui`（#69）的流程设计；WebView 内完成 SSO 后读取
`localStorage.Token`（移动端 H5 则在 `sessionStorage.amsuserInfo.token`），后续请求
统一带 `X-Token`。

---

## 2. 试卷与论文系统（etd.xjtlu.edu.cn）★ 试卷检索 + 在线获取

认证为标准 OAuth2：

1. 跳转 `https://sso.xjtlu.edu.cn/esc-sso/oauth2.0/authorize?response_type=code&client_id=8250a95e837cd04f8b39&redirect_uri=https%3A%2F%2Fetd.xjtlu.edu.cn%2Findex.html%23%2Findex`
2. 回跳携带 `?code=OC-xxx`
3. `POST /token`（form-urlencoded，`grant_type=password&Username=<code>`）→
   `{ access_token, userId, userName }`，此后请求带 `Authorization: Bearer <token>`

| 方法 | 端点 | 说明 |
| --- | --- | --- |
| GET | `/api/v1/Search/DbList` | 库列表：`EXAMXJTLU`(试卷, dbId=3)、`ETDXJTLU`(FYP)、`ETDXJTLU1`(Dissertation-PGT)、`ETDXJTLU2`(Thesis-PGR) |
| GET | `/api/v1/Search/<DbCode>?userId=` | 检索字段与分类（试卷库：`PaperCode`/`PaperTitle`/`Year`；分类 Year/Semster/Type） |
| POST | `/api/v1/Search/Search` | 检索（body 见下） |
| GET | `/api/v1/Detail?userId&dbId&dbCode&recordId` | 详情与权限 `{ hasBrowserRight, hasDownloadRight, flag }` |
| GET | `/api/v1/file/BrowserUrl/<flag>?userId&dbId&dbCode&recordId` | 获取服务端签名的在线查看 URL（含 timestamp/signature/clientIp） |
| GET | `/api/v1/File/BrowserFile?...` | 在线查看的文件本体（实测返回 `application/pdf`，约 727 KB） |
| GET | `/api/v1/File/DownloadFile/...` | 归档下载端点；学生角色由服务端策略限制 |

检索请求体（实测格式）：

```json
{
  "DbId": 3,
  "DbCode": "EXAMXJTLU",
  "OrderField": "PaperTitle",
  "PageIndex": 1,
  "PageSize": 20,
  "AdvancedSearchParams": [
    { "SearchType": 2, "SearchField": "PaperTitle", "SearchContent": "Database" },
    { "SearchField": "FullText", "SearchContent": 1 }
  ],
  "CategoryExpression": "",
  "CatalogCode": ""
}
```

`SearchType`: `2`=包含（Contains），`0`=精确（Is）。结果项含
`paperTitle / paperCode / department / year / syS_FLD_SYSID`（即 `recordId`），
标题关键词带服务端高亮标记。

实测样例：按 `PaperTitle` 包含 "Database" 检索返回 6 份 CPT201 试卷
（2023-24 / 2024-25 / 2025-26 各 S1/S2）。

**"搜索课程 → 查看试卷"实现路径**（已在浏览器与 Android WebView 双端验证）：

```
Search（按模块名/代码检索） → Detail（取 recordId 与权限）
→ BrowserUrl（取签名 URL） → GET 签名 URL → 保存 PDF 字节
```

注意：学生角色 `hasDownloadRight=false`（归档下载端点被服务端策略限制），
但在线查看端点返回完整 PDF 字节；请按"在线查看 + 本地缓存"产品化，
并遵守图书馆 Fair Use 条款。

---

## 3. 图书馆座位预约（seatbookings.xjtlu.edu.cn）

网关 `/ic-web/`（页面 `config.js` 的 `window.g.ApiUrl`），请求头
`token: <32hex>` + `lan: 2`。响应 `{ code: 0|1|302|405, data, message }`。

| 方法 | 端点 | 说明 |
| --- | --- | --- |
| GET | `/ic-web/seatMenu` | 校区/楼层/区域树（含 `totalCount` / `remainCount`） |
| GET | `/ic-web/reserve?roomIds=<areaId>&resvDates=<YYYYMMDD>,<YYYYMMDD>&sysKind=8` | 座位图与单个座位详情（坐标、占用、规则） |
| GET | `/ic-web/seatRoom/openScope?roomId&sysKind&resvDate` | 开放时段（按星期） |
| POST | `/ic-web/reserve` | 预约座位（`devIds`、`resvDates`、起止时间、`sysKind`，规则要求时带 captcha） |
| POST | `/ic-web/reserve/quickResv` | 快速预约 |
| GET | `/ic-web/seatDevice/resvStatus` | 全馆统计 `{ available, used }` |
| GET | `/ic-web/reserve/punishInfo` | 违约记录 |
| GET | `/ic-web/psgSeat/resvInfo` | 我的预约详情（需起止时间参数） |
| GET | `/ic-web/news` · `/ic-web/news/questions` | 公告 / FAQ |

`sysKind`：8=座位、1=研修间。座位状态为位掩码（`4`=使用中，`128`=已结束）。
预约规则示例（3F-North）：最短 30 分钟、单次最长 840 分钟、开始前 30 分钟可取消、
最多提前 1 天预约；超过阈值时预约需图形验证码（`/ic-web/captcha/get|check`）。

实测：SIP 校区 422 座（3F-North 56 / 4F 56 / 5F 52 / 7F 160 / 8F 30 / 10F 68），
全馆统计实时返回 `{ available: 1489, used: 36 }`。

---

## 4. 讨论室和静音舱预订（gsrb.xjtlu.edu.cn，Laravel 服务端渲染）

认证：SSO 免登 + Laravel CSRF `_token`（页面 `meta[name=csrf-token]`）。

| 方法 | 端点 | 说明 |
| --- | --- | --- |
| GET | `/entry/room?parktype_id=<id>&day=<YYYY-MM-DD>` | 时段表；格子为 `<td class="new" data-starttime="<unix>" data-roomid="<id>">` |
| GET | `/entry/add?start_time=<unix>&end_time=<unix>&room=<roomId>` | 预约表单（可预约窗口为今天起 7 天） |
| POST | `/entry/add` | 提交预约，字段：`_token, room_id, name(必填), start_date, start_time, end_date, end_time, memberlist, date` |
| GET | `/entry/member/add?sid=<学号或AD>&room_id=` | 成员校验，返回 `{ data: { sid, ad, name } }` |
| GET | `/myentry/list`（移动端 `/h5/entry/mylist`） | 我的预约列表 |
| POST | （列表行内 URL）`{ id, action, _token }` | 取消预约 |

区域：`54`=SIP 讨论室、`55`=SIP 静音舱、`56`=TC 讨论室、`58`=SIP 讨论室 2。
房间号（节选）：讨论室 FBG48=763 / FBG50=764 / FBG52=765；静音舱 FB145=753 … FB175=762；
太仓 TC-A-2012=766 起。

约束（实测）：

- `memberlist` 为必填（Vue 侧为成员学号列表，逗号拼接），且**不能包含本人**；
  服务端校验成员存在性（接口对本人返回 "Can't add yourself to group."）。
- 缺少成员时提交被服务端拒绝（空 Warning 弹窗，不产生预约记录）。

---

## 5. Shuttle Bus 区间车（shuttlebus.xjtlu.edu.cn，Laravel 服务端渲染）

认证：`GET /sso` 自动 SSO；写操作需页面下发的 `_token`。
现有 `src/features/shuttle/school-adapter.ts` 已按该站点实现只读解析，
本节补齐其预约闭环所需的写接口。

| 方法 | 端点 | 说明 |
| --- | --- | --- |
| GET | `/schedule/list?route_id=<1 或 2>&date=<YYYY-MM-DD>` | 班次卡片列表（route 1=去 TC，2=去 SIP），每张卡片内嵌预约表单 |
| POST | `/schedule/book/<scheduleId>` | 预约：表单字段 `_token + departure_date`；成功与失败均以 302 + 页面 flash 提示返回 |
| GET | `/booking/list` | 我的预约（含乘车二维码与取消入口） |

规则（页面明示并实测确认）：每日 16:00 前可预约次日班车；当月爽约
（预约后未扫码且未取消）3 次会被系统限制预约至次月 1 日。取消入口在
`/booking/list`，同样为 Laravel 表单提交。scheduleId 按日期滚动生成，
不能跨日复用。

---

## 6. 邮箱（mail.xjtlu.edu.cn，Microsoft Exchange OWA）

入口为 ehall「邮箱」卡片 → `https://mail.xjtlu.edu.cn/owa/#path=/mail`，
SSO 自动登录。网页客户端走 OWA JSON 服务：

- `POST /owa/service.svc?action=<Action>&EP=1&ID=<n>&AC=1`
- 请求头：`Content-Type: application/json; charset=utf-8`、`Action: <ActionName>`、
  `X-OWA-CANARY: <cookie 值>`（防 CSRF）
- 请求体：`{ __type: "<Action>JsonRequest:#Exchange", Header: { RequestServerVersion, TimeZoneContext }, Body: {...} }`
  其中版本枚举实测有效值：`Exchange2013` / `Exchange2013_SP1` / `V2015_10_15`

常用 Action：`FindConversation`（会话列表）、`FindItem`/`GetItem`（读信）、
`CreateItem`（写信）、`GetCalendarView`（日历）、`GetMailboxMessageConfiguration`、
`GetPersonaPhoto`（GET，头像）。

服务器同时暴露标准协议端点（第三方集成的稳定路径）：
`/ews/Exchange.asmx`（SOAP，Negotiate/NTLM/Basic）、`/mapi/emsmdb`。
注意：本人账号实测 Basic 认证不可用，邮箱功能建议以 OWA 会话为主。

---

## 7. 与现有 adapter 架构的对接建议

1. **只读优先**：沿用 `school-adapter.ts`（WebView 内运行、无 import）模式，
   解析 HTML/JSON 后经 bridge 回传；与 #67/#68/#69 的 UI 栈对接。
2. **写操作显式化**：预约/签到类请求必须由用户点击触发，失败信息原样展示
   （AMS/均返回明确 message，gsrb/shuttle 为 302 + flash，需在 WebView 内跟进落地页读取提示）。
3. **会话复用**：优先复用已登录 WebView 的 cookie/token（参照
   `feat/school-session-reuse` 的策略），SSO 302 链路通常可在 3-10 秒内静默完成。
4. **令牌位置差异**：AMS 为 `localStorage.Token`（移动端 H5 为
   `sessionStorage.amsuserInfo.token`）；座位系统为页面存储的 `token`；
   试卷系统为 OAuth Bearer；gsrb/shuttle 为纯 cookie。
5. **合规**：所有请求频率与人工操作一致，不并发、不轮询学校服务；
   遵守各服务 Fair Use 条款（etd 站点首页有明示链接）。

---

## 参考

- 相关实现：`src/features/shuttle/school-adapter.ts`（Shuttle 只读解析样例）、
  `src/features/school-rooms/`（讨论室 UI 与守卫写）、`src/features/school-auth/`
- 相关 PR：#67（班车 UI）、#68（太仓讨论室）、#69（AMS 签到）、
  #71-#76（学校账号登录与会话复用）、#79（讨论室守卫写）
