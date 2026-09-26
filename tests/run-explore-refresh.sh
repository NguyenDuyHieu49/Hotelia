#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
build_dir=$(mktemp -d "${TMPDIR:-/tmp}/hotelia-refresh.XXXXXX")
trap 'rm -rf "$build_dir"' EXIT
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
xcrun swiftc -parse-as-library \
  DuLich/Core/Explore/Service/HotelSearchFilters.swift \
  DuLich/Core/Models/Hotel.swift \
  DuLich/App/Network/APIClient.swift \
  DuLich/Core/Explore/Service/ExploreService.swift \
  DuLich/Core/Explore/Service/RecommendationService.swift \
  DuLich/Core/Explore/ViewModel/ExploreViewModel.swift \
  tests/ExploreRefreshRegression.swift \
  -o "$build_dir/ExploreRefreshRegression"
"$build_dir/ExploreRefreshRegression"
