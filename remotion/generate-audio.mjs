/**
 * Generate narration audio files using WaveSpeed AI TTS API.
 * Run: node remotion/generate-audio.mjs
 * 
 * Requires WAVESPEED_API_KEY environment variable or uses the hardcoded key.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.WAVESPEED_API_KEY || "74986f903430f8dd33e3f6ee47cbb3bdfae2db7f70d454057396992927f34a25";
const API_URL = "https://api.wavespeed.ai/api/v3/elevenlabs/multilingual-v2";

const scripts = JSON.parse(fs.readFileSync(path.join(__dirname, "src/data/narrativeScripts.json"), "utf8"));

const audioDir = path.join(__dirname, "public", "audio");
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

async function generateNarration(sectionId, text) {
  console.log(`🎙️  Generating: ${sectionId} (${text.length} chars)...`);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      text,
      voice_id: "Laura",
      similarity: 1,
      stability: 0.5,
      use_speaker_boost: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Error for ${sectionId}: ${response.status} ${errorText}`);
    return false;
  }

  const result = await response.json();
  const prediction = result.data;

  if (!prediction || !prediction.id) {
    console.error(`❌ No prediction ID for ${sectionId}:`, JSON.stringify(result).substring(0, 300));
    return false;
  }

  // If already completed (unlikely but possible)
  if (prediction.status === "completed" && prediction.outputs?.length > 0) {
    return await downloadAudio(prediction.outputs[0], sectionId);
  }

  // Async job — poll for completion
  const pollUrl = prediction.urls?.get || `https://api.wavespeed.ai/api/v3/predictions/${prediction.id}`;
  console.log(`⏳ Job queued: ${prediction.id}, polling...`);
  return await pollJob(pollUrl, sectionId);
}

async function downloadAudio(url, sectionId) {
  const audioResponse = await fetch(url);
  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
  fs.writeFileSync(path.join(audioDir, `${sectionId}.mp3`), audioBuffer);
  console.log(`✅ Saved: ${sectionId}.mp3`);
  return true;
}

async function pollJob(pollUrl, sectionId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));

    const res = await fetch(pollUrl, {
      headers: { "Authorization": `Bearer ${API_KEY}` },
    });

    if (!res.ok) continue;
    const result = await res.json();
    const prediction = result.data;

    if (prediction?.status === "completed" && prediction.outputs?.length > 0) {
      return await downloadAudio(prediction.outputs[0], sectionId);
    } else if (prediction?.status === "failed") {
      console.error(`❌ Job failed for ${sectionId}: ${prediction.error || "unknown error"}`);
      return false;
    }
    // status is "created" or "processing" — keep polling
  }
  console.error(`❌ Timeout polling for ${sectionId}`);
  return false;
}

async function main() {
  console.log("🎬 Generating narration audio for Areté Sales OS promo video\n");

  let success = 0;
  let failed = 0;

  const entries = Object.entries(scripts);
  for (let i = 0; i < entries.length; i++) {
    const [sectionId, text] = entries[i];
    const outputPath = path.join(audioDir, `${sectionId}.mp3`);

    // Skip already generated files
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      console.log(`⏭️  Skipping ${sectionId} (already exists)`);
      success++;
      continue;
    }

    let ok = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        ok = await generateNarration(sectionId, text);
        if (ok) break;
      } catch (err) {
        console.error(`❌ Exception for ${sectionId} (attempt ${attempt + 1}):`, err.message);
      }
      // Exponential backoff on failure: 10s, 20s, 40s
      const wait = 10000 * Math.pow(2, attempt);
      console.log(`⏳ Waiting ${wait / 1000}s before retry...`);
      await new Promise(r => setTimeout(r, wait));
    }

    if (ok) success++;
    else failed++;

    // Rate limit: wait 8s between requests
    if (i < entries.length - 1) {
      await new Promise(r => setTimeout(r, 8000));
    }
  }

  console.log(`\n🏁 Done! ${success} generated, ${failed} failed.`);
  console.log(`📁 Audio files in: ${audioDir}`);
}

main();
