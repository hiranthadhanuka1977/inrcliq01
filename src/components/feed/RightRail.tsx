"use client";

import { useState } from "react";
import FollowButton from "@/components/feed/FollowButton";

type SuggestPerson = {
  id: string;
  name: string;
  meta: string;
  initials: string;
  color: string;
  initiallyFollowing?: boolean;
};

const SUGGESTIONS: SuggestPerson[] = [
  {
    id: "jl",
    name: "Jennifer Lopez",
    meta: "48.2M followers",
    initials: "JL",
    color: "#8b5cf6",
  },
  {
    id: "ed",
    name: "Ed Sheeran",
    meta: "64.1M followers",
    initials: "ED",
    color: "#166534",
  },
  {
    id: "ag",
    name: "Ariana Grande",
    meta: "89.4M followers",
    initials: "AG",
    color: "#f97316",
    initiallyFollowing: true,
  },
];

export default function RightRail() {
  const [following, setFollowing] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SUGGESTIONS.map((person) => [person.id, Boolean(person.initiallyFollowing)])),
  );

  return (
    <aside className="right-rail">
      <section className="rail-widget">
        <div className="rail-widget__head">
          <h3>Suggested</h3>
          <a className="rail-widget__link" href="#">
            See all
          </a>
        </div>
        <ul className="suggest-list">
          {SUGGESTIONS.map((person) => (
            <li key={person.id} className="suggest-item">
              <div
                className="suggest-item__av"
                style={{ "--story-color": person.color } as React.CSSProperties}
                aria-hidden="true"
              >
                {person.initials}
              </div>
              <div className="suggest-item__body">
                <span className="suggest-item__name">{person.name}</span>
                <span className="suggest-item__meta">{person.meta}</span>
              </div>
              <FollowButton
                following={Boolean(following[person.id])}
                onFollowingChange={(next) =>
                  setFollowing((prev) => ({
                    ...prev,
                    [person.id]: next,
                  }))
                }
                className="suggest-item__btn"
                name={person.name}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="rail-widget" id="trending-topics">
        <div className="rail-widget__head">
          <h3>
            Trending <span className="suggest-sub">· hot now</span>
          </h3>
        </div>
        <ul className="trend-list">
          {[
            { rank: 1, tag: "#ErasTour", meta: "2.4M posts" },
            { rank: 2, tag: "#Snaps", meta: "1.8M posts" },
            { rank: 3, tag: "#NewMusic", meta: "982K posts" },
            { rank: 4, tag: "#INRCLIQ", meta: "3.1M posts" },
          ].map((item) => (
            <li key={item.tag} className="trend-item">
              <span className="trend-item__rank" aria-hidden="true">
                {item.rank}
              </span>
              <div className="trend-item__body">
                <span className="trend-item__tag">{item.tag}</span>
                <span className="trend-item__meta">{item.meta}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
