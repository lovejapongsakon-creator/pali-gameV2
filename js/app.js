/* หอไตรบาลี — ส่วนหน้าจอและลำดับการเล่น */
(function () {
  const C = window.PALI_CONFIG, D = window.PALI_DATA, Q = window.QGen;
  const $app = document.getElementById("app");
  const TH = "๐๑๒๓๔๕๖๗๘๙";
  const thn = (n) => String(n).replace(/\d/g, (d) => TH[d]);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // ข้อความที่มีคำบาลีอยู่ใน “...” → ทำตัวหนาสีน้ำเงิน ไม่ตัดกลางคำ
  const fmt = (s) => esc(s).replace(/“([^”]+)”/g, (m, w) => w.split(" ").map((x) => `<span class="pali">${x}</span>`).join(" "));
  const paliList = (s) => esc(s).split(" ").map((x) => `<span class="pali">${x}</span>`).join(" ");
  const STAGES = { A: { name: "ด่านที่ ๑ · เรียนรู้", subs: ["จำศัพท์", "คัดแยก", "แจกศัพท์", "นักสืบวิภัตติ", "บอสหน่วย"] },
                   B: { name: "ด่านที่ ๒ · ประยุกต์", subs: ["จับคู่", "แปลความ", "ตารางแจก", "ทบทวนข้ามหน่วย", "บอสใหญ่"] } };

  const S = { cfg: null, student: null, prog: {}, teacher: false, teacherCode: "", preview: false, round: null };
  const setting = (k) => { const v = S.cfg && S.cfg.settings && S.cfg.settings[k]; return v === undefined || v === "" ? C[k] : (typeof C[k] === "number" ? +v : typeof C[k] === "boolean" ? String(v).toUpperCase() === "TRUE" : v); };
  const unitData = (n) => D.units.find((u) => u.n === n);
  const P = (n) => (S.prog[n] = S.prog[n] || { A: 0, B: 0, stars: {}, xp: 0 });

  // ---------- สถานะหน่วย (เปิดสัปดาห์ละหน่วย) ----------
  function unitStatus(n) {
    if (S.teacher) return "open";
    const u = (S.cfg.units || []).find((x) => +x.n === n) || {};
    if (u.status) return u.status;
    const today = new Date().toISOString().slice(0, 10);
    if (u.open && today < u.open) return "upcoming";
    if (u.close && today > u.close) return "closed";
    return "open";
  }
  const unitSched = (n) => (S.cfg.units || []).find((x) => +x.n === n) || {};
  const thDate = (iso) => { if (!iso) return ""; const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" }); };

  // ---------- ทั่วไป ----------
  function toast(msg, ms = 2600) {
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }
  function modal(html) {
    const m = document.createElement("div"); m.className = "modal"; m.innerHTML = `<div class="card">${html}</div>`;
    m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) m.remove(); });
    document.body.appendChild(m); return m;
  }
  const totalXP = () => Object.values(S.prog).reduce((s, p) => s + (p.xp || 0), 0);
  function refreshTop() {
    document.getElementById("logoTop").src = C.LOGO;
    const who = document.getElementById("whoami");
    who.textContent = S.teacher ? `โหมดครู · ${C.TEACHER}` : S.student ? [S.student.name, S.student.cls].filter(Boolean).join(" · ") : "เกมการเรียนรู้ภาษาบาลี บ21202";
    document.getElementById("xpChip").classList.toggle("hidden", !S.student);
    document.getElementById("xp").textContent = thn(totalXP());
    document.getElementById("menuBtn").classList.toggle("hidden", !(S.student || S.teacher));
    document.getElementById("soundBtn").textContent = SFX.on ? "🔊" : "🔇";
  }
  function save() { if (S.student && !S.teacher) API.saveLocal(S.student.id, S.prog); refreshTop(); }
  const go = (fn, ...a) => { window.scrollTo({ top: 0 }); fn(...a); refreshTop(); };

  // ---------- เข้าสู่ระบบ ----------
  function renderLogin() {
    $app.innerHTML = `
      <section class="hero">
        <img class="logo-big" src="${esc(C.LOGO)}" alt="ตราโรงเรียน">
        <h1>หอไตรบาลี</h1>
        <p class="muted">เกมการเรียนรู้ ${esc(C.COURSE)}<br>${esc(C.SCHOOL)}</p>
        ${ART.mascot("hello")}
      </section>
      <section class="card login-box">
        <h2>เข้าเล่นเกม</h2>
        <p class="small">ใส่รหัสนักเรียนของตนเอง</p>
        <form id="loginForm" class="grid">
          <input class="field" id="sid" inputmode="numeric" autocomplete="off" placeholder="รหัสนักเรียน" required>
          <div id="extra" class="grid hidden">
            <input class="field" id="sname" placeholder="ชื่อ–นามสกุล">
            <div class="row"><input class="field" id="scls" placeholder="ชั้น เช่น ม.๑/๑" style="flex:2"><input class="field" id="sno" placeholder="เลขที่" inputmode="numeric" style="flex:1"></div>
          </div>
          <button class="btn block" id="loginBtn">เริ่มเล่น ▶</button>
        </form>
        <p class="center"><button class="link" id="teacherLink">สำหรับครูผู้สอน</button></p>
        ${API.demo ? `<p class="small center">โหมดทดลอง: ยังไม่ได้เชื่อม Google Sheet ผลการเล่นจะเก็บไว้ในเครื่องนี้เท่านั้น</p>` : ""}
      </section>`;
    const f = document.getElementById("loginForm");
    f.onsubmit = async (e) => {
      e.preventDefault(); SFX.play("click");
      const id = document.getElementById("sid").value.trim(); if (!id) return;
      const btn = document.getElementById("loginBtn"); btn.disabled = true; btn.textContent = "กำลังตรวจสอบ…";
      const extra = document.getElementById("extra");
      if (API.demo && !extra.classList.contains("hidden")) {
        const name = document.getElementById("sname").value.trim();
        if (!name) { btn.disabled = false; btn.textContent = "เริ่มเล่น ▶"; return toast("กรุณาใส่ชื่อ"); }
        API.demoRegister(id, name, document.getElementById("scls").value.trim(), document.getElementById("sno").value.trim());
      }
      const r = await API.login(id);
      btn.disabled = false; btn.textContent = "เริ่มเล่น ▶";
      if (r.ok) {
        S.student = r.student; S.prog = r.progress || {}; S.teacher = false;
        API.LS.set("pq_last_id", id);
        if (r.offline) toast("ออฟไลน์อยู่ ผลจะส่งเมื่อมีอินเทอร์เน็ต");
        go(renderHome);
      } else if (r.needName) {
        extra.classList.remove("hidden"); toast("ครั้งแรก: ใส่ชื่อ ชั้น เลขที่ แล้วกดเริ่มเล่น");
      } else toast(r.offline ? "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง" : r.error || "ไม่พบรหัสนักเรียนนี้ในรายชื่อ แจ้งครูผู้สอนนะ");
    };
    const last = API.LS.get("pq_last_id", ""); if (last) document.getElementById("sid").value = last;
    document.getElementById("teacherLink").onclick = () => {
      const m = modal(`<h2>ครูผู้สอน</h2><p class="small">ใส่รหัสครู</p>
        <input class="field" id="tcode" type="password" inputmode="numeric" placeholder="รหัสครู">
        <div class="row" style="margin-top:12px"><button class="btn" id="tgo">เข้าสู่ระบบ</button><button class="btn ghost" data-close>ยกเลิก</button></div>`);
      const goT = async () => {
        const code = m.querySelector("#tcode").value.trim();
        const r = await API.teacher(code);
        if (r.ok) { S.teacher = true; S.teacherCode = code; S.teacherData = r; S.student = null; S.prog = {}; m.remove(); go(renderTeacher); }
        else toast(r.error || "รหัสครูไม่ถูกต้อง");
      };
      m.querySelector("#tgo").onclick = goT;
      m.querySelector("#tcode").onkeydown = (e) => { if (e.key === "Enter") goT(); };
      m.querySelector("#tcode").focus();
    };
  }

  // ---------- หน้าหลัก: แผนที่ 20 หน่วย ----------
  function unitPct(n) {
    const p = S.prog[n] || {}; const done = (p.A || 0) + (p.B || 0) + (p.testBest !== undefined ? 1 : 0);
    return Math.round((done / 11) * 100);
  }
  function renderHome() {
    const ann = S.cfg.announcement ? `<div class="card" style="background:var(--sun-2)"><b>📣 ประกาศ:</b> ${esc(S.cfg.announcement)}</div>` : "";
    const cur = D.units.find((u) => unitStatus(u.n) === "open" && unitSched(u.n).open);
    const card = (u) => {
      const st = unitStatus(u.n), sc = unitSched(u.n), p = S.prog[u.n] || {};
      const badge = st === "upcoming" ? `<span class="badge">🔒 เปิด ${thDate(sc.open)}</span>` : st === "closed" ? `<span class="badge closed">ปิดแล้ว</span>` : sc.open ? `<span class="badge now">เปิดอยู่ถึง ${thDate(sc.close)}</span>` : "";
      const score = p.testBest !== undefined ? ` · คะแนน ${thn(p.testBest)}/${thn(setting("TEST_POINTS"))}` : "";
      return `<button class="unit ${st === "upcoming" ? "locked" : ""}" data-u="${u.n}">
        ${badge}<span class="no">${thn(u.n)}</span><span class="t">${esc(u.title)}</span>
        <span class="meta">ผ่าน ${thn((p.A || 0) + (p.B || 0))}/๑๐ ด่านย่อย${score}${p.cert ? " · 🏅" : ""}</span>
        <span class="prog"><i style="width:${unitPct(u.n)}%"></i></span></button>`;
    };
    $app.innerHTML = `
      ${ann}
      <section class="card row" style="justify-content:space-between">
        <div style="flex:1 1 260px"><h2>สวัสดี ${esc(S.teacher ? "ครูผู้สอน" : S.student.name)}</h2>
          <p class="muted">เรียน → เขียน → <b>เล่น</b> · ผ่านด่านย่อยต้องได้ ${thn(setting("PASS_PERCENT"))}% ขึ้นไป</p>
          ${cur ? `<button class="btn pink" data-u="${cur.n}">ไปหน่วยสัปดาห์นี้: หน่วยที่ ${thn(cur.n)} ▶</button>` : ""}</div>
        ${ART.mascot("hello")}
      </section>
      <div class="term-title"><h2>สัปดาห์ที่ ๑–๑๐</h2><span class="bar"></span></div>
      <section class="units">${D.units.filter((u) => u.n <= 10).map(card).join("")}</section>
      <div class="term-title"><h2>สัปดาห์ที่ ๑๑–๒๐</h2><span class="bar"></span></div>
      <section class="units">${D.units.filter((u) => u.n > 10).map(card).join("")}</section>
      <div class="row" style="margin-top:22px;justify-content:center">
        <button class="btn sun" id="collBtn">📜 สมุดสะสมการ์ดธรรมบท</button>
        ${!S.teacher ? `<button class="btn ghost" id="myBtn">🏅 คะแนนและเกียรติบัตรของฉัน</button>` : `<button class="btn ghost" id="dashBtn">📊 กลับแดชบอร์ดครู</button>`}
      </div>`;
    $app.querySelectorAll("[data-u]").forEach((b) => (b.onclick = () => {
      const n = +b.dataset.u;
      if (unitStatus(n) === "upcoming") { SFX.play("bad"); return toast(`หน่วยที่ ${thn(n)} จะเปิดให้เล่นวันที่ ${thDate(unitSched(n).open)}`); }
      SFX.play("click"); go(renderUnit, n);
    }));
    document.getElementById("collBtn").onclick = () => go(renderCollection);
    const my = document.getElementById("myBtn"); if (my) my.onclick = () => go(renderMine);
    const db = document.getElementById("dashBtn"); if (db) db.onclick = () => go(renderTeacher);
  }

  // ---------- หน้าหน่วย ----------
  function canRecord(n) { return !S.teacher && unitStatus(n) === "open"; }
  function practiceMode(n) { return !S.teacher && unitStatus(n) === "closed"; }
  function nodeState(n, stage, k) {
    const p = P(n);
    if (S.teacher || practiceMode(n)) return (stage === "A" ? p.A : p.B) >= k ? "done" : "open";
    if (stage === "B" && p.A < 5) return "locked";
    const passed = stage === "A" ? p.A : p.B;
    if (passed >= k) return "done";
    if (passed === k - 1) return "open";
    return "locked";
  }
  const starStr = (n) => "★".repeat(n) + "☆".repeat(3 - n);

  function renderUnit(n) {
    const u = unitData(n), p = P(n), st = unitStatus(n), sc = unitSched(n);
    const nodes = (stage) => STAGES[stage].subs.map((name, i) => {
      const k = i + 1, s = nodeState(n, stage, k), boss = k === 5;
      const stars = p.stars[stage + k] || 0;
      return `<button class="node ${s} ${boss ? "boss" : ""}" data-s="${stage}" data-k="${k}" title="${esc(name)}">
        ${boss ? "👑" : thn(k)}<small>${esc(name)}</small>${s === "done" ? `<span class="stars">${starStr(stars)}</span>` : ""}</button>`;
    }).join("");
    const testOpen = S.teacher || practiceMode(n) || p.B >= 5;
    const tries = p.testTries || 0, maxT = setting("MAX_TEST_ATTEMPTS");
    const story = (u.stories[0] || u.tips[0]);
    $app.innerHTML = `
      <button class="link" id="back">← กลับแผนที่</button>
      <section class="card">
        <div class="unit-head"><span class="unit"><span class="no" style="width:60px;height:60px;font-size:1.6rem">${thn(n)}</span></span>
          <div><h1>${esc(u.title)}</h1><p class="small">หน่วยการเรียนรู้ที่ ${thn(n)} · ${sc.open ? `เปิด ${thDate(sc.open)} – ${thDate(sc.close)}` : "เปิดให้เล่น"} ${st === "closed" && !S.teacher ? "· <b>ปิดแล้ว (ฝึกซ้อมได้ ไม่บันทึกคะแนน)</b>" : ""}${S.teacher ? " · โหมดครู (ไม่บันทึกผล)" : ""}</p></div></div>
        <div class="path">
          <div class="stage-title"><h2>${STAGES.A.name}</h2><span class="small">คาบที่ ๓ · ประมาณ ${thn(setting("STAGE_MINUTES"))} นาที</span></div>
          <div class="nodes">${nodes("A")}</div>
          <div class="stage-title" style="margin-top:22px"><h2>${STAGES.B.name}</h2><span class="small">คาบที่ ๔ · ปลดล็อกเมื่อผ่านบอสหน่วย</span></div>
          <div class="nodes">${nodes("B")}</div>
        </div>
        <div class="special">
          <button class="btn ${testOpen ? "pink" : "ghost"}" id="testBtn" ${testOpen ? "" : "disabled"}>📝 ทดสอบท้ายหน่วย (${thn(setting("TEST_POINTS"))} คะแนน)
            ${p.testBest !== undefined ? `<br><small style="color:inherit">ดีที่สุด ${thn(p.testBest)} · สอบแล้ว ${thn(tries)}/${thn(maxT)} ครั้ง</small>` : ""}</button>
          <button class="btn ${p.testBest !== undefined || S.teacher ? "sun" : "ghost"}" id="certBtn" ${p.testBest !== undefined || S.teacher ? "" : "disabled"}>🏅 เกียรติบัตร</button>
          <button class="btn ${p.B >= 5 || S.teacher ? "ghost" : "ghost"}" id="storyBtn" ${p.B >= 5 || S.teacher ? "" : "disabled"}>📜 การ์ดธรรมบท${p.B >= 5 || S.teacher ? "" : " 🔒"}</button>
        </div>
        ${story ? `<p class="small center" style="margin-top:14px">ผ่านบอสใหญ่เพื่อปลดล็อกการ์ด “${esc(story.title)}”</p>` : ""}
      </section>
      ${u.tips[0] ? `<div class="tip-card"><b>เกร็ดความรู้ · ${esc(u.tips[0].title)}</b><p class="small">${esc(u.tips[0].body.join(" ")).slice(0, 260)}…</p></div>` : ""}`;
    document.getElementById("back").onclick = () => go(renderHome);
    $app.querySelectorAll(".node").forEach((b) => (b.onclick = () => {
      if (b.classList.contains("locked")) { SFX.play("bad"); return toast(b.dataset.s === "B" && P(n).A < 5 ? "ต้องผ่านด่านที่ ๑ ให้ครบก่อน" : `ต้องผ่านด่านก่อนหน้าให้ได้ ${thn(setting("PASS_PERCENT"))}% ก่อนนะ`); }
      SFX.play("click"); startRound(n, b.dataset.s, +b.dataset.k);
    }));
    document.getElementById("testBtn").onclick = () => {
      if (!S.teacher && canRecord(n) && tries >= maxT) {
        const m = modal(`<h2>สอบครบ ${thn(maxT)} ครั้งแล้ว</h2><p>คะแนนที่บันทึกคือครั้งที่ดีที่สุด (${thn(p.testBest)}) ต้องการฝึกทำอีกรอบโดยไม่บันทึกคะแนนไหม?</p>
          <div class="row"><button class="btn" id="pr">ฝึกทำ</button><button class="btn ghost" data-close>ไม่ใช่ตอนนี้</button></div>`);
        m.querySelector("#pr").onclick = () => { m.remove(); startRound(n, "T", 0, true); };
        return;
      }
      startRound(n, "T", 0);
    };
    document.getElementById("certBtn").onclick = () => go(renderCert, n);
    document.getElementById("storyBtn").onclick = () => showStory(n);
  }

  // ---------- เล่นด่าน ----------
  function stageClockKey(n, stage) { return `pq_clock_${S.student ? S.student.id : "t"}_${n}_${stage}`; }
  function startRound(n, stage, k, forcePractice) {
    const key = stage === "T" ? "T" : stage + k;
    const count = stage === "T" ? setting("TEST_QUESTIONS") : setting("QUESTIONS_PER_ROUND");
    const qs = Q.buildRound(n, key, count, S.cfg.questions || []);
    if (stage !== "T") { const ck = stageClockKey(n, stage); try { if (!sessionStorage.getItem(ck)) sessionStorage.setItem(ck, Date.now()); } catch (e) {} }
    S.round = { n, stage, k, key, qs, i: 0, correct: 0, combo: 0, best: 0, xp: 0, hints: 2, hinted: false, t0: Date.now(), log: [],
      boss: k === 5, test: stage === "T", record: canRecord(n) && !forcePractice };
    go(renderQuestion);
  }

  let qTimer = null, clockTimer = null;
  function clearTimers() { clearInterval(qTimer); clearInterval(clockTimer); qTimer = clockTimer = null; }

  function renderQuestion() {
    clearTimers();
    const R = S.round, q = R.qs[R.i], total = R.qs.length;
    const title = R.test ? "ทดสอบท้ายหน่วย" : `${STAGES[R.stage].name.split(" · ")[1]} · ด่านย่อย ${thn(R.k)} ${STAGES[R.stage].subs[R.k - 1]}`;
    const hintable = !R.test && (q.type === "mcq" || q.type === "table") && q.choices.length === 4;
    $app.innerHTML = `
      <section class="play">
        <div class="hud">
          <button class="icon-btn" id="quit" title="ออก" aria-label="ออกจากด่าน">✕</button>
          <div class="qbar"><i style="width:${(R.i / total) * 100}%"></i></div>
          <span class="chip">${thn(R.i + 1)}/${thn(total)}</span>
          ${!R.test ? `<span class="combo ${R.combo >= 3 ? "hot" : ""}">${R.combo >= 2 ? "🔥×" + thn(R.combo) : ""}</span>` : ""}
        </div>
        <div class="row" style="justify-content:space-between"><span class="small">หน่วยที่ ${thn(R.n)} · ${esc(title)}${R.record ? "" : " · <b>ฝึกซ้อม</b>"}</span><span class="small" id="clock"></span></div>
        ${R.boss || R.test ? `<div class="qtimer" id="qt" style="width:100%"></div>` : ""}
        <div class="card question" id="qcard">
          ${q.review ? `<span class="review-tag">ทบทวนหน่วยที่ ${thn(q.review)}</span>` : ""}
          <div class="prompt">${fmt(q.prompt)}</div>
          ${q.word ? `<div class="word pali">${esc(q.word)}</div>` : ""}
          ${q.type === "table" ? tableHTML(q) : ""}
          <div id="area"></div>
          <div id="fb"></div>
        </div>
        <div class="row" style="justify-content:center">
          ${hintable ? `<button class="btn ghost" id="hint" ${R.hints ? "" : "disabled"}>💡 ถามพระอาจารย์ (${thn(R.hints)})</button>` : ""}
        </div>
        <div id="buddy">${R.test ? "" : ART.mascot("hello", false)}</div>
      </section>`;
    document.getElementById("quit").onclick = () => {
      const m = modal(`<h2>ออกจากด่านนี้?</h2><p>ผลของรอบนี้จะไม่ถูกบันทึก</p><div class="row"><button class="btn pink" id="yq">ออก</button><button class="btn ghost" data-close>เล่นต่อ</button></div>`);
      m.querySelector("#yq").onclick = () => { m.remove(); clearTimers(); go(renderUnit, R.n); };
    };
    const area = document.getElementById("area");
    if (q.type === "pair") renderPair(q, area); else renderChoices(q, area);
    const h = document.getElementById("hint");
    if (h) h.onclick = () => {
      if (!R.hints) return; R.hints--; R.hinted = true; SFX.play("click");
      const wrong = [...area.querySelectorAll(".choice")].filter((b) => +b.dataset.i !== q.answer && !b.classList.contains("gone"));
      Q.shuffle(wrong).slice(0, 2).forEach((b) => b.classList.add("gone"));
      h.disabled = true;
    };
    // นาฬิกาของด่านใหญ่ (แนะนำ 60 นาที ไม่ตัดเวลา)
    if (!R.test) {
      const ck = stageClockKey(R.n, R.stage);
      const tick = () => {
        let s0 = +(sessionStorage.getItem(ck) || Date.now()); const sec = Math.floor((Date.now() - s0) / 1000);
        const el = document.getElementById("clock"); if (!el) return;
        el.textContent = `⏱ ${thn(Math.floor(sec / 60))}:${thn(String(sec % 60).padStart(2, "0"))}`;
        if (sec === setting("STAGE_MINUTES") * 60) toast("ครบเวลาที่แนะนำของด่านนี้แล้ว พักสายตาได้นะ");
      };
      tick(); clockTimer = setInterval(tick, 1000);
    }
    // จับเวลาต่อข้อ (บอส/ทดสอบ)
    if (R.boss || R.test) {
      const limit = R.test ? 45 : 30; let left = limit;
      const bar = document.getElementById("qt");
      qTimer = setInterval(() => {
        left--; if (bar) bar.style.width = (left / limit) * 100 + "%";
        if (left <= 5 && left > 0) SFX.play("tick");
        if (left <= 0) { clearInterval(qTimer); answer(-1); }
      }, 1000);
    }
  }

  function tableHTML(q) {
    const t = q.table;
    const rows = t.rows.map((r, v) => `<tr><td>${Q.VIB[v]}</td>${r.map((forms, nn) => {
      if (q.blank[0] === v && q.blank[1] === nn) return `<td class="blank">?</td>`;
      return `<td>${forms.length ? paliList(forms.join(" ")) : "–"}</td>`;
    }).join("")}</tr>`).join("");
    return `<div class="table-wrap"><table class="dtable"><thead><tr><th>วิภัตติ</th><th>เอกวจนะ</th><th>พหุวจนะ</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderChoices(q, area) {
    const kind = q.type === "tf" ? "tf" : q.type === "sort" ? "sort" : "";
    const big = q.type === "tf" || q.type === "sort";
    area.innerHTML = `<div class="choices ${kind} ${q.choices.length === 4 && !big ? "c4" : ""}">${q.choices.map((c, i) =>
      `<button class="choice ${q.cp ? "pali-c" : ""} ${big ? "big" : ""}" data-i="${i}">${q.type === "tf" ? (i === 0 ? "✔ " : "✘ ") : big ? "" : `<span class="k">${"กขคง"[i]}</span>`}<span class="t">${q.cp ? paliList(c) : esc(c)}</span></button>`).join("")}</div>`;
    area.querySelectorAll(".choice").forEach((b) => (b.onclick = () => answer(+b.dataset.i)));
  }

  function renderPair(q, area) {
    const left = Q.shuffle(q.pairs.map((p, i) => ({ t: p[0], i }))), right = Q.shuffle(q.pairs.map((p, i) => ({ t: p[1], i })));
    area.innerHTML = `<div class="pairs"><div class="col">${left.map((x) => `<button class="choice pali-c" data-l="${x.i}"><span class="t">${paliList(x.t)}</span></button>`).join("")}</div>
      <div class="col">${right.map((x) => `<button class="choice" data-r="${x.i}">${esc(x.t)}</button>`).join("")}</div></div>
      <p class="small">แตะคำบาลี แล้วแตะคำแปลที่คู่กัน (ผิดได้ไม่เกิน ๑ ครั้ง)</p>`;
    let sel = null, mistakes = 0, matched = 0;
    area.querySelectorAll("[data-l]").forEach((b) => (b.onclick = () => { area.querySelectorAll("[data-l]").forEach((x) => x.classList.remove("sel")); b.classList.add("sel"); sel = b; SFX.play("click"); }));
    area.querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => {
      if (!sel) return toast("แตะคำบาลีก่อน");
      if (sel.dataset.l === b.dataset.r) {
        sel.classList.remove("sel"); sel.classList.add("matched"); b.classList.add("matched"); sel = null; matched++; SFX.play("ok");
        if (matched === q.pairs.length) answer(mistakes <= 1 ? 1 : 0, true);
      } else {
        mistakes++; b.classList.add("bad"); SFX.play("bad"); setTimeout(() => b.classList.remove("bad"), 400);
        if (mistakes > 1) answer(0, true);
      }
    }));
  }

  function answer(i, isPair) {
    clearInterval(qTimer);
    const R = S.round, q = R.qs[R.i];
    if (R.locked) return; R.locked = true;
    const ok = isPair ? i === 1 : i === q.answer;
    const area = document.getElementById("area");
    if (!isPair) area.querySelectorAll(".choice").forEach((b) => {
      b.disabled = true; const bi = +b.dataset.i;
      if (bi === q.answer) b.classList.add("ok"); else if (bi === i) b.classList.add("bad");
    }); else area.querySelectorAll(".choice").forEach((b) => (b.disabled = true));
    R.log.push({ prompt: q.prompt, ok, explain: q.explain, gen: q.gen });
    if (ok) {
      R.correct++; R.combo++; R.best = Math.max(R.best, R.combo); R.xp += 10 + (R.combo >= 3 ? 5 : 0);
      if (!R.test) SFX.play(R.combo >= 3 ? "combo" : "ok", R.combo); else SFX.play("click");
    } else { R.combo = 0; if (!R.test) SFX.play("bad"); else SFX.play("click"); }
    const fb = document.getElementById("fb");
    if (R.test) { setTimeout(next, 450); return; }
    document.getElementById("buddy").innerHTML = ART.mascot(ok ? "ok" : "bad");
    fb.innerHTML = `<div class="feedback ${ok ? "ok" : "bad"}"><span class="ic">${ok ? "✅" : i === -1 ? "⏰" : "💡"}</span>
      <div><b>${ok ? "ถูกต้อง!" : i === -1 ? "หมดเวลา" : "ยังไม่ถูก"}</b><br><span class="small">${fmt(q.explain || "")}</span></div></div>
      ${ok ? "" : `<button class="btn block" id="nextBtn" style="margin-top:12px">ข้อต่อไป ➜</button>`}`;
    if (ok) setTimeout(next, 1000);
    else document.getElementById("nextBtn").onclick = next;
  }

  function next() {
    const R = S.round; R.locked = false;
    if (R.i < R.qs.length - 1) { R.i++; renderQuestion(); } else finishRound();
  }

  // ---------- จบด่าน ----------
  function finishRound() {
    clearTimers();
    const R = S.round, total = R.qs.length, pct = Math.round((R.correct / total) * 100);
    const need = Math.ceil((setting("PASS_PERCENT") / 100) * total);
    const pass = R.test ? true : R.correct >= need;
    const stars = R.test ? 0 : R.correct === total && !R.hinted ? 3 : pass ? 2 : R.correct >= Math.ceil(total * 0.6) ? 1 : 0;
    const secs = Math.round((Date.now() - R.t0) / 1000);
    const p = P(R.n);
    let points = null, newly = false;
    if (R.test) points = Math.round((R.correct / total) * setting("TEST_POINTS") * 10) / 10;
    if (R.record) {
      if (!R.test) {
        if (pass) { const cur = R.stage === "A" ? p.A : p.B; if (R.k > cur) { if (R.stage === "A") p.A = R.k; else p.B = R.k; newly = true; } }
        p.stars[R.key] = Math.max(p.stars[R.key] || 0, stars);
      } else {
        p.testTries = (p.testTries || 0) + 1;
        p.testBest = Math.max(p.testBest ?? -1, points);
        if (!p.cert) p.cert = `B21202-${setting("YEAR")}-U${String(R.n).padStart(2, "0")}-${S.student.id}`;
      }
      p.xp = (p.xp || 0) + R.xp;
      save();
      API.queue({ uid: `${S.student.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ts: new Date().toISOString(), year: setting("YEAR"),
        id: S.student.id, name: S.student.name, cls: S.student.cls || "", no: S.student.no || "", unit: R.n, stage: R.stage, sub: R.k, key: R.key,
        score: R.correct, total, percent: pct, pass, stars, secs, xp: R.xp, points, progress: { A: p.A, B: p.B, stars: p.stars, testBest: p.testBest, testTries: p.testTries, xp: p.xp, cert: p.cert } });
    }
    if (pass && !R.test) { SFX.play("pass"); ART.confetti(); } else if (R.test) { SFX.play("pass"); ART.confetti(1200); } else SFX.play("fail");
    const u = unitData(R.n), tip = u.tips.length ? u.tips[Math.floor(Math.random() * u.tips.length)] : null;
    const nextK = !R.test && pass && R.k < 5 ? R.k + 1 : null;
    const unlockB = !R.test && pass && R.stage === "A" && R.k === 5;
    const unlockStory = !R.test && pass && R.stage === "B" && R.k === 5;
    const review = R.test ? `<details style="margin-top:12px;text-align:left"><summary>ดูเฉลยรายข้อ</summary>${R.log.map((l, i) => `<p class="small">${thn(i + 1)}. ${l.ok ? "✅" : "❌"} ${fmt(l.prompt)}<br>→ ${fmt(l.explain)}</p>`).join("")}</details>` : "";
    $app.innerHTML = `
      <section class="card result">
        ${ART.mascot(pass ? "pass" : "fail")}
        <h2>${R.test ? "ผลทดสอบท้ายหน่วย" : pass ? "ผ่านด่านแล้ว!" : "อีกนิดเดียว!"}</h2>
        <div class="big-score">${thn(R.correct)}<span style="font-size:.5em">/${thn(total)}</span></div>
        ${R.test ? `<p><b>ได้ ${thn(points)} คะแนน</b> จาก ${thn(setting("TEST_POINTS"))} คะแนน${R.record ? "" : " (ฝึกซ้อม ไม่บันทึก)"}</p>` : `<div class="stars-big">${starStr(stars)}</div>
          <p class="muted">${pass ? `ได้ ${thn(pct)}% · คอมโบสูงสุด ${thn(R.best)} · +${thn(R.xp)} แต้ม` : `ต้องได้อย่างน้อย ${thn(need)} ข้อ จึงจะผ่าน ลองใหม่ได้เลย โจทย์จะสุ่มใหม่`}</p>`}
        ${unlockB ? `<p><b>🎉 ปลดล็อก ด่านที่ ๒ · ประยุกต์ แล้ว!</b></p>` : ""}
        ${unlockStory ? `<p><b>🎉 ได้การ์ดธรรมบทใหม่ และเปิดทดสอบท้ายหน่วยแล้ว!</b></p>` : ""}
        ${!R.record && !R.test ? `<p class="small">(ฝึกซ้อม — ไม่บันทึกผล)</p>` : ""}
        ${API.pending() ? `<p class="small">กำลังส่งผลเข้าระบบ… (${thn(API.pending())} รายการ)</p>` : ""}
        <div class="row" style="justify-content:center;margin-top:14px">
          ${nextK ? `<button class="btn" id="nx">ด่านต่อไป ➜</button>` : ""}
          ${unlockB ? `<button class="btn" id="nxB">เริ่มด่านที่ ๒ ➜</button>` : ""}
          ${unlockStory ? `<button class="btn sun" id="st">เปิดการ์ด 📜</button>` : ""}
          ${R.test ? `<button class="btn sun" id="ce">รับเกียรติบัตร 🏅</button>` : ""}
          ${!pass ? `<button class="btn pink" id="again">เล่นอีกครั้ง ↻</button>` : ""}
          <button class="btn ghost" id="bk">กลับหน้าหน่วย</button>
        </div>
        ${review}
        ${tip ? `<div class="tip-card"><b>เกร็ดความรู้ · ${esc(tip.title)}</b><p class="small">${esc(tip.body.join(" "))}</p><p class="small">${esc(tip.src)}</p></div>` : ""}
      </section>`;
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
    on("nx", () => startRound(R.n, R.stage, nextK));
    on("nxB", () => startRound(R.n, "B", 1));
    on("st", () => showStory(R.n));
    on("ce", () => go(renderCert, R.n));
    on("again", () => startRound(R.n, R.stage, R.k));
    on("bk", () => go(renderUnit, R.n));
    if (newly) SFX.play("unlock");
  }

  // ---------- การ์ดธรรมบท ----------
  function storyHTML(s) {
    // เนื้อเรื่อง → คาถา (บรรทัดสั้นที่มีพินทุ/นิคหิต จนถึงบรรทัดคำแปลที่ขึ้นต้นด้วย “) → คำแปลและข้อคิด
    const lines = s.body;
    const g0 = lines.findIndex((l) => /[ฺํ]/.test(l) && l.length < 40 && !/^“/.test(l));
    const g1 = g0 < 0 ? -1 : lines.findIndex((l, i) => i > g0 && /^“/.test(l));
    const body = g0 < 0 ? lines : lines.slice(0, g0);
    const gatha = g0 < 0 ? [] : lines.slice(g0, g1 < 0 ? lines.length : g1);
    const rest = g1 < 0 ? [] : lines.slice(g1);
    return `<div class="story"><h3>📜 ${esc(s.title)}</h3><p>${esc(body.join(" "))}</p>
      ${gatha.length ? `<div class="gatha">${gatha.map(esc).join("<br>")}</div>` : ""}
      <p class="small">${esc(rest.join(" "))}</p><p class="small">${esc(s.src)}</p></div>`;
  }
  function showStory(n) {
    const u = unitData(n), s = u.stories[0] || u.tips[0];
    if (!s) return toast("หน่วยนี้ไม่มีการ์ด");
    SFX.play("unlock");
    modal(`${storyHTML(s)}${u.stories[1] ? storyHTML(u.stories[1]) : ""}<div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-close>เก็บเข้าสมุด ✓</button></div>`);
  }
  function renderCollection() {
    const cards = D.units.map((u) => {
      const s = u.stories[0] || u.tips[0], have = S.teacher || (S.prog[u.n] && S.prog[u.n].B >= 5);
      return s ? `<button class="coll-card ${have ? "" : "locked"}" data-u="${u.n}"><small>หน่วยที่ ${thn(u.n)}</small><h3>${have ? esc(s.title) : "🔒 ยังไม่ปลดล็อก"}</h3>${have ? "" : `<p class="small">ผ่านบอสใหญ่ของหน่วยที่ ${thn(u.n)}</p>`}</button>` : "";
    }).join("");
    const got = D.units.filter((u) => S.prog[u.n] && S.prog[u.n].B >= 5).length;
    $app.innerHTML = `<button class="link" id="back">← กลับแผนที่</button><section class="card"><h1>สมุดสะสมการ์ดธรรมบท</h1>
      <p class="muted">สะสมแล้ว ${thn(got)} / ${thn(D.units.length)} ใบ</p><div class="collection">${cards}</div></section>`;
    document.getElementById("back").onclick = () => go(renderHome);
    $app.querySelectorAll(".coll-card:not(.locked)").forEach((b) => (b.onclick = () => showStory(+b.dataset.u)));
  }

  // ---------- คะแนนของฉัน ----------
  function renderMine() {
    const rows = D.units.map((u) => { const p = S.prog[u.n] || {};
      return `<tr><td>${thn(u.n)}</td><td class="name">${esc(u.title)}</td><td>${thn(p.A || 0)}/๕</td><td>${thn(p.B || 0)}/๕</td><td>${p.testBest !== undefined ? thn(p.testBest) : "–"}</td><td>${p.testBest !== undefined ? `<button class="link" data-c="${u.n}">เปิด</button>` : "–"}</td></tr>`; }).join("");
    const sum = D.units.reduce((s, u) => s + ((S.prog[u.n] || {}).testBest || 0), 0);
    $app.innerHTML = `<button class="link" id="back">← กลับแผนที่</button><section class="card"><h1>คะแนนของฉัน</h1>
      <p>${esc(S.student.name)} · ${esc(S.student.cls || "")} เลขที่ ${esc(S.student.no || "")}</p>
      <p><b>คะแนนเก็บจากเกมรวม ${thn(Math.round(sum * 10) / 10)} / ${thn(D.units.length * setting("TEST_POINTS"))}</b></p>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>หน่วย</th><th>เรื่อง</th><th>ด่าน ๑</th><th>ด่าน ๒</th><th>คะแนน</th><th>เกียรติบัตร</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
    document.getElementById("back").onclick = () => go(renderHome);
    $app.querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => go(renderCert, +b.dataset.c)));
  }

  // ---------- เกียรติบัตร ----------
  function renderCert(n) {
    const u = unitData(n), p = S.prog[n] || {};
    const name = S.teacher ? "(ตัวอย่าง) ชื่อนักเรียน" : S.student.name;
    const d = new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
    const certNo = p.cert || `B21202-${setting("YEAR")}-U${String(n).padStart(2, "0")}-PREVIEW`;
    $app.innerHTML = `<button class="link" id="back">← กลับหน้าหน่วย</button>
      <section class="card"><div class="row" style="justify-content:space-between"><h2>เกียรติบัตร หน่วยที่ ${thn(n)}</h2>
      <button class="btn" id="print">🖨️ พิมพ์ / บันทึกเป็น PDF</button></div>
      <p class="small">บนมือถือ: กดปุ่มพิมพ์ แล้วเลือก “บันทึกเป็น PDF” หรือแคปหน้าจอเก็บไว้ได้</p></section>
      <div class="cert-wrap"><div class="cert" id="cert">
        <img src="${esc(C.LOGO)}" alt="ตราโรงเรียน">
        <div style="font-family:Mitr;font-size:22px">${esc(C.SCHOOL)}</div>
        <div class="c-title">เกียรติบัตร</div>
        <div class="c-body">ขอมอบเกียรติบัตรฉบับนี้ไว้เพื่อแสดงว่า</div>
        <div class="c-name">${esc(name)}</div>
        <div class="c-body">${S.student && S.student.cls ? `นักเรียนชั้น ${esc(S.student.cls)} ` : ""}ได้ผ่านการเรียนรู้ด้วยเกม “หอไตรบาลี”<br>รายวิชา${esc(C.COURSE)}<br>
          หน่วยการเรียนรู้ที่ ${thn(n)} เรื่อง ${esc(u.title)}${p.testBest !== undefined ? ` · คะแนนทดสอบท้ายหน่วย ${thn(p.testBest)}/${thn(setting("TEST_POINTS"))}` : ""}<br>
          ขอให้มีความเพียรในการศึกษาพระปริยัติธรรมสืบไป · ให้ไว้ ณ วันที่ ${d}</div>
        <div class="c-sign"><div><div class="line"></div>(${esc(C.TEACHER)})<br>ครูผู้สอน</div></div>
        <div class="c-no">เลขที่ ${esc(certNo)}</div>
      </div></div>`;
    document.getElementById("back").onclick = () => go(renderUnit, n);
    document.getElementById("print").onclick = () => window.print();
    // ย่อเกียรติบัตรให้พอดีจอมือถือ
    const fit = () => { const el = document.getElementById("cert"); if (!el) return; const w = el.parentElement.clientWidth; const s = Math.min(1, w / 1000); el.style.transform = `scale(${s})`; el.style.transformOrigin = "top left"; el.parentElement.style.height = el.offsetHeight * s + "px"; };
    fit(); window.addEventListener("resize", fit, { once: true });
  }

  // ---------- แดชบอร์ดครู ----------
  function renderTeacher() {
    const T = S.teacherData || { students: [] };
    const studs = T.students || [];
    const classes = [...new Set(studs.map((s) => s.cls).filter(Boolean))].sort();
    const fil = S.tClass || "";
    const list = studs.filter((s) => !fil || s.cls === fil).sort((a, b) => String(a.cls).localeCompare(String(b.cls)) || (+a.no || 0) - (+b.no || 0));
    const head = D.units.map((u) => `<th title="${esc(u.title)}">${thn(u.n)}</th>`).join("");
    const rows = list.map((s) => {
      const pr = s.progress || {}; let sum = 0;
      const cells = D.units.map((u) => { const p = pr[u.n] || {}; const t = p.testBest; if (t !== undefined && t !== "") sum += +t;
        const cls = t !== undefined && t !== "" ? "cell-ok" : (p.A || p.B) ? "cell-mid" : "";
        return `<td class="${cls}" title="ด่าน๑ ${p.A || 0}/5 ด่าน๒ ${p.B || 0}/5">${t !== undefined && t !== "" ? t : (p.A || p.B) ? `${(p.A || 0) + (p.B || 0)}/10` : ""}</td>`; }).join("");
      return `<tr><td>${esc(s.cls || "")}</td><td>${esc(s.no || "")}</td><td class="name">${esc(s.name)}</td>${cells}<td><b>${Math.round(sum * 10) / 10}</b></td></tr>`;
    }).join("");
    $app.innerHTML = `
      <section class="card"><div class="row" style="justify-content:space-between"><h1>แดชบอร์ดครู</h1>
        <div class="row"><button class="btn sun" id="playT">🎮 เปิดดูเกม (ทุกด่าน)</button><button class="btn ghost" id="reload">↻ โหลดใหม่</button></div></div>
        <p class="muted">${T.demo ? "โหมดทดลอง: แสดงเฉพาะผู้เล่นในเครื่องนี้" : `ข้อมูลจาก Google Sheet · ${studs.length} คน`} · ช่องสีเขียว = คะแนนทดสอบท้ายหน่วย (เต็ม ${setting("TEST_POINTS")}) · ช่องสีเหลือง = จำนวนด่านย่อยที่ผ่าน</p>
        <div class="row"><label class="small">ชั้น: <select id="cls" class="chip">${["", ...classes].map((c) => `<option ${c === fil ? "selected" : ""} value="${esc(c)}">${c || "ทั้งหมด"}</option>`).join("")}</select></label>
          <button class="btn ghost" id="csv">⬇ ดาวน์โหลด CSV</button></div>
        <div class="table-wrap" style="max-height:65dvh;margin-top:12px"><table class="tbl"><thead><tr><th>ชั้น</th><th>เลขที่</th><th>ชื่อ</th>${head}<th>รวม</th></tr></thead><tbody>${rows || `<tr><td colspan="24">ยังไม่มีข้อมูล</td></tr>`}</tbody></table></div>
      </section>`;
    document.getElementById("cls").onchange = (e) => { S.tClass = e.target.value; renderTeacher(); };
    document.getElementById("playT").onclick = () => go(renderHome);
    document.getElementById("reload").onclick = async () => { const r = await API.teacher(S.teacherCode); if (r.ok) { S.teacherData = r; renderTeacher(); toast("อัปเดตแล้ว"); } };
    document.getElementById("csv").onclick = () => {
      const lines = [["ชั้น", "เลขที่", "รหัส", "ชื่อ", ...D.units.map((u) => "หน่วย" + u.n), "รวม"]];
      list.forEach((s) => { const pr = s.progress || {}; let sum = 0;
        const sc = D.units.map((u) => { const t = (pr[u.n] || {}).testBest; if (t !== undefined && t !== "") { sum += +t; return t; } return ""; });
        lines.push([s.cls, s.no, s.id, s.name, ...sc, Math.round(sum * 10) / 10]); });
      const csv = "﻿" + lines.map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `คะแนนเกมบาลี-${fil || "ทุกชั้น"}.csv`; a.click();
    };
  }

  // ---------- เมนู ----------
  document.getElementById("soundBtn").onclick = () => { SFX.toggle(); refreshTop(); };
  document.getElementById("xpChip").onclick = () => toast(`แต้มสะสมทั้งหมด ${thn(totalXP())} แต้ม`);
  document.getElementById("menuBtn").onclick = () => {
    const m = modal(`<h2>เมนู</h2><div class="grid">
      <button class="btn ghost block" data-a="home">🗺️ แผนที่หน่วย</button>
      <button class="btn ghost block" data-a="coll">📜 สมุดสะสม</button>
      ${S.student ? `<button class="btn ghost block" data-a="mine">🏅 คะแนนของฉัน</button>` : ""}
      ${S.teacher ? `<button class="btn ghost block" data-a="dash">📊 แดชบอร์ดครู</button>` : ""}
      <button class="btn pink block" data-a="out">ออกจากระบบ</button></div>`);
    m.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => {
      m.remove(); clearTimers();
      const a = b.dataset.a;
      if (a === "home") go(renderHome); else if (a === "coll") go(renderCollection); else if (a === "mine") go(renderMine); else if (a === "dash") go(renderTeacher);
      else { S.student = null; S.teacher = false; S.prog = {}; go(renderLogin); }
    }));
  };
  document.addEventListener("keydown", (e) => {
    if (!S.round || !document.getElementById("area")) return;
    const map = { "1": 0, "2": 1, "3": 2, "4": 3 };
    if (map[e.key] !== undefined) { const b = document.querySelector(`#area .choice[data-i="${map[e.key]}"]`); if (b && !b.disabled) b.click(); }
    if (e.key === "Enter") { const n = document.getElementById("nextBtn"); if (n) n.click(); }
  });
  document.addEventListener("pq-synced", () => { if (document.querySelector(".result")) toast("ส่งผลเข้าระบบเรียบร้อย ✓", 1800); });

  // ---------- เริ่ม ----------
  (async function init() {
    refreshTop();
    $app.innerHTML = `<section class="hero">${ART.mascot("hello", false)}<p class="muted">กำลังเปิดหอไตร…</p></section>`;
    S.cfg = await API.config();
    renderLogin(); refreshTop();
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  })();
  window.__PQ = S; // สำหรับตรวจสอบ
})();
