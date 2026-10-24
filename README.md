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
| `GOOGLE_RECAPTCHA_SITE_KEY` | Public reCAPTCHA v3 site key rendered by protected forms. |
| `GOOGLE_RECAPTCHA_SECRET_KEY` | Server-side reCAPTCHA v3 verification key. Production requests fail closed if CAPTCHA is not configured. |
| `EMAIL_FROM` | Verified sender email address used for application email; configure it as `support.notesphere@gmail.com` if that address is verified with your email provider. |
| `EMAIL_FROM_NAME` | Optional sender display name; defaults to `NoteSphere`. |
| `TRUST_PROXY` | Optional trusted proxy hop count when deployed behind a reverse proxy. |
| `DOMAIN` | Public site origin; defaults to `https://notesphere.online` for application links and authentication callbacks. |
| `RAZORPAY_KEY_ID` | Razorpay key ID used to open Checkout and create payment orders. |
| `RAZORPAY_KEY_SECRET` | Server-only Razorpay secret used to authenticate order creation and verify payment signatures. |

Never expose Gemini, reCAPTCHA secret, email-provider, or application signing keys in client-side code or commit them to the repository.
Support contact displayed by the app: `support.notesphere@gmail.com`.

Razorpay contributions are voluntary support for project hosting and upkeep; they are not represented as charitable or tax-deductible donations. The browser receives only the Razorpay key ID. Payment orders are created on the server, and successful checkout signatures are verified server-side.
