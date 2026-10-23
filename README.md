# FORGE

A local, working web MVP for discovering, building, publishing, and playing small 3D adventure worlds. Combines a warm community browser, a focused dark world editor, and direct avatar controls.

## Run

Requires Node.js 24 or later. From this directory:

```sh
npm install
npm run build
npm start
```

Open http://localhost:4173. For development use `npm run dev`. The backend and frontend share port 4173. The running app is already available during this Codex session.

## Try the complete flow

1. Browse the three included, clearly marked demo games and their creator profiles.
2. Create your own local account, then create a world from one of three saved theme kits.
3. Drag components from the object library onto the ground, or click to add. Drag placed objects to reposition them. Orbit on empty space; scroll to zoom.
4. Change position, rotation, scale, name, and color in the inspector. Duplicate, delete, undo, and redo. Use Save changes (or Command/Ctrl+S) to persist changes.
5. Edit the win rule and objective in Rules. The starter game has three crystals and a magic gate.
6. Customize your avatar colors and hat. Save it to your account.
7. Playtest. Walk with WASD/arrows or the on-screen movement buttons. Collect crystals by approaching them. Click the gate when nearby to finish.
8. Publish a frozen version as public, unlisted, or private. Public worlds appear in Discover. Later draft edits do not change published or active sessions.
9. Invite an existing account by email as editor or viewer. That user sees the project in My studio. Open the world from two browsers/accounts to see presence, cursors, and saved changes. Simultaneous conflicting saves are rejected and the local version can be downloaded.
10. Open a published game's page, start a session, and use Invite friends to share its room link. Up to eight connections can join a room. For another device, the app must be reachable at the same host (or use a hosted deployment); localhost links only work on this machine.

## What is implemented

- React application, generated cover art, responsive Discover, profiles, search and bookmarks.
- Actual Three.js low-poly world rendering, 12 reusable object types, drag placement, object manipulation, transform/material controls and deterministic visual rules.
- Local email/password accounts using scrypt password hashing; HTTP-only, SameSite session cookies; seven-day sessions; server-side project roles; basic login throttling and mutation-origin checks.
- SQLite persistence for accounts, avatars, projects, memberships, bookmarks and published snapshots.
- WebSocket collaboration with presence, cursor indicators, saved-state broadcasts and optimistic revision checks.
- Server-authoritative multiplayer crystal collection, bounded movement, basic cottage/rock collision checks, shared win state, private draft playtesting and session invite links.
- Project JSON export and a searchable build guide.
- No model calls in editing, saving, publishing, avatars, or playing.

## Explicit limits

This is a local single-server MVP, not a production service or a native packaged application.

- Three built-in kits and reusable procedural meshes are included. Custom AI-generated themes/models, user uploads, rigged clothing, advanced animations and a general asset marketplace are not implemented. Gallery art is illustrative cover art, not screenshots of the low-poly runtime.
- Avatar customization is colors and an explorer hat, not arbitrary face/body/wardrobe modeling.
- Collaboration synchronizes saved project versions. It does not merge simultaneous object edits via CRDTs or implement object leases. An unsaved local edit is protected by a revision-conflict response.
- Multiplayer is cooperative exploration for up to eight connections per room, not an arbitrary competitive networking engine. Physics uses simple proximity/collision rules. Rooms and progress are held in memory and expire when empty or on server restart. Disconnected sessions require rejoining; no automatic reconnection is claimed.
- The scene builder supports the crystal hunt / configurable interact-and-collect rules. Wizard Battle Chess is a separate implemented game mode. Racing, platforming, terrain sculpting and arbitrary script execution are not supported.
- Native APK/AAB, iOS, macOS and Windows builds are not produced. Export downloads project JSON, not an executable.
- AI generation, n8n, LangChain and CrewAI integrations are intentionally not connected; the core product is usable without tokens or provider credentials.
- Account verification/recovery, moderation/report handling, abuse protection beyond basic throttling, billing, production TLS, distributed room ownership, backups and production monitoring remain deployment work.
- Included creator identities are fictional examples, marked DEMO. The locally created Studio Explorer account and Willowbrook Adventure project are browser-verification fixtures.

## Data and deployment

The database is created at `data/forge.sqlite` and is excluded from version control. Preserve the entire data directory, including SQLite WAL files, or use a proper SQLite backup procedure. `DB_PATH` and `PORT` can override defaults.

Deploy this complete Node service with persistent disk and WebSocket support. A static-only upload of `dist/client` does not include accounts, editing persistence, or multiplayer. The template's Sites worker is preserved for compatibility but is not a deployment target for this backend.

## Verification

```sh
npm test
npm run build
```

The test suite starts a separate server on port 4174 with a temporary database. It checks authentication and authorization, schema validation, conflicting saves, collaboration broadcasts, immutable publication, two-client gameplay completion, distance checks, direct/unlisted links, private access, bookmarks, avatars and cross-origin mutations. It does not replace production security or load testing.

Browser evidence and visual comparisons are in `qa/`; the visual review is in `design-qa.md`.

## Wizard Battle Chess

Open `/?view=chess`, or choose **Battle chess** in the navigation. This is an original wizard-themed chess game, not branded Harry Potter content.

