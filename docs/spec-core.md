# Core Specification (`spec-core.md`) — IDOL AVALON: Discord Party Play Social Deduction

## 1. Product Vision & Hackathon Track Alignment
- **Title**: **IDOL AVALON: Live Discord Party Play Social Deduction**
- **Track**: **Track 1 — Gemini 4 Argon in Entertainment**
- **Core Concept**: An on-demand, live-generated social deduction party game following the **exact 7-player rules of *The Resistance: Avalon***, staged inside a **Discord Voice & Video Party Channel (`#avalon-stage-7p`)**.
- **Cast**:
  - **1 Non-Playing Party Moderator (진행자)**: **MC Jae-ho (유재호)** (inspired by National MC Yoo Jae-suk — signature horn-rimmed glasses, sharp suit, witty and energetic moderator who runs the Discord stage clock, announces phases/votes/quests, and calls out muted/silent bystanders).
  - **6 Photorealistic AI K-Pop Girl Group Idols**: **Seoyoung (서영), Rina (리나), Seol-ah (설아), Yura (유라), Chaerin (채린), Hana (하나)** (all-star 4th-gen K-Pop visual & personality line-up with detailed Namuwiki-style personal profiles, MBTIs, favorite foods, nicknames, regional dialects, live LLM reasoning, and live voice speech).
  - **1 Human Player ("Guest / 7th Member")**: Joins the Discord voice/video channel via text chat or live voice microphone (or can stay muted/silent as a bystander while the AI idols autonomously run and play the entire game).
- **Language Policy**: **100% English** for all UI labels, game system logs, subtitles, MC commentary, and Idol dialogue/speech (with natural K-Pop flavor such as *"Oppa/Unnie"*, *"Daebak"*, *"Sunbaenim"*). Accepts user input in English or Korean and responds in English.

---

## 2. Exact 7-Player Avalon Rules Engine

### 2.1 Role Selection & Distribution (Player Role Choice + Cryptographic Shuffle of Remaining 6 Roles)
At the start of a game, the **Human Player** can freely choose which role they want to play (`Merlin`, `Percival`, `Loyal Servant`, `Assassin`, `Morgana`, `Oberon`, or `Random`). Once the Human Player's role is assigned, the **remaining 6 roles** from the official 7-player deck are cryptographically shuffled (`crypto.randomInt` / Fisher-Yates) across the **6 AI Idols**:
- **Player Epistemic Blindness**: The Human Player has **zero knowledge** of how the remaining 6 roles were distributed among the 6 AI Idols, *except* for what their chosen role legally sees during the Night Phase (e.g., Merlin sees which 3 idols are Evil; Percival sees 2 Merlin/Morgana candidates; Assassin/Morgana sees their 1 Evil partner; Loyal Servant and Oberon see nobody).
- **AI Epistemic Blindness**: None of the 6 AI Idols (nor MC Jae-ho) know what role the Human Player selected, *except* when an AI Idol's own legitimate Night Phase role grants that sight according to official Avalon rules (e.g., an AI Merlin sees if the Human is Evil; an AI Assassin/Morgana sees if the Human is their Evil partner).

| Alignment | Role Name | Count | Night Phase Epistemic Knowledge (Strict Isolation) | Win Condition & Special Rules |
| :--- | :--- | :---: | :--- | :--- |
| **Good (Loyal Servants of Arthur)** | **Merlin** | 1 | Sees the exact identities of **all 3 Evil players** (`Assassin`, `Morgana`, and `Oberon`). | Wins if 3 Quests succeed **AND** Merlin survives the Assassin's final shot. Must guide Good subtly without exposing identity to Assassin. |
| **Good** | **Percival** | 1 | Sees **2 mystery candidates** (`Merlin` and `Morgana` in randomized order) without knowing which is the real Merlin and which is Morgana. | Protect the true Merlin, deduce which of the two is Morgana, and help pass 3 Quests. |
| **Good** | **Loyal Servant (Good Citizen)** | 2 | Knows **only** their own role (zero night vision). | Deduce Evil players purely via vote math, quest results, and behavioral/verbal cues. |
| **Evil (Minions of Mordred)** | **Assassin** | 1 | Sees **`Morgana`** as fellow Evil teammate. Does **NOT** see `Oberon`. | Wins if 3 Quests fail, OR 5 proposals are rejected in a row, OR if Good passes 3 Quests and Assassin correctly shoots **Merlin**. |
| **Evil** | **Morgana** | 1 | Sees **`Assassin`** as fellow Evil teammate. Does **NOT** see `Oberon`. | Appears to `Percival` alongside `Merlin`. Must impersonate Merlin to deceive Percival and sabotage 3 Quests. |
| **Evil** | **Oberon** | 1 | Sees **nobody** (blind to `Assassin` and `Morgana`, and they are blind to `Oberon`; however, `Merlin` sees `Oberon` as Evil). | Wins with Evil. Must deduce who Assassin/Morgana are through gameplay while sabotaging quests and sowing chaos. |

