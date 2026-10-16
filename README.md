# IDOL AVALON LIVE — 7-Player Discord Party Play Social Deduction powered by Gemini 4 Argon

**Google DeepMind AI Hackathon (Seoul, 2026-10-16) — Track 1: Gemini 4 Argon in Entertainment**

> **Live Discord Party Play (`#avalon-stage-7p` Voice & Video Stage for `The Resistance: Avalon`)** featuring **Party Moderator MC Jae-suk (`유재석` inspiration)** and **6 Photorealistic AI K-Pop Idols (`Wonyoung`, `Karina`, `Sullyoon`, `Yuna`, `Chaewon`, `Hanni`)** orchestrated by **`gemini-4-argon`** via the **Interactions API**.

---

## 1. Hackathon Project Description (Ready for Submission Form)

### Why We Built This: Solving the "Headcount Barrier" of Mafia & Social Deduction Games
Social deduction games like *Mafia*, *Werewolf*, and *The Resistance: Avalon* are among the most thrilling party games ever created, but they suffer from a fundamental **headcount bottleneck**: you cannot play unless you gather **7 to 10 live people** in a voice call at the exact same time. Traditional rule-based game bots cannot fill these seats because social deduction requires open-ended natural language bluffing, reading contradictions, and reasoning under asymmetric hidden information.

**IDOL AVALON LIVE** solves this fundamental barrier with **`gemini-4-argon`**, transforming the classic 7-player hidden-role board game *The Resistance: Avalon* into an instant, on-demand **Discord Party Play (`#avalon-stage-7p`)** experience. A single human player joins a Discord-style voice & video stage alongside **6 autonomous AI K-Pop Idols** (inspired by Wonyoung, Karina, Sullyoon, Yuna, Chaewon, and Hanni) and non-playing game moderator **MC Jae-suk** (inspired by Yoo Jae-suk).

### How It Works: Epistemic Isolation & Autonomous Verification
Every game cryptographically shuffles the exact 7-player Avalon roles (`Merlin`, `Percival`, `2 Loyal Servants`, `Assassin`, `Morgana`, and `Oberon`) across the 1 human and 6 AI idols. Unlike scripted visual novels or single-prompt chatbots, **IDOL AVALON LIVE** enforces strict **Epistemic Isolation (Zero-Omniscience Architecture)**: each AI idol receives only the exact Night Sight granted by their secret role alongside a live Bayesian Suspicion Matrix of historical team proposals, public votes, and Quest fail counts.

Using **`gemini-4-argon`** (`thinking_level: "high"`) via the **Interactions API** (`client.interactions.create`), the AI idols perform genuine game-theoretic deduction, bluffing, role-shielding, and social persuasion in real time. Every AI utterance passes through an **Autonomous Self-Verification Loop** that checks for illegal role leaks, rule hallucinations, or epistemic boundary violations before rendering expressive speech (`gemini-3.8-flash-tts`), photorealistic Discord stage portraits (`gemini-nano-banana-2.1`), and adaptive background audio (`lyria-3-clip-preview`). If the human player stays muted/silent as a bystander, the **Bystander Silence Detector** prompts MC Jae-suk and the 6 idols to call out the player's silence in the voice channel and autonomously drive all proposals, debates, votes, and Quests to completion.

---

## 2. Multi-Agent & Multimodal Model Architecture

| Role / Component | Model ID | API & Parameters | Purpose |
| :--- | :--- | :--- | :--- |
| **Game Master & Deep Strategy** | `gemini-4-argon` | Interactions API (`thinking_level: "high"` / `"medium"`) | Orchestrates MC Jae-suk, manages Discord voice channel floor collisions, plans AI team proposals, drives multi-turn social deduction debate, and decides the Assassin's final Merlin shot. |
| **Autonomous Verification Gate** | `gemini-4-argon` | `verifyAndHealUtterance()` | Inspects every generated AI utterance against strict Avalon rules and epistemic isolation before broadcast; auto-heals any self-incrimination or rule hallucination. |
| **Parallel Voting & Quest Cards** | `gemini-3.8-flash` | Concurrent structured JSON output | Executes simultaneous 6-AI `APPROVE`/`REJECT` votes and secret `SUCCESS`/`FAIL` quest card plays with zero latency. |
| **Expressive Character Voice** | `gemini-3.8-flash-tts` | Distinct persona pitch/rate profiles | Generates live English voice audio for MC Jae-suk and all 6 K-Pop idols with Discord green speaking-ring activation. |
| **Photorealistic Stage Avatars** | `gemini-nano-banana-2.1` | 16:9 HD Character Generation | Generates photorealistic webcam/stage portraits for MC Jae-suk and the 6 idols in the Discord voice grid. |
| **Live Video Cutscenes** | `gemini-omni-1.1-flash` | Async Video Generation (`background=True`) | Tested and wired for asynchronous reaction clips on high-drama game beats. |
| **Adaptive Party BGM Loops** | `lyria-3-clip-preview` | 30s Phase-Adaptive Audio Loops | Dynamically shifts Discord stage background music across `DISCUSSION`, `TEAM_VOTE`, `QUEST_EXECUTION`, and `ASSASSIN_PHASE`. |
| **Live Voice Input** | `gemini-3.5-transcribe` | Multimodal Audio Input | Transcribes human microphone speech (`MediaRecorder`) in Korean or English into live Discord voice/text actions. |

