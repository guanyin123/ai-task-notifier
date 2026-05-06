# Progress Log

## Session: 2026-04-18

### Phase 1: Requirements & Discovery
- **Status:** complete
- **Started:** 2026-04-18
- Actions taken:
  - 读取 `planning-with-files` 技能说明，确认需要在项目根目录维护 `task_plan.md`、`findings.md`、`progress.md`。
  - 定位并读取 Obsidian 中的 `mvp-tech-plan.md`，提取 MVP 目标、路线 A/B、事件判定策略、目录建议和开发顺序。
  - 检查当前仓库状态，确认项目目前仅有 `README.md`，尚未初始化工程代码。
  - 确认本机可用环境：Node `v22.22.0`、npm `10.9.4`、Claude Code `2.1.112`。
  - 读取 `claude --help`，确认 `stream-json` 相关参数在当前环境存在。
- Files created/modified:
  - `task_plan.md` (created)
  - `findings.md` (created)
  - `progress.md` (created)

### Phase 2: Planning & Structure
- **Status:** complete
- **Started:** 2026-04-18
- Actions taken:
  - 将 Obsidian 计划书收敛为当前项目的执行方案，明确“长连接验证优先，单轮 fallback 保底”的双轨策略。
  - 将技术栈从推荐项收敛为实际采用项：Node.js 22、TypeScript、`tsx`、`vitest`、`zod`、Node 内置 `spawn/readline/events`、`osascript`。
  - 将项目拆成 6 个阶段，先处理规划文件和技术决策，再进入工程初始化、事件流、通知和 REPL。
  - 记录当前已知风险：Claude stdin 长连接协议仍需脚本级验证，不直接假设已完全可用。
  - 细化了 Phase 3 的启动任务，明确下一步先初始化包配置、脚本、目录结构与最小入口文件。
- Files created/modified:
  - `task_plan.md` (created)
  - `findings.md` (created)
  - `progress.md` (created)

### Phase 3: Project Bootstrap
- **Status:** complete
- Actions taken:
  - 通过 `npm init -y` 初始化项目包配置，并安装 `zod`、`typescript`、`tsx`、`vitest`、`@types/node`。
  - 建立 `src/`、`scripts/`、`test/` 基础目录，并加入 `.gitignore` 与 `tsconfig.json`。
  - 写入最小入口 `src/index.ts` 和 `src/app/repl.ts`，让 `npm run dev` 可以直接跑通。
  - 新增 `src/claude/required-flags.ts`，抽出 Claude `stream-json` 关键旗标检测逻辑。
  - 新增 `scripts/probe-claude-stream.ts`，第一版先做 Claude CLI 关键旗标验证。
  - 新增 `test/required-flags.test.ts`，为旗标检测逻辑补上最小单测。
- Files created/modified:
  - `package.json` (created and updated)
  - `package-lock.json` (created)
  - `.gitignore` (created)
  - `tsconfig.json` (created)
  - `src/index.ts` (created)
  - `src/app/repl.ts` (created)
  - `src/claude/required-flags.ts` (created)
  - `scripts/probe-claude-stream.ts` (created)
  - `test/required-flags.test.ts` (created)
  - `task_plan.md` (updated)

### Phase 4: Claude Event Pipeline
- **Status:** in_progress
- Actions taken:
  - 将 `probe` 从纯旗标检测扩展为真实 `stream-json` live probe，并确认当前 CLI 需要 `--verbose` 才能在 `--print` 下输出 `stream-json`。
  - 新增 `src/claude/parser.ts`，支持逐行解析 JSONL、识别 `stream_event` 类型、提取 `text_delta` 与最终 assistant 可见文本。
  - 新增 `src/claude/session.ts`，实现 turn/session 跟踪，并在“有可见文本 + 收到 `message_stop`”时产出通知信号。
  - 使用裁剪后的真实事件流建立 `test/fixtures/ok-stream.jsonl`，覆盖 tool_use turn 与 text turn 共存的情况。
  - 新增 `test/parser.test.ts` 和 `test/session.test.ts`，验证 parser 与 session tracker 行为。
