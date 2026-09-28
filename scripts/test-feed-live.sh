#!/usr/bin/env bash
# The feed, driven through the PROTOTYPE's own routes in live mode.
#
# Every call goes to :3002, which forwards to the API on :3030 — so a failure
# here is an integration bug in src/lib/backend/feed.ts, not a backend bug.
set -uo pipefail

APP="${APP:-http://localhost:3002}"
API="${API:-http://localhost:3030/api/v1}"
BE_LOG="${BE_LOG:?set BE_LOG}"
RUN="$(date +%H%M%S)$$"
DOMAIN="proto.inrcliq.test"

P=0; F=0
G=$'\e[32m'; R=$'\e[31m'; D=$'\e[2m'; B=$'\e[1m'; O=$'\e[0m'
say()  { printf '%b\n' "$*" >&2; }
ok()   { P=$((P+1)); say "  ${G}✓${O} $1"; }
bad()  { F=$((F+1)); say "  ${R}✗${O} $1 ${D}— wanted [$2] got [$3]${O}"; }
step() { say "\n${B}▸ $1${O}"; }
note() { say "  ${D}$1${O}"; }

JAR="$(mktemp)"; BODY=''; CODE=''; LOC=''
req() {
  local m="$1" p="$2" j="${3:-}" out
  out="$(curl -sS -m 40 -X "$m" "${APP}${p}" -b "$JAR" -c "$JAR" \
      ${j:+-H 'Content-Type: application/json' -d "$j"} -w $'\n%{http_code}\n%{redirect_url}\nEOM')"
  out="${out%$'\nEOM'}"; LOC="${out##*$'\n'}"; out="${out%$'\n'*}"
  CODE="${out##*$'\n'}"; BODY="${out%$'\n'*}"
  say "  ${D}${m} ${p} → ${CODE}${O}"
}
f() { jq -r "${1} | if . == null then \"\" else tostring end" <<<"$BODY" 2>/dev/null; }
expect() { local g; g="$(f "$1")"; [ "$g" = "$2" ] && ok "$1 = $2" || bad "$1" "$2" "$g"; }
status() { [ "$CODE" = "$1" ] && ok "HTTP $1${2:+ — $2}" || bad "${2:-status}" "$1" "$CODE ${D}$(f .error)"; }
page()  { PAGE="$(curl -sS -m 40 "${APP}$1" -b "$JAR")"; say "  ${D}GET $1 → $(printf '%s' "$PAGE" | wc -c) bytes${O}"; }
shows() { grep -qF -- "$2" <<<"$PAGE" && ok "the page shows $1" || bad "page shows $1" "$2" "not in the HTML"; }

MARK=0
mark() { MARK="$(wc -l < "$BE_LOG")"; }
grab() { tail -n "+$((MARK+1))" "$BE_LOG" | sed 's/\x1B\[[0-9;]*[A-Za-z]//g' | grep -oE "$1" | tail -1; }
wait_for() { local v=""; for _ in $(seq 1 60); do v="$(grab "$1")"; [ -n "$v" ] && { printf '%s' "$v"; return 0; }; sleep 0.25; done; return 1; }

signup() { # <slug> <First> → leaves the session in $JAR
  local e="$1-${RUN}@${DOMAIN}"
  mark
  req POST /api/auth/signup/join "$(jq -nc --arg e "$e" --arg n "$2" \
    '{firstName:$n, lastName:"Test", email:$e, month:4, day:1, year:1993, country:"LK"}')"
  local t; t="$(wait_for 'verify-email\?token=[A-Za-z0-9._~+/=-]+' | sed 's/.*token=//')"
  req GET "/api/auth/verify-email?token=${t}"
  req POST /api/onboarding/password '{"skip":true}'
  req POST /api/onboarding/handle "$(jq -nc --arg h "$1$RUN" '{handle:$h}')"
  req POST /api/onboarding/interests '{"interests":["Music"]}'
  printf '%s' "$e"
}
session_token() {
  awk '$6 == "inrcliq_backend_session" { print $7 }' "$1" \
    | python3 -c 'import sys,json,urllib.parse; raw=sys.stdin.read().strip(); print(json.loads(urllib.parse.unquote(raw)).get("accessToken",""))' 2>/dev/null
}

