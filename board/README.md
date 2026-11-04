# 项目看板

网址：<https://andsomer1110.github.io/campus-helper/>（按成员筛选：在网址后面加 `#M3` 之类）

- 带 `task` 标签的 Issue 就是任务。用「布置新任务」按钮（Issue 模板）创建，下拉选负责人和优先级即可。
- 状态：Issue 关闭 = 已完成；有开着的 PR 写了 `Closes #编号` = 审查中；`status:in-progress` = 进行中；其余 = 待开始。`status:blocked` 会标红。
- 负责人：`owner:M1`–`owner:M5` 标签 → Issue 模板里的「负责人」字段 → 指派人。
- 可视化：
  - 「每个人推进了多少」：总进度条按成员分段，每段 = 该成员已完成任务数 ÷ 全部任务数，所有段加起来就是总进度。
  - 「项目关系图」：按 `docs/team-assignment.md` 的模块分工画出谁的成果被谁用到（M1 是地基 → M2 登录与数据 → M3、M5 → M4 汇总 → 上线）。点一位成员，会高亮受 TA 影响的下游模块，并显示 TA 的进度贡献、支撑的模块和下游未完成任务数。
  - 模块关系写在 `site/lib.js` 的 `DEPENDENCIES` 里，分工变了改这里即可。
- 页面在浏览器里直接读 GitHub API（未登录每小时 60 次，页面会缓存 1 分钟），Issue 和 PR 一变化，刷新就能看到；只有改了 `board/site/` 的代码才需要重新发布（`.github/workflows/board.yml`，合并到 main 自动发布）。
- 本地预览：`npx serve board/site`，或任意静态服务器。逻辑在 `site/lib.js`，测试在 `lib.test.js`。
