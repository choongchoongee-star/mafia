/**
 * @fileoverview Avalon Stage — Discord Voice & Video Call Client (`gemini-4-argon` Orchestration).
 */

const PHOTOREALISTIC_PORTRAIT_ANCHORS = {
  mc_jaesuk: '/generated/portrait_mc_jaesuk.png?v=4k_v2',
  idol_wonyoung: '/generated/portrait_idol_wonyoung.png?v=4k_v2',
  idol_karina: '/generated/portrait_idol_karina.png?v=4k_v2',
  idol_sullyoon: '/generated/portrait_idol_sullyoon.png?v=4k_v2',
  idol_yuna: '/generated/portrait_idol_yuna.png?v=4k_v2',
  idol_chaewon: '/generated/portrait_idol_chaewon.png?v=4k_v2',
  idol_hanni: '/generated/portrait_idol_hanni.png?v=4k_v2'
};

const state = {
  gameId: null,
  board: null,
  mcHost: null,
  players: [],
  humanPrivateView: null,
  transcript: [],
  currentVotes: {},
  xrayTelemetry: null,
  selectedProposalIds: new Set(),
  selectedTargetMemberId: '',
  activeSpeakerId: null,
  activeClashYielderId: null,
  activeSpeechText: '',
  activeSpeechStartTime: 0,
  activeSpeechEndTime: 0,
  activeSpeechCharIndex: 0,
  activeTargetPlayerId: null,
  audioEnabled: true,
  bgmEnabled: true,
  bgmUserPercent: 18,
  isBgmDucked: false,
  roleMasked: false,
  spoilersRevealed: false,
  localPhaseRemainingSec: 45,
  discussionElapsedSec: 0,
  lastAutoBeatSec: 0,
  lastTurnFinishedAt: 0,
  isBusyRequest: false,
  isWaitingServer: false,
  isPlayingAudio: false,
  autoStepAbortController: null,
  pendingHumanChatQueue: [],
  preferredRole: 'RANDOM',
  gameStartSeq: 0,
  portraitImages: new Map(),
  avatarAnimStates: new Map(),
  activeVideoStreams: new Map(),
  humanWebcamStream: null,
  bgmAudio: null,
  bgmAudioCtx: null,
  bgmGainNode: null,
  bgmSourceNode: null,
  bgmBufferCache: new Map(),
  currentBgmMood: null,
  playingBgmMood: null,
  turnAudioCache: new Map(),
  voiceGainNode: null,
  activeVoiceSourceNode: null,
  voiceAudioEl: null,
  activeVoiceBlobUrl: null,
  activeSpeechResolve: null,
  audioUnlocked: false,
  pendingAutoplayTurn: null
};

const MAX_BGM_LINEAR_GAIN = 0.025; // Capped at 2.5% linear amplitude (default 18% slider -> 0.0045 linear gain, ~-47 dB)

/**
 * Ensures the shared Web Audio API `AudioContext`, `bgmGainNode`, `voiceGainNode`,
 * and persistent `HTMLAudioElement` (`voiceAudioEl`) are initialized.
 * Only constructs `AudioContext` after a user gesture (`state.audioUnlocked`) to avoid browser console warnings.
 * @returns {AudioContext|null}
 */
function ensureAudioEngineReady() {
  if (!state.voiceAudioEl && typeof Audio !== 'undefined') {
    state.voiceAudioEl = new Audio();
    state.voiceAudioEl.preload = 'auto';
    state.voiceAudioEl.volume = 1.0;
  }
  if (!state.audioUnlocked) {
    return state.bgmAudioCtx;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (AudioCtx && !state.bgmAudioCtx) {
    try {
      state.bgmAudioCtx = new AudioCtx();
      state.bgmGainNode = state.bgmAudioCtx.createGain();
      state.bgmGainNode.gain.value = getEffectiveBgmGain();
      state.bgmGainNode.connect(state.bgmAudioCtx.destination);

      state.voiceGainNode = state.bgmAudioCtx.createGain();
      state.voiceGainNode.gain.value = 1.0;
      state.voiceGainNode.connect(state.bgmAudioCtx.destination);
    } catch {
      // Ignore AudioContext initialization errors
    }
  }
  return state.bgmAudioCtx;
}

/**
 * Caches a turn's synthesized `audioBase64` so it can be replayed from the chat transcript
 * even after older transcript items have their base64 stripped in subsequent payloads.
 * @param {object|null} turn
 */
function cacheTurnAudio(turn) {
  if (!turn || !turn.audioBase64) return;
  const payload = {
    audioBase64: turn.audioBase64,
    audioMimeType: turn.audioMimeType || 'audio/wav',
    audioDurationMs: turn.audioDurationMs || null,
    speakerId: turn.speakerId,
    speakerName: turn.speakerName,
    text: turn.text
  };
  if (turn.id) {
    state.turnAudioCache.set(turn.id, payload);
  }
  const textKey = `${turn.speakerId || ''}:${String(turn.text || '').slice(0, 120)}`;
  state.turnAudioCache.set(textKey, payload);
}

/**
 * Shows or hides a floating banner prompting the user to click once if browser autoplay blocked the initial greeting.
 * @param {boolean} show
 */
function showAutoplayUnlockBanner(show) {
  let banner = document.getElementById('autoplayUnlockBanner');
  if (!show) {
    if (banner) banner.remove();
    return;
  }
  if (!banner) {
    const topBar = document.querySelector('.stage-top-bar');
    if (!topBar) return;
    banner = document.createElement('button');
    banner.id = 'autoplayUnlockBanner';
    banner.type = 'button';
    banner.className = 'autoplay-unlock-banner';
    banner.innerHTML = '<span>🔊</span><span>Click anywhere to hear live character voices</span>';
    topBar.appendChild(banner);
  }
}

/**
 * Unlocks Web Audio API & HTMLAudioElement playback on the user's first interaction
 * and immediately replays any turn that was blocked by browser autoplay policy on page load.
 */
function setupAudioUnlockListeners() {
  const unlock = () => {
    const wasUnlocked = state.audioUnlocked;
    state.audioUnlocked = true;
    const ctx = ensureAudioEngineReady();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (!wasUnlocked) {
      syncPhaseAdaptiveBgm();
    }
    showAutoplayUnlockBanner(false);
    if (state.pendingAutoplayTurn && state.audioEnabled) {
      const queuedTurn = state.pendingAutoplayTurn;
      state.pendingAutoplayTurn = null;
      playTurnVoiceAndHighlight(queuedTurn);
    }
  };
  ['pointerdown', 'click', 'touchstart', 'keydown'].forEach((evtName) => {
    window.addEventListener(evtName, unlock, { passive: true });
  });
}

/**
 * Computes the effective linear BGM gain (0.0 to 0.025), applying gentle
 * 35% ducking (`* 0.65`) with a smooth 0.45s ramp so BGM never pumps or pops between turns.
 * @returns {number}
 */
function getEffectiveBgmGain() {
  if (!state.bgmEnabled || state.bgmUserPercent <= 0) return 0;
  const baseGain = (Math.min(100, Math.max(0, state.bgmUserPercent)) / 100) * MAX_BGM_LINEAR_GAIN;
  return state.isBgmDucked ? baseGain * 0.65 : baseGain;
}

/**
 * Applies the current BGM gain to both Web Audio `GainNode` (works on iOS Safari & Android)
 * and fallback `HTMLAudioElement.volume` using a smooth 0.45s exponential time constant.
 */
function applyBgmGain() {
  const gain = getEffectiveBgmGain();
  if (state.bgmGainNode && state.bgmAudioCtx) {
    try {
      state.bgmGainNode.gain.setTargetAtTime(gain, state.bgmAudioCtx.currentTime, 0.45);
    } catch {
      state.bgmGainNode.gain.value = gain;
    }
  }
  if (state.bgmAudio) {
    state.bgmAudio.volume = Math.min(1, Math.max(0, gain));
  }
}

/**
 * Gently ducks BGM volume while any AI Idol or MC Jae-ho is speaking.
 * @param {boolean} isDucked
 */
function setBgmDucking(isDucked) {
  state.isBgmDucked = Boolean(isDucked);
  applyBgmGain();
}

/**
 * Converts a raw decoded 30s `AudioBuffer` into a 100% seamless, gapless circular loop buffer:
 * 1. Trims 2.5s leading/trailing encoder & intro/outro transients.
 * 2. Scans 200ms RMS energy windows to find the most uniform 15.0s continuous groove,
 *    strictly rejecting any mid-track breakdown, hollow pause, or awkward dip.
 * 3. Smoothly normalizes local RMS variations (`0.76x–1.32x` clamped moving average).
 * 4. Applies a 3.0-second equal-power (`cos`/`sin`) circular crossfade so sample `N_loop - 1`
 *    and sample `0` are exact consecutive samples from the recording (zero seam, zero click, zero dead air).
 *
 * @param {AudioContext} audioCtx
 * @param {AudioBuffer} rawBuffer
 * @returns {AudioBuffer}
 */
function createSeamlessLoopBuffer(audioCtx, rawBuffer) {
  if (!audioCtx || !rawBuffer || rawBuffer.duration < 8) {
    return rawBuffer;
  }

  const sr = rawBuffer.sampleRate;
  const numChannels = rawBuffer.numberOfChannels;
  const totalSamples = rawBuffer.length;

  // 1. Trim intro and outro transients (2.5s head/tail)
  const trimSec = Math.min(2.5, rawBuffer.duration * 0.12);
  const bodyStart = Math.floor(trimSec * sr);
  const bodyEnd = Math.max(bodyStart + Math.floor(6 * sr), totalSamples - Math.floor(trimSec * sr));
  const bodyLength = bodyEnd - bodyStart;

  // 2. Compute 200ms sliding frame RMS across the body
  const frameSamples = Math.max(1, Math.floor(0.2 * sr));
  const numFrames = Math.floor(bodyLength / frameSamples);
  if (numFrames < 20) return rawBuffer;

  const ch0 = rawBuffer.getChannelData(0);
  const ch1 = numChannels > 1 ? rawBuffer.getChannelData(1) : ch0;
  const frameRms = new Float32Array(numFrames);

  for (let f = 0; f < numFrames; f += 1) {
    const startIdx = bodyStart + f * frameSamples;
    let sumSq = 0;
    for (let i = 0; i < frameSamples; i += 1) {
      const s = 0.5 * (ch0[startIdx + i] + ch1[startIdx + i]);
      sumSq += s * s;
    }
    frameRms[f] = Math.sqrt(sumSq / frameSamples);
  }

  const sortedRms = Array.from(frameRms).sort((a, b) => a - b);
  const medianRms = Math.max(1e-4, sortedRms[Math.floor(sortedRms.length * 0.55)]);

  // Select the most uniform 15.0s continuous window (avoiding any mid-track breakdown/dip)
  const targetRawSec = Math.min(15.0, (numFrames * frameSamples) / sr);
  const winFrames = Math.max(16, Math.min(numFrames, Math.floor(targetRawSec / 0.2)));

  let bestStartFrame = 0;
  let bestPenalty = Infinity;

  for (let startF = 0; startF <= numFrames - winFrames; startF += 1) {
    let penalty = 0;
    for (let k = 0; k < winFrames; k += 1) {
      const r = frameRms[startF + k];
      const ratio = r / medianRms;
      if (ratio < 0.68) {
        // Heavy penalty for any breakdown, drop-out, or hollow gap
        const deficit = 0.68 - ratio;
        penalty += deficit * deficit * 45;
      } else if (ratio > 1.45) {
        const excess = ratio - 1.45;
        penalty += excess * excess * 12;
      } else {
        const dev = ratio - 1.0;
        penalty += dev * dev;
      }
    }
    // Prefer windows whose start and loop-wrap regions have closely matched energy
    const seamDiff = Math.abs(frameRms[startF] - frameRms[startF + winFrames - 15]) / medianRms;
    penalty += seamDiff * 3.5;

    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestStartFrame = startF;
    }
  }

  // 3. Build smoothed per-frame envelope normalizer (5-frame = 1.0s moving average)
  const rawLoopSamples = winFrames * frameSamples;
  const segStartSample = bodyStart + bestStartFrame * frameSamples;
  const frameGain = new Float32Array(winFrames);

  for (let k = 0; k < winFrames; k += 1) {
    let sumRms = 0;
    let count = 0;
    for (let d = -2; d <= 2; d += 1) {
      const idx = Math.min(winFrames - 1, Math.max(0, k + d));
      sumRms += frameRms[bestStartFrame + idx];
      count += 1;
    }
    const localAvg = Math.max(1e-4, sumRms / count);
    const rawCorrection = medianRms / localAvg;
    frameGain[k] = Math.min(1.32, Math.max(0.76, rawCorrection));
  }

  // 4. Apply 3.0-second equal-power circular crossfade so sample (finalLoopSamples - 1) and sample 0 are adjacent
  const xfadeSec = Math.min(3.0, (rawLoopSamples / sr) * 0.22);
  const xfadeSamples = Math.floor(xfadeSec * sr);
  const finalLoopSamples = rawLoopSamples - xfadeSamples;
  if (finalLoopSamples <= sr * 3) return rawBuffer;

  const loopBuffer = audioCtx.createBuffer(numChannels, finalLoopSamples, sr);

  const getEnvelopeGainAtOffset = (offsetSample) => {
    const exactFrame = offsetSample / frameSamples;
    const f0 = Math.min(winFrames - 1, Math.max(0, Math.floor(exactFrame)));
    const f1 = Math.min(winFrames - 1, f0 + 1);
    const frac = exactFrame - f0;
    return frameGain[f0] * (1 - frac) + frameGain[f1] * frac;
  };

  for (let ch = 0; ch < numChannels; ch += 1) {
    const src = rawBuffer.getChannelData(ch);
    const dst = loopBuffer.getChannelData(ch);

    for (let i = 0; i < finalLoopSamples; i += 1) {
      if (i < xfadeSamples) {
        // Circular equal-power crossfade: at i=0, t=0 -> cos(0)=1 (tail sample finalLoopSamples), sin(0)=0
        const t = i / xfadeSamples;
        const angle = t * Math.PI * 0.5;
        const fadeIn = Math.sin(angle);
        const fadeOut = Math.cos(angle);

        const headOffset = i;
        const tailOffset = i + finalLoopSamples;

        const headSample = src[segStartSample + headOffset] * getEnvelopeGainAtOffset(headOffset);
        const tailSample = src[segStartSample + tailOffset] * getEnvelopeGainAtOffset(tailOffset);

        dst[i] = headSample * fadeIn + tailSample * fadeOut;
      } else {
        dst[i] = src[segStartSample + i] * getEnvelopeGainAtOffset(i);
      }
    }
  }

  return loopBuffer;
}