- Files created/modified:
  - `scripts/probe-claude-stream.ts` (updated)
  - `src/claude/parser.ts` (created)
  - `src/claude/session.ts` (created)
  - `test/fixtures/ok-stream.jsonl` (created)
  - `test/parser.test.ts` (created)
  - `test/session.test.ts` (created)

### Phase 5: Notification & REPL MVP
- **Status:** in_progress
- Actions taken:
  - 新增 `src/notifications/formatter.ts`，实现通知正文、预览截断、时长附加等格式化逻辑。
  - 新增 `src/notifications/macos.ts`，封装 `osascript` 发送 macOS 通知。
  - 将 `probe -- --live` 与 `ClaudeSessionTracker` 接通，并支持 `--notify` 在真实 `message_stop` 条件满足时发通知。
  - 新增 `test/notification-format.test.ts`，覆盖通知格式化逻辑。
  - 新增 `src/claude/run-prompt.ts`，把单轮 Claude 调用、流式消费和 session 判定串起来。
  - 将 `src/app/repl.ts` 从占位入口升级为可用的最小 REPL。
  - 修复了管道/EOF 模式下 `readline` 提前关闭导致的 `ERR_USE_AFTER_CLOSE`。
  - 更新 `README.md`，补充安装、命令、使用方式和已知限制。
- Files created/modified:
  - `src/notifications/formatter.ts` (created)
  - `src/notifications/macos.ts` (created)
  - `scripts/probe-claude-stream.ts` (updated)
  - `test/notification-format.test.ts` (created)
  - `src/claude/run-prompt.ts` (created)
  - `src/app/repl.ts` (updated)
  - `src/index.ts` (updated)
  - `README.md` (updated)
  - `task_plan.md` (updated)
  - `findings.md` (updated)
  - `progress.md` (updated)

### Phase 6: Verification & Delivery
- **Status:** complete
- Actions taken:
  - 手工验证 `npm run probe -- --live`，确认真实流中存在 tool_use turn 与 text turn 两轮 `message_stop`。
  - 手工验证 `printf 'Reply with exactly OK\\nexit\\n' | npm run dev`，确认最小 REPL 能输出 `Claude: OK` 并正常退出。
  - 通过直接调用 `claude -p --resume <session_id>` 验证会话上下文继承可用。
  - 通过 PTY 交互验证最小 REPL 中连续两轮对话可以正确记住上一轮回复。
- Files created/modified:
  - `task_plan.md` (updated)
  - `findings.md` (updated)
  - `progress.md` (updated)

### Phase 7: Session Polish
- **Status:** complete
- Actions taken:
  - 为 `run-prompt` 增加 `resumeSessionId` 支持，并从 `result.session_id` 回填当前会话 ID。
  - 新增 `buildClaudePromptArgs()`，把 CLI 参数拼装从运行逻辑中拆出来，便于测试。
  - 将 REPL 升级为默认复用当前会话，并增加 `/session` 与 `/new` 命令。
  - 修复了交互模式下 `Ctrl+C` 触发 `AbortError` 栈的问题。
  - 更新 README，补充连续会话与会话命令说明。
  - 新增 `src/state/session-store.ts`，把当前 session 持久化到项目本地 `.ai-task-notifier/session.json`。
  - REPL 启动时自动恢复最近会话，并在 stale session 场景下清空缓存后重试当前消息。
- Files created/modified:
  - `src/claude/run-prompt.ts` (updated)
  - `src/claude/parser.ts` (updated)
  - `src/app/repl.ts` (updated)
  - `src/state/session-store.ts` (created)
  - `test/run-prompt.test.ts` (created)
  - `test/session-store.test.ts` (created)
  - `test/repl-session-helpers.test.ts` (created)
  - `.gitignore` (updated)
  - `README.md` (updated)
  - `task_plan.md` (updated)
  - `findings.md` (updated)
  - `progress.md` (updated)

