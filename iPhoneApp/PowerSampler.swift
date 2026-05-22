import Foundation
import UIKit

protocol PowerSampler {
    func snapshot() -> Sample
}

/// 公开 API 实现:能拿到 batteryLevel(5% 精度) + 充电状态。
/// 功率靠对电量做差分 + 假定电池容量估算,温度/电压/电流恒为 nil。
final class PublicAPISampler: PowerSampler {
    /// 默认按 iPhone 15 Pro 的 3274 mAh @ 3.87 V ≈ 12.67 Wh,
    /// 不同机型可自行覆盖。
    var batteryCapacityWh: Double = 12.67

    private var lastLevel: Double?
    private var lastTime: Date?

    init() {
        UIDevice.current.isBatteryMonitoringEnabled = true
    }

    func snapshot() -> Sample {
        let device = UIDevice.current
        let now = Date()
        let level = Double(max(device.batteryLevel, 0))   // -1 → 0(未知时)
        let charging = device.batteryState == .charging || device.batteryState == .full

        var estW: Double = 0
        if let lastLevel, let lastTime {
            let dLevel = level - lastLevel
            let dt = now.timeIntervalSince(lastTime)
            if dt > 0 {
                let dWh = dLevel * batteryCapacityWh
                estW = max(0, dWh * 3600.0 / dt)   // 只画正功率(充入)
            }
        }
        self.lastLevel = level
        self.lastTime = now

        return Sample(time: now,
                      batteryLevel: level,
                      isCharging: charging,
                      estimatedPowerW: charging ? estW : 0)
    }
}

/// 私有 IOKit 实现的占位。要真功率/温度/电压/电流,在自签包里:
///   1. Bridging header 引入 <IOKit/ps/IOPowerSources.h> 与 <IOKit/ps/IOPSKeys.h>
///   2. IOPSCopyPowerSourcesInfo / IOPSCopyPowerSourcesList
///   3. 读 "InstantAmperage"(mA, 充电为正) / "Voltage"(mV) / "Temperature"(0.01°C)
///      / "AdapterDetails" 里的 "Watts"
/// 注意:用了私有 key 之后这个 target 不能上架 App Store。
final class IOKitSampler: PowerSampler {
    private let fallback = PublicAPISampler()

    func snapshot() -> Sample {
        // TODO: 自签时把这里替换成真正的 IOKit 读取
        return fallback.snapshot()
    }
}
