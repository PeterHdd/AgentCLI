import Foundation
import Speech

enum TranscribeError: Error {
    case missingPath
    case recognizerUnavailable
    case authorizationDenied(SFSpeechRecognizerAuthorizationStatus)
    case authorizationTimedOut
    case noResult
}

func fail(_ error: Error) -> Never {
    FileHandle.standardError.write(Data("\(error)\n".utf8))
    exit(1)
}

let arguments = CommandLine.arguments
guard arguments.count > 1 else {
    fail(TranscribeError.missingPath)
}

let audioURL = URL(fileURLWithPath: arguments[1])
let localeIdentifier = arguments.count > 2 ? arguments[2] : Locale.current.identifier

var authorizationStatus: SFSpeechRecognizerAuthorizationStatus?
SFSpeechRecognizer.requestAuthorization { status in
    authorizationStatus = status
}

let authorizationDeadline = Date().addingTimeInterval(15)
while authorizationStatus == nil && Date() < authorizationDeadline {
    RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.1))
}

guard let authorizationStatus else {
    fail(TranscribeError.authorizationTimedOut)
}

guard authorizationStatus == .authorized else {
    fail(TranscribeError.authorizationDenied(authorizationStatus))
}

guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: localeIdentifier)), recognizer.isAvailable else {
    fail(TranscribeError.recognizerUnavailable)
}

let request = SFSpeechURLRecognitionRequest(url: audioURL)
request.requiresOnDeviceRecognition = false
request.shouldReportPartialResults = false

var transcript = ""
var recognitionError: Error?
var finished = false

let task = recognizer.recognitionTask(with: request) { result, error in
    if let result {
        transcript = result.bestTranscription.formattedString
        if result.isFinal {
            finished = true
        }
    }
    if let error {
        recognitionError = error
        finished = true
    }
}

let recognitionDeadline = Date().addingTimeInterval(20)
while !finished && Date() < recognitionDeadline {
    RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.1))
}

if !finished {
    task.cancel()
    fail(TranscribeError.noResult)
}

if let recognitionError {
    fail(recognitionError)
}

let trimmed = transcript.trimmingCharacters(in: .whitespacesAndNewlines)
guard !trimmed.isEmpty else {
    fail(TranscribeError.noResult)
}

print(trimmed)
