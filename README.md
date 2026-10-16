# IDOL AVALON LIVE — 7-Player K-Pop Variety Show Social Deduction powered by Gemini 4 Argon

**Google DeepMind AI Hackathon (Seoul, 2026-10-16) — Track 1: Gemini 4 Argon in Entertainment**

> **Live Zoom-Style K-Pop Variety Show (`The Resistance: Avalon`)** featuring **National MC Jae-suk (`유재석` inspiration)** and **6 Photorealistic AI K-Pop Girl Group Idols (`Wonyoung`, `Karina`, `Sullyoon`, `Yuna`, `Chaewon`, `Hanni`)** orchestrated by **`gemini-4-argon`** via the **Interactions API**.

---

## 1. Hackathon Project Description (Ready for Submission Form)

**IDOL AVALON LIVE** transforms the classic 7-player hidden-role board game *The Resistance: Avalon* into a live, interactive K-Pop variety show conference call. A single human guest joins a Zoom-style broadcast alongside **6 autonomous AI K-Pop Girl Group Idols** (inspired by Wonyoung, Karina, Sullyoon, Yuna, Chaewon, and Hanni) and non-playing host **MC Jae-suk** (inspired by Yoo Jae-suk).

Every game cryptographically shuffles the exact 7-player Avalon roles (`Merlin`, `Percival`, `2 Loyal Servants`, `Assassin`, `Morgana`, and `Oberon`) across the 1 human and 6 AI idols. Unlike scripted visual novels or single-prompt chatbots, **IDOL AVALON LIVE** enforces strict **Epistemic Isolation (Zero-Omniscience Architecture)**: each AI idol receives only the exact Night Sight granted by their secret role alongside a live Bayesian Suspicion Matrix of historical team proposals, public votes, and Quest fail counts.

Using **`gemini-4-argon`** (`thinking_level: "high"`) via the **Interactions API** (`client.interactions.create`), the AI idols perform genuine game-theoretic deduction, bluffing, role-shielding, and social persuasion in real time. Every AI utterance passes through an **Autonomous Self-Verification Loop** that checks for illegal role leaks, rule hallucinations, or epistemic boundary violations before rendering expressive speech (`gemini-3.8-flash-tts`), photorealistic studio portraits (`gemini-nano-banana-2.1`), and live webcam-style avatar reactions (`gemini-omni-1.1-flash`). If the human player chooses to stay completely silent as a bystander, the **Bystander Silence Detector** prompts MC Jae-suk and the 6 idols to call out the player's silence and autonomously drive all proposals, debates, votes, and Quests to completion.

---

## 2. Multi-Agent & Multimodal Model Architecture

| Role / Component | Model ID | API & Parameters | Purpose |
| :--- | :--- | :--- | :--- |
| **Game Master & Deep Strategy** | `gemini-4-argon` | Interactions API (`thinking_level: "high"` / `"medium"`) | Orchestrates MC Jae-suk, selects optimal speakers, plans AI team proposals, drives multi-turn social deduction debate, and decides the Assassin's final Merlin shot. |
| **Autonomous Verification Gate** | `gemini-4-argon` | `verifyAndHealUtterance()` | Inspects every generated AI utterance against strict Avalon rules and epistemic isolation before broadcast; auto-heals any self-incrimination or rule hallucination. |
| **Parallel Voting & Quest Cards** | `gemini-3.8-flash` | Concurrent structured JSON output | Executes simultaneous 6-AI `APPROVE`/`REJECT` votes and secret `SUCCESS`/`FAIL` quest card plays with zero latency. |
| **Expressive Character Voice** | `gemini-3.8-flash-tts` | Distinct persona pitch/rate profiles | Generates live English voice audio for MC Jae-suk and all 6 K-Pop idols with real-time Web Audio lip-sync amplitude modulation. |
| **Photorealistic Studio Portraits** | `gemini-nano-banana-2.1` | 16:9 HD Character Generation | Generates photorealistic K-Pop variety show webcam portraits for MC Jae-suk and the 6 idols. |
| **Live Video Cutscenes** | `gemini-omni-1.1-flash` | Async Video Generation | Generates 4-second video reaction clips for high-drama moments (Quest 4 double-fail, 5th Hammer proposal, Assassin shot). |
| **Live Voice Input** | `gemini-3.5-transcribe-live` | Multimodal Audio Input | Transcribes human microphone speech in any language into English game actions. |

> **Strict `gemini-4-argon` Parameter Compliance**: All calls to `gemini-4-argon` exclusively configure `generation_config: { thinking_level: "low" | "medium" | "high" }` and **never** pass `thinking_budget`, `temperature`, `top_p`, `top_k`, or `cached_content`.

---

## 3. Exact 7-Player Avalon Rules Implemented

- **7 Players**: 1 Human (`player_human`) + 6 AI Idols (`idol_wonyoung`, `idol_karina`, `idol_sullyoon`, `idol_yuna`, `idol_chaewon`, `idol_hanni`) + 1 Non-Playing Host (`mc_jaesuk`).
- **Cryptographic Random Role Assignment**:
  - **Good Team (4)**: `Merlin` (sees Assassin, Morgana, Oberon), `Percival` (sees Merlin & Morgana as mystery candidates), `2x Loyal Servant of Arthur` (no night sight).
  - **Evil Team (3)**: `Assassin` (sees Morgana; chooses Merlin target if Good passes 3 Quests), `Morgana` (sees Assassin; appears to Percival as Merlin candidate), `Oberon` (blind to Evil teammates and invisible to them, visible to Merlin).
- **Quest Team Sizes**: `Q1: 2`, `Q2: 3`, `Q3: 3`, `Q4: 4 (Requires 2 FAIL cards to fail!)`, `Q5: 4`.
- **5-Proposal Hammer Rule**: 5 consecutive rejected proposals in a single Quest = immediate Evil victory.
- **Timed Variety Show Phases**:
  - `TEAM_PROPOSAL`: 20s
  - `DISCUSSION`: 75s (Spotlight speaker + instant human interrupt + autonomous Bystander Mode)
  - `TEAM_VOTE`: 15s
  - `QUEST_EXECUTION`: 15s
  - `ASSASSIN_PHASE`: 30s

---

## 4. Running Locally & Deploying to Google Cloud Run

### Local Quick Start
```bash
npm install
# Optional: set GEMINI_API_KEY in .env or paste it directly in the top-right "API Key" button in the UI
npm start
```
Open `http://localhost:8080` in Chrome or Edge.

### Google Cloud Run Deployment
```bash
gcloud run deploy idol-avalon-live \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --port 8080
```
