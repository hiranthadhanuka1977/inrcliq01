# Prototype Tools & Admin

Helpers used during usability testing. Not part of the production user journey but present on prototype screens.

```mermaid
flowchart TB
  subgraph Global["On all pages"]
    CTRL["Prototype controls<br/>top-left ⚙"]
    CTRL --> RESET["Reset Prototype"]
    CTRL --> SETTINGS["Settings → /settings"]
  end

  subgraph Consent["Landing only (/)"]
    VISIT([First visit]) --> CONSENT_MODAL["Privacy consent modal"]
    CONSENT_MODAL -->|"Checkbox"| DISMISS["sessionStorage:<br/>inrcliq_prototype_consent"]
    DISMISS --> LOGIN["Login screen"]
  end

  subgraph ResetPrototype["Reset Prototype"]
    RESET --> CONFIRM{"Confirm?"}
    CONFIRM -->|"Yes"| LOGOUT["POST /api/auth/logout"]
    LOGOUT --> CLEAR["Clear inrcliq_* sessionStorage"]
    CLEAR --> ROOT["Redirect to /"]
    CONFIRM -->|"No"| CTRL
  end

  subgraph Settings["Settings (new tab)"]
    SETTINGS --> USERS["/settings/users<br/>List all DB users"]
    SETTINGS --> RESET_DB["/settings/reset<br/>Reset all users"]
    RESET_DB --> WIPE["POST /api/settings/reset<br/>Deletes all users + sessions"]
    WIPE --> ROOT
  end

  subgraph Inboxes["Simulated email (no real send)"]
    VERIFY_INBOX["Signup step 3<br/>VerificationEmailInbox"]
    LOGIN_INBOX["Login OTP<br/>LoginCodeInbox"]
    PARENT_INBOX["Parent waiting<br/>ParentApprovalEmailInbox"]
  end

  style WIPE fill:#ffebee,stroke:#c62828
  style ROOT fill:#e3f2fd,stroke:#1565c0
```

## Reset Prototype vs Reset all users

| Action | Scope | Database |
| --- | --- | --- |
| **Reset Prototype** | Current browser session + sessionStorage | Unchanged |
| **Reset all users** (Settings) | All users and sessions | Full wipe |

## Session storage keys (cleared by Reset Prototype)

| Key | Used for |
| --- | --- |
| `inrcliq_prototype_consent` | Privacy modal dismissed |
| `inrcliq_signup_email` | Resume signup step 3 |
| `inrcliq_signup_verify_url` | Verification inbox link |
| `inrcliq_login_code` | Login OTP inbox |
| `inrcliq_login_code_email` | Login OTP email |
| `inrcliq_parent_approve_url` | Parent approval inbox link |

## Email simulation

Emails are **not sent** in the prototype. The API logs links to the server console, and the UI exposes them via top-right inbox popovers.
