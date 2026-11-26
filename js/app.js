// TrackPoints Web — start-up, sidebar layout, page switching, notifications.
(function (TP) {
  const { esc, $, icon } = TP;
  TP.root = document.getElementById("app");
  TP.api = window.SupabaseAPI;
  TP.pages = TP.pages || {};
  let pollTimer = null;
  let notifs = [];
  let seenNotifs = new Set();
  let notifsLoaded = false;

  TP.useLive = () => (TP.api = window.SupabaseAPI);
  TP.demoBanner = () =>
    TP.api.mode === "demo" && !new URLSearchParams(location.search).has("clean")
      ? `<div class="demo-banner">DEMO MODE — sample data only, nothing is saved. <button id="exitDemo">Exit demo</button></div>`
      : "";
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "exitDemo") TP.logout();
  });

  // Sidebar menu for each role. [route, label, icon]
  const NAV = {
    CLIENT: [["dashboard", "Dashboard", "home"], ["freelancers", "Freelancers", "users"], ["projects", "Projects", "folder"], ["messages", "Messages", "chat"], ["reports", "Reports", "chart"], ["concerns", "Concerns", "flag"], ["profile", "Profile", "user"]],
    FREELANCER: [["dashboard", "Dashboard", "home"], ["projects", "Projects", "folder"], ["messages", "Messages", "chat"], ["profile", "Profile", "user"], ["reports", "Reports", "chart"], ["concerns", "Concerns", "flag"]],
    ADMIN: [["dashboard", "Dashboard", "home"], ["requests", "Requests", "file"], ["concerns", "Concerns", "flag"], ["penalties", "Penalties", "warn"], ["profile", "Settings", "gear"]],
  };

  TP.startDemo = async (role) => {
    TP.api = window.DemoAPI;
    TP.api.loginAs(role);
    await TP.enterApp();
  };

  TP.logout = async () => {
    clearInterval(pollTimer);
    if (TP.unsubChat) TP.unsubChat();
    try { await TP.api.signOut(); } catch (e) { /* ignore */ }
    TP.me = null;
    seenNotifs = new Set();
    notifsLoaded = false;
    TP.useLive();
    const t = document.querySelector(".toast");
    if (t) t.classList.add("hidden");
    history.replaceState(null, "", location.pathname);
    TP.showLogin();
  };

  // Called after log-in or when an existing session is found.
  TP.enterApp = async () => {
    const uid = await TP.api.currentUserId();
    if (!uid) return TP.showLogin();
    let me;
    try {
      me = await TP.api.getUser(uid);
    } catch (e) {
      await TP.api.signOut();
      return TP.showLogin("Could not load your account. " + e.message);
    }
    // Same checks as LoginViewModel.kt
    if (me.is_rejected) { await TP.api.signOut(); return TP.showLogin("Admin rejected your account request"); }
    if (!me.is_approved) { await TP.api.signOut(); return TP.showLogin("Wait for admin's approval of your account"); }
    TP.me = me;

    // Same rules as User.getRestrictionMessage() in the app
    if (me.is_permanently_banned) return restricted("Account Banned", "Your account has been permanently banned due to multiple violations of our terms.", true);
    if (me.ban_until && new Date(me.ban_until) > new Date()) {
      const ms = new Date(me.ban_until) - new Date();
      const left = ms >= 86400000 ? Math.floor(ms / 86400000) + " days" : ms >= 3600000 ? Math.floor(ms / 3600000) + " hours" : Math.max(1, Math.floor(ms / 60000)) + " minutes";
      return restricted("Temporary Suspension", `Your account is temporarily suspended. You can log in again in ${left}.`, true);
    }
    if (me.offense_count === 1 && !me.has_seen_warning) {
      return restricted("Warning", "Warning: A formal concern has been resolved against your account. Further violations regarding user behavior or content may lead to temporary suspension or a permanent ban.", false);
    }
    startApp();
  };

  function restricted(title, message, logout) {
    TP.root.innerHTML = `<div class="overlay" style="background:var(--cream)"><div class="modal" style="width:min(480px,100%);text-align:center">
      <div style="color:${logout ? "var(--red)" : "#c25a00"}">${icon.warn.replace("<svg", '<svg width="54" height="54"')}</div>
      <h2>${esc(title)}</h2><p class="cond" style="line-height:1.5;margin:0">${esc(message)}</p>
      <button class="btn primary" id="ok" style="align-self:center">Understood</button></div></div>`;
    $("#ok").onclick = async () => {
      if (logout) return TP.logout();
      try { await TP.api.updateUser(TP.me.id, { has_seen_warning: true }); } catch (e) { /* ignore */ }
      startApp();
    };
  }

  function startApp() {
    const role = TP.me.role;
    TP.root.innerHTML = `${TP.demoBanner()}<div class="shell">
      <aside class="sidebar" id="sidebar">
        <img class="logo" src="assets/trackpoints_whole_logo.png" alt="TrackPoints">
        <nav class="nav" id="nav">${NAV[role]
          .map(([r, l, ic]) => `<button data-route="${r}">${icon[ic]}<span>${l}</span><span class="badge hidden" data-badge="${r}"></span></button>`)
          .join("")}</nav>
        <div class="me">${TP.avatar(TP.me, 52)}<div class="grow"><div class="bold" style="font-size:14px">${TP.uname(TP.me)}</div><div class="cond small muted" style="overflow:hidden;text-overflow:ellipsis">${esc(TP.me.email)}</div></div></div>
        <button class="signout" id="signout">${icon.out} Sign-out</button>
      </aside>
      <div class="main">
        <header class="topbar"><div class="row"><button class="menu-toggle" id="menuBtn" aria-label="Menu">${icon.menu}</button><h1 id="pageTitle"></h1></div>
          <button class="bell" id="bell" aria-label="Notifications">${icon.bell}<span class="dot hidden" id="bellDot"></span></button></header>
        <div class="popover hidden" id="notifPop"></div>
        <main class="content" id="content"></main>
      </div></div>`;
    TP.$$("#nav [data-route]").forEach((b) => (b.onclick = () => go(b.dataset.route)));
    $("#signout").onclick = async () => { if (await TP.confirm("Sign out", "Are you sure you want to sign out?", "Sign out")) TP.logout(); };
    $("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");
    $("#bell").onclick = toggleNotifications;
    document.addEventListener("click", (e) => {
      const pop = $("#notifPop");
      if (pop && !pop.classList.contains("hidden") && !pop.contains(e.target) && !$("#bell").contains(e.target)) pop.classList.add("hidden");
    });
    window.onhashchange = route;
    if (role !== "ADMIN") TP.api.checkDeadlines().catch(() => {});
    route();
    clearInterval(pollTimer);
    poll();
    pollTimer = setInterval(poll, window.TP_CONFIG.POLL_MS);
  }

  function go(r) {
    if (location.hash === "#/" + r) route();
    else location.hash = "#/" + r;
  }
  TP.go = go;

  async function route() {
    if (!TP.me) return;
    const role = TP.me.role;
    let [name, arg] = location.hash.replace(/^#\/?/, "").split("/");
    const allowed = NAV[role].map((n) => n[0]).concat(role !== "ADMIN" ? ["verify"] : []);
    if (!allowed.includes(name)) name = "dashboard";
    const page = TP.pages[role + ":" + name] || TP.pages[name];
    TP.$$("#nav [data-route]").forEach((b) => b.classList.toggle("active", b.dataset.route === name || (name === "verify" && b.dataset.route === "profile")));
    markSeen(name === "verify" ? "profile" : name);
    if (name === "dashboard") markSeen("dashboard");
    TP.updateBadges();
    $("#sidebar").classList.remove("open");
    if (TP.unsubChat) { TP.unsubChat(); TP.unsubChat = null; }
    TP.onPoll = null;
    const content = $("#content");
    $("#pageTitle").textContent = page.title(role);
    content.innerHTML = '<div class="empty">Loading…</div>';
    try {
      await page.render(content, arg ? decodeURIComponent(arg) : null);
    } catch (e) {
      console.error(e);
      content.innerHTML = `<div class="card"><h2>Something went wrong</h2><p class="cond">${esc(e.message)}</p><button class="btn primary" onclick="location.reload()">Reload</button></div>`;
    }
  }
  TP.refresh = route;

  async function poll() {
    if (!TP.me) return;
    try {
      TP.api.touchLastSeen(TP.me.id);
      notifs = await TP.api.getNotifications(TP.me.id);
      // Pop up any notification that arrived since the last check (not the old ones on first load)
      const fresh = notifs.filter((n) => !n.is_read && !seenNotifs.has(n.id));
      notifs.forEach((n) => seenNotifs.add(n.id));
      if (notifsLoaded && fresh.length) {
        const newest = [...fresh].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
        TP.toast("🔔 " + newest.message + (fresh.length > 1 ? `  (+${fresh.length - 1} more)` : "") + "  — tap to open", false, () => openNotification(newest));
      }
      notifsLoaded = true;
      const dot = $("#bellDot");
      if (dot) dot.classList.toggle("hidden", !notifs.some((n) => !n.is_read));
      await updateBadges();
      if (TP.onPoll) await TP.onPoll();
    } catch (e) {
      console.warn("poll", e);
    }
  }
  TP.poll = poll;

  // ---------- Sidebar red badges ----------
  // A number = things waiting for you (unread messages, requests to review…).
  // A red dot = new notifications about that section since you last opened it.
  const seenKey = (r) => `tp_seen_${TP.me && TP.me.id}_${r}`;
  const lastSeen = (r) => { try { return localStorage.getItem(seenKey(r)) || ""; } catch (e) { return TP["_seen_" + r] || ""; } };
  const markSeen = (r) => { const now = new Date().toISOString(); try { localStorage.setItem(seenKey(r), now); } catch (e) { TP["_seen_" + r] = now; } };
  TP.markSectionSeen = markSeen;

  // Which sidebar section a notification belongs to
  function sectionOf(n, role) {
    const m = String(n.message || "");
    if (role === "ADMIN") {
      if (/sign-up|submitted an ID|commission submission|requires approval|request/i.test(m)) return "requests";
      if (/reported|concern/i.test(m)) return "concerns";
      return "profile";
    }
    if (/^New message/i.test(m)) return "messages";
    if (/concern/i.test(m)) return "concerns";
    if (/\bID\b|account|profile|password|email|role|suspend|ban|warning|violation|portfolio|photo/i.test(m) && !n.commission_id) return "profile";
    return "projects";
  }

  async function updateBadges() {
    const role = TP.me.role;
    const counts = {};
    const add = (r, n) => (counts[r] = (counts[r] || 0) + (Number(n) || 0));
    if (role === "ADMIN") {
      const [reqs, users, concerns] = await Promise.all([TP.api.getCommissionsForApproval(), TP.api.getUsers(), TP.api.getAllConcerns()]);
      add("requests", reqs.length + users.filter((u) => (!u.is_approved && !u.is_rejected) || (u.is_approved && String(u.verification_status || "").trim() === "PENDING" && u.role !== "ADMIN")).length);
      add("concerns", concerns.filter((c) => c.status === "PENDING").length);
    } else {
      const [inbox, ks] = await Promise.all([TP.api.getInbox(TP.me.id), TP.api.getCommissions(TP.me.id)]);
      add("messages", inbox.reduce((s, i) => s + Number(i.unread_count || 0), 0));
      if (role === "FREELANCER") add("projects", ks.filter((k) => k.status === "PENDING" && k.freelancer.id === TP.me.id).length);
      if (role === "CLIENT") add("projects", ks.filter((k) => k.status === "IN_PROGRESS" && k.progress_percentage >= 100).length);
    }
    // red dots from notifications newer than the last visit to that section
    const current = location.hash.replace(/^#\/?/, "").split("/")[0] || "dashboard";
    const dots = {};
    for (const n of notifs) {
      const r = sectionOf(n, role);
      if (r === current || (current === "verify" && r === "profile")) continue;
      const seen = lastSeen(r);
      // first visit ever: only unread ones count; after that, anything newer than your last visit
      if (seen ? String(n.created_at) > seen : !n.is_read) dots[r] = true;
    }
    // an unverified account always gets a dot on Profile until the ID is sent
    if (role !== "ADMIN" && !["VERIFIED", "PENDING"].includes(String(TP.me.verification_status || "").trim()) && current !== "profile" && current !== "verify") dots.profile = true;

    TP.$$("#nav [data-badge]").forEach((b) => {
      const r = b.dataset.badge;
      const n = counts[r] || 0;
      b.classList.toggle("hidden", !n && !dots[r]);
      b.classList.toggle("dot", !n && !!dots[r]);
      b.textContent = n ? (n > 99 ? "99+" : String(n)) : "";
      b.title = n ? `${n} waiting` : dots[r] ? "New updates" : "";
    });
    // dashboard is the overview: show a dot when anything else has news
    const dash = document.querySelector('[data-badge="dashboard"]');
    if (dash && current !== "dashboard") {
      const any = Object.keys(dots).length > 0;
      dash.classList.toggle("hidden", !any);
      dash.classList.toggle("dot", any);
      dash.textContent = "";
    }
  }
  TP.updateBadges = () => updateBadges().catch(() => {});

  // Work out the exact page a notification should open.
  async function notifTarget(n) {
    const m = String(n.message || "");
    const role = TP.me.role;
    const quoted = (m.match(/"([^"]+)"/) || [])[1];
    const findProject = async () => {
      if (n.commission_id) return n.commission_id;
      const name = quoted || (m.match(/approval:\s*(.+)$/i) || [])[1];
      if (!name) return null;
      const list = role === "ADMIN" ? await TP.api.getCommissionsForApproval() : await TP.api.getCommissions(TP.me.id);
      const k = list.find((x) => String(x.name || "").trim().toLowerCase() === name.trim().toLowerCase());
      return k ? k.id : null;
    };

    if (role === "ADMIN") {
      if (/sign-up|submitted an ID/i.test(m)) return "requests/accounts";
      if (/commission submission|requires approval|project request/i.test(m)) return "requests";
      if (/reported|concern/i.test(m)) return "concerns";
      if (/password|email|profile|photo/i.test(m)) return "profile";
      return "dashboard";
    }
    if (/^New message/i.test(m)) { const id = await findProject(); return id ? "messages/" + id : "messages"; }
    if (/concern/i.test(m)) return "concerns";
    if (/\bID\b/.test(m) && /submitted|verified|rejected/i.test(m)) return role === "ADMIN" ? "profile" : "verify";
    if (/approved\. Welcome|account request was rejected|role was changed/i.test(m)) return "dashboard";
    if (/password|email|profile|photo|portfolio|phone/i.test(m) && !n.commission_id) return "profile";
    if (/suspend|ban|warning|violation/i.test(m) && !n.commission_id) return "profile";
    const id = await findProject();
    return id ? "projects/" + id : "projects";
  }

  async function openNotification(n) {
    $("#notifPop").classList.add("hidden");
    if (!n.is_read) {
      n.is_read = true;
      TP.api.markNotificationRead(n.id).catch(() => {});
    }
    try {
      const target = await notifTarget(n);
      const hash = "#/" + target;
      if (location.hash === hash) TP.refresh();
      else location.hash = hash;
    } catch (e) {
      TP.err(e);
    }
  }
  TP.openNotification = openNotification;

  function toggleNotifications() {
    const pop = $("#notifPop");
    if (!pop.classList.contains("hidden")) return pop.classList.add("hidden");
    const list = [...notifs].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    pop.innerHTML = `<div class="row between" style="margin-bottom:8px"><h3 style="margin:0">Notifications</h3>${list.some((n) => !n.is_read) ? '<button class="link-btn" id="readAll" style="color:var(--orange)">Mark all as read</button>' : ""}</div>${
      list.length
        ? list.map((n, i) => `<button class="notif ${n.is_read ? "read" : ""}" data-n="${i}" title="Open"><span class="d"></span><div class="grow"><div class="${n.is_read ? "" : "bold "}small">${esc(n.message)}</div><div class="cond small muted">${TP.ago(n.created_at)}</div></div><span class="go">›</span></button>`).join("")
        : '<div class="empty">No notifications yet</div>'
    }`;
    pop.classList.remove("hidden");
    TP.$$("[data-n]", pop).forEach((b) => (b.onclick = () => openNotification(list[Number(b.dataset.n)])));
    const ra = $("#readAll");
    if (ra) ra.onclick = () => {
      TP.api.markNotificationsRead(TP.me.id).then(() => {
        notifs.forEach((n) => (n.is_read = true));
        $("#bellDot").classList.add("hidden");
        pop.classList.add("hidden");
        TP.updateBadges();
      });
    };
  }

  // ---------- Start ----------
  async function boot() {
    TP.root.innerHTML = `<div class="splash"><div style="text-align:center"><img src="assets/trackpoints_logo.png" alt="TrackPoints"><div class="progress-line"><div></div></div><div class="cond small muted">Loading Awesomeness</div></div></div>`;
    try {
      const uid = await TP.api.currentUserId();
      if (uid) return await TP.enterApp();
    } catch (e) {
      console.warn(e);
      return TP.showLogin("Could not reach the server. You can still try the demo below.");
    }
    setTimeout(() => TP.showLogin(), 500);
  }
  boot();
})(window.TP);
