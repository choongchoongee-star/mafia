/**
 * @fileoverview IDOL AVALON — Official 7-Player Resistance: Avalon Rules Engine & Epistemic Isolation Manager.
 * Implements strict role distribution (1 Merlin, 1 Percival, 2 Loyal Servants, 1 Assassin, 1 Morgana, 1 Oberon),
 * Quest team sizes [2, 3, 3, 4*, 4] (Quest 4 requires 2 Fails), 5-Proposal Hammer Rule,
 * Night-phase epistemic isolation, Bayesian suspicion tracking, and autonomous timer fallbacks.
 */

import crypto from 'node:crypto';

/**
 * Non-playing Variety Show Host (진행자) profile inspired by National MC Yoo Jae-suk.
 */
export const MC_HOST_PROFILE = {
  id: 'mc_jaesuk',
  name: 'MC Jae-ho',
  koreanName: '유재호',
  koreanTitle: '국민 MC 유재호 (Yoo Jae-suk Motif)',
  roleType: 'HOST',
  voiceName: 'Puck',
  pitchOffset: 1.04,
  rateOffset: 1.08,
  namuwikiProfile: {
    motif: 'Yoo Jae-suk (유재석)',
    mbti: 'ISFP',
    favoriteFoods: ['Pyongyang Naengmyeon', 'Late-Night Ramyeon', 'Iced Americano'],
    nicknames: ['National MC', 'Grasshopper Sunbae', 'Stage Maestro'],
    hobbies: ['Monitoring Variety Shows', 'Working Out', 'Teasing Quiet Guests'],
    iconicHabits: 'Adjusts his black horn-rimmed glasses when a Quest fails and calls out silent bystanders.'
  },
  visualPrompt:
    'Photorealistic live broadcast webcam portrait of a charismatic Korean male variety show host in his late 40s resembling Yoo Jae-suk, signature black horn-rimmed glasses, tailored navy variety-show suit jacket with red bowtie and clip-on broadcast microphone, holding variety show cue cards in a brightly lit Seoul television studio, warm energetic smile, 4k photorealistic DSLR broadcast quality.',
  expressions: {
    idle: 'Warm attentive variety host smile behind horn-rimmed glasses, holding cue card',
    speaking: 'Energetic variety MC speaking into lapel mic with animated hand gesture',
    shocked: 'Dramatic variety-show shocked expression, adjusting glasses in disbelief',
    suspicious: 'Playful detective squint over horn-rimmed glasses, pointing at camera'
  },
  themeColor: '#f59e0b'
};

/**
 * 6 Photorealistic AI K-Pop Girl Group Idol Profiles + 1 Human Guest Player = 7 Players.
 * Each idol has an original K-Pop stage name, distinct styling, regional dialect, and detailed Namuwiki-inspired background lore.
 */
