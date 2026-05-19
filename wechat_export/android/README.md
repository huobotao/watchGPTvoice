# Android WeChat 导出

## 适用场景

- 你那台「快废的安卓」长期主用微信
- 可以接受刷 root（或者机器已经 root）
- 微信数据库通常在该账号有完整历史

## 整体流程

```
┌──────────────────────────────────────────────────────────┐
│ 1. Root（Magisk 最常用，看 ROOT_PROCEDURE.md）            │
│         │                                                │
│         ▼                                                │
│ 2. adb 拉取 /data/data/com.tencent.mm/                  │
│    - MicroMsg/<uin_md5>/EnMicroMsg.db (旧版本)          │
│    - MicroMsg/<uin_md5>/msg/ (新版本 WCDB 分片)         │
│         │                                                │
│         ▼                                                │
│ 3. 推算密钥                                              │
│    旧版: MD5(uin + imei)[:7]                            │
│    新版: WCDB，需要从内存里抠 (类似 Mac 路径)            │
│         │                                                │
│         ▼                                                │
│ 4. 用 SQLCipher 解密 + 解析 + 输出 JSONL                │
└──────────────────────────────────────────────────────────┘
```

## 关键差异 vs Mac

| 维度 | Mac | Android |
|---|---|---|
| 数据完整度 | 仅 Mac 在线期间 | **全量历史** |
| 加密 | SQLCipher 4，自定义 PRAGMA | 旧版自研 + 新版 WCDB |
| 密钥来源 | 运行时进程内存 | uin/imei 推算（旧版）或进程内存（新版） |
| 媒体文件 | Image/Video/Voice/ | MicroMsg/<uin_md5>/{image,video,voice,emoji}/ |

## 你需要给我的信息

跑这条路径之前我需要确认：

1. **微信版本**：设置 → 关于微信。这决定走旧 `EnMicroMsg.db` 路径还是新 WCDB 路径
2. **是否已 root**：如果还没，看 `ROOT_PROCEDURE.md`
3. **uin（数字 ID）**：可以在 root 后从 `/data/data/com.tencent.mm/shared_prefs/auth_info_key_prefs.xml` 抠出来
4. **IMEI**：旧版本密钥需要。`adb shell service call iphonesubinfo 1`（不同 Android 版本命令不同）

## 文件清单（计划中）

- `pull_data.sh` — adb pull 全套数据到本地（需 root + adb root）
- `derive_key_legacy.py` — `MD5(uin + imei)[:7]` 推算旧版本密钥
- `extract_key_wcdb.py` — 新版本从内存抠（思路同 Mac，但要 frida-server 在手机上跑）
- `decrypt_and_dump.py` — 解密 + 解析 + 输出 JSONL（schema 同 Mac）

## 当前状态

**待你决定走这条路再写代码**。文档先就位，等 PoC 通过、且你确认 Android 是数据量最大的源时启动。

## 风险提示

- root 会触发微信的安全检测，**有封号风险**。建议拉完数据立刻退出登录、考虑用小号或备用机
- 拉数据期间不要在手机上收发消息（DB 写入冲突）
- 如果机器丢了/进水/进了垃圾桶，**先别格式化**，存储芯片上的微信库还能用专业设备读出来
