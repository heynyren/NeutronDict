# NeutronDict MCP server

Cho trợ lý AI (Claude Desktop, Claude Code, Claude Cowork…) **đọc và sửa** sổ
tay NeutronDict của bạn.

Không cần cài gì. Chỉ cần Node. Server nói JSON-RPC qua stdio đúng chuẩn MCP.

## Nối dữ liệu — chọn một trong hai

MCP server chạy trên máy, không với tay vào `chrome.storage` của extension
được. Nên có hai lối:

**Lối 1 — qua cloud Apps Script (nên dùng).** Dùng chính máy chủ mà extension
vẫn đồng bộ. Sửa xong, mở NeutronDict bấm **Đồng bộ ngay** là về máy.

```
ND_SYNC_URL=https://script.google.com/macros/s/..../exec
ND_SYNC_TOKEN=<mã bí mật bạn đặt trong Code.gs>
```

**Lối 2 — qua tệp.** Dùng chức năng **Xuất** trong app để ra tệp JSON.

```
ND_FILE=/duong/dan/sotay.json
```

## Bước 0 — tự kiểm trước khi cài

Cài MCP mà sai một chữ trong đường dẫn hay token thì Claude chỉ im lặng không
hiện công cụ nào, chẳng nói vì sao. Chạy cái này trước để biết hỏng ở khâu nào:

```
node /duong/dan/NeutronDict/mcp/neutrondict-mcp.mjs --tu-kiem
```

Trên Windows (PowerShell), đặt biến rồi chạy:

```powershell
$env:ND_FILE="C:\Users\Ban\Downloads\sotay.json"
node C:\NeutronDict\mcp\neutrondict-mcp.mjs --tu-kiem
```

Phải thấy đủ dấu ✓ và dòng "Đọc sổ tay: ✓ N mục". Nếu chưa, nó nói rõ thiếu gì.

## Cài vào Claude Desktop / Cowork

Mở tệp cấu hình MCP rồi thêm:

```json
{
  "mcpServers": {
    "neutrondict": {
      "command": "node",
      "args": ["/duong/dan/NeutronDict/mcp/neutrondict-mcp.mjs"],
      "env": {
        "ND_SYNC_URL": "https://script.google.com/macros/s/..../exec",
        "ND_SYNC_TOKEN": "ma-bi-mat-cua-ban"
      }
    }
  }
}
```

## Cài vào Claude Code

```
claude mcp add neutrondict -- node /duong/dan/NeutronDict/mcp/neutrondict-mcp.mjs
```

rồi đặt `ND_SYNC_URL` / `ND_SYNC_TOKEN` trong môi trường.

## Bộ công cụ

**Đọc**

| Công cụ | Việc |
|---|---|
| `tim_tu` | tìm theo chữ, cách đọc, nghĩa hoặc ghi chú |
| `xem_muc` | xem đầy đủ một mục |
| `den_han` | những từ đến hạn ôn hôm nay |
| `thong_ke` | số mục, phân bố cấp SRS, theo từ điển |
| `furigana` | sinh furigana — dùng chính `kana.js` của app |
| `han_viet` | âm Hán Việt |
| `cat_cau` | cắt đoạn thành câu — dùng chính `cat-cau.js` |

**Sửa**

| Công cụ | Việc |
|---|---|
| `sua_nghia` | đổi danh sách nghĩa của một mục |
| `sua_ghi_chu` | đổi ghi chú |
| `them_muc` | thêm từ mới |
| `xoa_muc` | xoá (dựng bia mộ) |

## Dây an toàn

Đây là dữ liệu học tập gom góp lâu ngày, nên phần ghi có mấy chốt chặn:

1. **Mọi lượt ghi đều sao lưu trước** ra tệp `.bak-<mốc giờ>.json`.
2. **Không bao giờ đụng `srs`** — tiến độ ôn đổi bằng công sức thật, sửa lại
   nghĩa một từ không được phép làm nó tụt cấp.
3. **Công cụ ghi đều hẹp**: sửa từng mục, có tên rõ. Không có lối nào "ghi đè
   cả sổ" — thứ mà một lượt gọi nhầm có thể xoá sạch mọi thứ.
4. **Xoá là dựng bia mộ** (`del:1`) đúng như app, để lượt đồng bộ sau không
   hồi sinh mục đã xoá.
5. Sửa nghĩa thì **bản gốc được cất lại một lần** (`mOrig`), vẫn khôi phục được
   trong app.

## Thử vài câu

- "Sổ tay tôi có bao nhiêu từ, phân bố cấp thế nào?"
- "Những từ đến hạn ôn hôm nay là gì, soạn cho tôi 10 câu ví dụ."
- "Nghĩa của 発売 trong sổ tôi ghi là 'phát mại' nghe cổ quá, sửa lại cho tự nhiên."
- "Rà những mục tiếng Nhật thiếu cách đọc và bổ sung giúp tôi."