### 2.2 Quest Board Specifications (7-Player Matrix)
| Quest # | Required Team Size | Fails Required to Fail Quest | Notes |
| :---: | :---: | :---: | :--- |
| **Quest 1** | **2 Players** | 1 Fail | Fast opening probe |
| **Quest 2** | **3 Players** | 1 Fail | Expanding trust circle |
| **Quest 3** | **3 Players** | 1 Fail | Mid-game pivot |
| **Quest 4** | **4 Players** | **2 Fails Required (`Two-Fail Rule`)** | Critical 7-player Avalon rule: requires at least 2 Evil players on the team both playing `Fail` to fail the quest! |
| **Quest 5** | **4 Players** | 1 Fail | Final decisive mission |

### 2.3 Proposal & Vote Track (The 5-Proposal Hammer Rule)
- **Leader Rotation**: A randomized starting Leader token (`👑`) rotates clockwise around the 7 players after every proposal (whether approved or rejected) and after every completed quest.
- **Reject Counter (`1` to `5`)**:
  - Each Quest tracks consecutive rejected team proposals (`rejectCount`: `0 -> 5`).
  - Proposal 5 on any Quest is the **Hammer Proposal**.
  - If **Proposal 5 is rejected** by majority/tie vote (in Avalon, a tie `3 Approve vs 3 Reject` fails, and with 7 players every vote has a strict majority of at least `4-3`), **Evil immediately wins the entire game**.
  - When a proposal is **Approved** (`>= 4 Approve` votes), the `rejectCount` resets to `0` for the next Quest.

### 2.4 Quest Execution Rules
- Only the `N` players on the approved Quest Team submit a secret Quest Card:
  - **Good Players (`Merlin`, `Percival`, `Loyal Servant`)**: Hard-locked by rules to submit **`SUCCESS`** (UI and backend enforce that Good players cannot play `FAIL`).
  - **Evil Players (`Assassin`, `Morgana`, `Oberon`)**: May strategically choose **`SUCCESS`** (to hide/blend in, e.g., on Quest 1 or Quest 4 when alone) or **`FAIL`** (to sabotage the quest).
- Submitted cards are shuffled before **MC Jae-ho** reveals the exact count of `SUCCESS` vs `FAIL` cards.

### 2.5 Endgame & Assassin's Final Shot
- **Immediate Evil Victory**:
  - 3 Quests fail, OR
  - 5 consecutive team proposals are rejected on a single Quest.
- **Assassin Phase (Triggered when 3 Quests Succeed)**:
  - Even if Good completes 3 successful Quests, Evil gets one final chance.
  - **MC Jae-ho** spotlights the **Assassin** (and reveals `Morgana` & `Oberon`).
  - A **30-second Assassin Deliberation & Shot** phase begins:
    - If the **Assassin is an AI Idol**, she uses `gemini-4-argon` (`thinking_level="high"`) to analyze the entire game's transcript and vote logs (who had suspiciously accurate reads on Evil players without hard math?), delivers her dramatic deduction speech via live video/voice, and fires at her #1 Merlin suspect.
    - If the **Human Player is the Assassin**, the Evil AI idols advise the Human Player on who they suspect is Merlin, and the Human clicks one of the 4 Good players to assassinate within the timer.
  - If the target is **Merlin** $\rightarrow$ **EVIL WINS BY ASSASSINATION**.
  - Otherwise $\rightarrow$ **GOOD WINS**.

---

## 3. Cast Profiles & Namuwiki Character Lore: MC Jae-ho & The 6 Independent K-Pop Idol NPC Agents

> **Visual, Stage Name & Namuwiki Lore Mandate**: All characters use pre-generated 4K photorealistic K-Pop visual center studio portraits (`/generated/portrait_*.png`) with original idol stage names (**Seoyoung, Rina, Seol-ah, Yura, Chaerin, Hana** + **MC Jae-ho**), distinct styling details, and rich **Namuwiki (`나무위키`) character background profiles** (MBTI, favorite foods/snacks, nicknames, hobbies, and signature habits/memes) paired with **distinct regional dialects** and role-driven acting.

