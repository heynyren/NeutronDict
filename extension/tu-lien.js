/**
 * Liên kết từ — tập đồng nghĩa và tập trái nghĩa.
 * ===========================================================================
 *
 * Vì sao có bài này
 * -----------------
 * Não không cất từ như một cuốn từ điển tra theo khoá. Nó cất theo LÁNG GIỀNG:
 * muốn nói "cải thiện" thì 改善 / 改良 / 向上 / 進歩 cùng sáng lên một lúc rồi
 * tranh nhau. Đó là lý do người ta biết từ mà vẫn nói ra nhầm từ — không phải
 * vì quên, mà vì chọn sai giữa mấy ứng viên gần nhau.
 *
 * Thẻ từ đơn không bao giờ luyện được chuyện đó, vì nó giả vờ mỗi từ đứng một
 * mình. Bài này luyện thẳng vào: quăng ra một mớ lộn xộn, nhặt cho hết những từ
 * cùng một ý (hoặc ngược ý), càng đủ và càng nhanh càng tốt.
 *
 * Từ liên lấy ở đâu
 * -----------------
 * Tiếng Anh thì sẵn: Free Dictionary trả về cả `synonyms` LẪN `antonyms` cho
 * từng nghĩa — trước giờ app chỉ nhặt phần đồng nghĩa rồi vứt phần trái nghĩa.
 *
 * Tiếng Nhật không có API miễn phí nào cho việc này (Weblio, Jisho đều không mở
 * CORS). Nên dùng ba tầng, tầng nào có thì lấy:
 *
 *   1. Bộ dữ liệu người dùng tự nạp (`window.TuLienBo`) — chỗ để cắm 日本語
 *      WordNet vào nếu muốn đủ; xem cong-cu/README.
 *   2. Bảng HẠT GIỐNG bên dưới: các cặp trái nghĩa thông dụng, viết tay. Nói
 *      thẳng: đây là hạt giống chứ không phải từ điển, nó phủ được mấy trăm từ
 *      hay gặp nhất chứ không phủ hết.
 *   3. Vòng dịch ngược: từ → nghĩa tiếng Việt → dịch ngược lại tiếng Nhật thì
 *      Google trả về một danh sách ứng viên cho cùng một ý. Đó chính là tập
 *      đồng nghĩa, và app đã dùng đúng cơ chế này ở chế độ Việt→Nhật.
 *
 * Tầng 3 chỉ ra được ĐỒNG nghĩa. Trái nghĩa tiếng Nhật thì chỉ có tầng 1 và 2 —
 * mục nào không có thì không mở đường "trai", chứ không bịa.
 */
