/**
 * @fileoverview IDOL AVALON LIVE — Frontend Zoom Studio Client, 60FPS 2.5D Neural Talking-Head Video Rig,
 * Live <video> Stream Poller (`gemini-omni-1.1-flash`), Autonomous Round Timer, Voice/TTS Engine, and Judge X-Ray Inspector.
 */

const PHOTOREALISTIC_PORTRAIT_ANCHORS = {
  mc_jaesuk: '/generated/portrait_mc_jaesuk.png',
  idol_wonyoung: '/generated/portrait_idol_wonyoung.png',
  idol_karina: '/generated/portrait_idol_karina.png',
  idol_sullyoon: '/generated/portrait_idol_sullyoon.png',
  idol_yuna: '/generated/portrait_idol_yuna.png',
  idol_chaewon: '/generated/portrait_idol_chaewon.png',
  idol_hanni: '/generated/portrait_idol_hanni.png'
};

const REAL_WEBCAM_VIDEO_URLS = {
  mc_jaesuk: '/generated/webcam_mc_jaesuk.mp4',
  idol_wonyoung: '/generated/webcam_idol_wonyoung.mp4',
  idol_karina: '/generated/webcam_idol_karina.mp4',
  idol_sullyoon: '/generated/webcam_idol_sullyoon.mp4',
  idol_yuna: '/generated/webcam_idol_yuna.mp4',
  idol_chaewon: '/generated/webcam_idol_chaewon.mp4',
  idol_hanni: '/generated/webcam_idol_hanni.mp4'
};

/**
 * Per-character normalized facial landmark calibration for the 60FPS 2.5D Neural Talking-Head Rig.
 * Coordinates are normalized (0..1) relative to the rendered aspect-filled portrait frame.
 */
const CHARACTER_FACE_RIGS = {
  mc_jaesuk: { headX: 0.5, headY: 0.43, headRx: 0.25, headRy: 0.34, eyeY: 0.38, eyeSpanX: 0.072, mouthY: 0.56, jawRx: 0.13, jawRy: 0.13 },
  idol_wonyoung: { headX: 0.5, headY: 0.42, headRx: 0.25, headRy: 0.34, eyeY: 0.37, eyeSpanX: 0.068, mouthY: 0.55, jawRx: 0.12, jawRy: 0.12 },
  idol_karina: { headX: 0.5, headY: 0.43, headRx: 0.25, headRy: 0.34, eyeY: 0.38, eyeSpanX: 0.07, mouthY: 0.56, jawRx: 0.125, jawRy: 0.125 },
  idol_sullyoon: { headX: 0.5, headY: 0.42, headRx: 0.25, headRy: 0.34, eyeY: 0.37, eyeSpanX: 0.068, mouthY: 0.55, jawRx: 0.12, jawRy: 0.12 },
  idol_yuna: { headX: 0.5, headY: 0.42, headRx: 0.25, headRy: 0.34, eyeY: 0.37, eyeSpanX: 0.068, mouthY: 0.55, jawRx: 0.12, jawRy: 0.12 },
  idol_chaewon: { headX: 0.5, headY: 0.43, headRx: 0.25, headRy: 0.34, eyeY: 0.38, eyeSpanX: 0.07, mouthY: 0.56, jawRx: 0.125, jawRy: 0.125 },
  idol_hanni: { headX: 0.5, headY: 0.43, headRx: 0.25, headRy: 0.34, eyeY: 0.38, eyeSpanX: 0.07, mouthY: 0.56, jawRx: 0.125, jawRy: 0.125 }
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
  activeSpeechText: '',
  activeSpeechStartTime: 0,
  activeSpeechEndTime: 0,
  activeSpeechCharIndex: 0,
  activeTargetPlayerId: null,
  audioEnabled: true,
  bgmAudioElement: null,
  currentBgmMood: null,
  roleMasked: false,
  spoilersRevealed: false,
  localPhaseRemainingSec: 20,
  discussionElapsedSec: 0,
  lastAutoBeatSec: 0,
  isBusyRequest: false,
  portraitImages: new Map(),
  avatarAnimStates: new Map(),
  activeVideoStreams: new Map(),
  humanWebcamStream: null
};

// Preload photorealistic portrait images for 60FPS 2.5D neural talking-head rendering
function preloadPortraitImages() {
  Object.entries(PHOTOREALISTIC_PORTRAIT_ANCHORS).forEach(([id, url]) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      state.portraitImages.set(id, img);
    };
  });
}

/**
 * Starts a new 7-player Avalon game session on the server.
 * @param {'STANDARD'|'QUEST_4_CRITICAL'|'ASSASSIN_CLIMAX'} [demoPreset='STANDARD']
 */
async function startNewGame(demoPreset = 'STANDARD') {
  if (state.isBusyRequest) return;
  state.isBusyRequest = true;
  state.selectedProposalIds.clear();
  stopActiveSpeech();

  const preferredRoleEl = document.getElementById('preferredRoleSelect');
  const preferredRole = preferredRoleEl ? preferredRoleEl.value : 'RANDOM';

  try {
    const response = await fetch('/api/game/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: 'Guest',
        demoPreset,
        preferredRole
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to start game');

    applyServerGameState(data);
    resetPhaseClock(data.board.phaseTimerSec);

    if (data.latestTurn) {
      playTurnVoiceAndHighlight(data.latestTurn);
    }

    // If AI Idol is Leader in TEAM_PROPOSAL, automatically trigger AI proposal after a brief beat
    if (state.board.phase === 'TEAM_PROPOSAL' && state.board.leaderId !== 'player_human') {
      setTimeout(() => {
        if (state.board?.phase === 'TEAM_PROPOSAL' && state.board.leaderId !== 'player_human') {
          triggerTeamProposal([]);
        }
      }, 2400);
    }
  } catch (err) {
    console.error('Error starting new game:', err);
  } finally {
    state.isBusyRequest = false;
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

  if (previousPhase !== state.board.phase) {
    resetPhaseClock(state.board.phaseTimerSec);
    syncPhaseAdaptiveBgm(state.board.phase);
  }

  renderHeaderBoard();
  renderMcHostPanel();
  renderSecretRoleCard();
  renderPhaseActionBanner();
  renderZoomGrid();
  renderTranscriptAndXray();
}

/**
 * Resets the local phase countdown clock when entering a new phase.
 * @param {number} seconds
 */
function resetPhaseClock(seconds) {
  state.localPhaseRemainingSec = Number(seconds) || 20;
  state.discussionElapsedSec = 0;
  state.lastAutoBeatSec = 0;
  updateTimerDisplay();
}

/**
 * Renders the top 5-Quest Avalon Board Track (`2-3-3-4*-4`) and 5-Proposal Reject Track.
 */
function renderHeaderBoard() {
  const board = state.board;
  if (!board) return;

  const questContainer = document.getElementById('questTrackContainer');
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
      const icon =
        q.status === 'SUCCESS' ? '✨' : q.status === 'FAIL' ? '💀' : `Q${q.questNumber}`;
      const twoFailNote = q.failsRequired === 2 ? '2F!' : '1F';
      return `
        <div class="quest-node ${statusClass}" title="${q.label}">
          <span class="q-title">${icon} • ${q.teamSize}P</span>
          <span class="q-sub">${twoFailNote}</span>
        </div>
      `;
    })
    .join('');

  const rejectContainer = document.getElementById('rejectTrackContainer');
  const dots = [];
  for (let i = 1; i <= 5; i += 1) {
    const filled = i <= board.rejectTrack ? 'filled' : '';
    const hammerSlot = i === 5 ? 'hammer-slot' : '';
    dots.push(`<div class="reject-dot ${filled} ${hammerSlot}">${i}</div>`);
  }
  rejectContainer.innerHTML = dots.join('');

  const hammerBadge = document.getElementById('hammerWarningBadge');
  if (board.isHammerProposal) {
    hammerBadge.classList.remove('hidden');
  } else {
    hammerBadge.classList.add('hidden');
  }

  const phaseLabel = document.getElementById('currentPhaseLabel');
  phaseLabel.textContent = board.phase.replace(/_/g, ' ');

  const bystanderBadge = document.getElementById('bystanderStatusBadge');
  if (
    board.phase === 'DISCUSSION' &&
    state.humanPrivateView &&
    state.discussionElapsedSec >= 22 &&
    (board.humanStats?.messagesThisRound || 0) === 0
  ) {
    bystanderBadge.classList.remove('hidden');
  } else {
    bystanderBadge.classList.add('hidden');
  }
}

/**
 * Renders MC Jae-suk's host card and cue card commentary.
 */
