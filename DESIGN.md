# DESIGN.md — IDOL AVALON LIVE: Discord Party Play Design System

## 1. Visual Concept & Discord Party Play Aesthetic
**IDOL AVALON LIVE** reimagines the classic 7-player hidden-role social deduction game *The Resistance: Avalon* as a **Discord Voice & Video Party Call (`#avalon-stage-7p`)**. Instead of needing 7–10 human friends online simultaneously to start a Mafia/Avalon lobby, a solo player (or a small group of friends in future multiplayer rooms) drops into a Discord voice channel where **6 Autonomous AI K-Pop Visual Center Idols** (**Seoyoung `서영`, Rina `리나`, Seol-ah `설아`, Yura `유라`, Chaerin `채린`, Hana `하나`**) and **MC Jae-ho (`유재호`, `[BOT] Moderator`)** fill the seats with real-time voice synthesis and epistemic hidden-role reasoning.

Rather than a text-only chatbot, the interface is engineered as an authentic **Discord Stage & Video Call Experience**:
- **Fixed 4K Studio Profile Images (`gemini-nano-banana-2.1`)**: During our hackathon sprint, we benchmarked live turn-by-turn video generation (`gemini-omni-1.1-flash`) and found that video synthesis latency could not keep up with rapid Mafia/Avalon cross-examinations. To preserve snappy conversational pacing, each Discord tile renders a crisp, steady 16:9 4K studio profile image (`public/generated/portrait_*.png`) with zero camera wobble.
- **Discord Voice-Activity & Stage Overlays**:
  - **Discord Green Speaking Ring (`#23a55a`)**: Crisp active-speaker border and live voice-activity waveform bars driven by `gemini-3.8-flash-tts` Web Audio API playback.
  - **Live Closed Captions & Dialect Tags**: Floating speaking-style badges and live subtitle bubbles (`#caption_<id>`) directly on the active speaker's Discord tile, plus **Namuwiki (`나무위키`) Profile Tooltips** on hover.
  - **Simultaneous Floor-Bid & Vote Badges**: Real-time badges (`👑 Leader`, `🛡️ On Quest`, `✋ Wants Mic`, `🤫 Strategic Silence`, `⭕ Approved` / `❌ Rejected`) across all 8 tiles.

---

## 2. Color Palette & Discord Dark Mode Tokens (`public/styles.css`)
| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| `--dc-server-rail` | `#1e1f22` | Far-left Discord Server Icon Rail (`64px`) |
| `--dc-channel-rail` | `#2b2d31` | Left Voice Channel Sidebar (`244px`), connected member list & Secret Role / New Game Setup |
| `--dc-user-bar` | `#232428` | Bottom-left Discord user profile & live role status bar |
| `--dc-stage-bg` | `#0e0f12` | Center matte-black Discord Voice & Video Call stage background |
| `--dc-tile-bg` | `#191b1f` | Individual 16:9 Discord video call participant tiles |
| `--dc-chat-bg` | `#313338` | Right-hand resizable `#stage-chat` & Judge X-Ray Inspector drawer |
| `--dc-blurple` | `#5865f2` | Primary Discord Blurple brand accent, active pills, primary CTAs |
| `--dc-green` | `#23a55a` | Discord active-speaker border ring (`3px`), `APPROVE` vote, Quest `SUCCESS`, Verified pill |
| `--dc-yellow` | `#f0b232` | Quest Leader crown, Hammer track warning (`4/5`), `Percival` candidate badge |
| `--dc-red` | `#da373c` | `REJECT` vote, Quest `FAIL`, Epistemic Evil tag, Assassin alert |

---

## 3. Typography
- **Display & Stage Headers (`--font-display`)**: `'Outfit', 'Inter', sans-serif` (Weights: `600`, `700`, `800`) — Clean geometric channel titles (`#avalon-stage-7p`), Quest track pills, and participant nameplates.
- **UI & Discord Chat Copy (`--font-sans`)**: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif` (Weights: `400`, `500`, `600`, `700`) — Authentic Discord message rhythm in `#stage-chat` and floating call subtitles.
- **Telemetry & Timers (`--font-mono`)**: `'JetBrains Mono', monospace` (Weights: `500`, `700`) — Phase countdown clocks (`MM:SS`), model badges (`gemini-4-argon`), thinking levels, and verification audit logs.

---

## 4. 3-Zone Consolidated Button Architecture & Four-Column Desktop Layout (`100vh`)

1. **Far-Left Server Rail (`64px`, `#1e1f22`)**:
   - Active server icon (`IA` — **IDOL AVALON LIVE**), Interactive Architecture viewer link (`ARCH` -> `/architecture.html`), and AI Studio / API Key modal trigger (`⚙️`).
