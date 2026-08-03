"use client";

import { Fragment, useEffect, useState } from "react";
import { getCountdownParts } from "@/lib/feed/booking-confirmation";

function pad(value: number) {
  return String(Math.max(0, value)).padStart(2, "0");
}

export default function BookingDeliveryCountdown({
  deliverBy,
  compact = false,
}: {
  deliverBy: string;
  compact?: boolean;
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

  return (
    <section
      className={`booking-countdown${compact ? " booking-countdown--compact" : ""}`}
      aria-label="Delivery countdown"
    >
      <p className="booking-countdown__label">You will receive your delivery in</p>
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
