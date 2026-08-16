/**
 * Cắt các mẩu phụ đề rời thành CÂU.
 *
 * Vì sao tách hẳn ra một tệp: đây là chỗ quyết định chất lượng của mọi thứ phía
 * sau. Bản dịch, mục lưu vào sổ tay, việc tra từ — tất cả đều nhận đầu vào là
 * kết quả của tệp này. Cắt sai một chỗ thì hỏng cả ba.
 *
 * NGUYÊN TẮC BẤT DI BẤT DỊCH: không thêm, không bớt, không sửa một chữ nào của
 * YouTube. Nối các mẩu lại thì vẫn đúng y nguyên lời gốc; thứ duy nhất tệp này
 * được phép chọn là NGẮT Ở ĐÂU. (Ngoại lệ duy nhất: các nhãn tiếng động kiểu
 * "[音楽]" / "[Applause]" — đó là chú thích do YouTube chèn, không phải lời ai
 * nói, nên gỡ đi. Xem `locNhieu`.)
 *
 * Vì sao phải tự cắt thay vì dùng luôn cách chia dòng của YouTube: phụ đề tự
 * sinh nhận từng chữ rất chuẩn nhưng chia dòng theo bề rộng khung hình và nhịp
 * thở, không theo câu. Một câu bị xé làm ba, hai câu dính làm một — đưa nguyên
 * như vậy sang máy dịch thì bản dịch sai ngay từ đầu vào.
 *
 * Cách làm, ba lớp chồng lên nhau:
 *
 *   1. KHOẢNG LẶNG, đo tương đối. Ngưỡng cứng (kiểu "nghỉ 0,9 giây là hết câu")
 *      không dùng được: bản tin đọc nhanh thì 0,5 giây đã là nghỉ dài, người kể
 *      chuyện chậm thì 1,2 giây vẫn là giữa câu. Nên ở đây lấy trung vị các
 *      khoảng lặng QUANH ĐÓ làm mốc, rồi đo mọi khoảng lặng theo tỉ lệ với mốc
 *      ấy. Xem `nhipNghi`.
 *
 *   2. HÌNH THÁI. Tiếng Nhật có một ưu thế lớn: chỗ kết câu nhận ra được bằng
 *      luật chứ không cần đoán. Câu gần như luôn kết bằng vị ngữ (です／ます／
 *      だ／ない…), và ngược lại có một tập chữ TUYỆT ĐỐI không thể đứng cuối câu
 *      (の／に／を／は／が／て／ので／けど…). Vế phủ định này mới là vế ăn tiền:
 *      người ta lấy hơi giữa câu suốt, và chính chỗ đó là chỗ YouTube hay cắt
 *      bậy nhất.
 *
 *   3. CHẤM ĐIỂM thay vì luật cứng. Mỗi ranh giới được cộng trừ điểm từ mọi tín
 *      hiệu, ngắt khi tổng vượt ngưỡng. Nhờ vậy tín hiệu yếu biết cộng dồn với
 *      nhau, và khi buộc phải cắt vì câu quá dài thì cắt ở chỗ ĐIỂM CAO NHẤT
 *      trong đoạn chứ không cắt bừa ở ký tự thứ N như trước.
 *
 * Đầu vào : [{t, d, s}] — mẩu nhỏ nhất còn giữ mốc thời gian (thường là từng từ)
 * Đầu ra  : [{t, tEnd, s, manh:[{t, d, a, b}]}] — `manh` cho biết mẩu gốc nằm ở
 *           quãng [a,b) nào trong câu, để còn tô sáng và tua đúng chỗ.
 */
