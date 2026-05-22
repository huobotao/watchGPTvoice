# ChargePower — iPhone 充电功率监测

一张 Swift Charts 图同时画:**电量 %**、**充电功率 W**、**电池温度 °C**、**电压 V**、**电流 A**。
默认走 IOKit 路径,读真值,7 天自签 / Dev 账号自用。

## 在 Xcode 跑起来(5 分钟)

1. Xcode → **File → New → Project** → **iOS → App**
2. Product Name: `ChargePower`,Interface: **SwiftUI**,Language: **Swift**,Minimum Deployment: **iOS 17**(Swift Charts 需要)
3. 把 Xcode 自动生成的 `ContentView.swift` 和 `ChargePowerApp.swift` 删掉(右键 → Move to Trash)
4. 把本目录下所有 `.swift` 文件**拖进** Xcode 工程,弹窗里勾 **Copy items if needed**,Target 勾 `ChargePower`
5. **真机连 USB**(模拟器的 batteryLevel 恒为 -1,IOKit 也读不到电源信息)→ ⌘R
6. Xcode → Signing & Capabilities → 选你的 Apple ID。免费账号 7 天后过期,重新 ⌘R 一次即可

## 能看到什么

| 项 | 来源 | 备注 |
|---|---|---|
| 电量 % | `kIOPSCurrentCapacityKey` | 1% 精度 |
| 充电状态 | `kIOPSIsChargingKey` | |
| 电流 A | `InstantAmperage` (mA) | 充电正,放电负 |
| 电压 V | `Voltage` (mV) | |
| 实测功率 W | V × I | 充电时显示,放电时为 0 |
| 电池温度 °C | `Temperature` (0.01°C) | |
| 充电头瓦数 | `AdapterDetails.Watts` | 20W PD / 30W 之类 |

掉到公开 API(模拟器、读取失败)时:电量+充电状态+差分估算功率,温度/电压/电流为 `—`。

## 文件

- `ChargePowerApp.swift` — `@main`
- `ContentView.swift` — 顶部摘要卡 + Swift Charts 折线图 + 时间窗 Picker
- `SampleStore.swift` — 2s 采样、24h 滚动、30s 节流持久化到 `Documents/samples.json`
- `PowerSampler.swift` — `PublicAPISampler` + `IOKitSampler`(默认)
- `Sample.swift` — 一行采样数据模型

## 关于 App Store

`IOKitSampler` 用了未公开的字典键(`InstantAmperage` / `Voltage` / `Temperature` / `AdapterDetails`),
**这个 target 不能上架 App Store**,审核会直接拒。
要做合规版本只需在 `SampleStore` 构造里换成 `PublicAPISampler()`。

## 后台采样

App 切到后台 `Timer` 会停。简单的做法:充电时把屏幕保持常亮,前台跑。
```swift
// 在 ContentView .onAppear 里加:
UIApplication.shared.isIdleTimerDisabled = true
```
要彻底后台:开 Background Modes → Audio 放静音(费电),或 `BGAppRefreshTask`(系统 ~15 分钟才唤醒一次,稀疏)。
