/**
 * Nhạc nền theo chủ đề từng màn của chế độ "Ôn thi JLPT" — TỰ SINH bằng WebAudio, không có file âm thanh nào
 * (app không phình thêm, không dính bản quyền).
 *
 *   N3 · Phú Sĩ  : thang âm miyako-bushi (Nhật cổ), tiếng gảy kiểu đàn koto chậm rãi, nền gió núi.
 *   N2 · Okinawa : thang âm Ryukyu (do–mi–fa–sol–si), tiếng gảy kiểu sanshin nhịp lắc nhẹ, nền sóng biển.
 *
 * Làn điệu sinh từ một hạt giống cố định nên MỖI LẦN MỞ là cùng một bài, lặp vô hạn. Nhẹ máy: một bộ hẹn giờ 200ms
 * xếp trước vài nốt, mỗi nốt 2–3 bộ dao động; tạm dừng hẳn khi tắt, khi ẩn tab hoặc khi rời chế độ.
 *
 * Chính sách tự phát của trình duyệt: chỉ gọi `bat()` ngay sau một cú bấm của người dùng (mở màn là một cú bấm).
 */
(function (goc) {
  "use strict";

  /** Hạt giống → bộ số ngẫu nhiên lặp lại được (mulberry32). */
  function gieo(h) {
    let a = h >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const BAI = {
    n3: {
      bpm: 62, goc: 220.0, thang: [0, 1, 5, 7, 8], hat: 5101, xac: 0.5,
      bass: [0, 5, 7, 0],                       // gốc các hợp âm (bậc của thang), mỗi hợp âm 16 nốt
      gio: { tan: 900, q: 0.6, to: 0.05 }
    },
    n2: {
      bpm: 78, goc: 196.0, thang: [0, 4, 5, 7, 11], hat: 8803, xac: 0.62,
      bass: [0, 3, 2, 0],
      gio: { tan: 420, q: 0.8, to: 0.07 }
    }
  };

  let ctx = null, chinh = null, hoiAm = null, tiengGio = null;
  let hen = 0, dang = null, buoc = 0, tiep = 0, bai = null, giaiDieu = [];
  let an = false;

  const moMay = () => {
    if (ctx) return ctx;
    const C = goc.AudioContext || goc.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); } catch (e) { return null; }
    chinh = ctx.createGain(); chinh.gain.value = 0;
    // Vang nhẹ: một đường trễ có hồi tiếp, đã lọc trầm — đủ để tiếng gảy "ngân" như trong phòng.
    const tre = ctx.createDelay(1.0); tre.delayTime.value = 0.34;
    const hoi = ctx.createGain(); hoi.gain.value = 0.34;
    const loc = ctx.createBiquadFilter(); loc.type = "lowpass"; loc.frequency.value = 2400;
    const ra = ctx.createGain(); ra.gain.value = 0.42;
    hoiAm = ctx.createGain(); hoiAm.gain.value = 1;
    hoiAm.connect(chinh);
    hoiAm.connect(tre); tre.connect(loc); loc.connect(hoi); hoi.connect(tre); loc.connect(ra); ra.connect(chinh);
    chinh.connect(ctx.destination);
    return ctx;
  };

  /** Tiếng gảy dây: tam giác + bồi âm quãng tám, tắt dần theo hàm mũ. */
  function gay(f, t, to, dai, ki) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createBiquadFilter();
    o.type = ki === "sanshin" ? "sawtooth" : "triangle"; o2.type = "sine";
    o.frequency.value = f; o2.frequency.value = f * 2;
    l.type = "lowpass"; l.frequency.setValueAtTime(ki === "sanshin" ? 3200 : 4200, t);
    l.frequency.exponentialRampToValueAtTime(700, t + dai);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(to, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dai);
    o.connect(l); o2.connect(g2); g2.connect(l); l.connect(g); g.connect(hoiAm);
    o.start(t); o2.start(t); o.stop(t + dai + 0.05); o2.stop(t + dai + 0.05);
  }

  /** Nền ngân dài: hai sin lệch nhẹ nhau, vào chậm ra chậm. */
  function nen(f, t, dai, to) {
    [-1, 1].forEach((d) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f; o.detune.value = d * 5;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(to, t + dai * 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + dai);
      o.connect(g); g.connect(hoiAm);
      o.start(t); o.stop(t + dai + 0.05);
    });
  }

  /** Dựng làn điệu 64 nốt tám: mỗi 8 nốt có một nốt chắc (thuộc hợp âm), còn lại đi bước nhỏ trong thang. */
  function soan(b) {
    const r = gieo(b.hat);
    const n = b.thang.length, dem = [];
    let vt = 2 * n;                       // vị trí trong hai quãng tám của thang âm
    for (let i = 0; i < 64; i++) {
      const manh = i % 8 === 0;
      if (manh) { const goc = b.bass[((i / 16) | 0) % b.bass.length]; vt = n + goc + (r() < 0.5 ? 0 : 2); dem.push(vt); continue; }
      if (r() > b.xac) { dem.push(-1); continue; }               // nghỉ
      const buoc2 = [-2, -1, -1, 1, 1, 2][(r() * 6) | 0];
      vt = Math.max(n - 2, Math.min(3 * n - 1, vt + buoc2));
      dem.push(vt);
    }
    return dem;
  }

  const tanSo = (b, vt) => {
    const n = b.thang.length;
    const oct = Math.floor(vt / n), bac = ((vt % n) + n) % n;
    return b.goc * Math.pow(2, (b.thang[bac] + 12 * (oct - 1)) / 12) * 2;
  };

  function xep() {
    if (!ctx || !bai) return;
    const nhip = 60 / bai.bpm / 2;                                   // một nốt tám
    while (tiep < ctx.currentTime + 0.9) {
      const k = buoc % 64;
      if (k % 16 === 0) {
        const g = bai.bass[((k / 16) | 0) % bai.bass.length];
        const f = tanSo(bai, bai.thang.length + g) / 2;
        nen(f / 2, tiep, nhip * 17, 0.07);
        nen(f * Math.pow(2, bai.thang[Math.min(2, bai.thang.length - 1)] / 12) / 2, tiep + 0.05, nhip * 17, 0.035);
      }
      const vt = giaiDieu[k];
      if (vt >= 0) {
        // N2: nhịp lắc (nốt tám lẻ trễ một chút) cho cảm giác biển chiều
        const lac = dang === "n2" && k % 2 === 1 ? nhip * 0.16 : 0;
        gay(tanSo(bai, vt), tiep + lac, k % 8 === 0 ? 0.2 : 0.13, k % 8 === 0 ? 2.6 : 1.5, dang === "n2" ? "sanshin" : "koto");
      }
      tiep += nhip; buoc++;
    }
  }

  /** Gió (N3) hoặc sóng (N2): tiếng ồn lọc thông dải, to nhỏ theo một nhịp rất chậm. */
  function dungGio(b) {
    const dai = 2;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dai, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let x = 0;
    for (let i = 0; i < d.length; i++) { x = x * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = x * 6; }
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
    const l = ctx.createBiquadFilter(); l.type = "bandpass"; l.frequency.value = b.gio.tan; l.Q.value = b.gio.q;
    const g = ctx.createGain(); g.gain.value = b.gio.to;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = dang === "n2" ? 0.11 : 0.07; lg.gain.value = b.gio.to * 0.7;
    lfo.connect(lg); lg.connect(g.gain);
    s.connect(l); l.connect(g); g.connect(chinh);
    s.start(); lfo.start();
    tiengGio = { s, lfo };
  }

  function dungTat() {
    if (tiengGio) { try { tiengGio.s.stop(); tiengGio.lfo.stop(); } catch (e) { /* đã dừng */ } tiengGio = null; }
  }

  /** Máy có phát được âm thanh không (để ẩn nút khi không). */
  function kha() { return !!(goc.AudioContext || goc.webkitAudioContext); }

  /** Bật nhạc của màn `monId` (nếu màn đó không có bài riêng thì im lặng). Gọi ngay sau một cú bấm. */
  function bat(monId) {
    const b = BAI[monId];
    if (!b) { tat(); return; }
    if (dang === monId && hen) { if (ctx && ctx.state === "suspended") ctx.resume(); return; }
    const c = moMay();
    if (!c) return;
    tat(true);
    if (c.state === "suspended" && c.resume) { try { c.resume(); } catch (e) { /* chờ cú bấm sau */ } }
    dang = monId; bai = b; giaiDieu = soan(b); buoc = 0; tiep = c.currentTime + 0.15;
    dungGio(b);
    chinh.gain.cancelScheduledValues(c.currentTime);
    chinh.gain.setValueAtTime(chinh.gain.value, c.currentTime);
    chinh.gain.linearRampToValueAtTime(0.55, c.currentTime + 2);   // vào dần trong 2 giây
    xep();
    hen = setInterval(xep, 200);
  }

  /** Tắt nhạc (êm dần). `ngay` = bỏ qua hiệu ứng tắt dần, dùng khi sắp bật bài khác. */
  function tat(ngay) {
    if (hen) { clearInterval(hen); hen = 0; }
    dungTat();
    dang = null; bai = null;
    if (ctx && chinh) {
      const t = ctx.currentTime;
      chinh.gain.cancelScheduledValues(t);
      chinh.gain.setValueAtTime(chinh.gain.value, t);
      chinh.gain.linearRampToValueAtTime(0, t + (ngay ? 0.02 : 0.5));
    }
  }

  function dangPhat() { return !!hen; }

  // Ẩn tab / app xuống nền thì treo hẳn bộ âm thanh (không tốn pin), quay lại thì chạy tiếp.
  if (goc.document && goc.document.addEventListener) {
    goc.document.addEventListener("visibilitychange", () => {
      if (!ctx || !hen) return;
      an = goc.document.hidden;
      try { if (an) ctx.suspend(); else ctx.resume(); } catch (e) { /* không sao */ }
    });
  }

  goc.JlptNhac = { bat, tat, kha, dangPhat, BAI, soan, gieo };
})(typeof self !== "undefined" ? self : this);
