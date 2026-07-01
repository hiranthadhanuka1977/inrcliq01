# Overview — InrCliq Web Prototype User Flow

High-level journey from first visit to home. Prototype helpers (consent, controls, simulated inboxes) are omitted here; see [05-prototype-tools.md](./05-prototype-tools.md).

```mermaid
flowchart TB
  subgraph Entry["Entry"]
    START([Visitor]) --> LAND["/ — Login"]
    LAND -->|"New user"| SIGNUP["/signup"]
    LAND -->|"Returning user"| LOGIN["Login flow"]
  end

  subgraph Signup["Signup"]
    SIGNUP --> S1["Step 1: Choose method<br/>(Email enabled)"]
    S1 --> S2["Step 2: Profile<br/>name · DOB · country"]
    S2 --> S3["Step 3: Verify email<br/>inbox prototype"]
    S3 -->|"Click verify link"| VERIFY["GET /api/auth/verify-email"]
    VERIFY -->|"Session created"| BRANCH{Account type?}
  end

  subgraph AdultPath["Adult path (age ≥ 18)"]
    BRANCH -->|"ADULT"| PWD["/onboarding/password"]
    PWD --> HANDLE["/onboarding/handle"]
    HANDLE --> HOME["/home"]
  end

  subgraph MinorPath["Minor path (age < 18)"]
    BRANCH -->|"MINOR"| PARENT["/onboarding/parent"]
    PARENT --> WAIT["/onboarding/waiting"]
    WAIT -->|"Parent approves<br/>(guardian link)"| APPROVED["/onboarding/approved"]
    APPROVED --> PWD2["/onboarding/password"]
    PWD2 --> HANDLE2["/onboarding/handle"]
    HANDLE2 --> HOME
    WAIT -->|"Declined"| DECLINED["Declined state<br/>on waiting page"]
    DECLINED --> PARENT
  end

  subgraph ReturnLogin["Returning login"]
    LOGIN --> RESUME{Onboarding<br/>complete?}
    RESUME -->|"Yes"| HOME
    RESUME -->|"No"| RESUME_STEP["Resume at correct<br/>onboarding step"]
    RESUME_STEP --> PWD
    RESUME_STEP --> PARENT
    RESUME_STEP --> WAIT
    RESUME_STEP --> APPROVED
    RESUME_STEP --> HANDLE
  end

  style HOME fill:#e8f5e9,stroke:#2e7d32
  style START fill:#f3e5f5,stroke:#7b1fa2
```

## Redirect logic

After login or email verification, the app uses `getOnboardingRedirect()` to send the user to the right screen based on:

- `onboardingStep` on the user record
- Whether email is verified
- For minors: parent invite status (`PENDING`, `APPROVED`, `DECLINED`)

Complete onboarding always ends at **`/home`**.
