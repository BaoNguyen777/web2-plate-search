"use client";

import { CheckCircle2, Image as ImageIcon, LoaderCircle, Search, XCircle } from "lucide-react";
import { FormEvent, useState } from "react";

type RecordItem = {
  id: string;
  plate: string;
  imageName: string;
  confidence: number;
  status: string;
  createdAt: string;
  imageUrl: string | null;
};

function normalizePlate(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatTime(value: string) {
  try { return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(value)); }
  catch { return value; }
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const plate = normalizePlate(query);
    if (!plate) return;
    setLoading(true); setSearched(true); setError(""); setRecords([]);
    try {
      const response = await fetch(`/api/search?plate=${encodeURIComponent(plate)}`, { cache: "no-store" });
      const data = await response.json() as { records?: RecordItem[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Không thể tra cứu.");
      setRecords(data.records || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tra cứu.");
    } finally { setLoading(false); }
  }

  const hasSearch = searched && Boolean(normalizePlate(query));

  return (
    <main className="shell">
      <header className="header">
        <p className="eyebrow">Web 2 · Plate Search</p>
        <h1>Tra cứu biển số xe</h1>
        <p className="subtitle">Nhập biển số để tìm ảnh đã được Web 1 nhận diện trong 24 giờ gần nhất.</p>
      </header>

      <section className="card">
        <div className="sectionHeading"><div><p className="sectionEyebrow">01 · Tìm kiếm</p><h2>Nhập biển số</h2></div></div>
        <form onSubmit={submit}>
          <label className="label" htmlFor="plate">Biển số xe</label>
          <div className="searchRow">
            <input id="plate" className="input" value={query} onChange={(event) => { setQuery(event.target.value); setSearched(false); setError(""); }} placeholder="43a12345" autoCapitalize="characters" autoComplete="off" inputMode="text" />
            <button className="searchBtn" type="submit" aria-label="Tìm kiếm" disabled={loading}>{loading ? <LoaderCircle size={22} className="spin" /> : <Search size={22} />}</button>
          </div>
          <p className="hint">Có thể nhập 43A12345, 43A-123.45 hoặc 43a 12345.</p>
        </form>
      </section>

      {hasSearch && loading && <section className="result empty"><div className="resultTop"><div className="icon"><LoaderCircle size={24} className="spin" /></div><div><h2>Đang tìm kiếm</h2><p>Đang kiểm tra dữ liệu trong 24 giờ gần nhất…</p></div></div></section>}

      {hasSearch && !loading && error && <section className="result empty"><div className="resultTop"><div className="icon"><XCircle size={24} /></div><div><h2>Lỗi tra cứu</h2><p>{error}</p></div></div></section>}

      {hasSearch && !loading && !error && records.length > 0 && (
        <section className="result success">
          <div className="resultTop"><div className="icon"><CheckCircle2 size={24} /></div><div><h2>Có biển số trong dữ liệu</h2><p>Tìm thấy {records.length} ảnh phù hợp.</p></div></div>
          {records.map((result) => (
            <article className="matchCard" key={result.id}>
              <div className="plate">{result.plate}</div>
              <div className="details">
                <div><span>Độ tin cậy</span><strong>{(Number(result.confidence || 0) * 100).toFixed(1)}%</strong></div>
                <div><span>Thời gian</span><strong>{formatTime(result.createdAt)}</strong></div>
                <div><span>Trạng thái</span><strong>{result.status || "Đã nhận diện"}</strong></div>
              </div>
              {result.imageUrl ? <img className="resultImage" src={result.imageUrl} alt={`Ảnh biển số ${result.plate}`} /> : <div className="imageSlot"><div><ImageIcon size={28} /><div>Không lấy được ảnh</div><small>{result.imageName}</small></div></div>}
            </article>
          ))}
        </section>
      )}

      {hasSearch && !loading && !error && records.length === 0 && (
        <section className="result empty"><div className="resultTop"><div className="icon"><XCircle size={24} /></div><div><h2>Không có biển số</h2><p>Không tìm thấy <strong>{query.toUpperCase()}</strong> trong dữ liệu 24 giờ gần nhất.</p></div></div></section>
      )}

      <p className="footerNote">Ảnh được lưu tạm thời và chỉ phục vụ tra cứu trong ngày.</p>
    </main>
  );
}
