import SwiftUI
import PhotosUI

struct ProfileTab: View {
    @Bindable var match: Match
    @State private var editing = false
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var rereading = false
    @State private var error: String?

    var body: some View {
        let profile = match.profile
        VStack(alignment: .leading, spacing: 16) {
            Card {
                Text(profile.name.isEmpty ? "Unnamed match" : profile.name)
                    .font(.largeTitle.bold())
                let headline = [profile.age, profile.location].filter { !$0.isEmpty }.joined(separator: " · ")
                if !headline.isEmpty { Text(headline).foregroundStyle(.secondary) }
                let work = [profile.job, profile.education].filter { !$0.isEmpty }.joined(separator: " · ")
                if !work.isEmpty { Text(work).foregroundStyle(.secondary) }
                if profile.isEmpty {
                    Text("Nothing here yet. Edit the profile or read it from screenshots.")
                        .foregroundStyle(.secondary)
                }
                if !profile.bio.isEmpty { Text(profile.bio) }
            }

            ForEach(profile.prompts, id: \.self) { prompt in
                Card {
                    SectionLabel(prompt.prompt)
                    Text(prompt.answer).font(.title3.weight(.medium))
                }
            }

            if !profile.interests.isEmpty {
                Card {
                    SectionLabel("Interests")
                    Chips(items: profile.interests)
                }
            }

            if !profile.basics.isEmpty {
                Card {
                    SectionLabel("Basics")
                    ForEach(profile.basics, id: \.self) { basic in
                        Text("**\(basic.label):** \(basic.value)")
                    }
                }
            }

            if !profile.photoDetails.isEmpty {
                Card {
                    SectionLabel("From their photos")
                    Bullets(items: profile.photoDetails)
                }
            }

            if !profile.conversationHooks.isEmpty {
                Card {
                    SectionLabel("Worth asking about")
                    Bullets(items: profile.conversationHooks)
                }
            }

            if let error { Text(error).foregroundStyle(.red) }

            Button {
                editing = true
            } label: {
                Label("Edit profile", systemImage: "pencil").frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)

            PhotosPicker(selection: $pickerItems, maxSelectionCount: NewMatchView.maxScreenshots, selectionBehavior: .ordered, matching: .images) {
                Group {
                    if rereading {
                        HStack(spacing: 8) {
                                    ProgressView()
                                    Text("Reading…")
                                }
                    } else {
                        Label("Read again from screenshots", systemImage: "photo.on.rectangle")
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .disabled(rereading)
        }
        .sheet(isPresented: $editing) {
            ProfileEditView(profile: match.profile) { match.profile = $0 }
        }
        .onChange(of: pickerItems) { _, items in
            guard !items.isEmpty else { return }
            Task { await reread(items) }
        }
    }

    private func reread(_ items: [PhotosPickerItem]) async {
        error = nil
        rereading = true
        defer {
            rereading = false
            pickerItems = []
        }
        do {
            let images = await PhotoLoader.images(from: items)
            match.profile = try await APIClient.extractProfile(from: images)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct ProfileEditView: View {
    @Environment(\.dismiss) private var dismiss
    @State var profile: DateProfile
    let onSave: (DateProfile) -> Void

    @State private var interests = ""
    @State private var photoDetails = ""
    @State private var hooks = ""

    init(profile: DateProfile, onSave: @escaping (DateProfile) -> Void) {
        _profile = State(initialValue: profile)
        _interests = State(initialValue: profile.interests.joined(separator: "\n"))
        _photoDetails = State(initialValue: profile.photoDetails.joined(separator: "\n"))
        _hooks = State(initialValue: profile.conversationHooks.joined(separator: "\n"))
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Basics") {
                    TextField("Name", text: $profile.name)
                    TextField("Age", text: $profile.age).keyboardType(.numberPad)
                    TextField("Location", text: $profile.location)
                    TextField("Job", text: $profile.job)
                    TextField("Education", text: $profile.education)
                }
                Section("Bio") {
                    TextField("Bio", text: $profile.bio, axis: .vertical).lineLimit(3...10)
                }
                Section {
                    TextField("One per line", text: $interests, axis: .vertical).lineLimit(2...10)
                } header: { Text("Interests") }
                Section {
                    TextField("One per line", text: $photoDetails, axis: .vertical).lineLimit(2...10)
                } header: { Text("Details from photos") }
                Section {
                    TextField("One per line", text: $hooks, axis: .vertical).lineLimit(2...10)
                } header: { Text("Worth asking about") }
            }
            .navigationTitle("Edit profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        profile.interests = lines(interests)
                        profile.photoDetails = lines(photoDetails)
                        profile.conversationHooks = lines(hooks)
                        onSave(profile)
                        dismiss()
                    }
                }
            }
        }
    }

    private func lines(_ text: String) -> [String] {
        text.split(separator: "\n").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    }
}
