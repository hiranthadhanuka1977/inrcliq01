"use client";

import { useEffect, useState } from "react";
import { getCountdownParts } from "@/lib/feed/booking-confirmation";

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
    { label: "Days", value: parts.days },
    { label: "Hours", value: parts.hours },
    { label: "Minutes", value: parts.minutes },
  ];

  return (
    <section
      className={`booking-countdown${compact ? " booking-countdown--compact" : ""}`}
      aria-label="Delivery countdown"
    >
      <p className="booking-countdown__label">You will receive your delivery in</p>
      <div className="booking-countdown__grid">
        {units.map((unit) => (
          <div key={unit.label} className="booking-countdown__unit">
            <div className="booking-countdown__box">
              <span className="booking-countdown__value">{unit.value}</span>
            </div>
            <span className="booking-countdown__unit-label">{unit.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
