"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CropRect = { x: number; y: number; w: number; h: number };
type Handle = "move" | "nw" | "ne" | "sw" | "se";

const ASPECTS: { id: string; label: string; ratio: number | null }[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "original", label: "Original", ratio: -1 },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
];

function rotatedSize(width: number, height: number, rotation: number) {
  return rotation % 180 === 0 ? { w: width, h: height } : { w: height, h: width };
}

function clampCrop(rect: CropRect, ratio: number | null): CropRect {
  let { x, y, w, h } = rect;
  w = Math.max(0.12, w);
  h = Math.max(0.12, h);
  if (ratio && ratio > 0) {
    h = w / ratio;
    if (h > 1) {
      h = 1;
      w = h * ratio;
    }
    if (w > 1) {
      w = 1;
      h = w / ratio;
    }
  } else {
    w = Math.min(1, w);
    h = Math.min(1, h);
  }
  x = Math.min(Math.max(0, x), 1 - w);
  y = Math.min(Math.max(0, y), 1 - h);
  return { x, y, w, h };
}

function cropForRatio(ratio: number | null): CropRect {
  if (!ratio || ratio <= 0) return { x: 0.04, y: 0.04, w: 0.92, h: 0.92 };
  if (ratio >= 1) {
    const w = 0.92;
    const h = Math.min(0.92, w / ratio);
    return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
  }
  const h = 0.92;
  const w = Math.min(0.92, h * ratio);
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image."));
    image.src = src;
  });
}

