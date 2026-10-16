# Google DeepMind AI Hackathon — Master Reference & Rules

## 1. Event Overview & Critical Schedule
- **Date**: Friday, October 16, 2026 (10:00 – 17:00 KST)
- **Venue**: Google for Startups Campus Seoul (Autoway Tower B2, Samseong Station Exit 3)
- **WiFi Credentials** (Connect to ONE network per zone):
  - **Campus-wide**: `Campus Community` / `Smoretalk`
  - **Event Hall**: `GDMHackathon_EventHall` / `deepmind1111`
  - **Cafe**: `GDMHackathon_Cafe` / `deepmind2222`
  - **Resident Space 1**: `GDMHackathon_Space1` / `deepmind3333`
  - **Resident Space 2**: `GDMHackathon_Space2` / `deepmind4444`

### Timeline (4-Hour Sprint!)
| Time | Program | Location |
| :--- | :--- | :--- |
| **10:00 – 10:30** | Check-in & Registration | Event Hall |
| **10:30 – 11:00** | Google Welcome & Tech Demo | Event Hall |
| **11:00 – 11:20** | Rules & Guidelines Briefing | Event Hall |
| **11:20 – 15:20** | **HACKATHON SPRINT (4 Hours)** | **Cafe & Resident Spaces** |
| **15:20 – 16:00** | Judging | — |
| **16:00 – 16:30** | Top 4 Live Demo Presentations | Event Hall |
| **16:30 – 17:00** | Awards Ceremony & Closing | Event Hall |

---

## 2. Mandatory Technical & Submission Requirements

### Core Technical Rules
1. **Google AI Technology (Mandatory)**: Must build using Google AI Studio, Antigravity, and **Gemini 4 Argon (`gemini-4-argon`)** + companion models.
2. **Google Cloud Deployment (Mandatory)**: Must be deployed to **Google Cloud** (e.g., Cloud Run, Firebase / App Hosting, GKE) as a live, verifiable service.
3. **English-Only Submission**: All submission text, project descriptions, and documentation must be written in **English**.

### Final Deliverables (Due by 15:20)
1. **Project Description** (in English)
2. **Public GitHub Repository** (Open-source link; demo code must be written during the hackathon)
3. **Demo Video** (YouTube, Google Drive, etc. — showing live working application)

---

## 3. Judging Criteria & Winning Formula

### Judging Rubric
1. **Working Live Demo / Demo Video (`🛠️`)**:
   - Runs live with **real inputs in under 3 minutes** without errors.
   - Effectively uses **Gemini 4 Argon (`gemini-4-argon`)**, Managed Agents, or companion models with a **real verification loop**.
2. **Problem & Impact (`🌍`)**:
   - Solves a concrete, high-value problem for a specific target user within one of the tracks.
   - Potential to grow into a real product or open-source tool used after today.
3. **Originality & Creativity (`✨`)**:
   - Fresh, creative approach rather than a generic template.
   - **Uniquely enabled by Gemini 4 Argon**: leverages the shared 1M-token context window, long decode (`background=True`), frontier reasoning (`thinking_level`), 3D/WebGPU generation, or multimodal multi-agent orchestration.
4. **Clarity of Description (`📝`)**:
   - Clear value proposition and target user communicated in the English description and demo video.

### Disqualification / Penalty Triggers (`🚫` Avoid At All Costs)
- **Pre-built / Re-submitted Projects**: Code for the demo must be written during the hackathon sprint (open-source libraries/starter templates are allowed).
- **Simple Chat Wrappers**: Basic PDF chatbots or simple Q&A wrappers.
- **Static Pages**: Basic Streamlit/static pages lacking autonomous reasoning, verification loops, or multimodal workflows.
- **Unverified High-Risk Bots**: Medical diagnosis, mental health counseling, or financial advice bots without **Human-in-the-Loop (HITL)** safety checkpoints.

### Prizes ($4,000 Total in Gemini API Credits)
- 🥇 **1st Place**: $2,000 Gemini API Credits
- 🥈 **2nd Place**: $1,000 Gemini API Credits
- 🥉 **3rd Place**: $500 Gemini API Credits
- 🥉 **4th Place**: $500 Gemini API Credits

---

## 4. Hackathon Tracks & Problem Statements

