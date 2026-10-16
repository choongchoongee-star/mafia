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
- **Phase**: Phase 5 — Crisp High-Resolution Korean K-Pop Idol & MC Jae-suk Static Studio Portraits (`public/generated/portrait_*.png`), 6 Distinct Personalities & Regional Dialects (`🌊 Busan Satoori`, `🍑 Chungcheong Sarcasm`, `🦘 Melbourne Aussie Slang`, `✨ Lucky Vicky`, `🧊 Prosecutor Math`, `🔥 Fierce Street-Boss`), and True 6-Agent Independent Parallel Floor Negotiation (`Promise.all` with Simultaneous Mic Clash & Polite Yield `yieldTurn -> latestTurn` + Strategic Silence) Live on `http://localhost:8080`, GitHub (`https://github.com/choongchoongee-star/mafia.git`), and **Google Cloud Run** (`https://idol-avalon-live-oyxmbnqija-du.a.run.app`).
- **Remaining Sprint Time**: ~2 hours (Submission & Judging begins at 15:20 KST).

---

## 4. Progress Record & Feedback
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
- **[2026-10-16 13:21 KST] Task 13: Interactive Player Role Selection & Strict Epistemic Isolation**
  - **Action**:
    1. Updated [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md) and [README.md](file:///c:/Users/Charlie/Business/Projects/mafia/README.md) to document that the Human Player can freely select their Avalon role (`RANDOM`, `MERLIN`, `PERCIVAL`, `LOYAL_SERVANT`, `ASSASSIN`, `MORGANA`, `OBERON`) while the remaining 6 roles from the official 7-player deck are cryptographically shuffled across the 6 AI Idols under strict Epistemic Isolation (`buildPrivatePlayerView`).
    2. Added Role Selector in [public/index.html](file:///c:/Users/Charlie/Business/Projects/mafia/public/index.html), styled in [public/styles.css](file:///c:/Users/Charlie/Business/Projects/mafia/public/styles.css), and wired in [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js) and [src/avalonEngine.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/avalonEngine.js).
    3. Verified across all 7 role options (`MERLIN`, `PERCIVAL`, `LOYAL_SERVANT`, `ASSASSIN`, `MORGANA`, `OBERON`, `RANDOM`) that the human player receives the exact requested role while neither the human nor the 6 AI Idols receive any information outside official Avalon Night Sight rules.
  - **Result**: Verified locally (`node --check`), committed & pushed to GitHub, and redeployed to Google Cloud Run.
- **[2026-10-16 13:20 KST] Task 12: High-Resolution Static Korean K-Pop Idol & MC Jae-suk Portraits + 6-Agent Independent Multi-Agent Floor Negotiation + Regional Dialects**
  - **Action**:
    1. Pivoted visual presentation from artificial video warping / low-quality stock videos to **7 crisp, high-resolution static Korean K-Pop Idol & MC Jae-suk studio portraits** (`public/generated/portrait_mc_jaesuk.png` and `public/generated/portrait_idol_*.png`, 1.2–1.55 MB each) rendered with a steady `1.15x` center crop (`drawPhotorealisticWebcamTile`) on the 8-Tile Discord/Zoom Stage.
    2. Gave each of the 6 AI Idols a distinct personality, regional dialect (`dialectTag`), yield style (`yieldStyle: 'YIELD_POLITELY' | 'PUSH_THROUGH'`), and voice prosody (`pitchOffset`, `rateOffset`) in [src/avalonEngine.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/avalonEngine.js) and [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js): **Sullyoon** (`🌊 Busan Satoori`), **Yuna** (`🍑 Chungcheong Sarcasm`), **Hanni** (`🦘 Melbourne Aussie Slang`), **Wonyoung** (`✨ Lucky Vicky`), **Karina** (`🧊 Prosecutor Math`), and **Chaewon** (`🔥 Fierce Street-Boss`).
    3. Built a true **6-Agent Independent Parallel Floor Negotiation Engine** (`evaluateSingleIdolFloorBid` via `Promise.all`) in [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js) where all 6 NPC agents simultaneously evaluate their isolated `PrivatePlayerView` (`roleName`, `nightVisionText`, Bayesian suspicion) and output `intent: 'INTERRUPT' | 'SPEAK' | 'HOLD_SILENT'`, `urgency: 0..100`, and `innerThought`.
    4. Implemented **Simultaneous Mic Clash & Polite Yield (`COLLISION_YIELD`)** across [src/avalonEngine.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/avalonEngine.js), [server.js](file:///c:/Users/Charlie/Business/Projects/mafia/server.js), and [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js).
  - **Result**: Verified syntax (`node --check`), verified live 6-agent mic-clash & dialect response on `http://localhost:8080`, pushed to GitHub, and redeployed to Google Cloud Run.
- **[2026-10-16 13:11 KST] Task 11: Real `.mp4` Studio Webcam Feeds (`gemini-omni-1.1-flash`), Role Preference Selector & Hackathon Deliverables**
  - **Action**:
    1. Generated studio assets and added optional Role Preference Selector (`#preferredRoleSelect`: `RANDOM`, `MERLIN`, `PERCIVAL`, `LOYAL_SERVANT`, `ASSASSIN`, `MORGANA`, `OBERON`) across [src/avalonEngine.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/avalonEngine.js), [server.js](file:///c:/Users/Charlie/Business/Projects/mafia/server.js), and [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js).
    2. Created [DESIGN.md](file:///c:/Users/Charlie/Business/Projects/mafia/DESIGN.md), [AGENTS.md](file:///c:/Users/Charlie/Business/Projects/mafia/AGENTS.md), [SUBMISSION.md](file:///c:/Users/Charlie/Business/Projects/mafia/SUBMISSION.md), and [public/architecture.html](file:///c:/Users/Charlie/Business/Projects/mafia/public/architecture.html).
  - **Result**: Verified live on `http://localhost:8080`, pushed to GitHub, and redeployed to Google Cloud Run.
