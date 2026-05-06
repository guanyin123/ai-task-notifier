# Findings & Decisions

## Requirements
- 按照 Obsidian 文档 `wiki/side-projects/ai-task-notifier/mvp-tech-plan.md` 作为当前项目的计划基线。
- 先在项目根目录建立 `progress.md`，并开始记录开发进度。
- 在真正写实现代码前，先完成开发方案与技术栈决策。
- 规划文件需要可持续更新，后续随着开发推进不断完善方案。

## Research Findings
- 当前仓库非常轻量，只有 `README.md`，尚未初始化 Node/TypeScript 工程。
- Obsidian 计划书位于 `/Users/admin/Documents/ObsidianVault/wiki/side-projects/ai-task-notifier/mvp-tech-plan.md`。
- 计划书确认的 MVP 目标是“Claude Code 单轮回复完成通知”，主判定信号为 Claude 结构化事件流中的 `assistant message stop`。
- 计划书推荐的总体方向是不要包官方 TUI，而是直接消费 Claude `stream-json` 输出并自建最小终端前端。
- 计划书给出了两条路线：A 为长连接多轮会话，B 为单轮调用 + session/resume；建议先验证 A，不通则回退 B。
- 当前机器环境可直接支撑该方案：`node -v` 为 `v22.22.0`，`npm -v` 为 `10.9.4`，`claude --version` 为 `2.1.112 (Claude Code)`。
- 当前 `claude --help` 已确认存在以下关键参数：`--print`、`--input-format`、`--output-format`、`--include-partial-messages`、`--include-hook-events`，与计划书假设一致。
- 项目骨架已初始化完成：`package.json`、`tsconfig.json`、`.gitignore`、`src/index.ts`、`scripts/probe-claude-stream.ts`、`test/required-flags.test.ts` 已建立。
- 当前 `npm run typecheck`、`npm test`、`npm run dev`、`npm run probe` 均已通过，说明 Phase 3 脚手架处于可运行状态。
- 真实 live probe 已确认：当前 Claude CLI 在 `--print` 下使用 `--output-format stream-json` 时，必须额外传 `--verbose`，否则会报错。
- 真实 live probe 输出形态包含 `system`、`stream_event`、`assistant`、`user`、`result`；其中由于 skill/tool_use 轮次存在，会出现多次 `message_start` / `message_stop`。
- 在实际样本里，前一轮 `message_stop` 对应的是 tool/skill 交互，后一轮 `message_stop` 才对应可见文本 `OK`，因此“仅盯 `message_stop`”会误报。
- 现已实现 `src/claude/parser.ts`、`src/claude/session.ts`、`src/notifications/formatter.ts`、`src/notifications/macos.ts`，并补上样本 fixture 与测试。
- `scripts/probe-claude-stream.ts` 现支持两种模式：默认做本地能力检查；`--live` 做真实事件流采样；`--notify` 可在 live probe 中发送 macOS 通知。
- `src/app/repl.ts` 与 `src/claude/run-prompt.ts` 已经接通，当前可运行一个“每轮单独调用 Claude”的最小 REPL。
- 手工验证已确认：`printf 'Reply with exactly OK\\nexit\\n' | npm run dev` 可以输出 `Claude: OK` 并正常退出。
- `README.md` 已更新，包含安装、命令、用法和已知限制。
- 已通过真实 CLI 实验确认：`claude -p --resume <session_id> --verbose --output-format stream-json ...` 可以继承上一轮上下文。
- REPL 现已接入 `--resume <session_id>`，能在连续两轮对话中正确记住上一轮内容。
- REPL 现支持 `/session` 查看当前会话和 `/new` 开启新会话。
- `Ctrl+C` 在交互模式下已改为正常退出，不再抛 `AbortError` 栈。
- 当前 session 已持久化到项目本地 `.ai-task-notifier/session.json`，重启 REPL 后会自动恢复。
- 当缓存的 session 失效时，REPL 会清空缓存并自动以新会话重试当前消息。
- 通知配置现已支持从 `~/.config/ai-task-notifier/config.json` 读取。
- code review 中指出的两处风险已处理：通知失败不再打断聊天主流程；`claude` spawn 失败现在会被正常捕获为错误。
- REPL 现已支持 `/help` 查看命令说明，支持 `/clear` 清空当前 session，并在 TTY 环境下清屏。
- stale session 自动恢复路径现在有了显式单测，不再只依赖手工验证。
- 通知策略现已支持 `minReplySeconds` 和 `notifyOnlyWhenAppInBackground`。
- `notifyOnlyWhenAppInBackground` 当前基于 macOS 前台应用名和当前终端应用名做 best-effort 比较；若无法判断，则默认继续发送通知。
- 针对最近一次 code review 的两个问题已修复：通知失败不再打断聊天主流程；`claude` spawn 失败现在会被正常捕获。
- stale session 恢复后的重复输出问题也已修复，恢复提示现在会先独立打印，再开始重试输出。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 技术栈采用 Node.js 22 + TypeScript | 本机环境已具备，且更适合处理 Claude CLI 的 stdin/stdout 流式协议 |
| 开发期执行工具采用 `tsx` | 对小型 TS CLI 项目足够轻便，无需先做额外构建步骤 |
| 单元测试采用 `vitest` | 便于覆盖 parser、状态机、通知格式化等纯逻辑模块 |
| 运行时先尽量使用 Node 内置 `EventEmitter`，不默认引入 `eventemitter3` | 现阶段事件复杂度不高，减少依赖更稳 |
| Claude 进程管理使用 Node 内置 `child_process.spawn` | 足以满足流式 stdout/stderr 消费与 stdin 写入 |
| REPL 输入使用 `readline/promises` | 满足 MVP 的最小终端交互，不急着引入更重的交互库 |
| 配置校验采用 `zod` | 后续读取 `~/.config/ai-task-notifier/config.json` 时可统一做 schema 校验 |
| 通知实现基于 `osascript` | 计划书已验证，且这是 macOS 上零额外依赖的最小实现 |
| 目录结构按 `src/app`, `src/claude`, `src/notifications`, `src/state`, `src/config`, `src/utils` 分层 | 与计划书一致，便于后续直接对照实施 |
| 研发策略采用“协议验证优先，交付路径双轨” | 先摸清长连接协议，但始终保留单轮 fallback，保证 MVP 能尽快可用 |
| Phase 3 只创建能直接运行和验证的最小骨架 | 先让脚手架和测试稳定，再逐步补业务模块，避免空文件噪音 |
| probe 脚本第一版先做 CLI 能力验证 | 它已经能校验当前 Claude CLI 是否具备关键 `stream-json` 旗标，后续再扩到真实事件流探测 |
| parser 与 session tracker 分离 | 原始 JSONL 解析和回复完成判定分开，后续换 transport 或接 REPL 时耦合更低 |
| `assistant` 最终消息的完整文本优先于 delta 累积结果 | 这样可以避免 partial message 与最终消息重复拼接成双份文本 |
| 通知格式化单独抽到 `formatter.ts` | 后续接配置文件、自定义 preview 长度或静音策略时更容易演进 |
| 先交付路线 B 的最小 REPL，而不是等待路线 A 完整打通 | 这样今天就有可用版本，后续再把会话复用做成迭代升级 |
| 会话复用采用 CLI 级 `--resume session_id`，而不是应用层自己拼历史 | 这能直接复用 Claude 自己的会话上下文，当前验证成本最低 |
| 会话缓存采用项目本地文件而不是全局共享缓存 | 这样不同仓库之间不会串话，也更符合 `cwd` 维度的 Claude 会话习惯 |
| 通知配置采用“全局用户配置 + 项目会话缓存”的分层方式 | 通知偏好更像用户级设置，而 session 更像项目级状态 |
| `/new` 与 `/clear` 分开保留 | `/new` 只重置会话，`/clear` 再加上清屏语义，交互上更顺手 |
| 通知抑制策略放在独立 `policy.ts` 模块 | 纯逻辑更容易测试，也避免把 REPL 变成条件分支泥团 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| 直接 `find /Users/admin` 扫描本地文档时触发 Photos Library 权限报错 | 改用 `mdfind` 和常见 Obsidian 路径组合，快速定位目标文档 |

