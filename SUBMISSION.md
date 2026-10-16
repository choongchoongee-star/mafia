# SUBMISSION.md — Google DeepMind AI Hackathon Submission Package

## 1. Project Title & Track
- **Title**: **IDOL AVALON LIVE — Multi-Agent K-Pop Variety Show Social Deduction Studio**
- **Primary Track**: **Track 1 — Gemini 4 Argon in Entertainment** *(Hybrid with Track 4 — Autonomous Agents)*
- **GitHub Repository**: `https://github.com/choongchoongee-star/mafia`

---

## 2. English Project Description (Copy-Paste Ready for Submission Form)

### Overview
**IDOL AVALON LIVE** is a live, autonomous multi-agent Korean variety show broadcast studio where **1 Human Guest** joins **MC Jae-suk** (non-playing variety host) and **6 AI K-Pop Idols** (**Wonyoung, Karina, Sullyoon, Yuna, Chaewon, and Hanni**) on a 7-player Zoom conference call to play the official rules of *The Resistance: Avalon*.

Unlike text-only social deduction wrappers or static visual novels, **IDOL AVALON LIVE** combines:
1. **Strict Epistemic Multi-Agent Isolation**: Each of the 7 players is dealt a hidden role (`Merlin`, `Percival`, `2 Loyal Servants of Arthur`, `Assassin`, `Morgana`, `Oberon`). Before every model invocation, `buildPrivatePlayerView()` constructs a mathematically isolated epistemic state so no AI agent ever sees unrevealed roles—forcing genuine Bayesian deduction, bluffing, and coordination.
2. **Dual-Channel `gemini-4-argon` Deception & Reasoning**: Using the `@google/genai` Interactions API (`generation_config: { thinking_level: "low" | "medium" | "high" }`), each AI Idol simultaneously generates a hidden `privateInnerThought` (strategic calculation based on their secret role) and a `publicSpeech` (their on-air bluff or accusation).
3. **Closed-Loop Epistemic & Rule Verification (`verifyAndHealUtterance`)**: Every AI utterance is audited against Avalon rules and epistemic constraints (e.g., preventing Merlin from self-revealing or Good players from claiming Evil). If a leak or rule hallucination is detected, `gemini-4-argon` automatically rewrites and heals the dialogue in-character before TTS synthesis.
4. **Autonomous Timed Broadcast & Bystander Silence Detector**: Every phase runs on a real broadcast clock (`20s` Team Proposal, `75s` Live Discussion, `15s` Team Vote, `15s` Quest Execution). If the human guest stays silent for `> 22s`, MC Jae-suk and the idols autonomously flag the human's "Bystander Strategy" and interrogate them live on air.
5. **7-Model Multimodal Broadcast Pipeline**:
   - **`gemini-4-argon`**: Primary showrunner, Quest team proposals (`thinking_level: "high"`), dual-channel idol deception (`"medium"`), closed-loop verification, and final Assassin Merlin shot.
   - **`gemini-3.8-flash`**: Parallel 6-idol `APPROVE`/`REJECT` voting engine (`Promise.all`).
   - **`gemini-omni-1.1-flash`**: Generates real 16:9 `.mp4` studio webcam video streams (`background: true`) for MC Jae-suk and all 6 AI Idols, layered beneath a 60FPS transparent Canvas HUD with phoneme viseme tracking and simultaneous listener reactions.
   - **`gemini-nano-banana-2.1`**: Generates 4K photorealistic studio portrait anchors.
   - **`gemini-3.8-flash-tts`**: Synthesizes expressive character voice (`audio/wav`).
   - **`gemini-3.5-transcribe-live`**: Bilingual (Korean/English) live microphone speech-to-text interrogation.
   - **`lyria-3.5` (`lyria-3-clip-preview`)**: Phase-adaptive broadcast background music.

---

## 3. 3-Minute Live Demo Video Script (< 180 Seconds)

