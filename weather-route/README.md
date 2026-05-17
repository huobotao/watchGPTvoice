# RainAway · 驱雨

**一句话**：自驾游路上突然下雨／天气变差时，朝周围 8 个方向各发出一束"探针"，告诉你**往哪开最快脱离雨区**，并给出一条真实驾车路线。

## 为什么

无计划自驾游 → 走到哪算哪 → 突遇坏天气（尤其下雨）→ 想快速判断"往哪个方向开就晴了"。
导航 App 只告诉你怎么走到目的地，不告诉你"哪个方向会变晴"。这个工具就专门干这件事。

## 算法

```
1. 拿到当前 GPS 位置 (lat, lon)
2. 朝 8 个方向 (N/NE/E/SE/S/SW/W/NW) 各采样 3 个点：20km / 50km / 100km
   → 共 24 个采样点 + 当前位置 = 25 个点
3. 一次性批量请求 Open-Meteo（免费、无 API Key、全球覆盖）拿到
   每个点未来 6 小时的逐小时降水预报
4. 对每个方向，从近到远找第一个"到达时降水 < 0.1 mm/h"的点
   → 这就是该方向的"脱雨距离"
5. 脱雨距离最短的方向就是最优方向
6. 用 OSRM（Web 版）/ MapKit（iOS 版）规划真实驾车路线
7. 大箭头 + 文字 + 语音播报告诉用户
```

降水阈值、采样距离、平均车速 60 km/h 等参数可调，集中在 `web/app.js` 顶部
常量区 和 `iOSApp/Models.swift` 的 `Tuning` 枚举里。

## 形态

| 平台 | 状态 | 入口 |
|---|---|---|
| 网页 PWA（手机/桌面浏览器都行） | ✅ 完成 | `weather-route/web/index.html` |
| iPhone 原生 App（SwiftUI + MapKit） | ✅ 完成 | `weather-route/iOSApp/*.swift` |
| Apple Watch 简化版 | ⏳ TODO | — |

## 跑起来

### 网页版（最快，30 秒）

任意静态服务器即可，浏览器需要 HTTPS 才能授权定位（localhost 除外）。

```bash
cd weather-route/web
python3 -m http.server 8080
# 然后在浏览器打开 http://localhost:8080
# 第一次会弹出"允许使用位置"，点允许
```

无需任何 API Key。地图瓦片用公共 OSM，天气用 Open-Meteo 公共接口，路线
用 OSRM 公共 demo 服务器 `router.project-osrm.org`。

### iPhone 原生版

需要 macOS + Xcode 15+ 和一台 iPhone（模拟器也行，但需要在 Features →
Location 里给一个模拟位置）。

1. Xcode → File → New → Project → **iOS → App** → Next
2. Product Name: `RainAway`，Interface: **SwiftUI**，Language: **Swift**
3. 把 `weather-route/iOSApp/` 下所有 `.swift` 文件拖进 Xcode 工程（勾
   Copy items if needed，Target 勾默认那个 RainAway target）
4. 删掉 Xcode 自动生成的 `ContentView.swift` 和 `RainAwayApp.swift`
5. 加定位权限说明（参考 `Info.plist.snippet`）：
   - Target → Info 选项卡 → Custom iOS Target Properties → `+`
   - Key：`Privacy - Location When In Use Usage Description`
   - Value：`用于查询你当前位置周边各方向的降水预报，帮你找到脱离雨区的方向。`
6. ⌘R 运行

iOS 版用的是系统 MapKit，不需要 Google Maps / Mapbox 等第三方 SDK 和 Key。

## 文件结构

```
weather-route/
├── README.md                       本文件
├── web/                            网页 PWA
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── iOSApp/                         iPhone 原生 SwiftUI
    ├── RainAwayApp.swift           @main 入口
    ├── ContentView.swift           主界面
    ├── AppState.swift              ObservableObject，串联整个流程
    ├── Models.swift                Direction / SamplePoint / EscapeResult / GeoMath / Tuning
    ├── LocationService.swift       CoreLocation 一次性定位封装
    ├── WeatherService.swift        Open-Meteo 批量请求 + 算法
    ├── RouteEngine.swift           MKDirections 驾车路线
    ├── CompassView.swift           SwiftUI 罗盘 + 方向箭头
    ├── MapPanel.swift              SwiftUI Map（iOS 17 MapKit）+ 采样点 + 路线
    ├── Speaker.swift               AVSpeechSynthesizer 中文语音播报
    └── Info.plist.snippet          权限配置说明
```

## 已知局限 / 后续

- **降水预报本身的精度**：Open-Meteo 是模式预报，分钟级精度有限；想要中
  国大陆更准确的实时降水（雷达回波外推），后续可接 [QWeather 和风天气]
  的 grid-weather 或彩云天气 minutely 接口（要 Key，要钱）。
- **没考虑风向**：当前算法只看每个采样点自身的预报；理论上"逆风向开"脱
  离雨区更快，下一步可以加 wind speed/direction 作为加权。
- **采样点偏稀**：100km 内每方向只采 3 个点，可能漏判中间的"窄雨带"。
  可加密到 5-6 个点（接口够便宜）。
- **公共 OSRM 限速**：`router.project-osrm.org` 是 demo 服务器，不保证
  SLA。生产建议自建 OSRM 或换 [OpenRouteService] / Mapbox。
- **Watch 版还没做**：苹果手表更适合"抬腕看大箭头"的场景，等 iOS 版稳
  定后再加；Watch 版只需复用 `Models.swift` + `WeatherService.swift`，
  UI 用 `WKInterfaceImage` 或 SwiftUI 画一个简化罗盘即可。

[QWeather 和风天气]: https://dev.qweather.com/
[OpenRouteService]: https://openrouteservice.org/
