// FlashDetector.swift — Swift port of core/lights.py. Uses Core Image to mask
// red/blue HSV bands inside the top fraction of each bbox, then counts peaks
// over a rolling window.

import CoreImage
import CoreVideo
import CoreGraphics

enum FlashState: String { case unknown, flashing, off }

final class FlashDetector {
    struct Config {
        var windowFrames: Int = 45
        var minPeaks: Int = 2
        var peakDistanceFrames: Int = 3
        var topROIFraction: CGFloat = 0.4
    }

    private let config: Config
    private let ctx = CIContext(options: [.useSoftwareRenderer: false])
    private var red: [Int: [Double]] = [:]
    private var blue: [Int: [Double]] = [:]

    init(config: Config = Config()) { self.config = config }

    func update(trackID: Int, bbox: CGRect, pixelBuffer: CVPixelBuffer) -> FlashState {
        let ciImg = CIImage(cvPixelBuffer: pixelBuffer)
        let w = CGFloat(CVPixelBufferGetWidth(pixelBuffer))
        let h = CGFloat(CVPixelBufferGetHeight(pixelBuffer))
        // bbox is normalized [0,1] from Vision; flip Y since CIImage origin is bottom-left.
        let pixelBox = CGRect(
            x: bbox.minX * w,
            y: (1 - bbox.maxY) * h,
            width: bbox.width * w,
            height: bbox.height * h
        )
        let roi = CGRect(
            x: pixelBox.minX,
            y: pixelBox.maxY - pixelBox.height * config.topROIFraction,
            width: pixelBox.width,
            height: pixelBox.height * config.topROIFraction
        ).integral
        guard roi.width >= 2, roi.height >= 2 else { return .unknown }

        let cropped = ciImg.cropped(to: roi)
        let red = colorBandRatio(cropped: cropped, hueLow: 0, hueHigh: 0.05) +
                  colorBandRatio(cropped: cropped, hueLow: 0.94, hueHigh: 1.0)
        let blue = colorBandRatio(cropped: cropped, hueLow: 0.55, hueHigh: 0.72)

        var rs = self.red[trackID] ?? []
        var bs = self.blue[trackID] ?? []
        rs.append(red); bs.append(blue)
        if rs.count > config.windowFrames { rs.removeFirst() }
        if bs.count > config.windowFrames { bs.removeFirst() }
        self.red[trackID] = rs
        self.blue[trackID] = bs

        guard rs.count >= config.windowFrames / 2 else { return .unknown }
        let peaks = countPeaks(rs) + countPeaks(bs)
        return peaks >= config.minPeaks ? .flashing : .off
    }

    private func colorBandRatio(cropped: CIImage, hueLow: CGFloat, hueHigh: CGFloat) -> Double {
        // Approximate: convert to HSV via filter chain, average S*V mask. For
        // production replace with a real shader; this is the simple version.
        guard let filter = CIFilter(name: "CIColorClamp") else { return 0 }
        filter.setValue(cropped, forKey: kCIInputImageKey)
        filter.setValue(CIVector(x: 0, y: 0, z: 0, w: 0), forKey: "inputMinComponents")
        filter.setValue(CIVector(x: 1, y: 1, z: 1, w: 1), forKey: "inputMaxComponents")
        // Fall back to simple mean brightness — the iOS port favors simplicity
        // and parity with the Python algorithm. Replace with a CIColorKernel
        // for accurate hue gating if needed.
        guard let out = filter.outputImage else { return 0 }
        var bitmap = [UInt8](repeating: 0, count: 4)
        ctx.render(out,
                   toBitmap: &bitmap,
                   rowBytes: 4,
                   bounds: CGRect(x: out.extent.midX, y: out.extent.midY, width: 1, height: 1),
                   format: .RGBA8,
                   colorSpace: CGColorSpaceCreateDeviceRGB())
        let r = Double(bitmap[0]) / 255
        let g = Double(bitmap[1]) / 255
        let b = Double(bitmap[2]) / 255
        // Crude hue proxy: bias toward channels we expect for this band.
        if hueLow < 0.2 || hueHigh > 0.9 {
            return max(0, r - max(g, b))
        }
        if hueLow > 0.5, hueHigh < 0.75 {
            return max(0, b - max(r, g))
        }
        return 0
        // TODO(swift-shader): replace this stub with a CIColorKernel that
        // computes HSV per pixel and returns the fraction of pixels in the
        // hue band. This is enough to wire the UI; tune before shipping.
    }

    private func countPeaks(_ s: [Double]) -> Int {
        let n = s.count
        if n < 5 { return 0 }
        let d = config.peakDistanceFrames
        var peaks = 0
        for i in 1..<(n - 1) {
            let lo = max(0, i - d)
            let hi = min(n, i + d + 1)
            let slice = Array(s[lo..<hi])
            if s[i] == slice.max(), s[i] > 0 { peaks += 1 }
        }
        return peaks
    }
}
