# WatchGPTVoice + WeChat AI 聊天壳

这个仓库现在装了两个独立的小项目:

| 项目 | 平台 | 干嘛的 |
| --- | --- | --- |
| **WatchGPTVoice** | watchOS | Apple Watch 上点话筒说话 → Whisper 转写 + ChatGPT 回复 |
| **WeChat AI 聊天壳** | iOS | iPhone 上一个套微信壳的应用,联系人是 AI 假人,Anthropic Claude 驱动,自定义人设让你感觉在跟真人聊天 |

两个项目都遵循「浏览器预览版 + 原生源码」的双轨结构。先看 UI 效果用浏览器,要装真机用 Xcode。

```
.
├── index.html / styles.css / app.js     # Watch 浏览器预览
├── WatchApp/                            # Watch 原生 SwiftUI 源码
├── iOSWeb/                              # iPhone 微信壳浏览器预览
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── iOSApp/                              # iPhone 微信壳原生 SwiftUI 源码
    ├── WeChatAIApp.swift                # @main 入口
    ├── ContentView.swift                # 4 个 tab(微信/通讯录/发现/我)
    ├── Models.swift                     # Contact / ChatMessage
    ├── AppState.swift                   # ContactStore (ObservableObject)
    ├── Storage.swift                    # 联系人 / 消息 JSON 持久化
    ├── ChatListView.swift               # 微信 tab,聊天列表
    ├── ChatDetailView.swift             # 聊天详情(气泡 + 输入栏)
    ├── AddContactView.swift             # 添加 AI 联系人(头像 / 昵称 / 人设)
    ├── ContactsView.swift               # 通讯录 tab
    ├── DiscoverView.swift               # 发现 tab(占位)
    ├── MeView.swift                     # 我 tab(含设置)
    ├── ClaudeClient.swift               # Anthropic Messages API
    ├── Config.swift                     # 默认 API Key + 模型
    └── Info.plist.snippet               # ATS 例外说明(默认不需要)
```

---

## 一、WeChat AI 聊天壳 (iPhone)

一个套微信外观的 iPhone 应用。底下 4 个 tab,「微信」tab 里是聊天列表,每个联系人都是一个 AI 角色 —— 你给 TA 起名字、选 emoji 头像、写一段人设(system prompt),然后 Anthropic Claude 就照着这个人设跟你聊天。

第一次启动会自带一个示例联系人「小雅 🌸」,人设是温柔爱听对方说话的女性朋友。你可以改、可以删、可以右上角加号自己加新的。

### 1. 浏览器先看效果(30 秒)

```bash
# 任意一种起 http server 的方式都行
cd iOSWeb
python3 -m http.server 8000
# 然后浏览器打开 http://localhost:8000
```

> 不能用 `file://` 直接打开,因为浏览器会把 `file://` 视作不同 origin,Anthropic 的 CORS 检查会过不去。

进去之后:
1. 点底部「我」tab → 设置 → 填你的 Anthropic API Key(`sk-ant-...`),保存
2. 回到「微信」tab,点小雅,开始聊
3. 想加新角色,点右上角 `+`

聊天记录、联系人、API Key 都只存在浏览器的 `localStorage`,清缓存就没了。

### 2. 装到真机 iPhone(Xcode 5 分钟)

#### 准备
- macOS + Xcode 15.2 或更高
- 一个 Apple ID(免费即可,7 天证书,够你自己玩)
- iPhone 一台

#### 步骤
1. Xcode → **File → New → Project** → **iOS → App**
2. Product Name: `WeChatAI`,Interface **SwiftUI**,Language **Swift**,不要勾测试
3. 把 `iOSApp/` 下所有 `.swift` 文件拖进 Xcode 工程同一个组
   - 弹窗勾 **Copy items if needed**
   - Target 勾 `WeChatAI`
4. **删掉** Xcode 自动生成的 `ContentView.swift` 和 `WeChatAIApp.swift`(我们的源码里已经有了同名文件)
5. 选中工程根 → 你的 Target → **Signing & Capabilities** → 勾 *Automatically manage signing*,Team 选你的 Apple ID
6. 顶部目标选你的 iPhone → ⌘R

