# NeutronDict — Thương hiệu & Logo

Logo kết hợp **nơ-ron thần kinh** và **vũ trụ**: một nơ-ron mà các khớp synapse là những **ngôi sao**, nối nhau thành chòm sao, cùng một vòng quỹ đạo, trên nền **tinh vân tím – hồng** — gợi “kết nối tri thức” trong “vũ trụ ngôn từ”.

## Màu thương hiệu

| Vai trò | Mã |
|--------|-----|
| Tím chủ đạo (brand) | `#7c3aed` |
| Hồng/magenta phụ | `#c026d3` |
| Nền tinh vân | gradient `#8b5cf6 → #7c3aed → #5b21b6 → #2e1065` + bloom `#ec4899` |

## Tệp

- `logo.svg` — logo đầy đủ (có nền panel bo góc), dùng cho icon và ảnh giới thiệu.
- `logo-mark.svg` — chỉ phần nơ-ron (nền trong suốt, đã thu về vùng an toàn) cho lớp foreground của adaptive icon Android.
- `logo-512.png` — bản PNG 512px để dùng trong README/store.
- `make-icons.mjs` — script rasterize SVG → PNG bằng headless Chromium (Playwright).

## Xuất lại icon

Cần Node + Playwright (chromium). Trong thư mục `brand/`:

```bash
# PW_PKG: đường dẫn gói playwright; PW_CHROMIUM: file thực thi chromium
PW_PKG=$(npm root -g)/playwright/index.js \
PW_CHROMIUM=/path/to/chromium \
node make-icons.mjs
```

Script sinh:
- `../extension/icons/icon16.png`, `icon48.png`, `icon128.png`
- `../android/assets/icon.png`, `icon-foreground.png`, `icon-background.png`
- `logo-512.png`

Sau khi có `android/assets/*`, chạy `npx @capacitor/assets generate --android` để sinh toàn bộ mật độ + adaptive icon.
