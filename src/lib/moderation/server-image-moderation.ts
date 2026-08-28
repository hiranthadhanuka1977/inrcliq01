import { evaluatePredictions } from "@/lib/moderation/evaluate-predictions";
import type { ImageModerationPrediction, ImageModerationResult } from "@/lib/moderation/image-moderation-types";

type NsfwModel = {
  classify: (img: import("@tensorflow/tfjs").Tensor3D, topK?: number) => Promise<ImageModerationPrediction[]>;
};

let modelPromise: Promise<NsfwModel> | null = null;

async function loadServerModel(): Promise<NsfwModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-cpu");
        await tf.setBackend("cpu");
        await tf.ready();
        const nsfwjs = await import("nsfwjs");
        return (await nsfwjs.load()) as NsfwModel;
      } catch (error) {
        modelPromise = null;
        throw error;
      }
    })();
  }

  return modelPromise;
}

let tfReadyPromise: Promise<void> | null = null;

async function ensureTensorFlowReady(): Promise<typeof import("@tensorflow/tfjs")> {
  if (!tfReadyPromise) {
    tfReadyPromise = (async () => {
      const tf = await import("@tensorflow/tfjs");
      await import("@tensorflow/tfjs-backend-cpu");
      await tf.setBackend("cpu");
      await tf.ready();
    })();
  }
  await tfReadyPromise;
  return import("@tensorflow/tfjs");
}

export async function moderateImageBytes(bytes: Buffer): Promise<ImageModerationResult> {
  try {
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(bytes, { animated: false, failOn: "none" })
      .rotate()
      .resize(299, 299, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const tf = await ensureTensorFlowReady();
    const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, info.channels]);
    try {
      const model = await loadServerModel();
      const predictions = await model.classify(tensor, 5);
      return evaluatePredictions(predictions);
    } finally {
      tensor.dispose();
    }
  } catch (error) {
    console.error("Server image moderation failed", error);
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
}
