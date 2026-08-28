/**
 * Ensure NSFWJS MobileNetV2 weights exist in public/models for server-side loading.
 * Vercel/Next bundled API routes cannot resolve nsfwjs's bundled dynamic requires.
 */
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const MODEL_DIR = path.join(process.cwd(), "public", "models", "mobilenet_v2");
const REMOTE_BASE =
  "https://raw.githubusercontent.com/infinitered/nsfwjs/master/models/mobilenet_v2";
const FILES = ["model.json", "group1-shard1of1"];

async function fileExists(filePath) {
  try {
    const info = await stat(filePath);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url} (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  await mkdir(MODEL_DIR, { recursive: true });

  let downloaded = 0;
  for (const name of FILES) {
    const target = path.join(MODEL_DIR, name);
    if (await fileExists(target)) continue;
    const bytes = await download(`${REMOTE_BASE}/${name}`);
    await writeFile(target, bytes);
    downloaded += 1;
    console.log(`Downloaded NSFW model file: ${name}`);
  }

  if (downloaded === 0) {
    console.log("NSFW model files already present.");
  }
}

main().catch((error) => {
  console.error("setup-nsfw-model failed", error);
  process.exit(1);
});
