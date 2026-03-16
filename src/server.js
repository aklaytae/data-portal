const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ========== ตั้งค่า SQLite ==========
const db = new Database(path.join(__dirname, "gallery.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS bill (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    acc       TEXT,
    no        INTEGER,
    channee   REAL,
    mkank     INTEGER,
    name      TEXT,
    c1        TEXT,
    c2        TEXT,
    c3        TEXT,
    c4        INTEGER,
    call      TEXT,
    type      TEXT,
    mkt_code  TEXT,
    company   TEXT,
    branch    TEXT
  );

  CREATE TABLE IF NOT EXISTS limit_info (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    acc           TEXT,
    name          TEXT,
    no            TEXT,
    channee       TEXT,
    kank          TEXT,
    allbalance    TEXT,
    calculate_mat REAL
  );

  CREATE TABLE IF NOT EXISTS dpd (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    acc      TEXT,
    name     TEXT,
    tel1     TEXT,
    tel2     TEXT,
    tel3     TEXT,
    tel4     TEXT,
    address  TEXT,
    road     TEXT,
    yak      TEXT,
    soy      TEXT,
    tambol   TEXT,
    ampher   TEXT,
    province TEXT,
    code     REAL
  );

  CREATE INDEX IF NOT EXISTS idx_bill_acc      ON bill(acc);
  CREATE INDEX IF NOT EXISTS idx_limit_acc     ON limit_info(acc);
  CREATE INDEX IF NOT EXISTS idx_dpd_acc       ON dpd(acc);
  CREATE INDEX IF NOT EXISTS idx_bill_name     ON bill(name);
  CREATE INDEX IF NOT EXISTS idx_dpd_province  ON dpd(province);
`);

// ========== API: BILL ==========
app.get("/api/bill", (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let where = "";
  let params = [];
  if (search) {
    where = "WHERE acc LIKE ? OR name LIKE ? OR company LIKE ?";
    const s = `%${search}%`;
    params = [s, s, s];
  }
  const rows = db.prepare(`SELECT * FROM bill ${where} LIMIT ? OFFSET ?`).all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM bill ${where}`).get(...params).cnt;
  res.json({ rows, total, page: Number(page), pages: Math.ceil(total / limit) });
});

app.get("/api/bill/:acc", (req, res) => {
  const row = db.prepare("SELECT * FROM bill WHERE acc = ?").get(req.params.acc);
  if (!row) return res.status(404).json({ error: "Not found" });
  const limit = db.prepare("SELECT * FROM limit_info WHERE acc = ?").get(req.params.acc);
  const dpd = db.prepare("SELECT * FROM dpd WHERE acc = ?").get(req.params.acc);
  res.json({ bill: row, limit, dpd });
});

// ========== API: LIMIT ==========
app.get("/api/limit", (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let where = "";
  let params = [];
  if (search) {
    where = "WHERE acc LIKE ? OR name LIKE ?";
    const s = `%${search}%`;
    params = [s, s];
  }
  const rows = db.prepare(`SELECT * FROM limit_info ${where} LIMIT ? OFFSET ?`).all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM limit_info ${where}`).get(...params).cnt;
  res.json({ rows, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// ========== API: DPD ==========
app.get("/api/dpd", (req, res) => {
  const { search, province, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let conditions = [];
  let params = [];
  if (search) {
    conditions.push("(acc LIKE ? OR name LIKE ?)");
    const s = `%${search}%`;
    params.push(s, s);
  }
  if (province) {
    conditions.push("province = ?");
    params.push(province);
  }
  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const rows = db.prepare(`SELECT * FROM dpd ${where} LIMIT ? OFFSET ?`).all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM dpd ${where}`).get(...params).cnt;
  res.json({ rows, total, page: Number(page), pages: Math.ceil(total / limit) });
});

app.get("/api/dpd/provinces", (req, res) => {
  const rows = db.prepare("SELECT DISTINCT province FROM dpd WHERE province IS NOT NULL ORDER BY province").all();
  res.json(rows.map(r => r.province));
});

// ========== API: STATS ==========
app.get("/api/stats", (req, res) => {
  const billCount   = db.prepare("SELECT COUNT(*) as cnt FROM bill").get().cnt;
  const limitCount  = db.prepare("SELECT COUNT(*) as cnt FROM limit_info").get().cnt;
  const dpdCount    = db.prepare("SELECT COUNT(*) as cnt FROM dpd").get().cnt;
  const provinces   = db.prepare("SELECT COUNT(DISTINCT province) as cnt FROM dpd").get().cnt;
  const companies   = db.prepare("SELECT COUNT(DISTINCT company) as cnt FROM bill").get().cnt;
  res.json({ billCount, limitCount, dpdCount, provinces, companies });
});

app.listen(PORT, () => {
  console.log(`✅ Server รันที่ http://localhost:${PORT}`);
});
