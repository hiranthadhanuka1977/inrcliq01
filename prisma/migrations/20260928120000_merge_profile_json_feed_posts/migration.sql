-- Data-only migration: make "FeedPost" the single source for profile feeds.
-- Inserts profile posts that previously existed only in data/<profile>.json and pins them
-- on their profile. Existing rows are left untouched; posts whose creator is missing are skipped.

INSERT INTO "FeedPost" (
  id, category, text, tags, "mediaJson", "audioJson",
  likes, comments, shares, following, "membersOnly",
  "postedAt", "postedAgo", "sortOrder", "creatorId", "userId", "createdAt", "updatedAt"
)
SELECT
  v.id, v.category, v.text, v.tags, v.media, v.audio,
  v.likes, v.comments, v.shares, v.following, v.members_only,
  v.posted_at, v.posted_ago,
  (SELECT COALESCE(MAX(f."sortOrder"), 0) FROM "FeedPost" f) + v.ord,
  c.id, c."userId", now(), now()
FROM (VALUES
  (1, 'bathiya-santhush', 'bns-001', 'personal', 'Soundcheck in Colombo tonight — new lights, same roar. Grateful for every voice that’s sung with us for twenty years. See you under the lights.', ARRAY['#BnS', '#Colombo', '#SriLanka', '#Live']::text[], '{"type":"image","images":[{"url":"/assets/creators/bathiya-santhush/feed.jpg","alt":"Bathiya and Santhush"}]}'::jsonb, NULL::jsonb, 18420, 1204, 890, true, false, ('2026-07-21T08:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '2h'),
  (2, 'bathiya-santhush', 'bns-002', 'personal', 'Someone played Vasanthaye at a wedding in Negombo last night and the whole room sang every word. Twenty-five years later, that still gets us. Thank you for keeping our songs alive.', ARRAY['#Vasanthaye', '#BnS', '#SriLanka']::text[], '{"type":"image","images":[{"url":"/assets/creators/bathiya-santhush/feed-wedding.jpg","alt":"Wedding celebration with guests celebrating"}]}'::jsonb, NULL::jsonb, 9620, 640, 510, true, false, ('2026-07-20T11:30:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '1d'),
  (3, 'bathiya-santhush', 'bns-003', 'personal', 'Kandy this weekend. Two mics, one stage, and a city that always sings louder than the PA. Who’s coming through?', ARRAY['#Kandy', '#Live', '#BnS', '#Tour']::text[], '{"type":"image","images":[{"url":"/assets/creators/bathiya-santhush/feed-stage.jpg","alt":"Live concert stage under bright lights"}]}'::jsonb, NULL::jsonb, 7140, 418, 276, true, false, ('2026-07-17T16:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '4d'),
  (4, 'dev-weekly', 'dw-001', 'technology', 'On-device AI is finally fast enough for real-time translation on mid-range phones. Tested Hindi ↔ Tamil on a ₹25K device — latency under 200 ms.', ARRAY['#AI', '#Mobile', '#EdgeComputing']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80&auto=format&fit=crop","alt":"Circuit board and microchip close-up"}]}'::jsonb, NULL::jsonb, 12840, 967, 1540, true, false, ('2026-07-04T18:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '14h'),
  (5, 'dev-weekly', 'dw-002', 'technology', 'Shipped our first CRDT-backed notes app. Conflict resolution feels invisible when you get the data model right from day one.', ARRAY['#LocalFirst', '#CRDT', '#WebDev']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80&auto=format&fit=crop","alt":"Developer writing code on a laptop"}]}'::jsonb, NULL::jsonb, 6420, 412, 890, true, false, ('2026-06-28T10:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '1w'),
  (6, 'dev-weekly', 'dw-003', 'technology', 'Members — drop your stack for a side project. I''ll review three architectures live this Friday and suggest where I''d cut scope.', ARRAY['#BuildInPublic', '#Architecture']::text[], NULL::jsonb, NULL::jsonb, 2180, 524, 67, true, false, ('2026-06-24T14:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '11d'),
  (7, 'dev-weekly', 'dw-004', 'technology', 'Six months of Rust in production: fewer segfaults, happier on-call, and one team still grumbling about borrow checker onboarding.', ARRAY['#Rust', '#Backend', '#Production']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&q=80&auto=format&fit=crop","alt":"Rust programming language logo on a screen"}]}'::jsonb, NULL::jsonb, 9140, 638, 1120, true, false, ('2026-06-18T08:30:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '2w'),
  (8, 'dev-weekly', 'dw-005', 'technology', 'Quick benchmark: quantised Llama 3.2 on M-series vs Snapdragon X Elite. Surprising winner for batch size 1 inference.', ARRAY['#LLM', '#Benchmarks', '#AppleSilicon']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80&auto=format&fit=crop","alt":"Earth at night from space representing global networks"}]}'::jsonb, NULL::jsonb, 11200, 891, 2100, true, false, ('2026-06-10T16:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '3w'),
  (9, 'dev-weekly', 'dw-006', 'technology', 'Security audit checklist we use before every launch: dependency scan, secrets grep, CSP review, and one afternoon of threat modelling.', ARRAY['#Security', '#DevOps']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80&auto=format&fit=crop","alt":"Cybersecurity lock icon on a digital interface"}]}'::jsonb, NULL::jsonb, 4870, 302, 640, true, false, ('2026-06-03T09:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '1mo'),
  (10, 'dev-weekly', 'dw-007', 'technology', 'TypeScript 5.8 strict mode caught three latent null bugs in our API layer. Worth the migration pain.', ARRAY['#TypeScript', '#DX']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&q=80&auto=format&fit=crop","alt":"Code on a monitor in a dark room"}]}'::jsonb, NULL::jsonb, 3560, 214, 380, true, false, ('2026-05-27T11:30:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '5w'),
  (11, 'dev-weekly', 'dw-008', 'technology', 'Hot take: most teams don''t need Kubernetes yet. A well-tuned PaaS plus good observability beats premature orchestration every time.', ARRAY['#Cloud', '#Infrastructure']::text[], NULL::jsonb, NULL::jsonb, 7890, 1240, 980, true, false, ('2026-05-20T07:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '6w'),
  (12, 'good-guy-podcast', 'ggp-001', 'discovery', 'Episode 14 is live — a long-form conversation on creativity, discipline, and building in public.', ARRAY['#Podcast', '#Audio', '#Episode14']::text[], NULL::jsonb, '{"title":"Good Guy Podcast: Episode 14 — Building in public","thumbnail":{"url":"https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&q=80&auto=format&fit=crop","alt":"Black and white portrait of two podcast hosts"},"current_time":"0:00","duration":"48:12","progress":0,"audio_url":null,"theme":{"accent_a":"120, 220, 160","accent_b":"72, 168, 118","base":["#2a4534","#223a2b","#1a2e22"],"border":"120, 200, 150"}}'::jsonb, 2840, 186, 92, true, false, ('2026-07-06T08:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '1d'),
  (13, 'good-guy-podcast', 'ggp-002', 'discovery', 'Members only — the uncut take we left on the floor. Same guest, zero edits, 40 extra minutes including the part about quitting too early.', ARRAY['#MembersOnly', '#Uncut', '#Podcast']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80&auto=format&fit=crop","alt":"Podcast microphone in a dim studio"}]}'::jsonb, '{"title":"Members: Uncut — Episode 14 floor tape","thumbnail":{"url":"https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&q=80&auto=format&fit=crop","alt":"Studio microphone close-up"},"current_time":"0:00","duration":"40:08","progress":0,"audio_url":null,"theme":{"accent_a":"210, 180, 120","accent_b":"160, 120, 70","base":["#3a3228","#2e2820","#221c16"],"border":"200, 170, 110"}}'::jsonb, 1120, 94, 41, true, true, ('2026-07-04T16:30:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '3d'),
  (14, 'good-guy-podcast', 'ggp-003', 'discovery', 'Studio notes for members: how we edit four hours into forty minutes — markers, cold opens, and the one joke we always cut.', ARRAY['#MembersOnly', '#StudioNotes', '#Editing']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80&auto=format&fit=crop","alt":"Vintage radio microphone in a recording studio"}]}'::jsonb, NULL::jsonb, 940, 71, 28, true, true, ('2026-06-30T11:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '1w'),
  (15, 'good-guy-podcast', 'ggp-004', 'discovery', 'Early drop for members — Episode 15 lands Friday for everyone. You''re getting it tonight with director commentary baked into the track markers.', ARRAY['#MembersOnly', '#EarlyAccess', '#Episode15']::text[], NULL::jsonb, '{"title":"Members early: Episode 15 + commentary","thumbnail":{"url":"https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80&auto=format&fit=crop","alt":"Headphones resting on a desk"},"current_time":"0:00","duration":"52:40","progress":0,"audio_url":null,"theme":{"accent_a":"120, 220, 160","accent_b":"72, 168, 118","base":["#2a4534","#223a2b","#1a2e22"],"border":"120, 200, 150"}}'::jsonb, 1580, 203, 67, true, true, ('2026-06-27T20:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '10d'),
  (16, 'good-guy-podcast', 'ggp-005', 'discovery', 'Lessons from year three: shorter intros, longer silences, and never scheduling a guest the morning after a red-eye.', ARRAY['#Podcast', '#BehindTheScenes']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80&auto=format&fit=crop","alt":"Two people talking near a microphone"}]}'::jsonb, NULL::jsonb, 3210, 248, 119, true, false, ('2026-06-20T14:15:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '2w'),
  (17, 'good-guy-podcast', 'ggp-006', 'discovery', 'Members AMA thread — drop questions for next month''s guest. Top three get asked on mic.', ARRAY['#MembersOnly', '#AMA', '#Community']::text[], NULL::jsonb, NULL::jsonb, 760, 412, 33, true, true, ('2026-06-14T09:40:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '3w'),
  (18, 'good-guy-podcast', 'ggp-007', 'discovery', 'The art of the cold open — why we stopped saying the show name for the first ninety seconds.', ARRAY['#Craft', '#Podcast']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80&auto=format&fit=crop","alt":"Audio mixing console with faders"}]}'::jsonb, NULL::jsonb, 1890, 156, 88, true, false, ('2026-06-08T18:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '4w'),
  (19, 'hiran', 'hir-001', 'personal', 'Three years ago I was afraid to post anything online. Today I shared my first short film with 200 people I actually know. Small wins.', ARRAY[]::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80&auto=format&fit=crop","alt":"Vintage film camera and reels on a table"}]}'::jsonb, NULL::jsonb, 214, 47, 6, false, false, ('2026-07-03T09:15:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '2d'),
  (20, 'hiran', 'hir-002', 'personal', 'Posted the color grade before and after. Still learning, still iterating. Feedback welcome.', ARRAY['#Filmmaking', '#ColorGrade']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80&auto=format&fit=crop","alt":"Video editing timeline on a monitor"}]}'::jsonb, NULL::jsonb, 142, 28, 4, false, false, ('2026-06-28T20:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '1w'),
  (21, 'hiran', 'hir-003', 'personal', 'Question for other indie filmmakers: how do you know when a cut is actually done?', ARRAY['#IndieFilm']::text[], NULL::jsonb, NULL::jsonb, 89, 64, 2, false, false, ('2026-06-22T11:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '2w'),
  (22, 'hiran', 'hir-004', 'personal', 'Location scout day — found a stairwell with the perfect echo for the opening scene.', ARRAY['#LocationScout', '#ShortFilm']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80&auto=format&fit=crop","alt":"Empty cinema seats in warm light"}]}'::jsonb, NULL::jsonb, 176, 19, 5, false, false, ('2026-06-15T07:30:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '3w'),
  (23, 'hiran', 'hir-005', 'personal', 'Submitted to two local festivals today. Either way, proud this one exists outside my hard drive.', ARRAY['#FilmFestival']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80&auto=format&fit=crop","alt":"Projector light in a dark theater"}]}'::jsonb, NULL::jsonb, 203, 41, 8, false, false, ('2026-06-08T16:45:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '4w'),
  (24, 'mia-chen', 'mia-001', 'sports', 'Marathon morning in Mumbai — 42 km done before the city woke up. Legs are jelly, heart is full.', ARRAY['#Marathon', '#Running', '#Mumbai']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80&auto=format&fit=crop","alt":"Runner crossing a city bridge at sunrise"}]}'::jsonb, NULL::jsonb, 4820, 312, 89, false, true, ('2026-07-05T04:30:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '3h'),
  (25, 'mia-chen', 'mia-002', 'sports', 'Taper week checklist: sleep, carbs, and absolutely no new shoes. Trust the training.', ARRAY['#TaperWeek', '#MarathonPrep']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80&auto=format&fit=crop","alt":"Running shoes and race bib laid out"}]}'::jsonb, NULL::jsonb, 2180, 94, 31, false, false, ('2026-07-02T08:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '3d'),
  (26, 'mia-chen', 'mia-audio-001', 'sports', 'New audio log — taper week nerves, race-morning rituals, and why I stopped chasing every split on easy days.', ARRAY['#Audio', '#Running', '#MarathonPrep']::text[], NULL::jsonb, '{"title":"Miles & Mindset · Taper week nerves","thumbnail":{"url":"https://images.unsplash.com/photo-1502904550040-7534597429ae?w=400&q=80&auto=format&fit=crop","alt":"Runner on a misty forest trail"},"current_time":"0:00","duration":"5:00","progress":0,"audio_url":null,"theme":{"accent_a":"120, 180, 255","accent_b":"70, 120, 210","base":["#1e2f4a","#1a2840","#141f33"],"border":"110, 170, 230"}}'::jsonb, 1640, 124, 38, false, false, ('2026-07-01T07:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '4d'),
  (27, 'mia-chen', 'mia-003', 'personal', 'Members — drop your race goal for August. I''ll pick three training plans to build together this weekend.', ARRAY['#RunningCommunity']::text[], NULL::jsonb, NULL::jsonb, 890, 203, 12, false, false, ('2026-06-28T12:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '1w'),
  (28, 'mia-chen', 'mia-004', 'sports', 'Western Ghats long run yesterday — 28 km of mist, mud, and zero regrets. Legs learned things flats never teach.', ARRAY['#TrailRunning', '#WesternGhats', '#UltraTraining']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1502904550040-7534597429ae?w=800&q=80&auto=format&fit=crop","alt":"Runner on a misty forest trail"}]}'::jsonb, NULL::jsonb, 1640, 87, 24, false, false, ('2026-06-21T06:15:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '2w'),
  (29, 'mia-chen', 'mia-005', 'sports', 'Gym day for runners: single-leg RDLs, calf raises, and core. Strong legs survive marathon month.', ARRAY['#StrengthTraining', '#RunnerLife']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format&fit=crop","alt":"Athlete training with weights in a gym"}]}'::jsonb, NULL::jsonb, 1120, 56, 18, false, false, ('2026-06-18T09:30:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '2w'),
  (30, 'mia-chen', 'mia-006', 'personal', 'Foam roll, ice bath, early lights-out. Recovery isn''t lazy — it''s where the adaptation happens.', ARRAY['#Recovery', '#RestDay']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80&auto=format&fit=crop","alt":"Foam roller and recovery gear on a mat"}]}'::jsonb, NULL::jsonb, 980, 71, 14, false, false, ('2026-06-14T19:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '3w'),
  (31, 'mia-chen', 'mia-007', 'food', 'Pre-long-run breakfast: rice, banana, peanut butter, and way too much coffee. Fuel the miles, not the guilt.', ARRAY['#RunnerNutrition', '#LongRun']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80&auto=format&fit=crop","alt":"Healthy breakfast spread with fruit and grains"}]}'::jsonb, NULL::jsonb, 2410, 132, 41, false, false, ('2026-06-05T04:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '1mo'),
  (32, 'mia-chen', 'mia-008', 'sports', '5 AM headlamp crew — six of us, twelve silent kilometres along Marine Drive before the humidity hit.', ARRAY['#EarlyMorning', '#Mumbai', '#RunningCrew']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1594882645126-14020914d58d?w=800&q=80&auto=format&fit=crop","alt":"Runners with headlamps on a dark coastal road at dawn"}]}'::jsonb, NULL::jsonb, 1870, 98, 27, false, false, ('2026-05-28T23:30:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '5w'),
  (33, 'planet-unfolded', 'pu-001', 'discovery', 'Deep-sea vents host ecosystems that don''t need sunlight at all. New episode drops tonight — we filmed hydrothermal chimneys 2,400 m below the Pacific.', ARRAY['#DeepSea', '#Documentary', '#Ocean']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80&auto=format&fit=crop","alt":"Underwater scene with light rays and marine life"}]}'::jsonb, NULL::jsonb, 67800, 2901, 9400, true, true, ('2026-07-05T05:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '2h'),
  (34, 'planet-unfolded', 'pu-002', 'discovery', 'Members — full director''s cut of last week''s aurora episode is live. Includes 18 minutes of uncut timelapse from Tromsø.', ARRAY['#Aurora', '#MembersOnly']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=800&q=80&auto=format&fit=crop","alt":"Northern lights over a snowy landscape"}]}'::jsonb, NULL::jsonb, 22400, 812, 3200, true, true, ('2026-07-03T18:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '2d'),
  (35, 'planet-unfolded', 'pu-003', 'discovery', 'We lost three drones to katabatic winds filming in Antarctica. Here''s what the footage taught us about shooting in −40°C.', ARRAY['#Antarctica', '#Filmmaking', '#BehindTheScenes']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80&auto=format&fit=crop","alt":"Snow-covered mountains under dramatic clouds"}]}'::jsonb, NULL::jsonb, 18900, 654, 2100, true, false, ('2026-06-28T10:30:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '1w'),
  (36, 'planet-unfolded', 'pu-004', 'discovery', 'New series announcement: Horizon Lines — six episodes on how rivers shape civilisations. First trailer drops Friday.', ARRAY['#NewSeries', '#Nature', '#History']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop","alt":"Aerial view of a winding river through mountains"}]}'::jsonb, NULL::jsonb, 31200, 1204, 4800, true, false, ('2026-06-22T14:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '2w'),
  (37, 'planet-unfolded', 'pu-005', 'discovery', 'The rainforest canopy is a separate world 40 metres above the forest floor. Our rope-access team spent six weeks up there.', ARRAY['#Rainforest', '#Wildlife', '#Expedition']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80&auto=format&fit=crop","alt":"Lush green rainforest canopy from above"}]}'::jsonb, NULL::jsonb, 15600, 489, 1800, true, false, ('2026-06-15T08:45:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '3w'),
  (38, 'planet-unfolded', 'pu-006', 'discovery', 'Poll: which topic should we cover next — volcanic lightning, bioluminescent bays, or cave ecosystems? Vote in comments.', ARRAY['#Community', '#Science']::text[], NULL::jsonb, NULL::jsonb, 9800, 2840, 620, true, false, ('2026-06-08T16:20:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '4w'),
  (39, 'planet-unfolded', 'pu-007', 'discovery', 'James Webb''s latest deep-field image contains galaxies from 13 billion years ago. We broke down what you''re actually looking at.', ARRAY['#Space', '#JamesWebb', '#Astronomy']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80&auto=format&fit=crop","alt":"Starry night sky with the Milky Way visible"}]}'::jsonb, NULL::jsonb, 41200, 1780, 9100, true, false, ('2026-05-30T12:00:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '5w'),
  (40, 'planet-unfolded', 'pu-008', 'discovery', 'Field log from the Atacama — 14 days at 5,000 m altitude filming salt flats under a full moon. No filter on this one.', ARRAY['#Atacama', '#Desert', '#FieldLog']::text[], '{"type":"image","images":[{"url":"https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80&auto=format&fit=crop","alt":"Vast salt flat landscape under a dramatic sky"}]}'::jsonb, NULL::jsonb, 26700, 903, 3400, true, false, ('2026-05-22T20:15:00.000Z'::timestamptz AT TIME ZONE 'UTC'), '6w')
) AS v(ord, slug, id, category, text, tags, media, audio, likes, comments, shares, following, members_only, posted_at, posted_ago)
JOIN "CreatorUser" c ON lower(c.slug) = v.slug
ON CONFLICT (id) DO NOTHING;

UPDATE "UserProfile" up
SET "pinnedFeedPostIds" = up."pinnedFeedPostIds" || ARRAY(
      SELECT t.id
      FROM unnest(ARRAY['bns-001', 'bns-002', 'bns-003']::text[]) WITH ORDINALITY AS t(id, n)
      WHERE NOT (t.id = ANY(up."pinnedFeedPostIds"))
        AND EXISTS (SELECT 1 FROM "FeedPost" f WHERE f.id = t.id)
      ORDER BY t.n
    ),
    "updatedAt" = now()
WHERE lower(up.slug) = 'bathiya-santhush'
  AND EXISTS (
    SELECT 1 FROM unnest(ARRAY['bns-001', 'bns-002', 'bns-003']::text[]) AS t(id)
    WHERE NOT (t.id = ANY(up."pinnedFeedPostIds"))
      AND EXISTS (SELECT 1 FROM "FeedPost" f WHERE f.id = t.id)
  );

UPDATE "UserProfile" up
SET "pinnedFeedPostIds" = up."pinnedFeedPostIds" || ARRAY(
      SELECT t.id
      FROM unnest(ARRAY['dw-001', 'dw-002', 'dw-003', 'dw-004', 'dw-005', 'dw-006', 'dw-007', 'dw-008']::text[]) WITH ORDINALITY AS t(id, n)
      WHERE NOT (t.id = ANY(up."pinnedFeedPostIds"))
        AND EXISTS (SELECT 1 FROM "FeedPost" f WHERE f.id = t.id)
      ORDER BY t.n
    ),
    "updatedAt" = now()
WHERE lower(up.slug) = 'dev-weekly'
  AND EXISTS (
    SELECT 1 FROM unnest(ARRAY['dw-001', 'dw-002', 'dw-003', 'dw-004', 'dw-005', 'dw-006', 'dw-007', 'dw-008']::text[]) AS t(id)
    WHERE NOT (t.id = ANY(up."pinnedFeedPostIds"))
      AND EXISTS (SELECT 1 FROM "FeedPost" f WHERE f.id = t.id)
  );

UPDATE "UserProfile" up
SET "pinnedFeedPostIds" = up."pinnedFeedPostIds" || ARRAY(
      SELECT t.id
      FROM unnest(ARRAY['ggp-001', 'ggp-002', 'ggp-003', 'ggp-004', 'ggp-005', 'ggp-006', 'ggp-007']::text[]) WITH ORDINALITY AS t(id, n)
      WHERE NOT (t.id = ANY(up."pinnedFeedPostIds"))
        AND EXISTS (SELECT 1 FROM "FeedPost" f WHERE f.id = t.id)
      ORDER BY t.n
    ),
    "updatedAt" = now()
WHERE lower(up.slug) = 'good-guy-podcast'
  AND EXISTS (
    SELECT 1 FROM unnest(ARRAY['ggp-001', 'ggp-002', 'ggp-003', 'ggp-004', 'ggp-005', 'ggp-006', 'ggp-007']::text[]) AS t(id)
    WHERE NOT (t.id = ANY(up."pinnedFeedPostIds"))
      AND EXISTS (SELECT 1 FROM "FeedPost" f WHERE f.id = t.id)
  );

UPDATE "UserProfile" up
SET "pinnedFeedPostIds" = up."pinnedFeedPostIds" || ARRAY(
      SELECT t.id
      FROM unnest(ARRAY['hir-001', 'hir-002', 'hir-003', 'hir-004', 'hir-005']::text[]) WITH ORDINALITY AS t(id, n)
      WHERE NOT (t.id = ANY(up."pinnedFeedPostIds"))
        AND EXISTS (SELECT 1 FROM "FeedPost" f WHERE f.id = t.id)
      ORDER BY t.n
    ),
    "updatedAt" = now()
WHERE lower(up.slug) = 'hiran'
  AND EXISTS (
    SELECT 1 FROM unnest(ARRAY['hir-001', 'hir-002', 'hir-003', 'hir-004', 'hir-005']::text[]) AS t(id)
    WHERE NOT (t.id = ANY(up."pinnedFeedPostIds"))
      AND EXISTS (SELECT 1 FROM "FeedPost" f WHERE f.id = t.id)
  );

UPDATE "UserProfile" up
SET "pinnedFeedPostIds" = up."pinnedFeedPostIds" || ARRAY(
      SELECT t.id
      FROM unnest(ARRAY['mia-001', 'mia-002', 'mia-audio-001', 'mia-003', 'mia-004', 'mia-005', 'mia-006', 'mia-007', 'mia-008']::text[]) WITH ORDINALITY AS t(id, n)
      WHERE NOT (t.id = ANY(up."pinnedFeedPostIds"))
        AND EXISTS (SELECT 1 FROM "FeedPost" f WHERE f.id = t.id)
      ORDER BY t.n
    ),
    "updatedAt" = now()
WHERE lower(up.slug) = 'mia-chen'
  AND EXISTS (
    SELECT 1 FROM unnest(ARRAY['mia-001', 'mia-002', 'mia-audio-001', 'mia-003', 'mia-004', 'mia-005', 'mia-006', 'mia-007', 'mia-008']::text[]) AS t(id)
    WHERE NOT (t.id = ANY(up."pinnedFeedPostIds"))
      AND EXISTS (SELECT 1 FROM "FeedPost" f WHERE f.id = t.id)
  );

UPDATE "UserProfile" up
SET "pinnedFeedPostIds" = up."pinnedFeedPostIds" || ARRAY(
      SELECT t.id
      FROM unnest(ARRAY['pu-001', 'pu-002', 'pu-003', 'pu-004', 'pu-005', 'pu-006', 'pu-007', 'pu-008']::text[]) WITH ORDINALITY AS t(id, n)
      WHERE NOT (t.id = ANY(up."pinnedFeedPostIds"))
        AND EXISTS (SELECT 1 FROM "FeedPost" f WHERE f.id = t.id)
      ORDER BY t.n
    ),
    "updatedAt" = now()
WHERE lower(up.slug) = 'planet-unfolded'
  AND EXISTS (
    SELECT 1 FROM unnest(ARRAY['pu-001', 'pu-002', 'pu-003', 'pu-004', 'pu-005', 'pu-006', 'pu-007', 'pu-008']::text[]) AS t(id)
    WHERE NOT (t.id = ANY(up."pinnedFeedPostIds"))
      AND EXISTS (SELECT 1 FROM "FeedPost" f WHERE f.id = t.id)
  );
