import Foundation

/// What the worker extracts from profile screenshots. Field names match the
/// worker's JSON schema in Backend/src/index.js.
struct DateProfile: Codable, Equatable {
    struct PromptAnswer: Codable, Equatable, Hashable {
        var prompt: String
        var answer: String
    }

    struct Basic: Codable, Equatable, Hashable {
        var label: String
        var value: String
    }

    var name = ""
    var age = ""
    var location = ""
    var job = ""
    var education = ""
    var height = ""
    var bio = ""
    var prompts: [PromptAnswer] = []
    var interests: [String] = []
    var basics: [Basic] = []
    var photoDetails: [String] = []
    var conversationHooks: [String] = []

    var isEmpty: Bool {
        name.isEmpty && bio.isEmpty && prompts.isEmpty && interests.isEmpty
    }
}

/// What the worker generates for a date.
struct DatePrep: Codable, Equatable {
    struct Topic: Codable, Equatable, Hashable {
        var topic: String
        var why: String
        var questions: [String]
        var followUps: [String]
    }

    struct Story: Codable, Equatable, Hashable {
        var cue: String
        var story: String
    }

    struct RescueLine: Codable, Equatable, Hashable {
        var situation: String
        var line: String
    }

    var summary: String
    var commonGround: [String]
    var openers: [String]
    var topics: [Topic]
    var stories: [Story]
    var rescueLines: [RescueLine]
    var playfulLines: [String]
    var compliments: [String]
    var avoid: [String]
    var checklist: [String]
    var followUpText: String
}

struct ChecklistItem: Codable, Equatable, Identifiable {
    var id = UUID()
    var text: String
    var done = false
}

/// The user's own details, sent with prep requests to find common ground.
struct AboutMe: Codable {
    var name: String
    var about: String
    var interests: String
    var stories: String
    var nerves: String
}