### Track 1: Gemini 4 Argon in Entertainment *(Primary fit for `mafia`)*
- **Focus**: Music, TV, film, webtoons, and **gaming**.
- **What Argon Adds**:
  - **3D scenes, physics & procedural worlds**: Writes Three.js, WebGPU, and Blender scripts across a 1M-token context window in a single long-decode pass.
  - **Multimodal Orchestration**: Argon acts as **Game Master or Showrunner**, coordinating:
    - `gemini-3.8-live` for real-time unscripted voice characters triggering in-game function calls.
    - `gemini-nano-banana-2.1` (or `gemini-3.1-flash-lite-image`) for consistent character sprites, UI assets, and storyboard panels.
    - `gemini-omni-1.1-flash` for video cutscenes with native synchronized audio.
    - `lyria-3.5` (or `lyria-3-clip-preview`) for adaptive soundtracks and vocals.
    - `gemini-3.8-flash-tts` for expressive multi-character speech/voice design.
  - **Agentic Video Understanding**: Scrubs gameplay or video cuts to match beats, dialogue timing, and continuity.

### Track 2: Gemini 4 Argon in Hard Tech
- **Focus**: Semiconductors, robotics, biotech, batteries, data centers, energy, aerospace.
- **Key Capabilities**: Long-horizon verification loops in Antigravity sandbox (`antigravity-preview-09-2026`), 1M-token multimodal synthesis (datasheets + schematics + logs + video), physics/spatial simulation (`thinking_level="high"` + WebGPU).

### Track 3: Google AI for Social Good
- **Focus**: Accessibility, health, education, civic services, safety.
- **Key Capabilities**: Headless browser accessibility verification & auto-patching, 70+ language voice access (`gemini-3.5-live-translate-preview` + `gemini-3.8-live`), privacy-first local execution (`gemma-4-31b-it` / E2B / E4B), Human-in-the-Loop checkpoints.

### Track 4: Open Innovation — Autonomous Agents & Developer Tools
- **Focus**: Self-healing security/dependency migration agents, legacy codebase modernizers (video + code -> `DESIGN.md` + modern web app), multi-agent research-to-prototype (`deep-research-preview-04-2026` + `gemini-3.8-flash` subagents).

---

## 5. Model Toolkit & Exact Model IDs

| Job in App | Model / Agent Name | Exact Model / Agent ID | Best Use Case |
| :--- | :--- | :--- | :--- |
| **Lead Brain / Orchestrator / 3D / Coding** | **Gemini 4 Argon** | `gemini-4-argon` | Architecture, multi-file generation, game master orchestration, Three.js/WebGPU, 1M shared context. |
| **Autonomous Sandbox Execution** | **Antigravity Managed Agent** | `antigravity-preview-09-2026` | Hosted Linux sandbox where Argon writes code, runs tests, calls MCP tools, and verifies output. |
| **Fast Parallel Subagents & Tool Calls** | **Gemini 3.8 Flash** | `gemini-3.8-flash` | Parallel leaf tasks, fast subagent execution, low-latency tool calls. |
| **High-Frequency Routing & Guardrails** | **Gemini 3.5 Flash-Lite** | `gemini-3.5-flash-lite` | Ultra-low-latency intent classification, routing, safety checks. |
| **Deep Web Research with Citations** | **Deep Research Agent** | `deep-research-preview-04-2026` | Multi-step cited background research. |
| **Real-Time Voice & Vision Conversation** | **Gemini 3.8 Live** | `gemini-3.8-live` / `gemini-3.8-live-extended-thinking` | Two-way real-time voice/camera sessions with interruptions & non-blocking function calls. |
| **Live Speech-to-Text & Translation** | **Gemini 3.5 Transcribe / Translate** | `gemini-3.5-transcribe-live`, `gemini-3.5-transcribe`, `gemini-3.5-live-translate-preview` | Streaming captions, speaker-labeled audio transcription, 70+ language live speech translation. |
| **Expressive Speech & Voice Design** | **Gemini 3.8 Flash TTS** | `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts` | Studio-quality speech in 130 languages with designed/replicated character voices. |
| **UI Assets, Sprites, Textures, 4K Images** | **Nano Banana 2.1** | `gemini-nano-banana-2.1`, `gemini-3.1-flash-lite-image` | High-consistency character sprites, multi-turn editing, accurate text, panoramic ratios (Lite for sub-second speed). |
| **Video Generation with Native Audio** | **Gemini Omni Flash** | `gemini-omni-1.1-flash` | Generates/edits video cutscenes with synchronized sound (run in background). |
| **Songs, Vocals & Dynamic Audio Loops** | **Lyria 3.5** | `lyria-3.5`, `lyria-3-clip-preview` | Full stereo songs (`lyria-3.5`) or 30s adaptive background loops (`lyria-3-clip-preview`). |
| **Private / On-Device Open Models** | **Gemma 4** | `gemma-4-31b-it` (plus E2B/E4B local) | Open weights on Interactions API or local device execution. |

