import Foundation
import UIKit

struct Sample: Identifiable, Codable {
    let id: UUID
    let time: Date
    let batteryLevel: Double          // 0...1
    let isCharging: Bool
    let estimatedPowerW: Double       // 公开 API 估算的瓦数
    let measuredPowerW: Double?       // IOKit 真值,公开版恒为 nil
    let temperatureC: Double?         // IOKit 真值,公开版恒为 nil
    let voltageV: Double?
    let currentA: Double?

    init(time: Date,
         batteryLevel: Double,
         isCharging: Bool,
         estimatedPowerW: Double,
         measuredPowerW: Double? = nil,
         temperatureC: Double? = nil,
         voltageV: Double? = nil,
         currentA: Double? = nil) {
        self.id = UUID()
        self.time = time
        self.batteryLevel = batteryLevel
        self.isCharging = isCharging
        self.estimatedPowerW = estimatedPowerW
        self.measuredPowerW = measuredPowerW
        self.temperatureC = temperatureC
        self.voltageV = voltageV
        self.currentA = currentA
    }
}
