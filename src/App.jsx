import { useState, useEffect, useCallback, useRef } from "react";

const API = "";
const fmt = (v) => (v == null || v === "" ? "—" : v);

const C = {
  bg: "#f5f4f0", surface: "#ffffff", border: "#e2e0d8", borderDark: "#d0cec4",
  text: "#1a1a1a", textMuted: "#6b6b6b", textLight: "#9a9a9a",
  accent: "#b8860b", accentLight: "rgba(184,134,11,0.1)", accentBorder: "rgba(184,134,11,0.3)",
  hover: "rgba(184,134,11,0.06)", danger: "#dc2626", success: "#16a34a",
};

function StatCard({ label, value, icon }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "20px 24px", flex: 1, minWidth: 140, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: C.accent, letterSpacing: "-1px" }}>{value?.toLocaleString()}</div>
      <div style={{ fontSize: 10, color: C.textLight, letterSpacing: "3px", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
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
      background: active ? C.accent : "transparent",
      color: active ? "#fff" : disabled ? C.border : C.textMuted,
      border: `1px solid ${active ? C.accent : C.border}`,
      borderRadius: 4, padding: "4px 10px", fontSize: 11,
      cursor: disabled ? "default" : "pointer", letterSpacing: "1px",
    }}>{children}</button>
  );
}

