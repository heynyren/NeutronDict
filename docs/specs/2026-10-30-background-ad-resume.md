# Khôi phục phát nền sau quảng cáo (2026-10-30)

## Báo lỗi
Người dùng tắt màn hình: âm thanh vẫn chạy, quảng cáo được bỏ qua nhưng nội dung không phát tiếp cho đến khi bật màn hình.

## Bằng chứng trong mã
AdSkipScripts.restore chỉ khôi phục muted/playbackRate; không ghi nhận ý định tiếp tục nội dung và không phát lại nội dung bị pause sau quảng cáo. Lifecycle chỉ giữ WebView visible ở thời điểm chuyển ra nền và vài lần ngắn sau đó. Đây là đường có thể tạo triệu chứng; chưa tái hiện trên quảng cáo YouTube trực tiếp.

## Kế hoạch trước triển khai
- Giữ đúng một player/WebView và toàn bộ ad-skip hiện có. Thêm state nhỏ theo URL video: đã phát trước/trong ad, ad vừa kết thúc, deadline 15 giây, lần thử gần nhất.
- Native media poll gọi kiểm tra cả khi màn hình tắt, không dựa vào requestAnimationFrame hay timer nền của trang.
- Chỉ phát lại khi đang ra nền, Skip ads bật, vừa thấy ad trên cùng video, trước đó có ý định phát, video nội dung paused nhưng chưa ended, đã có dữ liệu và không đang seek.
- Thử tối đa mỗi giây trong 15 giây; xóa khi đã phát. Không resume nếu người dùng pause qua media session/notification/earphones/control trang; hủy khi đổi video hoặc study đang kiểm soát clip.
- Giữ WebView visible trong thời gian phục hồi hợp lệ; không bật màn hình, không giữ wake lock mới, không tạo player thứ hai.
- Chromium fixture của chính script: pre-roll/mid-roll, thay video element, pause chủ động, video mới, quảng cáo liên tiếp, buffering/seeking, hết deadline, setting off và study guard; device suite kiểm tra build/native wiring.
- Kiểm thử mô phỏng không xác nhận được quảng cáo YouTube thật hoặc hành vi tiết kiệm pin của từng điện thoại; nêu giới hạn khi báo cáo.

## Chi tiết chuyển video sau quảng cáo
Nếu class ad biến mất trước khi YouTube thay element video quảng cáo đã ended, vẫn giữ deadline 15 giây và chờ element nội dung sẵn sàng. Không gọi play khi ended; kết thúc nội dung bình thường không có chuyển tiếp ad thì không phát lại.