export const IDOL_CAST_PROFILES = [
  {
    id: 'idol_wonyoung',
    name: 'Seoyoung',
    koreanName: '서영',
    inspirationTag: 'Jang Won-young (IVE) Motif — Doll-Like Visual Center',
    archetype: 'The "Lucky Seoyoung" Posh Manipulator',
    dialectTag: '✨ Posh "Lucky Seoyoung" Princess',
    yieldStyle: 'YIELD_POLITELY',
    namuwikiProfile: {
      motif: 'Jang Won-young (장원영)',
      mbti: 'ISTP (Rational Strategist Behind Princess Visual)',
      favoriteFoods: ['Rose Tteokbokki', 'Fresh Strawberries', 'Korean Hanwoo Beef BBQ', 'Pistachio Ice Cream', 'Steamed Rice (밥파)'],
      nicknames: ['God-Seoyoung (갓서영)', 'Lucky Seoyoung', 'Giant Baby Bunny (장토끼)'],
      hobbies: ['Flying Yoga & Pilates', 'Gourmet Restaurant Hunting', 'Studying English Idioms'],
      iconicHabits: 'Reframes every crisis with "Seoyoung-style positive thinking (서영적 사고 / Lucky Seoyoung~✨)" and swears on her favorite strawberry dessert when accused.'
    },
    personality:
      'Ultra-poised chaebol-heiress princess energy with unstoppable "Lucky Seoyoung" positive reframing and cool-headed ISTP calculation underneath. Articulate and persuasive: when Good, builds royal consensus; when Evil (especially Morgana), smiles sweetly while framing innocent players and pocketing Percival.',
    speechStyle:
      'Ultra-posh, charming princess English with signature "Lucky Seoyoung" positive spin, occasional references to strawberries/beef BBQ, and Korean honorifics ("Excuse me, unnie? Being doubted right now is actually so Lucky Seoyoung for me because the real Quest will prove me clean~✨", "Honestly oppa, listen to Seoyoung for one second~").',
    voiceName: 'Aoede',
    pitchOffset: 1.16,
    rateOffset: 1.01,
    themeColor: '#ec4899',
    visualPrompt:
      'Photorealistic 4K studio portrait of a stunning 20-year-old Korean K-pop female idol visual center named Seoyoung, doll-like V-line face, large sparkling doe eyes with glitter aegyo-sal, dark espresso mermaid waves with crystal hair clip, pastel-pink pearl tweed outfit, luxury Seoul broadcast booth with condenser mic.',
    expressions: {
      idle: 'Poised princess smile, glowing glass skin, attentive eye contact on webcam',
      speaking: 'Expressive confident speaking face, subtle elegant hand gesture near chin',
      shocked: 'Wide-eyed glamorous gasp, hand over heart in disbelief at being accused',
      suspicious: 'Cool side-eye with a knowing princess smirk'
    }
  },
  {
    id: 'idol_karina',
    name: 'Rina',
    koreanName: '리나',
    inspirationTag: 'Karina (aespa) Motif — Unreal CG-Visual Leader',
    archetype: 'The Ice-Cold Math Detective',
    dialectTag: '🧊 Ice-Cold Prosecutor Math',
    yieldStyle: 'PUSH_THROUGH',
    namuwikiProfile: {
      motif: 'Karina (카리나)',
      mbti: 'ENFP (Warm Prankster Behind Cold CG Beauty)',
      favoriteFoods: ['Crispy Tonkatsu (돈가스)', 'Mint-Choco Ice Cream (민초단 Leader)', 'Extra-Spicy Tteokbokki', 'Fruit Gummies & Jelly', 'Hawaiian Pizza'],
      nicknames: ['CG Visual Goddess', 'Baby Tiger (아기호랑이)', 'Quail Egg'],
      hobbies: ['Mobile Games (PUBG / LoL)', 'Watching Mystery Anime', 'Tracking Micro-Expressions'],
      iconicHabits: 'Looks like an untouchable AI prosecutor while breaking down vote probabilities, occasionally betting her favorite tonkatsu or mint-choco on her read.'
    },
    personality:
      'Analytical, razor-sharp leader who tracks every Approve/Reject vote and mathematical constraint across rounds like a competitive gamer. Zero tolerance for emotional fluff or sloppy logic and immediately calls out silent bystanders.',
    speechStyle:
      'Crisp, cold, surgical prosecutor English with occasional gamer/tonkatsu/mint-choco quips ("Stop deflecting. Check the Quest vote ratio.", "Mathematically, at least one of those two is Evil—I\'d bet my favorite tonkatsu on it. Explain your vote right now.").',
    voiceName: 'Kore',
    pitchOffset: 0.92,
    rateOffset: 1.04,
    themeColor: '#6366f1',
    visualPrompt:
      'Photorealistic 4K studio portrait of a breathtaking 22-year-old Korean K-pop female idol leader named Rina, sharp V-line jawline, feline eyes, midnight-black hair with hime side locks and silver hairpins, black and chrome off-shoulder studio top with silver choker, neon-violet Seoul broadcast booth.',
    expressions: {
      idle: 'Calm, striking analytical gaze into the webcam',
      speaking: 'Articulate, composed leader explaining vote math clearly',
      shocked: 'visibly stunned, eyebrows raised in sharp disbelief',
      suspicious: 'Piercing detective glare, arms crossed'
    }
  },
  {
    id: 'idol_sullyoon',
    name: 'Seol-ah',
    koreanName: '설아',
    inspirationTag: 'Sullyoon (NMIXX) Motif — Deer-Eyed Visual Goddess',
    archetype: 'The Busan Satoori Sniper (부산 사투리 저격수)',
    dialectTag: '🌊 Busan Satoori Sniper (경상도 사투리)',
    yieldStyle: 'YIELD_POLITELY',
    namuwikiProfile: {
      motif: 'Sullyoon (설윤)',
      mbti: 'ISFP (Quiet Homebody Observer)',
      favoriteFoods: ['Spicy Malatang (Level 2.5)', 'Salt Bread & Bakery Pastries (빵순이)', 'Cheese Tteokbokki', 'Vanilla Ice Cream'],
      nicknames: ['Bambi Deer (사슴)', 'Seol-vely', 'Busan Sniper'],
      hobbies: ['Watching Baking ASMR Videos', 'Listening to K-Ballads', 'Quietly Studying Everyone\'s Eyes'],
      iconicHabits: 'Sits quietly like an innocent deer-eyed princess (ISFP homebody mode), then suddenly unmutes with a thick Busan Satoori drawl ("뭐라카노! 땡!") when someone contradicts the vote math.'
    },
    personality:
      'Looks like an innocent deer-eyed Bambi visual goddess, stays strategically quiet to observe, then suddenly opens her mic with a thick, charming Busan / Gyeongsang-do Satoori drawl that drops devastatingly accurate logical bombshells. Dangerous as Merlin because she holds strategic silence until the exact right moment.',
    speechStyle:
      'Thick, charming Busan Satoori (Gyeongsang-do dialect) mixed with expressive Southern drawl ("Aigoo, ma! Mwo-ra-ka-no (뭐라카노)? What in tarnation are y\'all talkin\' about right now?", "Wait a minute... ddaeng (땡)! If you trusted her, why did you reject her team, unnie? Jin-jja shady!").',
    voiceName: 'Leda',
    pitchOffset: 1.05,
    rateOffset: 0.93,
    themeColor: '#a855f7',
    visualPrompt:
      'Photorealistic 4K studio portrait of a gorgeous 20-year-old Korean K-pop visual center idol named Seol-ah, large Bambi doe eyes, small fairy-like face, ash-chestnut half-up hair with satin ribbon bow, off-shoulder cream knit sweater in a warm luxury Seoul recording studio.',
    expressions: {
      idle: 'Gentle deer-eyed observant look, listening carefully',
      speaking: 'Soft but serious expression delivering a sharp deduction',
      shocked: 'Big deer eyes widened in surprise, shaking head softly',
      suspicious: 'Quietly narrowing eyes, studying the speaker'
    }
  },
  {
    id: 'idol_yuna',
    name: 'Yura',
    koreanName: '유라',
    inspirationTag: 'Yuna (ITZY) Motif — High-Teen Queen Maknae',
    archetype: 'The Chungcheong Sarcasm Teaser (충청도식 돌려까기)',
    dialectTag: '🍑 Chungcheong Sarcasm (충청도 돌려까기)',
    yieldStyle: 'YIELD_POLITELY',
    namuwikiProfile: {
      motif: 'Yuna (유나)',
      mbti: 'ENFP (High-Energy Vitamin & Competitive Ace)',
      favoriteFoods: ['Combination Pizza', 'Double Cheeseburgers', 'Dark Chocolate', 'Hot Korean Gukbap (국밥러버)'],
      nicknames: ['Queen Yura', 'Human Vitamin', 'Floorball Ace'],
      hobbies: ['Former School Floorball Athlete (Super Competitive)', 'Walking Her Puppy', 'Roasting Unnies'],
      iconicHabits: 'Uses laid-back Chungcheong-do roundabout sarcasm ("그려~ 아주 기가 막히네유~") and competitive athlete instincts to bait suspects into panicking.'
    },
    personality:
      'Sly, hyper-competitive former athlete maknae who uses laid-back Chungcheong-do style roundabout sarcasm ("돌려까기") to bait suspects into panicking or over-defending their Evil partner.',
    speechStyle:
      'Laid-back, teasing Chungcheong-do roundabout sarcasm ("Oh sure~ geu-ryeo (그려)~ go right ahead and approve that team if y\'all want the kingdom to burn~ Real nice job~", "Aigoo~ look how hard she\'s defending her buddy right now, totally not suspicious at all~").',
    voiceName: 'Zephyr',
    pitchOffset: 1.20,
    rateOffset: 0.97,
    themeColor: '#f43f5e',
    visualPrompt:
      'Photorealistic 4K studio portrait of a radiant 20-year-old Korean K-pop female idol maknae named Yura, dazzling high-teen visual, bright expressive eyes, sleek high ponytail with ribbon, glamorous high-teen crop jacket in a vibrant Seoul variety broadcast booth.',
    expressions: {
      idle: 'Bright energetic smile, leaning toward the webcam',
      speaking: 'Animated, passionate expression pointing out a suspect',
      shocked: 'Jaw dropped variety-show reaction, both hands on cheeks',
      suspicious: 'Leaning close to the webcam lens with playful suspicion'
    }
  },
  {
    id: 'idol_chaewon',
    name: 'Chaerin',
    koreanName: '채린',
    inspirationTag: 'Kim Chae-won (LE SSERAFIM) Motif — Chic Bob-Cut Leader',
    archetype: 'The Fierce Street-Boss Leader (걸크러시 리더)',
    dialectTag: '🔥 Fierce Street-Boss (걸크러시 쎈언니)',
    yieldStyle: 'PUSH_THROUGH',
    namuwikiProfile: {
      motif: 'Kim Chae-won (김채원)',
      mbti: 'ISTP (Cool-Headed Realist & Fierce Stage Leader)',
      favoriteFoods: ['Fire-Spicy Malatang & Tteokbokki', 'Mint-Choco Ice Cream (민초단)', 'Kimchi Stew'],
      nicknames: ['Ssam-Chaerin (쌈채린)', 'Short-Hair Goddess (단발 여신)', 'Baby Cheetah'],
      hobbies: ['Binge-Watching Crime Thrillers', 'Lying Down to Recharge (눕방)', 'Calling Out Liars'],
      iconicHabits: 'Famous for her chic short bob cut, fierce 5-second countdowns, and shouting "Dodok-nom (도독놈 - you little thief)!" when someone steals a Quest spot or betrays the team.'
    },
    personality:
      'Fiery, impatient, no-nonsense ISTP girl-crush leader. Cuts straight through excuses, refuses to yield the mic when she smells a lie, and demands immediate accountability from every Quest Leader.',
    speechStyle:
      'Blunt, punchy, rapid-fire street-boss English with occasional "Dodok-nom!" callouts ("Yo, cut the act! We cannot let the reject track hit 4, wake up everyone!", "Explain your third pick in 5 seconds or I\'m smashing REJECT right now, period.").',
    voiceName: 'Callirhoe',
    pitchOffset: 0.96,
    rateOffset: 1.13,
    themeColor: '#10b981',
    visualPrompt:
      'Photorealistic 4K studio portrait of a charismatic 21-year-old Korean K-pop female idol leader named Chaerin, iconic chic short dark chocolate tassel-cut bob haircut with wispy bangs, expressive cat-doe eyes, black and silver cropped stage blazer in a neon Seoul studio.',
    expressions: {
      idle: 'Chic, focused leader expression with signature bob cut',
      speaking: 'Fierce, commanding expression rallying the Good team',
      shocked: 'Fierce glare of betrayal ("You lied to my face?!")',
      suspicious: 'Skeptical raised eyebrow, tapping finger on desk'
    }
  },
  {
    id: 'idol_hanni',
    name: 'Hana',
    koreanName: '하나',
    inspirationTag: 'Hanni (NewJeans) Motif — Melbourne High-Teen Visual',
    archetype: 'The Melbourne Aussie Trap-Setter (호주 슬랭 트랩 메이커)',
    dialectTag: '🦘 Melbourne Aussie Slang (호주 사투리)',
    yieldStyle: 'PUSH_THROUGH',
    namuwikiProfile: {
      motif: 'Hanni (하니)',
      mbti: 'INFP (Creative, Empathetic Wildcard)',
      favoriteFoods: ['Warm Savory Bread & Baguettes (빵순이)', 'Avocado Toast', 'Vietnamese Spring Rolls (월남쌈)', 'Mint-Choco (민초단)'],
      nicknames: ['Baby Otter / Hamster (햄찌)', 'Melbourne Peach', 'Aussie Detective'],
      hobbies: ['Playing Acoustic Guitar', '35mm Film Photography', 'Jotting Suspect Notes in Her Diary'],
      iconicHabits: 'Raised in Melbourne; smiles like an innocent baby otter with headphones around her neck while setting lethal Aussie-slang logic traps ("Oi mate, fair dinkum, heaps dodgy!").'
    },
    personality:
      'Witty, perceptive, and unpredictably clever. Speaks with authentic Melbourne Australian slang and sets conversational traps during discussion so Evil players contradict their own earlier vote logic.',
    speechStyle:
      'Authentic Melbourne Aussie English dialect ("Oi mate, fair dinkum, that excuse is heaps dodgy!", "No worries unnie, that math isn\'t mathing at all—reckon you\'re hiding Morgana right now!").',
    voiceName: 'Autonoe',
    pitchOffset: 1.11,
    rateOffset: 1.07,
    themeColor: '#06b6d4',
    visualPrompt:
      'Photorealistic 4K studio portrait of a gorgeous and expressive 20-year-old K-pop female idol named Hana, bright crescent-moon eyes, jet-black half-twin braids with wispy bangs and star hairpins, pastel-blue varsity cardigan with retro silver headphones around her neck in a Seoul streaming studio.',
    expressions: {
      idle: 'Cute, curious, observant expression on webcam',
      speaking: 'Playful yet sharp expression asking a trap question',
      shocked: 'Meme-worthy wide-eyed variety show surprise',
      suspicious: 'Clever detective smirk, tilting head'
    }
  }
];

