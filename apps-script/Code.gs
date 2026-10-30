/**
 * หอไตรบาลี — หลังบ้าน Google Apps Script (ผูกกับ Google Sheet)
 * วิธีติดตั้ง: ดู README.md ข้อ "ติดตั้งหลังบ้าน"
 *  1) เปิด Google Sheet > ส่วนขยาย > Apps Script > วางโค้ดนี้ทั้งหมด > บันทึก
 *  2) เลือกฟังก์ชัน setup แล้วกด "เรียกใช้" ครั้งเดียว (สร้างแท็บและหัวตารางให้อัตโนมัติ)
 *  3) ทำให้ใช้งานได้ (Deploy) > การทำให้ใช้งานได้รายการใหม่ > เว็บแอป
 *     - ดำเนินการในฐานะ: ฉัน   - ผู้มีสิทธิ์เข้าถึง: ทุกคน
 *  4) คัดลอก URL ที่ลงท้าย /exec ไปใส่ใน js/config.js (API_URL)
 */

const SHEETS = {
  Settings: ["key", "value", "คำอธิบาย"],
  Units: ["unit", "title", "open", "close", "override", "หมายเหตุ"],
  Roster: ["id", "name", "class", "no"],
  Questions: ["unit", "stage", "question", "choice1", "choice2", "choice3", "choice4", "answer", "explain", "active"],
  Log: ["timestamp", "year", "id", "name", "class", "no", "unit", "stage", "sub", "score", "total", "percent", "pass", "stars", "secs", "xp", "points", "uid"],
  Progress: ["key", "id", "name", "class", "no", "unit", "A", "B", "stars", "testBest", "testTries", "xp", "cert", "updated"],
  Scores: ["id", "name", "class", "no"]
};
const UNIT_TITLES = ["นามนาม คุณนาม และสัพพนาม", "ลิงค์ (เพศ)", "วจนะ วิภัตติ และอายตนิบาต", "การันต์ และ อ การันต์ในปุงลิงค์", "อิ และ อี การันต์ในปุงลิงค์",
  "อุ และ อู การันต์ในปุงลิงค์", "อา และ อิ การันต์ในอิตถีลิงค์", "อี อุ และ อู การันต์ในอิตถีลิงค์", "อ อิ และ อุ การันต์ในนปุงสกลิงค์", "กติปยศัพท์ อตฺต พฺรหฺม และ ราช",
  "ภควนฺตุ อรหนฺต และ ภวนฺต", "สตฺถุ ปิตุ และ มาตุ", "มโนคณะ กมฺม และ โค", "สังขยาคุณนาม", "ปุริสสัพพนาม", "วิเสสนสัพพนามประเภทอนิยม",
  "วิเสสนสัพพนามประเภทนิยม", "อัพยยศัพท์และอุปสัค", "นิบาต", "ปัจจัยที่เป็นอัพยยศัพท์"];
const DEFAULT_SETTINGS = [
  ["YEAR", "2569", "ปีการศึกษา (ขึ้นปีใหม่แก้ตรงนี้ ข้อมูลเก่ายังอยู่ใน Log)"],
  ["TERM_START", "", "วันจันทร์ของสัปดาห์ที่ ๑ (รูปแบบ ปปปป-ดด-วว ค.ศ. เช่น 2026-11-02) แท็บ Units จะคำนวณวันเปิด–ปิดให้เอง"],
  ["TEACHER_CODE", "0406", "รหัสครูสำหรับเข้าแดชบอร์ด"],
  ["PASS_PERCENT", "90", "ต้องได้อย่างน้อยกี่ % จึงผ่านด่านย่อย"],
  ["QUESTIONS_PER_ROUND", "10", "จำนวนข้อต่อด่านย่อย"],
  ["STAGE_MINUTES", "60", "เวลาแนะนำต่อด่านใหญ่ (นาที)"],
  ["TEST_QUESTIONS", "10", "จำนวนข้อทดสอบท้ายหน่วย"],
  ["TEST_POINTS", "2", "คะแนนเต็มทดสอบท้ายหน่วย"],
  ["MAX_TEST_ATTEMPTS", "2", "สอบท้ายหน่วยได้กี่ครั้ง (นับครั้งที่ดีที่สุด)"],
  ["PRACTICE_AFTER_CLOSE", "TRUE", "หน่วยที่ปิดแล้วยังฝึกซ้อมได้ (ไม่บันทึก)"],
  ["ANNOUNCEMENT", "", "ข้อความประกาศบนหน้าหลักของเกม"]
];