## Resources
- Obsidian 计划书：`/Users/admin/Documents/ObsidianVault/wiki/side-projects/ai-task-notifier/mvp-tech-plan.md`
- 项目 README：`/Users/admin/ai-developer/ai-task-notifier/README.md`
- `planning-with-files` 技能：`/Users/admin/.agents/skills/planning-with-files/SKILL.md`
- Claude 旗标检测模块：`/Users/admin/ai-developer/ai-task-notifier/src/claude/required-flags.ts`
- 当前探测脚本：`/Users/admin/ai-developer/ai-task-notifier/scripts/probe-claude-stream.ts`
- JSONL parser：`/Users/admin/ai-developer/ai-task-notifier/src/claude/parser.ts`
- Session tracker：`/Users/admin/ai-developer/ai-task-notifier/src/claude/session.ts`
- 通知格式化：`/Users/admin/ai-developer/ai-task-notifier/src/notifications/formatter.ts`
- macOS 通知：`/Users/admin/ai-developer/ai-task-notifier/src/notifications/macos.ts`
- 单轮 Claude 调用：`/Users/admin/ai-developer/ai-task-notifier/src/claude/run-prompt.ts`
- REPL 入口：`/Users/admin/ai-developer/ai-task-notifier/src/app/repl.ts`
- README：`/Users/admin/ai-developer/ai-task-notifier/README.md`
- 会话存储：`/Users/admin/ai-developer/ai-task-notifier/src/state/session-store.ts`
- 配置加载：`/Users/admin/ai-developer/ai-task-notifier/src/config/load.ts`
- 配置 schema：`/Users/admin/ai-developer/ai-task-notifier/src/config/schema.ts`
- 通知策略：`/Users/admin/ai-developer/ai-task-notifier/src/notifications/policy.ts`
- 前台应用检测：`/Users/admin/ai-developer/ai-task-notifier/src/notifications/macos-focus.ts`

