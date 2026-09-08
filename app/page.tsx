"use client";

import { CheckCircle2, FileSpreadsheet, Image as ImageIcon, Search, UploadCloud, XCircle } from "lucide-react";
import { ChangeEvent, DragEvent, FormEvent, useMemo, useState } from "react";

type RecordItem = { plate: string; imageName: string; confidence: string; status: string };

function normalizePlate(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(cell.trim()); cell = ""; }
    else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

function parseCsv(text: string): RecordItem[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const findHeader = (name: string) => headers.findIndex((header) => header.toLowerCase() === name.toLowerCase());
  const plateIndex = findHeader("Biển số");
  const imageIndex = findHeader("Tên ảnh");
  const confidenceIndex = findHeader("Độ tin cậy");
  const statusIndex = findHeader("Trạng thái");
  if (plateIndex < 0) return [];
  return lines.slice(1).map(parseCsvLine).map((cells) => ({
    plate: cells[plateIndex] ?? "",
    imageName: imageIndex >= 0 ? cells[imageIndex] ?? "" : "",
    confidence: confidenceIndex >= 0 ? cells[confidenceIndex] ?? "" : "",
    status: statusIndex >= 0 ? cells[statusIndex] ?? "" : "",
  })).filter((item) => normalizePlate(item.plate));
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");

  const results = useMemo(() => {
    const normalized = normalizePlate(query);
    if (!searched || !normalized) return [];
    return records.filter((item) => normalizePlate(item.plate) === normalized);
  }, [query, searched, records]);

  async function loadCsv(file: File) {
    setFileError("");
    if (!file.name.toLowerCase().endsWith(".csv")) { setFileError("Vui lòng chọn file CSV."); return; }
    try {
      const parsed = parseCsv(await file.text());
      if (!parsed.length) { setFileError("Không đọc được dữ liệu biển số. Hãy kiểm tra cột 'Biển số' trong CSV."); return; }
      setRecords(parsed); setFileName(file.name); setSearched(false); setQuery("");
    } catch { setFileError("Không thể đọc file CSV này."); }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void loadCsv(file);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void loadCsv(file);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setSearched(Boolean(normalizePlate(query)));
  }

  const hasSearch = searched && Boolean(normalizePlate(query));

  return (
    <main className="shell">
      <header className="header">
        <p className="eyebrow">Web 2 · Plate Search</p>
        <h1>Tra cứu biển số xe</h1>
        <p className="subtitle">Nạp file CSV từ Web 1 rồi nhập biển số để kiểm tra nhanh trên điện thoại.</p>
      </header>

      <section className="card">
        <div className="sectionHeading">
          <div><p className="sectionEyebrow">01 · Dữ liệu</p><h2>Nạp file CSV</h2></div>
          <span className="recordCount">{records.length} bản ghi</span>
        </div>
        <label className="uploadBox" htmlFor="csv-upload" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <input id="csv-upload" type="file" accept=".csv,text/csv" onChange={handleFileChange} hidden />
          <div className="uploadIcon"><UploadCloud size={24} /></div>
          <strong>{fileName || "Chọn hoặc kéo thả file CSV vào đây"}</strong>
          <span>CSV của Web 1 · cột bắt buộc: Biển số</span>
        </label>
        {fileError && <p className="fileError">{fileError}</p>}
        {fileName && !fileError && <div className="loadedFile"><FileSpreadsheet size={18} /><span>{fileName}</span><b>{records.length} biển số</b></div>}
      </section>

      <section className="card">
        <div className="sectionHeading"><div><p className="sectionEyebrow">02 · Tìm kiếm</p><h2>Nhập biển số</h2></div></div>
        <form onSubmit={submit}>
          <label className="label" htmlFor="plate">Biển số xe</label>
          <div className="searchRow">
            <input id="plate" className="input" value={query} onChange={(event) => { setQuery(event.target.value); setSearched(false); }} placeholder="43a12345" autoCapitalize="characters" autoComplete="off" inputMode="text" />
            <button className="searchBtn" type="submit" aria-label="Tìm kiếm"><Search size={22} /></button>
          </div>
          <p className="hint">Có thể nhập 43A12345, 43A-123.45 hoặc 43a 12345.</p>
        </form>
      </section>

      {hasSearch && results.length > 0 && (
        <section className="result success">
          <div className="resultTop"><div className="icon"><CheckCircle2 size={24} /></div><div><h2>Có biển số trong dữ liệu</h2><p>Tìm thấy {results.length} bản ghi phù hợp.</p></div></div>
          {results.map((result, index) => (
            <div className="matchCard" key={`${result.plate}-${result.imageName}-${index}`}>
              <div className="plate">{result.plate}</div>
              <div className="details">
                <div><span>Độ tin cậy</span><strong>{result.confidence || "—"}</strong></div>
                <div><span>Trạng thái</span><strong>{result.status || "—"}</strong></div>
                <div><span>Tên ảnh</span><strong>{result.imageName || "—"}</strong></div>
              </div>
              <div className="imageSlot"><div><ImageIcon size={28} /><div>Hình ảnh biển số sẽ hiển thị ở đây</div><small>{result.imageName || "Chưa có ảnh"}</small></div></div>
            </div>
          ))}
        </section>
      )}

      {hasSearch && results.length === 0 && (
        <section className="result empty">
          <div className="resultTop"><div className="icon"><XCircle size={24} /></div><div><h2>Không có biển số</h2><p>Không tìm thấy biển số <strong>{query.toUpperCase()}</strong> trong dữ liệu.</p></div></div>
        </section>
      )}

      <p className="footerNote">Hình ảnh đang để sẵn vị trí hiển thị. Sau này chỉ cần nối tên ảnh với nơi lưu ảnh là có thể hiển thị ảnh thật.</p>
    </main>
  );
}