function ImageEditor({ file, onDone, onCancel }) {
  const canvasRef = useRef();
  const [img, setImg] = useState(null);
  const [tool, setTool] = useState("text"); // text | circle | pen
  const [color, setColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(3);
  // text
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(32);
  const [textPos, setTextPos] = useState({ x: 20, y: 50 });
  const [draggingText, setDraggingText] = useState(false);
  // shapes
  const [shapes, setShapes] = useState([]); // {type, x, y, r, color, lw} or {type:'pen', points, color, lw}
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [penPoints, setPenPoints] = useState([]);
  const [previewShape, setPreviewShape] = useState(null);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = URL.createObjectURL(file);
  }, [file]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const redraw = (extraShape = null) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const all = extraShape ? [...shapes, extraShape] : shapes;
    all.forEach(s => drawShape(ctx, s));
    // draw text
    if (text) {
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 3;
      ctx.strokeText(text, textPos.x, textPos.y);
      ctx.fillStyle = color;
      ctx.fillText(text, textPos.x, textPos.y);
    }
  };

  const drawShape = (ctx, s) => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.lw;
    ctx.fillStyle = "transparent";
    if (s.type === "circle") {
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.type === "pen") {
      if (s.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      s.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
  };

  useEffect(() => { redraw(); }, [img, shapes, text, fontSize, textPos, color]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const MAX = 600;
    let w = img.width, h = img.height;
    if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  useEffect(() => { if (img) { initCanvas(); redraw(); } }, [img]);

  const onMouseDown = (e) => {
    const pos = getPos(e);
    if (tool === "text") {
      if (Math.abs(pos.x - textPos.x) < 150 && Math.abs(pos.y - textPos.y) < 40) setDraggingText(true);
    } else if (tool === "circle") {
      setDrawing(true);
      setStartPos(pos);
    } else if (tool === "pen") {
      setDrawing(true);
      setPenPoints([pos]);
    }
  };

  const onMouseMove = (e) => {
    const pos = getPos(e);
    if (tool === "text" && draggingText) {
      setTextPos(pos);
    } else if (tool === "circle" && drawing && startPos) {
      const r = Math.hypot(pos.x - startPos.x, pos.y - startPos.y);
      redraw({ type: "circle", cx: startPos.x, cy: startPos.y, r, color, lw: lineWidth });
    } else if (tool === "pen" && drawing) {
      const pts = [...penPoints, pos];
      setPenPoints(pts);
      redraw({ type: "pen", points: pts, color, lw: lineWidth });
    }
  };

  const onMouseUp = (e) => {
    const pos = getPos(e);
    if (tool === "text") {
      setDraggingText(false);
    } else if (tool === "circle" && drawing && startPos) {
      const r = Math.hypot(pos.x - startPos.x, pos.y - startPos.y);
      if (r > 2) setShapes(prev => [...prev, { type: "circle", cx: startPos.x, cy: startPos.y, r, color, lw: lineWidth }]);
      setDrawing(false); setStartPos(null);
    } else if (tool === "pen" && drawing) {
      if (penPoints.length > 1) setShapes(prev => [...prev, { type: "pen", points: penPoints, color, lw: lineWidth }]);
      setDrawing(false); setPenPoints([]);
    }
  };

  const undo = () => setShapes(prev => prev.slice(0, -1));
  const clear = () => { setShapes([]); setText(""); };

  const handleDone = () => {
    canvasRef.current.toBlob(blob => {
      onDone(new File([blob], "image.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  const toolBtn = (t, label) => (
    <button onClick={() => setTool(t)} style={{
      padding: "6px 14px", fontSize: 12, borderRadius: 4, cursor: "pointer",
      background: tool === t ? C.accent : "transparent",
      color: tool === t ? "#fff" : C.textMuted,
      border: `1px solid ${tool === t ? C.accent : C.border}`,
    }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, maxWidth: 700, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "95vh", overflow: "auto" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 12 }}>แต่งรูปก่อนอัปโหลด</div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10, padding: "8px 10px", background: "#f9f8f5", borderRadius: 6, border: `1px solid ${C.border}` }}>
          {toolBtn("text", "✏️ ข้อความ")}
          {toolBtn("circle", "⭕ วงกลม")}
          {toolBtn("pen", "🖊️ วาด")}
          <div style={{ width: 1, height: 24, background: C.border, margin: "0 4px" }} />
          <input type="color" value={color} onChange={e => setColor(e.target.value)} title="สี"
            style={{ width: 32, height: 32, border: `1px solid ${C.border}`, borderRadius: 4, cursor: "pointer", padding: 2 }} />
          <input type="number" value={lineWidth} onChange={e => setLineWidth(+e.target.value)} min={1} max={20} title="ความหนา"
            style={{ width: 52, padding: "4px 6px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12, outline: "none" }} />
          <div style={{ width: 1, height: 24, background: C.border, margin: "0 4px" }} />
          <button onClick={undo} title="undo" style={{ padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 4, cursor: "pointer", background: "transparent", fontSize: 12, color: C.textMuted }}>↩ undo</button>
          <button onClick={clear} style={{ padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 4, cursor: "pointer", background: "transparent", fontSize: 12, color: C.danger }}>ล้าง</button>
        </div>

        {/* Text options */}
        {tool === "text" && (
          <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input value={text} onChange={e => setText(e.target.value)} placeholder="พิมพ์ข้อความ..."
              style={{ flex: 1, padding: "7px 12px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13, outline: "none" }} />
            <input type="number" value={fontSize} onChange={e => setFontSize(+e.target.value)} min={10} max={120} title="ขนาด"
              style={{ width: 60, padding: "7px 8px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12, outline: "none" }} />
          </div>
        )}

        <div style={{ fontSize: 11, color: C.textLight, marginBottom: 6 }}>
          {tool === "text" && "ลากข้อความเพื่อเปลี่ยนตำแหน่ง"}
          {tool === "circle" && "คลิกแล้วลากเพื่อวาดวงกลม"}
          {tool === "pen" && "คลิกแล้วลากเพื่อวาดเส้น"}
        </div>

         <canvas ref={canvasRef}
          style={{ width: "100%", borderRadius: 4, border: `1px solid ${C.border}`, display: "block", cursor: tool === "text" ? (draggingText ? "grabbing" : "grab") : "crosshair", touchAction: "none" }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onTouchStart={e => { e.preventDefault(); onMouseDown(e.touches[0]); }}
          onTouchMove={e => { e.preventDefault(); onMouseMove(e.touches[0]); }}
          onTouchEnd={e => { e.preventDefault(); onMouseUp(e.changedTouches[0]); }}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "8px 20px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12, cursor: "pointer", background: "transparent", color: C.textMuted }}>ยกเลิก</button>
          <button onClick={handleDone} style={{ padding: "8px 20px", background: C.accent, color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>อัปโหลด</button>
        </div>
      </div>
    </div>
  );
}

function ImageCell({ acc }) {
  const [images, setImages] = useState([]);
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editFile, setEditFile] = useState(null);
  const fileRef = useRef();

  const loadImages = async () => {
    const res = await fetch(`${API}/api/images/${acc}`);
    const data = await res.json();
    setImages(data);
  };

  const handleUpload = async (file) => {
    setLoading(true);
    const form = new FormData();
    form.append("file", file, "image.jpg");
    await fetch(`${API}/api/images/${acc}`, { method: "POST", body: form });
    await loadImages();
    setLoading(false);
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/api/images/${id}`, { method: "DELETE" });
    await loadImages();
  };

  const openModal = (e) => { e.stopPropagation(); loadImages(); setModal(true); };

  return (
    <>
      <button onClick={openModal} style={{
        background: C.accentLight, border: `1px solid ${C.accentBorder}`,
        color: C.accent, cursor: "pointer", padding: "4px 10px",
        borderRadius: 4, fontSize: 10, letterSpacing: "1px", whiteSpace: "nowrap",
      }}>📷 รูป</button>

      {editFile && (
        <ImageEditor
          file={editFile}
          onDone={async (f) => { setEditFile(null); await handleUpload(f); }}
          onCancel={() => setEditFile(null)}
        />
      )}

      {modal && (
        <div onClick={() => setModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(4px)", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, width: "100%", maxWidth: 600, maxHeight: "80vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: C.accent, fontSize: 11, letterSpacing: "2px", textTransform: "uppercase" }}>รูปภาพ — {acc}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => fileRef.current.click()} disabled={loading}
                  style={{ background: C.accent, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
                  {loading ? "⏳" : "+ อัปโหลด"}
                </button>
                <button onClick={() => setModal(false)} style={{ background: "none", border: "none", color: C.textLight, cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { if (e.target.files[0]) { setEditFile(e.target.files[0]); e.target.value = ""; } }} />
            </div>
            <div style={{ padding: 20 }}>
              {images.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: C.textLight }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🖼</div>
                  <div style={{ fontSize: 11, letterSpacing: "2px" }}>ยังไม่มีรูปภาพ</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                  {images.map(img => (
                    <div key={img.id} style={{ position: "relative", border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
                      <img src={img.filename.startsWith("http") ? img.filename : `${API}/uploads/${img.filename}`} alt=""
                        style={{ width: "100%", height: 120, objectFit: "cover", display: "block", cursor: "pointer" }}
                        onClick={() => window.open(img.filename, "_blank")} />
                      <button onClick={() => handleDelete(img.id)}
                        style={{ position: "absolute", top: 4, right: 4, background: "rgba(255,255,255,0.9)", border: "none", color: C.danger, cursor: "pointer", borderRadius: 4, padding: "2px 6px", fontSize: 11 }}>✕</button>
                      <div style={{ padding: "6px 8px", fontSize: 9, color: C.textLight }}>
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

function BillTab({ search }) {
  const [data, setData] = useState({ rows: [], total: 0, pages: 1 });
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
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: C.textLight }}>ทั้งหมด {data.total?.toLocaleString()} รายการ</span>
      </div>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f9f8f5" }}>
              {["ACC","ชื่อ","ค้างทั้งหมด"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textLight, fontWeight: 500, fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr><td colSpan={3} style={{ padding: 40, textAlign: "center", color: C.textLight, fontSize: 11 }}>ไม่พบข้อมูล</td></tr>
            )}
            {data.rows.map((r, i) => (
              <tr key={r.id} onClick={() => openDetail(r.acc)}
                style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : "#faf9f7", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#faf9f7"}>
                <td style={{ padding: "14px", color: C.accent, fontWeight: 500 }}>{fmt(r.acc)}</td>
                <td style={{ padding: "14px", color: C.text, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmt(r.name)}</td>
                <td style={{ padding: "14px", color: C.textMuted }}>{Number(r.call).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={data.pages} onPage={setPage} />
      {detail && (
        <div onClick={() => { setDetail(null); setSelected(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, width: "100%", maxWidth: 680, maxHeight: "80vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.accent, fontSize: 11, letterSpacing: "3px", textTransform: "uppercase" }}>รายละเอียด — {selected}</span>
              <button onClick={() => { setDetail(null); setSelected(null); }} style={{ background: "none", border: "none", color: C.textLight, cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: 20, display: "grid", gap: 20 }}>
              {detail.bill && <Section title="ข้อมูล Bill" data={detail.bill} skip={["id"]} />}
              {detail.limit && <Section title="ข้อมูล Limit" data={detail.limit} skip={["id"]} />}
              {detail.dpd && <Section title="ข้อมูล DPD / ที่อยู่" data={detail.dpd} skip={["id"]} />}
              {!detail.limit && <div style={{ color: C.textLight, fontSize: 11 }}>ไม่พบข้อมูล Limit</div>}
              {!detail.dpd && <div style={{ color: C.textLight, fontSize: 11 }}>ไม่พบข้อมูล DPD</div>}
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
      <div style={{ fontSize: 10, color: C.accent, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px 20px" }}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 9, color: C.textLight, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 2 }}>{k}</div>
            <div style={{ fontSize: 12, color: C.text }}>{fmt(v)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LimitTab({ search }) {
  const [data, setData] = useState({ rows: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    const q = new URLSearchParams({ search, page, limit: 20 });
    fetch(`${API}/api/limit?${q}`).then(r => r.json()).then(setData).catch(console.error);
  }, [search, page]);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: C.textLight }}>ทั้งหมด {data.total?.toLocaleString()} รายการ</span>
      </div>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f9f8f5" }}>
              {["ACC","ชื่อ","ยอดคงเหลือ","Pic"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textLight, fontWeight: 500, fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: C.textLight, fontSize: 11 }}>ไม่พบข้อมูล</td></tr>
            )}
            {data.rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : "#faf9f7" }}>
                <td style={{ padding: "14px", color: C.accent, fontWeight: 500 }}>{fmt(r.acc)}</td>
                <td style={{ padding: "14px", color: C.text }}>{fmt(r.name)}</td>
                <td style={{ padding: "14px", color: C.textMuted }}>{Number(r.allbalance).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style={{ padding: "14px" }} onClick={e => e.stopPropagation()}>
                  <ImageCell acc={r.acc} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={data.pages} onPage={setPage} />
    </div>
  );
}

function DPDTab({ search }) {
  const [data, setData] = useState({ rows: [], total: 0, pages: 1 });
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={province} onChange={e => setProvince(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: province ? C.text : C.textLight, padding: "8px 12px", borderRadius: 4, fontSize: 12, fontFamily: "inherit", outline: "none" }}>
          <option value="">จังหวัดทั้งหมด</option>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span style={{ fontSize: 11, color: C.textLight }}>ทั้งหมด {data.total?.toLocaleString()} รายการ</span>
      </div>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f9f8f5" }}>
              {["ชื่อ","เบอร์โทร","ที่อยู่","ตำบล"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textLight, fontWeight: 500, fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: C.textLight, fontSize: 11 }}>ไม่พบข้อมูล</td></tr>
            )}
            {data.rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : "#faf9f7" }}>
                <td style={{ padding: "14px", color: C.text }}>{fmt(r.name)}</td>
                <td style={{ padding: "14px", color: C.textMuted }}>
                  {[r.tel1, r.tel2, r.tel3, r.tel4].filter(Boolean).map((tel, idx, arr) => (
                    <span key={idx}>
                      <a href={`tel:${tel.replace(/\s+/g,'')}`} style={{ color: "inherit", textDecoration: "none" }}
                        onMouseOver={e => e.target.style.textDecoration="underline"}
                        onMouseOut={e => e.target.style.textDecoration="none"}>{tel}</a>
                      {idx < arr.length - 1 ? ", " : ""}
                    </span>
                  )) || "—"}
                </td>
                <td style={{ padding: "14px", color: C.textMuted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {[r.address, r.road, r.soy].filter(Boolean).join(" ") || "—"}
                </td>
                <td style={{ padding: "14px", color: C.textMuted }}>{fmt(r.tambol)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={data.pages} onPage={setPage} />
    </div>
  );
}
function ImportTab() {
  const [files, setFiles] = useState({ bill: null, limit: null, dpd: null });
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(false);

  const handleFile = (key, file) => setFiles(prev => ({ ...prev, [key]: file }));

  const importTable = async (key, file) => {
    setStatus(prev => ({ ...prev, [key]: { state: "loading", msg: "กำลังอ่านไฟล์..." } }));
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API}/api/import-excel`, { method: "POST", body: form });
    const { rows, error } = await res.json();
    if (error) { setStatus(prev => ({ ...prev, [key]: { state: "error", msg: error } })); return null; }
    setStatus(prev => ({ ...prev, [key]: { state: "loading", msg: `อ่านได้ ${rows.length} rows กำลัง import...` } }));

    const mapped = rows.map(r => {
      const row = {};
      Object.keys(r).forEach(k => { row[k.trim().toLowerCase().replace(/\s+/g,"_")] = r[k]; });
      return row;
    });

    const importRes = await fetch(`${API}/api/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: key === "dpd" ? "dpd" : key === "limit" ? "limit_info" : "bill", rows: mapped.map(r => {
        if (key === "bill") return { acc: String(Math.round(parseFloat(r.acc||0))), no: r.no, channee: r.channee, mkank: r.mkank, name: r.name, c1: r.c1, c2: r.c2, c3: r.c3, c4: r.c4, call: r.call, type: r.type, mkt_code: r["mkt_code:"]||r.mkt_code||r["mktcode"]||r["mkt code"]||"", company: r.company, branch: r.branch };
        if (key === "limit") return { acc: String(Math.round(parseFloat(r.acc||0))), name: r.name, no: r.no, channee: r.channee, kank: r.kank, allbalance: r.allbalance, calculate_mat: r.calculate_mat };
        if (key === "dpd") return { acc: String(Math.round(parseFloat(r.acc||0))), name: r.name, tel1: r.tel1, tel2: r.tel2, tel3: r.tel3, tel4: r.tel4, address: r.address, road: r.road, yak: r.yak, soy: r.soy, tambol: r.tambol, ampher: r.ampher, province: r.province, code: r.code };
      })})
    });
    const result = await importRes.json();
    if (result.success) {
      setStatus(prev => ({ ...prev, [key]: { state: "success", msg: `✅ import สำเร็จ ${result.count} rows` } }));
    } else {
      setStatus(prev => ({ ...prev, [key]: { state: "error", msg: result.error } }));
    }
  };

  const handleImportAll = async () => {
    setLoading(true);
    for (const key of ["bill", "limit", "dpd"]) {
      if (files[key]) await importTable(key, files[key]);
    }
    setLoading(false);
  };

  const tables = [
    { key: "bill", label: "Bill", desc: "bill.xlsx" },
    { key: "limit", label: "Limit", desc: "limit.xlsx" },
    { key: "dpd", label: "DPD", desc: "dpd_.xlsx" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, fontSize: 11, color: C.textLight }}>อัปโหลดไฟล์ Excel เพื่ออัปเดทข้อมูล — ข้อมูลเก่าจะถูกแทนที่ทั้งหมด</div>
      <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
        {tables.map(({ key, label, desc }) => (
          <div key={key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ minWidth: 80 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.accent }}>{label}</div>
              <div style={{ fontSize: 10, color: C.textLight }}>{desc}</div>
            </div>
            <label style={{ flex: 1, cursor: "pointer" }}>
              <div style={{ border: `1px dashed ${files[key] ? C.accent : C.border}`, borderRadius: 4, padding: "10px 16px", textAlign: "center", fontSize: 12, color: files[key] ? C.accent : C.textLight, background: files[key] ? C.accentLight : "transparent", transition: "all 0.15s" }}>
                {files[key] ? `📄 ${files[key].name}` : "คลิกเพื่อเลือกไฟล์ .xlsx"}
              </div>
              <input type="file" accept=".xlsx,.xls" style={{ display: "none" }}
                onChange={e => e.target.files[0] && handleFile(key, e.target.files[0])} />
            </label>
            {status[key] && (
              <div style={{ fontSize: 11, color: status[key].state === "success" ? C.success : status[key].state === "error" ? C.danger : C.textMuted, minWidth: 180 }}>
                {status[key].msg}
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={handleImportAll} disabled={loading || !Object.values(files).some(Boolean)}
        style={{ padding: "10px 28px", background: C.accent, color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer", opacity: loading || !Object.values(files).some(Boolean) ? 0.5 : 1, letterSpacing: "1px" }}>
        {loading ? "⏳ กำลัง Import..." : "Import ข้อมูล"}
      </button>
    </div>
  );
}
export default function App() {
  const [tab, setTab] = useState("limit");
  const [stats, setStats] = useState(null);
  const [connected, setConnected] = useState(null);
  const [lastImport, setLastImport] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${API}/api/stats`)
      .then(r => r.json())
      .then(d => { setStats(d); setConnected(true); })
      .catch(() => setConnected(false));
    fetch(`${API}/api/last-import`)
      .then(r => r.json())
      .then(d => setLastImport(d.last))
      .catch(() => {});
  }, []);

  const tabs = [
    { key: "limit", label: "Limit", count: stats?.limitCount },
    { key: "bill",  label: "Bill",  count: stats?.billCount },
    { key: "dpd",   label: "DPD",   count: stats?.dpdCount },
    { key: "import", label: "Import", count: null },
  ];
  {tab === "import" && <ImportTab />}
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Mono','Fira Mono',monospace", color: C.text, padding: "40px 24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Playfair+Display:wght@900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #f0efe9; }
        ::-webkit-scrollbar-thumb { background: #d0cec4; }
        input::placeholder { color: #b0aea6; }
        select option { background: #fff; }
      `}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 900, color: C.accent, letterSpacing: "-1px" }}>DATA PORTAL</span>
            <span style={{ fontSize: 10, color: C.textLight, letterSpacing: "4px", textTransform: "uppercase" }}>
              bill · limit · dpd{lastImport ? ` · imported ${new Date(lastImport).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: connected ? C.success : C.danger, letterSpacing: "2px" }}>
              {connected === null ? "..." : connected ? "● connected" : "● offline — รัน backend ก่อน"}
            </span>
          </div>
          <div style={{ height: 1, background: `linear-gradient(90deg,${C.accent}66,transparent)` }} />
        </div>
        {stats && (
          <div style={{ display: "flex", gap: 12, marginBottom: 36, flexWrap: "wrap" }}>
            <StatCard icon="📋" label="Bill Records"  value={stats.billCount} />
            <StatCard icon="💰" label="Limit Records" value={stats.limitCount} />
            <StatCard icon="📅" label="DPD Records"   value={stats.dpdCount} />
            <StatCard icon="🏙️" label="จังหวัด"       value={stats.provinces} />
            <StatCard icon="🏢" label="บริษัท"         value={stats.companies} />
          </div>
        )}
        <div style={{ marginBottom: 20 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา ACC, ชื่อ, บริษัท, จังหวัด..."
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "10px 16px", borderRadius: 8, fontSize: 14, outline: "none", width: 340, fontFamily: "inherit", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }} />
        </div>
        <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ background: tab === t.key ? C.accent : "transparent", color: tab === t.key ? "#fff" : C.textMuted, border: "none", padding: "10px 24px", cursor: "pointer", fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", fontFamily: "inherit", transition: "all 0.15s", borderRadius: "4px 4px 0 0" }}>
              {t.label}
              {t.count != null && <span style={{ marginLeft: 8, fontSize: 10, opacity: 0.7 }}>({t.count?.toLocaleString()})</span>}
            </button>
          ))}
        </div>
        {tab === "bill"  && <BillTab  search={search} />}
        {tab === "limit" && <LimitTab search={search} />}
        {tab === "dpd"   && <DPDTab   search={search} />}
      </div>
    </div>
  );
}
