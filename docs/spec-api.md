# API & Architecture Specification (`spec-api.md`) — IDOL AVALON

## 1. System Architecture Overview
- **Runtime Stack**:
  - **Backend + Frontend Unified Server**: Node.js (`v24+`) + Express + TypeScript/ES Modules (`@google/genai >= 2.3.0`) serving a responsive, broadcast-grade Single Page Application (Three.js + WebGL/Canvas 2.5D Photorealistic Webcam Renderer + Web Audio API + SSE/REST real-time state engine).
  - **Cloud Target**: Containerized (`Dockerfile` on port `8080`) and deployed directly to **Google Cloud Run** via the `cloudrun` MCP service.
- **Environment Variables**:
  - `GEMINI_API_KEY`: Injected via `.env` locally and Cloud Run environment variables in production (never hardcoded in source code).
  - `PORT`: Defaults to `8080` (Cloud Run standard).

---

## 2. Google AI Model Orchestration Contract (Interactions API)

All calls use `@google/genai` (`>= 2.3.0`) targeting the **Interactions API** (`client.interactions.create(...)`) with automatic fallback to `models.generateContent` if a specific regional preview endpoint requires it, while strictly obeying all **Gemini 4 Argon guardrails**:
- **Mandatory for `gemini-4-argon`**:
  - Pass `generation_config: { thinking_level: "low" | "medium" | "high" }`.
  - **NEVER** pass `thinking_budget`, `temperature`, `top_p`, `top_k`, or `cached_content`.
  - When `max_output_tokens > 65536`, pass `background: true` and poll `client.interactions.get({ id })`.

### 2.1 Model Assignment Matrix
| Subsystem | Primary Model ID | Fallback / Lite ID | `thinking_level` | Purpose |
| :--- | :--- | :--- | :---: | :--- |
| **Game Master & Showrunner (`MC Jae-suk` + Floor Manager)** | `gemini-4-argon` | `gemini-3.8-flash` | `"medium"` | Selects next speaker in discussion, detects silent bystander behavior, generates MC Jae-suk broadcast commentary, and summarizes quest math. |
| **Deep Strategic Action (Team Proposal, Quest Play, Assassin Shot, Merlin Guidance)** | `gemini-4-argon` | `gemini-3.8-flash` | `"high"` | Computes Bayesian suspicion updates, proposes optimal `N`-player teams, decides `SUCCESS`/`FAIL` quest plays, and executes the Assassin's final Merlin deduction. |
| **Autonomous Verification Loop (Epistemic & Rule Guard)** | `gemini-4-argon` | `gemini-3.5-flash-lite` | `"low"` | Verifies every AI idol utterance before TTS/video output to ensure zero illegal role leaks, accurate vote history references, and strict English output. |
| **Parallel Idol Voting & Fast Debate Turns** | `gemini-3.8-flash` | `gemini-3.5-flash-lite` | N/A | Executes simultaneous 6-idol `APPROVE`/`REJECT` vote reasoning and rapid rebuttal turns during the 75s discussion timer. |
| **Photorealistic Idol & MC Portraits** | `gemini-nano-banana-2.1` | `gemini-3.1-flash-lite-image` | N/A | Generates photorealistic K-Pop webcam portraits (`Wonyoung`, `Karina`, `Sullyoon`, `Yuna`, `Chaewon`, `Hanni`, `MC Jae-suk`) with studio lighting and emotional states. |
| **Live Talking / Reaction Video Clips** | `gemini-omni-1.1-flash` | Canvas WebGL 2.5D Live Motion | N/A | Background-generates (`background: true`) short photorealistic video clips synchronized with idol speech/reactions. |
| **Expressive Idol & MC Voice Synthesis** | `gemini-3.8-flash-tts` | `gemini-3.8-flash-lite-tts` | N/A | Synthesizes distinct English voices for MC Jae-suk and each of the 6 K-Pop idols. |
| **Live Voice Input Transcription** | `gemini-3.5-transcribe` | `gemini-3.5-transcribe-live` / `gemini-3.8-flash` / Web Speech | N/A | Captures real microphone audio via `MediaRecorder` (`audio/webm` / `audio/mp4`) and transcribes Korean or English speech into Avalon dialogue via `audioTranscription.text`. |
| **Adaptive Variety / Mafia BGM Loops** | `lyria-3-clip-preview` | `lyria-3.5` | N/A | Generates and caches phase-adaptive 30s MP3 background music loops (`discussion`, `vote`, `quest`, `assassin`) via `@google/genai` `models.generateContent`. |

---

## 3. Epistemic Isolation & Prompt Construction (`buildPrivatePlayerView`)

