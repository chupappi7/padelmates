import SwiftUI

struct ChecklistTab: View {
    @Bindable var match: Match
    @State private var newItem = ""

    var body: some View {
        let items = match.checklist
        VStack(alignment: .leading, spacing: 16) {
            Text("\(items.filter(\.done).count) of \(items.count) done. Long-press an item to remove it.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Card {
                ForEach(items) { item in
                    Button {
                        toggle(item)
                    } label: {
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: item.done ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(item.done ? Color.green : Color.secondary)
                                .font(.title3)
                            Text(item.text)
                                .strikethrough(item.done)
                                .foregroundStyle(item.done ? Color.secondary : Color.primary)
                                .multilineTextAlignment(.leading)
                            Spacer(minLength: 0)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button("Remove", systemImage: "trash", role: .destructive) { remove(item) }
                    }
                    if item.id != items.last?.id { Divider() }
                }
            }

            HStack {
                TextField("Add an item", text: $newItem)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit(add)
                Button("Add", action: add)
                    .disabled(newItem.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
    }

    private func toggle(_ item: ChecklistItem) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        match.checklist = match.checklist.map { $0.id == item.id ? ChecklistItem(id: $0.id, text: $0.text, done: !$0.done) : $0 }
    }

    private func remove(_ item: ChecklistItem) {
        match.checklist = match.checklist.filter { $0.id != item.id }
    }

    private func add() {
        let text = newItem.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        match.checklist = match.checklist + [ChecklistItem(text: text)]
        newItem = ""
    }
}
