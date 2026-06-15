# FinHome MVP Test Checklist

File này dùng để test tay nhanh sau mỗi đợt sửa. Mục tiêu là kiểm tra các luồng tiền chính không làm sai tổng tài sản, tổng nợ, tài sản ròng và dòng tiền.

## Cách test nhanh

- Mở app ở `http://localhost:5173/`.
- Trước khi test một luồng lớn, ghi lại số liệu ở Tổng quan.
- Sau khi thao tác, quay lại Tổng quan để kiểm tra KPI đã cập nhật.
- Nếu số liệu sai, kiểm tra giao dịch gốc trước khi sửa KPI.

## P0 - Bắt buộc đúng

### Tổng quan

- [ ] Tổng tài sản = Cá nhân + Kinh doanh + Đầu tư + Tiết kiệm.
- [ ] Tổng nợ = Dư nợ khoản vay + dư nợ thẻ tín dụng.
- [ ] Tài sản ròng = Tổng tài sản - Tổng nợ.
- [ ] Dòng tiền tháng này chỉ tính thu nhập thật - chi tiêu thật.
- [ ] Chuyển tiền nội bộ không làm thay đổi dòng tiền.
- [ ] Mua/bán đầu tư cập nhật lại tổng tài sản đầu tư.
- [ ] Nạp/rút tiết kiệm cập nhật lại tổng tiết kiệm.

### Cá nhân

- [ ] Thêm thu nhập: ví tăng, thu nhập tháng tăng.
- [ ] Thêm chi tiêu bằng ví: ví giảm, chi tiêu tháng tăng.
- [ ] Chi tiêu bằng thẻ tín dụng: chi tiêu tăng, dư nợ thẻ tăng, ví không giảm.
- [ ] Thanh toán thẻ tín dụng: ví giảm, dư nợ thẻ giảm, không tính chi tiêu lần hai.
- [ ] Phí/lãi thẻ tín dụng: chỉ phần phí/lãi tính vào chi phí tài chính.
- [ ] Chuyển tiền giữa ví cá nhân: ví nguồn giảm, ví đích tăng, không tính thu/chi.
- [ ] Điều chỉnh số dư ví: ví đổi số dư, không tính thu nhập/chi tiêu.
- [ ] Ẩn ví: ví không hiện mặc định nhưng lịch sử vẫn còn.

### Kinh doanh

- [ ] Góp vốn: cá nhân giảm, tiền mặt kinh doanh tăng, vốn góp tăng, không tính doanh thu.
- [ ] Bổ sung tiền mặt: cá nhân giảm, tiền mặt kinh doanh tăng, vốn góp không đổi.
- [ ] Thu tiền/doanh thu: tiền mặt kinh doanh tăng, doanh thu tăng.
- [ ] Chi tiền/chi phí: tiền mặt kinh doanh giảm, chi phí tăng.
- [ ] Lợi nhuận kinh doanh = Doanh thu - Chi phí.
- [ ] Rút tiền về cá nhân: tiền mặt kinh doanh giảm, cá nhân tăng, không tính chi phí.
- [ ] Rút tiền ưu tiên trừ lợi nhuận giữ lại trước, thiếu mới trừ vốn góp.
- [ ] Ghi nhận phải thu: doanh thu tăng, phải thu tăng, tiền mặt không tăng.
- [ ] Thu tiền phải thu: tiền mặt tăng, phải thu giảm, không ghi doanh thu lần hai.
- [ ] Ghi nhận phải trả: chi phí tăng, phải trả tăng, tiền mặt không giảm.
- [ ] Thanh toán phải trả: tiền mặt giảm, phải trả giảm, không ghi chi phí lần hai.

### Đầu tư