/**
 * Stops active BGM playback immediately.
 */
function stopBgmPlayback() {
  if (state.bgmSourceNode) {
    try {
      state.bgmSourceNode.stop();
      state.bgmSourceNode.disconnect();
    } catch {
      // Ignore already stopped source
    }
    state.bgmSourceNode = null;
  }
  if (state.bgmAudio) {
    state.bgmAudio.pause();
  }
  state.playingBgmMood = null;
}

/**
 * Preloads the 4K Korean K-Pop idol & MC Jae-suk portraits from `/generated/`.
 */
function preloadPortraitImages() {
  Object.entries(PHOTOREALISTIC_PORTRAIT_ANCHORS).forEach(([id, url]) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      state.portraitImages.set(id, img);
    };
  });
}

/**
 * Aborts any in-flight autonomous background `/discuss/step` poll so user-initiated
 * chat or button actions execute immediately without waiting or being dropped.
 */
function abortPendingAutoStep() {
  if (state.autoStepAbortController) {
    try {
      state.autoStepAbortController.abort();
    } catch {
      // Ignore abort errors
    }
    state.autoStepAbortController = null;
    state.isBusyRequest = false;
    state.isWaitingServer = false;
  }
}

/**
 * Updates `#humanChatInput.placeholder` dynamically per phase so the player knows
 * they can operate every phase directly from the chat window.
 */
function updateChatInputPlaceholder() {
  const inputEl = document.getElementById('humanChatInput');
  if (!inputEl || !state.board) return;
  const phase = state.board.phase;

  if (phase === 'TEAM_PROPOSAL') {
    if (state.board.leaderId === 'player_human') {
      inputEl.placeholder = `Crown Leader: Type e.g. "서영이랑 나 가자" or "제안" (${state.board.requiredTeamSize}P)...`;
    } else {
      inputEl.placeholder = `Waiting on ${state.board.leaderName} — type "제안" to speed up...`;
    }
  } else if (phase === 'DISCUSSION') {
    inputEl.placeholder = 'Debate in Korean/English, or type "투표 시작" / "찬성" / "반대"...';
  } else if (phase === 'TEAM_VOTE') {
    inputEl.placeholder = 'Team Vote: Type "찬성" (Approve) or "반대" (Reject)...';
  } else if (phase === 'QUEST_EXECUTION') {
    inputEl.placeholder = 'Quest Mission: Type "성공" (Success) or "실패" (Fail)...';
  } else if (phase === 'ASSASSIN_PHASE') {
    inputEl.placeholder = 'Assassin Shot: Type idol name e.g. "설아 암살" or "리나"...';
  } else if (phase === 'GAME_OVER') {
    inputEl.placeholder = 'Game Over: Type "새 게임" or "다시 시작" to play again...';
  } else {
    inputEl.placeholder = 'Message #avalon-stage-7p...';
  }
}

/**
 * Starts a new 7-player Avalon game session on the server.
 * @param {'STANDARD'|'QUEST_4_CRITICAL'|'ASSASSIN_CLIMAX'} [demoPreset='STANDARD']
 * @param {string|null} [preferredRoleOverride=null]
 */
async function startNewGame(demoPreset = 'STANDARD', preferredRoleOverride = null) {
  abortPendingAutoStep();
  const mySeq = (state.gameStartSeq || 0) + 1;
  state.gameStartSeq = mySeq;
  state.isBusyRequest = true;
  state.isWaitingServer = true;
  state.pendingHumanChatQueue = [];
  state.selectedProposalIds.clear();
  stopActiveSpeech();

  try {
    const preferredRole =
      preferredRoleOverride ||
      state.preferredRole ||
      document.getElementById('preferredRoleSelect')?.value ||
      document.getElementById('stageRoleSelect')?.value ||
      'RANDOM';
    state.preferredRole = preferredRole;

    const response = await fetch('/api/game/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: 'Guest',
        demoPreset,
        preferredRole,
        skipTts: !state.audioEnabled
      })
    });
    const data = await response.json();
    state.isWaitingServer = false;
    if (!response.ok) throw new Error(data.error || 'Failed to start game');
    if (mySeq !== state.gameStartSeq) return;

    applyServerGameState(data);
    resetPhaseClock(data.board.phaseTimerSec);
    // Release network lock immediately so user can click or chat while MC Jae-ho speaks!
    state.isBusyRequest = false;

    if (data.latestTurn) {
      await playTurnVoiceAndHighlight(data.latestTurn);
    }
    state.lastTurnFinishedAt = Date.now();

    if (
      mySeq === state.gameStartSeq &&
      state.board.phase === 'TEAM_PROPOSAL' &&
      state.board.leaderId !== 'player_human'
    ) {
      const targetGameId = state.gameId;
      setTimeout(() => {
        if (
          state.gameId === targetGameId &&
          state.board?.phase === 'TEAM_PROPOSAL' &&
          state.board.leaderId !== 'player_human'
        ) {
          triggerTeamProposal([]);
        }
      }, 900);
    }
  } catch (err) {
    console.error('Error starting new game:', err);
  } finally {
    state.isWaitingServer = false;
    if (mySeq === state.gameStartSeq) {
      state.isBusyRequest = false;
    }
  }
}

/**
 * Synchronizes local UI state with server response payload.
 * @param {object} data
 */
function applyServerGameState(data) {
  const previousPhase = state.board?.phase;
  state.gameId = data.gameId;
  state.board = data.board;
  state.mcHost = data.mcHost;
  state.players = data.players || [];
  state.humanPrivateView = data.humanPrivateView;
  state.transcript = data.transcript || [];
  state.currentVotes = data.currentVotes || {};
  state.xrayTelemetry = data.xrayTelemetry || null;

  [data.latestTurn, data.yieldTurn, data.leaderTurn, data.mcTurn, data.assassinTurn].forEach((t) =>
    cacheTurnAudio(t)
  );
  state.transcript.forEach((item) => {
    if (item.audioBase64) {
      cacheTurnAudio(item);
    } else {
      const textKey = `${item.speakerId || ''}:${String(item.text || '').slice(0, 120)}`;
      const cached = state.turnAudioCache.get(item.id) || state.turnAudioCache.get(textKey);
      if (cached) {
        item.audioBase64 = cached.audioBase64;
        item.audioMimeType = cached.audioMimeType;
        item.audioDurationMs = cached.audioDurationMs;
      }
    }
  });

  if (previousPhase !== state.board.phase) {
    resetPhaseClock(state.board.phaseTimerSec);
  }

  renderHeaderBoard();
  renderSecretRoleCard();
  renderPhaseActionBanner();
  renderZoomGrid();
  renderSidebarVoiceMembers();
  renderTranscriptAndXray();
  updateChatInputPlaceholder();
  syncPhaseAdaptiveBgm();
}

/**
 * Synchronizes phase-adaptive background music (`lyria-3.5` / `lyria-3-clip-preview`)
 * using a Web Audio API `AudioBufferSourceNode` + `createSeamlessLoopBuffer` + `GainNode` pipeline
 * so BGM loops seamlessly with zero mid-track dropouts and identical volume attenuation across desktop and mobile.
 */
