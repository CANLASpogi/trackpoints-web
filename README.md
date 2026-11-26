# TrackPoints — Website

The web version of the TrackPoints app ("Where progress meets payment").
It uses the **same Supabase database** as the Android app, so people can log in
with the same account on the phone or on the website and see the same projects,
messages, concerns and notifications.

## Languages used

| Part | Language |
|------|----------|
| Page structure | **HTML** (`index.html`) |
| Design (colors, layout, phone/desktop sizes) | **CSS** (`css/style.css`) |
| Everything that happens on the page | **JavaScript** (`js/*.js`) |
| Database, log-in, file storage | **Supabase** (PostgreSQL), through the official `supabase-js` library |

No build tools and nothing to install.

## How to open it

**Option 1: on your computer.** Unzip the folder and double-click `index.html`.
It opens in your browser. You need internet, because it connects to Supabase.

**Option 2: put it online (free).** Upload the whole folder to any static host:
- **Netlify**: drag the folder onto https://app.netlify.com/drop
- **GitHub Pages**: push the folder to a repository, then Settings → Pages → Deploy from branch
- **Vercel**: import the folder as a project

To try it without an account, click **Client**, **Freelancer** or **Admin**
under "Just looking? Try the demo" on the log-in page. Demo mode uses sample data
only and never touches the real database.

## What's inside

```
index.html          the page
css/style.css       all the design (cream/orange TrackPoints theme, mobile layout)
js/config.js        Supabase URL + public key (same as the Android app)
js/api.js           talks to the real database (same tables/functions as the app)
js/demo.js          sample data for demo mode
js/ui.js            shared helpers (buttons, pop-ups, icons, formatting)
js/auth.js          Log-in, Sign-up, Terms & Conditions, email code, Forgot password
js/pages.js         Client + Freelancer screens
js/admin.js         Admin screens
js/app.js           start-up, sidebar menu, page switching, notifications
assets/             TrackPoints logos (from the app)
```

## Features (matches the checklist)

**Everyone:** Log-in, Sign-up with a valid ID → **Terms and Conditions** → email code,
Forgot password, notifications bell, profile, change password. Warnings, suspensions
and bans show the same messages as the app.

**Client:** Dashboard, browse and hire Freelancers, **Projects tab with progress %**,
Send Points & Rate when a project reaches 100%, **Messaging** (text, photos, files),
Reports (chart + CSV export for Excel), **Submit Concern**.

**Freelancer:** Dashboard, accept or decline requests, **Projects tab with progress %**,
**Update progress %**, **Profile tab** (photo, specialty, portfolio),
**Account Verification** (upload ID for the Admin to review), **Messaging**, Reports,
**Submit Concern**.

**Admin:** Dashboard, **Requests tab** with **Project Request Approval** and
**Freelancer Account Verification** (view the uploaded ID, approve or reject),
**Concerns tab** (resolve / dismiss / re-open), **User Account Penalty System**
(warning, 24-hour suspension, 4-day suspension, permanent ban, lift penalty — the same levels the database applies automatically when a concern is resolved).

## Database notes

The website only uses tables, columns, functions and storage buckets that already
exist in the app:

- Tables: `users`, `commissions`, `messages`, `notifications`, `reports`
- Functions: `get_commissions_with_details`, `get_commissions_for_approval`,
  `get_my_inbox`, `get_admin_stats`, `get_user_commission_stats`,
  `get_freelancers_with_client_stats`, `check_if_email_exists`, `check_upcoming_deadlines`
- Storage buckets: `user_attachments`, `commission_attachments`, `report-evidence`

Things to check in Supabase:

1. **Penalties.** The Penalties page updates `offense_count`, `ban_until`,
   `is_permanently_banned` and `has_seen_warning` on the `users` table. Your Row
   Level Security policy must let the Admin update other users' rows (the app
   already does this when approving accounts, so it is probably allowed).
2. **Messages updating live.** Live chat uses Supabase Realtime on the `messages`
   table, the same as the app. If messages only show after a few seconds, the page
   is falling back to its 5-second refresh, which still works.
3. **Terms acceptance** is checked on the sign-up screen but not saved, because
   there is no column for it. Add one (for example `users.accepted_terms_at`) if your
   panel needs proof.
4. The app's **face check** during sign-up (camera) is phone-only. The website
   asks for the ID photo, and the Admin reviews it as usual.