function renderMcHostPanel() {
  const mcCard = document.getElementById('mcHostTile');
  const mcText = document.getElementById('mcSpeechText');
  const latestMcMsg = [...state.transcript]
    .reverse()
    .find((t) => t.speakerId === 'mc_jaesuk');

  if (latestMcMsg) {
    mcText.textContent = `"${latestMcMsg.text}"`;
  }
  if (state.activeSpeakerId === 'mc_jaesuk') {
    mcCard.classList.add('speaking-active');
  } else {
    mcCard.classList.remove('speaking-active');
  }
}

/**
 * Renders the Human Player's randomly assigned secret Avalon Role & Night Vision card.
 */
function renderSecretRoleCard() {
  const view = state.humanPrivateView;
  if (!view) return;

  const roleTitle = document.getElementById('humanRoleTitle');
  const alignBadge = document.getElementById('humanAlignmentBadge');
  const visionText = document.getElementById('humanNightVisionText');
  const roleBody = document.getElementById('roleCardBody');

  roleTitle.textContent = state.roleMasked ? '🔒 Secret Role Hidden' : view.self.roleName;
  alignBadge.textContent = view.self.teamLabel;
  alignBadge.className = `alignment-pill ${view.self.alignment === 'GOOD' ? 'good' : 'evil'}`;
  visionText.textContent = view.epistemicVision.nightVisionText;

  if (state.roleMasked) {
    roleBody.classList.add('role-masked');
  } else {
    roleBody.classList.remove('role-masked');
  }
}

/**
 * Renders the context-sensitive Phase Action Banner above the 7-tile Zoom grid.
 */
function renderPhaseActionBanner() {
  const board = state.board;
  if (!board) return;

  const badge = document.getElementById('bannerPhaseBadge');
  const instruction = document.getElementById('bannerInstructionText');
  const controls = document.getElementById('bannerActionControls');

  badge.textContent = `QUEST ${board.currentQuestNumber} (${board.requiredTeamSize} PLAYERS)`;
  controls.innerHTML = '';

  if (board.phase === 'TEAM_PROPOSAL') {
    if (board.leaderId === 'player_human') {
      // Ensure leader is pre-selected if empty
      if (state.selectedProposalIds.size === 0) {
        state.selectedProposalIds.add('player_human');
      }
      const count = state.selectedProposalIds.size;
      const req = board.requiredTeamSize;
      instruction.textContent = `👑 YOU are the Quest Leader! Click Zoom tiles below to select ${req} players (${count}/${req} selected) within ${state.localPhaseRemainingSec}s.`;
      const btn = document.createElement('button');
      btn.className = 'action-cta-btn gold';
      btn.textContent = `👑 Propose Team (${count}/${req})`;
      btn.onclick = () => triggerTeamProposal([...state.selectedProposalIds]);
      controls.appendChild(btn);
    } else {
      instruction.textContent = `👑 Leader ${board.leaderName} is analyzing suspicion scores with Gemini 4 Argon (thinking_level="high") to propose a ${board.requiredTeamSize}-player Quest Team...`;
      const btn = document.createElement('button');
      btn.className = 'action-cta-btn gold';
      btn.textContent = `⚡ Lock ${board.leaderName}'s Proposal Now`;
      btn.onclick = () => triggerTeamProposal([]);
      controls.appendChild(btn);
    }
  } else if (board.phase === 'DISCUSSION') {
    const teamStr = board.proposedTeamNames.join(', ');
    instruction.textContent = `💬 Live Debate on [${teamStr}]! Speak via mic, type in English, or stay silent (Bystander Mode). Vote auto-starts when timer hits 00:00!`;
    const voteNowBtn = document.createElement('button');
    voteNowBtn.className = 'action-cta-btn gold';
    voteNowBtn.textContent = '🗳️ Start Team Vote Now';
    voteNowBtn.onclick = () => triggerCallVotePhase();
    controls.appendChild(voteNowBtn);
  } else if (board.phase === 'TEAM_VOTE') {
    const teamStr = board.proposedTeamNames.join(', ');
    instruction.textContent = `🗳️ VOTE NOW (15s): Do you approve Leader ${board.leaderName}'s Quest ${board.currentQuestNumber} team [${teamStr}]?`;
    const approveBtn = document.createElement('button');
    approveBtn.className = 'action-cta-btn approve';
    approveBtn.textContent = '⭕ VOTE APPROVE';
    approveBtn.onclick = () => triggerSubmitVote('APPROVE');

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'action-cta-btn reject';
    rejectBtn.textContent = '❌ VOTE REJECT';
    rejectBtn.onclick = () => triggerSubmitVote('REJECT');

    controls.appendChild(approveBtn);
    controls.appendChild(rejectBtn);
  } else if (board.phase === 'QUEST_EXECUTION') {
    const humanOnMission = board.proposedTeamIds.includes('player_human');
    const humanAlignment = state.humanPrivateView?.self?.alignment || 'GOOD';

    if (humanOnMission) {
      instruction.textContent = `🛡️ YOU are on Quest ${board.currentQuestNumber}! Submit your secret Quest Card within 15s (${board.failsRequiredOnCurrentQuest === 2 ? 'Quest 4 needs 2 Fails to fail!' : '1 Fail fails the Quest'}):`;
      const successBtn = document.createElement('button');
      successBtn.className = 'action-cta-btn approve';
      successBtn.textContent = '✨ PLAY SUCCESS CARD';
      successBtn.onclick = () => triggerSubmitQuestCard('SUCCESS');
      controls.appendChild(successBtn);

      if (humanAlignment === 'EVIL') {
        const failBtn = document.createElement('button');
        failBtn.className = 'action-cta-btn reject';
        failBtn.textContent = '💀 PLAY FAIL CARD (SABOTAGE)';
        failBtn.onclick = () => triggerSubmitQuestCard('FAIL');
        controls.appendChild(failBtn);
      }
    } else {
      instruction.textContent = `🛡️ Mission Team [${board.proposedTeamNames.join(', ')}] is executing Quest ${board.currentQuestNumber}...`;
      const revealBtn = document.createElement('button');
      revealBtn.className = 'action-cta-btn gold';
      revealBtn.textContent = '⚡ Reveal Quest Cards Now';
      revealBtn.onclick = () => triggerSubmitQuestCard('SUCCESS');
      controls.appendChild(revealBtn);
    }
  } else if (board.phase === 'ASSASSIN_PHASE') {
    const humanIsAssassin = state.humanPrivateView?.self?.roleId === 'ASSASSIN';
    if (humanIsAssassin) {
      instruction.textContent = `🗡️ YOU ARE THE ASSASSIN! Good passed 3 Quests—click any Good player's Zoom tile below to ASSASSINATE MERLIN within 30s!`;
    } else {
      instruction.textContent = `🗡️ FINAL ASSASSIN PHASE! Good passed 3 Quests—the Assassin is using Gemini 4 Argon (thinking_level="high") to hunt down MERLIN!`;
      const fireBtn = document.createElement('button');
      fireBtn.className = 'action-cta-btn reject';
      fireBtn.textContent = '🗡️ Execute Assassin Final Shot';
      fireBtn.onclick = () => triggerAssassination(null);
      controls.appendChild(fireBtn);
    }
  } else if (board.phase === 'GAME_OVER') {
    badge.textContent = `${board.winner} VICTORY!`;
    instruction.textContent = `🏆 ${board.winReason}`;
    const playAgainBtn = document.createElement('button');
    playAgainBtn.className = 'action-cta-btn gold';
    playAgainBtn.textContent = '🎲 Play New Random Game';
    playAgainBtn.onclick = () => startNewGame('STANDARD');
    controls.appendChild(playAgainBtn);
  }
}

/**
 * Renders the 7-Tile Zoom Conference Grid (6 Photorealistic AI Idols + 1 Human Guest Tile).
 */
