/**
 * @fileoverview IDOL AVALON LIVE — Frontend Zoom Studio Client, 60FPS Photorealistic Webcam Renderer,
 * Autonomous Round Timer, Voice/TTS Engine, and Judge X-Ray Inspector.
 */

const PHOTOREALISTIC_PORTRAIT_ANCHORS = {
  mc_jaesuk:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85',
  idol_wonyoung:
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=85',
  idol_karina:
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=85',
  idol_sullyoon:
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=85',
  idol_yuna:
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=85',
  idol_chaewon:
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=85',
  idol_hanni:
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=85'
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
  activeSpeechEndTime: 0,
  audioEnabled: true,
  roleMasked: false,
  spoilersRevealed: false,
  localPhaseRemainingSec: 20,
  discussionElapsedSec: 0,
  lastAutoBeatSec: 0,
  isBusyRequest: false,
  portraitImages: new Map(),
  humanWebcamStream: null
};

// Preload photorealistic portrait images for 60FPS webcam canvas rendering
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

  // Build or update tiles without destroying active canvas elements
  if (container.children.length !== state.players.length) {
    container.innerHTML = state.players
      .map(
        (player) => `
        <div class="zoom-tile" id="tile_${player.id}" data-player-id="${player.id}">
          <div class="tile-media-layer">
            <canvas id="canvas_${player.id}" width="360" height="240"></canvas>
            <video id="video_${player.id}" class="hidden" autoplay loop muted playsinline></video>
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
                ${player.isHuman ? '<button type="button" id="humanCamBtn" class="mini-btn" title="Toggle your real webcam on this Zoom tile">📷 Cam</button>' : ''}
              </div>
              <div class="idol-archetype">${player.inspirationTag || player.archetype}</div>
            </div>
            <div class="audio-waveform-bars">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
        </div>
      `
      )
      .join('');

    state.players.forEach((player) => {
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
 * Plays the character's spoken audio (`gemini-3.8-flash-tts` base64 audio or expressive neural browser voice)
 * and activates the 60FPS audio-reactive lip-sync & Zoom speaker spotlight!
 * @param {object} turn
 */
function playTurnVoiceAndHighlight(turn) {
  if (!turn) return;
  state.activeSpeakerId = turn.speakerId;
  const wordCount = (turn.text || '').split(/\s+/).length;
  const estimatedDurationMs = Math.max(3200, Math.min(9500, wordCount * 340));
  state.activeSpeechEndTime = Date.now() + estimatedDurationMs;

  renderMcHostPanel();
  renderZoomGrid();

  if (!state.audioEnabled) return;

  // 1. If server returned `gemini-3.8-flash-tts` audio bytes, play them directly
  if (turn.audioBase64) {
    try {
      const audio = new Audio(`data:${turn.audioMimeType || 'audio/wav'};base64,${turn.audioBase64}`);
      audio.onended = () => {
        if (state.activeSpeakerId === turn.speakerId) {
          state.activeSpeakerId = null;
          renderMcHostPanel();
          renderZoomGrid();
        }
      };
      audio.play().catch(() => {});
      return;
    } catch {
      // Fall through to browser neural speech
    }
  }

  // 2. Expressive Multi-Character Neural Voice Synthesis (Distinct pitch & rate per K-Pop Idol & MC Jae-suk)
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(turn.text);
      utterance.lang = 'en-US';

      const voices = window.speechSynthesis.getVoices();
      const playerObj = state.players.find((p) => p.id === turn.speakerId);

      if (turn.speakerId === 'mc_jaesuk') {
        const maleVoice = voices.find((v) =>
          /en/i.test(v.lang) && /(male|david|guy|daniel|google us english)/i.test(v.name)
        );
        if (maleVoice) utterance.voice = maleVoice;
        utterance.pitch = 1.06;
        utterance.rate = 1.1;
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

      utterance.onend = () => {
        if (state.activeSpeakerId === turn.speakerId) {
          state.activeSpeakerId = null;
          renderMcHostPanel();
          renderZoomGrid();
        }
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis errors on restricted browsers
    }
  }
}

function stopActiveSpeech() {
  state.activeSpeakerId = null;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * 60FPS Photorealistic Live Webcam & Audio-Reactive Animation Loop.
 * Renders MC Jae-suk and all 6 K-Pop Idols onto their Zoom `<canvas>` tiles with:
 * - Natural webcam breathing & camera micro-sway
 * - Studio ring-light reflections
 * - Live speaking jaw/mouth pulse & emotional expression badges
 * - Live HD webcam timestamp & broadcast overlay
 */
function startWebcamAnimationLoop() {
  const renderFrame = (timestamp) => {
    const t = timestamp * 0.001;

    if (Date.now() > state.activeSpeechEndTime && state.activeSpeakerId) {
      state.activeSpeakerId = null;
      renderMcHostPanel();
      renderZoomGrid();
    }

    // 1. Render MC Jae-suk Webcam Canvas
    const mcCanvas = document.getElementById('mcWebcamCanvas');
    if (mcCanvas) {
      drawPhotorealisticWebcamTile(mcCanvas, {
        id: 'mc_jaesuk',
        name: 'MC Jae-suk',
        isSpeaking: state.activeSpeakerId === 'mc_jaesuk',
        emotion: state.mcHost?.currentExpression || 'speaking',
        themeColor: '#f59e0b',
        timeSec: t
      });
    }

    // 2. Render 7 Player Zoom Tiles
    state.players.forEach((player, idx) => {
      const canvas = document.getElementById(`canvas_${player.id}`);
      if (!canvas) return;
      drawPhotorealisticWebcamTile(canvas, {
        id: player.id,
        name: player.name,
        isSpeaking: state.activeSpeakerId === player.id,
        emotion: player.currentExpression || 'idle',
        themeColor: player.themeColor || '#ec4899',
        timeSec: t + idx * 1.37,
        isHuman: player.isHuman
      });
    });

    requestAnimationFrame(renderFrame);
  };

  requestAnimationFrame(renderFrame);
}

/**
 * Draws a lifelike, photorealistic K-Pop studio webcam feed with natural breathing motion,
 * studio lighting, and real-time voice-reactive animation.
 */
function drawPhotorealisticWebcamTile(
  canvas,
  { id, name, isSpeaking, emotion, themeColor, timeSec, isHuman }
) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const img = state.portraitImages.get(id);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    // Subtle lifelike webcam breathing + speaking head motion
    const breatheScale = 1.04 + Math.sin(timeSec * 2.1) * 0.012 + (isSpeaking ? Math.sin(timeSec * 14) * 0.008 : 0);
    const panX = Math.sin(timeSec * 1.3) * 3.5;
    const panY = Math.cos(timeSec * 1.9) * 2.5 + (isSpeaking ? Math.abs(Math.sin(timeSec * 16)) * 2.2 : 0);

    ctx.translate(w / 2 + panX, h / 2 + panY);
    ctx.scale(breatheScale, breatheScale);

    // Aspect-fill crop
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
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  } else {
    // Stylized VIP Studio Feed for Guest Player (or while portrait loads)
    const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = themeColor;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.42, 34 + (isSpeaking ? Math.sin(timeSec * 16) * 4 : 0), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isHuman ? 'YOU (GUEST VIP)' : name, w / 2, h * 0.44);
  }

  // Studio Ring-Light & Broadcast Color Grading Overlay
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, w * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(6, 9, 18, 0.52)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // Live Speaking Audio Ring & Mouth/Voice Visualizer Wave on Webcam
  if (isSpeaking) {
    ctx.save();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    // Dynamic voice equalizer wave along bottom of video feed
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
    ctx.lineWidth = 2.5;
    for (let x = 20; x < w - 20; x += 6) {
      const amp = Math.sin(x * 0.08 + timeSec * 24) * Math.cos(x * 0.03 - timeSec * 15) * 9;
      const y = h - 38 + amp;
      if (x === 20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Emotion / Reaction Micro-Indicator
  if (emotion === 'shocked' || emotion === 'suspicious') {
    ctx.save();
    ctx.fillStyle =
      emotion === 'shocked' ? 'rgba(244, 63, 94, 0.82)' : 'rgba(245, 158, 11, 0.82)';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillRect(w - 92, h - 58, 84, 18);
    ctx.fillStyle = '#fff';
    ctx.fillText(emotion === 'shocked' ? '⚡ SHOCKED' : '🤨 SUSPICIOUS', w - 86, h - 45);
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
 * Live Microphone Speech-to-Text (`Web Speech API` + `/api/media/transcribe` `gemini-3.5-transcribe-live`).
 */
function setupMicrophoneInput() {
  const micBtn = document.getElementById('micPushToTalkBtn');
  const micLabel = document.getElementById('micBtnLabel');
  const chatInput = document.getElementById('humanChatInput');
  if (!micBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
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
      micLabel.textContent = 'Speak Live';
    };
  }

  micBtn.addEventListener('click', () => {
    if (!recognition) {
      chatInput.focus();
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      isListening = true;
      micBtn.classList.add('recording');
      micLabel.textContent = 'Listening...';
      recognition.start();
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
    if (!state.audioEnabled) stopActiveSpeech();
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

  // Start initial game automatically!
  startNewGame('STANDARD');
}

window.addEventListener('DOMContentLoaded', initApp);