- [ ] Chuyển tiền vào Đầu tư: cá nhân giảm, tiền mặt đầu tư tăng, không tính chi tiêu.
- [ ] Mua đầu tư: tiền mặt đầu tư giảm, khoản đầu tư tăng, không tính chi tiêu cá nhân.
- [ ] Bán một phần: số lượng/vốn còn lại giảm đúng, tiền bán được xử lý đúng.
- [ ] Bán toàn bộ: khoản đầu tư chuyển trạng thái đã bán.
- [ ] Lãi/lỗ chỉ ghi nhận khi bán.
- [ ] Chuyển tiền từ đầu tư về cá nhân: tiền mặt đầu tư giảm, cá nhân tăng, không tính thu nhập lần hai.
- [ ] Tổng quan lấy đúng tiền mặt đầu tư + vốn đầu tư còn lại.

### Tiết kiệm

- [ ] Nạp mục tiêu: ví nguồn giảm, mục tiêu tiết kiệm tăng, không tính chi tiêu.
- [ ] Rút mục tiêu: mục tiêu giảm, ví nhận tăng, không tính thu nhập.
- [ ] Không cho nạp vượt số dư ví nguồn.
- [ ] Không cho rút vượt số tiền hiện có của mục tiêu.
- [ ] Tạo tiết kiệm sinh lãi: gốc chuyển từ tài khoản cá nhân sang tiết kiệm, không tính chi tiêu.
- [ ] Tất toán tiết kiệm sinh lãi: tài khoản nhận tăng tổng gốc + lãi.
- [ ] Khi tất toán, chỉ phần lãi được tính là thu nhập tài chính.

### Khoản vay

- [ ] Tạo khoản vay có giải ngân: tài khoản cá nhân tăng, dư nợ tăng, không tính thu nhập.
- [ ] Giải ngân thêm khoản vay cũ: tài khoản nhận tăng, dư nợ tăng, thu nhập không tăng.
- [ ] Trả khoản vay: tài khoản trả tiền giảm.
- [ ] Trả gốc: dư nợ giảm, không tính chi tiêu sinh hoạt.
- [ ] Trả lãi/phí: tính vào chi phí tài chính.
- [ ] Tất toán: dư nợ về 0 và trạng thái chuyển đã tất toán.
- [ ] Thẻ tín dụng hiển thị hạn mức và dư nợ.

## P1 - UI/UX cần không lỗi

- [ ] Không còn native select xanh ở các flow chính.
- [ ] Custom select hiển thị đúng theme trắng/đen/đỏ.
- [ ] Date picker mở bằng bottom sheet, không dùng popup browser cũ.
- [ ] Modal không bị quá dài trên mobile.
- [ ] Các nút chính luôn nhìn thấy hoặc dễ cuộn tới.
- [ ] Text tiếng Việt không bị lỗi encoding.
- [ ] Danh mục giao dịch chọn được theo 2 bước cha/con.
- [ ] Tab hoặc bottom nav chuyển trang không làm reset dữ liệu vừa nhập.

## P2 - Đồng bộ và ổn định

- [ ] Sau khi thao tác ở một trang, chuyển sang trang khác thấy dữ liệu mới.
- [ ] Sau khi localStorage thay đổi, app phát sự kiện `finhome:data-changed`.
- [ ] Overview cập nhật lại KPI sau mua/bán đầu tư.
- [ ] Overview cập nhật lại KPI sau nạp/rút tiết kiệm.
- [ ] Overview cập nhật lại tổng nợ sau giải ngân/trả nợ/thanh toán thẻ.
- [ ] Build production chạy thành công bằng `npm run build`.

## Checklist trước khi chuyển sang mobile flow

- [ ] Chốt xong 6 module: Tổng quan, Cá nhân, Kinh doanh, Đầu tư, Tiết kiệm, Khoản vay.
- [ ] Chốt quy tắc thu/chi/chuyển tiền nội bộ.
- [ ] Chốt logic khoản vay và thẻ tín dụng.
- [ ] Chốt logic đầu tư mua/bán/chốt lời.
- [ ] Chốt logic tiết kiệm mục tiêu và tiết kiệm sinh lãi.
- [ ] Chốt logic công nợ kinh doanh.
- [ ] Không còn lỗi reset dữ liệu khi chuyển workspace.
- [ ] Có thể nhập dữ liệu MVP và xem báo cáo cơ bản.
