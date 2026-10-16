/**
 * @fileoverview Pre-warms real 16:9 `.mp4` webcam videos via `gemini-omni-1.1-flash` (`background: true`)
 * and 4K studio webcam poster frames via `gemini-nano-banana-2.1` for MC Jae-suk and all 6 Idols.
 */

import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { MC_HOST_PROFILE, IDOL_CAST_PROFILES } from '../src/avalonEngine.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const outDir = path.resolve(process.cwd(), 'public', 'generated');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const WEBCAM_VIDEO_PROMPTS = {
  mc_jaesuk:
    'Cinematic 16:9 live webcam broadcast shot of a friendly 45-year-old Korean male variety show host in a navy blazer and glasses sitting at a podcast studio desk with a broadcast condenser microphone, nodding, smiling warmly, and speaking naturally to the camera, warm studio lighting.',
  idol_wonyoung:
    'Cinematic 16:9 live webcam broadcast shot of an elegant 25-year-old Korean female variety show panelist with long wavy dark brown hair wearing a pastel pink tweed jacket in a luxury recording studio with a condenser microphone and bookshelf behind her, looking directly into the webcam, nodding, blinking naturally, and smiling gently.',
  idol_karina:
    'Cinematic 16:9 live webcam broadcast shot of a poised 25-year-old Korean female talk show panelist with sleek straight black hair wearing a tailored charcoal blazer in a modern neon-accented podcast studio with a broadcast microphone, looking directly into the webcam, nodding thoughtfully, blinking naturally, and speaking calmly.',
  idol_sullyoon:
    'Cinematic 16:9 live webcam broadcast shot of a graceful 25-year-old Korean female radio studio guest with chestnut wavy hair wearing a cream knit cardigan in a warm acoustic wooden studio with a condenser microphone and indoor plants, looking into the webcam, nodding softly, blinking naturally, and smiling.',
  idol_yuna:
    'Cinematic 16:9 live webcam broadcast shot of an energetic 25-year-old Korean female podcast host with honey-brown hair wearing a stylish varsity jacket in a bright modern streaming studio with LED lights and a studio microphone, looking directly at the webcam, smiling brightly, nodding, and gesturing animatedly.',
  idol_chaewon:
    'Cinematic 16:9 live webcam broadcast shot of a sharp 25-year-old Korean female broadcast panelist with a chic dark bob haircut wearing a black leather jacket in a sleek monochrome studio with a studio condenser microphone, looking into the webcam, nodding analytically, blinking naturally, and smiling subtly.',
  idol_hanni:
    'Cinematic 16:9 live webcam broadcast shot of a cheerful 25-year-old Korean female podcast guest with dark hair wearing a cozy pastel blue oversized sweater in a retro vinyl music studio with a broadcast microphone, looking into the webcam, nodding warmly, blinking naturally, and smiling.'
};

async function generatePortrait(profile) {
  const filePath = path.join(outDir, `portrait_${profile.id}.png`);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 10000) {
    console.log(`[Portrait] Cached: portrait_${profile.id}.png`);
    return;
  }
  try {
    console.log(`[Portrait] Generating portrait_${profile.id}.png via gemini-nano-banana-2.1...`);
    const res = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: profile.visualPrompt,
      config: { responseModalities: ['IMAGE'] }
    });
    const part = res?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (part?.inlineData?.data) {
      const buf = Buffer.from(part.inlineData.data, 'base64');
      fs.writeFileSync(filePath, buf);
      console.log(`[Portrait] Saved portrait_${profile.id}.png (${buf.length} bytes)`);
    }
  } catch (err) {
    console.error(`[Portrait] Error for ${profile.id}:`, err.message);
  }
}

async function generateWebcamVideo(characterId, promptText) {
  const filePath = path.join(outDir, `webcam_${characterId}.mp4`);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100000) {
    console.log(`[Video] Cached: webcam_${characterId}.mp4 (${fs.statSync(filePath).size} bytes)`);
    return;
  }

  const fallbackPrompt =
    'Cinematic 16:9 live webcam broadcast shot of a friendly Korean broadcast panelist sitting at a modern podcast studio desk with a studio condenser microphone, looking into the camera, nodding and smiling naturally, warm studio lighting.';

  for (const attemptPrompt of [promptText, fallbackPrompt]) {
    try {
      console.log(`[Video] Launching gemini-omni-1.1-flash background video for ${characterId}...`);
      const created = await ai.interactions.create({
        model: 'gemini-omni-1.1-flash',
        input: attemptPrompt,
        background: true
      });

      for (let poll = 0; poll < 25; poll++) {
        await new Promise((r) => setTimeout(r, 4000));
        const state = await ai.interactions.get(created.id);
        if (state.status === 'completed' && state.output_video?.data) {
          const buf = Buffer.from(state.output_video.data, 'base64');
          fs.writeFileSync(filePath, buf);
          console.log(`[Video] Saved webcam_${characterId}.mp4 (${buf.length} bytes)`);
          return;
        }
        if (state.status === 'failed' || state.status === 'cancelled') {
          break;
        }
      }
    } catch (err) {
      console.warn(`[Video] Attempt for ${characterId} hit error/filter (${err.message}), retrying fallback...`);
    }
  }
}

async function main() {
  const allProfiles = [MC_HOST_PROFILE, ...IDOL_CAST_PROFILES];

  // 1. Generate all missing portraits in parallel batches of 3
  for (let i = 0; i < allProfiles.length; i += 3) {
    await Promise.all(allProfiles.slice(i, i + 3).map((p) => generatePortrait(p)));
  }

  // 2. Generate all missing webcam MP4 videos in parallel batches of 2
  const entries = Object.entries(WEBCAM_VIDEO_PROMPTS);
  for (let i = 0; i < entries.length; i += 2) {
    await Promise.all(
      entries.slice(i, i + 2).map(([id, prompt]) => generateWebcamVideo(id, prompt))
    );
  }

  console.log('All webcam videos and portraits finished!');
}

main();
