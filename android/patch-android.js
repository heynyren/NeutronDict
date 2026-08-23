/* Vá thư mục android/ sau khi `npx cap add android` hoặc `npx cap sync android`.
   Chạy:  node patch-android.js
   Làm 3 việc:
   1. Chép native/MainActivity.java (nhận chữ từ menu bôi đen + nội dung Chia sẻ).
   2. Thêm 2 activity-alias vào AndroidManifest.xml:
        - "Tra bằng NeutronDict"  (ACTION_PROCESS_TEXT) — menu bôi đen.
        - "Lưu vào NeutronDict"   (ACTION_SEND)        — hiện trong bảng Chia sẻ, nhận cả link.
   3. Khai quyền RECORD_AUDIO + MODIFY_AUDIO_SETTINGS — cần cho nút ghi âm
      đọc theo (shadowing). Thiếu quyền thứ hai là micro chết dù đã cho phép.
   4. Đổi tên hiển thị app thành NeutronDict trong strings.xml. */
const fs = require("fs");
const path = require("path");

const APP_ID_PATH = path.join("android", "app", "src", "main", "java", "com", "neutrondict", "app");
const MANIFEST = path.join("android", "app", "src", "main", "AndroidManifest.xml");
const STRINGS = path.join("android", "app", "src", "main", "res", "values", "strings.xml");

function die(msg) { console.error("LỖI: " + msg); process.exit(1); }

if (!fs.existsSync("android")) die("Chưa có thư mục android/. Chạy `npx cap add android` trước.");

// 1) MainActivity
const srcMain = path.join("native", "MainActivity.java");
if (!fs.existsSync(srcMain)) die("Thiếu native/MainActivity.java");
if (!fs.existsSync(APP_ID_PATH)) die("Không thấy " + APP_ID_PATH + " (appId có đổi không?)");
fs.copyFileSync(srcMain, path.join(APP_ID_PATH, "MainActivity.java"));
console.log("✓ Đã chép MainActivity.java");

// 2) AndroidManifest: activity-alias cho menu bôi đen (PROCESS_TEXT)
let man = fs.readFileSync(MANIFEST, "utf8");
if (!man.includes("</application>")) die("AndroidManifest.xml không đúng định dạng.");

if (!man.includes("PROCESS_TEXT")) {
  const alias = `
        <activity-alias
            android:name=".ProcessTextActivity"
            android:targetActivity=".MainActivity"
            android:label="Tra bằng NeutronDict"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.PROCESS_TEXT" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="text/plain" />
            </intent-filter>
        </activity-alias>
`;
  man = man.replace("</application>", alias + "    </application>");
  console.log("✓ Đã thêm mục 'Tra bằng NeutronDict' vào menu bôi đen (AndroidManifest)");
} else {
  console.log("• AndroidManifest đã có PROCESS_TEXT — bỏ qua");
}

// 2b) AndroidManifest: activity-alias cho bảng Chia sẻ (ACTION_SEND) — nhận cả link
if (!man.includes(".ShareActivity")) {
  const shareAlias = `
        <activity-alias
            android:name=".ShareActivity"
            android:targetActivity=".MainActivity"
            android:label="Lưu vào NeutronDict"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="text/plain" />
            </intent-filter>
        </activity-alias>
`;
  man = man.replace("</application>", shareAlias + "    </application>");
  console.log("✓ Đã thêm mục 'Lưu vào NeutronDict' vào bảng Chia sẻ (AndroidManifest)");
} else {
  console.log("• AndroidManifest đã có ShareActivity — bỏ qua");
}

// 2c) Quyền micro cho nút ghi âm đọc theo. PHẢI đủ CẢ HAI.
//
// Cái bẫy nằm ở chỗ này, và nó là nguyên nhân của lỗi "đã cho phép micro rồi
// mà vẫn không thu được". Trong WebView, getUserMedia không tự hỏi hệ điều
// hành; nó gọi ngược lên WebChromeClient.onPermissionRequest, và bản của
// Capacitor 6 xin MỘT LƯỢT hai quyền:
//
//     MODIFY_AUDIO_SETTINGS  +  RECORD_AUDIO
//
// rồi chỉ grant() khi CẢ HAI đều trả về "đã cho". Mà Android có luật: quyền
// không khai trong manifest thì không bao giờ được hỏi, và lượt xin trả về
// "từ chối" ngay lập tức. Thiếu MODIFY_AUDIO_SETTINGS, chuyện xảy ra đúng như
// người dùng thấy: hộp thoại micro vẫn hiện, bấm "Cho phép" xong thì Capacitor
// vẫn nhận về false ở quyền kia, và nó gọi request.deny() — getUserMedia hỏng,
// còn người dùng thì vừa tự tay bấm đồng ý.
//
// MODIFY_AUDIO_SETTINGS là quyền thường (normal), khai vào không thêm hộp
// thoại nào cho người dùng cả — nó chỉ cần CÓ MẶT để lượt xin kia trả về true.
const QUYEN_TIENG = [
  ["android.permission.RECORD_AUDIO", "thu tiếng"],
  ["android.permission.MODIFY_AUDIO_SETTINGS", "chỉnh đường tiếng"],
];
for (const [ten, mo] of QUYEN_TIENG) {
  if (man.includes(ten)) {
    console.log("• AndroidManifest đã khai " + ten + " — bỏ qua");
    continue;
  }
  const quyen = '    <uses-permission android:name="' + ten + '" />\n';
  // Đặt ngay trước <application>, đúng chỗ Android chờ các thẻ uses-permission.
  man = man.replace("    <application", quyen + "    <application");
  if (!man.includes(ten)) die("Không chèn được " + ten + " vào AndroidManifest.xml.");
  console.log("✓ Đã khai quyền " + mo + " " + ten + " (AndroidManifest)");
}

fs.writeFileSync(MANIFEST, man);

// 3) Tên hiển thị
if (fs.existsSync(STRINGS)) {
  let st = fs.readFileSync(STRINGS, "utf8");
  st = st.replace(/(<string name="app_name">)[^<]*(<\/string>)/, "$1NeutronDict$2");
  st = st.replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, "$1NeutronDict$2");
  fs.writeFileSync(STRINGS, st);
  console.log("✓ Đã đổi tên hiển thị thành NeutronDict (strings.xml)");
}

console.log("\nXong. Tiếp theo: npx @capacitor/assets generate --android   (đổi icon)\nrồi: cd android && gradlew assembleDebug");
