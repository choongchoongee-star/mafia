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
  transcribePlayerAudio
} from './src/geminiOrchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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
  return {
    gameId: game.gameId,
    apiKeyConfigured: hasGeminiApiKey(),
    mcHost: game.mcHost,
    players: game.players,
    board: getPublicBoardSummary(game),
    humanPrivateView: buildPrivatePlayerView(game, 'player_human'),
    transcript: game.transcript.slice(-30),
    currentVotes: game.currentVotes,
    xrayTelemetry: buildJudgeXraySnapshot(game),
    ...extra
  };
}

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
 * Starts a new 7-player Avalon game with cryptographically random roles.
 */
app.post('/api/game/new', async (req, res) => {
  try {
    const { playerName = 'Guest', demoPreset = 'STANDARD', apiKey } = req.body || {};
    if (apiKey) {
      setRuntimeGeminiApiKey(apiKey);
    }

    const game = createAvalonGame({ playerName, demoPreset });
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
 * Executes the Leader's Quest Team Proposal (`20s` timer) and transitions to `DISCUSSION` (`75s` timer).
 */
app.post('/api/game/:gameId/propose', async (req, res) => {
  try {
    const game = activeGames.get(req.params.gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    const { proposedTeamIds } = req.body || {};
    let latestTurn = null;

    if (game.leaderId === 'player_human') {
      // Human Leader (or 20s auto-timeout fallback)
      const locked = lockTeamProposal(
        game,
        Array.isArray(proposedTeamIds) ? proposedTeamIds : []
      );
      const teamNames = locked.proposedTeamIds.map((id) => getPlayerName(game, id));
      const humanTurn = appendTranscriptItem(game, {
        speakerId: 'player_human',
        text: `I'm proposing [${teamNames.join(', ')}] for Quest ${game.currentQuestNumber}. Let's hear everyone's thoughts!`,
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
          latestTurn
        })
      );
    }

    // AI Idol is Leader — use `gemini-4-argon` (`thinking_level: "high"`)
    const aiProposal = await generateAiLeaderProposal(game);
    const locked = lockTeamProposal(game, aiProposal.proposedTeamIds);
    const leaderTurn = appendTranscriptItem(game, aiProposal.speechTurn);
    const teamNames = locked.proposedTeamIds.map((id) => getPlayerName(game, id));
    const mcTurnRaw = await generateMcJaesukCommentary(game, 'TEAM_PROPOSED', {
      proposedTeamNames: teamNames
    });
    const mcTurn = appendTranscriptItem(game, mcTurnRaw);

    return res.json(
      buildClientResponse(game, {
        leaderTurn,
        mcTurn,
        latestTurn: leaderTurn
      })
    );
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to propose team' });
  }
});

/**
 * Advances one live debate turn during the `75s` DISCUSSION phase,
 * or processes the Human Player's live voice/text chat input and immediately generates an Idol response.
 */
app.post('/api/game/:gameId/discuss/step', async (req, res) => {
  try {
    const game = activeGames.get(req.params.gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    const { humanMessage = null, targetMemberId = null, elapsedRoundSec = 0 } = req.body || {};
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
        innerThought: `Live human input during Quest ${game.currentQuestNumber} discussion.`,
        modelUsed: 'Live-Human-Input',
        thinkingLevel: 'medium',
        verificationPassed: true,
        verificationNote: '✅ Verified: Live Human Input recorded.'
      });
    }

    const aiDebateTurn = await generateDiscussionDebateTurn(game, {
      humanMessage: humanStoredTurn ? humanStoredTurn.text : null,
      targetMemberId,
      elapsedRoundSec: Number(elapsedRoundSec) || 0
    });

    const latestTurn = appendTranscriptItem(game, aiDebateTurn);

    return res.json(
      buildClientResponse(game, {
        humanTurn: humanStoredTurn,
        latestTurn
      })
    );
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to run discussion step' });
  }
});

/**
 * Transitions from DISCUSSION to TEAM_VOTE (`15s` timer) when the 75s timer expires or Early Vote is clicked.
 */
app.post('/api/game/:gameId/call-vote', (req, res) => {
  const game = activeGames.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game session not found' });
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

    const { humanVote = null } = req.body || {};
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

    const { humanQuestCard = null } = req.body || {};
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

    const { targetPlayerId = null } = req.body || {};
    const decision = await generateAssassinDecision(game, targetPlayerId);
    const assassinTurn = appendTranscriptItem(game, decision.assassinSpeechTurn);
    const assassinationOutcome = resolveAssassination(
      game,
      decision.targetPlayerId,
      decision.assassinSpeechTurn.innerThought
    );

    const mcFinalTurn = appendTranscriptItem(game, {
      speakerId: 'mc_jaesuk',
      text: assassinationOutcome.winReason,
      emotion: assassinationOutcome.hitMerlin ? 'shocked' : 'speaking',
      innerThought: 'Final game outcome verified and announced.',
      modelUsed: 'gemini-4-argon',
      thinkingLevel: 'low',
      verificationPassed: true,
      verificationNote: '✅ Verified: Final Assassin shot and win condition resolved.'
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
 * Transcribes player microphone speech via `gemini-3.5-transcribe-live`.
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

app.listen(PORT, () => {
  console.log(
    `[IDOL AVALON] Server running on http://localhost:${PORT} (Gemini 4 Argon Orchestrator Ready)`
  );
});