// ---------- ติดตั้งครั้งแรก ----------
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const head = name === "Scores" ? SHEETS.Scores.concat(UNIT_TITLES.map(function (_, i) { return "U" + (i + 1); }), ["รวม"]) : SHEETS[name];
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight("bold").setBackground("#cdeeff");
      sh.setFrozenRows(1);
    }
  });
  const st = ss.getSheetByName("Settings");
  if (st.getLastRow() < 2) st.getRange(2, 1, DEFAULT_SETTINGS.length, 3).setValues(DEFAULT_SETTINGS);
  const un = ss.getSheetByName("Units");
  if (un.getLastRow() < 2) {
    // วันเปิด = TERM_START + (หน่วย-1)×7 วัน, ปิด = เปิด + 6 วัน (หน่วยละ ๑ สัปดาห์) — แก้ทับช่องใดก็ได้
    const rows = UNIT_TITLES.map(function (t, i) {
      const r = i + 2;
      return [i + 1, t, '=IF(Settings!$B$3="","",IF(ISNUMBER(Settings!$B$3),Settings!$B$3,DATEVALUE(Settings!$B$3))+(A' + r + '-1)*7)', '=IF(C' + r + '="","",C' + r + '+6)', "", ""];
    });
    un.getRange(2, 1, rows.length, 6).setValues(rows);
    un.getRange(2, 3, rows.length, 2).setNumberFormat("yyyy-mm-dd");
    un.getRange(1, 5).setNote("ใส่ OPEN = เปิดตลอด, CLOSE = ปิด, เว้นว่าง = ตามวันที่");
  }
  ss.getSheetByName("Questions").getRange(1, 1).setNote("เพิ่มข้อสอบเองได้: unit=เลขหน่วย, stage=A1..A5/B1..B5/T (เว้นว่าง=สุ่มรวม), answer=1-4, active=TRUE");
  const sc = ss.getSheetByName("Scores");
  sc.getRange(1, 1).setNote("แท็บนี้ระบบเติมให้อัตโนมัติ: คะแนนทดสอบท้ายหน่วยที่ดีที่สุด (เต็มหน่วยละ 2)");
  SpreadsheetApp.getUi().alert("ติดตั้งเรียบร้อย ✓\nขั้นต่อไป: ใส่รายชื่อนักเรียนในแท็บ Roster และวันเริ่มภาคเรียนใน Settings (TERM_START) แล้ว Deploy เป็นเว็บแอป");
}

