# Bộ kiểm tra

Chạy bằng Playwright, nạp thẳng extension vào Chromium thật:

```
node kiem-tra/<tên>.mjs /home/user/NeutronDict/extension
```

Bài nào cũng tự dựng một trang YouTube / sổ tay giả rồi ĐO trên DOM thật, nên
nó bắt được cả những thứ chỉ hỏng khi trình duyệt dựng xong bố cục.

**Vì sao thư mục này tồn tại.** Phần lớn bộ kiểm tra của dự án này trước giờ
nằm trong thư mục nháp của phiên làm việc, và thư mục ấy bị xoá khi phiên kết
thúc. Mỗi lần như vậy là mất sạch — lần sau có sửa lại đúng chỗ cũ cũng không
còn gì để soát xem có làm hỏng thứ khác không. Bài nào còn đáng giữ thì để ở
đây, trong kho.
