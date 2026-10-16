/**
 * @fileoverview Avalon Stage — Discord Voice & Video Call Client (`gemini-4-argon` Orchestration).
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
  roleMasked: false,
  spoilersRevealed: false,
  localPhaseRemainingSec: 20,
  discussionElapsedSec: 0,
  lastAutoBeatSec: 0,
  isBusyRequest: false,
  portraitImages: new Map(),
  avatarAnimStates: new Map(),
  activeVideoStreams: new Map(),
  humanWebcamStream: null,
  bgmAudio: null,
  currentBgmMood: null
};

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
 * Starts a new 7-player Avalon game session on the server.
 * @param {'STANDARD'|'QUEST_4_CRITICAL'|'ASSASSIN_CLIMAX'} [demoPreset='STANDARD']
 */
async function startNewGame(demoPreset = 'STANDARD') {
  if (state.isBusyRequest) return;
  state.isBusyRequest = true;
  state.selectedProposalIds.clear();
  stopActiveSpeech();

  try {
    const response = await fetch('/api/game/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: 'Guest',
        demoPreset
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to start game');

    applyServerGameState(data);
    resetPhaseClock(data.board.phaseTimerSec);

    if (data.latestTurn) {
      playTurnVoiceAndHighlight(data.latestTurn);
    }

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
  }

  renderHeaderBoard();
  renderSecretRoleCard();
  renderPhaseActionBanner();
  renderZoomGrid();
  renderSidebarVoiceMembers();
  renderTranscriptAndXray();
  syncPhaseAdaptiveBgm();
}

/**
 * Synchronizes phase-adaptive background music (`lyria-3.5` / `lyria-3-clip-preview`).
 */
async function syncPhaseAdaptiveBgm() {
  if (!state.board || !state.audioEnabled) return;
  const phase = state.board.phase;
  const mood =
    phase === 'ASSASSIN_PHASE' || state.board.currentQuestNumber >= 4
      ? 'climax'
      : phase === 'TEAM_VOTE' || phase === 'QUEST_EXECUTION'
        ? 'suspense'
        : 'discussion';

  if (state.currentBgmMood === mood && state.bgmAudio && !state.bgmAudio.paused) {
    return;
  }
  state.currentBgmMood = mood;

  try {
    const res = await fetch(`/api/media/bgm?mood=${encodeURIComponent(mood)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.bgmUrl || !state.audioEnabled) return;

    if (!state.bgmAudio) {
      state.bgmAudio = new Audio();
      state.bgmAudio.loop = true;
      state.bgmAudio.volume = 0.08;
    }
    if (!state.bgmAudio.src.endsWith(data.bgmUrl)) {
      state.bgmAudio.src = data.bgmUrl;
      state.bgmAudio.play().catch(() => {});
    }
  } catch {
    // Ignore BGM fetch errors
  }
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
      name: 'MC Jae-suk',
      tag: 'Host',
      avatar: PHOTOREALISTIC_PORTRAIT_ANCHORS.mc_jaesuk
    },
    ...state.players.map((p) => ({
      id: p.id,
      name: p.isHuman ? 'Guest (You)' : p.name,
      tag: state.board?.leaderId === p.id ? 'Leader' : p.isHuman ? 'You' : '',
      avatar: PHOTOREALISTIC_PORTRAIT_ANCHORS[p.id] || null
    }))
  ];

  listEl.innerHTML = allCallParticipants
    .map((m) => {
      const isSpeaking = state.activeSpeakerId === m.id;
      const avatarHtml = m.avatar
        ? `<img class="vm-avatar" src="${m.avatar}" alt="${m.name}" />`
        : `<div class="vm-avatar" style="display:flex;align-items:center;justify-content:center;background:#5865f2;color:#fff;font-size:10px;font-weight:700;">G</div>`;
      return `
        <div class="voice-member-row ${isSpeaking ? 'speaking' : ''}" data-member-id="${m.id}">
          ${avatarHtml}
          <span class="vm-name">${m.name}</span>
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
 * Renders the Human Player's randomly assigned secret Avalon Role & Night Vision card.
 */
function renderSecretRoleCard() {
  const view = state.humanPrivateView;
  if (!view) return;

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
      btn.textContent = `Lock Proposal`;
      btn.onclick = () => triggerTeamProposal([]);
      controls.appendChild(btn);
    }
  } else if (board.phase === 'DISCUSSION') {
    const teamStr = board.proposedTeamNames.join(', ');
    instruction.textContent = `Proposed Team: ${teamStr} — Discuss or call vote`;
    const voteNowBtn = document.createElement('button');
    voteNowBtn.className = 'action-cta-btn blurple';
    voteNowBtn.textContent = 'Start Vote';
    voteNowBtn.onclick = () => triggerCallVotePhase();
    controls.appendChild(voteNowBtn);
  } else if (board.phase === 'TEAM_VOTE') {
    const teamStr = board.proposedTeamNames.join(', ');
    instruction.textContent = `Vote on ${board.leaderName}'s Team [${teamStr}]:`;
    const approveBtn = document.createElement('button');
    approveBtn.className = 'action-cta-btn approve';
    approveBtn.textContent = 'Approve';
    approveBtn.onclick = () => triggerSubmitVote('APPROVE');

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'action-cta-btn reject';
    rejectBtn.textContent = 'Reject';
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
      successBtn.textContent = 'Success';
      successBtn.onclick = () => triggerSubmitQuestCard('SUCCESS');
      controls.appendChild(successBtn);

      if (humanAlignment === 'EVIL') {
        const failBtn = document.createElement('button');
        failBtn.className = 'action-cta-btn reject';
        failBtn.textContent = 'Fail (Sabotage)';
        failBtn.onclick = () => triggerSubmitQuestCard('FAIL');
        controls.appendChild(failBtn);
      }
    } else {
      instruction.textContent = `Team [${board.proposedTeamNames.join(', ')}] is executing Quest ${board.currentQuestNumber}...`;
      const revealBtn = document.createElement('button');
      revealBtn.className = 'action-cta-btn blurple';
      revealBtn.textContent = 'Reveal Outcome';
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
      fireBtn.textContent = 'Resolve Assassin Shot';
      fireBtn.onclick = () => triggerAssassination(null);
      controls.appendChild(fireBtn);
    }
  } else if (board.phase === 'GAME_OVER') {
    badge.textContent = `${board.winner} Victory`;
    instruction.textContent = board.winReason;
    const playAgainBtn = document.createElement('button');
    playAgainBtn.className = 'action-cta-btn blurple';
    playAgainBtn.textContent = 'New Game';
    playAgainBtn.onclick = () => startNewGame('STANDARD');
    controls.appendChild(playAgainBtn);
  }
}

/**
 * Renders the 8-Tile (4x2) 16:9 Discord Video Call Stage:
 * Tile 1: MC Jae-suk (Host)
 * Tiles 2–7: 6 K-Pop Idols
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
      name: 'MC Jae-suk',
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
      .map(
        (participant) => `
        <div class="zoom-tile" id="tile_${participant.id}" data-player-id="${participant.id}">
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
            <span class="tile-participant-name">${participant.isHuman ? 'Guest (You)' : participant.name}</span>
          </div>
        </div>
      `
      )
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
  state.transcript.slice(-8).forEach((t) => {
    latestSpokenByPlayer[t.speakerId] = t;
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
      leftHtml.push('<span class="tile-badge">Host</span>');
    } else {
      if (board.leaderId === participant.id) {
        leftHtml.push('<span class="tile-badge leader-crown">Leader</span>');
      }
      if (isProposed) {
        leftHtml.push('<span class="tile-badge team-shield">On Quest</span>');
      } else if (isSelectedForProposal) {
        leftHtml.push('<span class="tile-badge leader-crown">Selected</span>');
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
      }
    }
    rightBadges.innerHTML = rightHtml.join('');

    // Show clean closed-caption overlay for active speaker (or MC host cue)
    const lastTurn = latestSpokenByPlayer[participant.id];
    if (lastTurn && isSpeaking) {
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
 * - During DISCUSSION: selects that idol as the `@Mention` target.
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

        return `
          <div class="discord-msg">
            ${avatarEl}
            <div class="msg-body">
              <div class="msg-header">
                <span class="msg-author ${authorClass}">${item.speakerName}</span>
                <span class="msg-meta">Q${item.questNumber}</span>
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
    monologueList.innerHTML = (xray.recentInnerMonologues || [])
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
 * Advances one live debate turn during the 75s DISCUSSION phase.
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
 * Plays the character's spoken audio (`gemini-3.8-flash-tts` or browser neural TTS),
 * attaches any `gemini-omni-1.1-flash` video stream, and highlights their Discord tile.
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
  const estimatedDurationMs = Math.max(3000, Math.min(9500, wordCount * 320));
  state.activeSpeechEndTime = Date.now() + estimatedDurationMs;

  if (turn.videoUrl || turn.videoTaskId) {
    attachOrPollTurnVideoStream(turn);
  }

  renderZoomGrid();
  renderSidebarVoiceMembers();

  if (!state.audioEnabled) return;

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
      // Fall through to browser neural TTS
    }
  }

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

      utterance.onend = () => {
        if (state.activeSpeakerId === turn.speakerId) {
          clearActiveSpeakerState();
        }
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis errors
    }
  }
}

function clearActiveSpeakerState() {
  state.activeSpeakerId = null;
  state.activeSpeechText = '';
  state.activeTargetPlayerId = null;
  renderZoomGrid();
  renderSidebarVoiceMembers();
}

function stopActiveSpeech() {
  clearActiveSpeakerState();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Attaches or polls `/api/media/video/:taskId` for a `gemini-omni-1.1-flash` video stream.
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

function getOrInitAvatarAnimState(id) {
  if (!state.avatarAnimStates.has(id)) {
    state.avatarAnimStates.set(id, {
      SmoothPanX: 0,
      SmoothPanY: 0,
      SmoothScale: 1.03,
      SmoothTilt: 0,
      SmoothSpeakEnergy: 0
    });
  }
  return state.avatarAnimStates.get(id);
}

/**
 * 60FPS Webcam Frame Loop for all 8 tiles (`mc_jaesuk` + 6 Idols + `player_human`).
 */
function startWebcamAnimationLoop() {
  const renderFrame = (timestamp) => {
    const t = timestamp * 0.001;

    if (Date.now() > state.activeSpeechEndTime && state.activeSpeakerId) {
      clearActiveSpeakerState();
    }

    const allIds = ['mc_jaesuk', ...state.players.map((p) => p.id)];
    allIds.forEach((id, idx) => {
      const canvas = document.getElementById(`canvas_${id}`);
      if (!canvas) return;
      drawPhotorealisticWebcamTile(canvas, {
        id,
        isSpeaking: state.activeSpeakerId === id,
        isHuman: id === 'player_human',
        timeSec: t + idx * 1.43
      });
    });

    requestAnimationFrame(renderFrame);
  };

  requestAnimationFrame(renderFrame);
}

/**
 * Renders a clean, artifact-free 16:9 HD webcam frame onto `canvas`:
 * - Uses the real Korean K-Pop idol & MC Jae-suk portraits (`/generated/portrait_<id>.png`) or active `<video>`.
 * - Applies smooth, natural breathing & conversational camera presence without drawing artificial dots or oval seams on faces.
 * - For `player_human` (when webcam is off), renders an authentic Discord voice-call avatar tile.
 */
function drawPhotorealisticWebcamTile(canvas, { id, isSpeaking, isHuman, timeSec }) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const anim = getOrInitAvatarAnimState(id);

  ctx.clearRect(0, 0, w, h);

  // Target camera/posture motion
  const targetEnergy = isSpeaking
    ? 0.5 + 0.5 * Math.sin(timeSec * 18) * Math.cos(timeSec * 11)
    : 0;
  const targetScale = isSpeaking ? 1.055 + targetEnergy * 0.012 : 1.03 + Math.sin(timeSec * 1.8) * 0.006;
  const targetPanX = isSpeaking
    ? Math.sin(timeSec * 2.8) * 4.5
    : Math.sin(timeSec * 1.1) * 2.2;
  const targetPanY = isSpeaking
    ? Math.abs(Math.sin(timeSec * 7.5)) * 3.2
    : Math.cos(timeSec * 1.9) * 1.8;
  const targetTilt = isSpeaking
    ? Math.sin(timeSec * 2.4) * 0.008
    : Math.sin(timeSec * 0.9) * 0.003;

  anim.SmoothSpeakEnergy += (targetEnergy - anim.SmoothSpeakEnergy) * 0.28;
  anim.SmoothScale += (targetScale - anim.SmoothScale) * 0.14;
  anim.SmoothPanX += (targetPanX - anim.SmoothPanX) * 0.16;
  anim.SmoothPanY += (targetPanY - anim.SmoothPanY) * 0.18;
  anim.SmoothTilt += (targetTilt - anim.SmoothTilt) * 0.14;

  const activeVideoEl = state.activeVideoStreams.get(id);
  const hasLiveVideoStream =
    activeVideoEl && activeVideoEl.readyState >= 2 && !activeVideoEl.paused;

  const img = state.portraitImages.get(id);

  if (hasLiveVideoStream) {
    ctx.drawImage(activeVideoEl, 0, 0, w, h);
    return;
  }

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

    const scaledW = drawW * anim.SmoothScale;
    const scaledH = drawH * anim.SmoothScale;

    ctx.save();
    ctx.translate(w / 2 + anim.SmoothPanX, h / 2 + anim.SmoothPanY);
    ctx.rotate(anim.SmoothTilt);
    ctx.drawImage(img, -scaledW / 2, -scaledH / 2, scaledW, scaledH);
    ctx.restore();

    // Subtle bottom gradient so the participant pill is always crisp
    const bottomGrad = ctx.createLinearGradient(0, h * 0.72, 0, h);
    bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
  } else {
    // Authentic Discord dark matte tile when camera is off (Guest tile)
    ctx.fillStyle = '#191b1f';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 - 4;
    const radius = 42;

    if (isSpeaking) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 6 + anim.SmoothSpeakEnergy * 4, 0, Math.PI * 2);
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
 * 1-Second Autonomous Phase Timer & Bystander Detection Loop.
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
  const chatInput = document.getElementById('humanChatInput');
  if (!micBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;
  let mediaRecorder = null;
  let recordedChunks = [];
  let webSpeechTranscribed = false;

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
      isListening = false;
      micBtn.classList.remove('recording');
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    };
  }

  micBtn.addEventListener('click', async () => {
    if (isListening) {
      isListening = false;
      micBtn.classList.remove('recording');
      if (recognition) recognition.stop();
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      return;
    }

    webSpeechTranscribed = false;
    isListening = true;
    micBtn.classList.add('recording');

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
  chatForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    state.lastAutoBeatSec = state.discussionElapsedSec;
    await triggerDiscussionStep(text);
  });

  // Stay Silent / Next Idol Turn Button
  document.getElementById('nextAiBeatBtn')?.addEventListener('click', () => {
    if (state.board?.phase === 'DISCUSSION') {
      state.discussionElapsedSec = Math.max(state.discussionElapsedSec, 25);
      state.lastAutoBeatSec = state.discussionElapsedSec;
      triggerDiscussionStep(null);
    }
  });

  // Call Vote Now Button
  document.getElementById('callVoteEarlyBtn')?.addEventListener('click', () => {
    if (state.board?.phase === 'DISCUSSION') {
      triggerCallVotePhase();
    }
  });

  // Dock Camera Toggle Button
  document.getElementById('dockCamBtn')?.addEventListener('click', () => {
    toggleHumanWebcam();
  });

  // New Game / Hangup Call Button
  document.getElementById('newGameHangupBtn')?.addEventListener('click', () => {
    startNewGame('STANDARD');
  });

  // Toggle Right Chat Drawer
  document.getElementById('toggleChatDrawerBtn')?.addEventListener('click', (e) => {
    const appEl = document.getElementById('discordApp');
    if (!appEl) return;
    const isCollapsed = appEl.classList.toggle('chat-collapsed');
    e.currentTarget.classList.toggle('active', !isCollapsed);
  });

  // Mention Chips
  document.querySelectorAll('.mention-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      setTargetMentionChip(chip.dataset.target || '');
    });
  });

  // Scenario Preset Buttons (both in left rail and sidebar)
  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      startNewGame(btn.dataset.preset);
    });
  });

  // Hide/Show Human Secret Role
  document.getElementById('toggleRoleMaskBtn')?.addEventListener('click', (e) => {
    state.roleMasked = !state.roleMasked;
    e.currentTarget.textContent = state.roleMasked ? 'Show' : 'Hide';
    renderSecretRoleCard();
    renderZoomGrid();
  });

  // Voice & TTS Audio Toggle
  document.getElementById('audioToggleBtn')?.addEventListener('click', (e) => {
    state.audioEnabled = !state.audioEnabled;
    e.currentTarget.classList.toggle('active', state.audioEnabled);
    if (!state.audioEnabled) {
      stopActiveSpeech();
      if (state.bgmAudio) state.bgmAudio.pause();
    } else {
      syncPhaseAdaptiveBgm();
    }
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

  document.getElementById('judgeXrayToggleBtn')?.addEventListener('click', () => {
    const appEl = document.getElementById('discordApp');
    appEl?.classList.remove('chat-collapsed');
    document.getElementById('toggleChatDrawerBtn')?.classList.add('active');
    document.getElementById('xrayTabButton')?.click();
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
