# Video Dashboard

A lightweight Vue 3 + Vuetify web app for viewing and controlling live video streams (HLS / WebRTC WHEP) with MQTT-based PTZ and auxiliary messaging. Intended for development and demos — not production-ready for authentication or secrets management.

## Features

- HLS playback (hls.js fallback) and WebRTC WHEP playback (mediaMTX-compatible).
- Add, edit and persist camera entries and grid layout to localStorage.
- MQTT integration for PTZ, presets and custom topics.
- Mobile-responsive UI built with Vuetify.
- Simple development-mode auth and local preset management.

## Quick start (development)

1. Install dependencies:

```sh
npm install
```

2. Start dev server (Vite, HTTPS configured for local certs):

```sh
npm run dev
```

Open the address printed by Vite (typically <https://localhost:5173>).

3. Build and preview:

```sh
npm run build
npm run preview
```

## Docker (preview)

A Dockerfile is provided for containerized preview/testing. Example usage:

```sh
# Build
docker build -t video-dashboard:dev .

# Run (adjust ports and volumes as needed)
docker run --rm -p 5173:5173 -v $(pwd)/certs:/app/certs video-dashboard:latest
```

Adjust HTTPS/ports and mount certs if running with TLS inside the container.

## Configuration (env / certs)

Environment variables are read via Vite (.env.*):

- VITE_APP_HLS_BASE_URL — optional base URL for HLS normalization.
- VITE_APP_MEDIAMTX_BASE_URL — base URL for mediaMTX / WHEP endpoints.
- VITE_APP_MQTT_URL — default MQTT broker URL used by the app.
- VITE_APP_TRANSCRIPTION_URL - base URL for transcription service.

Local settings (grid layout, broker URL, saved streams) are stored in localStorage.

TLS certs for the dev server are in ./certs. If you change host/port, update vite.config.js and any local cert SANs.

## Authentication

A simple static login is implemented in src/store/auth.js for development only. Replace with a secure backend for production deployments.

## Key files

- src/main.js — application entry
- src/App.vue — global layout + router container
- src/views/VideoDashboard.vue — main dashboard and layout
- src/components/VideoCard.vue — stream card, playback and control UI
- src/components/StreamDialog.vue — add/edit stream and normalization helpers
- src/components/Joystick.vue — PTZ joystick overlay
- src/store/ — Vuex store modules:
  - mqtt.js — MQTT connection, subscribe/publish helpers
  - videos.js — stream state and WebRTC helpers
  - auth.js — development auth
- src/utils/mqtt.js — topic generation and publish helpers
- vite.config.js — dev server TLS and build config
- package.json — scripts and dependencies
- Dockerfile — container preview setup

## MQTT & topics

Topic derivation and normalization live in src/utils/mqtt.js. The MQTT store exposes actions such as:

- mqtt/connect
- mqtt/subscribe
- mqtt/publish

VideoCard.vue publishes PTZ and auxiliary messages using derived topics from stream URLs or configured IDs.

## HLS and WebRTC (WHEP) notes

- HLS playback uses hls.js when native HLS is unavailable; iOS Safari uses the native player.
- WebRTC playback expects a WHEP-compatible server (mediaMTX or similar). Confirm the media endpoint supports the WHEP offer/answer flow used by the app.

## Troubleshooting

- Streams don’t play: check browser console for CORS, mixed-content (HTTP vs HTTPS), or codec errors.
- WebRTC issues: verify the media server’s WHEP endpoint and signaling behavior.
- MQTT issues: confirm broker URL, credentials, and WebSocket support if using MQTT over WS.

## Security & production guidance

- Do not rely on the included auth for production — integrate a secure auth backend.
- Secure MQTT, WebRTC, and streaming endpoints with TLS and authentication.
- Never commit private keys, certs, or secret env values to source control.
- Consider server-side storage for presets and user management in production.

## Contributing

Open issues and PRs for bugs, improvements, and new features. Follow the ESLint configuration and project conventions. Add unit tests for store modules and critical utilities where appropriate.

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0). See the included LICENSE file for the full details.

## Contact / References

- See src/utils/mqtt.js and src/store/mqtt.js for MQTT topic generation.
- See src/store/videos.js for WebRTC and stream state helpers.
- For TLS/dev cert setup, inspect vite.config.js and ./certs.
- For container usage, inspect the Dockerfile.
