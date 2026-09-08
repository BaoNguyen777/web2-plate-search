"use client";

import { CheckCircle2, Image as ImageIcon, Search, XCircle } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type RecordItem = {
  plate: string;
  imageName: string;
  confidence: string;
  status: string;
};

// Seed data mirrors the current Web 1 OCR CSV structure.
const records: RecordItem[] = [
  { plate: "43A12345", imageName: "43A-123.45.jpg", confidence: "73.68%", status: "Đã nhận diện" },
  { plate: "43B67890", imageName: "43B-678.90.jpg", confidence: "78.74%", status: "Đã nhận diện" },
];

function normalizePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  const result = useMemo(() => {
    const normalized = normalizePlate(query);
    if (!searched || !normalized) return null;
    return records.find((item) => normalizePlate(item.plate) === normalized) ?? false;
  }, [query, searched]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setSearched(true);
  }

  return (
    <main className="shell">
      <header className="header">
        <p className="eyebrow">Web 2 · Plate Search</p>
        <h1>Tra cứu biển số xe</h1>
        <p className="subtitle">Nhập biển số để kiểm tra dữ liệu đã được nhận diện từ Web 1.</p>
      </header>

      <section className="card">
        <form onSubmit={submit}>
          <label className="label" htmlFor="plate">Biển số xe</label>
          <div className="searchRow">
            <input
              id="plate"
              className="input"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setSearched(false); }}
              placeholder="43a12345"
              autoCapitalize="characters"
              autoComplete="off"
              inputMode="text"
            />
            <button className="searchBtn" type="submit" aria-label="Tìm kiếm">
              <Search size={22} />
            </button>
          </div>
          <p className="hint">Có thể nhập 43A12345, 43A-123.45 hoặc 43a 12345.</p>
        </form>
      </section>

      {result && typeof result === "object" && (
        <section className="result success">
          <div className="resultTop">
            <div className="icon"><CheckCircle2 size={24} /></div>
            <div>
              <h2>Có biển số trong dữ liệu</h2>
              <p>Đã tìm thấy bản ghi phù hợp.</p>
            </div>
          </div>
          <div className="plate">{result.plate}</div>
          <div className="imageSlot">
            <div>
              <ImageIcon size={28} />
              <div>Hình ảnh biển số sẽ hiển thị ở đây</div>
              <small>{result.imageName}</small>
            </div>
          </div>
        </section>
      )}

      {result === false && (
        <section className="result empty">
          <div className="resultTop">
            <div className="icon"><XCircle size={24} /></div>
            <div>
              <h2>Không có biển số</h2>
              <p>Không tìm thấy biển số <strong>{query.toUpperCase()}</strong> trong dữ liệu.</p>
            </div>
          </div>
        </section>
      )}

      <p className="footerNote">Bản đầu tiên tập trung vào tìm kiếm. Phần hình ảnh thật sẽ được nối vào dữ liệu file ở bước tiếp theo.</p>
    </main>
  );
}