// ---------- เครื่องมือ ----------
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sheet(n) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n); }
function rows(n) {
  const sh = sheet(n); if (!sh || sh.getLastRow() < 2) return [];
  const v = sh.getDataRange().getValues(), h = v.shift();
  return v.map(function (r) { const o = {}; h.forEach(function (k, i) { o[k] = r[i]; }); return o; });
}
function iso(d) { return Object.prototype.toString.call(d) === "[object Date]" ? Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd") : String(d || "").trim(); }
function settings() {
  const o = {}; rows("Settings").forEach(function (r) { if (r.key) o[r.key] = String(r.value); }); return o;
}

// ชีตมักแปลง "0406" เป็นตัวเลข 406 — เทียบรหัสโดยตัด 0 ข้างหน้าทิ้งเสมอ
function norm(x) { return String(x === null || x === undefined ? "" : x).trim().replace(/^0+(?=\d)/, ""); }

// ---------- อ่านข้อมูล (GET) ----------
function doGet(e) {
  const a = (e.parameter.action || "config");
  try {
    if (a === "config") return json(getConfig());
    if (a === "login") return json(login(String(e.parameter.id || "").trim()));
    if (a === "teacher") return json(teacher(String(e.parameter.code || "")));
    if (a === "ping") return json({ ok: true, t: new Date() });
    return json({ ok: false, error: "unknown action" });
  } catch (err) { return json({ ok: false, error: String(err) }); }
}

function getConfig() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get("config"); if (hit) return JSON.parse(hit);
  const s = settings();
  const today = iso(new Date());
  const units = rows("Units").map(function (r) {
    const open = iso(r.open), close = iso(r.close), ov = String(r.override || "").toUpperCase();
    let status = "open";
    if (ov === "CLOSE") status = "closed"; else if (ov === "OPEN") status = "open";
    else if (open && today < open) status = "upcoming"; else if (close && today > close) status = "closed";
    return { n: Number(r.unit), open: open, close: close, status: status };
  });
  const questions = rows("Questions").filter(function (q) { return q.question && String(q.active).toUpperCase() !== "FALSE"; }).map(function (q) {
    return { unit: Number(q.unit), stage: String(q.stage || ""), q: String(q.question), c: [q.choice1, q.choice2, q.choice3, q.choice4].map(String).filter(function (x) { return x; }), a: Number(q.answer) - 1, x: String(q.explain || "") };
  });
  const pub = {}; ["YEAR", "PASS_PERCENT", "QUESTIONS_PER_ROUND", "STAGE_MINUTES", "TEST_QUESTIONS", "TEST_POINTS", "MAX_TEST_ATTEMPTS", "PRACTICE_AFTER_CLOSE"].forEach(function (k) { if (s[k] !== undefined) pub[k] = s[k]; });
  const out = { ok: true, settings: pub, units: units, questions: questions, announcement: s.ANNOUNCEMENT || "" };
  cache.put("config", JSON.stringify(out), 120); // แคช 2 นาที ลดภาระเมื่อทั้งห้องเข้าพร้อมกัน
  return out;
}

function progressOf(id) {
  const out = {};
  rows("Progress").forEach(function (r) {
    if (norm(r.id) !== id) return;
    let stars = {}; try { stars = JSON.parse(r.stars || "{}"); } catch (e) {}
    out[r.unit] = { A: Number(r.A) || 0, B: Number(r.B) || 0, stars: stars, xp: Number(r.xp) || 0, testTries: Number(r.testTries) || 0, cert: r.cert || undefined };
    if (r.testBest !== "" && r.testBest !== null) out[r.unit].testBest = Number(r.testBest);
  });
  return out;
}

function login(id) {
  id = norm(id);
  if (!id) return { ok: false, error: "กรุณาใส่รหัสนักเรียน" };
  const st = rows("Roster").filter(function (r) { return norm(r.id) === id; })[0];
  if (!st) return { ok: false, error: "ไม่พบรหัสนักเรียนนี้ในรายชื่อ แจ้งครูผู้สอนนะ" };
  return { ok: true, student: { id: id, name: String(st.name), cls: String(st["class"] || ""), no: String(st.no || "") }, progress: progressOf(id) };
}

function teacher(code) {
  if (!code || norm(code) !== norm(settings().TEACHER_CODE || "0406")) return { ok: false, error: "รหัสครูไม่ถูกต้อง" };
  const prog = {};
  rows("Progress").forEach(function (r) {
    const id = norm(r.id); prog[id] = prog[id] || {};
    prog[id][r.unit] = { A: Number(r.A) || 0, B: Number(r.B) || 0, testBest: r.testBest === "" ? undefined : Number(r.testBest), testTries: Number(r.testTries) || 0 };
  });
  const students = rows("Roster").filter(function (r) { return norm(r.id); }).map(function (r) { const id = norm(r.id); return { id: id, name: String(r.name), cls: String(r["class"] || ""), no: String(r.no || ""), progress: prog[id] || {} }; });
  return { ok: true, students: students };
}

// ---------- บันทึกผล (POST) ----------
function doPost(e) {
  let body; try { body = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: "bad json" }); }
  if (body.action !== "submit") return json({ ok: false, error: "unknown action" });
  const lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (err) { return json({ ok: false, error: "busy" }); }
  try {
    const saved = saveRecords(body.records || []);
    return json({ ok: true, saved: saved });
  } finally { lock.releaseLock(); }
}