function renderZoomGrid() {
  const container = document.getElementById('zoomGridContainer');
  if (!state.players.length || !state.board) return;

  const board = state.board;
  const epistemic = state.humanPrivateView?.epistemicVision || {};

  // Build or update tiles without destroying active video/canvas elements
  if (container.children.length !== state.players.length) {
    container.innerHTML = state.players
      .map((player) => {
        const videoSrc = player.isHuman
          ? ''
          : player.lastVideoUrl || REAL_WEBCAM_VIDEO_URLS[player.id] || `/generated/webcam_${player.id}.mp4`;
        const posterSrc = player.isHuman
          ? ''
          : PHOTOREALISTIC_PORTRAIT_ANCHORS[player.id] || `/generated/portrait_${player.id}.png`;
        const videoClass = player.isHuman ? 'hidden' : 'webcam-video-feed';
        return `
        <div class="zoom-tile" id="tile_${player.id}" data-player-id="${player.id}">
          <div class="tile-media-layer">
            <video
              id="video_${player.id}"
              class="${videoClass}"
              ${videoSrc ? `src="${videoSrc}"` : ''}
              ${posterSrc ? `poster="${posterSrc}"` : ''}
              autoplay
              loop
              muted
              playsinline
            ></video>
            <canvas id="canvas_${player.id}" width="360" height="240"></canvas>
          </div>
          <div class="tile-top-overlays">
            <div class="tile-badges-left" id="badges_left_${player.id}"></div>
            <div class="tile-badges-right" id="badges_right_${player.id}"></div>
          </div>
          <div class="tile-live-caption hidden" id="caption_${player.id}"></div>
          <div class="tile-bottom-bar">
            <div class="idol-name-cluster">
              <div class="idol-name">
                <span>${player.name}</span>
                ${player.isHuman ? '<button type="button" id="humanCamBtn" class="mini-btn" title="Toggle your real webcam on this Zoom tile">📷 Cam</button>' : '<span class="mini-btn" style="background:rgba(16,185,129,0.22);border-color:rgba(16,185,129,0.5);color:#6ee7b7;font-size:8.5px;padding:1px 5px;">LIVE MP4</span>'}
              </div>
              <div class="idol-archetype">${player.inspirationTag || player.archetype}</div>
            </div>
            <div class="audio-waveform-bars">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    const mcVidEl = document.getElementById('mcWebcamVideo');
    if (mcVidEl) {
      mcVidEl.play().catch(() => {});
      state.activeVideoStreams.set('mc_jaesuk', mcVidEl);
    }

    state.players.forEach((player) => {
      if (!player.isHuman) {
        const vidEl = document.getElementById(`video_${player.id}`);
        if (vidEl) {
          vidEl.play().catch(() => {});
          state.activeVideoStreams.set(player.id, vidEl);
        }
      }
      const tileEl = document.getElementById(`tile_${player.id}`);
      if (tileEl) {
        tileEl.addEventListener('click', (e) => {
          if (e.target.id === 'humanCamBtn') {
            e.stopPropagation();
            toggleHumanWebcam();
            return;
          }
          handleTileClick(player.id);
        });
      }
    });
  }

  // Update dynamic badges, borders, and captions on each tile
  const latestSpokenByPlayer = {};
  state.transcript.slice(-10).forEach((t) => {
    latestSpokenByPlayer[t.speakerId] = t;
  });

  state.players.forEach((player) => {
    const tileEl = document.getElementById(`tile_${player.id}`);
    const leftBadges = document.getElementById(`badges_left_${player.id}`);
    const rightBadges = document.getElementById(`badges_right_${player.id}`);
    const captionEl = document.getElementById(`caption_${player.id}`);
    if (!tileEl || !leftBadges || !rightBadges || !captionEl) return;

    const isSpeaking = state.activeSpeakerId === player.id;
    const isProposed = board.proposedTeamIds.includes(player.id);
    const isSelectedForProposal =
      board.phase === 'TEAM_PROPOSAL' &&
      board.leaderId === 'player_human' &&
      state.selectedProposalIds.has(player.id);

    tileEl.classList.toggle('speaking-now', isSpeaking);
    tileEl.classList.toggle('on-proposed-team', isProposed);
    tileEl.classList.toggle('selected-for-proposal', isSelectedForProposal);

    // Left Badges: Leader Crown + Quest Team Shield + Selection Check
    const leftHtml = [];
    if (board.leaderId === player.id) {
      leftHtml.push('<span class="tile-badge leader-crown">👑 LEADER</span>');
    }
    if (isProposed) {
      leftHtml.push('<span class="tile-badge team-shield">🛡️ QUEST TEAM</span>');
    } else if (isSelectedForProposal) {
      leftHtml.push('<span class="tile-badge leader-crown">✓ PICKED</span>');
    }
    leftBadges.innerHTML = leftHtml.join('');

    // Right Badges: Epistemic Night Vision Tag (Strictly what Human's Role knows!) + Last Vote
    const rightHtml = [];
    if (!state.roleMasked) {
      if (
        epistemic.knownEvilIds?.includes(player.id) ||
        epistemic.knownEvilTeammateIds?.includes(player.id)
      ) {
        rightHtml.push('<span class="tile-badge epistemic-evil">👁️ EVIL</span>');
      } else if (epistemic.merlinCandidateIds?.includes(player.id)) {
        rightHtml.push('<span class="tile-badge epistemic-merlin-cand">🔮 MERLIN / MORGANA?</span>');
      }
    }

    // Showrevealed role if GAME_OVER
    if (board.phase === 'GAME_OVER' && state.xrayTelemetry?.trueRoles) {
      const trueRole = state.xrayTelemetry.trueRoles.find((r) => r.playerId === player.id);
      if (trueRole) {
        const cls = trueRole.alignment === 'GOOD' ? 'vote-approve' : 'vote-reject';
        rightHtml.push(`<span class="tile-badge ${cls}">${trueRole.roleName}</span>`);
      }
    } else if (state.currentVotes && state.currentVotes[player.id]) {
      const v = state.currentVotes[player.id].vote;
      const cls = v === 'APPROVE' ? 'vote-approve' : 'vote-reject';
      rightHtml.push(
        `<span class="tile-badge ${cls}">${v === 'APPROVE' ? '⭕ APPROVE' : '❌ REJECT'}</span>`
      );
    }
    rightBadges.innerHTML = rightHtml.join('');

    // Live Subtitle Bubble on tile
    const lastTurn = latestSpokenByPlayer[player.id];
    if (lastTurn && (isSpeaking || board.phase === 'DISCUSSION')) {
      captionEl.textContent = `"${lastTurn.text}"`;
      captionEl.classList.remove('hidden');
    } else {
      captionEl.classList.add('hidden');
    }
  });
}

/**
 * Handles clicking on a player's Zoom tile:
 * - During TEAM_PROPOSAL when Human is Leader: toggles selecting that player for the Quest Team.
 * - During ASSASSIN_PHASE when Human is Assassin: shoots that player as Merlin!
 * - During DISCUSSION: selects that idol as the `@Mention` target for interrogation.
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
    return;
  }

  if (playerId !== 'player_human') {
    setTargetMentionChip(playerId);
  }
}

/**
 * Renders the Live Transcript and Judge X-Ray Telemetry panels.
 */
function renderTranscriptAndXray() {
  const transcriptList = document.getElementById('transcriptList');
  if (transcriptList) {
    transcriptList.innerHTML = state.transcript
      .slice()
      .reverse()
      .map((item) => {
        const typeClass =
          item.speakerId === 'mc_jaesuk'
            ? 'mc-item'
            : item.speakerId === 'player_human'
              ? 'human-item'
              : 'idol-item';
        return `
          <div class="transcript-item ${typeClass}">
            <div class="t-header">
              <span class="t-speaker">${item.speakerName}</span>
              <span class="t-meta">Q${item.questNumber} • ${item.modelUsed} (${item.thinkingLevel})</span>
            </div>
            <p class="t-text">${item.text}</p>
            <div class="t-verify">${item.verificationNote || '✅ Verified'}</div>
          </div>
        `;
      })
      .join('');
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
          <div><strong>${v.speakerName}</strong> <span class="t-meta">(${v.roleName})</span></div>
          <div class="t-verify">${v.note}</div>
        </div>
      `
      )
      .join('');
  }

  const monologueList = document.getElementById('innerMonologueList');
  if (monologueList) {
    monologueList.innerHTML = (xray.recentInnerMonologues || [])
      .slice()
      .reverse()
      .map(
        (m) => `
        <div class="xray-card">
          <div><strong>${m.speakerName}</strong> <span class="t-meta">[${m.roleName} • ${m.modelUsed}]</span></div>
          <div class="xray-thought">🧠 Inner Monologue: "${m.privateInnerThought}"</div>
          <div class="t-text" style="margin-top:3px;">🗣️ Public Speech: "${m.publicSpeech}"</div>
        </div>
      `
      )
      .join('');
  }

  const trueRolesContainer = document.getElementById('trueRolesContainer');
  if (trueRolesContainer) {
    trueRolesContainer.innerHTML = (xray.trueRoles || [])
      .map(
        (r) => `
        <div class="true-role-chip">
          <strong>${r.playerName}:</strong>
          <span style="color:${r.alignment === 'GOOD' ? '#6ee7b7' : '#fda4af'}">${r.roleName}</span>
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
  try {
    const res = await fetch(`/api/game/${state.gameId}/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposedTeamIds })
    });
    const data = await res.json();
    if (res.ok) {
      applyServerGameState(data);
      if (data.leaderTurn) {
        playTurnVoiceAndHighlight(data.leaderTurn);
      }
    }
  } catch (err) {
    console.error('Proposal error:', err);
  } finally {
    state.isBusyRequest = false;
  }
}

/**
 * Advances one live debate turn during the 75s DISCUSSION phase (either responding to Human input
 * or running an autonomous AI-to-AI turn / Bystander detection).
 * @param {string|null} [humanMessage=null]
 */
