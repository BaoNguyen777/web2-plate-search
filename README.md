# Web 2 — Plate Search

Mobile-first Next.js app for searching license plates recognized by Web 1.

## Current flow

1. Enter a plate such as `43a12345`.
2. The app normalizes separators, spaces and letter case.
3. If the plate exists, it shows **Có biển số trong dữ liệu**.
4. A reserved image area is shown for the future source image integration.
5. If there is no match, it shows **Không có biển số**.

## Run

```bash
npm install
npm run dev
```

The current seed records are intentionally temporary. The next step is to connect the Web 1 CSV/API so records and real images are loaded dynamically.
