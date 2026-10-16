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
- **[2026-10-16 12:35 KST] Task 7: 60FPS 2.5D Neural Talking-Head Video Rig & Live `<video>` Stream Poller**
  - **Action**: Upgraded [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js) (`drawPhotorealisticWebcamTile`, `playTurnVoiceAndHighlight`, `attachOrPollTurnVideoStream`, `computeRealTimeSpeechViseme`) from basic portrait pan/zoom to a full **60FPS 6-Layer 2.5D Neural Talking-Head Video Engine**:
    1. **Anatomical Layer Separation**: Independent studio background, breathing torso/shoulders, and 3D head/hair gimbal (nodding, tilting, turning toward the active speaker).
    2. **Real-Time Phoneme/Viseme Jaw & Mouth Articulation**: Synchronizes with spoken text characters & `SpeechSynthesisUtterance.onboundary` events (`A/O`, `E/I`, `U/W`, `M/B`, `C/T`) to physically drop the lower jaw/chin and animate lip parting in real time.
    3. **Physiological Eye Blinking & Saccadic Gaze**: Independent blink state machine with upper-eyelid deformation and pupil catchlight gaze tracking.
    4. **Simultaneous Multi-Agent Listener Reactions**: All non-speaking idols turn toward the active speaker and animate live reactions (`👍 NODDING`, `🤨 DOUBTING`, `⚡ REACTING` with defensive head-shake when accused, `👀 WATCHING`).
    5. **Live `gemini-omni-1.1-flash` `<video>` Stream Poller**: Automatically polls `/api/media/video/:taskId` and mounts live generated `<video>` streams directly into the Zoom tiles.
  - **Result**: Verified syntax (`node --check public/app.js`) and pushed to GitHub (`https://github.com/choongchoongee-star/mafia.git`).
- **[2026-10-16 12:30 KST] Task 6: Live Verification of All 4 Google Doc Tabs**
  - **Action**: Re-fetched all 4 live tabs (`t.buqd8v5hdzxz`, `t.yemjng8rofdc`, `t.reg13nqd61w`, `t.wdm4t18j5jqx`) directly from the official Google Doc (`13hG3aETJ54oKULF3JZUgM5VYHv7o2ZM4a4AZeqinbRg`) to check for real-time updates (such as the submission link status and `@gcplab.me` account rules) and added the full Tab 2 (`@gcplab.me` & GCP guide) section to [docs/hackathon-guide.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/hackathon-guide.md).
  - **Result**: All 4 sections verified and documented; older log entry archived to [logs/log-2026-10.md](file:///c:/Users/Charlie/Business/Projects/mafia/logs/log-2026-10.md).
- **[2026-10-16 12:19 KST] Task 5: `.env` File Creation & Hot-Reload Support**
  - **Action**: Created local [.env](file:///c:/Users/Charlie/Business/Projects/mafia/.env) (excluded from git via [.gitignore](file:///c:/Users/Charlie/Business/Projects/mafia/.gitignore)) and updated [`hasGeminiApiKey`](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js#L53-L68) in [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js) to automatically hot-reload `GEMINI_API_KEY` from `.env` on disk without requiring a server restart.
  - **Result**: Ready for user to paste `GEMINI_API_KEY` into [.env](file:///c:/Users/Charlie/Business/Projects/mafia/.env).
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