## Visual/Browser Findings
- 本轮没有使用浏览器或图片内容；核心信息来自本地 Markdown 文档和 CLI 输出。

## Proposed Implementation Strategy
1. Phase 3 先完成工程初始化：`package.json`、`tsconfig.json`、基础目录、`tsx`/`vitest` 脚本。
2. 第一批可执行任务先做 `scripts/probe-claude-stream.ts`，验证 Claude 长连接输入输出协议在当前版本是否稳定。
3. 在 transport 未完全敲定前，先实现与传输层解耦的 `parser.ts` 和 `session.ts`，让状态机和测试先行。
4. 一旦 `message_stop` 判定链路稳定，就接入 `notifications/macos.ts` 和摘要格式化。
5. 最后实现最小 REPL，多轮对话先追求稳定，不追求完整复刻官方 TUI。

## Current Bootstrap Snapshot
- 包管理：npm
- 运行时：Node.js 22（兼容要求设为 `>=20`）
- 开发脚本：`npm run dev`
- 探测脚本：`npm run probe`
- 测试：`npm test`
- 类型检查：`npm run typecheck`
- 当前已验证 CLI 关键旗标检测、真实 `stream-json` 采样、parser/session 判定、通知格式化。
- 当前已经具备最小 REPL，可对用户输入发起真实单轮请求，并在 `message_stop` 时发通知。
- 当前 REPL 已支持基于 `--resume` 的连续对话。
- 当前 REPL 已支持基于项目本地 session store 的自动恢复。
- 当前通知配置已经落地到全局配置文件。
- `/help` / `/clear` 和 stale session 显式测试已经落地。
- 更细的通知策略也已经落地。
- 下一步更像产品细化，例如最近一次回复摘要查看能力，或者清理 README/测试结果里的阶段性冗余。

---
*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*
