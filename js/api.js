// TrackPoints Web — data layer for the real Supabase database.
// Every function mirrors a repository in the Android app (data/repository/*.kt),
// using the same tables, columns, RPC functions and storage buckets.
(function () {
  const C = window.TP_CONFIG;
  let sb = null;

  function client() {
    if (!sb) {
      if (!window.supabase) throw new Error("Could not load the Supabase library. Check your internet connection.");
      sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
    }
    return sb;
  }

  function check({ data, error }, friendly) {
    if (error) {
      console.error(error);
      throw new Error(friendly || error.message || "Something went wrong.");
    }
    return data;
  }

  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2));
  const ext = (file) => (file.name && file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "jpg");

  async function upload(bucket, path, file) {
    const s = client().storage.from(bucket);
    // upsert:false — file names are always unique, and some buckets have no UPDATE policy (upsert would be refused)
    check(await s.upload(path, file, { upsert: false, contentType: file.type || undefined }), "Upload failed.");
    return s.getPublicUrl(path).data.publicUrl;
  }

  // Make every project safe to display even if the client/freelancer row is missing (freelancer_id can be NULL)
  const fixK = (k) => ({
    ...k,
    points: Number(k.points || 0),
    progress_percentage: Number(k.progress_percentage || 0),
    client: k.client || { id: null, fullname: "Unknown user" },
    freelancer: k.freelancer || { id: null, fullname: "Unassigned" },
  });
  const fixInbox = (i) => ({ ...i, commission: fixK(i.commission || {}), chatmate: i.chatmate || { id: null, fullname: "Unknown user" } });

  window.SupabaseAPI = {
    mode: "live",

    // ---------- Auth (AuthRepository.kt) ----------
    async currentUserId() {
      const { data } = await client().auth.getSession();
      return data.session ? data.session.user.id : null;
    },
    async signIn(email, password) {
      check(await client().auth.signInWithPassword({ email, password }), "Invalid email or password");
    },
    async signUp(email, password) {
      const data = check(await client().auth.signUp({ email, password }), "Create account failed");
      return data.user ? data.user.id : null;
    },
    async verifySignupOtp(email, token) {
      check(await client().auth.verifyOtp({ email, token, type: "signup" }), "Token has expired or is invalid");
    },
    async resendSignupOtp(email) {
      check(await client().auth.resend({ type: "signup", email }));
    },
    async emailExists(email) {
      // Same function the Android app uses; falls back to the users-table check your web log-in page uses.
      const r = await client().rpc("check_if_email_exists", { email_to_check: email });
      if (!r.error) return r.data === true || r.data === "true";
      const { data } = await client().from("users").select("email").eq("email", email).maybeSingle();
      return !!data;
    },
    async sendPasswordReset(email) {
      check(await client().auth.resetPasswordForEmail(email));
    },
    async verifyRecoveryOtp(email, token) {
      check(await client().auth.verifyOtp({ email, token, type: "recovery" }), "Token has expired or is invalid");
    },
    async updatePassword(password) {
      const r = await client().auth.updateUser({ password });
      if (r.error) {
        const m = r.error.message || "";
        if (m.includes("different")) throw new Error("New password should be different from the old password");
        throw new Error(m || "Could not update password");
      }
    },
    // ----- Phone (SMS) codes — need an SMS provider set up in Supabase -----
    async authUser() {
      const { data } = await client().auth.getUser();
      return data ? data.user : null;
    },
    async startPhoneVerify(phone) {
      // adds the phone to the logged-in account and texts a 6-digit code to it
      check(await client().auth.updateUser({ phone }), "Could not send a text message. SMS may not be set up yet.");
    },
    async verifyPhoneCode(phone, token) {
      check(await client().auth.verifyOtp({ phone, token, type: "phone_change" }), "Token has expired or is invalid");
    },
    async sendPhoneLoginCode(phone) {
      // only works for accounts whose phone number was already verified
      const r = await client().auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
      if (r.error) throw new Error(/not found|signups not allowed/i.test(r.error.message) ? "No account has this verified phone number. Use your email instead." : r.error.message);
    },
    async verifyPhoneLoginCode(phone, token) {
      check(await client().auth.verifyOtp({ phone, token, type: "sms" }), "Token has expired or is invalid");
    },
    async signOut() {
      await client().auth.signOut();
    },

    // ---------- Users (UserRepository.kt) ----------
    async getUser(id) {
      return check(await client().from("users").select("*").eq("id", id).single());
    },
    async updateUser(id, updates) {
      return check(await client().from("users").update(updates).eq("id", id).select().single());
    },
    async touchLastSeen(id) {
      await client().from("users").update({ last_seen: new Date().toISOString() }).eq("id", id);
    },
    async getUsers() {
      return check(await client().from("users").select("*").neq("role", "null"));
    },
    async getFreelancers(clientId) {
      return check(await client().rpc("get_freelancers_with_client_stats", { p_client_id: clientId })) || [];
    },
    async getAdminStats() {
      return check(await client().rpc("get_admin_stats")) || {};
    },
    async getUserStats(id) {
      return check(await client().rpc("get_user_commission_stats", { input_user_id: id })) || {};
    },
    async setAccountApproval(userId, approve) {
      const upd = approve
        ? { is_approved: true, verification_status: "VERIFIED" }
        : { is_rejected: true, verification_status: "REJECTED" };
      check(await client().from("users").update(upd).eq("id", userId));
    },
    async uploadIdPhoto(userId, file) {
      return upload(C.BUCKET_USER, `${userId}/verification/id_${uuid()}.${ext(file)}`, file);
    },
    async uploadAvatar(userId, file) {
      const url = await upload(C.BUCKET_USER, `${userId}/profile_avatar/${uuid()}.${ext(file)}`, file);
      await this.updateUser(userId, { photo: url });
      return url;
    },
    async uploadPortfolio(userId, files) {
      const urls = [];
      for (const f of files) urls.push(await upload(C.BUCKET_USER, `${userId}/portfolio/${uuid()}.${ext(f)}`, f));
      return urls;
    },

    // ---------- Commissions / projects (CommissionRepository.kt) ----------
    async getCommissions(userId) {
      return (check(await client().rpc("get_commissions_with_details", { p_user_id: userId })) || []).map(fixK);
    },
    async getCommissionsForApproval() {
      return (check(await client().rpc("get_commissions_for_approval")) || []).map(fixK);
    },
    // Admin dashboard counts (get_admin_stats only returns users + total_points)
    async getAllCommissionsLite() {
      return check(await client().from("commissions").select("id,status,points")) || [];
    },
    async createCommission(req) {
      check(await client().from("commissions").insert(req));
    },
    async setCommissionStatus(id, status) {
      check(await client().from("commissions").update({ status }).eq("id", id));
    },
    async updateProgress(id, progress) {
      check(await client().from("commissions").update({ progress_percentage: progress }).eq("id", id));
    },
    async completeCommission(id, rating) {
      check(
        await client()
          .from("commissions")
          .update({ status: "DONE", date_paid: new Date().toISOString(), rating })
          .eq("id", id)
      );
    },
    async checkDeadlines() {
      await client().rpc("check_upcoming_deadlines");
    },

    // ---------- Messages (MessageRepository.kt) ----------
    async getInbox(userId) {
      return (check(await client().rpc("get_my_inbox", { my_id: userId })) || []).map(fixInbox);
    },
    async getChat(commissionId) {
      return (
        check(
          await client().from("messages").select("*").eq("commission_id", commissionId).order("created_at", { ascending: true })
        ) || []
      );
    },
    async sendMessage(msg) {
      check(await client().from("messages").insert(msg));
    },
    async markMessagesRead(commissionId, userId) {
      await client()
        .from("messages")
        .update({ read_at: true })
        .eq("commission_id", commissionId)
        .eq("receiver_id", userId)
        .eq("read_at", false);
    },
    async uploadChatFile(commissionId, file) {
      return upload(C.BUCKET_CHAT, `${commissionId}/${uuid()}.${ext(file)}`, file);
    },
    subscribeMessages(onInsert) {
      const ch = client()
        .channel("web_messages_" + uuid())
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => onInsert(p.new))
        .subscribe();
      return () => client().removeChannel(ch);
    },

    // ---------- Notifications (NotificationRepository.kt) ----------
    async getNotifications(userId) {
      return (
        check(await client().from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false })) || []
      );
    },
    async markNotificationRead(id) {
      await client().from("notifications").update({ is_read: true }).eq("id", id);
    },
    async markNotificationsRead(userId) {
      await client().from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    },

    // ---------- Concerns / reports (ReportRepository.kt) ----------
    async submitConcern(concern) {
      check(await client().from("reports").insert(concern));
    },
    async uploadEvidence(userId, file) {
      return upload(C.BUCKET_EVIDENCE, `${userId}/evidence_${Date.now()}.${ext(file)}`, file);
    },
    async getMyConcerns(userId) {
      return check(await client().from("reports").select("*").eq("reporter_id", userId).order("created_at", { ascending: false })) || [];
    },
    async getAllConcerns() {
      return check(await client().from("reports").select("*").order("created_at", { ascending: false })) || [];
    },
    async setConcernStatus(id, status) {
      check(await client().from("reports").update({ status }).eq("id", id));
    },

    // ---------- Penalties (users.offense_count / ban_until / is_permanently_banned) ----------
    async applyPenalty(userId, updates) {
      check(await client().from("users").update(updates).eq("id", userId), "Could not update the user's penalty.");
    },
  };
})();
