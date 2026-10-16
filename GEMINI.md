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
- **Phase**: Phase 2 — Core Engine, `gemini-4-argon` Orchestrator, Zoom Studio UI, and Cloud Run `Dockerfile` Implemented, Running Live at `http://localhost:8080`, and pushed to GitHub (`https://github.com/choongchoongee-star/mafia.git`).
- **Remaining Sprint Time**: ~3 hours (Submission & Judging begins at 15:20 KST).

---

## 4. Progress Record & Feedback
- **[2026-10-16 12:17 KST] Task 4: GitHub Repository Commit & Push**
  - **Action**: Verified zero secrets/API keys in tracked files, staged `package-lock.json` and all source/documentation files, configured remote `origin` (`https://github.com/choongchoongee-star/mafia.git`), and pushed initial release to GitHub.
  - **Result**: Public repository live and synchronized.
- **[2026-10-16 12:16 KST] Task 3: Full-Stack Implementation & Live Server Launch (`IDOL AVALON LIVE`)**
  - **Action**:
    1. Built [src/avalonEngine.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/avalonEngine.js) (7-player Avalon state machine, strict `buildPrivatePlayerView` epistemic isolation, Bayesian suspicion matrix, timed phase resolvers, and Judge X-Ray telemetry).
    2. Built [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js) (`gemini-4-argon` Interactions API orchestration with `thinking_level: "low" | "medium" | "high"`, `verifyAndHealUtterance` verification loop, Bystander Silence Detector, parallel voting via `gemini-3.8-flash`, portraits via `gemini-nano-banana-2.1`, video cutscenes via `gemini-omni-1.1-flash`, and TTS via `gemini-3.8-flash-tts`).
    3. Built [server.js](file:///c:/Users/Charlie/Business/Projects/mafia/server.js), [public/index.html](file:///c:/Users/Charlie/Business/Projects/mafia/public/index.html), [public/styles.css](file:///c:/Users/Charlie/Business/Projects/mafia/public/styles.css), [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js), [Dockerfile](file:///c:/Users/Charlie/Business/Projects/mafia/Dockerfile), and [README.md](file:///c:/Users/Charlie/Business/Projects/mafia/README.md).
    4. Verified syntax (`node --check`) across all JS files and launched live server on `http://localhost:8080`.
  - **Result**: Server running and healthy (`/api/status` verified). Explained to user how to link the Hackathon GCP Account's Google AI Studio API Key (`GEMINI_API_KEY`).
- **[2026-10-16 11:58 KST] Task 2: Core & API Specification Alignment (`spec-core.md`, `spec-api.md`)**
  - **Action**: Locked project boundaries with user feedback:
    1. **Cast**: Non-playing variety host **MC Jae-suk (유재석 style)** + 6 realistic AI K-Pop idols (**Wonyoung, Karina, Sullyoon, Yuna, Chaewon, Hanni**) + **1 Human Guest** = 7 Avalon Players.
    2. **Strict 7-Player Avalon Rules**: Random roles every game (`Merlin`, `Percival`, `2 Loyal Servants`, `Assassin`, `Morgana`, `Oberon`), Quest sizes `2-3-3-4*-4` (Quest 4 requires 2 Fails), 5-Proposal Hammer Rule, and Assassin Final Shot.
    3. **Timed Autonomous Phases**: `20s` Proposal, `75s` Discussion (with live LLM turns + Bystander Silence Detection if Human stays quiet), `15s` Vote, `15s` Quest Execution.
    4. **Multimodal & Verification Pipeline**: `gemini-4-argon` (orchestration, deduction, verification loop), `gemini-3.8-flash` (parallel voting/debate), `gemini-nano-banana-2.1` (photorealistic idol/MC portraits), `gemini-omni-1.1-flash` (live background video clips), `gemini-3.8-flash-tts` (expressive English speech), `lyria-3.5` (adaptive BGM).
  - **Artifacts Created**: [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md), [docs/spec-api.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-api.md).
  - **Result**: Ready to initialize Node.js/Express + `@google/genai` backend and Zoom Broadcast Studio frontend.
- **[2026-10-16 11:23 KST] Task 1: Hackathon Rules & Objectives Organization**
  - **Action**: Parsed all 4 tabs of the official Google DeepMind AI Hackathon guide (Event logistics, Builder Guide, Interactions API specifications, Model IDs, Judging Criteria, Disqualification triggers, and Problem Statements for Tracks 1–4).
  - **Artifacts Created**: Created [docs/hackathon-guide.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/hackathon-guide.md) and initialized [GEMINI.md](file:///c:/Users/Charlie/Business/Projects/mafia/GEMINI.md).
  - **Result**: Complete ruleset and technical constraints organized and persisted. Ready to align on the exact `mafia` project concept and architecture.
