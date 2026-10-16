# AGENTS.md — Multi-Agent Epistemic Architecture & Gemini 4 Argon Guardrails

## 1. Multi-Agent Cast & Epistemic Isolation (`src/avalonEngine.js`)
**IDOL AVALON LIVE** orchestrates **8 distinct personas** inside a **Discord Voice & Video Party Channel (`#avalon-stage-7p`)**:
- **1 Non-Playing Party Moderator**: **MC Jae-ho (`유재호`, `mc_jaesuk`)** — Paces the Discord voice stage, announces Quest and Vote math, and triggers the **Bystander Silence Detector** when the human player stays muted/quiet (ISFP, 國民 MC motif).
- **6 Autonomous AI Idol Party Members (with Pre-Generated 4K Visual Center Portraits & Avalon Deduction Lore)**:
  1. **Seoyoung (`서영`, `idol_wonyoung`)** — Charismatic Visual Center (`✨ Lucky Vicky`, ISTP; analytical framing of Quest team compositions and proposing 1-for-1 player swaps to verify loyalty).
  2. **Rina (`리나`, `idol_karina`)** — Cool Tactical Leader (`🧊 Prosecutor Math`, ENFP; tracks vote patterns, fail-card probabilities, and Reject Track math).
  3. **Seol-ah (`설아`, `idol_sullyoon`)** — Quiet Deductive Observer (`🌊 Busan Satoori`, ISFP; speaks concisely in Busan dialect and catches subtle contradictions between public speeches and `APPROVE`/`REJECT` votes).
  4. **Yura (`유라`, `idol_yuna`)** — High-Energy Moodmaker (`🍑 Chungcheong Sarcasm`, ENFP; uses bold intuition and Chungcheong-do roundabout sarcasm to break up suspicious repeat coalitions).
  5. **Chaerin (`채린`, `idol_chaewon`)** — Sharp Prosecutor (`🔥 Fierce Street-Boss`, ISTP; aggressively cross-examines failed Quest participants and demands explicit `APPROVE`/`REJECT` declarations).
  6. **Hana (`하나`, `idol_hanni`)** — Clever Wildcard (`🦘 Melbourne Aussie Slang`, INFP; tests reactions with sudden candidate nomination pivots and Melbourne Aussie slang).
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
- **Fixed 4K Studio Profile Images (`gemini-nano-banana-2.1` / `gemini-3.1-flash-image-preview`)**:
  - Generates photorealistic 16:9 Korean studio profile images (`public/generated/portrait_*.png`) rendered steadily in each Discord voice/video tile with zero text overlays or camera wobble.
- **Video Generation Latency Lesson (`gemini-omni-1.1-flash`)**:
  - Invoked via `ai.interactions.create({ model: 'gemini-omni-1.1-flash', input: prompt, background: true })` and polled via `ai.interactions.get(interaction.id)`.
  - **Engineering Lesson**: While `gemini-omni-1.1-flash` produces 16:9 studio clips when using non-celebrity prompts (`"a poised 25-year-old Korean female talk show panelist"`), end-to-end video generation latency is too slow for rapid turn-by-turn Mafia/Avalon cross-examinations. We therefore standardized on **Fixed 4K Discord Profile Images (`portrait_*.png`) + Real-Time TTS (`gemini-3.8-flash-tts`) + Discord Green Speaking Rings (`#23a55a`)** for instant debate pacing.
- **Parallel 6-Idol Team Voting (`gemini-3.8-flash`)**:
  - Executes all 6 AI Idol `APPROVE`/`REJECT` vote decisions in parallel via `Promise.all`.
- **Expressive Character Voice (`gemini-3.8-flash-tts`) & Live STT (`gemini-3.5-transcribe-live`)**:
  - Synthesizes low-latency `audio/wav` (`RIFF`) character speech and transcribes live human microphone input in Korean or English.
- **Phase-Adaptive Broadcast BGM (`lyria-3.5` / `lyria-3-clip-preview`)**:
  - Dynamically shifts studio background music tension across `DISCUSSION`, `TEAM_VOTE`, `QUEST_EXECUTION`, and `ASSASSIN_PHASE`.
