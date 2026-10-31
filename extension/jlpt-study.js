/* JLPT remediation: merge into the existing notebook; never replace unrelated fields. */
(function(g) {
  "use strict";
  function item(card, level) {
    if (!card || !card.muc) throw new Error("Không tìm thấy thẻ JLPT.");
    const m=card.muc, grammar=card.kieu==="pp", han=card.kieu==="han";
    const word=String(han?m.c:grammar?g.JlptCauHoi.tenPhap(m.p):m.w).trim();
    if (!word) throw new Error("Thẻ JLPT thiếu từ.");
    const sentence=card.vd?.j || "";
    return {word,dict:han?"kanji":"javi",reading:m.r || "",means:[han?(m.m || m.hv || m.nho || word):m.m].filter(Boolean),
      ...(han?{hv:m.hv || "",on:m.on || "",kun:m.kun || ""}:{}),
      jlptSource:{level,id:m.id,kind:card.kieu},
      ...(sentence?{cauNghe:{cau:sentence,dich:card.vd.v || "",nguon:"jlpt"},
        src:{cau:sentence,cauDich:card.vd.v || "",title:(level==="kaiwa"?"Kaiwa Nihongo":"JLPT "+level.toUpperCase())}}:{})};
  }
  function merge(old, incoming, now) {
    if (old?.del) return old; // A deleted item requires an explicit restore.
    const next={...incoming,...old,ts:Math.max(now,(old?.ts || 0)+1),jlptSource:incoming.jlptSource,jlptReviewAt:now};
    if (!next.means?.length) next.means=incoming.means;
    if (!next.reading) next.reading=incoming.reading;
    if (!next.cauNghe?.cau && !next.cauNghe?.sua && incoming.cauNghe) next.cauNghe={...incoming.cauNghe,ts:now};
    if (!next.src && incoming.src) next.src=incoming.src;
    // "Not known" is explicit evidence to resume all available study routes.
    next.dongBang=false;
    next.lichRieng={...next.lichRieng};
    for (const route of ["nhin","nghe","dien"])
      next.lichRieng[route]={...next.lichRieng[route],dongBang:false,hen:0,ts:now};
    return next;
  }
  g.JlptStudy={item,merge};
})(typeof self!=="undefined"?self:this);
