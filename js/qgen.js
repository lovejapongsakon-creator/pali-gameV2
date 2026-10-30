/* ตัวสร้างโจทย์: สร้างข้อสอบใหม่ทุกครั้งจากข้อมูลในหนังสือ (ตารางแจกศัพท์ คำศัพท์ หมวดคัดแยก ข้อเท็จจริง และแบบทดสอบท้ายหน่วย) */
(function () {
  const VIB = ["ปฐมา", "ทุติยา", "ตติยา", "จตุตถี", "ปัญจมี", "ฉัฏฐี", "สัตตมี", "อาลปนะ"];
  const NUM = ["เอกวจนะ", "พหุวจนะ"];
  const AY_SHORT = ["อ.", "ซึ่ง", "ด้วย", "แก่", "จาก", "แห่ง", "ใน", "ดูก่อน"];

  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const uniq = (a) => [...new Set(a)];
  const wrap = (s) => `“${s}”`;

  // สร้างตัวเลือก 4 ข้อ (ถูก 1 + ลวง 3) คืน null ถ้าตัวลวงไม่พอ
  function mc(correct, pool, n = 4) {
    const ds = shuffle(uniq(pool.filter((x) => x && x !== correct))).slice(0, n - 1);
    if (ds.length < Math.min(2, n - 1)) return null;
    const choices = shuffle([correct, ...ds]);
    return { choices, answer: choices.indexOf(correct) };
  }

  function cells(t) {
    const out = [];
    t.rows.forEach((r, v) => r.forEach((forms, n) => { if (forms && forms.length) out.push({ v, n, forms }); }));
    return out;
  }
  const cellLabel = (c) => `${VIB[c.v]} ${NUM[c.n]}`;
  // ถ้าในหน่วยมีแม่แบบชื่อซ้ำกันหลายลิงค์ (เช่น ต ย อิม) ให้บอกลิงค์กำกับ
  let curTables = [];
  const tName = (t) => (curTables.filter((x) => x.name === t.name).length > 1 ? `${t.name} ${t.linga}` : t.name);

  // ----- ข้อมูลรวมต่อหน่วย -----
  function vocabOf(u) {
    const v = [];
    u.groups.forEach((g) => g.items.forEach(([w, m]) => v.push({ w, m, g: g.label, p: g.pattern })));
    u.tables.forEach((t) => { if (t.meaning && !v.some((x) => x.w === t.name)) v.push({ w: t.name, m: t.meaning, g: "แม่แบบ", p: t.name }); });
    (u.helper || []).forEach(([w, m]) => v.push({ w, m, g: "คำศัพท์ช่วยแปล", p: "" }));
    (u.sets || []).forEach((s) => s.items.forEach(([w, b, m]) => { if (m && !v.some((x) => x.w === w)) v.push({ w, m, g: s.name, p: "" }); }));
    return v;
  }

  // หมวดคัดแยกที่สร้างอัตโนมัติ (แจกอย่างศัพท์ใด, ลิงค์, หมวดนิบาต/ปัจจัย)
  function autoSets(u) {
    const sets = (u.sets || []).slice();
    const pg = u.groups.filter((g) => g.pattern);
    if (pg.length >= 2 || (pg.length === 1 && u.tables.length >= 2)) {
      const buckets = uniq(u.tables.map((t) => t.name));
      const items = [];
      pg.forEach((g) => g.items.forEach(([w, m]) => items.push([w, g.pattern, m])));
      if (buckets.length >= 2 && items.length) sets.push({ name: "แจกตามแบบ", prompt: "ศัพท์นี้แจกอย่างศัพท์ใด", buckets, items });
    }
    if (!u.tables.length && u.groups.length >= 3) {
      const gs = u.groups.filter((g) => g.items.length >= 2 && !g.pattern);
      const items = [];
      gs.forEach((g) => g.items.forEach(([w, m]) => items.push([w, g.label, m])));
      const dup = {}; items.forEach(([w]) => (dup[w] = (dup[w] || 0) + 1));
      sets.push({ name: "จัดหมวด", prompt: "ศัพท์นี้อยู่หมวดใด", buckets: gs.map((g) => g.label), items: items.filter(([w]) => dup[w] === 1), many: true });
    }
    return sets;
  }

  function lingaSet(units, upto) {
    // ศัพท์ที่แจกตามแบบ ซึ่งรู้ลิงค์จากแม่แบบ (หน่วย 4–13)
    const items = [];
    units.filter((u) => u.n <= upto).forEach((u) => {
      const lingOf = {}; u.tables.forEach((t) => { if ([ "ปุงลิงค์", "อิตถีลิงค์", "นปุงสกลิงค์" ].includes(t.linga)) lingOf[t.name] = t.linga; });
      u.groups.forEach((g) => { if (g.pattern && lingOf[g.pattern]) g.items.forEach(([w, m]) => items.push([w, lingOf[g.pattern], m, u.n])); });
    });
    return items;
  }

  // ----- ตัวสร้างโจทย์แต่ละชนิด -----
  const G = {};

  G.meaning = (u, ctx, rev) => {
    const v = ctx.vocab; if (v.length < 4) return null;
    const it = pick(v);
    if (!rev) {
      const o = mc(it.m, v.map((x) => x.m)); if (!o) return null;
      return { type: "mcq", prompt: `${wrap(it.w)} แปลว่าอะไร`, choices: o.choices, answer: o.answer, explain: `${it.w} = ${it.m}`, key: "m" + it.w };
    }
    const o = mc(it.w, v.filter((x) => x.m !== it.m).map((x) => x.w)); if (!o) return null;
    return { type: "mcq", prompt: `คำว่า “${it.m}” ภาษาบาลีคือข้อใด`, choices: o.choices, cp: true, answer: o.answer, explain: `${it.m} = ${it.w}`, key: "r" + it.w };
  };

  G.tf = (u, ctx, vocabOnly) => {
    const tabs = u.tables;
    if (!vocabOnly && tabs.length && Math.random() < 0.5) {
      const t = pick(tabs), cs = cells(t), c = pick(cs), f = pick(c.forms);
      const truth = Math.random() < 0.5;
      let lab = cellLabel(c);
      if (!truth) {
        const others = cs.filter((x) => !x.forms.includes(f)); if (!others.length) return null;
        lab = cellLabel(pick(others));
      }
      const real = cs.filter((x) => x.forms.includes(f)).map(cellLabel).join(" / ");
      return { type: "tf", prompt: `${wrap(f)} เป็น ${lab} ของ ${wrap(tName(t))}`, choices: ["ถูก", "ผิด"], answer: truth ? 0 : 1, explain: `${f} เป็น ${real}`, key: "tf" + f + lab };
    }
    const v = ctx.vocab; if (v.length < 3) return null;
    const it = pick(v), truth = Math.random() < 0.5;
    const m = truth ? it.m : pick(v.filter((x) => x.m !== it.m)).m;
    return { type: "tf", prompt: `${wrap(it.w)} แปลว่า “${m}”`, choices: ["ถูก", "ผิด"], answer: truth ? 0 : 1, explain: `${it.w} = ${it.m}`, key: "tf" + it.w + m };
  };

  G.sort = (u, ctx) => {
    const sets = ctx.sets.filter((s) => s.items.length >= 2); if (!sets.length) return null;
    const s = pick(sets), it = pick(s.items);
    let buckets = s.buckets;
    if (buckets.length > 4) buckets = shuffle([it[1], ...shuffle(buckets.filter((b) => b !== it[1])).slice(0, 3)]);
    const label = s.many ? buckets : buckets.slice();
    return { type: "sort", prompt: s.prompt, word: it[0], choices: label, answer: label.indexOf(it[1]), explain: `${it[0]}${it[2] ? " (" + it[2] + ")" : ""} → ${it[1]}`, key: "s" + s.name + it[0] };
  };

  G.linga = (u, ctx) => {
    const items = ctx.linga; if (items.length < 6) return null;
    const own = items.filter((x) => x[3] === u.n);
    const it = own.length && Math.random() < 0.7 ? pick(own) : pick(items);
    const b = ["ปุงลิงค์", "อิตถีลิงค์", "นปุงสกลิงค์"];
    return { type: "sort", prompt: "ศัพท์นี้เป็นลิงค์ใด", word: it[0], choices: b, answer: b.indexOf(it[1]), explain: `${it[0]} (${it[2]}) เป็น${it[1]}`, key: "l" + it[0] };
  };

  G.form = (u, ctx, level, visual) => {
    const tabs = u.tables; if (!tabs.length) return null;
    const t = pick(tabs), cs = cells(t);
    let pool = cs;
    if (level === 1) { const e = cs.filter((c) => c.n === 0 && c.v <= 3); if (e.length >= 2) pool = e; }
    const c = pick(pool), correct = c.forms.join(" ");
    const ds = cs.filter((x) => x !== c && !x.forms.some((f) => c.forms.includes(f))).map((x) => x.forms.join(" "));
    const o = mc(correct, ds); if (!o) return null;
    const q = { type: visual ? "table" : "mcq", prompt: `${wrap(tName(t))} ${cellLabel(c)} คือข้อใด`, choices: o.choices, cp: true, answer: o.answer,
      explain: `${t.name} ${cellLabel(c)} = ${correct}`, key: "f" + t.name + t.linga + c.v + c.n };
    if (visual) { q.table = t; q.blank = [c.v, c.n]; q.prompt = `เติมช่องว่างในตารางแจก ${wrap(tName(t))}`; }
    return q;
  };

  G.ident = (u, ctx) => {
    const tabs = u.tables; if (!tabs.length) return null;
    const t = pick(tabs), cs = cells(t), c = pick(cs), f = pick(c.forms);
    const match = cs.filter((x) => x.forms.includes(f)).map(cellLabel);
    const o = mc(pick(match), cs.filter((x) => !x.forms.includes(f)).map(cellLabel)); if (!o) return null;
    return { type: "mcq", prompt: `${wrap(f)} (จาก ${tName(t)}) เป็นวิภัตติและวจนะใด`, choices: o.choices, answer: o.answer, explain: `${f} เป็น ${match.join(" / ")}`, key: "i" + f };
  };

  G.trans = (u, ctx) => {
    const tabs = u.tables.filter((t) => t.meaning && !/[\/]/.test(t.meaning) && t.rows.length >= 7); if (!tabs.length) return null;
    const t = pick(tabs), cs = cells(t), c = pick(cs), f = pick(c.forms);
    const tr = (x) => `${AY_SHORT[x.v]}${t.meaning}${x.n ? " ท." : ""}`;
    const ok = uniq(cs.filter((x) => x.forms.includes(f)).map(tr));
    const o = mc(pick(ok), cs.filter((x) => !x.forms.includes(f)).map(tr).filter((s) => !ok.includes(s))); if (!o) return null;
    return { type: "mcq", prompt: `${wrap(f)} แปลโดยพยัญชนะว่าอย่างไร`, choices: o.choices, answer: o.answer, explain: `${f} → ${ok.join(" / ")} (ใช้อายตนิบาตประจำวิภัตติ)`, key: "t" + f };
  };

  G.fact = (u) => {
    const fs = u.facts || []; if (!fs.length) return null;
    const f = pick(fs);
    const choices = shuffle([f.a, ...f.d.slice(0, 3)]);
    return { type: "mcq", prompt: f.q, choices, answer: choices.indexOf(f.a), explain: f.x || `คำตอบ: ${f.a}`, key: "x" + f.q };
  };

  G.test = (u) => {
    const ts = (u.test || []).filter((q) => q.c.length === 4); if (!ts.length) return null;
    const q = pick(ts), correct = q.c[q.a];
    const choices = shuffle(q.c);
    return { type: "mcq", prompt: q.q, choices, answer: choices.indexOf(correct), explain: `คำตอบ: ${correct}`, key: "b" + q.q };
  };

  G.extra = (u, ctx) => {
    const ex = ctx.extra; if (!ex.length) return null;
    const q = pick(ex), correct = q.c[q.a];
    const choices = shuffle(q.c.filter(Boolean));
    return { type: "mcq", prompt: q.q, choices, answer: choices.indexOf(correct), explain: q.x || `คำตอบ: ${correct}`, key: "e" + q.q };
  };

  G.pair = (u, ctx) => {
    const v = uniq(ctx.vocab.map((x) => x.w)).map((w) => ctx.vocab.find((x) => x.w === w));
    const byM = {}; v.forEach((x) => { if (!byM[x.m]) byM[x.m] = x; });
    const pool = Object.values(byM); if (pool.length < 4) return null;
    const pairs = shuffle(pool).slice(0, 4).map((x) => [x.w, x.m]);
    return { type: "pair", prompt: "จับคู่ศัพท์บาลีกับคำแปลให้ถูกต้อง", pairs, explain: pairs.map((p) => `${p[0]} = ${p[1]}`).join(" · "), key: "p" + pairs.map((p) => p[0]).join() };
  };

  // ----- สูตรด่าน: ชนิดโจทย์และน้ำหนัก -----
  // stage A = ด่านใหญ่ 1 "เรียนรู้", stage B = ด่านใหญ่ 2 "ประยุกต์", T = ทดสอบท้ายหน่วย
  const RECIPES = {
    A1: [["meaning", 5], ["tfm", 3], ["fact", 2]],
    A2: [["sort", 4], ["linga", 2], ["fact", 2], ["meaning", 1]],
    A3: [["form1", 4], ["table1", 3], ["fact", 1], ["sort", 1]],
    A4: [["ident", 4], ["test", 3], ["fact", 2], ["tf", 1]],
    A5: [["meaning", 1], ["sort", 2], ["form1", 2], ["ident", 2], ["test", 2], ["fact", 1]],
    B1: [["pair", 3], ["meaningR", 4], ["sort", 2]],
    B2: [["trans", 5], ["tf", 2], ["sort", 2], ["meaningR", 1]],
    B3: [["form2", 4], ["table2", 3], ["ident", 3]],
    B4: [["review", 5], ["test", 3], ["fact", 2]],
    B5: [["form2", 2], ["trans", 2], ["ident", 2], ["pair", 1], ["review", 2], ["test", 2], ["extra", 1]],
    T: [["test", 4], ["form2", 2], ["ident", 1], ["trans", 1], ["meaning", 1], ["sort", 1], ["fact", 1]],
  };
  const FALLBACK = ["fact", "test", "meaning", "sort", "meaningR", "tf", "extra"];

  function run(name, u, ctx) {
    curTables = u.tables;
    switch (name) {
      case "meaning": return G.meaning(u, ctx, false);
      case "meaningR": return G.meaning(u, ctx, true);
      case "tfm": return G.tf(u, ctx, true);
      case "form1": return G.form(u, ctx, 1, false);
      case "form2": return G.form(u, ctx, 2, false);
      case "table1": return G.form(u, ctx, 1, true);
      case "table2": return G.form(u, ctx, 2, true);
      case "review": {
        const prev = ctx.all.filter((x) => x.n < u.n && x.n >= u.n - 4);
        if (!prev.length) return G.test(u);
        const pu = pick(prev), pc = context(pu, ctx.all, ctx.extraAll);
        const q = run(pick(["meaning", "form1", "ident", "sort", "test", "fact"]), pu, pc);
        if (q) q.review = pu.n;
        return q;
      }
      default: return G[name] ? G[name](u, ctx) : null;
    }
  }

  function context(u, all, extraAll) {
    return { vocab: vocabOf(u), sets: autoSets(u), linga: lingaSet(all, u.n), all, extraAll: extraAll || [], extra: (extraAll || []).filter((q) => +q.unit === u.n) };
  }

  function weighted(recipe) {
    const total = recipe.reduce((s, r) => s + r[1], 0);
    let x = Math.random() * total;
    for (const [n, w] of recipe) { if ((x -= w) < 0) return n; }
    return recipe[0][0];
  }

  // สร้างชุดโจทย์ของด่านย่อย
  function buildRound(unitNo, stageKey, count, extraAll) {
    const all = window.PALI_DATA.units;
    const u = all.find((x) => x.n === unitNo);
    const ctx = context(u, all, extraAll);
    const recipe = RECIPES[stageKey] || RECIPES.A1;
    const out = [], seen = new Set();
    // ข้อที่ครูเพิ่มในชีตสำหรับด่านนี้ ใส่ก่อน (สุ่มไม่เกินครึ่ง)
    const pinned = shuffle(ctx.extra.filter((q) => q.stage && q.stage.toUpperCase() === stageKey)).slice(0, Math.floor(count / 2));
    pinned.forEach((q) => { const g = G.extra(u, { extra: [q] }); if (g) { out.push(g); seen.add(g.key); } });
    let guard = 0;
    while (out.length < count && guard++ < 400) {
      const name = guard < 250 ? weighted(recipe) : pick(FALLBACK);
      const q = run(name, u, ctx);
      if (!q || seen.has(q.key) || (q.type !== "pair" && q.answer < 0)) continue;
      seen.add(q.key); q.gen = name; out.push(q);
    }
    // เรียงง่าย→ยากเล็กน้อย: tf/meaning ก่อน
    const order = { tfm: 0, tf: 0, meaning: 1, sort: 2, pair: 2, meaningR: 3 };
    return out.sort((a, b) => (order[a.gen] ?? 5) - (order[b.gen] ?? 5));
  }

  window.QGen = { buildRound, VIB, NUM, cells, shuffle, RECIPES };
})();
