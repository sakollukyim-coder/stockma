# Stock Manager Full-Stack

โปรเจกต์นี้เป็นระบบจัดการสต็อคแว่นตาแบบ full-stack โดยใช้:
- Backend: Node.js + Express
- Database: SQLite
- Frontend: HTML, CSS, JavaScript

## ติดตั้ง
1. เปิด terminal ที่โฟลเดอร์ `stockma`
2. ถ้าใช้ Node.js แล้ว สามารถรันเซิร์ฟเวอร์ได้ทันทีโดยไม่ต้องติดตั้ง dependencies เพิ่มเติม

## เริ่มระบบ
```bash
node server.js
```

จากนั้นเปิดเว็บเบราเซอร์ที่:
```
http://localhost:3000
```

## หากต้องการแก้ไข
- `server.js` - เซิร์ฟเวอร์ backend และ API
- `public/index.html` - โครงสร้างหน้าเว็บ
- `public/styles.css` - สไตล์
- `public/app.js` - จัดการข้อมูล frontend และเรียก API