async function syncPhaseAdaptiveBgm() {
  if (!state.board) return;
  if (!state.bgmEnabled || state.bgmUserPercent <= 0) {
    stopBgmPlayback();
    return;
  }

  const phase = state.board.phase;
  const mood =
    phase === 'ASSASSIN_PHASE' || state.board.currentQuestNumber >= 4
      ? 'assassin'
      : phase === 'QUEST_EXECUTION'
        ? 'quest'
        : phase === 'TEAM_VOTE'
          ? 'vote'
          : 'discussion';

  state.currentBgmMood = mood;

  if (state.playingBgmMood === mood && state.bgmSourceNode) {
    applyBgmGain();
    return;
  }

  // Wait for first user gesture to unlock Web Audio API so we never fall back to raw un-crossfaded <audio>
  const hasWebAudioSupport = Boolean(window.AudioContext || window.webkitAudioContext);
  if (hasWebAudioSupport && !state.audioUnlocked) {
    return;
  }

  try {
    const res = await fetch(`/api/media/bgm?mood=${encodeURIComponent(mood)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.bgmUrl || !state.bgmEnabled || state.bgmUserPercent <= 0) return;

    const ctx = ensureAudioEngineReady();
    if (ctx) {
      if (ctx.state === 'suspended' && state.audioUnlocked) {
        ctx.resume().catch(() => {});
      }

      let seamlessBuffer = state.bgmBufferCache.get(data.bgmUrl);
      if (!seamlessBuffer) {
        const audioRes = await fetch(data.bgmUrl);
        const arrayBuf = await audioRes.arrayBuffer();
        const rawBuffer = await state.bgmAudioCtx.decodeAudioData(arrayBuf);
        seamlessBuffer = createSeamlessLoopBuffer(state.bgmAudioCtx, rawBuffer);
        state.bgmBufferCache.set(data.bgmUrl, seamlessBuffer);
      }

      if (!state.bgmEnabled || state.bgmUserPercent <= 0 || state.currentBgmMood !== mood) {
        return;
      }

      stopBgmPlayback();
      const source = state.bgmAudioCtx.createBufferSource();
      source.buffer = seamlessBuffer;
      source.loop = true;
      source.connect(state.bgmGainNode);
      applyBgmGain();
      source.start(0);
      state.bgmSourceNode = source;
      state.playingBgmMood = mood;
    }
  } catch {
    // Ignore BGM fetch/decode errors
  }
}

/**
 * Resets the local phase countdown clock when entering a new phase.
 * @param {number} seconds
 */
function resetPhaseClock(seconds) {
  state.localPhaseRemainingSec = Number(seconds) || 45;
  state.discussionElapsedSec = 0;
  state.lastAutoBeatSec = 0;
  state.lastTurnFinishedAt = Date.now();
  updateTimerDisplay();
}

/**
 * Renders the 5-Quest Avalon Track (`2-3-3-4*-4`) and 5-Proposal Reject Track.
 */
function renderHeaderBoard() {
  const board = state.board;
  if (!board) return;

  const questContainer = document.getElementById('questTrackContainer');
  if (questContainer) {
    questContainer.innerHTML = board.quests
      .map((q) => {
        const statusClass =
          q.status === 'SUCCESS'
            ? 'success'
            : q.status === 'FAIL'
              ? 'fail'
              : q.questNumber === board.currentQuestNumber
                ? 'active'
                : '';
        const label =
          q.status === 'SUCCESS' ? 'PASS' : q.status === 'FAIL' ? 'FAIL' : `Q${q.questNumber}`;
        const sub = `${q.teamSize}P${q.failsRequired === 2 ? '*' : ''}`;
        return `
          <div class="quest-node ${statusClass}" title="${q.label}">
            <span class="q-title">${label}</span>
            <span class="q-sub">${sub}</span>
          </div>
        `;
      })
      .join('');
  }

  const rejectContainer = document.getElementById('rejectTrackContainer');
  if (rejectContainer) {
    const dots = [];
    for (let i = 1; i <= 5; i += 1) {
      const filled = i <= board.rejectTrack ? 'filled' : '';
      const hammerSlot = i === 5 ? 'hammer-slot' : '';
      dots.push(`<div class="reject-dot ${filled} ${hammerSlot}">${i}</div>`);
    }
    rejectContainer.innerHTML = dots.join('');
  }

  const hammerBadge = document.getElementById('hammerWarningBadge');
  if (hammerBadge) {
    hammerBadge.classList.toggle('hidden', !board.isHammerProposal);
  }

  const phaseLabel = document.getElementById('currentPhaseLabel');
  if (phaseLabel) {
    phaseLabel.textContent = board.phase.replace(/_/g, ' ');
  }

  const bystanderBadge = document.getElementById('bystanderStatusBadge');
  if (bystanderBadge) {
    const isBystander =
      board.phase === 'DISCUSSION' &&
      state.humanPrivateView &&
      state.discussionElapsedSec >= 22 &&
      (board.humanStats?.messagesThisRound || 0) === 0;
    bystanderBadge.classList.toggle('hidden', !isBystander);
  }
}

/**
 * Renders the connected voice members inside the left Discord sidebar.
 */
function renderSidebarVoiceMembers() {
  const listEl = document.getElementById('sidebarVoiceMembers');
  if (!listEl) return;

  const allCallParticipants = [
    {
      id: 'mc_jaesuk',
      name: state.mcHost?.name || 'MC Jae-ho',
      koreanName: state.mcHost?.koreanName || '유재호',
      namuwikiProfile: state.mcHost?.namuwikiProfile || null,
      tag: 'Host',
      avatar: PHOTOREALISTIC_PORTRAIT_ANCHORS.mc_jaesuk
    },
    ...state.players.map((p) => ({
      id: p.id,
      name: p.isHuman ? 'Guest (You)' : p.name,
      koreanName: p.koreanName || '',
      namuwikiProfile: p.namuwikiProfile || null,
      tag: state.board?.leaderId === p.id ? 'Leader' : p.isHuman ? 'You' : p.namuwikiProfile?.mbti?.split(' ')[0] || '',
      avatar: PHOTOREALISTIC_PORTRAIT_ANCHORS[p.id] || null
    }))
  ];

  listEl.innerHTML = allCallParticipants
    .map((m) => {
      const isSpeaking = state.activeSpeakerId === m.id;
      const displayName = m.koreanName ? `${m.name} (${m.koreanName})` : m.name;
      const namuTooltip = m.namuwikiProfile
        ? `[나무위키 프로필] Motif: ${m.namuwikiProfile.motif} | MBTI: ${m.namuwikiProfile.mbti} | Likes: ${(m.namuwikiProfile.favoriteFoods || []).join(', ')} | Nicknames: ${(m.namuwikiProfile.nicknames || []).join(', ')}`
        : displayName;
      const avatarHtml = m.avatar
        ? `<img class="vm-avatar" src="${m.avatar}" alt="${m.name}" />`
        : `<div class="vm-avatar" style="display:flex;align-items:center;justify-content:center;background:#5865f2;color:#fff;font-size:10px;font-weight:700;">G</div>`;
      return `
        <div class="voice-member-row ${isSpeaking ? 'speaking' : ''}" data-member-id="${m.id}" title="${namuTooltip.replace(/"/g, '&quot;')}">
          ${avatarHtml}
          <span class="vm-name">${displayName}</span>
          ${m.tag ? `<span class="vm-tag">${m.tag}</span>` : ''}
        </div>
      `;
    })
    .join('');

  listEl.querySelectorAll('.voice-member-row').forEach((row) => {
    row.addEventListener('click', () => {
      const id = row.dataset.memberId;
      if (id && id !== 'mc_jaesuk') {
        handleTileClick(id);
      }
    });
  });
}

/**
 * Renders the Human Player's assigned secret Avalon Role & Night Vision card.
 */
function renderSecretRoleCard() {
  const view = state.humanPrivateView;
  if (!view) return;

  const activePref = state.board?.preferredRole || state.preferredRole || 'RANDOM';
  const sidebarSelect = document.getElementById('preferredRoleSelect');
  if (sidebarSelect && sidebarSelect.value !== activePref) {
    sidebarSelect.value = activePref;
  }

  const roleTitle = document.getElementById('humanRoleTitle');
  const alignBadge = document.getElementById('humanAlignmentBadge');
  const visionText = document.getElementById('humanNightVisionText');
  const roleBody = document.getElementById('roleCardBody');
  const userSubStatus = document.getElementById('userRoleSubStatus');

  if (roleTitle) {
    roleTitle.textContent = state.roleMasked ? 'Hidden Role' : view.self.roleName;
  }
  if (alignBadge) {
    alignBadge.textContent = view.self.alignment === 'GOOD' ? 'Good' : 'Evil';
    alignBadge.className = `role-team-tag ${view.self.alignment === 'GOOD' ? 'good' : 'evil'}`;
  }
  if (visionText) {
    visionText.textContent = view.epistemicVision.nightVisionText;
  }
  if (roleBody) {
    roleBody.classList.toggle('role-masked', state.roleMasked);
  }
  if (userSubStatus) {
    userSubStatus.textContent = state.roleMasked ? 'Role Hidden' : view.self.roleName;
  }
}

/**
 * Renders the context-sensitive Phase Action Bar in the top header of the video stage.
 * All in-game phase progression buttons live inside `#bannerActionControls`.
 */
function renderPhaseActionBanner() {
  const board = state.board;
  if (!board) return;

  const badge = document.getElementById('bannerPhaseBadge');
  const instruction = document.getElementById('bannerInstructionText');
  const controls = document.getElementById('bannerActionControls');
  if (!badge || !instruction || !controls) return;

  badge.textContent = `Quest ${board.currentQuestNumber} (${board.requiredTeamSize}P)`;
  controls.innerHTML = '';

  if (board.phase === 'TEAM_PROPOSAL') {
    if (board.leaderId === 'player_human') {
      if (state.selectedProposalIds.size === 0) {
        state.selectedProposalIds.add('player_human');
      }
      const count = state.selectedProposalIds.size;
      const req = board.requiredTeamSize;
      instruction.textContent = `You are Leader — select ${req} tiles (${count}/${req} selected)`;
      const btn = document.createElement('button');
      btn.className = 'action-cta-btn blurple';
      btn.textContent = `Propose Team (${count}/${req})`;
      btn.onclick = () => triggerTeamProposal([...state.selectedProposalIds]);
      controls.appendChild(btn);
    } else {
      instruction.textContent = `Leader ${board.leaderName} is selecting ${board.requiredTeamSize} players for Quest ${board.currentQuestNumber}...`;
      const btn = document.createElement('button');
      btn.className = 'action-cta-btn blurple';
      btn.textContent = `✨ Let Leader Propose`;
      btn.onclick = () => triggerTeamProposal([]);
      controls.appendChild(btn);
    }
  } else if (board.phase === 'DISCUSSION') {
    const teamStr = board.proposedTeamNames.join(', ');
    instruction.textContent = `Proposed Team: ${teamStr}`;

    const nextBeatBtn = document.createElement('button');
    nextBeatBtn.className = 'action-cta-btn secondary';
    nextBeatBtn.textContent = '⏭️ Next Idol Turn';
    nextBeatBtn.title = 'Stay silent or advance to the next AI Idol reaction immediately';
    nextBeatBtn.onclick = () => {
      state.discussionElapsedSec = Math.max(state.discussionElapsedSec, 25);
      state.lastAutoBeatSec = state.discussionElapsedSec;
      triggerDiscussionStep(null);
    };

    const voteNowBtn = document.createElement('button');
    voteNowBtn.className = 'action-cta-btn blurple';
    voteNowBtn.textContent = '🗳️ Start Vote';
    voteNowBtn.title = 'End discussion and proceed to the 7-player Team Vote';
    voteNowBtn.onclick = () => triggerCallVotePhase();

    controls.appendChild(nextBeatBtn);
    controls.appendChild(voteNowBtn);
  } else if (board.phase === 'TEAM_VOTE') {
    const teamStr = board.proposedTeamNames.join(', ');
    instruction.textContent = `Vote on ${board.leaderName}'s Team [${teamStr}]:`;
    const approveBtn = document.createElement('button');
    approveBtn.className = 'action-cta-btn approve';
    approveBtn.textContent = '✅ Approve';
    approveBtn.onclick = () => triggerSubmitVote('APPROVE');

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'action-cta-btn reject';
    rejectBtn.textContent = '❌ Reject';
    rejectBtn.onclick = () => triggerSubmitVote('REJECT');

    controls.appendChild(approveBtn);
    controls.appendChild(rejectBtn);
  } else if (board.phase === 'QUEST_EXECUTION') {
    const humanOnMission = board.proposedTeamIds.includes('player_human');
    const humanAlignment = state.humanPrivateView?.self?.alignment || 'GOOD';

    if (humanOnMission) {
      instruction.textContent = `You are on Quest ${board.currentQuestNumber} — Submit your Quest card:`;
      const successBtn = document.createElement('button');
      successBtn.className = 'action-cta-btn approve';
      successBtn.textContent = '✅ Success';
      successBtn.onclick = () => triggerSubmitQuestCard('SUCCESS');
      controls.appendChild(successBtn);

      if (humanAlignment === 'EVIL') {
        const failBtn = document.createElement('button');
        failBtn.className = 'action-cta-btn reject';
        failBtn.textContent = '🗡️ Fail (Sabotage)';
        failBtn.onclick = () => triggerSubmitQuestCard('FAIL');
        controls.appendChild(failBtn);
      }
    } else {
      instruction.textContent = `Team [${board.proposedTeamNames.join(', ')}] is executing Quest ${board.currentQuestNumber}...`;
      const revealBtn = document.createElement('button');
      revealBtn.className = 'action-cta-btn blurple';
      revealBtn.textContent = '⚡ Reveal Outcome';
      revealBtn.onclick = () => triggerSubmitQuestCard('SUCCESS');
      controls.appendChild(revealBtn);
    }
  } else if (board.phase === 'ASSASSIN_PHASE') {
    const humanIsAssassin = state.humanPrivateView?.self?.roleId === 'ASSASSIN';
    if (humanIsAssassin) {
      instruction.textContent = `You are the Assassin — click a Good player's video tile to assassinate Merlin!`;
    } else {
      instruction.textContent = `Good passed 3 Quests — Assassin is choosing a target for Merlin...`;
      const fireBtn = document.createElement('button');
      fireBtn.className = 'action-cta-btn reject';
      fireBtn.textContent = '🗡️ Resolve Assassin Shot';
      fireBtn.onclick = () => triggerAssassination(null);
      controls.appendChild(fireBtn);
    }
  } else if (board.phase === 'GAME_OVER') {
    badge.textContent = `${board.winner} Victory`;
    instruction.textContent = board.winReason;
    const playAgainBtn = document.createElement('button');
    playAgainBtn.className = 'action-cta-btn blurple';
    playAgainBtn.textContent = '🔄 Play Again';
    playAgainBtn.onclick = () => startNewGame('STANDARD');
    controls.appendChild(playAgainBtn);
  }
}

/**
 * Renders the 8-Tile (4x2) 16:9 Discord Video Call Stage:
 * Tile 1: MC Jae-ho (Host)
 * Tiles 2–7: 6 K-Pop Idols (Seoyoung, Rina, Seol-ah, Yura, Chaerin, Hana)
 * Tile 8: Guest (Human Player)
 */
function renderZoomGrid() {
  const container = document.getElementById('zoomGridContainer');
  if (!container || !state.players.length || !state.board) return;

  const board = state.board;
  const epistemic = state.humanPrivateView?.epistemicVision || {};

  const allTiles = [
    {
      id: 'mc_jaesuk',
      name: state.mcHost?.name || 'MC Jae-ho',
      koreanName: state.mcHost?.koreanName || '유재호',
      namuwikiProfile: state.mcHost?.namuwikiProfile || null,
      isMc: true,
      isHuman: false
    },
    ...state.players.map((p) => ({
      ...p,
      isMc: false
    }))
  ];

  if (container.children.length !== allTiles.length) {
    container.innerHTML = allTiles
      .map((participant) => {
        const displayName = participant.isHuman
          ? 'Guest (You)'
          : participant.koreanName
            ? `${participant.name} (${participant.koreanName})`
            : participant.name;
        const namu = participant.namuwikiProfile;
        const namuTooltip = namu
          ? `[나무위키 프로필] Motif: ${namu.motif} | MBTI: ${namu.mbti} | Favorite Foods: ${(namu.favoriteFoods || []).join(', ')} | Nicknames: ${(namu.nicknames || []).join(', ')} | Habit: ${namu.iconicHabits || ''}`
          : displayName;
        return `
        <div class="zoom-tile" id="tile_${participant.id}" data-player-id="${participant.id}" title="${namuTooltip.replace(/"/g, '&quot;')}">
          <div class="tile-media-layer">
            <canvas id="canvas_${participant.id}" width="640" height="360"></canvas>
            <video id="video_${participant.id}" class="hidden" autoplay loop muted playsinline></video>
          </div>
          <div class="tile-top-overlays">
            <div class="tile-badges-left" id="badges_left_${participant.id}"></div>
            <div class="tile-badges-right" id="badges_right_${participant.id}"></div>
          </div>
          <div class="tile-live-caption hidden" id="caption_${participant.id}"></div>
          <div class="tile-bottom-pill">
            <div class="audio-waveform-bars">
              <span></span><span></span><span></span><span></span>
            </div>
            <span class="tile-participant-name">${displayName}</span>
          </div>
        </div>
      `;
      })
      .join('');

    allTiles.forEach((participant) => {
      const tileEl = document.getElementById(`tile_${participant.id}`);
      if (tileEl) {
        tileEl.addEventListener('click', () => {
          if (participant.isMc) return;
          handleTileClick(participant.id);
        });
      }
    });
  }

  // Latest spoken turn per participant
  const latestSpokenByPlayer = {};
  state.transcript.slice(-10).forEach((t) => {
    latestSpokenByPlayer[t.speakerId] = t;
  });

  // Map latest 6-agent parallel floor bids by speakerId
  const latestBidsByPlayer = {};
  (board.lastAgentBids || []).forEach((b) => {
    latestBidsByPlayer[b.speakerId] = b;
  });

  allTiles.forEach((participant) => {
    const tileEl = document.getElementById(`tile_${participant.id}`);
    const leftBadges = document.getElementById(`badges_left_${participant.id}`);
    const rightBadges = document.getElementById(`badges_right_${participant.id}`);
    const captionEl = document.getElementById(`caption_${participant.id}`);
    if (!tileEl || !leftBadges || !rightBadges || !captionEl) return;

    const isSpeaking = state.activeSpeakerId === participant.id;
    const isProposed = !participant.isMc && board.proposedTeamIds.includes(participant.id);
    const isSelectedForProposal =
      !participant.isMc &&
      board.phase === 'TEAM_PROPOSAL' &&
      board.leaderId === 'player_human' &&
      state.selectedProposalIds.has(participant.id);

    tileEl.classList.toggle('speaking-now', isSpeaking);
    tileEl.classList.toggle('on-proposed-team', isProposed);
    tileEl.classList.toggle('selected-for-proposal', isSelectedForProposal);

    const leftHtml = [];
    if (participant.isMc) {
      leftHtml.push('<span class="tile-badge">🎙️ Variety Host • ISFP</span>');
    } else {
      if (board.leaderId === participant.id) {
        leftHtml.push('<span class="tile-badge leader-crown">👑 Leader</span>');
      }
      if (isProposed) {
        leftHtml.push('<span class="tile-badge team-shield">🛡️ On Quest</span>');
      } else if (isSelectedForProposal) {
        leftHtml.push('<span class="tile-badge leader-crown">✓ Selected</span>');
      }
      if (participant.dialectTag) {
        const compactDialect = participant.dialectTag.replace(/\s*\([^)]*\)/g, '').trim();
        const mbtiShort = participant.namuwikiProfile?.mbti?.split(' ')[0] || '';
        leftHtml.push(
          `<span class="tile-badge">${compactDialect}${mbtiShort ? ` • ${mbtiShort}` : ''}</span>`
        );
      }
    }
    leftBadges.innerHTML = leftHtml.join('');

    const rightHtml = [];
    if (!participant.isMc) {
      if (!state.roleMasked) {
        if (
          epistemic.knownEvilIds?.includes(participant.id) ||
          epistemic.knownEvilTeammateIds?.includes(participant.id)
        ) {
          rightHtml.push('<span class="tile-badge epistemic-evil">Evil</span>');
        } else if (epistemic.merlinCandidateIds?.includes(participant.id)) {
          rightHtml.push('<span class="tile-badge epistemic-merlin-cand">Merlin?</span>');
        }
      }

      if (board.phase === 'GAME_OVER' && state.xrayTelemetry?.trueRoles) {
        const trueRole = state.xrayTelemetry.trueRoles.find((r) => r.playerId === participant.id);
        if (trueRole) {
          const cls = trueRole.alignment === 'GOOD' ? 'vote-approve' : 'vote-reject';
          rightHtml.push(`<span class="tile-badge ${cls}">${trueRole.roleName}</span>`);
        }
      } else if (state.currentVotes && state.currentVotes[participant.id]) {
        const v = state.currentVotes[participant.id].vote;
        const cls = v === 'APPROVE' ? 'vote-approve' : 'vote-reject';
        rightHtml.push(`<span class="tile-badge ${cls}">${v === 'APPROVE' ? 'Approved' : 'Rejected'}</span>`);
      } else if (board.phase === 'DISCUSSION' && !participant.isHuman) {
        const bid = latestBidsByPlayer[participant.id];
        if (
          state.activeClashYielderId === participant.id ||
          board.lastFloorEvent?.yielderId === participant.id
        ) {
          rightHtml.push('<span class="tile-badge epistemic-merlin-cand">🤝 Yielded Mic</span>');
        } else if (bid && !isSpeaking) {
          if (bid.intent === 'INTERRUPT' && bid.urgency >= 70) {
            rightHtml.push('<span class="tile-badge vote-reject">✋ Wants Mic</span>');
          } else if (bid.intent === 'HOLD_SILENT') {
            rightHtml.push('<span class="tile-badge">🤫 Strategic Silence</span>');
          }
        }
      }
    }
    rightBadges.innerHTML = rightHtml.join('');

    // Show clean closed-caption overlay for active speaker or latest dialect turn during DISCUSSION
    const lastTurn = latestSpokenByPlayer[participant.id];
    if (lastTurn && (isSpeaking || (board.phase === 'DISCUSSION' && state.transcript.slice(-2).some((t) => t.id === lastTurn.id)))) {
      captionEl.textContent = lastTurn.text;
      captionEl.classList.remove('hidden');
    } else {
      captionEl.classList.add('hidden');
    }
  });
}

