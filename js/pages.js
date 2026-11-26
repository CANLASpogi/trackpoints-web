// TrackPoints Web — Client and Freelancer pages (also used by Admin where noted).
(function (TP) {
  const { esc, $, $$, icon } = TP;
  const P = TP.pages;
  const other = (k) => (TP.me.role === "CLIENT" ? k.freelancer : k.client);
  const isDeclined = (s) => s === "REJECTED_BY_ADMIN" || s === "REJECTED_BY_FREELANCER";

  // =====================================================================
  // Shared modals
  // =====================================================================
  TP.projectDetails = (k, onChange) => {
    const o = other(k);
    const m = TP.modal(
      `${TP.modalHead(k.name)}
      <div class="row wrap">${TP.statusChip(k.status)}${TP.isBanned(o) ? '<span class="chip red">Banned User</span>' : ""}</div>
      <p class="cond" style="margin:0;line-height:1.45">${esc(k.description)}</p>
      <div class="grid g2" style="gap:14px">
        <div><div class="cond small muted">${TP.me.role === "CLIENT" ? "Freelancer" : "Client"}</div><div class="bold">${TP.uname(o)}</div></div>
        <div><div class="cond small muted">Points</div><div class="bold">${TP.points(k.points)}</div></div>
        <div><div class="cond small muted">Due Date</div><div class="bold">${TP.date(k.due_date)}</div></div>
        <div><div class="cond small muted">Requested</div><div class="bold">${TP.longDate(k.created_at)}</div></div>
        <div><div class="cond small muted">Email</div><div class="bold">${esc(o.email || "—")}</div></div>
        <div><div class="cond small muted">Phone</div><div class="bold">${TP.phoneLink(o.phone_number)}</div></div>
        ${k.date_paid ? `<div><div class="cond small muted">Paid</div><div class="bold">${TP.longDate(k.date_paid)}</div></div>` : ""}
        ${k.rating ? `<div><div class="cond small muted">Rating</div><div>${TP.stars(k.rating)}</div></div>` : ""}
      </div>
      ${["IN_PROGRESS", "DONE"].includes(k.status) ? `<div><div class="bold small" style="margin-bottom:6px">Progress</div>${TP.progressBar(k.progress_percentage)}</div>` : ""}
      <div class="row wrap" style="justify-content:flex-end" id="acts"></div>`,
      { width: 560 }
    );
    const acts = m.querySelector("#acts");
    const add = (label, cls, fn) => {
      const b = document.createElement("button");
      b.className = "btn " + cls;
      b.textContent = label;
      b.onclick = () => fn(b);
      acts.appendChild(b);
    };
    if (["IN_PROGRESS", "DONE", "PENDING"].includes(k.status)) add("Message", "", () => { m.close(); TP.go("messages/" + k.id); });
    if (TP.me.role === "FREELANCER" && k.status === "PENDING") {
      add("Decline", "danger", async (b) => { if (await TP.respondRequest(k, false, b)) { m.close(); onChange && onChange(); } });
      add("Accept", "primary", async (b) => { if (await TP.respondRequest(k, true, b)) { m.close(); onChange && onChange(); } });
    }
    if (TP.me.role === "FREELANCER" && k.status === "IN_PROGRESS") add("Update Progress", "primary", () => { m.close(); TP.progressModal(k, onChange); });
    if (TP.me.role === "CLIENT" && k.status === "IN_PROGRESS" && k.progress_percentage >= 100) add("Send Points & Rate", "primary", () => { m.close(); TP.rateModal(k, onChange); });
  };

  TP.respondRequest = async (k, accept, btn) => {
    const ok = await TP.confirm(
      accept ? "Accept request" : "Decline request",
      accept ? `Accept "${k.name}"? It will move to In Progress.` : `Decline "${k.name}"? This can't be undone.`,
      accept ? "Accept" : "Decline",
      !accept
    );
    if (!ok) return false;
    await TP.busy(btn, () => TP.api.setCommissionStatus(k.id, accept ? "IN_PROGRESS" : "REJECTED_BY_FREELANCER"));
    TP.toast(accept ? "Request accepted." : "Request declined.");
    return true;
  };

  TP.progressModal = (k, onDone) => {
    let val = Number(k.progress_percentage) || 0;
    const m = TP.modal(
      `${TP.modalHead("Update Progress")}
      <div class="sub-card row between"><div><div class="bold" style="font-size:18px">${esc(k.name)}</div><div class="cond small muted">Client: ${TP.uname(k.client)} · Due ${TP.date(k.due_date)}</div></div>${TP.statusChip(k.status)}</div>
      <div class="row between" style="align-items:flex-end"><div><div class="small bold muted">Current</div><div class="bold" style="font-size:22px;color:var(--faint)">${val}%</div></div>
        <div style="text-align:right"><div class="small bold muted">New progress</div><div class="bold" style="font-size:40px;color:var(--orange)" id="pv">${val}%</div></div></div>
      <input type="range" min="0" max="100" step="5" value="${val}" id="rng" aria-label="Progress">
      <div class="quick">${[25, 50, 75, 100].map((v) => `<button data-v="${v}">${v}%</button>`).join("")}</div>
      <div class="info-line">${icon.info} The client will see the new percentage in their Projects tab.</div>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-close>Cancel</button><button class="btn primary" id="save">Save Progress</button></div>`
    );
    const set = (v) => { val = Number(v); m.querySelector("#pv").textContent = val + "%"; m.querySelector("#rng").value = val; };
    m.querySelector("#rng").oninput = (e) => set(e.target.value);
    m.querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => set(b.dataset.v)));
    m.querySelector("[data-close]").onclick = () => m.close();
    m.querySelector("#save").onclick = async (e) => {
      if (val < (Number(k.progress_percentage) || 0) && !(await TP.confirm("Lower progress?", `You're lowering progress from ${k.progress_percentage}% to ${val}%. Continue?`, "Yes, update"))) return;
      await TP.busy(e.target, () => TP.api.updateProgress(k.id, val));
      k.progress_percentage = val;
      m.close();
      TP.toast(`Progress updated to ${val}%.`);
      onDone && onDone();
    };
  };

  TP.rateModal = (k, onDone) => {
    let rating = 0;
    const m = TP.modal(
      `${TP.modalHead("Send Points & Rate")}
      <p class="cond" style="margin:0">${esc(k.name)} is at 100%. Sending <b>${TP.points(k.points)} points</b> to ${TP.uname(k.freelancer)} marks the project as Done.</p>
      <div class="stars" id="stars">${[1, 2, 3, 4, 5].map((i) => `<button data-s="${i}" aria-label="${i} stars">★</button>`).join("")}</div>
      <div class="error" id="err" style="text-align:center"></div>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-close>Cancel</button><button class="btn primary" id="send">Send Points</button></div>`,
      { width: 480 }
    );
    m.querySelectorAll("[data-s]").forEach((b) =>
      (b.onclick = () => {
        rating = Number(b.dataset.s);
        m.querySelectorAll("[data-s]").forEach((x) => x.classList.toggle("on", Number(x.dataset.s) <= rating));
      })
    );
    m.querySelector("[data-close]").onclick = () => m.close();
    m.querySelector("#send").onclick = async (e) => {
      if (!rating) return (m.querySelector("#err").textContent = "Please choose a rating");
      await TP.busy(e.target, () => TP.api.completeCommission(k.id, rating));
      m.close();
      TP.toast("Points sent. Project marked as Done.");
      onDone && onDone();
    };
  };

  // =====================================================================
  // DASHBOARD (client + freelancer)
  // =====================================================================
  P.dashboard = {
    title: () => "Dashboard",
    async render(el) {
      const [stats, ks] = await Promise.all([TP.api.getUserStats(TP.me.id), TP.api.getCommissions(TP.me.id)]);
      const fl = TP.me.role === "FREELANCER";
      const requests = ks.filter((k) => k.status === "PENDING" && k.freelancer.id === TP.me.id);
      const active = ks.filter((k) => k.status === "IN_PROGRESS");
      const pendingPay = active.filter((k) => k.progress_percentage >= 100);
      el.innerHTML = `
        ${TP.me.phone_number ? "" : `<div class="sub-card row between wrap" style="margin-bottom:18px;border-color:var(--orange);background:var(--orange-soft)"><div class="row">📱 <span><b>Add your phone number</b> <span class="cond muted">so ${fl ? "clients" : "freelancers"} and the Admin can reach you.</span></span></div><button class="btn sm primary" id="goPhone">Add phone</button></div>`}
        <div class="row between wrap" style="margin-bottom:22px"><div><div class="cond muted">Welcome back,</div><div class="bold" style="font-size:26px">${TP.uname(TP.me)}</div></div>
          ${fl ? `<button class="btn primary" id="newReq">View New Requests (${requests.length})</button>` : '<button class="btn primary" id="hire">Find a Freelancer</button>'}</div>
        <div class="grid g4" style="margin-bottom:22px">
          <div class="stat" style="border-color:var(--blue)"><div class="num" style="color:var(--blue)">${stats.in_progress || 0}</div><div class="lbl">Active Projects</div></div>
          <div class="stat" style="border-color:var(--green)"><div class="num" style="color:var(--green)">${stats.completed || 0}</div><div class="lbl">Completed</div></div>
          <div class="stat" style="border-color:var(--gold)"><div class="num" style="color:var(--gold)">${stats.total_commissions || 0}</div><div class="lbl">Total Projects</div></div>
          <div class="stat" style="border-color:var(--orange)"><div class="num" style="color:var(--orange)">${TP.points(stats.total_points)}</div><div class="lbl">${fl ? "Points Earned" : "Points Spent"}</div></div>
        </div>
        <div class="split wide">
          <div class="card"><div class="row between"><h2>Recent Projects</h2><button class="btn sm" id="all">View all</button></div>
            <div class="col" id="recent">${
              ks.length
                ? ks.slice(0, 5).map((k) => `<div class="sub-card row between clickable" data-k="${k.id}" style="cursor:pointer"><div class="grow"><div class="bold" style="font-size:17px">${esc(k.name)}</div><div class="cond small muted">${TP.uname(other(k))} · Due ${TP.date(k.due_date)}</div>${k.status === "IN_PROGRESS" ? `<div style="margin-top:6px">${TP.progressBar(k.progress_percentage)}</div>` : ""}</div><div class="col" style="align-items:flex-end">${TP.statusChip(k.status)}<b>${TP.points(k.points)} pts</b></div></div>`).join("")
                : `<div class="empty">No projects yet.${fl ? "" : " Hire a freelancer to get started."}</div>`
            }</div></div>
          <div class="col gap-lg">
            ${fl
              ? `<div class="card"><h2>New Requests</h2>${requests.length ? requests.slice(0, 3).map((k) => `<div class="sub-card" style="margin-bottom:10px"><div class="bold">${esc(k.name)}</div><div class="cond small muted">From ${TP.uname(k.client)} · ${TP.points(k.points)} pts</div><div class="row" style="margin-top:8px"><button class="btn sm danger" data-dec="${k.id}">Decline</button><button class="btn sm primary" data-acc="${k.id}">Accept</button></div></div>`).join("") : '<div class="empty">No new requests</div>'}</div>`
              : `<div class="card"><h2>Waiting for your payment</h2>${pendingPay.length ? pendingPay.map((k) => `<div class="sub-card row between" style="margin-bottom:10px"><div><div class="bold">${esc(k.name)}</div><div class="cond small muted">${TP.points(k.points)} pts · 100% done</div></div><button class="btn sm primary" data-pay="${k.id}">Send Points</button></div>`).join("") : '<div class="empty">Nothing to pay right now</div>'}</div>`}
            <div class="card"><h2>In Progress</h2>${active.length ? active.slice(0, 4).map((k) => `<div style="margin-bottom:12px"><div class="bold small">${esc(k.name)}</div>${TP.progressBar(k.progress_percentage)}</div>`).join("") : '<div class="empty">No active projects</div>'}</div>
          </div>
        </div>`;
      const find = (id) => ks.find((k) => k.id === id);
      const reload = () => TP.refresh();
      $$("[data-k]", el).forEach((d) => (d.onclick = () => TP.projectDetails(find(d.dataset.k), reload)));
      $("#all", el).onclick = () => TP.go("projects");
      if ($("#goPhone", el)) $("#goPhone", el).onclick = () => { TP.openEditProfile = true; TP.go("profile"); };
      if ($("#hire", el)) $("#hire", el).onclick = () => TP.go("freelancers");
      if ($("#newReq", el)) $("#newReq", el).onclick = () => { TP.projectsTab = "PENDING"; TP.go("projects"); };
      $$("[data-acc]", el).forEach((b) => (b.onclick = async () => { if (await TP.respondRequest(find(b.dataset.acc), true, b)) reload(); }));
      $$("[data-dec]", el).forEach((b) => (b.onclick = async () => { if (await TP.respondRequest(find(b.dataset.dec), false, b)) reload(); }));
      $$("[data-pay]", el).forEach((b) => (b.onclick = () => TP.rateModal(find(b.dataset.pay), reload)));
    },
  };

  // =====================================================================
  // FREELANCERS (client) — browse and send a commission request
  // =====================================================================
  P["CLIENT:freelancers"] = {
    title: () => "Freelancers",
    async render(el) {
      const list = (await TP.api.getFreelancers(TP.me.id)).filter((f) => f.is_approved && !f.is_rejected && !TP.isBanned(f));
      let tab = "ALL", q = "";
      el.innerHTML = `<div class="row between wrap" style="margin-bottom:20px"><div class="tabs" style="margin:0"><button class="tab active" data-t="ALL">All</button><button class="tab" data-t="RECENT">Worked With</button><button class="tab" data-t="TOP">Top Rated</button></div>
        <input class="input" id="q" placeholder="Search name or specialty…" style="max-width:320px"></div><div class="grid g3" id="grid"></div>`;
      const draw = () => {
        let arr = list.filter((f) => (`${f.fullname} ${f.specialty || ""}`).toLowerCase().includes(q));
        if (tab === "RECENT") arr = arr.filter((f) => f.is_recent || f.projects_together > 0);
        if (tab === "TOP") arr = [...arr].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        $("#grid", el).innerHTML = arr.length
          ? arr.map((f) => `<div class="card tight col" style="gap:10px"><div class="row">${TP.avatar(f, 56)}<div class="grow"><div class="bold" style="font-size:17px">${TP.uname(f)}</div><div class="cond small muted">${esc(f.specialty || "Freelancer")}</div></div>${TP.isOnline(f) ? '<span class="chip green">Online</span>' : ""}</div>
              <div class="row between small"><span>${TP.stars(f.rating)} <b>${Number(f.rating || 5).toFixed(1)}</b></span><span class="cond muted">${f.total_projects || 0} projects${f.projects_together ? ` · ${f.projects_together} with you` : ""}</span></div>
              <div class="row"><button class="btn sm grow" data-view="${f.id}">View Profile</button><button class="btn sm primary grow" data-hire="${f.id}">Hire</button></div></div>`).join("")
          : '<div class="empty" style="grid-column:1/-1">No freelancers found</div>';
        $$("[data-hire]", el).forEach((b) => (b.onclick = () => hireModal(list.find((f) => f.id === b.dataset.hire))));
        $$("[data-view]", el).forEach((b) => (b.onclick = () => profileModal(list.find((f) => f.id === b.dataset.view))));
      };
      $$("[data-t]", el).forEach((b) => (b.onclick = () => { tab = b.dataset.t; $$("[data-t]", el).forEach((x) => x.classList.toggle("active", x === b)); draw(); }));
      $("#q", el).oninput = (e) => { q = e.target.value.toLowerCase(); draw(); };
      draw();
    },
  };

  function profileModal(f) {
    const pics = f.portfolio || [];
    const m = TP.modal(
      `${TP.modalHead("Freelancer Profile")}
      <div class="row">${TP.avatar(f, 80)}<div><div class="bold" style="font-size:22px">${TP.uname(f)}</div><div class="cond muted">${esc(f.specialty || "Freelancer")}</div><div>${TP.stars(f.rating)} <b>${Number(f.rating || 5).toFixed(1)}</b></div></div></div>
      <div class="grid g2" style="gap:12px"><div><div class="cond small muted">Email</div><div class="bold">${esc(f.email)}</div></div><div><div class="cond small muted">Phone</div><div class="bold">${TP.phoneLink(f.phone_number)}</div></div>
      <div><div class="cond small muted">Member since</div><div class="bold">${TP.longDate(f.created_at)}</div></div><div><div class="cond small muted">Projects</div><div class="bold">${f.total_projects || 0}</div></div></div>
      <h3 style="margin:0">Portfolio</h3>
      <div class="portfolio">${pics.length ? pics.map((u) => `<div class="ph"><img src="${esc(u)}" alt="" data-img="${esc(u)}"></div>`).join("") : '<div class="empty" style="grid-column:1/-1">No portfolio yet</div>'}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" id="h">Hire ${esc(TP.titleCase(f.fullname).split(" ")[0])}</button></div>`,
      { width: 640 }
    );
    m.querySelectorAll("[data-img]").forEach((i) => (i.onclick = () => TP.viewImage(i.dataset.img)));
    m.querySelector("#h").onclick = () => { m.close(); hireModal(f); };
  }

  function hireModal(f) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const m = TP.modal(
      `${TP.modalHead("Commission Request")}
      <div class="sub-card row">${TP.avatar(f, 44)}<div><div class="bold">${TP.uname(f)}</div><div class="cond small muted">${esc(f.specialty || "Freelancer")}</div></div></div>
      <div class="field"><label>Project Name</label><input class="input" id="n" maxlength="80"></div>
      <div class="field"><label>Description</label><textarea class="input" id="d" placeholder="What do you need done?"></textarea></div>
      <div class="grid g2" style="gap:14px"><div class="field"><label>Points (total cost)</label><input class="input" id="p" type="number" min="1" step="1"></div>
        <div class="field"><label>Due Date</label><input class="input" id="due" type="date" min="${tomorrow}"></div></div>
      <div class="info-line">${icon.info} The Admin approves the request first, then the freelancer can accept it. A 40% down payment is required before work begins.</div>
      <div class="error" id="err"></div>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-close>Cancel</button><button class="btn primary" id="sub">Submit Request</button></div>`
    );
    m.querySelector("[data-close]").onclick = () => m.close();
    m.querySelector("#sub").onclick = async (e) => {
      const name = m.querySelector("#n").value.trim();
      const description = m.querySelector("#d").value.trim();
      const points = parseInt(m.querySelector("#p").value, 10);
      const due = m.querySelector("#due").value;
      const err = m.querySelector("#err");
      if (!name || !description) return (err.textContent = "Please fill in the project name and description");
      if (!(points > 0)) return (err.textContent = "Points must be more than 0");
      if (!due || due < tomorrow) return (err.textContent = "Choose a due date from tomorrow onwards");
      if (!(await TP.confirm("Submit request", "Are you sure you want to submit this commission request?", "Submit"))) return;
      await TP.busy(e.target, () =>
        TP.api.createCommission({
          name, description, points,
          client_id: TP.me.id, freelancer_id: f.id,
          status: "FOR_ADMIN_APPROVAL",
          due_date: new Date(due + "T23:59:00").toISOString(),
          created_at: new Date().toISOString(),
        })
      );
      m.close();
      TP.toast("Request submitted. Waiting for Admin approval.");
    };
  }

  // =====================================================================
  // PROJECTS (client + freelancer) — with progress %
  // =====================================================================
  P.projects = {
    title: () => "My Projects",
    async render(el, openId) {
      const ks = await TP.api.getCommissions(TP.me.id);
      const fl = TP.me.role === "FREELANCER";
      const TABS = [["ALL", "All"], ["FOR_ADMIN_APPROVAL", "For Approval"], ["PENDING", "Pending"], ["IN_PROGRESS", "In Progress"], ["DONE", "Done"], ["DECLINED", "Declined"]];
      let tab = TP.projectsTab || "ALL";
      TP.projectsTab = null;
      const match = (k) => tab === "ALL" || (tab === "DECLINED" ? isDeclined(k.status) : k.status === tab);
      const count = (t) => ks.filter((k) => t === "ALL" || (t === "DECLINED" ? isDeclined(k.status) : k.status === t)).length;
      el.innerHTML = `<div class="tabs">${TABS.map(([t, l]) => `<button class="tab" data-t="${t}">${l} <span class="count">(${count(t)})</span></button>`).join("")}</div>
        <div class="table-card"><div class="table-scroll"><table><thead><tr><th>Projects</th><th>${fl ? "Client" : "Freelancer"}</th><th>Deadline</th><th>Progress</th><th>Points</th><th>Status</th><th>Action</th></tr></thead><tbody id="tb"></tbody></table></div></div>`;
      const reload = () => { TP.projectsTab = tab; TP.refresh(); };
      const draw = () => {
        $$("[data-t]", el).forEach((b) => b.classList.toggle("active", b.dataset.t === tab));
        const rows = ks.filter(match);
        $("#tb", el).innerHTML = rows.length
          ? rows.map((k) => {
              let action = `<button class="btn sm" data-view="${k.id}">View</button>`;
              if (fl && k.status === "PENDING") action = `<div class="row"><button class="btn sm success" data-acc="${k.id}">Accept</button><button class="btn sm danger" data-dec="${k.id}">Decline</button></div>`;
              else if (fl && k.status === "IN_PROGRESS") action = `<button class="btn sm primary" data-up="${k.id}">Update</button>`;
              else if (!fl && k.status === "IN_PROGRESS" && k.progress_percentage >= 100) action = `<button class="btn sm primary" data-pay="${k.id}">Send Points</button>`;
              const prog = ["IN_PROGRESS", "DONE"].includes(k.status) ? TP.progressBar(k.status === "DONE" ? 100 : k.progress_percentage) : '<span class="faint">—</span>';
              return `<tr class="clickable" data-row="${k.id}"><td><div class="title">${esc(k.name)}</div><div class="desc">${esc(k.description)}</div></td><td>${TP.uname(other(k))}${TP.isBanned(other(k)) ? ' <span class="chip red">Banned</span>' : ""}</td><td>${TP.date(k.due_date)}</td><td>${prog}</td><td>${TP.points(k.points)}</td><td>${TP.statusChip(k.status)}</td><td>${action}</td></tr>`;
            }).join("")
          : `<tr><td colspan="7"><div class="empty">No projects here</div></td></tr>`;
        const find = (id) => ks.find((k) => k.id === id);
        $$("[data-row]", el).forEach((r) => (r.onclick = (e) => { if (!e.target.closest("button")) TP.projectDetails(find(r.dataset.row), reload); }));
        $$("[data-view]", el).forEach((b) => (b.onclick = () => TP.projectDetails(find(b.dataset.view), reload)));
        $$("[data-up]", el).forEach((b) => (b.onclick = () => TP.progressModal(find(b.dataset.up), reload)));
        $$("[data-pay]", el).forEach((b) => (b.onclick = () => TP.rateModal(find(b.dataset.pay), reload)));
        $$("[data-acc]", el).forEach((b) => (b.onclick = async () => { if (await TP.respondRequest(find(b.dataset.acc), true, b)) reload(); }));
        $$("[data-dec]", el).forEach((b) => (b.onclick = async () => { if (await TP.respondRequest(find(b.dataset.dec), false, b)) reload(); }));
      };
      $$("[data-t]", el).forEach((b) => (b.onclick = () => { tab = b.dataset.t; draw(); }));
      // opened from a notification: show that project's tab, highlight its row and open its details
      const target = openId && ks.find((k) => k.id === openId);
      if (target) tab = isDeclined(target.status) ? "DECLINED" : target.status;
      draw();
      if (openId) {
        if (!target) return TP.toast("That project is no longer available.", true);
        const row = el.querySelector(`[data-row="${target.id}"]`);
        if (row) { row.classList.add("flash"); row.scrollIntoView({ block: "center" }); }
        TP.projectDetails(target, reload);
      }
    },
  };

  // =====================================================================
  // MESSAGES (client + freelancer)
  // =====================================================================
  P.messages = {
    title: () => "Messages",
    async render(el, openId) {
      let inbox = await TP.api.getInbox(TP.me.id);
      let current = null, history = [], q = "";
      el.innerHTML = `<div class="split"><div class="card tight" style="height:calc(100vh - 190px);min-height:520px;display:flex;flex-direction:column">
          <h2 style="margin-bottom:10px">Chats</h2><input class="input" id="q" placeholder="Search conversations" style="margin-bottom:10px">
          <div id="list" style="overflow-y:auto;flex:1"></div></div>
        <div class="card chat" id="chat"><div class="empty" style="margin:auto">Select a conversation</div></div></div>`;

      const drawList = () => {
        const arr = inbox.filter((i) => (`${i.chatmate.fullname || ""} ${i.commission.name || ""}`).toLowerCase().includes(q));
        $("#list", el).innerHTML = arr.length
          ? arr.map((i) => {
              const lm = i.last_message || {};
              const prev = lm.message_type === "IMAGE" ? "📷 Photo" : lm.message_type === "DOCUMENT" ? "📄 " + (lm.attachment_name || "File") : lm.content || "";
              return `<div class="list-item ${current && current.commission.id === i.commission.id ? "active" : ""}" data-c="${i.commission.id}">${TP.avatar(i.chatmate, 44)}
                <div class="grow"><div class="bold" style="font-size:15px">${TP.uname(i.chatmate)}</div><div class="cond small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${i.is_from_me ? "You: " : ""}${esc(prev)}</div><div class="cond small faint" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(i.commission.name)}</div></div>
                <div class="col" style="align-items:flex-end;gap:4px"><span class="cond small muted">${TP.ago(lm.created_at)}</span>${Number(i.unread_count) ? `<span class="unread">${i.unread_count}</span>` : ""}</div></div>`;
            }).join("")
          : '<div class="empty">No conversations yet. Chats open once a project is accepted.</div>';
        $$("[data-c]", el).forEach((d) => (d.onclick = () => open(d.dataset.c)));
      };

      const bubble = (msg) => {
        const mine = msg.sender_id === TP.me.id;
        let body = esc(msg.content || "");
        if (msg.message_type === "IMAGE" && msg.attachment_url) body = `<img src="${esc(msg.attachment_url)}" alt="" data-img="${esc(msg.attachment_url)}" style="cursor:zoom-in">${msg.content ? "<div>" + esc(msg.content) + "</div>" : ""}`;
        else if (msg.message_type === "DOCUMENT" && msg.attachment_url) body = `📄 <a href="${esc(msg.attachment_url)}" target="_blank" rel="noopener">${esc(msg.attachment_name || "Download file")}</a>`;
        return `<div class="msg ${mine ? "me" : ""}"><div class="bubble-msg">${body}</div><time>${TP.time(msg.created_at)}</time></div>`;
      };
      const drawMessages = () => {
        const body = $("#body", el);
        if (!body) return;
        let lastDay = "";
        body.innerHTML = history.length
          ? history.map((m) => {
              const d = TP.longDate(m.created_at);
              const sep = d !== lastDay ? `<div class="cond small faint bold" style="text-align:center">${d}</div>` : "";
              lastDay = d;
              return sep + bubble(m);
            }).join("")
          : '<div class="empty" style="margin:auto">No messages yet. Say hi!</div>';
        body.querySelectorAll("[data-img]").forEach((i) => (i.onclick = () => TP.viewImage(i.dataset.img)));
        body.scrollTop = body.scrollHeight;
      };

      async function open(cid) {
        current = inbox.find((i) => i.commission.id === cid);
        if (!current) {
          // No messages yet for this project (it isn't in the inbox) — start the chat from the project itself
          const k = (await TP.api.getCommissions(TP.me.id)).find((x) => x.id === cid);
          if (!k || !k.client.id || !k.freelancer.id) return TP.toast("This project has no one to chat with yet.", true);
          current = { commission: k, chatmate: other(k), last_message: { created_at: k.created_at }, is_from_me: false, unread_count: 0 };
          inbox.unshift(current);
        }
        if (location.hash !== "#/messages/" + cid) window.history.replaceState(null, "", "#/messages/" + cid);
        const k = current.commission, mate = current.chatmate;
        const banned = TP.isBanned(mate) || TP.isBanned(k.client) || TP.isBanned(k.freelancer);
        $("#chat", el).innerHTML = `<div class="chat-head">${TP.avatar(mate, 48)}<div class="grow"><div class="bold" style="font-size:18px">${TP.uname(mate)} ${TP.isOnline(mate) ? '<span class="chip green">Online</span>' : ""}</div>
            <div class="row" style="gap:8px"><span class="cond small muted">Project: ${esc(k.name)}</span>${TP.statusChip(k.status)}${k.status === "IN_PROGRESS" ? `<span class="small bold">${k.progress_percentage}%</span>` : ""}</div></div>
            ${TP.me.role === "FREELANCER" && k.status === "IN_PROGRESS" ? '<button class="btn sm primary" id="upd">Update Progress</button>' : ""}<button class="btn sm" id="det">Details</button></div>
          <div class="chat-body" id="body"><div class="empty" style="margin:auto">Loading…</div></div>
          ${banned
            ? '<div class="composer"><div class="cond muted" style="text-align:center;width:100%">You can no longer message this user.</div></div>'
            : `<form class="composer" id="comp"><button type="button" class="icon-btn ghost" id="att" title="Attach file" style="color:var(--text)">${icon.clip}</button><input type="file" id="file" hidden>
               <input class="input" id="txt" placeholder="Type a message..." autocomplete="off"><button class="icon-btn" title="Send">${icon.send}</button></form>`}`;
        drawList();
        $("#det", el).onclick = () => TP.projectDetails(k, () => TP.refresh());
        if ($("#upd", el)) $("#upd", el).onclick = () => TP.progressModal(k, () => open(cid));
        history = await TP.api.getChat(cid);
        drawMessages();
        TP.api.markMessagesRead(cid, TP.me.id).then(() => { current.unread_count = 0; drawList(); });
        if (banned) return;
        const send = async (extra) => {
          const msg = { commission_id: cid, sender_id: TP.me.id, receiver_id: mate.id, message_type: "TEXT", content: null, read_at: false, created_at: new Date().toISOString(), ...extra };
          await TP.api.sendMessage(msg);
          if (TP.api.mode !== "demo") { history = await TP.api.getChat(cid); drawMessages(); }
        };
        $("#comp", el).onsubmit = async (e) => {
          e.preventDefault();
          const inp = $("#txt", el);
          const text = inp.value.trim();
          if (!text) return;
          inp.value = "";
          try { await send({ content: text }); } catch (ex) { inp.value = text; TP.err(ex); }
        };
        $("#att", el).onclick = () => $("#file", el).click();
        $("#file", el).onchange = async (e) => {
          const f = e.target.files[0];
          e.target.value = "";
          if (!f) return;
          if (f.size > 20 * 1024 * 1024) return TP.toast("File is too large (max 20 MB)", true);
          TP.toast("Uploading…");
          try {
            const url = await TP.api.uploadChatFile(cid, f);
            const img = f.type.startsWith("image/");
            await send({ message_type: img ? "IMAGE" : "DOCUMENT", attachment_url: url, attachment_name: f.name, attachment_mime: f.type || null });
          } catch (ex) { TP.err(ex); }
        };
        $("#txt", el).focus();
      }

      // live updates: realtime insert + 5 s refresh like the app
      TP.unsubChat = TP.api.subscribeMessages((msg) => {
        if (current && msg.commission_id === current.commission.id && !history.some((h) => h.id === msg.id)) {
          history.push(msg);
          drawMessages();
          if (msg.receiver_id === TP.me.id) TP.api.markMessagesRead(current.commission.id, TP.me.id);
        }
      });
      TP.onPoll = async () => {
        if (!document.body.contains(el)) return;
        inbox = await TP.api.getInbox(TP.me.id);
        if (current) {
          const inInbox = inbox.find((i) => i.commission.id === current.commission.id);
          if (inInbox) current = inInbox;
          else inbox.unshift(current);
          const fresh = await TP.api.getChat(current.commission.id);
          if (fresh.length !== history.length) { history = fresh; drawMessages(); TP.api.markMessagesRead(current.commission.id, TP.me.id); current.unread_count = 0; }
        }
        drawList();
      };
      $("#q", el).oninput = (e) => { q = e.target.value.toLowerCase(); drawList(); };
      drawList();
      if (openId) open(openId);
      else if (inbox.length && window.innerWidth > 820) open(inbox[0].commission.id);
    },
  };

  // =====================================================================
  // REPORTS (client + freelancer)
  // =====================================================================
  P.reports = {
    title: () => "Reports",
    async render(el) {
      const ks = await TP.api.getCommissions(TP.me.id);
      const fl = TP.me.role === "FREELANCER";
      const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      el.innerHTML = `<div class="row between wrap" style="margin-bottom:20px">
          <div class="row wrap"><div class="field" style="flex-direction:row;align-items:center"><label>From</label><input class="input" type="date" id="from" value="${yearAgo}" style="width:170px"></div>
          <div class="field" style="flex-direction:row;align-items:center"><label>To</label><input class="input" type="date" id="to" value="${today}" style="width:170px"></div></div>
          <button class="btn primary" id="csv">Export CSV (Excel)</button></div>
        <div class="grid g4" id="stats" style="margin-bottom:22px"></div>
        <div class="grid g2" style="margin-bottom:22px;align-items:start"><div class="card"><h2>Points per Month</h2><div class="chart" id="chart"></div><div class="cond small muted" style="margin-top:8px">Points from projects marked Done (by payment date).</div></div>
          <div class="card"><h2>Summary</h2><div class="col" id="sum"></div></div></div>
        <div class="table-card"><div class="table-scroll"><table><thead><tr><th>Project</th><th>${fl ? "Client" : "Freelancer"}</th><th>Deadline</th><th>Points</th><th>Status</th></tr></thead><tbody id="tb"></tbody></table></div></div>`;
      const draw = () => {
        const from = $("#from", el).value, to = $("#to", el).value;
        const rows = ks.filter((k) => { const d = String(k.created_at).slice(0, 10); return (!from || d >= from) && (!to || d <= to); });
        const c = (f) => rows.filter(f).length;
        const done = rows.filter((k) => k.status === "DONE");
        const total = done.reduce((s, k) => s + Number(k.points || 0), 0);
        $("#stats", el).innerHTML = [["Completed", c((k) => k.status === "DONE"), "var(--green)"], ["In Progress", c((k) => k.status === "IN_PROGRESS"), "var(--blue)"], ["Declined", c((k) => isDeclined(k.status)), "var(--red)"], ["Pending", c((k) => ["PENDING", "FOR_ADMIN_APPROVAL"].includes(k.status)), "var(--gold)"]]
          .map(([l, n, col]) => `<div class="stat" style="border-color:${col}"><div class="num" style="color:${col}">${n}</div><div class="lbl">${l}</div></div>`).join("");
        const months = [];
        for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push([d.toISOString().slice(0, 7), d.toLocaleString("en-US", { month: "short" })]); }
        const per = months.map(([key, lbl]) => [lbl, done.filter((k) => String(k.date_paid || k.created_at).slice(0, 7) === key).reduce((s, k) => s + Number(k.points || 0), 0)]);
        const max = Math.max(1, ...per.map((p) => p[1]));
        $("#chart", el).innerHTML = per.map(([l, v]) => `<div class="b" title="${TP.points(v)} points"><span class="bold" style="color:var(--text)">${v ? TP.points(v) : ""}</span><div style="height:${Math.max(2, (v / max) * 150)}px"></div><span>${l}</span></div>`).join("");
        const avg = done.filter((k) => k.rating).map((k) => Number(k.rating));
        $("#sum", el).innerHTML = `<div class="row between"><span>Total projects</span><b>${rows.length}</b></div><div class="row between"><span>${fl ? "Points earned" : "Points spent"}</span><b>${TP.points(total)}</b></div>
          <div class="row between"><span>Average rating ${fl ? "received" : "given"}</span><b>${avg.length ? (avg.reduce((a, b) => a + b, 0) / avg.length).toFixed(1) + " ★" : "—"}</b></div>
          <div class="row between"><span>Completion rate</span><b>${rows.length ? Math.round((done.length / rows.length) * 100) : 0}%</b></div>`;
        $("#tb", el).innerHTML = rows.length
          ? rows.map((k) => `<tr><td><div class="title">${esc(k.name)}</div><div class="desc">${esc(k.description)}</div></td><td>${TP.uname(other(k))}</td><td>${TP.date(k.due_date)}</td><td>${TP.points(k.points)}</td><td>${TP.statusChip(k.status)}</td></tr>`).join("") +
            `<tr><td colspan="3" class="bold">Total Points (Done)</td><td colspan="2" class="bold">${TP.points(total)}</td></tr>`
          : '<tr><td colspan="5"><div class="empty">No projects in this date range</div></td></tr>';
        $("#csv", el).onclick = () => {
          const cell = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
          const lines = [["Project", "Description", fl ? "Client" : "Freelancer", "Deadline", "Points", "Status", "Progress %", "Rating", "Date Paid"].map(cell).join(",")]
            .concat(rows.map((k) => [k.name, k.description, other(k).fullname, TP.date(k.due_date), k.points, (TP.STATUS[k.status] || [k.status])[0], k.progress_percentage, k.rating || "", k.date_paid ? TP.date(k.date_paid) : ""].map(cell).join(",")));
          TP.download(`trackpoints-report-${today}.csv`, "﻿" + lines.join("\r\n"));
        };
      };
      $("#from", el).onchange = draw;
      $("#to", el).onchange = draw;
      draw();
    },
  };

  // =====================================================================
  // CONCERNS (client + freelancer) — submit a concern + see my concerns
  // =====================================================================
  P.concerns = {
    title: () => "Concerns",
    async render(el) {
      const [ks, mine] = await Promise.all([TP.api.getCommissions(TP.me.id), TP.api.getMyConcerns(TP.me.id)]);
      const opts = ks.map((k) => `<option value="${k.id}">${esc(k.name)} — ${esc(TP.titleCase(other(k).fullname))}</option>`).join("");
      const names = {};
      ks.forEach((k) => { names[k.client.id] = k.client.fullname; names[k.freelancer.id] = k.freelancer.fullname; });
      el.innerHTML = `<div class="split wide">
        <div class="card col gap-lg"><div><h2 style="margin-bottom:4px">Submit a Concern</h2><div class="cond muted">Tell us about the problem. The Admin will review it and mark it as resolved or dismissed.</div></div>
          <div class="grid g2" style="gap:16px"><div class="field"><label>Concern Type</label><select class="input" id="cat">${Object.entries(TP.CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
            <div class="field"><label>Related Project</label><select class="input" id="proj"><option value="">Select project</option>${opts}</select></div></div>
          <div class="cond small muted" id="who"></div>
          <div class="field"><label>Subject</label><input class="input" id="sub" placeholder="Short summary of your concern" maxlength="120"></div>
          <div class="field"><label>Description</label><textarea class="input" id="desc" placeholder="Describe what happened, when it happened, and what you expect to be done..."></textarea></div>
          <div class="field"><label>Evidence (optional)</label><div class="upload" id="ev">${icon.upload}<div>Click to upload a screenshot · PNG or JPG</div></div></div>
          <div class="error" id="err"></div>
          <div class="row" style="justify-content:flex-end"><button class="btn" id="clr">Clear</button><button class="btn primary" id="go">Submit Concern</button></div></div>
        <div class="card"><h2>My Concerns</h2><div class="col" id="mine">${
          mine.length
            ? mine.map((c) => `<div class="sub-card col" style="gap:4px"><div class="row between"><span class="small bold muted">${esc(TP.CATEGORIES[c.category] || c.category)}</span>${TP.concernChip(c.status)}</div><div class="bold" style="font-size:16px">${esc(c.sub_type)}</div><div class="cond small muted">Against ${esc(TP.titleCase(names[c.reported_id] || "user"))} · ${TP.longDate(c.created_at)}</div></div>`).join("")
            : '<div class="empty">You haven\'t submitted any concerns</div>'
        }</div></div></div>`;
      const getEv = TP.bindUpload($("#ev", el));
      $("#proj", el).onchange = (e) => { const k = ks.find((x) => x.id === e.target.value); $("#who", el).textContent = k ? `This concern will be filed against ${TP.titleCase(other(k).fullname)}.` : ""; };
      $("#clr", el).onclick = () => TP.refresh();
      $("#go", el).onclick = async (e) => {
        const k = ks.find((x) => x.id === $("#proj", el).value);
        const sub = $("#sub", el).value.trim();
        const err = $("#err", el);
        if (!k) return (err.textContent = "Please choose the related project");
        if (!sub) return (err.textContent = "Please write a short subject");
        if (!(await TP.confirm("Submit concern", "Submit this concern to the Admin?", "Submit"))) return;
        await TP.busy(e.target, async () => {
          const file = getEv();
          const evidence_url = file ? await TP.api.uploadEvidence(TP.me.id, file) : null;
          await TP.api.submitConcern({
            reporter_id: TP.me.id, reported_id: other(k).id, commission_id: k.id,
            category: $("#cat", el).value, sub_type: sub, description: $("#desc", el).value.trim() || null,
            evidence_url, status: "PENDING", created_at: new Date().toISOString(),
          });
        });
        TP.toast("Concern submitted.");
        TP.refresh();
      };
    },
  };

  // =====================================================================
  // PROFILE (client + freelancer) and Settings (admin)
  // =====================================================================
  P.profile = {
    title: (r) => (r === "ADMIN" ? "Settings" : "Profile"),
    async render(el) {
      const me = (TP.me = await TP.api.getUser(TP.me.id));
      const fl = me.role === "FREELANCER";
      // is the saved phone number the one verified by text message?
      let phoneVerified = false;
      try { const au = await TP.api.authUser(); phoneVerified = !!(au && au.phone && au.phone_confirmed_at && me.phone_number && TP.e164(TP.normPhone(me.phone_number) || me.phone_number).replace("+", "") === String(au.phone).replace("+", "")); } catch (e) { /* ignore */ }
      const phoneState = phoneVerified
        ? ' <span class="chip green">Verified</span>'
        : TP.smsOn() ? ' <button class="btn sm" id="verifyPhone" style="margin-left:6px">Verify by text</button>' : "";
      const vs = String(me.verification_status || "UNVERIFIED").trim();
      if (fl) {
        // users.rating is never updated; the real rating is the average of the client ratings on finished projects
        const rated = (await TP.api.getCommissions(me.id)).filter((k) => k.freelancer.id === me.id && k.rating != null).map((k) => Number(k.rating));
        me.rating = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 5;
        me.ratingCount = rated.length;
      }
      const vChip = { VERIFIED: '<span class="chip green">Verified</span>', PENDING: '<span class="chip gold">Under Review</span>', REJECTED: '<span class="chip red">Rejected</span>' }[vs] || '<span class="chip red">Not Verified</span>';
      el.innerHTML = `<div class="split" style="grid-template-columns:400px 1fr">
        <div class="card col" style="align-items:center;text-align:center;gap:12px">
          <div style="position:relative">${TP.avatar(me, 150)}<button class="icon-btn" id="pic" title="Change photo" style="position:absolute;right:0;bottom:4px;width:44px;height:44px;border:3px solid var(--cream)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff1ba" stroke-width="2"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></button><input type="file" id="picFile" accept="image/*" hidden></div>
          <div class="bold" style="font-size:24px">${TP.uname(me, true)}</div><div class="cond muted">${TP.titleCase(me.role)} Account</div>
          ${fl ? `${me.specialty ? `<span class="chip orange" style="font-size:14px;padding:6px 14px">${esc(me.specialty)}</span>` : ""}<div>${TP.stars(me.rating)} <b>${Number(me.rating || 5).toFixed(1)}</b> <span class="cond small muted">(${me.ratingCount || 0} rating${me.ratingCount === 1 ? "" : "s"})</span></div>` : ""}
          ${me.role !== "ADMIN" ? `<div class="sub-card col" style="width:100%;text-align:left;border-style:${vs === "VERIFIED" ? "solid" : "dashed"};border-color:${vs === "VERIFIED" ? "var(--green)" : "var(--red)"}">
            <div class="row" style="color:${vs === "VERIFIED" ? "var(--green)" : "var(--text)"}">${icon.shield}<b style="color:var(--text)">Account Verification</b>${vChip}</div>
            <div class="cond small muted">${vs === "VERIFIED" ? "Your ID was checked by the Admin." : vs === "PENDING" ? "The Admin is reviewing your ID." : "Upload a valid ID so the Admin can verify your account."}</div>
            ${vs !== "VERIFIED" ? '<button class="btn primary block" id="verify">' + (vs === "PENDING" ? "View / Replace ID" : "Upload ID to Verify") + "</button>" : ""}</div>` : ""}
          <button class="btn block" id="edit">Edit Profile</button><button class="btn block" id="pw">Change Password</button></div>
        <div class="col gap-lg"><div class="card"><h2>Account Information</h2><div class="grid g2" style="gap:18px">
            <div><div class="cond small muted">Email Account</div><div class="bold">${esc(me.email)}</div></div>
            <div><div class="cond small muted">Phone Number</div><div class="bold">${me.phone_number ? TP.phoneLink(me.phone_number) + phoneState : '<button class="link-btn" id="addPhone" style="color:var(--orange);font-style:normal;font-weight:700">+ Add phone number</button>'}</div></div>
            <div><div class="cond small muted">Member Since</div><div class="bold">${TP.longDate(me.created_at)}</div></div>
            <div><div class="cond small muted">Role</div><div>${TP.roleChip(me.role)}</div></div>
            ${fl ? `<div><div class="cond small muted">Specialty</div><div class="bold">${esc(me.specialty || "—")}</div></div><div><div class="cond small muted">Hourly Rate</div><div class="bold">${esc(me.hourly_rate || "—")}</div></div>` : ""}
          </div></div>
          ${fl ? `<div class="card"><div class="row between"><h2 style="margin:0">Portfolio</h2><button class="btn sm" id="addP">+ Add Images</button><input type="file" id="pFiles" accept="image/*" multiple hidden></div>
            <div class="portfolio" style="margin-top:16px">${(me.portfolio || []).length ? me.portfolio.map((u, i) => `<div class="ph" style="position:relative"><img src="${esc(u)}" alt="" data-img="${esc(u)}"><button class="btn sm danger" data-rm="${i}" style="position:absolute;top:8px;right:8px;padding:2px 10px">×</button></div>`).join("") : '<div class="empty" style="grid-column:1/-1">Add images of your past work so clients can see what you do.</div>'}</div></div>` : ""}
        </div></div>`;
      $("#pic", el).onclick = () => $("#picFile", el).click();
      $("#picFile", el).onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        TP.toast("Uploading photo…");
        try { await TP.api.uploadAvatar(me.id, f); TP.toast("Profile photo updated."); TP.refresh(); } catch (ex) { TP.err(ex); }
      };
      if ($("#verify", el)) $("#verify", el).onclick = () => TP.go("verify");
      $$("[data-img]", el).forEach((i) => (i.onclick = () => TP.viewImage(i.dataset.img)));
      if ($("#addP", el)) {
        $("#addP", el).onclick = () => $("#pFiles", el).click();
        $("#pFiles", el).onchange = async (e) => {
          const files = [...e.target.files];
          if (!files.length) return;
          TP.toast("Uploading " + files.length + " image(s)…");
          try {
            const urls = await TP.api.uploadPortfolio(me.id, files);
            await TP.api.updateUser(me.id, { portfolio: [...(me.portfolio || []), ...urls] });
            TP.toast("Portfolio updated.");
            TP.refresh();
          } catch (ex) { TP.err(ex); }
        };
        $$("[data-rm]", el).forEach((b) => (b.onclick = async () => {
          if (!(await TP.confirm("Remove image", "Remove this image from your portfolio?", "Remove", true))) return;
          const list = [...me.portfolio];
          list.splice(Number(b.dataset.rm), 1);
          try { await TP.api.updateUser(me.id, { portfolio: list }); TP.refresh(); } catch (ex) { TP.err(ex); }
        }));
      }
      if ($("#addPhone", el)) $("#addPhone", el).onclick = () => $("#edit", el).click();
      if ($("#verifyPhone", el)) $("#verifyPhone", el).onclick = async (e) => {
        const phone = TP.e164(TP.normPhone(me.phone_number) || me.phone_number);
        try { await TP.busy(e.target, () => TP.api.startPhoneVerify(phone)); } catch (ex) { return; }
        const m = TP.modal(`${TP.modalHead("Verify Phone")}
          <p class="cond" style="margin:0">We texted a 6-digit code to <b>${esc(me.phone_number)}</b>.</p>
          <input class="input" id="pc" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="font-size:22px;letter-spacing:6px;text-align:center">
          <div class="error" id="err"></div>
          <div class="row" style="justify-content:space-between"><button class="btn" id="again">Resend code</button><button class="btn primary" id="ok">Verify</button></div>`, { width: 420 });
        m.querySelector("#again").onclick = async (ev) => { try { await TP.busy(ev.target, () => TP.api.startPhoneVerify(phone)); TP.toast("New code sent."); } catch (x) { /* shown */ } };
        m.querySelector("#ok").onclick = async (ev) => {
          const c = m.querySelector("#pc").value.replace(/\D/g, "");
          if (c.length < 6) return (m.querySelector("#err").textContent = "Please enter the 6-digit code");
          try { await TP.busy(ev.target, () => TP.api.verifyPhoneCode(phone, c), true); m.close(); TP.toast("Phone number verified."); TP.refresh(); }
          catch (x) { m.querySelector("#err").textContent = /expired|invalid/i.test(x.message) ? "That code is wrong or expired. Tap Resend code." : x.message; }
        };
      };
      if (TP.openEditProfile) { TP.openEditProfile = false; setTimeout(() => $("#edit", el) && $("#edit", el).click(), 0); }
      $("#edit", el).onclick = () => {
        const m = TP.modal(`${TP.modalHead("Edit Profile")}
          <div class="field"><label>Full Name</label><input class="input" id="fn" value="${esc(me.fullname)}"></div>
          <div class="field"><label>Phone Number</label><input class="input" id="ph" value="${esc(me.phone_number || "")}" placeholder="0917 123 4567" type="tel" inputmode="tel"></div>
          ${fl ? `<div class="field"><label>Specialty</label><input class="input" id="sp" value="${esc(me.specialty || "")}" placeholder="e.g. UI/UX Designer"></div>` : ""}
          <div class="error" id="err"></div><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Cancel</button><button class="btn primary" id="save">Save</button></div>`);
        m.querySelector("[data-close]").onclick = () => m.close();
        m.querySelector("#save").onclick = async (e) => {
          const fullname = m.querySelector("#fn").value.trim();
          if (fullname.length < 6) return (m.querySelector("#err").textContent = "Full name is too short (minimum is 6 characters)");
          const rawPhone = m.querySelector("#ph").value.trim();
          const phone = rawPhone ? TP.normPhone(rawPhone) : null;
          if (rawPhone && !phone) return (m.querySelector("#err").textContent = "Enter a valid mobile number, e.g. 0917 123 4567");
          const upd = { fullname, phone_number: phone };
          if (fl) upd.specialty = m.querySelector("#sp").value.trim() || null;
          await TP.busy(e.target, () => TP.api.updateUser(me.id, upd));
          m.close();
          TP.toast("Profile saved.");
          TP.refresh();
        };
      };
      $("#pw", el).onclick = () => {
        const m = TP.modal(`${TP.modalHead("Change Password")}
          <div class="field"><label>New Password</label><input class="input" type="password" id="p1" autocomplete="new-password"></div>
          <div class="field"><label>Confirm New Password</label><input class="input" type="password" id="p2" autocomplete="new-password"></div>
          <div class="cond small muted">At least 8 characters with an uppercase letter, a lowercase letter, a number and a special character.</div>
          <div class="error" id="err"></div><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Cancel</button><button class="btn primary" id="save">Update Password</button></div>`, { width: 460 });
        m.querySelector("[data-close]").onclick = () => m.close();
        m.querySelector("#save").onclick = async (e) => {
          const p1 = m.querySelector("#p1").value;
          let msg = TP.validatePassword(p1);
          if (!msg && p1 !== m.querySelector("#p2").value) msg = "Passwords do not match";
          if (msg) return (m.querySelector("#err").textContent = msg);
          try { await TP.busy(e.target, () => TP.api.updatePassword(p1)); m.close(); TP.toast("Password updated."); } catch (ex) { m.querySelector("#err").textContent = ex.message; }
        };
      };
    },
  };

  // =====================================================================
  // ACCOUNT VERIFICATION (freelancer)
  // =====================================================================
  P.verify = {
    title: () => "Account Verification",
    async render(el) {
      const me = (TP.me = await TP.api.getUser(TP.me.id));
      const vs = String(me.verification_status || "UNVERIFIED").trim();
      const step = vs === "VERIFIED" ? 5 : vs === "PENDING" ? 3 : 2;
      const st = (n, l) => `<div class="step ${n < step ? "ok" : n === step ? "on" : ""}"><span class="n">${n < step ? "✓" : n}</span>${l}</div>`;
      const line = (n) => `<div class="step-line ${n < step ? "ok" : ""}"></div>`;
      el.innerHTML = `<div class="card" style="margin-bottom:22px;padding:20px"><div class="stepper">${st(1, "Account Created")}${line(1)}${st(2, "Upload ID")}${line(2)}${st(3, "Admin Review")}${line(3)}${st(4, "Verified")}</div></div>
        <div class="split wide">
          <div class="card col gap-lg">${
            vs === "VERIFIED"
              ? `<h2>You're verified ✓</h2><p class="cond">Your account has a Verified badge. Clients can see it on your profile.</p><button class="btn" id="back" style="align-self:flex-start">Back to Profile</button>`
              : `<div><h2 style="margin-bottom:4px">${vs === "PENDING" ? "Your ID is being reviewed" : "Upload a Valid ID"}</h2><div class="cond muted">${vs === "PENDING" ? "You can replace the photo below if you uploaded the wrong one." : "Make sure your ID is valid, not expired, and all details are clear and readable."}${vs === "REJECTED" ? ' <b style="color:var(--red)">Your last ID was rejected — please upload a clearer photo.</b>' : ""}</div></div>
                ${me.verification_id_url ? `<div class="field"><label>Currently submitted</label><div class="doc-img" style="max-width:360px"><img src="${esc(me.verification_id_url)}" alt="Submitted ID" data-img="${esc(me.verification_id_url)}"></div></div>` : ""}
                <div class="field"><label>${me.verification_id_url ? "Upload a new ID photo" : "Photo of your valid ID"}</label><div class="upload" id="id" style="min-height:160px">${icon.upload}<div>Click to upload (PhilSys, Driver's License, Passport, UMID…)</div></div></div>
                <label class="check"><input type="checkbox" id="ok"> I confirm that the document I submitted is true and mine.</label>
                <div class="error" id="err"></div>
                <div class="row" style="justify-content:flex-end"><button class="btn" id="back">Back</button><button class="btn primary" id="go">Submit for Verification</button></div>`
          }</div>
          <div class="card col"><h2>Verification Status</h2><div class="row">${icon.shield}${{ VERIFIED: '<span class="chip green">Verified</span>', PENDING: '<span class="chip gold">Under Review</span>', REJECTED: '<span class="chip red">Rejected</span>' }[vs] || '<span class="chip red">Not Submitted</span>'}</div>
            <h3 style="margin-top:10px">Why verify?</h3><div class="cond col">${(TP.me.role === "FREELANCER" ? ["Get a Verified badge on your profile", "Clients trust verified freelancers more", "Required to keep receiving project requests"] : ["Get a Verified badge on your profile", "Freelancers know you are a real client", "Helps the Admin settle concerns faster"]).map((t) => `<div class="row"><span class="chip green">✓</span>${t}</div>`).join("")}</div>
            <h3 style="margin-top:10px">What happens next</h3><div class="cond col">${["Submit your ID photo", "The Admin reviews it (usually 1–3 days)", "You see the result here and on your profile"].map((t, i) => `<div class="row"><span class="chip gold">${i + 1}</span>${t}</div>`).join("")}</div></div></div>`;
      $("#back", el).onclick = () => TP.go("profile");
      $$("[data-img]", el).forEach((i) => (i.onclick = () => TP.viewImage(i.dataset.img)));
      if (!$("#go", el)) return;
      const getId = TP.bindUpload($("#id", el));
      $("#go", el).onclick = async (e) => {
        const f = getId();
        const err = $("#err", el);
        if (!f) return (err.textContent = "Please upload a photo of your ID");
        if (!$("#ok", el).checked) return (err.textContent = "Please tick the confirmation box");
        await TP.busy(e.target, async () => {
          const url = await TP.api.uploadIdPhoto(me.id, f);
          await TP.api.updateUser(me.id, { verification_id_url: url, verification_status: "PENDING" });
        });
        TP.toast("Submitted. The Admin will review your ID.");
        TP.refresh();
      };
    },
  };
})(window.TP);
