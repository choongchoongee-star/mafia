# SUBMISSION.md — Google DeepMind AI Hackathon Submission Package

## 1. Project Title & Track
- **Title**: **IDOL AVALON LIVE — 7-Player Discord Party Play Social Deduction powered by Gemini 4 Argon**
- **Primary Track**: **Track 1 — Gemini 4 Argon in Entertainment** *(Hybrid with Track 4 — Autonomous Agents)*
- **Live Cloud Run URL**: `https://idol-avalon-live-oyxmbnqija-du.a.run.app`
- **GitHub Repository**: `https://github.com/choongchoongee-star/mafia`

---

## 2. English Project Description (Copy-Paste Ready for Submission Form)

### 2.1 Core Purpose: Solving the "Headcount Bottleneck" of Mafia & Social Deduction Games
Social deduction games like *Mafia*, *Werewolf*, and *The Resistance: Avalon* are among the most thrilling party games ever created, but they suffer from a fundamental **cold-start headcount barrier**: you cannot play unless you gather **7 to 10 live people** in a Discord voice call at the exact same time. Traditional rule-based game bots fail to fill these seats because social deduction requires open-ended natural language bluffing, reading contradictions, and reasoning strictly under asymmetric hidden information.

**IDOL AVALON LIVE** solves this headcount barrier using **Gemini 4 Argon (`gemini-4-argon`)**, transforming the classic 7-player hidden-role board game *The Resistance: Avalon* into an instant, on-demand **Discord Party Play (`#avalon-stage-7p` Voice & Video Call)** experience where **1 Human Player** joins **6 autonomous AI K-Pop Idols** (**Wonyoung, Karina, Sullyoon, Yuna, Chaewon, and Hanni**) and party moderator **MC Jae-suk**.

### 2.2 Multi-Agent Epistemic Isolation & Autonomous Verification
Unlike text-only wrappers or scripted visual novels, **IDOL AVALON LIVE** combines:
1. **Strict Epistemic Multi-Agent Isolation (`buildPrivatePlayerView`)**: Each of the 7 players is cryptographically dealt a hidden role (`Merlin`, `Percival`, `2 Loyal Servants of Arthur`, `Assassin`, `Morgana`, `Oberon`). Before every model invocation, `buildPrivatePlayerView()` constructs a mathematically isolated epistemic state so no AI agent ever sees unrevealed roles—forcing genuine Bayesian deduction, bluffing, and coordination.
2. **Dual-Channel `gemini-4-argon` Deception & Reasoning**: Using the `@google/genai` Interactions API (`generation_config: { thinking_level: "low" | "medium" | "high" }`), each AI Idol simultaneously generates a hidden `privateInnerThought` (strategic calculation based on their secret role) and a `publicSpeech` (their voice-channel bluff or accusation).
3. **Closed-Loop Epistemic & Rule Verification (`verifyAndHealUtterance`)**: Every AI utterance is audited against Avalon rules and epistemic constraints (e.g., preventing Merlin from self-revealing or Good players from claiming Evil). If a leak or rule hallucination is detected, `gemini-4-argon` automatically rewrites and heals the dialogue in-character before TTS synthesis.
4. **Autonomous Timed Discord Stage & Bystander Silence Detector**: Every phase runs on a real party clock (`20s` Team Proposal, `75s` Live Discussion, `15s` Team Vote, `15s` Quest Execution). If the human player stays muted/silent, MC Jae-suk and the idols autonomously flag the human's "Bystander Strategy" and interrogate them live in `#avalon-stage-7p`.
5. **7-Model Multimodal Pipeline**:
   - **`gemini-4-argon`**: Primary Game Master, Quest team proposals (`thinking_level: "high"`), dual-channel idol deception (`"medium"`), closed-loop verification, and final Assassin Merlin shot.
   - **`gemini-3.8-flash`**: Parallel 6-idol `APPROVE`/`REJECT` voting engine (`Promise.all`).
   - **`gemini-nano-banana-2.1`**: Generates 4K photorealistic Discord video tile portraits.
   - **`gemini-3.8-flash-tts`**: Synthesizes expressive character voice (`audio/wav`) with Discord green speaking-ring activation.
   - **`gemini-3.5-transcribe`**: Bilingual (Korean/English) live microphone speech-to-text input.
   - **`lyria-3.5` (`lyria-3-clip-preview`)**: Phase-adaptive party background music (`discussion`, `vote`, `quest`, `assassin`).
   - **`gemini-omni-1.1-flash`**: Asynchronous video cutscene/reaction generation (`background: true`).

### 2.3 Hackathon Engineering Retrospective: Real-Time Video Generation vs. Debate Pacing
Early in the hackathon sprint, we benchmarked live turn-by-turn video generation (`gemini-omni-1.1-flash`) for every spoken turn in the Discord voice call. However, we found that current end-to-end video generation latency is still too slow to match the rapid back-and-forth tempo of a live Mafia/Avalon debate. To preserve snappy conversational pacing during the hackathon, we made the pragmatic engineering decision to anchor the Discord video tiles on high-resolution studio portraits (`gemini-nano-banana-2.1`) paired with real-time voice synthesis (`gemini-3.8-flash-tts`) and Discord green speaking-ring feedback, while keeping video generation asynchronous (`background: true`).

