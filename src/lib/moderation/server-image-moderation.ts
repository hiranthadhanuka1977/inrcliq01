import fs from "node:fs";
import path from "node:path";
import { evaluatePredictions } from "@/lib/moderation/evaluate-predictions";
import type { ImageModerationPrediction, ImageModerationResult } from "@/lib/moderation/image-moderation-types";

type NsfwModel = {
  classify: (img: import("@tensorflow/tfjs").Tensor3D, topK?: number) => Promise<ImageModerationPrediction[]>;
};

type NsfwJsModule = typeof import("nsfwjs");

const REMOTE_MODEL_URL =
  "https://raw.githubusercontent.com/infinitered/nsfwjs/master/models/mobilenet_v2/";

let modelPromise: Promise<NsfwModel> | null = null;
let moderationQueue: Promise<void> = Promise.resolve();

function resetModerationModel(): void {
  modelPromise = null;
}

function getLocalModelDir(): string {
  return path.join(process.cwd(), "public", "models", "mobilenet_v2");
}

function localModelFilesExist(): boolean {
  const modelDir = getLocalModelDir();
  return (
    fs.existsSync(path.join(modelDir, "model.json")) &&
    fs.existsSync(path.join(modelDir, "group1-shard1of1"))
  );
}

async function ensureTensorFlowReady(): Promise<typeof import("@tensorflow/tfjs")> {
  const tf = await import("@tensorflow/tfjs");
  await import("@tensorflow/tfjs-backend-cpu");
  await tf.setBackend("cpu");
  await tf.ready();
  return tf;
}

async function loadModelFromDisk(tf: Awaited<ReturnType<typeof ensureTensorFlowReady>>, nsfwjs: NsfwJsModule) {
  const modelDir = getLocalModelDir();
  const modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, "model.json"), "utf8")) as {
    modelTopology: object;
    weightsManifest: Array<{ weights: import("@tensorflow/tfjs").io.WeightsManifestEntry[] }>;
  };
  const weightData = new Uint8Array(fs.readFileSync(path.join(modelDir, "group1-shard1of1")));
  const weightSpecs = modelJson.weightsManifest.flatMap((manifest) => manifest.weights);
  const handler = tf.io.fromMemory({
    modelTopology: modelJson.modelTopology,
    weightSpecs,
    weightData,
  });
  const model = new nsfwjs.NSFWJS(handler, { size: 224 });
  await model.load();
  return model as NsfwModel;
}

async function loadModelFromRemote(nsfwjs: NsfwJsModule) {
  console.info(`Loading NSFW moderation model from ${REMOTE_MODEL_URL}`);
  return (await nsfwjs.load(REMOTE_MODEL_URL)) as NsfwModel;
}

async function loadServerModel(): Promise<NsfwModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await ensureTensorFlowReady();
      const nsfwjs = await import("nsfwjs");
      if (localModelFilesExist()) {
        const tf = await ensureTensorFlowReady();
        console.info("Loading NSFW moderation model from local public/models files");
        return loadModelFromDisk(tf, nsfwjs);
      }
      return loadModelFromRemote(nsfwjs);
    })().catch((error) => {
      modelPromise = null;
      throw error;
    });
  }

  return modelPromise;
}

async function withModerationLock<T>(work: () => Promise<T>): Promise<T> {
  const run = moderationQueue.then(work, work);
  moderationQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function classifyBytes(bytes: Buffer): Promise<ImageModerationResult> {
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(bytes, { animated: false, failOn: "none" })
    .rotate()
    .resize(299, 299, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tf = await ensureTensorFlowReady();
  const channels = info.channels;
  if (channels !== 3) {
    throw new Error(`Unexpected image channel count: ${channels}`);
  }

  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, channels]);
  try {
    const model = await loadServerModel();
    const predictions = await model.classify(tensor, 5);
    return evaluatePredictions(predictions);
  } finally {
    tensor.dispose();
  }
}

function verificationFailedResult(): ImageModerationResult {
  return {
    allowed: false,
    title: "Unable to verify image",
    message:
      "We could not run the safety check on this photo. Please try again or choose a different image.",
    category: "Neutral",
    confidence: 0,
    predictions: [],
    verificationFailed: true,
  };
}

export async function moderateImageBytes(bytes: Buffer): Promise<ImageModerationResult> {
  return withModerationLock(async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await classifyBytes(bytes);
      } catch (error) {
        console.error(`Server image moderation attempt ${attempt + 1} failed`, error);
        resetModerationModel();
        if (attempt === 1) break;
      }
    }

    return verificationFailedResult();
  });
}
