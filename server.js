/**
 * @fileoverview IDOL AVALON — Express API & Static Broadcast Server.
 * Serves the Zoom-style 7-player K-Pop Variety Show Avalon game and orchestrates
 * `gemini-4-argon`, `gemini-3.8-flash`, `gemini-nano-banana-2.1`, `gemini-omni-1.1-flash`,
 * `gemini-3.8-flash-tts`, `gemini-3.5-transcribe-live`, and `lyria-3.5`.
 */

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import {
  MC_HOST_PROFILE,
  IDOL_CAST_PROFILES,
  createAvalonGame,
  buildPrivatePlayerView,
  getPublicBoardSummary,
  lockTeamProposal,
  startTeamVotePhase,
  resolveTeamVotes,
  resolveQuestExecution,
  resolveAssassination,
  appendTranscriptItem,
  buildJudgeXraySnapshot,
  getPlayerName
} from './src/avalonEngine.js';
import {
  setRuntimeGeminiApiKey,
  hasGeminiApiKey,
  generateMcJaesukCommentary,
  generateAiLeaderProposal,
  generateDiscussionDebateTurn,
  generateParallelTeamVotes,
  generateQuestCards,
  generateAssassinDecision,
  generatePhotorealisticPortrait,
  getVideoTaskStatus,
  transcribePlayerAudio,
  generateAdaptiveBgmLoop,
  synthesizeSpeechTTS
} from './src/geminiOrchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(
  express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
      if (/\.(html|js|css)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      }
    }
  })
);

/**
 * In-memory active game store (`gameId -> game`).
 */
const activeGames = new Map();

/**
 * Formats the complete client payload for a game session.
 * @param {object} game
 * @param {object} [extra={}]
 * @returns {object}
 */
function buildClientResponse(game, extra = {}) {
  const recentTranscript = game.transcript.slice(-30);
  const cutoffIdx = Math.max(0, recentTranscript.length - 2);
  const leanTranscript = recentTranscript.map((item, idx) =>
    idx >= cutoffIdx
      ? item
      : {
          ...item,
          hasAudio: Boolean(item.audioBase64),
          audioBase64: null
        }
  );
  return {
    gameId: game.gameId,
    apiKeyConfigured: hasGeminiApiKey(),
    mcHost: game.mcHost,
    players: game.players,
    board: getPublicBoardSummary(game),
    humanPrivateView: buildPrivatePlayerView(game, 'player_human'),
    transcript: leanTranscript,
    currentVotes: game.currentVotes,
    xrayTelemetry: buildJudgeXraySnapshot(game),
    ...extra
  };
}

/**
 * Avoid browser 404 console noise on /favicon.ico.
 */
app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

/**
 * Health & API key status endpoint.
 */
app.get('/api/status', (_req, res) => {
  res.json({
    ok: true,
    service: 'IDOL AVALON — Gemini 4 Argon Entertainment Orchestrator',
    primaryModel: 'gemini-4-argon',
    companionModels: [
      'gemini-3.8-flash',
      'gemini-3.8-flash-tts',
      'gemini-nano-banana-2.1',
      'gemini-omni-1.1-flash',
      'gemini-3.5-transcribe-live',
      'lyria-3-clip-preview'
    ],
    apiKeyConfigured: hasGeminiApiKey()
  });
});

/**
 * Allows configuring GEMINI_API_KEY at runtime if not yet present in .env.
 */
app.post('/api/config/key', (req, res) => {
  const { apiKey } = req.body || {};
  if (apiKey && typeof apiKey === 'string') {
    setRuntimeGeminiApiKey(apiKey);
  }
  res.json({
    ok: true,
    apiKeyConfigured: hasGeminiApiKey()
  });
});

/**
 * Helper to record an explicit human chat command in the transcript when the user operates a phase via chat.
 * @param {object} game
 * @param {string|null|undefined} humanChatText
 * @param {string} phaseContext
 * @returns {object|null}
 */
function recordHumanChatCommandTurn(game, humanChatText, phaseContext) {
  if (!humanChatText || String(humanChatText).trim().length === 0) {
    return null;
  }
  const cleanText = String(humanChatText).trim();
  game.humanStats.messagesThisRound += 1;
  game.humanStats.totalMessages += 1;
  game.humanStats.lastSpokeAt = new Date().toISOString();

  return appendTranscriptItem(game, {
    speakerId: 'player_human',
    text: cleanText,
    emotion: 'speaking',
    innerThought: `Live human chat command during ${phaseContext}.`,
    modelUsed: 'Live-Human-Chat-Command',
    thinkingLevel: 'medium',
    verificationPassed: true,
    verificationNote: `✅ Verified: Human chat command executed (${phaseContext}).`
  });
}

