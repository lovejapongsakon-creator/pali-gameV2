/* ติดต่อหลังบ้าน (Google Apps Script + Google Sheet)
   - อ่าน: ตั้งค่า/ตารางเปิดหน่วย/ข้อสอบเพิ่ม/รายชื่อ (GET)
   - เขียน: ส่งผลเมื่อจบด่านย่อยเท่านั้น (POST แบบ text/plain ไม่ต้องทำ preflight)
   - ถ้าส่งไม่สำเร็จ เก็บคิวไว้ในเครื่องแล้วส่งซ้ำอัตโนมัติ ข้อมูลไม่หาย */
(function () {
  const C = window.PALI_CONFIG;
  const DEMO = !C.API_URL;
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  async function get(params, timeout = 12000) {
    const url = C.API_URL + "?" + new URLSearchParams(params).toString();
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
    try { const r = await fetch(url, { signal: ctl.signal }); return await r.json(); } finally { clearTimeout(t); }
  }
  async function post(body, timeout = 15000) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body), signal: ctl.signal });
      return await r.json();
    } finally { clearTimeout(t); }
  }

  function defaultConfig() {
    const units = window.PALI_DATA.units.map((u) => ({ n: u.n, open: "", close: "", status: "open" }));
    return { settings: {}, units, questions: [], announcement: "", demo: true };
  }

  const API = {
    demo: DEMO,
    LS,
    async config() {
      if (DEMO) return defaultConfig();
      try {
        const cfg = await get({ action: "config" });
        if (cfg && cfg.ok) { LS.set("pq_cfg", cfg); return cfg; }
      } catch (e) {}
      return LS.get("pq_cfg", null) || defaultConfig();
    },
    async login(id) {
      id = String(id).trim();
      if (!DEMO) id = id.replace(/^0+(?=\d)/, ""); // ให้ตรงกับรหัสในชีต (ชีตตัด 0 ข้างหน้าทิ้ง)
      if (DEMO) {
        const st = LS.get("pq_demo_students", {})[id];
        return st ? { ok: true, student: st, progress: LS.get("pq_prog_" + id, {}) } : { ok: false, needName: true };
      }
      try {
        const r = await get({ action: "login", id });
        if (r && r.ok) {
          // รวมความคืบหน้าในเครื่องกับบนเซิร์ฟเวอร์ (เอาค่าที่มากกว่า)
          const merged = API.mergeProgress(LS.get("pq_prog_" + id, {}), r.progress || {});
          LS.set("pq_prog_" + id, merged); LS.set("pq_student", r.student);
          return { ok: true, student: r.student, progress: merged };
        }
        return r || { ok: false };
      } catch (e) {
        const st = LS.get("pq_student", null);
        if (st && st.id === id) return { ok: true, student: st, progress: LS.get("pq_prog_" + id, {}), offline: true };
        return { ok: false, offline: true };
      }
    },
    demoRegister(id, name, cls, no) {
      const all = LS.get("pq_demo_students", {});
      all[id] = { id, name, cls, no };
      LS.set("pq_demo_students", all);
      return all[id];
    },
    async teacher(code) {
      if (DEMO) {
        if (code !== "0406") return { ok: false };
        const studs = Object.values(LS.get("pq_demo_students", {}));
        return { ok: true, demo: true, students: studs.map((s) => ({ ...s, progress: LS.get("pq_prog_" + s.id, {}) })) };
      }
      try { return await get({ action: "teacher", code }, 25000); } catch (e) { return { ok: false, error: "เชื่อมต่อไม่ได้" }; }
    },
    saveLocal(id, progress) { LS.set("pq_prog_" + id, progress); },
    mergeProgress(a, b) {
      const out = JSON.parse(JSON.stringify(a || {}));
      Object.entries(b || {}).forEach(([u, p]) => {
        const o = out[u] || (out[u] = {});
        o.A = Math.max(o.A || 0, p.A || 0); o.B = Math.max(o.B || 0, p.B || 0);
        o.stars = Object.assign({}, p.stars || {}, o.stars || {});
        Object.keys(p.stars || {}).forEach((k) => (o.stars[k] = Math.max(o.stars[k] || 0, p.stars[k])));
        o.testBest = Math.max(o.testBest ?? -1, p.testBest ?? -1); if (o.testBest < 0) delete o.testBest;
        o.testTries = Math.max(o.testTries || 0, p.testTries || 0);
        o.xp = Math.max(o.xp || 0, p.xp || 0);
        o.cert = o.cert || p.cert;
      });
      return out;
    },
    // ----- คิวส่งผล -----
    queue(rec) {
      if (DEMO) return; // โหมดทดลอง: เก็บผลในเครื่องอย่างเดียว
      const q = LS.get("pq_outbox", []);
      q.push(rec); LS.set("pq_outbox", q);
      API.flush();
    },
    pending() { return LS.get("pq_outbox", []).length; },
    _busy: false,
    async flush(attempt = 0) {
      if (DEMO || API._busy) return;
      const q = LS.get("pq_outbox", []); if (!q.length) return;
      API._busy = true;
      try {
        const r = await post({ action: "submit", records: q.slice(0, 20) });
        if (r && r.ok) {
          const done = new Set(r.saved || q.slice(0, 20).map((x) => x.uid));
          LS.set("pq_outbox", LS.get("pq_outbox", []).filter((x) => !done.has(x.uid)));
          API._busy = false;
          if (LS.get("pq_outbox", []).length) API.flush(0);
          document.dispatchEvent(new CustomEvent("pq-synced"));
          return;
        }
      } catch (e) {}
      API._busy = false;
      // หน่วงแบบสุ่ม กันทั้งห้องส่งพร้อมกัน
      const wait = Math.min(60000, 2000 * Math.pow(2, attempt)) + Math.random() * 3000;
      setTimeout(() => API.flush(attempt + 1), wait);
    }
  };
  window.addEventListener("online", () => API.flush());
  setTimeout(() => API.flush(), 3000);
  window.API = API;
})();
