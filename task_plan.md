# Task Plan: AI Task Notifier MVP

## Goal
根据 Obsidian 中的 `mvp-tech-plan`，为 `ai-task-notifier` 先建立可持续维护的规划文件体系，并明确 MVP 的开发方案、实施顺序与技术栈选型，为后续实现 Claude Code 单轮回复完成通知做准备。

## Current Phase
Phase 9

## Phases

### Phase 1: Requirements & Discovery
- [x] 理解用户当前诉求
- [x] 读取 Obsidian `mvp-tech-plan`
- [x] 盘点当前仓库与本机运行环境
- [x] 将发现写入 `findings.md`
- **Status:** complete

### Phase 2: Planning & Structure
- [x] 建立 `task_plan.md`、`findings.md`、`progress.md`
- [x] 决定 MVP 的开发路线与回退策略
- [x] 决定首批技术栈与目录结构
- [x] 细化 Phase 3 的实施任务清单
- **Status:** complete

### Phase 3: Project Bootstrap
- [x] 初始化 `package.json`
- [x] 安装并配置 TypeScript、`tsx`、`vitest`、`zod`
- [x] 建立 `src/`、`scripts/`、`test/` 基础目录
- [x] 写入 `tsconfig.json`
- [x] 增加 `dev`、`probe`、`test` 脚本
- [x] 补一个最小 `src/index.ts` 入口
- **Status:** complete

### Phase 4: Claude Event Pipeline
- [x] 实现 `scripts/probe-claude-stream.ts`
- [x] 实现 Claude stdout JSONL parser
- [x] 实现 turn/session 状态机
- [x] 用样本事件流覆盖关键测试
- **Status:** complete

### Phase 5: Notification & REPL MVP
- [x] 接入 macOS 通知能力
- [x] 实现最小 REPL 多轮交互
- [x] 在 assistant `message_stop` 时触发通知
- [x] 补充 README 与已知限制
- **Status:** complete

### Phase 6: Verification & Delivery
- [x] 跑通手工验证清单
- [x] 记录测试结果与风险
- [x] 交付当前阶段成果并更新规划文件
- **Status:** complete

### Phase 7: Session Polish
- [x] 评估是否需要将当前会话 ID 持久化到本地配置或缓存
- [x] 评估是否支持启动时恢复最近一次会话
- [x] 为 `/new`、`/session` 和连续会话行为补更多自动化测试
- **Status:** complete

### Phase 8: Config & UX Polish
- [x] 决定是否把通知开关、preview 长度、声音等暴露为配置文件
- [x] 评估是否需要增加 `/clear`、`/help` 等命令
- [x] 增加 stale session 自动恢复路径的显式测试
- **Status:** complete

### Phase 9: Final MVP Polish
- [x] 评估是否需要增加 `notifyOnlyWhenAppInBackground` / `minReplySeconds` 之类更细的通知策略
- [ ] 评估是否需要支持导出或查看最近一次回复摘要
- [ ] 清理 README 和测试结果中的阶段性重复信息
- **Status:** in_progress