### Phase 8: Config & UX Polish
- **Status:** complete
- Actions taken:
  - 修复 code review 中的两个中等级问题：通知发送失败不再中断聊天；`claude` spawn 失败现在会被正常捕获。
  - 新增 `src/config/schema.ts`、`src/config/defaults.ts`、`src/config/load.ts`，把通知开关、声音、摘要长度等配置从代码常量升级为配置文件。
  - REPL 启动时加载 `~/.config/ai-task-notifier/config.json`，并按配置决定是否发通知、使用什么声音、是否展示摘要以及摘要长度。
  - 更新 README，补充通知配置文件路径和示例。
  - 新增 `/help` 与 `/clear` 命令，并将 stale session 恢复逻辑抽成可测试 helper。
  - 修复 `src/index.ts` 顶层 `await` 在管道模式下触发 unsettled warning 的问题。
- Files created/modified:
  - `src/claude/run-prompt.ts` (updated)
  - `src/app/repl.ts` (updated)
  - `src/config/schema.ts` (created)
  - `src/config/defaults.ts` (created)
  - `src/config/load.ts` (created)
  - `src/notifications/formatter.ts` (updated)
  - `test/run-prompt.test.ts` (updated)
  - `test/repl-session-helpers.test.ts` (updated)
  - `test/config.test.ts` (created)
  - `test/notification-format.test.ts` (updated)
  - `README.md` (updated)
  - `task_plan.md` (updated)
  - `findings.md` (updated)
  - `progress.md` (updated)

### Phase 9: Final MVP Polish
- **Status:** in_progress
- Actions taken:
  - 新增 `src/notifications/policy.ts`，将 `minReplySeconds` 与 `notifyOnlyWhenAppInBackground` 的判断抽成纯逻辑模块。
  - 新增 `src/notifications/macos-focus.ts`，在 macOS 下做 best-effort 的前台应用检测。
  - 将新通知策略接入 REPL，并扩展配置 schema/defaults/README。
  - 修复 code review 指出的两个问题：通知失败不再中断聊天；`claude` spawn 失败有了显式错误处理。
  - 修复 stale session 自动恢复后回复与恢复提示挤在同一行的问题，并确认回复不会重复打印。
- Files created/modified:
  - `src/config/schema.ts` (updated)
  - `src/config/defaults.ts` (updated)
  - `src/app/repl.ts` (updated)
  - `src/notifications/policy.ts` (created)
  - `src/notifications/macos-focus.ts` (created)
  - `test/config.test.ts` (updated)
  - `test/notification-policy.test.ts` (created)
  - `README.md` (updated)
  - `task_plan.md` (updated)
  - `findings.md` (updated)
  - `progress.md` (updated)

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 定位 Obsidian 计划书 | `mdfind 'kMDItemFSName == "mvp-tech-plan*"c'` | 找到 `ai-task-notifier` 对应文档 | 成功定位到 `Documents/ObsidianVault/wiki/side-projects/ai-task-notifier/mvp-tech-plan.md` | ✓ |
| 检查 Node 环境 | `node -v` | Node 20+ 可用 | `v22.22.0` | ✓ |
| 检查 Claude 能力 | `claude --help` | 存在 `stream-json` 相关参数 | 已确认存在 `--input-format` / `--output-format` / `--include-partial-messages` / `--include-hook-events` | ✓ |
| 类型检查 | `npm run typecheck` | TypeScript 配置和源码通过 | 通过 | ✓ |
| 单元测试 | `npm test` | 最小测试通过 | 1 个测试文件、2 条用例全部通过 | ✓ |
| 入口启动 | `npm run dev` | 输出 bootstrap 信息 | 成功输出启动提示 | ✓ |
| Claude probe | `npm run probe` | 校验 CLI 关键旗标 | 成功输出版本号并确认全部旗标存在 | ✓ |
| Live stream probe | `npm run probe -- --live` | 采样真实 `stream-json` 事件 | 成功解析 39 条事件，并观察到 tool_use turn + text turn | ✓ |
| Phase 4 类型检查 | `npm run typecheck` | parser/session/notifier 增量代码通过 | 通过 | ✓ |
| Phase 4 单元测试 | `npm test` | parser/session/notifier 测试通过 | 4 个测试文件、8 条用例全部通过 | ✓ |
| REPL smoke test | `printf 'Reply with exactly OK\\nexit\\n' | npm run dev` | 输出 `Claude: OK` 并退出 | 通过 | ✓ |
| Resume validation | `claude -p --resume <session_id> ...` | 继承上一轮上下文 | 成功答出上一轮的 `FIRST` | ✓ |
| Multi-turn PTY REPL test | 在同一 REPL 内连续发送两轮消息 | 第二轮记住第一轮回复 | 成功答出 `FIRST` | ✓ |
| Ctrl+C exit test | 交互模式下发送 `Ctrl+C` | 正常退出无栈追踪 | 通过 | ✓ |
| Session persistence test | 两次独立启动 `npm run dev` | 第二次自动恢复第一次的会话 | 成功恢复并答出 `BIRD` | ✓ |
| Review fix typecheck | `npm run typecheck` | review 修复与配置代码通过 | 通过 | ✓ |
| Review fix tests | `npm test` | 回归测试与配置测试通过 | 8 个测试文件、21 条用例全部通过 | ✓ |
| UX command smoke test | `printf '/help\\n/clear\\nexit\\n' | npm run dev` | `/help` 输出命令，`/clear` 不破坏流程 | 通过 | ✓ |
| UX polish tests | `npm test` | `/help`、`/clear`、stale session helper 测试通过 | 8 个测试文件、24 条用例全部通过 | ✓ |
| Notification policy typecheck | `npm run typecheck` | 新通知策略代码通过 | 通过 | ✓ |
| Notification policy tests | `npm test` | `minReplySeconds` 和前台检测策略测试通过 | 9 个测试文件、29 条用例全部通过 | ✓ |
| Review fix regression test | `npm test` | review 修复与 stale 恢复回归通过 | 9 个测试文件、30 条用例全部通过 | ✓ |
| Stale session smoke test | 使用失效 `.ai-task-notifier/session.json` 启动并发送消息 | 先提示恢复，再只输出一次回复 | 通过 | ✓ |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-04-18 | `find` 扫描 `/Users/admin` 时命中 Photos Library 权限报错 | 1 | 改为使用 `mdfind` 和候选 Obsidian 目录定位目标文档 |
| 2026-04-19 | `ERR_USE_AFTER_CLOSE: readline was closed` | 1 | 在 REPL 中捕获 `question()` 的 EOF/close 场景，正常退出循环 |
| 2026-04-19 | `AbortError: Aborted with Ctrl+C` | 1 | 在 REPL 中捕获 `ABORT_ERR`，让交互模式正常退出 |

