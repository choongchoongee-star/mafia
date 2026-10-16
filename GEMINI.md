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
- **Phase**: Phase 3 — Deployed Live on **Google Cloud Run** (`https://idol-avalon-live-oyxmbnqija-du.a.run.app`, project `h2gdm-hack26icn-2666`, region `asia-northeast3`), running locally at `http://localhost:8080`, and synchronized with GitHub (`https://github.com/choongchoongee-star/mafia.git`).
- **Remaining Sprint Time**: ~2.5 hours (Submission & Judging begins at 15:20 KST).

---

## 4. Progress Record & Feedback
- **[2026-10-16 13:04 KST] Task 10: Core Purpose, Engineering Retrospective & Future Roadmap Documentation**
  - **Action**: Updated [docs/spec-core.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-core.md) and [README.md](file:///c:/Users/Charlie/Business/Projects/mafia/README.md) with the Core Problem Statement (solving the 7–10 player headcount barrier of Mafia/Avalon), the Real-Time Video Generation Latency vs. Debate Pacing Retrospective, and the 3-pillar Future Product Roadmap (Hybrid Multi-Human + AI Fill Matchmaking, Customizable NPC Universes, and Real-Time Streaming Video Micro-Expressions).
  - **Result**: Ready for direct copy-paste into the Hackathon Submission Form and pushed to GitHub.
- **[2026-10-16 13:03 KST] Task 9: Live `.env` Verification, Lyria 3.5 Adaptive BGM API & Microphone Voice Input (`gemini-3.5-transcribe`)**
  - **Action**:
    1. Verified live `GEMINI_API_KEY` in [.env](file:///c:/Users/Charlie/Business/Projects/mafia/.env) (`apiKeyConfigured: true` on `/api/status`).
    2. Implemented [`generateAdaptiveBgmLoop`](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js#L1408-L1487) in [src/geminiOrchestrator.js](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js) and `GET/POST /api/media/bgm` in [server.js](file:///c:/Users/Charlie/Business/Projects/mafia/server.js#L422-L443) calling `lyria-3-clip-preview` (`lyria-3.5`), caching phase-adaptive 30s MP3 loops (`discussion`, `vote`, `quest`, `assassin`), and wired automatic phase BGM playback (`syncPhaseAdaptiveBgm`) + Studio Modal trigger in [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js#L1668-L1719).
    3. Upgraded [`transcribePlayerAudio`](file:///c:/Users/Charlie/Business/Projects/mafia/src/geminiOrchestrator.js#L1370-L1406) to extract `audioTranscription.text` from `gemini-3.5-transcribe` and upgraded [`setupMicrophoneInput`](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js#L1740-L1899) in [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js) to record real microphone audio via `MediaRecorder` (`navigator.mediaDevices.getUserMedia({ audio: true })`) + simultaneous `SpeechRecognition` interim preview, supporting both Korean and English voice participation.
    4. Updated [docs/spec-api.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/spec-api.md) and verified `/api/media/bgm?mood=discussion` (`bgmUrl: "/generated/bgm_discussion.mp3"`, `modelUsed: "lyria-3-clip-preview"`).
  - **Result**: All companion model endpoints (`gemini-4-argon`, `lyria-3-clip-preview`, `gemini-3.5-transcribe`, `gemini-3.8-flash-tts`, `gemini-nano-banana-2.1`, `gemini-omni-1.1-flash`) verified live on `http://localhost:8080`.
- **[2026-10-16 12:46 KST] Task 8: Google Cloud Run Live Deployment (`h2gdm-hack26icn-2666`)**
  - **Action**: Authenticated Hackathon GCP account (`devstar2666@gcplab.me`), enabled `run.googleapis.com`, `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, `storage.googleapis.com`, and `logging.googleapis.com` on project `h2gdm-hack26icn-2666`, built container image via Cloud Build (`asia-northeast3-docker.pkg.dev/h2gdm-hack26icn-2666/mcp-cloud-run-deployments/idol-avalon-live`), deployed to Cloud Run (`asia-northeast3`) with public unauthenticated access (`allUsers` `roles/run.invoker`) and `GEMINI_API_KEY` configured, and verified `/api/status` (`apiKeyConfigured: true`, `primaryModel: "gemini-4-argon"`).
  - **Result**: Live Cloud Run URL active at `https://idol-avalon-live-oyxmbnqija-du.a.run.app`.
- **[2026-10-16 12:35 KST] Task 7: 60FPS 2.5D Neural Talking-Head Video Rig & Live `<video>` Stream Poller**
  - **Action**: Upgraded [public/app.js](file:///c:/Users/Charlie/Business/Projects/mafia/public/app.js) (`drawPhotorealisticWebcamTile`, `playTurnVoiceAndHighlight`, `attachOrPollTurnVideoStream`, `computeRealTimeSpeechViseme`) from basic portrait pan/zoom to a full **60FPS 6-Layer 2.5D Neural Talking-Head Video Engine**.
  - **Result**: Verified syntax (`node --check public/app.js`) and pushed to GitHub (`https://github.com/choongchoongee-star/mafia.git`).
- **[2026-10-16 12:30 KST] Task 6: Live Verification of All 4 Google Doc Tabs**
  - **Action**: Re-fetched all 4 live tabs (`t.buqd8v5hdzxz`, `t.yemjng8rofdc`, `t.reg13nqd61w`, `t.wdm4t18j5jqx`) directly from the official Google Doc (`13hG3aETJ54oKULF3JZUgM5VYHv7o2ZM4a4AZeqinbRg`) to check for real-time updates (such as the submission link status and `@gcplab.me` account rules) and added the full Tab 2 (`@gcplab.me` & GCP guide) section to [docs/hackathon-guide.md](file:///c:/Users/Charlie/Business/Projects/mafia/docs/hackathon-guide.md).
  - **Result**: All 4 sections verified and documented; older log entry archived to [logs/log-2026-10.md](file:///c:/Users/Charlie/Business/Projects/mafia/logs/log-2026-10.md).