---

## 6. Gemini 4 Argon & Interactions API Rules (Critical!)

### SDK Requirement
- Python: `google-genai >= 2.3.0`
- Node/TS: `@google/genai >= 2.3.0`
- Recommended endpoint: **Interactions API** (`client.interactions.create(...)`), which unifies models and managed agents, supports server-side state (`previous_interaction_id`), and handles background execution (`background=True`).

### 1. Reasoning Control (`thinking_level`)
- Use `generation_config={"thinking_level": "low" | "medium" | "high"}` (`"medium"` is default).
- **DO NOT USE** `thinking_budget` (deprecated).

### 2. Shared 1M-Token Context & Long Decode
- Input + Thinking + Output share a single **1M-token window**.
- Default output limit is `65,536` tokens.
- For outputs > 64K tokens, set `background=True` and `max_output_tokens` above `65536` (e.g., `262144`), then poll `client.interactions.get(id=interaction.id)`.

### 3. Deprecated Parameters to NEVER Use with `gemini-4-argon`
- ❌ `thinking_budget` -> Replace with `thinking_level`
- ❌ `temperature`, `top_p`, `top_k` -> **Remove completely** (ignored & triggers deprecation warnings)
- ❌ Explicit `cached_content` calls -> **Remove** (implicit context caching runs automatically at 95% discount)
- ⏱️ Increase HTTP timeouts to 15–20 mins for synchronous `"high"` thinking calls, or use `background=True`.

### 4. Five Builder Patterns for Hackathon Success
1. **Align on intent before long runs**: Clarify architecture, edge cases, and trade-offs upfront before executing multi-file builds.
2. **Give Argon a verification loop**: Always wire a concrete pass/fail test harness, compiler check, runtime validator, or headless browser check.
3. **Multimodal references & `DESIGN.md`**: Extract typography, color palette, and layout rules into `DESIGN.md` and use multimodal assets.
4. **Orchestrate Argon with Flash & media subagents**: Use `gemini-4-argon` as Lead Architect / Game Master, delegating fast parallel subtasks to `gemini-3.8-flash` and media generation to `gemini-nano-banana-2.1`, `gemini-3.8-live`, `gemini-3.8-flash-tts`, and `lyria-3.5`.
5. **Capture codebase quirks & visual explainers**: Document lessons in `AGENTS.md` and generate an interactive HTML architecture diagram / pipeline walkthrough for the judges.

---

## 7. Hackathon Account (`@gcplab.me`) & GCP Environment Guide (Tab 2: `t.yemjng8rofdc`)

### 1. Logging In (`@gcplab.me`)
- Log into [Google Cloud Console](https://console.cloud.google.com) in a **new Chrome profile or Incognito window** using the provided `@gcplab.me` ID and password.
- Select the **single pre-assigned GCP project** (Billing is already enabled).

### 2. Getting Your Gemini API Key in Google AI Studio
- Log into [Google AI Studio (`aistudio.google.com`)](https://aistudio.google.com) with the same `@gcplab.me` account.
- Navigate to **Get API key**.
- If no key appears yet, click **Import Projects**, select your assigned GCP project, and an already-provisioned API key (or instant key creation) will appear.

### 3. Antigravity Login (`Agent Platform Business Plan`)
- You can log into Antigravity 2.0 / IDE / CLI (`agy`) using the `@gcplab.me` account.
- **Important**: Specify your **GCP Project ID** when logging into Antigravity to get the **Agent Platform (Business) Plan**. If it says "Starter Quota", log out and log back in with the Project ID specified.

### 4. Recommended GCP Services & Strict Security Rules
- **App Hosting**: **Cloud Run** (recommended for web apps), **Firebase**, or **GKE Autopilot**.
- **Databases / Storage**: Cloud SQL, AlloyDB, Cloud Storage, BigQuery.
- **Strict Prohibitions & Warnings (`⚠️`)**:
  - **Immediate Decommissioning**: All `@gcplab.me` accounts, GCP projects, and documents will be **permanently deleted immediately after the event**. Back up all code/artifacts to personal PC and **public GitHub** before 15:20 KST.
  - **No OpenClaw**: Using autonomous agents like **OpenClaw** inside the project is strictly prohibited.
  - **Security Enforcement**: Unsecured HTTP ports, databases wide open to the public internet, PHP usage, or **leaked API keys** are automatically detected and can cause immediate project suspension.

