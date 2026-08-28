import { evaluatePredictions } from "@/lib/moderation/evaluate-predictions";
import type { ImageModerationPrediction, ImageModerationResult } from "@/lib/moderation/image-moderation-types";

type NsfwModel = {
  classify: (img: import("@tensorflow/tfjs").Tensor3D, topK?: number) => Promise<ImageModerationPrediction[]>;
};

let modelPromise: Promise<NsfwModel> | null = null;
let moderationQueue: Promise<void> = Promise.resolve();

function resetModerationModel(): void {
  modelPromise = null;
}

async function ensureTensorFlowReady(): Promise<typeof import("@tensorflow/tfjs")> {
  const tf = await import("@tensorflow/tfjs");
  await import("@tensorflow/tfjs-backend-cpu");
  await tf.setBackend("cpu");
  await tf.ready();
  return tf;
}

async function loadServerModel(): Promise<NsfwModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await ensureTensorFlowReady();
      const nsfwjs = await import("nsfwjs");
      return (await nsfwjs.load()) as NsfwModel;
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