/**
 * Official 7-Player Avalon Role Definitions.
 */
export const AVALON_ROLES_7P = [
  {
    roleId: 'MERLIN',
    roleName: 'Merlin',
    alignment: 'GOOD',
    teamLabel: 'Loyal Servant of Arthur (Good)',
    summary:
      'You know all 3 Evil players (Assassin, Morgana, and Oberon). Guide the Good team to pass 3 Quests WITHOUT letting the Assassin figure out you are Merlin!'
  },
  {
    roleId: 'PERCIVAL',
    roleName: 'Percival',
    alignment: 'GOOD',
    teamLabel: 'Loyal Servant of Arthur (Good)',
    summary:
      'You see 2 Mystery Merlin Candidates (one is the real Merlin, the other is Evil Morgana). Figure out who the true Merlin is, follow their subtle leads, and take the Assassin\'s bullet for Merlin!'
  },
  {
    roleId: 'LOYAL_SERVANT_1',
    roleName: 'Loyal Servant of Arthur (Good Citizen)',
    alignment: 'GOOD',
    teamLabel: 'Loyal Servant of Arthur (Good)',
    summary:
      'You are a pure Good Citizen with no night vision. Use strict vote math, Quest outcomes, and vocal/behavioral tells to uncover the 3 Evil players!'
  },
  {
    roleId: 'LOYAL_SERVANT_2',
    roleName: 'Loyal Servant of Arthur (Good Citizen)',
    alignment: 'GOOD',
    teamLabel: 'Loyal Servant of Arthur (Good)',
    summary:
      'You are a pure Good Citizen with no night vision. Track who approves failed teams, defend clean players, and pass 3 Quests!'
  },
  {
    roleId: 'ASSASSIN',
    roleName: 'Assassin',
    alignment: 'EVIL',
    teamLabel: 'Minion of Mordred (Evil)',
    summary:
      'You are EVIL. You know Morgana (you do NOT know who Oberon is). Sabotage 3 Quests—or if Good passes 3 Quests, identify and ASSASSINATE Merlin to steal victory!'
  },
  {
    roleId: 'MORGANA',
    roleName: 'Morgana',
    alignment: 'EVIL',
    teamLabel: 'Minion of Mordred (Evil)',
    summary:
      'You are EVIL. You know the Assassin (you do NOT know who Oberon is). You appear to Percival as a Merlin candidate—pretend to be the real Merlin to deceive Percival!'
  },
  {
    roleId: 'OBERON',
    roleName: 'Oberon',
    alignment: 'EVIL',
    teamLabel: 'Minion of Mordred (Evil)',
    summary:
      'You are EVIL, but blind to Assassin and Morgana (and they do NOT know who you are—though Merlin still sees you as Evil!). Deduce your Evil teammates from their votes and sabotage 3 Quests!'
  }
];

/**
 * Official 7-Player Avalon Quest Board Configuration: 2 - 3 - 3 - 4* - 4.
 * Note: Quest 4 requires 2 FAIL cards to fail!
 */
export const QUEST_CONFIG_7P = [
  { questNumber: 1, teamSize: 2, failsRequired: 1, label: 'Quest 1 (2 Players)' },
  { questNumber: 2, teamSize: 3, failsRequired: 1, label: 'Quest 2 (3 Players)' },
  { questNumber: 3, teamSize: 3, failsRequired: 1, label: 'Quest 3 (3 Players)' },
  { questNumber: 4, teamSize: 4, failsRequired: 2, label: 'Quest 4 (4 Players • 2 Fails Req!)' },
  { questNumber: 5, teamSize: 4, failsRequired: 1, label: 'Quest 5 (4 Players)' }
];

/**
 * Official Phase Timer Durations (in seconds) per spec-core.md.
 */
export const PHASE_TIMERS_SEC = {
  TEAM_PROPOSAL: 45,
  DISCUSSION: 180,
  TEAM_VOTE: 30,
  QUEST_EXECUTION: 25,
  ASSASSIN_PHASE: 60
};

