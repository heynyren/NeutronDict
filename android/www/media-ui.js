/* The trusted Capacitor page is the only writer of the NeutronDict notebook. */
(function () {
  "use strict";
  const native = () => window.Capacitor?.Plugins?.NeutronMedia;
  const byId = id => document.getElementById(id);
  let importing = null, news = null, pageSize = 30, onlySaved = false;
  const notifyError = e => toast(e?.message || String(e), "bad");

  async function importItem(raw) {
    const item = window.NeutronMediaImport.normalize(raw);
    let status;
    await capNhat(nb => {
      const key = item.dict + ":" + item.word;
      const result = window.NeutronMediaImport.merge(nb[key],item,Date.now());
      nb[key] = result.item; status = result.status;
    });
    if (status === "deleted") throw new Error("Từ này đã được xóa. Khôi phục trong sổ tay trước khi lưu lại.");
    // Optional enrichment happens only after the source is safely persisted.
    if (!item.meaning || !item.meaningLanguage.startsWith("vi")) {
      lookup(item.word,item.dict).then(entries => capNhat(nb => {
        const key = item.dict + ":" + item.word, current = nb[key], en = entries[0];
        if (!current || current.del || current.mEdit || current.means?.length || !en) return;
        nb[key] = {...current,means:en.means || [],reading:current.reading || en.reading || "",ts:Date.now()};
      })).then(()=>syncNow(item.language)).catch(()=>{});
    }
    syncNow(item.language).catch(()=>{});
    return {status,key:item.dict + ":" + item.word};
  }
  async function drain() {
    if (!native()) return;
    if (importing) return importing;
    importing = (async () => {
      const {items=[]} = await native().inbox();
      const ack = [];
      for (const item of items) {
        try { await importItem(item); ack.push(item.id); }
        catch (e) {
          // Unsupported languages remain in DualSub's own library; tombstones stay deleted.
          if (!["ja","en"].includes(String(item.language || item.wordLanguage).split(/[-_]/)[0])) { ack.push(item.id); continue; }
          const normalized = window.NeutronMediaImport.normalize(item);
          const nb = await getNB();
          if (nb[normalized.dict + ":" + normalized.word]?.del) { ack.push(item.id); continue; }
          throw e;
        }
      }
      if (ack.length) {
        await native().acknowledge({ids:ack});
        if (manHienTai === "Notebook") await drawNotebook();
        updateDueButton();
        toast("Đã nhận " + ack.length + " mục từ YouTube");
      }
    })().finally(()=>{ importing=null; });
    return importing;
  }
  window.NeutronReaderRequest = async request => {
    let result, error;
    try {
      const raw = request.item || {};
      if (request.op === "lookup") {
        const lang = String(raw.language || "ja").split(/[-_]/)[0];
        const translation = raw.sentence ? gtxTranslate(raw.sentence,lang,"vi").catch(()=>"") : Promise.resolve("");
        const entries = ["ja","en"].includes(lang) ? await lookup(raw.word,lang==="ja"?"javi":"envi") :
          [{word:raw.word,means:[await gtxTranslate(raw.word,lang,"vi")]}];
        const first = entries[0];
        if (!first) throw new Error("Chưa lấy được nghĩa. Kiểm tra mạng và thử lại.");
        const nb = await getNB(), old = nb[(lang==="ja"?"javi":"envi")+":"+raw.word];
        result = {reading:first.reading || "", meaning:((old?.mEdit ? old.means : first.means) || []).map(meanToStr).join("\n"),
          translation:await translation};
      } else if (request.op === "save") {
        // Request stays inside the live Capacitor instance; no second notebook writer.
        result = await importItem({...raw,id:raw.id || crypto.randomUUID()});
      } else if (request.op === "drain") {
        await drain(); result={ok:true};
      } else throw new Error("Thao tác không hợp lệ.");
    } catch(e) { error=e.message || String(e); }
    await native()?.readerReply({requestId:request.requestId,result:result || {},error:error || null});
  };
  window.NeutronMediaOpenSource = it => {
    if (!native() || !it?.src?.url) return false;
    let u; try { u=new URL(it.src.url); } catch(_) { return false; }
    if (u.protocol !== "https:") return false;
    dungDongHo();
    if (u.hostname==="youtu.be" || u.hostname==="youtube.com" || u.hostname.endsWith(".youtube.com")) {
      native().openYouTube({url:it.src.url}).catch(notifyError); return true;
    }
    if (/\.pdf$/i.test(u.pathname)) return false;
    native().openArticle({url:it.src.url,language:it.src.language || (it.dict==="javi"?"ja":"en"),
      sentence:it.src.cau || it.src.sel || it.word,title:it.src.title || ""}).catch(notifyError);
    return true;
  };
  function addButton(parent,label,action,classes="btn sm") {
    const button=document.createElement("button");
    button.type="button";button.className=classes;button.textContent=label;button.onclick=action;
    parent.appendChild(button);return button;
  }
  async function refresh(force=false) {
    if (!native()) return;
    const button=byId("newsRefresh");button.disabled=true;
    byId("newsStatus").textContent=force?"Đang cập nhật tin…":"Đang mở danh sách…";
    try {
      news=await native().news({refresh:force});
      renderNews();
      byId("newsStatus").textContent=(news.updatedAt?"Cập nhật "+new Date(news.updatedAt).toLocaleString():"Chưa có tin — bấm Cập nhật")
        +(news.errors?.length?" · "+news.errors.map(e=>e.title+": "+e.message).join(" · "):"");
    }catch(e){byId("newsStatus").textContent=e.message || String(e);}
    finally{button.disabled=false;}
  }
  function renderNews() {
    const language=byId("newsLanguage").value, query=byId("newsSearch").value.toLowerCase().trim();
    const list=(onlySaved?news?.bookmarks:news?.articles)||[], bookmarks=new Set((news?.bookmarks||[]).map(x=>x.url));
    const filtered=list.filter(x=>(!language||x.language?.split("-")[0]===language)&&(!query||(x.title+" "+x.source).toLowerCase().includes(query)));
    const root=byId("newsList");root.replaceChildren();
    for(const article of filtered.slice(0,pageSize)) {
      const card=document.createElement("article");card.className="card news-card";
      const title=document.createElement("button");title.type="button";title.className="news-title";title.textContent=article.title;
      title.onclick=()=>native().openArticle(article).catch(notifyError);card.appendChild(title);
      const meta=document.createElement("p");meta.className="t-tiny muted";meta.textContent=[article.source,article.language,
        article.date?new Date(article.date).toLocaleDateString():"",article.offline?"Đã lưu đọc offline":""].filter(Boolean).join(" · ");
      card.appendChild(meta);
      addButton(card,bookmarks.has(article.url)?"★ Đã đánh dấu":"☆ Đọc sau",async()=>{
        try{await native().bookmark({article,saved:!bookmarks.has(article.url)});await refresh();}catch(e){notifyError(e);}
      });
      root.appendChild(card);
    }
    if (!filtered.length) {const p=document.createElement("p");p.textContent="Chưa có bài phù hợp. Thêm nguồn hoặc cập nhật tin.";root.appendChild(p);}
    byId("newsMore").hidden=filtered.length<=pageSize;
    byId("newsMinutes").value=String(news?.minutes ?? 30);
  }
  function configure() {
    const root=byId("newsFeeds");root.replaceChildren();
    for(const feed of news?.feeds || []) {
      const row=document.createElement("div");row.className="rowx";
      const label=document.createElement("span");label.className="grow";label.textContent=feed.title+" · "+feed.language;row.appendChild(label);
      addButton(row,"Xóa",async()=>{try{await native().configureNews({feeds:news.feeds.filter(x=>x.url!==feed.url),minutes:news.minutes});await refresh();configure();}catch(e){notifyError(e);}});
      root.appendChild(row);
    }
  }
  function boot() {
    if (!native()) return;
    byId("mediaBar").hidden=false;
    byId("mediaYouTube").onclick=()=>{dungDongHo();native().openYouTube({}).catch(notifyError);};
    byId("mediaNews").onclick=()=>{
      dungDongHo();byId("newsDialog").showModal();
      refresh().then(()=>{configure();if(!news?.updatedAt || Date.now()-news.updatedAt>30*60000)refresh(true);});
    };
    byId("mediaAi").onclick=()=>{
      dungDongHo();
      const screen=document.querySelector(".view.show");
      const context=(window.getSelection()?.toString() || screen?.innerText || "").slice(0,14000);
      // Never read values from settings fields (tokens, URLs, keys).
      native().openAssistant({context:"Màn hình "+manHienTai+"\n"+context,language:NGU}).catch(notifyError);
    };
    byId("newsClose").onclick=()=>byId("newsDialog").close();
    byId("newsRefresh").onclick=()=>refresh(true);
    byId("newsMore").onclick=()=>{pageSize+=30;renderNews();};
    byId("newsLanguage").onchange=()=>{pageSize=30;renderNews();};
    byId("newsSearch").oninput=()=>{pageSize=30;renderNews();};
    byId("newsSaved").onclick=()=>{onlySaved=!onlySaved;byId("newsSaved").textContent=onlySaved?"Xem tất cả tin":"★ Bài đã lưu";renderNews();};
    byId("newsMinutes").onchange=async()=>{
      try{await native().configureNews({feeds:news.feeds,minutes:Number(byId("newsMinutes").value)});await refresh();}
      catch(e){notifyError(e);}
    };
    byId("newsAddFeed").onsubmit=async event=>{
      event.preventDefault();
      const url=byId("newsFeedUrl").value.trim(),language=byId("newsFeedLanguage").value.trim().toLowerCase();
      try {
        const u=new URL(url);if(u.protocol!=="https:")throw new Error("Dùng địa chỉ HTTPS của nguồn RSS/Atom.");
        const feed={url,language,title:byId("newsFeedTitle").value.trim()||u.hostname};
        await native().configureNews({feeds:[...(news.feeds||[]),feed],minutes:news.minutes});
        event.target.reset();await refresh(true);configure();
      }catch(e){notifyError(e);}
    };
    document.addEventListener("visibilitychange",()=>{if(!document.hidden){drain().catch(notifyError);if(byId("newsDialog").open)refresh();}});
    window.addEventListener("neutrondict-media",()=>drain().catch(notifyError));
    drain().catch(notifyError);
    native().news({}).then(snapshot=>native().configureNews({feeds:snapshot.feeds,minutes:snapshot.minutes})).catch(notifyError);
  }
  if(window.NeutronReady)boot();else window.addEventListener("neutrondict-ready",boot,{once:true});
})();
