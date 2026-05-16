# Athro

机票/酒店监视器原生 App。从 SYD 出发,锁定新西兰目的地(默认 AKL / CHC / ZQN),
未来 7 天每天的最低往返价 + 同期 4★ 酒店均价,触发"特价"时推送通知。

当前阶段:**UI 骨架 + Mock 数据**。三端齐:iOS App + 主屏/负一屏 Widget + watchOS App。

---

## 一、装到设备上跑

### 0. 你需要

- macOS,Xcode 15 或更新
- 一个 Apple ID(免费就行,签出的 App 在设备上 7 天有效)
- iPhone 打开 **设置 → 隐私与安全性 → 开发者模式**
- (可选)Apple Watch 已配对且打开开发者模式

### 1. 生成 Xcode 工程(一次)

```bash
brew install xcodegen        # 没装过的话
cd Athro
xcodegen generate            # 生成 Athro.xcodeproj
open Athro.xcodeproj
```

### 2. 在 Xcode 里改签名

打开后,左侧选每个 target(`AthroApp`、`AthroWidget`、`AthroWatch`),
进 **Signing & Capabilities** → **Team** 选你自己的 Apple ID。
Bundle Identifier 如果与现有冲突,加自己的前缀,例如:

```
com.<yourname>.athro.app
com.<yourname>.athro.app.widget
com.<yourname>.athro.app.watchkitapp
```

> Widget 的 bundle id 必须以 App 的 bundle id 作前缀。Watch 同理(推荐用 `.watchkitapp` 后缀)。

### 3. 跑

- iPhone:scheme 选 `AthroApp` → 设备选你的 iPhone → ⌘R
- Apple Watch:scheme 选 `AthroWatch` → 设备选你的 Watch → ⌘R
- 装好后,长按主屏空白 → 加 widget → 找到 "Athro"

### 4. 给个 App 图标(可选,但安装上会好看)

把一张 1024×1024 PNG 拖到 `AthroApp/Assets.xcassets/AppIcon.appiconset` 里
(Watch 同理拖到 `AthroWatch/Assets.xcassets/AppIcon.appiconset`)。
不加也能跑,只是图标会是默认灰底。

---

## 二、目录

```
Athro/
├── project.yml              # XcodeGen 工程定义
├── Shared/                  # 三端共用
│   ├── Models.swift         # Destination / DayPrice / FareProvider
│   ├── MockProvider.swift   # Mock 数据(与 HTML 原型对齐)
│   └── Theme.swift          # 配色
├── AthroApp/                # iOS 主 App
│   ├── AthroApp.swift
│   ├── DashboardView.swift  # 主仪表盘
│   ├── Info.plist
│   └── Assets.xcassets/
├── AthroWidget/             # 主屏/负一屏 Widget
│   ├── AthroWidgetBundle.swift
│   ├── AthroWidget.swift    # TimelineProvider
│   ├── AthroWidgetView.swift  # 小/中/大三种尺寸
│   ├── Info.plist
│   └── Assets.xcassets/
└── AthroWatch/              # watchOS App
    ├── AthroWatchApp.swift
    ├── WatchViews.swift
    ├── Info.plist
    └── Assets.xcassets/
```

---

## 三、下一步(还没做的)

1. **真实数据源** — 把 `MockFareProvider` 后面接 Skyscanner / Kiwi / Amadeus,前端零改动
2. **推送(APNs)**— 需要服务端做后台抓取 + 比价 + 发推送
3. **目的地编辑** — 主 App 加个城市选择页,持久化到 App Group,Widget 一起读
4. **Widget 配置** — AppIntent 让用户在编辑 widget 时选哪个城市
5. **Watch Complication** — 表盘上一个能直接看的复杂功能
