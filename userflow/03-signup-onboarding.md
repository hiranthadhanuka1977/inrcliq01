# Signup & Onboarding

## Signup — `/signup`

```mermaid
flowchart TB
  START([Open /signup]) --> SESSION{Already logged in?}
  SESSION -->|"Yes"| REDIR["Redirect to onboarding / home"]
  SESSION -->|"No"| STEP1

  subgraph Step1["Step 1 — Choose how to sign up"]
    STEP1["Google / Apple<br/>(disabled in prototype)"]
    STEP1 --> OR["or"]
    OR --> EMAIL_BTN["Continue with email"]
  end

  EMAIL_BTN --> STEP2

  subgraph Step2["Step 2 — Join InrCliq"]
    STEP2["Email · First/last name<br/>DOB · Country · State (US)"]
    STEP2 --> JOIN["POST /api/auth/signup/join"]
    JOIN -->|"age < 18"| MINOR["AccountType: MINOR"]
    JOIN -->|"age ≥ 18"| ADULT["AccountType: ADULT"]
  end

  MINOR --> STEP3
  ADULT --> STEP3

  subgraph Step3["Step 3 — Verify email"]
    STEP3["Check inbox @ email"]
    STEP3 --> INBOX["📧 Prototype inbox<br/>verify link"]
    INBOX --> LINK["GET /api/auth/verify-email?token=…"]
    LINK -->|"Invalid"| ERR["/verify-email?error=invalid"]
    LINK -->|"Valid"| SESSION["Create session"]
  end

  SESSION --> PATH{Account type}

  style INBOX fill:#fff3e0,stroke:#ef6c00
```

## Post-verification onboarding

```mermaid
flowchart LR
  VERIFY([Email verified]) --> TYPE{Account type}

  TYPE -->|"ADULT"| PWD["/onboarding/password"]
  TYPE -->|"MINOR"| PAR["/onboarding/parent"]

  PWD -->|"Next or skip"| HANDLE["/onboarding/handle"]
  HANDLE -->|"Next or skip"| HOME["/home ✓"]

  PAR --> INVITE["POST parent-invite"]
  INVITE --> WAIT["/onboarding/waiting"]
  WAIT -->|"Poll / resend"| WAIT
  WAIT -->|"Parent approves"| APPR["/onboarding/approved"]
  APPR --> ACK["POST acknowledge-approval"]
  ACK --> PWD2["/onboarding/password"]
  PWD2 --> HANDLE2["/onboarding/handle"]
  HANDLE2 --> HOME

  WAIT -->|"Declined"| DECL["Declined UI"]
  DECL --> PAR

  PAR --> FIX["Wrong DOB?<br/>POST fix-age"]
  FIX -->|"Becomes ADULT"| PWD

  style HOME fill:#e8f5e9,stroke:#2e7d32
  style DECL fill:#ffebee,stroke:#c62828
```

## Screen details

### `/onboarding/password`

- Create password (8+ chars, letters + numbers) **or** skip
- Skip → passwordless login via email code only
- Next → `/onboarding/handle`

### `/onboarding/handle`

- Suggested `@handle` from name
- Validate and save **or** skip
- Next → `/home` (onboarding complete)

### `/onboarding/parent` (minor only)

- Enter parent/guardian email
- Sends approval email (logged to console; inbox on waiting page)
- Option: **Wrong date of birth** → converts account to adult → `/onboarding/password`

### `/onboarding/waiting` (minor only)

- Shows pending status; polls every 10s
- Resend parent email (cooldown)
- Prototype inbox with approval link (opens `/guardian/approve` in new tab)
- On `APPROVED` → auto-navigate to `/onboarding/approved`
- On `DECLINED` → show decline message; link back to parent step

### `/onboarding/approved` (minor only)

- Celebration screen
- **Continue** → `/onboarding/password`