export default function ComposerImageEditor({
  src,
  onCancel,
  onSave,
  title = "Edit photo",
  defaultAspectId = "free",
}: {
  src: string;
  onCancel: () => void;
  onSave: (file: File) => Promise<void>;
  title?: string;
  defaultAspectId?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    crop: CropRect;
  } | null>(null);

  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rotation, setRotation] = useState(0);
  const [aspectId, setAspectId] = useState(defaultAspectId);
  const [crop, setCrop] = useState<CropRect>(() => {
    const preset = ASPECTS.find((item) => item.id === defaultAspectId)?.ratio ?? null;
    return cropForRatio(preset && preset > 0 ? preset : null);
  });
  const [stage, setStage] = useState({ w: 480, h: 360 });

  const aspectRatio = (() => {
    const preset = ASPECTS.find((item) => item.id === aspectId)?.ratio ?? null;
    if (preset !== -1) return preset;
    const image = imageRef.current;
    if (!image) return null;
    const size = rotatedSize(image.naturalWidth, image.naturalHeight, rotation);
    return size.w / size.h;
  })();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const size = rotatedSize(image.naturalWidth, image.naturalHeight, rotation);
    const maxW = Math.min(560, window.innerWidth - 48);
    const maxH = Math.min(420, window.innerHeight - 220);
    const scale = Math.min(maxW / size.w, maxH / size.h);
    const w = Math.max(1, Math.round(size.w * scale));
    const h = Math.max(1, Math.round(size.h * scale));
    canvas.width = w;
    canvas.height = h;
    setStage({ w, h });
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    const drawW = rotation % 180 === 0 ? w : h;
    const drawH = rotation % 180 === 0 ? h : w;
    ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [rotation]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError("");
    loadImage(src)
      .then((image) => {
        if (cancelled) return;
        imageRef.current = image;
        setReady(true);
      })
      .catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (ready) draw();
  }, [ready, draw]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const drag = dragRef.current;
      const stageEl = stageRef.current;
      if (!drag || !stageEl) return;
      const box = stageEl.getBoundingClientRect();
      const dx = (event.clientX - drag.startX) / box.width;
      const dy = (event.clientY - drag.startY) / box.height;
      const next = { ...drag.crop };

      if (drag.handle === "move") {
        next.x = drag.crop.x + dx;
        next.y = drag.crop.y + dy;
      } else {
        const right = drag.crop.x + drag.crop.w;
        const bottom = drag.crop.y + drag.crop.h;
        if (drag.handle.includes("w")) next.x = drag.crop.x + dx;
        if (drag.handle.includes("n")) next.y = drag.crop.y + dy;
        if (drag.handle.includes("e")) next.w = drag.crop.w + dx;
        else if (drag.handle.includes("w")) next.w = right - next.x;
        if (drag.handle.includes("s")) next.h = drag.crop.h + dy;
        else if (drag.handle.includes("n")) next.h = bottom - next.y;
      }
      setCrop(clampCrop(next, aspectRatio));
    }

    function onUp() {
      dragRef.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [aspectRatio]);

  function startDrag(handle: Handle, event: React.PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      handle,
      startX: event.clientX,
      startY: event.clientY,
      crop,
    };
  }

  function applyAspect(id: string) {
    setAspectId(id);
    const preset = ASPECTS.find((item) => item.id === id)?.ratio ?? null;
    const image = imageRef.current;
    let ratio = preset;
    if (preset === -1 && image) {
      const size = rotatedSize(image.naturalWidth, image.naturalHeight, rotation);
      ratio = size.w / size.h;
    }
    setCrop(cropForRatio(ratio));
  }

  function rotate(delta: number) {
    setRotation((current) => (current + delta + 360) % 360);
    const image = imageRef.current;
    const preset = ASPECTS.find((item) => item.id === aspectId)?.ratio ?? null;
    let ratio = preset;
    if (preset === -1 && image) {
      const next = (rotation + delta + 360) % 360;
      const size = rotatedSize(image.naturalWidth, image.naturalHeight, next);
      ratio = size.w / size.h;
    }
    setCrop(cropForRatio(ratio === -1 ? null : ratio));
  }

  async function save() {
    const image = imageRef.current;
    if (!image) return;
    setSaving(true);
    setError("");
    try {
      const natural = rotatedSize(image.naturalWidth, image.naturalHeight, rotation);
      const rotated = document.createElement("canvas");
      rotated.width = natural.w;
      rotated.height = natural.h;
      const rotatedCtx = rotated.getContext("2d");
      if (!rotatedCtx) throw new Error("Could not edit this image.");
      rotatedCtx.translate(natural.w / 2, natural.h / 2);
      rotatedCtx.rotate((rotation * Math.PI) / 180);
      rotatedCtx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

      let outW = Math.round(crop.w * natural.w);
      let outH = Math.round(crop.h * natural.h);
      const longest = Math.max(outW, outH);
      if (longest > 2048) {
        const scale = 2048 / longest;
        outW = Math.max(1, Math.round(outW * scale));
        outH = Math.max(1, Math.round(outH * scale));
      }

      const output = document.createElement("canvas");
      output.width = outW;
      output.height = outH;
      const outputCtx = output.getContext("2d");
      if (!outputCtx) throw new Error("Could not edit this image.");
      outputCtx.drawImage(
        rotated,
        crop.x * natural.w,
        crop.y * natural.h,
        crop.w * natural.w,
        crop.h * natural.h,
        0,
        0,
        outW,
        outH,
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        output.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("Could not save the edited photo.");
      await onSave(new File([blob], "edited-photo.jpg", { type: "image/jpeg" }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the edited photo.");
      setSaving(false);
    }
  }

  const cropStyle = {
    left: `${crop.x * 100}%`,
    top: `${crop.y * 100}%`,
    width: `${crop.w * 100}%`,
    height: `${crop.h * 100}%`,
  };

  return createPortal(
    <div className="image-editor" role="dialog" aria-modal="true" aria-labelledby="image-editor-title">
      <div className="image-editor__bar">
        <button type="button" className="btn btn--secondary btn--sm" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <h2 id="image-editor-title">{title}</h2>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => void save()} disabled={!ready || saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="image-editor__workspace">
        {!ready && !error ? <p className="image-editor__status">Loading photo…</p> : null}
        {error ? <p className="image-editor__status image-editor__status--error">{error}</p> : null}
        <div
          ref={stageRef}
          className="image-editor__stage"
          style={{ width: stage.w, height: stage.h, visibility: ready ? "visible" : "hidden" }}
        >
          <canvas ref={canvasRef} className="image-editor__canvas" />
          <div
            className="image-editor__crop"
            style={cropStyle}
            onPointerDown={(event) => startDrag("move", event)}
          >
            <span className="image-editor__grid" aria-hidden="true" />
            {(["nw", "ne", "sw", "se"] as const).map((handle) => (
              <button
                key={handle}
                type="button"
                className={`image-editor__handle image-editor__handle--${handle}`}
                aria-label={`Resize crop ${handle}`}
                onPointerDown={(event) => startDrag(handle, event)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="image-editor__tools">
        <div className="image-editor__group" role="group" aria-label="Crop shape">
          {ASPECTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`image-editor__chip${aspectId === item.id ? " is-active" : ""}`}
              onClick={() => applyAspect(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="image-editor__group" role="group" aria-label="Rotate">
          <button type="button" className="image-editor__chip" onClick={() => rotate(-90)}>
            Rotate left
          </button>
          <button type="button" className="image-editor__chip" onClick={() => rotate(90)}>
            Rotate right
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
