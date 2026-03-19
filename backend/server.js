const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
 
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
 
const cloudStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const acc = req.params.acc;
    const row = queryOne("SELECT name FROM bill WHERE acc = ?", [acc]);
    const name = row?.name ? row.name.replace(/[^a-zA-Z0-9ก-๙]/g, "_").substring(0, 30) : "";
    return {
      folder: "data-portal",
      public_id: `${acc}-${name}-${Date.now()}`,
      allowed_formats: ["jpg","jpeg","png","gif","webp","bmp"],
    };
  },
});
const upload = multer({ storage: cloudStorage, limits: { fileSize: 10 * 1024 * 1024 } });
 
const app = express();
const PORT = process.env.PORT || 3002;
const DB_PATH = path.join(__dirname, "gallery.db");
 
app.use(cors());
app.use(express.json({ limit: "50mb" }));
 
let db;
 
async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS bill (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      acc TEXT, no INTEGER, channee REAL, mkank INTEGER, name TEXT,
      c1 TEXT, c2 TEXT, c3 TEXT, c4 INTEGER,
      call TEXT, type TEXT, mkt_code TEXT, company TEXT, branch TEXT,
      imported_date INTEGER
    );
    CREATE TABLE IF NOT EXISTS limit_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      acc TEXT, name TEXT, no TEXT, channee TEXT, kank TEXT,
      allbalance TEXT, calculate_mat REAL
    );
    CREATE TABLE IF NOT EXISTS dpd (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      acc TEXT, name TEXT, tel1 TEXT, tel2 TEXT, tel3 TEXT, tel4 TEXT,
      address TEXT, road TEXT, yak TEXT, soy TEXT,
      tambol TEXT, ampher TEXT, province TEXT, code REAL
    );
    CREATE INDEX IF NOT EXISTS idx_bill_acc  ON bill(acc);
    CREATE INDEX IF NOT EXISTS idx_limit_acc ON limit_info(acc);
    CREATE INDEX IF NOT EXISTS idx_dpd_acc   ON dpd(acc);
    CREATE TABLE IF NOT EXISTS images (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      acc       TEXT NOT NULL,
      filename  TEXT NOT NULL,
      date      INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_images_acc ON images(acc);
  `);
  saveDB();
  console.log("✅ Database พร้อมใช้งาน");
}
 
function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}
 
function queryAll(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch (e) { return []; }
}
 
function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] || null;
}
 
app.get("/api/stats", (req, res) => {
  res.json({
    billCount:  queryOne("SELECT COUNT(*) as cnt FROM bill").cnt,
    limitCount: queryOne("SELECT COUNT(*) as cnt FROM limit_info").cnt,
    dpdCount:   queryOne("SELECT COUNT(*) as cnt FROM dpd").cnt,
    provinces:  queryOne("SELECT COUNT(DISTINCT province) as cnt FROM dpd").cnt,
    companies:  queryOne("SELECT COUNT(DISTINCT company) as cnt FROM bill").cnt,
  });
});
 
app.get("/api/last-import", (req, res) => {
  const row = queryOne("SELECT MAX(imported_date) as last FROM bill");
  res.json({ last: row?.last || null });
});
 
app.get("/api/images/:acc", (req, res) => {
  const rows = queryAll("SELECT * FROM images WHERE acc = ? ORDER BY date DESC", [req.params.acc]);
  res.json(rows);
});
 
app.post("/api/images/:acc", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    try {
      if (err) {
        console.error("Upload error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      if (!req.file) {
        console.error("No file in request");
        return res.status(400).json({ error: "No file" });
      }
      const { acc } = req.params;
      const url = req.file.path;
      console.log("Uploaded to Cloudinary:", url);
      db.run("INSERT INTO images (acc, filename, date) VALUES (?, ?, ?)", [acc, url, Date.now()]);
      saveDB();
      res.json({ success: true, filename: url });
    } catch (e) {
      console.error("Exception:", e.message);
      res.status(500).json({ error: e.message });
    }
  });
});
 
app.delete("/api/images/:id", async (req, res) => {
  const img = queryOne("SELECT * FROM images WHERE id = ?", [req.params.id]);
  if (!img) return res.status(404).json({ error: "Not found" });
  if (img.filename.startsWith("http")) {
    const parts = img.filename.split("/");
    const publicId = parts.slice(-2).join("/").replace(/\.[^/.]+$/, "");
    try { await cloudinary.uploader.destroy(publicId); } catch (e) { console.error("Cloudinary delete error:", e.message); }
  }
  db.run("DELETE FROM images WHERE id = ?", [req.params.id]);
  saveDB();
  res.json({ success: true });
});
 
app.get("/api/bill", (req, res) => {
  const { search = "", page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let rows, total;
  if (search) {
    const s = `%${search}%`;
    rows  = queryAll("SELECT * FROM bill WHERE acc LIKE ? OR name LIKE ? OR company LIKE ? LIMIT ? OFFSET ?", [s,s,s,+limit,offset]);
    total = queryOne("SELECT COUNT(*) as cnt FROM bill WHERE acc LIKE ? OR name LIKE ? OR company LIKE ?", [s,s,s]).cnt;
  } else {
    rows  = queryAll("SELECT * FROM bill LIMIT ? OFFSET ?", [+limit, offset]);
    total = queryOne("SELECT COUNT(*) as cnt FROM bill").cnt;
  }
  res.json({ rows, total, page: +page, pages: Math.ceil(total / limit) });
});
 
app.get("/api/bill/:acc", (req, res) => {
  const bill = queryOne("SELECT * FROM bill WHERE acc = ?", [req.params.acc]);
  if (!bill) return res.status(404).json({ error: "Not found" });
  res.json({
    bill,
    limit: queryOne("SELECT * FROM limit_info WHERE acc = ?", [req.params.acc]),
    dpd:   queryOne("SELECT * FROM dpd WHERE acc = ?", [req.params.acc]),
  });
});
 
app.get("/api/limit", (req, res) => {
  const { search = "", page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let rows, total;
  if (search) {
    const s = `%${search}%`;
    rows  = queryAll("SELECT * FROM limit_info WHERE acc LIKE ? OR name LIKE ? LIMIT ? OFFSET ?", [s,s,+limit,offset]);
    total = queryOne("SELECT COUNT(*) as cnt FROM limit_info WHERE acc LIKE ? OR name LIKE ?", [s,s]).cnt;
  } else {
    rows  = queryAll("SELECT * FROM limit_info LIMIT ? OFFSET ?", [+limit, offset]);
    total = queryOne("SELECT COUNT(*) as cnt FROM limit_info").cnt;
  }
  res.json({ rows, total, page: +page, pages: Math.ceil(total / limit) });
});
 
app.get("/api/dpd", (req, res) => {
  const { search = "", province = "", page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let conditions = [], params = [];
  if (search) { conditions.push("(acc LIKE ? OR name LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  if (province) { conditions.push("province = ?"); params.push(province); }
  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const rows  = queryAll(`SELECT * FROM dpd ${where} LIMIT ? OFFSET ?`, [...params, +limit, offset]);
  const total = queryOne(`SELECT COUNT(*) as cnt FROM dpd ${where}`, params).cnt;
  res.json({ rows, total, page: +page, pages: Math.ceil(total / limit) });
});
 
app.get("/api/dpd/provinces", (req, res) => {
  res.json(queryAll("SELECT DISTINCT province FROM dpd WHERE province IS NOT NULL ORDER BY province").map(r => r.province));
});
 
app.post("/api/import", (req, res) => {
  const { table, rows } = req.body;
  if (!table || !rows) return res.status(400).json({ error: "Invalid" });
  if (table === "bill") {
    db.run("DELETE FROM bill");
    const stmt = db.prepare("INSERT INTO bill (acc,no,channee,mkank,name,c1,c2,c3,c4,call,type,mkt_code,company,branch,imported_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    const now = Date.now();
    rows.forEach(r => stmt.run([r.acc,r.no,r.channee,r.mkank,r.name,r.c1,r.c2,r.c3,r.c4,r.call,r.type,r.mkt_code,r.company,r.branch,now]));
    stmt.free();
  } else if (table === "limit_info") {
    db.run("DELETE FROM limit_info");
    const stmt = db.prepare("INSERT INTO limit_info (acc,name,no,channee,kank,allbalance,calculate_mat) VALUES (?,?,?,?,?,?,?)");
    rows.forEach(r => stmt.run([r.acc,r.name,r.no,r.channee,r.kank,r.allbalance,r.calculate_mat]));
    stmt.free();
  } else if (table === "dpd") {
    db.run("DELETE FROM dpd");
    const stmt = db.prepare("INSERT INTO dpd (acc,name,tel1,tel2,tel3,tel4,address,road,yak,soy,tambol,ampher,province,code) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    rows.forEach(r => stmt.run([r.acc,r.name,r.tel1,r.tel2,r.tel3,r.tel4,r.address,r.road,r.yak,r.soy,r.tambol,r.ampher,r.province,r.code]));
    stmt.free();
  }
  saveDB();
  res.json({ success: true, count: rows.length });
});
 
initDB().then(() => {
  app.use(express.static(path.join(__dirname, "build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
  app.listen(PORT, () => console.log(`✅ Server รันที่ http://localhost:${PORT}`));
});