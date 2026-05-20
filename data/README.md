# 数据格式

把下面这些 JSON 文件放在 `data/` 根目录。所有文件都是可选的，缺失会回落到
内置演示数据。**只要某个文件存在，那一份演示数据就被完整替换**（不是合并）。

## 1. `data/me.json` — 我自己

```json
{
  "wxid": "me",
  "name": "我的昵称",
  "wxidShort": "wxid_abc123",
  "avatar": "media/avatars/me.jpg",
  "signature": "签名一行字",
  "region": "广东 深圳",
  "gender": 1,
  "coverImage": "media/images/cover.jpg"
}
```

- `wxid`：你自己的 id，用来判断哪条消息是 "我" 发的
- `gender`：1 男 2 女（在资料页显示）
- `coverImage`：朋友圈封面图，可选

## 2. `data/contacts.json` — 联系人 / 群

```json
[
  {
    "id": "zhangsan",
    "name": "张三",
    "remark": "张三 / 同事",
    "wxidShort": "zhangsan_88",
    "avatar": "media/avatars/zhangsan.jpg",
    "signature": "在路上",
    "region": "广东 深圳",
    "gender": 1
  },
  {
    "id": "group_family",
    "name": "家庭群",
    "isGroup": true,
    "avatar": "media/avatars/family.jpg",
    "members": [
      { "id": "mom", "name": "妈妈", "avatar": "media/avatars/mom.jpg" },
      { "id": "dad", "name": "爸爸" },
      { "id": "me", "name": "我" }
    ]
  }
]
```

- `id` 是关键字段：用来跟 `messages/<id>.json` 和 `chats.json` 里的 `id` 对上
- `remark` 是你给对方设置的备注（聊天列表 / 通讯录优先显示）
- 群没有 `avatar` 时，自动按 `members` 拼九宫格
- 群成员里 `me` 表示自己；成员的 `avatar` 也会显示在群聊气泡左边

## 3. `data/chats.json` — 出现在首页的会话

```json
[
  {
    "id": "zhangsan",
    "pinned": true,
    "muted": false,
    "unread": 2,
    "atMe": false,
    "draft": "",
    "lastMessage": "好的明天见",
    "lastTime": "2024-05-20T14:23:00"
  }
]
```

- 列表会自动按 `lastTime` 倒序、置顶在前
- `atMe: true` → 预览前显示橙红 `[有人@我]`
- `draft` 非空 → 预览前显示橙红 `[草稿]` 并覆盖 `lastMessage`
- `muted: true` → 名字旁有静音图标，未读用灰点而不是红字
- `lastMessage` 自己写就行，比如 `[图片]`、`[语音]`、`[文件] 报告.pdf`、`张三：...`

## 4. `data/messages/<id>.json` — 单个会话的所有消息

文件名等于 `contacts.json` 里的 `id`，比如 `data/messages/zhangsan.json`。

```json
[
  { "id": "1", "type": "text", "from": "zhangsan", "time": "2024-05-20 14:00:00", "content": "在吗" },
  { "id": "2", "type": "text", "from": "me",       "time": "2024-05-20 14:00:30", "content": "在的" }
]
```

`from` 是发送者的 id（自己用 me.json 里的 wxid）。`time` 接受
`YYYY-MM-DD HH:mm:ss` 或 ISO 8601，会自动按 5 分钟间隔在 UI 上插入时间分隔。

### 所有消息类型

#### text（文字）
```json
{ "type": "text", "from": "x", "time": "...", "content": "支持\n换行\n和 emoji 😊" }
```

#### image（图片）
```json
{ "type": "image", "from": "x", "time": "...",
  "src": "media/images/abc.jpg",
  "width": 1080, "height": 1440 }
```

#### sticker（自定义表情）
```json
{ "type": "sticker", "from": "x", "time": "...", "src": "media/stickers/xxx.gif" }
```
透明背景，不带气泡尾巴。

#### voice（语音）
```json
{ "type": "voice", "from": "x", "time": "...",
  "src": "media/voice/abc.mp3", "duration": 4 }
```
气泡宽度按 `duration` 自动算。点击播放（要求浏览器能解的格式，
微信原生是 silk，需要先转 mp3/m4a）。

