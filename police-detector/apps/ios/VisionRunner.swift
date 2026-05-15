// VisionRunner.swift — VNCoreMLRequest wrapper. Parses Ultralytics CoreML
// output into a Detection list. Use `scripts/export_coreml.py --nms` so NMS is
// baked into the model and we just read the boxes.

import CoreML
import Vision
import CoreVideo
import CoreGraphics

struct Detection {
    let trackID: Int  // assigned by a lightweight tracker we keep client-side
    let className: String
    let confidence: Float
    var bbox: CGRect
}

final class VisionRunner {
    private let modelName: String
    private var visionModel: VNCoreMLModel?
    private var trackerByLabel: [String: SimpleTracker] = [:]

    init(modelName: String) {
        self.modelName = modelName
        if let url = Bundle.main.url(forResource: modelName, withExtension: "mlmodelc"),
           let cm = try? MLModel(contentsOf: url),
           let vm = try? VNCoreMLModel(for: cm) {
            visionModel = vm
        }
    }

    func run(on pixelBuffer: CVPixelBuffer, completion: @escaping ([Detection]) -> Void) {
        guard let model = visionModel else { completion([]); return }
        let request = VNCoreMLRequest(model: model) { [weak self] req, _ in
            guard let self else { return }
            let dets = (req.results ?? []).compactMap { res -> Detection? in
                guard let r = res as? VNRecognizedObjectObservation,
                      let label = r.labels.first else { return nil }
                let tracker = self.trackerByLabel[label.identifier] ?? {
                    let t = SimpleTracker()
                    self.trackerByLabel[label.identifier] = t
                    return t
                }()
                let bbox = r.boundingBox  // Vision uses normalized [0,1] coords
                let id = tracker.update(bbox: bbox)
                return Detection(trackID: id,
                                 className: label.identifier,
                                 confidence: label.confidence,
                                 bbox: bbox)
            }
            completion(dets)
        }
        request.imageCropAndScaleOption = .scaleFill
        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .right)
        try? handler.perform([request])
    }
}

/// Minimal IOU-based tracker. For production swap in DeepSORT / ByteTrack-iOS.
final class SimpleTracker {
    private var nextId = 0
    private var prev: [(id: Int, bbox: CGRect, age: Int)] = []

    func update(bbox: CGRect) -> Int {
        // Find best IoU match.
        var best: (idx: Int, iou: CGFloat)?
        for (i, p) in prev.enumerated() {
            let iou = iouOf(bbox, p.bbox)
            if iou > 0.3, iou > (best?.iou ?? 0) { best = (i, iou) }
        }
        if let m = best {
            let id = prev[m.idx].id
            prev[m.idx] = (id, bbox, 0)
            return id
        }
        nextId += 1
        prev.append((nextId, bbox, 0))
        // Age out stale entries.
        prev = prev.map { ($0.id, $0.bbox, $0.age + 1) }.filter { $0.age < 30 }
        return nextId
    }

    private func iouOf(_ a: CGRect, _ b: CGRect) -> CGFloat {
        let inter = a.intersection(b)
        if inter.isEmpty { return 0 }
        let u = a.union(b)
        return (inter.width * inter.height) / max(u.width * u.height, 1e-6)
    }
}
