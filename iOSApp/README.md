# 日出日落 · iOS 原生壳

Xcode 项目已经做好了。**不用自己新建项目**，直接打开 `.xcodeproj` 就能 Run。

## Mac 上要做的事（首次约 5 分钟）

### 0. 把仓库拉到 Mac 上

如果还没拉过：
```bash
cd ~/Desktop                                            # 或别的位置
git clone https://github.com/huobotao/watchGPTvoice.git
cd watchGPTvoice
```
已经拉过的话：
```bash
cd /path/to/watchGPTvoice
git pull origin main
```

### 1. 打开项目

```bash
open iOSApp/SunriseSunset.xcodeproj
```

Xcode 会自动启动，左侧栏看到三个 Swift 文件 + Assets.xcassets。

### 2. 设置签名团队（**关键**，否则装不到手机上）

1. 左侧栏点最上面那个蓝色的 `SunriseSunset` 项目图标
2. 中间面板顶部选 `SunriseSunset` 这个 Target
3. 切到 **Signing & Capabilities** 标签
4. **Team** 下拉框 → 选你的 Apple ID
   - 没列出来？点 `Add an Account…` → 用 Apple ID 登录，回来后能选了
   - 不需要付费 Developer Program；免费 Apple ID 就能装到自己手机上
5. **Bundle Identifier** 如果显示红色错误（"已被占用"），把 `com.example.SunriseSunset` 改成 `com.<你随便起的名>.SunriseSunset`，比如 `com.huobotao.SunriseSunset`

### 3. 连手机 + 打开开发者模式

1. 数据线连 iPhone 到 Mac
2. iPhone 屏幕会问 "信任此电脑？" → 信任
3. iPhone：设置 → 隐私与安全性 → **开发者模式** → 打开 → 重启手机
   （iOS 16 以下叫别的名字，自动跳过这步）

### 4. Run

1. Xcode 顶部工具栏，设备选择器（▶ 旁边）现在能看到你的 iPhone 名字。选它。
2. 点 **▶ Run**（或 `Cmd+R`）
3. 第一次会编译一两分钟，然后 Xcode 自动把 App 装到手机上、自动启动

### 5. 信任开发者证书（**第一次必须，否则 App 闪退**）

第一次 Run 完，手机上会出现"日出日落"图标但点开会报"开发者未受信任"。

去手机：**设置 → 通用 → VPN 与设备管理 → 开发者 App** → 找到你的 Apple ID → **信任**

然后回桌面点图标打开。这一步只用做一次。

### 6. 允许定位

App 启动后会弹两次：
- 系统的 "允许"日出日落"使用你的位置？" → 允许
- 一两秒后网页内自己再弹一次（WKWebView 自己的弹窗） → 允许

之后就能用了，跟网页版一模一样，但是是真 App，桌面图标可以放 Dock，全屏没浏览器地址栏。

## 后续

- 改网页推到 main 后，**App 自动跑最新版**，不用重新装。因为它默认从 GitHub Pages 加载。
- 免费 Apple ID 装的 App **每 7 天**会失效，要重新插线 Run 一次刷新证书。
- 想永久驻留 + 不插线 + 上架 App Store？需要 99 美元/年的 Apple Developer Program。

## 想换成内置离线 HTML

1. 把仓库根目录的 `sunrise-sunset.html` 拖到 Xcode 左侧栏的 `SunriseSunset` 文件夹里（勾 Copy items + Target Membership）
2. 打开 `ContentView.swift`，把
   ```swift
   private static let remoteURL: URL? = URL(string: "https://...")
   ```
   改成
   ```swift
   private static let remoteURL: URL? = nil
   ```
3. 重新 Run。即使断网，主功能也能用（反向地理编码和气温会暂时不可用，等连网恢复）。

## 卡住了？

报错截图发给我。常见坑：

- **"Failed to register bundle identifier"**：Bundle ID 跟别人撞了，改成独一无二的（带你自己的姓拼音之类的）
- **"Could not launch SunriseSunset"** 在手机上：忘了信任开发者证书，看第 5 步
- **白屏不动**：网络问题，或 GitHub Pages 没部署完。打开 Safari 试 https://huobotao.github.io/watchGPTvoice/sunrise-sunset.html 能不能开
- **定位永远转圈**：第一次系统弹窗时点了"不允许"。设置 → 日出日落 → 位置 → 改成"使用 App 期间"
