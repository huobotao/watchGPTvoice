import SwiftUI

public enum AthroTheme {
    public static let bg        = Color(red: 0.043, green: 0.067, blue: 0.106)
    public static let panel     = Color.white.opacity(0.05)
    public static let panel2    = Color.white.opacity(0.08)
    public static let ink       = Color.white.opacity(0.94)
    public static let ink2      = Color.white.opacity(0.78)
    public static let ink3      = Color.white.opacity(0.55)
    public static let accent    = Color(red: 0.32, green: 0.74, blue: 1.0)
    public static let dealGreen = Color(red: 0.20, green: 0.78, blue: 0.43)
}

public extension Color {
    static let athroBg     = AthroTheme.bg
    static let athroInk    = AthroTheme.ink
    static let athroInk2   = AthroTheme.ink2
    static let athroInk3   = AthroTheme.ink3
    static let athroAccent = AthroTheme.accent
}
