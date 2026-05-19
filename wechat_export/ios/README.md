# iOS WeChat 导出（从 iTunes/Finder 加密备份）

## 适用场景

- 你的微信主力是 iPhone
- 你愿意做一次完整的**加密**备份（必须加密，否则 keychain 不会备份，没法解密）
- 不需要越狱

## 整体流程

```
┌─────────────────────────────────────────────────────────┐
│ 1. Finder/iTunes 全量加密备份 iPhone                     │
│    设置一个备份密码（记好，下游要用）                     │
│         │                                               │
│         ▼                                               │
│ 2. 定位备份目录                                          │
│    ~/Library/Application Support/MobileSync/Backup/<id>/│
│         │                                               │
│         ▼                                               │
│ 3. 解密备份                                              │
│    用 iphone_backup_decrypt / mvt-ios / 自写             │
│    输出还原后的文件树                                     │
│         │                                               │
│         ▼                                               │
│ 4. 找 WeChat 容器                                        │
│    AppDomain-com.tencent.xin/Documents/<uid>/DB/MM.sqlite│
│         │                                               │
│         ▼                                               │
│ 5. 解析 MM.sqlite (明文 SQLite，无 SQLCipher!)          │
│    输出 JSONL                                            │
└─────────────────────────────────────────────────────────┘
```

## 关键差异 vs Mac/Android

| 维度 | iOS |
|---|---|
| 数据完整度 | 备份时刻为止该 iPhone 的全量微信数据 |
| 加密层 | 两层：备份层（你的备份密码）+ 文件层（无，明文 SQLite）|
| 数据库 | `MM.sqlite`（消息）+ `WCDB_Contact.sqlite`（联系人）|
| 媒体 | `<uid>/Img/`、`Audio/`、`Video/` 等 |

**好消息**：iPhone 微信的消息库在容器里就是**明文 SQLite**，没有 SQLCipher。难点在备份层那一层加密。

## 你需要做什么

1. 接 iPhone 到 Mac
2. Finder → iPhone → **「加密本地备份」勾上**，设一个密码（记住！）→ 立即备份
3. 等备份完成（看 iPhone 数据量，几十分钟到几小时）
4. 告诉我备份密码（脚本会 prompt，不会记到代码里）

## 文件清单（计划中）

- `find_backup.py` — 枚举 MobileSync/Backup 下所有备份，识别 iPhone 名称、备份时间
- `decrypt_backup.py` — 解密备份（用 `iphone_backup_decrypt` 库），还原原始文件树到 `out/restored/`
- `extract_wechat.py` — 从还原文件树里抠出 MM.sqlite + 媒体
- `parse_mm.py` — 解析 MM.sqlite，输出归一化 JSONL

## 当前状态

**待你决定走这条路再写代码**。文档先就位。

## 风险提示

- 加密备份的密码**忘了就废了**——苹果不能找回
- 备份占盘很大，预留至少 iPhone 用量 1.5 倍的硬盘
- 备份完不要立刻同步覆盖（怕脚本有 bug 中途搞坏备份）
