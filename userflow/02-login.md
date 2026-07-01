# Login Flow — `/`

Authenticated users hitting `/` are redirected immediately to their current onboarding step or `/home`.

```mermaid
flowchart TB
  START([Open /]) --> CONSENT{Privacy consent<br/>accepted?}
  CONSENT -->|"No"| MODAL["Prototype consent modal<br/>(checkbox to continue)"]
  MODAL --> CONSENT
  CONSENT -->|"Yes"| SESSION{Active session?}

  SESSION -->|"Yes"| REDIRECT["Redirect via<br/>getOnboardingRedirect()"]
  REDIRECT --> HOME["/home"]
  REDIRECT --> ONBOARD["Onboarding step"]

  SESSION -->|"No"| METHOD{Login method}

  METHOD -->|"Default: code"| EMAIL["Enter email"]
  EMAIL --> SEND["POST /api/auth/login/send-code"]
  SEND --> INBOX["📧 Prototype inbox<br/>top-right mail icon"]
  INBOX --> OTP["Enter 6-digit OTP"]
  OTP --> VERIFY["POST /api/auth/login/verify-code"]

  METHOD -->|"Use password to login"| PWD_FORM["Email + password"]
  PWD_FORM --> PWD_API["POST /api/auth/login/password"]

  VERIFY --> OK{Success?}
  PWD_API --> OK

  OK -->|"No"| ERR["Show error<br/>retry"]
  ERR --> METHOD

  OK -->|"Yes"| NEXT["redirectTo from API"]
  NEXT --> HOME
  NEXT --> ONBOARD

  EMAIL -->|"Switch"| PWD_FORM
  OTP -->|"Switch"| PWD_FORM
  PWD_FORM -->|"Use login code instead"| EMAIL

  LAND_LINK["Already have account?"] -.-> SIGNUP["/signup"]
  SIGNUP_LINK["New here? Sign up"] -.-> SIGNUP

  style INBOX fill:#fff3e0,stroke:#ef6c00
  style HOME fill:#e8f5e9,stroke:#2e7d32
```

## Prototype inbox (login code)

| Step | Behaviour |
| --- | --- |
| Send code | API returns `loginCode`; stored in `sessionStorage` |
| Mail icon | Opens popover with copyable 6-digit code |
| Resend | Cooldown timer (30s default) |

## Resume destinations after login

| Condition | Route |
| --- | --- |
| Onboarding complete | `/home` |
| Email not verified | `/signup` (step 3 state via sessionStorage) |
| Minor, no invite sent | `/onboarding/parent` |
| Minor, invite pending | `/onboarding/waiting` |
| Minor, invite approved | `/onboarding/approved` |
| Minor, invite declined | `/onboarding/waiting` (declined UI) |
| Needs password | `/onboarding/password` |
| Needs handle | `/onboarding/handle` |
