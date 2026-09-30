import Link from "next/link";
import type { ReactNode } from "react";
import { GuideCodeBlock } from "@/components/settings/GuideCodeBlock";
import { FEED_CATEGORIES } from "@/lib/feed/feed";
import {
  PARTNER_BACKDATE_LIMIT_DAYS,
  PARTNER_MAX_BODY_BYTES,
  PARTNER_MAX_IMAGES,
  PARTNER_MAX_TAGS,
  PARTNER_TEXT_MAX_LENGTH,
} from "@/lib/partner-api/input";
import { PARTNER_POSTS_PER_MINUTE } from "@/lib/partner-api/posts";

const SECTIONS = [
  { id: "overview", title: "Overview" },
  { id: "setup", title: "Getting set up" },
  { id: "auth", title: "Authentication" },
  { id: "endpoints", title: "Endpoints" },
  { id: "create", title: "Publish a post" },
  { id: "fields", title: "Request fields" },
  { id: "media", title: "Media" },
  { id: "retries", title: "Retries and duplicates" },
  { id: "read-delete", title: "Read and delete posts" },
  { id: "creators", title: "List your creators" },
  { id: "errors", title: "Errors" },
  { id: "limits", title: "Limits and content rules" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const title = SECTIONS.find((section) => section.id === id)?.title;
  return (
    <section id={id} className="settings-guide__section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="settings-guide__h2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="settings-table-wrap settings-guide__table">
      <table className="settings-table">
        <thead>
          <tr>
            {head.map((cell) => (
              <th key={cell}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PartnerApiGuide({ appUrl }: { appUrl: string }) {
  const baseUrl = `${appUrl}/api/v1/partner`;

  const exampleBody = {
    externalId: "acme-2026-09-30-001",
    creator: { handle: "@wildlifelens" },
    category: "animals",
    text: "A leopard resting at dawn in Yala. #Wildlife #SriLanka",
    postedAt: "2026-09-30T06:15:00+05:30",
    media: {
      images: [{ url: "https://cdn.acme.example/leopard.jpg", alt: "Leopard resting on a tree branch" }],
    },
    location: { label: "Yala National Park, Sri Lanka", lat: 6.3725, lng: 81.5185 },
  };

  const examplePost = {
    id: "c3f9a1b2c4d5e6f708192a3b",
    externalId: exampleBody.externalId,
    status: "published",
    creator: { handle: "@wildlifelens", slug: "wildlifelens" },
    category: "animals",
    text: exampleBody.text,
    tags: ["#Wildlife", "#SriLanka"],
    membersOnly: false,
    postedAt: "2026-09-30T00:45:00.000Z",
    createdAt: "2026-09-30T00:46:12.345Z",
    media: { type: "image", images: exampleBody.media.images },
    location: exampleBody.location,
    feeling: null,
    profileUrl: `${appUrl}/feed/profile/wildlifelens`,
  };

  const curlCreate = [
    `curl -X POST ${baseUrl}/feed/posts \\`,
    `  -H "Authorization: Bearer $INRCLIQ_API_KEY" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d @post.json`,
  ].join("\n");

  const fetchCreate = [
    `const response = await fetch("${baseUrl}/feed/posts", {`,
    `  method: "POST",`,
    `  headers: {`,
    `    Authorization: \`Bearer \${process.env.INRCLIQ_API_KEY}\`,`,
    `    "Content-Type": "application/json",`,
    `  },`,
    `  body: JSON.stringify(post),`,
    `});`,
    ``,
    `const result = await response.json();`,
    `if (!response.ok) {`,
    `  // result.error.code tells you what went wrong; quote result.requestId to support`,
    `  throw new Error(\`\${result.error.code}: \${result.error.message}\`);`,
    `}`,
    `console.log("Published", result.id, result.profileUrl);`,
  ].join("\n");

  return (
    <div className="settings-panel settings-guide">
      <p className="settings-back">
        <Link href="/settings/partners">← Back to Partners</Link>
      </p>
      <div className="settings-panel__head">
        <h1 className="settings-panel__title">Partner API integration guide</h1>
        <p className="settings-panel__subtitle">
          How an external partner publishes posts to the InrCliq feed. This page is only visible to admins, so send
          the partner a copy (for example, print it to PDF) together with their API key.
        </p>
      </div>

      <nav className="settings-guide__toc" aria-label="On this page">
        <p className="settings-guide__toc-title">On this page</p>
        <ol>
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="overview">
        <p>
          The Partner API lets an approved external party, such as a media company or agency, publish posts to the
          InrCliq feed on behalf of creators it manages. It is a JSON over HTTPS API.
        </p>
        <ul className="settings-guide__list">
          <li>
            <strong>Posts go live straight away.</strong> There is no review queue: every accepted post appears in the feed and on
            the creator&apos;s profile, with the status <code>published</code>.
          </li>
          <li>
            <strong>Everyone can see partner posts, including the Kids zone.</strong> Only send content that is
            suitable for all ages.
          </li>
          <li>
            <strong>Media is linked, not copied.</strong> Images, video and audio are shown from the https URLs you
            send, so they must stay online and publicly reachable.
          </li>
          <li>
            <strong>A partner can only post as its linked creators.</strong> InrCliq links creators to your partner
            account; posting as anyone else is rejected.
          </li>
        </ul>
        <p>
          Base URL: <code>{baseUrl}</code>
        </p>
      </Section>

      <Section id="setup">
        <ol className="settings-guide__list">
          <li>
            An InrCliq admin adds the partner in Settings &gt; Partners. This creates the partner&apos;s first API key,
            which is shown once.
          </li>
          <li>
            The admin links the creators the partner may post as, by handle (for example <code>@wildlifelens</code>).
          </li>
          <li>
            The admin sends the key to the partner over a secure channel. The partner stores it as a secret on their
            server, for example in an <code>INRCLIQ_API_KEY</code> environment variable.
          </li>
          <li>
            The partner calls <code>GET /creators</code> to check the key works and to see which handles they can use.
          </li>
        </ol>
      </Section>

      <Section id="auth">
        <p>
          Send the API key as a Bearer token in the <code>Authorization</code> header of every request. Keys start
          with <code>ink_live_</code>.
        </p>
        <GuideCodeBlock label="Header" code="Authorization: Bearer ink_live_your_key_here" />
        <ul className="settings-guide__list">
          <li>Only call the API from your server. Never put the key in a browser, mobile app or public repository.</li>
          <li>
            A missing, wrong or revoked key gets <code>401 unauthorized</code>. Revoking a key in Settings &gt;
            Partners takes effect immediately.
          </li>
          <li>
            To rotate a key, ask for a new one, switch your server to it, then ask for the old one to be revoked. A
            partner can have several active keys at once.
          </li>
        </ul>
      </Section>

      <Section id="endpoints">
        <Table
          head={["Method", "Path", "What it does"]}
          rows={[
            [<code key="m">POST</code>, <code key="p">/feed/posts</code>, "Publish a post"],
            [<code key="m">GET</code>, <code key="p">/feed/posts/{"{id}"}</code>, "Read a post you published"],
            [<code key="m">DELETE</code>, <code key="p">/feed/posts/{"{id}"}</code>, "Remove a post you published"],
            [<code key="m">GET</code>, <code key="p">/creators</code>, "List the creators you can post as"],
          ]}
        />
        <p>
          Paths are relative to the base URL. Every response carries an <code>X-Request-Id</code> header; quote it if
          you contact InrCliq about a request.
        </p>
      </Section>

      <Section id="create">
        <p>
          <code>{`POST ${baseUrl}/feed/posts`}</code> with a JSON body. This example publishes a single image post:
        </p>
        <GuideCodeBlock label="post.json" code={json(exampleBody)} />
        <GuideCodeBlock label="curl" code={curlCreate} />
        <GuideCodeBlock label="Node.js (fetch)" code={fetchCreate} />
        <p>
          A new post returns <code>201 Created</code> with the published post:
        </p>
        <GuideCodeBlock label="201 Created" code={json(examplePost)} />
        <p>
          Keep the returned <code>id</code> if you may want to read or delete the post later. You can also always look
          posts up again by resending the same request (see Retries and duplicates).
        </p>
      </Section>

      <Section id="fields">
        <p>
          Unknown fields are rejected, so check spelling. A post needs text, media, or both.
        </p>
        <Table
          head={["Field", "Type", "Required", "Rules"]}
          rows={[
            [
              <code key="f">externalId</code>,
              "string",
              "Yes",
              "Your own unique ID for the post, up to 100 characters: letters, digits, '.', '_', ':' or '-'. Used to make retries safe.",
            ],
            [
              <code key="f">creator.handle</code>,
              "string",
              "Yes",
              "Handle of a creator linked to your partner account, with or without the @.",
            ],
            [
              <code key="f">category</code>,
              "string",
              "Yes",
              <>
                One of:{" "}
                {FEED_CATEGORIES.map((category, index) => (
                  <span key={category}>
                    {index ? ", " : ""}
                    <code>{category}</code>
                  </span>
                ))}
                .
              </>,
            ],
            [
              <code key="f">text</code>,
              "string",
              "If no media",
              `Up to ${PARTNER_TEXT_MAX_LENGTH} characters. Checked by the text safety filter.`,
            ],
            [
              <code key="f">tags</code>,
              "string[]",
              "No",
              `Up to ${PARTNER_MAX_TAGS} tags of 1–30 letters, digits or '_', with or without #. If you leave this out, hashtags in the text are used.`,
            ],
            [
              <code key="f">membersOnly</code>,
              "boolean",
              "No",
              "Shows the post to the creator's subscribers only. Allowed for verified creators only. Defaults to false.",
            ],
            [
              <code key="f">postedAt</code>,
              "string",
              "No",
              `ISO 8601 date-time with a time zone. Not in the future and at most ${PARTNER_BACKDATE_LIMIT_DAYS} days ago. Defaults to now.`,
            ],
            [
              <code key="f">media</code>,
              "object",
              "If no text",
              "Exactly one of images, video or audio. See Media.",
            ],
            [
              <code key="f">location</code>,
              "object",
              "No",
              <>
                <code>label</code> (up to 120 characters), plus optional <code>lat</code> and <code>lng</code>.
              </>,
            ],
            [
              <code key="f">feeling</code>,
              "object",
              "No",
              <>
                <code>kind</code> (<code>feeling</code> or <code>activity</code>), <code>emoji</code> and{" "}
                <code>label</code> (up to 60 characters).
              </>,
            ],
          ]}
        />
      </Section>

      <Section id="media">
        <p>
          All media URLs must be <code>https</code> and publicly reachable. Every image needs alt text describing it,
          for people using screen readers. Send exactly one kind of media per post.
        </p>
        <h3 className="settings-guide__h3">Images</h3>
        <p>
          1 to {PARTNER_MAX_IMAGES} images. Several images are shown as a collage.
        </p>
        <GuideCodeBlock
          label="media.images"
          code={json({
            media: {
              images: [
                { url: "https://cdn.acme.example/beach-1.jpg", alt: "Surfers at sunrise" },
                { url: "https://cdn.acme.example/beach-2.jpg", alt: "Fishing boats on the sand" },
              ],
            },
          })}
        />
        <h3 className="settings-guide__h3">Video</h3>
        <p>
          A video file URL plus a poster image shown before it plays. Use a widely supported format such as MP4
          (H.264), because the file is played as sent.
        </p>
        <GuideCodeBlock
          label="media.video"
          code={json({
            media: {
              video: {
                url: "https://cdn.acme.example/match-highlights.mp4",
                posterUrl: "https://cdn.acme.example/match-highlights.jpg",
                posterAlt: "Striker celebrating a goal",
              },
            },
          })}
        />
        <h3 className="settings-guide__h3">Audio</h3>
        <p>
          An audio file URL, a title, the length in whole seconds and a thumbnail image.
        </p>
        <GuideCodeBlock
          label="media.audio"
          code={json({
            media: {
              audio: {
                url: "https://cdn.acme.example/episode-12.mp3",
                title: "Episode 12: Night sounds of the rainforest",
                durationSeconds: 1845,
                thumbnail: { url: "https://cdn.acme.example/episode-12.jpg", alt: "Rainforest at night" },
              },
            },
          })}
        />
      </Section>

      <Section id="retries">
        <p>
          <code>externalId</code> makes publishing safe to retry. If a request times out or fails with a network error,
          send exactly the same request again:
        </p>
        <ul className="settings-guide__list">
          <li>
            If the post was already created, you get <code>200 OK</code> with the existing post instead of a
            duplicate.
          </li>
          <li>
            If you reuse an <code>externalId</code> with a different body, you get{" "}
            <code>409 duplicate_external_id</code>. Use a new <code>externalId</code> for every new post.
          </li>
          <li>
            Retry <code>429</code>, <code>503</code> and <code>500</code> responses after waiting. When a{" "}
            <code>Retry-After</code> header is present, wait at least that many seconds.
          </li>
          <li>Don&apos;t retry other 4xx errors unchanged; fix the request first.</li>
        </ul>
      </Section>

      <Section id="read-delete">
        <p>
          You can read or delete only posts published with your partner account. Removing a post also removes its
          likes, comments and other activity, and can&apos;t be undone.
        </p>
        <GuideCodeBlock
          label="Read a post"
          code={`curl ${baseUrl}/feed/posts/c3f9a1b2c4d5e6f708192a3b \\\n  -H "Authorization: Bearer $INRCLIQ_API_KEY"`}
        />
        <p>
          Returns <code>200 OK</code> with the same shape as the publish response, or <code>404 not_found</code>.
        </p>
        <GuideCodeBlock
          label="Delete a post"
          code={`curl -X DELETE ${baseUrl}/feed/posts/c3f9a1b2c4d5e6f708192a3b \\\n  -H "Authorization: Bearer $INRCLIQ_API_KEY"`}
        />
        <GuideCodeBlock label="200 OK" code={json({ id: "c3f9a1b2c4d5e6f708192a3b", deleted: true })} />
      </Section>

      <Section id="creators">
        <GuideCodeBlock
          label="List creators"
          code={`curl ${baseUrl}/creators \\\n  -H "Authorization: Bearer $INRCLIQ_API_KEY"`}
        />
        <GuideCodeBlock
          label="200 OK"
          code={json({
            partner: "Acme Media",
            creators: [
              {
                handle: "@wildlifelens",
                slug: "wildlifelens",
                name: "Wildlife Lens",
                verified: true,
                profileUrl: `${appUrl}/feed/profile/wildlifelens`,
              },
            ],
          })}
        />
        <p>
          Only <code>verified</code> creators can publish members-only posts.
        </p>
      </Section>

      <Section id="errors">
        <p>
          Errors return a JSON body with a machine-readable <code>code</code>, a message you can log, and the request
          ID. Validation errors also list every invalid field.
        </p>
        <GuideCodeBlock
          label="400 Bad Request"
          code={json({
            error: {
              code: "validation_failed",
              message: "2 fields are invalid.",
              fields: [
                { field: "category", message: `Must be one of: ${FEED_CATEGORIES.join(", ")}.` },
                { field: "media.images[0].alt", message: "Required." },
              ],
            },
            requestId: "req_8f2c1a9b3d4e",
          })}
        />
        <Table
          head={["Status", "Code", "Meaning and what to do"]}
          rows={[
            ["400", <code key="c">invalid_json</code>, "The body isn't valid JSON."],
            ["400", <code key="c">validation_failed</code>, "One or more fields are invalid. Fix the fields listed in error.fields."],
            ["401", <code key="c">unauthorized</code>, "The API key is missing, wrong or revoked."],
            ["403", <code key="c">creator_not_allowed</code>, "Your key can't post as this creator. Ask InrCliq to link them."],
            ["403", <code key="c">members_only_not_allowed</code>, "Members-only posts need a verified creator."],
            ["404", <code key="c">not_found</code>, "No post with this ID was published by your partner account."],
            ["409", <code key="c">duplicate_external_id</code>, "A different post already uses this externalId."],
            ["413", <code key="c">payload_too_large</code>, `The body is over ${formatBytes(PARTNER_MAX_BODY_BYTES)}.`],
            [
              "422",
              <code key="c">content_blocked</code>,
              <>
                The text failed the safety check. <code>error.category</code> says why. Don&apos;t retry unchanged.
              </>,
            ],
            ["429", <code key="c">rate_limited</code>, "Too many posts. Wait for Retry-After seconds, then retry."],
            ["500", <code key="c">internal_error</code>, "A problem on our side. Retry later and quote the requestId if it persists."],
            ["503", <code key="c">moderation_unavailable</code>, "The safety check is briefly unavailable. Retry the same request after Retry-After seconds."],
          ]}
        />
      </Section>

      <Section id="limits">
        <Table
          head={["Limit", "Value"]}
          rows={[
            ["Posts per partner", `${PARTNER_POSTS_PER_MINUTE} per minute`],
            ["Request body", `Up to ${formatBytes(PARTNER_MAX_BODY_BYTES)}`],
            ["Text", `${PARTNER_TEXT_MAX_LENGTH} characters`],
            ["Images per post", String(PARTNER_MAX_IMAGES)],
            ["Tags per post", String(PARTNER_MAX_TAGS)],
            ["Backdating", `Up to ${PARTNER_BACKDATE_LIMIT_DAYS} days`],
          ]}
        />
        <ul className="settings-guide__list">
          <li>Post text is checked by an automatic safety filter; blocked posts are rejected, not queued.</li>
          <li>
            Images, video and audio aren&apos;t scanned automatically. You are responsible for making sure they are
            suitable for all ages, because partner posts are visible in the Kids zone.
          </li>
          <li>
            If a media URL stops working, the post shows a broken image or player. Keep files online for as long as the
            post should stay up, or delete the post.
          </li>
          <li>InrCliq can remove posts, revoke keys or unlink creators at any time.</li>
        </ul>
      </Section>
    </div>
  );
}

function formatBytes(bytes: number) {
  return `${Math.round(bytes / 1000)} KB`;
}
