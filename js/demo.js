// TrackPoints Web — DEMO data layer.
// Same functions as api.js but everything is kept in memory with sample data,
// so you can click through every screen without an account. Nothing is saved
// to the real database and the data resets when you reload the page.
(function () {
  const now = Date.now();
  const day = 86400000;
  const iso = (ms) => new Date(ms).toISOString();
  const id = () => "d" + Math.random().toString(36).slice(2, 10);

  const users = [
    { id: "admin", email: "admin@trackpoints.com", fullname: "Admin", role: "ADMIN", is_approved: true, verification_status: "VERIFIED" },
    { id: "c1", email: "maria@email.com", fullname: "Maria Santos", role: "CLIENT", is_approved: true, phone_number: "+63 912 345 6789", verification_status: "VERIFIED" },
    { id: "f1", email: "juan@email.com", fullname: "Juan Dela Cruz", role: "FREELANCER", is_approved: true, specialty: "UI/UX Designer", rating: 4.8, phone_number: "+63 917 222 3344", verification_status: "VERIFIED", portfolio: [] },
    { id: "f2", email: "ana@email.com", fullname: "Ana Reyes", role: "FREELANCER", is_approved: true, specialty: "Web Developer", rating: 4.6, verification_status: "VERIFIED", offense_count: 1, has_seen_warning: true },
    { id: "f3", email: "leah@email.com", fullname: "Leah Gomez", role: "FREELANCER", is_approved: true, specialty: "Graphic Artist", rating: 4.2, offense_count: 4, is_permanently_banned: true },
    { id: "c2", email: "mark@email.com", fullname: "Mark Lim", role: "CLIENT", is_approved: true, offense_count: 2, ban_until: iso(now + 5 * day) },
    { id: "c3", email: "grace@email.com", fullname: "Grace Tan", role: "CLIENT", is_approved: true },
    { id: "p1", email: "paolo@email.com", fullname: "Paolo Cruz", role: "FREELANCER", is_approved: false, specialty: "Mobile Developer", verification_status: "PENDING", verification_id_url: "assets/trackpoints_logo.png" },
    { id: "p2", email: "rina@email.com", fullname: "Rina Lopez", role: "CLIENT", is_approved: false, verification_status: "PENDING", verification_id_url: "assets/trackpoints_logo.png" },
  ].map((u, i) => ({
    phone_number: null, photo: null, specialty: null, portfolio: [], rating: 5.0, verification_id_url: "",
    verification_status: "UNVERIFIED", offense_count: 0, has_seen_warning: false, ban_until: null,
    is_permanently_banned: false, is_rejected: false, created_at: iso(now - (40 - i) * day), last_seen: iso(now - i * 3600000),
    ...u,
  }));

  const C = (o) => ({ rating: null, rejection_reason: null, date_paid: null, progress_percentage: 0, created_at: iso(now - 10 * day), ...o });
  const commissions = [
    C({ id: "k1", name: "Mobile App UI", description: "Design 12 screens for a food delivery app.", client_id: "c1", freelancer_id: "f1", status: "IN_PROGRESS", points: 15000, progress_percentage: 45, due_date: iso(now + 12 * day) }),
    C({ id: "k2", name: "Company Website", description: "Landing page and 4 inner pages.", client_id: "c1", freelancer_id: "f2", status: "IN_PROGRESS", points: 30000, progress_percentage: 100, due_date: iso(now + 3 * day) }),
    C({ id: "k3", name: "Logo Redesign", description: "Modern logo with brand colors.", client_id: "c1", freelancer_id: "f1", status: "PENDING", points: 5000, due_date: iso(now + 20 * day) }),
    C({ id: "k4", name: "Social Media Kit", description: "20 post templates.", client_id: "c1", freelancer_id: "f1", status: "DONE", points: 8000, progress_percentage: 100, rating: 5, date_paid: iso(now - 4 * day), due_date: iso(now - 5 * day) }),
    C({ id: "k5", name: "Inventory System", description: "Simple stock tracking web app.", client_id: "c1", freelancer_id: "f2", status: "REJECTED_BY_FREELANCER", points: 45000, due_date: iso(now + 30 * day) }),
    C({ id: "k6", name: "Event Poster", description: "A3 poster for a school event.", client_id: "c3", freelancer_id: "f1", status: "FOR_ADMIN_APPROVAL", points: 3000, due_date: iso(now + 9 * day), created_at: iso(now - 1 * day) }),
    C({ id: "k7", name: "Pitch Deck", description: "15-slide investor deck.", client_id: "c2", freelancer_id: "f2", status: "FOR_ADMIN_APPROVAL", points: 12000, due_date: iso(now + 14 * day), created_at: iso(now - 2 * day) }),
  ];

  const M = (o) => ({ id: id(), message_type: "TEXT", attachment_url: null, attachment_name: null, attachment_mime: null, read_at: true, ...o });
  const messages = [
    M({ commission_id: "k1", sender_id: "c1", receiver_id: "f1", content: "Hi! How's the project going?", created_at: iso(now - 50 * 60000) }),
    M({ commission_id: "k1", sender_id: "f1", receiver_id: "c1", content: "Going well! I finished the layout and I'm now on the main screens.", created_at: iso(now - 45 * 60000) }),
    M({ commission_id: "k1", sender_id: "f1", receiver_id: "c1", content: "I updated the progress to 45%.", created_at: iso(now - 44 * 60000), read_at: false }),
    M({ commission_id: "k2", sender_id: "f2", receiver_id: "c1", content: "The website is done — please check and send the points when you're happy.", created_at: iso(now - 3 * 3600000), read_at: false }),
    M({ commission_id: "k4", sender_id: "c1", receiver_id: "f1", content: "Thank you for the quick turnaround!", created_at: iso(now - 4 * day) }),
  ];

  const notifications = [
    { id: id(), user_id: "c1", commission_id: "k1", message: 'Juan Dela Cruz updated "Mobile App UI" to 45%.', is_read: false, created_at: iso(now - 44 * 60000) },
    { id: id(), user_id: "c1", commission_id: "k2", message: '"Company Website" is due in 3 days.', is_read: false, created_at: iso(now - day) },
    { id: id(), user_id: "c1", commission_id: "k2", message: 'New message from Ana Reyes about "Company Website".', is_read: false, created_at: iso(now - 3 * 3600000) },
    { id: id(), user_id: "c1", message: 'Your concern "Freelancer declined after agreeing" was submitted. The Admin will review it.', is_read: true, created_at: iso(now - 2 * day) },
    { id: id(), user_id: "c1", message: "Your account has been approved. Welcome to TrackPoints!", is_read: true, created_at: iso(now - 30 * day) },
    { id: id(), user_id: "f1", commission_id: "k3", message: 'A new project "Logo Redesign" has been approved and is waiting for you.', is_read: false, created_at: iso(now - 2 * 3600000) },
    { id: id(), user_id: "f1", commission_id: "k1", message: 'New message from Maria Santos about "Mobile App UI".', is_read: false, created_at: iso(now - 50 * 60000) },
    { id: id(), user_id: "f1", message: "Your ID has been verified. Your account now shows a Verified badge.", is_read: true, created_at: iso(now - 20 * day) },
    { id: id(), user_id: "admin", message: "New commission submission requires approval: Event Poster", is_read: false, created_at: iso(now - 3600000) },
    { id: id(), user_id: "admin", message: "Paolo Cruz submitted an ID for verification.", is_read: false, created_at: iso(now - 2 * 3600000) },
    { id: id(), user_id: "admin", message: "Ana Reyes filed a concern against Mark Lim.", is_read: false, created_at: iso(now - day) },
  ];

  const reports = [
    { id: "r1", reporter_id: "c1", reported_id: "f2", commission_id: "k5", category: "PROJECT_ISSUES", sub_type: "Freelancer declined after agreeing", description: "We agreed on the scope in chat but the request was declined.", evidence_url: null, status: "PENDING", created_at: iso(now - 2 * day) },
    { id: "r2", reporter_id: "f2", reported_id: "c2", commission_id: null, category: "USER_BEHAVIOR", sub_type: "Abusive messages", description: "The client sent rude messages.", evidence_url: null, status: "PENDING", created_at: iso(now - day) },
    { id: "r3", reporter_id: "c3", reported_id: "f3", commission_id: null, category: "PAYMENT_ISSUES", sub_type: "Asked for payment outside the app", description: null, evidence_url: null, status: "RESOLVED", created_at: iso(now - 12 * day) },
  ];

  let session = null;
  const U = (uid) => users.find((u) => u.id === uid);
  const wait = (v) => new Promise((r) => setTimeout(() => r(v), 120));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const fileUrl = (f) => URL.createObjectURL(f);
  const withUsers = (k) => ({ ...k, client: clone(U(k.client_id)), freelancer: clone(U(k.freelancer_id)) });
  const listeners = new Set();

  window.DemoAPI = {
    mode: "demo",
    loginAs(role) {
      session = { ADMIN: "admin", CLIENT: "c1", FREELANCER: "f1" }[role];
    },
    async currentUserId() { return session; },
    async signIn(email) {
      const u = users.find((x) => x.email.toLowerCase() === String(email).toLowerCase());
      if (!u) throw new Error("Invalid email or password");
      session = u.id;
      return wait();
    },
    async signUp(email) {
      const nid = id();
      users.push({ ...clone(users[6]), id: nid, email, fullname: "New User", is_approved: false, verification_status: "PENDING", created_at: iso(Date.now()) });
      session = nid;
      return wait(nid);
    },
    async verifySignupOtp() { return wait(); },
    async resendSignupOtp() { return wait(); },
    async emailExists(email) { return wait(users.some((u) => u.email === email)); },
    async sendPasswordReset() { return wait(); },
    async verifyRecoveryOtp() { return wait(); },
    async updatePassword() { return wait(); },
    async authUser() { const u = U(session); return u ? { id: u.id, phone: u.phone_verified ? String(u.phone_number || "").replace(/\D/g, "") : null, phone_confirmed_at: u.phone_verified ? iso(Date.now()) : null } : null; },
    async startPhoneVerify() { return wait(); },
    async verifyPhoneCode() { const u = U(session); if (u) u.phone_verified = true; return wait(); },
    async sendPhoneLoginCode() { return wait(); },
    async verifyPhoneLoginCode() { return wait(); },
    async signOut() { session = null; return wait(); },

    async getUser(uid) { const u = U(uid); if (!u) throw new Error("User not found"); return wait(clone(u)); },
    async updateUser(uid, upd) { Object.assign(U(uid), upd); return wait(clone(U(uid))); },
    async touchLastSeen(uid) { if (U(uid)) U(uid).last_seen = iso(Date.now()); },
    async getUsers() { return wait(clone(users)); },
    async getFreelancers(cid) {
      return wait(users.filter((u) => u.role === "FREELANCER" && u.is_approved).map((u) => {
        const mine = commissions.filter((k) => k.freelancer_id === u.id);
        return { ...clone(u), total_projects: mine.length, projects_together: mine.filter((k) => k.client_id === cid).length, is_recent: mine.some((k) => k.client_id === cid) };
      }));
    },
    async getAdminStats() {
      // same shape as the real get_admin_stats function
      return wait({ users: clone(users), total_points: commissions.filter((k) => k.status === "DONE").reduce((s, k) => s + k.points, 0) });
    },
    async getAllCommissionsLite() { return wait(commissions.map((k) => ({ id: k.id, status: k.status, points: k.points }))); },
    async getUserStats(uid) {
      const mine = commissions.filter((k) => k.client_id === uid || k.freelancer_id === uid);
      return wait({
        total_commissions: mine.length,
        in_progress: mine.filter((k) => k.status === "IN_PROGRESS").length,
        completed: mine.filter((k) => k.status === "DONE").length,
        total_points: mine.filter((k) => k.status === "DONE").reduce((s, k) => s + k.points, 0),
      });
    },
    async setAccountApproval(uid, ok) {
      Object.assign(U(uid), ok ? { is_approved: true, verification_status: "VERIFIED" } : { is_rejected: true, verification_status: "REJECTED" });
      return wait();
    },
    async uploadIdPhoto(uid, f) { return wait(fileUrl(f)); },
    async uploadAvatar(uid, f) { const u = fileUrl(f); U(uid).photo = u; return wait(u); },
    async uploadPortfolio(uid, files) { return wait([...files].map(fileUrl)); },

    async getCommissions(uid) {
      return wait(commissions.filter((k) => k.client_id === uid || k.freelancer_id === uid).map(withUsers).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    async getCommissionsForApproval() { return wait(commissions.filter((k) => k.status === "FOR_ADMIN_APPROVAL").map(withUsers)); },
    async createCommission(req) { commissions.unshift(C({ id: id(), ...req })); return wait(); },
    async setCommissionStatus(kid, status) { commissions.find((k) => k.id === kid).status = status; return wait(); },
    async updateProgress(kid, p) { commissions.find((k) => k.id === kid).progress_percentage = p; return wait(); },
    async completeCommission(kid, rating) { Object.assign(commissions.find((k) => k.id === kid), { status: "DONE", rating, date_paid: iso(Date.now()) }); return wait(); },
    async checkDeadlines() {},

    async getInbox(uid) {
      const out = [];
      for (const k of commissions) {
        if (k.client_id !== uid && k.freelancer_id !== uid) continue;
        if (!["IN_PROGRESS", "DONE", "PENDING"].includes(k.status)) continue;
        const ms = messages.filter((m) => m.commission_id === k.id);
        const last = ms[ms.length - 1];
        const other = U(k.client_id === uid ? k.freelancer_id : k.client_id);
        out.push({
          commission: withUsers(k), chatmate: clone(other),
          last_message: last ? clone(last) : { content: "No messages yet", message_type: "TEXT", created_at: k.created_at, sender_id: "" },
          is_from_me: last ? last.sender_id === uid : false,
          unread_count: ms.filter((m) => m.receiver_id === uid && !m.read_at).length,
        });
      }
      return wait(out.sort((a, b) => b.last_message.created_at.localeCompare(a.last_message.created_at)));
    },
    async getChat(kid) { return wait(clone(messages.filter((m) => m.commission_id === kid))); },
    async sendMessage(msg) {
      const m = M({ ...msg, id: id(), read_at: false, created_at: iso(Date.now()) });
      messages.push(m);
      listeners.forEach((fn) => fn(clone(m)));
      return wait();
    },
    async markMessagesRead(kid, uid) { messages.forEach((m) => { if (m.commission_id === kid && m.receiver_id === uid) m.read_at = true; }); },
    async uploadChatFile(kid, f) { return wait(fileUrl(f)); },
    subscribeMessages(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    async getNotifications(uid) { return wait(clone(notifications.filter((n) => n.user_id === uid))); },
    async markNotificationRead(nid) { const n = notifications.find((x) => x.id === nid); if (n) n.is_read = true; },
    async markNotificationsRead(uid) { notifications.forEach((n) => { if (n.user_id === uid) n.is_read = true; }); },

    async submitConcern(c) { reports.unshift({ id: id(), status: "PENDING", created_at: iso(Date.now()), ...c }); return wait(); },
    async uploadEvidence(uid, f) { return wait(fileUrl(f)); },
    async getMyConcerns(uid) { return wait(clone(reports.filter((r) => r.reporter_id === uid))); },
    async getAllConcerns() { return wait(clone(reports)); },
    async setConcernStatus(rid, status) {
      const r = reports.find((x) => x.id === rid);
      const was = r.status;
      r.status = status;
      // same as the real database trigger handle_report_penalty
      if (status === "RESOLVED" && was !== "RESOLVED") {
        const u = U(r.reported_id);
        const n = (u.offense_count || 0) + 1;
        u.offense_count = n;
        if (n === 2) u.ban_until = iso(Date.now() + 86400000);
        if (n === 3) u.ban_until = iso(Date.now() + 4 * 86400000);
        u.is_permanently_banned = n >= 4;
      }
      return wait();
    },
    async applyPenalty(uid, upd) { Object.assign(U(uid), upd); return wait(); },
  };
})();