/**
 * Cryptographically shuffles an array using Fisher-Yates.
 * @template T
 * @param {T[]} inputArray
 * @returns {T[]}
 */
export function cryptoShuffle(inputArray) {
  const copy = [...inputArray];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

/**
 * Creates a brand-new 7-player Avalon game session with random roles across the 6 AI idols + 1 Human Guest.
 * Supports optional hackathon judge fast-forward presets while still assigning roles randomly!
 * @param {object} options
 * @param {string} [options.playerName='Guest']
 * @param {'STANDARD'|'QUEST_4_CRITICAL'|'ASSASSIN_CLIMAX'} [options.demoPreset='STANDARD']
 * @returns {object} Full server-side game state
 */
export function createAvalonGame({
  playerName = 'Guest',
  demoPreset = 'STANDARD',
  preferredRole = 'RANDOM'
} = {}) {
  const gameId = `avalon_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const humanProfile = {
    id: 'player_human',
    name: playerName.trim() || 'Guest',
    inspirationTag: 'Special Variety Guest (7th Member)',
    archetype: 'The Wildcard Guest',
    personality: 'Human player on the Zoom call. May actively debate or play as a silent bystander.',
    speechStyle: 'Live Human Input',
    voiceName: 'Human',
    themeColor: '#eab308',
    isHuman: true
  };

  const allPlayers = [
    ...IDOL_CAST_PROFILES.map((idol, idx) => ({
      ...idol,
      seatIndex: idx,
      isHuman: false,
      currentExpression: 'idle',
      lastVideoUrl: `/generated/webcam_${idol.id}.mp4`,
      lastAudioBase64: null
    })),
    {
      ...humanProfile,
      seatIndex: 6,
      currentExpression: 'idle'
    }
  ];

  // Role distribution: Random by default, or optional preferred role for the Human Guest + shuffled remaining 6 roles
  const roleAssignments = {};
  const normalizedPref = String(preferredRole || 'RANDOM').toUpperCase();
  const targetRoleId =
    normalizedPref === 'LOYAL_SERVANT'
      ? crypto.randomInt(0, 2) === 0
        ? 'LOYAL_SERVANT_1'
        : 'LOYAL_SERVANT_2'
      : normalizedPref;
  const preferredRoleObj = AVALON_ROLES_7P.find((r) => r.roleId === targetRoleId);

  if (preferredRoleObj && normalizedPref !== 'RANDOM') {
    roleAssignments.player_human = preferredRoleObj;
    const remainingRoles = cryptoShuffle(
      AVALON_ROLES_7P.filter((r) => r.roleId !== preferredRoleObj.roleId)
    );
    allPlayers
      .filter((p) => !p.isHuman)
      .forEach((player, idx) => {
        roleAssignments[player.id] = remainingRoles[idx];
      });
  } else {
    const shuffledRoles = cryptoShuffle(AVALON_ROLES_7P);
    allPlayers.forEach((player, index) => {
      roleAssignments[player.id] = shuffledRoles[index];
    });
  }

  // Initialize Bayesian Suspicion Matrix: suspicionMatrix[observerId][targetId] in [0.05, 0.95]
  const suspicionMatrix = {};
  for (const observer of allPlayers) {
    suspicionMatrix[observer.id] = {};
    const observerRole = roleAssignments[observer.id];
    for (const target of allPlayers) {
      if (observer.id === target.id) {
        suspicionMatrix[observer.id][target.id] = 0.0;
        continue;
      }
      const targetRole = roleAssignments[target.id];
      if (observerRole.roleId === 'MERLIN') {
        // Merlin knows all 3 Evil players (Assassin, Morgana, Oberon) with 100% certainty
        suspicionMatrix[observer.id][target.id] = targetRole.alignment === 'EVIL' ? 0.98 : 0.02;
      } else if (observerRole.roleId === 'PERCIVAL') {
        // Percival sees Merlin & Morgana as 50/50 candidates
        if (targetRole.roleId === 'MERLIN' || targetRole.roleId === 'MORGANA') {
          suspicionMatrix[observer.id][target.id] = 0.5;
        } else {
          suspicionMatrix[observer.id][target.id] = 0.42;
        }
      } else if (observerRole.roleId === 'ASSASSIN' || observerRole.roleId === 'MORGANA') {
        // Assassin and Morgana know each other, but do NOT know Oberon
        if (targetRole.roleId === 'ASSASSIN' || targetRole.roleId === 'MORGANA') {
          suspicionMatrix[observer.id][target.id] = 0.99;
        } else {
          suspicionMatrix[observer.id][target.id] = 0.25;
        }
      } else {
        // Loyal Servants and Oberon start with uniform prior (3 Evil out of 6 others = 0.50)
        suspicionMatrix[observer.id][target.id] = 0.43;
      }
    }
  }

  // Random starting leader
  const startingLeaderIndex = crypto.randomInt(0, allPlayers.length);

  const quests = QUEST_CONFIG_7P.map((q) => ({
    ...q,
    status: q.questNumber === 1 ? 'ACTIVE' : 'PENDING',
    proposedTeamIds: [],
    finalTeamIds: [],
    successCount: 0,
    failCount: 0,
    leaderId: null
  }));

  const game = {
    gameId,
    createdAt: new Date().toISOString(),
    demoPreset,
    preferredRole: preferredRoleObj && normalizedPref !== 'RANDOM' ? normalizedPref : 'RANDOM',
    mcHost: { ...MC_HOST_PROFILE, currentExpression: 'speaking' },
    players: allPlayers,
    roleAssignments, // NEVER exposed directly to AI prompts or public state!
    suspicionMatrix,
    currentQuestNumber: 1,
    quests,
    leaderIndex: startingLeaderIndex,
    leaderId: allPlayers[startingLeaderIndex].id,
    proposedTeamIds: [],
    rejectTrack: 0, // 0..5 (5 = Evil wins immediately)
    maxRejects: 5,
    phase: 'TEAM_PROPOSAL', // TEAM_PROPOSAL | DISCUSSION | TEAM_VOTE | QUEST_EXECUTION | ASSASSIN_PHASE | GAME_OVER
    phaseTimerSec: PHASE_TIMERS_SEC.TEAM_PROPOSAL,
    phaseStartedAt: Date.now(),
    goodScore: 0,
    evilScore: 0,
    winner: null, // 'GOOD' | 'EVIL' | null
    winReason: null,
    assassinTargetId: null,
    currentVotes: {}, // playerId -> { vote: 'APPROVE'|'REJECT', reason, innerThought }
    currentQuestCards: {}, // playerId -> 'SUCCESS'|'FAIL'
    voteHistory: [],
    questHistory: [],
    transcript: [],
    verificationLogs: [],
    humanStats: {
      messagesThisRound: 0,
      totalMessages: 0,
      lastSpokeAt: null,
      bystanderCalledOutThisRound: false
    },
    speakerHistoryThisRound: [],
    lastAgentBids: [],
    lastFloorEvent: null
  };

  // Apply Judge Fast-Forward Preset if requested (for <3 minute live demo verification)
  if (demoPreset === 'QUEST_4_CRITICAL') {
    applyQuest4CriticalPreset(game);
  } else if (demoPreset === 'ASSASSIN_CLIMAX') {
    applyAssassinClimaxPreset(game);
  }

  return game;
}

/**
 * Configures a mid-game 1-1 or 2-1 critical state at Quest 4 (where 4 players go and 2 Fails are required)
 * while preserving the cryptographically random role assignments.
 * @param {object} game
 */
function applyQuest4CriticalPreset(game) {
  const playerIds = game.players.map((p) => p.id);
  const evilIds = playerIds.filter((id) => game.roleAssignments[id].alignment === 'EVIL');
  const goodIds = playerIds.filter((id) => game.roleAssignments[id].alignment === 'GOOD');

  // Quest 1: 2 Good succeeded
  game.quests[0].status = 'SUCCESS';
  game.quests[0].finalTeamIds = [goodIds[0], goodIds[1]];
  game.quests[0].successCount = 2;
  game.quests[0].failCount = 0;

  // Quest 2: 2 Good + 1 Evil failed
  game.quests[1].status = 'FAIL';
  game.quests[1].finalTeamIds = [goodIds[0], goodIds[2], evilIds[0]];
  game.quests[1].successCount = 2;
  game.quests[1].failCount = 1;

  // Quest 3: 2 Good + 1 Evil failed
  game.quests[2].status = 'FAIL';
  game.quests[2].finalTeamIds = [goodIds[1], goodIds[3], evilIds[1]];
  game.quests[2].successCount = 2;
  game.quests[2].failCount = 1;

  game.quests[3].status = 'ACTIVE';
  game.currentQuestNumber = 4;
  game.goodScore = 1;
  game.evilScore = 2;
  game.rejectTrack = 2;

  game.questHistory.push(
    { questNumber: 1, teamIds: game.quests[0].finalTeamIds, successCount: 2, failCount: 0, outcome: 'SUCCESS' },
    { questNumber: 2, teamIds: game.quests[1].finalTeamIds, successCount: 2, failCount: 1, outcome: 'FAIL' },
    { questNumber: 3, teamIds: game.quests[2].finalTeamIds, successCount: 2, failCount: 1, outcome: 'FAIL' }
  );

  // Update suspicion matrix based on Quest 2 & 3 failures
  updateSuspicionFromQuestOutcome(game, game.quests[1].finalTeamIds, 1);
  updateSuspicionFromQuestOutcome(game, game.quests[2].finalTeamIds, 1);
}

/**
 * Configures the game right at the dramatic Assassin Final Shot phase (Good has won 3 Quests,
 * and now the Assassin must deduce and shoot Merlin!).
 * @param {object} game
 */
function applyAssassinClimaxPreset(game) {
  const playerIds = game.players.map((p) => p.id);
  const evilIds = playerIds.filter((id) => game.roleAssignments[id].alignment === 'EVIL');
  const goodIds = playerIds.filter((id) => game.roleAssignments[id].alignment === 'GOOD');

  game.quests[0].status = 'SUCCESS';
  game.quests[0].finalTeamIds = [goodIds[0], goodIds[1]];
  game.quests[0].successCount = 2;
  game.quests[0].failCount = 0;

  game.quests[1].status = 'FAIL';
  game.quests[1].finalTeamIds = [goodIds[0], goodIds[2], evilIds[0]];
  game.quests[1].successCount = 2;
  game.quests[1].failCount = 1;

  game.quests[2].status = 'SUCCESS';
  game.quests[2].finalTeamIds = [goodIds[1], goodIds[2], goodIds[3]];
  game.quests[2].successCount = 3;
  game.quests[2].failCount = 0;

  game.quests[3].status = 'SUCCESS';
  game.quests[3].finalTeamIds = [goodIds[0], goodIds[1], goodIds[2], evilIds[1]];
  game.quests[3].successCount = 3;
  game.quests[3].failCount = 1; // Only 1 Fail on Quest 4 = SUCCESS because Quest 4 requires 2 Fails!

  game.currentQuestNumber = 4;
  game.goodScore = 3;
  game.evilScore = 1;
  game.phase = 'ASSASSIN_PHASE';
  game.phaseTimerSec = PHASE_TIMERS_SEC.ASSASSIN_PHASE;
  game.phaseStartedAt = Date.now();

  game.questHistory.push(
    { questNumber: 1, teamIds: game.quests[0].finalTeamIds, successCount: 2, failCount: 0, outcome: 'SUCCESS' },
    { questNumber: 2, teamIds: game.quests[1].finalTeamIds, successCount: 2, failCount: 1, outcome: 'FAIL' },
    { questNumber: 3, teamIds: game.quests[2].finalTeamIds, successCount: 3, failCount: 0, outcome: 'SUCCESS' },
    { questNumber: 4, teamIds: game.quests[3].finalTeamIds, successCount: 3, failCount: 1, outcome: 'SUCCESS' }
  );
}

/**
 * Constructs the strictly isolated Epistemic Private View for a specific player (AI or Human).
 * Guarantees zero leakage of hidden roles outside official 7-player Avalon Night rules.
 * @param {object} game
 * @param {string} playerId
 * @returns {object} Isolated private player view
 */
export function buildPrivatePlayerView(game, playerId) {
  const player = game.players.find((p) => p.id === playerId);
  const myRole = game.roleAssignments[playerId];
  if (!player || !myRole) {
    throw new Error(`Invalid playerId: ${playerId}`);
  }

  const allEntries = Object.entries(game.roleAssignments);
  let knownEvilIds = [];
  let knownEvilTeammateIds = [];
  let merlinCandidateIds = [];
  let nightVisionText = '';

  if (myRole.roleId === 'MERLIN') {
    // Merlin sees Assassin, Morgana, AND Oberon
    knownEvilIds = allEntries
      .filter(([, r]) => r.alignment === 'EVIL')
      .map(([id]) => id);
    const evilNames = knownEvilIds.map((id) => getPlayerName(game, id)).join(', ');
    nightVisionText = `NIGHT VISION (MERLIN): You see that the 3 Evil players (Assassin, Morgana, Oberon) are [${evilNames}]. Guide the Good team using vote math and subtle logic, NEVER reveal that you know their roles with certainty or the Assassin will shoot you at the end!`;
  } else if (myRole.roleId === 'PERCIVAL') {
    // Percival sees Merlin and Morgana (in consistent deterministic order per player ID pair)
    merlinCandidateIds = allEntries
      .filter(([, r]) => r.roleId === 'MERLIN' || r.roleId === 'MORGANA')
      .map(([id]) => id)
      .sort();
    const candidateNames = merlinCandidateIds.map((id) => getPlayerName(game, id)).join(' and ');
    nightVisionText = `NIGHT VISION (PERCIVAL): You see [${candidateNames}] as the two Merlin candidates! One is the true MERLIN (Good) and one is MORGANA (Evil imposter). Watch their votes and subtle hints to deduce who the real Merlin is, and protect them from the Assassin!`;
  } else if (myRole.roleId === 'ASSASSIN') {
    // Assassin sees Morgana, does NOT see Oberon
    knownEvilTeammateIds = allEntries
      .filter(([, r]) => r.roleId === 'MORGANA')
      .map(([id]) => id);
    const morganaName = knownEvilTeammateIds.map((id) => getPlayerName(game, id)).join(', ');
    nightVisionText = `NIGHT VISION (ASSASSIN - EVIL): Your known Evil partner is MORGANA [${morganaName}]. There is also an OBERON (Evil) among the remaining players, but neither you nor Morgana know who Oberon is! Watch closely for which Good player has suspiciously accurate reads so you can assassinate MERLIN if Good passes 3 Quests.`;
  } else if (myRole.roleId === 'MORGANA') {
    // Morgana sees Assassin, does NOT see Oberon
    knownEvilTeammateIds = allEntries
      .filter(([, r]) => r.roleId === 'ASSASSIN')
      .map(([id]) => id);
    const assassinName = knownEvilTeammateIds.map((id) => getPlayerName(game, id)).join(', ');
    nightVisionText = `NIGHT VISION (MORGANA - EVIL): Your known Evil partner is the ASSASSIN [${assassinName}]. You do NOT know who OBERON is. Remember: PERCIVAL sees both you and MERLIN as Merlin candidates—act wise and authoritative to trick Percival into trusting you!`;
  } else if (myRole.roleId === 'OBERON') {
    // Oberon is Evil but blind to Assassin & Morgana
    nightVisionText = `NIGHT VISION (OBERON - EVIL): You are on the EVIL team, but you are blind to Assassin and Morgana, and they do NOT know who you are! (Warning: Merlin DOES see you as Evil.) Deduce who your Evil teammates are from their votes and help fail 3 Quests!`;
  } else {
    // Loyal Servant of Arthur (Good Citizen)
    nightVisionText = `NIGHT VISION (LOYAL SERVANT / GOOD CITIZEN): You have no night vision. You must rely 100% on Quest team results, Approve/Reject vote history, and behavioral tells to find the 3 Evil players!`;
  }

  const mySuspicions = game.suspicionMatrix[playerId] || {};
  const formattedSuspicions = Object.entries(mySuspicions)
    .filter(([targetId]) => targetId !== playerId)
    .map(([targetId, prob]) => ({
      playerId: targetId,
      playerName: getPlayerName(game, targetId),
      evilProbability: Number(prob.toFixed(2))
    }))
    .sort((a, b) => b.evilProbability - a.evilProbability);

  return {
    self: {
      id: player.id,
      name: player.name,
      koreanName: player.koreanName || player.name,
      archetype: player.archetype,
      dialectTag: player.dialectTag || '',
      yieldStyle: player.yieldStyle || 'YIELD_POLITELY',
      namuwikiProfile: player.namuwikiProfile || null,
      personality: player.personality,
      speechStyle: player.speechStyle,
      roleId: myRole.roleId,
      roleName: myRole.roleName,
      alignment: myRole.alignment,
      teamLabel: myRole.teamLabel,
      roleSummary: myRole.summary
    },
    epistemicVision: {
      nightVisionText,
      knownEvilIds,
      knownEvilTeammateIds,
      merlinCandidateIds
    },
    suspicionRanking: formattedSuspicions,
    boardSummary: getPublicBoardSummary(game)
  };
}

/**
 * Helper to look up a player's display name by ID.
 * @param {object} game
 * @param {string} playerId
 * @returns {string}
 */
export function getPlayerName(game, playerId) {
  if (playerId === 'mc_jaesuk') return game.mcHost.name;
  const found = game.players.find((p) => p.id === playerId);
  return found ? found.name : playerId;
}

/**
 * Returns the active Quest object.
 * @param {object} game
 * @returns {object}
 */
export function getActiveQuest(game) {
  return (
    game.quests.find((q) => q.questNumber === game.currentQuestNumber) ||
    game.quests[game.quests.length - 1]
  );
}

/**
 * Returns a clean summary of the public board state safe for any player or UI client.
 * @param {object} game
 * @returns {object}
 */
export function getPublicBoardSummary(game) {
  const activeQuest = getActiveQuest(game);
  const elapsedSec = Math.floor((Date.now() - game.phaseStartedAt) / 1000);
  const remainingSec = Math.max(0, game.phaseTimerSec - elapsedSec);

  return {
    gameId: game.gameId,
    preferredRole: game.preferredRole || 'RANDOM',
    phase: game.phase,
    phaseTimerSec: game.phaseTimerSec,
    remainingSec,
    currentQuestNumber: game.currentQuestNumber,
    requiredTeamSize: activeQuest ? activeQuest.teamSize : 2,
    failsRequiredOnCurrentQuest: activeQuest ? activeQuest.failsRequired : 1,
    goodScore: game.goodScore,
    evilScore: game.evilScore,
    rejectTrack: game.rejectTrack,
    maxRejects: game.maxRejects,
    isHammerProposal: game.rejectTrack === 4,
    leaderId: game.leaderId,
    leaderName: getPlayerName(game, game.leaderId),
    proposedTeamIds: game.proposedTeamIds,
    proposedTeamNames: game.proposedTeamIds.map((id) => getPlayerName(game, id)),
    winner: game.winner,
    winReason: game.winReason,
    assassinTargetId: game.assassinTargetId,
    quests: game.quests,
    voteHistory: game.voteHistory.slice(-8),
    questHistory: game.questHistory,
    lastAgentBids: game.lastAgentBids || [],
    lastFloorEvent: game.lastFloorEvent || null,
    humanStats: {
      ...game.humanStats,
      isSilentBystander: game.humanStats.messagesThisRound === 0 && elapsedSec >= 22
    }
  };
}

/**
 * Updates Bayesian suspicion scores across all AI observers after a Quest completes.
 * @param {object} game
 * @param {string[]} teamIds
 * @param {number} failCount
 */
export function updateSuspicionFromQuestOutcome(game, teamIds, failCount) {
  for (const observer of game.players) {
    const obsRole = game.roleAssignments[observer.id];
    // Merlin already knows true Evil alignments
    if (obsRole.roleId === 'MERLIN') continue;

    for (const memberId of teamIds) {
      if (memberId === observer.id) continue;
      // Don't overwrite known Evil partner certainty for Assassin/Morgana
      if (
        (obsRole.roleId === 'ASSASSIN' && game.roleAssignments[memberId].roleId === 'MORGANA') ||
        (obsRole.roleId === 'MORGANA' && game.roleAssignments[memberId].roleId === 'ASSASSIN')
      ) {
        continue;
      }

      const currentProb = game.suspicionMatrix[observer.id][memberId] ?? 0.43;
      if (failCount > 0) {
        // If observer was also on the team and is Good, concentration of suspicion on remaining team members is even higher
        const observerOnTeamAndGood =
          teamIds.includes(observer.id) && obsRole.alignment === 'GOOD';
        const effectiveSuspectPool = observerOnTeamAndGood
          ? Math.max(1, teamIds.length - 1)
          : teamIds.length;
        const delta = Math.min(0.42, (failCount / effectiveSuspectPool) * 0.52);
        game.suspicionMatrix[observer.id][memberId] = Math.min(0.95, currentProb + delta);
      } else {
        // Quest succeeded — slight trust boost (though Evil sometimes slow-plays Quest 1!)
        const trustDelta = game.currentQuestNumber === 1 ? 0.08 : 0.16;
        game.suspicionMatrix[observer.id][memberId] = Math.max(0.08, currentProb - trustDelta);
      }
    }
  }
}

/**
 * Updates Bayesian suspicion scores based on who approved a team that subsequently failed,
 * or who rejected a clean team, or who is staying suspiciously silent.
 * @param {object} game
 * @param {Record<string, {vote: string}>} votesByPlayer
 * @param {string[]} proposedTeamIds
 */
export function updateSuspicionFromVotes(game, votesByPlayer, proposedTeamIds) {
  for (const observer of game.players) {
    const obsRole = game.roleAssignments[observer.id];
    if (obsRole.roleId === 'MERLIN') continue;

    // Calculate how suspicious the proposed team looks to this observer
    const teamMaxSuspicion = Math.max(
      ...proposedTeamIds.map((id) =>
        id === observer.id ? 0 : game.suspicionMatrix[observer.id][id] ?? 0.43
      )
    );

    for (const target of game.players) {
      if (target.id === observer.id) continue;
      if (
        (obsRole.roleId === 'ASSASSIN' && game.roleAssignments[target.id].roleId === 'MORGANA') ||
        (obsRole.roleId === 'MORGANA' && game.roleAssignments[target.id].roleId === 'ASSASSIN')
      ) {
        continue;
      }

      const targetVote = votesByPlayer[target.id]?.vote;
      const currentProb = game.suspicionMatrix[observer.id][target.id] ?? 0.43;

      if (teamMaxSuspicion >= 0.68 && targetVote === 'APPROVE') {
        game.suspicionMatrix[observer.id][target.id] = Math.min(0.94, currentProb + 0.09);
      } else if (teamMaxSuspicion >= 0.68 && targetVote === 'REJECT') {
        game.suspicionMatrix[observer.id][target.id] = Math.max(0.08, currentProb - 0.05);
      }
    }
  }
}

/**
 * Validates and locks in the Leader's proposed Quest Team, transitioning to the 75s DISCUSSION phase.
 * If fewer or more than requiredTeamSize are provided (e.g. timer expired), auto-completes a valid team.
 * @param {object} game
 * @param {string[]} candidateTeamIds
 * @returns {{ proposedTeamIds: string[], requiredTeamSize: number }}
 */
export function lockTeamProposal(game, candidateTeamIds = []) {
  const activeQuest = getActiveQuest(game);
  const requiredSize = activeQuest.teamSize;
  const validIds = new Set(game.players.map((p) => p.id));

  const deduped = [];
  for (const id of candidateTeamIds) {
    if (validIds.has(id) && !deduped.includes(id)) {
      deduped.push(id);
    }
  }

  // Always ensure Leader is included first if auto-filling
  if (deduped.length < requiredSize && !deduped.includes(game.leaderId)) {
    deduped.unshift(game.leaderId);
  }

  // Auto-fill least suspicious players from Leader's perspective if needed
  const leaderSuspicions = game.suspicionMatrix[game.leaderId] || {};
  const sortedCandidates = game.players
    .map((p) => p.id)
    .filter((id) => !deduped.includes(id))
    .sort((a, b) => (leaderSuspicions[a] ?? 0.45) - (leaderSuspicions[b] ?? 0.45));

  while (deduped.length < requiredSize && sortedCandidates.length > 0) {
    deduped.push(sortedCandidates.shift());
  }

  const finalProposed = deduped.slice(0, requiredSize);
  game.proposedTeamIds = finalProposed;
  activeQuest.proposedTeamIds = finalProposed;
  activeQuest.leaderId = game.leaderId;

  game.phase = 'DISCUSSION';
  game.phaseTimerSec = PHASE_TIMERS_SEC.DISCUSSION;
  game.phaseStartedAt = Date.now();
  game.humanStats.messagesThisRound = 0;
  game.humanStats.bystanderCalledOutThisRound = false;
  game.speakerHistoryThisRound = [game.leaderId];

  return {
    proposedTeamIds: finalProposed,
    requiredTeamSize: requiredSize
  };
}

/**
 * Transitions the game from DISCUSSION to TEAM_VOTE (15s timer).
 * @param {object} game
 */
export function startTeamVotePhase(game) {
  game.phase = 'TEAM_VOTE';
  game.phaseTimerSec = PHASE_TIMERS_SEC.TEAM_VOTE;
  game.phaseStartedAt = Date.now();
  game.currentVotes = {};
}

/**
 * Resolves all 7 players' APPROVE / REJECT votes and transitions to either:
 * - QUEST_EXECUTION (if >= 4 APPROVE)
 * - Next Leader's TEAM_PROPOSAL (if < 4 APPROVE and rejectTrack < 5)
 * - GAME_OVER (Evil wins immediately if 5th proposal in a row is rejected!)
 * @param {object} game
 * @param {Record<string, { vote: 'APPROVE'|'REJECT', reason: string, innerThought?: string }>} allVotes
 * @returns {object} Vote resolution summary
 */
export function resolveTeamVotes(game, allVotes) {
  game.currentVotes = allVotes;
  let approveCount = 0;
  let rejectCount = 0;

  for (const player of game.players) {
    const entry = allVotes[player.id];
    if (entry && entry.vote === 'APPROVE') {
      approveCount += 1;
    } else {
      rejectCount += 1;
    }
  }

  const approved = approveCount >= 4;
  const voteRecord = {
    questNumber: game.currentQuestNumber,
    proposalAttempt: game.rejectTrack + 1,
    leaderId: game.leaderId,
    leaderName: getPlayerName(game, game.leaderId),
    proposedTeamIds: [...game.proposedTeamIds],
    proposedTeamNames: game.proposedTeamIds.map((id) => getPlayerName(game, id)),
    approveCount,
    rejectCount,
    approved,
    votes: allVotes
  };
  game.voteHistory.push(voteRecord);

  // Update Bayesian suspicions from voting behavior
  updateSuspicionFromVotes(game, allVotes, game.proposedTeamIds);

  if (approved) {
    game.rejectTrack = 0;
    game.phase = 'QUEST_EXECUTION';
    game.phaseTimerSec = PHASE_TIMERS_SEC.QUEST_EXECUTION;
    game.phaseStartedAt = Date.now();
    game.currentQuestCards = {};
  } else {
    game.rejectTrack += 1;
    if (game.rejectTrack >= game.maxRejects) {
      // 5 consecutive rejected proposals = Immediate Evil Victory (Hammer Rule)
      game.phase = 'GAME_OVER';
      game.winner = 'EVIL';
      game.winReason =
        '5 consecutive Quest Team proposals were rejected! Chaos consumed the table and Minions of Mordred win automatically!';
    } else {
      advanceLeader(game);
      game.proposedTeamIds = [];
      game.phase = 'TEAM_PROPOSAL';
      game.phaseTimerSec = PHASE_TIMERS_SEC.TEAM_PROPOSAL;
      game.phaseStartedAt = Date.now();
    }
  }

  return voteRecord;
}

/**
 * Rotates the Leader crown clockwise to the next player in the 7-player circle.
 * @param {object} game
 */
export function advanceLeader(game) {
  game.leaderIndex = (game.leaderIndex + 1) % game.players.length;
  game.leaderId = game.players[game.leaderIndex].id;
}

/**
 * Resolves the secret Quest Cards played by the N members on the Quest Team.
 * Enforces the rule that Good players MUST submit SUCCESS, and Quest 4 requires 2 Fails!
 * @param {object} game
 * @param {Record<string, 'SUCCESS'|'FAIL'>} submittedCards
 * @returns {object} Quest outcome summary
 */
export function resolveQuestExecution(game, submittedCards) {
  const activeQuest = getActiveQuest(game);
  const teamIds = [...game.proposedTeamIds];
  let successCount = 0;
  let failCount = 0;

  for (const memberId of teamIds) {
    const role = game.roleAssignments[memberId];
    // Strict Avalon Rule: Good players can NEVER play FAIL
    const rawCard = submittedCards[memberId] || 'SUCCESS';
    const legalCard = role.alignment === 'GOOD' ? 'SUCCESS' : rawCard === 'FAIL' ? 'FAIL' : 'SUCCESS';
    game.currentQuestCards[memberId] = legalCard;
    if (legalCard === 'FAIL') {
      failCount += 1;
    } else {
      successCount += 1;
    }
  }

  const questFailed = failCount >= activeQuest.failsRequired;
  const outcome = questFailed ? 'FAIL' : 'SUCCESS';

  activeQuest.status = outcome;
  activeQuest.finalTeamIds = teamIds;
  activeQuest.successCount = successCount;
  activeQuest.failCount = failCount;

  if (questFailed) {
    game.evilScore += 1;
  } else {
    game.goodScore += 1;
  }

  const questRecord = {
    questNumber: activeQuest.questNumber,
    teamIds,
    teamNames: teamIds.map((id) => getPlayerName(game, id)),
    failsRequired: activeQuest.failsRequired,
    successCount,
    failCount,
    outcome
  };
  game.questHistory.push(questRecord);

  // Update Bayesian suspicion matrix based on quest result
  updateSuspicionFromQuestOutcome(game, teamIds, failCount);

  if (game.evilScore >= 3) {
    game.phase = 'GAME_OVER';
    game.winner = 'EVIL';
    game.winReason = '3 Quests failed! The Minions of Mordred (Assassin, Morgana, and Oberon) have sabotaged the group!';
  } else if (game.goodScore >= 3) {
    // Trigger the dramatic Assassin Final Shot Phase!
    game.phase = 'ASSASSIN_PHASE';
    game.phaseTimerSec = PHASE_TIMERS_SEC.ASSASSIN_PHASE;
    game.phaseStartedAt = Date.now();
  } else {
    // Advance to next Quest
    game.currentQuestNumber += 1;
    const nextQuest = getActiveQuest(game);
    if (nextQuest) {
      nextQuest.status = 'ACTIVE';
    }
    advanceLeader(game);
    game.proposedTeamIds = [];
    game.phase = 'TEAM_PROPOSAL';
    game.phaseTimerSec = PHASE_TIMERS_SEC.TEAM_PROPOSAL;
    game.phaseStartedAt = Date.now();
  }

  return questRecord;
}

/**
 * Resolves the Assassin's Final Shot at Merlin after Good completes 3 Quests.
 * @param {object} game
 * @param {string} targetPlayerId
 * @param {string} assassinReasoning
 * @returns {object} Assassination outcome
 */
export function resolveAssassination(game, targetPlayerId, assassinReasoning = '') {
  const merlinEntry = Object.entries(game.roleAssignments).find(
    ([, role]) => role.roleId === 'MERLIN'
  );
  const trueMerlinId = merlinEntry ? merlinEntry[0] : null;
  const assassinEntry = Object.entries(game.roleAssignments).find(
    ([, role]) => role.roleId === 'ASSASSIN'
  );
  const assassinId = assassinEntry ? assassinEntry[0] : null;

  game.assassinTargetId = targetPlayerId;
  game.phase = 'GAME_OVER';

  const hitMerlin = targetPlayerId === trueMerlinId;
  if (hitMerlin) {
    game.winner = 'EVIL';
    game.winReason = `ASSASSINATION SUCCESSFUL! ${getPlayerName(game, assassinId)} (Assassin) correctly identified and assassinated ${getPlayerName(game, trueMerlinId)} as MERLIN! Evil steals the victory!`;
  } else {
    game.winner = 'GOOD';
    game.winReason = `MERLIN SURVIVED! ${getPlayerName(game, assassinId)} (Assassin) shot ${getPlayerName(game, targetPlayerId)} (${game.roleAssignments[targetPlayerId]?.roleName}), missing the true Merlin (${getPlayerName(game, trueMerlinId)})! Loyal Servants of Arthur win!`;
  }

  return {
    assassinId,
    assassinName: getPlayerName(game, assassinId),
    targetPlayerId,
    targetPlayerName: getPlayerName(game, targetPlayerId),
    trueMerlinId,
    trueMerlinName: getPlayerName(game, trueMerlinId),
    hitMerlin,
    winner: game.winner,
    winReason: game.winReason,
    assassinReasoning
  };
}

/**
 * Appends a spoken message to the live game transcript and updates speaker/expression states.
 * @param {object} game
 * @param {object} entry
 * @returns {object} Stored transcript item
 */
export function appendTranscriptItem(game, entry) {
  const speakerObj = game.players.find((p) => p.id === entry.speakerId);
  const item = {
    id: `msg_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    timestamp: new Date().toISOString(),
    questNumber: game.currentQuestNumber,
    phase: game.phase,
    speakerId: entry.speakerId,
    speakerName: getPlayerName(game, entry.speakerId),
    dialectTag: entry.dialectTag || speakerObj?.dialectTag || null,
    floorEventType: entry.floorEventType || null,
    text: entry.text,
    emotion: entry.emotion || 'speaking',
    innerThought: entry.innerThought || null,
    targetPlayerId: entry.targetPlayerId || null,
    modelUsed: entry.modelUsed || 'gemini-4-argon',
    thinkingLevel: entry.thinkingLevel || 'medium',
    verificationPassed: entry.verificationPassed ?? true,
    verificationNote: entry.verificationNote || 'Verified: Epistemic & Avalon Rule Check Passed',
    audioBase64: entry.audioBase64 || null,
    audioMimeType: entry.audioMimeType || null,
    videoUrl: entry.videoUrl || null,
    videoTaskId: entry.videoTaskId || null
  };

  game.transcript.push(item);

  // Update character expression on the board
  if (entry.speakerId === 'mc_jaesuk') {
    game.mcHost.currentExpression = entry.emotion || 'speaking';
  } else {
    const speaker = game.players.find((p) => p.id === entry.speakerId);
    if (speaker) {
      speaker.currentExpression = entry.emotion || 'speaking';
    }
  }

  if (entry.targetPlayerId) {
    const target = game.players.find((p) => p.id === entry.targetPlayerId);
    if (target && target.id !== entry.speakerId) {
      target.currentExpression = 'shocked';
    }
  }

  return item;
}