- Create a match. Its creator commands the Ivory army (white).
- Share its `?chess=<match-id>` link. A signed-in friend chooses **Join as challenger**, reserving Obsidian (black). Further visitors are spectators. Seats persist by account; reconnecting does not give away an army.
- Select your piece and a legal destination in the 3D board, or use the keyboard-accessible Tactical view.
- Command your own pieces: `pawn e2 to e4`, `knight to f3`, `rook a1 to a4`, `king speak`, `rook a1 speak`. Ambiguous commands require a starting square. Unsupported natural-language conversation is not implemented.
- Enable piece voices to read dialogue with browser speech synthesis. Dictate optionally fills the command box for review on supported browsers; it does not secretly send recognized moves. Browser speech services may be network-backed. No LLM is used for chess moves or built-in dialogue.
- The server validates account ownership, active turn, board revision, and legal movement. Kings are protected by chess rules: the game ends in checkmate rather than capturing the king.
- Animated characters march, lunge during captures, and break the captured stone character into modeled body pieces and fragments. Captures are stylized, not graphic. Castling, en passant and promotion are represented; choose a promotion piece from the board UI (text commands default to queen).
- Match state, PGN, dialogue, and arena style persist in SQLite. Both clients receive authoritative state and battle events. Transient connection presence remains in memory. The client attempts a bounded reconnect on disconnection.
- The host can change the arena between Moonstone, Ember and Frost, and toggle battle animation. These are saved presets, not AI-generated themes.
- **Invite through WhatsApp** prepares a message in WhatsApp. The user chooses a contact and sends it. No contacts are accessed and no messages are sent automatically.

### Remote play and hosting

A localhost invitation works only on the host computer. A friend using a phone needs a public HTTPS URL and WebSocket-capable hosting. Hosting is not automatically enabled by the WhatsApp button.

A Dockerfile is included for a persistent single-server deployment. Mount persistent storage at `/app/data`, set `PUBLIC_ORIGIN` to the exact HTTPS origin (for example `https://your-game.example`), and forward port 8080 with WebSocket upgrades. Setting `PUBLIC_ORIGIN` allows same-origin mutations behind a TLS reverse proxy and makes authentication cookies Secure. The database must not be stored on an ephemeral filesystem.

The current app has not been publicly deployed. A temporary tunnel, if selected, is suitable for an invitation test and only remains available while its process and this computer stay running. Permanent hosting requires a selected hosting target and persistent disk. Do not deploy the static Sites worker for this multiplayer backend.

### Free permanent hosting: Cloudflare

The supported free deployment is now `wrangler.jsonc` + `cloudflare/index.mjs`. It serves the React app and puts accounts, project data and chess matches in a SQLite-backed Durable Object. Hibernating WebSockets preserve live connections while idle. The Cloudflare runtime and Node runtime share the API, world and chess rules; the original static Sites worker remains a separate compatibility template and must not be used to host multiplayer.

Use a Cloudflare **Workers Free** account. No paid plan, paid custom domain, payment method or API provider is required by this configuration. Confirm the account is on Workers Free before publication; do not deploy on an existing paid Workers account under the user's zero-spend constraint. Free usage limits can interrupt service when exhausted. No cloud resources have been created yet.

A free account and Wrangler authorization are required to publish. After authorization and plan verification, run `npm run build`, `npm run check:cloudflare`, then `npx wrangler deploy`. The resulting `workers.dev` address is the public invitation origin. No Git repository is required. Local databases and test accounts are excluded from deployment.

`npm run test:cloudflare` starts an isolated local Cloudflare emulator and runs the full API/multiplayer suite against it. `npm run dev:cloudflare` is an optional local preview. The coordinator is sized for a small prototype, not a high-traffic game service. Cloud accounts use salted PBKDF2-SHA256 via Web Crypto; the Node server retains its scrypt password format. Local accounts are not copied to the new host.

### Chess verification

`npm test` now runs 20 tests across the original builder and chess modes. Chess tests cover command parsing, special chess rules, single-seat claims, ownership/turn/spectator restrictions, stale commands, enemy-piece dialogue rejection, capture events, saved-state reconnect, and a complete two-client checkmate. Browser checks additionally verified typed orders, an enemy king refusing commands, own king/rook dialogue, two-player move delivery, and the renderer reaching its stone-shattering animation phase.

### Computer matches and phones

The chess lobby offers **Create multiplayer match** and **Play against computer**. Computer games reserve Obsidian for a built-in two-ply chess engine; a visitor can spectate but cannot take that seat. It evaluates material and pawn advancement, replies with legal moves, and shares the same saved match, animation, and ownership checks as friend matches. This is a basic opponent with one difficulty, not Stockfish or an LLM. No API calls, tokens, or paid services are required. Reopening the match resumes a pending computer turn.

On phones the board stacks above the controls, **Match & orders** jumps to the command panel, inputs avoid automatic text zoom, and key controls use 44-pixel touch targets. Browser verification at 390 × 844 confirmed a computer reply and no horizontal overflow; evidence is `qa/chess-computer-mobile.png`. This is responsive web support, not a native APK/iOS build. Remote friend invites still require the pending free public deployment.
