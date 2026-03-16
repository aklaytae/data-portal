# DATA PORTAL — Bill · Limit · DPD

ระบบดูข้อมูล Bill, Limit, DPD บน localhost
Backend: Node.js + Express + SQLite
Frontend: React

---

## โครงสร้างโปรเจกต์

```
project/
├── backend/
│   ├── server.js          ← API server
│   ├── import_csv.js      ← Script นำเข้า CSV
│   ├── package.json
│   └── gallery.db         ← สร้างอัตโนมัติหลัง import
│
└── frontend/
    ├── src/
    │   └── App.jsx
    └── package.json
```

---

## ขั้นตอนติดตั้ง

### 1. ติดตั้ง Backend

```bash
cd backend
npm install
```

### 2. นำเข้าข้อมูล CSV

วางไฟล์ CSV ทั้ง 3 ไฟล์ไว้ในโฟลเดอร์ `backend/`:
- `billZML002.csv`
- `limitZML002.csv`
- `dpd_Sheet1.csv`

จากนั้นรัน:

```bash
npm run import
```

จะได้ผลลัพธ์:
```
✅ bill: นำเข้า 694 แถว
✅ limit: นำเข้า 2304 แถว
✅ dpd: นำเข้า 351 แถว
🎉 นำเข้าข้อมูลเสร็จสิ้น!
```

### 3. รัน Backend Server

```bash
npm start
```

Server จะรันที่ http://localhost:3001

### 4. ติดตั้งและรัน Frontend

เปิด Terminal หน้าต่างใหม่:

```bash
cd frontend
npm install
npm start
```

เปิดเบราว์เซอร์ที่ http://localhost:3000

---

## API Endpoints

| Method | URL | คำอธิบาย |
|--------|-----|----------|
| GET | /api/stats | สถิติภาพรวม |
| GET | /api/bill?search=&page= | ข้อมูล Bill |
| GET | /api/bill/:acc | รายละเอียดบัญชี (รวม Limit + DPD) |
| GET | /api/limit?search=&page= | ข้อมูล Limit |
| GET | /api/dpd?search=&province=&page= | ข้อมูล DPD |
| GET | /api/dpd/provinces | รายชื่อจังหวัดทั้งหมด |

---

## ฟีเจอร์

- ✅ ตาราง Bill พร้อมค้นหา + pagination
- ✅ คลิกแถวใน Bill เพื่อดู Limit + DPD ที่เชื่อมกับ ACC
- ✅ ตาราง Limit พร้อมค้นหา
- ✅ ตาราง DPD พร้อมกรองจังหวัด
- ✅ Dashboard สถิติภาพรวม
- ✅ แสดงสถานะ connected/offline
