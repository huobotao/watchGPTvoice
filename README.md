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
    ├── Config.swift                     # 读 UserDefaults / 编译期默认 Key
    ├── SettingsView.swift               # 设置页:运行时输入 API Key
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

## API Key 怎么填

有两种方式,推荐第一种:

**方式 A:运行时从手表设置页输入(推荐,Key 不进 git)**
- App 启动后,主屏右上角点齿轮 ⚙
- 用听写 / Scribble 粘贴或输入完整 sk-... Key
- 点保存,Key 存在手表的 UserDefaults 里

**方式 B:在 Xcode 里硬编码(最快但不安全)**
- 打开 `WatchApp/Config.swift`,把 `compiledInDefaultKey` 改成你的 Key
- **不要 commit 这个修改**,可以 `git update-index --skip-worktree WatchApp/Config.swift`

不管哪种,**别把真实 Key 推到 GitHub**:
- GitHub Secret Scanning 会拦截 push
- 即便绕过,OpenAI 检测到后会**自动 revoke** 这把 Key
- 长期方案:做轻量代理(Cloudflare Worker / Vercel Edge),Key 留服务端,手表只调你自己的代理

## 浏览器预览

如果你只是想先看 UI 长什么样,用浏览器打开 `index.html` 即可,不需要 Xcode。

## 律师质证决策树（额外工具）

仓库还附带一个独立的、与 Watch 应用无关的网页工具：

- 入口：浏览器直接打开 `legal.html`
- 用途：律师庭前/庭审准备阶段对单一证据进行交互式质证分析
- 流程：选证据种类 → 依次回答真实性 / 合法性 / 关联性 / 程序事项的判定题 → 自动汇总
  - 结论（认可 / 部分认可 / 不予认可 + 是否非法证据排除）
  - 关键质证要点（按瑕疵严重程度排序）
  - 法律依据（自动汇总民诉/刑诉/行政诉讼及最高院证据规定）
  - 建议程序动作（申请鉴定、鉴定人/证人出庭、申请重新鉴定、非法证据排除申请等）
  - 风险提示（含"未考虑到的情形"提示）
- 数据全在前端，不联网、不上传案件信息
