/* Dữ liệu hướng dẫn đọc IPA (tiếng Anh) dùng chung cho trang hướng dẫn và tab Chi tiết.
   Mỗi mục: { s: ký hiệu IPA, ex: từ ví dụ, ipa: IPA của ví dụ, vi: gợi ý đọc gần đúng }.
   Gợi ý tiếng Việt chỉ mang tính "gần đúng" để dễ hình dung, không thay thế phát âm chuẩn. */
(function (root) {
  const VOWELS = [
    { s: "iː", ex: "see", ipa: "/siː/", vi: "‘i’ kéo dài — như ‘i’ trong ‘si’" },
    { s: "ɪ", ex: "sit", ipa: "/sɪt/", vi: "‘i’ ngắn, gọn — giữa ‘i’ và ‘ê’" },
    { s: "e", ex: "bed", ipa: "/bed/", vi: "‘e’ — như ‘e’ trong ‘em’" },
    { s: "æ", ex: "cat", ipa: "/kæt/", vi: "‘a’ bẹt, miệng rộng — giữa ‘a’ và ‘e’" },
    { s: "ʌ", ex: "cup", ipa: "/kʌp/", vi: "‘â’ — như ‘â’ trong ‘cấp’" },
    { s: "ɑː", ex: "car", ipa: "/kɑː/", vi: "‘a’ kéo dài, tròn miệng" },
    { s: "ɒ", ex: "hot", ipa: "/hɒt/", vi: "‘o’ ngắn (giọng Anh-Anh)" },
    { s: "ɔː", ex: "law", ipa: "/lɔː/", vi: "‘o’ kéo dài, tròn môi — gần ‘aw’" },
    { s: "ʊ", ex: "put", ipa: "/pʊt/", vi: "‘u’ ngắn, gọn" },
    { s: "uː", ex: "food", ipa: "/fuːd/", vi: "‘u’ kéo dài — như ‘u’ trong ‘thu’" },
    { s: "ɜː", ex: "bird", ipa: "/bɜːd/", vi: "‘ơ’ kéo dài, cong lưỡi nhẹ" },
    { s: "ə", ex: "about", ipa: "/əˈbaʊt/", vi: "‘ơ’ rất nhẹ, không nhấn (schwa)" }
  ];
  const DIPH = [
    { s: "eɪ", ex: "day", ipa: "/deɪ/", vi: "‘ây’ — như ‘ây’ trong ‘mây’" },
    { s: "aɪ", ex: "my", ipa: "/maɪ/", vi: "‘ai’ — như ‘ai’ trong ‘mai’" },
    { s: "ɔɪ", ex: "boy", ipa: "/bɔɪ/", vi: "‘oi’ — như ‘oi’ trong ‘coi’" },
    { s: "aʊ", ex: "now", ipa: "/naʊ/", vi: "‘ao’ — như ‘ao’ trong ‘cao’" },
    { s: "əʊ", ex: "go", ipa: "/ɡəʊ/", vi: "‘âu’ (Anh-Anh) / ‘ou’" },
    { s: "oʊ", ex: "go", ipa: "/ɡoʊ/", vi: "‘ou’ (Anh-Mỹ) — như ‘gâu’" },
    { s: "ɪə", ex: "here", ipa: "/hɪə/", vi: "‘i-ơ’ trượt nhanh" },
    { s: "eə", ex: "hair", ipa: "/heə/", vi: "‘e-ơ’ trượt nhanh" },
    { s: "ʊə", ex: "tour", ipa: "/tʊə/", vi: "‘u-ơ’ trượt nhanh" }
  ];
  const CONS = [
    { s: "p", ex: "pen", ipa: "/pen/", vi: "‘p’ bật hơi" },
    { s: "b", ex: "bad", ipa: "/bæd/", vi: "‘b’" },
    { s: "t", ex: "tea", ipa: "/tiː/", vi: "‘t’ bật hơi" },
    { s: "d", ex: "dog", ipa: "/dɒɡ/", vi: "‘đ’" },
    { s: "k", ex: "cat", ipa: "/kæt/", vi: "‘c/k’ bật hơi" },
    { s: "ɡ", ex: "go", ipa: "/ɡəʊ/", vi: "‘g’ (gờ)" },
    { s: "tʃ", ex: "chair", ipa: "/tʃeə/", vi: "‘ch’" },
    { s: "dʒ", ex: "joy", ipa: "/dʒɔɪ/", vi: "‘g/j’ — như ‘j’, hơi ‘gi’" },
    { s: "f", ex: "fine", ipa: "/faɪn/", vi: "‘ph/f’" },
    { s: "v", ex: "van", ipa: "/væn/", vi: "‘v’ (răng chạm môi)" },
    { s: "θ", ex: "think", ipa: "/θɪŋk/", vi: "‘th’ vô thanh — đặt lưỡi giữa hai hàm răng" },
    { s: "ð", ex: "this", ipa: "/ðɪs/", vi: "‘đ’ hữu thanh — lưỡi giữa răng, rung" },
    { s: "s", ex: "so", ipa: "/səʊ/", vi: "‘x/s’" },
    { s: "z", ex: "zoo", ipa: "/zuː/", vi: "‘z’ — s rung, như ‘dz’" },
    { s: "ʃ", ex: "she", ipa: "/ʃiː/", vi: "‘s’ nặng — như ‘sh’" },
    { s: "ʒ", ex: "vision", ipa: "/ˈvɪʒn/", vi: "‘gi’ rung — như ‘zh’" },
    { s: "h", ex: "hat", ipa: "/hæt/", vi: "‘h’" },
    { s: "m", ex: "man", ipa: "/mæn/", vi: "‘m’" },
    { s: "n", ex: "no", ipa: "/nəʊ/", vi: "‘n’" },
    { s: "ŋ", ex: "sing", ipa: "/sɪŋ/", vi: "‘ng’ cuối — như ‘ng’ trong ‘sang’" },
    { s: "l", ex: "leg", ipa: "/leɡ/", vi: "‘l’" },
    { s: "r", ex: "red", ipa: "/red/", vi: "‘r’ cong lưỡi, không rung" },
    { s: "j", ex: "yes", ipa: "/jes/", vi: "‘y’ — như ‘i’ trong ‘yêu’" },
    { s: "w", ex: "we", ipa: "/wiː/", vi: "‘u/w’ — như ‘qu’ nhẹ" }
  ];
  const MARKS = [
    { s: "ˈ", ex: "before", ipa: "/bɪˈfɔː/", vi: "dấu NHẤN CHÍNH — âm tiết ngay sau được đọc mạnh, cao hơn" },
    { s: "ˌ", ex: "understand", ipa: "/ˌʌndəˈstænd/", vi: "dấu nhấn phụ — nhấn nhẹ hơn nhấn chính" },
    { s: "ː", ex: "see", ipa: "/siː/", vi: "kéo dài nguyên âm liền trước" }
  ];

  const ALL = {};
  [VOWELS, DIPH, CONS, MARKS].forEach((g) => g.forEach((it) => { ALL[it.s] = it; }));
  // các ký hiệu, sắp theo độ dài giảm dần để nhận diện tʃ/dʒ/eɪ… trước ký tự đơn
  const SYMS = Object.keys(ALL).sort((a, b) => b.length - a.length);

  // Trả về danh sách ký hiệu IPA (không trùng) xuất hiện trong một chuỗi IPA.
  function legendFor(ipaStr) {
    const s = (ipaStr || "").replace(/^[\/\[]+|[\/\]]+$/g, "");
    const seen = new Set(), out = [];
    let i = 0;
    outer: while (i < s.length) {
      for (const sym of SYMS) {
        if (s.startsWith(sym, i)) {
          if (!seen.has(sym)) { seen.add(sym); out.push(ALL[sym]); }
          i += sym.length; continue outer;
        }
      }
      i++;
    }
    return out;
  }

  root.IPA_GUIDE = { VOWELS, DIPH, CONS, MARKS, ALL, legendFor };
})(typeof window !== "undefined" ? window : this);
