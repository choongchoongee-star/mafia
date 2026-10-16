# DESIGN.md — IDOL AVALON LIVE: Discord Party Play Design System

## 1. Visual Concept & Discord Party Play Aesthetic
**IDOL AVALON LIVE** reimagines the classic 7-player hidden-role social deduction game *The Resistance: Avalon* as a **Discord Voice & Video Party Call (`#avalon-stage-7p`)**. Instead of needing 7–10 human friends online simultaneously to start a Mafia/Avalon lobby, a solo player (or a small group of friends in future multiplayer rooms) drops into a Discord voice channel where **6 Autonomous AI K-Pop Idols** (**Wonyoung, Karina, Sullyoon, Yuna, Chaewon, Hanni**) and **MC Jae-suk** (`[BOT] Moderator`) fill the seats with real-time voice synthesis and epistemic hidden-role reasoning.

Rather than a text-only chatbot, the interface is engineered as an authentic **Discord Stage & Video Call Experience**:
- **4K Studio Portrait Anchors (`gemini-nano-banana-2.1`) & Optional `.mp4` Cutscene Loops (`gemini-omni-1.1-flash`)**: During our hackathon sprint, we benchmarked live turn-by-turn video generation (`gemini-omni-1.1-flash`) and found that video synthesis latency could not keep up with rapid Mafia/Avalon cross-examinations. To preserve snappy conversational pacing, each Discord video tile anchors on a bespoke 4K portrait (`public/generated/portrait_*.png`) paired with a 60FPS interactive HTML5 `<canvas>` overlay and optional `.mp4` studio webcam loops (`public/generated/webcam_*.mp4`).
- **60FPS Discord Voice-Activity & Camera HUD (`<canvas>`)**: Layered directly above each character tile (`z-index: 2`, `pointer-events: none`), a 60FPS HTML5 Canvas renders real-time voice-call presence and micro-expressions:
  - **Discord Green Speaking Ring (`#23a55a`)**: Crisp `3px` active-speaker border and live voice-activity waveform bars driven by `gemini-3.8-flash-tts` audio amplitude.
  - **Real-Time Phoneme/Viseme Articulation**: Dynamic jaw/lip viseme cues and audio dB telemetry (`🎙️ LIVE [A/O] -6.2dB`) synced to character speech.
  - **Simultaneous Listener Micro-Reactions**: Non-speaking party members display live reaction pills (`⚡ REACTING`, `🤨 DOUBTING`, `👍 NODDING`, `👀 WATCHING`) during heated accusations.

---

## 2. Color Palette & Discord Dark Mode Tokens (`public/styles.css`)
| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| `--dc-server-rail` | `#1e1f22` | Far-left Discord Server Icon Rail (`72px`) |
| `--dc-channel-rail` | `#2b2d31` | Left Voice Channel Sidebar (`256px`), connected member list & Secret Role DMs |
| `--dc-user-bar` | `#232428` | Bottom-left Discord user profile & quick mic/deafen status bar |
| `--dc-stage-bg` | `#0e0f12` | Center matte-black Discord Voice & Video Call stage background |
| `--dc-tile-bg` | `#191b1f` | Individual 16:9 Discord video call participant tiles |
| `--dc-chat-bg` | `#313338` | Right-hand collapsible `#stage-chat` & Judge X-Ray Inspector drawer |
| `--dc-blurple` | `#5865f2` | Primary Discord Blurple brand accent, active pills, `@Mention` chips, primary CTAs |
| `--dc-green` | `#23a55a` | Discord active-speaker border ring (`3px`), `APPROVE` vote, Quest `SUCCESS`, Verified pill |
| `--dc-yellow` | `#f0b232` | Quest Leader crown, Hammer track warning (`4/5`), `Percival` candidate badge |
| `--dc-red` | `#da373c` | Disconnect button, `REJECT` vote, Quest `FAIL`, Epistemic Evil tag, Assassin alert |

---

