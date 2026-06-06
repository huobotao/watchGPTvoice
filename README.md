# WatchGPTVoice — Apple Watch ChatGPT 语音助手

主屏 ChatGPT 图标 → 进入录音页 → 点话筒开始录音 → 再点一次发送给 OpenAI(Whisper 转写 + Chat 回复) → 屏幕上显示回复。

## 目录结构

```
.
├── index.html / styles.css / app.js     # 浏览器预览版(模拟器,不上表)
├── map.html / map.css / map.js          # 澳洲穿越地图(自定义图层,独立网页)
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

## 澳洲穿越地图（自定义图层）

用浏览器打开 `map.html` 即可，**无需任何 API Key、无需付费**。底图用 OpenStreetMap，
图层数据通过免费的 Overpass API 按当前地图视野实时查询。默认聚焦澳大利亚，适合内陆长途自驾 / 穿越行程规划。

可勾选的图层：

| 图层 | 说明 / 数据来源 |
| --- | --- |
| Kmart 门店 | `brand=Kmart` / 名称含 Kmart |
| 麦当劳 | `amenity=fast_food` + 品牌/名称含 McDonald's |
| 城镇 / 定居点 | `place = city / town / village` |
| 可补给食物的地点 | 超市、便利店、杂货店、快餐、餐厅、咖啡馆 |
| 加油站（含柴油） | `amenity=fuel`，弹窗标注是否有柴油(`fuel:diesel`) |
| 柏油 / 铺装路面 | `highway` 且 `surface = asphalt/paved/concrete/chipseal` |
| 所有道路 | 各等级 `highway`（motorway…residential） |
| 可能的路 / 越野道 | `track`/`path`、`4wd_only=yes`、非铺装路面 |

使用要点：

- **勾选图层** → 平移/缩放地图，会在停止后自动按当前视野加载（防抖 700ms）。
- 道路类图层数据量大，设了**最低缩放级别**（未达到时图层名下会提示“放大到 N 级加载”）。
- 单图层最多渲染 5000 个要素，超出会提示放大；这是为了防止浏览器卡顿。
- Overpass 公共服务偶尔会限流，失败时右下角会提示，稍等再移动地图即可重试（已内置多端点自动切换）。

数据 © OpenStreetMap 贡献者，查询经 Overpass API。
