/* เสียงประกอบสังเคราะห์ด้วย Web Audio — ไม่ต้องโหลดไฟล์เสียง ไม่มีปัญหาลิขสิทธิ์ */
(function () {
  let ctx = null;
  let on = true;
  try { on = localStorage.getItem("pq_sound") !== "off"; } catch (e) {}

  function ac() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, type = "sine", vol = 0.18) {
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    const t = a.currentTime + start;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  // ระฆังใส ๆ: เสียงพื้นฐาน + ฮาร์มอนิก
  function bell(freq, start, dur = 1.2, vol = 0.14) {
    tone(freq, start, dur, "sine", vol);
    tone(freq * 2.76, start, dur * 0.6, "sine", vol * 0.35);
    tone(freq * 5.4, start, dur * 0.3, "sine", vol * 0.15);
  }
  const S = {
    click() { tone(660, 0, 0.08, "triangle", 0.08); },
    ok() { tone(784, 0, 0.14, "triangle"); tone(1175, 0.09, 0.22, "triangle"); },
    bad() { tone(220, 0, 0.18, "sine", 0.16); tone(185, 0.1, 0.25, "sine", 0.12); },
    combo(n) { const base = 523 + Math.min(n, 10) * 40; [0, 4, 7, 12].forEach((s, i) => tone(base * Math.pow(2, s / 12), i * 0.06, 0.16, "triangle", 0.12)); },
    pass() { bell(659, 0); bell(880, 0.25); bell(1319, 0.5, 1.6); },
    fail() { tone(392, 0, 0.3, "sine", 0.12); tone(330, 0.25, 0.45, "sine", 0.12); },
    unlock() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.25, "sine", 0.12)); },
    tick() { tone(1000, 0, 0.04, "square", 0.04); }
  };
  window.SFX = {
    play(name, arg) { if (!on) return; try { S[name] && S[name](arg); } catch (e) {} },
    toggle() { on = !on; try { localStorage.setItem("pq_sound", on ? "on" : "off"); } catch (e) {} if (on) S.click(); return on; },
    get on() { return on; }
  };
})();
