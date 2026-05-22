import Foundation
import Combine
import UIKit

@MainActor
final class SampleStore: ObservableObject {
    @Published private(set) var samples: [Sample] = []
    @Published var windowMinutes: Int = 30

    private let sampler: PowerSampler
    private var timer: Timer?
    private let persistURL: URL
    private var lastPersist: Date = .distantPast
    private let persistEvery: TimeInterval = 30

    /// IOKit 路径下电流/电压每秒都在变,2s 一次能看到真实波形;
    /// 退化到公开 API 时 batteryLevel 每 5% 才变,2s 也只是多空转几次,没坏处。
    private let interval: TimeInterval = 2

    init(sampler: PowerSampler = IOKitSampler()) {
        self.sampler = sampler
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        self.persistURL = dir.appendingPathComponent("samples.json")
        load()
    }

    func start() {
        timer?.invalidate()
        tick()
        timer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.tick() }
        }
    }

    func stop() { timer?.invalidate(); timer = nil }

    func clear() {
        samples = []
        save()
    }

    var windowed: [Sample] {
        let cutoff = Date().addingTimeInterval(-Double(windowMinutes) * 60)
        return samples.filter { $0.time >= cutoff }
    }

    private func tick() {
        let s = sampler.snapshot()
        samples.append(s)
        // 只保留最近 24h,避免无限增长
        let cutoff = Date().addingTimeInterval(-24 * 3600)
        if samples.first?.time ?? .distantFuture < cutoff {
            samples = samples.filter { $0.time >= cutoff }
        }
        if Date().timeIntervalSince(lastPersist) >= persistEvery {
            save()
            lastPersist = Date()
        }
    }

    private func load() {
        guard let data = try? Data(contentsOf: persistURL),
              let decoded = try? JSONDecoder().decode([Sample].self, from: data) else { return }
        samples = decoded
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(samples) else { return }
        try? data.write(to: persistURL, options: .atomic)
    }
}
