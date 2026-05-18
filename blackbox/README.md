# Blackbox — 个人注意力黑匣子

把相册 / 位置 / 截图 / 聊天记录 / 录音等多源数据汇总成一个统一时间线，
然后用 Claude 对自己的过去提问。

## 设计原则

1. **单一事件表**：所有源最终落到 `events` 表，差异通过 `source` + `kind` + `raw_json` 表达。原始大文件（图片/音频/视频）留在文件系统，DB 只存路径。
2. **导入器可重跑**：每个 importer 用 `(source, external_id)` 做幂等键，重复导入不会产生重复行。
3. **分块喂 AI**：查询层把事件流切成 token 预算内的 chunk，交给 Claude API 或导出 markdown 手动粘贴。
4. **平台无关核心**：Python 3.10+ 标准库 + sqlite3 + Pillow + anthropic。Mac 专属功能（截图守护、微信库读取）放在独立模块。

## 目录

```
blackbox/
├── schema.sql              # events 表 + 索引
├── db.py                   # 连接 / 幂等 upsert
├── importers/
│   ├── photos.py           # 相册 EXIF → events
│   ├── location.py         # KML/GPX → events
│   ├── screenshots.py      # (Mac) 截图守护 + OCR
│   └── wechat.py           # (Mac) 微信 sqlite 解析
├── cli/
│   ├── query.py            # 时间/关键词过滤 → markdown
│   └── ask.py              # 调 Claude API 回答自然语言问题
└── data/                   # SQLite 文件 + 媒体软链 (.gitignore)
```

## 快速开始

```bash
cd blackbox
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 -c "from db import init; init()"

# 导入一个相册目录（递归读 EXIF）
python3 -m importers.photos ~/Pictures/iCloud

# 查看最近 7 天事件
python3 -m cli.query --since 7d

# 问 Claude
export ANTHROPIC_API_KEY=sk-ant-...
python3 -m cli.ask "上周末我在哪？" --since 10d
```

## 多机部署（以后再做）

- **Mac 是主**：所有 importer 在 Mac 上跑，SQLite 文件在 `~/blackbox/blackbox.db`
- **NAS 备份**：用 [litestream](https://litestream.io) 流式复制到 NAS，断电不丢
- **VPS 远程查**：在 VPS 上 `litestream restore` 出只读副本，跑 `cli.ask` 即可
