import SwiftUI

struct MatchView: View {
    enum Tab: String, CaseIterable, Identifiable {
        case profile = "Profile"
        case notes = "Notes"
        case prep = "Prep"
        case checklist = "Checklist"
        var id: String { rawValue }
    }

    @Bindable var match: Match
    @State private var tab: Tab = .profile

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Picker("Section", selection: $tab) {
                    ForEach(Tab.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)

                switch tab {
                case .profile: ProfileTab(match: match)
                case .notes: NotesTab(match: match) { tab = .prep }
                case .prep: PrepTab(match: match)
                case .checklist: ChecklistTab(match: match)
                }
            }
            .padding()
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color(.systemGroupedBackground))
        .navigationTitle(match.profile.name.isEmpty ? "Match" : match.profile.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}
