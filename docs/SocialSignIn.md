# Customer sign-in methods

The iOS login and registration screens offer email/password, Google and Apple. Both social buttons call `POST /api/v1/auth/social`; the backend verifies the provider ID token signature, issuer, audience and expiry before issuing Hotelia tokens. Apple requests additionally verify the SHA-256 nonce. Provider subjects, not email addresses, identify returning social accounts.

## Configuration

1. Keep the iOS Google OAuth client ID in `DuLich/Info.plist` (`GIDClientID`) and its matching reversed URL scheme. Set the same ID as `GOOGLE_IOS_CLIENT_ID` on the backend. In Google Cloud Console, the iOS OAuth client must match the Xcode bundle identifier.
2. Enable **Sign in with Apple** for the `HieuNguyen.DuLich` App ID in Apple Developer and refresh the provisioning profile. The Xcode target uses `DuLich/Hotelia.entitlements`. Set `APPLE_BUNDLE_ID=HieuNguyen.DuLich` on the backend.
3. The iOS app must reach the backend over HTTPS outside the local simulator. `APIClient.swift` currently points at local `127.0.0.1`, so update its API base URL before testing on a physical device or releasing.
4. Restart the backend after changing environment variables. Never place provider private keys or Hotelia JWT secrets in the iOS app.

On the supported iOS versions, AppAuth's `ASWebAuthenticationSession` receives the Google OAuth callback itself. Do not forward `/oauth2callback` again through SwiftUI `.onOpenURL` to `GIDSignIn.handle(url)`; that can resume an already completed session and crash the app.

An existing customer account with the same verified email can be linked automatically only when the provider is authoritative for that email. Google accounts using third-party email without a hosted domain do not auto-link. Admin and owner accounts never auto-link through customer social sign-in. Apple Hide My Email may produce a separate customer account; no manual account merge flow is available yet.

## Verification

- Backend: `npm test -- --runInBand auth.service` and `npm run build` in `backend/`.
- iOS: build the `Hotelia` scheme, then test Google and Apple with real accounts on a configured simulator or device. The first Apple authorization should provide the name; later authorizations may not.
- Test a valid returning customer, an existing email/password customer, an admin/owner email, a cancelled provider prompt and an invalid provider token.