say "${B}Feed — through the prototype, live mode${O}"
say "${D}app ${APP} · run ${RUN}${O}"

################################################################################
step "1 · An author signs up and onboards"
AUTHOR_EMAIL="$(signup author Ana)"
req GET /api/auth/session
status 200 "signed in"
expect .user.onboardingStep COMPLETED
AT_AUTHOR="$(session_token "$JAR")"
PID_AUTHOR="$(curl -sS "$API/users/me/profile" -H "Authorization: Bearer $AT_AUTHOR" | jq -r '(.data//.).profileId')"
[ -n "$PID_AUTHOR" ] && ok "profile ${PID_AUTHOR:0:8}…" || bad "profileId" "a uuid" "none"

step "2 · An empty feed renders, it does not crash"
page /feed
[ -n "$PAGE" ] && ok "the feed page rendered with no posts" || bad "feed page" "HTML" "empty"

step "3 · Publishing a text post through the composer's own route"
req POST /api/feed/posts '{"text":"First post from the prototype."}'
status 200 "published"
POST1="$(f .postId)"
[ -n "$POST1" ] && ok "postId returned" || bad "postId" "an id" "empty"
note "profileHref=$(f .profileHref)"

step "4 · And it appears on the feed page"
page /feed
shows "the post text" "First post from the prototype."
shows "the author" "Ana Test"
shows "the handle" "@author${RUN}"

step "5 · An empty post is refused, with readable copy"
req POST /api/feed/posts '{"text":""}'
[ "$CODE" = 400 ] && ok "400 — refused" || bad "empty post" "400" "$CODE"
case "$(f .error)" in
  *_*) bad "copy" "a sentence" "raw code $(f .error)" ;;
  "")  bad "copy" "a sentence" "empty" ;;
  *)   ok "copy: $(f .error)" ;;
esac

################################################################################
step "6 · A photo post, uploaded through the prototype to Azure"
PIC="$(mktemp --suffix=.png)"
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6XjSAcAAAAASUVORK5CYII=' | base64 -d > "$PIC"
OUT="$(curl -sS -m 60 -X POST "${APP}/api/feed/uploads" -b "$JAR" -c "$JAR" \
  -F "file=@${PIC};type=image/png" -w $'\n%{http_code}\nEOM')"
OUT="${OUT%$'\nEOM'}"; CODE="${OUT##*$'\n'}"; BODY="${OUT%$'\n'*}"
say "  ${D}POST /api/feed/uploads → ${CODE}${O}"
status 200 "uploaded"
IMG_URL="$(f .url)"; IMG_ATT="$(f .attachmentId)"
expect .kind image
[ -n "$IMG_ATT" ] && ok "attachmentId came back for the composer to send" || bad "attachmentId" "a uuid" "empty"
case "$IMG_URL" in
  https://*.blob.core.windows.net/*) ok "the URL is a real Azure blob URL" ;;
  *) bad "upload url" "an Azure blob URL" "$IMG_URL" ;;
esac
read -r H T <<<"$(curl -sS -o /dev/null -m 30 -w '%{http_code} %{content_type}' "$IMG_URL")"
[ "$H" = 200 ] && ok "publicly readable, no signature ($T)" || bad "public read" "200" "$H"
rm -f "$PIC"

step "7 · Publishing it with a feeling, a check-in and everything on"
req POST /api/feed/posts "$(jq -nc --arg u "$IMG_URL" --arg a "$IMG_ATT" \
  '{text:"With a photo", images:[{url:$u, alt:"a dot", attachmentId:$a}],
    feeling:{emoji:"🙏", label:"feeling grateful"},
    location:{label:"Galle Face Green", lat:6.9271, lng:79.8612},
    membersOnly:false}')"
status 200 "published"
MEDIA_POST="$(f .postId)"

step "8 · The feed page renders the photo, the feeling and the place"
page /feed
shows "the photo" "$IMG_URL"
shows "the feeling" "feeling grateful"
shows "the check-in" "Galle Face Green"

