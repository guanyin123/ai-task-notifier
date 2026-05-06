# ai-task-notifier

Claude Code 单轮回复完成提醒工具。

当前版本已经具备一个可用的最小闭环:
- 输入一条消息
- 调用 Claude Code
- 流式打印可见文本回复
- 在 assistant 可见文本消息收到 `message_stop` 时触发 macOS 通知
- 默认复用当前 Claude session，实现连续对话

## Requirements

- Node.js 20+
- 已安装并可用的 `claude` CLI
- 当前机器可正常使用 macOS `osascript`

## Install

本地开发:

```bash
npm install
```

发布后的全局安装形态:

```bash
npm install -g ai-task-notifier
ai-task-notifier
```

## Commands

```bash
npm run build
npm run dev
npm run pack:local
npm run probe
npm run probe -- --live
npm run probe -- --live --notify
npm test
npm run typecheck
```

## Usage

启动最小 REPL:

```bash
npm run dev
```

构建后也可以直接跑产物:

```bash
node dist/index.js
```

进入后直接输入消息即可。

- `/help`: 查看帮助
- `exit` / `quit`: 退出
- `/session`: 查看当前会话 ID
- `/new`: 丢弃当前会话，开启新会话
- `/clear`: 清空当前会话，并在支持时清屏

当前会话会保存在项目本地的 `.ai-task-notifier/session.json` 中，并在下次启动时自动恢复。
如果缓存的 session 已失效，工具会自动清空缓存并以新会话重试当前消息。

## Config

通知相关配置会从下面的文件读取:

```bash
~/.config/ai-task-notifier/config.json
```

示例:

```json
{
  "notifications": {
    "enabled": true,
    "sound": "Glass",
    "includePreview": true,
    "previewLength": 32,
    "minReplySeconds": 0,
    "notifyOnlyWhenAppInBackground": false
  }
}
```

当前支持:
- `notifications.enabled`: 是否发送通知
- `notifications.sound`: macOS 通知声音名称
- `notifications.includePreview`: 是否在通知中附带回复摘要
- `notifications.previewLength`: 摘要最大长度
- `notifications.minReplySeconds`: 只在回复持续至少指定秒数时才通知
- `notifications.notifyOnlyWhenAppInBackground`: 仅在当前终端应用不在前台时通知

说明:
- `notifyOnlyWhenAppInBackground` 目前是 macOS 下的 best-effort 前台应用检测。
- 如果前台应用检测失败，工具会继续发送通知，避免因为检测失败而漏提醒。

## Probe

默认 probe 只做本地能力检查，不会发起真实模型调用:

```bash
npm run probe
```

真实采样当前 Claude 的 `stream-json` 输出:

```bash
npm run probe -- --live
```

在真实采样时也发送系统通知:

```bash
npm run probe -- --live --notify
```

## Packaging

先构建:

```bash
npm run build
```

本地打包成 npm tarball:

```bash
npm run pack:local
```

打包后会得到类似下面的文件:

```bash
ai-task-notifier-1.0.0.tgz
```

你可以本地试装:

```bash
npm install -g ./ai-task-notifier-1.0.0.tgz
ai-task-notifier
```

如果要正式发布到 npm:

```bash
npm login
npm publish
```

发布前 `prepublishOnly` 会自动执行:

```bash
npm run typecheck
npm test
npm run build
```

## Current Architecture

- `src/claude/parser.ts`: JSONL 事件解析
- `src/claude/session.ts`: turn/session 跟踪与完成判定
- `src/claude/run-prompt.ts`: 单轮 Claude 调用与流式消费
- `src/notifications/formatter.ts`: 通知文案与摘要格式化
- `src/notifications/macos.ts`: macOS 通知发送
- `src/app/repl.ts`: 最小终端交互与会话控制命令

## Known Limitations

- 当前虽然会复用 Claude session，但底层依然是“每轮单独调用 Claude CLI + `--resume`”的模式，不是单进程长连接会话。
- 当前只支持 Claude Code。
- 当前只支持 macOS 通知。
- Claude CLI 的事件字段如果后续变动，parser 需要同步调整。
