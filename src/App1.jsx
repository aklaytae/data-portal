import { useState, useEffect, useCallback, useRef } from "react";

const API = "http://192.168.1.138:3002";

// ======= Utility =======
const fmt = (v) => (v == null || v === "" ? "—" : v);

// ======= Components =======
function StatCard({ label, value, icon }) {
  return (
    <div style={{
      background: "#0e0e18", border: "1px solid #1a1a2e",
      borderRadius: 2, padding: "20px 24px", flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 500, color: "#c9a96e", letterSpacing: "-1px" }}>{value?.toLocaleString()}</div>
      <div style={{ fontSize: 10, color: "#3a3a5a", letterSpacing: "3px", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "16px 0" }}>
      <PBtn disabled={page <= 1} onClick={() => onPage(page - 1)}>←</PBtn>
      {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
        const p = pages <= 7 ? i + 1 : (page <= 4 ? i + 1 : page - 3 + i);
        if (p < 1 || p > pages) return null;
        return <PBtn key={p} active={p === page} onClick={() => onPage(p)}>{p}</PBtn>;
      })}
      <PBtn disabled={page >= pages} onClick={() => onPage(page + 1)}>→</PBtn>
    </div>
  );
}

function PBtn({ children, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: active ? "#c9a96e" : "transparent",
      color: active ? "#0a0a0f" : disabled ? "#2a2a3e" : "#7a7a9a",
      border: `1px solid ${active ? "#c9a96e" : "#1a1a2e"}`,
      borderRadius: 2, padding: "4px 10px", fontSize: 11,
      cursor: disabled ? "default" : "pointer", letterSpacing: "1px",
    }}>{children}</button>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: "#0e0e18", border: "1px solid #1a1a2e",
        color: "#e8e4d9", padding: "8px 14px", borderRadius: 2,
        fontSize: 12, outline: "none", width: 260,
        fontFamily: "inherit",
      }}
    />
  );
}
function ImageCell({ acc }) {
  const [images, setImages] = useState([]);
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const loadImages = async () => {
    const res = await fetch(`${API}/api/images/${acc}`);
    const data = await res.json();
    setImages(data);
  };

  const handleUpload = async (file) => {
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    await fetch(`${API}/api/images/${acc}`, { method: "POST", body: form });
    await loadImages();
    setLoading(false);
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/api/images/${id}`, { method: "DELETE" });
    await loadImages();
  };

  const openModal = (e) => {
    e.stopPropagation();
    loadImages();
    setModal(true);
  };

  return (
    <>
      <button onClick={openModal} style={{
        background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.3)",
        color: "#c9a96e", cursor: "pointer", padding: "4px 10px",
        borderRadius: 2, fontSize: 10, letterSpacing: "1px", whiteSpace: "nowrap",
      }}>
        📷 รูป
      </button>

      {modal && (
        <div onClick={() => setModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(8px)", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#0e0e18", border: "1px solid #2a2a3e", borderRadius: 2, width: "100%", maxWidth: 600, maxHeight: "80vh", overflow: "auto" }}>

            {/* Header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a1a2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#c9a96e", fontSize: 11, letterSpacing: "2px", textTransform: "uppercase" }}>รูปภาพ — {acc}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => fileRef.current.click()} disabled={loading}
                  style={{ background: "#c9a96e", color: "#0a0a0f", border: "none", padding: "6px 14px", borderRadius: 2, fontSize: 11, cursor: "pointer", letterSpacing: "1px" }}>
                  {loading ? "⏳" : "+ อัปโหลด"}
                </button>
                <button onClick={() => setModal(false)}
                  style={{ background: "none", border: "none", color: "#5a5a7a", cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} />
            </div>

            {/* Images Grid */}
            <div style={{ padding: 20 }}>
              {images.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#2a2a4a" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🖼</div>
                  <div style={{ fontSize: 11, letterSpacing: "2px" }}>ยังไม่มีรูปภาพ</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                  {images.map(img => (
                    <div key={img.id} style={{ position: "relative", border: "1px solid #1a1a2e", borderRadius: 2, overflow: "hidden" }}>
                      <img src={`${API}/uploads/${img.filename}`} alt=""
                        style={{ width: "100%", height: 120, objectFit: "cover", display: "block", cursor: "pointer" }}
                        onClick={() => window.open(`${API}/uploads/${img.filename}`, "_blank")} />
                      <button onClick={() => handleDelete(img.id)}
                        style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", color: "#ff6060", cursor: "pointer", borderRadius: 2, padding: "2px 6px", fontSize: 11 }}>
                        ✕
                      </button>
                      <div style={{ padding: "6px 8px", fontSize: 9, color: "#3a3a5a" }}>
                        {new Date(img.date).toLocaleDateString("th-TH")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
// ======= TABS =======
function BillTab() {
  const [data, setData] = useState({ rows: [], total: 0, pages: 1 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => {
    const q = new URLSearchParams({ search, page, limit: 20 });
    fetch(`${API}/api/bill?${q}`).then(r => r.json()).then(setData).catch(console.error);
  }, [search, page]);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (acc) => {
    setSelected(acc);
    const r = await fetch(`${API}/api/bill/${acc}`);
    const d = await r.json();
    setDetail(d);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <SearchBox value={search} onChange={setSearch} placeholder="ค้นหา ACC, ชื่อ, บริษัท..." />
        <span style={{ fontSize: 11, color: "#3a3a5a" }}>ทั้งหมด {data.total?.toLocaleString()} รายการ</span>
      </div>

      <div style={{ border: "1px solid #1a1a2e", borderRadius: 2, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#0e0e18" }}>
              {["ACC","ชื่อ","ประเภท","บริษัท","สาขา","MKT CODE","รูปภาพ"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#3a3a5a", fontWeight: 400, fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: "1px solid #1a1a2e" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#2a2a4a", fontSize: 11 }}>ไม่พบข้อมูล</td></tr>
            )}
            {data.rows.map((r, i) => (
              <tr key={r.id} onClick={() => openDetail(r.acc)}
                style={{ borderBottom: "1px solid #0e0e18", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(201,169,110,0.06)"}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent"}>
                <td style={{ padding: "9px 14px", color: "#c9a96e" }}>{fmt(r.acc)}</td>
                <td style={{ padding: "9px 14px", color: "#e8e4d9", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmt(r.name)}</td>
                <td style={{ padding: "9px 14px", color: "#7a7a9a" }}>{fmt(r.type)}</td>
                <td style={{ padding: "9px 14px", color: "#7a7a9a" }}>{fmt(r.company)}</td>
                <td style={{ padding: "9px 14px", color: "#7a7a9a" }}>{fmt(r.branch)}</td>
                <td style={{ padding: "9px 14px", color: "#7a7a9a" }}>{fmt(r.mkt_code)}</td>
                <td style={{ padding: "9px 14px" }} onClick={e => e.stopPropagation()}>
                  <ImageCell acc={r.acc} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={data.pages} onPage={setPage} />

      {/* Detail Modal */}
      {detail && (
        <div onClick={() => { setDetail(null); setSelected(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(8px)", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#0e0e18", border: "1px solid #2a2a3e", borderRadius: 2, width: "100%", maxWidth: 680, maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a1a2e", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#c9a96e", fontSize: 11, letterSpacing: "3px", textTransform: "uppercase" }}>รายละเอียด — {selected}</span>
              <button onClick={() => { setDetail(null); setSelected(null); }} style={{ background: "none", border: "none", color: "#5a5a7a", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: 20, display: "grid", gap: 20 }}>
              {detail.bill && <Section title="ข้อมูล Bill" data={detail.bill} skip={["id"]} />}
              {detail.limit && <Section title="ข้อมูล Limit" data={detail.limit} skip={["id"]} />}
              {detail.dpd && <Section title="ข้อมูล DPD / ที่อยู่" data={detail.dpd} skip={["id"]} />}
              {!detail.limit && <div style={{ color: "#3a3a5a", fontSize: 11 }}>ไม่พบข้อมูล Limit</div>}
              {!detail.dpd && <div style={{ color: "#3a3a5a", fontSize: 11 }}>ไม่พบข้อมูล DPD</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, data, skip = [] }) {
  const entries = Object.entries(data).filter(([k]) => !skip.includes(k));
  return (
    <div>
      <div style={{ fontSize: 10, color: "#c9a96e", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #1a1a2e" }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px 20px" }}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 9, color: "#3a3a5a", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 2 }}>{k}</div>
            <div style={{ fontSize: 12, color: "#e8e4d9" }}>{fmt(v)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LimitTab() {
  const [data, setData] = useState({ rows: [], total: 0, pages: 1 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    const q = new URLSearchParams({ search, page, limit: 20 });
    fetch(`${API}/api/limit?${q}`).then(r => r.json()).then(setData).catch(console.error);
  }, [search, page]);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <SearchBox value={search} onChange={setSearch} placeholder="ค้นหา ACC, ชื่อ..." />
        <span style={{ fontSize: 11, color: "#3a3a5a" }}>ทั้งหมด {data.total?.toLocaleString()} รายการ</span>
      </div>
      <div style={{ border: "1px solid #1a1a2e", borderRadius: 2, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#0e0e18" }}>
              {["ACC","ชื่อ","Channee","Kank","ยอดคงเหลือ","Calculate Mat"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#3a3a5a", fontWeight: 400, fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: "1px solid #1a1a2e" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#2a2a4a", fontSize: 11 }}>ไม่พบข้อมูล</td></tr>
            )}
            {data.rows.map((r, i) => (
              <tr key={r.id}
                style={{ borderBottom: "1px solid #0e0e18", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                <td style={{ padding: "9px 14px", color: "#c9a96e" }}>{fmt(r.acc)}</td>
                <td style={{ padding: "9px 14px", color: "#e8e4d9" }}>{fmt(r.name)}</td>
                <td style={{ padding: "9px 14px", color: "#7a7a9a" }}>{fmt(r.channee)}</td>
                <td style={{ padding: "9px 14px", color: "#7a7a9a" }}>{fmt(r.kank)}</td>
                <td style={{ padding: "9px 14px", color: "#7a7a9a" }}>{fmt(r.allbalance)}</td>
                <td style={{ padding: "9px 14px", color: "#7a7a9a" }}>{r.calculate_mat != null ? Number(r.calculate_mat).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={data.pages} onPage={setPage} />
    </div>
  );
}

function DPDTab() {
  const [data, setData] = useState({ rows: [], total: 0, pages: 1 });
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("");
  const [provinces, setProvinces] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`${API}/api/dpd/provinces`).then(r => r.json()).then(setProvinces).catch(console.error);
  }, []);

  const load = useCallback(() => {
    const q = new URLSearchParams({ search, province, page, limit: 20 });
    fetch(`${API}/api/dpd?${q}`).then(r => r.json()).then(setData).catch(console.error);
  }, [search, province, page]);

  useEffect(() => { setPage(1); }, [search, province]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <SearchBox value={search} onChange={setSearch} placeholder="ค้นหา ACC, ชื่อ..." />
        <select value={province} onChange={e => setProvince(e.target.value)}
          style={{ background: "#0e0e18", border: "1px solid #1a1a2e", color: province ? "#e8e4d9" : "#3a3a5a", padding: "8px 12px", borderRadius: 2, fontSize: 12, fontFamily: "inherit", outline: "none" }}>
          <option value="">จังหวัดทั้งหมด</option>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span style={{ fontSize: 11, color: "#3a3a5a" }}>ทั้งหมด {data.total?.toLocaleString()} รายการ</span>
      </div>
      <div style={{ border: "1px solid #1a1a2e", borderRadius: 2, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#0e0e18" }}>
              {["ACC","ชื่อ","เบอร์โทร","ที่อยู่","ตำบล","อำเภอ","จังหวัด"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#3a3a5a", fontWeight: 400, fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: "1px solid #1a1a2e" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#2a2a4a", fontSize: 11 }}>ไม่พบข้อมูล</td></tr>
            )}
            {data.rows.map((r, i) => (
              <tr key={r.id}
                style={{ borderBottom: "1px solid #0e0e18", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                <td style={{ padding: "9px 14px", color: "#c9a96e" }}>{fmt(r.acc)}</td>
                <td style={{ padding: "9px 14px", color: "#e8e4d9" }}>{fmt(r.name)}</td>
                <td style={{ padding: "9px 14px", color: "#7a7a9a" }}>
                  {[r.tel1, r.tel2, r.tel3, r.tel4].filter(Boolean).join(", ") || "—"}
                </td>
                <td style={{ padding: "9px 14px", color: "#7a7a9a", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {[r.address, r.road, r.soy].filter(Boolean).join(" ") || "—"}
                </td>
                <td style={{ padding: "9px 14px", color: "#7a7a9a" }}>{fmt(r.tambol)}</td>
                <td style={{ padding: "9px 14px", color: "#7a7a9a" }}>{fmt(r.ampher)}</td>
                <td style={{ padding: "9px 14px", color: "#7a7a9a" }}>{fmt(r.province)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={data.pages} onPage={setPage} />
    </div>
  );
}

// ======= MAIN APP =======
export default function App() {
  const [tab, setTab] = useState("bill");
  const [stats, setStats] = useState(null);
  const [connected, setConnected] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/stats`)
      .then(r => r.json())
      .then(d => { setStats(d); setConnected(true); })
      .catch(() => setConnected(false));
  }, []);

  const tabs = [
    { key: "bill",  label: "Bill",  count: stats?.billCount },
    { key: "limit", label: "Limit", count: stats?.limitCount },
    { key: "dpd",   label: "DPD",   count: stats?.dpdCount },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'DM Mono','Fira Mono',monospace", color: "#e8e4d9", padding: "40px 24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Playfair+Display:wght@900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #2a2a3e; }
        input::placeholder { color: #2a2a4a; }
        select option { background: #0e0e18; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 900, color: "#c9a96e", letterSpacing: "-1px" }}>
              DATA PORTAL
            </span>
            <span style={{ fontSize: 10, color: "#5a5a7a", letterSpacing: "4px", textTransform: "uppercase" }}>
              bill · limit · dpd
            </span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: connected ? "#4aaa6e" : "#aa4a4a", letterSpacing: "2px" }}>
              {connected === null ? "..." : connected ? "● connected" : "● offline — รัน backend ก่อน"}
            </span>
          </div>
          <div style={{ height: 1, background: "linear-gradient(90deg,#c9a96e44,transparent)" }} />
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: "flex", gap: 12, marginBottom: 36, flexWrap: "wrap" }}>
            <StatCard icon="📋" label="Bill Records"  value={stats.billCount} />
            <StatCard icon="💰" label="Limit Records" value={stats.limitCount} />
            <StatCard icon="📅" label="DPD Records"   value={stats.dpdCount} />
            <StatCard icon="🏙️" label="จังหวัด"       value={stats.provinces} />
            <StatCard icon="🏢" label="บริษัท"         value={stats.companies} />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: "1px solid #1a1a2e" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                background: tab === t.key ? "#c9a96e" : "transparent",
                color: tab === t.key ? "#0a0a0f" : "#5a5a7a",
                border: "none", padding: "10px 24px", cursor: "pointer",
                fontSize: 11, letterSpacing: "2px", textTransform: "uppercase",
                fontFamily: "inherit", borderBottom: tab === t.key ? "none" : "none",
                transition: "all 0.15s",
              }}>
              {t.label}
              {t.count != null && (
                <span style={{ marginLeft: 8, fontSize: 10, opacity: 0.7 }}>({t.count?.toLocaleString()})</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "bill"  && <BillTab />}
        {tab === "limit" && <LimitTab />}
        {tab === "dpd"   && <DPDTab />}

      </div>
    </div>
  );
}
