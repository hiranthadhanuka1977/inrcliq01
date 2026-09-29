#!/usr/bin/env bash
# Profile picture upload through the prototype, with the limits now coming from
# GET /enums rather than a hardcoded copy.
#
# The four assertions that matter are the ones the old hardcoded table got
# wrong: a 6 MB avatar and a GIF avatar must be refused (the API refuses them),
# and the refusal must say what to do instead.
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

JAR="$(mktemp)"; BODY=''; CODE=''
req() {
  local m="$1" p="$2" j="${3:-}" out
  out="$(curl -sS -m 40 -X "$m" "${APP}${p}" -b "$JAR" -c "$JAR" \
      ${j:+-H 'Content-Type: application/json' -d "$j"} -w $'\n%{http_code}\nEOM')"
  out="${out%$'\nEOM'}"; CODE="${out##*$'\n'}"; BODY="${out%$'\n'*}"
  say "  ${D}${m} ${p} → ${CODE}${O}"
}
# upload <file> <mime> [route]
upload() {
  local out
  out="$(curl -sS -m 90 -X POST "${APP}${3:-/api/feed/me/avatar}" -b "$JAR" -c "$JAR" \
      -F "file=@$1;type=$2" -w $'\n%{http_code}\nEOM')"
  out="${out%$'\nEOM'}"; CODE="${out##*$'\n'}"; BODY="${out%$'\n'*}"
  say "  ${D}POST ${3:-/api/feed/me/avatar} ($2, $(wc -c < "$1") bytes) → ${CODE}${O}"
}
f() { jq -r "${1} | if . == null then \"\" else tostring end" <<<"$BODY" 2>/dev/null; }
status() { [ "$CODE" = "$1" ] && ok "HTTP $1${2:+ — $2}" || bad "${2:-status}" "$1" "$CODE ${D}$(f .error)"; }
page()  { PAGE="$(curl -sS -m 40 "${APP}$1" -b "$JAR")"; }

MARK=0
wait_for() { local v=""; for _ in $(seq 1 60); do
  v="$(tail -n "+$((MARK+1))" "$BE_LOG" | sed 's/\x1B\[[0-9;]*[A-Za-z]//g' | grep -oE "$1" | tail -1)"
  [ -n "$v" ] && { printf '%s' "$v"; return 0; }; sleep 0.25; done; return 1; }

png() { printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6XjSAcAAAAASUVORK5CYII=' | base64 -d > "$1"; }

say "${B}Profile picture upload, limits from GET /enums${O}"
say "${D}app ${APP} · run ${RUN}${O}"

################################################################################
step "0 · The catalogue the prototype will read"
CAT="$(curl -sS -m 20 "$API/enums?group=media")"
RULES="$(jq -c '(.data//.).groups.media.enums.AttachmentPurpose.values[] | select(.value=="PROFILE_PIC") | .meta' <<<"$CAT")"
note "PROFILE_PIC → $RULES"
MAXB="$(jq -r '.maxBytes' <<<"$RULES")"
[ "$MAXB" = "5242880" ] && ok "the API's avatar limit is 5 MB" || bad "maxBytes" "5242880" "$MAXB"
jq -e '.mimeTypes | index("image/gif") == null' <<<"$RULES" >/dev/null \
  && ok "and it does not accept image/gif" || bad "mimeTypes" "no gif" "gif allowed"

step "1 · An account, onboarded"
ME="up-${RUN}@${DOMAIN}"; MARK=$(wc -l < "$BE_LOG")
req POST /api/auth/signup/join "$(jq -nc --arg e "$ME" \
  '{firstName:"Ana", lastName:"Silva", email:$e, month:4, day:1, year:1993, country:"LK"}')"
status 200 "signed up"
T="$(wait_for 'verify-email\?token=[A-Za-z0-9._~+/=-]+' | sed 's/.*token=//')"
req GET "/api/auth/verify-email?token=${T}"
req POST /api/onboarding/password '{"skip":true}'
req POST /api/onboarding/handle "$(jq -nc --arg h "ana$RUN" '{handle:$h}')"
req POST /api/onboarding/interests '{"interests":["Music"]}'
req GET /api/auth/session
status 200 "onboarded"

################################################################################
step "2 · A valid PNG avatar uploads"
PIC="$(mktemp --suffix=.png)"; png "$PIC"
upload "$PIC" image/png
status 200 "applied"
AVATAR="$(f .avatarUrl)"
case "$AVATAR" in
  https://*.blob.core.windows.net/*) ok "a real Azure blob URL" ;;
  *) bad "avatarUrl" "an Azure blob URL" "${AVATAR:-empty}" ;;
esac
read -r H T2 BY <<<"$(curl -sS -o /dev/null -m 30 -w '%{http_code} %{content_type} %{size_download}' "$AVATAR")"
[ "$H" = 200 ] && ok "publicly readable ($T2, $BY bytes)" || bad "public read" "200" "$H"
rm -f "$PIC"