To guarantee **zero cheating** and **genuine high-level Avalon play**, the backend constructs a strictly isolated `PrivatePlayerView` for any AI player `P` before calling `gemini-4-argon` or `gemini-3.8-flash`:

```json
{
  "self": {
    "id": "idol_karina",
    "name": "Karina",
    "role": "PERCIVAL",
    "alignment": "GOOD",
    "persona": "The Ice-Cold Detective: analytical, sharp, calls out vote math and silent bystanders."
  },
  "epistemicKnowledge": {
    "description": "You are PERCIVAL (Good). During the Night Phase, you saw two players who appear as Merlin candidates: [Wonyoung, Sullyoon]. One is the true MERLIN (Good) and one is MORGANA (Evil), but you do NOT know which is which!",
    "knownEvilIds": [],
    "merlinCandidateIds": ["idol_wonyoung", "idol_sullyoon"]
  },
  "boardState": {
    "currentQuest": 2,
    "questConfig": [
      { "quest": 1, "teamSize": 2, "failsRequired": 1, "status": "SUCCESS", "failCount": 0, "team": ["idol_wonyoung", "player_human"] },
      { "quest": 2, "teamSize": 3, "failsRequired": 1, "status": "ACTIVE" },
      { "quest": 3, "teamSize": 3, "failsRequired": 1, "status": "PENDING" },
      { "quest": 4, "teamSize": 4, "failsRequired": 2, "status": "PENDING" },
      { "quest": 5, "teamSize": 4, "failsRequired": 1, "status": "PENDING" }
    ],
    "rejectTrack": 1,
    "maxRejects": 5,
    "leaderId": "idol_chaewon",
    "proposedTeamIds": ["idol_chaewon", "idol_wonyoung", "idol_yuna"],
    "phase": "DISCUSSION",
    "phaseTimeRemainingSec": 48,
    "humanSilenceStats": {
      "humanMessagesThisRound": 0,
      "humanTotalMessages": 0,
      "isBystanderAlert": true
    }
  },
  "publicVoteHistory": [...],
  "recentTranscript": [...]
}
```