/**
 * Handles clicking on a player's video tile:
 * - During TEAM_PROPOSAL when Human is Leader: toggles selecting that player for the Quest Team.
 * - During ASSASSIN_PHASE when Human is Assassin: shoots that player as Merlin.
 * @param {string} playerId
 */
function handleTileClick(playerId) {
  const board = state.board;
  if (!board) return;

  if (board.phase === 'TEAM_PROPOSAL' && board.leaderId === 'player_human') {
    if (state.selectedProposalIds.has(playerId)) {
      state.selectedProposalIds.delete(playerId);
    } else if (state.selectedProposalIds.size < board.requiredTeamSize) {
      state.selectedProposalIds.add(playerId);
    }
    renderPhaseActionBanner();
    renderZoomGrid();
    return;
  }

  if (
    board.phase === 'ASSASSIN_PHASE' &&
    state.humanPrivateView?.self?.roleId === 'ASSASSIN' &&
    playerId !== 'player_human'
  ) {
    triggerAssassination(playerId);
  }
}

/**
 * Renders the Discord Voice Text-Chat messages and Judge X-Ray Inspector panels.
 */
function renderTranscriptAndXray() {
  const transcriptList = document.getElementById('transcriptList');
  if (transcriptList) {
    // Render in chronological order like real Discord chat and scroll to bottom
    transcriptList.innerHTML = state.transcript
      .map((item) => {
        const avatarUrl = PHOTOREALISTIC_PORTRAIT_ANCHORS[item.speakerId];
        const authorClass =
          item.speakerId === 'mc_jaesuk'
            ? 'mc'
            : item.speakerId === 'player_human'
              ? 'human'
              : '';
        const avatarEl = avatarUrl
          ? `<img class="msg-avatar" src="${avatarUrl}" alt="${item.speakerName}" />`
          : `<div class="msg-avatar-fallback">G</div>`;
        const dialectHtml = item.dialectTag
          ? `<span class="msg-meta">${item.dialectTag}</span>`
          : '';
        const isYieldEvent =
          item.floorEventType === 'COLLISION_YIELD' || item.floorEventType === 'MIC_CLASH_YIELD';
        const isWinnerEvent =
          item.floorEventType === 'COLLISION_WINNER' || item.floorEventType === 'MIC_CLASH_WINNER';
        const floorBadgeHtml = isYieldEvent
          ? '<span class="msg-meta" style="color:#f59e0b">⚡ Mic Clash → Yielded</span>'
          : isWinnerEvent
            ? '<span class="msg-meta" style="color:#4ade80">🎙️ Took Floor After Yield</span>'
            : '';

        const replayBtnHtml =
          item.speakerId !== 'player_human'
            ? `<button type="button" class="msg-replay-btn" data-replay-id="${item.id}" title="Play / Replay Character Voice">🔊</button>`
            : '';

        return `
          <div class="discord-msg">
            ${avatarEl}
            <div class="msg-body">
              <div class="msg-header">
                <span class="msg-author ${authorClass}">${item.speakerName}</span>
                <span class="msg-meta">Q${item.questNumber}</span>
                ${dialectHtml}
                ${floorBadgeHtml}
                ${replayBtnHtml}
              </div>
              <div class="msg-text">${item.text}</div>
            </div>
          </div>
        `;
      })
      .join('');
    transcriptList.scrollTop = transcriptList.scrollHeight;
  }

  const xray = state.xrayTelemetry;
  if (!xray) return;

  const verifyList = document.getElementById('verificationLogList');
  if (verifyList) {
    verifyList.innerHTML = (xray.verificationLogs || [])
      .slice()
      .reverse()
      .map(
        (v) => `
        <div class="xray-card">
          <div><strong>${v.speakerName}</strong> <span class="msg-meta">(${v.roleName})</span></div>
          <div class="t-verify">${v.note}</div>
        </div>
      `
      )
      .join('');
  }

  const monologueList = document.getElementById('innerMonologueList');
  if (monologueList) {
    const bidsHtml =
      xray.lastAgentBids && xray.lastAgentBids.length > 0
        ? `
        <div class="xray-card" style="border-left: 3px solid #5865f2;">
          <div><strong>6-Agent Parallel Floor Bids (Promise.all)</strong></div>
          ${xray.lastAgentBids
            .map(
              (b) => `
            <div class="xray-thought" style="margin-top:3px;">
              <strong>${b.speakerName}</strong> [${b.intent} • Urgency ${b.urgency}]: "${b.innerThought}"
            </div>`
            )
            .join('')}
        </div>
      `
        : '';

    const monologuesHtml = (xray.recentInnerMonologues || [])
      .slice()
      .reverse()
      .map(
        (m) => `
        <div class="xray-card">
          <div><strong>${m.speakerName}</strong> <span class="msg-meta">[${m.roleName} • ${m.modelUsed}]</span></div>
          <div class="xray-thought">Thought: "${m.privateInnerThought}"</div>
          <div class="msg-text" style="margin-top:4px;">Speech: "${m.publicSpeech}"</div>
        </div>
      `
      )
      .join('');

    monologueList.innerHTML = bidsHtml + monologuesHtml;
  }

  const trueRolesContainer = document.getElementById('trueRolesContainer');
  if (trueRolesContainer) {
    trueRolesContainer.innerHTML = (xray.trueRoles || [])
      .map(
        (r) => `
        <div class="true-role-chip">
          <strong>${r.playerName}:</strong>
          <span style="color:${r.alignment === 'GOOD' ? '#4ade80' : '#f87171'}">${r.roleName}</span>
        </div>
      `
      )
      .join('');
  }

  const namuwikiCastContainer = document.getElementById('namuwikiCastContainer');
  if (namuwikiCastContainer) {
    namuwikiCastContainer.innerHTML = (state.players || [])
      .filter((p) => !p.isHuman && p.namuwikiProfile)
      .map(
        (p) => `
        <div class="xray-card" style="border-left: 3px solid ${p.avatarColor || '#ec4899'};">
          <div><strong>${p.name} (${p.koreanName || ''})</strong> <span class="msg-meta">${p.dialectTag || ''} • ${p.namuwikiProfile.mbti || ''}</span></div>
          <div class="xray-thought">별명: ${(p.namuwikiProfile.nicknames || []).join(', ')}</div>
          <div class="msg-text" style="font-size:11px; margin-top:2px;">최애 음식: ${(p.namuwikiProfile.favoriteFoods || []).join(', ')}</div>
          <div class="msg-text" style="font-size:11px; color:#94a3b8; margin-top:2px;">특징: ${p.namuwikiProfile.iconicHabits || ''}</div>
        </div>
      `
      )
      .join('');
  }
}

