import SwiftUI

struct NotesTab: View {
    @Bindable var match: Match
    var onDone: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            NoteField(
                label: "Everything you know about them",
                prompt: "Has a sister in Berlin, just started a pottery class, hates coriander…",
                text: $match.notes
            )
            Text("Anything from texts, mutual friends or their socials. More detail means better questions.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            NoteField(label: "Your chat so far", prompt: "Paste the conversation from the app", text: $match.chat)

            Card(title: "The date") {
                NoteField(label: "When", prompt: "Friday 7pm", text: $match.dateWhen)
                NoteField(label: "Where", prompt: "Bar Luce, District 1", text: $match.dateWhere)
                NoteField(label: "What you are doing", prompt: "Drinks, then maybe food", text: $match.dateActivity)
                NoteField(
                    label: "What you want from it",
                    prompt: "See if there is chemistry, keep it relaxed",
                    text: $match.dateGoals
                )
            }

            Button {
                match.updatedAt = Date()
                onDone()
            } label: {
                Text("Go to prep").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
    }
}