async function triggerDiscussionStep(humanMessage = null) {
  if (!state.gameId || state.isBusyRequest) return;
  if (state.board?.phase !== 'DISCUSSION') return;

  state.isBusyRequest = true;
  try {
    const res = await fetch(`/api/game/${state.gameId}/discuss/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        humanMessage,
        targetMemberId: state.selectedTargetMemberId || null,
        elapsedRoundSec: state.discussionElapsedSec
      })
    });
    const data = await res.json();
    if (res.ok) {
      applyServerGameState(data);
      if (data.latestTurn) {
        playTurnVoiceAndHighlight(data.latestTurn);
      }
    }
  } catch (err) {
    console.error('Discussion step error:', err);
  } finally {
    state.isBusyRequest = false;
  }
}

/**
 * Transitions from DISCUSSION to TEAM_VOTE (15s timer).
 */
async function triggerCallVotePhase() {
  if (!state.gameId || state.isBusyRequest) return;
  state.isBusyRequest = true;
  stopActiveSpeech();
  try {
    const res = await fetch(`/api/game/${state.gameId}/call-vote`, {
      method: 'POST'
    });
    const data = await res.json();
    if (res.ok) {
      applyServerGameState(data);
    }
  } catch (err) {
    console.error('Call vote error:', err);
  } finally {
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
  try {
    const res = await fetch(`/api/game/${state.gameId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ humanVote })
    });
    const data = await res.json();
    if (res.ok) {
      applyServerGameState(data);
      if (data.latestTurn) {
        playTurnVoiceAndHighlight(data.latestTurn);
      }
      // If vote rejected and next Leader is an AI Idol, schedule AI Leader proposal!
      if (
        state.board.phase === 'TEAM_PROPOSAL' &&
        state.board.leaderId !== 'player_human'
      ) {
        setTimeout(() => {
          if (state.board?.phase === 'TEAM_PROPOSAL' && state.board.leaderId !== 'player_human') {
            triggerTeamProposal([]);
          }
        }, 3200);
      }
      // If vote approved and human is NOT on the Quest Team, automatically execute the AI Quest after 3s!
      if (
        state.board.phase === 'QUEST_EXECUTION' &&
        !state.board.proposedTeamIds.includes('player_human')
      ) {
        setTimeout(() => {
          if (state.board?.phase === 'QUEST_EXECUTION') {
            triggerSubmitQuestCard('SUCCESS');
          }
        }, 3200);
      }
    }
  } catch (err) {
    console.error('Vote submission error:', err);
  } finally {
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
  try {
    const res = await fetch(`/api/game/${state.gameId}/quest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ humanQuestCard })
    });
    const data = await res.json();
    if (res.ok) {
      applyServerGameState(data);
      if (data.latestTurn) {
        playTurnVoiceAndHighlight(data.latestTurn);
      }
      // If next phase is TEAM_PROPOSAL and AI is Leader, schedule AI proposal
      if (
        state.board.phase === 'TEAM_PROPOSAL' &&
        state.board.leaderId !== 'player_human'
      ) {
        setTimeout(() => {
          if (state.board?.phase === 'TEAM_PROPOSAL' && state.board.leaderId !== 'player_human') {
            triggerTeamProposal([]);
          }
        }, 3500);
      }
      // If next phase is ASSASSIN_PHASE and AI is Assassin, schedule AI Assassin shot after 4s
      if (
        state.board.phase === 'ASSASSIN_PHASE' &&
        state.humanPrivateView?.self?.roleId !== 'ASSASSIN'
      ) {
        setTimeout(() => {
          if (state.board?.phase === 'ASSASSIN_PHASE') {
            triggerAssassination(null);
          }
        }, 4200);
      }
    }
  } catch (err) {
    console.error('Quest execution error:', err);
  } finally {
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
  try {
    const res = await fetch(`/api/game/${state.gameId}/assassinate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPlayerId })
    });
    const data = await res.json();
    if (res.ok) {
      applyServerGameState(data);
      if (data.assassinTurn) {
        playTurnVoiceAndHighlight(data.assassinTurn);
      }
    }
  } catch (err) {
    console.error('Assassination error:', err);
  } finally {
    state.isBusyRequest = false;
  }
}

/**
 * Plays the character's spoken audio (`gemini-3.8-flash-tts` base64 audio or expressive neural browser voice),
 * polls/attaches any background `gemini-omni-1.1-flash` video clip, and drives the 60FPS 2.5D Neural Talking-Head
 * phoneme lip-sync & multi-agent listener reaction engine.
 * @param {object} turn
 */
function playTurnVoiceAndHighlight(turn) {
  if (!turn) return;
  const text = String(turn.text || '');
  state.activeSpeakerId = turn.speakerId;
  state.activeSpeechText = text;
  state.activeSpeechStartTime = Date.now();
  state.activeSpeechCharIndex = 0;
  state.activeTargetPlayerId = turn.targetPlayerId || null;

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const estimatedDurationMs = Math.max(3200, Math.min(9800, wordCount * 330));
  state.activeSpeechEndTime = Date.now() + estimatedDurationMs;

  // Trigger a double-blink & posture shift on the speaker and target listener
  const speakerAnim = getOrInitAvatarAnimState(turn.speakerId);
  speakerAnim.NextBlinkAt = performance.now() + 80;
  speakerAnim.DoubleBlinkPending = true;

  if (turn.videoUrl || turn.videoTaskId) {
    attachOrPollTurnVideoStream(turn);
  }

  renderMcHostPanel();
  renderZoomGrid();

  if (!state.audioEnabled) return;

  // 1. If server returned `gemini-3.8-flash-tts` audio bytes, play them directly
  if (turn.audioBase64) {
    try {
      const audio = new Audio(`data:${turn.audioMimeType || 'audio/wav'};base64,${turn.audioBase64}`);
      audio.onended = () => {
        if (state.activeSpeakerId === turn.speakerId) {
          clearActiveSpeakerState();
        }
      };
      audio.play().catch(() => {});
      return;
    } catch {
      // Fall through to browser neural speech
    }
  }

  // 2. Expressive Multi-Character Neural Voice Synthesis with real-time word boundary tracking for lip-sync
  if ('speechSynthesis' in window) {
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
        utterance.pitch = 1.06;
        utterance.rate = 1.09;
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

      // Sync exact spoken character index from browser neural TTS boundary events
      utterance.onboundary = (event) => {
        if (typeof event.charIndex === 'number') {
          state.activeSpeechCharIndex = event.charIndex;
        }
      };

      utterance.onend = () => {
        if (state.activeSpeakerId === turn.speakerId) {
          clearActiveSpeakerState();
        }
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis errors on restricted browsers
    }
  }
}

function clearActiveSpeakerState() {
  state.activeSpeakerId = null;
  state.activeSpeechText = '';
  state.activeTargetPlayerId = null;
  renderMcHostPanel();
  renderZoomGrid();
}