> **Strict `gemini-4-argon` Parameter Compliance**: All calls to `gemini-4-argon` exclusively configure `generation_config: { thinking_level: "low" | "medium" | "high" }` and **never** pass `thinking_budget`, `temperature`, `top_p`, `top_k`, or `cached_content`.

---

## 3. Exact 7-Player Avalon Rules Implemented

- **7 Players in `#avalon-stage-7p`**: 1 Human (`player_human`) + 6 AI Idols (`idol_wonyoung`, `idol_karina`, `idol_sullyoon`, `idol_yuna`, `idol_chaewon`, `idol_hanni`) + 1 Non-Playing Moderator (`mc_jaesuk`).
- **Cryptographic Random Role Assignment**:
  - **Good Team (4)**: `Merlin` (sees Assassin, Morgana, Oberon), `Percival` (sees Merlin & Morgana as mystery candidates), `2x Loyal Servant of Arthur` (no night sight).
  - **Evil Team (3)**: `Assassin` (sees Morgana; chooses Merlin target if Good passes 3 Quests), `Morgana` (sees Assassin; appears to Percival as Merlin candidate), `Oberon` (blind to Evil teammates and invisible to them, visible to Merlin).
- **Quest Team Sizes**: `Q1: 2`, `Q2: 3`, `Q3: 3`, `Q4: 4 (Requires 2 FAIL cards to fail!)`, `Q5: 4`.
- **5-Proposal Hammer Rule**: 5 consecutive rejected proposals in a single Quest = immediate Evil victory.
- **Timed Discord Party Phases**:
  - `TEAM_PROPOSAL`: 20s
  - `DISCUSSION`: 75s (Discord voice spotlight + mic collision yield + instant human interrupt + autonomous Bystander Mode)
  - `TEAM_VOTE`: 15s
  - `QUEST_EXECUTION`: 15s
  - `ASSASSIN_PHASE`: 30s

---

## 4. Core Purpose, Engineering Retrospective & Future Roadmap

### 4.1 Core Purpose: Eliminating the Cold-Start Headcount Problem in Discord Party Games
The biggest hurdle in Mafia and social deduction games is **gathering enough players (7–10 people)** in a Discord voice channel at the same time. **IDOL AVALON LIVE** proves that multi-agent LLM orchestration with strict epistemic isolation can turn a high-headcount Discord party game into an instant, on-demand experience without sacrificing genuine psychological deduction.

### 4.2 Engineering Retrospective: Real-Time Video Generation vs. Debate Pacing
Early in the hackathon sprint, we benchmarked live turn-by-turn video generation (`gemini-omni-1.1-flash`) to animate every spoken turn. However, we found that current end-to-end video generation latency is still too slow to match the rapid back-and-forth tempo of a live Discord Mafia/Avalon debate. To preserve snappy gameplay during the hackathon, we made the pragmatic engineering decision to anchor the Discord video tiles on high-resolution studio portraits (`gemini-nano-banana-2.1`) paired with real-time voice synthesis (`gemini-3.8-flash-tts`) and Discord speaking-ring / audio-reactive indicators, while keeping video generation asynchronous (`background=True`).

### 4.3 Post-Hackathon Expansion Roadmap
1. **Hybrid Discord Party Multiplayer ("Bring Your Friends, Fill the Rest with AI")**:
   - Expand from `1 Human + 6 AI` single-player into **flexible Discord party lobbies (`N Humans + (7 - N) AI Agents`)**. When 2 to 5 friends gather on Discord to play Mafia/Avalon together, they no longer need to cancel the game for lack of headcount—AI agents seamlessly drop into the voice channel to fill only the missing seats.
2. **Customizable NPC Casts & IP Universes**:
   - Allow players to select or mix their preferred NPC cast beyond female K-Pop idols—such as **Male K-Pop Boy Group Idols**, **Anime / Webtoon Characters**, **Movie / Drama Characters**, or custom personas—dynamically generating matching visual portraits and voice profiles.
3. **Sub-Second Real-Time Generative Video Micro-Expressions**:
   - As generative video latency drops to real-time streaming speeds, replace static portraits in the Discord video tiles with **live real-time generated video streams** that express rich, dynamic facial tells (nervous eye shifts when bluffing, subtle smirks, shocked reactions upon betrayal) at full conversational speed.

---

## 5. Running Locally & Deploying to Google Cloud Run

### Local Quick Start
```bash
npm install
# Optional: set GEMINI_API_KEY in .env or paste it directly in the top-right "API Key" button in the UI
npm start
```
Open `http://localhost:8080` in Chrome or Edge.

### Live Google Cloud Run Deployment (`h2gdm-hack26icn-2666`)
- **Live Cloud Run URL**: [https://idol-avalon-live-oyxmbnqija-du.a.run.app](https://idol-avalon-live-oyxmbnqija-du.a.run.app)
- **Health & Telemetry Endpoint**: [https://idol-avalon-live-oyxmbnqija-du.a.run.app/api/status](https://idol-avalon-live-oyxmbnqija-du.a.run.app/api/status)
- **GCP Project / Region**: `h2gdm-hack26icn-2666` / `asia-northeast3` (Seoul)

```bash
gcloud run deploy idol-avalon-live \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --port 8080
```


