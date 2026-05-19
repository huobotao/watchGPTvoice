# 日出日落 · iOS 原生壳

WKWebView 包一层网页，跑在 iPhone 上变成真正的 App。最低 iOS 15，建议 iOS 17+（WebView 定位最稳）。

## 在 Mac 上跑起来（10 分钟）

1. 打开 Xcode → `File` → `New` → `Project…` → 选 `iOS` 下的 `App` → `Next`
   - Product Name：`SunriseSunset`
   - Team：选你自己的 Apple ID（没有的话点 Add Account 用免费的个人开发者账号登录）
   - Interface：**SwiftUI**
   - Language：**Swift**
   - 取消勾选 "Include Tests"（可选）
   - 点 `Next` → 选个本地文件夹保存 → `Create`

2. Xcode 会自动生成 `SunriseSunsetApp.swift` 和 `ContentView.swift`。把它们删掉（左侧栏右键 `Delete` → `Move to Trash`）。

3. 把这个仓库的 `iOSApp/Sources/` 文件夹下三个 `.swift` 文件拖到 Xcode 左侧栏的项目根目录里：
   - `SunriseSunsetApp.swift`
   - `ContentView.swift`
   - `WebView.swift`

   拖进时勾选 "Copy items if needed" 和你的 target，点 `Finish`。

4. 加定位权限说明（**必须**，否则不弹定位窗口）：
   - 左侧栏点项目根（最上面那个蓝色图标）
   - 中间选 target → `Info` 标签
   - 右边 `Custom iOS Target Properties` 列表，鼠标移上去会出来 `+`
   - 点 `+`，Key 输入：`NSLocationWhenInUseUsageDescription`
   - Value 输入：`需要你的位置来计算所在地的日出日落、光照与气温`

5. （可选）改 App 显示名：
   - 同样在 `Info` 里加一个 `CFBundleDisplayName`，Value：`日出日落`

6. 选好顶部工具栏的目标设备：
   - 想跑模拟器：选个 iPhone 模拟器型号，点左上角 ▶ Run
   - 想跑真机：iPhone 用数据线连上 Mac，信任电脑；Xcode 顶部设备选你的 iPhone，▶ Run。第一次会要求你在 iPhone 上设置 → 隐私 → 描述文件 → 信任开发者证书。

第一次启动会弹两次系统弹窗：定位权限（点允许），然后网页本身的定位权限（也点允许）。之后就跟网页版一模一样了，只不过没有 Safari 地址栏，全屏沉浸。

## 默认行为

- App 启动后从 GitHub Pages 加载 `https://huobotao.github.io/watchGPTvoice/sunrise-sunset.html`
- 这意味着以后改网页推到 main 分支，App 自动跑最新版，**不用重新打包**
- 缺点：每次打开需要联网（不过反向地理编码和气温本来就要联网）

## 想用 App 内置 HTML（离线可用）

1. 把 `sunrise-sunset.html` 也拖进 Xcode 项目（同样勾 Copy items + target）
2. 编辑 `ContentView.swift`，把这一行：
   ```swift
   private static let remoteURL: URL? = URL(string: "...")
   ```
   改成：
   ```swift
   private static let remoteURL: URL? = nil
   ```
3. 重新 Run

注意：离线时反向地理编码（Nominatim）和气温（Open-Meteo）会失败，但日出日落、3D 轨迹、光照曲线都还能算。

## 装到自己手机上长期用

免费 Apple ID 装的 App 7 天就会失效，要重新插线 Run 一次刷新。
要永久驻留，需要 99 美元/年的 Apple Developer Program 帐号 → Archive → 上传 TestFlight 或 App Store。

## 发布到 App Store

- App 图标：在项目里 `Assets.xcassets` → `AppIcon` → 拖一张 1024×1024 PNG 进去（多种尺寸 Xcode 会自动生成）
- 隐私清单：因为用了系统定位，App Store 提交时会问数据用途，照实勾选"App 功能 - 不与你关联"
- 由于内容本质是 WebView，App Store 审核可能会问"为什么不直接做成网站"。回答里强调：原生权限管理（定位）、离线缓存、家长控制、桌面图标
