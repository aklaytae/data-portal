/**
 * import_csv.js — นำเข้าข้อมูลจาก CSV เข้า SQLite
 * 
 * วิธีใช้:
 *   node import_csv.js
 * 
 * วางไฟล์ CSV ไว้ในโฟลเดอร์ backend/ แล้วรันคำสั่งนี้
 * รองรับไฟล์: billZML002.csv, limitZML002.csv, dpd_Sheet1.csv
 */

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const db = new Database(path.join(__dirname, "gallery.db"));

function readCSV(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  ไม่พบไฟล์: ${filename}`);
    return null;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return parse(content, { columns: true, skip_empty_lines: true, trim: true });
}

function importBill(rows) {
  db.prepare("DELETE FROM bill").run();
  const stmt = db.prepare(`
    INSERT INTO bill (acc, no, channee, mkank, name, c1, c2, c3, c4, call, type, mkt_code, company, branch)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((rows) => {
    for (const r of rows) {
      stmt.run(
        String(r["ACC"] || "").trim(),
        Number(r["NO."]) || null,
        parseFloat(r["CHANNEE"]) || null,
        Number(r["MKANK"]) || null,
        r["NAME"] || "",
        r["C1"] || "",
        r["C2"] || "",
        r["C3"] || "",
        Number(r["C4"]) || null,
        r["CALL"] || "",
        r["TYPE"] || "",
        r["MKT CODE:"] || "",
        r["COMPANY"] || "",
        r["BRANCH"] || ""
      );
    }
  });
  insertMany(rows);
  console.log(`✅ bill: นำเข้า ${rows.length} แถว`);
}

function importLimit(rows) {
  db.prepare("DELETE FROM limit_info").run();
  const stmt = db.prepare(`
    INSERT INTO limit_info (acc, name, no, channee, kank, allbalance, calculate_mat)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((rows) => {
    for (const r of rows) {
      stmt.run(
        String(r["ACC"] || "").trim(),
        r["NAME"] || "",
        r["NO."] || "",
        r["CHANNEE"] || "",
        r["KANK"] || "",
        r["ALLBALANCE"] || "",
        parseFloat(r["calculate mat"]) || null
      );
    }
  });
  insertMany(rows);
  console.log(`✅ limit: นำเข้า ${rows.length} แถว`);
}

function importDPD(rows) {
  db.prepare("DELETE FROM dpd").run();
  const stmt = db.prepare(`
    INSERT INTO dpd (acc, name, tel1, tel2, tel3, tel4, address, road, yak, soy, tambol, ampher, province, code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((rows) => {
    for (const r of rows) {
      stmt.run(
        String(r["ACC"] || "").trim(),
        r["NAME"] || "",
        r["TEL1"] || "",
        r["TEL2"] || "",
        r["TEL3"] || "",
        r["TEL4"] || "",
        r["ADDRESS"] || "",
        r["ROAD"] || "",
        r["YAK"] || "",
        r["SOY"] || "",
        r["TAMBOL"] || "",
        r["AMPHER"] || "",
        r["PROVINCE"] || "",
        parseFloat(r["CODE"]) || null
      );
    }
  });
  insertMany(rows);
  console.log(`✅ dpd: นำเข้า ${rows.length} แถว`);
}

// ===== รันนำเข้า =====
console.log("🔄 เริ่มนำเข้าข้อมูล...\n");

const billRows  = readCSV("billZML002.csv");
const limitRows = readCSV("limitZML002.csv");
const dpdRows   = readCSV("dpd_Sheet1.csv");

if (billRows)  importBill(billRows);
if (limitRows) importLimit(limitRows);
if (dpdRows)   importDPD(dpdRows);

console.log("\n🎉 นำเข้าข้อมูลเสร็จสิ้น!");
db.close();
