# Guardian / Parent Approval — `/guardian/approve?token=…`

Separate journey for the parent or guardian. Reached via the approval link in the prototype parent inbox (or server logs). Runs outside the child’s onboarding screens but updates the child’s invite status.

```mermaid
flowchart TB
  START([Open approval link]) --> LOAD["GET /api/guardian/context"]
  LOAD -->|"Invalid / expired"| INVALID["Invalid approval link"]
  LOAD -->|"OK"| CONSENT["Consent step<br/>child request summary"]

  CONSENT --> DECIDE{Parent choice}

  DECIDE -->|"Decline"| DECLINE_MODAL["Confirm decline"]
  DECLINE_MODAL --> DECLINE_API["POST /api/guardian/decline"]
  DECLINE_API --> DECLINED["Declined screen"]
  DECLINED --> LOGIN["/ — Login"]

  DECIDE -->|"Approve"| RETURNING{Returning<br/>guardian?}

  RETURNING -->|"Yes"| QUICK["POST /api/guardian/quick-approve"]
  QUICK --> DONE["Approved summary"]

  RETURNING -->|"No — new guardian"| ACCT["Account step<br/>password · country · ID type"]
  ACCT --> ACCT_API["POST /api/guardian/account"]
  ACCT_API --> VINTRO["Verify intro"]
  VINTRO --> ID["ID capture"]
  ID --> FACE["Face scan / selfie"]
  FACE --> VERIFYING["Identity verifying<br/>(simulated steps)"]
  VERIFYING --> REVIEW["Identity review<br/>location confirmation"]
  REVIEW --> PROTECT["Protection level"]
  PROTECT --> COMPLETE["POST /api/guardian/complete"]
  COMPLETE --> DONE

  DONE --> DONE_UI["Parent approved screen"]
  DONE_UI --> LOGIN

  subgraph ChildSide["Child side (parallel)"]
    WAIT["/onboarding/waiting"] --> POLL["Poll invite status"]
    POLL -->|"APPROVED"| CHILD_APPR["/onboarding/approved"]
    POLL -->|"DECLINED"| CHILD_DECL["Declined on waiting page"]
  end

  DECLINE_API -.->|"Updates status"| CHILD_DECL
  QUICK -.->|"Updates status"| POLL
  COMPLETE -.->|"Updates status"| POLL

  style DONE fill:#e8f5e9,stroke:#2e7d32
  style DECLINED fill:#ffebee,stroke:#c62828
  style INVALID fill:#ffebee,stroke:#c62828
```

## Guardian stepper (new guardian path)

| Step | Label | Screens |
| --- | --- | --- |
| 1 | Account | Consent → Account details |
| 2 | Verify | Intro → ID capture → Face scan → Verifying |
| 3 | Review | Confirm identity & child location |
| 4 | Protection | Choose protection tier |
| 5 | Approved | Success summary |

## Returning guardian

If the parent email already belongs to a completed guardian account, **Approve** on the consent step skips identity verification and completes approval in one API call.
