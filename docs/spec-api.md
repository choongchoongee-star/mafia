# API & Architecture Specification (`spec-api.md`) — IDOL AVALON LIVE (Discord Party Play)

## 1. System Architecture Overview
- **Runtime Stack**:
  - **Backend + Frontend Unified Server**: Node.js (`v24+`) + Express + ES Modules (`@google/genai >= 2.3.0`) serving a responsive **Discord Voice & Video Stage (`#avalon-stage-7p`)** Single Page Application (60FPS HTML5 Canvas Stage Renderer + Web Audio API Zero-Cutoff TTS & Circular Crossfade BGM + REST real-time state engine).
  - **Cloud Target**: Containerized (`Dockerfile` on port `8080`) and deployed directly to **Google Cloud Run** (`https://idol-avalon-live-oyxmbnqija-du.a.run.app`, region `asia-northeast3`).
- **Environment Variables**:
  - `GEMINI_API_KEY`: Injected via `.env` locally, runtime `x-gemini-api-key` header, or Cloud Run environment variables in production (never hardcoded in source code).
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
| **Game Master & Discord Stage Moderator (`MC Jae-ho` + Floor Manager)** | `gemini-4-argon` | `gemini-3.8-flash` | `"low"` / `"medium"` | Coordinates the Discord voice stage, detects silent bystander behavior, generates MC Jae-ho (`유재호`) moderator commentary, and summarizes Quest & Vote math. |
| **Deep Strategic Action (Team Proposal, Quest Play, Assassin Shot, Merlin Guidance)** | `gemini-4-argon` | `gemini-3.8-flash` | `"high"` | Computes Bayesian suspicion updates, proposes optimal `N`-player teams, decides `SUCCESS`/`FAIL` quest plays, and executes the Assassin's final Merlin deduction. |
| **Dual-Channel Idol Debate & Autonomous Verification Loop (`verifyAndHealUtterance`)** | `gemini-4-argon` | `gemini-3.8-flash` | `"medium"` | Generates `privateInnerThought` + `publicSpeech` and audits every AI idol utterance before TTS output to prevent role leaks, off-topic filler, or rule hallucinations. |
| **Parallel 6-Idol Floor Evaluation & Team Voting** | `gemini-3.8-flash` | `gemini-3.5-flash-lite` | N/A | Executes simultaneous 6-idol floor urgency evaluation (`SPEAK` vs. `HOLD_SILENT`) and parallel `APPROVE`/`REJECT` vote reasoning via `Promise.all`. |
| **Photorealistic 4K Idol & MC Stage Portraits** | `gemini-nano-banana-2.1` | `gemini-3.1-flash-lite-image` | N/A | Generates photorealistic 16:9 4K Discord video tile portraits (`Seoyoung`, `Rina`, `Seol-ah`, `Yura`, `Chaerin`, `Hana`, `MC Jae-ho`) cached in `/public/generated/portrait_*.png`. |
| **Asynchronous Studio Video Clips** | `gemini-omni-1.1-flash` | 60FPS Canvas Stage HUD | N/A | Benchmarked and wired for background (`background: true`) 16:9 studio reaction clips polled via `ai.interactions.get(id)`. |
| **Expressive Idol & MC Voice Synthesis** | `gemini-3.8-flash-tts` | `gemini-3.8-flash-lite-tts` | N/A | Synthesizes distinct `24kHz` RIFF WAV English voices for MC Jae-ho and each of the 6 K-Pop idols after `cleanTextForTts()` sanitization. |
| **Live Voice Input Transcription** | `gemini-3.5-transcribe` | `gemini-3.5-transcribe-live` / `gemini-3.8-flash` | N/A | Captures real microphone audio via `MediaRecorder` (`audio/webm` / `audio/mp4`) and transcribes Korean or English speech into Avalon dialogue. |
| **Adaptive Discord Party BGM Loops** | `lyria-3-clip-preview` | `lyria-3.5` | N/A | Generates phase-adaptive 30s MP3 ambient background loops (`discussion`, `vote`, `quest`, `assassin`) post-processed on the client with a 3.0s equal-power circular crossfade (`createSeamlessLoopBuffer`). |

---