### 2.4 Post-Hackathon Product Roadmap
1. **Hybrid Discord Party Multiplayer ("Bring Your Friends, Fill the Rest with AI")**:
   - Expand beyond `1 Human + 6 AI` single-player into **flexible Discord party lobbies (`N Humans + (7 - N) AI Agents`)**. When 2 to 5 friends gather on Discord to play Mafia/Avalon together, they no longer need to cancel the game for lack of headcount—AI agents seamlessly drop into the voice channel to fill only the missing seats.
2. **Customizable NPC Casts & IP Universes**:
   - Allow players to select or mix their preferred NPC cast beyond female K-Pop idols—such as **Male K-Pop Boy Group Idols**, **Anime / Webtoon Characters**, **Movie / Drama Characters**, or custom personas—dynamically generating matching visual portraits and voice profiles.
3. **Sub-Second Real-Time Streaming Video Micro-Expressions**:
   - As generative video latency reaches real-time streaming speeds, upgrade static portraits in the Discord video tiles into **live generated video avatars** capable of dynamic facial micro-expressions (nervous eye shifts when bluffing, subtle smirks, and shocked gasps) at full conversational speed.

---

## 3. 3-Minute Live Demo Video Script (< 180 Seconds)

### [0:00 – 0:25] Hook: Solving the Mafia Headcount Barrier in Discord Party Play
- **Visual**: Open `IDOL AVALON LIVE` (`/`). Point out the Discord Server Rail on the far left, the `#avalon-stage-7p` voice channel in the sidebar, and the `4x2` Discord Video Stage Grid where MC Jae-suk, Wonyoung, Karina, Sullyoon, Yuna, Chaewon, Hanni, and the Human Guest are connected.
- **Narration**: *"Mafia and Avalon are amazing party games, but gathering 7 to 10 friends in a Discord voice call at the same time is almost impossible. Welcome to IDOL AVALON LIVE—an on-demand Discord Party Play social deduction room powered by Gemini 4 Argon."*

### [0:25 – 0:55] Epistemic Role Card & Team Proposal (`thinking_level: "high"`)
- **Visual**: Show the **Your Secret Role Card** in the Discord channel sidebar revealing your dealt role and Night Vision (e.g., as Merlin, seeing the 3 Evil idols marked on their Discord video tiles). Click tiles on the Discord stage to **Propose Team** (or let the AI Leader propose via `gemini-4-argon` with `thinking_level: "high"`).
- **Narration**: *"Every player in `#avalon-stage-7p` operates under strict epistemic isolation. No AI agent sees the global role state. Watch how the AI Leader uses `gemini-4-argon` at `thinking_level: high` to propose a Quest team while lighting up the Discord green speaking ring."*

### [0:55 – 1:35] Live Voice/Text Interrogation, Bystander Detector & Inspector X-Ray
- **Visual**: During the `75s` Discussion phase, click `@Karina` or use the microphone button (`gemini-3.5-transcribe`) to question an idol in the Discord `#stage-chat` drawer. Switch to the **Inspector (X-Ray)** tab to show the **Private Inner Monologue** vs. **Public Speech** and the **Closed-Loop Verification (`verifyAndHealUtterance`)** logs. Then click **Next Beat** without speaking to trigger the **Bystander Silence Detector**.
- **Narration**: *"In the Inspector tab, you can see `gemini-4-argon`'s dual-channel mind: what each idol is secretly calculating versus what she says in the voice call, audited by our `verifyAndHealUtterance` verification loop. And if we stay muted like a lurker, the Bystander Detector catches us and calls us out live!"*

### [1:35 – 2:20] Parallel Voting (`gemini-3.8-flash`), Quest 4 Two-Fail Rule & Assassin Climax
- **Visual**: Click **Call Vote** and vote `APPROVE`. Watch all 6 AI idols cast parallel votes via `gemini-3.8-flash` while `lyria-3-clip-preview` shifts the background music. Next, click the **`Q4`** preset icon on the left Discord server rail (Quest 4 needing 2 Fails), execute the Quest, and click the **`END`** preset icon to watch the Assassin use `gemini-4-argon` (`thinking_level: "high"`) to deduce and shoot Merlin.
- **Narration**: *"Votes resolve in parallel across all 6 idols using `gemini-3.8-flash`. Jumping to the final Assassin Phase, the Assassin analyzes the entire voice transcript with `gemini-4-argon` (`thinking_level: high`) to hunt down Merlin."*

### [2:20 – 2:50] Interactive Architecture Walkthrough (`/architecture.html`) & Roadmap
- **Visual**: Open `/architecture.html` to showcase the 7-model Google DeepMind pipeline, Epistemic Isolation Explorer, and our roadmap toward `N Humans + (7 - N) AI` hybrid Discord multiplayer lobbies.
- **Narration**: *"Built during today's sprint and deployed on Google Cloud Run, IDOL AVALON LIVE lays the foundation for hybrid Discord multiplayer where any small group of friends can fill their missing seats with autonomous Gemini 4 Argon agents. Thank you!"*