## 3. Typography
- **Display & Stage Headers (`--font-display`)**: `'Outfit', 'Inter', sans-serif` (Weights: `600`, `700`, `800`) — Clean geometric channel titles (`#avalon-stage-7p`), Quest track pills, and participant nameplates.
- **UI & Discord Chat Copy (`--font-sans`)**: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif` (Weights: `400`, `500`, `600`, `700`) — Authentic Discord message rhythm in `#stage-chat` and floating call subtitles.
- **Telemetry & Timers (`--font-mono`)**: `'JetBrains Mono', monospace` (Weights: `500`, `700`) — Phase countdown clocks (`MM:SS`), model badges (`gemini-4-argon`), thinking levels, and verification audit logs.

---

## 4. Four-Zone Discord Party Call Layout (`100vh` Zero-Scroll Viewport)
1. **Far-Left Server Rail (`72px`, `#1e1f22`)**:
   - Active server icon (`IA` — **IDOL AVALON LIVE**), quick Demo Scenario jump-cut icons (**Quest 4 Critical (`2F`)**, **Assassin Climax**), Architecture viewer link (`/architecture.html`), and AI Studio / API Key modal trigger.
2. **Left Channel Sidebar (`256px`, `#2b2d31`)**:
   - **Active Voice Channel (`🔊 avalon-stage-7p`)**: Live connected member list (`8 / 8 Connected`) with green speaking indicators (`MC Jae-suk [BOT]`, `Wonyoung`, `Karina`, `Sullyoon`, `Yuna`, `Chaewon`, `Hanni`, `You (Guest)`).
   - **Your Secret Role DM Card**: Displays the human player's dealt Avalon role, alignment badge, and strict epistemic Night Vision (with one-click `👁️ Hide` privacy blur).
   - **Match Setup & Scenario Jump-Cuts**: Role selector (`Random Role (100% Official Rules)`, `Merlin`, `Percival`, `Loyal Servant`, `Assassin`, `Morgana`, `Oberon`) and instant judge scenario buttons.
   - **Discord User Bar (`#232428`)**: Bottom status bar showing `You (Guest)` and live role status.
3. **Center Discord Video Call Stage (`1fr`, `#0e0f12`)**:
   - **Top Stage Header (`48px`)**: Voice channel badge (`🔊 avalon-stage-7p`), inline **5-Quest Board Pills (`Q1..Q5`)**, **Vote Reject Counter (`0/5`)**, phase timer (`01:15`), and `#stage-chat` / `X-Ray` drawer toggles.
   - **Context-Sensitive Stage Action Banner**: Renders MC Jae-suk's live moderation prompt alongside interactive buttons for the current phase (click video tiles to propose a Quest team, vote `APPROVE`/`REJECT`, play `SUCCESS`/`FAIL` quest card, or execute the Assassin's shot).
   - **8-Tile (`4x2`) 16:9 Video Grid**: 1 Moderator tile (**MC Jae-suk**), 6 AI Idol tiles (**Wonyoung, Karina, Sullyoon, Yuna, Chaewon, Hanni**), and 1 Human Guest tile (with live browser webcam toggle `📷 Cam`).
   - **Discord Call Control Dock (`76px`)**: Circular Discord call controls (Mic Push-to-Talk via `gemini-3.5-transcribe`, Camera Toggle, Sound/BGM Toggle via `lyria-3.5`, Skip/Next Turn, New Match) plus an inline `@Mention` & quick chat bar.
4. **Right Collapsible `#stage-chat` & Judge X-Ray Drawer (`340px`, `#313338`)**:
   - **Tab 1 — `#stage-chat` (Transcript)**: Chronological Discord voice-channel text log with model & `thinking_level` badges and `VERIFIED`/`HEALED` epistemic status pills.
   - **Tab 2 — `Inspector` (Judge X-Ray)**: Real-time Epistemic & Rule Verification Loop logs (`verifyAndHealUtterance`), hidden vs. public `gemini-4-argon` inner monologues (`privateInnerThought` vs. `publicSpeech`), and a spoiler-blurred True Roles table.

