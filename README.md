
# WatchGPTVoice / Apple Watch ChatGPT 语音助手

[中文](#中文) | [English](#english)

## 中文

从主屏 ChatGPT 图标进入录音页，点话筒开始录音，再点一次即可把音频发送给 OpenAI。App 使用 Whisper 转写语音，再把文字发送给 ChatGPT，并在手表屏幕上显示回复。

### 目录结构

```text
.
├── index.html / styles.css / app.js     # 浏览器 UI 预览，不安装到手表
└── WatchApp/                            # watchOS 源码
    ├── WatchGPTVoiceApp.swift           # @main 入口
    ├── ContentView.swift                # 导航容器
    ├── AppState.swift                   # 共享状态
    ├── HomeView.swift                   # 主屏 ChatGPT 图标
    ├── RecordView.swift                 # 录音与发送
    ├── ReplyView.swift                  # 回复展示
    ├── AudioRecorder.swift              # AVAudioRecorder 封装
    ├── OpenAIClient.swift               # Whisper 与 Chat API 客户端
    ├── Config.swift                     # UserDefaults 与编译期配置
    ├── SettingsView.swift               # 运行时输入 API Key
    └── Info.plist.snippet               # 麦克风权限示例
```

### 在 Apple Watch 上运行

#### 准备

- macOS 与 Xcode 15.2 或更高版本
- iPhone 已与 Apple Watch 配对
- Apple ID，免费账号即可为自己的设备签名

#### 1. 在 Xcode 新建工程

1. 选择 **File > New > Project**。
2. 选择 **watchOS > App**。
3. Product Name 填写 `WatchGPTVoice`，Interface 选择 **SwiftUI**，Language 选择 **Swift**。
4. 不要勾选 *Include Notification Scene* 或 *Include Tests*。

#### 2. 替换源文件

1. 删除 Xcode 自动生成的 `ContentView.swift` 和 `WatchGPTVoiceApp.swift`。
2. 把 `WatchApp/` 下所有 `.swift` 文件拖入工程的同一个组。
3. 在导入弹窗中勾选 **Copy items if needed**，并把 Target 设为 **WatchGPTVoice Watch App**。

#### 3. 添加麦克风权限

在 Target 的 **Info** 页面中添加：

- Key：`Privacy - Microphone Usage Description`
- Value：`录制语音并发送给 ChatGPT`

#### 4. 运行

- Apple Watch 模拟器无法可靠采集麦克风，请使用真机测试。
- 在 Xcode 顶部选择已经配对的 Apple Watch，然后按 `⌘R`。
- 首次运行时，可能需要在设备上信任开发者证书。

### API Key 设置

推荐使用运行时设置：

1. 打开 App 设置页。
2. 使用听写、Scribble 或粘贴输入完整 API Key。
3. 保存后，Key 存储在手表本机的 `UserDefaults` 中。

也可以在 `WatchApp/Config.swift` 中设置 `compiledInDefaultKey`，但这种方式会把 Key 写进源码，不建议使用。

> 不要把真实 API Key 提交到 GitHub。长期使用时，更安全的方式是把 Key 留在受控服务端，由手表访问自己的轻量代理。

当前代码默认使用 `whisper-1` 进行转写，并使用 `gpt-4o-mini` 生成简短回复。

### 浏览器预览

如果只想查看界面，可以直接用浏览器打开 `index.html`，不需要 Xcode。

## English

Open the recording screen from the ChatGPT icon on the home screen, tap the microphone to start recording, and tap again to send the audio to OpenAI. The app transcribes the recording with Whisper, sends the text to ChatGPT, and displays the reply on the watch.

### Project structure

```text
.
├── index.html / styles.css / app.js     # Browser UI preview; not installed on the watch
└── WatchApp/                            # watchOS source files
    ├── WatchGPTVoiceApp.swift           # @main entry point
    ├── ContentView.swift                # Navigation container
    ├── AppState.swift                   # Shared state
    ├── HomeView.swift                   # Home screen with ChatGPT icon
    ├── RecordView.swift                 # Recording and sending flow
    ├── ReplyView.swift                  # Reply display
    ├── AudioRecorder.swift              # AVAudioRecorder wrapper
    ├── OpenAIClient.swift               # Whisper and Chat API client
    ├── Config.swift                     # UserDefaults and compile-time configuration
    ├── SettingsView.swift               # Runtime API-key entry
    └── Info.plist.snippet               # Microphone permission example
```

### Run on Apple Watch

#### Prerequisites

- macOS with Xcode 15.2 or later
- An iPhone paired with an Apple Watch
- An Apple ID; a free account can sign builds for your own device

#### 1. Create a new Xcode project

1. Choose **File > New > Project**.
2. Select **watchOS > App**.
3. Set Product Name to `WatchGPTVoice`, Interface to **SwiftUI**, and Language to **Swift**.
4. Leave *Include Notification Scene* and *Include Tests* unchecked.

#### 2. Replace the generated source files

1. Delete the generated `ContentView.swift` and `WatchGPTVoiceApp.swift` files.
2. Drag every `.swift` file from `WatchApp/` into one group in the Xcode project.
3. In the import dialog, enable **Copy items if needed** and select the **WatchGPTVoice Watch App** target.

#### 3. Add microphone permission

Add the following entry on the target's **Info** page:

- Key: `Privacy - Microphone Usage Description`
- Value: `Record voice and send it to ChatGPT`

#### 4. Run

- The Apple Watch simulator cannot reliably capture microphone input, so test on a physical watch.
- Select the paired Apple Watch in Xcode and press `⌘R`.
- On the first run, you may need to trust the developer certificate on the device.

### API key setup

Runtime setup is recommended:

1. Open the app's settings screen.
2. Enter the complete API key with dictation, Scribble, or paste.
3. Save it. The key is stored locally in the watch's `UserDefaults`.

You can also set `compiledInDefaultKey` in `WatchApp/Config.swift`, but that writes the key into source code and is not recommended.

> Never commit a real API key to GitHub. For long-term use, a safer design keeps the key on a controlled server and lets the watch call a lightweight proxy that you own.

The current source defaults to `whisper-1` for transcription and `gpt-4o-mini` for concise replies.

### Browser preview

To inspect the interface without Xcode, open `index.html` in a browser.
