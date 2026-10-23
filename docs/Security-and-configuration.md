# Security and environment configuration

## Secret ownership

Payment provider secrets, weather keys, Cloudinary signing secrets, JWT secrets,
and administrator passwords belong on the backend only. Do not add them to an
iOS plist, a `VITE_` variable, or any other client bundle.

`Secrets.plist` was removed from the repository and the Xcode Copy Bundle
Resources phase. Because configured values existed in Git history, rotate the
following credentials in their provider dashboards before a public release:

- Legacy MoMo and VNPay credentials that were tracked previously (revoke them even though those integrations were removed)
- OpenWeather API key
- Cloudinary credentials and upload preset
- Any administrator password that appeared in the file

## Backend

The backend requires Node.js 20 or newer. With `nvm`, run `nvm use` from the
`backend` directory; `.nvmrc` selects Node 20.

Copy `backend/.env.example` to `backend/.env` for local development. Production
must provide `MONGODB_URI`, a strong `JWT_SECRET`, and comma-separated HTTPS
origins in `CORS_ORIGINS`. The process exits during startup if required settings
are missing or a production JWT secret is unsafe.

payOS credentials are stored only in `backend/.env` as `PAYOS_CLIENT_ID`,
`PAYOS_API_KEY`, and `PAYOS_CHECKSUM_KEY`. The iOS app receives only the hosted
checkout URL. Payment completion is accepted only from the signed backend
webhook; return and cancel deep links never change booking state by themselves.

## iOS

`HoteliaAPIBaseURL` comes from the `HOTELIA_API_BASE_URL` Xcode build setting.
Debug is configured for the local development host. Set the Release value to
the public HTTPS API before archiving. Access and refresh tokens are stored in
Keychain; existing UserDefaults tokens migrate once and are then deleted.

## Web

Both web apps read the public `VITE_API_URL`. Leave it as `/api/v1` when the
host provides a same-origin rewrite, or set it to the public HTTPS API URL.
Variables prefixed with `VITE_` are visible to every browser user and must never
contain credentials.
