"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { clearSellerProSplashCookie } from "../lib/splash";

const VISIBLE_MS = 2400;
const FADE_MS = 480;

export default function ProSplash() {
  const [phase, setPhase] = useState<"show" | "leave" | "gone">("show");

  useLayoutEffect(() => {
    clearSellerProSplashCookie();
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
      aria-label="Opening InrCliq Seller Tools"
    >
      <div className="studio-splash__card">
        <div className="studio-splash__brand">
          <div className="studio-splash__identity">
            <span className="studio-splash__mark" aria-hidden="true">
              Iq
            </span>
            <h1>InrCliq Seller Tools</h1>
          </div>
          <div className="studio-splash__foot">
            <p>InrCliq</p>
            <p className="studio-splash__status">Opening advanced tools…</p>
          </div>
          <span className="studio-splash__progress" aria-hidden="true">
            <span />
          </span>
        </div>
        <div className="studio-splash__art" role="img" aria-label="Collection and Service requests">
          <p>Collection</p>
          <p>Service requests</p>
        </div>
      </div>
    </div>
  );
}
