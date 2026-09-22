/**
 * SRS đa-đường — cấp độ thuộc của một từ, đo bằng NHIỀU đường truy xuất.
 * ===========================================================================
 *
 * Vì sao phải đổi
 * ---------------
 * Bản cũ cho mỗi mục đúng MỘT con số `srs.lv`, lên khi bấm Nhớ, về đầu khi bấm
 * Quên. Nó chỉ đo được một việc: nhìn thấy chữ thì có nhận ra không. Nhưng
 * "nhận ra" và "tự bật ra được" là hai bài toán khác nhau — người ta có thể
 * nhìn 改善 mà hiểu ngay, rồi lúc cần nói thì đầu óc trống rỗng.
 *
 * Nên một mục giờ có bốn đường, mỗi đường một cấp và một lịch riêng:
 *
 *   nhin — nhìn chữ, đoán nghĩa            (đường cũ, ai cũng có)
 *   nghe — nghe câu chứa từ, đoán nghĩa    (chỉ mục có câu nguồn)
 *   dong — nhặt cho hết tập từ đồng nghĩa
 *   trai — nhặt cho hết tập từ trái nghĩa
 *
 * Đường nào KHÔNG có dữ liệu thì không tồn tại, chứ không phải bị tính là 0 —
 * mục lưu từ ảnh chụp thì lấy đâu ra câu để nghe.
 *
 * Cấp của cả từ = cấp của ĐƯỜNG YẾU NHẤT trong những đường đang có. Lấy trung
 * bình thì một đường mạnh che lấp một đường liệt, mà chính cái đường liệt kia
 * mới là thứ làm người ta cứng họng lúc cần dùng.
 *
 * Thời gian truy xuất
 * -------------------
 * Bấm Nhớ sau 1,2 giây và bấm Nhớ sau 9 giây là hai trạng thái khác hẳn nhau,
 * mà bản cũ ghi lại y như nhau. Giờ đo mili-giây từ lúc hiện đề tới lúc bấm.
 *
 * Chỗ này cần nói thật cho rõ, vì nó ảnh hưởng tới việc tin vào con số tới đâu:
 *
 *   • CÓ cơ sở: trí nhớ mạnh thì truy xuất nhanh hơn — thời gian phản hồi được
 *     dùng rộng rãi trong nghiên cứu như một thước đo độ mạnh của trí nhớ, bên
 *     cạnh đúng/sai. Và trong nghiên cứu ngôn ngữ thứ hai, thước đo được coi là
 *     đáng tin cho "đã thành tự động" là HỆ SỐ BIẾN THIÊN (độ lệch chuẩn chia
 *     trung bình): nó giảm thì đúng là não đã tổ chức lại, còn chỉ trung bình
 *     giảm thì có thể chỉ là nhanh tay hơn (Segalowitz).
 *
 *   • KHÔNG có cơ sở: một con số mốc kiểu "dưới 2,3 giây là thuộc". Không có
 *     nghiên cứu nào chốt được mốc đó, và FSRS — thuật toán tốt nhất hiện nay —
 *     KHÔNG dùng thời gian phản hồi để xếp lịch.
 *
 * Nên ở đây KHÔNG chấm bằng mốc cứng. Chấm bằng chính người học: nhanh hay chậm
 * là so với trung bình của CHÍNH BẠN trên CHÍNH đường đó. Bấm bằng chuột trên
 * máy tính và bấm bằng ngón cái trên điện thoại vốn đã lệch nhau cả giây; một
 * cái mốc chung cho mọi người là sai ngay từ đầu.
 *
 * Mấy con số tuyệt đối bên dưới chỉ dùng lúc chưa đủ mẫu để tự hiệu chỉnh, và
 * chúng là LỰA CHỌN KỸ THUẬT của tôi chứ không phải trích dẫn khoa học — dựng
 * từ việc cộng các phần đã biết: đọc đề (~0,3–0,6s) + truy xuất một từ đã thuộc
 * ở ngôn ngữ thứ hai (~0,6–0,9s) + đưa tay bấm (~0,5–0,8s).
 */
