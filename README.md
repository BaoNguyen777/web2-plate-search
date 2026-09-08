# Web 2 — Plate Search

Mobile-first Next.js app for looking up license plates from the CSV exported by Web 1.

## Current flow

1. Upload or drag/drop the Web 1 `.csv` file.
2. The browser reads the CSV locally; no upload to a server is required.
3. Enter a plate such as `43a12345`.
4. The search normalizes uppercase/lowercase, spaces, `-`, `.`, and other separators.
5. If a match exists, the app shows **Có biển số trong dữ liệu**, the plate, confidence, status, filename, and a reserved image area.
6. If there is no match, it shows **Không có biển số**.

## CSV format

The expected Web 1 columns are:

- `STT`
- `Tên ảnh`
- `Biển số`
- `Độ tin cậy`
- `Trạng thái`

## Run

```bash
npm install
npm run dev
```

The image area is intentionally prepared for the next step, when the actual source images are connected.
