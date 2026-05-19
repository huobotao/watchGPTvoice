# wechat_export

把微信聊天记录从设备里捞出来、解密、转成结构化数据（JSONL + HTML）供后续分析。

## 三条提取路径

| 路径 | 数据完整度 | 操作难度 | 当前状态 |
|---|---|---|---|
| **Mac 客户端** (`mac/`) | 只覆盖在 Mac 登录期间的消息 | 低（已登录的 Mac 一行命令） | **PoC 优先实现** |
| **Android root dump** (`android/`) | 该账号全量历史（取决于本机存量） | 中（要 root + adb pull） | 方案就位，待数据 |
| **iOS 加密备份** (`ios/`) | 该账号全量历史（最近一次备份时刻） | 中（要 iTunes/Finder 加密备份） | 方案就位，待数据 |

## 决策建议

1. **先用 Mac 路径跑通管道** — 哪怕 Mac 上只有最近几个月的数据，目的是验证「解密 + 解析 + 导出」这条链路是通的
2. **再选数据量最大的源做全量** — 通常是 Android（如果你长期主用且没刷过机）或 iPhone（如果一直在 iCloud/iTunes 备份）
3. 三条路的输出统一落到 `out/messages.jsonl`，格式见 `common/schema.md`

## 输出格式

所有路径最终归一化为同一份 JSONL，每行一条消息：

```json
{
  "msg_id": "...",
  "session": "wxid_xxx 或 群id@chatroom",
  "session_name": "对方昵称/群名（如能解析）",
  "sender": "wxid_xxx 或 self",
  "sender_name": "...",
  "timestamp": 1700000000,
  "type": "text|image|voice|video|file|emoji|location|sysmsg|...",
  "content": "文本内容或结构化字段的 JSON 字符串",
  "media_path": "相对路径（若有附件）"
}
```

详见 `common/schema.md`。

## 法律/伦理边界

- 这是**你自己账号**的数据，提取自**你自己的设备**——属于个人数据导出，无授权问题
- 不要拿去解别人的设备
- 群聊里别人发的内容，二次传播前注意征求同意
