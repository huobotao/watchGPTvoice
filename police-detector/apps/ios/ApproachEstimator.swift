// ApproachEstimator.swift — Swift port of core/approach.py. Keeps thresholds
// identical so Python tests stay representative.

import Foundation

enum ApproachState: String {
    case unknown, approaching, receding, stationary
}

final class ApproachEstimator {
    struct Config {
        var windowFrames: Int = 15
        var minSamples: Int = 5
        var growthThreshold: Double = 0.02
        var hysteresis: Double = 0.005
    }

    private let config: Config
    private var history: [Int: [(t: Double, w: Double)]] = [:]
    private var lastLabel: [Int: ApproachState] = [:]

    init(config: Config = Config()) { self.config = config }

    func update(trackID: Int, width: CGFloat, time: CFTimeInterval) -> ApproachState {
        var samples = history[trackID] ?? []
        samples.append((time, max(Double(width), 1e-6)))
        if samples.count > config.windowFrames { samples.removeFirst() }
        history[trackID] = samples
        guard samples.count >= config.minSamples else {
            lastLabel[trackID] = .unknown
            return .unknown
        }
        let n = Double(samples.count)
        let ts = samples.map { $0.t }
        let ys = samples.map { log($0.w) }
        let meanT = ts.reduce(0, +) / n
        let meanY = ys.reduce(0, +) / n
        var num = 0.0, den = 0.0
        for i in 0..<samples.count {
            num += (ts[i] - meanT) * (ys[i] - meanY)
            den += (ts[i] - meanT) * (ts[i] - meanT)
        }
        let slope = den > 1e-9 ? num / den : 0.0
        let last = lastLabel[trackID] ?? .unknown
        let thr = config.growthThreshold
        let hys = config.hysteresis
        let label: ApproachState
        if last == .approaching, slope > thr - hys {
            label = .approaching
        } else if last == .receding, slope < -(thr - hys) {
            label = .receding
        } else if slope > thr + hys {
            label = .approaching
        } else if slope < -(thr + hys) {
            label = .receding
        } else {
            label = .stationary
        }
        lastLabel[trackID] = label
        return label
    }
}
