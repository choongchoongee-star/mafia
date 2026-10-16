# AGENTS.md — Multi-Agent Epistemic Architecture & Gemini 4 Argon Guardrails

## 1. Multi-Agent Cast & Epistemic Isolation (`src/avalonEngine.js`)
**IDOL AVALON LIVE** orchestrates **8 distinct personas** inside a **Discord Voice & Video Party Channel (`#avalon-stage-7p`)**:
- **1 Non-Playing Party Moderator**: **MC Jae-suk** (`mc_jaesuk`) — Paces the Discord voice stage, announces Quest and Vote math, and triggers the **Bystander Silence Detector** when the human player stays muted/quiet.
- **6 Autonomous AI Idol Party Members**:
  1. **Wonyoung (`idol_wonyoung`)** — Charismatic Visual Center; analytical framing of Quest team compositions.
  2. **Karina (`idol_karina`)** — Cool Tactical Leader; tracks vote patterns and reject track math.
  3. **Sullyoon (`idol_sullyoon`)** — Quiet Deductive Observer; speaks concisely in Busan Satoori and catches contradictions.
  4. **Yuna (`idol_yuna`)** — High-Energy Moodmaker; uses bold intuition and Chungcheong-do roundabout sarcasm.
  5. **Chaewon (`idol_chaewon`)** — Sharp Prosecutor; cross-examines hesitant players and suspect leaders.
  6. **Hanni (`idol_hanni`)** — Clever Wildcard; tests reactions with Melbourne Aussie slang traps.
- **1 Human Guest (`player_human`)** — Assigned either a random role (`RANDOM`) or a judge-selected role preference while the remaining 6 roles from the official 7-player deck (`MERLIN`, `PERCIVAL`, `LOYAL_SERVANT`, `LOYAL_SERVANT`, `ASSASSIN`, `MORGANA`, `OBERON`) are cryptographically shuffled across the 6 AI Idols.

### Strict Information Partitioning (`buildPrivatePlayerView`)
No AI agent ever receives the global `secretRoles` dictionary. Before every LLM call, `buildPrivatePlayerView(game, actorId)` constructs an isolated epistemic slice:
- **Merlin**: Knows the exact identities of `ASSASSIN`, `MORGANA`, and `OBERON`, but must hide this knowledge to survive the post-Quest-3 `ASSASSIN_PHASE`.
- **Percival**: Sees two `merlinCandidateIds` (`MERLIN` and `MORGANA`) without knowing which is true.
- **Loyal Servant of Arthur**: Sees zero secret role tags; relies purely on public voting history, Quest fail counts, and behavioral deduction.
- **Assassin & Morgana**: Know each other as Evil teammates, but do **not** know `OBERON`.
- **Oberon**: Blind to Evil teammates and invisible to them, creating genuine multi-agent uncertainty.

---

## 2. Mandatory `gemini-4-argon` Interactions API Rules (`src/geminiOrchestrator.js`)
All primary reasoning, deception, team proposals, and verification loops execute via `@google/genai` (`ai.interactions.create`):
1. **Model ID**: `gemini-4-argon`
2. **Thinking Level Routing**:
   - `generation_config: { thinking_level: "high" }`: Used for AI Leader Quest Team Proposals, Evil Quest Sabotage decisions, and the Final Assassin Merlin Deduction.
   - `generation_config: { thinking_level: "medium" }`: Used for live idol debate turns (`privateInnerThought` + `publicSpeech`) and `verifyAndHealUtterance`.
   - `generation_config: { thinking_level: "low" }`: Used for MC Jae-suk broadcast commentary and fast transitions.
3. **Forbidden Legacy Parameters**:
   - Never pass `thinking_budget`, `temperature`, `top_p`, `top_k`, or explicit `cached_content` to `gemini-4-argon`.

---

## 3. Closed-Loop Epistemic & Rule Verification (`verifyAndHealUtterance`)
Every generated AI Idol utterance passes through a two-stage verification loop before reaching the transcript or TTS engine:
1. **Deterministic Epistemic & Board Audit**:
   - Checks that Good-aligned idols never claim to be Evil or sabotage Quests.
   - Checks that `MERLIN` never explicitly self-reveals (`"I am Merlin"`, `"my night vision shows"`) which would hand an automatic victory to the Assassin.
   - Checks that idols do not hallucinate impossible Quest numbers or illegal team sizes.
2. **Self-Healing Repair Pass (`gemini-4-argon`)**:
   - If a violation is flagged, `verifyAndHealUtterance` invokes `gemini-4-argon` (`thinking_level: "medium"`) with the specific violation reason to rewrite the line in-character before emission, logging both the flag and the healed output to the **Judge X-Ray Inspector**.

---

## 4. Multimodal Companion Model Pipeline & Operational Lessons
- **Real Webcam Video Generation (`gemini-omni-1.1-flash`)**:
  - Invoked with `ai.interactions.create({ model: 'gemini-omni-1.1-flash', input: prompt, background: true })` and polled via `ai.interactions.get(interaction.id)` (passing the string ID directly).
  - **Prompt Safety Lesson**: Prompts referencing `"K-pop idol"` or celebrity names trigger Prohibited Use filters (`400 Request blocked`). Describing `"a poised 25-year-old Korean female talk show panelist in a modern podcast studio looking into a webcam"` generates clean, photorealistic 16:9 `.mp4` studio webcam feeds (`state.output_video.data`).
- **4K Studio Portrait Anchors (`gemini-nano-banana-2.1`)**:
  - Generates photorealistic studio portraits (`public/generated/portrait_*.png`) used as poster frames and fallback anchors.
- **Parallel 6-Idol Team Voting (`gemini-3.8-flash`)**:
  - Executes all 6 AI Idol `APPROVE`/`REJECT` vote decisions in parallel via `Promise.all`.
- **Expressive Character Voice (`gemini-3.8-flash-tts`) & Live STT (`gemini-3.5-transcribe-live`)**:
  - Synthesizes low-latency `audio/wav` (`RIFF`) character speech and transcribes live human microphone input in Korean or English.
- **Phase-Adaptive Broadcast BGM (`lyria-3.5` / `lyria-3-clip-preview`)**:
  - Dynamically shifts studio background music tension across `DISCUSSION`, `TEAM_VOTE`, `QUEST_EXECUTION`, and `ASSASSIN_PHASE`.
