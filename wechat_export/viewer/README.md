# 微信记录查看器（本地 Web 版）

> 🎯 **最快上手**：下载 `wechat_viewer.html`（单文件 52KB，完全离线）→ 双击 → 拖 CSV 进去。零安装、零依赖、零联网。

把 Codex（或我的脚本）导出的 CSV/JSONL 拖进来，立即看一个**微信风格**的聊天界面：
- 左侧栏会话列表（按最近活跃排序）
- 右侧消息流（自己发的绿气泡，对方白气泡，按日期分组）
- 顶部全局搜索（同时筛会话和消息内容）
- 📊 按钮看统计（消息量、会话排行、按月分布、消息类型分布）

## 怎么用

### 方式 A：单文件版（推荐）

下载 `wechat_viewer.html`（一个文件，52KB，全部内嵌），双击打开，拖 CSV 进去。**完全离线**，零依赖。

直链：
[`wechat_viewer.html`](./wechat_viewer.html)

### 方式 B：开发版（多文件）

```bash
# 1) 把整个 viewer/ 目录复制到你 Mac 上任意位置
# 2) 双击 index.html
# 3) 拖 CSV/JSONL 进虚线框
```

需要联网（从 CDN 加载 PapaParse 一次性）。改代码方便。

### 重新打包单文件

改了源码后想重新生成 `wechat_viewer.html`：

```bash
# 第一次需要拉 PapaParse
curl -L https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js -o /tmp/papaparse.min.js
python3 bundle.py
```

**所有方式都是数据不出本机**——浏览器内 FileReader 读 CSV，无上传、无后端。

## 支持的数据格式

**自动识别**这些常见列名（不区分大小写）：

| 字段 | 接受的列名 |
|---|---|
| 时间戳 | `CreateTime` / `msgCreateTime` / `timestamp` / `time` / `date` / `ts` |
| 内容 | `Message` / `msgContent` / `content` / `msg` / `text` |
| 方向 | `MesDes` / `is_self` / `direction`（0/self=自己发）|
| 会话 | `Talker` / `ChatUsrName` / `session` / `chat_id` / `room` |
| 发送者 | `Sender` / `FromUser` / `sender_name` |
| 类型 | `Type` / `mesType` / `msg_type` |

支持的扩展名：`.csv`, `.jsonl`, `.json`, `.txt`（按 CSV 解析）。

**可一次拖多个**：比如同时拖 `all_messages.csv` + `raw_messages.csv` + `unresolved_compressed.csv`，会自动合并展示。

## 离线版（不连 CDN）

把 PapaParse 下载到本地：

```bash
cd wechat_export/viewer
curl -L https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js -o papaparse.min.js
```

然后编辑 `index.html`，把：

```html
<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
```

改成：

```html
<script src="papaparse.min.js"></script>
```

## 已实现的功能

- ✅ 拖拽加载多文件，自动列名识别
- ✅ 会话列表（按最近活跃排序，群聊紫色头像，私聊绿色）
- ✅ WeChat 风格消息气泡 + 日期分隔条
- ✅ 全文搜索（命中高亮，会话/消息同时筛）
- ✅ 统计面板（Top 会话、消息类型、月分布）
- ✅ 非文本消息打类型标签（图片/语音/视频/位置/链接...）

## 路线图（按你说"更高级"展开）

- ⏳ 联系人/群成员名字解析（需要 WCDB_Contact 数据）
- ⏳ 撤回消息考古（sysmsg 反查原文）
- ⏳ 时间轴热力图（GitHub 贡献图风格）
- ⏳ 按对方/时间段导出 Markdown / PDF
- ⏳ 语义搜索（本地 embedding，跑在浏览器里）
- ⏳ Tauri 打包成 Mac/iOS app（PWA 可先用）

## 截图

（运行后自己看，单文件 HTML，没截图必要）

## 故障排除

**拖进去 0 条消息？**
- 看浏览器开发者控制台（⌥⌘I）— 我打了列名映射 log，看哪一列没识别
- 如果列名怪，提需求我加 alias

**消息时间全是 1970-01-01？**
- 时间列是文本格式但没被解析。把列名告诉我，我加正则

**会话列表头像/名字是 wxid_xxx 看不出谁是谁？**
- 需要 contact 表数据，等我做 WCDB_Contact 解析（路线图）