(function (goc) {
  "use strict";

  /** Bốn đường truy xuất. Thứ tự này cũng là thứ tự hiện ra trong giao diện. */
  const DUONG = ["nhin", "nghe", "dong", "trai"];

  const TEN_DUONG = {
    nhin: "Nhìn chữ → nghĩa",
    nghe: "Nghe câu → nghĩa",
    dong: "Nhặt từ đồng nghĩa",
    trai: "Nhặt từ trái nghĩa"
  };

  /** Thang giãn cách, tính bằng NGÀY. Giữ nguyên thang cũ để mục cũ không lệch. */
  const MOC = [1, 3, 7, 14, 30, 60, 120];
  const NGAY = 24 * 60 * 60 * 1000;

  /* ------------------------------------------------------------------ */
  /* Thống kê chạy: trung bình và độ lệch, không cần giữ lịch sử         */
  /* ------------------------------------------------------------------ */
  /*
   * Welford. Giữ cả danh sách thời gian của mọi lượt chấm thì sổ tay phình lên
   * và đường đồng bộ nặng theo; ba con số này là đủ để có trung bình, độ lệch
   * và hệ số biến thiên.
   */

  /** Quá ngưỡng này coi như người ta bỏ đi pha trà, không phải đang nghĩ. */
  const MS_TOI_DA = 60000;
  /** Dưới ngưỡng này là bấm nhầm / bấm trước khi kịp đọc, không tính. */
  const MS_TOI_THIEU = 250;
  /**
   * Trần dùng RIÊNG cho thống kê.
   *
   * Vì sao phải tách khỏi MS_TOI_DA: một lượt 55 giây vẫn là một lượt trả lời
   * thật (đáng chấm là "rất chậm"), nhưng nếu để nguyên nó vào trung bình thì
   * nó phá nát bộ hiệu chỉnh. Đo được: 30 lượt đều 1,5 giây, thêm ĐÚNG MỘT
   * lượt 55 giây là trung bình vọt lên 3,2 giây và độ lệch lên 9,6 giây — sau
   * đó một lượt 1,5 giây không còn được coi là nhanh nữa. Một lần mất tập trung
   * làm hỏng cách chấm của cả tuần sau.
   *
   * Nên lượt quá chậm vẫn được ĐẾM, chỉ bị kẹp lại trước khi vào trung bình.
   */
  const MS_THONG_KE = 15000;
  /**
   * Trần thống kê RIÊNG cho từng đường.
   *
   * Một con số chung cho cả bốn là sai từ gốc: nhặt cho hết một tập 16 ô mất
   * hai chục giây là chuyện bình thường, không phải dấu hiệu quên. Đo được với
   * trần chung 15 giây: đường "đồng nghĩa" mất 20 giây thật thì app học được
   * trung bình 13,9 giây (vì mọi mẫu đều bị kẹp), ngưỡng "rất chậm" rơi vào
   * 16,8 giây — THẤP HƠN thời gian tự nhiên của chính bài đó. Kết quả: 83% lượt
   * ĐÚNG bị chấm "rất chậm", cấp bị đóng băng, giãn cách ×0,35. Hai bài liên
   * kết gần như không thể lên cấp.
   */
  const TRAN_TK = { nhin: 15000, nghe: 25000, dong: 45000, trai: 45000 };
  function tranCua(duong) { return TRAN_TK[duong] || MS_THONG_KE; }
  /** Đủ ngần này mẫu thì bỏ mốc cứng, so với chính mình. */
  const DU_MAU = 5;

  function themMau(tk, ms, duong) {
    const cu = tk && typeof tk.n === "number" ? tk : { n: 0, tb: 0, m2: 0 };
    if (!(ms >= MS_TOI_THIEU && ms <= MS_TOI_DA)) return cu;   // lượt rác: bỏ
    ms = Math.min(ms, tranCua(duong));
    /*
     * Kẹp thêm một lần nữa, lần này THEO CHÍNH NGƯỜI HỌC.
     *
     * Trần cứng 15 giây vẫn chưa đủ: người bấm đều đặn 1,5 giây mà dính một
     * lượt bị phân tâm thì trần 15 giây vẫn gấp mười lần nhịp thường của họ, và
     * độ lệch vọt lên đủ để mấy lượt nhanh sau đó không còn được tính là nhanh.
     *
     * Nên khi đã đủ mẫu thì kẹp lượt mới ở "trung bình + 2 độ lệch" — nó vẫn
     * được ĐẾM là một lượt chậm, chỉ không được phép kéo cả bộ hiệu chỉnh theo.
     * Đây là cách xử lý giá trị lạc kinh điển, và ở đây nó cần thật: bộ hiệu
     * chỉnh là thứ mọi phép chấm sau đều dựa vào.
     */
    if (cu.n >= DU_MAU) {
      const sd = Math.sqrt(cu.m2 / (cu.n - 1)) || cu.tb * 0.25;
      ms = Math.min(ms, cu.tb + 2 * sd);
    }
    const n = cu.n + 1;
    const d = ms - cu.tb;
    const tb = cu.tb + d / n;
    const m2 = cu.m2 + d * (ms - tb);
    return { n: n, tb: Math.round(tb), m2: Math.round(m2) };
  }

  /** Độ lệch chuẩn của mẫu. Dưới 2 mẫu thì chưa nói được gì. */
  function doLech(tk) {
    if (!tk || tk.n < 2) return 0;
    return Math.sqrt(tk.m2 / (tk.n - 1));
  }

  /**
   * Hệ số biến thiên — thước đo "đã thành tự động chưa" đáng tin hơn trung bình.
   * Càng nhỏ càng đều tay; đều tay mới là đã tự động.
   * @returns {number} 0 nếu chưa đủ mẫu
   */
  function heSoBienThien(tk) {
    if (!tk || tk.n < 2 || !tk.tb) return 0;
    return doLech(tk) / tk.tb;
  }

  /* ------------------------------------------------------------------ */
  /* Nhanh hay chậm                                                      */
  /* ------------------------------------------------------------------ */

  const NHANH_MS = 2500;         // mốc tạm lúc chưa đủ mẫu — lựa chọn kỹ thuật
  const CHAM_MS = 6000;
  const RAT_CHAM_MS = 12000;

  /**
   * Lượt trả lời này nhanh, vừa, chậm hay rất chậm.
   * @param {number} ms thời gian từ lúc hiện đề tới lúc bấm
   * @param {{n,tb,m2}} [tk] thống kê của chính người học trên chính đường này
   * @returns {"nhanh"|"vua"|"cham"|"rat_cham"}
   */
  function nhipDo(ms, tk, duong) {
    /*
     * "khong_do" — KHÔNG ĐO ĐƯỢC, và đó KHÔNG PHẢI "rất chậm".
     *
     * Bản trước tự mâu thuẫn: chú thích của MS_TOI_DA ghi rõ "coi như người ta
     * bỏ đi pha trà, không phải đang nghĩ", themMau cũng loại lượt ấy khỏi
     * thống kê — vậy mà nhipDo lại trả về "rat_cham", phán quyết NẶNG NHẤT.
     * Một cuộc điện thoại giữa buổi học là đủ để đóng băng cấp của một từ và
     * bắt học lại. Đo được: 637 lượt bị phạt oan trong một lần chạy 180 ngày.
     *
     * Bỏ đi pha trà, đổi tab, có người gọi — ba cảnh ấy cho ra một con số dài
     * KHÔNG nói gì về trí nhớ. Không có số đo thì không phán.
     */
    if (!(ms > 0)) return "khong_do";
    if (ms >= MS_TOI_DA) return "khong_do";
    const tran = tranCua(duong);
    // So CÙNG MỘT THANG với thống kê: thống kê được xây từ số đã kẹp, mà lúc
    // chấm lại so bằng số thô thì bài nào dài hơn trần cũng thành "rất chậm".
    const msC = Math.min(ms, tran);
    if (tk && tk.n >= DU_MAU) {
      const sd = doLech(tk) || tk.tb * 0.25;     // mọi lượt bằng nhau: lấy tạm 25%
      /*
       * Lệch quá xa mọi lượt khác của chính người này: không tin được, bỏ qua.
       *
       * Phải có CẢ hai chiều. Độ lệch trong thống kê đã bị kẹp ở ±2sd (xem
       * themMau) nên nó co lại khá nhiều; chỉ dùng "tb + 4sd" thì với bài nhặt
       * tập từ — vốn thời gian trải rộng — có tới một phần ba số lượt bị coi là
       * lạc, tức là vứt đi một phần ba tín hiệu. Kèm thêm mốc "gấp ba lần nhịp
       * thường" thì chỉ những lượt thật sự bất thường mới rơi vào đây.
       */
      if (ms > Math.max(tk.tb * 3, tk.tb + 4 * sd)) return "khong_do";
      /*
       * Hai cái CHẶN TUYỆT ĐỐI, học được từ chính bài kiểm.
       *
       * Người bấm rất đều (trung bình 1,4s, độ lệch 0,3s) thì mốc "rất chậm"
       * tương đối rơi vào 1,85s — một thoáng ngập ngừng bình thường đã vượt, và
       * họ bị GIỮ NGUYÊN CẤP oan. Mà "rất chậm" là phán quyết nặng nhất ở đây,
       * nên nó phải cần bằng chứng thật: vừa chậm so với chính mình, VỪA chậm
       * theo nghĩa thông thường. Trả lời trong 2,5 giây thì rõ ràng là đã moi
       * ra được từ, không phải đang mò mẫm.
       *
       * Chiều ngược lại cũng vậy: người trung bình 20 giây mà trả lời trong 12
       * giây thì nhanh HƠN HỌ, nhưng gọi đó là "trôi chảy" rồi nhân giãn cách
       * lên là tự dối.
       */
      /*
       * Mốc tuyệt đối NEO THEO CHÍNH ĐƯỜNG ĐÓ, không phải một con số chung.
       *
       * CHAM_MS = 6000 dùng chung khoá chặt vế "nhanh" của hai bài liên kết:
       * xong một tập 16 ô dưới 6 giây là không thể, nên dù nhanh hơn chính mình
       * bao nhiêu cũng không bao giờ được thưởng. Đo được: chỉ 1,4% lượt đạt
       * "nhanh", trong khi đường nhìn đạt 30%.
       */
      /*
       * Neo = mốc "chậm theo nghĩa thông thường" CỦA CHÍNH LOẠI BÀI ĐÓ.
       *
       * Giữ nguyên tinh thần cũ — "rất chậm" phải cần CẢ HAI bằng chứng: chậm
       * so với chính mình VÀ chậm theo nghĩa thường — nhưng con số thứ hai phải
       * theo loại bài. Với đường nhìn, tran/2,5 = 6.000ms, đúng bằng CHAM_MS cũ,
       * nên người bấm rất đều (1,4s) vẫn không bị 2,5s đẩy thành "rất chậm".
       * Với bài nhặt tập từ thì mốc ấy là 18.000ms, hợp với nền của nó.
       */
      const neo = Math.max(tranCua(duong) / 2.5, tk.tb * 1.6);
      if (msC <= tk.tb - 0.5 * sd) return "nhanh";
      if (msC >= tk.tb + 1.5 * sd && msC >= neo) return "rat_cham";
      if (msC >= tk.tb + 0.5 * sd) return "cham";
      return "vua";
    }
    // Chưa đủ mẫu: mốc tạm, nhưng cũng phải theo NỀN của chính loại bài đó.
    const nen = tran / 6;                        // nhìn ~2,5s · nghe ~4,2s · liên kết ~7,5s
    if (msC <= nen) return "nhanh";
    if (msC >= nen * 4.8) return "rat_cham";
    if (msC >= nen * 2.4) return "cham";
    return "vua";
  }

  /**
   * Hệ số của bản cũ: giãn cách đọc từ thang cố định rồi nhân MỘT LẦN theo
   * nhịp. Không còn dùng để xếp lịch nữa — xem T_NET ngay dưới đây — nhưng vẫn
   * xuất ra vì bộ đo `srs-nhanh-do.mjs` so hai bản bằng chính bảng này.
   */
  const HE_SO = { nhanh: 1.4, vua: 1.0, cham: 0.6, rat_cham: 0.35 };

  /* ------------------------------------------------------------------ */
  /* NẾT của từng từ — thưởng CỘNG DỒN, không phải thưởng một lần        */
  /* ------------------------------------------------------------------ */
  /*
   * Vì sao bỏ cái thang cố định.
   *
   * Bản cũ đọc giãn cách từ thang MOC theo cấp, rồi nhân HE_SO một lần. Nhân
   * xong là quên: lượt sau lại đọc đúng bậc ấy của thang. Đo được: người bấm
   * NHANH bảy lượt liên tiếp nhận 1,4-4,2-9,8-19,6-42-84-168 ngày, còn người
   * bấm bình thường nhận 1-3-7-14-30-60-120. Tỉ lệ giữa hai người là 1,4 ở lượt
   * thứ nhất, và vẫn đúng 1,4 ở lượt thứ bảy. Công sức không tích lại được.
   *
   * Bản này giữ lại chính GIÃN CÁCH VỪA CẤP (`ngay`) và nhân tiếp, nên phần
   * thưởng nằm lại trong lịch và nhân lên theo cấp số nhân. Đo lại: 1,4 →
   * 2,3 lần (lượt 5) → 3,7 lần (lượt 7).
   *
   * Nhưng KHÔNG tin ngay một lượt bấm. Trong một cái lịch chạy đúng, mọi thẻ
   * đều được hỏi lúc còn nhớ khoảng chín phần mười — nên phần lớn chênh lệch
   * thời gian lúc ấy là nhiễu chứ không phải tin. Bản thử "tin ngay" đo được
   * vốn từ −6,5 và tỉ lệ quên +0,9%: nhân nhiễu vào rồi cộng dồn thì nhiễu cũng
   * cộng dồn. Nên mỗi từ giữ một con số `net` riêng, mỗi lượt chỉ kéo nó đi một
   * phần năm quãng đường về phía nhịp vừa đo. Một lượt nhanh ăn may gần như
   * không đổi gì; nhanh đều đặn thì nết lên hẳn và ở lại đó.
   */
  const T_NET = { nhanh: 2.9, vua: 2.1, cham: 1.7, rat_cham: 0.85 };
  /** Nết của một từ chưa có lịch sử: đúng bằng nhịp "vừa". */
  const NET_DAU = 2.1;
  /*
   * Đáy 1,0 — BẤT ĐỐI XỨNG CÓ CHỦ Ý: thưởng thì cộng dồn lên, phạt thì có đáy.
   *
   * Bản thử cho phần phạt cộng dồn xuống (cham = 1,5, đáy 1,05) đo được: sau 8
   * lượt người bấm chậm chỉ còn được hẹn 11 ngày, trong khi thang hôm nay cho
   * họ 72. Đó là phạt người học chậm, không phải thưởng người học nhanh — không
   * ai yêu cầu điều ấy. Đáy 1,0 nghĩa là lượt ĐÚNG không bao giờ làm giãn cách
   * NGẮN LẠI; xấu nhất là nó đứng yên, hỏi lại đúng nhịp cũ cho tới khi khá lên.
   */
  const NET_MIN = 1.0, NET_MAX = 3.0;
  /** Mỗi lượt kéo nết đi bao nhiêu phần quãng đường. Nhỏ = tin chậm, ít nhiễu. */
  const KEO_NET = 0.2;
  /** Trần giãn cách. Một từ nhớ đúng chục lượt liền thì một năm là đủ. */
  const TRAN_NGAY = 365;
  /** Quên thì giãn cách co lại còn ngần này — xấp xỉ tụt hai bậc của thang cũ. */
  const TUT_NGAY = 0.23;
  /*
   * Mức tụt phải theo TỪNG ĐƯỜNG, vì cái giá của một lần tụt tỉ lệ thuận với
   * tần suất quên của chính đường đó.
   *
   * Chú thích ở nhánh "quên" bên dưới đã tính sẵn phần này: leo từ đáy lên cấp
   * cuối mất 11,3 lượt khi tỉ lệ quên 15%, nhưng 17,9 lượt khi tỉ lệ quên 25%.
   * Đường nhìn quên ~12% nên tụt 0,23 là rẻ. Hai bài liên kết quên ~30%, cùng
   * một mức tụt ấy nghĩa là cứ ba lần leo thì vứt đi một lần — bài càng khó
   * càng bị phạt nặng, đúng chiều ngược với điều đáng làm.
   *
   * Đường nhìn giữ nguyên 0,23: nó là đường duy nhất có đủ số đo trong bảng
   * `soDoSrs`, đổi nó đi là mất luôn cái mốc để so.
   */
  const TUT_DUONG = { nhin: 0.23, nghe: 0.34, dong: 0.45, trai: 0.45 };
  /** Người gọi không truyền `duong` thì chạy y như bản cũ. */
  function tutCua(duong) { return TUT_DUONG[duong] || TUT_NGAY; }

  /**
   * Giãn cách lần trước của một đường.
   *
   * Sổ tay đang dùng dở chưa có `ngay` — đọc `lv` rồi tra thang cũ, để không ai
   * bị đá về vạch xuất phát khi cập nhật.
   */
  function ngayCua(cu) {
    if (cu && typeof cu.ngay === "number" && isFinite(cu.ngay) && cu.ngay > 0) return cu.ngay;
    if (cu && typeof cu.lv === "number" && isFinite(cu.lv) && cu.lv >= 0)
      return MOC[Math.min(MOC.length - 1, Math.round(cu.lv))];
    return 0;
  }
  /** Nết đã học được của một đường; mục cũ thì coi như nết trung bình. */
  function netCua(cu) {
    const n = cu && typeof cu.net === "number" && isFinite(cu.net) ? cu.net : NET_DAU;
    return Math.max(NET_MIN, Math.min(NET_MAX, n));
  }
  /**
   * Cấp vẫn được suy ra từ SỐ NGÀY, để mọi chỗ khác trong app đọc y như cũ:
   * chip cấp trên thẻ, gomSrs, đồng bộ Drive, app Android, máy chủ MCP.
   */
  function capTu(ngay) {
    if (!(ngay > 0)) return -1;
    let lv = 0;
    for (let i = 0; i < MOC.length; i++) if (ngay >= MOC[i]) lv = i;
    return lv;
  }

  /* ------------------------------------------------------------------ */
  /* THANG 100 ĐIỂM                                                      */
  /* ------------------------------------------------------------------ */
  /*
   * Vì sao cần con số này, khi đã có `capChung`.
   *
   * `capChung` lấy cấp của ĐƯỜNG YẾU NHẤT. Ý định đúng — một đường liệt thì
   * không gọi là thuộc được — nhưng đem ra HIỂN THỊ thì nó xoá sạch mọi tiến
   * bộ: đo trên 600 từ sau 180 ngày, 331 từ (55%) đứng ở cấp 0 trong khi đường
   * nhìn của chúng trung bình đã cấp 5,16 và nghe 4,52. Người học nhìn vào một
   * từ mình nhận ra tức khắc và thấy "Cấp 1". Không ai học tiếp với cái đó.
   *
   * Nên tách làm hai việc, vì chúng là hai câu hỏi khác nhau:
   *
   *   CON SỐ (0–100) trả lời "tôi đã gửi được bao nhiêu công vào từ này" —
   *   cộng có trọng số, luôn nhích lên khi làm đúng.
   *
   *   NHÃN MỨC TƯ DUY trả lời "tôi đã CHỨNG MINH được tới đâu" — có cổng, và
   *   có thể mãi mãi không mở nếu từ ấy không có dữ liệu để chứng minh.
   *
   * `capChung` và `gomSrs` giữ nguyên không đổi một dòng: đồng bộ Drive, máy
   * chủ MCP, bản cũ chưa cập nhật vẫn đọc y như trước.
   */

  /** Thang 100 điểm của MỘT đường, suy từ giãn cách. */
  const DIEM_TRAN = Math.log(1 + TRAN_NGAY);          // log(366)
  /*
   * Vì sao log chứ không phải chia thẳng.
   *
   * Chia thẳng cho 365 thì cả thang cũ dồn vào một góc: 30 ngày chỉ được 8
   * điểm, 120 ngày được 33. Người học leo được năm bậc mà con số gần như không
   * nhúc nhích.
   *
   * Log thì thang 100 điểm gần như TUYẾN TÍNH theo chính thang MOC đang có:
   *
   *   1ng=12  3ng=23  7ng=35  14ng=46  30ng=58  60ng=70  120ng=81  365ng=100
   *
   * Mỗi bậc MOC ≈ 12 điểm. Nghĩa là con số mới không dựng lên một thang thứ hai
   * cạnh tranh với thang cũ — nó là chính thang cũ, đo liên tục.
   */
  function diemDuong(ngay) {
    if (!(ngay > 0) || !isFinite(ngay)) return 0;
    return Math.round(100 * Math.log(1 + Math.min(TRAN_NGAY, ngay)) / DIEM_TRAN);
  }

  /** Mỗi đường đáng bao nhiêu điểm trong tổng 100. */
  const TRONG = { nhin: 30, nghe: 30, dong: 20, trai: 20 };
  /** Một đường phải giữ được ngần này ngày thì chiều của nó mới coi là ĐẠT. */
  const NGUONG_BAC = 7;                                // ≈ 35 điểm

  /**
   * Ba CHIỀU tư duy. Nhãn đi theo chiều, không theo đường, vì hai bài liên kết
   * cùng đo một thứ: gọi được từ ra giữa đám từ gần nghĩa với nó.
   */
  const CHIEU = [
    { ma: "mat", ten: "mắt", duong: ["nhin"] },
    { ma: "tai", ten: "tai", duong: ["nghe"] },
    { ma: "mang", ten: "mạng nghĩa", duong: ["dong", "trai"] }
  ];
  const TEN_BAC = ["Chưa học", "Mới gặp", "Thuộc mặt chữ", "Nghe ra", "Gọi ra được lúc cần"];

  /**
   * Điểm của cả một từ, trên thang 100 chung cho mọi từ.
   *
   * TRỌNG SỐ CHIA LẠI THEO `duongCo`, KHÔNG PHẢI `duongMo` — hai lý do:
   *
   *   1. Chia theo `duongMo` thì điểm ĐI LÙI. Từ mới chỉ mở đường nhìn, nên nó
   *      chiếm 100% trọng số; tới ngày thứ hai MO_NGAY mở thêm ba đường và
   *      trọng số của nhìn tụt còn 30%. Làm đúng mà điểm giảm là hỏng.
   *
   *   2. Từ THIẾU đường thì vẫn phải lên được 100. Mục lưu từ ảnh chụp không có
   *      câu nguồn, có từ không tra được từ trái nghĩa — đó là chuyện của dữ
   *      liệu, không phải của người học. Một cái trần mà người ta không có nút
   *      nào bấm để nâng lên thì con số thôi không còn nghĩa "tôi thuộc tới
   *      đâu" mà thành "hôm ấy lưu từ có may không", và người ta học cách lờ nó
   *      đi. Đây đúng là lỗi mà `capChung` đang mắc.
   *
   * Phần TRUNG THỰC do `bac` gánh, không phải do cái trần: từ chỉ có đường nhìn
   * có thể đạt 100/100 nhưng KHÔNG BAO GIỜ được gọi là "Nghe ra".
   *
   * @returns {{tong:number, phan:object, bac:number, ten:string, chuaDo:string[]}}
   *   `phan` là điểm từng đường trên thang 100 (null = đường không có).
   *   `chuaDo` là tên những chiều không có dữ liệu để đo.
   */
  function diemTu(muc) {
    const d = (muc && muc.duong) || {};
    const co = duongCo(muc);
    const phan = {};
    let tongTrong = 0;
    for (const t of DUONG) {
      if (co.indexOf(t) < 0) { phan[t] = null; continue; }
      phan[t] = diemDuong(ngayCua(d[t]));
      tongTrong += TRONG[t];
    }
    let tong = 0;
    if (tongTrong > 0)
      for (const t of co) tong += phan[t] * (TRONG[t] / tongTrong);
    tong = Math.max(0, Math.min(100, Math.round(tong)));

    /*
     * Leo thang chiều, BIẾT BỎ QUA chiều không có.
     *
     * Phải bỏ qua, và phải bỏ qua đúng cách — sai ở cả hai phía đều có thật:
     *
     *   Thang cứng (chiều nào vắng cũng chặn) → từ không có câu nguồn nhưng
     *   đồng nghĩa rất mạnh sẽ kẹt mãi ở "Thuộc mặt chữ". Nói THẤP HƠN sự thật.
     *
     *   Coi chiều vắng là đã đạt → từ chỉ có đường nhìn tự nhận "Gọi ra được
     *   lúc cần". Nói QUÁ, và đó là điều tuyệt đối không được phép.
     *
     * Nên: chiều không có thì bước qua và ghi vào `chuaDo`; chiều có mà chưa
     * đạt thì DỪNG. Bậc là chiều ĐẠT sâu nhất — chiều bị bước qua không bao giờ
     * được tính là đã đạt.
     */
    const chuaDo = [];
    const tuTat = !!(muc && muc.mangTat);
    let bac = tong > 0 ? 1 : 0;
    for (let i = 0; i < CHIEU.length; i++) {
      const c = CHIEU[i];
      const cuaChieu = c.duong.filter((t) => co.indexOf(t) >= 0);
      if (!cuaChieu.length) {
        /*
         * VẮNG VÌ TỰ TẮT khác hẳn VẮNG VÌ KHÔNG CÓ DỮ LIỆU.
         *
         * Không tra được từ đồng nghĩa là chuyện của từ điển, người học không
         * có nút nào bấm để sửa — nên chiều ấy bị BƯỚC QUA, và bậc dừng lại ở
         * chiều đạt sâu nhất trước đó. Còn tự tay tắt là một QUYẾT ĐỊNH ("từ
         * này không cần mạng nghĩa"), nên chiều ấy tính là xong.
         *
         * Nói thẳng cái giá: nhãn "Gọi ra được lúc cần" của một từ đã tắt thôi
         * còn bảo đảm là gọi được từ ra giữa đám từ gần nghĩa — nó thành "nhìn
         * và nghe đều chắc". Vì vậy `mangTat` được trả kèm ra ngoài, để chỗ
         * nào hiện bậc cũng nói được là từ này đã tắt.
         */
        if (tuTat && c.ma === "mang") { bac = i + 2; continue; }
        chuaDo.push(c.ten);                                     // không có gì để đo
        continue;
      }
      if (!cuaChieu.every((t) => ngayCua(d[t]) >= NGUONG_BAC)) break;
      bac = i + 2;                                              // 0,1 dành cho chưa học / mới gặp
    }
    return { tong: tong, phan: phan, bac: bac, ten: TEN_BAC[bac],
             chuaDo: chuaDo, mangTat: tuTat };
  }

  /* ------------------------------------------------------------------ */
  /* Chấm một lượt                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Đến hạn vào ĐẦU NGÀY mục tiêu, để hôm sau mở app lúc nào cũng thấy.
   *
   * Cái chốt ở cuối là bắt buộc, không phải phòng xa. Giãn cách có thể co xuống
   * dưới một ngày (rất chậm ở cấp thấp: 1 ngày × 0,35 = 0,35 ngày), mà lùi về
   * đầu ngày thì cái mốc ấy rơi vào QUÁ KHỨ — chấm lúc 10 giờ sáng, hạn thành
   * 0 giờ sáng CÙNG NGÀY. Thẻ lập tức đến hạn lại, và người học gặp đúng nó
   * ngay lượt sau, mãi mãi. Bộ soát bắt được 4 lượt như vậy.
   */
  function hanSauNgay(songay, now) {
    const bayGio = now || Date.now();
    const n = (typeof songay === "number" && isFinite(songay)) ? songay : 1;
    const d = new Date(bayGio + n * NGAY);
    d.setHours(0, 0, 0, 0);
    let h = d.getTime();
    while (h <= bayGio) h += NGAY;          // không bao giờ trả về mốc đã qua
    return h;
  }

  /* ------------------------------------------------------------------ */
  /* RẢI TẢI — làm phẳng ngày nặng, KHÔNG hoãn thẻ nào                   */
  /* ------------------------------------------------------------------ */
  /*
   * Cái mệt không nằm ở trung bình, nó nằm ở NGÀY NẶNG NHẤT: đo được trung bình
   * 125 thẻ/ngày mà có ngày vọt lên 619. Xáo ±10% sẵn có không chữa được, vì nó
   * xáo mù — không biết ngày nào đã đông.
   *
   * ĐÃ THỬ VÀ BỎ: trần số thẻ mỗi ngày, làm phần trễ hạn nhất trước rồi hoãn
   * phần dư sang mai. Nghe rất hợp lý và đó là cách hầu hết app làm, nhưng đo
   * ở MỌI mức trần (50/80/120/200/300) đều ra cùng một kết cục: tồn đọng phình
   * lên ~700 thẻ với sổ 600 từ (~1.900 với sổ 1.500 từ) rồi đứng nguyên ở đó
   * vĩnh viễn, và tỉ lệ nhớ sập từ 68% xuống 8–13%. Cơ chế: thẻ bị hoãn → quá
   * hạn → quên → giãn cách sập về đáy → đến hạn lại ngay → nợ lớn thêm. Vòng
   * xoáy ấy ổn định ở một trạng thái rất tệ chứ không tự thoát ra.
   *
   * Nên rải Ở LÚC XẾP LỊCH thay vì lúc xếp hàng: khi đã chọn được số ngày, nhìn
   * quanh đó xem ngày nào ít thẻ hơn thì hẹn vào ngày ấy. Không thẻ nào bị hoãn
   * quá hạn của nó, nên không mất một điểm tỉ lệ nhớ nào. Đo được đỉnh/trung
   * bình ×3,0 → ×2,5.
   */
  /** Chỉ rải những thẻ hẹn xa hơn ngần này — thẻ hẹn gần thì xê một ngày đã lệch nhiều. */
  const RAI_TOI_THIEU = 3;
  /** Rải trong ±15% quanh ngày đã chọn. Rộng hơn nữa là bắt đầu đổi lịch thật. */
  const RAI_RONG = 0.15;
  const RAI_BUOC = 0.05;

  /**
   * Đếm xem mỗi ngày đã hẹn sẵn bao nhiêu thẻ.
   * @param {Array} dsMuc cả sổ tay
   * @returns {Map<number, number>} khoá là số thứ tự ngày (mốc / NGAY)
   */
  function lichHen(dsMuc) {
    const lich = new Map();
    for (const m of dsMuc || []) {
      if (!m || m.del) continue;
      const d = m.duong || {};
      for (const t of DUONG) {
        const due = d[t] && d[t].due;
        if (!due) continue;
        const k = Math.floor(due / NGAY);
        lich.set(k, (lich.get(k) || 0) + 1);
      }
    }
    return lich;
  }

  /**
   * Chọn mốc đến hạn, né ngày đã đông.
   * @param {number} ngay số ngày giãn cách vừa tính được
   * @param {Map<number,number>|object} [lich] bảng đếm từ `lichHen`; bỏ trống thì không rải
   * @returns {number} mốc đến hạn
   */
  function raiTai(ngay, lich, now) {
    const bayGio = now || Date.now();
    const n = (typeof ngay === "number" && isFinite(ngay)) ? ngay : 1;
    const goc = hanSauNgay(n, bayGio);
    if (!lich || n < RAI_TOI_THIEU) return goc;
    const dem = (mocThoiGian) => {
      const k = Math.floor(mocThoiGian / NGAY);
      return (typeof lich.get === "function" ? lich.get(k) : lich[k]) || 0;
    };
    let tot = goc, it = dem(goc);
    for (let f = 1 - RAI_RONG; f <= 1 + RAI_RONG + 1e-9; f += RAI_BUOC) {
      const ung = hanSauNgay(n * f, bayGio);
      const c = dem(ung);
      if (c < it) { it = c; tot = ung; }          // hoà thì giữ ngày gốc
    }
    return tot;
  }

  /**
   * Chấm một lượt ôn trên MỘT đường.
   *
   * @param {{lv:number}|null} cu trạng thái cũ của đường đó
   * @param {boolean} nho bấm Nhớ hay bấm Quên
   * @param {number} ms thời gian truy xuất; 0 = không đo được
   * @param {{n,tb,m2}} [tk] thống kê thời gian của đường đó
   * @param {number} [now]
   * @returns {{duong:{lv,due,ts,ms}, tk:object, nhip:string, ngay:number}}
   */
  /** Quên mấy lần LIÊN TIẾP thì mới coi là "chưa vào đầu" và học lại từ đáy. */
  const SAI_VE_DAY = 3;

  /*
   * TRỤC THỨ HAI: làm ĐÚNG ĐƯỢC BAO NHIÊU PHẦN.
   *
   * Bài nhìn và bài nghe chỉ có nhớ/quên, nên trục này bằng 1 và không đổi gì.
   * Hai bài liên kết thì khác: nhặt đủ 3/3 từ đồng nghĩa và nhặt được 1/2 từ
   * trái nghĩa đều là "qua bài", nhưng rõ ràng không phải cùng một mức hiểu.
   *
   * Bản trước quy phần thiếu ấy thành "chậm hơn" (`ms / điểm`) rồi thả vào bộ
   * đo thời gian. Làm thế thì bộ hiệu chỉnh nhịp bấm của đường đó học phải một
   * con số không phải thời gian: 83% lượt ĐÚNG bị chấm "rất chậm". Nên giờ tách
   * hẳn ra một hệ số riêng, chỉ nhân vào GIÃN CÁCH, không đụng tới `tk` và
   * không đụng tới nhịp.
   *
   * Dưới sàn `SAN_DAT` (0,5) thì đã là QUÊN rồi, không vào đây. Nên khoảng có
   * thật của `chat` là 0,5..1.
   *
   * ĐÁY 0,75, KHÔNG PHẢI 0,45 — sửa một lỗi tự mâu thuẫn của chính tệp này.
   *
   * Tệp này đã tự đặt ra một nguyên tắc ở chỗ NET_MIN (xem chú thích "BẤT ĐỐI
   * XỨNG CÓ CHỦ Ý"): "lượt ĐÚNG không bao giờ làm giãn cách NGẮN LẠI; xấu nhất
   * là nó đứng yên". Trục nhịp bấm tuân thủ nhờ NET_MIN = 1,0. Nhưng trục chất
   * lượng thì bị bỏ quên: đáy 0,45 nghĩa là nhặt đúng một nửa — VẪN LÀ QUA BÀI
   * — mà giãn cách bị cắt hơn một nửa. Nhặt 3/4 cũng đã ×0,73.
   *
   * Hậu quả đo được trên 600 từ / 180 ngày: mười lượt ĐÚNG liên tiếp chỉ đưa
   * hai bài liên kết tới 32 ngày, trong khi đường nhìn đã chạm trần 365. Chúng
   * không lớn lên được nên đến hạn liên tục, và chiếm 83% toàn bộ hàng đợi
   * (đồng 42,5% · trái 41,3%) trong khi đường nhìn chỉ 5,8%. Đó chính là cảm
   * giác "từ vựng dồn lên rất nhiều".
   *
   * Đáy 0,75 giữ nguyên phần phân biệt — nhặt đủ vẫn hơn nhặt một nửa 33% — chỉ
   * là không còn đặt nó lên một cái nền không thể lớn lên. Đo lại: 125 → 112
   * thẻ/ngày, giãn cách hai bài liên kết 157 → 216 ngày.
   *
   * ĐÃ THỬ VÀ BỎ: nhân thêm hệ số nới riêng cho bài khó (nghe ×1,5, liên kết
   * ×2,0). Nghe thì hợp lý — bài khó nên hỏi thưa hơn — nhưng đo trên mô hình
   * trí nhớ đã chỉnh cho khớp tỉ lệ nhớ thật của app thì nó phản tác dụng: tỉ
   * lệ nhớ tụt 76% → 58%, và vì quên nhiều hơn nên số thẻ mỗi ngày LẠI TĂNG
   * (125 → 130). Lịch chạy nhanh hơn trí nhớ thì mỗi lần trượt lại kéo giãn
   * cách về đáy, và phần "nới" ấy quay lại thành việc phải làm. Nới ×1,35 cũng
   * mất 6 điểm tỉ lệ nhớ để đổi lấy 4 thẻ/ngày. Muốn hỏi thưa hơn thì phải để
   * giãn cách tự lớn lên bằng cách thôi phạt oan, không phải nhân thêm.
   */
  const CHAT_SAN = 0.5;
  const CHAT_DAY = 0.75;

  /**
   * @param {number} [chat] 0..1 — làm đúng được mấy phần. Bỏ trống = 1 (bài chỉ
   *   có nhớ/quên thì không có gì để trừ).
   */
  function heChatLuong(chat) {
    if (typeof chat !== "number" || !isFinite(chat)) return 1;
    const c = Math.max(0, Math.min(1, chat));
    if (c >= 1) return 1;
    if (c <= CHAT_SAN) return CHAT_DAY;
    return CHAT_DAY + (c - CHAT_SAN) / (1 - CHAT_SAN) * (1 - CHAT_DAY);
  }

  /**
   * @param {string} [duong] tên đường, để chấm theo đúng nền của loại bài đó
   * @param {number} [xao] 0..1 — số ngẫu nhiên để xáo nhẹ giãn cách; bỏ trống
   *   thì không xáo (bài kiểm cần kết quả lặp lại được)
   * @param {number} [chat] 0..1 — làm đúng được mấy phần (xem heChatLuong)
   * @param {Map<number,number>} [lich] bảng đếm thẻ theo ngày (xem `lichHen`) để
   *   né ngày đã đông; bỏ trống thì hẹn đúng ngày tính ra
   */
  function cham(cu, nho, ms, tk, now, duong, xao, chat, lich) {
    const bayGio = now || Date.now();
    /*
     * `ngayCua`/`netCua` đều tự kẹp về khoảng hợp lệ. Bắt buộc, không phải
     * phòng xa: số ĐỌC TỪ KHO có thể là NaN hay ngoài thang — sổ tay đồng bộ từ
     * máy khác, bản cũ, một lượt sửa tay. Không kẹp thì giãn cách thành NaN,
     * `due` thành NaN, và mục hỏng vĩnh viễn mà không có gì báo.
     */
    if (!nho) {
      /*
       * Quên thì giãn cách CO LẠI CÒN GẦN MỘT PHẦN TƯ, không về đáy ngay
       * (xấp xỉ tụt hai bậc của thang cũ).
       *
       * Về đáy là một cú đi bộ ngẫu nhiên có hấp thụ: mỗi lượt trượt xoá sạch
       * mọi lượt đúng trước đó, nên thang bảy bậc gần như không ai leo tới
       * cuối. Đo trên bản cũ: 53.112 lượt kết thúc ở cấp 0, chỉ 31 lượt tới cấp
       * 6, và giãn cách trung bình thực sự được cấp là 1,7 ngày trên một thang
       * lên tới 120 ngày.
       *
       * Tính thuần xác suất, để leo từ đáy lên cấp cuối với tỉ lệ quên 15%:
       * về đáy mất 14,1 lượt, tụt 2 bậc mất 11,3 (−20%). Tỉ lệ quên 25% thì
       * 26,0 so với 17,9 (−31%).
       *
       * Nhưng trượt BA LẦN LIÊN TIẾP thì đúng là từ ấy chưa vào đầu thật, lúc
       * đó học lại từ đáy mới phải.
       */
      const sai = ((cu && cu.sai) || 0) + 1;
      const ngay = sai >= SAI_VE_DAY
        ? 0
        : Math.round(Math.max(0, ngayCua(cu) * tutCua(duong)) * 100) / 100;
      // Nết cũng bị kéo về đáy, nhưng vẫn là kéo DẦN: một lượt quên không xoá
      // sạch mọi bằng chứng trước đó, y như giãn cách không về đáy ngay.
      const netCu = netCua(cu);
      const net = Math.max(NET_MIN, netCu + KEO_NET * (NET_MIN - netCu));
      // KHÔNG đưa thời gian của lượt quên vào thống kê — nó đo lúc bỏ cuộc,
      // không đo lúc truy xuất.
      return {
        duong: { lv: capTu(ngay), ngay: ngay, net: Math.round(net * 1000) / 1000,
                 sai: sai, due: bayGio, ts: bayGio, ms: 0 },
        tk: tk || { n: 0, tb: 0, m2: 0 },
        nhip: "quen", ngay: 0
      };
    }

    const nhip = nhipDo(ms, tk, duong);
    /*
     * Kéo nết về phía nhịp vừa đo.
     *
     * "khong_do" KHÔNG kéo gì cả: không có số đo không phải là bằng chứng yếu,
     * và cũng không phải bằng chứng mạnh. Lượt ấy vẫn được cấp giãn cách mới
     * theo nết đang có, chỉ là không học được gì thêm về từ này.
     *
     * "rat_cham" kéo về 0,85 — dưới 1. Moi mãi mới ra thì đó là moi chứ không
     * phải nhớ; nết tụt, và nếu tụt tới đáy thì giãn cách đứng yên chứ không
     * lớn lên nữa.
     */
    let net = netCua(cu);
    if (nhip !== "khong_do") net = net + KEO_NET * (T_NET[nhip] - net);
    net = Math.max(NET_MIN, Math.min(NET_MAX, net));
    /*
     * Xáo nhẹ ±10%.
     *
     * Giãn cách cố định làm cả một lứa từ học cùng ngày rơi đúng vào cùng một
     * ngày mãi mãi — đo được ngày nặng nhất 659 lượt trong khi trung bình 431.
     * Xáo một chút thì cùng khối lượng ấy trải ra, và người học không gặp cảnh
     * "hôm nay sao nhiều thế".
     */
    const heXao = (typeof xao === "number" && isFinite(xao)) ? (0.9 + (xao % 1) * 0.2) : 1;
    const heChat = heChatLuong(chat);
    /*
     * Từ chưa có lịch sử thì bắt đầu từ một ngày, chia theo nết để lượt đầu
     * cũng đã phân biệt được nhanh/chậm. Từ đã có lịch sử thì NHÂN TIẾP vào
     * chính giãn cách vừa rồi — đây là chỗ phần thưởng tích lại.
     */
    const goc = ngayCua(cu);
    /*
     * Kẹp TÍCH của hai trục ở NET_MIN, không phải kẹp riêng từng trục.
     *
     * NET_MIN = 1,0 giữ cho trục nhịp không bao giờ co giãn cách lại. Nhưng
     * trục chất lượng nhân vào SAU đó, nên hai trục cùng chạm đáy thì lại co:
     * net 1,0 × heChat 0,75 = 0,675, tức là trả lời ĐÚNG mà giãn cách mất một
     * phần ba. Bộ kiểm bắt được đúng cảnh này.
     *
     * Kẹp cái tích lại thì nguyên tắc được giữ trọn cho cả hai trục: lượt ĐÚNG
     * xấu nhất là ĐỨNG YÊN. Phần phân biệt nhặt đủ / nhặt một nửa vẫn còn
     * nguyên ở khoảng giữa — nết 2,1 thì 2,1 so với 1,58 — chỉ cái đáy là
     * không được phép thủng.
     */
    const heNet = Math.max(NET_MIN, net * heChat);
    const tho = goc > 0 ? goc * heNet : (MOC[0] * heNet) / NET_DAU;
    // `heChat` đã nằm trong `heNet` rồi — nhân lần nữa ở đây là phạt hai lần.
    const ngay = Math.min(TRAN_NGAY,
      Math.round(Math.max(0.25, tho * heXao) * 100) / 100);
    const lv = capTu(ngay);
    return {
      duong: { lv: lv, ngay: ngay, net: Math.round(net * 1000) / 1000,
               sai: 0, due: raiTai(ngay, lich, bayGio), ts: bayGio, ms: Math.round(ms) || 0 },
      // Không đo được thì cũng không cho vào bộ hiệu chỉnh — nó không phải một
      // lượt truy xuất.
      tk: nhip === "khong_do" ? (tk || { n: 0, tb: 0, m2: 0 }) : themMau(tk, ms, duong),
      nhip: nhip, ngay: ngay
    };
  }

  /* ------------------------------------------------------------------ */
  /* Cấp của cả từ                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Những đường mà mục này THẬT SỰ có. Không có câu nguồn thì không có đường
   * nghe; không tra được từ đồng nghĩa thì không có đường đồng nghĩa. Tính một
   * đường không tồn tại là "chưa học" thì mục nào cũng mãi mãi ở cấp 0.
   */
  function duongCo(muc) {
    const ds = ["nhin"];
    if (muc && muc.cauNghe && muc.cauNghe.cau) ds.push("nghe");
    /*
     * `mangTat` — người học TỰ TAY tắt bài mạng nghĩa cho từ này.
     *
     * Chặn ở đây chứ không đi xoá `lien`, và đó là toàn bộ điểm khác nhau giữa
     * công tắc này với nút × bỏ từng từ. Nút × bỏ CẢ HAI CHIỀU theo thiết kế,
     * nên dùng nó để tắt bài cho một từ là đi phá tập liên kết của mọi từ hàng
     * xóm. Còn cờ này chỉ nói về ĐÚNG mục đang mang nó: từ bên kia vẫn kể tên
     * nó, bài của từ bên kia vẫn chạy, cụm ôn kèm vẫn xếp hai từ cạnh nhau.
     *
     * Một chỗ chặn là xong cả chuỗi: `duongMo` → `denHan` thôi hỏi hai bài ấy,
     * `diemTu` chia lại trọng số trên đúng những đường còn mở.
     */
    if (!(muc && muc.mangTat)) {
      const l = (muc && muc.lien) || {};
      if ((l.dong || []).length >= 2) ds.push("dong");
      if ((l.trai || []).length >= 1) ds.push("trai");
    }
    return ds;
  }

  /** Đường "nhin" phải lên tới cấp này thì các đường khác mới mở. */
  const MO_DUONG = 1;
  /*
   * Nhưng cái chốt THẬT sự là SỐ NGÀY, không phải bậc.
   *
   * Cấp giờ được suy ra từ giãn cách, mà giãn cách lớn lên liên tục chứ không
   * nhảy bậc, nên nếu vẫn chốt bằng "cấp ≥ 1" (tức ≥ 3 ngày) thì các đường
   * nghe / đồng nghĩa / trái nghĩa mở MUỘN hơn trước một lượt ôn. Đúng ngược
   * với điều đang muốn: mạng nơ-ron đồng nghĩa là chỗ để mở rộng vốn từ nhanh,
   * càng mở sớm càng tốt — miễn là đừng sớm tới mức hỏi từ đồng nghĩa của một
   * từ vừa mới nhìn thấy đúng một lần.
   *
   * Hai ngày = hai lượt nhìn đúng, đúng bằng thời điểm bản cũ mở. Không sớm
   * hơn, không muộn hơn.
   */
  const MO_NGAY = 2;

  /**
   * Những đường ĐÃ MỞ của một mục — tức là những đường thật sự được đem ra hỏi.
   *
   * Một từ vừa lưu xong mà bung ra bốn kiểu bài cùng lúc thì số lượt ôn nhân
   * lên gấp bốn ngay ngày đầu, và người ta bỏ app trong hai tuần. Nên: nhìn
   * chữ nhận ra được đã, rồi mới tới nghe, rồi mới tới liên kết. Đây chính là
   * "thứ tự dữ liệu" — mở dần theo sức, áp cho từng từ một.
   */
  function duongMo(muc) {
    const co = duongCo(muc);
    const d = (muc && muc.duong) || {};
    if (ngayCua(d.nhin) < MO_NGAY) return ["nhin"];
    return co;
  }

  /**
   * Cấp chung của một mục = cấp của đường YẾU NHẤT đang có.
   * @returns {number} -1 nếu chưa học đường nào
   */
  function capChung(muc) {
    const d = (muc && muc.duong) || {};
    let min = null;
    for (const ten of duongMo(muc)) {
      const lv = (d[ten] && typeof d[ten].lv === "number") ? d[ten].lv : -1;
      if (min === null || lv < min) min = lv;
    }
    return min === null ? -1 : min;
  }

  /**
   * Bản `srs` gộp, để mọi thứ đang đọc `srs` — đồng bộ Drive, app Android, máy
   * chủ MCP, bản extension cũ chưa cập nhật — vẫn thấy một con số hợp lý.
   *
   * `due` lấy mốc SỚM NHẤT trong các đường: còn một đường tới hạn thì cả mục là
   * tới hạn. `ts` lấy mốc MUỘN NHẤT: đó là lần chấm gần đây nhất, và Muc.gopSrs
   * dùng nó để quyết bên nào thắng lúc gộp hai máy.
   */
  function gomSrs(muc) {
    const d = (muc && muc.duong) || {};
    const ten = duongMo(muc);
    let due = null, ts = 0, coGi = false;
    for (const t of ten) {
      const x = d[t];
      if (!x) { due = 0; continue; }              // đường chưa học: tới hạn ngay
      coGi = true;
      if (due === null || (x.due || 0) < due) due = x.due || 0;
      if ((x.ts || 0) > ts) ts = x.ts;
    }
    if (!coGi) return null;
    return { lv: capChung(muc), due: due === null ? 0 : due, ts: ts };
  }

  /**
   * Những đường đang tới hạn của một mục.
   * @returns {string[]} rỗng nghĩa là chưa tới lượt mục này
   */
  function denHan(muc, now) {
    /*
     * `dongBang` — "từ này tôi thấy mình thuộc rồi, cất đi".
     *
     * CHẶN Ở ĐÂY, TUYỆT ĐỐI KHÔNG Ở `duongMo`. `duongMo` còn nuôi `capChung`
     * và `gomSrs`; bịt nó thì từ đóng băng báo `lv: -1` / `null` ra đồng bộ
     * Drive, máy chủ MCP và bản extension cũ — tức là "CHƯA HỌC BAO GIỜ", và
     * một lượt gộp hai máy là mất sạch tiến độ. Điểm phải đứng yên đúng chỗ
     * người ta bấm đóng băng.
     *
     * Và vì `due` không hề bị đụng tới, gỡ băng ra là mọi đường đã quá hạn
     * tới hạn lại NGAY — đúng cái người ta muốn, không cần thêm dòng nào.
     */
    if (muc && muc.dongBang) return [];
    const bayGio = now || Date.now();
    const d = (muc && muc.duong) || {};
    const ra = [];
    for (const t of duongMo(muc)) {
      const x = d[t];
      if (!x || !x.due || x.due <= bayGio) ra.push(t);
    }
    return ra;
  }

  /**
   * Hồ sơ trí nhớ để hiện ra cho người học: mỗi đường một tỉ lệ 0–100.
   *
   * Cố ý KHÔNG gọi là "đã thuộc bao nhiêu phần trăm" — nó là vị trí trên thang
   * giãn cách, tức là "đã giữ được bao lâu", chứ không phải xác suất nhớ.
   */
  /*
   * Giờ đọc thẳng từ `diemTu` chứ không tự tính lấy một thang riêng.
   *
   * Bản cũ là (lv+1)/7*100 — một cầu thang bảy bậc. Để nguyên thì cùng một từ
   * có hai con số khác nhau tuỳ chỗ hỏi: chip trên thẻ nói 46, hồ sơ nói 57.
   * Một thang thôi, một chỗ tính thôi.
   */
  function hoSo(muc) {
    return diemTu(muc).phan;
  }

  /**
   * Tốc độ phát câu nghe, theo cấp của chính đường nghe.
   *
   * BẮT ĐẦU TỪ ×1,0 — tức tốc độ bình thường, không có bậc chậm nào nữa.
   *
   * Thang cũ khởi từ ×0,8 cho "nghe ra từng chữ". Nghe thì xuôi, dùng thì chán:
   * giọng máy ở 0,8 kéo dài từng âm nghe rất ể, mà từ mới thì lúc nào cũng ở cấp
   * thấp — nên gần như mọi lượt nghe đầu tiên của mọi từ đều rơi vào đúng cái
   * bậc khó chịu nhất.
   *
   * Lên cấp thì đẩy dần về tốc độ người Nhật nói thật — nghe mãi ở tốc độ chậm
   * thì ra đời gặp tốc độ thật vẫn điếc. Chặn trên 1,5 vì quá đó giọng máy méo
   * tới mức không còn giống tiếng người.
   */
  const TOC_DAU = 1.0;
  function tocDoNghe(lv) {
    const n = (typeof lv === "number" && isFinite(lv)) ? lv : -1;   // NaN vào thì NaN ra
    return Math.min(1.5, Math.round((TOC_DAU + Math.max(0, n + 1) * 0.1) * 100) / 100);
  }

  /* ------------------------------------------------------------------ */
  /* SỐ ĐO THẬT CỦA CHÍNH NGƯỜI HỌC                                       */
  /* ------------------------------------------------------------------ */
  /**
   * Mọi con số giãn cách trong tệp này — 1, 3, 7, 14, 30, 60, 120 — là thang
   * tôi chọn, không phải đo từ anh. Tôi đã thử ba cách tính lịch khác nhau và
   * cả ba đều thua trên mô hình mô phỏng của mình; nghĩa là mô phỏng ấy không
   * đủ tư cách chọn hộ. Chỉ có dữ liệu thật mới chọn được.
   *
   * Nên app ghi lại đúng hai thứ, sau MỖI lượt ôn:
   *   - app đã hẹn bao nhiêu ngày, ở cấp nào, đường nào
   *   - tới lúc gặp lại, có nhớ không
   *
   * Gộp thành một bảng đếm nhỏ, khoá là "đường|cấp":
   *   { n: số lượt, nho: số lượt nhớ được, ngay: tổng số ngày đã chờ }
   *
   * Từ đó đọc thẳng ra: "ở cấp 4, khi thực sự chờ 31 ngày, tôi nhớ được 62%".
   * Đó là tỉ lệ nhớ THẬT của anh ở đúng bậc thang ấy — thứ duy nhất nói được
   * bậc ấy đang quá dài hay quá ngắn. Cả bảng chỉ vài chục con số nguyên, nhẹ
   * hơn một mục sổ tay, nên đồng bộ và sao lưu không tốn gì.
   *
   * CHỈ GHI, CHƯA DÙNG ĐỂ QUYẾT ĐỊNH. Vài tuần nữa, khi mỗi ô có đủ mẫu, lúc đó
   * mới chỉnh thang — và chỉnh bằng số của anh, không phải bằng phỏng đoán của
   * tôi.
   *
   * @param {object} soDo bảng đếm hiện có
   * @param {string} duong
   * @param {number} lvTruoc cấp TRƯỚC lượt chấm này — tức bậc thang vừa được
   *   đem ra thử. Lấy cấp sau thì đo nhầm sang bậc chưa hề chờ ngày nào.
   * @param {number} ngayCho số ngày thực sự đã trôi qua kể từ lượt trước
   * @param {boolean} nho
   */
  /**
   * Dưới ngần này ngày thì lượt ấy KHÔNG phải một phép thử trí nhớ.
   *
   * Bậc ngắn nhất của thang là 1 ngày, còn lượt học lại trong cùng buổi chỉ
   * cách nhau vài chục giây. Đếm cả chúng vào thì bảng số đo đầy những lượt
   * "chờ 0 ngày, nhớ được" — và tỉ lệ nhớ của mọi bậc bị kéo lên, đúng hướng
   * làm ta tưởng thang đang vừa vặn trong khi nó không vừa. Bài kiểm tích hợp
   * bắt được đúng cảnh này: một lượt học lại ngay trong buổi lọt vào bảng với
   * ngay = 0.
   */
  const NGAY_TOI_THIEU_DO = 0.4;

  /*
   * MỖI MÁY MỘT NHÁNH RIÊNG — bắt buộc, vì đây là những con số CỘNG DỒN.
   *
   * Sổ tay gộp được bằng "bản mới hơn thắng" vì mỗi mục có một trạng thái duy
   * nhất. Bảng số đo thì không: máy A đo 10 lượt, máy B đo 5 lượt, tổng thật là
   * 15 — không bên nào "thắng" được bên nào.
   *
   * Mà cộng thẳng hai bên lại cũng sai: đồng bộ xong thì cả hai máy cùng giữ
   * 15, lượt đồng bộ sau cộng tiếp thành 30. Đếm lại chính mình.
   *
   * Nên mỗi máy chỉ ghi vào NHÁNH CỦA NÓ, gộp là lấy nguyên từng nhánh, và
   * tổng chỉ được cộng lúc ĐỌC. Đồng bộ bao nhiêu lần cũng ra cùng một con số.
   *
   * @param {string} [may] mã máy; bỏ trống thì dồn vào nhánh "may" chung
   */
  function ghiSoDo(soDo, duong, lvTruoc, ngayCho, nho, may) {
    const b = nhanhHoa(soDo);
    // Lượt đầu của một đường, hoặc lượt học lại ngay trong buổi: không đo được.
    if (!(ngayCho >= NGAY_TOI_THIEU_DO) || !duong) return b;
    const m = may || "may";
    const nhanh = b[m] || (b[m] = {});
    const lv = Math.max(-1, Math.min(MOC.length - 1, Math.round(lvTruoc)));
    const k = duong + "|" + lv;
    const o = nhanh[k] || { n: 0, nho: 0, ngay: 0 };
    nhanh[k] = { n: o.n + 1, nho: o.nho + (nho ? 1 : 0),
                 ngay: Math.round((o.ngay + ngayCho) * 100) / 100 };
    return b;
  }

  /** Khoá của bảng đếm trông như "nhin|3" — dùng để nhận ra bản phẳng đời cũ. */
  function laKhoaDo(k) { return /^[a-z_]+\|-?\d+$/.test(k); }

  /**
   * Đưa bản PHẲNG đời cũ ({"nhin|3": …}) về dạng có nhánh ({may: {"nhin|3": …}}).
   *
   * Số đo cũ đã có trên máy người dùng rồi; vứt đi là vứt đúng thứ duy nhất nói
   * được thang giãn cách có hợp với họ không. Dồn hết vào nhánh "cu".
   */
  function nhanhHoa(soDo) {
    const b = (soDo && typeof soDo === "object") ? soDo : {};
    const phang = Object.keys(b).filter(laKhoaDo);
    if (!phang.length) return b;
    const ra = {}, cu = {};
    for (const k of Object.keys(b)) { if (laKhoaDo(k)) cu[k] = b[k]; else ra[k] = b[k]; }
    ra.cu = gopDo(ra.cu, cu);
    return ra;
  }

  /** Cộng hai bảng đếm lại với nhau. */
  function gopDo(a, b) {
    const ra = {};
    for (const src of [a || {}, b || {}])
      for (const k of Object.keys(src)) {
        const x = ra[k] || { n: 0, nho: 0, ngay: 0 }, y = src[k] || {};
        ra[k] = { n: (x.n || 0) + (y.n || 0), nho: (x.nho || 0) + (y.nho || 0),
                  ngay: Math.round(((x.ngay || 0) + (y.ngay || 0)) * 100) / 100 };
      }
    return ra;
  }

  /**
   * Gộp bảng số đo của hai máy: giữ nguyên từng nhánh, KHÔNG cộng.
   *
   * Nhánh nào chỉ có ở một bên thì lấy nguyên; nhánh có ở cả hai thì lấy bên
   * đếm được NHIỀU HƠN — cùng một máy thì bảng của nó chỉ có lớn lên, nên bên
   * nhiều hơn chính là bên mới hơn.
   */
  function tronSoDo(a, b) {
    const A = nhanhHoa(a), B = nhanhHoa(b), ra = {};
    for (const m of Object.keys(A).concat(Object.keys(B))) {
      if (ra[m]) continue;
      const x = A[m], y = B[m];
      if (!x) { ra[m] = y; continue; }
      if (!y) { ra[m] = x; continue; }
      const dem = (o) => Object.keys(o || {}).reduce((t, k) => t + ((o[k] || {}).n || 0), 0);
      ra[m] = dem(y) > dem(x) ? y : x;
    }
    return ra;
  }

  /**
   * Đọc bảng đếm ra dạng người nhìn được.
   * @returns {Array<{duong,lv,n,nho,tyLe,ngayTB,duMau}>} xếp theo đường rồi cấp
   */
  function docSoDo(soDo) {
    // Cộng mọi nhánh máy lại — đây là chỗ DUY NHẤT được phép cộng. Xem ghiSoDo.
    const n = nhanhHoa(soDo);
    let b = {};
    for (const m of Object.keys(n)) b = gopDo(b, n[m]);
    const ra = [];
    for (const k of Object.keys(b)) {
      const p = k.split("|");
      const o = b[k] || {};
      if (!o.n) continue;
      ra.push({
        duong: p[0], lv: parseInt(p[1], 10),
        n: o.n, nho: o.nho,
        tyLe: Math.round(o.nho / o.n * 1000) / 10,
        ngayTB: Math.round(o.ngay / o.n * 10) / 10,
        // Dưới ngần này thì con số còn là nhiễu, đừng vội tin.
        duMau: o.n >= DU_SO_DO
      });
    }
    ra.sort((x, y) => DUONG.indexOf(x.duong) - DUONG.indexOf(y.duong) || x.lv - y.lv);
    return ra;
  }
  /** Đủ ngần này lượt ở một bậc thì tỉ lệ nhớ mới đáng đem ra chỉnh thang. */
  const DU_SO_DO = 30;

  goc.Srs = {
    DUONG, TEN_DUONG, MOC, NGAY,
    DU_MAU, NHANH_MS, CHAM_MS, RAT_CHAM_MS, MS_TOI_DA, MS_TOI_THIEU, MS_THONG_KE, HE_SO, MO_DUONG, MO_NGAY,
    themMau, doLech, heSoBienThien, nhipDo, cham,
    ghiSoDo, docSoDo, tronSoDo, gopDo, nhanhHoa, DU_SO_DO, TRAN_TK, SAI_VE_DAY, NGAY_TOI_THIEU_DO,
    heChatLuong, CHAT_SAN, CHAT_DAY,
    T_NET, NET_DAU, NET_MIN, NET_MAX, KEO_NET, TRAN_NGAY, TUT_NGAY, TUT_DUONG, tutCua,
    ngayCua, netCua, capTu,
    diemDuong, diemTu, TRONG, NGUONG_BAC, TEN_BAC, CHIEU,
    lichHen, raiTai, RAI_TOI_THIEU, RAI_RONG,
    duongCo, duongMo, capChung, gomSrs, denHan, hoSo, hanSauNgay,
    tocDoNghe
  };
})(typeof self !== "undefined" ? self : this);