/**
 * Triggers the Leader's Quest Team Proposal on the server.
 * @param {string[]} proposedTeamIds
 */
async function triggerTeamProposal(proposedTeamIds = []) {
  if (!state.gameId || state.isBusyRequest) return;
  state.isBusyRequest = true;
  state.isWaitingServer = true;
  try {
    const res = await fetch(`/api/game/${state.gameId}/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposedTeamIds,
        skipTts: !state.audioEnabled
      })
    });
    const data = await res.json();
    state.isWaitingServer = false;
    if (res.ok) {
      applyServerGameState(data);
      const turnToPlay = data.leaderTurn || data.mcTurn || data.latestTurn;
      if (turnToPlay) {
        await playTurnVoiceAndHighlight(turnToPlay);
      }
      state.lastTurnFinishedAt = Date.now();
    }
  } catch (err) {
    console.error('Proposal error:', err);
  } finally {
    state.isWaitingServer = false;
    state.isBusyRequest = false;
  }
}

/**
 * Advances one live 6-Agent Multi-Agent Debate step during the DISCUSSION phase.
 * Supports simultaneous Mic Clash & Polite Yield (`data.yieldTurn` -> `data.latestTurn`).
 * @param {string|null} [humanMessage=null]
 */
async function triggerDiscussionStep(humanMessage = null) {
  if (!state.gameId || state.isBusyRequest) return;
  if (state.board?.phase !== 'DISCUSSION') return;

  // If the human player actively speaks when under 35s remain, grant +20s (up to 180s max)
  if (humanMessage && state.localPhaseRemainingSec < 35) {
    state.localPhaseRemainingSec = Math.min(180, state.localPhaseRemainingSec + 20);
    updateTimerDisplay();
  }

  state.isBusyRequest = true;
  state.isWaitingServer = true;
  try {
    const res = await fetch(`/api/game/${state.gameId}/discuss/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        humanMessage,
        targetMemberId: null,
        elapsedRoundSec: state.discussionElapsedSec,
        skipTts: !state.audioEnabled
      })
    });
    const data = await res.json();
    state.isWaitingServer = false;
    if (res.ok) {
      applyServerGameState(data);
      if (data.yieldTurn) {
        state.activeClashYielderId = data.yieldTurn.speakerId;
        await playTurnVoiceAndHighlight(data.yieldTurn);
        state.activeClashYielderId = null;
      }
      if (data.latestTurn) {
        await playTurnVoiceAndHighlight(data.latestTurn);
      }
      state.lastTurnFinishedAt = Date.now();
    }
  } catch (err) {
    console.error('Discussion step error:', err);
  } finally {
    state.isWaitingServer = false;
    state.isBusyRequest = false;
  }
}

/**
 * Transitions from DISCUSSION to TEAM_VOTE (30s timer).
 */
async function triggerCallVotePhase() {
  if (!state.gameId || state.isBusyRequest) return;
  state.isBusyRequest = true;
  state.isWaitingServer = true;
  stopActiveSpeech();
  try {
    const res = await fetch(`/api/game/${state.gameId}/call-vote`, {
      method: 'POST'
    });
    const data = await res.json();
    state.isWaitingServer = false;
    if (res.ok) {
      applyServerGameState(data);
      state.lastTurnFinishedAt = Date.now();
    }
  } catch (err) {
    console.error('Call vote error:', err);
  } finally {
    state.isWaitingServer = false;
    state.isBusyRequest = false;
  }
}

/**
 * Submits the Human Player's APPROVE/REJECT vote and resolves all 7 votes simultaneously.
 * @param {'APPROVE'|'REJECT'|null} humanVote
 */
async function triggerSubmitVote(humanVote = null) {
  if (!state.gameId || state.isBusyRequest) return;
  state.isBusyRequest = true;
  state.isWaitingServer = true;
  try {
    const res = await fetch(`/api/game/${state.gameId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        humanVote,
        skipTts: !state.audioEnabled
      })
    });
    const data = await res.json();
    state.isWaitingServer = false;
    if (res.ok) {
      applyServerGameState(data);
      if (data.latestTurn) {
        await playTurnVoiceAndHighlight(data.latestTurn);
      }
      state.lastTurnFinishedAt = Date.now();
      if (
        state.board.phase === 'TEAM_PROPOSAL' &&
        state.board.leaderId !== 'player_human'
      ) {
        setTimeout(() => {
          if (state.board?.phase === 'TEAM_PROPOSAL' && state.board.leaderId !== 'player_human') {
            triggerTeamProposal([]);
          }
        }, 1200);
      }
      if (
        state.board.phase === 'QUEST_EXECUTION' &&
        !state.board.proposedTeamIds.includes('player_human')
      ) {
        setTimeout(() => {
          if (state.board?.phase === 'QUEST_EXECUTION') {
            triggerSubmitQuestCard('SUCCESS');
          }
        }, 1200);
      }
    }
  } catch (err) {
    console.error('Vote submission error:', err);
  } finally {
    state.isWaitingServer = false;
    state.isBusyRequest = false;
  }
}

/**
 * Submits the Quest Card (`SUCCESS` or `FAIL`) and resolves the Quest outcome.
 * @param {'SUCCESS'|'FAIL'|null} humanQuestCard
 */
async function triggerSubmitQuestCard(humanQuestCard = 'SUCCESS') {
  if (!state.gameId || state.isBusyRequest) return;
  state.isBusyRequest = true;
  state.isWaitingServer = true;
  try {
    const res = await fetch(`/api/game/${state.gameId}/quest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        humanQuestCard,
        skipTts: !state.audioEnabled
      })
    });
    const data = await res.json();
    state.isWaitingServer = false;
    if (res.ok) {
      applyServerGameState(data);
      if (data.latestTurn) {
        await playTurnVoiceAndHighlight(data.latestTurn);
      }
      state.lastTurnFinishedAt = Date.now();
      if (
        state.board.phase === 'TEAM_PROPOSAL' &&
        state.board.leaderId !== 'player_human'
      ) {
        setTimeout(() => {
          if (state.board?.phase === 'TEAM_PROPOSAL' && state.board.leaderId !== 'player_human') {
            triggerTeamProposal([]);
          }
        }, 1200);
      }
      if (
        state.board.phase === 'ASSASSIN_PHASE' &&
        state.humanPrivateView?.self?.roleId !== 'ASSASSIN'
      ) {
        setTimeout(() => {
          if (state.board?.phase === 'ASSASSIN_PHASE') {
            triggerAssassination(null);
          }
        }, 1500);
      }
    }
  } catch (err) {
    console.error('Quest execution error:', err);
  } finally {
    state.isWaitingServer = false;
    state.isBusyRequest = false;
  }
}

/**
 * Executes the Final Assassin Shot at Merlin.
 * @param {string|null} targetPlayerId
 */
