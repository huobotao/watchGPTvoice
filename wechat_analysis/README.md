# wechat_analysis — 微信聊天记录本地分析（MVP / L1）

把完整微信聊天记录解析成统一事件流，给出每个联系人的画像卡片。这是
[设计文档](../README.md) 里 L1（ETL）+ 联系人画像 那一层的最小可用实现，
为后续的时间线、关系动态、社交图谱奠定基础。

**全程本地**，纯 Python 标准库，无外部依赖，不发任何网络请求。

## 数据流

```
导出文件 (.jsonl/.csv)
   │  adapters (将来支持 MemoTrace / WeChatTweak 等)
   ▼
canonical Message  (schema.py)
   ▼
SQLite store       (etl.py → events.db)
   ▼
PeerProfile[]      (profile.py)
   ▼
overview.md  +  profiles.json  +  cards/<peer>.md
```

## 输入格式

JSONL（推荐）或 CSV。一条消息一行/一行，字段：

| 字段 | 必填 | 说明 |
|---|---|---|
| `ts` | ✔ | ISO 8601 / `YYYY-MM-DD HH:MM:SS` / epoch 秒/毫秒 |
| `peer_id` | ✔ | 私聊好友的 wxid 或群 id |
| `peer_name` | | 显示名（缺省=peer_id） |
| `peer_type` | | `private` \| `group`（缺省=private） |
| `direction` | ✔ | `in` \| `out` |
| `sender_id` | | 群聊时区分发送成员；私聊可省略 |
| `sender_name` | | 同上 |
| `msg_type` | | `text` \| `image` \| `voice` \| `video` \| `file` \| `sticker` \| `transfer` \| `redpacket` \| `location` \| `link` \| `card` \| `system` \| `other` |
| `text` | | 文本/媒体的可读描述（OCR/ASR 出的可放这里） |
| `duration_sec` | | 语音/视频时长 |
| `amount` | | 转账/红包金额 |
| `extra` | | 任意附加字段 |

样例见 `sample/generate.py`。

## 用法

```bash
# 1. 解析导出文件 → SQLite
python -m wechat_analysis ingest --input chat.jsonl --db events.db

# 2. 看看里面有哪些联系人
python -m wechat_analysis list --db events.db

# 3. 给单个联系人打卡片
python -m wechat_analysis profile --db events.db --peer 小M

# 4. 批量生成所有人的画像
python -m wechat_analysis profile --db events.db --out profiles_out/
#   → profiles_out/overview.md    总览表
#   → profiles_out/profiles.json  机读结构
#   → profiles_out/cards/*.md     每人一张卡片
```

## 跑一遍合成 demo

```bash
python -m wechat_analysis.sample.generate --out synth.jsonl --days 180
python -m wechat_analysis ingest --input synth.jsonl --db events.db
python -m wechat_analysis profile --db events.db --out profiles_out/
```

冒烟测试：

```bash
python -m wechat_analysis.tests.test_smoke
```

## 每张卡片里有什么

- 关系跨度（首次↔末次）、最长沉默
- 总消息 / 收发分布 / 主动比
- 平均消息长度（收 vs 发）
- 中位回复延迟（私聊）
- 深夜消息占比、周末占比
- 转账/红包流向与金额
- 近 30 天 vs 前 30 天 → 趋势标签（rising / falling / stable / new / dormant）
- 高峰周 Top 3
- 消息类型分布

## 还没做（后续 L2–L4）

- 媒体富化：OCR / ASR / 视觉理解（让图片和语音变成可分析文本）
- 实体抽取 / 称呼演变 / 情感分类（LLM）
- 时间线摘要 + 变点检测（自动找"升温/疏远/复联/断联"）
- 社交图谱（共同群、提及、社群发现、中心度）
- 自然语言问答前端（"她和 X 是什么时候开始变冷的？"）

## 隐私

数据极其敏感。该工具不发任何网络请求；
SQLite 文件就是你的全部状态，放在你自己控制的磁盘上即可。
后续接入 LLM 时建议默认走本地模型；如必须用云端 API，应先做脱敏（替换人名/地名/金额为占位符）再发送。
