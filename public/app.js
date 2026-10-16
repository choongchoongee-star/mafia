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
  proposalLobbyCount: 0,
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
  speechQueuePromise: Promise.resolve(),
  audioUnlocked: false,
  pendingAutoplayTurn: null,
  prefetchedDiscussionPayload: null,
  prefetchAbortController: null
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
 * Unlocks Web Audio API & HTMLAudioElement playback on the user's first interaction.
 * Defers `pendingAutoplayTurn` by 120ms so if the user's first click was on an action button
 * (e.g. `Let Leader Propose` or `Next Idol Turn`), the stale greeting does NOT collide with the new turn.
 */
function setupAudioUnlockListeners() {
  const evtNames = ['pointerdown', 'click', 'touchstart', 'keydown'];
  const unlock = () => {
    evtNames.forEach((evtName) => {
      window.removeEventListener(evtName, unlock);
    });
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
      setTimeout(() => {
        if (
          !state.isBusyRequest &&
          !state.isWaitingServer &&
          !state.isPlayingAudio &&
          !state.activeSpeakerId
        ) {
          playTurnVoiceAndHighlight(queuedTurn);
        }
      }, 120);
    }
  };
  evtNames.forEach((evtName) => {
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
 * Aborts any in-flight `/discuss/step` request or lookahead prefetch so user-initiated
 * chat or phase transition buttons execute immediately without waiting or being dropped.
 */
function abortPendingAutoStep() {
  state.prefetchedDiscussionPayload = null;
  if (state.prefetchAbortController) {
    try {
      state.prefetchAbortController.abort();
    } catch {
      // Ignore abort errors
    }
    state.prefetchAbortController = null;
  }
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
  state.proposalLobbyCount = 0;
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

    if (data.latestTurn) {
      state.isPlayingAudio = true;
      state.activeSpeakerId = data.latestTurn.speakerId;
    }
    applyServerGameState(data);
    resetPhaseClock(data.board.phaseTimerSec);
    // Release network lock immediately so user can click or chat while MC Jae-ho speaks!
    state.isBusyRequest = false;

    if (data.latestTurn) {
      await playTurnVoiceAndHighlight(data.latestTurn);
    }
    state.lastTurnFinishedAt = Date.now();
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
  const previousQuest = state.board?.currentQuestNumber;
  const previousReject = state.board?.rejectTrack;

  state.gameId = data.gameId;
  state.board = data.board;
  state.mcHost = data.mcHost;
  state.players = data.players || [];
  state.humanPrivateView = data.humanPrivateView;
  state.transcript = data.transcript || [];
  state.currentVotes = data.currentVotes || {};
  state.xrayTelemetry = data.xrayTelemetry || null;
  state.phaseActionStatusText = null;

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

  if (
    previousPhase !== state.board.phase ||
    previousQuest !== state.board.currentQuestNumber ||
    previousReject !== state.board.rejectTrack
  ) {
    if (state.board.phase === 'TEAM_PROPOSAL') {
      state.selectedProposalIds.clear();
      if (state.board.leaderId === 'player_human') {
        state.selectedProposalIds.add('player_human');
      }
    }
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
  state.proposalLobbyCount = 0;
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
  * Renders the High-Visibility Phase Action Bar in BOTH:
  * 1. Top header of the video stage (`#phaseActionBanner` / `#bannerActionControls`)
  * 2. Synchronized Chat Action Dock right above the chat input (`#chatPhaseActionDock` / `#chatDockActionControls`)
  * Also renders interactive Member Selection Chips when Human is Leader in `TEAM_PROPOSAL`.
  */
function renderPhaseActionBanner() {
  const board = state.board;
  if (!board) return;

  const bannerEl = document.getElementById('phaseActionBanner');
  const badge = document.getElementById('bannerPhaseBadge');
  const instruction = document.getElementById('bannerInstructionText');
  const controls = document.getElementById('bannerActionControls');
  const bannerChips = document.getElementById('bannerMemberChips');

  const chatDockEl = document.getElementById('chatPhaseActionDock');
  const chatBadge = document.getElementById('chatDockPhaseBadge');
  const chatInstruction = document.getElementById('chatDockInstructionText');
  const chatControls = document.getElementById('chatDockActionControls');
  const chatChips = document.getElementById('chatDockMemberChips');

  if (!badge || !instruction || !controls) return;

  const questLabel = `Quest ${board.currentQuestNumber} (${board.requiredTeamSize}인 원정대)`;
  badge.textContent = questLabel;
  if (chatBadge) chatBadge.textContent = questLabel;

  controls.innerHTML = '';
  if (chatControls) chatControls.innerHTML = '';
  if (bannerChips) {
    bannerChips.innerHTML = '';
    bannerChips.classList.add('hidden');
  }
  if (chatChips) {
    chatChips.innerHTML = '';
    chatChips.classList.add('hidden');
  }

  const setDualInstruction = (text, needsHumanAction = false) => {
    instruction.textContent = text;
    if (chatInstruction) chatInstruction.textContent = text;
    bannerEl?.classList.toggle('needs-human-action', Boolean(needsHumanAction));
    chatDockEl?.classList.toggle('needs-human-action', Boolean(needsHumanAction));
  };

  const addDualButton = (label, className, onClick, title = '') => {
    const createBtn = () => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `action-cta-btn ${className}`;
      btn.textContent = label;
      if (title) btn.title = title;
      btn.onclick = onClick;
      return btn;
    };
    controls.appendChild(createBtn());
    if (chatControls) {
      chatControls.appendChild(createBtn());
    }
  };

  if (state.phaseActionStatusText) {
    setDualInstruction(state.phaseActionStatusText, false);
    const addStatusPill = (container) => {
      if (!container) return;
      const statusPill = document.createElement('button');
      statusPill.type = 'button';
      statusPill.className = 'action-cta-btn blurple';
      statusPill.disabled = true;
      statusPill.style.opacity = '0.85';
      statusPill.textContent = '⏳ 진행 중 (Processing...)';
      container.appendChild(statusPill);
    };
    addStatusPill(controls);
    addStatusPill(chatControls);
    return;
  }

  if (board.phase === 'TEAM_PROPOSAL') {
    if (board.leaderId === 'player_human') {
      if (state.selectedProposalIds.size === 0) {
        state.selectedProposalIds.add('player_human');
      }
      const count = state.selectedProposalIds.size;
      const req = board.requiredTeamSize;
      setDualInstruction(
        `👑 당신이 원정대장(Leader)입니다! 아래 멤버 칩(또는 화면 타일)에서 ${req}명을 선택 후 [팀 제안 확정]을 누르세요 (${count}/${req}명 선택됨)`,
        true
      );

      // Render interactive Member Selection Chips in both top HUD and chat dock
      const populateMemberChips = (chipContainer) => {
        if (!chipContainer) return;
        chipContainer.classList.remove('hidden');
        state.players.forEach((p) => {
          const isSelected = state.selectedProposalIds.has(p.id);
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = `member-chip-btn ${isSelected ? 'selected' : ''}`;
          const shortName = p.isHuman ? 'Guest (나)' : p.koreanName || p.name;
          chip.textContent = `${isSelected ? '✓' : '+'} ${shortName}`;
          chip.title = `${shortName} 원정대 포함/제외 토글`;
          chip.onclick = () => handleTileClick(p.id);
          chipContainer.appendChild(chip);
        });
      };
      populateMemberChips(bannerChips);
      populateMemberChips(chatChips);

      addDualButton(
        `👑 팀 제안 확정 (${count}/${req}명)`,
        'approve',
        () => triggerTeamProposal([...state.selectedProposalIds]),
        '선택한 원정대 팀을 확정하고 토론/투표 단계로 이동합니다'
      );
      addDualButton(
        '⏭️ 아이돌 어필 듣기',
        'secondary',
        () => triggerDiscussionStep(null, { isAutoStep: false }),
        '원정대 확정 전에 AI 아이돌들의 어필/추천 발언을 먼저 듣습니다'
      );
    } else {
      setDualInstruction(
        `👑 원정대장 ${board.leaderName} 님이 Quest ${board.currentQuestNumber} (${board.requiredTeamSize}인) 원정대를 고르고 있습니다...`,
        false
      );
      addDualButton(
        '✨ 리더 팀 제안 바로 보기 (Propose Now)',
        'blurple',
        () => triggerTeamProposal([]),
        '리더의 원정대 제안을 즉시 발표하고 토론/투표로 넘어갑니다'
      );
      addDualButton(
        '⏭️ 사전 로비 발언 듣기',
        'secondary',
        () => triggerDiscussionStep(null, { isAutoStep: false }),
        '리더가 팀을 확정하기 전에 다른 멤버들의 어필을 듣습니다'
      );
    }
  } else if (board.phase === 'DISCUSSION') {
    const teamStr = board.proposedTeamNames.join(', ');
    setDualInstruction(
      `💬 제안된 원정대 [${teamStr}] — 채팅으로 질문하거나 바로 찬성/반대 투표를 누르세요!`,
      true
    );

    addDualButton(
      '✅ 찬성 투표 (Approve)',
      'approve',
      () => triggerSubmitVote('APPROVE'),
      '이 원정대 구성에 즉시 찬성(APPROVE) 투표하고 7인 결과를 공개합니다'
    );
    addDualButton(
      '❌ 반대 투표 (Reject)',
      'reject',
      () => triggerSubmitVote('REJECT'),
      '이 원정대 구성에 즉시 반대(REJECT) 투표하고 7인 결과를 공개합니다'
    );
    addDualButton(
      '⏭️ 다음 아이돌 발언',
      'secondary',
      () => {
        state.discussionElapsedSec = Math.max(state.discussionElapsedSec, 25);
        state.lastAutoBeatSec = state.discussionElapsedSec;
        triggerDiscussionStep(null, { isAutoStep: false });
      },
      '다음 AI 아이돌의 추리/반박 발언을 즉시 듣습니다'
    );
    addDualButton(
      '🗳️ 투표 단계 전환',
      'blurple',
      () => triggerCallVotePhase(),
      '토론을 마치고 공식 7인 찬반 투표 단계(TEAM VOTE)로 전환합니다'
    );
  } else if (board.phase === 'TEAM_VOTE') {
    const teamStr = board.proposedTeamNames.join(', ');
    setDualInstruction(
      `🗳️ [필수 투표] ${board.leaderName}의 원정대 [${teamStr}] — 찬성 또는 반대를 선택하세요!`,
      true
    );
    addDualButton(
      '✅ 찬성 투표 (Approve)',
      'approve',
      () => triggerSubmitVote('APPROVE'),
      '원정대 출발에 찬성(APPROVE) 표를 던집니다'
    );
    addDualButton(
      '❌ 반대 투표 (Reject)',
      'reject',
      () => triggerSubmitVote('REJECT'),
      '원정대 출발에 반대(REJECT) 표를 던집니다'
    );
  } else if (board.phase === 'QUEST_EXECUTION') {
    const humanOnMission = board.proposedTeamIds.includes('player_human');
    const humanAlignment = state.humanPrivateView?.self?.alignment || 'GOOD';

    if (humanOnMission) {
      setDualInstruction(
        `⚔️ [원정대 임무 수행] 당신은 Quest ${board.currentQuestNumber} 원정대원입니다! 임무 카드를 제출하세요:`,
        true
      );
      addDualButton(
        '✅ 임무 성공 (Success)',
        'approve',
        () => triggerSubmitQuestCard('SUCCESS'),
        '원정 임무 성공(SUCCESS) 카드를 제출합니다'
      );

      if (humanAlignment === 'EVIL') {
        addDualButton(
          '🗡️ 임무 실패 (Sabotage)',
          'reject',
          () => triggerSubmitQuestCard('FAIL'),
          '악의 세력 전용: 원정 임무 실패(FAIL) 사보타주 카드를 제출합니다'
        );
      }
    } else {
      setDualInstruction(
        `⚔️ 원정대 [${board.proposedTeamNames.join(', ')}]가 Quest ${board.currentQuestNumber} 임무를 수행 중입니다...`,
        false
      );
      addDualButton(
        '⚡ 임무 결과 공개 (Reveal Outcome)',
        'blurple',
        () => triggerSubmitQuestCard('SUCCESS'),
        '원정대 임무 성공/실패 카드 결과를 즉시 공개합니다'
      );
    }
  } else if (board.phase === 'ASSASSIN_PHASE') {
    const humanIsAssassin = state.humanPrivateView?.self?.roleId === 'ASSASSIN';
    if (humanIsAssassin) {
      setDualInstruction(
        `🗡️ [암살자 지목] 당신은 암살자(Assassin)입니다! 멀린(Merlin)으로 의심되는 대상을 지목하세요:`,
        true
      );
      const knownTeammates = state.humanPrivateView?.epistemicVision?.knownEvilTeammateIds || [];
      state.players
        .filter((p) => p.id !== 'player_human' && !knownTeammates.includes(p.id))
        .forEach((p) => {
          addDualButton(
            `🎯 ${p.koreanName || p.name} 암살`,
            'reject',
            () => triggerAssassination(p.id),
            `${p.koreanName || p.name} 님을 멀린으로 지목하여 암살을 시도합니다`
          );
        });
    } else {
      setDualInstruction(
        `🗡️ 선의 세력 3승 달성! 암살자가 마지막 역전을 위해 멀린(Merlin)을 지목하고 있습니다...`,
        false
      );
      addDualButton(
        '🗡️ 암살 결과 확인 (Resolve Assassin Shot)',
        'reject',
        () => triggerAssassination(null),
        '암살자의 최종 멀린 지목 결과를 즉시 확인합니다'
      );
    }
  } else if (board.phase === 'GAME_OVER') {
    const winLabel = `${board.winner} Victory`;
    badge.textContent = winLabel;
    if (chatBadge) chatBadge.textContent = winLabel;
    setDualInstruction(`🏆 ${board.winReason}`, false);
    addDualButton('🔄 새 게임 시작 (Play Again)', 'blurple', () => startNewGame('STANDARD'));
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
          ? `[나무위키 프로필] Motif: ${namu.motif} | MBTI: ${namu.mbti} | Playstyle: ${namu.playstyle || ''} | Nicknames: ${(namu.nicknames || []).join(', ')} | Habit: ${namu.iconicHabits || ''}`
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
      } else if ((board.phase === 'DISCUSSION' || board.phase === 'TEAM_PROPOSAL') && !participant.isHuman) {
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

    // Show clean closed-caption overlay for active speaker or latest dialect turn during TEAM_PROPOSAL & DISCUSSION
    const lastTurn = latestSpokenByPlayer[participant.id];
    if (
      lastTurn &&
      (isSpeaking ||
        ((board.phase === 'DISCUSSION' || board.phase === 'TEAM_PROPOSAL') &&
          state.transcript.slice(-2).some((t) => t.id === lastTurn.id)))
    ) {
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

        const chainPills = [];
        if (item.replyToSpeakerName) {
          const isHumanReply = item.replyToSpeakerId === 'player_human';
          const snippetAttr = item.replyToSnippet
            ? String(item.replyToSnippet).replace(/"/g, '&quot;')
            : '';
          chainPills.push(
            `<span class="reply-pill ${isHumanReply ? 'human-reply' : ''}" title="${snippetAttr}">↪ ${isHumanReply ? '💬' : '🎙️'} @${item.replyToSpeakerName} 발언에 ${isHumanReply ? '답변' : '응답'}</span>`
          );
        }
        if (
          item.targetPlayerName &&
          item.targetPlayerId &&
          item.targetPlayerId !== item.speakerId
        ) {
          chainPills.push(
            `<span class="target-pill">🎯 → @${item.targetPlayerName} 지목</span>`
          );
        }
        const replyChainHtml =
          chainPills.length > 0
            ? `<div class="msg-reply-chain">${chainPills.join('')}</div>`
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
              ${replyChainHtml}
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
          <div class="msg-text" style="font-size:11px; margin-top:2px;">아발론 스타일: ${p.namuwikiProfile.playstyle || ''}</div>
          <div class="msg-text" style="font-size:11px; color:#94a3b8; margin-top:2px;">특기: ${p.namuwikiProfile.signatureMove || p.namuwikiProfile.iconicHabits || ''}</div>
        </div>
      `
      )
      .join('');
  }
}

const CHAT_PLAYER_ALIASES = [
  { id: 'idol_wonyoung', patterns: [/seoyoung/i, /wonyoung/i, /서영/, /원영/, /럭키비키/] },
  { id: 'idol_karina', patterns: [/rina/i, /karina/i, /리나/, /카리나/] },
  { id: 'idol_sullyoon', patterns: [/seol-?ah/i, /sullyoon/i, /설아/, /설윤/] },
  { id: 'idol_yuna', patterns: [/yura/i, /yuna/i, /유라/, /유나/] },
  { id: 'idol_chaewon', patterns: [/chaerin/i, /chaewon/i, /채린/, /채원/, /쌈채린/] },
  { id: 'idol_hanni', patterns: [/hana/i, /hanni/i, /하나/, /하니/] },
  {
    id: 'player_human',
    patterns: [
      /\b(me|myself|guest|i)\b/i,
      /(^|[\s,./!?])(나|내가|나는|나랑|나도|게스트|저|제가|저도)(?=$|[\s,./!?랑와과도은는이가을를])/
    ]
  }
];

/**
 * Extracts mentioned player IDs (`idol_*` or `player_human`) from a Korean or English chat string
 * in the exact order they appear in the message.
 * @param {string} rawText
 * @returns {string[]}
 */
function extractPlayerIdsFromChat(rawText) {
  const text = String(rawText || '');
  if (!text) return [];

  const matches = [];
  for (const entry of CHAT_PLAYER_ALIASES) {
    let bestIdx = Infinity;
    for (const regex of entry.patterns) {
      const m = regex.exec(text);
      if (m && m.index < bestIdx) {
        bestIdx = m.index;
      }
    }
    if (bestIdx !== Infinity) {
      matches.push({ id: entry.id, index: bestIdx });
    }
  }

  matches.sort((a, b) => a.index - b.index);
  return matches.map((m) => m.id);
}

/**
 * Immediately renders the human player's chat message in `#transcriptList` (`< 10ms` optimistic UI)
 * before the server round-trip completes.
 * @param {string} text
 */
function appendOptimisticHumanChat(text) {
  const cleanText = String(text || '').trim();
  if (!cleanText) return;
  const lastEntry = state.transcript[state.transcript.length - 1];
  if (lastEntry && lastEntry.speakerId === 'player_human' && lastEntry.text === cleanText) {
    return;
  }
  state.transcript.push({
    id: `optimistic_${Date.now()}`,
    questNumber: state.board?.questNumber || 1,
    phase: state.board?.phase || 'DISCUSSION',
    speakerId: 'player_human',
    speakerName: 'Guest (You)',
    text: cleanText,
    verificationNote: 'Human Player Live Input (Pending Server Sync)'
  });
  renderTranscriptAndXray();
}

/**
 * Processes any queued human chat messages submitted while a server request was in flight.
 */
async function drainPendingHumanChatQueue() {
  if (state.isBusyRequest || state.pendingHumanChatQueue.length === 0) return;
  const nextChat = state.pendingHumanChatQueue.shift();
  if (nextChat) {
    await handleHumanChatSubmission(nextChat, { skipOptimisticAppend: true });
  }
}

/**
 * Unified Chat Command & Natural Language Router (`#liveChatForm` & Microphone STT).
 * Allows operating 100% of IDOL AVALON LIVE via chat across all 6 phases (`TEAM_PROPOSAL`,
 * `DISCUSSION`, `TEAM_VOTE`, `QUEST_EXECUTION`, `ASSASSIN_PHASE`, and `GAME_OVER`).
 * @param {string} rawText
 * @param {{ skipOptimisticAppend?: boolean }} [options]
 */
async function handleHumanChatSubmission(rawText, options = {}) {
  const text = String(rawText || '').trim();
  if (!text) return;

  // Cancel any in-flight background auto-step and interrupt active TTS playback immediately
  abortPendingAutoStep();
  stopActiveSpeech();

  if (!options.skipOptimisticAppend) {
    appendOptimisticHumanChat(text);
  }

  if (state.isBusyRequest) {
    state.pendingHumanChatQueue.push(text);
    return;
  }

  // 1. Global Game Reset / Demo Mode Shortcuts
  if (/^(새\s*게임|다시\s*시작|리셋|처음부터|new\s*game|restart|play\s*again|reset)$/i.test(text)) {
    await startNewGame('STANDARD', state.preferredRole);
    return;
  }
  if (/^(퀘스트\s*4|데모\s*4|demo\s*quest\s*4)$/i.test(text)) {
    await startNewGame('CLIMAX_QUEST_4', state.preferredRole);
    return;
  }
  if (/^(암살\s*데모|데모\s*암살|demo\s*assassin)$/i.test(text)) {
    await startNewGame('ASSASSIN_SHOWDOWN', state.preferredRole);
    return;
  }

  const phase = state.board?.phase || 'DISCUSSION';
  const requiredSize = state.board?.requiredTeamSize || 2;

  // 2. TEAM_PROPOSAL Phase Operation & Pre-Proposal Lobbying via Chat
  if (phase === 'TEAM_PROPOSAL') {
    const wantsConfirm =
      /(가자|출발|확정|제안|꾸리자|보내자|결정|고고|진행|올려|락인|propose|confirm|submit|lock|go\b|let'?s\s*go)/i.test(
        text
      );
    const wantsVoteNow =
      /^(투표\s*(시작|하자|가자|콜|진행|고고)?|바로\s*투표|투표할래|call\s*vote|start\s*vote|vote\s*now|let'?s\s*vote)$/i.test(
        text
      );
    const mentionedIds = extractPlayerIdsFromChat(text);

    // If user types "투표 시작" while still in TEAM_PROPOSAL, lock proposal and jump straight to TEAM_VOTE
    if (wantsVoteNow) {
      await triggerTeamProposal([...state.selectedProposalIds], text);
      if (state.board?.phase === 'DISCUSSION') {
        await triggerCallVotePhase(null);
      }
      return;
    }

    if (state.board?.leaderId !== 'player_human') {
      // If user asks to propose/confirm or pitches a lineup with "가자/출발/확정/제안", have AI Leader lock in the proposal now
      if (
        wantsConfirm ||
        /^(제안|팀\s*제안|확정|출발|결정|고고|propose|propose\s*team|lock\s*in)$/i.test(text)
      ) {
        await triggerTeamProposal(mentionedIds, text);
        return;
      }
      if (/^(다음|다음\s*턴|패스|넘어가자|계속|next|next\s*turn|skip|pass)$/i.test(text)) {
        await triggerDiscussionStep(null, { isAutoStep: false });
        return;
      }
      // Otherwise, Human Guest is lobbying/talking to the AI Leader during TEAM_PROPOSAL
      await triggerDiscussionStep(text, { isAutoStep: false });
      return;
    }

    if (mentionedIds.length >= requiredSize) {
      const teamIds = mentionedIds.slice(0, requiredSize);
      state.selectedProposalIds = new Set(teamIds);
      renderPhaseActionBanner();
      renderZoomGrid();
      await triggerTeamProposal(teamIds, text);
      return;
    }

    if (mentionedIds.length > 0) {
      if (wantsConfirm && !mentionedIds.includes('player_human')) {
        state.selectedProposalIds.add('player_human');
      }
      for (const id of mentionedIds) {
        if (state.selectedProposalIds.size < requiredSize) {
          state.selectedProposalIds.add(id);
        }
      }

      renderPhaseActionBanner();
      renderZoomGrid();

      if (wantsConfirm && state.selectedProposalIds.size === requiredSize) {
        await triggerTeamProposal([...state.selectedProposalIds], text);
        return;
      }

      // Let the mentioned idol(s) & cast respond in real time while updating candidate selection
      await triggerDiscussionStep(text, { isAutoStep: false });
      return;
    }

    if (wantsConfirm) {
      if (state.selectedProposalIds.size < requiredSize) {
        state.selectedProposalIds.add('player_human');
        for (const p of state.players) {
          if (state.selectedProposalIds.size >= requiredSize) break;
          state.selectedProposalIds.add(p.id);
        }
      }
      const teamIds = [...state.selectedProposalIds].slice(0, requiredSize);
      renderPhaseActionBanner();
      renderZoomGrid();
      await triggerTeamProposal(teamIds, text);
      return;
    }

    if (/^(다음|다음\s*턴|패스|넘어가자|계속|next|next\s*turn|skip|pass)$/i.test(text)) {
      await triggerDiscussionStep(null, { isAutoStep: false });
      return;
    }

    // Conversational message during TEAM_PROPOSAL: let the 6 AI idols respond and lobby
    await triggerDiscussionStep(text, { isAutoStep: false });
    return;
  }

  // 3. DISCUSSION Phase Operation via Chat
  if (phase === 'DISCUSSION') {
    // Quick 1-step "call vote + approve" from discussion
    if (
      /^(바로\s*찬성|즉시\s*찬성|투표\s*찬성|찬성\s*투표|찬성|동의|승인|오케이|approve|approve\s*team|vote\s*approve|yes|ok)$/i.test(
        text
      )
    ) {
      await triggerSubmitVote('APPROVE', text);
      return;
    }
    // Quick 1-step "call vote + reject" from discussion
    if (
      /^(바로\s*반대|즉시\s*반대|투표\s*반대|반대\s*투표|반대|거부|거절|기각|reject|reject\s*team|vote\s*reject|no|veto)$/i.test(
        text
      )
    ) {
      await triggerSubmitVote('REJECT', text);
      return;
    }
    // Transition to TEAM_VOTE
    if (
      /^(투표\s*(시작|하자|가자|콜|진행|고고)?|바로\s*투표|투표할래|call\s*vote|start\s*vote|vote\s*now|let'?s\s*vote)$/i.test(
        text
      )
    ) {
      await triggerCallVotePhase(text);
      return;
    }
    // Advance to next AI speaker without human message
    if (/^(다음|다음\s*턴|패스|넘어가자|계속|next|next\s*turn|skip|pass)$/i.test(text)) {
      await triggerDiscussionStep(null, { isAutoStep: false });
      return;
    }

    state.lastAutoBeatSec = state.discussionElapsedSec;
    await triggerDiscussionStep(text, { isAutoStep: false });
    return;
  }

  // 4. TEAM_VOTE Phase Operation via Chat
  if (phase === 'TEAM_VOTE') {
    const isReject =
      /(반대|거부|거절|안\s*돼|안돼|기각|싫어|의심|비동의|노\b|불신|reject|no\b|veto|deny|👎|❌)/i.test(
        text
      );
    const isApprove =
      /(찬성|동의|승인|가자|좋아|오케이|수락|인정|믿는다|믿어|고고|approve|yes|accept|agree|ok\b|👍|⭕|✅)/i.test(
        text
      );
    const voteChoice = isReject && !isApprove ? 'REJECT' : 'APPROVE';
    await triggerSubmitVote(voteChoice, text);
    return;
  }

  // 5. QUEST_EXECUTION Phase Operation via Chat
  if (phase === 'QUEST_EXECUTION') {
    const isFail = /(실패|사보타주|방해|배신|트로롤|폭파|fail|sabotage|betray|🗡️|❌)/i.test(text);
    const cardChoice = isFail ? 'FAIL' : 'SUCCESS';
    await triggerSubmitQuestCard(cardChoice, text);
    return;
  }

  // 6. ASSASSIN_PHASE Operation via Chat
  if (phase === 'ASSASSIN_PHASE') {
    const mentionedIds = extractPlayerIdsFromChat(text).filter((id) => id !== 'player_human');
    await triggerAssassination(mentionedIds[0] || null, text);
    return;
  }

  // 7. GAME_OVER Phase Operation via Chat
  if (phase === 'GAME_OVER') {
    await startNewGame('STANDARD', state.preferredRole);
  }
}

/**
 * Triggers the Leader's Quest Team Proposal on the server.
 * Releases `state.isBusyRequest` immediately after state sync so audio playback never blocks user actions.
 * @param {string[]} proposedTeamIds
 * @param {string|null} [humanChatText=null]
 */
async function triggerTeamProposal(proposedTeamIds = [], humanChatText = null) {
  if (!state.gameId || state.board?.phase !== 'TEAM_PROPOSAL') return;
  abortPendingAutoStep();
  stopActiveSpeech();
  if (state.isBusyRequest) return;

  state.isBusyRequest = true;
  state.isWaitingServer = true;
  state.phaseActionStatusText = `👑 Locking in Quest ${state.board?.currentQuestNumber || ''} Team Proposal...`;
  renderPhaseActionBanner();
  try {
    const res = await fetch(`/api/game/${state.gameId}/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposedTeamIds,
        humanChatText,
        skipTts: !state.audioEnabled
      })
    });
    const data = await res.json();
    state.isWaitingServer = false;
    state.isBusyRequest = false;
    state.phaseActionStatusText = null;
    if (res.ok) {
      applyServerGameState(data);
      state.lastTurnFinishedAt = Date.now();
      if (state.pendingHumanChatQueue.length > 0) {
        await drainPendingHumanChatQueue();
        return;
      }
      // Never synthesize robot speech for the human guest — play AI Leader or MC Jae-ho's announcement non-blockingly
      const turnToPlay =
        data.leaderTurn && data.leaderTurn.speakerId !== 'player_human'
          ? data.leaderTurn
          : data.mcTurn || data.latestTurn;
      if (turnToPlay && turnToPlay.speakerId !== 'player_human') {
        void playTurnVoiceAndHighlight(turnToPlay);
      }
    } else {
      renderPhaseActionBanner();
    }
  } catch (err) {
    console.error('Proposal error:', err);
  } finally {
    state.isWaitingServer = false;
    state.isBusyRequest = false;
    if (state.phaseActionStatusText) {
      state.phaseActionStatusText = null;
      renderPhaseActionBanner();
    }
    if (state.pendingHumanChatQueue.length > 0) {
      void drainPendingHumanChatQueue();
    }
  }
}

/**
 * Advances one live 6-Agent Multi-Agent Debate or Pre-Proposal Lobbying step
 * during `TEAM_PROPOSAL` or `DISCUSSION`.
 * Supports simultaneous Mic Clash & Polite Yield (`data.yieldTurn` -> `data.latestTurn`)
 * and abortable requests so user phase buttons always take immediate priority.
 * @param {string|null} [humanMessage=null]
 * @param {{ isAutoStep?: boolean }} [options]
 */
async function triggerDiscussionStep(humanMessage = null, options = {}) {
  if (
    !state.gameId ||
    (state.board?.phase !== 'DISCUSSION' && state.board?.phase !== 'TEAM_PROPOSAL')
  ) {
    return;
  }

  const isAutoStep = Boolean(options.isAutoStep && !humanMessage);
  if (humanMessage) {
    abortPendingAutoStep();
    stopActiveSpeech();
  }

  if (state.isBusyRequest) {
    if (!isAutoStep && humanMessage) {
      state.pendingHumanChatQueue.push(humanMessage);
    }
    return;
  }

  // If the human player actively speaks when under 35s remain, grant +20s (up to phase max)
  if (humanMessage && state.localPhaseRemainingSec < 35) {
    const maxSec = state.board?.phase === 'TEAM_PROPOSAL' ? 45 : 180;
    state.localPhaseRemainingSec = Math.min(maxSec, state.localPhaseRemainingSec + 20);
    updateTimerDisplay();
  }

  // Attach AbortController to all non-human discussion steps so phase buttons (Start Vote / Approve / Reject) preempt immediately
  const abortController = !humanMessage ? new AbortController() : null;
  if (abortController) {
    state.autoStepAbortController = abortController;
  }

  state.isBusyRequest = true;
  state.isWaitingServer = true;
  try {
    const res = await fetch(`/api/game/${state.gameId}/discuss/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: abortController ? abortController.signal : undefined,
      body: JSON.stringify({
        humanMessage,
        isAutoStep,
        targetMemberId: null,
        candidateTeamIds: [...state.selectedProposalIds],
        elapsedRoundSec: state.discussionElapsedSec,
        skipTts: !state.audioEnabled
      })
    });

    if (state.autoStepAbortController === abortController) {
      state.autoStepAbortController = null;
    }

    if (res.status === 204) {
      state.isWaitingServer = false;
      state.isBusyRequest = false;
      return;
    }

    const data = await res.json();
    state.isWaitingServer = false;
    state.isBusyRequest = false;

    if (res.ok) {
      if (state.board?.phase === 'TEAM_PROPOSAL') {
        state.proposalLobbyCount = (state.proposalLobbyCount || 0) + 1;
      }
      applyServerGameState(data);
      state.lastTurnFinishedAt = Date.now();
      if (state.pendingHumanChatQueue.length > 0) {
        await drainPendingHumanChatQueue();
        return;
      }
      void (async () => {
        if (data.yieldTurn) {
          state.activeClashYielderId = data.yieldTurn.speakerId;
          await playTurnVoiceAndHighlight(data.yieldTurn);
          state.activeClashYielderId = null;
        }
        if (data.latestTurn && state.pendingHumanChatQueue.length === 0) {
          await playTurnVoiceAndHighlight(data.latestTurn);
        }
        state.lastTurnFinishedAt = Date.now();
      })();
    }
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.error('Discussion step error:', err);
    }
  } finally {
    if (state.autoStepAbortController === abortController) {
      state.autoStepAbortController = null;
    }
    state.isWaitingServer = false;
    state.isBusyRequest = false;
    if (state.pendingHumanChatQueue.length > 0) {
      void drainPendingHumanChatQueue();
    }
  }
}

/**
 * Transitions from DISCUSSION to TEAM_VOTE (30s timer).
 * @param {string|null} [humanChatText=null]
 */
async function triggerCallVotePhase(humanChatText = null) {
  if (!state.gameId) return;
  abortPendingAutoStep();
  stopActiveSpeech();
  if (state.isBusyRequest) return;

  state.isBusyRequest = true;
  state.isWaitingServer = true;
  state.phaseActionStatusText = '🗳️ Opening 7-player Team Vote...';
  renderPhaseActionBanner();
  try {
    const res = await fetch(`/api/game/${state.gameId}/call-vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ humanChatText })
    });
    const data = await res.json();
    state.isWaitingServer = false;
    state.isBusyRequest = false;
    state.phaseActionStatusText = null;
    if (res.ok) {
      applyServerGameState(data);
      state.lastTurnFinishedAt = Date.now();
    } else {
      renderPhaseActionBanner();
    }
  } catch (err) {
    console.error('Call vote error:', err);
  } finally {
    state.isWaitingServer = false;
    state.isBusyRequest = false;
    if (state.phaseActionStatusText) {
      state.phaseActionStatusText = null;
      renderPhaseActionBanner();
    }
    if (state.pendingHumanChatQueue.length > 0) {
      void drainPendingHumanChatQueue();
    }
  }
}

/**
 * Submits the Human Player's APPROVE/REJECT vote and resolves all 7 votes simultaneously.
 * @param {'APPROVE'|'REJECT'|null} humanVote
 * @param {string|null} [humanChatText=null]
 */
async function triggerSubmitVote(humanVote = null, humanChatText = null) {
  if (!state.gameId) return;
  abortPendingAutoStep();
  stopActiveSpeech();
  if (state.isBusyRequest) return;

  state.isBusyRequest = true;
  state.isWaitingServer = true;
  state.phaseActionStatusText = `🗳️ Tallying all 7 votes (${humanVote || 'AUTO'})...`;
  renderPhaseActionBanner();
  try {
    const res = await fetch(`/api/game/${state.gameId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        humanVote,
        humanChatText,
        skipTts: !state.audioEnabled
      })
    });
    const data = await res.json();
    state.isWaitingServer = false;
    state.isBusyRequest = false;
    state.phaseActionStatusText = null;
    if (res.ok) {
      applyServerGameState(data);
      state.lastTurnFinishedAt = Date.now();
      if (data.latestTurn && data.latestTurn.speakerId !== 'player_human') {
        void playTurnVoiceAndHighlight(data.latestTurn);
      }
      if (
        state.board?.phase === 'QUEST_EXECUTION' &&
        !state.board.proposedTeamIds.includes('player_human')
      ) {
        setTimeout(() => {
          if (state.board?.phase === 'QUEST_EXECUTION') {
            triggerSubmitQuestCard('SUCCESS');
          }
        }, 800);
      }
    } else {
      renderPhaseActionBanner();
    }
  } catch (err) {
    console.error('Vote submission error:', err);
  } finally {
    state.isWaitingServer = false;
    state.isBusyRequest = false;
    if (state.phaseActionStatusText) {
      state.phaseActionStatusText = null;
      renderPhaseActionBanner();
    }
    if (state.pendingHumanChatQueue.length > 0) {
      void drainPendingHumanChatQueue();
    }
  }
}

/**
 * Submits the Quest Card (`SUCCESS` or `FAIL`) and resolves the Quest outcome.
 * @param {'SUCCESS'|'FAIL'|null} humanQuestCard
 * @param {string|null} [humanChatText=null]
 */
async function triggerSubmitQuestCard(humanQuestCard = 'SUCCESS', humanChatText = null) {
  if (!state.gameId || state.board?.phase !== 'QUEST_EXECUTION') return;
  abortPendingAutoStep();
  stopActiveSpeech();
  if (state.isBusyRequest) return;

  state.isBusyRequest = true;
  state.isWaitingServer = true;
  state.phaseActionStatusText = `⚔️ Resolving Quest ${state.board?.currentQuestNumber || ''} outcome...`;
  renderPhaseActionBanner();
  try {
    const res = await fetch(`/api/game/${state.gameId}/quest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        humanQuestCard,
        humanChatText,
        skipTts: !state.audioEnabled
      })
    });
    const data = await res.json();
    state.isWaitingServer = false;
    state.isBusyRequest = false;
    state.phaseActionStatusText = null;
    if (res.ok) {
      applyServerGameState(data);
      state.lastTurnFinishedAt = Date.now();
      if (data.latestTurn && data.latestTurn.speakerId !== 'player_human') {
        void playTurnVoiceAndHighlight(data.latestTurn);
      }
      if (
        state.board?.phase === 'ASSASSIN_PHASE' &&
        state.humanPrivateView?.self?.roleId !== 'ASSASSIN'
      ) {
        setTimeout(() => {
          if (state.board?.phase === 'ASSASSIN_PHASE') {
            triggerAssassination(null);
          }
        }, 1000);
      }
    } else {
      renderPhaseActionBanner();
    }
  } catch (err) {
    console.error('Quest execution error:', err);
  } finally {
    state.isWaitingServer = false;
    state.isBusyRequest = false;
    if (state.phaseActionStatusText) {
      state.phaseActionStatusText = null;
      renderPhaseActionBanner();
    }
    if (state.pendingHumanChatQueue.length > 0) {
      void drainPendingHumanChatQueue();
    }
  }
}

/**
 * Executes the Final Assassin Shot at Merlin.
 * @param {string|null} targetPlayerId
 * @param {string|null} [humanChatText=null]
 */
async function triggerAssassination(targetPlayerId = null, humanChatText = null) {
  if (!state.gameId || state.board?.phase !== 'ASSASSIN_PHASE') return;
  abortPendingAutoStep();
  stopActiveSpeech();
  if (state.isBusyRequest) return;

  state.isBusyRequest = true;
  state.isWaitingServer = true;
  state.phaseActionStatusText = '🗡️ Resolving Assassin Final Shot...';
  renderPhaseActionBanner();
  try {
    const res = await fetch(`/api/game/${state.gameId}/assassinate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetPlayerId,
        humanChatText,
        skipTts: !state.audioEnabled
      })
    });
    const data = await res.json();
    state.isWaitingServer = false;
    state.isBusyRequest = false;
    state.phaseActionStatusText = null;
    if (res.ok) {
      applyServerGameState(data);
      state.lastTurnFinishedAt = Date.now();
      void (async () => {
        if (data.assassinTurn) {
          await playTurnVoiceAndHighlight(data.assassinTurn);
        }
        if (data.latestTurn && data.latestTurn.id !== data.assassinTurn?.id) {
          await playTurnVoiceAndHighlight(data.latestTurn);
        }
        state.lastTurnFinishedAt = Date.now();
      })();
    } else {
      renderPhaseActionBanner();
    }
  } catch (err) {
    console.error('Assassination error:', err);
  } finally {
    state.isWaitingServer = false;
    state.isBusyRequest = false;
    if (state.phaseActionStatusText) {
      state.phaseActionStatusText = null;
      renderPhaseActionBanner();
    }
    if (state.pendingHumanChatQueue.length > 0) {
      void drainPendingHumanChatQueue();
    }
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
  state.isPlayingAudio = false;
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
  if (!turn || turn.speakerId === 'player_human') return;
  stopActiveVoiceAudioOnly();
  state.isPlayingAudio = true;

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

  const isYieldTurn =
    turn.floorEventType === 'COLLISION_YIELD' || turn.floorEventType === 'MIC_CLASH_YIELD';
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
    state.isPlayingAudio = false;
    state.lastTurnFinishedAt = Date.now();
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
            state.isPlayingAudio = false;
            state.lastTurnFinishedAt = Date.now();
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
        state.isPlayingAudio = false;
        state.lastTurnFinishedAt = Date.now();
        return;
      }
    } catch (err) {
      console.warn('WAV TTS playback failed, falling back to browser speech:', err);
    }
  }

  // 3. Fallback to Browser Neural SpeechSynthesis
  await playBrowserSpeechFallback(turn, estimatedDurationMs);
  state.isPlayingAudio = false;
  state.lastTurnFinishedAt = Date.now();
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
  state.isPlayingAudio = false;
  state.activeSpeakerId = null;
  state.activeSpeechText = '';
  state.activeTargetPlayerId = null;
  state.lastTurnFinishedAt = Date.now();
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
 * Pauses phase countdown during server LLM/TTS API requests (`state.isWaitingServer`),
 * runs pre-proposal lobbying during `TEAM_PROPOSAL` with 100% guaranteed team lock-in,
 * and triggers the next 6-Idol parallel floor bid (`Promise.all`) during `DISCUSSION`.
 */