(function (goc) {
  "use strict";

  /* ================================================================== */
  /* Nối chữ                                                             */
  /* ================================================================== */

  // Gộp cả khối dấu câu CJK (、。「」…) vào đây: sau dấu phẩy tiếng Nhật thì
  // KHÔNG có dấu cách, nên nó phải được coi là "chữ dính" y như kanji.
  const CJK = /[\u3000-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uFF00-\uFFEF]/;

  /** Nối hai mẩu: tiếng Nhật thì dính liền, tiếng có khoảng trắng thì thêm dấu cách. */
  function noiChu(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (/\s$/.test(a) || /^\s/.test(b)) return a + b;   // mẩu đã tự mang dấu cách
    // Chỉ chèn dấu cách khi CẢ HAI bên đều không phải chữ CJK. Tiếng Nhật không
    // dùng dấu cách, kể cả quanh chữ Latinh nằm lẫn trong câu: bản gốc là
    // 「フィジカルAI」 và 「AIが」, chèn thêm dấu cách vào là mình tự bịa ra một
    // ký tự mà YouTube không hề có.
    const dinh = CJK.test(a[a.length - 1]) || CJK.test(b[0]);
    return a + (dinh ? "" : " ") + b;
  }

  /* ================================================================== */
  /* Lọc nhãn tiếng động                                                 */
  /* ================================================================== */

  /**
   * YouTube chèn vào bản chép lời những nhãn KHÔNG phải lời người nói:
   * "[音楽]", "[拍手]", "[Applause]", "[âm nhạc]", "♪♪"… Để nguyên thì máy dịch
   * coi chúng là một phần câu và dịch méo cả đoạn, còn lưu vào sổ tay thì được
   * một mục vô nghĩa.
   *
   * Chỉ gỡ thứ nằm trong ngoặc VUÔNG (［］【】 cũng vậy) và dấu ♪. Ngoặc tròn thì
   * không đụng tới, vì lời nói thật vẫn có thể có ngoặc tròn.
   */
  const NHAN = /[\[［【][^\]］】]{0,40}[\]］】]|[♪♬🎵🎶]+/g;

  function locNhieu(cues) {
    const ra = [];
    for (const c of cues) {
      const s = String(c.s == null ? "" : c.s);
      const sach = s.replace(NHAN, " ").replace(/[ \t]{2,}/g, " ");
      // Mẩu chỉ có mỗi nhãn thì bỏ hẳn, đừng để lại khoảng trắng mồ côi.
      if (!sach.trim()) continue;
      ra.push(sach === s ? c : { t: c.t, d: c.d, s: sach, ev: c.ev });
    }
    return ra;
  }

  /* ================================================================== */
  /* Xé mẩu quá to                                                       */
  /* ================================================================== */

  /**
   * Có đường lấy phụ đề trả về nguyên một DÒNG làm một mẩu (đường đọc lại từ
   * bảng bản chép lời của YouTube), mà một dòng thì hay chứa trọn một câu rưỡi.
   * Coi mẩu là đơn vị không chia được thì ranh giới câu bị khoá cứng theo cách
   * chia dòng của họ — đúng cái mình đang muốn thoát ra.
   *
   * Xé ở hai chỗ: dấu kết câu có sẵn, và đuôi thể lịch sự khi phía sau không
   * phải chữ nối tiếp (「〜説明します」+「まず〜」 thì xé, 「〜ますが」 thì không).
   * Mốc thời gian của phần bị xé chia theo tỉ lệ số ký tự — không chuẩn tuyệt
   * đối, nhưng chỉ áp dụng cho mẩu dài, mà mẩu dài thì vốn dĩ cả dòng cũng chỉ
   * có mỗi một mốc thô.
   */
  const XE_DAI = 14;
  const XE_DAU = /[。．！？!?…]+/g;
  /**
   * Ranh giới VẾ nằm lọt trong một mẩu. Không phải chỗ hết câu, nên xé ra chỉ
   * để có một ranh giới mà đặt 、 vào — 「〜ますが試合は〜」 đọc liền một hơi thì
   * máy dịch không biết đâu là vế nhượng bộ, mà thêm 、 vào là biết ngay.
   */
  function xePhach(cues, L) {
    const ra = [];
    for (const c of cues) {
      const s = String(c.s);
      if (s.length < XE_DAI) { ra.push(c); continue; }

      const cho = new Set(), choVe = new Set();
      let m;
      XE_DAU.lastIndex = 0;
      while ((m = XE_DAU.exec(s))) cho.add(m.index + m[0].length);
      if (L.xeKet) {
        L.xeKet.lastIndex = 0;
        while ((m = L.xeKet.exec(s))) cho.add(m.index + m[0].length);
      }
      if (L.xeVe) {
        L.xeVe.lastIndex = 0;
        while ((m = L.xeVe.exec(s))) choVe.add(m.index + m[0].length);
      }

      const mo = [...new Set([...cho, ...choVe])]
        .filter((i) => i > 0 && i < s.length).sort((a, b) => a - b);
      if (!mo.length) { ra.push(c); continue; }

      let truoc = 0;
      for (const i of [...mo, s.length]) {
        const phan = s.slice(truoc, i);
        if (phan.trim()) {
          const t0 = c.t + c.d * (truoc / s.length);
          const t1 = c.t + c.d * (i / s.length);
          ra.push({
            t: t0, d: Math.max(0.05, t1 - t0), s: phan,
            ev: i === s.length && c.ev,
            ve: choVe.has(i) && !cho.has(i)
          });
        }
        truoc = i;
      }
    }
    return ra;
  }

  /* ================================================================== */
  /* Luật theo từng ngôn ngữ                                             */
  /* ================================================================== */

  /**
   * Ba bộ luật, chung một cỗ máy chấm điểm.
   *
   * Chỗ khác nhau lớn nhất giữa ba thứ tiếng không phải là từ vựng mà là DẤU
   * PHẨY nằm bên nào: tiếng Nhật đặt 、 SAU vế nối (「〜ので、」), còn tiếng Việt
   * và tiếng Anh đặt dấu phẩy TRƯỚC liên từ ("…, nhưng…", "…, because…").
   * Ngoài ra tiếng Nhật có hình thái để bám (đuôi vị ngữ, trợ từ), hai thứ
   * tiếng kia thì chỉ có danh sách hư từ — nên phần "đừng ngắt ở đây" gánh
   * nhiều hơn phần "ngắt ở đây".
   */

  const HET_CAU = /[。．！？!?…]$|[.!?]["'’”)]?$/;
  const PHAY = /[、，,]\s*$/;

  /* ---------------------------- tiếng Nhật ---------------------------- */

  // Tiểu từ cuối câu, được phép bám sau đuôi vị ngữ: 〜ですね、〜ますか、〜だよ…
  const TIEU_TU = "(?:よね|ですね|ますね|かな|かね|わね|[かねよなわぞさ])?";

  // Đuôi CHẮC CHẮN kết câu: thể lịch sự và thể kết định.
  const JA_KET = new RegExp(
    "(?:でした|でしょう|です|ました|ませんでした|ません|ましょう|ます|" +
    "ください|なさい|であった|である|じゃない|ではない|ありません|いません)" +
    TIEU_TU + "$");

  // Đuôi CÓ THỂ kết câu: thể thường. Điểm nhẹ thôi, vì cũng hay đứng giữa câu
  // (thể liên thể đứng trước danh từ) — để nó cộng dồn với khoảng lặng.
  const JA_KET_YEU = new RegExp(
    "(?:なかった|ない|たい|らしい|[うくぐすつぬぶむる]|た|だ)" + TIEU_TU + "$");

  // Bẫy: vài chữ KẾT câu lại tình cờ kết thúc bằng một tiểu từ (「こんにちは」
  // kết bằng は). Chặn trước, kẻo luật TREO bên dưới hiểu nhầm.
  // Kèm luôn các câu đáp trọn vẹn chỉ có một từ: 「はい」「なるほど」. Không có
  // vị ngữ thật, nhưng chúng ĐÚNG là một câu, và nếu không kể ra ở đây thì luật
  // "danh từ trơ" bên dưới sẽ dính chúng vào câu sau.
  const JA_KHONG_TREO =
    /(?:こんにちは|こんばんは|おはようございます|おはよう|さようなら|はい|いいえ|ええ|うん|なるほど|そうですね|わかりました|分かりました)$/;

  // Đuôi KHÔNG THỂ kết câu. Luật quan trọng nhất của tiếng Nhật: gặp là chặn,
  // vì đây đích thị là người ta lấy hơi giữa chừng. Cố ý KHÔNG có か (kết câu
  // hỏi) và ね／よ／な／わ (tiểu từ cuối câu).
  const JA_TREO = new RegExp(
    "(?:けれども|けれど|けど|ので|のに|から|まで|より|ながら|つつ|ため|" +
    "という|といった|とか|って|たら|なら|ば|ず|し|て|で|" +
    "[のにをはがへともやで])$");

  // Mẩu KẾ TIẾP nguyên vẹn là một tiểu từ → chắc chắn chưa hết câu. Phụ đề tự
  // sinh mỗi mẩu một từ, nên phép so khớp nguyên mẩu này rất sắc.
  const JA_HAT_TREO = new RegExp(
    // Đuôi vị ngữ đứng riêng thành một mẩu (「ありません」+「でした」) cũng không
    // mở câu mới được — đó chỉ là phần đuôi bị tách rời của câu đang dở.
    "^(?:ませんでした|でしょう|でした|です|ました|ません|ます|だった|である|ください|" +
    "けれども|けれど|けど|ので|のに|から|まで|より|など|ながら|つつ|ため|" +
    "という|ということ|といった|とか|って|たら|なら|ように|ような|" +
    "ぐらい|くらい|ほど|だけ|しか|ば|ず|し|て|" +
    "[はがをにへともやかで])$");

  // Liên từ chuyển ý. Dùng cho hai việc trái chiều nhau nên tách hai chuỗi:
  // ngắt câu TRƯỚC nó, mà đặt dấu phẩy thì lại SAU nó (「しかし、〜」).
  // Nhóm RÕ: chỉ có thể là liên từ, không thể là gì khác.
  const JA_LIEN_TU_RO =
    "そして|しかし|ですから|だから|それでも|それから|それで|そのため|そこで|" +
    "つまり|さて|ところで|一方|ただし|とにかく|実は|例えば|なぜなら|ちなみに|" +
    "しかも|さらに|やはり|もちろん";
  // Nhóm MỜ: hay làm liên từ, nhưng cũng hay là chữ thường (「また今度」 =
  // "lần tới nữa", không phải "ngoài ra"). Vẫn dùng để ngắt câu, nhưng KHÔNG
  // được tự động kéo theo dấu phẩy — đặt phẩy sai chỗ còn hại hơn thiếu phẩy.
  //
  // Cố ý KHÔNG có 「では」: nó vừa là liên từ "vậy thì", vừa là trợ từ ghép
  // 「〜では」 (「フィジカルAIでは中国が…」). Trong bản tin thì nghĩa trợ từ áp đảo,
  // mà đoán nhầm thì cắt đôi câu ngay giữa chủ ngữ — thà bỏ hẳn tín hiệu này.
  const JA_LIEN_TU = JA_LIEN_TU_RO + "|また|まず|次に|最後に|じゃあ|ただ|でも";

  // Chỗ đặt được 読点. Cố ý KHÔNG có を／に／の — đó là trợ từ cách nằm giữa
  // cụm, đặt phẩy vào đấy là sai.
  const JA_CHO_PHAY = new RegExp(
    "(?:けれども|けれど|けど|ので|のに|から|たら|なら|ながら|つつ|" +
    JA_LIEN_TU + "|[てでがしは])$");

  // Mảnh vụn rặt trợ từ, không có lấy một chữ mang nội dung.
  // Đuôi câu chấp nhận được tuy không phải vị ngữ: tiểu từ cuối câu.
  const JA_CUOI_OK = /[かねよなわぞさ]$/;

  // Chữ Latinh và katakana dính nhau thành một từ ghép — 「フィジカル」+「AI」 =
  // 「フィジカルAI」. Phụ đề tự sinh tách chúng thành hai mẩu, và nếu giữa hai mẩu
  // đó có một nhịp nghỉ thì thuật toán tưởng hết câu, cắt đôi ngay giữa tên
  // riêng. Bắt lấy đúng cặp này rồi chặn.
  const JA_GHEP_DUOI = /[ァ-ヿーA-Za-z0-9]$/;
  const JA_GHEP_HAT = /^[ァ-ヿーA-Za-z0-9]/;

  const JA_VUN = new RegExp(
    "^(?:かな|よね|ですね|ですか|ますか|でした|ました|です|ます|" +
    "[かねよなわぞさがはをにへともやでのしてず])+[。、．，]?$");

  /* ---------------------------- tiếng Việt ---------------------------- */

  // Hư từ: đứng cuối câu thì câu chưa xong. Tiếng Việt không có hình thái để
  // bám, nên danh sách này chính là phần gánh chính — và vì không có tín hiệu
  // nào khác đỡ, mức chặn phải mạnh hơn tiếng Nhật nhiều.
  //
  // Nhóm CHẶT: tuyệt đối không thể là chữ cuối cùng của một câu.
  const VI_TREO_TU = "của|và|với|cho|để|khi|nếu|mà|thì|là|các|những|một|cái|" +
    "rất|đã|đang|sẽ|bị|ở|tại|từ|đến|theo|về|trong|ngoài|trên|dưới|giữa|sau|" +
    "trước|hoặc|hay|vì|do|bởi|nên|rằng|như|cùng|sự|việc|điều|nơi|lúc|bằng|" +
    "mỗi|mọi|chiếc|thứ|nhằm|dù|tuy|mặc dù|bởi vì";
  // Nhóm LỎNG: hiếm khi kết câu, nhưng vẫn kết được ("Đủ rồi.", "Tôi cũng vậy.")
  const VI_TREO_YEU_TU = "vẫn|còn|cũng|chỉ|đều|hơn|nữa|thêm|khá|hơi|quá|qua|" +
    "tới|con|người|phải|có thể";
  // Liên từ mở câu, nhóm RÕ: luôn kéo theo dấu phẩy ngay sau ("Tuy nhiên, …").
  const VI_MO_RO = "tuy nhiên|thế nhưng|vì vậy|vì thế|do đó|do vậy|bởi vậy|" +
    "ngoài ra|hơn nữa|mặt khác|trong khi đó|nói chung|tóm lại|thực ra|" +
    "thật ra|chẳng hạn|ví dụ|vậy nên|cuối cùng|đầu tiên|trước tiên|thứ hai|" +
    "thứ ba";
  // Nhóm MỜ: vẫn dùng để ngắt câu, nhưng không tự kéo dấu phẩy — "Hôm nay tôi
  // đi học" thì tiếng Việt không có phẩy sau "Hôm nay".
  const VI_MO_TU = VI_MO_RO + "|sau đó|thế là|và rồi|rồi thì|bây giờ|" +
    "hiện nay|hôm nay";
  // Chữ hay mở đầu một câu mới, nhưng cũng rất hay nằm giữa câu — điểm nhẹ.
  const VI_MO_YEU_TU = "tôi|mình|chúng ta|chúng tôi|chúng mình|bạn|anh|chị|" +
    "em|nó|họ|đây|đó|hãy|đừng|có thể|người ta|cái này|cái đó";
  // Liên từ mà tiếng Việt đặt dấu phẩy NGAY TRƯỚC.
  // Liên từ NỐI VẾ: không ngắt câu, chỉ lấy một dấu phẩy đứng ngay trước.
  // Mỗi chữ chỉ được giữ một vai — vừa ngắt vừa lấy phẩy thì hai luật đá nhau.
  const VI_PHAY_TRUOC_TU = "nhưng|mà|nên|vì|bởi vì|do|nếu|khi|tuy|dù|" +
    "mặc dù|hoặc|hay là|để|trong khi";

  /* ---------------------------- tiếng Anh ----------------------------- */

  const EN_TREO_TU = "a|an|the|of|to|in|on|at|for|and|or|but|with|from|by|as|" +
    "which|who|is|are|was|were|be|been|being|has|have|had|will|would|" +
    "can|could|should|very|my|your|his|her|its|our|their|these|" +
    "if|when|while|about|into|than|because|although|though|since|unless|" +
    "it's|i'm|we're|you're|there's";
  // Kết câu được, dù hiếm: "I think so.", "Not now.", "I told you that."
  const EN_TREO_YEU_TU = "that|this|those|some|any|no|not|then|so|there|now|well";
  // Nhóm RÕ: luôn kéo theo dấu phẩy ngay sau ("However, …").
  const EN_MO_RO = "however|therefore|meanwhile|moreover|besides|otherwise|" +
    "instead|finally|anyway|furthermore|nevertheless|in fact";
  // Nhóm MỜ: mở câu thì đúng, nhưng nói miệng thì không có dấu phẩy —
  // "So this is…" chứ không phải "So, this is…".
  const EN_MO_TU = EN_MO_RO + "|but|and|so|then|now|well|okay|ok|actually|" +
    "first|second|today|basically|alright";
  const EN_MO_YEU_TU = "i|we|you|they|he|she|it|this|that|there|these|those|" +
    "my|our|their|let's|here|what|why|how|when";
  const EN_PHAY_TRUOC_TU = "because|although|though|which|while|whereas|" +
    "since|unless|yet";

  /* ------------------------- gom thành bảng --------------------------- */

  /** Dựng regex khớp NGUYÊN một từ ở cuối chuỗi, cho tiếng có khoảng trắng. */
  const cuoi = (tu) => new RegExp("(?:^|[\\s\"'(‘“])(?:" + tu + ")$", "i");
  /** …và khớp ở ĐẦU chuỗi. */
  const dau = (tu) => new RegExp("^(?:" + tu + ")(?:[\\s.,!?;:]|$)", "i");

  const NGU = {
    ja: {
      ma: "ja",
      ket: JA_KET, ketYeu: JA_KET_YEU, khongTreo: JA_KHONG_TREO,
      // Tiếng Nhật đã có luật "mẩu kế tiếp là trợ từ" chặn tuyệt đối, nên
      // đuôi treo chỉ cần mức vừa; hai thứ tiếng kia không có gì đỡ nên phải mạnh.
      treo: null, treoYeu: JA_TREO,
      cuoiOK: JA_CUOI_OK,
      // Câu tiếng Nhật phải kết bằng VỊ NGỮ. Kết bằng một danh từ trơ
      // (「…働き手としてフィジカル」) thì đích thị là câu còn dở.
      danhTro: true,
      ghepDuoi: JA_GHEP_DUOI, ghepHat: JA_GHEP_HAT,
      hatTreo: JA_HAT_TREO,
      moDau: new RegExp("^(?:" + JA_LIEN_TU + ")"),
      moDauYeu: null,
      moDauDuoi: new RegExp("(?:" + JA_LIEN_TU_RO + ")$"),
      choPhay: JA_CHO_PHAY,
      phayTruoc: null,          // tiếng Nhật đặt 、 SAU vế nối, không phải trước
      vun: JA_VUN,
      cham: "。", phay: "、", dai: 60, ngan: 14, cachPhay: 8, duoiPhay: 6,
      xeKet: new RegExp(
        "(?:ませんでした|でしょう|でした|ました|ません|ましょう|です|ます|ください)" +
        "(?!ます|ませ)(?![かがねよのけしとにをでもやっー、，。．！？!?])", "g"),
      // Ranh giới VẾ lọt trong một mẩu: xé ra chỉ để có chỗ mà đặt 、 vào.
      xeVe: new RegExp(
        "(?:ますが|ですが|ましたが|でしたが|ませんが|ますので|ますから|ですので|" +
        "けれども|けれど|けど|ので|のに)(?![はも、，。．])", "g")
    },
    vi: {
      ma: "vi",
      ket: null, ketYeu: null, khongTreo: null,
      treo: cuoi(VI_TREO_TU), treoYeu: cuoi(VI_TREO_YEU_TU), hatTreo: null,
      moDau: dau(VI_MO_TU), moDauYeu: dau(VI_MO_YEU_TU),
      moDauDuoi: cuoi(VI_MO_RO),
      choPhay: null, phayTruoc: dau(VI_PHAY_TRUOC_TU),
      vun: null,
      cham: ".", phay: ",", dai: 110, ngan: 25, cachPhay: 20, duoiPhay: 14,
      xeKet: null, xeVe: null
    },
    en: {
      ma: "en",
      ket: null, ketYeu: null, khongTreo: null,
      treo: cuoi(EN_TREO_TU), treoYeu: cuoi(EN_TREO_YEU_TU), hatTreo: null,
      moDau: dau(EN_MO_TU), moDauYeu: dau(EN_MO_YEU_TU),
      moDauDuoi: cuoi(EN_MO_RO),
      choPhay: null, phayTruoc: dau(EN_PHAY_TRUOC_TU),
      vun: null,
      cham: ".", phay: ",", dai: 110, ngan: 25, cachPhay: 20, duoiPhay: 14,
      xeKet: null, xeVe: null
    }
  };

  // Dấu riêng của chữ Việt: ăâđêôơư và cả khối tiền tổ hợp Ạ-ỹ.
  // Không dùng dải À-ÿ vì tiếng Pháp, Tây Ban Nha cũng nằm trong đó.
  const DAU_VIET = /[ăâđêôơưĂÂĐÊÔƠƯ]|[Ạ-ỹ]/;
  const CHU_NHAT = /[぀-ヿ一-鿿]/;

  /**
   * Đoán ngôn ngữ từ chính bản chép lời, không tin vào mã ngôn ngữ mà YouTube
   * khai — bản "dịch tự động" của họ hay khai một đằng ra một nẻo.
   */
  function doanNgu(chu) {
    if (CHU_NHAT.test(chu)) return NGU.ja;
    if (DAU_VIET.test(chu)) return NGU.vi;
    return NGU.en;
  }

  /** Mảnh vụn không đứng riêng thành câu được: rặt hư từ, không có nội dung. */
  function laVun(doan, L) {
    const s = doan.replace(/[。、．，,.!?！？…]+$/, "").trim();
    if (!s) return true;
    if (L.vun) return L.vun.test(s);
    const tu = s.split(/\s+/);
    return tu.length <= 3 && tu.every((t) =>
      (L.treo && L.treo.test(" " + t)) || (L.treoYeu && L.treoYeu.test(" " + t)) ||
      L.moDau.test(t));
  }

  /* ---- trọng số ---- */

  const D_HET_CAU   = 8.0;    // có dấu chấm thật thì khỏi bàn
  const D_PHAY      = -1.5;   // dấu phẩy: đích thị đang giữa câu
  const D_KET_MANH  = 1.6;
  const D_KET_YEU   = 0.5;
  const D_TREO      = -3.0;   // chặn vừa: hiếm khi kết câu, nhưng có thể
  const D_TREO_MANH = -8.0;   // chặn chặt: chữ này không đời nào đứng cuối câu
  // Chặn TUYỆT ĐỐI, không phải chặn mạnh. Người ta hay kéo dài rồi mới thốt
  // nốt tiểu từ cuối câu ("〜じゃないです ……… か"), lúc ấy khoảng lặng dài thượt
  // đứng ngay trước một chữ không đời nào mở đầu được một câu. Để mức chặn vừa
  // phải thì khoảng lặng thắng, và ra một câu chỉ có mỗi chữ 「か」.
  // Riêng dấu câu CÓ SẴN trong bản gốc vẫn thắng, vì nó thoát ra sớm hơn.
  const D_HAT_TREO  = -20;
  const D_GHEP_TU   = -5.0;   // cắt ngang một từ ghép katakana + Latinh
  const D_MO_DAU    = 1.2;
  const D_MO_DAU_YEU = 0.6;
  const D_HET_SK    = 0.35;   // hết một sự kiện phụ đề: gợi ý yếu thôi
  const H_NGHI      = 1.10;   // hệ số cho khoảng lặng đã chuẩn hoá
  const TRAN_NGHI   = 3.0;    // trần, kẻo một khoảng lặng 30 giây nuốt hết mọi luật
  const D_NGHI_HAN  = 1.2;    // nghỉ hẳn (≥2,5 lần nhịp thường) thì cộng thêm

  const NGUONG = 1.0;         // tổng điểm từ đây trở lên thì ngắt

  const D_NGAN = -2.0;

  /* ================================================================== */
  /* Nhịp nghỉ                                                           */
  /* ================================================================== */

  const LANG_TOI_THIEU = 0.15;   // dưới mức này coi như nói liền, không phải nghỉ
  const CUA = 30;                // ±30 mẩu quanh chỗ đang xét

  function trungVi(xs) {
    if (!xs.length) return 0;
    const a = xs.slice().sort((x, y) => x - y);
    const g = a.length >> 1;
    return a.length % 2 ? a[g] : (a[g - 1] + a[g]) / 2;
  }

  /**
   * Với mỗi ranh giới, trả về "một khoảng nghỉ bình thường ở đoạn này dài bao
   * nhiêu giây" — để rồi đo mọi khoảng lặng theo tỉ lệ với nó.
   *
   * Lấy trung vị (không lấy trung bình) vì một khoảng lặng 20 giây giữa video
   * sẽ kéo lệch trung bình, còn trung vị thì không nhúc nhích.
   */
  function nhipNghi(lang) {
    const n = lang.length;
    const ra = new Array(n);
    const dang = [];
    for (let i = 0; i < n; i++) if (lang[i] >= LANG_TOI_THIEU) dang.push(lang[i]);
    // Ít mẫu quá thì đừng tin: trung vị của một hai khoảng lặng chính là khoảng
    // lặng đó, đo theo nó thì mọi chỗ nghỉ đều hoá ra "bình thường". Lúc ấy quay
    // về một con số tuyệt đối cho lành.
    const chung = dang.length >= 4 ? trungVi(dang) : 0.6;
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - CUA), b = Math.min(n, i + CUA + 1);
      const m = [];
      for (let j = a; j < b; j++) if (lang[j] >= LANG_TOI_THIEU) m.push(lang[j]);
      const v = m.length >= 8 ? trungVi(m) : chung;
      ra[i] = Math.min(1.6, Math.max(0.30, v));
    }
    return ra;
  }

  /* ================================================================== */
  /* Chấm điểm                                                           */
  /* ================================================================== */

  /**
   * Điểm "tĩnh" của ranh giới sau mẩu thứ i: mọi thứ không phụ thuộc vào việc
   * câu hiện tại đã dài bao nhiêu (phần đó tính sau, vì nó phụ thuộc vào các
   * chỗ ngắt đã chọn trước đó).
   *
   * @param duoi  chữ tính tới hết mẩu i (chỉ cần cái đuôi)
   * @param L     bảng luật của ngôn ngữ đang xét
   */
  function diemTinh(duoi, mauSau, lang, nhip, nhat, L) {
    let d = 0;

    // 1. Khoảng lặng, đo theo nhịp của chính đoạn này.
    const ti = lang / nhip;
    d += Math.min(TRAN_NGHI, ti) * H_NGHI;
    if (ti >= 2.5 && lang >= 1.0) d += D_NGHI_HAN;

    // 2. Dấu câu — bản phụ đề do người làm mới có, mà có thì tin tuyệt đối.
    if (HET_CAU.test(duoi)) return d + D_HET_CAU;
    if (PHAY.test(duoi)) d += D_PHAY;

    // 3. Hình thái đuôi câu.
    if (L.khongTreo && L.khongTreo.test(duoi)) d += D_KET_MANH;
    else if (L.ket && L.ket.test(duoi)) d += D_KET_MANH;
    else if (L.treo && L.treo.test(duoi)) d += D_TREO_MANH;
    else if (L.treoYeu && L.treoYeu.test(duoi)) d += D_TREO;
    else if (L.ketYeu && L.ketYeu.test(duoi)) d += D_KET_YEU;
    else if (L.cuoiOK && L.cuoiOK.test(duoi)) d += 0;      // tiểu từ cuối câu
    else if (L.danhTro) d += D_TREO;                        // danh từ trơ, chưa có vị ngữ

    // 4. Mẩu kế tiếp nói gì về chỗ này.
    if (mauSau) {
      if (L.ghepDuoi && L.ghepDuoi.test(duoi) && L.ghepHat.test(mauSau)) d += D_GHEP_TU;
      if (L.hatTreo && L.hatTreo.test(mauSau)) d += D_HAT_TREO;
      else if (L.moDau.test(mauSau)) d += D_MO_DAU;
      else if (L.moDauYeu && L.moDauYeu.test(mauSau)) d += D_MO_DAU_YEU;
    }

    // 5. Hết một sự kiện phụ đề của YouTube. Chỗ xuống dòng của họ không đáng
    //    tin để làm ranh giới câu — đó chính là thứ mình đang sửa — nhưng nó
    //    cũng không rơi hoàn toàn ngẫu nhiên, nên nhận một tí điểm.
    if (nhat) d += D_HET_SK;

    return d;
  }

  /**
   * Có nên đặt dấu phẩy ở ranh giới này không.
   *
   * Đòi hỏi hai thứ cùng lúc: chỗ đó phải ĐẶT ĐƯỢC dấu phẩy về mặt ngữ pháp, và
   * người nói phải thật sự ngắt hơi ở đó. Chỉ có một tín hiệu thì thôi — thà
   * thiếu dấu phẩy còn hơn đặt sai chỗ.
   *
   * Hai kiểu đặt, tuỳ ngôn ngữ:
   *   - tiếng Nhật đặt SAU vế nối          「〜ので、みんなで〜」
   *   - tiếng Việt / Anh đặt TRƯỚC liên từ  "…, nhưng…"  "…, because…"
   * Cả hai đều quy về một phép: chèn ngay sau mẩu thứ i. Khác nhau ở chỗ nhìn
   * vào ĐUÔI đang có hay nhìn vào MẨU KẾ TIẾP.
   *
   * Trả về "lienTu" khi liên từ đứng đầu câu (「しかし、〜」 / "However, …"): chỗ
   * ấy luôn có dấu phẩy theo sau, khỏi chờ người ta nghỉ và cũng khỏi xét
   * khoảng cách tối thiểu.
   */
  function nenPhay(duoi, mauSau, lang, nhip, ve, L) {
    if (L.moDauDuoi && L.moDauDuoi.test(duoi)) return "lienTu";
    // Ranh giới do xePhach tìm ra ngay trong lòng một mẩu: mình xé ở đó CHÍNH
    // VÌ đó là ranh giới vế, nên khỏi đòi thêm khoảng lặng (mà cũng chẳng có,
    // vì cả mẩu vốn chỉ có một mốc thời gian chung).
    if (ve) return true;
    const duNghi = lang >= nhip * 0.5;
    if (L.choPhay && L.choPhay.test(duoi)) return duNghi;
    if (L.phayTruoc && mauSau && L.phayTruoc.test(mauSau)) return duNghi;
    return false;
  }

  /** Áp lực độ dài: quá ngắn thì ghì lại, quá dài thì đẩy cho ngắt. */
  function apLuc(n, ngan, dai) {
    if (n < ngan) return D_NGAN * (1 - n / ngan);
    if (n > dai) return Math.min(2.5, (n - dai) / (dai * 0.75));
    return 0;
  }

  /* ================================================================== */
  /* Ghép                                                                */
  /* ================================================================== */

  function ghepCau(cues, opt) {
    const o = opt || {};
    const cs0 = locNhieu(cues || []);
    if (!cs0.length) return [];

    // Đoán ngôn ngữ TRƯỚC, vì cả cách xé mẩu lẫn cách chấm điểm đều theo nó.
    const L = o.ngu ? (NGU[o.ngu] || doanNgu(cs0.map((c) => c.s).join(""))) 
                    : doanNgu(cs0.map((c) => c.s).join(""));
    const cs = xePhach(cs0, L);
    const n = cs.length;
    if (!n) return [];

    // Nối một lần cho cả bản, ghi lại mỗi mẩu nằm ở quãng nào. Cắt câu về sau
    // chỉ là chọn ranh giới trên chuỗi này, nên chữ chắc chắn không xê dịch.
    let chu = "";
    const viTri = new Array(n);
    for (let i = 0; i < n; i++) {
      const moi = noiChu(chu, cs[i].s);
      viTri[i] = { a: moi.length - cs[i].s.length, b: moi.length };
      chu = moi;
    }

    const DAI = o.dai || L.dai;                   // ngưỡng bắt đầu ép ngắt
    const NGAN = L.ngan;
    const NG = o.nguong == null ? NGUONG : o.nguong;

    // Khoảng lặng trước mẩu kế tiếp.
    const lang = new Array(n);
    for (let i = 0; i < n; i++) {
      const sau = cs[i + 1];
      lang[i] = sau ? Math.max(0, sau.t - (cs[i].t + cs[i].d)) : Infinity;
    }
    const nhip = nhipNghi(lang.map((g) => (g === Infinity ? 0 : g)));

    // Lượt 1: điểm tĩnh.
    const diem = new Array(n);
    for (let i = 0; i < n; i++) {
      diem[i] = diemTinh(
        chu.slice(Math.max(0, viTri[i].b - 24), viTri[i].b),
        cs[i + 1] ? cs[i + 1].s.trim() : null,
        lang[i] === Infinity ? 99 : lang[i],
        nhip[i],
        !!cs[i].ev,
        L);
    }

    // Lượt 2: chọn chỗ ngắt. Khi câu chạm trần mà chưa gặp chỗ nào đủ điểm thì
    // QUAY LUI, cắt ở chỗ điểm cao nhất trong đoạn — đây là điều mà cách cắt cũ
    // (chặt đúng ký tự thứ N) không làm được.
    const TRAN = DAI * 3;
    const moc = [];
    let dau = 0, tot = -1, diemTot = -Infinity;
    for (let i = 0; i < n; i++) {
      const soChu = viTri[i].b - viTri[dau].a;
      const d = diem[i] + apLuc(soChu, NGAN, DAI);
      if (d > diemTot) { diemTot = d; tot = i; }
      if (i === n - 1) { moc.push(i); break; }
      if (d >= NG) {
        moc.push(i);
        dau = i + 1; tot = -1; diemTot = -Infinity;
        continue;
      }
      if (soChu >= TRAN) {
        const c = tot >= 0 ? tot : i;
        moc.push(c);
        dau = c + 1; i = c; tot = -1; diemTot = -Infinity;
      }
    }

    // Vá lưới: đừng bao giờ để lọt một câu chỉ có mỗi trợ từ ("か。", "ね。").
    // Khâu chấm điểm đã chặn rồi, nhưng đây là lỗi khó chịu tới mức đáng có
    // thêm một lớp chặn cuối: câu như thế vừa vô nghĩa với người đọc, vừa làm
    // máy dịch bịa ra cả một câu tiếng Việt từ một chữ không có nội dung.
    for (let j = moc.length - 1; j > 0; j--) {
      const doan = chu.slice(viTri[moc[j - 1] + 1].a, viTri[moc[j]].b).trim();
      if (laVun(doan, L)) moc.splice(j - 1, 1);      // bỏ chỗ ngắt trước nó
    }

    // Lượt 3: dựng câu VÀ ĐẶT DẤU CÂU.
    //
    // Đây mới là đích của cả thuật toán. Bản tự sinh không có lấy một dấu nào,
    // mà máy dịch thì đọc dấu câu để biết đâu là chủ đề, đâu là vế phụ, đâu là
    // hết ý — đưa cho nó một chuỗi chữ trần thì nó tự đoán, và đoán sai. Cho nó
    // một câu có chấm có phẩy đúng chỗ thì bản dịch khác hẳn.
    //
    // Chỉ thêm dấu câu — không một CHỮ nào được thêm hay bớt.
    const CHAM = L.cham, PHAY_DAU = L.phay;
    const CACH_PHAY = L.cachPhay;         // hai dấu phẩy đừng sát nhau quá
    const DUOI_PHAY = L.duoiPhay;         // và đừng đặt sát ngay trước dấu chấm

    const ra = [];
    let k = 0;
    for (const het of moc) {
      let s = "";
      const manh = [];
      let phayCuoi = 0;
      for (let i = k; i <= het; i++) {
        const moi = noiChu(s, cs[i].s);
        const a = moi.length - cs[i].s.length;
        if (moi.length > a) manh.push({ t: cs[i].t, d: cs[i].d, a, b: moi.length });
        s = moi;
        const nen = i < het &&
          viTri[het].b - viTri[i].b >= DUOI_PHAY &&
          !/[、，,。．.!?！？…]\s*$/.test(s) &&
          nenPhay(s.slice(-24), cs[i + 1] ? cs[i + 1].s.trim() : null,
                  lang[i] === Infinity ? 99 : lang[i], nhip[i], !!cs[i].ve, L);
        if (nen && (nen === "lienTu" || s.length - phayCuoi >= CACH_PHAY)) {
          s += PHAY_DAU;
          phayCuoi = s.length;
        }
      }

      // Mẩu đầu câu có thể mang sẵn dấu cách ở đầu (phụ đề tiếng có khoảng
      // trắng); gạt đi rồi dời mốc theo, chứ không đụng vào chữ.
      const bo = s.length - s.replace(/^\s+/, "").length;
      if (bo) {
        s = s.slice(bo);
        for (const m of manh) { m.a = Math.max(0, m.a - bo); m.b = Math.max(m.a, m.b - bo); }
      }
      s = s.replace(/\s+$/, "");
      for (const m of manh) { m.b = Math.min(m.b, s.length); m.a = Math.min(m.a, m.b); }

      if (s.trim()) {
        // Kết câu. Dấu phẩy trót nằm cuối thì đổi thành dấu chấm, chứ để
        // "〜が、" rồi hết câu thì máy dịch lại tưởng câu còn dở.
        s = s.replace(/[、，,]\s*$/, "");
        if (!HET_CAU.test(s)) s += CHAM;
        ra.push({ t: cs[k].t, tEnd: cs[het].t + cs[het].d, s, manh });
      }
      k = het + 1;
    }
    return ra;
  }

  goc.CatCau = { ghepCau, noiChu, locNhieu, xePhach, doanNgu, NGU };
})(typeof self !== "undefined" ? self : this);