#### video（视频）
```json
{ "type": "video", "from": "x", "time": "...",
  "src": "media/video/abc.mp4",
  "poster": "media/video/abc_thumb.jpg",
  "duration": 12 }
```

#### file（文件）
```json
{ "type": "file", "from": "x", "time": "...",
  "name": "季度报告.pdf", "size": 1843200,
  "fileType": "pdf",
  "src": "media/files/abc.pdf" }
```
`fileType`：`pdf` / `word` / `excel` / 留空 → 不同颜色的图标。

#### link（公众号 / 网页卡片）
```json
{ "type": "link", "from": "x", "time": "...",
  "title": "标题",
  "description": "摘要",
  "thumbnail": "media/images/thumb.jpg",
  "source": "来源",
  "url": "https://..." }
```

#### location（位置）
```json
{ "type": "location", "from": "x", "time": "...",
  "title": "腾讯滨海大厦", "address": "广东省深圳市..." }
```

#### redpacket（红包）
```json
{ "type": "redpacket", "from": "x", "time": "...",
  "title": "恭喜发财，大吉大利" }
```

#### transfer（转账）
```json
{ "type": "transfer", "from": "me", "time": "...",
  "amount": 188.00, "memo": "饭钱" }
```

#### quote（引用回复）
```json
{ "type": "quote", "from": "me", "time": "...",
  "content": "我的回复内容",
  "quote": { "from": "zhangsan", "fromName": "张三", "content": "被引用的内容" } }
```

#### card（个人名片）
```json
{ "type": "card", "from": "x", "time": "...",
  "card": { "name": "李四", "wxid": "lisi", "avatar": "..." } }
```

#### system（系统消息）
```json
{ "type": "system", "time": "...", "content": "对方已撤回一条消息" }
```
居中显示的灰字，无气泡、无头像。

## 5. `data/moments.json` — 朋友圈

```json
[
  {
    "id": "1",
    "author": "zhangsan",
    "time": "2024-05-20 14:00:00",
    "text": "深圳的夕阳真不错",
    "images": ["media/images/a.jpg", "media/images/b.jpg"],
    "location": "深圳·南山",
    "likes": [
      { "id": "me", "name": "我" },
      { "id": "lisi", "name": "李四" }
    ],
    "comments": [
      { "from": "lisi", "name": "李四", "content": "羡慕了" },
      { "from": "zhangsan", "name": "张三", "reply": "李四", "content": "下次一起" }
    ]
  }
]
```

- `images`：1 张就单图，2 张并列，3 张以上九宫格（最多 9 张）
- `comments[].reply`：被回复的人的名字（可选）

## 媒体文件

放在 `data/media/` 下，子目录随意，路径在 JSON 里写相对站点根的：

```
data/media/
├── avatars/
├── images/
├── voice/
├── video/
├── stickers/
└── files/
```

## 从 iOS 备份导出聊天记录的常见路径

- 用 [iMazing](https://imazing.com/) / [iBackup Viewer](https://www.imactools.com/iphonebackupviewer/)
  解密 iTunes 备份，里面微信文件夹是 `Documents/<hash>/DB/MM.sqlite`
- 直接读 SQLite，message 表里就有每条消息的 `Type`/`Content`/`CreateTime`/`Des` 等
- 或者用现成的开源工具：
  [WX-Dump-4j](https://github.com/xuchengsheng/wx-dump-4j) /
  [WeChatMsg](https://github.com/LC044/WeChatMsg) 一类，
  它们能直接导出 HTML/CSV，你写个小脚本把字段映射到上面的 schema 就行

字段映射的核心思路：

| WeChat backup           | 这里的 schema              |
|-------------------------|----------------------------|
| `Type` = 1              | `text`                     |
| `Type` = 3              | `image`                    |
| `Type` = 34             | `voice`（要 silk → mp3）   |
| `Type` = 43             | `video`                    |
| `Type` = 49             | `link` / `file` / `quote`（看子类型） |
| `Type` = 47             | `sticker`                  |
| `Type` = 48             | `location`                 |
| `Type` = 2000/2001      | `transfer` / `redpacket`   |
| `Type` = 10000          | `system`                   |
| `Des` = 0               | `from` = 对方 id           |
| `Des` = 1               | `from` = 自己（me）        |
| `CreateTime` (秒)       | `time` ← `new Date(t*1000).toISOString()` |
