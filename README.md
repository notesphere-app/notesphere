# NoteSphere

NoteSphere is an Express, EJS, and MongoDB application for sharing study notes and publishing blogs.

## Data features

- User login history is kept on the user document and capped at the most recent 10 sign-ins. Entries include the sign-in method, timestamp, and coarse device type; IP addresses are stored only as keyed hashes.
- Notes store a public URL and catalog details (title, description, course, semester, subject, and type). The current feature links to externally hosted notes; it does not upload or copy files.
- Notes support comments, likes, saved-note lists, and download-event records. Blogs support comments, likes, saves, and shares.
- Newsletter subscriptions from a new email require a time-limited email OTP. The currently signed-in account's verified email can subscribe without an additional OTP. Set `BREVO_API_KEY` and `SECRET` to enable OTP delivery and secure code hashing.
- Contact messages do not require verification. They store guest/account status, coarse browser/device details, a source path, and a keyed IP hash; no precise GPS or raw IP is collected by the contact flow.
- Essential session cookies are always used. Optional Google AdSense loads only after the visitor accepts it in the cookie prompt; the visitor can revisit their choice from the footer. No analytics cookies are introduced by these features.

Indexes are declared beside their Mongoose schemas. Keep each index declaration in one place; do not add a second copy in a separate setup script.

## Environment configuration

Set these values in the deployment environment (or a local, untracked environment file):

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-side Gemini API key for the chatbot. |
| `GEMINI_MODEL` | Optional Gemini model override; defaults to `gemini-2.5-flash-lite`. |
| `GOOGLE_RECAPTCHA_SITE_KEY` | Public reCAPTCHA Enterprise site key rendered by protected forms. |
| `GOOGLE_CLOUD_PROJECT_ID` | Google Cloud project ID that owns the reCAPTCHA Enterprise key. `GOOGLE_CLOUD_PROJECT` and `GCLOUD_PROJECT` are also recognized. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Optional server-only service-account JSON for platforms such as Render that do not provide Google Cloud ADC automatically. Alternatively, use `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` or `GOOGLE_APPLICATION_CREDENTIALS` to point to a mounted secret file. |
| `GOOGLE_RECAPTCHA_SCORE_THRESHOLD` | Optional Enterprise risk-score threshold from `0` to `1`; defaults to `0.5`. |
| `EMAIL_FROM` | Verified sender email address used for application email; configure it as `support.notesphere@gmail.com` if that address is verified with your email provider. |
| `EMAIL_FROM_NAME` | Optional sender display name; defaults to `NoteSphere`. |
| `TRUST_PROXY` | Optional trusted proxy setting. Render defaults to one trusted proxy hop; set this explicitly only when your deployment topology requires a different value. |
| `DOMAIN` | Public site origin; defaults to `https://notesphere.online` for application links and authentication callbacks. |
| `RAZORPAY_KEY_ID` | Razorpay key ID used to open Checkout and create payment orders. |
| `RAZORPAY_KEY_SECRET` | Server-only Razorpay secret used to authenticate order creation and verify payment signatures. |

Never expose Gemini, Google Cloud credentials, email-provider, or application signing keys in client-side code or commit them to the repository.
Support contact displayed by the app: `support.notesphere@gmail.com`.

### reCAPTCHA Enterprise setup

Protected forms use the Enterprise browser API and create server-side assessments through Application Default Credentials (ADC) or an explicitly configured service account. Set `GOOGLE_RECAPTCHA_SITE_KEY` and `GOOGLE_CLOUD_PROJECT_ID` in the deployment environment, enable the reCAPTCHA Enterprise API in that Cloud project, and grant the runtime identity permission to create assessments (for example, `roles/recaptchaenterprise.agent`). On Google Cloud, use the service account attached to the runtime. For Render, store the complete service-account JSON as the secret `GOOGLE_SERVICE_ACCOUNT_JSON`, or base64-encode that JSON locally and store the result as `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`; alternatively, add it as a secret file and set `GOOGLE_APPLICATION_CREDENTIALS` to its path. Do not commit the credentials or share them in chat. For local development, authenticate ADC with `gcloud auth application-default login`. Do not use the legacy `GOOGLE_RECAPTCHA_SECRET_KEY` or place service-account credentials in client-side code.

The action sent by each protected form is normalized to uppercase with underscores (for example, `password-reset` becomes `PASSWORD_RESET`) and checked against the action returned in the Enterprise assessment.

Razorpay contributions are voluntary support for project hosting and upkeep; they are not represented as charitable or tax-deductible donations. The browser receives only the Razorpay key ID. Payment orders are created on the server, and successful checkout signatures are verified server-side.
