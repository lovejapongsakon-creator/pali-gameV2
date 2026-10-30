/* ตัวละครประกอบ (SVG วาดเอง) และพลุฉลอง
   - "เณรน้อยบาลี" : สามเณรน้อยถือใบลาน เป็นผู้นำทาง
   - "ช้างน้อยเอราวัณ" : เพื่อนร่วมทาง (มาจากตัวอย่าง เอราวโณ ในหน่วยที่ ๑) */
(function () {
  const NOVICE = (mood = "smile") => `
<svg viewBox="0 0 120 150" role="img" aria-label="เณรน้อยบาลี">
  <ellipse cx="60" cy="144" rx="38" ry="5" fill="rgba(29,43,100,.12)"/>
  <path d="M22 140 Q24 92 60 88 Q96 92 98 140 Z" fill="#f29a2e"/>
  <path d="M60 88 Q42 100 40 140 L60 140 Z" fill="#e2861d"/>
  <path d="M60 90 L86 140" stroke="#d27512" stroke-width="3" fill="none"/>
  <rect x="30" y="104" width="34" height="22" rx="3" fill="#f3e2b3" stroke="#c9a464" stroke-width="2" transform="rotate(-8 47 115)"/>
  <path d="M34 110 h24 M34 116 h22 M34 122 h18" stroke="#b08a4a" stroke-width="1.6" transform="rotate(-8 47 115)"/>
  <circle cx="60" cy="56" r="34" fill="#f6d2b0"/>
  <path d="M27 50 Q30 22 60 21 Q90 22 93 50 Q88 34 60 33 Q32 34 27 50 Z" fill="#d9b49a" opacity=".55"/>
  <ellipse cx="26" cy="60" rx="6" ry="8" fill="#f1c39c"/><ellipse cx="94" cy="60" rx="6" ry="8" fill="#f1c39c"/>
  ${mood === "sad"
    ? `<path d="M44 58 q5 -4 10 0 M66 58 q5 -4 10 0" stroke="#1d2b64" stroke-width="3" fill="none" stroke-linecap="round"/>
       <path d="M50 78 q10 -7 20 0" stroke="#1d2b64" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : `<circle cx="48" cy="58" r="4.5" fill="#1d2b64"/><circle cx="72" cy="58" r="4.5" fill="#1d2b64"/>
       <circle cx="49.5" cy="56.5" r="1.4" fill="#fff"/><circle cx="73.5" cy="56.5" r="1.4" fill="#fff"/>
       <path d="M48 72 q12 10 24 0" stroke="#1d2b64" stroke-width="3" fill="none" stroke-linecap="round"/>`}
  <circle cx="40" cy="68" r="5" fill="#ffb3d1" opacity=".7"/><circle cx="80" cy="68" r="5" fill="#ffb3d1" opacity=".7"/>
</svg>`;

  const ELEPHANT = (mood = "smile") => `
<svg viewBox="0 0 120 120" role="img" aria-label="ช้างน้อยเอราวัณ">
  <ellipse cx="60" cy="114" rx="36" ry="5" fill="rgba(29,43,100,.12)"/>
  <rect x="30" y="72" width="16" height="36" rx="7" fill="#8ea7cf"/><rect x="72" y="72" width="16" height="36" rx="7" fill="#8ea7cf"/>
  <ellipse cx="60" cy="74" rx="36" ry="28" fill="#9fb6d9"/>
  <ellipse cx="24" cy="46" rx="20" ry="24" fill="#ffb3d1"/><ellipse cx="96" cy="46" rx="20" ry="24" fill="#ffb3d1"/>
  <ellipse cx="24" cy="46" rx="14" ry="18" fill="#9fb6d9"/><ellipse cx="96" cy="46" rx="14" ry="18" fill="#9fb6d9"/>
  <circle cx="60" cy="46" r="28" fill="#aec3e3"/>
  <path d="M60 58 Q58 82 70 92 Q76 96 78 90" stroke="#aec3e3" stroke-width="13" fill="none" stroke-linecap="round"/>
  <path d="M46 26 Q60 14 74 26 Q60 20 46 26 Z" fill="#ffe08a"/>
  <circle cx="60" cy="20" r="5" fill="#ffe08a" stroke="#e8a800" stroke-width="2"/>
  ${mood === "sad"
    ? `<path d="M45 46 q5 -4 10 0 M65 46 q5 -4 10 0" stroke="#1d2b64" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : `<circle cx="50" cy="45" r="4" fill="#1d2b64"/><circle cx="70" cy="45" r="4" fill="#1d2b64"/>
       <circle cx="51.3" cy="43.6" r="1.3" fill="#fff"/><circle cx="71.3" cy="43.6" r="1.3" fill="#fff"/>`}
  <circle cx="42" cy="56" r="4" fill="#ffb3d1" opacity=".8"/><circle cx="78" cy="56" r="4" fill="#ffb3d1" opacity=".8"/>
</svg>`;

  const LINES = {
    hello: ["สวัสดีครับ มาเรียนบาลีกันเถอะ!", "พร้อมลุยด่านวันนี้ไหม?", "วันละนิด จำได้ยาวนาน"],
    ok: ["เยี่ยมมาก!", "ถูกต้องครับ!", "สาธุ เก่งมาก!", "จำแม่นจริง ๆ", "ไปต่อเลย!"],
    bad: ["ไม่เป็นไร ลองดูคำอธิบายนะ", "เกือบแล้ว!", "จำไว้ ครั้งหน้าได้แน่", "พระจูฬปันถกก็เคยจำไม่ได้ ค่อย ๆ ไป"],
    pass: ["ผ่านด่านแล้ว! เก่งที่สุด", "สุดยอด! ไปด่านถัดไปกัน", "ช้างน้อยเต้นแล้ว!"],
    fail: ["อีกนิดเดียว ลองใหม่นะ", "ต้องได้ ๙ ใน ๑๐ ข้อ สู้ ๆ", "ฝึกอีกรอบ เดี๋ยวก็ผ่าน"]
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function mascot(kind = "hello", withBubble = true) {
    const mood = kind === "bad" || kind === "fail" ? "sad" : "smile";
    const cls = kind === "ok" || kind === "pass" ? "happy" : mood === "sad" ? "sad" : "";
    return `<div class="mascot ${cls}"><div>${NOVICE(mood)}</div><div class="ele">${ELEPHANT(mood)}</div>${withBubble ? `<div class="bubble">${pick(LINES[kind] || LINES.hello)}</div>` : ""}</div>`;
  }

  // พลุกระดาษสี
  function confetti(ms = 1800) {
    const cv = document.getElementById("confetti"); if (!cv) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = cv.getContext("2d"), W = (cv.width = innerWidth), H = (cv.height = innerHeight);
    const colors = ["#8fd3fe", "#ffb3d1", "#ffe08a", "#2b8fd6", "#e0528d", "#e8a800"];
    const ps = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - 0.5) * W * 0.4, y: H * 0.35, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4, s: 6 + Math.random() * 6, r: Math.random() * 6, c: colors[(Math.random() * colors.length) | 0] }));
    const t0 = performance.now();
    (function frame(t) {
      c.clearRect(0, 0, W, H);
      ps.forEach((p) => { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += 0.15; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); });
      if (t - t0 < ms) requestAnimationFrame(frame); else c.clearRect(0, 0, W, H);
    })(t0);
  }

  window.ART = { mascot, confetti, NOVICE, ELEPHANT };
})();
