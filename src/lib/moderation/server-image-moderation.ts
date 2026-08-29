import fs from "node:fs";
import path from "node:path";
import { evaluatePredictions } from "@/lib/moderation/evaluate-predictions";
import type { ImageModerationPrediction, ImageModerationResult } from "@/lib/moderation/image-moderation-types";

type NsfwModel = {
  classify: (img: import("@tensorflow/tfjs").Tensor3D, topK?: number) => Promise<ImageModerationPrediction[]>;
};

type NsfwJsModule = typeof import("nsfwjs");

type ModelArtifacts = {
  modelTopology: object;
  weightSpecs: import("@tensorflow/tfjs").io.WeightsManifestEntry[];
  weightData: Uint8Array;
};

const MODEL_SIZE = 224;
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

function readLocalModelArtifacts(): ModelArtifacts | null {
  const modelDir = getLocalModelDir();
  const modelJsonPath = path.join(modelDir, "model.json");
  const weightsPath = path.join(modelDir, "group1-shard1of1");
  if (!fs.existsSync(modelJsonPath) || !fs.existsSync(weightsPath)) {
    return null;
  }

  const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, "utf8")) as {
    modelTopology: object;
    weightsManifest: Array<{ weights: import("@tensorflow/tfjs").io.WeightsManifestEntry[] }>;
  };

  return {
    modelTopology: modelJson.modelTopology,
    weightSpecs: modelJson.weightsManifest.flatMap((manifest) => manifest.weights),
    weightData: new Uint8Array(fs.readFileSync(weightsPath)),
  };
}

function deploymentModelBaseUrls(): string[] {
  const urls = new Set<string>();

  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.replace(/^https?:\/\//, "");
    urls.add(`https://${host}/models/mobilenet_v2`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (appUrl && !appUrl.includes("localhost")) {
    urls.add(`${appUrl}/models/mobilenet_v2`);
  }

  return [...urls];
}

async function fetchModelArtifacts(baseUrl: string): Promise<ModelArtifacts> {
  const base = baseUrl.replace(/\/$/, "");
  const [jsonRes, weightRes] = await Promise.all([
    fetch(`${base}/model.json`, { cache: "force-cache" }),
    fetch(`${base}/group1-shard1of1`, { cache: "force-cache" }),
  ]);

  if (!jsonRes.ok) {
    throw new Error(`Failed to fetch model.json from ${base} (${jsonRes.status})`);
  }
  if (!weightRes.ok) {
    throw new Error(`Failed to fetch model weights from ${base} (${weightRes.status})`);
  }

  const modelJson = (await jsonRes.json()) as {
    modelTopology: object;
    weightsManifest: Array<{ weights: import("@tensorflow/tfjs").io.WeightsManifestEntry[] }>;
  };

  return {
    modelTopology: modelJson.modelTopology,
    weightSpecs: modelJson.weightsManifest.flatMap((manifest) => manifest.weights),
    weightData: new Uint8Array(await weightRes.arrayBuffer()),
  };
}

async function ensureTensorFlowReady(): Promise<typeof import("@tensorflow/tfjs")> {
  const tf = await import("@tensorflow/tfjs");
  await import("@tensorflow/tfjs-backend-cpu");
  await tf.setBackend("cpu");
  await tf.ready();
  return tf;
}

async function buildModelFromArtifacts(
  tf: Awaited<ReturnType<typeof ensureTensorFlowReady>>,
  nsfwjs: NsfwJsModule,
  artifacts: ModelArtifacts,
): Promise<NsfwModel> {
  const handler = tf.io.fromMemory({
    modelTopology: artifacts.modelTopology,
    weightSpecs: artifacts.weightSpecs,
    weightData: artifacts.weightData,
  });
  const model = new nsfwjs.NSFWJS(handler, { size: MODEL_SIZE });
  await model.load();
  return model as NsfwModel;
}

async function loadServerModel(): Promise<NsfwModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await ensureTensorFlowReady();
      const nsfwjs = await import("nsfwjs");
      const errors: string[] = [];

      const localArtifacts = readLocalModelArtifacts();
      if (localArtifacts) {
        try {
          console.info("[moderation] Loading NSFW model from local files");
          return await buildModelFromArtifacts(tf, nsfwjs, localArtifacts);
        } catch (error) {
          errors.push(`local files: ${formatError(error)}`);
        }
      }

      for (const baseUrl of deploymentModelBaseUrls()) {
        try {
          console.info(`[moderation] Loading NSFW model from ${baseUrl}`);
          const artifacts = await fetchModelArtifacts(baseUrl);
          return await buildModelFromArtifacts(tf, nsfwjs, artifacts);
        } catch (error) {
          errors.push(`${baseUrl}: ${formatError(error)}`);
        }
      }

      try {
        console.info(`[moderation] Loading NSFW model from ${REMOTE_MODEL_URL}`);
        return (await nsfwjs.load(REMOTE_MODEL_URL)) as NsfwModel;
      } catch (error) {
        errors.push(`github: ${formatError(error)}`);
        console.error("[moderation] All model load strategies failed:", errors.join(" | "));
        throw error;
      }
    })().catch((error) => {
      modelPromise = null;
      throw error;
    });
  }

  return modelPromise;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function decodeToRgbTensor(bytes: Buffer, tf: Awaited<ReturnType<typeof ensureTensorFlowReady>>) {
  const { Jimp } = await import("jimp");
  const image = await Jimp.read(bytes);
  image.cover({ w: MODEL_SIZE, h: MODEL_SIZE });

  const { width, height, data } = image.bitmap;
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0, offset = 0; i < data.length; i += 4, offset += 3) {
    rgb[offset] = data[i];
    rgb[offset + 1] = data[i + 1];
    rgb[offset + 2] = data[i + 2];
  }

  return tf.tensor3d(rgb, [height, width, 3]);
}

async function classifyBytes(bytes: Buffer): Promise<ImageModerationResult> {
  const tf = await ensureTensorFlowReady();
  const tensor = await decodeToRgbTensor(bytes, tf);
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
        console.error(`[moderation] attempt ${attempt + 1} failed`, error);
        resetModerationModel();
        if (attempt === 1) break;
      }
    }

    return verificationFailedResult();
  });
}

async function withModerationLock<T>(work: () => Promise<T>): Promise<T> {
  const run = moderationQueue.then(work, work);
  moderationQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
