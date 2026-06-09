# WatchGPTVoice — Apple Watch ChatGPT 语音助手

主屏 ChatGPT 图标 → 进入录音页 → 点话筒开始录音 → 再点一次发送给 OpenAI(Whisper 转写 + Chat 回复) → 屏幕上显示回复。

## 目录结构

```
.
├── index.html / styles.css / app.js     # 浏览器预览版(模拟器,不上表)
└── WatchApp/                            # 真正的 watchOS 源码
    ├── WatchGPTVoiceApp.swift           # @main 入口
    ├── ContentView.swift                # 导航容器
    ├── AppState.swift                   # 共享状态
    ├── HomeView.swift                   # 主屏:ChatGPT 图标
    ├── RecordView.swift                 # 录音页:话筒↔发送
    ├── ReplyView.swift                  # 回复展示
    ├── AudioRecorder.swift              # AVAudioRecorder 封装
    ├── OpenAIClient.swift               # Whisper + Chat 调用
    ├── Config.swift                     # API Key + 模型名
    └── Info.plist.snippet               # 麦克风权限说明
```

## 在 Apple Watch 上运行(3 分钟)

### 准备
- macOS + Xcode 15.2 或更高
- iPhone 已与你的 Apple Watch 配对
- Apple ID(免费即可签名给自己用)

### 1. 在 Xcode 新建工程
1. Xcode → **File → New → Project**
2. 选 **watchOS → App** → Next
3. Product Name: `WatchGPTVoice`
   Interface: **SwiftUI**,Language: **Swift**
   不要勾 *Include Notification Scene* / *Include Tests*
4. 保存到任意位置(可以选当前 repo 根目录)

### 2. 替换源文件
1. 把 Xcode 自动生成的 `ContentView.swift` 和 `WatchGPTVoiceApp.swift` 删掉(在 Project navigator 里右键 → Delete → Move to Trash)
2. 把 `WatchApp/` 下所有 `.swift` 文件**拖进** Xcode 工程的同一个组里
   - 弹窗里勾 **Copy items if needed**
   - Target 勾 **WatchGPTVoice Watch App**

### 3. 加麦克风权限
- 选中工程根 → Target = `WatchGPTVoice Watch App` → **Info** 标签
- 在 **Custom iOS Target Properties** 表里点 `+`,添加:
  - Key:`Privacy - Microphone Usage Description`
  - Value:`录制语音并发送给 ChatGPT`

### 4. 运行
- **模拟器**:Apple Watch 模拟器无法采集麦克风,会卡在录音失败 → 用真机测
- **真机**:
  1. iPhone 与 Apple Watch 都通过 USB / 配对方式可见
  2. Xcode 顶部目标选 `<你的 Apple Watch>`
  3. 第一次需要在手表上**信任开发者证书**(设置 → 通用 → VPN与设备管理)
  4. ⌘R 运行
  5. 抬腕看到 ChatGPT 图标 → 点开 → 点话筒 → 说话 → 再点一次 → 等待回复

## 安全提醒 ⚠️

`WatchApp/Config.swift` 里硬编码了 OpenAI API Key。这不是生产做法:

- Key 已进入 git 历史,GitHub 的 secret scanning 大概率会检测到并通知 OpenAI **自动 revoke**
- 建议测完立即去 [platform.openai.com/api-keys](https://platform.openai.com/api-keys) 主动 revoke
- 长期方案:做一个轻量代理服务(Cloudflare Worker / Vercel Edge),Key 留在服务端,手表只调你自己的代理

## 浏览器预览

如果你只是想先看 UI 长什么样,用浏览器打开 `index.html` 即可,不需要 Xcode。

---

# 日出日落 Widget

显示当前位置最近一次日出和日落的 8 个时间节点（含天文/航海/民用暮光），按时间排序，每条显示实际时间和距现在的时差。

## 目录结构

```
SunriseSunsetWidget/
├── SolarCalculator.swift           # NOAA 天文算法（纯 Swift，无网络）
├── SolarEvent.swift                # 数据模型
├── SunriseSunsetEntry.swift        # WidgetKit TimelineEntry
├── SunriseSunsetProvider.swift     # TimelineProvider + 位置读取
├── SunriseSunsetWidgetViews.swift  # 各尺寸 SwiftUI 视图
├── SunriseSunsetWidget.swift       # iOS Widget @main
└── SunriseSunsetWatchWidget.swift  # watchOS Complication @main

WatchApp/
└── LocationManager.swift           # 主 App 写坐标到 App Group（新增）
```

## 支持的 Widget 尺寸

| 平台 | 尺寸 | 内容 |
|------|------|------|
| iPhone | Small | 下一个事件大字倒计时 |
| iPhone | Medium | 最近 4 个事件 |
| iPhone | Large | 全部 8 个事件 |
| Apple Watch | accessoryRectangular | 最近 3 个事件（表盘复杂功能）|
| Apple Watch | accessoryCircular | 下一个事件图标 + 时间 |
| Apple Watch | accessoryInline | 单行文本 |

## Xcode 配置步骤

### 1. 添加 App Group（三个 target 都需要）

在 **主 App target**、**iOS Widget Extension target** 和 **watchOS Widget Extension target** 的
`Signing & Capabilities` 里各添加 **App Groups** → 使用同一个 Group ID：

```
group.com.yourapp.sunrisewidget
```

然后把 `SunriseSunsetProvider.swift` 和 `WatchApp/LocationManager.swift` 里的
`group.com.yourapp.sunrisewidget` 改为你实际的 Group ID。

### 2. 添加 iOS Widget Extension target

1. Xcode → **File → New → Target → Widget Extension**
2. Product Name: `SunriseSunsetWidget`
3. 不勾选 "Include Configuration App Intent"
4. 将以下文件添加到该 target（勾选右侧 Target Membership）：
   - `SolarCalculator.swift`
   - `SolarEvent.swift`
   - `SunriseSunsetEntry.swift`
   - `SunriseSunsetProvider.swift`
   - `SunriseSunsetWidgetViews.swift`
   - `SunriseSunsetWidget.swift`（仅 iOS target）

### 3. 添加 watchOS Widget Extension target

1. Xcode → **File → New → Target → Widget Extension**（选 watchOS platform）
2. Product Name: `SunriseSunsetWatchWidget`
3. 将以下文件添加到该 target：
   - `SolarCalculator.swift`
   - `SolarEvent.swift`
   - `SunriseSunsetEntry.swift`
   - `SunriseSunsetProvider.swift`
   - `SunriseSunsetWidgetViews.swift`
   - `SunriseSunsetWatchWidget.swift`（仅 watchOS target）

### 4. 位置权限（可选）

在主 App 的 `Info.plist` 中添加：
- Key: `Privacy - Location When In Use Usage Description`
- Value: `用于计算当前位置的日出日落时间`

> 若不配置位置权限，Widget 将默认使用北京坐标（39.9°N, 116.4°E）。

### 5. 在手表表盘添加复杂功能

1. 长按 Watch 表盘 → 编辑
2. 选择支持复杂功能的表盘（如 Modular、Infograph 等）
3. 点击某个复杂功能区域 → 滚动找到"日出日落" → 选择对应尺寸
