// CameraView.swift — SwiftUI rear-camera viewfinder with detection overlay.
//
// Wire-up:
//   - Add `NSCameraUsageDescription` to Info.plist.
//   - Drag `police_yolov11n.mlpackage` into the project (exported via
//     scripts/export_coreml.py). VisionRunner loads it by name.

import AVFoundation
import SwiftUI

struct CameraView: View {
    @StateObject private var camera = CameraController()
    @StateObject private var alerter = AlertController()

    var body: some View {
        ZStack {
            CameraPreviewLayer(session: camera.session)
                .ignoresSafeArea()
            DetectionOverlay(tracks: camera.latestTracks)
                .allowsHitTesting(false)
            AlertBanner(alerter: alerter)
        }
        .onAppear {
            camera.alerter = alerter
            camera.start()
        }
        .onDisappear { camera.stop() }
    }
}

final class CameraController: NSObject, ObservableObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    let session = AVCaptureSession()
    private let output = AVCaptureVideoDataOutput()
    private let queue = DispatchQueue(label: "police.camera.queue")
    private lazy var runner = VisionRunner(modelName: "police_yolov11n")
    private lazy var approach = ApproachEstimator()
    private lazy var flash = FlashDetector()

    @Published var latestTracks: [TrackView] = []
    weak var alerter: AlertController?

    func start() {
        queue.async { [weak self] in
            guard let self else { return }
            self.configure()
            self.session.startRunning()
        }
    }

    func stop() { session.stopRunning() }

    private func configure() {
        session.beginConfiguration()
        session.sessionPreset = .hd1280x720
        if let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
           let input = try? AVCaptureDeviceInput(device: device),
           session.canAddInput(input) {
            session.addInput(input)
        }
        output.setSampleBufferDelegate(self, queue: queue)
        output.alwaysDiscardsLateVideoFrames = true
        if session.canAddOutput(output) { session.addOutput(output) }
        session.commitConfiguration()
    }

    func captureOutput(_ output: AVCaptureOutput,
                       didOutput sampleBuffer: CMSampleBuffer,
                       from connection: AVCaptureConnection) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        runner.run(on: pixelBuffer) { [weak self] detections in
            guard let self else { return }
            let t = CACurrentMediaTime()
            let tracks = detections.map { det -> TrackView in
                let approachState = self.approach.update(trackID: det.trackID, width: det.bbox.width, time: t)
                let flashing = self.flash.update(trackID: det.trackID,
                                                  bbox: det.bbox,
                                                  pixelBuffer: pixelBuffer)
                return TrackView(detection: det,
                                 approach: approachState,
                                 flashing: flashing)
            }
            DispatchQueue.main.async {
                self.latestTracks = tracks
                self.alerter?.consume(tracks: tracks, time: t)
            }
        }
    }
}

struct CameraPreviewLayer: UIViewRepresentable {
    let session: AVCaptureSession
    func makeUIView(context: Context) -> PreviewUIView {
        let v = PreviewUIView()
        v.previewLayer.session = session
        v.previewLayer.videoGravity = .resizeAspectFill
        return v
    }
    func updateUIView(_ uiView: PreviewUIView, context: Context) {}
}

final class PreviewUIView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
}
