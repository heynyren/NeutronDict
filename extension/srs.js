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

  function themMau(tk, ms) {
    const cu = tk && typeof tk.n === "number" ? tk : { n: 0, tb: 0, m2: 0 };
    if (!(ms >= MS_TOI_THIEU && ms <= MS_TOI_DA)) return cu;   // lượt rác: bỏ
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

  const DU_MAU = 5;              // đủ mẫu thì bỏ mốc cứng, so với chính mình
  const NHANH_MS = 2500;         // mốc tạm lúc chưa đủ mẫu — lựa chọn kỹ thuật
  const CHAM_MS = 6000;
  const RAT_CHAM_MS = 12000;

  /**
   * Lượt trả lời này nhanh, vừa, chậm hay rất chậm.
   * @param {number} ms thời gian từ lúc hiện đề tới lúc bấm
   * @param {{n,tb,m2}} [tk] thống kê của chính người học trên chính đường này
   * @returns {"nhanh"|"vua"|"cham"|"rat_cham"}
   */
  function nhipDo(ms, tk) {
    if (!(ms > 0)) return "vua";                 // không đo được thì đừng đoán
    if (ms >= MS_TOI_DA) return "rat_cham";
    if (tk && tk.n >= DU_MAU) {
      const sd = doLech(tk) || tk.tb * 0.25;     // mọi lượt bằng nhau: lấy tạm 25%
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
      if (ms <= tk.tb - 0.5 * sd && ms <= CHAM_MS) return "nhanh";
      if (ms >= tk.tb + 1.5 * sd && ms >= CHAM_MS) return "rat_cham";
      if (ms >= tk.tb + 0.5 * sd) return "cham";
      return "vua";
    }
    if (ms <= NHANH_MS) return "nhanh";
    if (ms >= RAT_CHAM_MS) return "rat_cham";
    if (ms >= CHAM_MS) return "cham";
    return "vua";
  }

  /** Giãn cách được nhân lên hay co lại theo nhịp trả lời. */
  const HE_SO = { nhanh: 1.4, vua: 1.0, cham: 0.6, rat_cham: 0.35 };

  /* ------------------------------------------------------------------ */
  /* Chấm một lượt                                                       */
  /* ------------------------------------------------------------------ */

  /** Đến hạn vào ĐẦU NGÀY mục tiêu, để hôm sau mở app lúc nào cũng thấy. */
  function hanSauNgay(songay, now) {
    const d = new Date((now || Date.now()) + songay * NGAY);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
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
  function cham(cu, nho, ms, tk, now) {
    const bayGio = now || Date.now();
    const lvCu = (cu && typeof cu.lv === "number") ? cu.lv : -1;

    if (!nho) {
      // Quên thì y như cũ: về đầu, học lại ngay trong buổi. KHÔNG đưa thời gian
      // của lượt quên vào thống kê — nó đo lúc bỏ cuộc, không đo lúc truy xuất.
      return {
        duong: { lv: -1, due: bayGio, ts: bayGio, ms: 0 },
        tk: tk || { n: 0, tb: 0, m2: 0 },
        nhip: "quen", ngay: 0
      };
    }

    const nhip = nhipDo(ms, tk);
    // Rất chậm mà vẫn ra được thì đó là moi ra chứ không phải nhớ ra: cho ở lại
    // cấp cũ và gặp lại sớm. Lên cấp lúc này là tự dối mình.
    const lv = nhip === "rat_cham"
      ? Math.max(0, lvCu)
      : Math.min(lvCu + 1, MOC.length - 1);
    const ngay = Math.round(Math.max(0.25, MOC[lv] * HE_SO[nhip]) * 100) / 100;
    return {
      duong: { lv: lv, due: hanSauNgay(ngay, bayGio), ts: bayGio, ms: Math.round(ms) || 0 },
      tk: themMau(tk, ms),
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
    const l = (muc && muc.lien) || {};
    if ((l.dong || []).length >= 2) ds.push("dong");
    if ((l.trai || []).length >= 1) ds.push("trai");
    return ds;
  }

  /** Đường "nhin" phải lên tới cấp này thì các đường khác mới mở. */
  const MO_DUONG = 1;

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
    const lvNhin = (d.nhin && typeof d.nhin.lv === "number") ? d.nhin.lv : -1;
    if (lvNhin < MO_DUONG) return ["nhin"];
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
  function hoSo(muc) {
    const d = (muc && muc.duong) || {};
    const co = duongCo(muc);
    const ra = {};
    for (const t of DUONG) {
      if (co.indexOf(t) < 0) { ra[t] = null; continue; }   // đường không có
      const lv = (d[t] && typeof d[t].lv === "number") ? d[t].lv : -1;
      ra[t] = lv < 0 ? 0 : Math.round(((lv + 1) / MOC.length) * 100);
    }
    return ra;
  }

  /**
   * Tốc độ phát câu nghe, theo cấp của chính đường nghe.
   *
   * Cấp thấp thì chậm để nghe ra từng chữ; lên cấp thì đẩy dần về tốc độ người
   * Nhật nói thật — nghe mãi ở tốc độ chậm thì ra đời gặp tốc độ thật vẫn điếc.
   * Chặn trên 1,5 vì quá đó giọng máy méo tới mức không còn giống tiếng người.
   */
  function tocDoNghe(lv) {
    const n = typeof lv === "number" ? lv : -1;
    return Math.min(1.5, Math.round((0.8 + Math.max(0, n + 1) * 0.1) * 100) / 100);
  }

  goc.Srs = {
    DUONG, TEN_DUONG, MOC, NGAY,
    DU_MAU, NHANH_MS, CHAM_MS, RAT_CHAM_MS, MS_TOI_DA, MS_TOI_THIEU, HE_SO, MO_DUONG,
    themMau, doLech, heSoBienThien, nhipDo, cham,
    duongCo, duongMo, capChung, gomSrs, denHan, hoSo, hanSauNgay,
    tocDoNghe
  };
})(typeof self !== "undefined" ? self : this);
