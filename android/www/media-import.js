/* Pure import rules: source acquisition never grades or resets SRS. */
(function (root) {
  "use strict";
  const text = (v, n) => typeof v === "string" ? v.trim().slice(0,n) : "";
  function normalize(raw) {
    if (!raw || typeof raw !== "object") throw new Error("Dữ liệu từ không hợp lệ.");
    const language = text(raw.language || raw.wordLanguage, 20).toLowerCase().split(/[-_]/)[0];
    if (!["ja","en"].includes(language)) throw new Error("Sổ tay hiện hỗ trợ tiếng Nhật và tiếng Anh; bạn vẫn đọc và dịch được ngôn ngữ này.");
    const word = text(raw.word, 200);
    if (!word) throw new Error("Chưa có từ để lưu.");
    const translated = raw.translated === true;
    const sentence = text(translated ? raw.translatedSentence : raw.sentence, 4000);
    let url = text(raw.url, 4000);
    const videoId = text(raw.videoId, 11);
    const startMs = Number.isFinite(Number(raw.startMs)) ? Math.max(0,Number(raw.startMs)) : 0;
    const endMs = Number.isFinite(Number(raw.endMs)) ? Math.max(startMs,Number(raw.endMs)) : startMs;
    if (/^[A-Za-z0-9_-]{11}$/.test(videoId)) url = "https://www.youtube.com/watch?v=" + videoId + "&t=" + Math.floor(startMs / 1000);
    try { if (url && new URL(url).protocol !== "https:") url = ""; } catch (_) { url = ""; }
    const src = {url, title:text(raw.title,500) || (videoId ? "YouTube" : "Bài báo"), sel:word,
      cau:sentence, cauDich:!translated && (raw.meaningLanguage || "vi").startsWith("vi") ? text(raw.translatedSentence,4000) : "",
      media:videoId ? "youtube" : "article", language,
      prefix:text(raw.prefix,80), suffix:text(raw.suffix,80)};
    if (videoId && !translated) src.yt = {v:videoId,t:startMs / 1000,dur:(endMs-startMs)/1000};
    return {id:text(raw.id,100), word, language, dict:language === "ja" ? "javi" : "envi",
      reading:text(raw.reading,300), meaning:text(raw.meaning,3000),
      meaningLanguage:text(raw.meaningLanguage,20) || "vi", src};
  }
  function merge(old, item, now) {
    if (old?.del) return {item:old, status:"deleted"};
    if (item.id && old?.mediaImports?.includes(item.id)) return {item:old,status:"duplicate"};
    const next = old ? {...old} : {word:item.word,dict:item.dict,reading:item.reading,means:[]};
    if (!next.reading && item.reading) next.reading = item.reading;
    if (!next.means?.length && item.meaning && item.meaningLanguage.startsWith("vi")) next.means = [item.meaning];
    if ((!next.src || !next.src.url) && item.src.url) next.src = item.src;
    if (!next.cauNghe && item.src.cau && item.src.cau.includes(item.word))
      next.cauNghe = {cau:item.src.cau,dich:item.src.cauDich,ts:now,nguon:"media"};
    if (item.src.url) {
      const signature = s => [s.url,s.cau,s.sel].join("\u0000");
      const sources = [...(old?.mediaSources || [])];
      if (!sources.some(s=>signature(s) === signature(item.src))) sources.push(item.src);
      next.mediaSources = sources.slice(-30);
    }
    if (item.id) next.mediaImports = [...(old?.mediaImports || []),item.id].slice(-100);
    next.ts = now;
    return {item:next,status:old?"updated":"created"};
  }
  function sourceYouTube(item) {
    const src=item?.src || {};
    const valid=id=>/^[A-Za-z0-9_-]{11}$/.test(id || "");
    let url;
    try { url=new URL(src.url); } catch (_) {}
    const host=url?.hostname || "";
    const youtube=url && ["https:","http:"].includes(url.protocol) &&
      (host==="youtu.be" || host==="youtube.com" || host.endsWith(".youtube.com"));
    if (!youtube && !valid(src.yt?.v)) return "";
    let id=valid(src.yt?.v)?src.yt.v:"";
    if (!id && youtube) id=host==="youtu.be"?url.pathname.split("/")[1]:
      url.searchParams.get("v") || (/^\/(?:shorts|embed|live)\/([^/]+)/.exec(url.pathname)||[])[1];
    if (!valid(id)) return "";
    const parseTime=value=>{
      if (/^\d+(?:\.\d+)?$/.test(value || "")) return Number(value);
      const match=/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value || "");
      return match ? Number(match[1]||0)*3600+Number(match[2]||0)*60+Number(match[3]||0) : 0;
    };
    const time=src.yt?.t != null?Number(src.yt.t):parseTime(url?.searchParams.get("t") || url?.searchParams.get("start") || url?.hash?.match(/t=([^&]+)/)?.[1]);
    const seconds=Number.isFinite(time)?Math.min(604800,Math.max(0,Math.floor(time))):0;
    return "https://m.youtube.com/watch?v="+id+"&t="+seconds;
  }
  root.NeutronMediaImport = {normalize,merge,sourceYouTube};
  if (typeof module !== "undefined") module.exports = root.NeutronMediaImport;
})(typeof window !== "undefined" ? window : globalThis);
