// Điền bảng hướng dẫn IPA. Để riêng ra file (không nội tuyến) vì extension MV3 chặn inline script.
function speak(text) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.85;
    const v = speechSynthesis.getVoices().find((v) => v.lang && v.lang.startsWith("en"));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) {}
}
function fill(id, list) {
  const box = document.getElementById(id);
  if (!box) return;
  list.forEach((it) => {
    const cell = document.createElement("div"); cell.className = "cell";
    const sym = document.createElement("div"); sym.className = "sym"; sym.textContent = it.s; cell.appendChild(sym);
    const info = document.createElement("div"); info.className = "info";
    const ex = document.createElement("div"); ex.className = "ex";
    ex.textContent = it.ex;
    const ei = document.createElement("span"); ei.className = "exipa"; ei.textContent = it.ipa; ex.appendChild(ei);
    const spk = document.createElement("button"); spk.className = "spk"; spk.textContent = "🔊";
    spk.title = "Nghe ví dụ"; spk.addEventListener("click", () => speak(it.ex)); ex.appendChild(spk);
    info.appendChild(ex);
    const vi = document.createElement("div"); vi.className = "vi"; vi.textContent = it.vi; info.appendChild(vi);
    cell.appendChild(info);
    box.appendChild(cell);
  });
}
(function () {
  const G = window.IPA_GUIDE;
  if (!G) return;
  fill("gVowels", G.VOWELS);
  fill("gDiph", G.DIPH);
  fill("gCons", G.CONS);
  fill("gMarks", G.MARKS);
  // hâm nóng danh sách giọng đọc để phát âm ví dụ đỡ trễ
  try { speechSynthesis.getVoices(); } catch (e) {}
})();
