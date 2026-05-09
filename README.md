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
