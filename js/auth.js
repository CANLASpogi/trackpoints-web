// TrackPoints Web — Log-in, Sign-up, Terms & Conditions, email code, Forgot password.
(function (TP) {
  const { esc, $, icon } = TP;

  TP.TERMS = `1. Introduction
These Terms and Conditions govern the use of the system and services provided. By accessing or using the system, all users agree to comply with the rules, responsibilities, and policies stated herein.

2. User Roles
The system includes the following user accounts:
Admin – Responsible for system management, monitoring, and enforcement of rules and penalties
Freelancer – Provides services, completes projects, and communicates with clients
Client – Requests services, approves outputs, and completes payments

3. Payment Terms
3.1 A non-refundable down payment of forty percent (40%) of the total project cost is required upon project approval before any work begins.
3.2 The remaining sixty percent (60%) must be paid upon project completion, prior to the release of final deliverables, files, or system access.
3.3 No final output, source code, or access credentials will be released until full payment (100%) has been completed.

4. Account Verification
4.1 Every new account must upload a valid ID. The Admin reviews it before the account can be used.
4.2 Freelancers must stay verified to receive project requests.

5. Concerns and Disputes
5.1 Clients and Freelancers may submit concerns through the Concerns tab.
5.2 The Admin will review each concern and mark it as resolved or dismissed.

6. Penalties
6.1 Violations of these terms may result in a warning, a temporary suspension, or a permanent ban, depending on severity and repetition.
6.2 A first resolved concern against an account results in a formal warning. Further violations may lead to suspension or a permanent ban.`;

  const bubbles = [
    [6, 2, 86], [78, 4, 50], [88, 12, 30], [92, 86, 110], [84, 92, 46], [4, 90, 100], [16, 94, 34], [60, 96, 60],
  ].map(([x, y, s]) => `<div class="bubble" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;transform:translate(-50%,-50%)"></div>`).join("");

  function layout(inner) {
    TP.root.innerHTML = `${TP.demoBanner()}<div class="auth">
      <div class="auth-brand"><div><img src="assets/trackpoints_logo.png" alt="TrackPoints — where progress meets payment"></div></div>
      <div class="auth-panel">${bubbles}<div class="auth-card">${inner}</div></div></div>`;
    TP.$$(".pw-wrap button").forEach((b) =>
      b.addEventListener("click", () => {
        const inp = b.previousElementSibling;
        inp.type = inp.type === "password" ? "text" : "password";
        b.innerHTML = inp.type === "password" ? icon.eyeOff : icon.eye;
      })
    );
    // remove the red outline as soon as the person edits the field
    TP.$$(".auth-input").forEach((i) => i.addEventListener("input", () => i.classList.remove("invalid")));
  }
  const pw = (id, ph) =>
    `<div class="pw-wrap"><input class="auth-input" id="${id}" type="password" placeholder="${ph}" autocomplete="${id === "password" ? "current-password" : "new-password"}"><button type="button" aria-label="Show password" style="color:var(--faint)">${icon.eyeOff}</button></div>`;
  // Outline one field in red (and focus it) and show the message under the form
  const bad = (id, msg) => {
    TP.$$(".auth-input.invalid").forEach((i) => i.classList.remove("invalid"));
    const f = id && $("#" + id);
    if (f) { f.classList.add("invalid"); f.focus(); }
    $("#err").style.color = "";
    $("#err").textContent = msg;
  };
  const head = (title) => `<div class="auth-avatar">${icon.person}</div><h1 class="auth-title">${esc(title)}</h1>`;

  // ---------------- LOG IN ----------------
  TP.showLogin = function (notice) {
    layout(`${head("Log-In")}
      <form id="f" novalidate>
        <input class="auth-input" id="email" type="email" placeholder="Email" autocomplete="email">
        ${pw("password", "Password")}
        <div class="error" id="err">${esc(notice || "")}</div>
        <button class="btn auth-submit" id="go">Log-In</button>
      </form>
      <div class="row between" style="margin-top:14px">
        <button class="link-btn" id="toSignup">No account yet? Sign-Up</button>
        <button class="link-btn" id="toForgot">Forgot Password</button>
      </div>
      <div class="auth-demo">
        <div class="bold" style="margin-bottom:4px">Just looking? Try the demo</div>
        <div class="small muted cond" style="margin-bottom:10px">Sample data only — nothing is saved to the real database.</div>
        <div class="row wrap">
          <button class="btn sm" data-demo="CLIENT">Client</button>
          <button class="btn sm" data-demo="FREELANCER">Freelancer</button>
          <button class="btn sm" data-demo="ADMIN">Admin</button>
        </div>
      </div>`);
    $("#toSignup").onclick = () => TP.showSignup();
    $("#toForgot").onclick = () => TP.showForgot();
    TP.$$("[data-demo]").forEach((b) => (b.onclick = () => TP.startDemo(b.dataset.demo)));
    $("#f").onsubmit = async (e) => {
      e.preventDefault();
      const email = $("#email").value.trim();
      const password = $("#password").value;
      const errEl = $("#err");
      if (!TP.validEmail(email)) return bad("email", "Email is invalid");
      if (!password) return bad("password", "Password is required");
      errEl.textContent = "";
      const btn = $("#go");
      btn.disabled = true;
      btn.textContent = "Logging in…";
      try {
        if (TP.api.mode === "demo") TP.useLive();
        await TP.api.signIn(email, password);
        await TP.enterApp();
      } catch (ex) {
        bad(null, ex.message);
        btn.disabled = false;
        btn.textContent = "Log-In";
      }
    };
  };

  // ---------------- SIGN UP (step 1: details) ----------------
  const draft = { role: "CLIENT" };
  TP.showSignup = function () {
    layout(`${head("Sign-Up")}
      <form id="f" novalidate>
        <input class="auth-input" id="fullname" placeholder="Full Name" value="${esc(draft.fullname || "")}" autocomplete="name">
        <input class="auth-input" id="email" type="email" placeholder="Email" value="${esc(draft.email || "")}" autocomplete="email">
        <input class="auth-input" id="phone" type="tel" placeholder="Phone Number (09XX XXX XXXX)" value="${esc(draft.phone || "")}" autocomplete="tel" inputmode="tel">
        ${pw("newpw", "Password")}
        ${pw("confirm", "Confirm Password")}
        <div class="bold small" style="margin:2px 0 6px">Sign up as</div>
        <div class="seg"><button type="button" data-role="CLIENT">Client</button><button type="button" data-role="FREELANCER">Freelancer</button></div>
        ${TP.smsOn() ? `<div class="bold small" style="margin:2px 0 6px">Send my verification code by</div>
        <div class="seg" id="via"><button type="button" data-via="EMAIL">Email</button><button type="button" data-via="PHONE">Email + Text message</button></div>` : ""}
        <div class="bold small" style="margin-bottom:6px">Valid ID <span class="muted cond">(the Admin checks this before approving your account)</span></div>
        <div class="upload" id="idBox" style="min-height:90px;margin-bottom:12px">${icon.upload}<div>Click to upload a photo of your valid ID</div></div>
        <div class="error" id="err"></div>
        <button class="btn auth-submit" id="go">Next</button>
      </form>
      <div style="text-align:center;margin-top:14px"><button class="link-btn" id="toLogin">Already have an account? Log-In</button></div>`);
    const setRole = (r) => {
      draft.role = r;
      TP.$$("[data-role]").forEach((b) => b.classList.toggle("on", b.dataset.role === r));
    };
    setRole(draft.role);
    const setVia = (v) => { draft.verifyBy = v; TP.$$("[data-via]").forEach((b) => b.classList.toggle("on", b.dataset.via === v)); };
    setVia(draft.verifyBy || "EMAIL");
    TP.$$("[data-via]").forEach((b) => (b.onclick = () => setVia(b.dataset.via)));
    TP.$$("[data-role]").forEach((b) => (b.onclick = () => setRole(b.dataset.role)));
    const getId = TP.bindUpload($("#idBox"));
    $("#toLogin").onclick = () => TP.showLogin();
    $("#f").onsubmit = async (e) => {
      e.preventDefault();
      const fullname = $("#fullname").value.trim();
      const email = $("#email").value.trim();
      const p1 = $("#newpw").value;
      const p2 = $("#confirm").value;
      const err = $("#err");
      const idFile = getId() || draft.idFile;
      if (fullname.length < 6) return bad("fullname", "Full name is too short (minimum is 6 characters)");
      if (!TP.validEmail(email)) return bad("email", "Email is invalid");
      const phone = TP.normPhone($("#phone").value);
      if (!phone) return bad("phone", "Enter a valid mobile number, e.g. 0917 123 4567");
      const pwMsg = TP.validatePassword(p1);
      if (pwMsg) return bad("newpw", pwMsg);
      if (p1 !== p2) return bad("confirm", "Passwords do not match");
      if (!idFile) return bad(null, "Please upload a photo of your valid ID.");
      err.textContent = "";
      const btn = $("#go");
      try {
        await TP.busy(btn, async () => {
          if (TP.api.mode === "demo") TP.useLive();
          if (await TP.api.emailExists(email)) throw new Error("This email is already registered");
        });
      } catch (ex) {
        bad(/already registered/.test(ex.message) ? "email" : null, ex.message);
        return;
      }
      Object.assign(draft, { fullname, email, phone, password: p1, idFile });
      TP.showTerms();
    };
  };

  // ---------------- SIGN UP (step 2: Terms and Conditions) ----------------
  TP.showTerms = function () {
    layout(`<h1 class="auth-title" style="font-size:38px;margin-bottom:6px">Terms & Conditions</h1>
      <p class="cond" style="text-align:center;margin:0 0 14px">Please read and accept before using TrackPoints</p>
      <div class="terms-box">${esc(TP.TERMS)}</div>
      <label class="check" style="margin:16px 0"><input type="checkbox" id="agree"> I have read and agree to the Terms and Conditions</label>
      <div class="error" id="err"></div>
      <div class="row" style="justify-content:flex-end;gap:14px"><button class="btn" id="decline">Decline</button><button class="btn primary" id="accept" disabled>Accept & Continue</button></div>`);
    $("#agree").onchange = (e) => ($("#accept").disabled = !e.target.checked);
    $("#decline").onclick = () => TP.showSignup();
    $("#accept").onclick = async () => {
      try {
        await TP.busy($("#accept"), () => TP.api.signUp(draft.email, draft.password));
        TP.showSignupCode();
      } catch (ex) {
        $("#err").textContent = ex.message;
      }
    };
  };

  // Code-expiry countdown + "Resend code" button.
  // The expiry time comes from config.js (OTP_EXPIRY_SECONDS) and must match Supabase's "Email OTP Expiration".
  // Supabase only allows one new code per minute, so the button waits 60 s after each send.
  function codeTimers(sendFn) {
    const btn = $("#resend"), exp = $("#expiry"), go = $("#go");
    const EXP = Number(window.TP_CONFIG.OTP_EXPIRY_SECONDS) || 3600;
    let expTimer = null, btnTimer = null;
    const fmt = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}:` : "") + String(Math.floor((s % 3600) / 60)).padStart(s >= 3600 ? 2 : 1, "0") + ":" + String(s % 60).padStart(2, "0");
    const startExpiry = () => {
      clearInterval(expTimer);
      const ends = Date.now() + EXP * 1000;
      const tick = () => {
        if (!exp.isConnected) return clearInterval(expTimer);
        const left = Math.max(0, Math.round((ends - Date.now()) / 1000));
        if (left > 0) {
          exp.className = "otp-timer" + (left <= 30 ? " soon" : "");
          exp.innerHTML = `Code expires in <b>${fmt(left)}</b>`;
          go.disabled = false;
        } else {
          clearInterval(expTimer);
          exp.className = "otp-timer expired";
          exp.innerHTML = "<b>Code expired.</b> Tap Resend code to get a new one.";
          go.disabled = true;
        }
      };
      tick();
      expTimer = setInterval(tick, 1000);
    };
    const cooldown = (secs) => {
      clearInterval(btnTimer);
      btn.disabled = true;
      let left = secs;
      const label = () => (btn.innerHTML = `Resend code <span class="faint">(${left}s)</span>`);
      label();
      btnTimer = setInterval(() => {
        left -= 1;
        if (!btn.isConnected) return clearInterval(btnTimer);
        if (left <= 0) { clearInterval(btnTimer); btn.disabled = false; btn.textContent = "Resend code"; }
        else label();
      }, 1000);
    };
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = "Sending…";
      try {
        await sendFn();
        TP.$$(".otp input").forEach((i) => (i.value = ""));
        const first = TP.$(".otp input");
        if (first) first.focus();
        $("#err").textContent = "";
        TP.toast("New code sent. Use the code in the newest email.");
        startExpiry();
        cooldown(60);
      } catch (e) {
        const m = (e && e.message) || "";
        const sec = (m.match(/(\d+)\s*seconds?/) || [])[1];
        TP.toast(sec ? `Please wait ${sec} seconds before asking for another code.` : m || "Could not send a new code.", true);
        cooldown(sec ? Number(sec) : 15);
      }
    };
    startExpiry(); // a code was just sent when this screen opened
    cooldown(60);
  }
  const codeError = (m) => (/expired|invalid/i.test(m) ? "That code is wrong or expired. Check you typed the newest code, or tap Resend code." : m);

  // 6-box code input; returns a getter
  function otp(container) {
    container.innerHTML = Array.from({ length: 6 }, () => '<input inputmode="numeric" maxlength="1" aria-label="Digit">').join("");
    const boxes = [...container.querySelectorAll("input")];
    boxes.forEach((b, i) => {
      b.addEventListener("input", () => {
        b.value = b.value.replace(/\D/g, "").slice(-1);
        if (b.value && boxes[i + 1]) boxes[i + 1].focus();
      });
      b.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !b.value && boxes[i - 1]) boxes[i - 1].focus();
      });
      b.addEventListener("paste", (e) => {
        const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
        if (!t) return;
        e.preventDefault();
        t.split("").forEach((c, j) => boxes[j] && (boxes[j].value = c));
        (boxes[t.length] || boxes[5]).focus();
      });
    });
    boxes[0].focus();
    return () => boxes.map((b) => b.value).join("");
  }

  // Generic "enter the 6-digit code" screen (used for email and text-message codes)
  function codeScreen({ title, where, onResend, onVerify, extraHtml = "", verifyLabel = "Verify" }) {
    layout(`${head(title)}
      <p class="cond" style="text-align:center;margin-top:-8px">We sent a 6-digit code to <b>${esc(where)}</b>.</p>
      <div class="otp" id="otp"></div><div class="otp-timer" id="expiry"></div>
      <div class="error" id="err" style="text-align:center"></div>
      <button class="btn auth-submit" id="go">${esc(verifyLabel)}</button>
      <button class="btn block" id="resend" type="button" style="margin-top:12px">Resend code</button>${extraHtml}`);
    const code = otp($("#otp"));
    codeTimers(onResend);
    $("#go").onclick = async () => {
      const c = code();
      if (c.length < 6) return ($("#err").textContent = "Please enter the 6-digit code");
      try { await TP.busy($("#go"), () => onVerify(c), true); }
      catch (ex) { $("#err").style.color = ""; $("#err").textContent = codeError(ex.message); }
    };
  }

  // Optional step right after sign-up: verify the phone number by text message
  function showPhoneVerify(phone, done) {
    codeScreen({
      title: "Verify Phone",
      where: phone,
      verifyLabel: "Verify Phone",
      onResend: () => TP.api.startPhoneVerify(TP.e164(phone)),
      onVerify: async (c) => { await TP.api.verifyPhoneCode(TP.e164(phone), c); done(true); },
      extraHtml: '<div style="text-align:center;margin-top:12px"><button class="link-btn" id="skip">Skip for now (you can verify it later in Profile)</button></div>',
    });
    $("#skip").onclick = () => done(false);
  }

  // ---------------- SIGN UP (step 3: email code) ----------------
  TP.showSignupCode = function () {
    layout(`${head("Verify Email")}
      <p class="cond" style="text-align:center;margin-top:-8px">We sent a verification code to <b>${esc(draft.email)}</b>. Enter the 6-digit code from the email.</p>
      <div class="otp" id="otp"></div><div class="otp-timer" id="expiry"></div>
      <div class="error" id="err" style="text-align:center"></div>
      <button class="btn auth-submit" id="go">Verify</button>
      <button class="btn block" id="resend" type="button" style="margin-top:12px">Resend code</button>`);
    const code = otp($("#otp"));
    codeTimers(() => TP.api.resendSignupOtp(draft.email));
    $("#go").onclick = async () => {
      const c = code();
      if (c.length < 6) return ($("#err").textContent = "Please enter the 6-digit code");
      try {
        await TP.busy($("#go"), async () => {
          await TP.api.verifySignupOtp(draft.email, c);
          const uid = await TP.api.currentUserId();
          const idUrl = await TP.api.uploadIdPhoto(uid, draft.idFile);
          await TP.api.updateUser(uid, {
            fullname: draft.fullname,
            email: draft.email,
            role: draft.role,
            verification_id_url: idUrl,
            verification_status: "PENDING",
            phone_number: draft.phone || null,
          });
        }, true);
        const email = draft.email, phone = draft.phone, viaPhone = draft.verifyBy === "PHONE";
        Object.keys(draft).forEach((k) => delete draft[k]);
        draft.role = "CLIENT";
        const finish = async (phoneOk) => {
          await TP.api.signOut();
          TP.showLogin(`Account created for ${email}${phoneOk ? " and your phone is verified" : ""}. Wait for the Admin to approve your account, then log in.`);
          $("#email").value = email;
          $("#err").style.color = "var(--green)";
        };
        if (viaPhone && phone && TP.smsOn()) {
          try { await TP.api.startPhoneVerify(TP.e164(phone)); showPhoneVerify(phone, finish); }
          catch (ex) { TP.toast(ex.message, true); finish(false); }
        } else finish(false);
      } catch (ex) {
        $("#err").textContent = codeError(ex.message);
      }
    };
  };

  // ---------------- FORGOT PASSWORD ----------------
  TP.showForgot = function (via) {
    via = TP.smsOn() ? via || "EMAIL" : "EMAIL";
    layout(`${head("Forgot Password")}
      ${TP.smsOn() ? `<div class="seg"><button type="button" data-via="EMAIL" class="${via === "EMAIL" ? "on" : ""}">Send code by Email</button><button type="button" data-via="PHONE" class="${via === "PHONE" ? "on" : ""}">Send code by Text</button></div>` : ""}
      <p class="cond" style="text-align:center;margin-top:${TP.smsOn() ? "4px" : "-8px"}">${via === "PHONE" ? "Enter the verified phone number on your account and we'll text you a code." : "Enter your email and we'll send you a code to reset your password."}</p>
      <form id="f" novalidate>${via === "PHONE"
        ? '<input class="auth-input" id="phone" type="tel" inputmode="tel" placeholder="Phone Number (09XX XXX XXXX)">'
        : '<input class="auth-input" id="email" type="email" placeholder="Email">'}
      <div class="error" id="err"></div><button class="btn auth-submit" id="go">Send Code</button></form>
      <div style="text-align:center;margin-top:14px"><button class="link-btn" id="back">Back to Log-In</button></div>`);
    $("#back").onclick = () => TP.showLogin();
    TP.$$("[data-via]").forEach((b) => (b.onclick = () => TP.showForgot(b.dataset.via)));
    $("#f").onsubmit = async (e) => {
      e.preventDefault();
      if (via === "PHONE") {
        const phone = TP.normPhone($("#phone").value);
        if (!phone) return bad("phone", "Enter a valid mobile number, e.g. 0917 123 4567");
        try {
          await TP.busy($("#go"), async () => { if (TP.api.mode === "demo") TP.useLive(); await TP.api.sendPhoneLoginCode(TP.e164(phone)); });
          codeScreen({
            title: "Check your phone",
            where: phone,
            verifyLabel: "Verify Code",
            onResend: () => TP.api.sendPhoneLoginCode(TP.e164(phone)),
            onVerify: async (c) => { await TP.api.verifyPhoneLoginCode(TP.e164(phone), c); showNewPassword(); },
            extraHtml: '<div style="text-align:center;margin-top:12px"><button class="link-btn" id="back2">Back to Log-In</button></div>',
          });
          $("#back2").onclick = () => TP.showLogin();
        } catch (ex) { $("#err").textContent = ex.message; }
        return;
      }
      const email = $("#email").value.trim();
      if (!TP.validEmail(email)) return bad("email", "Email is invalid");
      try {
        await TP.busy($("#go"), async () => {
          if (TP.api.mode === "demo") TP.useLive();
          await TP.api.sendPasswordReset(email);
        });
        showResetCode(email);
      } catch (ex) {
        $("#err").textContent = ex.message;
      }
    };
  };

  function showResetCode(email) {
    layout(`${head("Check your email")}
      <p class="cond" style="text-align:center;margin-top:-8px">We sent a verification code to <b>${esc(email)}</b>.</p>
      <div class="otp" id="otp"></div><div class="otp-timer" id="expiry"></div><div class="error" id="err" style="text-align:center"></div>
      <button class="btn auth-submit" id="go">Verify Code</button>
      <button class="btn block" id="resend" type="button" style="margin-top:12px">Resend code</button>
      <div style="text-align:center;margin-top:12px"><button class="link-btn" id="back">Back to Log-In</button></div>`);
    const code = otp($("#otp"));
    $("#back").onclick = () => TP.showLogin();
    codeTimers(() => TP.api.sendPasswordReset(email));
    $("#go").onclick = async () => {
      const c = code();
      if (c.length < 6) return ($("#err").textContent = "Please enter the 6-digit code");
      try {
        await TP.busy($("#go"), () => TP.api.verifyRecoveryOtp(email, c), true);
        showNewPassword();
      } catch (ex) {
        $("#err").textContent = codeError(ex.message);
      }
    };
  }

  function showNewPassword() {
    layout(`${head("New Password")}
      <form id="f" novalidate>${pw("newpw", "New Password")}${pw("confirm", "Confirm New Password")}
      <div class="error" id="err"></div><button class="btn auth-submit" id="go">Reset Password</button></form>`);
    $("#f").onsubmit = async (e) => {
      e.preventDefault();
      const p1 = $("#newpw").value;
      const msg = TP.validatePassword(p1);
      if (msg) return bad("newpw", msg);
      if (p1 !== $("#confirm").value) return bad("confirm", "Passwords do not match");
      try {
        await TP.busy($("#go"), async () => {
          await TP.api.updatePassword(p1);
          await TP.api.signOut();
        });
        TP.showLogin("Password changed. You can now log in.");
        $("#err").style.color = "var(--green)";
      } catch (ex) {
        $("#err").textContent = ex.message;
      }
    };
  }
})(window.TP);
