# Supabase Auth — strict invite-only admin sign-in

Status: **implemented in this workspace**. Custom JWT, local password hashes,
default admin credentials and public `signUp()` / public activation requests are
gone. Supabase Auth is the only identity provider for the admin SPA. The public
booking form stays anonymous.

The current flow is deliberately invitation-only:

1. The **superadmin** adds an email in **Admin access**.
2. The backend inserts an active `public.admin_profiles` row, then calls
   Supabase Auth Admin `inviteUserByEmail()` **from the trusted server only**.
   The email can be sent only to that exact allowlisted address.
3. The invitee opens the email link at `/admin/activate`, which establishes the
   implicit invite session and **requires an 8+ character password containing
   letters and numbers**.
4. Afterward the invitee signs in with email/password or with **Google**, using
   an email that already exists in Supabase Auth and has an active admin profile.
5. Every admin API request still verifies the Bearer token with
   `getClaims(access_token)` and `link_admin_profile()`; the exact active
   `admin_profiles` email/row is the final authority. Google cannot create a new
   admin account or promote a non-allowlisted identity.

## Supabase dashboard setup

Use these exact one-app values in **Authentication → URL Configuration**:

```text
Site URL
https://fenote.anatamabraham.workers.dev

Redirect URLs
https://fenote.anatamabraham.workers.dev/**
https://fenote.anatamabraham.workers.dev/admin/**
https://fenote.anatamabraham.workers.dev/admin/activate
```

`https://fenote.anatamabraham.workers.dev/admin/activate` is also the
`redirectTo` passed by the backend to `inviteUserByEmail()`. Keep the default
**Invite user** email template using `{{ .ConfirmationURL }}` so that redirect
is honored. Site URL must be the **root**, not `/admin`.

In **Authentication → Providers**:

- **Email**: turn **Allow new users to sign up OFF**; keep **Confirm email ON**.
  With public signups disabled, only users already present in Supabase Auth may
  sign in. There is no public browser `signUp()` call and no public activation
  endpoint.
- **Google**: may stay enabled for existing admins. Add the Supabase callback
  URL shown on that page to Google's Authorized redirect URIs. Google client
  secrets stay in Supabase/Google, never in this repo.
- Optional local URLs only: `http://localhost:5173/**` and
  `http://localhost:5174/**`.

`inviteUserByEmail()` does not support PKCE: the default invite link returns
tokens in the URL hash. The activation page uses an isolated implicit-flow
browser client, exchanges the invite tokens, verifies the active admin profile
with the invite token, calls `updateUser({password})`, proves the password can
sign in, then signs the temporary session out and sends the admin to the normal
sign-in page. Both activation and password reset use the shared 8+ character
policy (letters and numbers) with show/hide eye toggles. Supabase Auth stores
passwords as salted bcrypt hashes; this app never stores a plaintext password
or hash. Set Supabase's password-strength minimum to at least 8 characters so
the dashboard agrees with the UI.

## Cloudflare Worker secret

The Auth Admin API needs the Supabase **secret key** on the trusted server.
Put it **only** in the Cloudflare Worker secret
store, never in `wrangler.jsonc` `[vars]`, `VITE_*`, source, patch, ZIP,
frontend, chat, or an env file committed to Git:

```bash
cd /path/to/psychiatrist
npx wrangler secret put SUPABASE_SECRET_KEY
# Paste the Supabase secret key when prompted. Do not echo it in logs/chat.
```

Or use the same Worker → **Settings → Variables and Secrets → Add secret** with
name `SUPABASE_SECRET_KEY`. The backend reads it lazily inside the authenticated
superadmin request handler; no client is created at Worker global scope.

`SUPABASE_URL` and the `sb_publishable_*` key remain ordinary runtime vars and
build-time Vite values. The publishable key is not a Bearer token, not a JWT
secret, and is never substituted for the secret key. Rotation of any previously
pasted DB password, email/app password, JWT secret or API key is still required.

## Backend

- `admin-app/backend/src/utils/supabaseAdmin.js` — creates a per-request Auth
  Admin client from `SUPABASE_URL` + `SUPABASE_SECRET_KEY`; refuses a
  publishable key.
- `admin-app/backend/src/controllers/adminProfileController.js` — `POST /admins`
  inserts the allowlist row, sends the invite, and rolls back the row if the
  email cannot be sent. `POST /admins/:id/invite` resends only for an existing
  active row. Both are superadmin-only; resends are rate-limited.
- `admin-app/backend/src/middleware/authMiddleware.js` — verifies access tokens
  with `getClaims()` and resolves the exact active `admin_profiles` row through
  `link_admin_profile()`. This remains the final check for password and Google
  sessions.
- `admin-app/backend/src/routes/adminProfileRoutes.js` — no public
  `/admins/activation/request` route. `GET/POST/PUT/DELETE /admins` and
  `POST /admins/:id/invite` are protected.

## Frontend

- `lib/supabase.js` — normal browser client (PKCE) plus an isolated,
  non-persistent `inviteSupabase` client (implicit flow) for invite links.
- `context/AuthContext.jsx` — `getSession()`, `onAuthStateChange`, Google OAuth,
  and `/admins/me`; an OAuth identity without an active admin profile is not
  treated as an authenticated admin.
- `pages/ActivateAccount.jsx` — accepts only a valid Supabase invitation link,
  requires the 8+ character password, and has no public request form.
- `pages/Login.jsx` — email/password + Google for existing admins; the link to
  `/activate` says **Have an invitation? Set your password**.
- `pages/Admins.jsx` — superadmin-only email list, add/disable/enable/remove and
  **Resend invite**.
- `services/api.js` — `adminProfileAPI` only; no public activation API.

## Fresh SQL order remains unchanged

Run on a **fresh/empty** database only:

1. `00_schema_clean.sql`
2. optional `05_optional_mock_content.sql`
3. `01_rls.sql`
4. `04_storage_and_admin_bootstrap.sql`

Replace `<SUPERADMIN_EMAIL>` in `04` with the exact invited email. No schema
migration, Auth user creation, Storage upload, hosted email test, GitHub push,
Cloudflare deploy, or commit was performed here. `01_rls.sql` still contains
`admin_activation_status()` from the earlier design; it is no longer called by
the application and is harmless on a fresh database.