## Key Questions
1. Claude `--input-format stream-json` 在当前版本里是否支持稳定的长连接多轮 stdin 协议？
2. `assistant` 事件与 `message_stop` 的组合，是否足以避免 thinking/tool use 造成误通知？
3. MVP 是直接落长连接 REPL，还是先用单轮调用 + 可恢复 session 作为过渡？
4. 通知摘要要从 delta 流拼接，还是优先使用最终 `assistant` 事件中的完整文本？

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 以 Obsidian `mvp-tech-plan` 作为当前项目规划基线 | 用户明确要求按该计划推进，且文档已包含核心架构假设与阶段拆分 |
| 使用 `planning-with-files` 工作流，在项目根目录维护 `task_plan.md`、`findings.md`、`progress.md` | 这个任务天然跨多阶段，先把外部记忆搭起来，后续连续开发不会丢上下文 |
| 运行时采用 Node.js + TypeScript | Claude Code CLI 属于 Node 生态；本机已有 Node `v22.22.0`，与计划书中的 Node 20+ 要求兼容 |
| MVP 采用“路线 A 优先验证，路线 B 作为明确回退”的混合推进策略 | 既保留最终体验目标，也避免在 stdin 协议未摸清前把实现卡死 |
| 事件完成判定以 `assistant` 可见文本 + `message_stop` 为主，不以 `result` 为主判定 | 这与计划书一致，并且对未来长连接会话更通用 |
| 优先使用 Node 内置能力：`child_process.spawn`、`readline/promises`、`events` | 当前需求不复杂，先减少依赖面，后续真有必要再引入第三方库 |
| 测试采用 `vitest`，开发执行采用 `tsx` | 这是 Node + TS 小型 CLI 项目的轻量常见组合，启动快，适合 parser/state 迭代 |
| 模块结构按 `app / claude / notifications / state / config / utils` 分层 | 与计划书建议一致，便于 parser、状态机、通知模块独立演进与测试 |
| Phase 3 先只搭“可运行骨架”，不预生成大量空模块 | 先让入口、探测脚本、测试与类型检查跑通，后续模块按真实实现增长 |
| `scripts/probe-claude-stream.ts` 第一版先验证 CLI 能力旗标，而不直接耦合实时 prompt 探测 | 这样能先建立稳定的命令入口与测试面，再逐步扩成真实事件流探针 |
| `stream-json` live probe 需要 `--verbose` 与 `--print` 搭配 | 当前 Claude CLI 已明确报错要求该组合，probe 脚本已内建这个约束 |
| 通知触发逻辑以 `ClaudeSessionTracker` 的 `hasVisibleText + message_stop` 为准 | 真实输出里存在 tool/skill 轮次的 `message_stop`，不能仅凭 `message_stop` 直接通知 |
| 先把通知能力接到 `probe --live --notify`，再接入最终 REPL | 这样可以先在真实事件流上验证通知闭环，降低集成复杂度 |
| MVP REPL 先采用“每轮单独调用 Claude”的路线 B 过渡实现 | 这已经形成可用闭环，同时保留后续升级到真正长连接会话的空间 |
| 连续对话优先复用 Claude `--resume <session_id>` | 当前机器上已经验证可用，比直接攻长连接 stdin 协议更稳、更快落地 |
| 当前 session 以项目本地 `.ai-task-notifier/session.json` 持久化 | 这样每个项目能独立恢复最近会话，同时不污染 git 历史 |
| 通知配置从 `~/.config/ai-task-notifier/config.json` 读取 | 这和原计划中的配置路径一致，也便于不同项目共享通知偏好 |
| `/clear` 既清空当前 session，也在 TTY 环境下清屏 | 这样它比 `/new` 更像“重新开始”，同时在非交互环境里不会输出多余控制字符 |
| 更细的通知策略先支持 `minReplySeconds` 与 `notifyOnlyWhenAppInBackground` | 这两项最贴近真实使用场景，而且实现复杂度适中 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `find` 扫描整个 `/Users/admin` 时命中 Photos Library 权限错误 | 1 | 改为使用 `mdfind` 和常见 Obsidian 路径定向定位文件，已找到目标文档 |

## Notes
- 下一步先补完 Phase 3 的实施任务清单，再进入真正代码初始化。
- 如果 `probe-claude-stream.ts` 证明长连接协议不稳定，立即切到“单轮调用 + session/resume”落地 MVP，不在协议摸索上无限拖延。
- `progress.md` 需要持续记录每次规划调整与阶段推进，不只记代码实现。
- Phase 3 已完成，下一步优先扩充 `probe-claude-stream.ts` 到真实 `stream-json` 探测，并开始 parser/state 模块。
- Phase 4 已完成。下一步是把现有 parser/session/notifier 串进最小 REPL，而不是继续孤立扩充 probe。
- Phase 5 已完成。Phase 6 主要是继续扩充手工验证、补风险说明，并决定何时把路线 B 升级到真正多轮会话。
- Phase 6 已完成。下一阶段主要是打磨 session 体验，决定是否持久化会话和恢复最近会话。
- Phase 7 已完成。下一阶段主要转向配置化和少量 UX 命令打磨。
- review 中指出的两个中等级问题已修复，当前可以继续做 UX 命令和 stale session 恢复测试。
- Phase 8 已完成。当前已经具备一个相当完整的 MVP，后续更偏向产品打磨而不是主链路补洞。
- Phase 9 已经开始落更细的通知策略，下一步可以考虑回复摘要查看能力或 README 收口。
