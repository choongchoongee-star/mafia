# GEMINI.md — Project Master Context & Progress Record

## 1. Project Overview
- **Workspace**: `c:\Users\Charlie\Business\Projects\mafia`
- **Event**: Google DeepMind AI Hackathon (2026-10-16, 11:20 – 15:20 KST Sprint)
- **Reference Specification**: [docs/hackathon-guide.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/hackathon-guide.md)
- **Primary Candidate Track**: Track 1 — *Gemini 4 Argon in Entertainment* (or hybrid with Track 4 Autonomous Agents)

## 2. Mandatory Technical Guardrails
1. **Primary Model**: `gemini-4-argon` via the **Interactions API** (`google-genai >= 2.3.0` / `@google/genai >= 2.3.0`).
2. **Strict Parameter Rules for `gemini-4-argon`**:
   - Use `generation_config={"thinking_level": "low" | "medium" | "high"}`.
   - **NEVER** pass `thinking_budget`, `temperature`, `top_p`, `top_k`, or explicit `cached_content`.
   - Use `background=True` when `max_output_tokens > 65536`.
3. **Companion Models**:
   - Subagents / Fast Tasks: `gemini-3.8-flash`, `gemini-3.5-flash-lite`
   - Real-time Voice / Live Characters: `gemini-3.8-live` (`gemini-3.8-live-extended-thinking`)
   - Expressive TTS: `gemini-3.8-flash-tts` (`gemini-3.8-flash-lite-tts`)
   - Sprites / UI Assets / Storyboards: `gemini-nano-banana-2.1` (`gemini-3.1-flash-lite-image`)
   - Video Cutscenes: `gemini-omni-1.1-flash`
   - Dynamic Music / Audio Loops: `lyria-3.5` (`lyria-3-clip-preview`)
   - Sandbox Verification: `antigravity-preview-09-2026`
4. **Deployment & Deliverables (Due 15:20 KST)**:
   - Live deployment on **Google Cloud** (Cloud Run / Firebase).
   - **English-only** Project Description, Public GitHub Repository, and Demo Video (< 3 min live execution).
   - Must include a **real verification loop** and **multi-agent / multimodal orchestration** (no simple chat wrappers or static pages).

---

## 3. Current Status
- **Phase**: Phase 6 — Pre-Generated 4K K-Pop Visual Center Studio Portraits (`public/generated/portrait_idol_*.png`), Original Idol Stage Names (`Seoyoung 서영`, `Rina 리나`, `Seol-ah 설아`, `Yura 유라`, `Chaerin 채린`, `Hana 하나`, `MC Jae-ho 유재호`), Detailed Namuwiki-Based Character Background Lore (`namuwikiProfile`: MBTI, favorite foods, nicknames, hobbies, iconic habits), and 6-Agent Independent Parallel Floor Negotiation Live on `http://localhost:8080`, GitHub (`https://github.com/choongchoongee-star/mafia.git`), and **Google Cloud Run** (`https://idol-avalon-live-oyxmbnqija-du.a.run.app`).
- **Remaining Sprint Time**: ~1 hour 25 mins (Submission & Judging begins at 15:20 KST).

---

