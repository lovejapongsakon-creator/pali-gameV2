/* แคชไฟล์เกมไว้ในเครื่อง: เน็ตห้องเรียนสะดุดก็ยังเล่นต่อได้ (ผลจะส่งเมื่อกลับมาออนไลน์)
   เมื่อแก้ไฟล์เกม ให้เปลี่ยนเลขเวอร์ชันด้านล่าง เพื่อให้เครื่องนักเรียนโหลดของใหม่ */
const VERSION = "pq-2569.2-1";
const FILES = ["./", "index.html", "css/style.css", "js/config.js", "js/data/units.js", "js/qgen.js", "js/art.js", "js/sfx.js", "js/api.js", "js/app.js", "assets/icon.svg", "manifest.json"];

self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.hostname.includes("script.google")) return; // ข้อมูลหลังบ้านไม่แคช
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res.ok && (url.origin === location.origin || url.hostname.includes("fonts."))) caches.open(VERSION).then((c) => c.put(e.request, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
