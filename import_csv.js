const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

function readExcel(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  ไม่พบไฟล์: ${filename}`);
    return [];
  }
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

async function importTable(table, rows) {
  const res = await fetch("http://localhost:3002/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, rows }),
  });
  const data = await res.json();
  console.log(`✅ ${table}: นำเข้า ${data.count} แถว`);
}

async function main() {
  console.log("🔄 เริ่มนำเข้าข้อมูล...\n");

  // Bill
  const billRows = readExcel("bill.xlsx").map(r => ({
    acc:      r["ACC"] ? String(Math.round(parseFloat(r["ACC"]))) : "",
    no:       +r["NO."] || null,
    channee:  +r["CHANNEE"] || null,
    mkank:    +r["MKANK"] || null,
    name:     r["NAME"] || "",
    c1:       r["C1"] || "",
    c2:       r["C2"] || "",
    c3:       r["C3"] || "",
    c4:       +r["C4"] || null,
    call:     r["CALL"] || "",
    type:     r["TYPE"] || "",
    mkt_code: r["MKT CODE:"] || "",
    company:  r["COMPANY"] || "",
    branch:   r["BRANCH"] || "",
  }));
  await importTable("bill", billRows);

  // Limit
  const limitRows = readExcel("limit.xlsx").map(r => ({
    acc:          r["ACC"] ? String(Math.round(parseFloat(r["ACC"]))) : "",
    name:         r["NAME"] || "",
    no:           r["NO."] || "",
    channee:      r["CHANNEE"] || "",
    kank:         r["KANK"] || "",
    allbalance:   r["ALLBALANCE"] || "",
    calculate_mat: +r["calculate mat"] || null,
  }));
  await importTable("limit_info", limitRows);

  // DPD
  const dpdRows = readExcel("dpd_.xlsx").map(r => ({
    acc:      r["ACC"] ? String(Math.round(parseFloat(r["ACC"]))) : "",
    name:     r["NAME"] || "",
    tel1:     r["TEL1"] || "",
    tel2:     r["TEL2"] || "",
    tel3:     r["TEL3"] || "",
    tel4:     r["TEL4"] || "",
    address:  r["ADDRESS"] || "",
    road:     r["ROAD"] || "",
    yak:      r["YAK"] || "",
    soy:      r["SOY"] || "",
    tambol:   r["TAMBOL"] || "",
    ampher:   r["AMPHER"] || "",
    province: r["PROVINCE"] || "",
    code:     +r["CODE"] || null,
  }));
  await importTable("dpd", dpdRows);

  console.log("\n🎉 นำเข้าข้อมูลเสร็จสิ้น!");
}

main().catch(console.error);