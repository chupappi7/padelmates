import SwiftUI
import SwiftData

struct HomeView: View {
    @Query(sort: \Match.updatedAt, order: .reverse) private var matches: [Match]
    @Environment(\.modelContext) private var context
    @State private var path: [Match] = []
    @State private var showingNewMatch = false
    @State private var showingAboutMe = false

    var body: some View {
        NavigationStack(path: $path) {
            Group {
                if matches.isEmpty {
                    ContentUnavailableView {
                        Label("No dates yet", systemImage: "heart.text.square")
                    } description: {
                        Text("Screenshot their dating profile, then add a new match to import it.")
                    } actions: {
                        Button("New match") { showingNewMatch = true }
                            .buttonStyle(.borderedProminent)
                    }
                } else {
                    List {
                        ForEach(matches) { match in
                            NavigationLink(value: match) {
                                MatchRow(match: match)
                            }
                        }
                        .onDelete { offsets in
                            for index in offsets { context.delete(matches[index]) }
                        }
                    }
                }
            }
            .navigationTitle("Wingman")
            .navigationDestination(for: Match.self) { match in
                MatchView(match: match)
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showingAboutMe = true
                    } label: {
                        Image(systemName: "person.crop.circle")
                    }
                    .accessibilityLabel("About me")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingNewMatch = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("New match")
                }
            }
            .sheet(isPresented: $showingNewMatch) {
                NewMatchView { match in
                    path.append(match)
                }
            }
            .sheet(isPresented: $showingAboutMe) {
                AboutMeView()
            }
        }
    }
}

private struct MatchRow: View {
    let match: Match

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(match.displayName).font(.headline)
                Spacer()
                if !match.app.isEmpty {
                    Text(match.app).font(.caption).foregroundStyle(.secondary)
                }
            }
            let plan = [match.dateWhen, match.dateWhere].filter { !$0.isEmpty }.joined(separator: " · ")
            if !plan.isEmpty {
                Text(plan).font(.subheadline).foregroundStyle(.secondary)
            }
            Text(match.prepData == nil ? "No prep yet" : "Prep ready")
                .font(.caption)
                .foregroundStyle(match.prepData == nil ? Color.secondary : Color.green)
        }
        .padding(.vertical, 4)
    }
}