## 4. Progress Record & Feedback
- **[2026-10-16 13:54 KST] Task 18: Responsive Mobile & Tablet Layout (`@media max-width: 960px`), Touch Scrolling & Sticky Quick-Jump Nav**
  - **Action**:
    1. Updated [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md) to document the mobile & tablet responsive layout (`<= 960px`), touch-scrolling unlock (`overflow-y: auto; -webkit-overflow-scrolling: touch;`), mobile section ordering (`order: 1..4`), and sticky quick-jump navigation bar (`🎥 Stage`, `💬 Chat`, `🔍 X-Ray`, `🎲 Role / Setup`).
    2. Added `.mobile-quick-nav` inside `.server-rail` and section IDs (`#mainVideoStage`, `#leftChannelSidebar`) in [public/index.html](file:///c:/Users/Charlie/Business/Projects/mafia/public/index.html).
    3. Added complete `@media (max-width: 960px)` responsive rules in [public/styles.css](file:///c:/Users/Charlie/Business/Projects/mafia/public/styles.css) so mobile viewports unlock vertical scrolling, prioritize the 8-tile `2×4` video stage (`aspect-ratio: 16 / 10`) at the top, place live chat/X-Ray immediately below, and prevent iOS Safari input auto-zoom (`font-size: 16px`).
    4. Wired `.mobile-nav-pill` smooth scrolling and mobile-aware `setupChatDrawerResizer()` in [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js).
  - **Result**: Verified syntax (`node --check`), committed & pushed to GitHub, and redeployed to Google Cloud Run.
- **[2026-10-16 13:52 KST] Task 17: Pre-Generated 4K K-Pop Visual Center Portraits, Original Idol Stage Names & Detailed Namuwiki Character Lore (`나무위키 프로필`)**
  - **Action**:
    1. Generated, visually inspected, and installed 6 ultra-pretty 4K 16:9 K-Pop visual center studio portraits (`public/generated/portrait_idol_*.png`, 1.32 MB–1.55 MB each) with distinct styling details: **Seoyoung (`서영`)** (pearl hairclip, pink tweed, condenser mic), **Rina (`리나`)** (hime side-locks, silver hairpins & choker, neon booth), **Seol-ah (`설아`)** (black ribbon half-up hair, cream knit), **Yura (`유라`)** (high ponytail with pink satin ribbon, glitter aegyo-sal, pink-white pearl tweed jacket), **Chaerin (`채린`)** (chic dark-chocolate tassel bob cut, see-through bangs, black & silver jacket), and **Hana (`하나`)** (twin braids, star hairpins, pastel-blue cardigan, silver headphones).
    2. Renamed literal celebrity names to original K-Pop idol stage names across [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md), [src/avalonEngine.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/avalonEngine.js), [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js), [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js), [AGENTS.md](file:///c:/Users/Charlie/Business/Projects/mafia/AGENTS.md), and [README.md](file:///c:/Users/Charlie/Business/Projects/mafia/README.md): `MC Jae-ho (유재호)`, `Seoyoung (서영)`, `Rina (리나)`, `Seol-ah (설아)`, `Yura (유라)`, `Chaerin (채린)`, and `Hana (하나)`.
    3. Added rich `namuwikiProfile` lore (`motif`, `mbti`, `favoriteFoods`, `nicknames`, `hobbies`, `iconicHabits`) to each character in [src/avalonEngine.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/avalonEngine.js), injected Namuwiki trivia (strawberries, tonkatsu, mint-choco, malatang, salt bread, floorball #77, Ssam-Chaerin `"너 도독놈이지!"`, MBTI) into `gemini-4-argon` prompts and dialect lines in [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js), and rendered Namuwiki tooltips & Inspector Lore cards (`#namuwikiCastContainer`) in [public/index.html](file:///c:/Users/Charlie/Business/Projects/mafia/public/index.html) and [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js).
  - **Result**: Verified syntax (`node --check`), verified live `/api/game/new` and `/discuss/step` on `http://localhost:8080`, and pushed to GitHub.
- **[2026-10-16 13:47 KST] Task 16: Realistic 7-Player Avalon Phase Timers (`45s / 180s / 30s / 25s / 60s`) & Zero-Wait 6-Agent Parallel Floor Handoff**
  - **Action**:
    1. Updated [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md), [src/avalonEngine.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/avalonEngine.js), [public/index.html](file:///c:/Users/Charlie/Business/Projects/mafia/public/index.html), and [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js) (`PHASE_TIMERS_SEC`) to realistic 7-player Avalon pacing: `TEAM_PROPOSAL: 45s`, `DISCUSSION: 180s`, `TEAM_VOTE: 30s`, `QUEST_EXECUTION: 25s`, and `ASSASSIN_PHASE: 60s`.
    2. Removed the legacy frontend 11-second polling wait (`state.discussionElapsedSec - state.lastAutoBeatSec >= 11`) in [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js) (`startAutonomousPhaseTimer`) so that as soon as any speaker finishes their audio (`state.lastTurnFinishedAt`), the next 6-Idol parallel floor bid (`Promise.all(aiPlayers.map(idol => evaluateSingleIdolFloorBid(...)))`) fires after a natural `2.6s` breath.
    3. Added `state.isWaitingServer` clock pausing during LLM/TTS API requests and automatic `+20s` discussion extension (up to `180s`) when the human player speaks with `< 35s` left.
  - **Result**: Verified live via `/api/game/new` (`phaseTimerSec=45`) and `/api/game/:id/propose` (`phaseTimerSec=180`), syntax checked (`node --check`), pushed to GitHub, and redeployed to Google Cloud Run.
- **[2026-10-16 13:37 KST] Task 15: 3-Zone Consolidated & Labeled Button Architecture**
  - **Action**:
    1. Eliminated duplicate/cryptic buttons across the Far-Left Rail, Left Sidebar, Top Stage Bar, and Bottom Dock in [public/index.html](file:///c:/Users/Charlie/Business/Projects/mafia/public/index.html), [public/styles.css](file:///c:/Users/Charlie/Business/Projects/mafia/public/styles.css), and [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js).
    2. Consolidated all controls into 3 unambiguous zones with explicit text labels:
       - **Zone 1 (Left Sidebar — `NEW GAME & ROLE SETUP`)**: Role selector (`#preferredRoleSelect`), primary **`🔄 Start New Game (Quest 1)`** button (`#startNewGamePrimaryBtn`), and 2 compact demo jump buttons (`⚡ Demo: Quest 4`, `🗡️ Demo: Assassin`).
       - **Zone 2 (Top Context Action Bar — `#phaseActionBanner`)**: All in-game phase progression buttons (`Propose Team`, `⏭️ Next Idol Turn`, `🗳️ Start Vote`, `✅ Approve / ❌ Reject`, `✅ Success / 🗡️ Fail`, `🗡️ Resolve Assassin Shot`, `🔄 Play Again`).
       - **Zone 3 (Bottom Call Controls Dock — `.call-controls-dock`)**: 5 labeled pill buttons (`Voice Mic`, `My Cam`, `Audio ON/OFF`, `X-Ray`, `Side Panel`).
  - **Result**: Verified syntax (`node --check`), committed & pushed to GitHub, and redeployed to Google Cloud Run.
- **[2026-10-16 13:34 KST] Task 14: Resizable Chat Drawer vs. Video Stage (`#chatResizeHandle`), Open Table-Talk Rule (Removed `@Idol` Calling), & Fast Text-Only Mode (`skipTts`)**
  - **Action**:
    1. Updated [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md) to document the draggable `#chatResizeHandle` splitter, fixed-width left sidebar (`64px + 244px`), open table-talk rule (no `@Idol` targeted calling), and `💬 Text-Only Mode` (`skipTts`).
    2. Added `#chatResizeHandle` to `#rightChatDrawer` in [public/index.html](file:///c:/Users/Charlie/Business/Projects/mafia/public/index.html), styled `.chat-resize-handle` and `.video-call-stage.compact-stage` (`2×4` responsive video grid when narrowed) in [public/styles.css](file:///c:/Users/Charlie/Business/Projects/mafia/public/styles.css), and implemented `setupChatDrawerResizer()` in [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js) so dragging the left edge of the chat window expands the chat and shrinks the video profile area without ever encroaching on the left settings sidebar.
    3. Removed `#mentionChipsRow` and `@Idol` calling logic across [public/index.html](file:///c:/Users/Charlie/Business/Projects/mafia/public/index.html), [public/styles.css](file:///c:/Users/Charlie/Business/Projects/mafia/public/styles.css), and [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js) so all chat messages are broadcast openly to everyone in `#avalon-stage-7p`.
  - **Result**: Verified syntax (`node --check`) across all frontend/backend files, verified live on `http://localhost:8080`, and pushed to GitHub.