### [0:00 – 0:25] Hook & Live 7-Camera Zoom Broadcast Studio
- **Visual**: Open `IDOL AVALON LIVE` (`/`). Point out MC Jae-suk's live `.mp4` webcam monitor on the left and the 7-tile Zoom conference grid in the center where Wonyoung, Karina, Sullyoon, Yuna, Chaewon, and Hanni are moving in real `.mp4` studio webcam feeds (`gemini-omni-1.1-flash`) with 60FPS `[ AF-LOCK ]` face-tracking brackets.
- **Narration**: *"Welcome to IDOL AVALON LIVE—a Korean variety show social deduction studio powered by Gemini 4 Argon. On screen are 7 live webcam feeds: MC Jae-suk hosting on the left, 6 autonomous AI K-Pop Idols generated with `gemini-omni-1.1-flash` and `gemini-nano-banana-2.1`, and our human seat."*

### [0:25 – 0:55] Epistemic Role Selector & Team Proposal (`thinking_level: "high"`)
- **Visual**: Use the **Role Preference Selector** in the left rail to select `🧙‍♂️ Merlin (Good)` (or keep `Random Role`). Show the **Secret Role Card** revealing which 3 idols are Evil (`👁️ EVIL` badges on their Zoom tiles). Click **Propose Team** (or let the AI Leader propose via `gemini-4-argon` with `thinking_level: "high"`).
- **Narration**: *"Every player operates under strict epistemic isolation. As Merlin, our Night Vision reveals the three Evil minions on their Zoom tiles—information no other Good player has. Watch how the AI Leader uses `gemini-4-argon` at `thinking_level: high` to propose a Quest team."*

### [0:55 – 1:35] Live Voice/Text Interrogation, Bystander Detector & Judge X-Ray
- **Visual**: During the `75s` Discussion phase, click `@Karina` or use Push-to-Talk (`🎤 Speak Live` via `gemini-3.5-transcribe-live`) to accuse an Evil idol. Switch the right rail to **🔬 Judge X-Ray**. Point out the **Private Inner Monologue (`🧠 Inner Monologue`)** vs. **Public Speech (`🗣️ Public Speech`)** and the **Closed-Loop Verification (`✅ Verified`)** logs. Then click `⏭️ Stay Silent / Next Idol Turn` to trigger the **Bystander Silence Detector**.
- **Narration**: *"In the Judge X-Ray tab, you can see `gemini-4-argon`'s dual-channel mind: what the idol is secretly plotting versus what she says on air, plus our `verifyAndHealUtterance` verification loop preventing role leaks. And if we stay silent, the Bystander Detector catches us hiding and MC Jae-suk calls us out live!"*

### [1:35 – 2:20] Parallel Voting (`gemini-3.8-flash`), Quest 4 Two-Fail Rule & Assassin Climax
- **Visual**: Click **🗳️ Start Team Vote Now** and vote `⭕ APPROVE`. Watch all 6 AI idols cast parallel votes via `gemini-3.8-flash`. Next, click **🔥 Jump to Quest 4 Critical (Needs 2 Fails)** in the left rail, execute the Quest, and then click **🗡️ Jump to Final Assassin Shot (Merlin Hunt)** to watch the Assassin use `gemini-4-argon` (`thinking_level: "high"`) to deduce and shoot Merlin.
- **Narration**: *"Votes resolve in parallel across all 6 idols using `gemini-3.8-flash`, while `lyria-3.5` shifts the broadcast BGM tension. Jumping to the final Assassin Phase, the Assassin analyzes the entire transcript with `gemini-4-argon` (`thinking_level: high`) to hunt down Merlin."*

### [2:20 – 2:50] Interactive Architecture Walkthrough (`/architecture.html`)
- **Visual**: Click **📐 Architecture** in the top header to open `/architecture.html`. Briefly click through the 5 pipeline stages and Epistemic Isolation Explorer.
- **Narration**: *"Finally, our built-in `/architecture.html` inspector gives judges a complete interactive breakdown of our 7-model Google DeepMind pipeline, epistemic isolation matrix, and closed-loop verification engine. Thank you!"*