## 3. Epistemic Isolation & Prompt Construction (`buildPrivatePlayerView`)

To guarantee **zero cheating** and **genuine high-level Avalon play**, the backend constructs a strictly isolated `PrivatePlayerView` for any AI player `P` before calling `gemini-4-argon` or `gemini-3.8-flash`:

```json
{
  "self": {
    "id": "idol_karina",
    "name": "Rina (리나)",
    "stageName": "Rina",
    "role": "PERCIVAL",
    "alignment": "GOOD",
    "persona": "Cool Tactical Leader: analytical, sharp, tracks vote math, fail-card probabilities, and Reject Track math."
  },
  "epistemicKnowledge": {
    "description": "You are PERCIVAL (Good). During the Night Phase, you saw two players who appear as Merlin candidates: [Seoyoung, Seol-ah]. One is the true MERLIN (Good) and one is MORGANA (Evil), but you do NOT know which is which!",
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
    "phaseTimeRemainingSec": 142,
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

> **Security & Rule Guarantee**: The `secretRoles` dictionary on the server is **never** serialized into any LLM prompt or client response (except the Human Player's own role and their legitimate Night Phase epistemic view, plus the separate Judge X-Ray telemetry when Judge Inspector Mode is viewed).

---

## 4. REST & Streaming API Endpoints

### 4.1 `POST /api/game/new`
Starts a new 7-player Avalon game with cryptographically randomized roles across the 6 AI Idols + 1 Human Player (or assigns the Human Player's selected `preferredRole` while cryptographically shuffling the remaining 6 roles from the official 7-player deck across the 6 AI Idols).
- **Request Body**:
  ```json
  {
    "playerName": "You (Guest)",
    "preferredRole": "RANDOM", // "RANDOM" | "MERLIN" | "PERCIVAL" | "LOYAL_SERVANT" | "ASSASSIN" | "MORGANA" | "OBERON"
    "skipTts": false
  }
  ```
- **Response (`200 OK`)**:
  - `gameId`: Unique session ID
  - `state`: Public board state, cast metadata (`namuwikiProfile`), active phase, countdown timer, `humanPrivateView`, and `xrayTelemetry`
  - `latestTurn`: MC Jae-ho's opening announcement + `gemini-3.8-flash-tts` audio payload

### 4.2 `GET /api/game/:gameId/state`
Returns the current public state, timer countdown (`TEAM_PROPOSAL: 45s`, `DISCUSSION: 180s`, `TEAM_VOTE: 30s`, `QUEST_EXECUTION: 25s`, `ASSASSIN_PHASE: 60s`), `humanPrivateView`, and `xrayTelemetry` (`gemini-4-argon` thinking traces, verification loop badges, and each idol's inner monologue).

### 4.3 `POST /api/game/:gameId/propose`
Submits or triggers the Leader's Quest Team proposal (`N` players according to `[2, 3, 3, 4, 4]`).
- If the Leader is an AI Idol, calls `gemini-4-argon` (`thinking_level: "high"`) to select the `N` players, verify the team size, and generate the Leader's opening justification speech + TTS.
- If the Leader is the Human Player (or if the `45s` Proposal Timer expired), validates the `N` player IDs (auto-filling any remaining slots if timed out) and transitions to `DISCUSSION` (`180s` timer).

### 4.4 `POST /api/game/:gameId/discuss/step`
Executes a real-time **6-Agent Parallel Floor Evaluation & Orderly Non-Interrupting Debate** step during `DISCUSSION` (`180s` timer) or `TEAM_PROPOSAL` pre-lobbying, OR processes a live Human chat/voice message.
- **Request Body**:
  ```json
  {
    "humanMessage": "Wait Chaerin, why did you leave Rina off Quest 2?", // Optional: null when autonomous beat
    "targetMemberId": "idol_chaewon", // Optional name-mention target
    "skipTts": false
  }
  ```
- **6-Agent Autonomous Orchestration Pipeline**:
  1. **Parallel 6-NPC Evaluation (`Promise.all` across all 6 Idol Agents)**:
     - Every AI Idol (`Seoyoung`, `Rina`, `Seol-ah`, `Yura`, `Chaerin`, `Hana`) independently evaluates the current board state and latest transcript using her isolated `PrivatePlayerView`.
     - Each agent returns `{ intent: "SPEAK" | "HOLD_SILENT", urgency: 0..100, innerThought, text }`.
  2. **Round-Robin Turn Fairness & Zero Speech Interruption**:
     - Floor selection prioritizes idols who have spoken the fewest times in the current phase (`minTimesSpoken`) unless a specific idol was directly addressed by the human player (`urgency: 99`).
     - Characters never interrupt each other mid-sentence (`COLLISION_YIELD` disabled). The winning speaker's utterance passes through `verifyAndHealUtterance()` and `gemini-3.8-flash-tts`, while the client pre-fetches the next debate turn in the background for sub-second (~700ms) turn transitions.

### 4.5 `POST /api/game/:gameId/call-vote` & `POST /api/game/:gameId/vote`
- `POST /api/game/:gameId/call-vote`: Transitions the room from `DISCUSSION` to `TEAM_VOTE` (`30s` timer) with an MC Jae-ho vote call announcement (triggered automatically after 4 debate turns or when the player clicks `🗳️ Start Vote`).
- `POST /api/game/:gameId/vote`: Executes the simultaneous 7-player Team Vote (`APPROVE` vs `REJECT`).
  - Runs 6 parallel subagent calls (`gemini-3.8-flash` / `gemini-4-argon`) for each AI Idol using her isolated `PrivatePlayerView`.
  - Combines with the Human Player's vote (and supports 1-click direct voting right from `DISCUSSION`).
  - **MC Jae-ho** announces the vote count (`e.g., 5 APPROVE - 2 REJECT`), updates the Reject Track (`1..5`), and transitions to either `QUEST_EXECUTION` (if `>= 4 APPROVE`), next Leader's `TEAM_PROPOSAL` (if `< 4 APPROVE` and `rejectTrack < 5`), or `GAME_OVER` (if 5th reject).

### 4.6 `POST /api/game/:gameId/quest`
Executes the secret Quest Mission for the `N` players on the approved team (`25s` timer).
- Good players automatically submit `SUCCESS`.
- Evil AI idols on the team call `gemini-4-argon` (`thinking_level: "high"`) to decide whether to play `SUCCESS` (slow-play deception) or `FAIL` (sabotage, accounting for Quest 4's 2-Fail requirement!).
- Shuffles cards, evaluates against `failsRequired` (`[1, 1, 1, 2, 1]`), and triggers **MC Jae-ho's** dramatic Quest Reveal + reaction turn.

### 4.7 `POST /api/game/:gameId/assassinate` & `POST /api/game/:gameId/preset`
- `POST /api/game/:gameId/assassinate`: Triggered when Good achieves 3 successful Quests (`60s` timer). If the Assassin is an AI Idol, invokes `gemini-4-argon` (`thinking_level: "high"`) with the full game vote ledger and dialogue history to deduce which Good player exhibited hidden Merlin knowledge and locks in the target.
- `POST /api/game/:gameId/preset`: Instant judge jump-cut endpoint (`"QUEST4_CRITICAL"` for Quest 4's Two-Fail rule or `"ASSASSIN_CLIMAX"` for the post-Quest-3 Merlin assassination phase).

### 4.8 Media & Asset Endpoints
- `POST /api/media/portraits/generate`: Generates photorealistic 4K studio portraits for MC Jae-ho and the 6 Idols via `gemini-nano-banana-2.1` (`gemini-3.1-flash-lite-image`), caching them in `/public/generated/portrait_*.png`.
- `GET /api/media/video/:taskId`: Polls a background `gemini-omni-1.1-flash` video task (`client.interactions.get(interaction.id)`).
- `POST /api/media/transcribe`: Accepts base64 audio recorded from the player's microphone (`MediaRecorder`) and transcribes Korean/English speech via `gemini-3.5-transcribe`.
- `GET /api/media/bgm` & `POST /api/media/bgm`: Serves and generates phase-adaptive 30s MP3 ambient background music loops (`discussion`, `vote`, `quest`, `assassin`) via `lyria-3-clip-preview` (`lyria-3.5`) saved to `/public/generated/bgm_<mood>.mp3`.
