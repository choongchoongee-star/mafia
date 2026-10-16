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
- **Phase**: Phase 6 — Pre-Generated 4K K-Pop Visual Center Studio Portraits (`public/generated/portrait_idol_*.png`), Original Idol Stage Names (`Seoyoung 서영`, `Rina 리나`, `Seol-ah 설아`, `Yura 유라`, `Chaerin 채린`, `Hana 하나`, `MC Jae-ho 유재호`), Sanitized 24kHz RIFF WAV TTS Engine (`gemini-3.8-flash-tts` with Autoplay Unlock/Replay & Web Audio `GainNode` Ducking), Detailed Namuwiki-Based Character Background Lore (`namuwikiProfile`), and 6-Agent Independent Parallel Floor Negotiation Live on `http://localhost:8080`, GitHub (`https://github.com/choongchoongee-star/mafia.git`), and **Google Cloud Run** (`https://idol-avalon-live-oyxmbnqija-du.a.run.app`).
- **Remaining Sprint Time**: ~1 hour 05 mins (Submission & Judging begins at 15:20 KST).

---

## 4. Progress Record & Feedback
- **[2026-10-16 14:13 KST] Task 20: Character TTS Speech Root-Cause Fix — RIFF WAV `C2PA` Sanitization, Valid Voice Profiles, Autoplay Unlock/Replay & Web Audio Voice Pipeline**
  - **Action**:
    1. Diagnosed and resolved 5 concrete root causes of silent/cut-off character speech across [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md), [src/avalonEngine.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/avalonEngine.js), [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js), [server.js](file:///c:/Users/Charlie/Business/Projects/mafia/server.js), [public/styles.css](file:///c:/Users/Charlie/Business/Projects/mafia/public/styles.css), and [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js).
    2. Replaced Chaerin's (`idol_chaewon`) invalid voice `'Callirhoe'` (which returned HTTP 400 in `gemini-3.8-flash-tts`) with `'Despina'`, added automatic `'Kore'` voice retry in `synthesizeSpeechTTS`, and added `sanitizeWavBase64` to strip trailing 6,062-byte `C2PA` metadata chunks and compute exact `audioDurationMs` from the 24kHz 16-bit PCM byte stream.
    3. Rebuilt `playTurnVoiceAndHighlight` in [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js) to decode WAV audio via Web Audio API (`voiceGainNode` at `1.0`) and `Blob` URL `<audio>` without the premature 8.5s cutoff, detect `NotAllowedError` browser autoplay blocks on page load (`#autoplayUnlockBanner` + instant replay on first user click), fall back cleanly to `window.speechSynthesis` when needed, play `mcTurn`/`latestTurn` on Human Leader proposals and Assassin resolution, and provide per-message `🔊` voice replay buttons (`POST /api/media/tts`) in `#transcriptList`.
  - **Result**: Verified live via `/api/media/tts` (`status: 200, hasC2pa: false`) and `/api/game/new`, syntax checked (`node --check`), pushed to GitHub, and redeployed to Google Cloud Run.
- **[2026-10-16 14:03 KST] Task 19: Web Audio API `GainNode` BGM Attenuation (`0.008` Default Gain), Speech Auto-Ducking (`25%`), & Dedicated `🎵 BGM` Toggle + Slider**
  - **Action**:
    1. Updated [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md) to document the Web Audio API `GainNode` BGM pipeline, ultra-low default ambient gain (`0.0081`), automatic 75% ducking (`0.0020`) during TTS speech, and independent BGM toggle/slider.
    2. Replaced raw `HTMLAudioElement` BGM playback in [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js) (`syncPhaseAdaptiveBgm`) with a Web Audio API `AudioBufferSourceNode` + `GainNode` pipeline so volume attenuation works identically on desktop, Android, and iOS Safari (where `HTMLAudioElement.volume` is read-only and forced to `1.0`).
    3. Lowered default BGM volume to `0.0081` (`0.81%` linear amplitude, `-41.8 dB`, ~10x quieter than the old `0.08` and ~120x quieter than iOS `1.0`), added automatic 75% ducking (`0.0020` gain) in `playTurnVoiceAndHighlight()` whenever any character speaks, and added an independent **`🎵 BGM` ON/OFF toggle + compact volume slider (`#bgmToggleBtn` + `#bgmVolumeSlider`)** in [public/index.html](file:///c:/Users/Charlie/Business/Projects/mafia/public/index.html) and [public/styles.css](file:///c:/Users/Charlie/Business/Projects/mafia/public/styles.css).
  - **Result**: Verified syntax (`node --check`), committed & pushed to GitHub, and redeployed to Google Cloud Run.
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
