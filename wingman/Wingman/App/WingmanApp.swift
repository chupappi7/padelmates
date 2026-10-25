import SwiftUI
import SwiftData

@main
struct WingmanApp: App {
    var body: some Scene {
        WindowGroup {
            HomeView()
        }
        .modelContainer(for: Match.self)
    }
}
