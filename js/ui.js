// TrackPoints Web — small UI helpers shared by every screen.
window.TP = window.TP || {};
window.TP.pages = window.TP.pages || {};
(function (TP) {
  // Escape text before putting it into HTML (prevents broken pages / injected HTML).
  TP.esc = (v) =>
    String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  TP.$ = (sel, root = document) => root.querySelector(sel);
  TP.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  TP.titleCase = (s) => String(s || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  TP.initials = (name) =>
    String(name || "?").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  TP.points = (n) => Number(n || 0).toLocaleString("en-US");
  TP.date = (v) => (v ? new Date(v).toLocaleDateString("en-CA") : "—"); // 2026-11-10
  TP.longDate = (v) => (v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
  TP.time = (v) => (v ? new Date(v).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "");
  TP.ago = (v) => {
    if (!v) return "";
    const s = Math.max(0, (Date.now() - new Date(v).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    if (s < 604800) return Math.floor(s / 86400) + "d ago";
    return TP.longDate(v);
  };
  TP.isOnline = (u) => u && u.last_seen && Date.now() - new Date(u.last_seen).getTime() < 2 * 60000;
  // Verified badge: a small green check shown next to the name of every verified user
  TP.isVerified = (u) => !!u && String(u.verification_status || "").trim() === "VERIFIED";
  TP.vbadge = (u, label) =>
    TP.isVerified(u)
      ? `<span class="vbadge${label ? " with-label" : ""}" title="Verified account — ID checked by the Admin"><svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${label ? "Verified" : ""}</span>`
      : "";
  TP.uname = (u, label) => TP.esc(TP.titleCase(u && u.fullname)) + TP.vbadge(u, label);
  TP.isBanned = (u) => !!u && (u.is_permanently_banned || (u.ban_until && new Date(u.ban_until) > new Date()));

  // Commission status -> label + chip color (same names as the app's displayName)
  TP.STATUS = {
    FOR_ADMIN_APPROVAL: ["For Admin Approval", "gold"],
    PENDING: ["Pending", "gold"],
    IN_PROGRESS: ["In Progress", "blue"],
    DONE: ["Done", "green"],
    REJECTED_BY_ADMIN: ["Rejected by Admin", "red"],
    REJECTED_BY_FREELANCER: ["Declined", "red"],
  };
  TP.statusChip = (s) => {
    const [l, c] = TP.STATUS[s] || [s, "gold"];
    return `<span class="chip ${c}">${TP.esc(l)}</span>`;
  };
  TP.CATEGORIES = {
    USER_BEHAVIOR: "User Behavior",
    CONTENT_VIOLATIONS: "Content Violations",
    PROJECT_ISSUES: "Project Issues",
    PAYMENT_ISSUES: "Payment Issues",
    SYSTEM_MISUSE: "System Misuse",
    AGREEMENT_VIOLATIONS: "Agreement Violations",
    OTHER: "Other",
  };
  TP.concernChip = (s) =>
    ({ PENDING: '<span class="chip gold">Under Review</span>', RESOLVED: '<span class="chip green">Resolved</span>', DISMISSED: '<span class="chip dark">Dismissed</span>' }[s] ||
    `<span class="chip gold">${TP.esc(s)}</span>`);
  TP.roleChip = (r) =>
    r === "CLIENT" ? '<span class="chip orange">Client</span>' : r === "FREELANCER" ? '<span class="chip blue">Freelancer</span>' : '<span class="chip dark">Admin</span>';

  TP.progressBar = (p) => {
    p = Math.max(0, Math.min(100, Number(p) || 0));
    return `<div class="bar ${p === 100 ? "done" : ""}"><div class="track"><div class="fill" style="width:${p}%"></div></div><b style="color:${p === 100 ? "var(--green)" : "inherit"}">${p}%</b></div>`;
  };
  TP.avatar = (u, size = 44) => {
    const name = (u && (u.fullname || u.fullName)) || "?";
    const inner = u && u.photo ? `<img src="${TP.esc(u.photo)}" alt="">` : TP.initials(name);
    return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px">${inner}</div>`;
  };
  TP.stars = (r) => {
    const n = Math.round(Number(r) || 0);
    return `<span style="color:#f5b301;letter-spacing:1px">${"★".repeat(n)}<span style="color:var(--cream-3)">${"★".repeat(5 - n)}</span></span>`;
  };

  // ---------- Icons (simple inline SVG, same meaning as the app's icons) ----------
  const s = (d, extra = "") =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
  TP.icon = {
    home: s('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="currentColor" stroke="none"/>'),
    folder: s('<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor" stroke="none"/>'),
    chat: s('<path d="M4 5h16v11H8l-4 4z" fill="currentColor" stroke="none"/>'),
    chart: s('<path d="M4 20h16M7 16v-5M11 16V7M15 16v-3M19 16V9"/>'),
    flag: s('<path d="M6 21V4h11l-2.5 4L17 12H6" fill="currentColor"/>'),
    user: s('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>'),
    users: s('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.5-5 6.5-5s5.7 1.5 6.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4 1.5 4.5 4"/>'),
    file: s('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h4"/>'),
    warn: s('<path d="M12 3 2 20h20z" fill="currentColor" stroke="none"/><path d="M12 10v4" stroke="var(--cream)"/><circle cx="12" cy="17" r=".8" fill="var(--cream)" stroke="var(--cream)"/>'),
    gear: s('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    bell: s('<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" fill="currentColor" stroke="none"/><path d="M10 20a2 2 0 0 0 4 0"/>', 'width="40" height="40"'),
    send: s('<path d="M3 11 21 3l-8 18-2-8z" fill="var(--cream)" stroke="var(--cream)"/>', 'width="24" height="24"'),
    clip: s('<path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5"/>', 'width="26" height="26"'),
    out: s('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>', 'width="20" height="20"'),
    eye: s('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', 'width="22" height="22"'),
    eyeOff: s('<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>', 'width="22" height="22"'),
    upload: s('<path d="M12 16V4m0 0-5 5m5-5 5 5M4 20h16"/>', 'width="28" height="28"'),
    menu: s('<path d="M4 6h16M4 12h16M4 18h16"/>', 'width="24" height="24"'),
    shield: s('<path d="M12 2 20 5v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="currentColor" stroke="none"/><path d="m8.5 12 2.5 2.5 4.5-5" stroke="var(--cream)"/>', 'width="26" height="26"'),
    info: s('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', 'width="18" height="18"'),
    person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#5c4300" stroke-width="2.2"/><circle cx="12" cy="9.5" r="3.6" fill="#5c4300"/><path d="M5.5 18.5c1.4-2.6 3.8-3.8 6.5-3.8s5.1 1.2 6.5 3.8" fill="#5c4300"/></svg>',
  };

  // ---------- Toast, modal, confirm ----------
  let toastTimer;
  TP.toast = (msg, isErr, onClick) => {
    let t = TP.$(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.toggle("err", !!isErr);
    t.classList.toggle("clickable", typeof onClick === "function");
    t.onclick = typeof onClick === "function" ? () => { t.classList.add("hidden"); onClick(); } : null;
    t.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add("hidden"), onClick ? 6000 : 3200);
  };
  TP.err = (e) => TP.toast((e && e.message) || String(e), true);

  // Opens a modal. `html` is the inside; returns the modal element. Call close() to remove.
  TP.modal = (html, { width } = {}) => {
    const ov = document.createElement("div");
    ov.className = "overlay";
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" ${width ? `style="width:min(${width}px,100%)"` : ""}>${html}</div>`;
    const close = () => ov.remove();
    ov.addEventListener("mousedown", (e) => {
      if (e.target === ov) close();
    });
    ov.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    document.body.appendChild(ov);
    const m = ov.firstElementChild;
    m.close = close;
    return m;
  };
  TP.modalHead = (title) =>
    `<div class="row between"><h2>${TP.esc(title)}</h2><button class="close" data-close aria-label="Close">×</button></div>`;

  TP.confirm = (title, message, okLabel = "Confirm", danger = false) =>
    new Promise((resolve) => {
      const m = TP.modal(
        `${TP.modalHead(title)}<p class="cond" style="margin:0;line-height:1.45">${TP.esc(message)}</p>
         <div class="row" style="justify-content:flex-end"><button class="btn" data-no>Cancel</button><button class="btn ${danger ? "danger" : "primary"}" data-yes>${TP.esc(okLabel)}</button></div>`,
        { width: 460 }
      );
      m.querySelector("[data-yes]").onclick = () => { m.close(); resolve(true); };
      m.querySelector("[data-no]").onclick = () => { m.close(); resolve(false); };
      m.querySelector("[data-close]").addEventListener("click", () => resolve(false));
    });

  TP.viewImage = (url) => TP.modal(`${TP.modalHead("Preview")}<img src="${TP.esc(url)}" style="max-width:100%;border-radius:14px">`, { width: 820 });

  // Runs an async action while disabling the button, shows errors as a toast.
  TP.busy = async (btn, fn, quiet) => {
    const old = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = "Please wait…"; }
    try {
      return await fn();
    } catch (e) {
      if (!quiet) TP.err(e);
      throw e;
    } finally {
      if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = old; }
    }
  };

  // Hooks up an .upload box: clicking opens the file picker, shows a preview, returns getter.
  TP.bindUpload = (box, { multiple = false, accept = "image/*" } = {}) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    box.appendChild(input);
    const label = box.innerHTML;
    box.addEventListener("click", (e) => { if (e.target !== input) input.click(); });
    input.addEventListener("change", () => {
      const files = [...input.files];
      if (!files.length) return;
      const f = files[0];
      const pics = files.filter((x) => x.type.startsWith("image/"));
      box.querySelectorAll(".preview, .fname").forEach((n) => n.remove());
      if (pics.length && !multiple) {
        box.insertAdjacentHTML("beforeend", `<img class="preview" src="${URL.createObjectURL(f)}" alt="">`);
      } else {
        box.insertAdjacentHTML("beforeend", `<div class="fname bold" style="color:var(--text)">${files.length > 1 ? files.length + " files selected" : TP.esc(f.name)}</div>`);
      }
    });
    void label;
    return () => (multiple ? [...input.files] : input.files[0] || null);
  };

  TP.validatePassword = (v) => {
    if (!v) return "Password is required";
    if (v.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(v)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(v)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(v)) return "Password must contain at least one number";
    if (!/[^A-Za-z0-9]/.test(v)) return "Password must contain at least one special character";
    return "";
  };
  // Philippine mobile numbers: accepts 09171234567, 9171234567, +639171234567, 63 917 123 4567 …
  // Returns the number as "+63 917 123 4567", or null if it isn't a valid PH mobile number.
  TP.normPhone = (v) => {
    let d = String(v || "").replace(/\D/g, "");
    if (d.startsWith("63")) d = d.slice(2);
    if (d.startsWith("0")) d = d.slice(1);
    if (!/^9\d{9}$/.test(d)) return null;
    return `+63 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  };
  TP.e164 = (p) => String(p || "").replace(/\s/g, ""); // "+63 917 123 4567" -> "+639171234567" (format Supabase needs)
  TP.smsOn = () => !!window.TP_CONFIG.SMS_ENABLED;
  TP.phoneLink = (p) => (p ? `<a href="tel:${TP.esc(String(p).replace(/\s/g, ""))}" style="color:inherit">${TP.esc(p)}</a>` : '<span class="faint">—</span>');
  TP.validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // Download text as a file (used by the Reports CSV export)
  TP.download = (name, text, type = "text/csv") => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
})(window.TP);
