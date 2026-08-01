# NeutronDict — bản Android (Capacitor)

App Android dùng chung dữ liệu và đồng bộ Google Drive với extension "NeutronDict" trên máy tính. Gồm: tra từ tiếng Anh (nghĩa Việt + IPA + phát âm + định nghĩa/ví dụ), **hướng dẫn đọc IPA**, sổ tay + sổ con, chế độ học SRS, và **nhắc học hằng ngày**.

## Build APK

**Cần cài trên máy tính:**
1. [Node.js LTS](https://nodejs.org).
2. [Android Studio](https://developer.android.com/studio) (đã kèm SDK + JDK).

**Các bước (chạy trong thư mục `android/`):**
```bash
npm install
npx cap add android
npx cap sync android
node patch-android.js        # thêm menu bôi đen + bảng Chia sẻ + đổi tên app
npx @capacitor/assets generate --android   # (tuỳ chọn) sinh icon từ assets/
npx cap open android
```
Android Studio mở ra → đợi Gradle sync → **Build → Build APK(s)** → lấy `app-debug.apk`.

Cài nhanh qua USB (bật Gỡ lỗi USB): `npx cap run android`.

> Icon: đặt sẵn trong `assets/` (`icon.png`, `icon-foreground.png`, `icon-background.png`). Lệnh `@capacitor/assets generate` sẽ dùng chúng để sinh mọi mật độ + adaptive icon.

## Dịch câu

Nhập/dán đoạn dài hơn 40 ký tự vào ô tra (hoặc bấm tab **Dịch**) → app dịch bằng Google Dịch. Có nút ＋ Lưu vào sổ tay. Dự phòng qua Apps Script cần bản mới có action `translate`.

## Lưu kèm nguồn: Chia sẻ qua NeutronDict

1. Bôi đen từ/câu trong trình duyệt.
2. Bấm **Chia sẻ (Share)** → chọn **Lưu vào NeutronDict**.
3. App mở ra, tra từ đó; bấm **＋ Lưu** để lưu kèm địa chỉ trang.
4. Trong Sổ tay, mục đó có nút **🔗 Nguồn** để mở lại đúng chỗ (dùng Text Fragment `#:~:text=`).

> Menu "Tra bằng NeutronDict" (bôi đen) **chỉ gửi chữ, không gửi link**. Muốn lưu kèm nguồn thì dùng bảng **Chia sẻ**.

## Cập nhật bản có sửa native

Bản đụng tới `native/` **không chỉ copy `www/`**. Chạy đủ:
```bash
npx cap sync android
node patch-android.js
cd android && gradlew assembleDebug
```
Cài đè APK mới — vì `appId` không đổi (`com.neutrondict.app`) nên **không mất sổ tay/dữ liệu**.

## Thiết lập lần đầu

Mở app → tab **Sổ tay** → **☁ Đồng bộ Google Drive** → dán **URL Apps Script** + **token** (cùng bộ với máy tính) → **Lưu cấu hình** → **⇅ Đồng bộ ngay**. Toàn bộ sổ tay + sổ con + tiến độ học sẽ đổ về.
