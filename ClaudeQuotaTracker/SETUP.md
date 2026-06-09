# ClaudeQuotaTracker — Xcode 配置指南

## 功能

- 配额满了时在**灵动岛**显示实时倒计时（支持 iPhone 14 Pro 及以上）
- 配额重置时推送**本地通知**（可选响铃 / 静音）
- 支持**手动输入**重置时间，或通过 **Safari Extension 自动检测** claude.ai 页面

---

## Xcode 项目配置步骤

### 1. 创建 iOS App 主项目

1. Xcode → File → New → Project → **iOS App**
2. Product Name: `ClaudeQuotaTracker`，Language: Swift，Interface: SwiftUI
3. 保存到 `watchGPTvoice/ClaudeQuotaTracker/` 目录
4. 将 `App/` 目录下的 4 个 Swift 文件和 `Shared/QuotaAttributes.swift` 加入主 target

### 2. 添加 Widget Extension（灵动岛必需）

1. File → New → Target → **Widget Extension**
2. Product Name: `QuotaWidget`，勾选 **Include Live Activity**
3. 将 `QuotaWidget/` 下的两个文件加入 `QuotaWidget` target
4. 同时把 `Shared/QuotaAttributes.swift` 也加入 `QuotaWidget` target（两个 target 都需要）

### 3. 添加 Safari App Extension（可选，自动检测）

1. File → New → Target → **Safari Extension**
2. Product Name: `ClaudeQuotaSafariExt`
3. 将 `SafariExtension/SafariWebExtensionHandler.swift` 加入该 target
4. 将 `SafariExtension/Resources/` 下的两个文件加入 Extension 的 Resources 组

### 4. 配置 App Groups（三个 target 共享数据必需）

对**每一个** target（主 App、QuotaWidget、ClaudeQuotaSafariExt）：
1. Target → Signing & Capabilities → **+ Capability** → App Groups
2. 点 `+` 新增 Group，命名：`group.com.你的名字.claudequota`
3. 打开 `QuotaManager.swift`，把第 6 行的 `APP_GROUP_ID` 改成同样的值

### 5. 配置 URL Scheme（让 Safari Extension 唤起主 App）

主 App target → Info → URL Types → 添加：
- Identifier: `com.你的名字.claudequota`
- URL Schemes: `claudequota`

### 6. Info.plist 权限

主 App 的 Info.plist 添加（Xcode 13+ 在 Target → Info 标签页操作）：
```
NSUserNotificationsUsageDescription = "在 Claude 配额重置时提醒您"
```

---

## 使用方式

### 手动触发（任何 iPhone）

1. 打开 App → 点击「配额刚满，开始倒计时」
2. 选择 claude.ai 页面显示的重置时间 → 确认
3. 灵动岛出现倒计时，到点自动推送通知

### 自动检测（需启用 Safari Extension）

1. iPhone Safari → 设置 → 扩展 → 开启 **Claude Quota Tracker**
2. 打开 claude.ai，配额满时页面会出现限额消息
3. Extension 自动检测并写入数据 → 下次打开 App 自动启动倒计时

### 通知声音设置

App 内「通知设置」部分的切换开关即可控制响铃 / 静音。

---

## 兼容性

| 功能 | 最低系统要求 |
|------|------------|
| 灵动岛展开视图 | iPhone 14 Pro + iOS 16.1 |
| 锁屏实时活动（非灵动岛机型） | iOS 16.1 |
| 本地通知 | iOS 10+ |
| Safari Extension | iOS 15+ |
