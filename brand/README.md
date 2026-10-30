# RaKuLanG — gấu trắng Bắc Cực

Logo mới do công cụ tạo ảnh dựng và sửa theo phản hồi của chủ dự án: gấu trắng 2D, đầu tròn mượt, mắt chấm nhìn thẳng, lè lưỡi hồng; không lông nhọn, liếc mắt, nhếch mép, lông mày/mí mắt người, hiệu ứng 3D hoặc bóng đổ.

- `polar-bear-source.png`: ảnh nguồn nền trong suốt.
- `logo-512.png`: bản logo trong suốt 512px.
- `logo.svg`, `logo-mark.svg`: bản bọc PNG để tương thích đường dẫn cũ; hình minh hoạ là bitmap, không giả nhận là vector.
- `make-icons.mjs`: xuất các kích cỡ bằng Chromium; không vẽ lại hoặc làm thay đổi nhân vật.
- `../extension/icons/icon{16,48,128}.png`: biểu tượng extension.
- `../android/assets/icon*.png`: icon Android và các lớp adaptive; foreground có lề an toàn.
- APK tích hợp gán launcher vào tài nguyên RaKuLanG, không dùng icon của DualSub.

Cách tái tạo: `PW_PKG=/path/to/playwright/index.mjs node brand/make-icons.mjs`.
Ảnh nguồn được tạo bằng image_gen tích hợp. Prompt cuối:
> Smooth round white polar-bear mascot with small dark bead eyes, no eyebrows/eyelids/lashes or human sclera; facing forward, pink tongue out; flat 2D white/charcoal/pink, no fur tufts, no shadows or gradients; transparent background.

## Màu giao diện
Mặc định xanh pastel **#8BD4E6**, theo ảnh người dùng. Trong Cài đặt có 6 preset tự lưu: xanh, bạc hà, hồng, đào, lavender, vàng kem. Chữ và link có sắc đậm riêng để dễ đọc. Tên hiển thị là **RaKuLanG**; định danh package/kho/sync vẫn dùng tên nội bộ cũ để tương thích dữ liệu.
