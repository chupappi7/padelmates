import SwiftUI

struct AboutMeView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage("me.name") private var name = ""
    @AppStorage("me.about") private var about = ""
    @AppStorage("me.interests") private var interests = ""
    @AppStorage("me.stories") private var stories = ""
    @AppStorage("me.nerves") private var nerves = ""

    static func current() -> AboutMe {
        let defaults = UserDefaults.standard
        return AboutMe(
            name: defaults.string(forKey: "me.name") ?? "",
            about: defaults.string(forKey: "me.about") ?? "",
            interests: defaults.string(forKey: "me.interests") ?? "",
            stories: defaults.string(forKey: "me.stories") ?? "",
            nerves: defaults.string(forKey: "me.nerves") ?? ""
        )
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Your first name", text: $name)
                } footer: {
                    Text("Used to find common ground and suggest stories you can tell. Stays on your phone.")
                }
                Section("About you") {
                    TextField("Job, where you grew up, a normal week", text: $about, axis: .vertical)
                        .lineLimit(3...8)
                }
                Section("Your interests") {
                    TextField("Climbing, cooking Thai food, true crime podcasts", text: $interests, axis: .vertical)
                        .lineLimit(2...8)
                }
                Section("Stories you like telling") {
                    TextField("That time you missed a flight and ended up in Porto", text: $stories, axis: .vertical)
                        .lineLimit(3...8)
                }
                Section("What makes you nervous on dates") {
                    TextField("Silences, talking too much about work", text: $nerves, axis: .vertical)
                        .lineLimit(2...6)
                }
            }
            .navigationTitle("About me")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
