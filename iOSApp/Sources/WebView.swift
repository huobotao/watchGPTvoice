import SwiftUI
import WebKit
import CoreLocation

enum WebSource {
    case remote(URL)
    case local(URL)
}

struct WebView: UIViewRepresentable {
    let source: WebSource

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        // 让 WKWebView 在每次启动后保留 localStorage（保存上一次手动输入的位置）
        config.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.043, green: 0.071, blue: 0.125, alpha: 1)
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = true
        webView.uiDelegate = context.coordinator
        webView.navigationDelegate = context.coordinator

        // 提前申请系统定位权限，这样 WKWebView 收到 navigator.geolocation 调用时可以直接放行
        context.coordinator.requestLocationAuth()

        switch source {
        case .remote(let url):
            webView.load(URLRequest(url: url))
        case .local(let url):
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator: NSObject, WKUIDelegate, WKNavigationDelegate, CLLocationManagerDelegate {
        private let locationManager = CLLocationManager()

        override init() {
            super.init()
            locationManager.delegate = self
            locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        }

        func requestLocationAuth() {
            if locationManager.authorizationStatus == .notDetermined {
                locationManager.requestWhenInUseAuthorization()
            }
        }

        // iOS 15+ WKWebView 调用网页相机/麦克风时的默认放行（不影响本页面，但留着省事）
        @available(iOS 15.0, *)
        func webView(_ webView: WKWebView,
                     requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo,
                     type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(.grant)
        }

        // 拦截站外链接：用系统浏览器打开
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if navigationAction.navigationType == .linkActivated,
               let url = navigationAction.request.url,
               let host = url.host,
               !host.contains("huobotao.github.io") {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }
    }
}