2. **Zone 1 — Left Channel Sidebar & Match Setup (`244px`, `#2b2d31`)**:
   - **Active Voice Channel (`🔊 avalon-stage-7p`)**: Live connected member list (`8 / 8 Connected`) with green speaking indicators (`MC Jae-ho [BOT]`, `Seoyoung`, `Rina`, `Seol-ah`, `Yura`, `Chaerin`, `Hana`, `You (Guest)`).
   - **Quest Progress & Vote Track Card**: Shows Quest 1–5 status pills (`2, 3, 3, 4*, 4`) and the 5-Proposal Reject Hammer Counter (`0/5` to `5/5`).
   - **Your Secret Role & New Game Setup Card (`#secretRoleCard`)**: Displays the human player's dealt Avalon role, alignment badge, and strict epistemic Night Vision (with one-click `👁️ Hide` privacy blur), plus the Role Selector dropdown (`Random`, `Merlin`, `Percival`, `Loyal Servant`, `Assassin`, `Morgana`, `Oberon`), **`🔄 Start New Game (Quest 1)`** button, and Judge Demo Jump buttons (`⚡ Demo: Quest 4`, `🗡️ Demo: Assassin`).
3. **Zone 2 & 3 — Center Discord Video Call Stage (`1fr`, `#0e0f12`)**:
   - **Top Stage Header (`48px`)**: Voice channel badge (`🔊 avalon-stage-7p`), phase badge, countdown timer (`MM:SS`), and `#stage-chat` / `X-Ray` drawer toggles.
   - **Zone 2 — High-Visibility Stage Game HUD (`#phaseActionBanner`)**: Prominent, color-coded banner rendering MC Jae-ho's live prompt alongside interactive phase controls (clickable Member Selection Chips during `TEAM_PROPOSAL`, 1-click **`✅ 찬성 투표 / Approve`** and **`❌ 반대 투표 / Reject`** during both `DISCUSSION` and `TEAM_VOTE`, **`✅ 임무 성공 / 🗡️ 사보타주`** during `QUEST_EXECUTION`, and **`🗡️ 멀린 암살 / Assassinate`** during `ASSASSIN_PHASE`).
   - **8-Tile (`4×2` / Adaptive `2×4`) 16:9 Video Grid**: 1 Moderator tile (**MC Jae-ho**), 6 AI Idol tiles (**Seoyoung, Rina, Seol-ah, Yura, Chaerin, Hana**), and 1 Human Guest tile (with live browser webcam toggle `My Cam`).
   - **Zone 3 — Bottom Call Controls Dock (`.call-controls-dock`)**: Explicitly labeled media and view pill controls (`Voice Mic` via `gemini-3.5-transcribe`, `My Cam`, `Voice ON/OFF` via `gemini-3.8-flash-tts`, `🎵 BGM ON/OFF` + compact Web Audio `GainNode` volume slider via `lyria-3.5`, `X-Ray`, and `Side Panel`).
4. **Resizable Right `#stage-chat` & Judge X-Ray Drawer (`#rightChatDrawer` + `#chatResizeHandle`, `#313338`)**:
   - Features a draggable left-edge splitter (`#chatResizeHandle`) that expands the chat drawer while smoothly reflowing the center video grid to `.compact-stage` (`2×4`).
   - **Tab 1 — `#stage-chat` (Public Table Talk & Chat Action Dock)**: Chronological Discord voice-channel transcript with Reply & Cross-Examination Chain Badges (`↪ @Speaker • 🎯 → @Target`), `VERIFIED`/`HEALED` epistemic pills, a synchronized **Quick-Action Dock (`#chatPhaseActionDock`)**, and full Korean/English natural-language command routing.
   - **Tab 2 — `Inspector` (Judge X-Ray)**: Live Epistemic & Rule Verification Loop logs (`verifyAndHealUtterance`), hidden vs. public `gemini-4-argon` inner monologues (`privateInnerThought` vs. `publicSpeech`), **Namuwiki Cast Lore Cards (`#namuwikiCastContainer`)**, and a spoiler-blurred True Roles table.

---

## 5. Responsive Mobile & Tablet Layout (`@media (max-width: 960px)`)
- **Touch Scrolling Unlocked**: Converts the desktop `100vh` grid into a smooth vertical single-column flex layout (`overflow-y: auto; -webkit-overflow-scrolling: touch;`).
- **Sticky Mobile Quick-Jump Bar (`.mobile-quick-nav`)**: Provides 1-tap smooth scrolling across `🎥 Stage`, `💬 Chat`, `🔍 X-Ray`, and `🎲 Role/Setup`.
- **Mobile-First Visual Ordering**: Places the `2×4` Video Stage (`aspect-ratio: 16 / 10`) and Phase Action HUD first, Live Chat & Judge X-Ray second, and Role / Match Setup third, with `16px` form inputs to prevent iOS Safari auto-zooming.
