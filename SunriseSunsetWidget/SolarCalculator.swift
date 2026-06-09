import Foundation

// NOAA solar calculation algorithm.
// Reference: https://gml.noaa.gov/grad/solcalc/calcdetails.html
enum SolarCalculator {

    // Zenith angles (degrees)
    static let zenithSunrise: Double = 90.833 // accounts for refraction + solar disc radius
    static let zenithCivil: Double = 96.0
    static let zenithNautical: Double = 102.0
    static let zenithAstronomical: Double = 108.0

    struct SolarDay {
        let astronomicalDawn: Date?
        let nauticalDawn: Date?
        let civilDawn: Date?
        let sunrise: Date?
        let sunset: Date?
        let civilDusk: Date?
        let nauticalDusk: Date?
        let astronomicalDusk: Date?
    }

    /// Returns all 8 solar event times for a given date and location.
    static func solarDay(latitude: Double, longitude: Double, date: Date) -> SolarDay {
        SolarDay(
            astronomicalDawn: sunTime(zenith: zenithAstronomical, latitude: latitude, longitude: longitude, date: date, rising: true),
            nauticalDawn:     sunTime(zenith: zenithNautical,     latitude: latitude, longitude: longitude, date: date, rising: true),
            civilDawn:        sunTime(zenith: zenithCivil,        latitude: latitude, longitude: longitude, date: date, rising: true),
            sunrise:          sunTime(zenith: zenithSunrise,      latitude: latitude, longitude: longitude, date: date, rising: true),
            sunset:           sunTime(zenith: zenithSunrise,      latitude: latitude, longitude: longitude, date: date, rising: false),
            civilDusk:        sunTime(zenith: zenithCivil,        latitude: latitude, longitude: longitude, date: date, rising: false),
            nauticalDusk:     sunTime(zenith: zenithNautical,     latitude: latitude, longitude: longitude, date: date, rising: false),
            astronomicalDusk: sunTime(zenith: zenithAstronomical, latitude: latitude, longitude: longitude, date: date, rising: false)
        )
    }

    /// Returns the 8 chronologically-sorted SolarEvents representing the nearest
    /// upcoming sunrise group and the nearest upcoming sunset group.
    static func nextEightEvents(latitude: Double, longitude: Double, from now: Date) -> [SolarEvent] {
        let cal = Calendar.current

        func solarDayOn(_ date: Date) -> SolarDay {
            solarDay(latitude: latitude, longitude: longitude, date: date)
        }

        let today = solarDayOn(now)
        let tomorrow = solarDayOn(cal.date(byAdding: .day, value: 1, to: now)!)

        // Pick the nearest sunrise (today if in future, else tomorrow)
        let sunriseRef: SolarDay = {
            if let sr = today.sunrise, sr > now { return today }
            return tomorrow
        }()

        // Pick the nearest sunset (today if in future, else tomorrow)
        let sunsetRef: SolarDay = {
            if let ss = today.sunset, ss > now { return today }
            return tomorrow
        }()

        var events: [SolarEvent] = []

        func add(_ time: Date?, kind: SolarEventKind) {
            if let t = time { events.append(SolarEvent(kind: kind, time: t)) }
        }

        add(sunriseRef.astronomicalDawn, kind: .astronomicalDawn)
        add(sunriseRef.nauticalDawn,     kind: .nauticalDawn)
        add(sunriseRef.civilDawn,        kind: .civilDawn)
        add(sunriseRef.sunrise,          kind: .sunrise)

        add(sunsetRef.sunset,            kind: .sunset)
        add(sunsetRef.civilDusk,         kind: .civilDusk)
        add(sunsetRef.nauticalDusk,      kind: .nauticalDusk)
        add(sunsetRef.astronomicalDusk,  kind: .astronomicalDusk)

        return events.sorted { $0.time < $1.time }
    }

    // MARK: - Core NOAA Algorithm

    private static func sunTime(zenith: Double, latitude: Double, longitude: Double, date: Date, rising: Bool) -> Date? {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        var comps = cal.dateComponents([.year, .month, .day], from: date)
        comps.hour = 0; comps.minute = 0; comps.second = 0
        guard let midnightUTC = cal.date(from: comps) else { return nil }

        let jd = julianDay(from: midnightUTC) + 0.5 // noon
        let t = (jd - 2451545.0) / 36525.0

        // Geometric mean longitude of sun (degrees)
        let L0 = fmod(280.46646 + t * (36000.76983 + t * 0.0003032), 360.0)

        // Geometric mean anomaly (degrees)
        let M = 357.52911 + t * (35999.05029 - t * 0.0001537)
        let Mrad = M.rad

        // Equation of center
        let C = sin(Mrad) * (1.914602 - t * (0.004817 + 0.000014 * t))
               + sin(2 * Mrad) * (0.019993 - 0.000101 * t)
               + sin(3 * Mrad) * 0.000289

        // Sun's apparent longitude (degrees)
        let omega = 125.04 - 1934.136 * t
        let lambda = L0 + C - 0.00569 - 0.00478 * sin(omega.rad)

        // Mean obliquity of ecliptic (degrees)
        let e0 = 23.0 + (26.0 + (21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813))) / 60.0) / 60.0
        let epsilon = e0 + 0.00256 * cos(omega.rad)

        // Solar declination (degrees)
        let decl = asin(sin(epsilon.rad) * sin(lambda.rad)).deg

        // Equation of time (minutes)
        let e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)
        let y = pow(tan(epsilon.rad / 2), 2)
        let L0rad = L0.rad
        let eqTime = 4.0 * (
            y * sin(2 * L0rad)
            - 2 * e * sin(Mrad)
            + 4 * e * y * sin(Mrad) * cos(2 * L0rad)
            - 0.5 * y * y * sin(4 * L0rad)
            - 1.25 * e * e * sin(2 * Mrad)
        ).deg

        // Hour angle
        let latRad = latitude.rad
        let declRad = decl.rad
        let cosHA = cos(zenith.rad) / (cos(latRad) * cos(declRad)) - tan(latRad) * tan(declRad)
        guard cosHA >= -1.0 && cosHA <= 1.0 else { return nil } // polar day/night

        let HA = acos(cosHA).deg

        let minutesUTC = rising
            ? 720.0 - 4.0 * (longitude + HA) - eqTime
            : 720.0 - 4.0 * (longitude - HA) - eqTime

        return midnightUTC.addingTimeInterval(minutesUTC * 60.0)
    }

    private static func julianDay(from date: Date) -> Double {
        date.timeIntervalSince1970 / 86400.0 + 2440587.5
    }
}

private extension Double {
    var rad: Double { self * .pi / 180.0 }
    var deg: Double { self * 180.0 / .pi }
}