function saveRecords(recs) {
  const cache = CacheService.getScriptCache();
  const roster = {}; rows("Roster").forEach(function (r) { if (norm(r.id)) roster[norm(r.id)] = r; });
  const log = sheet("Log"), prog = sheet("Progress"), sc = sheet("Scores");
  const pv = prog.getDataRange().getValues(); const pIndex = {};
  for (let i = 1; i < pv.length; i++) pIndex[pv[i][0]] = i + 1;
  const sv = sc.getDataRange().getValues(); const sIndex = {};
  for (let i = 1; i < sv.length; i++) sIndex[norm(sv[i][0])] = i + 1;
  const saved = [], logRows = [];
  recs.forEach(function (r) {
    if (!r || !r.uid) return;
    const id = norm(r.id);
    if (!roster[id]) return;                // รับเฉพาะรหัสที่อยู่ในรายชื่อ
    if (cache.get("uid_" + r.uid)) { saved.push(r.uid); return; } // ส่งซ้ำ ไม่บันทึกซ้ำ
    const st = roster[id];
    logRows.push([new Date(), r.year, id, st.name, st["class"], st.no, r.unit, r.stage, r.sub, r.score, r.total, r.percent, r.pass, r.stars, r.secs, r.xp, r.points === null ? "" : r.points, r.uid]);
    // ความคืบหน้าล่าสุด (เอาค่ามากสุด)
    const key = id + "|" + r.unit, p = r.progress || {};
    let row = pIndex[key], cur = row ? prog.getRange(row, 1, 1, 14).getValues()[0] : null;
    const A = Math.max(p.A || 0, cur ? Number(cur[6]) || 0 : 0), B = Math.max(p.B || 0, cur ? Number(cur[7]) || 0 : 0);
    let stars = {}; try { stars = JSON.parse(cur ? cur[8] || "{}" : "{}"); } catch (e) {}
    Object.keys(p.stars || {}).forEach(function (k) { stars[k] = Math.max(stars[k] || 0, p.stars[k]); });
    const tb = [p.testBest, cur ? cur[9] : ""].filter(function (x) { return x !== "" && x !== null && x !== undefined; }).map(Number);
    const testBest = tb.length ? Math.max.apply(null, tb) : "";
    const tries = Math.max(p.testTries || 0, cur ? Number(cur[10]) || 0 : 0);
    const vals = [key, id, st.name, st["class"], st.no, r.unit, A, B, JSON.stringify(stars), testBest, tries, Math.max(p.xp || 0, cur ? Number(cur[11]) || 0 : 0), p.cert || (cur ? cur[12] : ""), new Date()];
    if (row) prog.getRange(row, 1, 1, 14).setValues([vals]);
    else { prog.appendRow(vals); pIndex[key] = prog.getLastRow(); }
    // ตารางคะแนน (คะแนนทดสอบท้ายหน่วยที่ดีที่สุด)
    if (r.stage === "T" && testBest !== "") {
      let srow = sIndex[id];
      if (!srow) {
        const n = UNIT_TITLES.length;
        sc.appendRow([id, st.name, st["class"], st.no].concat(new Array(n).fill("")));
        srow = sc.getLastRow(); sIndex[id] = srow;
        sc.getRange(srow, 5 + n).setFormula("=SUM(E" + srow + ":" + colName(4 + n) + srow + ")");
      }
      sc.getRange(srow, 4 + Number(r.unit)).setValue(testBest);
    }
    cache.put("uid_" + r.uid, "1", 21600);
    saved.push(r.uid);
  });
  if (logRows.length) log.getRange(log.getLastRow() + 1, 1, logRows.length, logRows[0].length).setValues(logRows);
  return saved;
}

function colName(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

// ---------- เมนูในชีต ----------
function onOpen() {
  SpreadsheetApp.getUi().createMenu("หอไตรบาลี")
    .addItem("ติดตั้ง/ซ่อมแท็บ (setup)", "setup")
    .addItem("ล้างแคช (ให้เกมเห็นค่าตั้งใหม่ทันที)", "clearCache")
    .addToUi();
}
function clearCache() { CacheService.getScriptCache().remove("config"); SpreadsheetApp.getActive().toast("ล้างแคชแล้ว"); }