| ID | Stage Name & Motif | High-Res 4K Studio Portrait | Namuwiki Profile Lore (MBTI, Favorites, Nicknames, Trivia) | Dialect & Avalon Strategy Archetype | Voice Profile (`gemini-3.8-flash-tts`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `mc_jaesuk` | **MC Jae-ho (유재호)** *(Motif: National MC Yoo Jae-suk)* | `/generated/portrait_mc_jaesuk.png` — Korean male variety show host in his late 40s, signature black horn-rimmed glasses, navy broadcast suit, lapel mic. | **MBTI**: `ISFP` \| **Nicknames**: "National MC", "Grasshopper Sunbae" \| **Favorites**: Naengmyeon (cold noodles), ramyeon, intense variety banter. | **National Variety MC**: Fast-paced, witty, playful variety show pacing (*"Yeorobun!"*, *"Hold on a second!"*). Calls out silent players and breaks tense strategic silences. | `Puck` (`pitch: 1.04`, `rate: 1.08`) |
| `idol_wonyoung` | **Seoyoung (서영)** *(Motif: IVE Jang Won-young)* | `/generated/portrait_idol_wonyoung.png` — 20yo doll-like Korean visual center idol, espresso mermaid waves with crystal clip, pastel-pink pearl tweed outfit. | **MBTI**: `ISTP` (rational thinker behind princess visual) \| **Favorites**: Tteokbokki, strawberries, beef BBQ, pistachio ice cream, rice (`밥파`) \| **Nicknames**: "God-Seoyoung (갓서영)", "Giant Baby Bunny" \| **Hobbies**: Flying yoga, pilates, "Lucky Seoyoung" positive mindset. | **Posh Princess / "Lucky Seoyoung" Strategist (`✨ Lucky Seoyoung`)**: Poised, articulate, confident speech with subtle positive reframing. Polite when yielding the mic (`YIELD_POLITELY`), deadly persuasive as Morgana. | `Aoede` (`pitch: 1.15`, `rate: 1.02`) |
| `idol_karina` | **Rina (리나)** *(Motif: aespa Karina)* | `/generated/portrait_idol_karina.png` — 22yo CG-visual leader idol, sharp V-line face, midnight-black hair with hime side-locks & silver pins, black/chrome off-shoulder top. | **MBTI**: `ENFP` (warm prankster behind cold AI beauty) \| **Favorites**: Tonkatsu (돈가스), pizza, gummies/jelly, tteokbokki, die-hard Mint-Choco fan (`민초단`) \| **Nicknames**: "CG Visual", "Baby Tiger", "Quail Egg" \| **Hobbies**: Mobile games (PUBG/LoL), anime, reading micro-expressions. | **Ice-Cold Analytical Detective (`🧊 Prosecutor Math`)**: Zero-fluff mathematical precision (*"Check the Round 1 vote ratio."*). Pushes through mic collisions (`PUSH_THROUGH`) when interrupting a lie. | `Kore` (`pitch: 0.93`, `rate: 1.05`) |
| `idol_sullyoon` | **Seol-ah (설아)** *(Motif: NMIXX Sullyoon)* | `/generated/portrait_idol_sullyoon.png` — 20yo Bambi deer-eyed Korean visual goddess, ash-chestnut half-up hair with satin ribbon, cream knit off-shoulder top. | **MBTI**: `ISFP` (quiet homebody observer) \| **Favorites**: Malatang (level 2–3), tteokbokki, bakery bread (`빵순이`), ice cream \| **Nicknames**: "Bambi Deer (사슴)", "Seol-vely" \| **Hobbies**: Watching baking videos, listening to ballads, subtle Busan Satoori intonation when surprised. | **Quiet Deductive Sniper (`🌊 Busan Satoori`)**: Calm, observant visual who stays quiet (`HOLD_SILENT`) until she spots a logical contradiction, then delivers concise, sharp deductions with light Busan intonation (*"Wait, that doesn't match how you voted earlier."*). | `Leda` (`pitch: 1.04`, `rate: 0.94`) |
| `idol_yuna` | **Yura (유라)** *(Motif: ITZY Yuna)* | `/generated/portrait_idol_yuna.png` — 20yo high-teen queen visual maknae, honey-brown highlighted high ponytail with scrunchie, burgundy & white crop jacket. | **MBTI**: `ENFP` (vitamin moodmaker) \| **Favorites**: Pizza, hamburgers, chocolate, Korean soup & rice (`국밥`) \| **Nicknames**: "Queen Yura", "Human Vitamin", "Floorball Ace" \| **Hobbies**: Former school floorball athlete (hyper-competitive), teasing unnies with playful sarcasm. | **Playful Sarcasm Teaser (`🍑 Chungcheong Sarcasm`)**: Witty, laid-back, roundabout teasing (*"Sure, let's all approve that team if we want Evil to win for free~"*). Baits suspects into over-defending their partners. | `Zephyr` (`pitch: 1.18`, `rate: 0.97`) |
| `idol_chaewon` | **Chaerin (채린)** *(Motif: LE SSERAFIM Kim Chae-won)* | `/generated/portrait_idol_chaewon.png` — 21yo chic short-bob visual leader, layered dark chocolate Tassel-cut bob with bangs, black & silver cropped blazer. | **MBTI**: `ISTP` (cool-headed realist) \| **Favorites**: Extra-spicy Malatang & tteokbokki, mint-choco (`민초단`), Korean soul food \| **Nicknames**: "Ssam-Chaerin (쌈채린)", "Short-Hair Goddess (단발 여신)" \| **Hobbies**: Netflix binge-watching, lying down (`눕방`), fierce direct reactions. | **Fierce Street-Boss Leader (`🔥 Fierce Street-Boss`)**: Blunt, fast, zero patience for stalling (*"Cut the excuses and explain your third pick right now."*). Pushes through mic collisions (`PUSH_THROUGH`). | `Despina` (`pitch: 0.98`, `rate: 1.10`) |
| `idol_hanni` | **Hana (하나)** *(Motif: NewJeans Hanni)* | `/generated/portrait_idol_hanni.png` — 20yo adorable high-teen visual center, jet-black half-twin braids with star hairpins, pastel-blue varsity cardigan & retro headphones. | **MBTI**: `INFP` (creative, empathetic wildcard) \| **Favorites**: Bread (`빵순이`), avocado, Vietnamese spring rolls (월남쌈), mint-choco (`민초단`) \| **Nicknames**: "Baby Otter / Hamster (햄찌)", "Melbourne Peach" \| **Hobbies**: Acoustic guitar, film camera, diary writing, Aussie slang traps. | **Melbourne Aussie Wildcard (`🦘 Melbourne Aussie Slang`)**: Natural Australian English conversationalist (*"Wait on, that excuse sounds pretty dodgy to me—why did you flip your vote?"*). Sets clever logic traps without overusing clichés. | `Autonoe` (`pitch: 1.10`, `rate: 1.06`) |
| `player_human` | **YOU (Special Guest)** *(Player 7)* | Live Player Tile (supports optional webcam preview or stylish Guest VIP badge + live mic waveform & status). | **Role**: Freely selectable (`Random`, `Merlin`, `Percival`, `Loyal Servant`, `Assassin`, `Morgana`, `Oberon`). | Can play actively via voice/text OR act as a silent bystander—the 6 independent AI idol agents and MC Jae-ho dynamically adapt to either behavior! | Live User Mic / Text Chat |

---

## 4. Timed Game Loop & Autonomous Floor Manager

To ensure rounds never drag and the game runs autonomously even if the human player says nothing, every phase has an enforced server/client countdown timer:

```mermaid
stateDiagram-v2
    [*] --> NightReveal : Randomize 7 Roles + Epistemic Views (10s)
    NightReveal --> TeamProposal : MC Jae-ho Announces Quest & Leader (45s Timer)
    TeamProposal --> DiscussionDebate : Leader Locks Team of N Players (180s Timer)
    DiscussionDebate --> TeamVote : Timer Hits 0:00 or Early Vote Called (30s Timer)
    TeamVote --> TeamProposal : Majority Reject (< 4 Approve) & RejectCount < 5
    TeamVote --> GameOverEvil : 5th Consecutive Reject (Hammer Loss)
    TeamVote --> QuestExecution : Majority Approve (>= 4 Approve) (25s Timer)
    QuestExecution --> QuestReveal : MC Jae-ho Reveals Shuffled Cards (10s)
    QuestReveal --> TeamProposal : Good < 3 & Evil < 3 (Next Quest)
    QuestReveal --> GameOverEvil : 3 Quests Failed
    QuestReveal --> AssassinPhase : 3 Quests Succeeded (60s Timer)
    AssassinPhase --> GameOverEvil : Assassin Shoots Merlin
    AssassinPhase --> GameOverGood : Assassin Misses Merlin
```

### 4.1 Phase Timer Rules & Autonomous Fallbacks
1. **Night Phase & Role Reveal (`10 seconds`)**:
   - **MC Jae-ho** introduces the session in `#avalon-stage-7p` and triggers the secret role reveal card in the Discord sidebar for the Human Player (showing the Human's selected/random role and exact night-phase knowledge, e.g., if Percival, highlights the 2 Merlin/Morgana candidates on the Discord stage grid).
2. **Team Proposal Phase (`45 seconds` — Live Pre-Proposal Idol Lobbying + Guaranteed Team Selection)**:
   - **Active Multi-Agent Lobbying Loop During `TEAM_PROPOSAL`**: The 6-agent parallel conversation loop (`triggerDiscussionStep`) runs by default during `TEAM_PROPOSAL` as well as `DISCUSSION`. While the Leader is deciding who to pick, the AI Idols actively pitch themselves for the Quest team, warn the Leader against suspicious candidates, and respond in real time to Human chat/voice input.
   - **If an AI Idol is Leader**: Non-leader idols deliver live pre-proposal lobbying pitches to the AI Leader, after which `gemini-4-argon` (`thinking_level: "high"`) is guaranteed to lock in and announce the AI Leader's `N`-player team automatically (right after the pre-proposal lobbying beat, when `<= 24s` remain on the 45s clock, or immediately when the player clicks **`✨ Let Leader Propose`**).
   - **If the Human Player is Leader**: All 6 AI Idols actively lobby and advise the Human Leader while the Human toggles `N` players on the Discord stage grid (even reacting to tentative tile selections). Clicking **"Propose Team"** immediately preempts any background speech to lock in the team, and if the 45s timer hits `0:00` without submission, **MC Jae-ho** auto-fills any remaining slots so a valid team is 100% guaranteed to be proposed.
3. **Discussion & Live Debate Phase (`180 seconds / 3 minutes` — 6-Agent Parallel Floor Negotiation)**:
   - **6 Independent Idol Agents (`Promise.all`)**:
     - Rather than a single central controller or a slow 11-second polling loop, all **6 AI Idol Agents** simultaneously evaluate the board from their isolated `PrivatePlayerView` in parallel (`Promise.all`) and bid `{ intent: 'INTERRUPT' | 'SPEAK' | 'HOLD_SILENT', urgency: 0..100, innerThought, text }`.
     - As soon as the current speaker's voice playback finishes (plus a natural ~2.5-second conversational breath), the next parallel 6-agent floor negotiation fires automatically (including simultaneous Mic Clash & Polite Yield `COLLISION_YIELD` when two idols unmute together).
     - **Zero Predetermined Scripts**: Every single utterance is generated **live** conditioned on the exact current proposal, vote history, quest math, and the live chat transcript up to that millisecond.
   - **Human Input (Voice or Text Anytime)**:
     - Whenever the Human types a message or speaks via mic, all 6 Idol Agents immediately evaluate the Human's statement in parallel so the most relevant idol directly answers the Human's point on the very next beat!
   - **Bystander / Silence Detection (When Human Stays Quiet)**:
     - The Game State tracks `humanMessagesInRound`. If `24+ seconds` have elapsed in the round and `humanMessagesInRound == 0`, a `BYSTANDER_ALERT` is injected into the idols' and MC Jae-ho's live context.
   - **Early Vote Trigger**: The Human can click **"Start Vote"** at any time to skip the remaining discussion timer and jump straight to voting, or let the 180s timer naturally hit `0:00`.
4. **Team Vote Phase (`30 seconds`)**:
   - All 6 AI Idols compute their `APPROVE` or `REJECT` vote in parallel via `gemini-3.8-flash` / `gemini-4-argon` (along with a 1-sentence reason and hidden inner monologue).
   - The Human has **30 seconds** to click **`Approve`** or **`Reject`**. If the Human is inactive when the 30s timer expires, an automatic vote is cast so the reveal proceeds immediately.
   - All 7 votes flip simultaneously on the Discord stage tiles!
5. **Quest Execution Phase (`25 seconds`) & Assassin Phase (`60 seconds`)**:
   - Only the `N` approved team members act during `QUEST_EXECUTION` (`25 seconds`).
   - If Good passes 3 Quests, `ASSASSIN_PHASE` gives **60 seconds** for the Assassin to review the full game history and shoot Merlin.

---

## 5. Multimodal Video, Voice & Verification Architecture

### 5.1 Live Idol Discord Stage Video & Speech Generation Pipeline
1. **Real Looping Webcam Video Streams (`gemini-omni-1.1-flash`)**:
   - Generates real 16:9 `.mp4` webcam videos (`output_video.data` via Interactions API `background=True`) for **MC Jae-suk** and all **6 Idols** (`webcam_<characterId>.mp4`), playing inside `<video autoplay loop muted playsinline>` elements in the Discord stage tiles.
   - Triggered with `background=True` for asynchronous reaction clips on high-drama beats.
2. **Photorealistic Visual Anchor (`gemini-nano-banana-2.1` / `gemini-3.1-flash-lite-image`)**:
   - Generates high-resolution 4K studio webcam poster frames (`portrait_<characterId>.png`) cached locally on disk (`/public/generated/`) for instant 0ms display in every Discord video tile.
3. **Expressive Real-Time Speech (`gemini-3.8-flash-tts`) + Web Audio API & Autoplay-Resilient Engine**:
   - Every spoken line is synthesized with member-specific voice profiles (`Puck`, `Aoede`, `Kore`, `Leda`, `Zephyr`, `Despina`, `Autonoe`) via `gemini-3.8-flash-tts` (`gemini-3.8-flash-lite-tts` fallback), sanitized into a pure 44-byte RIFF PCM WAV buffer (`24kHz` 16-bit mono, stripping trailing `C2PA` metadata chunks).
   - Played on the client through an unlocked **Web Audio API `AudioContext` (`decodeAudioData`)** with `Blob` URL `HTMLAudioElement` and `window.speechSynthesis` fallback, tracking exact decoded audio duration (`audioBuffer.duration`), auto-ducking BGM during speech, queuing any browser-autoplay-blocked opening turn for immediate replay on first user interaction, and providing per-message `🔊` replay buttons in the chat transcript.
   - Simultaneously drives Discord green speaking-ring borders, voice channel member indicators, and live voice waveform overlays.
4. **Adaptive Soundtrack (`lyria-3.5` / `lyria-3-clip-preview`) with Seamless Circular Crossfade Looping, Mid-Track Dropout Elimination & Web Audio `GainNode` Attenuation**:
   - Generates continuous, steady-groove ambient background music across `DISCUSSION`, `TEAM_VOTE`, `QUEST_EXECUTION`, and `ASSASSIN_PHASE` with prompts prohibiting intros, breakdowns, or beat drops.
   - Post-processes every decoded `AudioBuffer` on the client via `createSeamlessLoopBuffer(audioCtx, rawBuffer)`:
     1. Trims leading/trailing encoder and intro/outro transients (`2.5s` head/tail).
     2. Scans `200ms` sliding RMS energy windows to automatically select the most uniform `15.0s` continuous musical groove, eliminating any mid-track breakdown, hollow pause, or awkward dip.
     3. Applies soft RMS envelope leveling (`0.75x–1.35x` smoothed gain normalization) so ambient energy never swells or drops out mid-loop.
     4. Bakes a **3.0-second equal-power (`cos`/`sin`) circular crossfade** ($y[i] = x[i]\sin(\frac{\pi}{2}t) + x[i+N_{\text{loop}}]\cos(\frac{\pi}{2}t)$) so sample `N_loop - 1` wraps into sample `0` as exact consecutive samples with **zero seam, zero click, and zero dead air**.
   - Routes BGM playback through a **Web Audio API `GainNode`** (ensuring hardware/OS volume compliance across both desktop and iOS/Android mobile browsers where `HTMLAudioElement.volume` is read-only) at an ultra-subtle default ambient level (`0.0040` linear gain, ~`-48 dB`) with smooth `0.45s` exponential transitions so BGM never pumps or pops between turns.

### 5.2 Autonomous Rule & Epistemic Verification Loop (Hackathon Judge Requirement)
Every AI Idol turn passes through a **2-Stage Verification Loop** before reaching the player:
1. **Epistemic Leak Check**: Verifies the generated dialogue does not claim forbidden knowledge (e.g., a Loyal Servant claiming to "know" someone is Evil from night vision, or Merlin explicitly saying *"I am Merlin and I saw X is Evil at night"*).
2. **Avalon Rule & History Consistency Check**: Verifies that any referenced Quest numbers, team sizes (`2-3-3-4*-4`), and past votes match the immutable `GameHistory` ledger.
3. **Self-Correction & Judge Telemetry**: If a check fails, `gemini-4-argon` automatically rewrites the utterance before TTS/video synthesis and logs the verification event in the **Director X-Ray / Judge Inspector Panel**.

---

## 6. UI/UX Layout & Hackathon Judging Features
1. **3-Zone Consolidated Button Architecture (`#avalon-stage-7p`)**:
   - **Zone 1 — Left Sidebar (`NEW GAME & ROLE SETUP` inside `#secretRoleCard`)**:
     - Single home for starting or resetting matches: Role Selector dropdown (`#preferredRoleSelect`), full-width primary **`🔄 Start New Game (Quest 1)`** button (`#startNewGamePrimaryBtn`), and 2 compact Judge Demo Jump buttons (`⚡ Demo: Quest 4` and `🗡️ Demo: Assassin`).
   - **Zone 2 — Top Context Action Bar (`#phaseActionBanner`)**:
     - Single home for all in-game phase progression controls (`Propose Team`, `⏭️ Next Idol Turn`, `🗳️ Start Vote`, `✅ Approve / ❌ Reject`, `✅ Success / 🗡️ Fail`, `🗡️ Resolve Assassin Shot`, and `🔄 Play Again`).
   - **Zone 3 — Bottom Call Controls Dock (`.call-controls-dock`)**:
     - Single home for media and view toggles, using explicitly labeled pill controls (`Voice Mic`, `My Cam`, `Voice ON/OFF`, `🎵 BGM ON/OFF` + compact BGM volume slider, `X-Ray`, and `Side Panel`).
2. **Discord Voice & Video Stage UI**:
   - **Left Server Rail & Channel Sidebar (`64px + 244px` Fixed Width)**: Discord server icon rail (`ARCH` diagram link + Settings gear `#apiKeyModalBtn`), active `#avalon-stage-7p` voice channel with live connected members list, Quest Track (`1–5`), Reject Count (`1/5` to `5/5`), Secret Role & New Game Setup Card, and bottom Discord User Status Bar. Fixed width and protected from chat drawer resizing.
   - **Center Discord Video Stage Grid (`.video-call-stage`)**:
     - **MC Jae-suk Moderator Tile** + **6 Photorealistic Idol Video Tiles** + **Human Player Tile**.
     - Each tile shows: Member Name, Leader Crown (`👑`), Proposed Team Shield (`🛡️`), Discord Green Speaking Ring, Last Vote Badge (`⭕ APPROVE` / `❌ REJECT`), and Private Night Knowledge indicator (only visible for roles the Human is allowed to see!).
     - Automatically scales and reflows from a `4×2` grid to a compact `2×4` grid (`.compact-stage`) when the user drags the right chat drawer wider.
   - **Resizable Right Party Chat & Judge X-Ray Panel (`#rightChatDrawer` + `#chatResizeHandle`)**:
     - Features a draggable left-edge splitter (`#chatResizeHandle`) allowing the player to smoothly drag and expand the chat window while shrinking the center video stage (never encroaching on the left settings/channel sidebar).
     - Enforces Avalon's **100% Open Public Table Talk Rule**: all chat messages are broadcast publicly to the entire room (`#avalon-stage-7p`) with no targeted `@Idol` calling chips, while mentioning any idol by Korean or English name (`서영`/`Seoyoung`, `리나`/`Rina`, `설아`/`Seol-ah`, `유라`/`Yura`, `채린`/`Chaerin`, `하나`/`Hana`) automatically boosts that idol's parallel floor-bid urgency (`99/100`) so she answers the human player directly.
     - **Full Chat-Driven Game Operation (Korean & English Natural Language Router)**: Allows the human player to operate every phase of the game directly via the chat input (`#liveChatForm`):
       - `TEAM_PROPOSAL`: Typing player names (e.g., `"서영이랑 나 가자"`, `"리나 설아 추천"`, `"Propose Seoyoung and me"`) or confirmation (`"출발"`, `"제안"`, `"propose"`) selects and locks in the Quest Team proposal.
       - `DISCUSSION`: Typing `"투표 시작"` / `"start vote"` opens `TEAM_VOTE`; typing `"찬성"` / `"반대"` directly transitions to voting and casts the vote; typing `"다음"` / `"next"` advances to the next AI idol turn; any other message is immediately rendered optimistically in the transcript and answered by the AI idols.
       - `TEAM_VOTE`: Typing `"찬성"` / `"동의"` / `"approve"` / `"yes"` or `"반대"` / `"거부"` / `"reject"` / `"no"` casts the human's vote.
       - `QUEST_EXECUTION`: Typing `"성공"` / `"success"` or `"실패"` / `"사보타주"` / `"fail"` submits the Quest card.
       - `ASSASSIN_PHASE`: Typing a candidate's name (e.g., `"설아 암살"`, `"Shoot Rina"`) executes the Assassin shot.
       - Global: Typing `"새 게임"` / `"다시 시작"` / `"new game"` starts a fresh match.
     - **Zero-Drop Optimistic Chat & Non-Blocking Action Queue**: Separates network request state (`isWaitingServer`) from voice playback state (`isPlayingAudio`), cancels any in-flight autonomous background poll via `AbortController` when the user chats or clicks a phase action button, and queues rapid user chat submissions so human messages are never dropped or delayed.
     - Supports **Fast Text-Only Mode (`skipTts`)**: toggling `Voice OFF` (`#audioToggleBtn`) bypasses server-side TTS/video synthesis so players can test and play at high speed via text chat alone.
3. **Judge / Director X-Ray Tab (Toggleable via `X-Ray` Pill Button)**:
   - Displays live **`gemini-4-argon` (`thinking_level`)** reasoning traces, the hidden **Bayesian Suspicion Matrix**, each AI idol's **Private Inner Monologue** vs **Public Speech**, and **Verification Loop Pass/Self-Heal Logs** so judges can verify in < 3 minutes that all 6 AI idols are running genuine, deep multi-agent social deduction.
4. **Responsive Mobile & Tablet Layout (`@media (max-width: 960px)`)**:
   - **Touch Scrolling Unlocked**: Replaces the desktop `overflow: hidden` 4-column grid with a smooth vertical single-column flex layout (`overflow-y: auto; -webkit-overflow-scrolling: touch;`) so mobile viewports (`360px–960px`) never clip the video stage or chat off-screen.
   - **Mobile-First Visual Priority (`order`)**: Places the **Sticky Mobile Top Bar + Quick-Jump Pills (`🎥 Stage`, `💬 Chat`, `🔍 X-Ray`, `🎲 Role/Setup`)** first, the **8-Tile `2×4` Video Stage + Phase Action Bar + Call Controls** second, the **Live Voice Chat & Judge X-Ray Panel** third, and the **Quest Track & Role / New Game Setup** fourth.
   - **Mobile Touch Ergonomics**: Enforces `aspect-ratio: 16 / 10` on mobile `.zoom-tile` cards so `<canvas>` portraits remain sharp, disables the desktop horizontal splitter (`#chatResizeHandle`) on mobile screens, and uses `16px` font sizing on mobile inputs/dropdowns to prevent iOS Safari auto-zooming.

---

## 7. Core Problem Statement, Engineering Retrospective & Future Product Roadmap

### 7.1 Core Problem & Purpose: Solving the "Headcount Bottleneck" of Social Deduction Games
- **The Fundamental Pain Point of Mafia / Avalon**: Social deduction games (*Mafia*, *Werewolf*, *The Resistance: Avalon*) are among the most thrilling party games ever created, yet they suffer from a massive **cold-start matchmaking barrier**: they strictly require **7 to 10 live players** gathered in a Discord voice channel at the exact same time to achieve proper game-theoretic balance.
- **Why Traditional Game AI Failed**: Unlike Chess or MOBA bots, social deduction cannot be solved with simple heuristics—it requires open-ended natural language persuasion, bluffing, reading contradictions, and reasoning strictly under asymmetric hidden information (*Epistemic Isolation*).
- **How `gemini-4-argon` Solves It**: By combining `gemini-4-argon`'s frontier reasoning (`thinking_level: "high"`) with strict per-agent epistemic state isolation and an autonomous verification gate, a player can launch an authentic 7-player Avalon match in a Discord-style party room anytime with zero matchmaking wait.

### 7.2 Hackathon Engineering Retrospective: Real-Time Generative Video Latency vs. Conversational Pacing
- **Experiment During the Sprint**: Early in the hackathon, we tested generating live turn-by-turn reaction videos via `gemini-omni-1.1-flash` for every idol utterance.
- **Key Finding (Latency vs. Pacing Trade-off)**: While asynchronous video generation produces rich clips, current end-to-end video generation latency is still too slow to keep pace with rapid-fire, interactive Mafia/Avalon debate turns. Waiting for full video generation on every turn broke conversational momentum.
- **Pragmatic Hackathon Solution**: We prioritized snappy, uninterrupted conversational pacing by anchoring each Discord stage tile with high-resolution portraits (`gemini-nano-banana-2.1`) paired with real-time expressive voice synthesis (`gemini-3.8-flash-tts`) and Discord speaking-ring / audio-reactive indicators, while running `gemini-omni-1.1-flash` asynchronously in the background (`background=True`).

### 7.3 Post-Hackathon Product Roadmap
1. **Hybrid Discord Party Multiplayer (`N` Friends + `7 - N` AI Agents)**:
   - Expand beyond the 1-Human + 6-AI single-player mode into **Drop-In Discord Multiplayer Lobbies**.
   - If 3 or 4 friends gather on Discord to play Mafia/Avalon together but lack the full 7–10 headcount, the system dynamically fills **only the missing seats** with autonomous `gemini-4-argon` agents so any small friend group can play a full-scale match immediately.
2. **Customizable NPC Persona & IP Universe Packs**:
   - Allow players to swap or mix NPC rosters on demand based on personal taste: **K-Pop Boy Group Idols**, **Anime / Webtoon Characters**, **Noir Movie Detectives & Villains**, or custom user-created characters—dynamically pairing `gemini-nano-banana-2.1` visual generation with `gemini-3.8-flash-tts` voice profiles.
3. **Sub-Second Real-Time Streaming Video Avatars (Micro-Expressions & Tells)**:
   - As real-time generative video models achieve sub-second streaming latency, upgrade the static portraits in the Discord video tiles into **live streaming neural video avatars** capable of subtle psychological "tells" (nervous eye darts when bluffing as Morgana, micro-smirks, shocked gasps on Quest betrayals) synchronized in real time with dialogue.

