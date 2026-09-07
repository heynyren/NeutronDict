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
    const bo = goc.TuLienBo || null;         // chỗ cắm 日本語WordNet vào
    const ngoai = bo && bo[t] ? bo[t] : {};
    return {
      dong: gonDs((ngoai.dong || []).concat(BANG_DONG.get(t) || []), t),
      trai: gonDs((ngoai.trai || []).concat(BANG_TRAI.get(t) || []), t)
    };
  }

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
    if (diem < SAN_DAT) return { nho: false, ms: ms, diem: diem };
    return { nho: true, ms: Math.round(ms / Math.max(0.2, diem)), diem: diem };
  }

  goc.TuLien = {
    CAP_TRAI_JA, NHOM_DONG_JA, O_TOI_DA, SAN_DAT,
    tuBang, tuPos, gop, dungDe, chamBai, gonDs, laMotTu
  };
})(typeof self !== "undefined" ? self : this);
