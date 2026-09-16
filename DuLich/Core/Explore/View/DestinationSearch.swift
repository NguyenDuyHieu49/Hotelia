import SwiftUI

enum DestinationSearchState {
    case location
    case dateGo
    case quantity
}

struct DestinationSearch: View {
    @Binding var show: Bool
    var onSearch: (String) -> Void

    @State private var destination: String = ""
    @State private var startDate = Date()
    @State private var endDate = Date()
    @State private var numPeople: Int = 0

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Search Input
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    TextField("Tìm kiếm điểm đến...", text: $destination)
                        .textFieldStyle(.roundedBorder)
                        .onSubmit {
                            onSearch(destination)
                            show = false
                        }
                }
                .padding()

                // Date Selection
                VStack(alignment: .leading, spacing: 8) {
                    Text("Ngày nhận phòng")
                        .font(.headline)
                    DatePicker("", selection: $startDate, displayedComponents: .date)
                        .datePickerStyle(.compact)
                }
                .padding(.horizontal)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Ngày trả phòng")
                        .font(.headline)
                    DatePicker("", selection: $endDate, in: startDate..., displayedComponents: .date)
                        .datePickerStyle(.compact)
                }
                .padding(.horizontal)

                // Guest Count
                HStack {
                    Text("Số khách")
                        .font(.headline)
                    Spacer()
                    Stepper("\(numPeople) người", value: $numPeople, in: 1...10)
                }
                .padding(.horizontal)

                Spacer()

                // Search Button
                Button(action: {
                    onSearch(destination)
                    show = false
                }) {
                    Text("Tìm kiếm")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(12)
                }
                .padding()
            }
            .navigationTitle("Tìm kiếm")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") {
                        show = false
                    }
                }
            }
        }
    }
}