/**
 * Starts a new 7-player Avalon game with cryptographically random roles.
 */
app.post('/api/game/new', async (req, res) => {
  try {
    const {
      playerName = 'Guest',
      demoPreset = 'STANDARD',
      preferredRole = 'RANDOM',
      apiKey,
      skipTts = false
    } = req.body || {};
    if (apiKey) {
      setRuntimeGeminiApiKey(apiKey);
    }

    const game = createAvalonGame({ playerName, demoPreset, preferredRole });
    game.skipTts = Boolean(skipTts);
    activeGames.set(game.gameId, game);

    const mcOpeningTurn = await generateMcJaesukCommentary(game, 'GAME_START', {
      demoPreset
    });
    const storedTurn = appendTranscriptItem(game, mcOpeningTurn);

    res.json(
      buildClientResponse(game, {
        latestTurn: storedTurn
      })
    );
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create Avalon game' });
  }
});

/**
 * Retrieves current game state and Judge X-Ray telemetry.
 */
app.get('/api/game/:gameId/state', (req, res) => {
  const game = activeGames.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game session not found' });
  }
  return res.json(buildClientResponse(game));
});

/**
 * Executes the Leader's Quest Team Proposal (`45s` timer) and transitions to `DISCUSSION` (`180s` timer).
 */