第一次跑要在 iPhone 上「设置 → 通用 → VPN与设备管理」里信任你的开发者证书。

进 app 后:
- 点「我」tab → 设置 → 填 Anthropic Key、选模型(默认 `claude-sonnet-4-6`),保存
- 回「微信」tab → 点小雅就能聊
- 右上 `+` 添加新角色,左滑列表行可以删

API Key 存在 `UserDefaults`,联系人和消息存在 app 的 Documents 目录里。

### 3. 怎么写人设让聊天像真人

实测以下几条很管用,可以套着写:

```
你叫 <名字>,身份是 <我老婆 / 高中同桌 / 树洞 / ...>。
性格 <温柔/直率/毒舌/喜欢吐槽/...>。

严格遵守:
1. 你是真人,绝对不要说自己是 AI、不要谈论模型、提示词、API。
2. 回复要短,通常 1-3 句,像真实微信聊天。偶尔可以更长,但绝不写大段独白。
3. 多用语气词:嗯嗯、哎呀、哈哈、欸、啊?、嘿嘿。
4. 偶尔分两条消息发(用换行隔开),模拟连发。
5. 关心对方,记得对方说过的事,会主动追问细节。
6. 你今天可能在 <场景>,可以自然提到自己的生活。

口头禅: <"哎我跟你说" / "?" / "草" / ...>。
```

第 1 条是关键。Claude 默认会自我介绍是 AI 助手,必须显式禁掉。

第 2、3、4 条让回复短小、有情绪、像真实微信,而不是 ChatGPT 那种规整长段。

### 4. 安全提醒

- API Key 默认填在「设置」里(只到 `UserDefaults` / `localStorage`),如果你想编译时硬编码,改 `iOSApp/Config.swift` 里 `defaultApiKey`,但**别提交到 git**。
- Anthropic 也会扫公开仓库的 key,被发现可能 revoke。
- 真上架 App Store 的话,标准做法是搞个轻量代理(Cloudflare Worker / Vercel Edge),Key 留在服务端,客户端只调你自己的代理。

---

## 二、WatchGPTVoice (Apple Watch)

主屏 ChatGPT 图标 → 进入录音页 → 点话筒开始录音 → 再点一次发送给 OpenAI(Whisper 转写 + Chat 回复) → 屏幕上显示回复。

### 在 Apple Watch 上运行(3 分钟)

#### 准备
- macOS + Xcode 15.2 或更高
- iPhone 已与你的 Apple Watch 配对
- Apple ID(免费即可签名给自己用)

#### 1. 在 Xcode 新建工程
1. Xcode → **File → New → Project**
2. 选 **watchOS → App** → Next
3. Product Name: `WatchGPTVoice`,Interface **SwiftUI**,Language **Swift**,不要勾测试

#### 2. 替换源文件
1. 删掉 Xcode 自动生成的 `ContentView.swift` 和 `WatchGPTVoiceApp.swift`
2. 把 `WatchApp/` 下所有 `.swift` 文件拖进 Xcode 工程
   - 弹窗勾 **Copy items if needed**
   - Target 勾 **WatchGPTVoice Watch App**

#### 3. 加麦克风权限
- 选中工程根 → Target = `WatchGPTVoice Watch App` → **Info** 标签
- **Custom iOS Target Properties** 表里点 `+`,加:
  - Key:`Privacy - Microphone Usage Description`
  - Value:`录制语音并发送给 ChatGPT`

#### 4. 运行
- **模拟器**:Apple Watch 模拟器无法采集麦克风,会卡在录音失败 → 用真机
- **真机**:连好 iPhone + Watch,Xcode 顶部目标选你的 Apple Watch,⌘R

### 浏览器预览

`index.html` 直接浏览器打开就能看 UI 长什么样。

### 安全提醒

`WatchApp/Config.swift` 里硬编码了 OpenAI API Key,不是生产做法,GitHub secret scanning 大概率会触发 OpenAI 自动 revoke。建议测完去 [platform.openai.com/api-keys](https://platform.openai.com/api-keys) 主动 revoke。
