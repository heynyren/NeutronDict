# NeutronDict — gấu trắng Bắc Cực

Logo mới do công cụ tạo ảnh dựng và sửa theo phản hồi của chủ dự án: gấu trắng 2D, đầu tròn mượt, mắt chấm nhìn thẳng, lè lưỡi hồng; không lông nhọn, liếc mắt, nhếch mép, lông mày/mí mắt người, hiệu ứng 3D hoặc bóng đổ.

- `polar-bear-source.png`: ảnh nguồn nền trong suốt.
- `logo-512.png`: bản logo trong suốt 512px.
- `logo.svg`, `logo-mark.svg`: bản bọc PNG để tương thích đường dẫn cũ; hình minh hoạ là bitmap, không giả nhận là vector.
- `make-icons.mjs`: xuất các kích cỡ bằng Chromium; không vẽ lại hoặc làm thay đổi nhân vật.
- `../extension/icons/icon{16,48,128}.png`: biểu tượng extension.
- `../android/assets/icon*.png`: icon Android và các lớp adaptive; foreground có lề an toàn.
- APK tích hợp gán launcher vào tài nguyên NeutronDict, không dùng icon của DualSub.

Cách tái tạo: `PW_PKG=/path/to/playwright/index.mjs node brand/make-icons.mjs`.
Ảnh nguồn được tạo bằng image_gen tích hợp. Prompt cuối:
> Smooth round white polar-bear mascot with small dark bead eyes, no eyebrows/eyelids/lashes or human sclera; facing forward, pink tongue out; flat 2D white/charcoal/pink, no fur tufts, no shadows or gradients; transparent background.
