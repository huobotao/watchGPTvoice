import SwiftUI

struct CompassView: View {
    let bearing: Double?
    let centerLabel: String

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let center = CGPoint(x: size / 2, y: size / 2)
            let radius = size / 2

            ZStack {
                ticks(radius: radius, center: center)
                labels(radius: radius, center: center)
                if let b = bearing {
                    arrow(bearing: b, radius: radius, center: center)
                }
                Circle()
                    .strokeBorder(Color.cyan, lineWidth: 2)
                    .background(Circle().fill(Color(white: 0.05)))
                    .frame(width: 12, height: 12)
                    .position(center)

                Text(centerLabel)
                    .font(.title2.bold())
                    .foregroundStyle(Color.cyan)
                    .position(x: center.x, y: center.y + 38)
            }
        }
    }

    private func ticks(radius: CGFloat, center: CGPoint) -> some View {
        Canvas { ctx, _ in
            for i in stride(from: 0, to: 360, by: 15) {
                let major = i % 90 == 0
                let len: CGFloat = major ? 14 : 6
                let r1 = radius - 4
                let r2 = radius - 4 - len
                let rad = Double(i) * .pi / 180
                var path = Path()
                path.move(to: CGPoint(
                    x: center.x + CGFloat(sin(rad)) * r1,
                    y: center.y - CGFloat(cos(rad)) * r1))
                path.addLine(to: CGPoint(
                    x: center.x + CGFloat(sin(rad)) * r2,
                    y: center.y - CGFloat(cos(rad)) * r2))
                ctx.stroke(
                    path,
                    with: .color(major ? Color.gray : Color.gray.opacity(0.4)),
                    lineWidth: major ? 2 : 1
                )
            }
        }
    }

    private func labels(radius: CGFloat, center: CGPoint) -> some View {
        ForEach(Array(zip(["N","E","S","W"], [0.0, 90.0, 180.0, 270.0])),
                id: \.0) { (text, deg) in
            let rad = deg * .pi / 180
            let r = radius - 26
            let isBest = bearing.map { abs($0 - deg) < 1 } ?? false
            Text(text)
                .font(.system(size: isBest ? 22 : 15,
                              weight: isBest ? .bold : .medium))
                .foregroundStyle(isBest ? Color.cyan : .secondary)
                .position(x: center.x + CGFloat(sin(rad)) * r,
                          y: center.y - CGFloat(cos(rad)) * r)
        }
    }

    private func arrow(bearing: Double, radius: CGFloat,
                       center: CGPoint) -> some View {
        let rad = bearing * .pi / 180
        let tipR = radius - 38
        let tip = CGPoint(
            x: center.x + CGFloat(sin(rad)) * tipR,
            y: center.y - CGFloat(cos(rad)) * tipR)
        let baseSpread: CGFloat = 22
        let leftAngle = rad + .pi + 0.4
        let rightAngle = rad + .pi - 0.4
        let left = CGPoint(
            x: tip.x + CGFloat(sin(leftAngle)) * baseSpread,
            y: tip.y - CGFloat(cos(leftAngle)) * baseSpread)
        let right = CGPoint(
            x: tip.x + CGFloat(sin(rightAngle)) * baseSpread,
            y: tip.y - CGFloat(cos(rightAngle)) * baseSpread)

        return Path { p in
            p.move(to: tip)
            p.addLine(to: left)
            p.addLine(to: center)
            p.addLine(to: right)
            p.closeSubpath()
        }
        .fill(Color.cyan)
    }
}