> **Security & Rule Guarantee**: The `trueRoles` dictionary on the server is **never** serialized into any LLM prompt or client response (except the Human Player's own role and their legitimate Night Phase epistemic view, plus the separate Judge X-Ray endpoint when Judge Inspector Mode is toggled).

---

## 4. REST & Streaming API Endpoints

### 4.1 `POST /api/game/new`
Starts a new 7-player Avalon game with cryptographically randomized roles across the 6 AI Idols + 1 Human Player (or assigns the Human Player's optional preferred role for demo testing while randomizing the remaining 6 roles across the AI Idols).
- **Request Body**:
  ```json
  {
    "playerName": "Guest",
    "preferredRole": "RANDOM" // "RANDOM" | "MERLIN" | "PERCIVAL" | "LOYAL_SERVANT" | "ASSASSIN" | "MORGANA" | "OBERON"
  }
  ```
- **Response (`200 OK`)**:
  - `gameId`: Unique session ID
  - `publicState`: Public board state, cast metadata, active phase, and countdown timer
  - `humanPrivateView`: The Human Player's randomly assigned role and exact Night Phase epistemic vision
  - `mcOpeningTurn`: MC Jae-suk's opening variety show announcement + TTS/video payload

### 4.2 `GET /api/game/:gameId/state`
Returns the current public state, timer countdown, human private view, media asset statuses, and (optionally for hackathon judges) the `xrayTelemetry` object (`gemini-4-argon` thinking traces, verification loop badges, and each idol's inner monologue).

### 4.3 `POST /api/game/:gameId/propose`
Submits or triggers the Leader's Quest Team proposal (`N` players according to `[2, 3, 3, 4, 4]`).
- If the Leader is an AI Idol, calls `gemini-4-argon` (`thinking_level: "high"`) to select the `N` players, verify the team size, and generate the Leader's opening justification speech + TTS/video.
- If the Leader is the Human Player (or if the 20s Proposal Timer expired), validates the `N` player IDs (auto-completing if timed out) and transitions to `DISCUSSION` (`75s` timer).

### 4.4 `POST /api/game/:gameId/discuss/step`
Executes a real-time **6-Agent Parallel Floor Evaluation & Negotiation** step during the `DISCUSSION` phase (`75s` timer) OR processes a live Human chat/voice interruption.
- **Request Body**:
  ```json
  {
    "humanMessage": "Wait Chaewon, why did you leave Karina off Quest 2?", // Optional: null when autonomous beat
    "targetMemberId": "idol_chaewon", // Optional @mention
    "elapsedRoundSec": 38
  }
  ```
- **6-Agent Autonomous Orchestration Pipeline**:
  1. **Parallel 6-NPC Evaluation (`Promise.all` across all 6 Idol Agents)**:
     - Every AI Idol (`Wonyoung`, `Karina`, `Sullyoon`, `Yuna`, `Chaewon`, `Hanni`) independently evaluates the current board state and latest transcript using her isolated `PrivatePlayerView` (`role`, `epistemicVision`, `suspicionMatrix[idolId]`, and personal regional dialect/persona).
     - Each agent returns `{ intent: "INTERRUPT" | "SPEAK" | "HOLD_SILENT", urgency: 0..100, yieldStyle: "YIELD_POLITELY" | "PUSH_THROUGH", innerThought, text }`.
  2. **Floor Negotiation & Emergent Event Resolution**:
     - **`COLLISION_YIELD` (Simultaneous Mic Clash & Yield)**: If two or more agents bid with high urgency (`>= 74`), both turn their mics on simultaneously. One agent delivers a brief cut-off/yielding line (`yieldTurn`) and yields the floor to the winning agent (`latestTurn`), returning both turns for sequential real-time voice playback.
     - **`STRATEGIC_SILENCE` (Mind-Game Pause)**: If agents deliberately hold silence to conceal their role (e.g., Merlin hiding from the Assassin), their `HOLD_SILENT` badges and internal reasoning update live on the grid and Judge X-Ray panel, while MC Jae-suk or the highest-urgency challenger calls out the tension.
     - **`DIRECT_SPEECH` / `INTERRUPT`**: The agent with the strongest strategic urgency takes the floor, runs through the **2-Stage Verification Loop** (`verifyAndHealUtterance`), and synthesizes character-specific speech via `gemini-3.8-flash-tts`.

### 4.5 `POST /api/game/:gameId/vote`
Executes the simultaneous 7-player Team Vote (`APPROVE` vs `REJECT`).
- Runs 6 parallel subagent calls (`gemini-3.8-flash` / `gemini-4-argon`) for each AI Idol using her isolated `PrivatePlayerView`.
- Combines with the Human Player's vote (or auto-vote if the 15s Vote Timer expired).
- **MC Jae-suk** announces the vote count (`e.g., 5 APPROVE - 2 REJECT`), updates the Reject Track (`1..5`), and transitions to either `QUEST_EXECUTION` (if `>= 4 APPROVE`), next Leader's `TEAM_PROPOSAL` (if `< 4 APPROVE` and `rejectTrack < 5`), or `GAME_OVER_EVIL` (if 5th reject).

### 4.6 `POST /api/game/:gameId/quest`
Executes the secret Quest Mission for the `N` players on the approved team.
- Good players automatically submit `SUCCESS`.
- Evil AI idols on the team call `gemini-4-argon` (`thinking_level: "high"`) to decide whether to play `SUCCESS` (slow-play deception) or `FAIL` (sabotage, accounting for Quest 4's 2-Fail requirement!).
- Shuffles cards, evaluates against `failsRequired` (`[1, 1, 1, 2, 1]`), and triggers **MC Jae-suk's** dramatic Quest Reveal + reaction turn.

### 4.7 `POST /api/game/:gameId/assassinate`
Triggered when Good achieves 3 successful Quests.
- If the Assassin is an AI Idol, invokes `gemini-4-argon` (`thinking_level: "high"`) with the full game vote ledger and dialogue history to deduce which Good player exhibited hidden Merlin knowledge, generates the dramatic final accusation speech + video/voice, and locks in the target.
- If the Assassin is the Human Player, accepts `targetPlayerId` (or auto-targets if the 30s timer expires) and resolves the final winner.

### 4.8 Media & Asset Endpoints
- `POST /api/media/portraits/generate`: Generates photorealistic webcam portraits for MC Jae-suk and the 6 Idols via `gemini-nano-banana-2.1` (`gemini-3.1-flash-lite-image`), caching them in `/public/generated/` so repeat loads are instant.
- `GET /api/media/video/:taskId`: Polls a background `gemini-omni-1.1-flash` video task (`client.interactions.get(interaction.id)` -> `output_video.data` saved to `/public/generated/omni_*.mp4`).
- `POST /api/media/transcribe`: Accepts base64 audio recorded from the player's microphone (`MediaRecorder`) and transcribes Korean/English speech via `gemini-3.5-transcribe` (`audioTranscription.text`) or `gemini-3.8-flash`.
- `GET /api/media/bgm` & `POST /api/media/bgm`: Generates and caches phase-adaptive 30s MP3 background music loops (`discussion`, `vote`, `quest`, `assassin`) via `lyria-3-clip-preview` (`lyria-3.5`) saved to `/public/generated/bgm_<mood>.mp3`.