(function (goc) {
  "use strict";

  /**
   * Hạt giống trái nghĩa tiếng Nhật. Mỗi dòng là một cặp; tra được cả hai chiều.
   * Cố ý chọn những cặp hay gặp nhất chứ không cố cho nhiều.
   */
  const CAP_TRAI_JA = [
    ["大きい", "小さい"], ["高い", "低い"], ["高い", "安い"], ["長い", "短い"],
    ["新しい", "古い"], ["良い", "悪い"], ["多い", "少ない"], ["強い", "弱い"],
    ["早い", "遅い"], ["速い", "遅い"], ["暑い", "寒い"], ["熱い", "冷たい"],
    ["明るい", "暗い"], ["重い", "軽い"], ["広い", "狭い"], ["深い", "浅い"],
    ["厚い", "薄い"], ["太い", "細い"], ["難しい", "易しい"], ["忙しい", "暇"],
    ["楽しい", "つまらない"], ["嬉しい", "悲しい"], ["近い", "遠い"], ["若い", "老いた"],
    ["静か", "うるさい"], ["綺麗", "汚い"], ["安全", "危険"], ["便利", "不便"],
    ["簡単", "複雑"], ["有名", "無名"], ["賛成", "反対"], ["成功", "失敗"],
    ["増加", "減少"], ["上昇", "下降"], ["開始", "終了"], ["出発", "到着"],
    ["入口", "出口"], ["前進", "後退"], ["進歩", "退歩"], ["改善", "改悪"],
    ["向上", "低下"], ["拡大", "縮小"], ["上手", "下手"], ["正しい", "間違い"],
    ["必要", "不要"], ["可能", "不可能"], ["肯定", "否定"], ["収入", "支出"],
    ["利益", "損失"], ["需要", "供給"], ["原因", "結果"], ["質問", "回答"],
    ["過去", "未来"], ["昼", "夜"], ["朝", "晩"], ["夏", "冬"],
    ["男", "女"], ["親", "子"], ["先生", "生徒"], ["買う", "売る"],
    ["begin", "end"], ["開く", "閉じる"], ["立つ", "座る"], ["行く", "来る"],
    ["上がる", "下がる"], ["入る", "出る"], ["始まる", "終わる"], ["増える", "減る"],
    ["覚える", "忘れる"], ["生きる", "死ぬ"], ["勝つ", "負ける"], ["笑う", "泣く"]
  ];

  /** Nhóm đồng nghĩa hạt giống — dùng khi vòng dịch ngược không ra gì. */
  const NHOM_DONG_JA = [
    ["改善", "改良", "向上", "進歩"], ["方法", "手段", "やり方", "手法"],
    ["問題", "課題", "トラブル"], ["重要", "大事", "大切", "肝心"],
    ["理由", "原因", "訳", "根拠"], ["最近", "近頃", "この頃"],
    ["たくさん", "多く", "大量", "豊富"], ["すぐ", "直ちに", "早速", "即座に"],
    ["考える", "思う", "検討する"], ["調べる", "確認する", "点検する"],
    ["作る", "製造する", "制作する"], ["使う", "利用する", "使用する", "活用する"]
  ];

  function dungBang(cap) {
    const m = new Map();
    for (const [a, b] of cap) {
      if (!m.has(a)) m.set(a, []);
      if (!m.has(b)) m.set(b, []);
      m.get(a).push(b);
      m.get(b).push(a);
    }
    return m;
  }
  const BANG_TRAI = dungBang(CAP_TRAI_JA);

  const BANG_DONG = (() => {
    const m = new Map();
    for (const nhom of NHOM_DONG_JA) {
      for (const t of nhom) {
        const khac = nhom.filter((x) => x !== t);
        m.set(t, (m.get(t) || []).concat(khac));
      }
    }
    return m;
  })();

  /** Một ứng viên chỉ được coi là TỪ khi nó ngắn và không mang dấu câu. */
  const DAI_TOI_DA = 14;
  function laMotTu(t) {
    if (!t || t.length > DAI_TOI_DA) return false;
    if (/[.。！？!?、,;:…\n]/.test(t)) return false;      // có dấu câu = một câu
    if ((t.match(/\s/g) || []).length > 1) return false;  // ba chữ trở lên = một cụm
    return true;
  }

  /**
   * Dọn một danh sách ứng viên: bỏ trùng, bỏ chính nó, và BỎ NHỮNG THỨ KHÔNG
   * PHẢI TỪ.
   *
   * Cái chặn cuối là bài học từ lúc kiểm: vòng dịch ngược có lúc trả về nguyên
   * một câu, và nếu cứ nhận thì đề bài sẽ có một ô dài ngoằng — lộ đáp án ngay
   * từ cái nhìn đầu tiên, mà lại còn sai.
   */
  function gonDs(ds, bo, toiDa) {
    const ra = [], thay = new Set([bo]);
    for (const x of ds || []) {
      const t = String(x || "").trim();
      if (!t || thay.has(t) || !laMotTu(t)) continue;
      thay.add(t);
      ra.push(t);
      if (ra.length >= (toiDa || 8)) break;
    }
    return ra;
  }

  /**
   * Từ liên lấy từ bảng hạt giống + bộ dữ liệu người dùng tự nạp.
   * @returns {{dong:string[], trai:string[]}}
   */
  function tuBang(tu) {
    const t = String(tu || "").trim();
    const ngoai = boNho.get(t) || (goc.TuLienBo && goc.TuLienBo[t]) || {};
    // Bảng HẠT GIỐNG đứng TRƯỚC bộ WordNet, không phải sau.
    //
    // WordNet gộp mọi nghĩa của một từ lại, nên 大きい kéo theo cả 低い và 短い
    // (từ nghĩa "cao/dài") bên cạnh 小さい. Mấy chục cặp viết tay ở trên là cặp
    // ai cũng nghĩ tới đầu tiên; để chúng lên trước thì đề bài hỏi đúng cái
    // người học mong đợi, phần WordNet chỉ bồi thêm.
    return {
      dong: gonDs((BANG_DONG.get(t) || []).concat(ngoai.dong || []), t),
      trai: gonDs((BANG_TRAI.get(t) || []).concat(ngoai.trai || []), t)
    };
  }

  /* ------------------------------------------------------------------ */
  /* Bộ 日本語WordNet — nạp theo mảnh, chỉ khi cần                       */
  /* ------------------------------------------------------------------ */
  /*
   * Bộ đầy đủ là 56.527 từ, 3,6 MB. Nạp cả cục lúc mở app thì điện thoại phải
   * nuốt 3,6 MB rồi dựng một bảng mấy chục nghìn khoá — trong khi mỗi lượt lưu
   * từ chỉ tra ĐÚNG MỘT từ.
   *
   * Nên cắt thành 32 mảnh theo mã của chữ đầu (~116 KB mỗi mảnh) và chỉ nạp
   * mảnh chứa từ đang cần. Học một buổi chạm tới vài mảnh là cùng.
   */
  const SO_MANH = 32;
  const boNho = new Map();               // từ -> {dong, trai}, của các mảnh đã nạp
  const manhDaNap = new Set();
  const manhDangNap = new Map();

  function soManh(tu) {
    const t = String(tu || "");
    return t ? (t.charCodeAt(0) % SO_MANH) : -1;
  }

  /**
   * Nạp mảnh chứa từ này, nếu chưa nạp. Gọi bao nhiêu lần cũng được — lượt sau
   * bám vào lời hứa đang bay của lượt trước, không tải lại.
   * @param {function} layUrl dựng đường dẫn tới mảnh thứ i
   */
  function napBo(tu, layUrl) {
    const i = soManh(tu);
    if (i < 0 || manhDaNap.has(i)) return Promise.resolve(false);
    if (manhDangNap.has(i)) return manhDangNap.get(i);
    const hua = fetch(layUrl(i))
      .then((r) => (r.ok ? r.text() : ""))
      .then((txt) => {
        for (const dong of txt.split("\n")) {
          if (!dong) continue;
          const [t, d, a] = dong.split("\t");
          if (!t) continue;
          const o = {};
          if (d) o.dong = d.split(",");
          if (a) o.trai = a.split(",");
          boNho.set(t, o);
        }
        manhDaNap.add(i);
        manhDangNap.delete(i);
        return true;
      })
      .catch(() => { manhDangNap.delete(i); return false; });
    manhDangNap.set(i, hua);
    return hua;
  }

  function daNap() { return manhDaNap.size; }

  /**
   * Nhặt đồng nghĩa và trái nghĩa ra khỏi kết quả từ điển tiếng Anh.
   * @param {Array} pos danh sách {p, defs, syn, ant} do posFrom dựng
   */
  function tuPos(pos, tu) {
    let dong = [], trai = [];
    for (const g of pos || []) {
      dong = dong.concat(g.syn || []);
      trai = trai.concat(g.ant || []);
    }
    return { dong: gonDs(dong, tu), trai: gonDs(trai, tu) };
  }

  /** Gộp nhiều nguồn lại, nguồn trước được ưu tiên. */
  function gop() {
    let dong = [], trai = [];
    for (const x of arguments) {
      if (!x) continue;
      dong = dong.concat(x.dong || []);
      trai = trai.concat(x.trai || []);
    }
    return { dong: gonDs(dong, ""), trai: gonDs(trai, "") };
  }

  /* ------------------------------------------------------------------ */
  /* Dựng đề                                                             */
  /* ------------------------------------------------------------------ */

  /** Số ô tối đa trên một đề. Nhiều quá thì thành trò tìm chữ, không phải nhớ từ. */
  const O_TOI_DA = 16;

  /**
   * Dựng một mớ lộn xộn: tập đúng + các từ gây nhiễu.
   *
   * Từ nhiễu lấy từ CHÍNH SỔ TAY của người học, không lấy từ ngẫu nhiên ngoài
   * trời. Hai lẽ: chúng là từ họ đang học nên nhìn quen mắt (nhiễu thật, không
   * phải nhiễu dễ loại), và mỗi lượt chơi là một lượt ôn thụ động cho chúng.
   *
   * Và tập TRÁI nghĩa được đưa vào làm nhiễu cho đề ĐỒNG nghĩa (và ngược lại) —
   * đó là loại nhiễu khó nhất, vì chúng cùng một trường nghĩa.
   *
   * @param {string[]} dung tập phải nhặt
   * @param {string[]} nhieuGan nhiễu cùng trường nghĩa (tập kia)
   * @param {string[]} nhieuXa nhiễu lấy từ sổ tay
   * @param {function} [ngau] hàm ngẫu nhiên, truyền vào để kiểm cho tất định
   */
  function dungDe(dung, nhieuGan, nhieuXa, ngau) {
    const rnd = ngau || Math.random;
    const co = new Set(dung);
    const nhieu = [];
    for (const x of (nhieuGan || []).concat(nhieuXa || [])) {
      if (!co.has(x) && nhieu.indexOf(x) < 0) nhieu.push(x);
    }
    const canThem = Math.max(0, Math.min(O_TOI_DA - dung.length, nhieu.length));
    // Xáo phần nhiễu rồi mới cắt, để lần nào cũng ra một mớ khác
    const xao = nhieu.slice();
    for (let i = xao.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = xao[i]; xao[i] = xao[j]; xao[j] = t;
    }
    const o = dung.concat(xao.slice(0, canThem));
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = o[i]; o[i] = o[j]; o[j] = t;
    }
    return o;
  }

  /* ------------------------------------------------------------------ */
  /* CỤM — những từ trong sổ nối với nhau qua tập đồng/trái nghĩa        */
  /* ------------------------------------------------------------------ */
  /*
   * Dùng để làm gì: một từ tới hạn thì kéo cả cụm vào cùng buổi, xếp liền nhau.
   *
   * Nối LỊCH chứ KHÔNG nối điểm — chỗ này cần nói rõ vì cái ý ngược lại nghe
   * rất xuôi tai. Ý ngược lại là: nhớ 改善 thì cộng điểm luôn cho 改良 / 向上,
   * quên thì trừ theo. Không làm thế, vì ba lẽ:
   *
   *   1. Chú thích đầu tệp này đã nói: mấy từ gần nghĩa "cùng sáng lên một lúc
   *      rồi TRANH NHAU", và người ta nói nhầm "không phải vì quên, mà vì chọn
   *      sai giữa mấy ứng viên gần nhau". Bài nhặt từ đồng nghĩa tồn tại CHÍNH
   *      VÌ nhớ 改善 không kéo theo nhớ 改良. Cộng điểm chéo là phủ nhận luôn lý
   *      do tồn tại của nó.
   *
   *   2. Truy xuất một từ trong cụm còn ỨC CHẾ các từ cùng cụm (hiện tượng
   *      retrieval-induced forgetting, Anderson–Bjork 1994). Cộng điểm cho
   *      chúng là đẩy con số đi ngược chiều sự thật.
   *
   *   3. `ngay` trong srs.js nghĩa là "tôi giữ được TỪ NÀY bao lâu". Nới hạn của
   *      改良 vì nhớ 改善 thì nó bị hỏi lại muộn hơn trí nhớ thật — quên mà app
   *      không hề biết. Thang 100 điểm là một phép đo; làm thế là biến một phần
   *      của nó thành tin đồn.
   *
   * Còn xếp chúng CẠNH NHAU trong một buổi thì lại đúng việc: đó chính là luyện
   * phân biệt, thứ mà hai bài liên kết nhắm tới, và không đụng tới con số nào.
   */

  /**
   * Chỉ mục một lượt cho cả sổ.
   *
   * `lien` lưu CHUỖI TỪ chứ không phải khoá, nên muốn biết một từ liên có nằm
   * trong sổ không thì phải tra ngược. Dựng một lần cho cả buổi, đừng quét lại
   * ở từng mục.
   *
   * @param {Array} dsMuc danh sách mục ĐÃ lọc theo ngôn ngữ đang học
   * @returns {{theoTu: Map<string,string>, keNguoc: Map<string,string[]>}}
   *   `theoTu`: từ → khoá. `keNguoc`: từ → những khoá có KỂ TÊN từ ấy.
   */
  function chiMucLien(dsMuc) {
    const theoTu = new Map(), keNguoc = new Map();
    for (const m of dsMuc || []) {
      if (!m || m.del || !m.word || !m.key) continue;
      if (!theoTu.has(m.word)) theoTu.set(m.word, m.key);
    }
    for (const m of dsMuc || []) {
      if (!m || m.del || !m.key) continue;
      const l = m.lien || {};
      for (const w of (l.dong || []).concat(l.trai || [])) {
        if (!w) continue;
        const ds = keNguoc.get(w);
        if (ds) { if (ds.indexOf(m.key) < 0) ds.push(m.key); }
        else keNguoc.set(w, [m.key]);
      }
    }
    return { theoTu: theoTu, keNguoc: keNguoc };
  }

  /**
   * Những mục trong sổ nối THẲNG với mục này.
   *
   * MỘT BẬC THÔI, hình sao quanh từ đang xét — cố ý không lấy bao đóng bắc cầu.
   * Bắc cầu thì 改善–改良, 改良–向上, 向上–上昇… dính lại thành một khối khổng lồ,
   * nhất là khi người dùng nạp thêm 日本語WordNet; mà cái người học hình dung
   * cũng là "mấy từ tôi lưu RA TỪ tập đồng/trái nghĩa của nó", tức hình sao chứ
   * không phải cả mạng lưới.
   *
   * HAI CHIỀU theo cấu tạo: A kể tên B, hoặc B kể tên A, đều tính là nối.
   * `lienVaSau` bên background.js tính `lien` cho từng mục ĐỘC LẬP nên không có
   * gì đảm bảo hai bên cùng kể tên nhau; chỉ nhận một chiều thì mất quá nửa số
   * cặp mà người học tự tay lưu về từ màn kết quả.
   *
   * @returns {string[]} khoá của các mục cùng cụm, KHÔNG gồm chính nó
   */
  function cumCua(muc, chiMuc) {
    if (!muc || !muc.key || !chiMuc) return [];
    const ra = [], da = new Set([muc.key]);
    const them = (k) => { if (k && !da.has(k)) { da.add(k); ra.push(k); } };
    const l = muc.lien || {};
    for (const w of (l.dong || []).concat(l.trai || []))
      them(chiMuc.theoTu.get(w));                       // mình kể tên họ
    for (const k of chiMuc.keNguoc.get(muc.word) || [])
      them(k);                                          // họ kể tên mình
    return ra;
  }

  /* ------------------------------------------------------------------ */
  /* Chấm                                                                */
  /* ------------------------------------------------------------------ */

  /** Nhặt được ít hơn ngần này thì coi như chưa thuộc. */
  const SAN_DAT = 0.5;

  /**
   * Chấm một lượt chơi, quy về đúng hai thứ mà bộ SRS đã biết xử: nhớ/quên và
   * một con số mili-giây.
   *
   * Mẹo ở đây: KHÔNG dựng thêm một trục điểm mới. Nhặt thiếu hoặc nhặt nhầm
   * được quy thành "chậm hơn" theo đúng tỉ lệ, rồi thả vào chính cỗ máy đo thời
   * gian đã có. Nhặt đủ và nhanh thì giãn cách được nhân lên; nhặt 60% thì hoá
   * ra chậm gấp rưỡi và giãn cách co lại. Một trục, không phải hai.
   *
   * @param {{dung:number, tong:number, sai:number, ms:number}} kq
   * @returns {{nho:boolean, ms:number, diem:number}}
   */
  function chamBai(kq) {
    const tong = Math.max(1, kq.tong || 0);
    // Mỗi lượt nhặt nhầm phạt đúng bằng một từ bỏ sót — nhặt bừa hết thì điểm
    // âm, chứ không phải cách thắng.
    const diem = Math.max(0, ((kq.dung || 0) - (kq.sai || 0)) / tong);
    const ms = Math.max(1, kq.ms || 0);
    /*
     * Trả về THỜI GIAN THẬT, không phóng đại theo điểm.
     *
     * Bản cũ trả `ms / diem`: nhặt đúng 70% thì 20 giây được báo lên 28,6 giây.
     * Con số ấy đi thẳng vào bộ hiệu chỉnh nhịp bấm của đường này, nên bộ hiệu
     * chỉnh học một thứ không phải thời gian truy xuất. Cộng với việc trần
     * thống kê khi ấy là 15 giây, kết quả đo được: 83% lượt ĐÚNG bị chấm "rất
     * chậm", cấp bị đóng băng, giãn cách ×0,35 — hai bài liên kết gần như không
     * thể lên cấp.
     *
     * Phần "làm chưa trọn" đã được tính ở chỗ khác rồi: dưới sàn thì coi là
     * QUÊN, và người còn mò thì tự khắc bấm chậm hơn. Không cần phạt thêm một
     * lần nữa bằng cách bịa ra một con số thời gian.
     */
    if (diem < SAN_DAT) return { nho: false, ms: ms, diem: diem };
    return { nho: true, ms: ms, diem: diem };
  }

  /**
   * Thu tập liên kết của một từ DẪN XUẤT về đúng tập ban đầu.
   *
   * Vì sao có hàm này
   * -----------------
   * Trước đây mọi mục vừa lưu đều được dựng tập đồng/trái nghĩa riêng từ từ
   * điển — kể cả mục vừa lưu từ màn kết quả bài liên kết. Nên một từ dẫn xuất
   * lại mọc ra một tập mới, tập ấy lại đẻ ra từ dẫn xuất mới, cứ thế. Kho từ
   * đầy lên rất nhanh mà không đi vào đâu: người học rốt cuộc có vài trăm từ
   * rải khắp mười trường nghĩa, thay vì nắm chắc một trường.
   *
   * Luật
   * ----
   *   - VỐN ỨNG VIÊN đóng kín: chỉ gồm từ gốc và những từ đã có trong tập
   *     đồng/trái nghĩa của CHÍNH nó. Từ điển trả về gì ngoài vốn ấy cũng bỏ.
   *   - NỐI NGƯỢC VỀ GỐC luôn được giữ, và giữ theo đúng cực: lưu từ tập đồng
   *     nghĩa của gốc thì gốc nằm bên đồng nghĩa của nó. Quan hệ ấy do chính
   *     thao tác lưu xác lập — người học vừa nhìn thấy hai từ ấy cạnh nhau
   *     trong một đề và tự tay bấm Lưu — nên không cần từ điển xác nhận lại.
   *   - ANH EM trong tập ban đầu chỉ vào khi TỪ ĐIỂN XÁC NHẬN, tức tra chính
   *     từ dẫn xuất mà cũng thấy tên chúng. Không thì hai từ chỉ cùng nằm
   *     trong danh sách của gốc chứ chưa chắc liên quan tới nhau.
   *
   * @param {{dong:string[], trai:string[]}} ra  tập từ điển vừa trả về
   * @param {string} tu       chính từ dẫn xuất
   * @param {object} gocMuc   mục gốc trong sổ (cần `.word` và `.lien`)
   * @param {"dong"|"trai"} ben  từ này nằm ở tập nào của gốc
   * @returns {{dong:string[], trai:string[]}}
   */
  function locTheoCum(ra, tu, gocMuc, ben) {
    const t = String(tu || "").trim();
    const goc = String((gocMuc && gocMuc.word) || "").trim();
    const l = (gocMuc && gocMuc.lien) || {};
    const von = new Set();
    if (goc && goc !== t) von.add(goc);
    for (const x of (Array.isArray(l.dong) ? l.dong : [])) {
      const v = String(x || "").trim();
      if (v && v !== t) von.add(v);
    }
    for (const x of (Array.isArray(l.trai) ? l.trai : [])) {
      const v = String(x || "").trim();
      if (v && v !== t) von.add(v);
    }
    const loc = (ds) => (Array.isArray(ds) ? ds : [])
      .map((x) => String(x || "").trim())
      .filter((x) => x && von.has(x));
    let dong = loc(ra && ra.dong);
    let trai = loc(ra && ra.trai);
    if (goc && goc !== t) {
      // Cực do thao tác lưu quyết định, không phải do từ điển. Gỡ gốc khỏi bên
      // kia trước: để nó nằm cả hai bên thì đề đồng nghĩa và đề trái nghĩa
      // cùng nhận một đáp án, và bài nào cũng chấm sai một nửa.
      const kia = ben === "trai" ? "dong" : "trai";
      if (kia === "dong") dong = dong.filter((x) => x !== goc);
      else trai = trai.filter((x) => x !== goc);
      if (ben === "trai") { if (trai.indexOf(goc) < 0) trai.unshift(goc); }
      else { if (dong.indexOf(goc) < 0) dong.unshift(goc); }
    }
    return { dong: gonDs(dong, t), trai: gonDs(trai, t) };
  }

  /**
   * Xếp các ô của một bài ĐÃ CHẤM thành ba nhóm, đúng thứ tự cần nhìn.
   *
   * Nằm ở đây chứ không nằm trong màn hình, vì có HAI màn hình dùng nó —
   * sổ tay trên máy tính và app Android. Trước đây chỉ bản extension có màn
   * kết quả, bản Android tụt lại mấy tháng mà chẳng ai thấy; đó đúng là thứ
   * xảy ra khi cùng một quy tắc được chép tay hai lần.
   *
   * Ba nhóm, và vẫn bày ĐỦ từng ô một. Mười sáu hàng giống hệt nhau thì thứ
   * đáng nhìn nhất — mình vừa làm đúng hay sai — chìm nghỉm giữa đám từ nhiễu.
   * Nhưng bỏ bớt từ nhiễu đi thì mất luôn lý do màn này tồn tại: nhiễu lấy từ
   * chính sổ tay người học, gặp từ hay thì lưu ngay tại đây. Không giấu gì cả,
   * chỉ xếp lại.
   *
   * Trong nhóm ĐÁP ÁN thì BỎ SÓT lên trước: nó là thứ đáng nhìn lại nhất, mà
   * để lẫn theo thứ tự cũ thì nó nằm đâu là chuyện may rủi.
   *
   * @param {{o: string[], dung: Set<string>, chon: Set<string>}} b bài đã chấm
   * @returns {{dapAn: string[], nhatNham: string[], nhieu: string[]}}
   */
  function xepKetQua(b) {
    const o = (b && Array.isArray(b.o)) ? b.o : [];
    // `has` gọi qua hàm để chịu được cả Set lẫn thứ gì đó không phải Set: dữ
    // liệu vào đây đi từ màn hình chứ không từ kho, nên hỏng là hỏng cả màn.
    const co = (t, x) => !!(t && typeof t.has === "function" && t.has(x));
    const dung = (x) => co(b && b.dung, x);
    const chon = (x) => co(b && b.chon, x);
    return {
      dapAn: o.filter(dung).sort((x, y) => (chon(x) ? 1 : 0) - (chon(y) ? 1 : 0)),
      nhatNham: o.filter((c) => chon(c) && !dung(c)),
      nhieu: o.filter((c) => !dung(c) && !chon(c))
    };
  }

  goc.TuLien = {
    CAP_TRAI_JA, NHOM_DONG_JA, O_TOI_DA, SAN_DAT,
    tuBang, tuPos, gop, dungDe, chamBai, gonDs, laMotTu,
    chiMucLien, cumCua, xepKetQua, locTheoCum,
    napBo, soManh, daNap, SO_MANH
  };
})(typeof self !== "undefined" ? self : this);
