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
- **[2026-10-16 13:20 KST] Task 12: High-Resolution Static Korean K-Pop Idol & MC Jae-suk Portraits + 6-Agent Independent Multi-Agent Floor Negotiation + Regional Dialects**
  - **Action**:
    1. Pivoted visual presentation from artificial video warping / low-quality stock videos to **7 crisp, high-resolution static Korean K-Pop Idol & MC Jae-suk studio portraits** (`public/generated/portrait_mc_jaesuk.png` and `public/generated/portrait_idol_*.png`, 1.2–1.55 MB each) rendered with a steady `1.15x` center crop (`drawPhotorealisticWebcamTile`) on the 8-Tile Discord/Zoom Stage.
    2. Gave each of the 6 AI Idols a distinct personality, regional dialect (`dialectTag`), yield style (`yieldStyle: 'YIELD_POLITELY' | 'PUSH_THROUGH'`), and voice prosody (`pitchOffset`, `rateOffset`) in [src/avalonEngine.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/avalonEngine.js) and [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js): **Sullyoon** (`🌊 Busan Satoori`), **Yuna** (`🍑 Chungcheong Sarcasm`), **Hanni** (`🦘 Melbourne Aussie Slang`), **Wonyoung** (`✨ Lucky Vicky`), **Karina** (`🧊 Prosecutor Math`), and **Chaewon** (`🔥 Fierce Street-Boss`).
    3. Built a true **6-Agent Independent Parallel Floor Negotiation Engine** (`evaluateSingleIdolFloorBid` via `Promise.all`) in [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js) where all 6 NPC agents simultaneously evaluate their isolated `PrivatePlayerView` (`roleName`, `nightVisionText`, Bayesian suspicion) and output `intent: 'INTERRUPT' | 'SPEAK' | 'HOLD_SILENT'`, `urgency: 0..100`, and `innerThought`.
    4. Implemented **Simultaneous Mic Clash & Polite Yield (`COLLISION_YIELD`)** across [src/avalonEngine.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/avalonEngine.js), [server.js](file:///c:/Users/Charlie/Business/Projects/mafia/server.js), and [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js) so when two idols unmute at the same time, the yielding idol speaks a cut-off yield line (`yieldTurn`) and hands the floor to the winning idol (`latestTurn`), with sequential real-time voice playback (`playTurnVoiceAndHighlight`) and live 6-agent bid badges (`🤝 Yielded Mic`, `✋ Wants Mic`, `🤫 Strategic Silence`).
  - **Result**: Verified syntax (`node --check`), verified live 6-agent mic-clash & dialect response on `http://localhost:8080`, pushed to GitHub, and redeployed to Google Cloud Run.
- **[2026-10-16 13:11 KST] Task 11: Real `.mp4` Studio Webcam Feeds (`gemini-omni-1.1-flash`), Role Preference Selector & Hackathon Deliverables**
  - **Action**:
    1. Generated studio assets and added optional Role Preference Selector (`#preferredRoleSelect`: `RANDOM`, `MERLIN`, `PERCIVAL`, `LOYAL_SERVANT`, `ASSASSIN`, `MORGANA`, `OBERON`) across [src/avalonEngine.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/avalonEngine.js), [server.js](file:///c:/Users/Charlie/Business/Projects/mafia/server.js), and [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js).
    2. Created [DESIGN.md](file:///c:/Users/Charlie/Business/Projects/mafia/DESIGN.md), [AGENTS.md](file:///c:/Users/Charlie/Business/Projects/mafia/AGENTS.md), [SUBMISSION.md](file:///c:/Users/Charlie/Business/Projects/mafia/SUBMISSION.md), and [public/architecture.html](file:///c:/Users/Charlie/Business/Projects/mafia/public/architecture.html).
  - **Result**: Verified live on `http://localhost:8080`, pushed to GitHub, and redeployed to Google Cloud Run.
- **[2026-10-16 13:04 KST] Task 10: Core Purpose, Engineering Retrospective & Future Roadmap Documentation**
  - **Action**: Updated [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md) and [README.md](file:///c:/Users/Charlie/Business/Projects/mafia/README.md) with the Core Problem Statement (solving the 7–10 player headcount barrier of Mafia/Avalon), the Real-Time Video Generation Latency vs. Debate Pacing Retrospective, and the 3-pillar Future Product Roadmap.
  - **Result**: Ready for direct copy-paste into the Hackathon Submission Form and pushed to GitHub.
- **[2026-10-16 13:03 KST] Task 9: Live `.env` Verification, Lyria 3.5 Adaptive BGM API & Microphone Voice Input (`gemini-3.5-transcribe`)**
  - **Action**: Verified live `GEMINI_API_KEY` in [.env](file:///c:/Users/Charlie/Business/Projects/mafia/.env), implemented [`generateAdaptiveBgmLoop`](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js) (`lyria-3-clip-preview`), and upgraded [`transcribePlayerAudio`](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js) (`gemini-3.5-transcribe`).
  - **Result**: All companion model endpoints verified live on `http://localhost:8080`.
- **[2026-10-16 12:46 KST] Task 8: Google Cloud Run Live Deployment (`h2gdm-hack26icn-2666`)**
  - **Action**: Deployed `idol-avalon-live` to Cloud Run (`asia-northeast3`) on project `h2gdm-hack26icn-2666` with public access and `GEMINI_API_KEY` configured.
  - **Result**: Live Cloud Run URL active at `https://idol-avalon-live-oyxmbnqija-du.a.run.app`.
