import Foundation
import UIKit

/// Talks to the Cloudflare worker in Backend/, which holds the Claude key.
enum APIClient {
    private struct ErrorBody: Decodable { let error: String }

    struct APIError: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }

    private static let workerURL: String =
        (Bundle.main.object(forInfoDictionaryKey: "WingmanWorkerURL") as? String) ?? ""
    private static let appKey: String =
        (Bundle.main.object(forInfoDictionaryKey: "WingmanAppKey") as? String) ?? ""

    /// Claude reads images best at up to about 1568px on the long edge;
    /// larger only costs upload time.
    private static let maxImageEdge: CGFloat = 1568

    static func extractProfile(from images: [UIImage]) async throws -> DateProfile {
        struct EncodedImage: Encodable { let base64: String; let mediaType: String }
        struct Body: Encodable { let images: [EncodedImage] }
        struct Response: Decodable { let profile: DateProfile }

        let encoded = images.compactMap { image -> EncodedImage? in
            guard let data = resized(image).jpegData(compressionQuality: 0.7) else { return nil }
            return EncodedImage(base64: data.base64EncodedString(), mediaType: "image/jpeg")
        }
        let response: Response = try await post("/api/extract-profile", body: Body(images: encoded))
        return response.profile
    }

    /// A value copy of what prep needs, taken on the main actor so the
    /// SwiftData model is never read off its own thread.
    struct PrepRequest: Encodable {
        struct DatePlan: Encodable { let when, `where`, activity, goals: String }
        let profile: DateProfile
        let notes: String
        let chat: String
        let date: DatePlan
        let me: AboutMe

        @MainActor
        init(match: Match, me: AboutMe) {
            profile = match.profile
            notes = match.notes
            chat = match.chat
            date = DatePlan(when: match.dateWhen, where: match.dateWhere, activity: match.dateActivity, goals: match.dateGoals)
            self.me = me
        }
    }

    static func generatePrep(_ request: PrepRequest) async throws -> DatePrep {
        struct Response: Decodable { let prep: DatePrep }
        let response: Response = try await post("/api/generate-prep", body: request)
        return response.prep
    }

    private static func post<Body: Encodable, Result: Decodable>(_ path: String, body: Body) async throws -> Result {
        guard let url = URL(string: workerURL + path), workerURL.hasPrefix("http") else {
            throw APIError(message: "Worker URL is not set. Add it to Config/Secrets.xcconfig.")
        }
        var request = URLRequest(url: url, timeoutInterval: 180)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !appKey.isEmpty { request.setValue(appKey, forHTTPHeaderField: "x-wingman-key") }
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let message = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error
            throw APIError(message: message ?? "Request failed (\(status))")
        }
        return try JSONDecoder().decode(Result.self, from: data)
    }

    private static func resized(_ image: UIImage) -> UIImage {
        let longEdge = max(image.size.width, image.size.height)
        guard longEdge > maxImageEdge else { return image }
        let scale = maxImageEdge / longEdge
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
    }
}
