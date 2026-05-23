import Foundation
import UIKit
import IOKit.ps

protocol PowerSampler {
    func snapshot() -> Sample
}

// MARK: - 公开 API:差分估算

/// 只用 UIDevice.batteryLevel(5% 精度) + 充电状态,功率靠对电量做差分。
/// 温度/电压/电流恒为 nil。App Store 能上。
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
        let level = Double(max(device.batteryLevel, 0))
        let charging = device.batteryState == .charging || device.batteryState == .full

        var estW: Double = 0
        if let lastLevel, let lastTime {
            let dLevel = level - lastLevel
            let dt = now.timeIntervalSince(lastTime)
            if dt > 0 {
                let dWh = dLevel * batteryCapacityWh
                estW = max(0, dWh * 3600.0 / dt)
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

// MARK: - 私有 IOKit:真功率/温度/电压/电流

/// 通过 IOPSCopyPowerSourcesInfo 读 iOS 私有键:
///   InstantAmperage (mA, 充电为正)
///   Voltage (mV)
///   Temperature (0.01 °C)
///   AdapterDetails (Watts / Description / FamilyCode ...)
/// 注意:用了私有键,App Store 不允许;7 天自签或 Dev 账号自用没问题。
final class IOKitSampler: PowerSampler {
    private let fallback = PublicAPISampler()

    func snapshot() -> Sample {
        guard let blob = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
              let sources = IOPSCopyPowerSourcesList(blob)?.takeRetainedValue() as? [CFTypeRef],
              let source = sources.first,
              let desc = IOPSGetPowerSourceDescription(blob, source)?.takeUnretainedValue() as? [String: Any]
        else {
            return fallback.snapshot()
        }

        let now = Date()

        // 电量:capacity / max(capacity)
        let level: Double = {
            let cap = desc[kIOPSCurrentCapacityKey as String] as? Int ?? 0
            let mx  = desc[kIOPSMaxCapacityKey as String]     as? Int ?? 100
            return mx > 0 ? Double(cap) / Double(mx) : 0
        }()
        let charging = (desc[kIOPSIsChargingKey as String] as? Bool) ?? false

        // 私有键(无 SDK 常量,直接用字符串)
        let amperageMA   = desc["InstantAmperage"] as? Int
        let voltageMV    = desc["Voltage"]         as? Int
        let tempRaw      = desc["Temperature"]     as? Int
        let adapter      = desc["AdapterDetails"]  as? [String: Any]
        let adapterWatts = adapter?["Watts"]       as? Int

        let voltageV     = voltageMV.map { Double($0) / 1000.0 }
        let currentA     = amperageMA.map { Double($0) / 1000.0 }
        let temperatureC = tempRaw.map   { Double($0) / 100.0  }

        // 实测功率:V × I。电流为负 = 放电,这里取 max(0, ·) 只看充入。
        let measuredW: Double? = {
            guard let v = voltageV, let a = currentA else { return nil }
            return max(0, v * a)
        }()

        // 主曲线优先用实测;实测拿不到就退化到适配器额定瓦数,再不行 0。
        let displayW = measuredW ?? adapterWatts.map { Double($0) } ?? 0

        return Sample(
            time: now,
            batteryLevel: level,
            isCharging: charging,
            estimatedPowerW: displayW,
            measuredPowerW: measuredW,
            temperatureC: temperatureC,
            voltageV: voltageV,
            currentA: currentA
        )
    }
}
