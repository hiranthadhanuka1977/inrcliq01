"use client";

import { useState } from "react";

export function GuideCodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <figure className="settings-guide-code">
      <figcaption className="settings-guide-code__head">
        <span>{label}</span>
        <button type="button" className="settings-guide-code__copy" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>
      <pre className="settings-guide-code__body">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
