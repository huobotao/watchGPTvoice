# ChargePower — iPhone 充电功率监测

一张 Swift Charts 图同时画:**电量 %**、**充电功率 W**、**电池温度 °C**(温度需要私有 API)。

## 在 Xcode 跑起来(5 分钟)

1. Xcode → **File → New → Project** → **iOS → App**
2. Product Name: `ChargePower`,Interface: **SwiftUI**,Language: **Swift**,Minimum Deployment: **iOS 17**(Swift Charts 需要)
3. 把 Xcode 自动生成的 `ContentView.swift` 和 `ChargePowerApp.swift` 删掉(右键 → Move to Trash)
4. 把本目录下所有 `.swift` 文件**拖进** Xcode 工程,弹窗里勾 **Copy items if needed**,Target 勾 `ChargePower`
5. iPhone 真机连 USB(模拟器的 batteryLevel 恒为 -1,看不到东西)→ ⌘R

## 能看到什么

| 项 | 公开 API(App Store 能上) | 私有 IOKit(只能自签) |
|---|---|---|
| 电量 % | ✅ 5% 精度 | ✅ 1% |
| 充电状态 | ✅ | ✅ |
| 实时功率 W | ⚠️ 差分估算 | ✅ 真值 |
| 电池温度 | ❌ | ✅ |
| 电压 / 电流 | ❌ | ✅ |
| 充电头瓦数 | ❌ | ✅ |

## 想要真温度 / 真功率(自签路线)

编辑 `PowerSampler.swift` 里 `IOKitSampler.snapshot()`,接 `IOPSCopyPowerSourcesInfo`:

```swift
import IOKit.ps
let blob  = IOPSCopyPowerSourcesInfo().takeRetainedValue()
let srcs  = IOPSCopyPowerSourcesList(blob).takeRetainedValue() as [CFTypeRef]
guard let dict = IOPSGetPowerSourceDescription(blob, srcs[0])?.takeUnretainedValue() as? [String: Any]
else { return fallback.snapshot() }
let amps    = dict["InstantAmperage"] as? Int       // mA, 充电为正
let volts   = dict["Voltage"]         as? Int       // mV
let tempC   = (dict["Temperature"]    as? Int).map { Double($0) / 100.0 }
let adapter = dict["AdapterDetails"]  as? [String: Any]
let watts   = adapter?["Watts"]       as? Int
```

然后在 `SampleStore` 的构造里把 `PublicAPISampler()` 换成 `IOKitSampler()`。
注意 IOKit 私有 key 会让你**上不了 App Store**,只能 7 天自签或开发者账号自用。

## 后台采样

App 切到后台后定时器会停。要持续记录:
- 简单:开 Background Modes → Audio,放静音播放(电量耗得快)
- 推荐:用 `BGAppRefreshTask`,系统大约 15 分钟唤醒一次
- 充电时手机插着电:直接开 **Settings → 显示与亮度 → 自动锁定 → 永不**,前台跑就行
