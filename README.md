# IDOL AVALON LIVE — 7-Player Discord Party Play Social Deduction powered by Gemini 4 Argon

**Google DeepMind AI Hackathon (Seoul, 2026-10-16) — Track 1: Gemini 4 Argon in Entertainment** *(Hybrid with Track 4: Autonomous Agents)*

> **Live Discord Party Play (`#avalon-stage-7p` Voice & Video Stage for `The Resistance: Avalon`)** featuring **Party Moderator MC Jae-ho (`유재호`, National MC motif)** and **6 Photorealistic 4K AI K-Pop Idols (`Seoyoung 서영`, `Rina 리나`, `Seol-ah 설아`, `Yura 유라`, `Chaerin 채린`, `Hana 하나`)** with rich Namuwiki-inspired character lore, regional speaking styles, and 6-agent parallel floor negotiation orchestrated by **`gemini-4-argon`** via the **Interactions API**.

- **Live Google Cloud Run App**: [https://idol-avalon-live-oyxmbnqija-du.a.run.app](https://idol-avalon-live-oyxmbnqija-du.a.run.app)
- **Interactive System Architecture & Verification Walkthrough**: [https://idol-avalon-live-oyxmbnqija-du.a.run.app/architecture.html](https://idol-avalon-live-oyxmbnqija-du.a.run.app/architecture.html)
- **Health & Model Telemetry API**: [https://idol-avalon-live-oyxmbnqija-du.a.run.app/api/status](https://idol-avalon-live-oyxmbnqija-du.a.run.app/api/status)
- **Submission Package & 3-Min Demo Script**: [SUBMISSION.md](file:///c:/Users/Charlie/Business/Projects/mafia/SUBMISSION.md)

---

## 1. Hackathon Project Description (Ready for Submission Form)

### Why We Built This: Solving the "Headcount Barrier" of Mafia & Social Deduction Games
Social deduction games like *Mafia*, *Werewolf*, and *The Resistance: Avalon* are among the most thrilling party games ever created, but they suffer from a fundamental **headcount bottleneck**: you cannot play unless you gather **7 to 10 live people** in a voice call at the exact same time. Traditional rule-based game bots cannot fill these seats because social deduction requires open-ended natural language bluffing, reading contradictions, and reasoning under asymmetric hidden information.

**IDOL AVALON LIVE** solves this fundamental barrier with **`gemini-4-argon`**, transforming the classic 7-player hidden-role board game *The Resistance: Avalon* into an instant, on-demand **Discord Party Play (`#avalon-stage-7p`)** experience. A single human player joins a Discord-style voice & video stage alongside **6 autonomous AI K-Pop Visual Center Idols** (**Seoyoung**, **Rina**, **Seol-ah**, **Yura**, **Chaerin**, and **Hana**—each equipped with pre-generated 4K studio portraits, distinct regional speaking styles, and detailed Namuwiki-inspired background lore) and non-playing game moderator **MC Jae-ho (`유재호`)**.

### How It Works: Epistemic Isolation, Lookahead Voice Queue & Autonomous Verification
Every game cryptographically shuffles the exact 7-player Avalon roles (`Merlin`, `Percival`, `2 Loyal Servants`, `Assassin`, `Morgana`, and `Oberon`) across the 1 human and 6 AI idols. Unlike scripted visual novels or single-prompt chatbots, **IDOL AVALON LIVE** enforces strict **Epistemic Isolation (Zero-Omniscience Architecture)**: each AI idol receives only the exact Night Sight granted by their secret role (`buildPrivatePlayerView`) alongside a live Bayesian Suspicion Matrix of historical team proposals, public votes, and Quest fail counts.

Using **`gemini-4-argon`** (`thinking_level: "high"` / `"medium"` / `"low"`) via the **Interactions API** (`client.interactions.create`), the AI idols perform genuine game-theoretic deduction, bluffing, role-shielding, and social persuasion in real time. All 6 idols bid for the voice floor in parallel (`Promise.all`) with round-robin fairness (`minTimesSpoken`) and **zero mid-sentence interruptions**, backed by a client-side **Web Audio API lookahead pre-fetch engine** (~700ms turn handoffs). Every AI utterance passes through an **Autonomous Self-Verification Loop (`verifyAndHealUtterance`)** that checks for illegal role leaks, rule hallucinations, or epistemic boundary violations before rendering expressive speech (`gemini-3.8-flash-tts`), photorealistic 4K Discord stage portraits (`gemini-nano-banana-2.1`), and seamless circular-crossfaded ambient BGM (`lyria-3-clip-preview`).

---

## 2. Multi-Agent & Multimodal Model Architecture

| Role / Component | Model ID | API & Parameters | Purpose |
| :--- | :--- | :--- | :--- |
| **Game Master & Deep Strategy** | `gemini-4-argon` | Interactions API (`thinking_level: "high"` / `"medium"` / `"low"`) | Orchestrates MC Jae-ho (`"low"`), plans AI Leader Quest team proposals (`"high"`), drives dual-channel social deduction (`privateInnerThought` + `publicSpeech`, `"medium"`), and executes the Assassin's final Merlin deduction (`"high"`). |
| **Autonomous Verification Gate** | `gemini-4-argon` | `verifyAndHealUtterance()` (`thinking_level: "medium"`) | Audits every generated AI utterance against strict Avalon rules and epistemic isolation before broadcast; auto-heals any self-incrimination or rule hallucination. |
| **Parallel Floor Bidding & Voting** | `gemini-3.8-flash` | Concurrent structured JSON (`Promise.all`) | Evaluates 6-agent parallel floor urgency (`SPEAK` vs. `HOLD_SILENT`) and simultaneous 6-AI `APPROVE`/`REJECT` votes with sub-second turnaround. |
| **Expressive Character Voice** | `gemini-3.8-flash-tts` | `24kHz` RIFF WAV + `cleanTextForTts()` | Synthesizes live English voice audio for MC Jae-ho and all 6 K-Pop idols with Web Audio API hardware-locked zero-cutoff playback and Discord green speaking-ring activation. |
| **4K Studio Stage Portraits** | `gemini-nano-banana-2.1` | 16:9 4K Character Generation | Generates photorealistic 4K Korean studio portraits (`portrait_idol_*.png`) for MC Jae-ho and the 6 idols in the Discord voice grid. |
| **Live Video Cutscenes** | `gemini-omni-1.1-flash` | Async Video Generation (`background: true`) | Benchmarked and wired for asynchronous 16:9 studio clips via `ai.interactions.create` + `ai.interactions.get(id)`. |
| **Seamless Circular Crossfade BGM** | `lyria-3-clip-preview` | 30s Phase-Adaptive Loops + `createSeamlessLoopBuffer()` | Shifts Discord stage ambient groove across `DISCUSSION`, `TEAM_VOTE`, `QUEST_EXECUTION`, and `ASSASSIN_PHASE` with a 3.0s equal-power circular crossfade and Web Audio `GainNode` (`-48 dB`). |
| **Live Voice Input** | `gemini-3.5-transcribe` | Multimodal Audio Input | Transcribes human microphone speech (`MediaRecorder`) in Korean or English into live Discord voice/text actions. |

> **Strict `gemini-4-argon` Parameter Compliance**: All calls to `gemini-4-argon` exclusively configure `generation_config: { thinking_level: "low" | "medium" | "high" }` and **never** pass `thinking_budget`, `temperature`, `top_p`, `top_k`, or `cached_content`.

---

## 3. Exact 7-Player Avalon Rules, Cast Lore & Key UX Features

- **7 Players in `#avalon-stage-7p`**: 1 Human (`player_human`) + 6 AI Idols (`Seoyoung / idol_wonyoung`, `Rina / idol_karina`, `Seol-ah / idol_sullyoon`, `Yura / idol_yuna`, `Chaerin / idol_chaewon`, `Hana / idol_hanni`) + 1 Non-Playing Moderator (`MC Jae-ho / mc_jaesuk`).
- **6 K-Pop Visual Center Archetypes (`namuwikiProfile`, Avalon-First Deduction)**:
  1. **Seoyoung (`서영`, ISTP, `✨ Lucky Seoyoung`)**: Consensus builder & 1-for-1 roster swap strategist behind a princess visual center exterior.
  2. **Rina (`리나`, ENFP, `🧊 Prosecutor Math`)**: Tracks vote ledgers, fail-card probabilities, and Reject Track math with zero fluff.
  3. **Seol-ah (`설아`, ISFP, `🌊 Busan Satoori`)**: Quiet observer who holds silence until catching a contradiction between speeches and `APPROVE`/`REJECT` votes.
  4. **Yura (`유라`, ENFP, `🍑 Chungcheong Sarcasm`)**: Uses witty roundabout sarcasm to bait Evil partners into over-defending each other.
  5. **Chaerin (`채린`, ISTP, `🔥 Fierce Street-Boss`)**: Aggressively cross-examines failed Quest participants and demands explicit `APPROVE`/`REJECT` declarations.
  6. **Hana (`하나`, INFP, `🦘 Melbourne Aussie Slang`)**: Tests reactions with sudden candidate nomination pivots and natural Melbourne Aussie slang.
- **Player Role Selection + Cryptographic Shuffle of Remaining 6 Roles**:
  - The Human Player can choose any desired role (`Merlin`, `Percival`, `Loyal Servant`, `Assassin`, `Morgana`, `Oberon`, or `Random`). The remaining 6 roles from the 7-player deck are cryptographically shuffled across the 6 AI Idols under full epistemic blindness.
  - **Good Team (4)**: `Merlin` (sees Assassin, Morgana, Oberon), `Percival` (sees Merlin & Morgana as mystery candidates), `2x Loyal Servant of Arthur` (no night sight).
  - **Evil Team (3)**: `Assassin` (sees Morgana; shoots Merlin if Good passes 3 Quests), `Morgana` (sees Assassin; appears to Percival as Merlin candidate), `Oberon` (blind to Evil teammates and invisible to them, visible to Merlin).
- **Quest Team Sizes & Two-Fail Rule**: `Q1: 2`, `Q2: 3`, `Q3: 3`, `Q4: 4 (Requires 2 FAIL cards to fail!)`, `Q5: 4`.
- **5-Proposal Hammer Rule**: 5 consecutive rejected proposals in a single Quest = immediate Evil victory.
- **Timed Autonomous Discord Party Phases**:
  - `TEAM_PROPOSAL`: `45s` (Interactive member chips or AI Leader proposal)
  - `DISCUSSION`: `180s` (Orderly non-interrupting 6-agent voice debate + lookahead TTS pre-fetch + auto-transition to `TEAM_VOTE` after 4 debate turns + 1-click direct `Approve`/`Reject`)
  - `TEAM_VOTE`: `30s` (Parallel 6-idol vote resolution)
  - `QUEST_EXECUTION`: `25s` (Secret `SUCCESS`/`FAIL` card submission & shuffle)
  - `ASSASSIN_PHASE`: `60s` (Final Merlin deduction & shot)
- **Full Chat-Driven Natural Language Router (Korean & English) & Responsive Mobile Layout (`<= 960px`)**:
  - Play via 1-click HUD buttons, live voice mic, or natural chat commands (`"서영이랑 나 가자"`, `"찬성"`, `"반대"`, `"성공"`, `"설아 암살"`).
  - Fully responsive desktop (`4-zone Discord grid` with draggable `#chatResizeHandle`) and mobile/tablet (`@media (max-width: 960px)` touch-scrollable `2×4` video stage + sticky quick-jump navigation bar).

---

## 4. Core Purpose, Engineering Retrospective & Future Roadmap

### 4.1 Core Purpose: Eliminating the Cold-Start Headcount Problem in Discord Party Games
The biggest hurdle in Mafia and social deduction games is **gathering enough players (7–10 people)** in a Discord voice channel at the same time. **IDOL AVALON LIVE** proves that multi-agent LLM orchestration with strict epistemic isolation can turn a high-headcount Discord party game into an instant, on-demand experience without sacrificing genuine psychological deduction.

### 4.2 Engineering Retrospective: Real-Time Video Generation vs. Debate Pacing
Early in the hackathon sprint, we benchmarked live turn-by-turn video generation (`gemini-omni-1.1-flash`) to animate every spoken turn. However, we found that current end-to-end video generation latency is still too slow to match the rapid back-and-forth tempo of a live Discord Mafia/Avalon debate. To preserve snappy gameplay during the hackathon, we made the pragmatic engineering decision to anchor the Discord video tiles on fixed 4K studio portraits (`gemini-nano-banana-2.1`) paired with zero-cutoff real-time voice synthesis (`gemini-3.8-flash-tts`), lookahead audio pre-fetching, and Discord speaking-ring indicators, while keeping video generation asynchronous (`background: true`).

### 4.3 Post-Hackathon Expansion Roadmap
1. **Hybrid Discord Party Multiplayer ("Bring Your Friends, Fill the Rest with AI")**:
   - Expand from `1 Human + 6 AI` single-player into **flexible Discord party lobbies (`N Humans + (7 - N) AI Agents`)** so any small group of 2–5 friends on Discord can fill only their missing seats with autonomous AI agents.
2. **Customizable NPC Casts & IP Universes**:
   - Allow players to select or mix their preferred NPC cast beyond female K-Pop idols—such as **Male K-Pop Boy Group Idols**, **Anime / Webtoon Characters**, **Movie / Drama Characters**, or custom personas.
3. **Sub-Second Real-Time Generative Video Micro-Expressions**:
   - As generative video latency drops to real-time streaming speeds, upgrade static portraits in the Discord video tiles into **live real-time generated video streams** that express subtle psychological tells (nervous eye shifts when bluffing, micro-smirks, shocked reactions upon betrayal) at full conversational speed.

---

## 5. Running Locally & Deploying to Google Cloud Run

### Local Quick Start
```bash
npm install
# Optional: set GEMINI_API_KEY in .env or paste it directly in the top-left Gear ("API Key") modal in the UI
npm start
```
Open `http://localhost:8080` in Chrome, Edge, or Mobile Safari/Chrome.

### Live Google Cloud Run Deployment (`h2gdm-hack26icn-2666`)
- **Live Cloud Run URL**: [https://idol-avalon-live-oyxmbnqija-du.a.run.app](https://idol-avalon-live-oyxmbnqija-du.a.run.app)
- **Interactive Architecture Walkthrough**: [https://idol-avalon-live-oyxmbnqija-du.a.run.app/architecture.html](https://idol-avalon-live-oyxmbnqija-du.a.run.app/architecture.html)
- **Health & Telemetry Endpoint**: [https://idol-avalon-live-oyxmbnqija-du.a.run.app/api/status](https://idol-avalon-live-oyxmbnqija-du.a.run.app/api/status)
- **GCP Project / Region**: `h2gdm-hack26icn-2666` / `asia-northeast3` (Seoul)

```bash
gcloud run deploy idol-avalon-live \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --port 8080
```
