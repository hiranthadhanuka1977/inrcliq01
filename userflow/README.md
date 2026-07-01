# InrCliq Web Prototype — User Flow

Diagrams for the **web prototype** at `web/` (Next.js). They reflect routes, screens, and decision points implemented in the codebase.

## Files

| File | Contents |
| --- | --- |
| [01-overview.md](./01-overview.md) | End-to-end map: entry, signup, onboarding, home |
| [02-login.md](./02-login.md) | Login (OTP + password), session resume |
| [03-signup-onboarding.md](./03-signup-onboarding.md) | Signup steps, email verify, adult vs minor paths |
| [04-guardian-approval.md](./04-guardian-approval.md) | Parent email link flow (`/guardian/approve`) |
| [05-prototype-tools.md](./05-prototype-tools.md) | Consent modal, prototype controls, settings |

## How to view

- Open any `.md` file in Cursor, GitHub, or a Mermaid-capable viewer.
- Diagrams use [Mermaid](https://mermaid.js.org/) `flowchart` syntax.

## Key routes

| Route | Screen |
| --- | --- |
| `/` | Login |
| `/signup` | Signup (3 steps) |
| `/verify-email` | Invalid/expired verify link fallback |
| `/onboarding/parent` | Minor: parent email |
| `/onboarding/waiting` | Minor: pending / declined parent approval |
| `/onboarding/approved` | Minor: parent approved celebration |
| `/onboarding/password` | Create or skip password |
| `/onboarding/handle` | Choose or skip @handle |
| `/home` | Signed-in home (placeholder) |
| `/guardian/approve?token=…` | Parent approval journey |
| `/settings/users` | Prototype user list |
| `/settings/reset` | Wipe all users (database) |
