# 手动取微信 SQLCipher 密钥（lldb 兜底方案）

如果 `extract_key.py` 自动跑失败，按下面手工来。

## 准备

1. Terminal/iTerm 加到「系统设置 → 隐私与安全 → 完全磁盘访问」
2. 关闭 SIP 不是必须的，但如果碰到「process attach denied」就要关
3. 微信**已登录、正在前台运行**

## lldb 流程

```bash
# 1. 拿 PID
WX_PID=$(pgrep -x WeChat)
echo "PID = $WX_PID"

# 2. 附加
sudo lldb -p $WX_PID
```

进入 lldb 后：

```
(lldb) breakpoint set --name sqlite3_key
(lldb) breakpoint set --name sqlite3_key_v2
(lldb) continue
```

现在切回微信，**点开任意一个聊天**——这会触发数据库打开，断点命中。回到 lldb：

```
(lldb) memory read --size 1 --format x --count 32 $rsi
```

输出像这样：

```
0x12345600: 0xab 0xcd 0xef 0x01 0x23 0x45 0x67 0x89
0x12345608: 0x...
...
```

把那 32 个字节按出现顺序拼成 64 字符的十六进制串，存到 `wechat_export/mac/.wechat_key`：

```bash
echo "abcdef0123456789...." > wechat_export/mac/.wechat_key
chmod 600 wechat_export/mac/.wechat_key
```

退出 lldb：

```
(lldb) detach
(lldb) quit
```

## 验证密钥

```bash
python3 verify_key.py
```

会用密钥试解一个最小的微信库，能 SELECT 出表名就成。

## 寄存器对照（Apple Silicon vs Intel）

- Intel x86_64：参数 2 在 `$rsi`
- Apple Silicon ARM64：参数 2 在 `$x1`

ARM64 上用 `memory read --size 1 --format x --count 32 $x1` 替换。

脚本会自动检测 CPU 架构。

## 如果 sqlite3_key 没有符号

WeChat 现代版本里 SQLCipher 可能是静态链接进 WCDB.framework，符号被 strip 掉。这时候改设 `WCDB::Database::open` 或扫内存。详见 `KEY_FORMAT_V4.md`（视你的微信版本决定要不要走）。