step "3 · And the profile header serves it"
page /feed/me
grep -qF "$AVATAR" <<<"$PAGE" && ok "rendered on /feed/me" || bad "header" "the URL" "not in the HTML"

################################################################################
say "\n${B}══ What the hardcoded table got wrong${O}"

step "4 · A GIF avatar is refused — the API does not accept one"
GIF="$(mktemp --suffix=.gif)"
printf 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' | base64 -d > "$GIF"
upload "$GIF" image/gif
[ "$CODE" = 400 ] && ok "400 — refused before any upload URL was requested" || bad "gif avatar" "400" "$CODE"
case "$(f .error)" in
  *JPG*|*PNG*|*WebP*) ok "and it says what to use: $(f .error)" ;;
  "") bad "copy" "actionable copy" "empty" ;;
  *) note "copy reads: $(f .error)" ;;
esac
note "the old table allowed image/gif here; the API never did"
rm -f "$GIF"

step "5 · A 6 MB avatar is refused — over the API's 5 MB"
BIG="$(mktemp --suffix=.png)"; png "$BIG"
# pad past 5 MB; the bytes after the PNG data do not matter for a size check
head -c 6291456 /dev/urandom >> "$BIG"
upload "$BIG" image/png
[ "$CODE" = 400 ] && ok "400 — refused" || bad "oversized avatar" "400" "$CODE"
case "$(f .error)" in
  *"5 MB"*) ok "and it names the real limit: $(f .error)" ;;
  *) bad "copy" "mentions 5 MB" "$(f .error)" ;;
esac
note "the old table allowed 8 MB, so this used to reach the API and fail there"
rm -f "$BIG"

step "6 · An empty file is refused"
EMPTY="$(mktemp --suffix=.png)"
upload "$EMPTY" image/png
[ "$CODE" = 400 ] && ok "400 — refused" || bad "empty file" "400" "$CODE"
rm -f "$EMPTY"

step "7 · A stranger cannot upload at all"
OUT="$(curl -sS -m 30 -X POST "${APP}/api/feed/me/avatar" -F "file=@/etc/hostname;type=image/png" -w $'\n%{http_code}\nEOM')"
OUT="${OUT%$'\nEOM'}"; CODE="${OUT##*$'\n'}"
say "  ${D}POST /api/feed/me/avatar (no session) → ${CODE}${O}"
[ "$CODE" = 401 ] && ok "401" || bad "unauthenticated" "401" "$CODE"

################################################################################
say "\n${B}══ Post media reads the same catalogue${O}"

step "8 · A webm video is refused — the API takes mp4 and mov only"
WEBM="$(mktemp --suffix=.webm)"; head -c 2048 /dev/urandom > "$WEBM"
upload "$WEBM" video/webm /api/feed/uploads
[ "$CODE" = 400 ] && ok "400 — refused" || bad "webm" "400" "$CODE"
case "$(f .error)" in
  *MP4*|*MOV*) ok "and it names what works: $(f .error)" ;;
  *) note "copy reads: $(f .error)" ;;
esac
note "the old table allowed video/webm; the API never did"
rm -f "$WEBM"

step "9 · A post image still uploads, and carries its attachmentId"
PIC="$(mktemp --suffix=.png)"; png "$PIC"
upload "$PIC" image/png /api/feed/uploads
status 200 "uploaded"
[ -n "$(f .attachmentId)" ] && ok "attachmentId returned for the composer" || bad "attachmentId" "a uuid" "empty"
IMG="$(f .url)"
AID="$(f .attachmentId)"
req POST /api/feed/posts "$(jq -nc --arg u "$IMG" --arg a "$AID" \
  '{text:"with a photo", images:[{url:$u, alt:"a dot", attachmentId:$a}]}')"
case "$CODE" in
  200) ok "published" ;;
  404) note "no /posts on this backend — the feed API is on PR #48, held back deliberately" ;;
  *)   bad "publish" "200 or 404" "$CODE" ;;
esac
rm -f "$PIC"

step "10 · The catalogue is cached, not refetched per upload"
BEFORE="$(grep -c 'GET /api/v1/enums\|/enums' "$BE_LOG" 2>/dev/null || echo 0)"
PIC="$(mktemp --suffix=.png)"; png "$PIC"
for i in 1 2 3; do upload "$PIC" image/png >/dev/null 2>&1; done
AFTER="$(grep -c 'GET /api/v1/enums\|/enums' "$BE_LOG" 2>/dev/null || echo 0)"
note "enum requests in the backend log: before=$BEFORE after=$AFTER across 3 uploads"
[ "$((AFTER - BEFORE))" -le 1 ] && ok "at most one refetch — the 5-minute cache holds" \
  || bad "cache" "<=1 refetch" "$((AFTER - BEFORE))"
rm -f "$PIC"

rm -f "$JAR"
say "\n${B}$([ "$F" -eq 0 ] && printf '%s' "$G" || printf '%s' "$R")${P} passed, ${F} failed${O}\n"
[ "$F" -eq 0 ]
