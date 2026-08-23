"use client";

import { Fragment, useEffect, useState } from "react";
import { getCountdownParts } from "@/lib/feed/booking-confirmation";

function pad(value: number) {
  return String(Math.max(0, value)).padStart(2, "0");
}

export default function BookingDeliveryCountdown({
  deliverBy,
  compact = false,
  perspective = "requester",
}: {
  deliverBy: string;
  compact?: boolean;
  /** Requester sees receive copy; provider (commitments) sees deliver copy. */
  perspective?: "requester" | "provider";
}) {
  const [parts, setParts] = useState(() => getCountdownParts(deliverBy));

  useEffect(() => {
    const tick = () => setParts(getCountdownParts(deliverBy));
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [deliverBy]);

  const units = [
    { label: "Days", value: pad(parts.days) },
    { label: "Hours", value: pad(parts.hours) },
    { label: "Minutes", value: pad(parts.minutes) },
  ];
  const label =
    perspective === "provider"
      ? "You are committed to deliver in"
      : "You will receive your delivery in";

  return (
    <section
      className={`booking-countdown${compact ? " booking-countdown--compact" : ""}`}
      aria-label={perspective === "provider" ? "Delivery commitment countdown" : "Delivery countdown"}
    >
      <p className="booking-countdown__label">{label}</p>
      <div className="booking-countdown__grid">
        {units.map((unit, index) => (
          <Fragment key={unit.label}>
            {index > 0 ? (
              <span className="booking-countdown__sep" aria-hidden="true">
                :
              </span>
            ) : null}
            <div className="booking-countdown__tile">
              <span className="booking-countdown__value">{unit.value}</span>
              <span className="booking-countdown__unit-label">{unit.label}</span>
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  );
}
