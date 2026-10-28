(function () {
  "use strict";
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0), word = selection.toString().trim();
  if (!word || word.length > 200) return null;
  let element = range.commonAncestorContainer;
  if (element.nodeType !== 1) element = element.parentElement;
  if (!element || element.closest("input,textarea,[contenteditable=true]")) return null;
  const block = element.closest("p,li,blockquote,h1,h2,h3,h4,td,figcaption,article,main") || element.closest("div") || element;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement?.closest("script,style,rt,rp,noscript,button,input,textarea")
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }
  });
  let text = "", offset = -1, node;
  while ((node = walker.nextNode())) {
    if (node === range.startContainer) offset = text.length + range.startOffset;
    if (text.length > 250000) break;
    text += node.nodeValue;
  }
  if (offset < 0) offset = text.indexOf(word);
  if (offset < 0) return null;
  let sentence = "";
  try {
    const locale = document.documentElement.lang || "ja";
    for (const part of new Intl.Segmenter(locale, {granularity:"sentence"}).segment(text)) {
      if (part.index <= offset && part.index + part.segment.length > offset) { sentence = part.segment.trim(); break; }
    }
  } catch (_) {}
  if (!sentence || !sentence.includes(word)) {
    const before = text.slice(0, offset).search(/[^。！？!?;\n]*$/);
    const tail = text.slice(offset + word.length).search(/[。！？!?;\n]/);
    sentence = text.slice(before < 0 ? 0 : before, tail < 0 ? text.length : offset + word.length + tail + 1).trim();
  }
  // Prefer a list line when a bullet separates independent examples.
  const line = sentence.split(/\n\s*(?:[-•・]\s*)?/).find(x => x.includes(word));
  if (line && /\n/.test(sentence)) sentence = line.trim();
  if (sentence.length > 4000) return JSON.stringify({error:"Câu quá dài. Hãy chọn trong phần nội dung bài."});
  return JSON.stringify({
    word, sentence, url:location.href, title:document.title,
    language:document.documentElement.lang || "",
    prefix:text.slice(Math.max(0,offset-40),offset), suffix:text.slice(offset+word.length,offset+word.length+40)
  });
})()