async function triggerAssassination(targetPlayerId = null) {
  if (!state.gameId || state.isBusyRequest) return;
  state.isBusyRequest = true;
  state.isWaitingServer = true;
  try {
    const res = await fetch(`/api/game/${state.gameId}/assassinate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetPlayerId,
        skipTts: !state.audioEnabled
      })
    });
    const data = await res.json();
    state.isWaitingServer = false;
    if (res.ok) {
      applyServerGameState(data);
      if (data.assassinTurn) {
        await playTurnVoiceAndHighlight(data.assassinTurn);
      }
      if (data.latestTurn && data.latestTurn.id !== data.assassinTurn?.id) {
        await playTurnVoiceAndHighlight(data.latestTurn);
      }
      state.lastTurnFinishedAt = Date.now();
    }
  } catch (err) {
    console.error('Assassination error:', err);
  } finally {
    state.isWaitingServer = false;
    state.isBusyRequest = false;
  }
}

/**
 * Converts a base64 string into a `Uint8Array` for Web Audio / Blob playback.
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToUint8Array(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Stops any currently playing voice audio node/element without clearing new speaker state.
 */
function stopActiveVoiceAudioOnly() {
  if (state.activeVoiceSourceNode) {
    try {
      state.activeVoiceSourceNode.onended = null;
      state.activeVoiceSourceNode.stop();
      state.activeVoiceSourceNode.disconnect();
    } catch {
      // Ignore already stopped source
    }
    state.activeVoiceSourceNode = null;
  }
  if (state.voiceAudioEl) {
    try {
      state.voiceAudioEl.onended = null;
      state.voiceAudioEl.onerror = null;
      state.voiceAudioEl.pause();
    } catch {
      // Ignore pause errors
    }
  }
  if (state.activeVoiceBlobUrl) {
    try {
      URL.revokeObjectURL(state.activeVoiceBlobUrl);
    } catch {
      // Ignore revoke errors
    }
    state.activeVoiceBlobUrl = null;
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore speechSynthesis errors
    }
  }
  if (typeof state.activeSpeechResolve === 'function') {
    const prevResolve = state.activeSpeechResolve;
    state.activeSpeechResolve = null;
    prevResolve();
  }
}

/**
 * Plays a turn using the browser's built-in `window.speechSynthesis` neural voices as a fallback.
 * @param {object} turn
 * @param {number} estimatedDurationMs
 * @returns {Promise<void>}
 */
function playBrowserSpeechFallback(turn, estimatedDurationMs) {
  const text = String(turn.text || '');
  if (!('speechSynthesis' in window) || !text) {
    if (state.activeSpeakerId === turn.speakerId) {
      clearActiveSpeakerState();
    } else {
      setBgmDucking(false);
    }
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';

      const voices = window.speechSynthesis.getVoices();
      const playerObj = state.players.find((p) => p.id === turn.speakerId);

      if (turn.speakerId === 'mc_jaesuk') {
        const maleVoice = voices.find(
          (v) => /en/i.test(v.lang) && /(male|david|guy|daniel|mark|google us english)/i.test(v.name)
        );
        if (maleVoice) utterance.voice = maleVoice;
        utterance.pitch = 1.05;
        utterance.rate = 1.08;
      } else {
        const femaleVoices = voices.filter(
          (v) => /en/i.test(v.lang) && /(female|zira|samantha|aria|jenny|victoria|google)/i.test(v.name)
        );
        const seatIdx = playerObj?.seatIndex || 0;
        if (femaleVoices.length > 0) {
          utterance.voice = femaleVoices[seatIdx % femaleVoices.length];
        }
        utterance.pitch = playerObj?.pitchOffset || 1.08;
        utterance.rate = playerObj?.rateOffset || 1.04;
      }

      utterance.onboundary = (event) => {
        if (typeof event.charIndex === 'number') {
          state.activeSpeechCharIndex = event.charIndex;
        }
      };

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (state.activeSpeechResolve === finish) {
          state.activeSpeechResolve = null;
        }
        if (state.activeSpeakerId === turn.speakerId) {
          clearActiveSpeakerState();
        } else {
          setBgmDucking(false);
        }
        resolve();
      };

      state.activeSpeechResolve = finish;
      utterance.onend = finish;
      utterance.onerror = finish;
      setTimeout(finish, estimatedDurationMs + 1500);
      window.speechSynthesis.speak(utterance);
    } catch {
      if (state.activeSpeakerId === turn.speakerId) {
        clearActiveSpeakerState();
      } else {
        setBgmDucking(false);
      }
      resolve();
    }
  });
}

/**
 * Plays the character's spoken audio (`gemini-3.8-flash-tts` or browser neural TTS),
 * highlights their Discord tile, and returns a Promise that resolves when speech finishes.
 * @param {object} turn
 * @returns {Promise<void>}
 */
async function playTurnVoiceAndHighlight(turn) {
  if (!turn) return;
  stopActiveVoiceAudioOnly();

  const text = String(turn.text || '');
  const textKey = `${turn.speakerId || ''}:${text.slice(0, 120)}`;
  const cachedAudio = state.turnAudioCache.get(turn.id) || state.turnAudioCache.get(textKey);
  const audioBase64 = turn.audioBase64 || cachedAudio?.audioBase64 || null;
  const audioMimeType = turn.audioMimeType || cachedAudio?.audioMimeType || 'audio/wav';
  const serverDurationMs = Number(turn.audioDurationMs || cachedAudio?.audioDurationMs || 0);

  if (audioBase64) {
    cacheTurnAudio({
      ...turn,
      audioBase64,
      audioMimeType,
      audioDurationMs: serverDurationMs || undefined
    });
  }

  state.activeSpeakerId = turn.speakerId;
  state.activeSpeechText = text;
  state.activeSpeechStartTime = Date.now();
  state.activeSpeechCharIndex = 0;
  state.activeTargetPlayerId = turn.targetPlayerId || null;

  const isYieldTurn = turn.floorEventType === 'COLLISION_YIELD';
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const fallbackDurationMs = isYieldTurn
    ? Math.max(1800, Math.min(4500, wordCount * 320))
    : Math.max(3200, Math.min(18000, wordCount * 380));
  const estimatedDurationMs = serverDurationMs > 400 ? serverDurationMs : fallbackDurationMs;
  state.activeSpeechEndTime = Date.now() + estimatedDurationMs;

  renderZoomGrid();
  renderSidebarVoiceMembers();

  if (!state.audioEnabled) {
    await new Promise((resolve) => {
      setTimeout(() => {
        if (state.activeSpeakerId === turn.speakerId) {
          clearActiveSpeakerState();
        }
        resolve();
      }, Math.min(estimatedDurationMs, isYieldTurn ? 1500 : 2800));
    });
    return;
  }

  setBgmDucking(true);
  const ctx = ensureAudioEngineReady();

  if (audioBase64) {
    try {
      const wavBytes = base64ToUint8Array(audioBase64);

      // 1. If Web Audio API AudioContext is unlocked & running, decode and play directly through voiceGainNode
      if (ctx) {
        if (ctx.state === 'suspended' && state.audioUnlocked) {
          await ctx.resume().catch(() => {});
        }
        if (ctx.state === 'running' && state.voiceGainNode) {
          try {
            const arrayBuf = wavBytes.buffer.slice(
              wavBytes.byteOffset,
              wavBytes.byteOffset + wavBytes.byteLength
            );
            const audioBuffer = await ctx.decodeAudioData(arrayBuf);
            const durationMs = Math.max(800, Math.round(audioBuffer.duration * 1000));
            state.activeSpeechEndTime = Date.now() + durationMs;

            await new Promise((resolve) => {
              let settled = false;
              const finish = () => {
                if (settled) return;
                settled = true;
                if (state.activeSpeechResolve === finish) {
                  state.activeSpeechResolve = null;
                }
                state.activeVoiceSourceNode = null;
                if (state.activeSpeakerId === turn.speakerId) {
                  clearActiveSpeakerState();
                } else {
                  setBgmDucking(false);
                }
                resolve();
              };

              state.activeSpeechResolve = finish;
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(state.voiceGainNode);
              source.onended = finish;
              state.activeVoiceSourceNode = source;
              setTimeout(finish, durationMs + 1500);
              source.start(0);
            });
            return;
          } catch {
            // Fall through to HTMLAudioElement Blob playback if decodeAudioData fails
          }
        }
      }

      // 2. Play via persistent HTMLAudioElement with Blob URL (handles initial page load & detects Autoplay blocks)
      const blob = new Blob([wavBytes], { type: audioMimeType });
      const blobUrl = URL.createObjectURL(blob);
      state.activeVoiceBlobUrl = blobUrl;
      const audio = state.voiceAudioEl || new Audio();
      state.voiceAudioEl = audio;
      audio.src = blobUrl;
      audio.volume = 1.0;

      const playedViaElement = await new Promise((resolve) => {
        let settled = false;
        let safetyTimer = null;
        const finish = (didPlay) => {
          if (settled) return;
          settled = true;
          if (safetyTimer) clearTimeout(safetyTimer);
          if (state.activeSpeechResolve === finishAsResolved) {
            state.activeSpeechResolve = null;
          }
          if (state.activeVoiceBlobUrl === blobUrl) {
            URL.revokeObjectURL(blobUrl);
            state.activeVoiceBlobUrl = null;
          }
          if (didPlay) {
            if (state.activeSpeakerId === turn.speakerId) {
              clearActiveSpeakerState();
            } else {
              setBgmDucking(false);
            }
          }
          resolve(didPlay);
        };
        const finishAsResolved = () => finish(true);
        state.activeSpeechResolve = finishAsResolved;

        audio.onloadedmetadata = () => {
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            const realDurationMs = Math.round(audio.duration * 1000);
            state.activeSpeechEndTime = Date.now() + realDurationMs;
            if (safetyTimer) clearTimeout(safetyTimer);
            safetyTimer = setTimeout(() => finish(true), realDurationMs + 2000);
          }
        };
        audio.onended = () => finish(true);
        audio.onerror = () => finish(false);
        safetyTimer = setTimeout(() => finish(true), estimatedDurationMs + 2500);

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              state.audioUnlocked = true;
              showAutoplayUnlockBanner(false);
            })
            .catch((err) => {
              if (err && err.name === 'NotAllowedError') {
                // Browser blocked autoplay prior to first user click — queue turn for instant replay on click!
                state.pendingAutoplayTurn = {
                  ...turn,
                  audioBase64,
                  audioMimeType,
                  audioDurationMs: estimatedDurationMs
                };
                showAutoplayUnlockBanner(true);
                setTimeout(() => finish(true), Math.min(estimatedDurationMs, 2400));
              } else {
                finish(false);
              }
            });
        }
      });

      if (playedViaElement) {
        return;
      }
    } catch (err) {
      console.warn('WAV TTS playback failed, falling back to browser speech:', err);
    }
  }

  // 3. Fallback to Browser Neural SpeechSynthesis
  await playBrowserSpeechFallback(turn, estimatedDurationMs);
}

/**
 * Replays or synthesizes on-demand TTS for any message in `#transcriptList` when its `🔊` button is clicked.
 * @param {string} turnId
 */
async function replayTranscriptItemVoice(turnId) {
  const item = state.transcript.find((t) => t.id === turnId);
  if (!item) return;

  if (!state.audioEnabled) {
    state.audioEnabled = true;
    document.getElementById('audioToggleBtn')?.classList.add('active');
    const labelEl = document.getElementById('audioToggleLabel');
    if (labelEl) labelEl.textContent = 'Voice ON';
  }

  const textKey = `${item.speakerId || ''}:${String(item.text || '').slice(0, 120)}`;
  const cached = state.turnAudioCache.get(item.id) || state.turnAudioCache.get(textKey);
  if (item.audioBase64 || cached?.audioBase64) {
    await playTurnVoiceAndHighlight({
      ...item,
      audioBase64: item.audioBase64 || cached.audioBase64,
      audioMimeType: item.audioMimeType || cached.audioMimeType || 'audio/wav',
      audioDurationMs: item.audioDurationMs || cached.audioDurationMs
    });
    return;
  }

  try {
    const res = await fetch('/api/media/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        speakerId: item.speakerId,
        text: item.text
      })
    });
    if (res.ok) {
      const ttsData = await res.json();
      if (ttsData.audioBase64) {
        item.audioBase64 = ttsData.audioBase64;
        item.audioMimeType = ttsData.audioMimeType || 'audio/wav';
        item.audioDurationMs = ttsData.audioDurationMs;
        cacheTurnAudio(item);
      }
    }
  } catch {
    // Ignore on-demand TTS fetch error and let playTurnVoiceAndHighlight use fallback
  }

  await playTurnVoiceAndHighlight(item);
}