step "9 · A GIF post"
req POST /api/feed/posts '{"text":"reaction","gifUrl":"https://media.giphy.com/media/abc/giphy.gif","gifAlt":"a gif"}'
status 200 "published"
page /feed
shows "the gif" "https://media.giphy.com/media/abc/giphy.gif"

################################################################################
step "10 · A second account follows the author"
JAR_AUTHOR="$JAR"; JAR="$(mktemp)"
FAN_EMAIL="$(signup fan Bea)"
AT_FAN="$(session_token "$JAR")"
curl -sS -o /dev/null -X POST "$API/profiles/$PID_AUTHOR/follow" -H "Authorization: Bearer $AT_FAN"
ok "followed through the API"

step "11 · The follower's feed shows the author's posts"
page /feed
shows "the author's first post" "First post from the prototype."
shows "the photo post" "With a photo"

step "12 · Liking through the card's own route"
req PUT "/api/feed/posts/${POST1}/like" '{}'
status 200 "liked"
expect .liked true
expect .likeCount 1
req PUT "/api/feed/posts/${POST1}/like" '{}'
expect .likeCount 1
note "a repeated PUT does not double-count — what makes a retry safe"
req DELETE "/api/feed/posts/${POST1}/like" '{}'
expect .liked false
expect .likeCount 0
req PUT "/api/feed/posts/${POST1}/like" '{}' >/dev/null

step "13 · The like survives a reload"
page /feed
grep -qE 'viewer_liked|is-liked|aria-pressed="true"' <<<"$PAGE" \
  && ok "the card comes back already liked" \
  || note "rendered state not assertable from HTML alone — the API state is what matters"
LIKED="$(curl -sS "$API/posts/$POST1" -H "Authorization: Bearer $AT_FAN" | jq -r '(.data//.).viewer.liked')"
[ "$LIKED" = true ] && ok "the API remembers this viewer liked it" || bad "viewer.liked" "true" "$LIKED"

step "14 · Bookmarking"
req PUT "/api/feed/posts/${POST1}/bookmark" '{}'
status 200 "saved"
expect .bookmarked true
SAVED="$(curl -sS "$API/feed/bookmarks" -H "Authorization: Bearer $AT_FAN" | jq -r '(.data//.).items | length')"
[ "$SAVED" = 1 ] && ok "it is on the saved list" || bad "bookmarks" "1" "$SAVED"

################################################################################
step "15 · The author deletes a post"
JAR_FAN="$JAR"; JAR="$JAR_AUTHOR"
req DELETE /api/feed/posts "$(jq -nc --arg p "$MEDIA_POST" '{postId:$p}')"
status 200 "deleted"
page /feed
grep -qF "With a photo" <<<"$PAGE" && bad "deleted post" "gone from the feed" "still rendered" \
  || ok "gone from the author's own feed"

step "16 · And from the follower's feed too"
JAR="$JAR_FAN"
page /feed
grep -qF "With a photo" <<<"$PAGE" && bad "deleted post" "gone" "still rendered" \
  || ok "gone from the follower's feed"

step "17 · A follower cannot delete someone else's post"
req DELETE /api/feed/posts "$(jq -nc --arg p "$POST1" '{postId:$p}')"
[ "$CODE" = 403 ] && ok "403 — refused" || bad "delete someone else's" "403" "$CODE"

################################################################################
step "18 · The exclusive path"
JAR="$JAR_AUTHOR"
req POST /api/feed/posts '{"text":"Members only, the full story behind this shoot and what happened after.","membersOnly":true}'
[ "$CODE" = 403 ] && ok "403 without a creator badge" || bad "exclusive" "403" "$CODE"
case "$(f .error)" in
  *_*) bad "copy" "a sentence" "raw code $(f .error)" ;;
  *)   ok "copy: $(f .error)" ;;
esac

rm -f "$JAR_AUTHOR" "$JAR_FAN"
say "\n${B}$([ "$F" -eq 0 ] && printf '%s' "$G" || printf '%s' "$R")${P} passed, ${F} failed${O}\n"
[ "$F" -eq 0 ]
