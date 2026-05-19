# Mac WeChat 导出

## 总体流程

```
┌─────────────────────────────────────────────────────────┐
│ 1. 定位数据目录                                          │
│    ~/Library/Containers/com.tencent.xinWeChat/...       │
│         │                                               │
│         ▼                                               │
│ 2. 取 SQLCipher 密钥（一次性，从运行中的微信进程）        │
│    lldb 附加 + 读 sqlite3_key 的 key 参数               │
│         │                                               │
│         ▼                                               │
│ 3. 解密所有 msg_*.db                                    │
│    SQLCipher 4，PRAGMA 见 decrypt.py                    │
│         │                                               │
│         ▼                                               │
│ 4. 解析消息表 + 拷贝媒体文件                              │
│    输出 out/messages.jsonl + out/media/                 │
└─────────────────────────────────────────────────────────┘
```

## 前置条件

- macOS 11+，已登录的微信客户端**正在运行**
- Python 3.10+
- Xcode Command Line Tools（提供 lldb）
- Homebrew 装的 sqlcipher：`brew install sqlcipher`
- Python 库：`pip install -r requirements.txt`

## 使用步骤

### Step 1：装依赖

```bash
cd wechat_export/mac
brew install sqlcipher
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Step 2：取密钥（要 sudo，因为要 attach 进程）

确保微信正在运行**且已经打开过任意一个聊天窗口**（让数据库被打开过）。然后：

```bash
sudo python3 extract_key.py
```

成功的话会打印一串 64 字符的十六进制，并保存到 `.wechat_key`（gitignored）。

如果失败，看 `get_key_manual.md` 里的手动 lldb 流程兜底。

### Step 3：解密 + 导出

```bash
python3 export.py
```

默认输出到 `./out/`：
- `out/messages.jsonl` — 全部消息
- `out/media/` — 图片/语音/视频原文件
- `out/index.html` — 可在浏览器打开的查看器（按会话分组）
- `out/stats.json` — 消息条数、最早/最晚时间、会话数等元信息

### Step 4：核对

```bash
python3 export.py --stats-only
```

会打印总条数、按月分布、Top 20 会话，用来快速判断"管道是不是真的通了"。

## 微信 Mac 客户端数据目录

不同版本路径不一样，脚本会自动探测。常见位置：

```
~/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat/2.0b4.0.9/<hash>/Message/
~/Library/Application Support/com.tencent.xinWeChat/<hash>/Message/
```

里面会有 `msg_0.db` ~ `msg_N.db`（消息分库，按会话哈希分片）以及 `WCDB_Contact.sqlite`（联系人/群）。

## 已知问题

- **微信 4.x（2024 末后）改用了新的加密方式**：如果脚本提示密钥错，看 `KEY_FORMAT_V4.md`（待我视你的微信版本补）
- **SIP 必须信任 lldb**：如果 `lldb -p` 报权限错，要在「系统设置 → 隐私与安全 → 完全磁盘访问」里把 Terminal/iTerm 加上
- **不要在导出过程中收新消息**：解密的是磁盘上某个瞬间的快照，新消息要重跑