function clearActiveSpeakerState() {
  state.activeSpeakerId = null;
  state.activeSpeechText = '';
  state.activeTargetPlayerId = null;
  setBgmDucking(false);
  renderZoomGrid();
  renderSidebarVoiceMembers();
}

function stopActiveSpeech() {
  stopActiveVoiceAudioOnly();
  clearActiveSpeakerState();
}

function getOrInitAvatarAnimState(id) {
  if (!state.avatarAnimStates.has(id)) {
    state.avatarAnimStates.set(id, {});
  }
  return state.avatarAnimStates.get(id);
}

/**
 * Frame Loop for all 8 tiles (`mc_jaesuk` + 6 Idols + `player_human`).
 */
function startWebcamAnimationLoop() {
  const renderFrame = () => {
    if (Date.now() > state.activeSpeechEndTime && state.activeSpeakerId) {
      clearActiveSpeakerState();
    }

    const allIds = ['mc_jaesuk', ...state.players.map((p) => p.id)];
    allIds.forEach((id) => {
      const canvas = document.getElementById(`canvas_${id}`);
      if (!canvas) return;
      drawPhotorealisticWebcamTile(canvas, {
        id,
        isSpeaking: state.activeSpeakerId === id,
        isHuman: id === 'player_human'
      });
    });

    requestAnimationFrame(renderFrame);
  };

  requestAnimationFrame(renderFrame);
}

/**
 * Renders a 100% static, high-resolution Discord profile image onto `canvas`:
 * - Uses the 7 photorealistic Korean K-Pop idol & MC Jae-suk portraits (`/generated/portrait_<id>.png`).
 * - Applies a fixed 1.15x center crop (`fixedScale = 1.15`) with zero shaking, panning, zooming, or rotation.
 * - For `player_human` (when webcam is off), renders a 100% static Discord voice-call avatar tile.
 */
function drawPhotorealisticWebcamTile(canvas, { id, isSpeaking, isHuman }) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Live webcam video stream only for the human player if they enabled their camera
  if (isHuman) {
    const activeVideoEl = state.activeVideoStreams.get(id);
    const hasLiveVideoStream =
      activeVideoEl && activeVideoEl.readyState >= 2 && !activeVideoEl.paused;
    if (hasLiveVideoStream) {
      ctx.drawImage(activeVideoEl, 0, 0, w, h);
      return;
    }
  }

  const img = state.portraitImages.get(id);

  if (img && img.complete && img.naturalWidth > 0) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = w / h;
    let drawW = w;
    let drawH = h;
    if (imgRatio > canvasRatio) {
      drawH = h;
      drawW = h * imgRatio;
    } else {
      drawW = w;
      drawH = w / imgRatio;
    }

    // 100% fixed static center crop — zero motion
    const fixedScale = 1.03;
    const scaledW = drawW * fixedScale;
    const scaledH = drawH * fixedScale;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(w / 2, h / 2);
    ctx.drawImage(img, -scaledW / 2, -scaledH / 2, scaledW, scaledH);
    ctx.restore();

    // Subtle bottom gradient so the participant pill and closed captions are always crisp
    const bottomGrad = ctx.createLinearGradient(0, h * 0.72, 0, h);
    bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
  } else {
    // Authentic Discord dark matte tile when camera is off (Guest tile) — 100% static
    ctx.fillStyle = '#191b1f';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 - 4;
    const radius = 42;

    if (isSpeaking) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#23a55a';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = isHuman ? '#5865f2' : '#2b2d31';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 26px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isHuman ? 'G' : id.slice(0, 1).toUpperCase(), cx, cy);
  }
}

/**
 * 1-Second Autonomous Phase Timer & 6-Agent Parallel Floor Handoff Loop.
 * Pauses phase countdown during server LLM/TTS API requests (`state.isWaitingServer`)
 * and triggers the next 6-Idol parallel floor bid (`Promise.all`) ~2.6s after
 * the previous speaker finishes their utterance.
 */
function startAutonomousPhaseTimer() {
  setInterval(() => {
    if (!state.board || state.board.phase === 'GAME_OVER') return;

    // Pause phase countdown while waiting on server LLM/TTS API so latency never penalizes the player
    if (state.localPhaseRemainingSec > 0 && !state.isWaitingServer) {
      state.localPhaseRemainingSec -= 1;
    }

    if (state.board.phase === 'DISCUSSION') {
      if (!state.isWaitingServer) {
        state.discussionElapsedSec += 1;
      }
      renderHeaderBoard();

      const msSinceLastTurnFinished = Date.now() - (state.lastTurnFinishedAt || 0);
      if (
        !state.isBusyRequest &&
        msSinceLastTurnFinished >= 2600 &&
        state.localPhaseRemainingSec > 4
      ) {
        state.lastAutoBeatSec = state.discussionElapsedSec;
        triggerDiscussionStep(null);
      }
    }

    updateTimerDisplay();

    if (state.localPhaseRemainingSec <= 0 && !state.isBusyRequest) {
      const phase = state.board.phase;
      if (phase === 'TEAM_PROPOSAL') {
        triggerTeamProposal([...state.selectedProposalIds]);
      } else if (phase === 'DISCUSSION') {
        triggerCallVotePhase();
      } else if (phase === 'TEAM_VOTE') {
        triggerSubmitVote(null);
      } else if (phase === 'QUEST_EXECUTION') {
        triggerSubmitQuestCard('SUCCESS');
      } else if (phase === 'ASSASSIN_PHASE') {
        triggerAssassination(null);
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('phaseTimerValue');
  const clockCard = document.getElementById('phaseClockCard');
  if (!timerEl || !clockCard) return;

  const sec = Math.max(0, state.localPhaseRemainingSec);
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  timerEl.textContent = `${mm}:${ss}`;

  clockCard.classList.toggle('urgent', sec <= 8);
}

/**
 * Enables dragging the left edge (`#chatResizeHandle`) of `#rightChatDrawer`
 * to expand the chat drawer and shrink the center video stage (`#zoomGridContainer`)
 * while strictly preserving the left settings/channel sidebar (`64px + 244px = 308px`).
 */
function setupChatDrawerResizer() {
  const handle = document.getElementById('chatResizeHandle');
  const appEl = document.getElementById('discordApp');
  const stageEl = document.querySelector('.video-call-stage');
  if (!handle || !appEl) return;

  const LEFT_FIXED_SIDEBAR_PX = 64 + 244; // 308px (server rail + channel/settings sidebar)
  const MIN_VIDEO_STAGE_PX = 280;
  const MIN_CHAT_DRAWER_PX = 280;

  let currentChatWidth = 360;
  let isDragging = false;

  const applyChatDrawerWidth = (requestedWidth) => {
    if (window.innerWidth <= 960) {
      appEl.style.removeProperty('--chat-drawer-width');
      stageEl?.classList.remove('compact-stage');
      return;
    }
    const maxChatWidth = Math.max(
      MIN_CHAT_DRAWER_PX,
      window.innerWidth - LEFT_FIXED_SIDEBAR_PX - MIN_VIDEO_STAGE_PX
    );
    currentChatWidth = Math.min(maxChatWidth, Math.max(MIN_CHAT_DRAWER_PX, requestedWidth));
    appEl.style.setProperty('--chat-drawer-width', `${Math.round(currentChatWidth)}px`);

    const remainingStageWidth = window.innerWidth - LEFT_FIXED_SIDEBAR_PX - currentChatWidth;
    if (stageEl) {
      stageEl.classList.toggle('compact-stage', remainingStageWidth <= 720);
    }
  };

  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    isDragging = true;
    handle.classList.add('dragging');
    appEl.classList.add('resizing-chat');
    if (handle.setPointerCapture) {
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        // Ignore pointer capture errors
      }
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const desiredWidth = window.innerWidth - e.clientX;
    applyChatDrawerWidth(desiredWidth);
  });

  const stopDragging = () => {
    if (!isDragging) return;
    isDragging = false;
    handle.classList.remove('dragging');
    appEl.classList.remove('resizing-chat');
  };

  window.addEventListener('pointerup', stopDragging);
  window.addEventListener('pointercancel', stopDragging);

  // Double-click the splitter to quickly toggle between standard (360px) and wide chat (640px)
  handle.addEventListener('dblclick', () => {
    const targetWidth = currentChatWidth < 500 ? 640 : 360;
    applyChatDrawerWidth(targetWidth);
  });

  window.addEventListener('resize', () => {
    applyChatDrawerWidth(currentChatWidth);
  });

  applyChatDrawerWidth(currentChatWidth);
}

/**
 * Toggles the Human Guest's real webcam on the 8th video tile (`tile_player_human`).
 */
async function toggleHumanWebcam() {
  const videoEl = document.getElementById('video_player_human');
  const canvasEl = document.getElementById('canvas_player_human');
  const dockCamBtn = document.getElementById('dockCamBtn');
  if (!videoEl || !canvasEl) return;

  if (state.humanWebcamStream) {
    state.humanWebcamStream.getTracks().forEach((t) => t.stop());
    state.humanWebcamStream = null;
    videoEl.classList.add('hidden');
    canvasEl.classList.remove('hidden');
    dockCamBtn?.classList.remove('active');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    state.humanWebcamStream = stream;
    videoEl.srcObject = stream;
    videoEl.classList.remove('hidden');
    canvasEl.classList.add('hidden');
    dockCamBtn?.classList.add('active');
  } catch {
    alert('Camera access was denied or no webcam was found.');
  }
}

/**
 * Live Microphone Speech-to-Text (`Web Speech API` + `gemini-3.5-transcribe` MediaRecorder fallback).
 */
function setupMicrophoneInput() {
  const micBtn = document.getElementById('micPushToTalkBtn');
  const micLabel = document.getElementById('micBtnLabel');
  const chatInput = document.getElementById('humanChatInput');
  if (!micBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;
  let mediaRecorder = null;
  let recordedChunks = [];
  let webSpeechTranscribed = false;

  const setRecordingState = (recording) => {
    isListening = recording;
    micBtn.classList.toggle('recording', recording);
    if (micLabel) {
      micLabel.textContent = recording ? 'Listening...' : 'Voice Mic';
    }
  };

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        webSpeechTranscribed = true;
        chatInput.value = transcript;
        if (state.board?.phase === 'DISCUSSION') {
          triggerDiscussionStep(transcript);
          chatInput.value = '';
        }
      }
    };

    recognition.onend = () => {
      setRecordingState(false);
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    };
  }

  micBtn.addEventListener('click', async () => {
    if (isListening) {
      setRecordingState(false);
      if (recognition) recognition.stop();
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      return;
    }

    webSpeechTranscribed = false;
    setRecordingState(true);

    if (recognition) {
      try {
        recognition.start();
      } catch {
        // Ignore duplicate start
      }
    }

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunks.push(e.data);
        };
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          if (webSpeechTranscribed || recordedChunks.length === 0) return;
          const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Url = String(reader.result || '');
            const audioBase64 = base64Url.split(',')[1] || '';
            if (!audioBase64) return;
            try {
              const res = await fetch('/api/media/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioBase64,
                  mimeType: blob.type || 'audio/webm'
                })
              });
              const data = await res.json();
              if (data.transcript) {
                chatInput.value = data.transcript;
                if (state.board?.phase === 'DISCUSSION') {
                  triggerDiscussionStep(data.transcript);
                  chatInput.value = '';
                }
              }
            } catch {
              // Ignore fallback error
            }
          };
          reader.readAsDataURL(blob);
        };
        mediaRecorder.start();
      } catch {
        // Microphone stream unavailable
      }
    }
  });
}

