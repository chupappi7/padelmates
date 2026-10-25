import SwiftUI
import SwiftData
import PhotosUI

struct NewMatchView: View {
    static let maxScreenshots = 10

    var onCreate: (Match) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @State private var app = ""
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var images: [UIImage] = []
    @State private var loading = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Card(title: "Screenshot their profile") {
                        Text("Open their profile in the dating app and screenshot every part: photos, prompts, bio and basics. Up to \(Self.maxScreenshots).")
                            .foregroundStyle(.secondary)

                        if !images.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(Array(images.enumerated()), id: \.offset) { _, image in
                                        Image(uiImage: image)
                                            .resizable()
                                            .scaledToFill()
                                            .frame(width: 80, height: 160)
                                            .clipShape(RoundedRectangle(cornerRadius: 10))
                                    }
                                }
                            }
                        }

                        PhotosPicker(
                            selection: $pickerItems,
                            maxSelectionCount: Self.maxScreenshots,
                            selectionBehavior: .ordered,
                            matching: .images
                        ) {
                            Label(images.isEmpty ? "Choose screenshots" : "Change screenshots", systemImage: "photo.on.rectangle")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                    }

                    NoteField(label: "Which app? (optional)", prompt: "Hinge, Tinder, Bumble", text: $app)

                    if let error {
                        Text(error).foregroundStyle(.red)
                    }

                    Button {
                        Task { await create(readScreenshots: true) }
                    } label: {
                        Group {
                            if loading {
                                HStack(spacing: 8) {
                                    ProgressView()
                                    Text("Reading profile…")
                                }
                            } else {
                                Text("Read profile")
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(images.isEmpty || loading)

                    Button("Skip, I will type it in") {
                        Task { await create(readScreenshots: false) }
                    }
                    .frame(maxWidth: .infinity)
                    .disabled(loading)
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("New match")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .onChange(of: pickerItems) { _, items in
                Task { images = await PhotoLoader.images(from: items) }
            }
            .interactiveDismissDisabled(loading)
        }
    }

    private func create(readScreenshots: Bool) async {
        error = nil
        loading = readScreenshots
        defer { loading = false }
        do {
            let profile = readScreenshots ? try await APIClient.extractProfile(from: images) : DateProfile()
            let match = Match(app: app.trimmingCharacters(in: .whitespaces), profile: profile)
            context.insert(match)
            dismiss()
            onCreate(match)
        } catch {
            self.error = error.localizedDescription
        }
    }
}
