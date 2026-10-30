/* ตั้งค่าหลักของเกม — ปีต่อไปแก้แค่ในไฟล์นี้หรือใน Google Sheet แท็บ Settings */
window.PALI_CONFIG = {
  // URL ของ Google Apps Script Web App (ได้หลัง Deploy ตามคู่มือ README) — เว้นว่างไว้ = โหมดทดลองเล่น เก็บข้อมูลในเครื่อง
  API_URL: "https://script.google.com/macros/s/AKfycbxIwYejZCxlrJvsg7LMhXhGQJZaO6JJrErESQYX2NBzWwvOGdTuiJOPYD6wYelHxPNUPA/exec",

  SCHOOL: "โรงเรียนพระปริยัติธรรมวัดธรรมมงคล แผนกสามัญศึกษา",
  TEACHER: "พระมหาพงศกร กิตฺติวํโส",
  COURSE: "ภาษาบาลี บ21202 ชั้นมัธยมศึกษาปีที่ ๑",
  YEAR: "2569",
  LOGO: "https://i.ibb.co/dZqR9Pd/2.png",

  // ค่าเริ่มต้น (ถ้าใน Settings ของชีตมีค่า จะใช้ค่าจากชีตแทน)
  PASS_PERCENT: 90,        // ต้องได้อย่างน้อยกี่ % จึงผ่านด่านย่อย
  QUESTIONS_PER_ROUND: 10, // ข้อต่อด่านย่อย
  STAGE_MINUTES: 60,       // เวลาแนะนำต่อด่านใหญ่
  TEST_QUESTIONS: 10,      // ข้อสอบท้ายหน่วย
  TEST_POINTS: 2,          // คะแนนเต็มของทดสอบท้ายหน่วย
  MAX_TEST_ATTEMPTS: 2,    // สอบได้กี่ครั้ง (นับครั้งที่ดีที่สุด)
  PRACTICE_AFTER_CLOSE: true // หน่วยที่ปิดแล้วยังฝึกซ้อมได้ (ไม่บันทึกคะแนน)
};
