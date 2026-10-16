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
- **Phase**: Phase 6 — Final Hackathon Submission Package & Documentation Synchronized ([SUBMISSION.md](file:///c:/Users/Charlie/Business/Projects/mafia/SUBMISSION.md), [README.md](file:///c:/Users/Charlie/Business/Projects/mafia/README.md), [DESIGN.md](file:///c:/Users/Charlie/Business/Projects/mafia/DESIGN.md), [AGENTS.md](file:///c:/Users/Charlie/Business/Projects/mafia/AGENTS.md), [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md), [docs/spec-api.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-api.md), [public/architecture.html](file:///c:/Users/Charlie/Business/Projects/mafia/public/architecture.html)); Live on `http://localhost:8080`, GitHub (`https://github.com/choongchoongee-star/mafia.git`), and **Google Cloud Run** (`https://idol-avalon-live-oyxmbnqija-du.a.run.app`).
- **Remaining Sprint Time**: ~35 mins (Submission & Judging begins at 15:20 KST).

---

## 4. Progress Record & Feedback
- **[2026-10-16 14:45 KST] Task 24: Comprehensive Submission Package & Documentation Synchronization (`SUBMISSION.md`, `README.md`, `DESIGN.md`, `docs/spec-api.md`, `public/architecture.html`)**
  - **Action**:
    1. Audited all project documentation against [docs/hackathon-guide.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/hackathon-guide.md) and the latest application specification ([docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md)).
    2. Updated [SUBMISSION.md](file:///c:/Users/Charlie/Business/Projects/mafia/SUBMISSION.md) with copy-paste Cerebral Valley submission fields, 100% English Project Description, updated 3-minute live demo script, and submission checklist.
    3. Synchronized [README.md](file:///c:/Users/Charlie/Business/Projects/mafia/README.md), [DESIGN.md](file:///c:/Users/Charlie/Business/Projects/mafia/DESIGN.md), [docs/spec-api.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-api.md), and [public/architecture.html](file:///c:/Users/Charlie/Business/Projects/mafia/public/architecture.html) with the original K-Pop idol stage names (`Seoyoung 서영`, `Rina 리나`, `Seol-ah 설아`, `Yura 유라`, `Chaerin 채린`, `Hana 하나`, `MC Jae-ho 유재호`), updated phase timers (`45s/180s/30s/25s/60s`), orderly non-interrupting 6-agent parallel floor queue with lookahead TTS pre-fetch, 3.0s equal-power circular crossfade BGM (`createSeamlessLoopBuffer`), 100% Avalon-first deduction dialogue, and responsive mobile/tablet layout.
  - **Result**: Verified JS syntax, committed & pushed to GitHub, and deployed to Google Cloud Run.
- **[2026-10-16 14:43 KST] Task 23: Multi-Agent Pre-Proposal Lobbying Loop in `TEAM_PROPOSAL`, Guaranteed Team Selection & `res.on('close')` Auto-Step Fix**
  - **Action**:
    1. Updated [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md) (Section 4.1 item 2) to specify pre-proposal lobbying during the `45s` `TEAM_PROPOSAL` window with 100% guaranteed team lock-in.
    2. Updated [server.js](file:///c:/Users/Charlie/Business/Projects/mafia/server.js) (`/api/game/:gameId/discuss/step`) to accept `candidateTeamIds`, allow `isAutoStep` during both `TEAM_PROPOSAL` and `DISCUSSION`, and listen to `res.on('close')` (instead of `req.on('close')`, which fired immediately when `express.json()` finished consuming the request stream and caused background `isAutoStep: true` calls to prematurely return `204 No Content`).
    3. Updated [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js) (`generateDiscussionDebateTurn`, `evaluateSingleIdolFloorBid`, `buildContextualDebateFallback`) so non-leader idols actively lobby the Leader during `TEAM_PROPOSAL`.
    4. Updated [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js) (`startAutonomousPhaseTimer`, `triggerDiscussionStep`, `handleHumanChatSubmission`, `renderPhaseActionBanner`, `renderZoomGrid`) to run the multi-agent conversation loop during `TEAM_PROPOSAL` while guaranteeing automatic team proposal lock-in (`proposalLobbyCount >= 1` or `localPhaseRemainingSec <= 25` for AI Leaders; `00:00` auto-lock for Human Leaders), decoupled `state.isBusyRequest` from TTS playback (`!state.isPlayingAudio && !state.activeSpeakerId`), and enabled closed captions + floor badges during `TEAM_PROPOSAL`.
  - **Result**: Verified syntax (`node --check`), verified live `/api/game/new` -> `/discuss/step` (`TEAM_PROPOSAL` lobbying) -> `/propose` -> `/discuss/step` (`DISCUSSION`) on `http://localhost:8080`, committed & pushed to GitHub, and redeployed to Google Cloud Run.
- **[2026-10-16 14:33 KST] Task 22: Elimination of Off-Topic Food Talk & 100% Actionable Avalon Game Progression Dialogue (`buildActionableBoardFacts`)**
  - **Action**:
    1. Updated [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md) (Section 3) and [AGENTS.md](file:///c:/Users/Charlie/Business/Projects/mafia/AGENTS.md) to replace `favoriteFoods`/`hobbies` with Avalon deduction playstyles and require 100% of spoken lines to directly progress the 7-player Avalon game with zero off-topic food/hobby talk.
    2. Replaced `favoriteFoods` and `hobbies` across `MC_HOST_PROFILE` and `IDOL_CAST_PROFILES` in [src/avalonEngine.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/avalonEngine.js) and [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js) with `playstyle` (`아발론 스타일`) and `signatureMove` (`특기`).
    3. Added `buildActionableBoardFacts(game, privateView, effectiveTeamIds, isPreProposalPhase)` in [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js) to inject exact, round-accurate Avalon board state (Quest 1 Proposal 1 zero-history rule vs. prior vote/Quest history, Hammer warnings, Quest 4 two-fail rule, and concrete roster/swap targets) into `generateAiLeaderProposal` and `generateDiscussionDebateTurn`.
    4. Removed `namuwikiProfile` JSON injection from LLM dialogue prompts, added off-topic food-word detection & sentence stripping in `verifyAndHealUtterance`, and rewrote all fallback dialogue pools so every turn states an explicit `APPROVE`/`REJECT` stance or concrete player swap.
  - **Result**: Verified syntax (`node --check`), committed & pushed to GitHub, and redeployed to Google Cloud Run.
- **[2026-10-16 14:19 KST] Task 21: Seamless Circular Crossfade BGM Loop (`createSeamlessLoopBuffer`), Mid-Track Dropout Elimination & Steady Ambient Lyria Prompts**
  - **Action**:
    1. Updated [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md) (Section 5.1.4) to document the Web Audio DSP seamless circular crossfade loop processor and steady ambient Lyria loop prompts.
    2. Replaced the variety-show climax/breakdown prompts in [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js) (`generateAdaptiveBgmLoop`) with steady, uniform-volume ambient groove prompts (`no intro, no outro, no breakdowns, no pauses, and no beat drops, seamless background music loop`), regenerated all 4 `public/generated/bgm_*.mp3` files via `lyria-3-clip-preview`, and appended `?v=loop_v2` cache-busting query strings.
    3. Implemented `createSeamlessLoopBuffer(audioCtx, rawBuffer)` in [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js): trims `2.5s` intro/outro transients, scans `200ms` RMS frames to select the most uniform `15.0s` segment (excluding any `< 68%` median RMS dropout/gap), applies a soft `0.76x–1.32x` moving-average RMS envelope leveler, and bakes a **3.0-second equal-power (`cos`/`sin`) circular crossfade** so loop end wraps into loop start with zero seam, zero click, and zero dead air.
    4. Lowered `MAX_BGM_LINEAR_GAIN` to `0.025` (`0.0045` default linear gain at `18%` slider, ~`-47 dB`), smoothed speech ducking (`0.65x` ratio with `0.45s` exponential time constant) to prevent volume pumping between turns, and eliminated the raw un-crossfaded `<audio>` fallback prior to audio unlock.
  - **Result**: Verified syntax (`node --check`), regenerated all 4 BGM MP3s, committed & pushed to GitHub, and redeployed to Google Cloud Run.
- **[2026-10-16 14:14 KST] Task 20: Elimination of Repetitive `"Aigoo"` Catchphrases, Natural Idol Dialogue Prompts & Rotating Multi-Variant Fallbacks**
  - **Action**:
    1. Audited and removed all hardcoded `"Aigoo"` / `"aigoo"` strings and forced food-betting templates across [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md), [src/avalonEngine.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/avalonEngine.js) (`IDOL_CAST_PROFILES[i].speechStyle` & `iconicHabits`), and [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js).
    2. Added `STRICT ANTI-REPETITION & NATURAL DIALOGUE RULES` to `generateAiLeaderProposal` and `generateDiscussionDebateTurn` prompts in [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js), plus automatic regex stripping in `verifyAndHealUtterance`.
    3. Prioritized `'gemini-2.5-flash'` first in `callArgonInteraction` fallback model list to prevent double-404 timeouts, raised `isMicCollision` urgency thresholds (`>= 84 && >= 78` and `transcript.length % 3 === 1`), and replaced `buildDialectMicYieldLine`, `prependCollisionHandoffPhrase`, and `stylizeWithIdolDialect` with 4-variant rotating natural dialogue pools.
  - **Result**: Verified syntax (`node --check`), committed & pushed to GitHub, and redeployed to Google Cloud Run.