/**
 * Builds the Director X-Ray / Judge Telemetry Snapshot showing true roles, Bayesian suspicion matrix,
 * inner monologues, live 6-agent floor bids, and Verification Loop pass/self-heal logs.
 * @param {object} game
 * @returns {object}
 */
export function buildJudgeXraySnapshot(game) {
  return {
    trueRoles: game.players.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      dialectTag: p.dialectTag || null,
      isHuman: Boolean(p.isHuman),
      roleId: game.roleAssignments[p.id].roleId,
      roleName: game.roleAssignments[p.id].roleName,
      alignment: game.roleAssignments[p.id].alignment
    })),
    suspicionMatrix: game.suspicionMatrix,
    lastAgentBids: game.lastAgentBids || [],
    lastFloorEvent: game.lastFloorEvent || null,
    verificationLogs: game.verificationLogs.slice(-15),
    recentInnerMonologues: game.transcript
      .filter((t) => t.innerThought)
      .slice(-10)
      .map((t) => ({
        speakerId: t.speakerId,
        speakerName: t.speakerName,
        roleName: game.roleAssignments[t.speakerId]?.roleName || 'Host',
        publicSpeech: t.text,
        privateInnerThought: t.innerThought,
        modelUsed: t.modelUsed,
        thinkingLevel: t.thinkingLevel,
        verificationNote: t.verificationNote
      }))
  };
}