function startAutonomousPhaseTimer() {
  setInterval(() => {
    if (!state.board || state.board.phase === 'GAME_OVER') return;

    // Pause phase countdown while waiting on server LLM/TTS API so latency never penalizes the player
    if (state.localPhaseRemainingSec > 0 && !state.isWaitingServer) {
      state.localPhaseRemainingSec -= 1;
    }

    const msSinceLastTurnFinished = Date.now() - (state.lastTurnFinishedAt || 0);
    const isFloorIdle =
      !state.isBusyRequest &&
      !state.isWaitingServer &&
      !state.isPlayingAudio &&
      !state.activeSpeakerId;

    if (state.board.phase === 'TEAM_PROPOSAL') {
      if (!state.isWaitingServer) {
        state.discussionElapsedSec += 1;
      }
      renderHeaderBoard();

      if (state.board.leaderId === 'player_human') {
        // Human is Leader: AI Idols lobby while waiting for the Human Leader to lock the team
        if (isFloorIdle && msSinceLastTurnFinished >= 2400 && state.localPhaseRemainingSec > 4) {
          state.lastAutoBeatSec = state.discussionElapsedSec;
          triggerDiscussionStep(null, { isAutoStep: true });
        }
      } else if (isFloorIdle && msSinceLastTurnFinished >= 1200) {
        // AI Idol is Leader: immediately propose and lock the Quest team to enter DISCUSSION
        triggerTeamProposal([]);
      }
    } else if (state.board.phase === 'DISCUSSION') {
      if (!state.isWaitingServer) {
        state.discussionElapsedSec += 1;
      }
      renderHeaderBoard();

      const discussionTurns = state.board.discussionTurnCountThisRound || 0;
      if (discussionTurns >= 4) {
        // After 4 idol cross-examination turns, automatically open TEAM_VOTE
        if (isFloorIdle && msSinceLastTurnFinished >= 1800) {
          triggerCallVotePhase();
        }
      } else if (isFloorIdle && msSinceLastTurnFinished >= 2400 && state.localPhaseRemainingSec > 2) {
        state.lastAutoBeatSec = state.discussionElapsedSec;
        triggerDiscussionStep(null, { isAutoStep: true });
      }
    } else if (state.board.phase === 'QUEST_EXECUTION') {
      const isHumanOnTeam = state.board.proposedTeamIds.includes('player_human');
      if (!isHumanOnTeam && isFloorIdle && msSinceLastTurnFinished >= 1200) {
        triggerSubmitQuestCard('SUCCESS');
      }
    } else if (state.board.phase === 'ASSASSIN_PHASE') {
      const isHumanAssassin = state.humanPrivateView?.self?.roleId === 'ASSASSIN';
      if (!isHumanAssassin && isFloorIdle && msSinceLastTurnFinished >= 1200) {
        triggerAssassination(null);
      }
    }

    updateTimerDisplay();

    if (
      state.localPhaseRemainingSec <= 0 &&
      !state.isBusyRequest &&
      (!state.isWaitingServer || Boolean(state.currentStepAbortController))
    ) {
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
        chatInput.value = '';
        handleHumanChatSubmission(transcript);
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
                chatInput.value = '';
                await handleHumanChatSubmission(data.transcript);
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

  // Live Chat Form Submit (Full Chat-Driven Game Operation across all 6 phases)
  const chatForm = document.getElementById('liveChatForm');
  const chatInput = document.getElementById('humanChatInput');
  chatForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    await handleHumanChatSubmission(text);
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
