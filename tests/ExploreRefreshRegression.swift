import Foundation

// Standalone regression runner; uses the real view model with controlled responses.
@main
struct ExploreRefreshRegression {
    @MainActor
    static func main() async throws {
        func result(_ id: String) throws -> RecommendationResult {
            let data = """
            {"hotels":[{"_id":"\(id)","name":"Hotel","description":"Demo","address":"Address","city":"Hà Nội"}],
             "total":1,"ranking":{"mode":"content","personalized":true,"description":"Demo","modelUsed":false}}
            """.data(using: .utf8)!
            return try JSONDecoder().decode(RecommendationResult.self, from: data)
        }
        let initial = try result("initial")
        let updated = try result("updated")

        for cancellation in [CancellationError() as Error, URLError(.cancelled) as Error] {
            var fallbackCalls = 0
            let vm = ExploreViewModel(fetchRecommendations: { _, _ in throw cancellation }, fetchHotels: { _, _ in
                fallbackCalls += 1
                return []
            })
            await vm.refreshRanking()
            precondition(vm.errorMessage == nil && fallbackCalls == 0)
            precondition(!vm.isLoading && !vm.isRanking)
        }
        print("PASS: cancellation produces no error or fallback request")

        var calls = 0
        var release: CheckedContinuation<Void, Never>?
        let refreshing = ExploreViewModel(fetchRecommendations: { _, _ in
            calls += 1
            if calls == 1 { return initial }
            await withCheckedContinuation { release = $0 }
            try Task.checkCancellation()
            return updated
        }, fetchHotels: { _, _ in preconditionFailure("Unexpected fallback") })
        await refreshing.loadHotels()
        let gesture = Task { await refreshing.refreshFromGesture() }
        while release == nil { await Task.yield() }
        precondition(refreshing.hotels.first?.id == "initial" && !refreshing.isLoading && refreshing.isRanking)
        gesture.cancel() // Simulate refresh-control lifecycle cancellation.
        release?.resume()
        await gesture.value
        precondition(refreshing.hotels.first?.id == "updated" && refreshing.errorMessage == nil)
        precondition(!refreshing.isLoading && !refreshing.isRanking)
        print("PASS: cancelled refresh control still completes fetch and retains visible hotels")

        var fail = false
        let offline = ExploreViewModel(fetchRecommendations: { _, _ in
            if fail { throw URLError(.notConnectedToInternet) }
            return initial
        }, fetchHotels: { _, _ in throw URLError(.notConnectedToInternet) })
        await offline.loadHotels()
        fail = true
        await offline.refreshFromGesture()
        precondition(offline.errorMessage != nil && offline.hotels.first?.id == "initial")
        precondition(!offline.isLoading && !offline.isRanking)
        fail = false
        await offline.refreshFromGesture()
        precondition(offline.errorMessage == nil)
        print("PASS: real network failure retains content; subsequent refresh recovers")

        let fallback = ExploreViewModel(fetchRecommendations: { _, _ in throw URLError(.badServerResponse) },
                                        fetchHotels: { _, _ in initial.hotels })
        await fallback.loadHotels()
        precondition(fallback.hotels.count == 1 && fallback.errorMessage == nil)
        print("PASS: genuine recommendation failure still uses hotel fallback")

        var oldRequest: CheckedContinuation<RecommendationResult, Never>?
        let racing = ExploreViewModel(fetchRecommendations: { destination, _ in
            if destination == nil { return await withCheckedContinuation { oldRequest = $0 } }
            return updated
        }, fetchHotels: { _, _ in [] })
        let older = Task { await racing.refreshFromGesture() }
        while oldRequest == nil { await Task.yield() }
        await racing.searchHotels(destination: "Hà Nội")
        oldRequest?.resume(returning: initial)
        await older.value
        precondition(racing.hotels.first?.id == "updated" && !racing.isRanking)
        print("PASS: stale refresh cannot overwrite a newer destination")
    }
}