app.post('/api/game/:gameId/propose', async (req, res) => {
  try {
    const game = activeGames.get(req.params.gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    const { proposedTeamIds, skipTts, humanChatText = null } = req.body || {};
    if (typeof skipTts === 'boolean') game.skipTts = skipTts;
    let latestTurn = null;

    if (game.leaderId === 'player_human') {
      // Human Leader (or 45s auto-timeout fallback)
      const locked = lockTeamProposal(
        game,
        Array.isArray(proposedTeamIds) ? proposedTeamIds : []
      );
      const teamNames = locked.proposedTeamIds.map((id) => getPlayerName(game, id));
      const customText =
        humanChatText && String(humanChatText).trim().length > 0
          ? `${String(humanChatText).trim()} → [${teamNames.join(', ')}]`
          : `I'm proposing [${teamNames.join(', ')}] for Quest ${game.currentQuestNumber}. Let's hear everyone's thoughts!`;
      const humanTurn = appendTranscriptItem(game, {
        speakerId: 'player_human',
        text: customText,
        emotion: 'speaking',
        innerThought: `Human Leader proposed [${teamNames.join(', ')}] for Quest ${game.currentQuestNumber}.`,
        modelUsed: 'Human-Leader-Input',
        thinkingLevel: 'high',
        verificationPassed: true,
        verificationNote: `✅ Verified: Valid ${locked.requiredTeamSize}-player Quest ${game.currentQuestNumber} proposal.`
      });
      const mcTurnRaw = await generateMcJaesukCommentary(game, 'TEAM_PROPOSED', {
        proposedTeamNames: teamNames
      });
      latestTurn = appendTranscriptItem(game, mcTurnRaw);
      return res.json(
        buildClientResponse(game, {
          leaderTurn: humanTurn,
          mcTurn: latestTurn,
          latestTurn
        })
      );
    }

    if (humanChatText) {
      recordHumanChatCommandTurn(game, humanChatText, `Quest ${game.currentQuestNumber} AI Leader Proposal Trigger`);
    }

    // AI Idol is Leader — use `gemini-4-argon` (`thinking_level: "high"`)
    const aiProposal = await generateAiLeaderProposal(game);
    lockTeamProposal(game, aiProposal.proposedTeamIds);
    const leaderTurn = appendTranscriptItem(game, aiProposal.speechTurn);

    return res.json(
      buildClientResponse(game, {
        leaderTurn,
        latestTurn: leaderTurn
      })
    );
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to propose team' });
  }
});

/**
 * Advances one live debate turn during the `180s` DISCUSSION phase,
 * or processes the Human Player's live voice/text chat input and immediately generates an Idol response.
 */
app.post('/api/game/:gameId/discuss/step', async (req, res) => {
  let clientAborted = false;
  req.on('close', () => {
    if (!res.writableEnded) {
      clientAborted = true;
    }
  });

  try {
    const game = activeGames.get(req.params.gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    const {
      humanMessage = null,
      targetMemberId = null,
      elapsedRoundSec = 0,
      candidateTeamIds = [],
      skipTts,
      isAutoStep = false
    } = req.body || {};
    if (typeof skipTts === 'boolean') game.skipTts = skipTts;
    let humanStoredTurn = null;

    if (humanMessage && String(humanMessage).trim().length > 0) {
      const cleanText = String(humanMessage).trim();
      game.humanStats.messagesThisRound += 1;
      game.humanStats.totalMessages += 1;
      game.humanStats.lastSpokeAt = new Date().toISOString();

      humanStoredTurn = appendTranscriptItem(game, {
        speakerId: 'player_human',
        text: cleanText,
        emotion: 'speaking',
        targetPlayerId: targetMemberId || null,
        innerThought: `Live human input during Quest ${game.currentQuestNumber} (${game.phase}).`,
        modelUsed: 'Live-Human-Input',
        thinkingLevel: 'medium',
        verificationPassed: true,
        verificationNote: '✅ Verified: Live Human Input recorded.'
      });
    }

    const prevSpeakerHistoryLen = game.speakerHistoryThisRound.length;
    const aiDebateTurn = await generateDiscussionDebateTurn(game, {
      humanMessage: humanStoredTurn ? humanStoredTurn.text : null,
      targetMemberId,
      elapsedRoundSec: Number(elapsedRoundSec) || 0,
      candidateTeamIds: Array.isArray(candidateTeamIds) ? candidateTeamIds : []
    });

    // If this was a background auto-step and the client aborted it to prioritize a human action, discard cleanly
    if (
      isAutoStep &&
      !humanStoredTurn &&
      (clientAborted || (game.phase !== 'DISCUSSION' && game.phase !== 'TEAM_PROPOSAL'))
    ) {
      game.speakerHistoryThisRound.length = prevSpeakerHistoryLen;
      return res.status(204).end();
    }

    let yieldStoredTurn = null;
    if (aiDebateTurn.yieldTurn) {
      yieldStoredTurn = appendTranscriptItem(game, aiDebateTurn.yieldTurn);
    }

    const latestTurn = appendTranscriptItem(game, aiDebateTurn);

    return res.json(
      buildClientResponse(game, {
        humanTurn: humanStoredTurn,
        yieldTurn: yieldStoredTurn,
        latestTurn,
        floorEvent: aiDebateTurn.floorEvent || null,
        agentBids: aiDebateTurn.agentBids || []
      })
    );
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to run discussion step' });
  }
});

/**
 * Transitions from DISCUSSION to TEAM_VOTE (`30s` timer) when the 180s timer expires or Early Vote is triggered.
 */
app.post('/api/game/:gameId/call-vote', (req, res) => {
  const game = activeGames.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game session not found' });
  }
  const { humanChatText = null } = req.body || {};
  if (humanChatText) {
    recordHumanChatCommandTurn(game, humanChatText, `Quest ${game.currentQuestNumber} Call Vote`);
  }
  startTeamVotePhase(game);
  return res.json(buildClientResponse(game));
});

/**
 * Resolves the simultaneous 7-player Team Vote (`APPROVE` vs `REJECT`).
 */
app.post('/api/game/:gameId/vote', async (req, res) => {
  try {
    const game = activeGames.get(req.params.gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    const { humanVote = null, skipTts, humanChatText = null } = req.body || {};
    if (typeof skipTts === 'boolean') game.skipTts = skipTts;
    if (humanChatText) {
      recordHumanChatCommandTurn(game, humanChatText, `Quest ${game.currentQuestNumber} Team Vote (${humanVote})`);
    }
    const allVotes = await generateParallelTeamVotes(game, humanVote);
    const voteResolution = resolveTeamVotes(game, allVotes);

    const mcTurnRaw = await generateMcJaesukCommentary(game, 'VOTE_RESULT', voteResolution);
    const latestTurn = appendTranscriptItem(game, mcTurnRaw);

    return res.json(
      buildClientResponse(game, {
        voteResolution,
        latestTurn
      })
    );
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to resolve votes' });
  }
});

/**
 * Executes the secret Quest Mission for the N players on the approved Quest Team.
 */
app.post('/api/game/:gameId/quest', async (req, res) => {
  try {
    const game = activeGames.get(req.params.gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    const { humanQuestCard = null, skipTts, humanChatText = null } = req.body || {};
    if (typeof skipTts === 'boolean') game.skipTts = skipTts;
    if (humanChatText) {
      recordHumanChatCommandTurn(game, humanChatText, `Quest ${game.currentQuestNumber} Mission Card`);
    }
    const submittedCards = await generateQuestCards(game, humanQuestCard);
    const questOutcome = resolveQuestExecution(game, submittedCards);

    const mcTurnRaw = await generateMcJaesukCommentary(game, 'QUEST_RESULT', questOutcome);
    const latestTurn = appendTranscriptItem(game, mcTurnRaw);

    return res.json(
      buildClientResponse(game, {
        questOutcome,
        latestTurn
      })
    );
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to execute quest' });
  }
});

/**
 * Executes the Assassin's Final Shot at Merlin when Good passes 3 Quests.
 */
app.post('/api/game/:gameId/assassinate', async (req, res) => {
  try {
    const game = activeGames.get(req.params.gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    const { targetPlayerId = null, skipTts, humanChatText = null } = req.body || {};
    if (typeof skipTts === 'boolean') game.skipTts = skipTts;
    if (humanChatText) {
      recordHumanChatCommandTurn(game, humanChatText, 'Assassin Shot Target Selection');
    }
    const decision = await generateAssassinDecision(game, targetPlayerId);
    const assassinTurn = appendTranscriptItem(game, decision.assassinSpeechTurn);
    const assassinationOutcome = resolveAssassination(
      game,
      decision.targetPlayerId,
      decision.assassinSpeechTurn.innerThought
    );

    const mcFinalTts = await synthesizeSpeechTTS({
      speakerId: 'mc_jaesuk',
      voiceName: MC_HOST_PROFILE.voiceName,
      text: assassinationOutcome.winReason,
      skipTts: Boolean(game?.skipTts)
    });

    const mcFinalTurn = appendTranscriptItem(game, {
      speakerId: 'mc_jaesuk',
      text: assassinationOutcome.winReason,
      emotion: assassinationOutcome.hitMerlin ? 'shocked' : 'speaking',
      innerThought: 'Final game outcome verified and announced.',
      modelUsed: 'gemini-4-argon',
      thinkingLevel: 'low',
      verificationPassed: true,
      verificationNote: '✅ Verified: Final Assassin shot and win condition resolved.',
      ...mcFinalTts
    });

    return res.json(
      buildClientResponse(game, {
        assassinationOutcome,
        assassinTurn,
        latestTurn: mcFinalTurn
      })
    );
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to resolve assassination' });
  }
});

/**
 * On-demand TTS synthesis endpoint (`gemini-3.8-flash-tts`) for replaying or testing character voices.
 */
app.post('/api/media/tts', async (req, res) => {
  try {
    const { speakerId = 'mc_jaesuk', text = '' } = req.body || {};
    const profile =
      speakerId === 'mc_jaesuk'
        ? MC_HOST_PROFILE
        : IDOL_CAST_PROFILES.find((p) => p.id === speakerId);
    const voiceName = profile?.voiceName || 'Kore';
    const ttsResult = await synthesizeSpeechTTS({
      speakerId,
      voiceName,
      text: String(text || '').slice(0, 500),
      skipTts: false
    });
    return res.json(ttsResult);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'TTS synthesis failed' });
  }
});

/**
 * Generates or returns photorealistic webcam portraits for MC Jae-suk and the 6 Idols via `gemini-nano-banana-2.1`.
 */
app.post('/api/media/portraits/generate', async (req, res) => {
  try {
    const { characterId } = req.body || {};
    if (characterId) {
      const single = await generatePhotorealisticPortrait(characterId);
      return res.json(single);
    }
    const allIds = ['mc_jaesuk', ...IDOL_CAST_PROFILES.map((p) => p.id)];
    const results = await Promise.all(
      allIds.map((id) => generatePhotorealisticPortrait(id))
    );
    return res.json({ portraits: results });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Portrait generation failed' });
  }
});

/**
 * Polls status of a background `gemini-omni-1.1-flash` video task.
 */
app.get('/api/media/video/:taskId', (req, res) => {
  res.json(getVideoTaskStatus(req.params.taskId));
});

/**
 * Transcribes player microphone speech via `gemini-3.5-transcribe`.
 */
app.post('/api/media/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body || {};
    const result = await transcribePlayerAudio(audioBase64, mimeType);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Transcription failed' });
  }
});

/**
 * Generates or returns phase-adaptive background music loops via `lyria-3-clip-preview` (`lyria-3.5`).
 */
app.get('/api/media/bgm', async (req, res) => {
  try {
    const mood = req.query.mood || 'discussion';
    const result = await generateAdaptiveBgmLoop(mood, false);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Lyria BGM generation failed' });
  }
});

app.post('/api/media/bgm', async (req, res) => {
  try {
    const { mood = 'discussion', forceRegenerate = false } = req.body || {};
    const result = await generateAdaptiveBgmLoop(mood, Boolean(forceRegenerate));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Lyria BGM generation failed' });
  }
});

app.listen(PORT, () => {
  console.log(
    `[IDOL AVALON] Server running on http://localhost:${PORT} (Gemini 4 Argon Orchestrator Ready)`
  );
});
