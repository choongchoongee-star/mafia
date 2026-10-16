# SUBMISSION.md — Google DeepMind AI Hackathon Submission Package

## 1. Official Submission Checklist & Portal Fields (Due by 15:20 KST)

| Required Deliverable / Field | Status | Value / Copy-Paste Content |
| :--- | :---: | :--- |
| **Submission Portal** | 🔗 | [https://cerebralvalley.ai/e/google-deepmind-ai-hackathon](https://cerebralvalley.ai/e/google-deepmind-ai-hackathon) |
| **Project Title** | ✅ | `IDOL AVALON LIVE — 7-Player Discord Party Play Social Deduction powered by Gemini 4 Argon` |
| **Short Tagline (< 140 chars)** | ✅ | `On-demand 7-player Avalon voice & video party game with 6 epistemic-isolated AI K-Pop idols orchestrated by Gemini 4 Argon.` |
| **Primary Track** | ✅ | **Track 1 — Gemini 4 Argon in Entertainment** *(Hybrid with Track 4 — Autonomous Agents)* |
| **Live Google Cloud Run URL** | ✅ | [https://idol-avalon-live-oyxmbnqija-du.a.run.app](https://idol-avalon-live-oyxmbnqija-du.a.run.app) |
| **Interactive Architecture Walkthrough** | ✅ | [https://idol-avalon-live-oyxmbnqija-du.a.run.app/architecture.html](https://idol-avalon-live-oyxmbnqija-du.a.run.app/architecture.html) |
| **Health & Model Telemetry API** | ✅ | [https://idol-avalon-live-oyxmbnqija-du.a.run.app/api/status](https://idol-avalon-live-oyxmbnqija-du.a.run.app/api/status) |
| **Public GitHub Repository** | ✅ | [https://github.com/choongchoongee-star/mafia](https://github.com/choongchoongee-star/mafia) |
| **English Project Description** | ✅ | Ready in **Section 2** below (100% English) |
| **Demo Video (< 3 Minutes)** | 🎬 | Script & shot list ready in **Section 3** below (Upload to YouTube / Google Drive & paste link) |

---

## 2. English Project Description (Copy-Paste Ready for Cerebral Valley Form)

### ⚡ Concise 10-Line Summary (Recommended for Main Submission Box)
```text
Social deduction party games like Mafia and The Resistance: Avalon are thrilling, but suffer from a critical headcount bottleneck: you cannot play unless 7 to 10 friends gather in a voice channel at the exact same time.
IDOL AVALON LIVE solves this cold-start problem with Gemini 4 Argon (gemini-4-argon), turning 7-player Avalon into an on-demand Discord Voice & Video Party Stage (#avalon-stage-7p) where 1 human joins moderator MC Jae-ho and 6 autonomous AI K-Pop idols (Seoyoung, Rina, Seol-ah, Yura, Chaerin, and Hana).
Every match cryptographically shuffles the official 7-player Avalon roles (Merlin, Percival, 2 Loyal Servants, Assassin, Morgana, Oberon) under strict Epistemic Isolation (buildPrivatePlayerView)—no AI agent ever sees the global role state, forcing genuine Bayesian deduction, bluffing, and role-shielding.
Powered by the @google/genai Interactions API, gemini-4-argon routes reasoning dynamically across thinking_level: "high" (Leader Quest proposals, Evil sabotage, and the Assassin's final Merlin shot), "medium" (dual-channel privateInnerThought vs. publicSpeech), and "low" (MC hosting) with zero legacy sampling parameters.
All 6 AI idols evaluate the board in parallel (Promise.all via gemini-3.8-flash) to bid for the voice floor and cast simultaneous APPROVE/REJECT team votes without scripted turn orders.
Before any line reaches TTS, our Closed-Loop Epistemic & Rule Verifier (verifyAndHealUtterance on gemini-4-argon) audits the output for illegal role leaks (e.g., Merlin self-revealing) or rule hallucinations and self-heals violations in-character, exposed live in the Judge X-Ray Inspector.
A 7-model multimodal pipeline brings the Discord call to life: 4K studio portraits (gemini-nano-banana-2.1), zero-cutoff Web Audio voice synthesis with lookahead pre-fetching (gemini-3.8-flash-tts), bilingual mic transcription (gemini-3.5-transcribe), seamless circular-crossfaded BGM (lyria-3-clip-preview), and async video clips (gemini-omni-1.1-flash).
During the sprint, benchmarking gemini-omni-1.1-flash revealed that turn-by-turn video latency slowed rapid cross-examination, leading to our hybrid architecture of fixed 4K studio portraits + real-time voice waveforms + lookahead audio queuing for sub-second (~700ms) debate handoffs.
Players can interact via 1-click Stage HUD buttons, live voice microphone, or natural Korean/English chat commands—or stay muted as a bystander while the Bystander Silence Detector prompts the idols to interrogate the player and autonomously play the game to completion.
Deployed live on Google Cloud Run with desktop and mobile support, IDOL AVALON LIVE lays the foundation for hybrid Discord lobbies (N Humans + (7 - N) AI agents) where any small friend group can fill missing party seats with autonomous AI personas on demand.
```

### 2.1 Detailed Version: Solving the "Headcount Bottleneck" of Mafia & Social Deduction Games
Social deduction games like *Mafia*, *Werewolf*, and *The Resistance: Avalon* are among the most thrilling party games ever created, but they suffer from a fundamental **cold-start headcount barrier**: you cannot play unless you gather **7 to 10 live people** in a Discord voice call at the exact same time. Traditional rule-based game bots fail to fill these seats because social deduction requires open-ended natural language bluffing, reading behavioral contradictions, and reasoning strictly under asymmetric hidden information.

**IDOL AVALON LIVE** solves this headcount barrier using **Gemini 4 Argon (`gemini-4-argon`)**, transforming the classic 7-player hidden-role board game *The Resistance: Avalon* into an instant, on-demand **Discord Party Play (`#avalon-stage-7p` Voice & Video Stage)** experience where **1 Human Player** joins **6 autonomous AI K-Pop Visual Center Idols** (**Seoyoung `서영`, Rina `리나`, Seol-ah `설아`, Yura `유라`, Chaerin `채린`, and Hana `하나`**—each with pre-generated 4K studio portraits, distinct regional speaking styles such as Busan Satoori, Chungcheong Sarcasm, and Melbourne Aussie Slang, and rich Namuwiki-inspired profiles) alongside non-playing party moderator **MC Jae-ho (`유재호`)**.

### 2.2 Multi-Agent Epistemic Isolation, Parallel Floor Negotiation & Autonomous Verification
Unlike text-only chat wrappers or scripted visual novels, **IDOL AVALON LIVE** is engineered as a full-stack autonomous multi-agent system:
1. **Interactive Role Choice + Strict Epistemic Multi-Agent Isolation (`buildPrivatePlayerView`)**: The human player can freely choose any Avalon role (`Merlin`, `Percival`, `Loyal Servant`, `Assassin`, `Morgana`, `Oberon`, or `Random`) while the remaining 6 roles from the official 7-player deck are cryptographically shuffled across the 6 AI Idols. Before every LLM call, `buildPrivatePlayerView()` constructs a mathematically isolated epistemic slice so neither the human nor any AI agent ever receives the global `secretRoles` dictionary—forcing genuine Bayesian deduction, bluffing, and role-shielding.
2. **6-Agent Parallel Floor Bidding & Orderly Non-Interrupting Voice Queue**: All 6 AI idols independently evaluate their isolated `PrivatePlayerView` in parallel (`Promise.all`) to bid for the voice floor (`SPEAK` or `HOLD_SILENT` with strategic silence) while enforcing round-robin turn fairness (`minTimesSpoken`). A zero-cutoff Web Audio API playback queue with **lookahead background pre-fetching** pre-generates the next speaker's reasoning and TTS audio while the current speaker is talking—delivering natural, uninterrupted voice debates with ~700ms turn handoffs.
3. **Dual-Channel `gemini-4-argon` Deception & Reasoning**: Using the `@google/genai` Interactions API (`generation_config: { thinking_level: "low" | "medium" | "high" }`), each AI Idol simultaneously generates a hidden `privateInnerThought` (strategic calculation based on their secret role and suspicion matrix) and a `publicSpeech` (their voice-channel persuasion or accusation focused 100% on Quest team rosters, vote math, and suspect isolation).
4. **Closed-Loop Epistemic & Rule Verification (`verifyAndHealUtterance`)**: Every AI utterance is audited against official 7-player Avalon rules and epistemic boundaries (preventing Merlin from self-revealing, Good players from claiming Evil, or hallucinated Quest sizes). If a violation is flagged, `gemini-4-argon` (`thinking_level: "medium"`) automatically rewrites and heals the line in-character before TTS synthesis, logging the audit trail in the **Judge X-Ray Inspector**.
5. **Autonomous Timed Discord Stage, Natural Language Chat Router & Bystander Detector**: Every phase runs on an autonomous stage clock (`45s` Team Proposal, `180s` Discussion with automatic transition to voting after 4 debate turns, `30s` Team Vote, `25s` Quest Execution, `60s` Assassin Shot). Players can play via 1-click HUD buttons, live voice mic (`gemini-3.5-transcribe`), or natural Korean/English chat commands (`"서영이랑 나 가자"`, `"찬성"`, `"반대"`). If the human stays muted as a bystander, MC Jae-ho and the idols autonomously call out the silence and drive the entire match to completion.
6. **7-Model Google DeepMind Multimodal Pipeline**:
   - **`gemini-4-argon`**: Primary Game Master, Quest team proposals (`thinking_level: "high"`), dual-channel idol deception (`"medium"`), closed-loop verification (`verifyAndHealUtterance`), and final Assassin Merlin deduction (`"high"`). Zero legacy parameters (`thinking_budget`, `temperature`, `top_p`, `top_k`, `cached_content` never used).
   - **`gemini-3.8-flash`**: Fast parallel 6-idol floor evaluation and simultaneous `APPROVE`/`REJECT` voting (`Promise.all`).
   - **`gemini-nano-banana-2.1`**: Generates 4K photorealistic 16:9 Korean studio portraits (`portrait_*.png`) for MC Jae-ho and all 6 idols.
   - **`gemini-3.8-flash-tts`**: Synthesizes expressive character speech (`24kHz` RIFF WAV) with persona-specific pitch/rate prosody, text sanitization (`cleanTextForTts`), and Discord green speaking-ring activation.
   - **`gemini-3.5-transcribe`**: Bilingual (Korean/English) live microphone speech-to-text input.
   - **`lyria-3.5` (`lyria-3-clip-preview`)**: Phase-adaptive ambient party BGM loops processed through a client-side Web Audio DSP **3.0s equal-power circular crossfade loop engine (`createSeamlessLoopBuffer`)** and `GainNode` attenuation (`-48 dB`).
   - **`gemini-omni-1.1-flash`**: Asynchronous video cutscene/reaction generation (`background: true`).

### 2.3 Hackathon Engineering Retrospective: Real-Time Video Generation vs. Debate Pacing
Early in the hackathon sprint, we benchmarked live turn-by-turn video generation (`gemini-omni-1.1-flash`) for every spoken turn in the Discord voice call. While `gemini-omni-1.1-flash` generated expressive 16:9 studio clips, end-to-end video generation latency was too slow for the rapid back-and-forth tempo of a live Mafia/Avalon cross-examination. To preserve snappy conversational pacing, we made the pragmatic engineering decision to anchor the Discord video tiles on fixed 4K studio portraits (`gemini-nano-banana-2.1`) paired with zero-cutoff real-time voice synthesis (`gemini-3.8-flash-tts`), lookahead turn pre-fetching, and Discord green speaking-ring feedback, while keeping video generation asynchronous (`background: true`).

### 2.4 Post-Hackathon Product Roadmap
1. **Hybrid Discord Party Multiplayer ("Bring Your Friends, Fill the Rest with AI")**:
   - Expand beyond `1 Human + 6 AI` single-player into **flexible Discord party lobbies (`N Humans + (7 - N) AI Agents`)**. When 2 to 5 friends gather on Discord to play Mafia/Avalon together, AI agents seamlessly drop into the voice channel to fill only the missing seats.
2. **Customizable NPC Casts & IP Universes**:
   - Allow players to swap or mix their NPC cast beyond female K-Pop idols—such as **Male K-Pop Boy Group Idols**, **Anime / Webtoon Characters**, **Noir Detectives & Movie Characters**, or custom personas—dynamically generating matching visual portraits and voice profiles.
3. **Sub-Second Real-Time Streaming Video Micro-Expressions**:
   - As generative video latency reaches sub-second streaming speeds, upgrade static portraits in the Discord video tiles into **live generated video avatars** capable of subtle psychological tells (nervous eye shifts when bluffing, micro-smirks, and shocked gasps) at full conversational speed.

---

## 3. 3-Minute Live Demo Video Script (< 180 Seconds)

### [0:00 – 0:25] Hook: Solving the Mafia Headcount Barrier in Discord Party Play
- **Visual**: Open `IDOL AVALON LIVE` (`https://idol-avalon-live-oyxmbnqija-du.a.run.app`). Show the Discord Server Rail on the left, `#avalon-stage-7p` voice channel (`8 / 8 Connected`), and the `4×2` 4K Discord Video Stage Grid featuring **MC Jae-ho (`유재호`)**, **Seoyoung (`서영`)**, **Rina (`리나`)**, **Seol-ah (`설아`)**, **Yura (`유라`)**, **Chaerin (`채린`)**, **Hana (`하나`)**, and **You (Guest)**.
- **Narration**: *"Mafia and Avalon are amazing party games, but gathering 7 to 10 friends in a Discord voice call at the same time is almost impossible. Welcome to IDOL AVALON LIVE—an on-demand 7-player Discord Party Play social deduction room powered by Gemini 4 Argon."*

### [0:25 – 0:55] Epistemic Role Selection & AI Leader Team Proposal (`thinking_level: "high"`)
- **Visual**: Highlight the **Secret Role & New Game Setup Card** in the left sidebar showing your dealt role and legitimate Night Vision (e.g., as Merlin, seeing the 3 Evil idols tagged on the Discord stage grid, while all other roles remain hidden). Let the AI Leader propose a Quest team via `gemini-4-argon` (`thinking_level: "high"`) or click member chips in the top **Stage Game HUD** to propose a team.
- **Narration**: *"Players can pick any role or Random while the remaining 6 roles are cryptographically shuffled across the 6 AI idols under strict epistemic isolation. Watch how the AI Leader uses `gemini-4-argon` at `thinking_level: high` to propose a Quest team while lighting up the Discord green speaking ring with real-time `gemini-3.8-flash-tts` voice."*

### [0:55 – 1:35] Orderly 6-Agent Debate, Natural Language Chat & Judge X-Ray Inspector
- **Visual**: During Discussion, type a public question in `#stage-chat` (or use the `Voice Mic` button via `gemini-3.5-transcribe`) mentioning an idol by name (e.g., `"Rina, why do you trust this roster?"`). Open the **Inspector (`X-Ray`)** tab on the right drawer to reveal each idol's **Private Inner Monologue (`privateInnerThought`)** vs. **Public Speech (`publicSpeech`)**, the **Closed-Loop Verification (`verifyAndHealUtterance`)** pass badge, and the **Namuwiki Cast Lore Cards**.
- **Narration**: *"All 6 idols evaluate the board in parallel from isolated epistemic views, pre-fetching the next speaker's audio in the background for seamless turn-taking. Opening the Judge X-Ray tab reveals `gemini-4-argon`'s dual-channel mind—what each idol secretly calculates versus what she says aloud—audited by our `verifyAndHealUtterance` verification loop."*

### [1:35 – 2:20] 1-Click Direct Voting (`gemini-3.8-flash`), Quest 4 Two-Fail Rule & Assassin Climax
- **Visual**: Click **`✅ 찬성 투표 / Approve`** directly in the top banner (or Chat Action Dock). Watch all 6 AI idols cast parallel `APPROVE`/`REJECT` votes via `gemini-3.8-flash` while `lyria-3-clip-preview` plays seamless circular-crossfaded ambient BGM. Next, click **`⚡ Demo: Quest 4`** (showing Quest 4's Two-Fail rule), and then click **`🗡️ Demo: Assassin`** to watch the AI Assassin use `gemini-4-argon` (`thinking_level: "high"`) to analyze the full transcript and shoot Merlin.
- **Narration**: *"Votes resolve in parallel across all 6 idols via `gemini-3.8-flash`. Using the Judge Jump-Cut buttons, we can test Quest 4's two-fail rule or jump straight to the Assassin Climax, where the Assassin uses `gemini-4-argon` (`thinking_level: high`) to deduce and snipe Merlin."*

### [2:20 – 2:50] Interactive Architecture Walkthrough (`/architecture.html`) & Mobile-Ready Cloud Run Deployment
- **Visual**: Click the **`ARCH`** button on the far-left server rail to open `/architecture.html`, showcasing the 7-model Google DeepMind pipeline, Interactive Epistemic Matrix Explorer, and our roadmap toward `N Humans + (7 - N) AI` hybrid Discord multiplayer lobbies.
- **Narration**: *"Built from scratch during today's sprint and deployed live on Google Cloud Run with full desktop and mobile support, IDOL AVALON LIVE proves how Gemini 4 Argon turns high-headcount party games into instant multi-agent entertainment. Thank you!"*
