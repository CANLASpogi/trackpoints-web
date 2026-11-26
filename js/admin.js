// TrackPoints Web — Admin pages: Dashboard, Requests, Concerns, Penalties.
(function (TP) {
  const { esc, $, $$, icon } = TP;
  const P = TP.pages;
  const DAY = 86400000;

  // Penalty helpers (same fields the app reads in User.getRestrictionMessage)
  const penaltyOf = (u) =>
    u.is_permanently_banned ? ["Banned", "dark"]
      : u.ban_until && new Date(u.ban_until) > new Date() ? [`Suspended until ${TP.longDate(u.ban_until)}`, "red"]
      : (u.offense_count || 0) >= 1 ? ["Warning", "orange"]
      : ["None", "green"];
  // Same levels the database uses when a concern is resolved (trigger handle_report_penalty)
  const LEVELS = [
    ["WARNING", "Warning", "1st offense"],
    ["SUSPEND_1", "24-hour Suspension", "2nd offense"],
    ["SUSPEND_4", "4-day Suspension", "3rd offense"],
    ["BAN", "Permanent Ban", "4th offense / severe"],
  ];

  const nextPenalty = (u) => {
    if (!u) return "a penalty";
    const n = (u.offense_count || 0) + 1;
    return n === 1 ? "a Warning" : n === 2 ? "a 24-hour suspension" : n === 3 ? "a 4-day suspension" : "a permanent ban";
  };

  TP.penaltyModal = (u, onDone, concern) => {
    const next = Math.min(3, u.offense_count || 0);
    let level = LEVELS[next][0];
    const m = TP.modal(
      `${TP.modalHead("Apply Penalty")}
      <div class="sub-card row" style="background:var(--orange-soft)">${TP.avatar(u, 44)}<div class="grow"><div class="bold">${TP.uname(u)}</div><div class="cond small muted">${TP.titleCase(u.role)} · ${u.offense_count || 0} previous violation(s)</div></div>${TP.roleChip(u.role)}</div>
      ${concern ? `<div class="cond small muted">Related concern: <b>${esc(concern.sub_type)}</b></div>` : ""}
      <div class="bold small">Penalty Level</div>
      <div class="col" id="lv">${LEVELS.map(([k, l, s]) => `<label class="sub-card row" style="cursor:pointer;padding:10px 14px"><input type="radio" name="lv" value="${k}" ${k === level ? "checked" : ""} style="accent-color:var(--orange);width:18px;height:18px"><b class="grow">${l}</b><span class="cond small muted">${s}</span></label>`).join("")}</div>
      <div class="info-line">${icon.info} The user sees this the next time they log in (web or app).</div>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-close>Cancel</button><button class="btn primary" id="apply">Apply Penalty</button></div>`,
      { width: 520 }
    );
    m.querySelectorAll("input[name=lv]").forEach((r) => (r.onchange = () => (level = r.value)));
    m.querySelector("[data-close]").onclick = () => m.close();
    m.querySelector("#apply").onclick = async (e) => {
      const count = (u.offense_count || 0) + 1;
      const upd = { offense_count: count };
      if (level === "WARNING") upd.has_seen_warning = false; // the app shows the warning pop-up when offense_count is 1
      if (level === "SUSPEND_1") upd.ban_until = new Date(Date.now() + 1 * DAY).toISOString();
      if (level === "SUSPEND_4") upd.ban_until = new Date(Date.now() + 4 * DAY).toISOString();
      if (level === "BAN") upd.is_permanently_banned = true;
      const label = LEVELS.find((l) => l[0] === level)[1];
      if (!(await TP.confirm("Confirm penalty", `Apply "${label}" to ${TP.titleCase(u.fullname)}?`, "Apply", level === "BAN"))) return;
      await TP.busy(e.target, () => TP.api.applyPenalty(u.id, upd));
      m.close();
      TP.toast(`${label} applied to ${TP.titleCase(u.fullname)}.`);
      onDone && onDone();
    };
  };

  // =====================================================================
  // ADMIN DASHBOARD
  // =====================================================================
  P["ADMIN:dashboard"] = {
    title: () => "Dashboard",
    async render(el) {
      const [stats, users, reqs, concerns, allK] = await Promise.all([TP.api.getAdminStats(), TP.api.getUsers(), TP.api.getCommissionsForApproval(), TP.api.getAllConcerns(), TP.api.getAllCommissionsLite()]);
      const kCount = (st) => allK.filter((k) => k.status === st).length;
      const ok = users.filter((u) => u.is_approved);
      const pendingUsers = users.filter((u) => !u.is_approved && !u.is_rejected);
      const pendingVerify = users.filter((u) => u.is_approved && u.verification_status === "PENDING");
      const openConcerns = concerns.filter((c) => c.status === "PENDING");
      const restricted = users.filter((u) => TP.isBanned(u));
      el.innerHTML = `<div class="grid g4" style="margin-bottom:22px">
          <div class="stat" style="border-color:var(--blue)"><div class="num" style="color:var(--blue)">${ok.filter((u) => u.role === "FREELANCER").length}</div><div class="lbl">Freelancers</div></div>
          <div class="stat" style="border-color:var(--orange)"><div class="num" style="color:var(--orange)">${ok.filter((u) => u.role === "CLIENT").length}</div><div class="lbl">Clients</div></div>
          <div class="stat" style="border-color:var(--gold)"><div class="num" style="color:var(--gold)">${allK.length}</div><div class="lbl">Total Projects</div></div>
          <div class="stat" style="border-color:var(--green)"><div class="num" style="color:var(--green)">${TP.points(stats.total_points)}</div><div class="lbl">Points Paid</div></div></div>
        <div class="grid g3" style="margin-bottom:22px">
          <div class="card col"><h2>Project Requests</h2><div class="num bold" style="font-size:40px">${reqs.length}</div><div class="cond muted">waiting for approval</div><button class="btn primary" data-go="requests">Review</button></div>
          <div class="card col"><h2>Account Requests</h2><div class="num bold" style="font-size:40px">${pendingUsers.length + pendingVerify.length}</div><div class="cond muted">new accounts and ID verifications</div><button class="btn primary" data-go="requests/accounts">Review</button></div>
          <div class="card col"><h2>Open Concerns</h2><div class="num bold" style="font-size:40px">${openConcerns.length}</div><div class="cond muted">${restricted.length} user(s) currently suspended or banned</div><button class="btn primary" data-go="concerns">Review</button></div></div>
        <div class="grid g2">
          <div class="card"><h2>Projects</h2><div class="col"><div class="row between"><span>Waiting for freelancer</span><b>${kCount("PENDING")}</b></div><div class="row between"><span>In progress</span><b>${kCount("IN_PROGRESS")}</b></div><div class="row between"><span>Completed</span><b>${kCount("DONE")}</b></div><div class="row between"><span>Declined</span><b>${kCount("REJECTED_BY_ADMIN") + kCount("REJECTED_BY_FREELANCER")}</b></div><div class="row between"><span>Waiting for approval</span><b>${reqs.length}</b></div></div></div>
          <div class="card"><h2>Newest Users</h2><div class="col">${[...users].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 5).map((u) => `<div class="row">${TP.avatar(u, 36)}<div class="grow"><div class="bold small">${TP.uname(u)}</div><div class="cond small muted">${TP.longDate(u.created_at)}</div></div>${TP.roleChip(u.role)}${!u.is_approved && !u.is_rejected ? '<span class="chip gold">Pending</span>' : ""}</div>`).join("")}</div></div></div>`;
      $$("[data-go]", el).forEach((b) => (b.onclick = () => TP.go(b.dataset.go)));
    },
  };

  // =====================================================================
  // ADMIN REQUESTS — Project Request Approval + Account Verification
  // =====================================================================
  P["ADMIN:requests"] = {
    title: () => "Requests",
    async render(el, sub) {
      const [reqs, users] = await Promise.all([TP.api.getCommissionsForApproval(), TP.api.getUsers()]);
      const accounts = users
        .filter((u) => (!u.is_approved && !u.is_rejected) || (u.is_approved && u.verification_status === "PENDING" && u.role !== "ADMIN"))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
      let tab = sub === "accounts" ? "ACC" : "PROJ";
      let sel = accounts[0] ? accounts[0].id : null;
      let roleF = "ALL";
      const reload = () => TP.refresh();

      const draw = () => {
        el.innerHTML = `<div class="tabs"><button class="tab ${tab === "PROJ" ? "active" : ""}" data-t="PROJ">Project Requests <span class="count">(${reqs.length})</span></button><button class="tab ${tab === "ACC" ? "active" : ""}" data-t="ACC">Account Verification <span class="count">(${accounts.length})</span></button></div><div id="body"></div>`;
        $$("[data-t]", el).forEach((b) => (b.onclick = () => { tab = b.dataset.t; window.history.replaceState(null, "", tab === "ACC" ? "#/requests/accounts" : "#/requests"); draw(); }));
        tab === "PROJ" ? drawProjects() : drawAccounts();
      };

      function drawProjects() {
        $("#body", el).innerHTML = `<div class="table-card"><div class="table-scroll"><table><thead><tr><th>Project</th><th>Client</th><th>Freelancer</th><th>Points</th><th>Due</th><th>Submitted</th><th>Action</th></tr></thead><tbody>${
          reqs.length
            ? reqs.map((k) => `<tr><td><div class="title">${esc(k.name)}</div><div class="desc">${esc(k.description)}</div></td><td>${TP.uname(k.client)}</td><td>${TP.uname(k.freelancer)}${TP.isBanned(k.freelancer) ? ' <span class="chip red">Banned</span>' : ""}</td><td>${TP.points(k.points)}</td><td>${TP.date(k.due_date)}</td><td>${TP.longDate(k.created_at)}</td>
                <td><div class="row"><button class="btn sm success" data-ok="${k.id}">Approve</button><button class="btn sm danger" data-no="${k.id}">Decline</button></div></td></tr>`).join("")
            : '<tr><td colspan="7"><div class="empty">No project requests waiting for approval</div></td></tr>'
        }</tbody></table></div></div>
        <div class="info-line" style="margin-top:14px">${icon.info} Approved requests go to the freelancer as Pending. The freelancer can then accept or decline.</div>`;
        const act = async (b, approve) => {
          const k = reqs.find((x) => x.id === (b.dataset.ok || b.dataset.no));
          if (!(await TP.confirm(approve ? "Approve request" : "Decline request", `${approve ? "Approve" : "Decline"} "${k.name}"?`, approve ? "Approve" : "Decline", !approve))) return;
          await TP.busy(b, () => TP.api.setCommissionStatus(k.id, approve ? "PENDING" : "REJECTED_BY_ADMIN"));
          TP.toast(approve ? "Request approved." : "Request declined.");
          reload();
        };
        $$("[data-ok]", el).forEach((b) => (b.onclick = () => act(b, true)));
        $$("[data-no]", el).forEach((b) => (b.onclick = () => act(b, false)));
      }

      function drawAccounts() {
        const list = accounts.filter((u) => roleF === "ALL" || u.role === roleF);
        if (!list.some((u) => u.id === sel)) sel = list[0] ? list[0].id : null;
        const u = accounts.find((x) => x.id === sel);
        $("#body", el).innerHTML = `<div class="split"><div class="card tight"><div class="row between" style="margin-bottom:8px"><h2 style="margin:0">Pending</h2>
            <select class="input" id="rf" style="width:150px;min-height:38px;padding:6px 12px"><option value="ALL">All roles</option><option value="FREELANCER">Freelancers</option><option value="CLIENT">Clients</option></select></div>
            ${list.length ? list.map((x) => `<div class="list-item ${x.id === sel ? "active" : ""}" data-u="${x.id}">${TP.avatar(x, 44)}<div class="grow"><div class="bold">${TP.uname(x)}</div><div class="cond small muted">${x.is_approved ? "ID re-submitted" : "New account"} · ${TP.longDate(x.created_at)}</div></div>${TP.roleChip(x.role)}</div>`).join("") : '<div class="empty">No accounts waiting</div>'}</div>
          <div class="card col gap-lg" id="detail">${u ? `
            <div class="row">${TP.avatar(u, 60)}<div class="grow"><div class="bold" style="font-size:22px">${TP.uname(u)}</div><div class="cond muted">${esc(u.email)}</div></div>${TP.roleChip(u.role)}<span class="chip gold">Pending Review</span></div>
            <div class="grid g2" style="gap:14px"><div><div class="cond small muted">Phone</div><div class="bold">${TP.phoneLink(u.phone_number)}</div></div><div><div class="cond small muted">Signed up</div><div class="bold">${TP.longDate(u.created_at)}</div></div>
              ${u.role === "FREELANCER" ? `<div><div class="cond small muted">Specialty</div><div class="bold">${esc(u.specialty || "—")}</div></div>` : ""}<div><div class="cond small muted">Status</div><div class="bold">${u.is_approved ? "Approved account, new ID submitted" : "New account"}</div></div></div>
            <div><div class="bold" style="margin-bottom:8px">Submitted ID</div><div class="doc-img" style="max-width:380px">${u.verification_id_url ? `<img src="${esc(u.verification_id_url)}" alt="ID" data-img="${esc(u.verification_id_url)}">` : "No ID uploaded"}</div></div>
            <div class="sub-card col">${["Name on ID matches the account name", "ID is clear and not expired", "Photo looks like a real, unedited document"].map((t) => `<label class="check"><input type="checkbox"> ${t}</label>`).join("")}</div>
            <div class="row" style="justify-content:flex-end"><button class="btn danger" id="rej">Reject</button><button class="btn primary" id="app">Approve & Verify</button></div>` : '<div class="empty" style="margin:auto">Select an account to review</div>'}</div></div>`;
        $("#rf", el).value = roleF;
        $("#rf", el).onchange = (e) => { roleF = e.target.value; drawAccounts(); };
        $$("[data-u]", el).forEach((d) => (d.onclick = () => { sel = d.dataset.u; drawAccounts(); }));
        $$("[data-img]", el).forEach((i) => (i.onclick = () => TP.viewImage(i.dataset.img)));
        if (!u) return;
        $("#app", el).onclick = async (e) => {
          if (!(await TP.confirm("Approve account", `Approve and verify ${TP.titleCase(u.fullname)}?`, "Approve"))) return;
          await TP.busy(e.target, () => TP.api.setAccountApproval(u.id, true));
          TP.toast("Account approved.");
          TP.go("requests/accounts");
        };
        $("#rej", el).onclick = async (e) => {
          const msg = u.is_approved
            ? `Reject this ID? ${TP.titleCase(u.fullname)} keeps their account but stays unverified and can upload a new ID.`
            : `Reject ${TP.titleCase(u.fullname)}'s account request? They won't be able to log in.`;
          if (!(await TP.confirm("Reject", msg, "Reject", true))) return;
          await TP.busy(e.target, () => (u.is_approved ? TP.api.updateUser(u.id, { verification_status: "REJECTED" }) : TP.api.setAccountApproval(u.id, false)));
          TP.toast("Rejected.");
          TP.go("requests/accounts");
        };
      }
      draw();
    },
  };

  // =====================================================================
  // ADMIN CONCERNS
  // =====================================================================
  P["ADMIN:concerns"] = {
    title: () => "Concerns",
    async render(el) {
      const [concerns, users] = await Promise.all([TP.api.getAllConcerns(), TP.api.getUsers()]);
      const U = Object.fromEntries(users.map((u) => [u.id, u]));
      const nm = (id) => (U[id] ? TP.titleCase(U[id].fullname) : "Unknown user");
      const nmv = (id) => (U[id] ? TP.uname(U[id]) : "Unknown user");
      let tab = "PENDING";
      let sel = null;
      const draw = () => {
        const list = concerns.filter((c) => tab === "ALL" || c.status === tab);
        if (!list.some((c) => c.id === sel)) sel = list[0] ? list[0].id : null;
        const c = concerns.find((x) => x.id === sel);
        const cnt = (s) => concerns.filter((x) => s === "ALL" || x.status === s).length;
        el.innerHTML = `<div class="tabs">${[["PENDING", "Open"], ["RESOLVED", "Resolved"], ["DISMISSED", "Dismissed"], ["ALL", "All"]].map(([k, l]) => `<button class="tab ${tab === k ? "active" : ""}" data-t="${k}">${l} <span class="count">(${cnt(k)})</span></button>`).join("")}</div>
          <div class="split" style="grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)"><div class="card tight">${
            list.length
              ? list.map((x) => `<div class="list-item ${x.id === sel ? "active" : ""}" data-c="${x.id}">${TP.avatar(U[x.reporter_id], 44)}<div class="grow"><div class="bold">${esc(x.sub_type)}</div>
                  <div class="row wrap" style="gap:6px"><span class="cond small muted">${nmv(x.reporter_id)}</span>${U[x.reporter_id] ? TP.roleChip(U[x.reporter_id].role) : ""}<span class="cond small muted">→ ${nmv(x.reported_id)} · ${TP.ago(x.created_at)}</span></div></div>${TP.concernChip(x.status)}</div>`).join("")
              : '<div class="empty">No concerns here</div>'
          }</div><div class="card col" style="gap:14px">${
            c
              ? `<div class="row between"><span class="chip orange">${esc(TP.CATEGORIES[c.category] || c.category)}</span>${TP.concernChip(c.status)}</div>
                <div class="bold" style="font-size:22px">${esc(c.sub_type)}</div>
                <div class="grid g2" style="gap:12px"><div><div class="cond small muted">From</div><div class="bold">${nmv(c.reporter_id)}</div><div class="cond small muted">${U[c.reporter_id] ? TP.phoneLink(U[c.reporter_id].phone_number) : ""}</div></div><div><div class="cond small muted">Against</div><div class="bold">${nmv(c.reported_id)} ${U[c.reported_id] ? `<span class="cond small muted">(${U[c.reported_id].offense_count || 0} violations)</span>` : ""}</div><div class="cond small muted">${U[c.reported_id] ? TP.phoneLink(U[c.reported_id].phone_number) : ""}</div></div>
                  <div><div class="cond small muted">Submitted</div><div class="bold">${TP.longDate(c.created_at)}</div></div><div><div class="cond small muted">Against's current penalty</div><div>${U[c.reported_id] ? `<span class="chip ${penaltyOf(U[c.reported_id])[1]}">${penaltyOf(U[c.reported_id])[0]}</span>` : "—"}</div></div></div>
                <div class="sub-card cond" style="line-height:1.45">${esc(c.description || "No description provided.")}</div>
                ${c.evidence_url ? `<div><div class="bold small" style="margin-bottom:6px">Evidence</div><div class="doc-img" style="max-width:320px"><img src="${esc(c.evidence_url)}" alt="Evidence" data-img="${esc(c.evidence_url)}"></div></div>` : ""}
                ${c.status === "PENDING"
                  ? `<div class="info-line">${icon.info} Mark Resolved = the concern is valid. ${nmv(c.reported_id)} automatically gets their next penalty (${esc(nextPenalty(U[c.reported_id]))}).</div>
                     <div class="row" style="justify-content:flex-end"><button class="btn sm" id="dis">Dismiss</button><button class="btn sm primary" id="res">Mark Resolved</button></div>`
                  : `<div class="info-line">${icon.info} This concern is ${c.status === "RESOLVED" ? "resolved" : "dismissed"}. To change a penalty, use the Penalties page.</div>`}`
              : '<div class="empty" style="margin:auto">Select a concern</div>'
          }</div></div>`;
        $$("[data-t]", el).forEach((b) => (b.onclick = () => { tab = b.dataset.t; draw(); }));
        $$("[data-c]", el).forEach((d) => (d.onclick = () => { sel = d.dataset.c; draw(); }));
        $$("[data-img]", el).forEach((i) => (i.onclick = () => TP.viewImage(i.dataset.img)));
        if (!c) return;
        const setStatus = async (b, status, msg) => {
          await TP.busy(b, () => TP.api.setConcernStatus(c.id, status));
          c.status = status;
          TP.toast(msg);
          draw();
        };
        if ($("#res", el)) $("#res", el).onclick = async (e) => {
          if (!(await TP.confirm("Resolve concern", `Mark this concern as resolved? ${nm(c.reported_id)} will get: ${nextPenalty(U[c.reported_id])}.`, "Resolve"))) return;
          await setStatus(e.target, "RESOLVED", "Concern resolved. Penalty applied.");
          TP.refresh(); // reload so the user's new penalty shows
        };
        if ($("#dis", el)) $("#dis", el).onclick = async (e) => { if (await TP.confirm("Dismiss concern", "Dismiss this concern? No action will be taken.", "Dismiss")) setStatus(e.target, "DISMISSED", "Concern dismissed."); };
      };
      draw();
    },
  };

  // =====================================================================
  // ADMIN PENALTIES — User Account Penalty System
  // =====================================================================
  P["ADMIN:penalties"] = {
    title: () => "User Penalties",
    async render(el) {
      const [users, concerns] = await Promise.all([TP.api.getUsers(), TP.api.getAllConcerns()]);
      const people = users.filter((u) => u.role !== "ADMIN" && u.is_approved);
      const warned = people.filter((u) => (u.offense_count || 0) >= 1 && !TP.isBanned(u)).length;
      const susp = people.filter((u) => !u.is_permanently_banned && u.ban_until && new Date(u.ban_until) > new Date()).length;
      const banned = people.filter((u) => u.is_permanently_banned).length;
      const month = new Date().toISOString().slice(0, 7);
      let q = "", f = "ALL";
      el.innerHTML = `<div class="grid g4" style="margin-bottom:22px">
          <div class="stat" style="border-color:#c25a00"><div class="num" style="color:#c25a00">${warned}</div><div class="lbl">With Warnings</div></div>
          <div class="stat" style="border-color:var(--red)"><div class="num" style="color:var(--red)">${susp}</div><div class="lbl">Suspended</div></div>
          <div class="stat" style="border-color:var(--text)"><div class="num">${banned}</div><div class="lbl">Banned</div></div>
          <div class="stat" style="border-color:var(--blue)"><div class="num" style="color:var(--blue)">${concerns.filter((c) => String(c.created_at).slice(0, 7) === month).length}</div><div class="lbl">Concerns This Month</div></div></div>
        <div class="row between wrap" style="margin-bottom:16px"><div class="tabs" style="margin:0">${[["ALL", "All Users"], ["FLAGGED", "With Penalties"], ["CLIENT", "Clients"], ["FREELANCER", "Freelancers"]].map(([k, l]) => `<button class="tab ${k === "ALL" ? "active" : ""}" data-f="${k}">${l}</button>`).join("")}</div>
          <input class="input" id="q" placeholder="Search user…" style="max-width:280px"></div>
        <div class="table-card"><div class="table-scroll"><table><thead><tr><th>User</th><th>Role</th><th>Violations</th><th>Current Penalty</th><th>Concerns Against</th><th>Action</th></tr></thead><tbody id="tb"></tbody></table></div></div>
        <div class="info-line" style="margin-top:14px">${icon.info} Resolving a concern adds the next penalty automatically: 1st = Warning · 2nd = 24-hour suspension · 3rd = 4-day suspension · 4th = Permanent ban. Use Apply only for violations that didn't come from a concern.</div>`;
      const draw = () => {
        const rows = people.filter((u) => String(u.fullname || "").toLowerCase().includes(q) || String(u.email || "").toLowerCase().includes(q))
          .filter((u) => f === "ALL" || (f === "FLAGGED" ? (u.offense_count || 0) > 0 || TP.isBanned(u) : u.role === f))
          .sort((a, b) => (b.offense_count || 0) - (a.offense_count || 0));
        $("#tb", el).innerHTML = rows.length
          ? rows.map((u) => {
              const [lbl, col] = penaltyOf(u);
              const against = concerns.filter((c) => c.reported_id === u.id);
              return `<tr><td><div class="row">${TP.avatar(u, 40)}<div><div class="bold">${TP.uname(u)}</div><div class="cond small muted">${esc(u.email)}${u.phone_number ? " · " + esc(u.phone_number) : ""}</div></div></div></td><td>${TP.roleChip(u.role)}</td><td>${u.offense_count || 0}</td><td><span class="chip ${col}">${esc(lbl)}</span></td>
                <td>${against.length} <span class="cond small muted">(${against.filter((c) => c.status === "PENDING").length} open)</span></td>
                <td><div class="row">${TP.isBanned(u) ? `<button class="btn sm" data-lift="${u.id}">Lift</button>` : ""}<button class="btn sm primary" data-pen="${u.id}">Apply</button></div></td></tr>`;
            }).join("")
          : '<tr><td colspan="6"><div class="empty">No users found</div></td></tr>';
        const find = (id) => people.find((u) => u.id === id);
        $$("[data-pen]", el).forEach((b) => (b.onclick = () => TP.penaltyModal(find(b.dataset.pen), () => TP.refresh())));
        $$("[data-lift]", el).forEach((b) => (b.onclick = async () => {
          const u = find(b.dataset.lift);
          if (!(await TP.confirm("Lift penalty", `Lift the suspension/ban on ${TP.titleCase(u.fullname)}? Their violation count stays the same.`, "Lift"))) return;
          await TP.busy(b, () => TP.api.applyPenalty(u.id, { ban_until: null, is_permanently_banned: false }));
          TP.toast("Penalty lifted.");
          TP.refresh();
        }));
      };
      $$("[data-f]", el).forEach((b) => (b.onclick = () => { f = b.dataset.f; $$("[data-f]", el).forEach((x) => x.classList.toggle("active", x === b)); draw(); }));
      $("#q", el).oninput = (e) => { q = e.target.value.toLowerCase(); draw(); };
      draw();
    },
  };
})(window.TP);
