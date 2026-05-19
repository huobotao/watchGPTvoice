# 归一化消息 schema

所有路径最终都输出 JSONL（每行一条 JSON）到 `out/messages.jsonl`。

## 字段定义

| 字段 | 类型 | 说明 |
|---|---|---|
| `msg_id` | string | 跨源唯一 ID。Mac/iOS 用源库 ROWID + 库名前缀；Android 用 `msgId` |
| `session` | string | 会话标识。1v1 是对方 wxid（如 `wxid_abc123`），群是 `xxxx@chatroom` |
| `session_name` | string\|null | 解析到的昵称/群名，解析失败留 null，后续可补 |
| `sender` | string | 发送者 wxid，自己发的统一标记为 `"self"` |
| `sender_name` | string\|null | 发送者昵称（群里才有意义） |
| `timestamp` | int | Unix 秒。Mac/iOS 库里是秒，Android 是毫秒，导入时统一 |
| `type` | string | 见下方枚举 |
| `content` | string | 文本消息=正文；其他类型=结构化 XML/JSON 原文 |
| `media_path` | string\|null | 附件相对路径，相对 `out/media/` |
| `source` | string | `"mac"` / `"android"` / `"ios"`，便于去重合并 |
| `raw_type` | int | 源库里的 type 数值，方便回查 |

## type 枚举

| type | 源库 type 值（参考） | 说明 |
|---|---|---|
| `text` | 1 | 纯文本 |
| `image` | 3 | 图片 |
| `voice` | 34 | 语音 |
| `video` | 43 | 视频 |
| `emoji` | 47 | 表情/动图 |
| `location` | 48 | 位置 |
| `file` | 49（subtype=6） | 文件 |
| `link` | 49（subtype=5） | 链接卡片 |
| `appmsg` | 49（其他） | 小程序/转账/其他 app 消息 |
| `voip` | 50 | 语音/视频通话 |
| `sysmsg` | 10000 | 系统消息（撤回、入群等） |
| `unknown` | — | 没识别的，原 type 保留在 `raw_type` |

## 多源合并去重

如果你同时跑了 Mac + Android + iOS：
- 用 `(session, sender, timestamp, content[:64])` 作为去重 key
- 优先级：`android > ios > mac`（前者通常更完整）
- 合并脚本：`common/merge.py`（待写）
