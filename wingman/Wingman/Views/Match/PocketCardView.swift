import SwiftUI

/// One big line at a time, for a glance under the table during the date.
struct PocketCardView: View {
    enum Deck: String, CaseIterable, Identifiable {
        case rescue = "Rescue"
        case questions = "Questions"
        case playful = "Playful"
        var id: String { rawValue }
    }

    let prep: DatePrep
    @Environment(\.dismiss) private var dismiss
    @State private var deck: Deck = .rescue
    @State private var index = 0

    private struct PocketLine {
        let caption: String
        let line: String
    }

    private var deckLines: [PocketLine] {
        switch deck {
        case .rescue:
            return prep.rescueLines.map { PocketLine(caption: $0.situation, line: $0.line) }
        case .questions:
            return prep.topics.flatMap { topic in
                (topic.questions + topic.followUps).map { PocketLine(caption: topic.topic, line: $0) }
            }
        case .playful:
            return prep.playfulLines.map { PocketLine(caption: "Playful", line: $0) }
        }
    }

    var body: some View {
        let cards = deckLines
        VStack(spacing: 16) {
            HStack {
                Picker("Deck", selection: $deck) {
                    ForEach(Deck.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill").font(.title2).foregroundStyle(.secondary)
                }
                .accessibilityLabel("Close")
            }

            Button {
                index += 1
            } label: {
                VStack(alignment: .leading, spacing: 16) {
                    if cards.isEmpty {
                        Text("Nothing in this deck.").foregroundStyle(.secondary)
                    } else {
                        let card = cards[index % cards.count]
                        SectionLabel(card.caption)
                        Text(card.line)
                            .font(.system(size: 30, weight: .semibold))
                            .multilineTextAlignment(.leading)
                            .minimumScaleFactor(0.5)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .padding(24)
                .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 28, style: .continuous))
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if !cards.isEmpty {
                Text("\(index % cards.count + 1) of \(cards.count) · tap the card for the next one")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Button {
                index = Int.random(in: 0..<max(cards.count, 1))
            } label: {
                Label("Shuffle", systemImage: "shuffle").frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
        }
        .padding()
        .background(Color(.systemGroupedBackground))
        .onChange(of: deck) { _, _ in index = 0 }
        .sensoryFeedback(.selection, trigger: index)
    }
}
