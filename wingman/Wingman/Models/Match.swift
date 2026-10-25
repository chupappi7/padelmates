import Foundation
import SwiftData

/// One person the user is preparing to date. Stays on device.
@Model
final class Match {
    var id: UUID
    var createdAt: Date
    var updatedAt: Date
    var app: String
    var profileData: Data
    var notes: String
    var chat: String
    var dateWhen: String
    var dateWhere: String
    var dateActivity: String
    var dateGoals: String
    var prepData: Data?
    var checklistData: Data

    static let defaultChecklist = [
        "Confirm time and place the day before",
        "Check the route and leave 10 minutes early",
        "Phone charged, payment card on you",
        "Pick a backup spot nearby in case it is full",
        "Tell a friend where you are going",
        "Skim the prep and rescue lines once on the way",
    ]

    init(app: String = "", profile: DateProfile = DateProfile()) {
        self.id = UUID()
        self.createdAt = Date()
        self.updatedAt = Date()
        self.app = app
        self.profileData = (try? JSONEncoder().encode(profile)) ?? Data()
        self.notes = ""
        self.chat = ""
        self.dateWhen = ""
        self.dateWhere = ""
        self.dateActivity = ""
        self.dateGoals = ""
        self.prepData = nil
        self.checklistData = (try? JSONEncoder().encode(Match.defaultChecklist.map { ChecklistItem(text: $0) })) ?? Data()
    }

    var profile: DateProfile {
        get { (try? JSONDecoder().decode(DateProfile.self, from: profileData)) ?? DateProfile() }
        set {
            profileData = (try? JSONEncoder().encode(newValue)) ?? Data()
            updatedAt = Date()
        }
    }

    var prep: DatePrep? {
        get { prepData.flatMap { try? JSONDecoder().decode(DatePrep.self, from: $0) } }
        set {
            prepData = newValue.flatMap { try? JSONEncoder().encode($0) }
            updatedAt = Date()
        }
    }

    var checklist: [ChecklistItem] {
        get { (try? JSONDecoder().decode([ChecklistItem].self, from: checklistData)) ?? [] }
        set {
            checklistData = (try? JSONEncoder().encode(newValue)) ?? Data()
            updatedAt = Date()
        }
    }

    var displayName: String {
        let profile = profile
        let name = profile.name.isEmpty ? "Unnamed match" : profile.name
        return profile.age.isEmpty ? name : "\(name), \(profile.age)"
    }

    /// Adds suggested checklist items, keeping the user's own items and ticks.
    func mergeChecklist(_ suggestions: [String]) {
        var items = checklist
        let existing = Set(items.map { $0.text.lowercased() })
        items += suggestions.filter { !existing.contains($0.lowercased()) }.map { ChecklistItem(text: $0) }
        checklist = items
    }
}
