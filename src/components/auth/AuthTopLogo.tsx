"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const SCROLL_THRESHOLD = 12;

function readScrollTop(target: Window | HTMLElement) {
  if (target instanceof Window) {
    return target.scrollY || document.documentElement.scrollTop || 0;
  }

  return target.scrollTop;
}

export function AuthTopLogo() {
  const [hidden, setHidden] = useState(false);
  const logoRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const shell = logoRef.current?.closest(".auth-path-shell--top-logo");
    if (!shell) return;

    const scrollRoots: Array<Window | HTMLElement> = [window];
    const signupScroller = shell.querySelector<HTMLElement>(".auth-center--signup-step");
    if (signupScroller) scrollRoots.push(signupScroller);

    let frame = 0;

    function update() {
      frame = 0;
      const scrolled = scrollRoots.some((root) => readScrollTop(root) > SCROLL_THRESHOLD);
      setHidden(scrolled);
    }

    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    }

    scrollRoots.forEach((root) => {
      root.addEventListener("scroll", onScroll, { passive: true });
    });
    update();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scrollRoots.forEach((root) => {
        root.removeEventListener("scroll", onScroll);
      });
    };
  }, []);

  return (
    <Link
      ref={logoRef}
      href="/"
      className={`auth-top-logo logo logo--img${hidden ? " is-hidden" : ""}`}
      aria-label="InrCliq home"
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/logo-InrCliq.svg" alt="InrCliq" className="logo__img" width={114} height={27} />
    </Link>
  );
}