function stopActiveSpeech() {
  clearActiveSpeakerState();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Attaches a live `gemini-omni-1.1-flash` video URL or polls `/api/media/video/:taskId`
 * when a background video generation job is running.
 * @param {object} turn
 */
function attachOrPollTurnVideoStream(turn) {
  const speakerId = turn.speakerId;
  if (turn.videoUrl) {
    mountSpeakerVideoUrl(speakerId, turn.videoUrl);
    return;
  }
  if (!turn.videoTaskId) return;

  let attempts = 0;
  const pollTimer = setInterval(async () => {
    attempts += 1;
    if (attempts > 8) {
      clearInterval(pollTimer);
      return;
    }
    try {
      const res = await fetch(`/api/media/video/${turn.videoTaskId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.videoUrl) {
        clearInterval(pollTimer);
        mountSpeakerVideoUrl(speakerId, data.videoUrl);
      } else if (data.status === 'live_canvas_synced') {
        clearInterval(pollTimer);
      }
    } catch {
      clearInterval(pollTimer);
    }
  }, 1800);
}

function mountSpeakerVideoUrl(speakerId, videoUrl) {
  const videoEl = document.getElementById(`video_${speakerId}`);
  if (!videoEl || !videoUrl) return;
  if (videoEl.src !== videoUrl) {
    videoEl.crossOrigin = 'anonymous';
    videoEl.src = videoUrl;
    videoEl.play().catch(() => {});
    state.activeVideoStreams.set(speakerId, videoEl);
  }
}

/**
 * Returns or initializes per-character physiological animation state (blinking, smooth gaze, jaw inertia).
 * @param {string} id
 */
function getOrInitAvatarAnimState(id) {
  if (!state.avatarAnimStates.has(id)) {
    const now = performance.now();
    state.avatarAnimStates.set(id, {
      NextBlinkAt: now + 900 + Math.random() * 2400,
      BlinkStartAt: 0,
      BlinkDurationMs: 135,
      DoubleBlinkPending: false,
      SmoothJawOpen: 0,
      SmoothLipWidth: 1,
      SmoothHeadTurnX: 0,
      SmoothHeadNodY: 0,
      SmoothHeadTilt: 0,
      SmoothGazeX: 0,
      SmoothGazeY: 0,
      CurrentVisemeLabel: 'IDLE'
    });
  }
  return state.avatarAnimStates.get(id);
}

/**
 * Computes real-time phoneme/viseme mouth & jaw articulation (`A/O`, `E/I`, `U/W`, `M/B`, `C/T`)
 * from the active spoken text and millisecond playback clock.
 * @param {number} timeSec
 */
function computeRealTimeSpeechViseme(timeSec) {
  const text = state.activeSpeechText || '';
  if (!text) {
    const fallbackOpen = (Math.sin(timeSec * 19) * 0.5 + 0.5) * 0.75;
    return { open: fallbackOpen, width: 1.02, label: 'A/O' };
  }

  const now = Date.now();
  const totalDur = Math.max(1000, state.activeSpeechEndTime - state.activeSpeechStartTime);
  const progress = Math.min(0.99, Math.max(0, (now - state.activeSpeechStartTime) / totalDur));
  const estCharIdx = Math.floor(progress * text.length);
  const charIdx = Math.max(state.activeSpeechCharIndex, estCharIdx);

  // Inspect a 2-character window around current spoken position
  const ch = (text[charIdx] || 'a').toLowerCase();
  const syllabicPulse =
    0.58 +
    0.42 *
      Math.sin(timeSec * 26.5) *
      Math.cos(timeSec * 13.2);

  if (/[ao]/.test(ch)) {
    return { open: 0.88 * syllabicPulse + 0.12, width: 1.03, label: 'A/O' };
  }
  if (/[eiy]/.test(ch)) {
    return { open: 0.56 * syllabicPulse + 0.1, width: 1.14, label: 'E/I' };
  }
  if (/[uw]/.test(ch)) {
    return { open: 0.64 * syllabicPulse + 0.08, width: 0.88, label: 'U/W' };
  }
  if (/[mbp]/.test(ch)) {
    return { open: 0.05, width: 0.96, label: 'M/B' };
  }
  if (/[.,!?;:\s]/.test(ch)) {
    return { open: 0.18 * syllabicPulse, width: 1.0, label: '...' };
  }
  return { open: 0.48 * syllabicPulse + 0.08, width: 1.02, label: 'C/T' };
}

/**
 * 60FPS Real-Time 2.5D Neural Talking-Head Video Rig & Multi-Agent Listener Reaction Loop.
 * Renders MC Jae-suk and all 6 K-Pop Idols as live moving video streams with:
 * - Independent 3D head gimbal (nodding on syllables, tilting in doubt, turning toward active speaker)
 * - Real-time phoneme/viseme jaw & lower-lip mesh deformation synchronized to speech
 * - Physiological eye blinking & saccadic pupil/catchlight gaze tracking
 * - Simultaneous listener reactions across all 7 tiles (nodding, shaking head when accused, skeptical tilt)
 */
function startWebcamAnimationLoop() {
  const renderFrame = (timestamp) => {
    const t = timestamp * 0.001;

    if (Date.now() > state.activeSpeechEndTime && state.activeSpeakerId) {
      clearActiveSpeakerState();
    }

    // Determine active speaker seat position so listeners turn their head/gaze toward the speaker
    const activeSpeakerIdx = state.players.findIndex((p) => p.id === state.activeSpeakerId);

    // 1. Render MC Jae-suk Host Live Video Feed
    const mcCanvas = document.getElementById('mcWebcamCanvas');
    if (mcCanvas) {
      drawPhotorealisticWebcamTile(mcCanvas, {
        id: 'mc_jaesuk',
        name: 'MC Jae-suk',
        seatIndex: -1,
        activeSpeakerIdx,
        isSpeaking: state.activeSpeakerId === 'mc_jaesuk',
        emotion: state.mcHost?.currentExpression || 'speaking',
        themeColor: '#f59e0b',
        timeSec: t,
        nowMs: timestamp,
        isHuman: false
      });
    }

    // 2. Render 7 Player Zoom Video Feeds
    state.players.forEach((player, idx) => {
      const canvas = document.getElementById(`canvas_${player.id}`);
      if (!canvas) return;
      drawPhotorealisticWebcamTile(canvas, {
        id: player.id,
        name: player.name,
        seatIndex: idx,
        activeSpeakerIdx,
        isSpeaking: state.activeSpeakerId === player.id,
        emotion: player.currentExpression || 'idle',
        themeColor: player.themeColor || '#ec4899',
        timeSec: t + idx * 1.37,
        nowMs: timestamp,
        isHuman: player.isHuman
      });
    });

    requestAnimationFrame(renderFrame);
  };

  requestAnimationFrame(renderFrame);
}

/**
 * Renders a 60FPS 2.5D Neural Talking-Head Video Feed onto `canvas` with anatomical layer separation:
 * 1. Steady Studio Background & Bokeh Lighting Layer
 * 2. Breathing Torso & Shoulders Layer
 * 3. Independent 3D Head & Hair Gimbal Layer (Nod, Turn, Tilt)
 * 4. Real-Time Phoneme/Viseme Jaw & Mouth Mesh Warping Layer
 * 5. Physiological Eyelid Blink & Saccadic Gaze Layer
 * 6. Broadcast Camera Autofocus HUD & Live Listener Reaction Telemetry
 */
function drawPhotorealisticWebcamTile(
  canvas,
  { id, name, seatIndex, activeSpeakerIdx, isSpeaking, emotion, themeColor, timeSec, nowMs, isHuman }
) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const anim = getOrInitAvatarAnimState(id);
  const rig = CHARACTER_FACE_RIGS[id] || CHARACTER_FACE_RIGS.idol_wonyoung;

  ctx.clearRect(0, 0, w, h);

  // Update physiological eye blink state machine
  let blinkAmount = 0;
  if (nowMs >= anim.NextBlinkAt) {
    anim.BlinkStartAt = nowMs;
    if (anim.DoubleBlinkPending) {
      anim.DoubleBlinkPending = false;
      anim.NextBlinkAt = nowMs + 220;
    } else {
      anim.NextBlinkAt = nowMs + 2400 + Math.random() * 2400;
      if (Math.random() < 0.22) anim.DoubleBlinkPending = true;
    }
  }
  const blinkElapsed = nowMs - anim.BlinkStartAt;
  if (blinkElapsed >= 0 && blinkElapsed <= anim.BlinkDurationMs) {
    blinkAmount = Math.sin((blinkElapsed / anim.BlinkDurationMs) * Math.PI);
  }

  // Determine live listener behavior when someone else is speaking
  const isAccusedTarget =
    !isSpeaking && state.activeSpeakerId && state.activeTargetPlayerId === id;
  const isOnProposedTeam = state.board?.proposedTeamIds?.includes(id);

  let listenerReactionTag = '';
  let targetHeadTurnX = 0;
  let targetHeadNodY = 0;
  let targetHeadTilt = 0;
  let targetGazeX = 0;
  let targetGazeY = 0;
  let targetJawOpen = 0;
  let targetLipWidth = 1;

  if (isSpeaking) {
    const viseme = computeRealTimeSpeechViseme(timeSec);
    targetJawOpen = viseme.open;
    targetLipWidth = viseme.width;
    anim.CurrentVisemeLabel = viseme.label;

    // Expressive speaker head motion: rhythmic syllable nodding + natural conversational sway
    targetHeadTurnX = Math.sin(timeSec * 3.4) * 5.2 + Math.cos(timeSec * 5.1) * 2.4;
    targetHeadNodY = Math.abs(Math.sin(timeSec * 9.5)) * 4.2 + viseme.open * 3.2;
    targetHeadTilt = Math.sin(timeSec * 2.8) * 0.036;
    targetGazeX = Math.sin(timeSec * 2.2) * 2.2;
    targetGazeY = Math.cos(timeSec * 3.1) * 1.2;
  } else {
    anim.CurrentVisemeLabel = 'LISTENING';
    // Look toward whichever seat is currently speaking on the Zoom call
    if (state.activeSpeakerId) {
      const dir =
        activeSpeakerIdx >= 0 && seatIndex >= 0
          ? Math.sign(activeSpeakerIdx - seatIndex)
          : state.activeSpeakerId === 'mc_jaesuk'
            ? -1
            : 1;
      targetGazeX = dir * 3.2 + Math.sin(timeSec * 1.7) * 0.8;
      targetHeadTurnX = dir * 4.5 + Math.sin(timeSec * 1.5) * 1.8;

      if (isAccusedTarget) {
        // Reacting to being questioned/accused: defensive head shake + surprised mouth gasp
        listenerReactionTag = '⚡ REACTING';
        targetHeadTurnX = Math.sin(timeSec * 14) * 6.5;
        targetHeadTilt = -0.035;
        targetJawOpen = 0.28 + Math.abs(Math.sin(timeSec * 8)) * 0.18;
      } else if (emotion === 'suspicious') {
        listenerReactionTag = '🤨 DOUBTING';
        targetHeadTilt = 0.042 * (seatIndex % 2 === 0 ? 1 : -1);
        targetHeadNodY = Math.sin(timeSec * 2.2) * 1.5;
      } else if (emotion === 'shocked') {
        listenerReactionTag = '😲 GASPING';
        targetJawOpen = 0.34;
        targetHeadNodY = -2.5;
      } else if (isOnProposedTeam) {
        // Nodding affirmatively with the proposed team
        listenerReactionTag = '👍 NODDING';
        targetHeadNodY = Math.sin(timeSec * 7.2) * 3.8;
        targetHeadTilt = Math.sin(timeSec * 1.9) * 0.018;
      } else {
        listenerReactionTag = '👀 WATCHING';
        targetHeadNodY = Math.sin(timeSec * 3.1) * 2.1;
        targetHeadTilt = Math.sin(timeSec * 1.6) * 0.022;
      }
    } else {
      // Idle live camera presence: natural head drift, micro-nods, and eye glances
      targetHeadTurnX = Math.sin(timeSec * 1.4) * 3.2;
      targetHeadNodY = Math.cos(timeSec * 2.1) * 2.2;
      targetHeadTilt = Math.sin(timeSec * 1.1) * 0.02;
      targetGazeX = Math.sin(timeSec * 0.9) * 2.0;
    }
  }

  // Smooth exponential damping for lifelike physical inertia
  anim.SmoothJawOpen += (targetJawOpen - anim.SmoothJawOpen) * 0.38;
  anim.SmoothLipWidth += (targetLipWidth - anim.SmoothLipWidth) * 0.32;
  anim.SmoothHeadTurnX += (targetHeadTurnX - anim.SmoothHeadTurnX) * 0.18;
  anim.SmoothHeadNodY += (targetHeadNodY - anim.SmoothHeadNodY) * 0.22;
  anim.SmoothHeadTilt += (targetHeadTilt - anim.SmoothHeadTilt) * 0.18;
  anim.SmoothGazeX += (targetGazeX - anim.SmoothGazeX) * 0.25;
  anim.SmoothGazeY += (targetGazeY - anim.SmoothGazeY) * 0.25;

  // Check if a background `gemini-omni-1.1-flash` video stream is actively playing on this tile
  const activeVideoEl = state.activeVideoStreams.get(id);
  const hasLiveVideoStream =
    activeVideoEl && activeVideoEl.readyState >= 2 && !activeVideoEl.paused;

  const img = state.portraitImages.get(id);

  if (hasLiveVideoStream) {
    ctx.drawImage(activeVideoEl, 0, 0, w, h);
  } else if (img && img.complete && img.naturalWidth > 0) {
    // Compute aspect-fill geometry
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
    const baseScale = isSpeaking ? 1.075 : 1.045;
    const scaledW = drawW * baseScale;
    const scaledH = drawH * baseScale;
    const baseX = (w - scaledW) / 2;
    const baseY = (h - scaledH) / 2;

    // =========================================================================
    // LAYER 1: STEADY STUDIO ROOM BACKGROUND + AMBIENT LIGHTING BOKEH
    // =========================================================================
    ctx.save();
    const bgDriftX = Math.sin(timeSec * 0.5) * 1.2;
    const bgDriftY = Math.cos(timeSec * 0.4) * 1.0;
    ctx.drawImage(img, baseX + bgDriftX, baseY + bgDriftY, scaledW, scaledH);
    ctx.restore();

    // =========================================================================
    // LAYER 2: INDEPENDENT BREATHING SHOULDERS & TORSO LAYER
    // =========================================================================
    const breathePhase = Math.sin(timeSec * 2.4);
    const torsoRiseY = breathePhase * 2.6;
    const torsoExpandX = 1 + breathePhase * 0.014 + (isSpeaking ? 0.012 : 0);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.88, w * 0.44, h * 0.32, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(w * 0.5, h * 0.82 + torsoRiseY);
    ctx.scale(torsoExpandX, 1);
    ctx.translate(-w * 0.5, -h * 0.82);
    ctx.drawImage(img, baseX, baseY, scaledW, scaledH);
    ctx.restore();

    // =========================================================================
    // LAYER 3: INDEPENDENT 3D HEAD & HAIR GIMBAL (TURN, NOD, TILT)
    // =========================================================================
    const headPivotX = w * rig.headX;
    const headPivotY = h * rig.headY;
    const headRx = w * rig.headRx;
    const headRy = h * rig.headRy;

    ctx.save();
    ctx.translate(
      headPivotX + anim.SmoothHeadTurnX,
      headPivotY + anim.SmoothHeadNodY + torsoRiseY * 0.35
    );
    ctx.rotate(anim.SmoothHeadTilt);
    ctx.translate(-headPivotX, -headPivotY);

    // Clip head & hair silhouette
    ctx.beginPath();
    ctx.ellipse(headPivotX, headPivotY, headRx * 1.18, headRy * 1.15, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, baseX, baseY, scaledW, scaledH);

    // =========================================================================
    // LAYER 4: REAL-TIME PHONEME/VISEME JAW DROP & LOWER-LIP ARTICULATION
    // =========================================================================
    const mouthX = w * rig.headX;
    const mouthY = h * rig.mouthY;
    const jawRx = w * rig.jawRx;
    const jawRy = h * rig.jawRy;
    const jawDropPx = anim.SmoothJawOpen * (h * 0.042);

    if (anim.SmoothJawOpen > 0.02) {
      // Shift lower jaw & chin downward and modulate width by vowel viseme
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(mouthX, mouthY + jawRy * 0.55, jawRx, jawRy, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(mouthX, mouthY);
      ctx.scale(anim.SmoothLipWidth, 1);
      ctx.translate(-mouthX, -mouthY + jawDropPx);
      ctx.drawImage(img, baseX, baseY, scaledW, scaledH);
      ctx.restore();

      // Render organic animated mouth parting & inner lip articulation along mouthY
      ctx.save();
      const mouthOpenW = jawRx * 0.52 * anim.SmoothLipWidth;
      const mouthOpenH = Math.max(1.2, anim.SmoothJawOpen * (h * 0.028));

      // Outer lip shadow / movement contour
      const lipGrad = ctx.createRadialGradient(
        mouthX,
        mouthY + jawDropPx * 0.35,
        0.5,
        mouthX,
        mouthY + jawDropPx * 0.35,
        mouthOpenW * 1.25
      );
      lipGrad.addColorStop(0, `rgba(28, 10, 16, ${Math.min(0.82, 0.35 + anim.SmoothJawOpen * 0.5)})`);
      lipGrad.addColorStop(0.65, `rgba(110, 38, 52, ${Math.min(0.55, anim.SmoothJawOpen * 0.42)})`);
      lipGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = lipGrad;
      ctx.beginPath();
      ctx.ellipse(
        mouthX,
        mouthY + jawDropPx * 0.35,
        mouthOpenW,
        mouthOpenH,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Subtle upper teeth / tongue highlight when vowel is wide open (A/O/E)
      if (anim.SmoothJawOpen > 0.42) {
        ctx.fillStyle = `rgba(255, 245, 245, ${(anim.SmoothJawOpen - 0.4) * 0.35})`;
        ctx.beginPath();
        ctx.ellipse(
          mouthX,
          mouthY + jawDropPx * 0.18,
          mouthOpenW * 0.62,
          mouthOpenH * 0.32,
          0,
          0,
          Math.PI
        );
        ctx.fill();
      }
      ctx.restore();
    }

    // =========================================================================
    // LAYER 5: PHYSIOLOGICAL EYE BLINKING & SACCADIC GAZE CATCHLIGHTS
    // =========================================================================
    const eyeY = h * rig.eyeY;
    const leftEyeX = headPivotX - w * rig.eyeSpanX;
    const rightEyeX = headPivotX + w * rig.eyeSpanX;
    const eyeRx = w * 0.036;
    const eyeRy = h * 0.022;

    if (blinkAmount > 0.04) {
      // Warp upper eyelid skin strip downward over both eyes to create a natural blink
      [leftEyeX, rightEyeX].forEach((ex) => {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, eyeRx * 1.15, eyeRy * 1.2, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.translate(0, blinkAmount * eyeRy * 1.45);
        ctx.drawImage(img, baseX, baseY - eyeRy * 0.9, scaledW, scaledH);

        // Eyelash closure crease line
        ctx.strokeStyle = `rgba(20, 14, 18, ${0.45 * blinkAmount})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(ex, eyeY - eyeRy * 0.15, eyeRx * 0.85, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        ctx.restore();
      });
    } else {
      // Animated studio ring-light eye catchlights that shift with saccadic gaze
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
      [leftEyeX, rightEyeX].forEach((ex) => {
        ctx.beginPath();
        ctx.arc(
          ex + anim.SmoothGazeX,
          eyeY - 1.5 + anim.SmoothGazeY,
          1.4,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
      ctx.restore();
    }

    ctx.restore(); // End Layer 3 Head Gimbal transform
  } else {
    // Animated VIP Studio Feed for Guest Player (when real webcam is off)
    const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Animated avatar silhouette for Guest VIP
    const guestNod = Math.sin(timeSec * 3.2) * 3;
    ctx.fillStyle = themeColor;
    ctx.beginPath();
    ctx.arc(
      w / 2,
      h * 0.39 + guestNod,
      30 + (isSpeaking ? anim.SmoothJawOpen * 6 : 0),
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isHuman ? 'YOU (CLICK 📷 CAM FOR LIVE WEBCAM)' : name, w / 2, h * 0.64);
  }

  // =========================================================================
  // LAYER 6: STUDIO LIGHTING VIGNETTE, AUTOFOCUS FACE TRACKER & LIVE TELEMETRY
  // =========================================================================
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.24, w / 2, h / 2, w * 0.76);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(6, 9, 18, 0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // Dynamic Face-Tracking Autofocus Brackets `[ AF-LOCK ]` following the moving head
  if (!isHuman) {
    const trackX = w * rig.headX + anim.SmoothHeadTurnX;
    const trackY = h * rig.headY + anim.SmoothHeadNodY;
    const boxW = w * 0.36;
    const boxH = h * 0.48;
    const bx = trackX - boxW / 2;
    const by = trackY - boxH / 2;
    const corner = 9;

    ctx.save();
    ctx.strokeStyle = isSpeaking
      ? 'rgba(16, 185, 129, 0.78)'
      : isAccusedTarget
        ? 'rgba(244, 63, 94, 0.78)'
        : 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = isSpeaking ? 1.8 : 1.1;

    // 4 Corner brackets
    ctx.beginPath();
    ctx.moveTo(bx, by + corner);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + corner, by);
    ctx.moveTo(bx + boxW - corner, by);
    ctx.lineTo(bx + boxW, by);
    ctx.lineTo(bx + boxW, by + corner);
    ctx.moveTo(bx, by + boxH - corner);
    ctx.lineTo(bx, by + boxH);
    ctx.lineTo(bx + corner, by + boxH);
    ctx.moveTo(bx + boxW - corner, by + boxH);
    ctx.lineTo(bx + boxW, by + boxH);
    ctx.lineTo(bx + boxW, by + boxH - corner);
    ctx.stroke();
    ctx.restore();
  }

  // Live Speaking Border, Phoneme Viseme HUD & Audio Waveform
  if (isSpeaking) {
    ctx.save();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    // Live Viseme + Audio dB Telemetry Chip
    ctx.fillStyle = 'rgba(6, 78, 59, 0.88)';
    ctx.fillRect(10, h - 62, 134, 18);
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    const dbVal = (-12 + anim.SmoothJawOpen * 10).toFixed(1);
    ctx.fillText(`🎙️ LIVE [${anim.CurrentVisemeLabel}] ${dbVal}dB`, 15, h - 50);

    // Dynamic voice equalizer wave along bottom of video feed
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.9)';
    ctx.lineWidth = 2.4;
    for (let x = 20; x < w - 20; x += 5) {
      const amp =
        Math.sin(x * 0.09 + timeSec * 26) *
        Math.cos(x * 0.04 - timeSec * 16) *
        (4 + anim.SmoothJawOpen * 9);
      const y = h - 36 + amp;
      if (x === 20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  } else if (listenerReactionTag && !isHuman) {
    // Simultaneous Listener Reaction Badge on non-speaking idols
    ctx.save();
    ctx.fillStyle = isAccusedTarget
      ? 'rgba(244, 63, 94, 0.86)'
      : emotion === 'suspicious'
        ? 'rgba(245, 158, 11, 0.84)'
        : 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(w - 102, h - 60, 92, 18);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(listenerReactionTag, w - 96, h - 48);
    ctx.restore();
  }
}

/**
 * 1-Second Autonomous Phase Timer & Bystander Detection Loop.
 * Ensures every round is strictly timed and progresses automatically even if the human player never speaks!
 */
function startAutonomousPhaseTimer() {
  setInterval(() => {
    if (!state.board || state.board.phase === 'GAME_OVER') return;

    if (state.localPhaseRemainingSec > 0) {
      state.localPhaseRemainingSec -= 1;
    }

    if (state.board.phase === 'DISCUSSION') {
      state.discussionElapsedSec += 1;
      renderHeaderBoard();

      // Trigger autonomous AI Idol debate turns every 11 seconds during the 75s discussion!
      if (
        state.discussionElapsedSec - state.lastAutoBeatSec >= 11 &&
        !state.isBusyRequest &&
        state.localPhaseRemainingSec > 4
      ) {
        state.lastAutoBeatSec = state.discussionElapsedSec;
        triggerDiscussionStep(null);
      }
    }

    updateTimerDisplay();

    // Automatic Phase Progression when countdown hits 00:00!
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
 * Sets the active `@Idol` mention chip for targeted questioning.
 * @param {string} targetId
 */
function setTargetMentionChip(targetId) {
  state.selectedTargetMemberId = targetId;
  document.querySelectorAll('.mention-chip').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.target === targetId);
  });
  const input = document.getElementById('humanChatInput');
  if (input && targetId) {
    const idol = state.players.find((p) => p.id === targetId);
    if (idol && !input.value.includes(`@${idol.name}`)) {
      input.value = `@${idol.name} ${input.value}`.trim() + ' ';
      input.focus();
    }
  }
}

/**
 * Toggles the Human Guest's real webcam on the 7th Zoom tile (`tile_player_human`).
 */
async function toggleHumanWebcam() {
  const videoEl = document.getElementById('video_player_human');
  const canvasEl = document.getElementById('canvas_player_human');
  if (!videoEl || !canvasEl) return;

  if (state.humanWebcamStream) {
    state.humanWebcamStream.getTracks().forEach((t) => t.stop());
    state.humanWebcamStream = null;
    videoEl.classList.add('hidden');
    canvasEl.classList.remove('hidden');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    state.humanWebcamStream = stream;
    videoEl.srcObject = stream;
    videoEl.classList.remove('hidden');
    canvasEl.classList.add('hidden');
  } catch {
    alert('Webcam permission was denied or no camera was found.');
  }
}

/**
 * Phase-Adaptive Background Music Loop Engine (`lyria-3-clip-preview` / `lyria-3.5`).
 * Automatically fetches/generates and loops the phase soundtrack (`discussion`, `vote`, `quest`, `assassin`).
 * @param {string} [phase='DISCUSSION']
 * @param {boolean} [forceRegenerate=false]
 */
async function syncPhaseAdaptiveBgm(phase = 'DISCUSSION', forceRegenerate = false) {
  const phaseToMood = {
    TEAM_PROPOSAL: 'discussion',
    DISCUSSION: 'discussion',
    TEAM_VOTE: 'vote',
    QUEST_EXECUTION: 'quest',
    ASSASSIN_PHASE: 'assassin',
    GAME_OVER: 'assassin'
  };
  const targetMood = phaseToMood[phase] || 'discussion';

  if (!state.audioEnabled) {
    if (state.bgmAudioElement) {
      state.bgmAudioElement.pause();
    }
    return null;
  }

  if (!forceRegenerate && state.currentBgmMood === targetMood && state.bgmAudioElement) {
    if (state.bgmAudioElement.paused) {
      state.bgmAudioElement.play().catch(() => {});
    }
    return { mood: targetMood, bgmUrl: state.bgmAudioElement.src };
  }

  try {
    const res = forceRegenerate
      ? await fetch('/api/media/bgm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mood: targetMood, forceRegenerate: true })
        })
      : await fetch(`/api/media/bgm?mood=${encodeURIComponent(targetMood)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.bgmUrl) return null;

    state.currentBgmMood = targetMood;
    if (!state.bgmAudioElement) {
      state.bgmAudioElement = new Audio();
      state.bgmAudioElement.loop = true;
      state.bgmAudioElement.volume = 0.16;
    }
    state.bgmAudioElement.src = `${data.bgmUrl}?t=${Date.now()}`;
    if (state.audioEnabled) {
      state.bgmAudioElement.play().catch(() => {});
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Helper to convert a recorded microphone `Blob` to a Base64 string.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Live Microphone Speech-to-Text (`MediaRecorder` -> `POST /api/media/transcribe` `gemini-3.5-transcribe`
 * + simultaneous `Web Speech API` interim preview). Supports both Korean and English speech.
 */
function setupMicrophoneInput() {
  const micBtn = document.getElementById('micPushToTalkBtn');
  const micLabel = document.getElementById('micBtnLabel');
  const chatInput = document.getElementById('humanChatInput');
  if (!micBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let mediaRecorder = null;
  let mediaStream = null;
  let recordedChunks = [];
  let isRecording = false;
  let interimTranscript = '';
  let autoStopTimer = null;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = navigator.language?.startsWith('ko') ? 'ko-KR' : 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let combined = '';
      for (let i = 0; i < event.results.length; i += 1) {
        combined += event.results[i][0].transcript;
      }
      if (combined.trim()) {
        interimTranscript = combined.trim();
        chatInput.value = interimTranscript;
      }
    };
    recognition.onerror = () => {};
  }

  const stopRecordingAndTranscribe = async () => {
    if (!isRecording) return;
    isRecording = false;
    if (autoStopTimer) {
      clearTimeout(autoStopTimer);
      autoStopTimer = null;
    }

    micBtn.classList.remove('recording');
    micLabel.textContent = '⏳ Transcribing...';

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Ignore if already stopped
      }
    }

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      await new Promise((resolve) => {
        mediaRecorder.onstop = resolve;
        try {
          mediaRecorder.stop();
        } catch {
          resolve();
        }
      });
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }

    let finalTranscript = '';
    if (recordedChunks.length > 0) {
      try {
        const mimeType = mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(recordedChunks, { type: mimeType });
        if (audioBlob.size > 400) {
          const audioBase64 = await blobToBase64(audioBlob);
          const res = await fetch('/api/media/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64, mimeType })
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.transcript) {
              finalTranscript = String(data.transcript).trim();
            }
          }
        }
      } catch (err) {
        console.warn('Server audio transcription fallback to Web Speech:', err);
      }
    }

    const chosenText = finalTranscript || interimTranscript || chatInput.value.trim();
    micLabel.textContent = 'Speak Live';

    if (chosenText) {
      chatInput.value = chosenText;
      if (state.board?.phase === 'DISCUSSION') {
        state.lastAutoBeatSec = state.discussionElapsedSec;
        chatInput.value = '';
        await triggerDiscussionStep(chosenText);
      } else {
        chatInput.focus();
      }
    }
  };

  micBtn.addEventListener('click', async () => {
    if (isRecording) {
      await stopRecordingAndTranscribe();
      return;
    }

    interimTranscript = '';
    recordedChunks = [];

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';
        mediaRecorder = preferredMime
          ? new MediaRecorder(mediaStream, { mimeType: preferredMime })
          : new MediaRecorder(mediaStream);

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data);
          }
        };
        mediaRecorder.start(250);
      }
    } catch (err) {
      console.warn('Microphone getUserMedia unavailable, using SpeechRecognition fallback:', err);
    }

    if (recognition) {
      try {
        recognition.start();
      } catch {
        // Ignore if already started
      }
    }

    if (!mediaRecorder && !recognition) {
      chatInput.focus();
      return;
    }

    isRecording = true;
    micBtn.classList.add('recording');
    micLabel.textContent = '🔴 Stop & Send';
    chatInput.placeholder = 'Listening via Microphone (Speak in Korean or English, then click Stop & Send)...';

    // Auto-stop after 15 seconds if user forgets to click Stop
    autoStopTimer = setTimeout(() => {
      if (isRecording) {
        stopRecordingAndTranscribe();
      }
    }, 15000);
  });
}

/**
 * Initializes all UI event listeners and starts the initial game session.
 */
function initApp() {
  preloadPortraitImages();
  startWebcamAnimationLoop();
  startAutonomousPhaseTimer();
  setupMicrophoneInput();

  // Live Chat Form Submit
  const chatForm = document.getElementById('liveChatForm');
  const chatInput = document.getElementById('humanChatInput');
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    state.lastAutoBeatSec = state.discussionElapsedSec;
    await triggerDiscussionStep(text);
  });

  // Stay Silent / Next Idol Turn Button (Tests Bystander Mode & Autonomous AI Play)
  document.getElementById('nextAiBeatBtn').addEventListener('click', () => {
    if (state.board?.phase === 'DISCUSSION') {
      state.discussionElapsedSec = Math.max(state.discussionElapsedSec, 25);
      state.lastAutoBeatSec = state.discussionElapsedSec;
      triggerDiscussionStep(null);
    }
  });

  // Call Vote Now Button
  document.getElementById('callVoteEarlyBtn').addEventListener('click', () => {
    if (state.board?.phase === 'DISCUSSION') {
      triggerCallVotePhase();
    }
  });

  // Mention Chips
  document.querySelectorAll('.mention-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      setTargetMentionChip(chip.dataset.target || '');
    });
  });

  // Scenario Buttons
  document.querySelectorAll('.scenario-btn[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      startNewGame(btn.dataset.preset);
    });
  });

  // Hide/Show Human Secret Role
  document.getElementById('toggleRoleMaskBtn').addEventListener('click', (e) => {
    state.roleMasked = !state.roleMasked;
    e.currentTarget.textContent = state.roleMasked ? '👁️ Show' : '👁️ Hide';
    renderSecretRoleCard();
    renderZoomGrid();
  });

  // Voice & BGM Toggle
  document.getElementById('audioToggleBtn').addEventListener('click', (e) => {
    state.audioEnabled = !state.audioEnabled;
    e.currentTarget.classList.toggle('active', state.audioEnabled);
    e.currentTarget.textContent = state.audioEnabled ? '🔊 Voice & BGM: ON' : '🔇 Voice & BGM: OFF';
    if (!state.audioEnabled) {
      stopActiveSpeech();
      if (state.bgmAudioElement) state.bgmAudioElement.pause();
    } else {
      syncPhaseAdaptiveBgm(state.board?.phase || 'DISCUSSION');
    }
  });

  // Right Rail Tabs (Transcript vs Judge X-Ray)
  document.querySelectorAll('.rail-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.rail-tab').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.rail-tab-content').forEach((c) => c.classList.remove('active'));
      tabBtn.classList.add('active');
      document.getElementById(tabBtn.dataset.tab)?.classList.add('active');
    });
  });

  document.getElementById('judgeXrayToggleBtn').addEventListener('click', () => {
    document.getElementById('xrayTabButton').click();
  });

  // Spoiler Toggle in Judge X-Ray
  document.getElementById('revealTrueRolesBtn').addEventListener('click', (e) => {
    state.spoilersRevealed = !state.spoilersRevealed;
    const grid = document.getElementById('trueRolesContainer');
    grid.classList.toggle('blurred-spoilers', !state.spoilersRevealed);
    e.currentTarget.textContent = state.spoilersRevealed ? 'Hide Spoilers' : 'Show Spoilers';
  });

  // API Key & Media Studio Modal
  const modal = document.getElementById('apiKeyModal');
  document.getElementById('apiKeyModalBtn').addEventListener('click', () => {
    modal.classList.remove('hidden');
  });
  document.getElementById('closeModalBtn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  document.getElementById('saveApiKeyBtn').addEventListener('click', async () => {
    const keyVal = document.getElementById('apiKeyInput').value.trim();
    const statusEl = document.getElementById('modalStatusMsg');
    const res = await fetch('/api/config/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: keyVal })
    });
    const data = await res.json();
    statusEl.textContent = data.apiKeyConfigured
      ? '✅ Gemini API Key active! Live gemini-4-argon & companion models enabled.'
      : '⚠️ Please enter a valid Gemini API key.';
  });

  document.getElementById('generatePortraitsBtn').addEventListener('click', async () => {
    const statusEl = document.getElementById('modalStatusMsg');
    statusEl.textContent = '⏳ Generating 4K Photorealistic Idol Portraits via gemini-nano-banana-2.1...';
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
          ? `✅ Generated ${updatedCount} photorealistic portraits via gemini-nano-banana-2.1!`
          : '✅ Photorealistic Studio Portrait Anchors active on all 7 Zoom feeds!';
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
    }
  });

  const lyriaBtn = document.getElementById('generateLyriaBgmBtn');
  if (lyriaBtn) {
    lyriaBtn.addEventListener('click', async () => {
      const statusEl = document.getElementById('modalStatusMsg');
      statusEl.textContent = '⏳ Generating Adaptive BGM Loop via lyria-3-clip-preview (Lyria 3.5)...';
      try {
        const result = await syncPhaseAdaptiveBgm(state.board?.phase || 'DISCUSSION', true);
        statusEl.textContent = result?.bgmUrl
          ? `✅ Generated & playing Lyria 3.5 BGM loop (${result.bgmUrl} via ${result.modelUsed})!`
          : '⚠️ Could not generate Lyria BGM loop. Check API key status.';
      } catch (err) {
        statusEl.textContent = `Error: ${err.message}`;
      }
    });
  }

  // Start initial game automatically!
  startNewGame('STANDARD');
}

window.addEventListener('DOMContentLoaded', initApp);

