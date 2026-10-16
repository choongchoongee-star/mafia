# DESIGN.md — IDOL AVALON LIVE Broadcast Studio Design System

## 1. Visual Concept & Broadcast Aesthetic
**IDOL AVALON LIVE** transforms the classic 7-player hidden-role social deduction game *The Resistance: Avalon* into a Korean variety show Zoom broadcast studio hosted by **MC Jae-suk** alongside **6 AI K-Pop Idols** (**Wonyoung, Karina, Sullyoon, Yuna, Chaewon, Hanni**) and **1 Human Guest**.

Rather than a text-only chatbot or static character portraits, the interface is engineered as a **Live Multi-Cam Television Control Room**:
- **Real `.mp4` Studio Webcam Feeds (`gemini-omni-1.1-flash`)**: Every AI character tile and MC Jae-suk's host monitor streams a dedicated 16:9 `.mp4` webcam video (`public/generated/webcam_*.mp4`) with a 4K studio portrait (`gemini-nano-banana-2.1`) as its poster anchor.
- **60FPS Transparent Camera HUD Overlay (`<canvas>`)**: Layered directly above each `<video>` element (`z-index: 2`, `pointer-events: none`), a 60FPS HTML5 Canvas renders real-time broadcast camera telemetry:
  - Dynamic autofocus face-tracking brackets (`[ AF-LOCK ]`)
  - Real-time phoneme/viseme jaw articulation & audio dB meter (`🎙️ LIVE [A/O] -6.2dB`)
  - Audio-reactive equalizer waveform bars
  - Simultaneous listener reaction badges (`⚡ REACTING`, `🤨 DOUBTING`, `👍 NODDING`, `👀 WATCHING`) across non-speaking tiles while modulating the underlying `<video>` element's scale, pan, and playback rate.

---

## 2. Color Palette & Atmospheric Tokens
| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| `--bg-studio` | `#090b12` | Deep obsidian broadcast control room background |
| `--bg-panel` | `#111524` | Left Host Rail, Right Telemetry Rail, and Bottom Chat Dock |
| `--bg-card` | `#161b2e` | Individual transcript cards and Judge X-Ray telemetry modules |
| `--accent-pink` | `#ec4899` | Primary K-Pop broadcast accent, active phase badges, Wonyoung theme |
| `--accent-indigo` | `#6366f1` | Gemini 4 Argon model badges, Night Vision callout borders, Karina theme |
| `--accent-cyan` | `#06b6d4` | Proposed Quest Team shield borders, Sullyoon theme |
| `--accent-gold` | `#f59e0b` | MC Jae-suk Host cue card, Quest Leader crown, Hammer warning |
| `--accent-green` | `#10b981` | Active speaker ring-light glow, Quest Success, Approve vote, Verified badge |
| `--accent-red` | `#f43f5e` | Quest Fail, Reject vote, Epistemic Evil tag, Assassin alert |

---

## 3. Typography
- **Display & Character Headers (`--font-display`)**: `'Outfit', sans-serif` (Weights: `600`, `700`, `800`, `900`) — High-impact geometric broadcast titles and idol nameplates.
- **UI & Dialogue Copy (`--font-sans`)**: `'Inter', sans-serif` (Weights: `400`, `500`, `600`, `700`) — Crisp readability for live subtitle bubbles and transcript logs at compact studio densities.
- **Telemetry & Timers (`--font-mono`)**: `'JetBrains Mono', monospace` (Weights: `500`, `700`) — Phase countdown clocks (`MM:SS`), model tags (`gemini-4-argon`), thinking levels, and verification audit logs.

---

## 4. Three-Column Broadcast Studio Layout (`100vh` Zero-Scroll Viewport)
1. **Top Broadcast Header (`68px` fixed)**:
   - Live studio indicator pill (`LIVE ZOOM STUDIO`).
   - **5-Quest Avalon Board Track (`2 - 3 - 3 - 4* - 4`)** with explicit `2F!` indicator on Quest 4.
   - **5-Proposal Vote Reject Track (`1..5`)** with automatic Hammer badge (`HAMMER!`).
   - Autonomous Phase Countdown Clock (`20s` Proposal / `75s` Discussion / `15s` Vote / `15s` Quest / `30s` Assassin) + Bystander Mode detector pill.
   - Quick-access controls for **Voice & BGM**, **Judge X-Ray**, **Interactive Architecture (`/architecture.html`)**, and **AI Studio / Key**.
2. **Left Studio Rail (`295px`)**:
   - **MC Jae-suk Host Monitor**: Real `.mp4` webcam feed (`webcam_mc_jaesuk.mp4`), live waveform, and National MC Cue Card commentary.
   - **Your Secret Role Card**: Displays the human player's dealt Avalon role, alignment badge, and strict epistemic Night Vision (with one-click `👁️ Hide` privacy blur).
   - **Role Preference & Episode Launcher**: Allows judges to play `Random Role (100% Official Rules)` or deterministically test `Merlin`, `Percival`, `Loyal Servant`, `Assassin`, `Morgana`, or `Oberon`, plus instant jump-cuts to **Quest 4 Critical** and **Final Assassin Climax**.
3. **Center Zoom Stage (`1fr`)**:
   - **Context-Sensitive Phase Action Banner**: Renders exact interactive buttons required for the current phase (click Zoom tiles to propose a team, vote `APPROVE`/`REJECT`, play `SUCCESS`/`FAIL` quest card, or fire the Assassin's shot).
   - **7-Tile Zoom Conference Grid (`4x2` responsive grid)**: 6 AI Idol live `.mp4` webcam feeds + 1 Human Guest tile (with optional live browser webcam toggle `📷 Cam`).
   - **Live Interrogation & Voice Dock**: `@Mention` target chips, bilingual Push-to-Talk microphone (`gemini-3.5-transcribe-live`), text input, and `⏭️ Stay Silent / Next Idol Turn` button.
4. **Right Telemetry & Judge X-Ray Rail (`330px`)**:
   - **Tab 1 — Live Transcript**: Chronological dialogue feed with model & `thinking_level` metadata and per-turn verification status.
   - **Tab 2 — Judge X-Ray Inspector**: Real-time Epistemic & Rule Verification Loop logs, hidden vs. public `gemini-4-argon` inner monologues (`privateInnerThought` vs. `publicSpeech`), and spoiler-blurred True Roles table.
