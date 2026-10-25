import SwiftUI

struct PrepTab: View {
    @Bindable var match: Match
    @State private var loading = false
    @State private var error: String?
    @State private var showingPocket = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let prep = match.prep {
                Button {
                    showingPocket = true
                } label: {
                    Label("Open pocket card", systemImage: "rectangle.portrait.on.rectangle.portrait")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                PrepContent(prep: prep)
            } else {
                Card(title: "Get ready for the date") {
                    Text("Wingman uses their profile, your notes, your chat and the date plan to write openers, questions with follow-ups, stories to tell, backup lines for awkward silences and a checklist. Fill in Notes and About me first for the best results.")
                        .foregroundStyle(.secondary)
                }
            }

            if let error { Text(error).foregroundStyle(.red) }

            Button {
                Task { await generate() }
            } label: {
                Group {
                    if loading {
                        HStack(spacing: 8) {
                                    ProgressView()
                                    Text("Preparing… about a minute")
                                }
                    } else {
                        Text(match.prep == nil ? "Generate prep" : "Regenerate prep")
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
            .disabled(loading)
        }
        .fullScreenCover(isPresented: $showingPocket) {
            if let prep = match.prep {
                PocketCardView(prep: prep)
            }
        }
    }

    private func generate() async {
        error = nil
        loading = true
        defer { loading = false }
        do {
            let request = APIClient.PrepRequest(match: match, me: AboutMeView.current())
            let prep = try await APIClient.generatePrep(request)
            match.prep = prep
            match.mergeChecklist(prep.checklist)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct PrepContent: View {
    let prep: DatePrep

    var body: some View {
        Card(title: "Who they are") {
            Text(prep.summary)
            if !prep.commonGround.isEmpty {
                SectionLabel("Common ground")
                Chips(items: prep.commonGround)
            }
        }

        Card(title: "Openers") {
            ForEach(prep.openers, id: \.self) { CopyLine(text: $0) }
        }

        ForEach(prep.topics, id: \.self) { topic in
            Card(title: topic.topic) {
                Text(topic.why).font(.subheadline).foregroundStyle(.secondary)
                ForEach(topic.questions, id: \.self) { CopyLine(text: $0) }
                if !topic.followUps.isEmpty {
                    SectionLabel("Go deeper")
                    ForEach(topic.followUps, id: \.self) { CopyLine(text: $0) }
                }
            }
        }

        Card(title: "If the conversation stalls") {
            ForEach(prep.rescueLines, id: \.self) { CopyLine(text: $0.line, caption: $0.situation) }
        }

        if !prep.stories.isEmpty {
            Card(title: "Things to share about you") {
                ForEach(prep.stories, id: \.self) { CopyLine(text: $0.story, caption: $0.cue) }
            }
        }

        Card(title: "Playful") {
            ForEach(prep.playfulLines, id: \.self) { CopyLine(text: $0) }
        }

        Card(title: "Genuine compliments") {
            ForEach(prep.compliments, id: \.self) { CopyLine(text: $0) }
        }

        Card(title: "Avoid") {
            Bullets(items: prep.avoid)
        }

        Card(title: "Text after the date") {
            CopyLine(text: prep.followUpText)
        }
    }
}