## Plan Adjustments
- 初始计划书虽然更偏向路线 A，但当前执行计划不把路线 A 视为唯一入口，而是明确保留路线 B 的过渡交付。
- `eventemitter3` 和 `ora` 暂不列为必选依赖，等实现复杂度增长后再考虑引入。
- 在真正实现 REPL 前，先把 parser/state 作为独立可测试模块推进，避免 transport 探索和业务逻辑纠缠。
- Project Bootstrap 完成后，Phase 4 先扩展 `probe` 再落 parser/state，而不是直接跳进完整多轮 REPL。
- 现在通知闭环先挂在 `probe` 上验证，下一步再接到 REPL，避免一边摸协议一边调交互层。
- 当前已经完成路线 B 的最小闭环，后续是否升级到会话复用模式，可以作为下一阶段迭代决策。
- 当前已经把会话复用接进 REPL，下一阶段可以开始考虑会话持久化和恢复策略。
- 当前已经完成项目本地 session 持久化，下一阶段重点转到配置化和 UX 细节。
- code review 暴露的稳定性问题已经处理，当前再往前做功能会更稳。
- 当前 UX 小命令和 stale session 回归测试都已就位，主链路基本稳定。
- 细粒度通知策略也已经就位，后续更像产品能力补强而不是基础设施铺路。
- 最近一轮 code review 发现的问题已经修完，当前主链路又稳了一截。

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | Phase 9，主链路已经稳定，开始转向最终 MVP 打磨 |
| Where am I going? | 评估最近回复摘要查看能力，或者清理文档和测试结果里的阶段性冗余 |
| What's the goal? | 做出 Claude Code 单轮回复完成通知的 MVP，并让方案与进度可持续维护 |
| What have I learned? | 恢复路径这种“低频但脆弱”的分支，最好既有单测也有一次真实 smoke test |
| What have I done? | 已修复 review 问题，并确认 stale session 恢复提示与回复输出都正常 |

---
*Update after completing each phase or encountering errors*
