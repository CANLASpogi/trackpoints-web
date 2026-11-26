// TrackPoints Web — connection settings.
// These are the same Supabase project URL and public "anon" key used by the Android app
// (app/src/main/java/com/example/trackpoints/di/AppModule.kt), so the website and the app
// share one database: same accounts, projects, messages, concerns and notifications.
// The anon key is meant to be public; your Row Level Security policies protect the data.
window.TP_CONFIG = {
  SUPABASE_URL: "https://kumpledfudlhalkfbler.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1bXBsZWRmdWRsaGFsa2ZibGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5OTU1NzUsImV4cCI6MjA3ODU3MTU3NX0.cSuXkswu2Kw6yOscvXvq1OVN1EfdcKg77N8zKEgkcaM",

  // Storage buckets (same names as the app)
  BUCKET_USER: "user_attachments",
  BUCKET_CHAT: "commission_attachments",
  BUCKET_EVIDENCE: "report-evidence",

  // How long an email code (sign-up / forgot password) stays valid, in seconds.
  // Keep this the SAME as Supabase -> Authentication -> Sign In / Providers -> Email -> "Email OTP Expiration".
  OTP_EXPIRY_SECONDS: 3600,

  // Text-message (SMS) codes. Turn this on ONLY after an SMS provider (e.g. Twilio) is set up in
  // Supabase -> Authentication -> Sign In / Providers -> Phone. While false, every code is sent by email.
  SMS_ENABLED: false,

  // How often (ms) to refresh data, like the app's 5-second polling
  POLL_MS: 5000,
};
