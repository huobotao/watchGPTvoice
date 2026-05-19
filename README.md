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

---

## 🆕 庭审质证策略助手 (`legal/`)

与上面 Apple Watch 项目无关的独立工具：被起诉时，帮你结构化拆解对方指控、规划质证方向、排序庭审优先级。

### 一键使用（部署到 GitHub Pages 后）

仓库根目录已附带 `.github/workflows/pages.yml`，**首次启用步骤**：

1. 把当前分支合并到 `main`（或直接在 Pages 设置里选这个分支）
2. 打开 GitHub 仓库 → **Settings → Pages** → Source 选 **GitHub Actions**
3. Action 跑完后访问：`https://huobotao.github.io/watchGPTvoice/legal/`
4. 收藏这个 URL，以后**一点就用**

### 也可以本地直接打开

```bash
git pull
open legal/index.html        # macOS
xdg-open legal/index.html    # Linux
start legal\index.html       # Windows
```

### 两种 AI 调用方式

- **🟦 直连模式**：在【设置】填 Claude/OpenAI 的 API Key，按钮直接出结果
- **🟩 免 Key 模式**：点【📋 复制提示词】，去 [ChatGPT](https://chat.openai.com) 或 [Claude.ai](https://claude.ai) 网页版粘贴。**免费账号也能用**

### 提供的 4 种分析

1. **构成要件分解** — 找出对方必须证明的事实，定位"软肋要件"
2. **逐条质证思路** — 真实性/合法性/关联性三性质疑 + 可朗读的追问话术
3. **庭审优先级排序** — P0 主战场 / P1 重要 / P2 次要 / 🪤 陷阱
4. **整体辩护策略大纲** — 开场陈述、举证顺序、应对脚本、风险预案

第一次进入推荐先点【📥 加载示例案件】，按完整流程过一遍。

> ⚠️ 本工具仅辅助思考与整理，**不构成正式法律意见**。重大决定请咨询执业律师。所有数据仅保存在你当前浏览器 localStorage，不上传任何服务器。
