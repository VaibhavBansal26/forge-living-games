# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Accepted product direction
- Combine the warm community Discover surface, dark 3D editor, and direct avatar customization from the three approved concepts.
- Manual manipulation is the primary interaction. Do not reintroduce a persistent AI chat panel.
- Theme components are reusable and independently editable. No model calls during ordinary editing or gameplay.
- Support accounts, creator publishing/discovery, project roles, shared design sessions, and multiplayer gameplay.
- This release uses intentionally simple editable low-poly meshes; generated discovery art is illustrative cover art, not a screenshot of the running world.

## Updated direction: playable wizard battle chess
- The user wants new playable mechanics, prompt-driven changes, and expressive living pieces; do not treat manual scene assembly as the whole product.
- Wizard Battle Chess is an original fantasy implementation with two authenticated commanders, army-bound commands, live turns, talking characters, and animated stone captures.
- WhatsApp invitations prepare a share message; never send one automatically.
- A public host must be selected before enabling remote sharing. Do not represent localhost links as phone-accessible remote invitations.
- Secure OpenAI key selection is pending. Do not claim arbitrary AI generation or unrestricted conversational NPCs are connected.

## Hosting budget constraint
- User explicitly prohibits all paid services. Do not create paid Render resources, enable billing, or upgrade plans. Permanent hosting must stay on a free plan. The paid Render proposal has been removed.
- Chess must support explicit friend and computer match choices. The computer uses a local rules-based engine with no paid APIs. Preserve mobile play, large controls and the board-to-orders shortcut.

- Free deployment target is Cloudflare Workers with SQLite Durable Objects. Confirm Workers Free account status before publication. The user approved Wrangler deployment access and deployment on the confirmed Workers Free plan. Public app: https://forge-living-games.vaibhavbansal024.workers.dev. Never enable a paid plan.
