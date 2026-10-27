/**
 * NHẠC NỀN CỦA CHẾ ĐỘ ÔN THI JLPT (jlpt-nhac.js) — kiểm bằng AudioContext giả, không cần loa.
 *
 *   node kiem-tra/jlpt-nhac.mjs
 *
 * Kiểm: làn điệu sinh ra lặp lại được và nằm trong thang âm của từng màn; hai màn khác bài nhau; bật thì xếp nốt đều
 * đặn, tắt thì dừng hẳn (hết hẹn giờ, âm lượng về 0); màn không có bài thì im lặng; máy không có WebAudio thì không lỗi.
 */
const ket = [];
const soat = (t, d, c) => { ket.push(!!d); console.log("  " + (d ? "✓" : "✗") + " " + t + (c !== undefined && c !== "" ? "  (" + c + ")" : "")); };

const dem = { osc: 0, nguon: 0, intervals: 0 };
const tham = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime(v) { this.cuoi = v; }, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
const nut = () => ({ connect() {}, disconnect() {} });
class FakeCtx {
  constructor() { this.state = "running"; this.sampleRate = 8000; this.destination = nut(); this.t0 = performance.now(); }
  get currentTime() { return (performance.now() - this.t0) / 1000; }
  resume() { this.state = "running"; } suspend() { this.state = "suspended"; }
  createGain() { return Object.assign(nut(), { gain: tham() }); }
  createDelay() { return Object.assign(nut(), { delayTime: tham() }); }
  createBiquadFilter() { return Object.assign(nut(), { frequency: tham(), Q: tham(), type: "" }); }
  createOscillator() { dem.osc++; return Object.assign(nut(), { frequency: tham(), detune: tham(), type: "", start() {}, stop() {} }); }
  createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
  createBufferSource() { dem.nguon++; return Object.assign(nut(), { start() {}, stop() { this.dung = true; }, loop: false }); }
}

console.log("Không có WebAudio");
globalThis.self = globalThis;
await import("../extension/jlpt-nhac.js");
let NH = globalThis.JlptNhac;
soat("máy không có WebAudio: kha() = false", NH.kha() === false);
let loi = null; try { NH.bat("n3"); NH.tat(); } catch (e) { loi = e; }
soat("bật/tắt trên máy không có WebAudio không ném lỗi", !loi);

console.log("\nLàn điệu");
const a1 = NH.soan(NH.BAI.n3), a2 = NH.soan(NH.BAI.n3), b1 = NH.soan(NH.BAI.n2);
soat("cùng màn → cùng làn điệu (mỗi lần mở là cùng một bài)", JSON.stringify(a1) === JSON.stringify(a2));
soat("hai màn có hai bài khác nhau", JSON.stringify(a1) !== JSON.stringify(b1));
soat("64 nốt tám, có cả nốt nghỉ lẫn nốt gảy", a1.length === 64 && a1.some((x) => x < 0) && a1.some((x) => x >= 0), a1.filter((x) => x >= 0).length + " nốt");
soat("nốt đầu mỗi nhịp mạnh (8 nốt) luôn có tiếng", [0, 8, 16, 24, 32, 40, 48, 56].every((k) => a1[k] >= 0 && b1[k] >= 0));
soat("N3 dùng thang miyako-bushi (5 âm), N2 thang Ryukyu (5 âm)", NH.BAI.n3.thang.length === 5 && NH.BAI.n2.thang.join() === "0,4,5,7,11" && NH.BAI.n3.thang.join() === "0,1,5,7,8");
soat("nhịp N3 chậm hơn N2 (62 vs 78 bpm)", NH.BAI.n3.bpm < NH.BAI.n2.bpm);

console.log("\nPhát / tắt (AudioContext giả)");
globalThis.AudioContext = FakeCtx;
soat("có AudioContext: kha() = true", NH.kha() === true);
NH.bat("n3");
soat("bật N3: đang phát", NH.dangPhat());
await new Promise((r) => setTimeout(r, 900));
const n1 = dem.osc;
soat("đã xếp các nốt (có dao động được tạo)", n1 > 6, n1);
soat("có tiếng nền gió/sóng (nguồn nhiễu lặp)", dem.nguon === 1);
await new Promise((r) => setTimeout(r, 1000));
soat("tiếp tục xếp nốt theo thời gian", dem.osc > n1, dem.osc);
const truoc = dem.nguon;
NH.bat("n2");
soat("đổi sang N2: gió cũ dừng, sóng mới bắt đầu", dem.nguon === truoc + 1 && NH.dangPhat());
NH.bat("n2");
soat("bật lại cùng màn: không chồng thêm nguồn", dem.nguon === truoc + 1);
NH.tat();
soat("tắt: không còn phát", !NH.dangPhat());
const sau = dem.osc;
await new Promise((r) => setTimeout(r, 700));
soat("tắt rồi thì hết xếp nốt mới", dem.osc === sau, dem.osc + " / " + sau);
NH.bat("n1");
soat("màn chưa có bài (N1) thì im lặng", !NH.dangPhat());
NH.bat("n3"); NH.tat(); NH.tat();
soat("tắt hai lần liên tiếp không lỗi", !NH.dangPhat());
process.exit(ket.every(Boolean) ? 0 : 1);
