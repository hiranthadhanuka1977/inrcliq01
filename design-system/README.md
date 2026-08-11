# InrCliq design system — auth, onboarding & parent approval

Static HTML renditions of the full user journey: login/signup, child onboarding, and parent guardian approval.

## Preview

From the repository root:

```bash
npx serve design-system -p 3010
```

Open http://localhost:3010 — the design system is the entry page. Flow prototypes live under [phase-01-onboarding.html](phase-01-onboarding.html).

## Foundation

| File | Description |
|------|-------------|
| `index.html` | Design system — colors, typography, components, and HTML / Next.js markup |
| `phase-01-onboarding.html` | Hub linking every auth, onboarding, and parent-approval screen |

## Pages

### Auth (`pages/auth/`)

| File | App route |
|------|-----------|
| `login.html` | `/` — email code login |
| `login-otp.html` | `/` — OTP entry |
| `login-password.html` | `/` — password login |
| `forgot-login.html` | `/forgot-login` |
| `signup-step1.html` | `/signup` step 1 |
| `signup-step2.html` | `/signup` step 2 |
| `signup-verify.html` | `/signup` step 3 |
| `create-password.html` | `/onboarding/password` (adult path after verify) |
| `verify-email-invalid.html` | `/verify-email?error=invalid` |
| `verify-email-missing.html` | `/verify-email` (no token) |

### Child onboarding (`pages/onboarding/`)

| File | App route |
|------|-----------|
| `parent-invite.html` | `/onboarding/parent` |
| `waiting.html` | `/onboarding/waiting` |
| `waiting-declined.html` | `/onboarding/waiting` (declined) |
| `approved.html` | `/onboarding/approved` |
| `password.html` | `/onboarding/password` |
| `handle.html` | `/onboarding/handle` |
| `interests.html` | `/onboarding/interests` |

### Parent approval (`pages/parent/`)

| File | Prototype |
|------|-----------|
| `consent.html` | PAR-01 |
| `account.html` | PAR-02 |
| `verify-intro.html` | PAR-V1 |
| `id-capture.html` | PAR-V1 |
| `face-scan.html` | PAR-V1 |
| `verifying.html` | Processing |
| `review.html` | PAR-04 |
| `protection.html` | PAR-06 |
| `approved.html` | PAR-07 |
| `declined.html` | Declined |

## CSS

Bundled via `css/main.css` from production styles in `src/styles/` (tokens, components, layout, theme, responsive).

`css/fonts.css` loads **Plus Jakarta Sans** (weights 400–800) to match `next/font/google` in the Next.js app.

## Assets

`assets/` contains the logo and landing illustration copied from `public/assets/`.

## JS

`js/onboarding.js` — theme toggle, disclosure panels, password show/hide, chip selection, protection tier selection.

## Related

- Feed / platform DS: ../design-system-platform/ (port 3011)
