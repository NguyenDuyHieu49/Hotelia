"""Copy the source lines cited by \\lstinputlisting into report-latex/code/.

listings prints non-Latin-1 characters from lines skipped by `firstline`, so the
report includes pre-cut snippet files and keeps the original numbering with
`firstnumber`. Source ranges live in SNIPPETS; rerun after the code changes.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parents[1] / "code"
SNIPPETS = {
    "apiclient-perform.swift": ("DuLich/App/Network/APIClient.swift", "    private func perform(", "        return try await URLSession.shared.data(for: retry)", 1),
    "apiclient-refresher.swift": ("DuLich/App/Network/APIClient.swift", "private actor AccessTokenRefresher {", None, 0),
    "roombooking-bookroom.swift": ("DuLich/Core/Explore/ItemVIew/RoomBookingView.swift", "    private func bookRoom() {", "            isBooking = false", 2),
    "dulichapp.swift": ("DuLich/App/DuLichApp.swift", None, None, 0),
    "auth-generate-tokens.ts": ("backend/src/auth/auth.service.ts", "  private async generateTokens(", "    return { accessToken, refreshToken };", 1),
    "jwt-validate.ts": ("backend/src/auth/jwt.strategy.ts", "  async validate(payload: any) {", "    return { sub: payload.sub", 1),
    "booking-states.ts": ("backend/src/bookings/booking-state.service.ts", "  private readonly transitions:", "  };", 0),
    "booking-rules.ts": ("backend/src/bookings/booking-rules.ts", "export const DAY", None, 0),
    "bookings-create-tx.ts": ("backend/src/bookings/bookings.service.ts", "    const session=await this.connection.startSession();", "    return this.findById(String(created!._id));", 0),
    "payos-verify.ts": ("backend/src/payments/providers/payos.client.ts", "  async verifyWebhook(", "  private getClient(): PayOS {", -2),
    "payments-webhook.ts": ("backend/src/payments/payments.service.ts", "  async handlePayOSWebhook(", "          throw new BadRequestException('Số tiền webhook payOS không khớp đơn hàng');", 1),
    "lgbm-evaluate.ts": ("backend/src/recommendations/lightgbm-ranker.ts", "function evaluateTree(", "  return artifact.tree_info.reduce(", 1),
    "lgbm-load.ts": ("backend/src/recommendations/lightgbm-ranker.ts", "  constructor() {", "      this.logger.warn(`LightGBM unavailable", 2),
}

def cut(path, start, end, extra):
    lines = (ROOT / path).read_text().split("\n")
    if lines and lines[-1] == "":
        lines = lines[:-1]
    i = 0 if start is None else next(k for k, l in enumerate(lines) if l.startswith(start))
    if end is None:
        j = len(lines) - 1
    else:
        j = next(k for k in range(i, len(lines)) if lines[k].startswith(end))
    j += extra
    return i + 1, lines[i:j + 1]

OUT.mkdir(exist_ok=True)
for name, (path, start, end, extra) in SNIPPETS.items():
    first, body = cut(path, start, end, extra)
    (OUT / name).write_text("\n".join(body) + "\n")
    print(f"{name}\t{path}:{first}-{first + len(body) - 1}")
