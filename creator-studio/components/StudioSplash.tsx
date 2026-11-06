"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { clearStudioSplashCookie } from "../lib/splash";

const VISIBLE_MS = 2400;
const FADE_MS = 480;

export default function StudioSplash() {
  const [phase, setPhase] = useState<"show" | "leave" | "gone">("show");

  useLayoutEffect(() => {
    clearStudioSplashCookie();
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const visible = reduce ? 700 : VISIBLE_MS;
    const fade = reduce ? 0 : FADE_MS;
    const leaveTimer = window.setTimeout(() => setPhase(fade ? "leave" : "gone"), visible);
    const goneTimer = window.setTimeout(() => setPhase("gone"), visible + fade);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(goneTimer);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      className={`studio-splash${phase === "leave" ? " is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Opening InrCliq Creator Studio"
    >
      <div className="studio-splash__card">
        <div className="studio-splash__brand">
          <div className="studio-splash__identity">
            <span className="studio-splash__mark" aria-hidden="true">
              Iq
            </span>
            <h1>InrCliq Creator Studio</h1>
          </div>
          <div className="studio-splash__foot">
            <p>InrCliq</p>
            <p className="studio-splash__status">Opening studio…</p>
          </div>
          <span className="studio-splash__progress" aria-hidden="true">
            <span />
          </span>
        </div>
        <div
          className="studio-splash__art"
          role="img"
          aria-label="A filmmaker in profile, with a camera, mixing desk, film, and sound woven through the portrait"
        />
      </div>
    </div>
  );
}