/**
 * Initializes all UI event listeners across the 3 consolidated button zones:
 * 1. Left Sidebar (`#secretRoleCard`): Role Setup, Start New Game, Demo Jumps
 * 2. Top Context Bar (`#phaseActionBanner`): Phase-specific game progression buttons
 * 3. Bottom Call Controls Dock (`.call-controls-dock`): Media & Panel toggles
 */
function initApp() {
  preloadPortraitImages();
  setupAudioUnlockListeners();
  startWebcamAnimationLoop();
  startAutonomousPhaseTimer();
  setupMicrophoneInput();
  setupChatDrawerResizer();

  // Per-Message Voice Replay Button Delegation (`#transcriptList`)
  document.getElementById('transcriptList')?.addEventListener('click', (e) => {
    const replayBtn = e.target.closest('.msg-replay-btn');
    if (replayBtn && replayBtn.dataset.replayId) {
      e.stopPropagation();
      replayTranscriptItemVoice(replayBtn.dataset.replayId);
    }
  });

  // Live Chat Form Submit
  const chatForm = document.getElementById('liveChatForm');
  const chatInput = document.getElementById('humanChatInput');
  chatForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    state.lastAutoBeatSec = state.discussionElapsedSec;
    await triggerDiscussionStep(text);
  });

  const scrollToMobileSection = (elementId) => {
    if (window.innerWidth > 960) return;
    const targetEl = document.getElementById(elementId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Mobile Quick-Jump Navigation Pills (Stage / Chat / X-Ray / Role & Setup)
  document.querySelectorAll('.mobile-nav-pill[data-mobile-jump]').forEach((pillBtn) => {
    pillBtn.addEventListener('click', () => {
      document.querySelectorAll('.mobile-nav-pill').forEach((b) => b.classList.remove('active'));
      pillBtn.classList.add('active');

      const targetId = pillBtn.dataset.mobileJump;
      const targetTab = pillBtn.dataset.mobileTab;
      if (targetTab) {
        const appEl = document.getElementById('discordApp');
        appEl?.classList.remove('chat-collapsed');
        document.getElementById('toggleChatDrawerBtn')?.classList.add('active');
        const tabTrigger = document.querySelector(`.rail-tab[data-tab="${targetTab}"]`);
        tabTrigger?.click();
      }
      if (targetId) {
        scrollToMobileSection(targetId);
      }
    });
  });

  // Zone 1: Left Sidebar — Primary "Start New Game (Quest 1)" Button
  document.getElementById('startNewGamePrimaryBtn')?.addEventListener('click', () => {
    const selectedRole =
      document.getElementById('preferredRoleSelect')?.value || state.preferredRole || 'RANDOM';
    state.preferredRole = selectedRole;
    startNewGame('STANDARD', selectedRole);
    scrollToMobileSection('mainVideoStage');
  });

  // Zone 1: Left Sidebar — Role Selector Dropdown
  document.getElementById('preferredRoleSelect')?.addEventListener('change', (e) => {
    const selectedRole = e.target.value || 'RANDOM';
    state.preferredRole = selectedRole;
    startNewGame('STANDARD', selectedRole);
    scrollToMobileSection('mainVideoStage');
  });

  // Zone 1: Left Sidebar — Demo Scenario Jump Buttons (Quest 4 Crisis / Final Assassin)
  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      startNewGame(btn.dataset.preset, state.preferredRole);
      scrollToMobileSection('mainVideoStage');
    });
  });

  // Zone 1: Left Sidebar — Hide/Show Human Secret Role
  document.getElementById('toggleRoleMaskBtn')?.addEventListener('click', (e) => {
    state.roleMasked = !state.roleMasked;
    e.currentTarget.textContent = state.roleMasked ? 'Show' : 'Hide';
    renderSecretRoleCard();
    renderZoomGrid();
  });

  // Zone 3: Bottom Dock — My Cam Toggle
  document.getElementById('dockCamBtn')?.addEventListener('click', () => {
    toggleHumanWebcam();
  });

  // Zone 3: Bottom Dock — AI Character Voice (TTS) Toggle
  document.getElementById('audioToggleBtn')?.addEventListener('click', (e) => {
    state.audioEnabled = !state.audioEnabled;
    e.currentTarget.classList.toggle('active', state.audioEnabled);
    const labelEl = document.getElementById('audioToggleLabel');
    if (labelEl) {
      labelEl.textContent = state.audioEnabled ? 'Voice ON' : 'Voice OFF';
    }
    if (!state.audioEnabled) {
      stopActiveSpeech();
    }
  });

  // Zone 3: Bottom Dock — Independent BGM Toggle & Volume Slider
  const bgmToggleBtn = document.getElementById('bgmToggleBtn');
  const bgmToggleLabel = document.getElementById('bgmToggleLabel');
  const bgmVolumeSlider = document.getElementById('bgmVolumeSlider');

  const updateBgmControlUI = () => {
    const active = state.bgmEnabled && state.bgmUserPercent > 0;
    bgmToggleBtn?.classList.toggle('active', active);
    if (bgmToggleLabel) {
      bgmToggleLabel.textContent = active ? `BGM ${state.bgmUserPercent}%` : 'BGM OFF';
    }
    if (bgmVolumeSlider) {
      bgmVolumeSlider.value = String(active ? state.bgmUserPercent : 0);
    }
  };

  try {
    const savedPct = window.localStorage?.getItem('avalon_bgm_percent');
    const savedEnabled = window.localStorage?.getItem('avalon_bgm_enabled');
    if (savedPct !== null) {
      state.bgmUserPercent = Math.min(100, Math.max(0, Number(savedPct) || 0));
    }
    if (savedEnabled !== null) {
      state.bgmEnabled = savedEnabled === 'true';
    }
  } catch {
    // Ignore localStorage errors
  }
  updateBgmControlUI();

  bgmToggleBtn?.addEventListener('click', () => {
    if (state.bgmEnabled && state.bgmUserPercent > 0) {
      state.bgmEnabled = false;
      stopBgmPlayback();
    } else {
      state.bgmEnabled = true;
      if (state.bgmUserPercent <= 0) state.bgmUserPercent = 18;
      syncPhaseAdaptiveBgm();
    }
    try {
      window.localStorage?.setItem('avalon_bgm_enabled', String(state.bgmEnabled));
      window.localStorage?.setItem('avalon_bgm_percent', String(state.bgmUserPercent));
    } catch {
      // Ignore localStorage errors
    }
    updateBgmControlUI();
  });

  bgmVolumeSlider?.addEventListener('input', (e) => {
    const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
    state.bgmUserPercent = val;
    state.bgmEnabled = val > 0;
    if (!state.bgmEnabled) {
      stopBgmPlayback();
    } else {
      applyBgmGain();
      syncPhaseAdaptiveBgm();
    }
    try {
      window.localStorage?.setItem('avalon_bgm_enabled', String(state.bgmEnabled));
      window.localStorage?.setItem('avalon_bgm_percent', String(state.bgmUserPercent));
    } catch {
      // Ignore localStorage errors
    }
    updateBgmControlUI();
  });

  // Zone 3: Bottom Dock — Open Judge X-Ray Inspector
  document.getElementById('judgeXrayToggleBtn')?.addEventListener('click', () => {
    const appEl = document.getElementById('discordApp');
    appEl?.classList.remove('chat-collapsed');
    document.getElementById('toggleChatDrawerBtn')?.classList.add('active');
    document.getElementById('xrayTabButton')?.click();
    scrollToMobileSection('rightChatDrawer');
  });

  // Zone 3: Bottom Dock — Toggle Right Side Panel (Voice Chat / Inspector)
  document.getElementById('toggleChatDrawerBtn')?.addEventListener('click', (e) => {
    const appEl = document.getElementById('discordApp');
    if (!appEl) return;
    if (window.innerWidth <= 960) {
      appEl.classList.remove('chat-collapsed');
      e.currentTarget.classList.add('active');
      scrollToMobileSection('rightChatDrawer');
      return;
    }
    const isCollapsed = appEl.classList.toggle('chat-collapsed');
    e.currentTarget.classList.toggle('active', !isCollapsed);
  });

  // Right Rail Tabs (Voice Chat vs Inspector X-Ray)
  document.querySelectorAll('.rail-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.rail-tab').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.rail-tab-content').forEach((c) => c.classList.remove('active'));
      tabBtn.classList.add('active');
      document.getElementById(tabBtn.dataset.tab)?.classList.add('active');
    });
  });

  // Spoiler Toggle in Judge X-Ray
  document.getElementById('revealTrueRolesBtn')?.addEventListener('click', (e) => {
    state.spoilersRevealed = !state.spoilersRevealed;
    const grid = document.getElementById('trueRolesContainer');
    grid?.classList.toggle('blurred-spoilers', !state.spoilersRevealed);
    e.currentTarget.textContent = state.spoilersRevealed ? 'Hide Spoilers' : 'Show Spoilers';
  });

  // API Key & Settings Modal
  const modal = document.getElementById('apiKeyModal');
  document.getElementById('apiKeyModalBtn')?.addEventListener('click', () => {
    modal?.classList.remove('hidden');
  });
  document.getElementById('closeModalBtn')?.addEventListener('click', () => {
    modal?.classList.add('hidden');
  });

  document.getElementById('saveApiKeyBtn')?.addEventListener('click', async () => {
    const keyVal = document.getElementById('apiKeyInput').value.trim();
    const statusEl = document.getElementById('modalStatusMsg');
    const res = await fetch('/api/config/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: keyVal })
    });
    const data = await res.json();
    statusEl.textContent = data.apiKeyConfigured
      ? 'Gemini API Key saved and active.'
      : 'Please enter a valid Gemini API key.';
  });

  document.getElementById('generatePortraitsBtn')?.addEventListener('click', async () => {
    const statusEl = document.getElementById('modalStatusMsg');
    statusEl.textContent = 'Generating 4K portraits via gemini-nano-banana-2.1...';
    try {
      const res = await fetch('/api/media/portraits/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      let updatedCount = 0;
      (data.portraits || []).forEach((p) => {
        if (p.portraitUrl) {
          updatedCount += 1;
          const img = new Image();
          img.src = `${p.portraitUrl}?t=${Date.now()}`;
          img.onload = () => state.portraitImages.set(p.characterId, img);
        }
      });
      statusEl.textContent =
        updatedCount > 0
          ? `Generated ${updatedCount} portraits.`
          : 'Studio portraits loaded.';
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
    }
  });

  // Start initial game automatically
  startNewGame('STANDARD');
}

window.addEventListener('DOMContentLoaded', initApp);
