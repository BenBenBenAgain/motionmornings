// ===== Motion Mornings: animation engine (logical canvas 1080 x 1920) =====
const LSN = (() => {
const W = 1080, H = 1920, PI = Math.PI;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const hexCache = {};
const C = h => {
  if (Array.isArray(h)) return h;
  if (hexCache[h]) return hexCache[h];
  let s = String(h || '#888888').replace('#', '');
  if (s.length === 3) s = s.split('').map(c => c + c).join('');
  const v = [0, 2, 4].map(i => (parseInt(s.slice(i, i + 2), 16) || 0) / 255);
  hexCache[h] = v; return v;
};
const css = (c, a = 1) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
const darken = (c, k) => mix(C(c), [0, 0, 0], k);
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

let X = null;
const NAVY = [0.12, 0.18, 0.30], CREAM = [0.99, 0.95, 0.89], CORAL = [0.93, 0.52, 0.43], GOLD = [0.97, 0.76, 0.45];

function fill(c, a = 1) { X.fillStyle = css(C(c), a); X.fill(); }
function ell(cx, cy, rx, ry) { X.beginPath(); X.ellipse(cx, cy, Math.abs(rx) || 0.01, Math.abs(ry) || 0.01, 0, 0, 2 * PI); }
function circ(x, y, r) { X.beginPath(); X.arc(x, y, Math.max(r, 0.01), 0, 2 * PI); }
function rr(x, y, w, h, r) {
  X.beginPath(); r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  X.moveTo(x + r, y); X.arcTo(x + w, y, x + w, y + h, r); X.arcTo(x + w, y + h, x, y + h, r);
  X.arcTo(x, y + h, x, y, r); X.arcTo(x, y, x + w, y, r); X.closePath();
}
function line(pts, w, c, a = 1) {
  X.beginPath(); X.lineWidth = w; X.lineCap = 'round'; X.lineJoin = 'round';
  X.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) X.lineTo(pts[i][0], pts[i][1]);
  X.strokeStyle = css(C(c), a); X.stroke();
}
function lin(x0, y0, x1, y1, stops) {
  const g = X.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(s => g.addColorStop(s[0], css(C(s[1]), s[2] == null ? 1 : s[2]))); return g;
}
function rect(x, y, w, h, c, a = 1) { X.fillStyle = typeof c === 'object' && !Array.isArray(c) ? c : css(C(c), a); X.fillRect(x, y, w, h); }

// ---------------------------------------------------------------- skies & worlds
const SKIES = {
  day: [[0.45, 0.68, 0.90], [0.84, 0.91, 0.96], null],
  sunrise: [[0.52, 0.62, 0.84], [0.99, 0.82, 0.64], [1.0, 0.86, 0.62]],
  sunset: [[0.36, 0.38, 0.62], [0.98, 0.63, 0.46], [1.0, 0.72, 0.45]],
  dusk: [[0.14, 0.17, 0.34], [0.62, 0.42, 0.50], null],
};
const GROUND_TINT = { day: [0, null], sunrise: [0.08, [1, 0.8, 0.6]], sunset: [0.2, [0.85, 0.45, 0.38]], dusk: [0.55, [0.22, 0.2, 0.3]] };
const gt = (c, tod) => { const [k, to] = GROUND_TINT[tod]; return k ? mix(C(c), to, k) : C(c); };
const sunX = tod => tod === 'sunrise' ? 760 : 320;

function sky(t, tod, sunY, horizon = 1060) {
  const [top, bot, sun] = SKIES[tod];
  rect(0, 0, W, horizon, lin(0, 0, 0, horizon, [[0, top], [1, bot]]));
  if (tod === 'dusk') {
    const r = rng(3);
    for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * 800, s = 1.5 + r() * 2; circ(x, y, s); fill([1, 1, 1], 0.4 + 0.4 * Math.sin(t * 2 + i)); }
  }
  if (sun) {
    const sx = sunX(tod), sy = sunY == null ? 960 : sunY;
    const g = X.createRadialGradient(sx, sy, 10, sx, sy, 420);
    g.addColorStop(0, css(sun, 0.7)); g.addColorStop(1, css(sun, 0));
    rect(0, 0, W, horizon, g);
    circ(sx, sy, 78); fill([1, 0.95, 0.82]);
  }
  if (tod === 'day') {
    [[200, 820], [760, 760]].forEach(([cx, cy]) => {
      cx = ((cx + t * 12) % (W + 300)) - 150;
      [[0, 0, 40], [45, -15, 50], [95, 0, 38], [45, 10, 42]].forEach(([dx, dy, r]) => { circ(cx + dx, cy + dy, r); fill([1, 1, 1], 0.7); });
    });
  }
}

function beach(t, tod, sunY) {
  sky(t, tod, sunY);
  const bot = SKIES[tod][1];
  const hl = tod !== 'dusk' ? mix(mix([0.55, 0.57, 0.42], bot, 0.35), [0, 0, 0], 0) : [0.18, 0.18, 0.25];
  X.beginPath(); X.moveTo(0, 1060); X.lineTo(0, 975); X.bezierCurveTo(80, 960, 180, 990, 300, 1060); X.closePath(); fill(hl);
  const tint = { day: 0, sunrise: 0.25, sunset: 0.35, dusk: 0.55 }[tod];
  let s1 = mix([0.22, 0.47, 0.64], bot, tint * 0.5), s2 = mix([0.33, 0.62, 0.72], bot, tint * 0.6);
  if (tod === 'dusk') { s1 = mix(s1, [0.1, 0.12, 0.25], 0.5); s2 = mix(s2, [0.2, 0.2, 0.35], 0.5); }
  rect(0, 1055, W, 270, lin(0, 1055, 0, 1325, [[0, s1], [1, s2]]));
  if (SKIES[tod][2]) {
    const sx = sunX(tod);
    for (let i = 0; i < 8; i++) { const y = 1070 + i * 26, w = 160 - i * 12 + 20 * Math.sin(t * 2 + i); line([[sx - w / 2, y], [sx + w / 2, y]], 6, [1, 0.9, 0.7], 0.5); }
  }
  [[1130, 8, 1.2, 0.55], [1200, 10, 1.6, 0.7], [1270, 12, 2.0, 0.85]].forEach(([y0, amp, sp, a], k) => {
    X.beginPath(); X.moveTo(-10, y0);
    for (let x = -10; x < W + 20; x += 20) X.lineTo(x, y0 + amp * Math.sin(x / 70 + t * sp + k));
    X.lineWidth = 10 + k * 3; X.lineCap = 'round'; X.strokeStyle = css([1, 1, 1], a * (tod === 'dusk' ? 0.6 : 1)); X.stroke();
  });
  const sand1 = gt([0.86, 0.73, 0.54], tod), sand2 = gt([0.80, 0.65, 0.46], tod);
  rect(0, 1320, W, 600, lin(0, 1320, 0, H, [[0, sand1], [1, sand2]]));
  const wi = 1325 + 18 * Math.sin(t * 1.3);
  X.beginPath(); X.moveTo(0, 1320);
  for (let x = 0; x <= W + 30; x += 30) X.lineTo(x, wi + 10 * Math.sin(x / 90 + t));
  X.lineTo(W, 1320); X.closePath(); fill(mix(s2, [1, 1, 1], 0.4), 0.8);
  const r = rng(7);
  for (let i = 0; i < 26; i++) { ell(r() * W, 1450 + r() * 450, 14, 7); fill(sand2, 0.6); }
}

function tree(x, y, s, col, trunk) {
  rect(x - 10 * s, y - 120 * s, 20 * s, 120 * s, trunk);
  [[0, -170, 70], [-45, -140, 50], [45, -140, 52], [0, -215, 50]].forEach(([dx, dy, r]) => { circ(x + dx * s, y + dy * s, r * s); fill(col); });
}
function park(t, tod, sunY) {
  sky(t, tod, sunY, 1100);
  const bot = SKIES[tod][1];
  const far = gt(mix([0.55, 0.7, 0.45], bot, 0.4), tod), mid = gt([0.47, 0.66, 0.38], tod);
  X.beginPath(); X.moveTo(0, 1100); X.bezierCurveTo(250, 960, 500, 1060, 700, 1000); X.bezierCurveTo(850, 960, 1000, 1010, W, 990); X.lineTo(W, 1340); X.lineTo(0, 1340); X.closePath(); fill(far);
  const tc = gt([0.32, 0.55, 0.32], tod), tk = gt([0.45, 0.32, 0.22], tod);
  [[120, 1110, 0.8], [330, 1080, 0.6], [880, 1050, 0.75], [990, 1070, 0.55]].forEach(([x, y, s]) => tree(x, y, s, tc, tk));
  X.beginPath(); X.moveTo(0, 1250); X.bezierCurveTo(300, 1170, 700, 1230, W, 1180); X.lineTo(W, 1340); X.lineTo(0, 1340); X.closePath(); fill(mid);
  rect(0, 1320, W, 600, lin(0, 1320, 0, H, [[0, gt([0.55, 0.73, 0.4], tod)], [1, gt([0.42, 0.6, 0.32], tod)]]));
  X.beginPath(); X.moveTo(380, 1320); X.bezierCurveTo(600, 1450, 100, 1650, 300, H); X.lineTo(700, H); X.bezierCurveTo(500, 1650, 900, 1450, 520, 1320); X.closePath();
  fill(gt([0.87, 0.8, 0.62], tod), 0.75);
  const r = rng(9);
  for (let i = 0; i < 30; i++) {
    const x = r() * W, y = 1360 + r() * 540;
    line([[x, y], [x - 6, y - 20]], 4, gt([0.35, 0.55, 0.3], tod)); line([[x, y], [x + 6, y - 22]], 4, gt([0.35, 0.55, 0.3], tod));
    if (i % 4 === 0) { circ(x + 14, y - 12, 7); fill(i % 8 ? [1, 0.85, 0.4] : [1, 0.6, 0.6]); }
  }
}

function city(t, tod, sunY) {
  sky(t, tod, sunY, 1260);
  const bot = SKIES[tod][1];
  const r = rng(21);
  const lit = tod === 'dusk' || tod === 'sunset';
  for (let layer = 0; layer < 2; layer++) {
    let x = -40;
    const base = 1270;
    while (x < W + 40) {
      const w = 90 + r() * 90, h = (layer ? 220 : 380) + r() * (layer ? 300 : 320);
      const col = layer ? gt(mix([0.36, 0.42, 0.55], bot, 0.25), tod) : gt(mix([0.6, 0.66, 0.76], bot, 0.5), tod);
      rect(x, base - h, w - 8, h, col);
      if (layer) {
        for (let yy = base - h + 30; yy < base - 40; yy += 46) for (let xx = x + 16; xx < x + w - 30; xx += 34) {
          const on = r() > (lit ? 0.45 : 0.75);
          rect(xx, yy, 16, 22, on ? (lit ? [1, 0.86, 0.5] : [0.85, 0.92, 1]) : col, on ? (lit ? 0.9 : 0.5) : 1);
        }
      }
      x += w;
    }
  }
  rect(0, 1260, W, 70, gt([0.55, 0.55, 0.58], tod));
  rect(0, 1320, W, 600, lin(0, 1320, 0, H, [[0, gt([0.84, 0.79, 0.72], tod)], [1, gt([0.76, 0.7, 0.62], tod)]]));
  for (let y = 1400; y < H; y += 120) line([[0, y], [W, y]], 3, gt([0.7, 0.64, 0.56], tod), 0.6);
  [[90, 1360], [990, 1360]].forEach(([x, y]) => { tree(x, y, 0.8, gt([0.38, 0.6, 0.36], tod), gt([0.45, 0.32, 0.22], tod)); rr(x - 50, y - 10, 100, 60, 10); fill(gt([0.6, 0.5, 0.42], tod)); });
  if (lit) [[300, 1330], [780, 1330]].forEach(([x, y]) => { line([[x, y], [x, y - 330]], 10, [0.2, 0.2, 0.24]); const g = X.createRadialGradient(x, y - 340, 4, x, y - 340, 120); g.addColorStop(0, css([1, 0.85, 0.5], 0.7)); g.addColorStop(1, css([1, 0.85, 0.5], 0)); circ(x, y - 340, 120); X.fillStyle = g; X.fill(); circ(x, y - 340, 18); fill([1, 0.9, 0.6]); });
}

function pine(x, y, s, col) {
  rect(x - 7 * s, y - 40 * s, 14 * s, 40 * s, [0.35, 0.25, 0.18]);
  for (let i = 0; i < 3; i++) { X.beginPath(); X.moveTo(x, y - (200 - i * 45) * s); X.lineTo(x - (55 + i * 12) * s, y - (40 + (2 - i) * 45) * s); X.lineTo(x + (55 + i * 12) * s, y - (40 + (2 - i) * 45) * s); X.closePath(); fill(col); }
}
function mountains(t, tod, sunY) {
  sky(t, tod, sunY, 1160);
  const bot = SKIES[tod][1];
  const far = gt(mix([0.55, 0.62, 0.78], bot, 0.45), tod), near = gt(mix([0.38, 0.46, 0.6], bot, 0.2), tod);
  const peaks = (pts, col, snow) => {
    X.beginPath(); X.moveTo(0, 1180); pts.forEach(p => X.lineTo(p[0], p[1])); X.lineTo(W, 1180); X.closePath(); fill(col);
    if (snow) pts.forEach((p, i) => { if (i % 2 === 1 && p[1] < 900) { X.beginPath(); X.moveTo(p[0], p[1]); X.lineTo(p[0] - 50, p[1] + 70); X.lineTo(p[0] - 15, p[1] + 55); X.lineTo(p[0] + 10, p[1] + 75); X.lineTo(p[0] + 50, p[1] + 70); X.closePath(); fill([1, 1, 1], tod === 'dusk' ? 0.5 : 0.9); } });
  };
  peaks([[0, 950], [180, 760], [330, 930], [520, 700], [700, 940], [860, 780], [W, 960]], far, true);
  peaks([[0, 1080], [150, 960], [300, 1060], [480, 990], [650, 1080], [820, 970], [W, 1060]], near, false);
  const tod2 = tod;
  const l1 = gt(mix([0.35, 0.58, 0.72], bot, 0.3), tod2), l2 = gt([0.45, 0.66, 0.76], tod2);
  rect(0, 1160, W, 170, lin(0, 1160, 0, 1330, [[0, l1], [1, l2]]));
  for (let i = 0; i < 6; i++) { const y = 1185 + i * 24, w = 200 + 60 * Math.sin(t + i); line([[540 - w / 2 + 80 * Math.sin(i), y], [540 + w / 2 + 80 * Math.sin(i), y]], 5, [1, 1, 1], 0.35); }
  const pc = gt([0.25, 0.45, 0.32], tod);
  [[60, 1180, 0.9], [150, 1170, 0.7], [960, 1180, 0.9], [1040, 1170, 0.65]].forEach(([x, y, s]) => pine(x, y, s, pc));
  rect(0, 1320, W, 600, lin(0, 1320, 0, H, [[0, gt([0.62, 0.68, 0.45], tod)], [1, gt([0.52, 0.55, 0.36], tod)]]));
  const r = rng(13);
  for (let i = 0; i < 14; i++) { ell(r() * W, 1420 + r() * 480, 26, 14); fill(gt([0.6, 0.58, 0.55], tod)); }
}

// countryside: patchwork hills, a red barn and silo, round hay bales, a fence and a dirt road
function country(t, tod, sunY) {
  sky(t, tod, sunY, 1090);
  const bot = SKIES[tod][1];
  X.beginPath(); X.moveTo(0, 1090); X.bezierCurveTo(260, 1010, 520, 1070, 760, 1030); X.bezierCurveTo(900, 1005, 1000, 1030, W, 1020); X.lineTo(W, 1200); X.lineTo(0, 1200); X.closePath(); fill(gt(mix([0.6, 0.72, 0.48], bot, 0.35), tod));
  [[0, 1140, 380, [0.86, 0.74, 0.42]], [380, 1120, 360, [0.52, 0.7, 0.4]], [740, 1130, 340, [0.78, 0.68, 0.4]]].forEach(([x, y, w, c]) => { X.beginPath(); X.moveTo(x - 20, y + 40); X.quadraticCurveTo(x + w / 2, y - 30, x + w + 20, y + 30); X.lineTo(x + w + 20, 1260); X.lineTo(x - 20, 1260); X.closePath(); fill(gt(c, tod)); for (let k = 1; k < 5; k++) { X.beginPath(); X.moveTo(x, y + 30 + k * 26); X.quadraticCurveTo(x + w / 2, y + k * 26, x + w, y + 25 + k * 26); X.lineWidth = 3; X.strokeStyle = css(gt(mix(c, [0, 0, 0], 0.1), tod)); X.stroke(); } });
  const bx = 780, by = 1100; rect(bx, by - 90, 130, 90, gt([0.72, 0.24, 0.2], tod)); X.beginPath(); X.moveTo(bx - 12, by - 90); X.lineTo(bx + 65, by - 150); X.lineTo(bx + 142, by - 90); X.closePath(); fill(gt([0.45, 0.16, 0.14], tod)); rect(bx + 45, by - 55, 40, 55, gt([0.95, 0.92, 0.85], tod)); line([[bx + 45, by - 55], [bx + 85, by]], 4, gt([0.72, 0.24, 0.2], tod)); line([[bx + 85, by - 55], [bx + 45, by]], 4, gt([0.72, 0.24, 0.2], tod));
  rect(bx + 150, by - 160, 50, 160, gt([0.8, 0.8, 0.78], tod)); ell(bx + 175, by - 160, 25, 16); fill(gt([0.6, 0.6, 0.62], tod));
  rect(0, 1250, W, 670, lin(0, 1250, 0, H, [[0, gt([0.6, 0.74, 0.42], tod)], [1, gt([0.46, 0.62, 0.32], tod)]]));
  X.beginPath(); X.moveTo(560, 1250); X.bezierCurveTo(520, 1400, 760, 1600, 640, H); X.lineTo(980, H); X.bezierCurveTo(1000, 1600, 640, 1400, 600, 1250); X.closePath(); fill(gt([0.82, 0.7, 0.52], tod));
  [[150, 1330, 1], [300, 1300, 0.7]].forEach(([x, y, s]) => { circ(x, y, 60 * s); fill(gt([0.88, 0.74, 0.42], tod)); circ(x, y, 34 * s); X.lineWidth = 5; X.strokeStyle = css(gt([0.72, 0.58, 0.3], tod)); X.stroke(); });
  for (let x = 20; x < W; x += 120) line([[x, 1390], [x, 1300]], 10, gt([0.55, 0.4, 0.28], tod));
  [1320, 1355].forEach(y => line([[0, y], [W, y + 6]], 6, gt([0.6, 0.45, 0.3], tod)));
}
// a lake: tree line, still water with the light reflected, a jetty and reeds
function lake(t, tod, sunY) {
  sky(t, tod, sunY, 1060);
  const bot = SKIES[tod][1];
  for (let x = -40; x < W + 40; x += 70) { const hh = 60 + 40 * Math.abs(Math.sin(x * 0.07)); ell(x, 1065, 50, hh); fill(gt(mix([0.22, 0.42, 0.3], bot, 0.25), tod)); }
  rect(0, 1060, W, 290, lin(0, 1060, 0, 1350, [[0, gt(mix([0.35, 0.58, 0.68], bot, 0.35), tod)], [1, gt([0.28, 0.5, 0.62], tod)]]));
  const sn = SKIES[tod][2]; if (sn) { for (let k = 0; k < 6; k++) { const w2 = 120 - k * 14; rect(sunX(tod) - w2 / 2 + 8 * Math.sin(t * 2 + k), 1090 + k * 34, w2, 6, sn, 0.5); } }
  for (let k = 0; k < 9; k++) { const x = (k * 137 + t * 20) % W, y = 1100 + (k * 53) % 220; line([[x, y], [x + 60, y]], 3, [1, 1, 1], 0.35); }
  rect(0, 1340, W, 580, lin(0, 1340, 0, H, [[0, gt([0.52, 0.68, 0.4], tod)], [1, gt([0.42, 0.58, 0.32], tod)]]));
  X.beginPath(); X.moveTo(0, 1350); X.bezierCurveTo(300, 1330, 700, 1370, W, 1340); X.lineTo(W, 1380); X.lineTo(0, 1380); X.closePath(); fill(gt([0.62, 0.55, 0.42], tod));
  // a long timber pier running out over the water, posts underneath
  const jc = gt([0.66, 0.5, 0.34], tod), je = gt([0.42, 0.3, 0.2], tod);
  [[905, 1160], [975, 1160], [860, 1260], [1010, 1260]].forEach(([x, y]) => line([[x, y], [x, y + 46]], 9, je));
  X.beginPath(); X.moveTo(830, 1400); X.lineTo(1040, 1400); X.lineTo(980, 1150); X.lineTo(900, 1150); X.closePath(); fill(jc);
  for (let k = 1; k < 10; k++) { const u = k / 10, y = 1150 + u * 250; line([[900 - 70 * u, y], [980 + 60 * u, y]], 3, je, 0.6); }
  line([[900, 1150], [830, 1400]], 5, je); line([[980, 1150], [1040, 1400]], 5, je);
  for (let k = 0; k < 14; k++) { const x = 20 + k * 22, sw = 8 * Math.sin(t * 1.5 + k); line([[x, 1400], [x + sw, 1280 - (k % 3) * 25]], 5, gt([0.36, 0.52, 0.3], tod)); if (k % 3 === 0) { ell(x + sw, 1290 - (k % 3) * 25, 7, 20); fill(gt([0.5, 0.35, 0.22], tod)); } }
}
const WORLDS = { beach, park, city, mountains, country, lake };
function outdoor(cfg, t, tod, sunY) { (WORLDS[cfg.world] || beach)(t, tod, sunY); }

function windowView(world, tod, x, y, w, h, t) {
  const [top, bot, sun] = SKIES[tod];
  rect(x, y, w, h, lin(0, y, 0, y + h, [[0, top], [1, bot]]));
  if (sun) { circ(x + w * 0.65, y + h * 0.62, 34); fill([1, 0.95, 0.8]); }
  if (world === 'park') { X.beginPath(); X.moveTo(x, y + h * 0.75); X.bezierCurveTo(x + w * 0.3, y + h * 0.6, x + w * 0.7, y + h * 0.8, x + w, y + h * 0.66); X.lineTo(x + w, y + h); X.lineTo(x, y + h); X.closePath(); fill([0.5, 0.7, 0.42]); }
  else if (world === 'city') { const r = rng(5); let xx = x; while (xx < x + w) { const bw = 40 + r() * 40, bh = h * (0.25 + r() * 0.4); rect(xx, y + h - bh, bw - 5, bh, [0.45, 0.5, 0.62]); xx += bw; } }
  else if (world === 'mountains') { X.beginPath(); X.moveTo(x, y + h * 0.8); X.lineTo(x + w * 0.3, y + h * 0.45); X.lineTo(x + w * 0.55, y + h * 0.72); X.lineTo(x + w * 0.8, y + h * 0.5); X.lineTo(x + w, y + h * 0.7); X.lineTo(x + w, y + h); X.lineTo(x, y + h); X.closePath(); fill([0.45, 0.55, 0.7]); }
  else if (world === 'country') { [[0.86, 0.74, 0.42], [0.52, 0.7, 0.4], [0.78, 0.68, 0.4]].forEach((c, i) => { X.beginPath(); X.moveTo(x, y + h * (0.66 + i * 0.1)); X.quadraticCurveTo(x + w / 2, y + h * (0.56 + i * 0.1), x + w, y + h * (0.68 + i * 0.1)); X.lineTo(x + w, y + h); X.lineTo(x, y + h); X.closePath(); fill(c); }); rect(x + w * 0.62, y + h * 0.58, w * 0.14, h * 0.1, [0.72, 0.24, 0.2]); }
  else if (world === 'lake') { for (let k = 0; k < 6; k++) { ell(x + k * w / 5, y + h * 0.62, w / 8, h * 0.08); fill([0.25, 0.44, 0.32]); } rect(x, y + h * 0.64, w, h * 0.36, [0.32, 0.55, 0.66]); line([[x + w * 0.2, y + h * 0.78], [x + w * 0.5, y + h * 0.78]], 3, [1, 1, 1], 0.4); }
  else { rect(x, y + h * 0.75, w, h * 0.25, lin(0, y + h * 0.75, 0, y + h, [[0, [0.3, 0.55, 0.7]], [1, [0.4, 0.62, 0.72]]])); }
}

// Indoor scenes get one of several rooms, so a film never shows the same beige wall over and over.
// Scenes with their own mood (a dark party, date night) keep their colours.
const ROOM_STYLES = [
  { wall: [0.78, 0.84, 0.76], floor: [0.76, 0.62, 0.46], frame: [1, 1, 1], decor: 'frames', win: 'square', view: 'lake' },
  { wall: [0.94, 0.78, 0.68], floor: [0.48, 0.34, 0.26], frame: [0.15, 0.15, 0.17], decor: 'shelf', win: 'arch', view: 'city' },
  { wall: [0.40, 0.58, 0.60], floor: [0.82, 0.72, 0.58], frame: [1, 1, 1], decor: 'roundart', win: 'round', lamp: true, view: 'mountains' },
  { wall: [0.96, 0.94, 0.90], floor: [0.62, 0.62, 0.64], frame: [0.55, 0.40, 0.28], decor: 'frames', panel: [0.55, 0.63, 0.73], win: 'double', view: 'beach' },
  { wall: [0.97, 0.88, 0.62], floor: [0.60, 0.45, 0.34], frame: [1, 1, 1], decor: 'none', curtains: [0.35, 0.55, 0.62], win: 'square', view: 'country' },
  { wall: [0.90, 0.77, 0.79], floor: [0.78, 0.68, 0.58], frame: [1, 1, 1], decor: 'plant', win: 'door', door: [0.36, 0.5, 0.58], view: 'city' },
  { wall: [0.27, 0.32, 0.44], floor: [0.70, 0.55, 0.40], frame: [0.95, 0.93, 0.88], decor: 'polaroids', glow: true, win: 'tall', lamp: true, view: 'city' },
  { wall: [0.81, 0.80, 0.89], floor: [0.66, 0.52, 0.42], frame: [1, 1, 1], decor: 'mirror', rug: [0.86, 0.52, 0.42], win: 'door', door: [0.95, 0.93, 0.88], view: 'mountains' }
];
let ROOMSEL = null, HATS_OFF = false;
const roomHash = s => { let n = 7; for (const ch of String(s)) n = (n * 31 + ch.charCodeAt(0)) % 9973; return n % ROOM_STYLES.length; };
function roomDecor(kind, t) {
  if (kind === 'frames') {
    [[86, 500, 140, 180], [256, 548, 110, 132]].forEach(([x, y, w, hh], i) => { rr(x - 8, y - 8, w + 16, hh + 16, 4); fill([0.22, 0.2, 0.2]); rect(x, y, w, hh, [0.98, 0.96, 0.92]); rect(x + 14, y + 14, w - 28, hh - 28, i ? [0.95, 0.75, 0.55] : [0.62, 0.78, 0.9]); X.beginPath(); X.moveTo(x + 14, y + hh - 14); X.lineTo(x + w * 0.45, y + hh * 0.45); X.lineTo(x + w - 14, y + hh - 14); X.closePath(); fill(i ? [0.85, 0.5, 0.4] : [0.4, 0.6, 0.45]); });
  } else if (kind === 'shelf') {
    rect(70, 660, 310, 16, [0.48, 0.34, 0.24]);
    [[95, 22, [0.3, 0.45, 0.6]], [120, 18, [0.85, 0.6, 0.35]], [141, 24, [0.6, 0.35, 0.35]]].forEach(([x, w, c], i) => rect(x, 660 - 90 + i * 8, w, 90 - i * 8, c));
    [[230, [0.88, 0.5, 0.38]], [320, [0.95, 0.92, 0.85]]].forEach(([x, c]) => { rr(x - 28, 600, 56, 60, 10); fill(c); [[-16, 590, 22], [10, 578, 26], [24, 596, 18]].forEach(([dx, y, r]) => { circ(x + dx, y, r); fill([0.35, 0.6, 0.38]); }); });
  } else if (kind === 'roundart') {
    circ(220, 590, 110); fill([0.95, 0.9, 0.82]); circ(220, 590, 92); fill([0.98, 0.78, 0.5]); circ(220, 620, 44); fill([0.95, 0.5, 0.38]); rect(128, 625, 184, 56, [0.25, 0.45, 0.5]); circ(220, 590, 110); X.lineWidth = 10; X.strokeStyle = css([0.25, 0.22, 0.2]); X.stroke();
  } else if (kind === 'plant') {
    line([[230, 0], [230, 520]], 3, [0.35, 0.3, 0.28]); rr(194, 512, 72, 62, 12); fill([0.95, 0.92, 0.86]);
    for (let i = 0; i < 9; i++) { const sw = 6 * Math.sin(t * 1.3 + i); const sd = i % 2 ? 1 : -1; X.save(); X.translate(230 + sd * (20 + i * 3) + sw, 560 + i * 24); X.rotate(sd * 0.6); X.beginPath(); X.ellipse(0, 0, 22, 9, 0, 0, 2 * PI); fill([0.32 + 0.03 * (i % 3), 0.58, 0.36]); X.restore(); }
  } else if (kind === 'polaroids') {
    X.beginPath(); X.moveTo(60, 520); X.quadraticCurveTo(220, 570, 390, 520); X.lineWidth = 3; X.strokeStyle = css([0.85, 0.8, 0.7]); X.stroke();
    [[110, 540, -0.08, [0.62, 0.78, 0.9]], [210, 556, 0.06, [0.95, 0.75, 0.55]], [310, 544, -0.05, [0.6, 0.8, 0.6]]].forEach(([x, y, r, c]) => { X.save(); X.translate(x, y); X.rotate(r); rect(-42, 0, 84, 96, [0.98, 0.97, 0.94]); rect(-34, 8, 68, 64, c); X.restore(); });
    const g = X.createRadialGradient(200, 600, 20, 200, 600, 520); g.addColorStop(0, css([1, 0.85, 0.55], 0.28)); g.addColorStop(1, css([1, 0.85, 0.55], 0)); X.fillStyle = g; X.fillRect(0, 0, W, 1460);
  } else if (kind === 'mirror') {
    ell(220, 600, 96, 130); fill([0.62, 0.45, 0.3]); ell(220, 600, 80, 114); fill([0.82, 0.9, 0.95]); X.beginPath(); X.moveTo(180, 520); X.lineTo(210, 500); X.lineTo(170, 640); X.closePath(); fill([1, 1, 1], 0.5);
  }
}
function room(cfg, t, o = {}) {
  HATS_OFF = true;
  const tint = cfg.tint ? C(cfg.tint) : null;
  let wall = o.wall || [0.93, 0.89, 0.83];
  // a light, everyday room takes this scene's style; a mood room (dark party, date night) keeps its own
  const st = ROOMSEL != null && (wall[0] + wall[1] + wall[2]) / 3 > 0.7 ? ROOM_STYLES[ROOMSEL] : null;
  if (st) wall = st.wall;
  if (tint) wall = mix(wall, tint, 0.22);
  const floor = st ? st.floor : (o.floor || [0.72, 0.60, 0.48]);
  rect(0, 0, W, 1460, wall);
  if (st && st.panel) { rect(0, 1080, W, 380, st.panel); rect(0, 1068, W, 16, mix(st.panel, [1, 1, 1], 0.4)); }
  if (st && st.decor) roomDecor(st.decor, t);
  if (o.pattern) {
    X.lineWidth = 2; X.strokeStyle = css([1, 1, 1], 0.35); X.beginPath();
    for (let yy = 0; yy < 1460; yy += 90) for (let xx = 0; xx < W + 90; xx += 104) {
      const cx = xx + ((yy / 90) % 2 ? 52 : 0), cy = yy;
      X.moveTo(cx, cy - 45); X.lineTo(cx + 45, cy - 22); X.lineTo(cx + 45, cy + 22); X.lineTo(cx, cy + 45); X.lineTo(cx - 45, cy + 22); X.lineTo(cx - 45, cy - 22); X.closePath();
      X.moveTo(cx, cy); X.lineTo(cx, cy + 45); X.moveTo(cx, cy); X.lineTo(cx + 45, cy - 22); X.moveTo(cx, cy); X.lineTo(cx - 45, cy - 22);
    }
    X.stroke();
  }
  let shape = st && st.win && !(o.inWindow && st.win !== 'square') ? st.win : 'square';
  if (shape === 'door' && o.window) shape = 'square';
  const viewW = st && st.view ? st.view : cfg.world;
  if (st && shape === 'door') {
    // a door instead of a window: panels, a brass knob, light under it
    const dx = 800, dy = 880, dw = 220, dh = 580;
    rect(dx - 14, dy - 14, dw + 28, dh + 14, mix(wall, [1, 1, 1], 0.55)); rect(dx, dy, dw, dh, st.door);
    [[dx + 26, dy + 30, dw - 52, 230], [dx + 26, dy + 300, dw - 52, 240]].forEach(([x, y, w, hh]) => { X.lineWidth = 5; X.strokeStyle = css(mix(st.door, [0, 0, 0], 0.18)); X.strokeRect(x, y, w, hh); });
    circ(dx + 30, dy + 300, 12); fill([0.85, 0.68, 0.35]);
  }
  if (o.window && shape !== 'door') {
    const fr = st ? st.frame : [1, 1, 1];
    // each shape is a clip for the view and an outline for the frame
    const panes = shape === 'double' ? [[600, 700, 170, 400], [820, 700, 170, 400]] : shape === 'tall' ? [[780, 560, 190, 560]] : shape === 'round' ? [[640, 710, 340, 340]] : shape === 'arch' ? [[660, 640, 300, 460]] : [[640, 720, 340, 380]];
    const path = (x, y, w, hh) => { X.beginPath(); if (shape === 'round') X.arc(x + w / 2, y + hh / 2, w / 2, 0, 2 * PI); else if (shape === 'arch') { X.moveTo(x, y + hh); X.lineTo(x, y + w / 2); X.arc(x + w / 2, y + w / 2, w / 2, PI, 2 * PI); X.lineTo(x + w, y + hh); X.closePath(); } else X.rect(x, y, w, hh); };
    // one view behind every pane, so a pair of windows shows one sun across both
    const bx = Math.min(...panes.map(q => q[0])), by = Math.min(...panes.map(q => q[1])), bx2 = Math.max(...panes.map(q => q[0] + q[2])), by2 = Math.max(...panes.map(q => q[1] + q[3]));
    X.save(); X.beginPath(); panes.forEach(([wx, wy, ww, wh]) => { if (shape === 'round') { X.moveTo(wx + ww, wy + wh / 2); X.arc(wx + ww / 2, wy + wh / 2, ww / 2, 0, 2 * PI); } else if (shape === 'arch') { X.moveTo(wx, wy + wh); X.lineTo(wx, wy + ww / 2); X.arc(wx + ww / 2, wy + ww / 2, ww / 2, PI, 2 * PI); X.lineTo(wx + ww, wy + wh); X.closePath(); } else X.rect(wx, wy, ww, wh); }); X.clip(); windowView(viewW, o.window, bx, by, bx2 - bx, by2 - by, t); if (o.inWindow) o.inWindow(); X.restore();
    panes.forEach(([wx, wy, ww, wh]) => {
      path(wx, wy, ww, wh); X.lineWidth = 16; X.strokeStyle = css(fr); X.stroke();
      if (shape === 'round') { line([[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], 8, fr); line([[wx, wy + wh / 2], [wx + ww, wy + wh / 2]], 8, fr); }
      else if (shape === 'arch') { line([[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], 10, fr); line([[wx, wy + wh * 0.62], [wx + ww, wy + wh * 0.62]], 10, fr); }
      else if (shape === 'tall' || shape === 'double') line([[wx, wy + wh / 2], [wx + ww, wy + wh / 2]], 10, fr);
      else { line([[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], 10, fr); line([[wx, wy + wh / 2], [wx + ww, wy + wh / 2]], 10, fr); }
    });
    const wx = 640, wy = 720, ww = 340, wh = 380;
    if (st && st.curtains) { [[wx - 70, -1], [wx + ww - 10, 1]].forEach(([cx, sd]) => { rect(cx, wy - 50, 80, wh + 110, st.curtains); for (let k = 1; k < 4; k++) line([[cx + k * 20, wy - 50], [cx + k * 20, wy + wh + 60]], 3, mix(st.curtains, [0, 0, 0], 0.18)); }); rect(wx - 90, wy - 64, ww + 180, 14, [0.4, 0.3, 0.24]); }
  }
  if (o.lights) {
    X.beginPath(); X.moveTo(-20, 760); X.bezierCurveTo(300, 880, 700, 880, W + 20, 760); X.lineWidth = 3; X.strokeStyle = css([0.2, 0.2, 0.2]); X.stroke();
    for (let i = 0; i < 12; i++) {
      const u = (i + 0.5) / 12, x = -20 + u * (W + 40), y = 760 + 4 * 120 * u * (1 - u) * 0.75 + 12, a = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.7);
      const g = X.createRadialGradient(x, y, 2, x, y, 40); g.addColorStop(0, css([1, 0.85, 0.5], 0.6 * a)); g.addColorStop(1, css([1, 0.85, 0.5], 0));
      circ(x, y, 40); X.fillStyle = g; X.fill(); circ(x, y, 9); fill([1, 0.88, 0.6], a);
    }
  }
  rect(0, 1460, W, 460, lin(0, 1460, 0, H, [[0, floor], [1, mix(floor, [0, 0, 0], 0.15)]]));
  rect(0, 1450, W, 18, mix(wall, [1, 1, 1], 0.5));
  if (st && st.lamp) { const lx = 1010; line([[lx, 1470], [lx, 1010]], 8, [0.2, 0.2, 0.22]); ell(lx, 1478, 44, 10); fill([0.2, 0.2, 0.22]); X.beginPath(); X.moveTo(lx - 50, 1010); X.lineTo(lx + 50, 1010); X.lineTo(lx + 34, 930); X.lineTo(lx - 34, 930); X.closePath(); fill([0.97, 0.9, 0.75]); const g = X.createRadialGradient(lx, 1000, 10, lx, 1060, 260); g.addColorStop(0, css([1, 0.88, 0.6], 0.35)); g.addColorStop(1, css([1, 0.88, 0.6], 0)); X.fillStyle = g; X.fillRect(lx - 280, 900, 560, 600); }
  if (st && st.rug) { ell(540, 1720, 420, 90); fill(st.rug); ell(540, 1720, 380, 70); X.lineWidth = 4; X.strokeStyle = css(mix(st.rug, [1, 1, 1], 0.4)); X.stroke(); }
}
function nightTint(a = 0.25) { rect(0, 0, W, H, [0.15, 0.1, 0.3], a); }

// ---------------------------------------------------------------- characters
const DEFAULT_ME = { body: 'm', hair: 'wavy', hairCol: '#383130', grey: true, skin: '#E8BA99', facial: 'moustache', facialCol: '#8F7D6B', outfit: 'jacket', top: '#30406E', inner: '#17171C', pants: '#333B4F' };
const DEFAULT_PARTNER = { body: 'f', hair: 'long', hairCol: '#805438', grey: false, skin: '#E8BA99', facial: 'none', facialCol: '#555555', outfit: 'dress', top: '#ED856E', inner: '#ED856E', pants: '#ED856E' };
const FRIEND1 = { body: 'm', hair: 'short', hairCol: '#261F1A', skin: '#C98E66', facial: 'none', outfit: 'jacket', top: '#5A8C73', inner: '#F2F2E6', pants: '#4D4D59' };
const FRIEND2 = { body: 'f', hair: 'long', hairCol: '#D9B373', skin: '#F2D3BC', facial: 'none', outfit: 'tee', top: '#F2BF59', inner: '#F2BF59', pants: '#404D73' };

const AGE_GREY = { '50s': 0.4, '60s': 0.75 }, AGE_LINES = { '40s': 1, '50s': 2, '60s': 2 };
function person(x, y, s, L, t, o = {}) {
  // someone who hasn't picked a look yet isn't drawn: the scene runs without them
  const ghost = !!(L && L.unset); if (ghost) { X.save(); X.globalAlpha = 0; }
  // height scales the whole person; build widens the body and limbs but not the head
  s *= ({ short: 0.92, tall: 1.08 }[L.height] || 1);
  const bw = ({ slim: 0.86, big: 1.26 }[L.build] || 1), ageK = AGE_GREY[L.agegrp] || 0;
  const walk = o.walk || 0, speed = o.speed || 7, armL = o.armL || [0.15, 0.1], armR = o.armR || [0.15, 0.1];
  const smile = o.smile !== false, flip = o.flip || 1;
  // a wheelchair: the body sits lower, the legs bend at the seat, and the wheels turn when moving
  const chair = !!L.chair, D = chair ? 92 : 0, bob = chair ? Math.min(o.bob || 0, 10) : (o.bob || 0);
  const hands = {};
  X.save(); X.translate(x, y - bob); X.scale(s * flip, s);
  if (chair) {
    const fr = [0.24, 0.26, 0.3];
    rr(-98, -440, 196, 290, 20); fill(fr);
    line([[-92, -436], [-122, -452]], 12, fr); line([[92, -436], [122, -452]], 12, fr);
    X.translate(0, D);
  }
  const w = t * speed, hc = mix(C(L.hairCol), [0.8, 0.79, 0.77], ageK), skin = C(L.skin), skinD = darken(skin, 0.15);
  const dress = L.outfit === 'dress';
  const scarf = L.hat === 'scarf', hatC = C(L.hatCol || '#2E4A62'), capOn = !HATS_OFF && (L.hat === 'cap' || L.hat === 'beanie');
  const hs = o.head || 1; const headOn = () => { X.save(); if (hs !== 1) { X.translate(0, -470); X.scale(hs, hs); X.translate(0, 470); } };
  headOn();
  // back hair
  if (L.hair === 'wavy') {
    [[0, -535, 66], [-70, -500, 44], [70, -500, 44], [-82, -460, 40], [82, -460, 40], [-80, -420, 34], [80, -420, 34], [-66, -396, 26], [66, -396, 26]].forEach(([dx, dy, r]) => { circ(dx, dy, r); fill(hc); });
    if (L.grey) [[-84, -470, 16], [78, -440, 14], [-74, -415, 12], [60, -510, 14]].forEach(([dx, dy, r]) => { circ(dx, dy, r); fill([0.62, 0.6, 0.57], 0.6); });
  } else if (L.hair === 'long') { rr(-64, -565, 128, 205, 50); fill(hc); }
  else if (L.hair === 'afro') { circ(0, -528, 86); fill(hc); }
  else if (L.hair === 'ponytail') { X.beginPath(); X.moveTo(30, -560); X.bezierCurveTo(95, -560, 92, -470, 70, -400); X.lineWidth = 34; X.lineCap = 'round'; X.strokeStyle = css(hc); X.stroke(); }
  else if (L.hair === 'braids') { [-1, 1].forEach(sd => { for (let i = 0; i < 8; i++) { circ(sd * (56 + (i % 2) * 5), -500 + i * 17, 13); fill(i % 2 ? darken(hc, 0.12) : hc); } }); }
  else if (L.hair === 'curly') {
    for (let i = 0; i <= 12; i++) { const a = PI * (0.92 + 1.16 * i / 12); circ(Math.cos(a) * 60, -505 + Math.sin(a) * 66, 30); fill(hc); }
  }
  if (scarf) { ell(0, -505, 70, 80); fill(hatC); X.beginPath(); X.moveTo(-60, -470); X.lineTo(60, -470); X.lineTo(86, -420); X.lineTo(-86, -420); X.closePath(); fill(hatC); }
  X.restore();
  X.save(); X.scale(bw, 1);
  // legs
  if (chair) {
    const lc = dress ? skin : C(L.pants), wd = dress ? 26 : 48;
    rr(-110, -262, 220, 36, 12); fill([0.24, 0.26, 0.3]);
    [-1, 1].forEach(sd => { line([[sd * 28, -250], [sd * 34, -200]], wd + 6, lc); line([[sd * 34, -200], [sd * 36, -122]], wd, lc); ell(sd * 40, -114, 30, 15); fill([0.13, 0.11, 0.10]); });
    rr(-82, -104, 164, 14, 6); fill([0.4, 0.42, 0.46]);
    [-1, 1].forEach(sd => { circ(sd * 64, -104, 14); fill([0.15, 0.15, 0.17]); });
    const spin = walk ? t * speed * 0.9 : 0;
    [-1, 1].forEach(sd => {
      const cx = sd * 130, cy = -212;
      ell(cx, cy, 42, 120); X.lineWidth = 18; X.strokeStyle = css([0.15, 0.15, 0.17]); X.stroke();
      ell(cx, cy, 30, 104); X.lineWidth = 5; X.strokeStyle = css([0.72, 0.74, 0.78]); X.stroke();
      for (let i = 0; i < 4; i++) { const a = spin + i * PI / 4; line([[cx - 30 * Math.cos(a), cy - 104 * Math.sin(a)], [cx + 30 * Math.cos(a), cy + 104 * Math.sin(a)]], 3, [0.72, 0.74, 0.78]); }
      circ(cx, cy, 9); fill([0.5, 0.52, 0.55]);
    });
  } else if (dress) {
    [[-1, 0], [1, PI]].forEach(([side, ph]) => {
      const a = walk * 0.34 * Math.sin(w + ph), hx = side * 22, hy = -170, fx = hx + 165 * Math.sin(a), fy = hy + 165 * Math.cos(a);
      line([[hx, hy], [fx, fy]], 26, skin); ell(fx + 6, fy, 26, 12); fill([0.55, 0.3, 0.25]);
    });
  } else {
    [[-1, 0], [1, PI]].forEach(([side, ph]) => {
      const a = walk * 0.38 * Math.sin(w + ph), hx = side * 26, hy = -262, fx = hx + 248 * Math.sin(a), fy = hy + 248 * Math.cos(a);
      line([[hx, hy], [fx, fy]], 48, L.pants); ell(fx + 8, fy + 4, 34, 16); fill([0.13, 0.11, 0.10]);
    });
  }
  if (o.backpack) { rr(-118, -440, 56, 170, 16); fill(o.backpack); }
  // torso
  if (dress) { X.beginPath(); X.moveTo(-62, -448); X.lineTo(62, -448); X.lineTo(98, -165); X.lineTo(-98, -165); X.closePath(); fill(L.top); }
  else {
    X.beginPath(); X.moveTo(-82, -446); X.bezierCurveTo(-88, -380, -78, -300, -72, -250); X.lineTo(72, -250); X.bezierCurveTo(78, -300, 88, -380, 82, -446); X.closePath(); fill(L.top);
    if (L.outfit === 'hoodie') { const hd = darken(C(L.top), 0.14); ell(0, -440, 66, 20); fill(hd); line([[-14, -432], [-16, -385]], 4, [0.95, 0.95, 0.95]); line([[14, -432], [16, -385]], 4, [0.95, 0.95, 0.95]); rr(-46, -330, 92, 54, 14); fill(hd); }
    if (L.outfit === 'shirt') { const sd = darken(C(L.top), 0.2); X.beginPath(); X.moveTo(-30, -446); X.lineTo(0, -420); X.lineTo(30, -446); X.lineTo(20, -452); X.lineTo(0, -436); X.lineTo(-20, -452); X.closePath(); fill([0.97, 0.97, 0.97]); line([[0, -420], [0, -255]], 3, sd); [-395, -350, -305].forEach(by => { circ(0, by, 4); fill(sd); }); }
    if (L.outfit === 'jacket') { X.beginPath(); X.moveTo(-26, -444); X.lineTo(26, -444); X.lineTo(22, -252); X.lineTo(-22, -252); X.closePath(); fill(L.inner || '#17171C'); }
  }
  // arms
  [[-1, armL], [1, armR]].forEach(([side, [u, f]]) => {
    const sx = side * 72, sy = -426, ex = sx + side * 112 * Math.sin(u), ey = sy + 112 * Math.cos(u), hx = ex + side * 104 * Math.sin(f), hy = ey + 104 * Math.cos(f);
    const upper = dress ? skin : L.top, fore = (dress || L.outfit === 'tee') ? skin : L.top, wd = dress ? 30 : 38;
    line([[sx, sy], [ex, ey]], wd, upper); line([[ex, ey], [hx, hy]], wd * (L.outfit === 'tee' ? 0.8 : 1), fore);
    if (L.outfit === 'tee') { circ(ex, ey, wd / 2); fill(upper); }
    circ(hx, hy, 20); fill(skin);
    hands[side < 0 ? 'L' : 'R'] = [x + flip * s * bw * hx, y - bob + s * (hy + D)];
  });
  X.restore();
  // head
  rect(-18, -472, 36, 32, skinD);
  headOn();
  if (scarf) { X.beginPath(); X.moveTo(-48, -480); X.lineTo(48, -480); X.lineTo(74, -428); X.lineTo(-74, -428); X.closePath(); fill(hatC); }
  ell(0, -502, 50, 58); fill(skin);
  const fc = mix(C(L.facialCol || L.hairCol), [0.8, 0.79, 0.77], ageK);
  if (L.facial === 'stubble' || L.facial === 'moustache') { X.save(); ell(0, -502, 50, 58); X.clip(); ell(0, -462, 56, 34); fill(fc, 0.42); X.restore(); }
  if (L.facial === 'beard') {
    X.beginPath(); X.moveTo(-50, -505); X.bezierCurveTo(-52, -440, -30, -410, 0, -408); X.bezierCurveTo(30, -410, 52, -440, 50, -505);
    X.bezierCurveTo(40, -470, 20, -466, 0, -466); X.bezierCurveTo(-20, -466, -40, -470, -50, -505); X.closePath(); fill(fc);
  }
  // hair top
  if (scarf) {
    X.save(); X.beginPath(); X.ellipse(0, -508, 66, 76, 0, 0, 2 * PI); X.ellipse(0, -500, 45, 51, 0, 0, 2 * PI); X.fillStyle = css(hatC); X.fill('evenodd'); X.restore();
    X.beginPath(); X.ellipse(0, -500, 45, 51, 0, PI * 1.08, PI * 1.92); X.lineWidth = 3; X.strokeStyle = css(darken(hatC, 0.18)); X.stroke();
  } else if (L.hair === 'fade') {
    X.beginPath(); X.arc(0, -512, 56, PI, 2 * PI); X.lineTo(54, -500); X.bezierCurveTo(30, -540, -15, -536, -54, -498); X.closePath(); fill(hc, 0.45);
    rr(-40, -576, 80, 28, 13); fill(hc);
  } else if (L.hair === 'short') {
    // a natural short crop: a little height on top, a side part, short sideburns
    X.beginPath(); X.moveTo(-53, -494);
    X.bezierCurveTo(-60, -542, -40, -580, 2, -581);
    X.bezierCurveTo(44, -582, 63, -548, 55, -494);
    X.bezierCurveTo(51, -514, 42, -530, 24, -534);
    X.bezierCurveTo(6, -538, -12, -524, -28, -532);
    X.bezierCurveTo(-42, -528, -50, -514, -53, -494); X.closePath(); fill(hc);
    rr(-53, -506, 9, 26, 4); fill(hc); rr(44, -506, 9, 26, 4); fill(hc);
    X.beginPath(); X.moveTo(-24, -566); X.bezierCurveTo(-4, -574, 20, -572, 38, -560); X.lineWidth = 4; X.strokeStyle = css(mix(hc, [1, 1, 1], 0.25), 0.6); X.stroke();
  } else if (L.hair !== 'bald') {
    X.beginPath(); X.arc(0, -512, 58, PI, 2 * PI); X.lineTo(56, -500); X.bezierCurveTo(30, -545, -15, -540, -56, -498); X.closePath();
    fill(hc, L.hair === 'buzz' ? 0.6 : 1);
    if (L.hair === 'wavy' && L.grey) line([[-30, -560], [5, -548], [35, -530]], 6, [0.62, 0.6, 0.57], 0.7);
    if (L.hair === 'bun' && !capOn) { circ(0, -585, 32); fill(hc); }
    if (L.hair === 'afro') { circ(0, -586, 50); fill(hc); }
    if (L.hair === 'braids' || L.hair === 'ponytail') line([[0, -566], [0, -546]], 3, darken(hc, 0.25));
    if (L.hair === 'curly') for (let i = 0; i < 5; i++) { circ(-44 + i * 22, -552 + Math.abs(i - 2) * 6, 22); fill(hc); }
  } else { ell(-20, -540, 14, 7); fill([1, 1, 1], 0.25); }
  if (capOn && L.hat === 'cap') { X.beginPath(); X.arc(0, -520, 57, PI, 2 * PI); X.closePath(); fill(hatC); ell(18, -520, 62, 11); fill(darken(hatC, 0.22)); circ(0, -577, 6); fill(darken(hatC, 0.22)); }
  if (capOn && L.hat === 'beanie') { rr(-57, -592, 114, 72, 34); fill(hatC); rr(-60, -540, 120, 24, 9); fill(darken(hatC, 0.15)); }
  // face
  const brow = L.hair === 'bald' ? darken(skin, 0.5) : (L.body === 'f' ? mix(hc, [0.3, 0.2, 0.15], 0.4) : hc);
  [-1, 1].forEach(side => { if (o.eyesClosed) { X.beginPath(); X.arc(side * 18, -508, 8, 0.15 * PI, 0.85 * PI); X.lineWidth = 4; X.strokeStyle = css([0.15, 0.15, 0.18]); X.stroke(); } else { circ(side * 18, -505, 5.5); fill([0.15, 0.15, 0.18]); } line([[side * 9, -523], [side * 30, -526]], 5, brow); });
  if (L.freckles) [[-30, -488], [-24, -482], [-36, -481], [30, -488], [24, -482], [36, -481]].forEach(([fx, fy]) => { circ(fx, fy, 2.6); fill(darken(skin, 0.35), 0.7); });
  if (L.earrings === 'studs') [-1, 1].forEach(sd => { circ(sd * 50, -486, 5.5); fill([0.93, 0.78, 0.35]); });
  if (L.earrings === 'hoops') [-1, 1].forEach(sd => { X.beginPath(); X.arc(sd * 50, -474, 11, 0, 2 * PI); X.lineWidth = 3.5; X.strokeStyle = css([0.93, 0.78, 0.35]); X.stroke(); });
  if (L.glasses === 'square') { const gc = [0.16, 0.16, 0.2]; [-1, 1].forEach(sd => { X.beginPath(); X.roundRect(sd * 19 - 17, -519, 34, 26, 5); X.lineWidth = 4.5; X.strokeStyle = css(gc); X.stroke(); line([[sd * 36, -510], [sd * 49, -514]], 4, gc); }); line([[-3, -508], [3, -508]], 4, gc); }
  else if (L.glasses === 'sun' && !HATS_OFF) { const gc = [0.1, 0.1, 0.12]; [-1, 1].forEach(sd => { X.beginPath(); X.roundRect(sd * 20 - 19, -518, 38, 24, 9); X.fillStyle = css(gc); X.fill(); line([[sd * 38, -510], [sd * 49, -514]], 4, gc); }); line([[-3, -510], [3, -510]], 4, gc); }
  else if (L.glasses === true) { const gc = [0.16, 0.16, 0.2]; [-1, 1].forEach(sd => { circ(sd * 19, -506, 17); X.lineWidth = 4.5; X.strokeStyle = css(gc); X.stroke(); line([[sd * 36, -508], [sd * 49, -514]], 4, gc); }); line([[-3, -508], [3, -508]], 4, gc); }
  // a few gentle lines with age: round the eyes from the 40s, across the forehead from the 50s
  const ag = AGE_LINES[L.agegrp] || 0;
  if (ag) { X.globalAlpha = 0.55; [-1, 1].forEach(sd => { line([[sd * 34, -512], [sd * 41, -516]], 2.5, skinD); line([[sd * 34, -503], [sd * 41, -501]], 2.5, skinD); }); if (ag > 1) { line([[-22, -541], [22, -541]], 2.5, skinD); line([[-16, -532], [16, -532]], 2.5, skinD); } X.globalAlpha = 1; }
  line([[0, -500], [-4, -482], [3, -480]], 3, skinD);
  const hasM = L.facial === 'moustache' || L.facial === 'beard';
  if (smile) { X.beginPath(); X.arc(0, hasM ? -470 : -478, 13, 0.15 * PI, 0.85 * PI); X.lineWidth = 4; X.strokeStyle = css([0.55, 0.25, 0.22]); X.stroke(); }
  if (hasM) {
    X.beginPath(); X.moveTo(-30, -463); X.bezierCurveTo(-20, -481, 20, -481, 30, -463); X.lineTo(33, -444);
    X.bezierCurveTo(26, -452, 24, -462, 13, -466); X.bezierCurveTo(5, -468, -5, -468, -13, -466); X.bezierCurveTo(-24, -462, -26, -452, -33, -444); X.closePath(); fill(fc);
  } else if (L.facial !== 'stubble') { [-1, 1].forEach(sd => { circ(sd * 28, -480, 9); fill([0.95, 0.55, 0.5], 0.35); }); }
  X.restore();
  X.restore();
  if (ghost) X.restore();
  return hands;
}

// dog shapes: a Great Dane, a bulldog and a sausage dog are built from the same parts in different proportions
const DOG_BUILD = {
  standard: { leg: 125, rx: 118, ry: 52, lw: 24, hr: 47, neck: 0 },
  solid: { leg: 118, rx: 124, ry: 62, lw: 31, hr: 55, neck: -4 },
  tall: { leg: 178, rx: 124, ry: 46, lw: 20, hr: 45, neck: 34 },
  stocky: { leg: 72, rx: 106, ry: 64, lw: 32, hr: 56, neck: -10 },
  long: { leg: 52, rx: 162, ry: 44, lw: 20, hr: 44, neck: -4 },
  tiny: { leg: 96, rx: 86, ry: 40, lw: 18, hr: 52, neck: -2 }
};
const DOG_SIZES = { xs: 0.5, s: 0.68, m: 0.86, l: 1, xl: 1.2 };
const dogSize = P => DOG_SIZES[P.size] || 1;
function dogGeo(P) {
  const B = DOG_BUILD[P.build] || DOG_BUILD.standard, k = B.rx / 118, by = -(B.leg + 20);
  return { B, k, by, hx: 135 * k + (P.build === 'long' ? 10 : 0), hy: by - 80 - B.neck };
}
// where a lead clips on, in the dog's own units, so the walk scene can find it for any shape
function dogCollar(P) { const g = dogGeo(P); return [g.hx - 40, g.hy + 50]; }
function dog(x, y, s, t, P, o = {}) {
  const walk = o.walk || 0, speed = o.speed || 9, flip = o.flip || 1, tongue = o.tongue !== false, lookUp = o.lookUp || 0;
  const coat = C(P.coat || '#A14F26'), coatD = darken(coat, 0.25), muzzle = P.muzzle === 'same' ? darken(coat, 0.08) : mix(coat, [0.1, 0.06, 0.05], 0.75);
  const white = [0.97, 0.95, 0.92], tan = P.marking === 'tan', markC = P.markCol ? C(P.markCol) : tan ? [0.71, 0.4, 0.18] : mix(coat, [0.1, 0.07, 0.06], 0.7);
  const sz = dogSize(P); s *= sz;
  const { B, k, by, hx, hy } = dogGeo(P), fluffy = P.fur === 'fluffy', curly = P.fur === 'curly';
  X.save(); X.translate(x, y); X.scale(s * flip, s);
  const w = t * speed, wag = 0.35 * Math.sin(t * 11);
  // tail
  const tx = -B.rx * 0.85, ty = by - 15;
  if (P.tail === 'stub') { ell(tx - 8, ty - 6, 16, 12); fill(coat); }
  else if (P.tail === 'curl') { X.beginPath(); X.arc(tx - 6, ty - 34, 22, 0.6 * PI + wag * 0.3, 2.4 * PI + wag * 0.3); X.lineWidth = fluffy || curly ? 20 : 14; X.lineCap = 'round'; X.strokeStyle = css(coat); X.stroke(); }
  else {
    X.beginPath(); X.moveTo(tx, ty); X.bezierCurveTo(tx - 30, ty - 10, tx - 45, ty - 40, tx - 50 + 30 * Math.sin(wag), ty - 75 + 10 * Math.cos(wag * 2));
    X.lineWidth = fluffy ? 26 : curly ? 22 : 16; X.lineCap = 'round'; X.strokeStyle = css(coat); X.stroke();
    if (P.marking === 'chest' || P.marking === 'socks') { circ(tx - 50 + 30 * Math.sin(wag), ty - 75 + 10 * Math.cos(wag * 2), (fluffy ? 13 : 8)); fill(white); }
  }
  // legs
  [[-80, 0, coatD], [55, PI, coatD], [-55, PI, coat], [82, 0, coat]].forEach(([lx0, ph, c]) => {
    const lx = lx0 * k, a = walk * 0.45 * Math.sin(w + ph), L = B.leg, top = by + 15, fx = lx + L * Math.sin(a), fy = -L + L * Math.cos(a);
    const sock = P.marking === 'socks' || tan, sc = tan ? markC : white;
    line([[lx, top], [fx, fy]], B.lw, c);
    if (sock) line([[lx + (fx - lx) * (tan ? 0.74 : 0.6), top + (fy - top) * (tan ? 0.74 : 0.6)], [fx, fy]], B.lw, sc);
    if (fluffy) { line([[lx, top + 10], [lx + (fx - lx) * 0.5, top + (fy - top) * 0.5]], B.lw + 10, c); }
    ell(fx + 6, fy, B.lw * 0.66, 9); fill(sock ? sc : c);
  });
  // body and chest
  if (curly) { const n = 16; for (let i = 0; i < n; i++) { const a = (i / n) * 2 * PI; circ(B.rx * 0.92 * Math.cos(a), by + B.ry * 0.9 * Math.sin(a), 17); fill(coat); } }
  // long coats feather underneath: belly, chest and the backs of the legs
  if (fluffy) { const n = 9; for (let i = 0; i < n; i++) { const a = PI * (0.12 + 0.76 * i / (n - 1)); circ(B.rx * 0.88 * Math.cos(a), by + B.ry * 0.82 * Math.sin(a) + 6, 15); fill(coat); } }
  ell(0, by, B.rx, B.ry); fill(coat); if (P.build === 'stocky') { ell(78 * k, by - 4, 66, B.ry * 1.22); fill(coat); } else { ell(85 * k, by - 13, 48 * Math.max(0.9, k * 0.95), B.ry * 1.08); fill(coat); }
  if (P.marking === 'patches') { X.save(); ell(0, by, B.rx, B.ry); X.clip(); ell(-35 * k, by - 18, 42 * k, 30); fill(markC); ell(30 * k, by + 20, 26 * k, 18); fill(markC); X.restore(); }
  if (P.marking === 'spots') { X.save(); ell(0, by, B.rx, B.ry); X.clip(); [[-70, -20, 9], [-40, 12, 7], [-10, -28, 8], [20, 6, 10], [50, -24, 7], [-60, 22, 6], [5, 30, 6], [70, 10, 7]].forEach(([sx, sy, r]) => { circ(sx * k, by + sy, r); fill(markC); }); X.restore(); }
  if (P.marking === 'chest' || P.marking === 'socks') { ell(100 * k, by + 4, 24, B.ry * 0.8); fill(white); }
  if (tan) { ell(100 * k, by + 2, 22, B.ry * 0.7); fill(markC); }
  if (curly) for (let i = 0; i < 14; i++) { const a = i * 2.39996, rr2 = 0.75 * Math.sqrt((i + 0.5) / 14); circ(Math.cos(a) * B.rx * rr2, by + Math.sin(a) * B.ry * rr2, 11); fill(mix(coat, [1, 1, 1], 0.12)); }
  // neck and head
  X.save(); X.translate(0, -18 * lookUp);
  ell(hx - 27, hy + 30 + B.neck / 2, 34 * (B.hr / 47), 48 + B.neck / 2); fill(coat);
  if (P.marking === 'chest' || P.marking === 'socks') { ell(hx - 18, hy + 62 + B.neck / 2, 16, 26); fill(white); }
  X.beginPath(); X.moveTo(hx - 55, hy + 25); X.bezierCurveTo(hx - 40, hy + 55, hx - 20, hy + 65, hx + 3, hy + 57); X.lineWidth = 10; X.strokeStyle = css(C(P.collar || '#26262E')); X.stroke();
  ell(hx - 17, hy + 73, 9, 11); fill([0.75, 0.85, 0.6]);
  X.save(); X.translate(hx, hy); X.rotate(-0.35 * lookUp);
  const R = B.hr;
  if (curly) { const n = 12; for (let i = 0; i < n; i++) { const a = PI * 0.75 + (i / n) * PI * 1.5; circ(R * 0.9 * Math.cos(a), R * 0.9 * Math.sin(a), 14); fill(coat); } }
  if (P.build === 'stocky') { ell(0, 4, R * 1.12, R * 0.96); fill(coat); } else { circ(0, 0, R); fill(coat); }
  if (P.marking === 'patches') { ell(4, -10, 18, 16); fill(markC); }
  const sn = P.snout || 'medium';
  const mz = sn === 'flat' ? [R * 0.52, 18, 30, 24] : sn === 'long' ? [R * 0.95, 16, 46, 20] : [37, 17, 34, 26];
  ell(mz[0], mz[1], mz[2], mz[3]); fill(P.marking === 'chest' ? white : tan ? markC : muzzle);
  if (tan) { ell(8, -26, 7, 5); fill(markC); }
  const nx = sn === 'flat' ? R * 0.55 + 14 : sn === 'long' ? R * 0.95 + 40 : 63;
  ell(nx, sn === 'flat' ? 6 : 9, 11, 9); fill([0.05, 0.05, 0.05]);
  if (sn === 'flat') { line([[R * 0.2, 2], [R * 0.45, 10]], 3, darken(coat, 0.4), 0.6); if (P.build === 'stocky') { const jw = P.marking === 'chest' ? white : muzzle; ell(mz[0] - 10, mz[1] + 18, 20, 15); fill(jw); ell(mz[0] + 14, mz[1] + 18, 18, 14); fill(jw); line([[mz[0] - 6, mz[1] + 8], [mz[0] + 22, mz[1] + 8]], 3, darken(coat, 0.45), 0.5); } }
  circ(6, -12, 6.5); fill([0.12, 0.08, 0.06]); circ(8, -14, 2); fill([1, 1, 1]);
  if (tongue) { ell(mz[0] + 5, mz[1] + 29 + 3 * Math.sin(t * 8), 11, 19); fill([0.93, 0.5, 0.55]); }
  X.save(); X.rotate(0.08 * Math.sin(t * 6));
  if (curly) { [[-30, -20], [-38, 2], [-36, 24], [-28, 40]].forEach(([ex, ey]) => { circ(ex, ey, 15); fill(coatD); }); }
  else {
    X.beginPath();
    if (P.ears === 'up') { X.moveTo(-28, -30); X.lineTo(-30, -95); X.lineTo(8, -42); X.closePath(); }
    else if (P.ears === 'big') { X.moveTo(-34, -22); X.lineTo(-58, -108); X.lineTo(6, -46); X.closePath(); }
    else { const e = fluffy ? 1.25 : 1; X.moveTo(-22, -34); X.bezierCurveTo(-50 * e, -26, -52 * e, 26 * e, -36, 38 * e); X.bezierCurveTo(-20, 24, -10, -10, -22, -34); }
    fill(coatD);
    if (P.ears === 'big') { X.beginPath(); X.moveTo(-34, -32); X.lineTo(-50, -92); X.lineTo(-6, -46); X.closePath(); fill([0.93, 0.62, 0.6], 0.6); X.beginPath(); X.moveTo(-6, -40); X.lineTo(4, -112); X.lineTo(30, -36); X.closePath(); fill(coat); X.beginPath(); X.moveTo(-1, -44); X.lineTo(6, -96); X.lineTo(22, -42); X.closePath(); fill([0.93, 0.62, 0.6], 0.6); }
  }
  X.restore();
  X.restore(); X.restore(); X.restore();
}

function cat(x, y, s, t, P, o = {}) {
  const walk = o.walk || 0, speed = o.speed || 9, flip = o.flip || 1, lookUp = o.lookUp || 0;
  const coat = C(P.coat || '#C47A3A'), coatD = darken(coat, 0.25);
  X.save(); X.translate(x, y); X.scale(s * flip, s);
  const w = t * speed, sw = Math.sin(t * 2.5);
  X.beginPath(); X.moveTo(-85, -110); X.bezierCurveTo(-150, -120, -130, -220, -150 + 20 * sw, -250); X.lineWidth = 18; X.lineCap = 'round'; X.strokeStyle = css(coat); X.stroke();
  [[-60, 0, coatD], [45, PI, coatD], [-40, PI, coat], [62, 0, coat]].forEach(([lx, ph, c]) => {
    const a = walk * 0.45 * Math.sin(w + ph), fx = lx + 85 * Math.sin(a), fy = -85 + 85 * Math.cos(a);
    line([[lx, -90], [fx, fy]], 20, c); ell(fx + 5, fy, 13, 8); fill(c);
  });
  ell(0, -105, 92, 42); fill(coat);
  if (P.muzzle === 'dark') { for (let i = 0; i < 3; i++) line([[-40 + i * 30, -140], [-30 + i * 30, -110]], 10, coatD); }
  X.save(); X.translate(88, -170 - 14 * lookUp); X.rotate(-0.3 * lookUp);
  circ(0, 0, 44); fill(coat);
  [[-30, -20, -36, -78, 2, -36], [12, -38, 34, -84, 40, -22]].forEach(([a, b, c2, d, e, f]) => { X.beginPath(); X.moveTo(a, b); X.lineTo(c2, d); X.lineTo(e, f); X.closePath(); fill(coat); });
  [-1, 1].forEach(sd => { ell(sd * 15 + 6, -6, 6, 9); fill([0.2, 0.3, 0.15]); });
  X.beginPath(); X.moveTo(22, 10); X.lineTo(34, 10); X.lineTo(28, 18); X.closePath(); fill([0.93, 0.55, 0.6]);
  [[-1, 0], [1, 0]].forEach(([sd]) => { line([[28 + sd * 10, 22], [28 + sd * 55, 14]], 2.5, [1, 1, 1], 0.8); line([[28 + sd * 10, 26], [28 + sd * 55, 30]], 2.5, [1, 1, 1], 0.8); });
  X.restore(); X.restore();
}

function petsOf(cfg) {
  if (Array.isArray(cfg.pets)) return cfg.pets.filter(p => p && (p.type === 'dog' || p.type === 'cat'));
  if (cfg.pet && (cfg.pet.type === 'dog' || cfg.pet.type === 'cat')) return [cfg.pet];
  return [];
}
function pet(cfg, x, y, s, t, o = {}) {
  petsOf(cfg).slice(0, 3).forEach((P, i) => {
    const dir = o.flip || 1, off = i === 0 ? 0 : (i === 1 ? -160 : 160) * dir;
    const oo = Object.assign({}, o, { speed: (o.speed || 9) * (1 + i * 0.07) }), tt = t + i * 0.37, ss = s * (i ? 0.85 : 1), yy = y + (i ? 14 : 0);
    if (P.type === 'dog') dog(x + off, yy, ss, tt, P, oo); else cat(x + off, yy, ss * 0.95, tt, P, oo);
  });
}
// ---- kids
const DEFAULT_KID = { age: 'kid', status: 'have', hair: 'short', hairCol: '#6B4A33', skin: '#E8BA99', outfit: 'tee', top: '#F2C46F', pants: '#4F7FB0' };
const kidsOf = cfg => (cfg.kids || []).filter(k => k.age !== 'baby');
const babiesOf = cfg => (cfg.kids || []).filter(k => k.age === 'baby');
const kidLook = k => Object.assign({ body: 'f', facial: 'none', inner: '#FFFFFF', grey: false }, DEFAULT_KID, k);
const kidScale = k => k.age === 'teen' ? 0.8 : k.age === 'little' ? 0.46 : 0.6, kidHead = k => k.age === 'teen' ? 1.1 : k.age === 'little' ? 1.45 : 1.35;
// an ear-length kid's cut: a soft fringe and pieces over the ears, drawn over the basic crop
function kidMop(x, y, s, flip, hs, hairCol) {
  const hc = C(hairCol);
  X.save(); X.translate(x, y); X.scale(s * flip, s); X.translate(0, -470); X.scale(hs, hs); X.translate(0, 470);
  [-1, 1].forEach(sd => { X.beginPath(); X.moveTo(sd * 40, -548); X.bezierCurveTo(sd * 66, -540, sd * 66, -500, sd * 62, -470); X.bezierCurveTo(sd * 58, -462, sd * 52, -462, sd * 48, -468); X.bezierCurveTo(sd * 50, -490, sd * 46, -515, sd * 34, -530); X.closePath(); fill(hc); });
  X.beginPath(); X.moveTo(-50, -520); X.bezierCurveTo(-40, -560, 30, -572, 54, -526); X.bezierCurveTo(40, -532, 30, -530, 18, -524); X.bezierCurveTo(8, -534, -6, -530, -16, -524); X.bezierCurveTo(-26, -530, -40, -528, -50, -520); X.closePath(); fill(hc);
  X.beginPath(); X.moveTo(-20, -556); X.bezierCurveTo(0, -566, 22, -562, 38, -548); X.lineWidth = 4; X.strokeStyle = css(mix(hc, [1, 1, 1], 0.25), 0.6); X.stroke();
  X.restore();
}
// a few letters printed on a kid's top, like a favourite t-shirt
function topPrint(x, y, s, text, col) {
  if (!text) return;
  X.save(); X.font = `700 ${Math.round((text.length > 2 ? 60 : 78) * s)}px Poppins, sans-serif`; X.textAlign = 'center';
  X.fillStyle = css(C(col || '#8CDB80')); X.fillText(String(text).slice(0, 4), x, y - 318 * s); X.restore();
}
function drawKid(k, x, y, t, o = {}) {
  const s = kidScale(k) * (o.s || 1), L = kidLook(k), mop = L.hair === 'mop';
  const h = person(x, y, s, mop ? Object.assign({}, L, { hair: 'shaggy' }) : L, t, Object.assign({ head: kidHead(k) }, o));
  if (mop) kidMop(x, y - (o.bob || 0), s, o.flip || 1, kidHead(k), L.hairCol);
  if (L.print) topPrint(x, y - (o.bob || 0), s, L.print, L.printCol);
  return h;
}
function baby(x, y, s, k, t) {
  const L = kidLook(k || {});
  X.save(); X.translate(x, y); X.scale(s, s);
  ell(0, 14, 36, 50); fill(L.top || '#F7D9C4'); ell(0, 20, 26, 36); fill([1, 1, 1], 0.25);
  circ(0, -40, 27); fill(L.skin);
  X.beginPath(); X.arc(0, -46, 27, PI * 1.05, PI * 1.95); X.lineWidth = 7; X.strokeStyle = css(C(L.hairCol)); X.stroke();
  [-1, 1].forEach(sd => { X.beginPath(); X.arc(sd * 10, -40, 5, 0.1 * PI, 0.9 * PI); X.lineWidth = 3; X.strokeStyle = css([0.2, 0.15, 0.15]); X.stroke(); });
  X.beginPath(); X.arc(0, -30, 6, 0.15 * PI, 0.85 * PI); X.lineWidth = 3; X.strokeStyle = css([0.6, 0.3, 0.3]); X.stroke();
  X.restore();
}
// a swaddled baby lying across the forearms, with one arm drawn over the top so they're properly held
function cradle(c, h, s, k, t, L) {
  const B = kidLook(k || {}), skin = C(L.skin), rock = 0.05 * Math.sin(t * 1.6);
  const cx = (h.L[0] + h.R[0]) / 2, cy = (h.L[1] + h.R[1]) / 2 - 34 * s;
  X.save(); X.translate(cx, cy); X.rotate(rock); X.scale(s, s);
  const wrap = (k && k.blanket) || '#BFD9EA';
  ell(10, 6, 104, 50); fill(wrap);
  X.lineWidth = 4; X.strokeStyle = css(darken(C(wrap), 0.14));
  [[-10, 30], [30, 50], [70, 34]].forEach(([x, r]) => { X.beginPath(); X.arc(x, 6, r, -0.6, 0.6); X.stroke(); });
  ell(-74, -8, 48, 44); fill(darken(C(wrap), 0.06)); circ(-82, -10, 34); fill(B.skin);
  X.beginPath(); X.arc(-82, -16, 34, PI * 1.05, PI * 1.85); X.lineWidth = 8; X.strokeStyle = css(C(B.hairCol)); X.stroke();
  [-1, 1].forEach(sd => { X.beginPath(); X.arc(-82 + sd * 12, -10, 6, 0.1 * PI, 0.9 * PI); X.lineWidth = 3; X.strokeStyle = css([0.2, 0.15, 0.15]); X.stroke(); });
  X.beginPath(); X.arc(-82, 2, 6, 0.15 * PI, 0.85 * PI); X.lineWidth = 3; X.strokeStyle = css([0.6, 0.3, 0.3]); X.stroke();
  circ(-40, -26, 11); fill(B.skin);
  if (k && k.bow) { const bx = -64, by = -46; X.save(); X.translate(bx, by); X.rotate(0.5); X.scale(1.6, 1.6); [-1, 1].forEach(sd => { X.beginPath(); X.moveTo(0, 0); X.quadraticCurveTo(sd * 22, -18, sd * 26, 0); X.quadraticCurveTo(sd * 22, 18, 0, 0); X.closePath(); fill(k.bow); }); circ(0, 0, 7); fill(darken(C(k.bow), 0.15)); X.restore(); }
  X.restore();
  // the right forearm comes back over the blanket and the hand rests on it
  const ex = h.R[0] + 104 * s, ey = h.R[1] - 7 * s, hx = cx - 10 * s, hy = cy + 16 * s, sleeve = L.outfit === 'tee' || L.outfit === 'dress' ? skin : C(L.top);
  line([[ex, ey], [hx, hy]], 32 * s, sleeve); circ(hx, hy, 20 * s); fill(skin);
}
function pram(x, y, t, k) {
  const L = kidLook(k || {});
  [[x - 80, y - 32], [x + 70, y - 32]].forEach(([wx, wy], i) => { circ(wx, wy, 32); fill([0.18, 0.18, 0.2]); circ(wx, wy, 12); fill([0.7, 0.7, 0.72]); line([[wx, wy], [wx + 22 * Math.cos(t * 5 + i), wy + 22 * Math.sin(t * 5 + i)]], 4, [0.7, 0.7, 0.72]); });
  line([[x - 80, y - 32], [x - 10, y - 150], [x + 70, y - 32]], 8, [0.3, 0.3, 0.32]);
  circ(x + 40, y - 168, 24); fill(L.skin);
  X.beginPath(); X.arc(x + 40, y - 174, 24, PI * 1.05, PI * 1.95); X.lineWidth = 6; X.strokeStyle = css(C(L.hairCol)); X.stroke();
  X.beginPath(); X.arc(x, y - 150, 110, 0, PI); fill([0.35, 0.55, 0.6]);
  X.beginPath(); X.moveTo(x - 110, y - 150); X.quadraticCurveTo(x - 110, y - 300, x + 20, y - 280); X.lineTo(x - 5, y - 150); X.closePath(); fill([0.28, 0.45, 0.5]);
  rect(x - 110, y - 158, 220, 14, [0.3, 0.5, 0.55]);
  line([[x + 105, y - 150], [x + 185, y - 320]], 9, [0.3, 0.3, 0.32]);
  return [x + 185, y - 320];
}
function bed(x, y, w, k, t) {
  const L = kidLook(k || {});
  rr(x, y - 40, 30, 220, 8); fill([0.62, 0.45, 0.3]); rr(x + w - 30, y + 40, 30, 140, 8); fill([0.62, 0.45, 0.3]);
  rect(x, y + 60, w, 90, [0.62, 0.45, 0.3]);
  ell(x + 110, y + 40, 80, 30); fill([1, 1, 1]);
  circ(x + 120, y + 10, 40); fill(L.skin);
  X.beginPath(); X.arc(x + 120, y + 4, 42, PI * 1.0, PI * 2.0); fill(L.hairCol);
  [-1, 1].forEach(sd => { X.beginPath(); X.arc(x + 120 + sd * 13, y + 14, 6, 0.1 * PI, 0.9 * PI); X.lineWidth = 3; X.strokeStyle = css([0.2, 0.15, 0.15]); X.stroke(); });
  rr(x + 140, y + 20, w - 160, 70, 26); fill(L.top);
  for (let i = 0; i < 3; i++) { const k2 = (t * 0.3 + i / 3) % 1; X.font = `700 ${40 + 10 * i}px Poppins, sans-serif`; X.textAlign = 'left'; X.fillStyle = css([1, 1, 1], Math.sin(k2 * PI) * 0.8); X.fillText('z', x + 180 + 30 * i + 40 * k2, y - 30 - 160 * k2); }
}
function easel(x, y, t) {
  line([[x - 120, y], [x, y - 620]], 12, [0.55, 0.4, 0.28]); line([[x + 120, y], [x, y - 620]], 12, [0.55, 0.4, 0.28]); line([[x, y - 600], [x + 40, y]], 10, [0.5, 0.36, 0.24]);
  rect(x - 170, y - 560, 340, 300, [1, 1, 1]); X.lineWidth = 6; X.strokeStyle = css([0.85, 0.82, 0.78]); X.strokeRect(x - 170, y - 560, 340, 300);
  rect(x - 150, y - 540, 300, 260 * 0.45, [0.6, 0.78, 0.92], clamp(t / 1.2));
  const k = clamp((t - 1) / 1.2); if (k > 0) { circ(x + 60, y - 470, 40); fill([1, 0.85, 0.5], k); }
  const k2 = clamp((t - 2) / 1.5); if (k2 > 0) { X.save(); X.beginPath(); X.rect(x - 150, y - 540, 300 * k2, 260); X.clip(); X.beginPath(); X.moveTo(x - 150, y - 400); X.bezierCurveTo(x - 60, y - 450, x + 40, y - 380, x + 150, y - 420); X.lineTo(x + 150, y - 280); X.lineTo(x - 150, y - 280); X.closePath(); fill([0.5, 0.72, 0.45]); X.restore(); }
  rect(x - 180, y - 262, 360, 16, [0.5, 0.36, 0.24]);
}
function table(x0, x1, y) { rr(x0, y, x1 - x0, 30, 10); fill([0.6, 0.44, 0.3]); rect(x0 + 10, y + 30, x1 - x0 - 20, 50, [0.6, 0.44, 0.3], 0.6); [x0 + 30, x1 - 60].forEach(lx => rect(lx, y + 30, 30, 220, [0.52, 0.38, 0.26])); }
function familyRow(c, x, y, t, o = {}) {
  // draws me, partner, kids, carried babies; returns rightmost x
  const walk = o.walk || 0, s = o.s || 1, kids = kidsOf(c), babies = babiesOf(c);
  let cx = x;
  const hm = person(cx, y, 1.02 * s, ME(c), t, { walk, armL: [0.12, 0.05], armR: babies.length && !hasPartner(c) ? [0.5, 1.5] : [0.3, 0.2] });
  if (babies.length && !hasPartner(c)) baby(hm.R[0] - 10, hm.R[1] - 20, 0.9 * s, babies[0], t);
  cx += 170 * s;
  if (hasPartner(c)) {
    const hp = person(cx, y, 0.95 * s, PT(c), t, { walk, armL: [0.4, 0.3], armR: babies.length ? [0.5, 1.5] : [0.12, 0.05] });
    if (babies.length) baby(hp.R[0] - 10, hp.R[1] - 20, 0.9 * s, babies[0], t);
    cx += 160 * s;
  }
  kids.slice(0, 4).forEach((k, i) => { drawKid(k, cx, y + 6, t + i * 0.3, { walk, s, armL: [0.3, 0.2], armR: [0.3, 0.2] }); cx += (k.age === 'teen' ? 140 : 115) * s; });
  return cx;
}
const hasPartner = cfg => cfg.partner && cfg.partner.on;
// the planner marks a few everyday scenes for the partner to join
const ptJoins = cfg => !!cfg._pt && hasPartner(cfg);

// ---------------------------------------------------------------- props
// drinks: whatever they said they reach for, from a cuppa to a kombucha
function mug(x, y, t, kind, sc = 1) {
  // a rounded teacup with the handle on the left, where the hand holds it
  X.save(); X.translate(x, y); X.scale(sc, sc); x = 0; y = 0;
  const body = kind === 'coffee' ? [0.3, 0.42, 0.55] : [0.93, 0.52, 0.43];
  X.beginPath(); X.arc(x - 50, y - 58, 21, PI * 0.5, PI * 1.5); X.lineWidth = 11; X.strokeStyle = css(darken(body, 0.12)); X.stroke();
  X.beginPath(); X.moveTo(x - 52, y - 92); X.lineTo(x + 52, y - 92); X.bezierCurveTo(x + 54, y - 30, x + 30, y, x, y); X.bezierCurveTo(x - 30, y, x - 54, y - 30, x - 52, y - 92); X.closePath(); fill(body);
  X.beginPath(); X.moveTo(x - 46, y - 62); X.bezierCurveTo(x - 30, y - 56, x + 30, y - 56, x + 46, y - 62); X.lineWidth = 6; X.strokeStyle = css([1, 1, 1], 0.35); X.stroke();
  ell(x, y - 92, 52, 10); fill(darken(body, 0.15)); ell(x, y - 91, 44, 7); fill(kind === 'coffee' ? [0.42, 0.26, 0.16] : [0.72, 0.45, 0.2]);
  ell(x, y + 2, 22, 5); fill(darken(body, 0.2));
  for (let i = 0; i < 3; i++) { const k = (t * 0.6 + i / 3) % 1; X.save(); X.globalAlpha = 0.6 * Math.sin(k * PI); X.beginPath(); const sx = x - 20 + i * 20; X.moveTo(sx, y - 104 - k * 30); X.bezierCurveTo(sx + 16, y - 134 - k * 60, sx - 16, y - 164 - k * 80, sx + 6, y - 194 - k * 100); X.lineWidth = 6; X.strokeStyle = '#fff'; X.stroke(); X.restore(); }
  X.restore();
}
// holding a drink: the drink sits just past the hand, then the hand and fingers wrap over it
function holdDrink(hand, t, kind, L) {
  const sk = C(L.skin), [hx, hy] = hand;
  if (kind === 'tea' || kind === 'coffee') {
    // fingers go through the handle from behind, so the hand is drawn first and the handle sits over it; the thumb rests on top
    const sc = 0.68;
    circ(hx, hy, 19); fill(sk); rr(hx - 2, hy - 8, 30, 11, 5); fill(darken(sk, 0.08)); rr(hx - 2, hy + 4, 28, 10, 5); fill(darken(sk, 0.08));
    mug(hx + 8 + 50 * sc, hy + 58 * sc, t, kind, sc);
    ell(hx + 6, hy - 14, 13, 8); fill(sk);
    return;
  }
  // a wine glass is held by the stem, so the bowl sits above the fingers
  const gx = kind === 'wine' ? hx + 16 : hx + 30, gy = kind === 'wine' ? hy + 30 : hy + 62;
  drink(gx, gy, t, kind);
  circ(hx, hy, 19); fill(sk);
  [-14, 0, 14].forEach((dy, i) => { rr(hx - 2, hy + dy - 6, 40 - i * 3, 12, 6); fill(i % 2 ? darken(sk, 0.06) : sk); });
}
function drink(x, y, t, kind) {
  if (kind === 'tea' || kind === 'coffee') return mug(x, y, t, kind);
  if (kind === 'kombucha') { rr(x - 26, y - 110, 52, 120, 14); fill([0.62, 0.36, 0.12], 0.85); rr(x - 12, y - 150, 24, 44, 6); fill([0.62, 0.36, 0.12], 0.85); rr(x - 14, y - 160, 28, 14, 4); fill([0.2, 0.2, 0.22]); rr(x - 26, y - 76, 52, 40, 4); fill([0.96, 0.92, 0.8]); for (let i = 0; i < 4; i++) { circ(x - 12 + (i * 9) % 24, y - ((t * 40 + i * 30) % 100), 3); fill([1, 1, 1], 0.6); } return; }
  if (kind === 'beer') {
    // a pint: amber body, white head, bubbles rising
    X.beginPath(); X.moveTo(x - 32, y - 124); X.lineTo(x + 32, y - 124); X.lineTo(x + 26, y + 10); X.lineTo(x - 26, y + 10); X.closePath(); fill([0.93, 0.66, 0.2], 0.92); X.lineWidth = 4; X.strokeStyle = css([1, 1, 1], 0.9); X.stroke();
    rr(x - 34, y - 140, 68, 26, 13); fill([0.99, 0.97, 0.9]); circ(x - 16, y - 142, 12); fill([0.99, 0.97, 0.9]); circ(x + 10, y - 144, 14); fill([0.99, 0.97, 0.9]);
    for (let i = 0; i < 6; i++) { const by = y - ((t * 50 + i * 21) % 110); circ(x - 16 + (i * 11) % 32, by, 3); fill([1, 1, 1], 0.7); }
    return;
  }
  if (kind === 'wine') {
    // a wine glass: the bowl sits by the fingers, stem and foot below
    X.beginPath(); X.moveTo(x - 34, y - 130); X.lineTo(x + 34, y - 130); X.bezierCurveTo(x + 36, y - 80, x + 20, y - 58, x, y - 56); X.bezierCurveTo(x - 20, y - 58, x - 36, y - 80, x - 34, y - 130); X.closePath(); fill([0.95, 0.95, 1], 0.35); X.lineWidth = 4; X.strokeStyle = css([1, 1, 1], 0.9); X.stroke();
    X.beginPath(); X.moveTo(x - 32, y - 104); X.lineTo(x + 32, y - 104); X.bezierCurveTo(x + 30, y - 76, x + 16, y - 62, x, y - 61); X.bezierCurveTo(x - 16, y - 62, x - 30, y - 76, x - 32, y - 104); X.closePath(); fill([0.55, 0.1, 0.2], 0.9);
    line([[x, y - 56], [x, y + 4]], 6, [0.95, 0.95, 1]); ell(x, y + 6, 26, 6); fill([0.95, 0.95, 1], 0.9);
    return;
  }
  const col = kind === 'juice' ? [0.98, 0.65, 0.2] : kind === 'mocktail' ? [0.95, 0.45, 0.5] : [0.75, 0.9, 0.98];
  X.beginPath(); X.moveTo(x - 34, y - 120); X.lineTo(x + 34, y - 120); X.lineTo(x + 28, y + 10); X.lineTo(x - 28, y + 10); X.closePath();
  fill(col, kind === 'water' || kind === 'soda' ? 0.55 : 0.85); X.lineWidth = 4; X.strokeStyle = css([1, 1, 1], 0.9); X.stroke();
  if (kind === 'soda' || kind === 'mocktail') for (let i = 0; i < 7; i++) { const by = y - ((t * 60 + i * 23) % 120); circ(x - 18 + (i * 13) % 36, by, 4); fill([1, 1, 1], 0.9); }
  if (kind === 'juice' || kind === 'mocktail') line([[x + 8, y - 110], [x + 30, y - 175]], 7, kind === 'juice' ? [0.4, 0.7, 0.4] : [1, 1, 1]);
  if (kind === 'soda') { X.beginPath(); X.arc(x + 26, y - 118, 22, PI * 0.9, PI * 2.1); fill([0.55, 0.8, 0.35]); }
  if (kind === 'mocktail') { circ(x - 22, y - 120, 16); fill([0.98, 0.8, 0.3]); circ(x + 22, y - 124, 9); fill([0.85, 0.2, 0.25]); }
}
function glass(x, y, t) {
  X.beginPath(); X.moveTo(x - 34, y - 120); X.lineTo(x + 34, y - 120); X.lineTo(x + 28, y + 10); X.lineTo(x - 28, y + 10); X.closePath();
  fill([0.75, 0.9, 0.98], 0.55); X.lineWidth = 4; X.strokeStyle = css([1, 1, 1], 0.9); X.stroke();
  for (let i = 0; i < 7; i++) { const by = y - ((t * 60 + i * 23) % 120); circ(x - 18 + (i * 13) % 36, by, 4); fill([1, 1, 1], 0.9); }
  X.beginPath(); X.arc(x + 26, y - 118, 22, PI * 0.9, PI * 2.1); fill([0.55, 0.8, 0.35]);
}
function dumbbell(x, y) { line([[x - 55, y], [x + 55, y]], 12, [0.6, 0.6, 0.62]); [-55, 55].forEach(dx => { rr(x + dx - 14, y - 34, 28, 68, 8); fill([0.18, 0.18, 0.2]); }); }
// an evening kitchen: dark warm walls, tiled splashback, cabinets, and pendant lights glowing over the bench
function kitchenEve(t) {
  rect(0, 0, W, 1460, [0.25, 0.27, 0.3]);
  rect(0, 1460, W, H - 1460, [0.36, 0.26, 0.2]);
  for (let yy = 1500; yy < H; yy += 70) rect(0, yy, W, 3, [0.3, 0.21, 0.16]);
  // upper cabinets with a shelf of jars between
  [[60, 330], [700, 1020]].forEach(([a, b]) => { rect(a, 470, b - a, 330, [0.36, 0.4, 0.38]); for (let x = a; x < b - 10; x += (b - a) / 2) { X.lineWidth = 5; X.strokeStyle = css([0.28, 0.31, 0.3]); X.strokeRect(x + 12, 486, (b - a) / 2 - 24, 298); rect(x + (b - a) / 2 - 42, 740, 8, 34, [0.85, 0.72, 0.45]); } });
  rect(370, 700, 290, 14, [0.55, 0.4, 0.28]);
  [[400, 0.9, 0.75, 0.5], [460, 0.75, 0.55, 0.4], [520, 0.9, 0.86, 0.75], [590, 0.4, 0.62, 0.42]].forEach(([x, r, g, b2], i) => { rr(x, 640 - i % 2 * 14, 46, 60 + i % 2 * 14, 8); fill([r, g, b2]); });
  // tiled splashback
  rect(0, 1080, W, 370, [0.86, 0.8, 0.7]);
  X.lineWidth = 3; X.strokeStyle = css([0.72, 0.66, 0.57]); X.beginPath();
  for (let yy = 1080; yy < 1450; yy += 46) { X.moveTo(0, yy); X.lineTo(W, yy); for (let xx = ((yy - 1080) / 46) % 2 ? 0 : 46; xx < W; xx += 92) { X.moveTo(xx, yy); X.lineTo(xx, yy + 46); } }
  X.stroke();
  // pendant lights and the warm pools of light they throw
  [380, 780].forEach((x, i) => {
    const fl = 0.92 + 0.08 * Math.sin(t * 2.3 + i);
    const g = X.createRadialGradient(x, 905, 20, x, 1150, 560); g.addColorStop(0, css([1, 0.8, 0.5], 0.42 * fl)); g.addColorStop(1, css([1, 0.8, 0.5], 0));
    X.fillStyle = g; X.fillRect(0, 0, W, H);
    line([[x, 0], [x, 820]], 4, [0.12, 0.12, 0.14]);
    X.beginPath(); X.moveTo(x - 80, 900); X.quadraticCurveTo(x - 70, 820, x, 815); X.quadraticCurveTo(x + 70, 820, x + 80, 900); X.closePath(); fill([0.16, 0.18, 0.2]);
    X.beginPath(); X.ellipse(x, 900, 80, 14, 0, 0, 2 * PI); fill([1, 0.86, 0.6], fl);
    const b = X.createRadialGradient(x, 905, 2, x, 905, 120); b.addColorStop(0, css([1, 0.9, 0.65], 0.8 * fl)); b.addColorStop(1, css([1, 0.9, 0.65], 0));
    X.fillStyle = b; X.fillRect(x - 130, 800, 260, 230);
  });
}
function kitchenGlow() {
  // warm wash over everything, darker at the edges, like lamplight
  rect(0, 0, W, H, [1, 0.62, 0.3], 0.07);
  const v = X.createRadialGradient(W / 2, 1250, 300, W / 2, 1150, 1150); v.addColorStop(0, 'rgba(20,12,10,0)'); v.addColorStop(1, 'rgba(20,12,10,0.45)');
  X.fillStyle = v; X.fillRect(0, 0, W, H);
}
function counter(x0, x1, y = 1440, col = [0.95, 0.95, 0.94]) {
  rect(x0, y, x1 - x0, 30, [0.55, 0.42, 0.32]); rect(x0 + 10, y + 30, x1 - x0 - 20, 220, col);
  X.lineWidth = 4; X.strokeStyle = css(mix(col, [0, 0, 0], 0.15));
  for (let xx = x0 + 20; xx < x1 - 20; xx += 150) X.strokeRect(xx, y + 45, Math.min(135, x1 - 20 - xx), 190);
}
function stove(x, y, t) {
  ell(x, y, 110, 26); fill([0.2, 0.2, 0.22]); line([[x + 100, y - 6], [x + 220, y - 20]], 18, [0.2, 0.2, 0.22]);
  [[0.3, 0.7, 0.3], [0.9, 0.3, 0.25], [0.98, 0.65, 0.2], [0.4, 0.75, 0.35], [0.95, 0.85, 0.3]].forEach((c, i) => { circ(x - 60 + i * 30, y - 12 - Math.abs(Math.sin(t * 4 + i * 1.3)) * 50, 13); fill(c); });
  steam(x - 40, y, t, 3, 40);
}
function steam(x, y, t, n, gap) {
  for (let i = 0; i < n; i++) {
    const k = (t * 0.6 + i / n) % 1, sx = x + i * gap;
    X.beginPath(); X.moveTo(sx, y - 40 - k * 200); X.bezierCurveTo(sx + 20, y - 80 - k * 200, sx - 20, y - 120 - k * 200, sx, y - 160 - k * 200);
    X.lineWidth = 7; X.strokeStyle = css([1, 1, 1], 0.6 * (1 - k)); X.stroke();
  }
}
function notes(x, y, t, n = 3, col = NAVY) {
  for (let i = 0; i < n; i++) {
    const k = (t * 0.4 + i / n) % 1, nx = x + 60 * Math.sin(k * 5 + i) + i * 30, ny = y - k * 300, a = Math.sin(k * PI);
    ell(nx, ny, 14, 10); fill(col, a); line([[nx + 12, ny], [nx + 12, ny - 50], [nx + 30, ny - 40]], 5, col, a);
  }
}
function recordPlayer(x, y, t) {
  rr(x - 130, y - 60, 260, 60, 10); fill([0.6, 0.4, 0.25]);
  X.save(); X.translate(x - 20, y - 66); X.scale(1, 0.3);
  circ(0, 0, 95); fill([0.08, 0.08, 0.08]);
  [75, 55].forEach(r => { circ(0, 0, r); X.lineWidth = 3; X.strokeStyle = css([0.3, 0.3, 0.3]); X.stroke(); });
  circ(0, 0, 28); fill(CORAL);
  line([[0, 0], [80 * Math.cos(t * 3.5), 80 * Math.sin(t * 3.5)]], 4, [0.5, 0.5, 0.5]);
  X.restore();
  line([[x + 100, y - 80], [x + 90, y - 110], [x + 30, y - 75]], 6, [0.8, 0.8, 0.82]);
  notes(x + 60, y - 120, t);
}
function heart(hx, hy, s, c, a) {
  X.beginPath(); X.moveTo(hx, hy + s);
  X.bezierCurveTo(hx - 2 * s, hy - 0.3 * s, hx - s, hy - 1.6 * s, hx, hy - 0.6 * s);
  X.bezierCurveTo(hx + s, hy - 1.6 * s, hx + 2 * s, hy - 0.3 * s, hx, hy + s); fill(c, a);
}
function hearts(x, y, t, n = 3) {
  for (let i = 0; i < n; i++) {
    const k = (t * 0.35 + i / n) % 1;
    heart(x + 50 * Math.sin(k * 6 + i * 2) + (i - 1) * 40, y - k * 260, 16 + 8 * Math.sin(k * PI), [0.93, 0.4, 0.45], Math.sin(k * PI) * 0.9);
  }
}
function laptop(x, y, screen) {
  // seen from behind when the person sits facing us: the lid with a small logo, no screen
  if (screen === 'back') { rr(x - 150, y - 210, 300, 195, 14); fill([0.74, 0.76, 0.8]); rr(x - 150, y - 210, 300, 195, 14); X.lineWidth = 4; X.strokeStyle = css([0.6, 0.62, 0.66]); X.stroke(); circ(x, y - 112, 16); fill([0.9, 0.91, 0.93]); rect(x - 160, y - 18, 320, 18, [0.6, 0.62, 0.66]); return; }
  rr(x - 150, y - 210, 300, 195, 12); fill([0.25, 0.27, 0.3]);
  rr(x - 136, y - 198, 272, 170, 6); fill([0.95, 0.97, 1]);
  X.beginPath(); X.moveTo(x - 175, y - 15); X.lineTo(x + 175, y - 15); X.lineTo(x + 190, y); X.lineTo(x - 190, y); X.closePath(); fill([0.6, 0.62, 0.66]);
  if (screen) screen(x - 136, y - 198, 272, 170);
}
function desk(x0, x1, y = 1440) { rect(x0, y, x1 - x0, 26, [0.62, 0.45, 0.3]); [x0 + 20, x1 - 40].forEach(lx => rect(lx, y + 26, 20, 210, [0.5, 0.36, 0.24])); }
function tick(x, y, s, k, col = [0.3, 0.68, 0.45]) {
  if (k <= 0) return;
  const p = [[x - s, y], [x - s * 0.3, y + s * 0.7], [x + s, y - s * 0.8]];
  if (k < 0.5) { const q = k / 0.5; line([p[0], [p[0][0] + (p[1][0] - p[0][0]) * q, p[0][1] + (p[1][1] - p[0][1]) * q]], s * 0.35, col); }
  else { const q = (k - 0.5) / 0.5; line([p[0], p[1], [p[1][0] + (p[2][0] - p[1][0]) * q, p[1][1] + (p[2][1] - p[1][1]) * q]], s * 0.35, col); }
}
function checklist(x, y, w, n, t, start = 0.6, gap = 1) {
  rr(x, y, w, 80 + n * 90, 24); fill([1, 1, 1], 0.95);
  for (let i = 0; i < n; i++) {
    const iy = y + 70 + i * 90;
    rr(x + 36, iy - 28, 56, 56, 12); X.lineWidth = 5; X.strokeStyle = css([0.75, 0.75, 0.78]); X.stroke();
    tick(x + 64, iy, 26, clamp((t - start - i * gap) / 0.35));
    rr(x + 120, iy - 12, w - 170 - (i * 37) % 80, 24, 12); fill([0.85, 0.87, 0.9]);
  }
}
function barchart(x, y, w, h, t, n = 5, col = [0.3, 0.6, 0.8]) {
  const bw = w / n * 0.62;
  for (let i = 0; i < n; i++) {
    const target = h * (0.25 + 0.75 * (i + 1) / n), bh = target * ease((t - 0.4 - i * 0.35) / 0.6), bx = x + i * w / n + (w / n - bw) / 2;
    if (bh > 1) { rr(bx, y - bh, bw, bh, Math.min(8, bh / 2)); fill(col); }
  }
  line([[x, y], [x + w, y]], 5, NAVY, 0.6);
}
function jar(x, y, coins) {
  for (let i = 0; i < coins; i++) { const cx = x + ((i * 17) % 20) - 10, cy = y - 18 - i * 16; ell(cx, cy, 48, 12); fill([0.95, 0.75, 0.3]); ell(cx, cy - 3, 44, 9); fill([1, 0.85, 0.45]); }
  rr(x - 80, y - 230, 160, 230, 26); fill([0.8, 0.92, 1], 0.3); X.lineWidth = 6; X.strokeStyle = css([1, 1, 1], 0.9); X.stroke();
  rr(x - 70, y - 255, 140, 30, 8); fill([0.55, 0.42, 0.32]);
}
function coinDrop(x, y, k) { if (k > 0 && k < 1) { ell(x, y - 400 + 360 * ease(k), 30, 30 * Math.abs(Math.cos(k * 10))); fill([0.98, 0.78, 0.3]); } }
function notebook(x, y, t, rows = 4) {
  // lying open on the desk top (seen from the front, so it's a thin slanted page), pen moving as they write
  const dy = 1438, sk = 26;
  X.beginPath(); X.moveTo(x - 110 + sk, dy - 34); X.lineTo(x + 110 + sk, dy - 34); X.lineTo(x + 110, dy); X.lineTo(x - 110, dy); X.closePath(); fill([1, 0.98, 0.9]);
  X.beginPath(); X.moveTo(x + sk * 0.5, dy - 34); X.lineTo(x, dy); X.lineWidth = 3; X.strokeStyle = css([0.8, 0.76, 0.68]); X.stroke();
  for (let i = 0; i < 3; i++) line([[x - 90 + sk * (0.8 - i * 0.25), dy - 26 + i * 9], [x - 20 + sk * (0.8 - i * 0.25), dy - 26 + i * 9]], 2.5, NAVY, 0.45);
  const px = x + 30 + 40 * Math.sin(t * 2.2), py = dy - 20;
  line([[px, py], [px + 34, py - 70]], 9, CORAL); line([[px, py], [px + 5, py - 10]], 5, [0.2, 0.2, 0.24]);
}
function book(x, y, t, front = false) {
  if (!front) {
    X.save(); X.translate(x, y);
    const cov = [0.27, 0.48, 0.55], sw = 0.03 * Math.sin(t * 1.2);
    X.rotate(sw);
    rect(-118, -152, 236, 10, [0.98, 0.95, 0.86]);
    X.beginPath(); X.moveTo(-6, -2); X.lineTo(-122, -22); X.lineTo(-122, -150); X.lineTo(-6, -134); X.closePath(); fill(mix(cov, [0, 0, 0], 0.12));
    X.beginPath(); X.moveTo(6, -2); X.lineTo(122, -22); X.lineTo(122, -150); X.lineTo(6, -134); X.closePath(); fill(cov);
    rect(-6, -136, 12, 136, mix(cov, [0, 0, 0], 0.3));
    rect(28, -112, 70, 10, [0.98, 0.9, 0.7]); rect(28, -94, 50, 7, [0.98, 0.9, 0.7], 0.7); circ(62, -56, 16); fill([0.98, 0.78, 0.5]);
    X.restore(); return;
  }
  X.save(); X.translate(x, y);
  X.beginPath(); X.moveTo(0, 0); X.lineTo(-120, -20); X.lineTo(-120, -150); X.lineTo(0, -130); X.closePath(); fill([1, 0.98, 0.92]);
  X.beginPath(); X.moveTo(0, 0); X.lineTo(120, -20); X.lineTo(120, -150); X.lineTo(0, -130); X.closePath(); fill([0.97, 0.94, 0.86]);
  for (let i = 0; i < 4; i++) { line([[-100, -112 + i * 24 + i * 1.5], [-20, -100 + i * 24]], 4, NAVY, 0.35); line([[20, -100 + i * 24], [100, -112 + i * 24 + i * 1.5]], 4, NAVY, 0.35); }
  X.lineWidth = 6; X.strokeStyle = css([0.35, 0.55, 0.6]); X.beginPath(); X.moveTo(-124, -16); X.lineTo(0, 4); X.lineTo(124, -16); X.stroke();
  X.restore();
}
function bubble(x, y, w, h, a, col = [1, 1, 1], tail = -1) {
  if (a <= 0) return;
  rr(x, y, w, h, 30); fill(col, a);
  const tx = x + w * (tail < 0 ? 0.25 : 0.75);
  X.beginPath(); X.moveTo(tx - 20, y + h - 2); X.lineTo(tx + tail * -30, y + h + 40); X.lineTo(tx + 20, y + h - 2); X.closePath(); fill(col, a);
  for (let i = 0; i < 3; i++) { circ(x + w / 2 - 40 + i * 40, y + h / 2, 9); fill(NAVY, a * 0.6); }
}
function suitcase(x, y) {
  rr(x - 90, y - 230, 180, 230, 22); fill([0.3, 0.55, 0.55]);
  rr(x - 40, y - 270, 80, 50, 14); X.lineWidth = 10; X.strokeStyle = css([0.2, 0.2, 0.22]); X.stroke();
  [-40, 40].forEach(dx => line([[x + dx, y - 215], [x + dx, y - 15]], 8, [0.22, 0.42, 0.42]));
  rr(x - 50, y - 160, 70, 46, 8); fill([0.95, 0.85, 0.4]);
}
function plane(x, y, s) {
  X.save(); X.translate(x, y); X.scale(s, s);
  ell(0, 0, 90, 18); fill([1, 1, 1]);
  [[-10, 0, -40, 60, -15, 60, 25, 0], [-10, 0, -40, -60, -15, -60, 25, 0], [-70, 0, -90, -35, -75, -35, -55, 0]].forEach(p => { X.beginPath(); X.moveTo(p[0], p[1]); X.lineTo(p[2], p[3]); X.lineTo(p[4], p[5]); X.lineTo(p[6], p[7]); X.closePath(); fill([1, 1, 1]); });
  X.restore();
}
function mapCard(x, y, t) {
  rr(x, y, 300, 260, 18); fill([0.85, 0.93, 0.95]);
  X.beginPath(); X.moveTo(x + 60, y + 90); X.bezierCurveTo(x + 120, y + 40, x + 200, y + 70, x + 240, y + 120); X.bezierCurveTo(x + 260, y + 170, x + 200, y + 220, x + 130, y + 200); X.bezierCurveTo(x + 70, y + 190, x + 40, y + 140, x + 60, y + 90); fill([0.6, 0.78, 0.5]);
  X.setLineDash([10, 12]); line([[x + 90, y + 170], [x + 150, y + 110], [x + 205, y + 125]], 5, CORAL, 0.8); X.setLineDash([]);
  const py = y + 120 - 10 * Math.abs(Math.sin(t * 3));
  X.beginPath(); X.arc(x + 205, py - 26, 18, PI, 2 * PI); X.lineTo(x + 205, py); X.closePath(); fill(CORAL); circ(x + 205, py - 26, 7); fill([1, 1, 1]);
}
function guitar(x, y, ang) {
  X.save(); X.translate(x, y); X.rotate(ang);
  rect(0, -10, 230, 20, [0.45, 0.28, 0.18]); rr(225, -16, 50, 32, 6); fill([0.35, 0.22, 0.14]);
  ell(-95, 0, 85, 72); fill([0.8, 0.56, 0.32]); ell(0, 0, 62, 55); fill([0.8, 0.56, 0.32]);
  circ(-30, 0, 24); fill([0.18, 0.12, 0.1]); rect(-150, -14, 14, 28, [0.35, 0.22, 0.14]);
  for (let i = 0; i < 6; i++) { const yy = -7.5 + i * 3; line([[-143, yy * 1.3], [262, yy]], 1.6, [0.93, 0.9, 0.82], 0.85); }
  [-6, 6].forEach(dy => [240, 255].forEach(px => { circ(px, dy * 2.4, 4); fill([0.8, 0.78, 0.72]); }));
  X.restore();
}
function playGuitar(c, t, px, py, s, gx, gy) {
  const L = ME(c), a = -0.55, ca = Math.cos(a), sa = Math.sin(a), st = Math.sin(t * 9);
  const neck = [gx + 175 * ca, gy + 175 * sa], strum = [gx - 40 * ca - 26 * st * sa, gy - 40 * sa + 26 * st * ca];
  const aR = armsTo(px, py, s, L, neck[0], neck[1], true), aL = armsTo(px, py, s, L, strum[0], strum[1]);
  person(px, py, s, L, t, { armL: aL.armL, armR: aR.armR });
  guitar(gx, gy, a);
  const dress = L.outfit === 'dress', tee = L.outfit === 'tee', sk = C(L.skin), up = dress ? sk : C(L.top), fore = (tee || dress) ? sk : C(L.top);
  // the strumming arm is redrawn whole, shoulder to hand, in front of the guitar, so the elbow joins up
  const k = aL.ss, bw = aL.bw, [u] = aL.armL, D = L.chair ? 92 : 0;
  const sh = [px - 72 * k * bw, py + (-426 + D) * k], el = [px + (-72 - 112 * Math.sin(u)) * k * bw, py + (-426 + D + 112 * Math.cos(u)) * k];
  const wd = (dress ? 30 : 38) * k;
  line([sh, el], wd, up); if (tee) { circ(el[0], el[1], wd / 2); fill(up); }
  line([el, strum], wd * (tee ? 0.8 : 1), fore); circ(strum[0], strum[1], 20 * s); fill(sk);
  ell(neck[0], neck[1] + 4, 20 * s, 24 * s); fill(sk);
}
function micStand(x, y) {
  [-60, 0, 60].forEach(dx => line([[x, y - 60], [x + dx, y]], 6, [0.15, 0.15, 0.17]));
  line([[x, y - 60], [x, y - 520], [x - 90, y - 560]], 8, [0.15, 0.15, 0.17]); ell(x - 100, y - 566, 26, 16); fill([0.3, 0.3, 0.32]);
}
function bowl(x, y, t) {
  X.beginPath(); X.arc(x, y, 70, 0, PI); fill([0.95, 0.95, 0.92]); ell(x, y, 70, 14); fill([0.5, 0.75, 0.35]);
  [[0.9, 0.3, 0.25], [0.98, 0.7, 0.25], [0.35, 0.65, 0.3]].forEach((c, i) => { circ(x - 30 + i * 30, y - 6, 12); fill(c); });
  steam(x - 15, y + 10, t, 2, 30);
}
function fruitBowl(x, y) {
  [[-45, -30, [0.95, 0.4, 0.3], 30], [0, -45, [0.98, 0.75, 0.25], 32], [45, -30, [0.45, 0.72, 0.3], 30], [-20, -70, [0.6, 0.3, 0.5], 22], [25, -72, [0.95, 0.85, 0.35], 24]].forEach(([dx, dy, c, r]) => { circ(x + dx, y + dy, r); fill(c); });
  X.beginPath(); X.arc(x, y - 20, 90, 0, PI); fill([0.35, 0.55, 0.6]);
}
function fridge(x, y, k) {
  rr(x, y - 620, 280, 620, 20); fill([0.88, 0.9, 0.92]); rr(x + 15, y - 600, 250, 580, 12); fill([0.98, 0.98, 1]);
  [y - 450, y - 300, y - 160].forEach(sy => line([[x + 25, sy], [x + 255, sy]], 6, [0.8, 0.85, 0.9]));
  [[0.35, 0.7, 0.3], [0.95, 0.45, 0.25], [0.98, 0.8, 0.3], [0.5, 0.75, 0.35], [0.9, 0.3, 0.3]].forEach((c, i) => { circ(x + 60 + i * 42, y - 330 - (i % 2) * 10, 20); fill(c); });
  rr(x + 50, y - 520, 60, 70, 8); fill([0.8, 0.9, 0.95]); rr(x + 140, y - 510, 50, 60, 8); fill([0.95, 0.9, 0.7]);
  if (k > 0.01) rect(x + 280, y - 615, 260 * 0.35 * k, 610, [0.82, 0.85, 0.88]);
  else rect(x + 274, y - 615, -260, 610, [0.82, 0.85, 0.88]);
}
function confetti(t, t0) {
  if (t < t0) return;
  const r = rng(11), k = t - t0;
  for (let i = 0; i < 50; i++) {
    const x0 = 150 + r() * 780, vy = -900 + r() * 400, vx = -200 + r() * 400, ci = Math.floor(r() * 4);
    const x = x0 + vx * k, y = 1200 + vy * k + 900 * k * k;
    if (y > 1900) continue;
    X.save(); X.translate(x, y); X.rotate(k * 6 + i); rect(-10, -5, 20, 10, [CORAL, GOLD, [0.4, 0.7, 0.85], [0.5, 0.78, 0.45]][ci]); X.restore();
  }
}
function campfire(x, y, t) {
  [-0.4, 0.4].forEach(a => { X.save(); X.translate(x, y); X.rotate(a); rect(-70, -10, 140, 20, [0.45, 0.3, 0.2]); X.restore(); });
  const g = X.createRadialGradient(x, y - 40, 5, x, y - 40, 300); g.addColorStop(0, css([1, 0.7, 0.3], 0.45)); g.addColorStop(1, css([1, 0.7, 0.3], 0));
  circ(x, y - 40, 300); X.fillStyle = g; X.fill();
  [[[0.95, 0.4, 0.2], 1], [[1, 0.7, 0.25], 0.7], [[1, 0.92, 0.6], 0.4]].forEach(([c, s], i) => {
    const f = 1 + 0.12 * Math.sin(t * 9 + i * 2);
    X.beginPath(); X.moveTo(x - 50 * s, y - 10); X.bezierCurveTo(x - 60 * s, y - 80 * s * f, x - 10 * s, y - 120 * s * f, x, y - 170 * s * f);
    X.bezierCurveTo(x + 10 * s, y - 120 * s * f, x + 60 * s, y - 80 * s * f, x + 50 * s, y - 10); X.closePath(); fill(c);
  });
}
// a thought bubble that pops in at time k, with a little trail of dots down towards the head
function thought(x, y, r, hx, hy, t, k, draw) {
  const s = ease((t - k) / 0.5); if (s <= 0) return;
  const bob = 6 * Math.sin(t * 1.8 + k * 3);
  [[0.25, 14], [0.5, 22]].forEach(([u, rad], i) => { if (t - k > 0.12 * i) { circ(hx + (x - hx) * u, hy + (y + r * 0.6 - hy) * u + bob * u, rad * s); fill([1, 1, 1], 0.92); } });
  X.save(); X.translate(x, y + bob); X.scale(s, s);
  X.shadowColor = 'rgba(40,30,25,0.18)'; X.shadowBlur = 18;
  [[-0.55, 0.2, 0.62], [0.55, 0.2, 0.62], [0, -0.3, 0.72], [-0.3, 0.45, 0.6], [0.3, 0.45, 0.6], [0, 0.1, 0.85]].forEach(([dx, dy, rr2]) => { circ(dx * r, dy * r, rr2 * r); fill([1, 1, 1], 0.96); });
  X.shadowBlur = 0;
  X.beginPath(); X.arc(0, 0.08 * r, 0.78 * r, 0, 2 * PI); X.clip(); draw(r);
  X.restore();
}
function houseIcon(r) {
  rect(-r, 0.28 * r, 2 * r, r, [0.62, 0.8, 0.5]);
  rect(-0.42 * r, -0.12 * r, 0.84 * r, 0.52 * r, [0.97, 0.88, 0.7]);
  X.beginPath(); X.moveTo(-0.55 * r, -0.1 * r); X.lineTo(0, -0.55 * r); X.lineTo(0.55 * r, -0.1 * r); X.closePath(); fill([0.86, 0.42, 0.33]);
  rect(-0.1 * r, 0.12 * r, 0.2 * r, 0.28 * r, [0.45, 0.3, 0.22]);
  rect(0.18 * r, 0.0, 0.16 * r, 0.14 * r, [0.6, 0.78, 0.92]); rect(-0.34 * r, 0.0, 0.16 * r, 0.14 * r, [0.6, 0.78, 0.92]);
  circ(0.55 * r, -0.5 * r, 0.12 * r); fill([1, 0.85, 0.4]);
}
function holidayIcon(r, t) {
  rect(-r, -r, 2 * r, 2 * r, [0.62, 0.84, 0.96]);
  circ(0.42 * r, -0.4 * r, 0.16 * r); fill([1, 0.86, 0.4]);
  rect(-r, 0.05 * r, 2 * r, 0.3 * r, [0.27, 0.6, 0.78]);
  rect(-r, 0.33 * r, 2 * r, r, [0.96, 0.85, 0.6]);
  X.beginPath(); X.moveTo(-0.38 * r, 0.42 * r); X.quadraticCurveTo(-0.3 * r, 0, -0.12 * r, -0.36 * r); X.lineWidth = 0.08 * r; X.strokeStyle = css([0.55, 0.38, 0.22]); X.stroke();
  const sw = 0.06 * Math.sin(t * 1.5);
  [-2.6, -1.9, -1.1, -0.4].forEach(a => { X.save(); X.translate(-0.12 * r, -0.36 * r); X.rotate(a + sw); X.beginPath(); X.ellipse(0.24 * r, 0, 0.26 * r, 0.07 * r, 0, 0, 2 * PI); fill([0.3, 0.62, 0.36]); X.restore(); });
}
function wallClock(x, y, r, t) {
  circ(x, y + 6, r + 10); fill([0.2, 0.16, 0.14], 0.18);
  circ(x, y, r + 10); fill([0.3, 0.24, 0.2]);
  circ(x, y, r); fill([0.99, 0.97, 0.92]);
  for (let i = 0; i < 12; i++) { const a = i * PI / 6, k = i % 3 ? 0.86 : 0.78; line([[x + Math.sin(a) * r * k, y - Math.cos(a) * r * k], [x + Math.sin(a) * r * 0.93, y - Math.cos(a) * r * 0.93]], i % 3 ? 3 : 6, [0.3, 0.24, 0.2]); }
  const m = t * 1.6, hh = t * 1.6 / 12 + 2.2;
  line([[x, y], [x + Math.sin(hh) * r * 0.5, y - Math.cos(hh) * r * 0.5]], 9, [0.18, 0.18, 0.24]);
  line([[x, y], [x + Math.sin(m) * r * 0.78, y - Math.cos(m) * r * 0.78]], 6, [0.18, 0.18, 0.24]);
  circ(x, y, 9); fill([0.93, 0.52, 0.43]);
}
function bulb(x, y, t) {
  const a = 0.6 + 0.4 * Math.sin(t * 4);
  const g = X.createRadialGradient(x, y, 5, x, y, 150); g.addColorStop(0, css([1, 0.85, 0.4], 0.6 * a)); g.addColorStop(1, css([1, 0.85, 0.4], 0));
  circ(x, y, 150); X.fillStyle = g; X.fill(); circ(x, y, 44); fill([1, 0.88, 0.45]); rr(x - 22, y + 36, 44, 34, 6); fill([0.6, 0.6, 0.62]);
}
function clockRing(x, y, k) {
  circ(x, y, 60); fill([1, 1, 1], 0.95);
  X.beginPath(); X.arc(x, y, 60, -PI / 2, -PI / 2 + 2 * PI * clamp(k)); X.lineWidth = 12; X.strokeStyle = css([0.3, 0.68, 0.45]); X.stroke();
  line([[x, y], [x, y - 36]], 6, NAVY);
}
function songCard(x, y, t) {
  rr(x, y, 320, 200, 22); fill([1, 1, 1], 0.95);
  for (let i = 0; i < 4; i++) { const hh = 30 + 25 * Math.abs(Math.sin(t * 5 + i)); rect(x + 30 + i * 22, y + 150 - hh, 14, hh, CORAL); }
  for (let i = 0; i < 3; i++) line([[x + 140, y + 50 + i * 40], [x + 280 - i * 30, y + 50 + i * 40]], 8, NAVY, 0.6);
  tick(x + 270, y + 150, 30, clamp((t - 2) / 0.4));
}
function calmRings(x, y, t) {
  for (let i = 0; i < 3; i++) { const k = (t * 0.25 + i / 3) % 1; circ(x, y, 80 + k * 260); X.lineWidth = 6; X.strokeStyle = css([1, 1, 1], 0.5 * (1 - k)); X.stroke(); }
}

function discoBall(x, y, t) {
  line([[x, 0], [x, y - 70]], 4, [0.6, 0.6, 0.65]);
  const cols = [[1, 0.45, 0.55], [0.45, 0.75, 1], [1, 0.85, 0.35], [0.55, 0.9, 0.55]];
  for (let i = 0; i < 4; i++) {
    const a = t * 0.8 + i * PI / 2, ex = x + 900 * Math.cos(a), ey = y + 700 + 300 * Math.sin(a * 0.7);
    X.beginPath(); X.moveTo(x, y); X.lineTo(ex - 120, ey); X.lineTo(ex + 120, ey); X.closePath(); fill(cols[i], 0.12);
  }
  circ(x, y, 70); fill([0.78, 0.8, 0.86]);
  X.save(); circ(x, y, 70); X.clip();
  for (let gx = -70; gx < 70; gx += 20) for (let gy = -70; gy < 70; gy += 20) { const k = (Math.sin(t * 5 + gx * 0.3 + gy * 0.5) + 1) / 2; rect(x + gx + 1, y + gy + 1, 18, 18, mix([0.6, 0.62, 0.7], [1, 1, 1], k)); }
  X.restore();
}
function sparkle(x, y, s, a, col = [1, 1, 1]) {
  if (a <= 0) return;
  X.beginPath(); X.moveTo(x, y - s); X.quadraticCurveTo(x, y, x + s, y); X.quadraticCurveTo(x, y, x, y + s); X.quadraticCurveTo(x, y, x - s, y); X.quadraticCurveTo(x, y, x, y - s); fill(col, a);
}
function sparkles(t, pts, col = [1, 1, 1]) { pts.forEach(([x, y, s], i) => sparkle(x, y, s * (0.6 + 0.4 * Math.sin(t * 4 + i * 1.9)), Math.max(0, Math.sin(t * 2 + i * 1.3)), col)); }
function lamp(x, y, t) {
  const g = X.createRadialGradient(x, y - 380, 10, x, y - 380, 420); g.addColorStop(0, css([1, 0.82, 0.5], 0.4)); g.addColorStop(1, css([1, 0.82, 0.5], 0));
  circ(x, y - 380, 420); X.fillStyle = g; X.fill();
  line([[x, y], [x, y - 360]], 10, [0.25, 0.22, 0.2]); ell(x, y, 60, 14); fill([0.25, 0.22, 0.2]);
  X.beginPath(); X.moveTo(x - 70, y - 340); X.lineTo(x + 70, y - 340); X.lineTo(x + 45, y - 450); X.lineTo(x - 45, y - 450); X.closePath(); fill([1, 0.9, 0.7]);
}
function sofa(x0, x1, y, col) {
  rr(x0, y - 240, x1 - x0, 170, 40); fill(col);
  rr(x0 - 30, y - 150, 90, 150, 30); fill(darken(col, 0.1)); rr(x1 - 60, y - 150, 90, 150, 30); fill(darken(col, 0.1));
  rr(x0 + 40, y - 110, x1 - x0 - 80, 90, 24); fill(mix(col, [1, 1, 1], 0.12));
}
function plant(x, y) {
  rr(x - 50, y - 110, 100, 110, 14); fill([0.85, 0.55, 0.4]);
  [[-60, -260, -0.5], [0, -300, 0], [60, -250, 0.5], [-30, -200, -0.3], [35, -190, 0.35]].forEach(([dx, dy, a]) => { X.save(); X.translate(x, y - 110); X.rotate(a); ell(0, dy / 2 + 20, 26, -dy / 2 - 10); fill([0.32, 0.58, 0.38]); X.restore(); });
}
function weightRack(x, y) {
  [x, x + 260].forEach(px => rect(px, y - 520, 22, 520, [0.25, 0.26, 0.3]));
  rect(x - 10, y - 380, 300, 16, [0.35, 0.36, 0.4]);
  [[x + 60, 70], [x + 130, 60], [x + 200, 50]].forEach(([px, r]) => { circ(px, y - 300 + (70 - r), r); fill([0.15, 0.15, 0.18]); circ(px, y - 300 + (70 - r), 12); fill([0.6, 0.6, 0.62]); });
  rect(x - 10, y - 140, 300, 16, [0.35, 0.36, 0.4]);
  for (let i = 0; i < 4; i++) dumbbell(x + 70 + (i % 2) * 140, y - 175 - Math.floor(i / 2) * 0);
}

function sunBurst(x, y, t) {
  const g = X.createRadialGradient(x, y, 20, x, y, 520); g.addColorStop(0, css([1, 0.92, 0.65], 0.75)); g.addColorStop(1, css([1, 0.85, 0.55], 0));
  circ(x, y, 520); X.fillStyle = g; X.fill();
  for (let i = 0; i < 14; i++) { const a = i / 14 * 2 * PI + t * 0.15, r0 = 180, r1 = 430 + 40 * Math.sin(t * 2 + i); X.beginPath(); X.moveTo(x + r0 * Math.cos(a - 0.05), y + r0 * Math.sin(a - 0.05)); X.lineTo(x + r1 * Math.cos(a), y + r1 * Math.sin(a)); X.lineTo(x + r0 * Math.cos(a + 0.05), y + r0 * Math.sin(a + 0.05)); X.closePath(); fill([1, 0.95, 0.75], 0.45); }
}
function speedLines(x, y, t) { for (let i = 0; i < 4; i++) { const k = (t * 3 + i * 0.25) % 1, len = 120 + 60 * (i % 2); line([[x - k * 60, y + i * 70], [x - k * 60 - len, y + i * 70]], 9, [1, 1, 1], 0.75 * (1 - k)); } }
function seated(x, y, s, L, t, b) {
  if (L.chair) { person(x, y, s, L, t, { armL: [0.35 + 0.04 * b, 0.9], armR: [0.35 + 0.04 * b, 0.9], eyesClosed: true }); return; }
  // a mat, the body from the hips up, legs crossed in front, hands resting on the knees, eyes closed
  rr(x - 300 * s, y - 14 * s, 600 * s, 34 * s, 16 * s); fill([0.35, 0.62, 0.6]);
  X.save(); X.beginPath(); X.rect(x - 400 * s, 0, 800 * s, y - 70 * s); X.clip();
  person(x, y + 190 * s, s, L, t, { armL: [0.55 + 0.05 * b, 1.25], armR: [0.55 + 0.05 * b, 1.25], bob: 4 * b, eyesClosed: true });
  X.restore();
  const pc = L.outfit === 'dress' ? C(L.top) : C(L.pants);
  [-1, 1].forEach(sd => { X.save(); X.translate(x, y - 60 * s); X.rotate(sd * 0.1); rr(-170 * s, -34 * s, 340 * s, 68 * s, 34 * s); fill(sd < 0 ? darken(pc, 0.08) : pc); X.restore(); });
  [-1, 1].forEach(sd => { ell(x + sd * 175 * s, y - 50 * s, 30 * s, 16 * s); fill([0.13, 0.11, 0.1]); });
}

// ---------------------------------------------------------------- scenes
const walkX = (p, x0, x1, k0 = 0, k1 = 0.75) => { const q = clamp((p - k0) / (k1 - k0)); return [x0 + (x1 - x0) * ease(q), q > 0 && q < 1]; };
// a brand new film has no look or skin picked yet; anything that still draws them gets a sensible stand-in
const ME = cfg => { const m = cfg.me || DEFAULT_ME; return m.skin ? m : Object.assign({}, m, { skin: DEFAULT_ME.skin }); };
const F2 = cfg => cfg.friend2 || FRIEND2;
const PT = cfg => cfg.partner || DEFAULT_PARTNER;
const firstKid = cfg => kidsOf(cfg)[0] || DEFAULT_KID;
// ---- sport and people props
function footyBall(x, y, a, soccer) {
  if (soccer) { circ(x, y, 32); fill([1, 1, 1]); X.lineWidth = 3; X.strokeStyle = css([0.2, 0.2, 0.22]); X.stroke(); [[0, 0], [-17, -17], [18, -15], [-15, 18], [17, 17]].forEach(([dx, dy], i) => { const r = i ? 7 : 10, c = Math.cos(a), s = Math.sin(a); circ(x + dx * c - dy * s, y + dx * s + dy * c, r); fill([0.18, 0.18, 0.2]); }); return; }
  X.save(); X.translate(x, y); X.rotate(a); ell(0, 0, 44, 27); fill([0.62, 0.24, 0.14]); line([[-14, -10], [14, -10]], 4, [1, 1, 1]); for (let i = -2; i <= 2; i++) line([[i * 6, -15], [i * 6, -5]], 3, [1, 1, 1]); X.restore();
}
function sportsGround(t) {
  sky(t, 'day', null, 760);
  rect(0, 560, W, 260, [0.36, 0.4, 0.48]);
  for (let r = 0; r < 4; r++) rect(0, 600 + r * 52, W, 8, [0.3, 0.33, 0.4]);
  for (let i = 0; i < 70; i++) { const x = (i * 157) % W + 8, y = 590 + ((i * 37) % 4) * 52 + 22, b = 1 + 0.06 * Math.sin(t * 4 + i); circ(x, y - 6 * b, 11); fill([[0.93, 0.52, 0.43], [0.95, 0.77, 0.38], [0.31, 0.5, 0.69], [0.97, 0.95, 0.9], [0.35, 0.55, 0.45]][i % 5]); }
  rect(0, 540, W, 24, [0.93, 0.52, 0.43]);
  [80, W - 80].forEach(x => { line([[x, 540], [x, 300]], 10, [0.6, 0.62, 0.66]); rr(x - 60, 260, 120, 50, 8); fill([0.85, 0.87, 0.9]); for (let j = 0; j < 3; j++) { circ(x - 36 + j * 36, 285, 12); fill([1, 0.97, 0.8]); } });
  rect(0, 820, W, 640, [0.4, 0.66, 0.36]);
  for (let s = 0; s < 6; s++) if (s % 2) rect(0, 820 + s * 107, W, 107, [0.44, 0.7, 0.4]);
  [[400, 300], [470, 420], [610, 420], [680, 300]].forEach(([px, hh]) => line([[px, 1000], [px, 1000 - hh]], 10, [1, 1, 1]));
  X.beginPath(); X.ellipse(W / 2, 1180, 620, 170, 0, PI, 2 * PI); X.lineWidth = 8; X.strokeStyle = css([1, 1, 1], 0.8); X.stroke();
  rect(0, 1440, W, H - 1440, [0.82, 0.42, 0.33]);
  for (let k = 0; k < 4; k++) rect(0, 1500 + k * 110, W, 7, [1, 1, 1], 0.85);
}
function kickabout(c, t, soccer) {
  outdoor(c, t, 'day');
  if (soccer) { const gx = 700, gy = 1430; line([[gx, gy], [gx, gy - 230], [gx + 330, gy - 230], [gx + 330, gy]], 12, [1, 1, 1]); X.lineWidth = 2; X.strokeStyle = css([1, 1, 1], 0.5); X.beginPath(); for (let i = 1; i < 11; i++) { X.moveTo(gx + i * 30, gy - 230); X.lineTo(gx + i * 30, gy); } for (let j = 1; j < 8; j++) { X.moveTo(gx, gy - j * 29); X.lineTo(gx + 330, gy - j * 29); } X.stroke(); }
  else [[640, 300], [730, 470], [850, 470], [940, 300]].forEach(([px, h]) => line([[px, 1430], [px, 1430 - h]], 12, [1, 1, 1]));
  const kid = kidsOf(c).length, T = 1.7, q = (t / T) % 1, dir = Math.floor(t / T) % 2;
  const ax = 330, bx = 780, u = dir ? 1 - q : q, x = ax + (bx - ax) * u, y = 1380 - 380 * Math.sin(q * PI);
  const meKick = dir === 0 ? clamp(1 - q * 4) : clamp((q - 0.75) * 4);
  person(250, 1680, 1, ME(c), t, { walk: 0.5 * meKick, speed: 9, armL: [0.9 + 0.5 * meKick, 0.7], armR: [0.5, 0.4], bob: 10 * meKick });
  const mk = dir === 1 ? clamp(1 - q * 4) : clamp((q - 0.75) * 4);
  if (kid) drawKid(firstKid(c), 860, 1690, t + 0.5, { flip: -1, walk: 0.5 * mk, speed: 10, armL: [1.2, 1.0], armR: [1.2, 1.0] });
  else person(860, 1670, 0.97, FRIEND1, t, { flip: -1, walk: 0.5 * mk, speed: 9, armL: [1.0 + 0.4 * mk, 0.8], armR: [1.0 + 0.4 * mk, 0.8], bob: 10 * mk });
  footyBall(x, y, t * 7, soccer);
  pet(c, 300 + 400 * u, 1800, 0.75, t, { walk: 1.2, speed: 14, flip: dir ? -1 : 1 });
}
function racket(x, y, a) { X.save(); X.translate(x, y); X.rotate(a); line([[0, 0], [0, -70]], 12, [0.2, 0.2, 0.25]); ell(0, -120, 36, 50); fill([1, 1, 1], 0.2); X.lineWidth = 9; X.strokeStyle = css(CORAL); X.stroke(); X.restore(); }
function tennis(c, t) {
  outdoor(c, t, 'day');
  rect(0, 1330, W, 590, [0.33, 0.53, 0.62]); rect(0, 1330, W, 14, [1, 1, 1]); rect(0, 1890, W, 12, [1, 1, 1], 0.9);
  line([[60, 1600], [W - 60, 1600]], 6, [1, 1, 1], 0.8);
  const T = 1.4, q = (t / T) % 1, dir = Math.floor(t / T) % 2, u = dir ? 1 - q : q;
  const sw = k => Math.sin(clamp(k) * PI);
  const meS = dir === 0 ? sw(1 - q * 3) : sw((q - 0.7) * 3), frS = dir === 1 ? sw(1 - q * 3) : sw((q - 0.7) * 3);
  const h = person(250, 1700, 1, ME(c), t, { walk: 0.25, speed: 8, armR: [0.45 + 0.8 * meS, 1.0 + 0.9 * meS], armL: [0.6, 0.9] });
  racket(h.R[0], h.R[1], 0.3 + 1.1 * meS);
  const fr = hasPartner(c) ? PT(c) : F2(c);
  const h2 = person(840, 1690, 0.95, fr, t, { flip: -1, walk: 0.25, speed: 8, armR: [0.45 + 0.8 * frS, 1.0 + 0.9 * frS], armL: [0.6, 0.9] });
  racket(h2.R[0], h2.R[1], -0.3 - 1.1 * frS);
  rect(532, 1440, 16, 330, [0.25, 0.25, 0.28]); rr(470, 1470, 140, 230, 6); X.save(); X.clip(); X.lineWidth = 2; X.strokeStyle = css([1, 1, 1], 0.55); X.beginPath(); for (let i = 0; i < 12; i++) { X.moveTo(470 + i * 14, 1470); X.lineTo(470 + i * 14, 1700); } for (let j = 0; j < 17; j++) { X.moveTo(470, 1470 + j * 14); X.lineTo(610, 1470 + j * 14); } X.stroke(); X.restore(); rect(466, 1462, 148, 14, [1, 1, 1]);
  const bxp = 380 + 330 * u * 1.0, by = 1300 - 300 * Math.sin(q * PI); circ(bxp, by, 17); fill([0.85, 0.95, 0.35]);
  pet(c, 120, 1860, 0.6, t, { lookUp: 0.6 });
}
function surfboard(x, y, a, len = 270) { X.save(); X.translate(x, y); X.rotate(a); ell(0, 0, len, 34); fill([0.98, 0.88, 0.55]); line([[-len + 30, 0], [len - 30, 0]], 6, CORAL); X.restore(); }
function surf(c, t, p) {
  HATS_OFF = true;
  outdoor(c, t, 'day');
  const sx = 760 + 60 * Math.sin(t * 0.8), sy = 1205;
  X.beginPath(); X.moveTo(sx - 220, sy + 20); X.bezierCurveTo(sx - 100, sy - 70, sx + 60, sy - 90, sx + 120, sy - 30); X.bezierCurveTo(sx + 90, sy - 50, sx + 40, sy - 30, sx + 30, sy + 20); X.closePath(); fill([0.3, 0.58, 0.72]);
  line([[sx - 200, sy + 14], [sx - 90, sy - 50], [sx + 40, sy - 70], [sx + 115, sy - 32]], 10, [1, 1, 1], 0.85);
  surfboard(sx, sy + 8, -0.1, 70);
  person(sx, sy + 4, 0.2, FRIEND1, t, { armL: [1.5, 1.6], armR: [1.4, 1.5], bob: 3 * Math.sin(t * 3) });
  const x = 110 + 440 * p;
  const h = person(x, 1680, 1, ME(c), t, { walk: 1, armL: [0.12, 0.05], armR: [0.35, 0.2] });
  surfboard(x + 30, 1360, -0.08); circ(h.R[0], h.R[1] - 10, 20); fill(ME(c).skin);
  pet(c, x + 330, 1740, 0.85, t, { walk: 1 });
}
function cycle(c, t, p) {
  outdoor(c, t, 'day');
  if (ME(c).chair) { const x = -100 + 1000 * p; speedLines(x - 200, 1400, t); person(x, 1690, 1, ME(c), t, { walk: 1, speed: 10, armL: [0.3, 0.5], armR: [0.3, 0.5] }); pet(c, x - 380, 1730, 0.8, t, { walk: 1.3, speed: 15 }); return; }
  const bx = -60 + 900 * p, gy = 1790, r = 112;
  speedLines(bx - 330, 1450, t);
  const wheel = wx => { circ(wx, gy - r, r); X.lineWidth = 14; X.strokeStyle = css([0.18, 0.18, 0.2]); X.stroke(); for (let i = 0; i < 6; i++) { const a = -t * 7 + i * PI / 3; line([[wx, gy - r], [wx + r * Math.cos(a), gy - r + r * Math.sin(a)]], 3, [0.7, 0.7, 0.72]); } circ(wx, gy - r, 10); fill([0.5, 0.5, 0.52]); };
  wheel(bx - 200); wheel(bx + 200);
  const pc = [bx - 10, gy - 95], seat = [bx - 80, gy - 360], head = [bx + 140, gy - 330];
  line([[bx - 200, gy - r], pc, seat, [bx - 200, gy - r]], 14, CORAL); line([pc, [bx + 130, gy - 300], seat], 14, CORAL); line([[bx + 130, gy - 300], [bx + 200, gy - r]], 14, CORAL);
  rr(seat[0] - 50, seat[1] - 22, 100, 24, 10); fill([0.18, 0.18, 0.2]);
  const ca = t * 7; line([[pc[0] - 50 * Math.cos(ca), pc[1] - 50 * Math.sin(ca)], [pc[0] + 50 * Math.cos(ca), pc[1] + 50 * Math.sin(ca)]], 9, [0.3, 0.3, 0.32]);
  const h = person(bx - 70, gy - 70, 0.9, ME(c), t, { walk: 0.7, speed: 7, armL: [-0.9, -1.2], armR: [1.25, 1.35] });
  line([[bx + 130, gy - 300], head, h.R], 10, [0.25, 0.25, 0.28]);
  pet(c, bx - 470, 1760, 0.75, t, { walk: 1.3, speed: 15 });
}
function swim(c, t, p) {
  HATS_OFF = true;
  sky(t, 'day', null, 1080);
  for (let i = 0; i < 12; i++) { circ(i * 100 + 30, 1010, 80); fill(gt([0.32, 0.55, 0.32], 'day')); }
  rect(0, 1040, W, 60, gt([0.32, 0.55, 0.32], 'day'));
  rect(0, 1100, W, 170, [0.94, 0.91, 0.85]); for (let x = 0; x < W; x += 90) line([[x, 1100], [x, 1270]], 2, [0.85, 0.8, 0.72]);
  rect(0, 1270, W, 560, lin(0, 1270, 0, 1830, [[0, [0.42, 0.78, 0.9]], [1, [0.25, 0.6, 0.8]]]));
  rect(0, 1262, W, 16, [0.98, 0.98, 0.96]);
  for (let i = 0; i < 9; i++) { const y = 1320 + i * 58, k = (t * 30 + i * 47) % 160; line([[k - 160 + (i % 2) * 70, y], [k - 60 + (i % 2) * 70, y]], 5, [1, 1, 1], 0.35); line([[k + 260, y], [k + 380, y]], 5, [1, 1, 1], 0.35); line([[k + 640, y + 20], [k + 760, y + 20]], 5, [1, 1, 1], 0.35); }
  [1430, 1650].forEach(y => { for (let x = 10; x < W; x += 36) { circ(x, y, 11); fill(Math.floor(x / 36) % 4 < 2 ? [0.93, 0.4, 0.35] : [1, 1, 1]); } });
  rect(0, 1830, W, 90, [0.94, 0.91, 0.85]);
  const sx = 80 + 760 * p, sy = 1545, L = ME(c);
  ell(sx - 70, sy + 22, 150, 34); fill([0.15, 0.35, 0.5], 0.35);
  for (let i = 0; i < 4; i++) { const k = (t * 3 + i * 0.25) % 1; circ(sx - 210 - 30 * k + 12 * i, sy + 4 - 26 * Math.sin(k * PI), 10 * (1 - k) + 3); fill([1, 1, 1], 0.8 * (1 - k)); }
  [0, PI].forEach(ph => { const a = t * 5 + ph, up = Math.sin(a); if (up < -0.2) return; const shx = sx - 20, ex = shx - 120 * Math.cos(a), ey = sy - 10 - 120 * Math.max(0, up); line([[shx, sy], [ex, ey]], 30, L.skin); circ(ex, ey, 18); fill(L.skin); });
  circ(sx + 40, sy - 18, 46); fill(L.skin); X.beginPath(); X.arc(sx + 40, sy - 26, 48, PI * 1.02, PI * 1.98); X.closePath(); fill(L.top);
  rr(sx + 52, sy - 34, 40, 18, 8); fill([0.2, 0.25, 0.35]); circ(sx + 75, sy - 25, 7); fill([0.6, 0.85, 0.95]);
  line([[sx - 30, sy + 26], [sx + 120, sy + 26]], 8, [1, 1, 1], 0.7);
  line([[970, 1080], [970, 1300]], 10, [0.8, 0.82, 0.85]); line([[1040, 1080], [1040, 1300]], 10, [0.8, 0.82, 0.85]); [1150, 1220].forEach(y => line([[970, y], [1040, y]], 8, [0.8, 0.82, 0.85]));
  pet(c, 820, 1240, 0.5, t, { flip: -1, tongue: false });
}
const VISITOR = { glasses: true, body: 'f', hair: 'bun', hairCol: '#B9B4AD', skin: '#EDC3A6', facial: 'none', outfit: 'jacket', top: '#8E6C9E', inner: '#F2EDE4', pants: '#4D4D59' };
function hug(c, t) {
  sky(t, 'day', null, 400);
  rect(0, 380, W, 1200, [0.93, 0.89, 0.82]); for (let y = 440; y < 1560; y += 56) line([[0, y], [W, y]], 3, [0.82, 0.77, 0.7]);
  X.beginPath(); X.moveTo(-20, 420); X.lineTo(W / 2, 240); X.lineTo(W + 20, 420); X.closePath(); fill([0.55, 0.36, 0.3]);
  rect(110, 800, 330, 770, [0.98, 0.85, 0.6]); const g = X.createRadialGradient(275, 1100, 20, 275, 1100, 380); g.addColorStop(0, css([1, 0.92, 0.7], 0.9)); g.addColorStop(1, css([1, 0.8, 0.5], 0)); rect(110, 800, 330, 770, g);
  X.beginPath(); X.moveTo(110, 800); X.lineTo(20, 760); X.lineTo(20, 1620); X.lineTo(110, 1570); X.closePath(); fill([0.3, 0.45, 0.55]); circ(45, 1200, 10); fill(GOLD);
  X.lineWidth = 16; X.strokeStyle = css([1, 1, 1]); X.strokeRect(110, 800, 330, 770);
  rect(720, 820, 260, 280, [0.75, 0.86, 0.95]); X.lineWidth = 14; X.strokeRect(720, 820, 260, 280); line([[850, 820], [850, 1100]], 10, [1, 1, 1]);
  rect(0, 1570, W, 350, [0.68, 0.52, 0.4]); for (let y = 1620; y < H; y += 70) line([[0, y], [W, y]], 4, [0.58, 0.43, 0.33]);
  rr(180, 1585, 200, 40, 8); fill([0.55, 0.62, 0.45]);
  rr(900, 1460, 110, 120, 14); fill([0.85, 0.5, 0.35]); [[935, 1440, 40], [975, 1420, 46], [955, 1390, 40]].forEach(([x, y, r]) => { circ(x, y, r); fill([0.4, 0.62, 0.38]); });
  const sw = 4 * Math.sin(t * 1.4);
  const sq = 0.06 * Math.sin(t * 2.4);
  // your arm goes behind Mum's shoulders; her arm goes behind your waist, so you're drawn again over it, right of her body
  const meHug = () => person(610 - sw, 1700, 1.02, ME(c), t, { armL: [1.42 + 0.5 * sq, 0.1], armR: [0.2, 0.15], bob: 3 * Math.sin(t * 2.4 + 1) });
  meHug();
  person(490 + sw, 1700, 0.94, VISITOR, t, { armR: [0.45, 0.9], armL: [0.2, 0.15], bob: 3 * Math.sin(t * 2.4) });
  X.save(); X.beginPath(); X.rect(490 + sw + 80, 1280, W, H); X.clip(); meHug(); X.restore();
  hearts(540, 1040, t);
  pet(c, 820, 1790, 0.8, t, { flip: -1, lookUp: 0.6, walk: 0.3, speed: 12 });
}
function stringLights(y0, sag, t) {
  X.beginPath(); X.moveTo(-20, y0); X.quadraticCurveTo(W / 2, y0 + sag * 2, W + 20, y0); X.lineWidth = 3; X.strokeStyle = css([0.2, 0.2, 0.2]); X.stroke();
  for (let i = 0; i < 11; i++) { const u = (i + 0.5) / 11, x = -20 + u * (W + 40), y = y0 + 4 * sag * u * (1 - u) + 10, a = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.7); const g = X.createRadialGradient(x, y, 2, x, y, 36); g.addColorStop(0, css([1, 0.85, 0.5], 0.6 * a)); g.addColorStop(1, css([1, 0.85, 0.5], 0)); circ(x, y, 36); X.fillStyle = g; X.fill(); circ(x, y, 8); fill([1, 0.88, 0.6], a); }
}
function bbq(c, t) {
  outdoor(c, t, 'sunset');
  const wood = gt([0.62, 0.45, 0.32], 'sunset');
  for (let x = 0; x < W; x += 54) { X.beginPath(); X.moveTo(x + 2, 1340); X.lineTo(x + 2, 1110); X.lineTo(x + 26, 1085); X.lineTo(x + 50, 1110); X.lineTo(x + 50, 1340); X.closePath(); fill(mix(wood, [0, 0, 0], (x / 54) % 2 ? 0.06 : 0)); }
  rect(0, 1150, W, 14, mix(wood, [0, 0, 0], 0.2)); rect(0, 1280, W, 14, mix(wood, [0, 0, 0], 0.2));
  stringLights(900, 70, t);
  const hf = person(150, 1660, 0.92, F2(c), t, { armR: [0.5, 1.5] }); holdDrink(hf.R, t, 'soda', F2(c));
  const h = person(380, 1690, 1, ME(c), t, { armR: [0.95 + 0.1 * Math.sin(t * 4), 1.45] });
  rr(500, 1430, 260, 26, 8); fill([0.25, 0.25, 0.28]); rr(510, 1456, 240, 130, 16); fill([0.2, 0.2, 0.22]);
  line([[530, 1586], [520, 1760]], 12, [0.3, 0.3, 0.32]); line([[730, 1586], [740, 1760]], 12, [0.3, 0.3, 0.32]);
  for (let i = 0; i < 4; i++) { rr(540 + i * 52, 1408 - 4 * Math.abs(Math.sin(t * 3 + i)), 40, 18, 9); fill([0.6, 0.3, 0.2]); }
  steam(560, 1420, t, 3, 60);
  line([[h.R[0], h.R[1]], [h.R[0] + 90, h.R[1] + 30]], 6, [0.6, 0.6, 0.62]);
  if (hasPartner(c)) person(870, 1680, 0.94, PT(c), t, { flip: -1, armR: [0.5, 1.5] }); else person(870, 1670, 0.96, FRIEND1, t, { flip: -1, armR: [0.5, 1.5] });
  kidsOf(c).slice(0, 2).forEach((k, i) => drawKid(k, 980 - i * 70, 1730, t + i, { flip: -1, walk: 0.3 }));
  pet(c, 640, 1840, 0.75, t, { lookUp: 0.9 });
}
const firstBaby = cfg => babiesOf(cfg)[0] || { age: 'baby', hairCol: '#6B4A33', skin: ME(cfg).skin, top: '#F7D9C4' };
const typing = t => ({ armL: [0.45, 1.45 + 0.1 * Math.sin(t * 14)], armR: [0.45, 1.45 + 0.1 * Math.sin(t * 14 + 1)] });

// ---- activity scenes: the most common things Australians do (AusPlay top 20)
function hoopScene(c, t) {
  outdoor(c, t, 'day');
  // an outdoor court: blue surface, white key, a pole and backboard on the right
  rect(0, 1300, W, H - 1300, [0.32, 0.47, 0.62]); rect(0, 1300, W, 12, [1, 1, 1], 0.85);
  X.beginPath(); X.ellipse(860, 1520, 330, 120, 0, PI * 0.5, PI * 1.5); X.lineWidth = 8; X.strokeStyle = css([1, 1, 1], 0.8); X.stroke();
  rect(860, 1400, 220, 240, [0.85, 0.42, 0.33], 0.55);
  line([[970, 1660], [970, 720]], 20, [0.35, 0.37, 0.42]);
  rr(770, 640, 250, 170, 10); fill([1, 1, 1]); X.lineWidth = 7; X.strokeStyle = css([0.85, 0.42, 0.33]); X.strokeRect(850, 690, 90, 66);
  const rimX = 800, rimY = 800;
  const T = 2.8, q = (t % T) / T, ballC = [0.93, 0.52, 0.25];
  let arms, ball;
  if (q < 0.45) {
    const b = Math.abs(Math.sin(t * 6));
    arms = { armL: [0.25, 0.3], armR: [0.5, 0.9 + 0.4 * b] };
  } else if (q < 0.62) { const k = (q - 0.45) / 0.17; arms = { armL: [0.3 + 2.5 * k, 0.3 + 2.6 * k], armR: [0.5 + 2.3 * k, 0.9 + 2.0 * k] }; }
  else arms = { armL: [2.8, 2.9], armR: [2.8, 2.9] };
  const h = person(330, 1700, 1, ME(c), t, Object.assign({ bob: q > 0.55 && q < 0.7 ? 18 : 0 }, arms));
  if (q < 0.45) { const b = Math.abs(Math.sin(t * 6)); ball = [h.R[0] + 14, h.R[1] + 30 + b * (1660 - h.R[1] - 30)]; }
  else if (q < 0.62) ball = [(h.L[0] + h.R[0]) / 2, (h.L[1] + h.R[1]) / 2 - 30];
  else { const k = clamp((q - 0.62) / 0.28), sx = (h.L[0] + h.R[0]) / 2, sy = (h.L[1] + h.R[1]) / 2 - 30; ball = k < 1 ? [sx + (rimX - sx) * k, sy + (rimY - 20 - sy) * k - 260 * Math.sin(k * PI)] : [rimX, rimY + 80 * clamp((q - 0.9) / 0.1) + 20]; }
  // rim in front of the ball's drop, net below
  circ(ball[0], ball[1], 30); fill(ballC); X.lineWidth = 3; X.strokeStyle = css([0.4, 0.18, 0.08], 0.7); X.beginPath(); X.moveTo(ball[0] - 30, ball[1]); X.lineTo(ball[0] + 30, ball[1]); X.moveTo(ball[0], ball[1] - 30); X.lineTo(ball[0], ball[1] + 30); X.stroke();
  X.lineWidth = 3; X.strokeStyle = css([1, 1, 1], 0.9); X.beginPath(); for (let i = 0; i <= 6; i++) { const nx = rimX - 54 + i * 18; X.moveTo(nx, rimY + 6); X.lineTo(rimX - 34 + i * 11.3, rimY + 95); } X.stroke();
  ell(rimX, rimY, 58, 12); X.lineWidth = 8; X.strokeStyle = css([0.9, 0.38, 0.2]); X.stroke();
  line([[rimX + 58, rimY], [970, rimY]], 10, [0.35, 0.37, 0.42]);
  pet(c, 130, 1840, 0.6, t, { lookUp: 0.5 });
}
function danceStudio(c, t) {
  // a studio: mirror wall, a barre, timber floor
  room(c, t, { wall: [0.74, 0.66, 0.70], floor: [0.76, 0.6, 0.44] });
  rect(80, 520, W - 160, 900, [0.82, 0.88, 0.92]); rect(80, 520, W - 160, 900, [1, 1, 1], 0.15);
  X.lineWidth = 10; X.strokeStyle = css([0.55, 0.5, 0.52]); X.strokeRect(80, 520, W - 160, 900);
  [[250, 560, 140, 820], [640, 560, 90, 820]].forEach(([x, y, w, hh]) => { X.save(); X.globalAlpha = 0.18; X.beginPath(); X.moveTo(x, y + hh); X.lineTo(x + w, y); X.lineTo(x + w + 60, y); X.lineTo(x + 60, y + hh); X.closePath(); X.fillStyle = '#fff'; X.fill(); X.restore(); });
  line([[60, 1230], [W - 60, 1230]], 14, [0.62, 0.45, 0.3]); [[150], [930]].forEach(([bx]) => line([[bx, 1230], [bx, 1300]], 10, [0.55, 0.55, 0.58]));
  const sw = Math.sin(t * 2.2), rise = 10 + 10 * Math.max(0, Math.sin(t * 2.2 + 1));
  const pose = { armL: [2.75 + 0.15 * sw, 3.05 + 0.1 * sw], armR: [1.55 - 0.25 * sw, 1.45 - 0.35 * sw], bob: rise };
  // reflection first, soft, then the dancer
  X.save(); X.beginPath(); X.rect(80, 520, W - 160, 900); X.clip(); X.globalAlpha = 0.25; person(470, 1400, 0.82, ME(c), t, Object.assign({ flip: -1 }, pose)); X.restore();
  person(470, 1720, 1.05, ME(c), t, pose);
  for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; X.save(); X.globalAlpha = Math.sin(k * PI) * 0.8; X.fillStyle = css(NAVY); X.font = '700 64px sans-serif'; X.fillText(i % 2 ? '♪' : '♫', 760 + 60 * Math.sin(k * 6 + i), 1150 - 360 * k); X.restore(); }
}
function boxingScene(c, t) {
  room(c, t, { wall: [0.36, 0.38, 0.44], floor: [0.3, 0.3, 0.34] });
  rect(0, 1460, W, 24, [0.93, 0.52, 0.43]);
  const T = 0.9, q = (t % T) / T, hit = Math.max(0, Math.sin(q * PI * 2)), right = Math.floor(t / T) % 2;
  const sway = 0.06 * Math.sin(t * 7) + 0.05 * hit;
  line([[760, 0], [760, 760]], 6, [0.6, 0.6, 0.62]);
  X.save(); X.translate(760, 760); X.rotate(-sway); rr(-90, 0, 180, 560, 60); fill([0.72, 0.2, 0.18]); rect(-90, 120, 180, 22, [0, 0, 0], 0.2); rect(-90, 420, 180, 22, [0, 0, 0], 0.2); X.restore();
  const guard = [0.45, 2.6], jab = [1.45 + 0.12 * hit, 1.5];
  const ext = (on) => on ? [guard[0] + (jab[0] - guard[0]) * hit, guard[1] + (jab[1] - guard[1]) * hit] : guard;
  const h = person(360, 1700, 1.05, ME(c), t, { armR: ext(right === 1), armL: [-0.55 + (right ? 0 : -0.1 * hit), 2.6], bob: 6 * Math.abs(Math.sin(t * 7)) });
  [h.L, h.R].forEach(([gx, gy]) => { circ(gx, gy, 34); fill([0.85, 0.15, 0.15]); circ(gx - 8, gy - 10, 10); fill([1, 1, 1], 0.25); });
  if (right === 1 && hit > 0.8) for (let i = 0; i < 3; i++) line([[650, 1060 + i * 40], [610 - i * 6, 1040 + i * 50]], 5, [1, 1, 1], 0.7);
}
function waterBase(t, tod) {
  sky(t, tod, null, 980);
  for (let i = 0; i < 6; i++) { circ(i * 220 + 60, 990, 140); fill(gt([0.4, 0.55, 0.42], tod)); }
  rect(0, 980, W, H - 980, gt([0.38, 0.6, 0.72], tod));
  for (let i = 0; i < 9; i++) { const y = 1080 + i * 95, off = (t * 40 + i * 70) % 160; for (let x = -160 + off; x < W; x += 260) line([[x, y], [x + 90, y]], 5, [1, 1, 1], 0.35); }
}
function fishingScene(c, t) {
  waterBase(t, 'sunrise');
  rect(0, 1440, 640, 46, [0.6, 0.45, 0.3]); for (let i = 0; i < 8; i++) line([[i * 80, 1440], [i * 80, 1486]], 3, [0.45, 0.33, 0.22]);
  [120, 520].forEach(px => rect(px, 1486, 28, 330, [0.5, 0.37, 0.25]));
  const h = person(380, 1440, 0.9, ME(c), t, { armR: [1.1, 1.6], armL: [0.6, 1.2] });
  const tipX = h.R[0] + 420, tipY = h.R[1] - 360 + 8 * Math.sin(t * 2);
  line([[h.R[0] - 30, h.R[1] + 40], [tipX, tipY]], 7, [0.3, 0.25, 0.2]);
  const bob = 8 * Math.sin(t * 3), bxp = tipX + 120, byp = 1400 + bob;
  X.beginPath(); X.moveTo(tipX, tipY); X.quadraticCurveTo(tipX + 60, (tipY + byp) / 2 + 60, bxp, byp); X.lineWidth = 2; X.strokeStyle = css([1, 1, 1], 0.8); X.stroke();
  circ(bxp, byp, 12); fill(CORAL); ell(bxp, byp + 10, 30, 6); fill([1, 1, 1], 0.4);
  const jp = (t % 4) / 4; if (jp > 0.6 && jp < 0.85) { const f = (jp - 0.6) / 0.25; X.save(); X.translate(780 + 120 * f, 1500 - 160 * Math.sin(f * PI)); X.rotate(-0.9 + 1.8 * f); ell(0, 0, 40, 16); fill([0.75, 0.82, 0.86]); X.beginPath(); X.moveTo(-36, 0); X.lineTo(-60, -16); X.lineTo(-60, 16); X.closePath(); fill([0.75, 0.82, 0.86]); X.restore(); }
  pet(c, 120, 1440, 0.55, t, { lookUp: 0.3 });
}
// ---- reaching: both hands to one point, so a club, bat or paddle is really held
function reachArm(side, lx, ly, low) {
  const A = 112, B = 104, sx = side * 72, sy = -426;
  let dx = side * (lx - sx), dy = ly - sy, D = Math.hypot(dx, dy);
  if (D > A + B - 2) { const k = (A + B - 2) / D; dx *= k; dy *= k; D = A + B - 2; }
  D = Math.max(D, 24);
  const th = Math.atan2(dx, dy), al = Math.acos(clamp((A * A + D * D - B * B) / (2 * A * D), -1, 1)), u = low ? th - al : th + al;
  return [u, Math.atan2(dx - A * Math.sin(u), dy - A * Math.cos(u))];
}
function armsTo(x, y, s, L, tx, ty, low) {
  const ss = s * ({ short: 0.92, tall: 1.08 }[L.height] || 1), bw = ({ slim: 0.86, big: 1.26 }[L.build] || 1), D = L.chair ? 92 : 0;
  const lx = (tx - x) / ss / bw, ly = (ty - y) / ss - D;
  return { armL: reachArm(-1, lx, ly, low), armR: reachArm(1, lx, ly, low), ss, bw };
}
// a two-handed swing: wind up to the right, through the ball, finish high on the left
function swingPose(q) {
  if (q < 0.35) return { g: 0, wob: 0.04 * Math.sin(q * 40) };
  if (q < 0.62) return { g: ease((q - 0.35) / 0.27) };
  if (q < 0.7) return { g: 1 - 2 * ((q - 0.62) / 0.08) };
  return { g: -1 };
}
function swingScene(c, t, q, x, y, s, addr, top, fin, phi, drawTool) {
  const L = ME(c), sp = swingPose(q), g = sp.g, lerp = (a, b, k) => a + (b - a) * k;
  const k = Math.abs(g), to = g >= 0 ? top : fin, lift = Math.sin(k * PI) * 20;
  const gx = x + lerp(addr[0], to[0], k) * s, gy = y + (lerp(addr[1], to[1], k) - lift) * s;
  const ang = (sp.wob || 0) + lerp(phi[0], g >= 0 ? phi[1] : phi[2], k);
  const a = armsTo(x, y, s, L, gx, gy);
  person(x, y, s, L, t, { armL: a.armL, armR: a.armR });
  drawTool(gx, gy, ang);
  circ(gx, gy - 6, 21 * s); fill(C(L.skin)); circ(gx, gy + 14, 21 * s); fill(darken(C(L.skin), 0.06));
  return { gx, gy, ang, g };
}
function golfScene(c, t) {
  sky(t, 'day', null, 1000);
  for (let i = 0; i < 7; i++) { circ(i * 180 + 40, 1010, 110); fill(gt([0.36, 0.58, 0.36], 'day')); }
  rect(0, 1000, W, H - 1000, gt([0.47, 0.72, 0.4], 'day'));
  for (let s2 = 0; s2 < 6; s2++) if (s2 % 2) rect(0, 1000 + s2 * 150, W, 150, gt([0.5, 0.76, 0.43], 'day'));
  ell(860, 1260, 190, 50); fill(gt([0.55, 0.82, 0.48], 'day')); ell(860, 1262, 14, 5); fill([0.1, 0.12, 0.1]);
  line([[862, 1262], [862, 1080]], 5, [0.95, 0.95, 0.95]); X.beginPath(); X.moveTo(864, 1080); X.lineTo(940, 1102 + 6 * Math.sin(t * 4)); X.lineTo(864, 1124); X.closePath(); fill(CORAL);
  // one swing per scene: the ball flies onto the green, rolls in and stays in the hole
  const T = 3.2, q = Math.min(t / T, 0.999), tHit = 0.68 * T;
  const r = swingScene(c, t, q, 380, 1700, 1.05, [-10, -210], [70, -290], [-80, -290], [0.6, 1.5, -0.9], (gx, gy, a) => {
    const hx = gx + 262 * Math.sin(a), hy = gy + 262 * Math.cos(a);
    line([[gx, gy], [hx, hy]], 8, [0.25, 0.25, 0.28]); ell(hx + 10 * Math.cos(a), hy - 4, 24, 12); fill([0.45, 0.45, 0.5]);
  });
  const tf = t - tHit, FL = 1.1, RL = 0.7;
  if (tf < 0) { circ(530, 1694, 12); fill([1, 1, 1]); }
  else if (tf < FL) { const f = tf / FL; circ(530 + (815 - 530) * f, 1694 - (1694 - 1250) * f - 650 * Math.sin(f * PI), 12 - 5 * f); fill([1, 1, 1]); }
  else if (tf < FL + RL) { const f = ease((tf - FL) / RL); circ(815 + 45 * f, 1250 + 10 * f, 7 - 2 * f); fill([1, 1, 1]); }
  else if (tf < FL + RL + 0.6) { const f = (tf - FL - RL) / 0.6; ell(862, 1262, 14 + 40 * f, 5 + 12 * f); X.lineWidth = 3; X.strokeStyle = css([1, 1, 1], 0.8 * (1 - f)); X.stroke(); }
  pet(c, 140, 1850, 0.6, t, { lookUp: 0.4 });
}
function cricketScene(c, t) {
  outdoor(c, t, 'day');
  X.save(); X.beginPath(); X.moveTo(380, 1180); X.lineTo(560, 1180); X.lineTo(760, H); X.lineTo(80, H); X.closePath(); X.fillStyle = css(gt([0.83, 0.74, 0.55], 'day')); X.fill(); X.restore();
  line([[180, 1700], [700, 1700]], 6, [1, 1, 1], 0.9);
  [210, 240, 270].forEach(sx => line([[sx, 1700], [sx, 1460]], 9, [0.92, 0.85, 0.7])); line([[205, 1460], [275, 1460]], 6, [0.8, 0.6, 0.35]);
  const q = (t % 3) / 3;
  swingScene(c, t, q, 430, 1720, 1.05, [0, -225], [60, -320], [-70, -310], [0.6, 1.9, -0.95], (gx, gy, a) => {
    X.save(); X.translate(gx, gy); X.rotate(-a); line([[0, -20], [0, 80]], 11, [0.2, 0.2, 0.22]); rr(-21, 76, 42, 175, 10); fill([0.92, 0.82, 0.62]); X.restore();
  });
  let bx, by;
  if (q < 0.66) { const f = q / 0.66; bx = 1100 - 540 * f; by = f < 0.55 ? 1100 + 520 * (f / 0.55) : 1620 - 100 * ((f - 0.55) / 0.45); }
  else { const f = clamp((q - 0.66) / 0.3); bx = 560 + 620 * f; by = 1460 - 900 * f + 500 * f * f; }
  circ(bx, by, 14); fill([0.75, 0.15, 0.15]);
  pet(c, 880, 1860, 0.6, t, { flip: -1, lookUp: 0.4 });
}
function paddleScene(c, t, p) {
  waterBase(t, 'sunrise');
  const x = 300 + 260 * p, y = 1560 + 6 * Math.sin(t * 2), st = Math.sin(t * 3.2), L = ME(c);
  // the shaft runs through both hands, dipping one blade then the other
  const cxg = x, cyg = y - 120, a = 0.4 * st, hx = Math.cos(a), hy = Math.sin(a);
  const pL = [cxg - 95 * hx, cyg - 95 * hy], pR = [cxg + 95 * hx, cyg + 95 * hy];
  X.save(); X.beginPath(); X.rect(0, 0, W, y - 30); X.clip();
  const aL = armsTo(x, y + 235, 0.95, L, pL[0], pL[1]), aR = armsTo(x, y + 235, 0.95, L, pR[0], pR[1]);
  person(x, y + 235, 0.95, L, t, { armL: aL.armL, armR: aR.armR });
  rr(x - 70, y - 175, 140, 150, 26); fill([0.97, 0.75, 0.25]); line([[x, y - 170], [x, y - 40]], 4, [0.85, 0.6, 0.15]);
  X.restore();
  line([[cxg - 330 * hx, cyg - 330 * hy], [cxg + 330 * hx, cyg + 330 * hy]], 9, [0.25, 0.25, 0.28]);
  [-1, 1].forEach(sd => { X.save(); X.translate(cxg + sd * 350 * hx, cyg + sd * 350 * hy); X.rotate(a); ell(0, 0, 36, 16); fill([0.95, 0.75, 0.3]); X.restore(); });
  [pL, pR].forEach(([px, py]) => { circ(px, py, 19); fill(C(L.skin)); });
  ell(x, y, 330, 46); fill([0.93, 0.52, 0.43]); ell(x, y - 18, 110, 26); fill([0.2, 0.2, 0.24]); line([[x - 320, y + 6], [x + 320, y + 6]], 4, [1, 1, 1], 0.6);
  for (let i = 0; i < 4; i++) line([[x - 380 - i * 60, y + 30 + i * 8], [x - 330 - i * 60, y + 30 + i * 8]], 5, [1, 1, 1], 0.5);
}
// ---- a body for poses the front-facing figure can't do (yoga), built from the same parts:
// the very same head (face, hair, hats, glasses) is borrowed from the main character, so it stays on brand
function brandHead(cx, cy, s, L, t, rot) {
  const LL = Object.assign({}, L, { height: 'avg', build: 'avg', chair: false });
  X.save(); X.translate(cx, cy); X.rotate(rot);
  X.beginPath(); X.rect(-150 * s, -135 * s, 300 * s, 185 * s); X.clip();
  person(0, 502 * s, s, LL, t, { armL: [0, 0], armR: [0, 0] });
  X.restore();
}
function posed(x, y, s, L, J, t) {
  const P = k => [x + J[k][0] * s, y + J[k][1] * s];
  const top = C(L.top), skin = C(L.skin), dress = L.outfit === 'dress', legC = dress ? skin : C(L.pants || '#30406E');
  const shoe = [0.13, 0.11, 0.10], longSleeve = !dress && L.outfit !== 'tee';
  const hipAt = sd => { const [hx0, hy0] = P('hip'); return [hx0 + sd * (J.hipW || 0) * s, hy0]; };
  const leg = (kn, ft, col, sd) => { line([hipAt(sd), P(kn), P(ft)], (dress ? 26 : 48) * s, col); const [fx, fy] = P(ft); ell(fx + 10 * s, fy - 8 * s, 34 * s, 16 * s); fill(dress ? [0.55, 0.3, 0.25] : shoe); };
  const arm = (el2, hd, dark) => { const up = dress ? skin : top, fore = longSleeve ? top : skin; line([P('shoulder'), P(el2)], 38 * s, dark ? darken(up, 0.1) : up); line([P(el2), P(hd)], 34 * s, dark ? darken(fore, 0.1) : fore); circ(...P(hd), 20 * s); fill(dark ? darken(skin, 0.08) : skin); };
  leg('kneeB', 'footB', darken(legC, 0.1), -1);
  leg('kneeF', 'footF', legC, 1);
  arm('elbowB', 'handB', true);
  // torso: the same flat block as the standing figure, just turned to follow the pose
  const [hx, hy] = P('hip'), [sx, sy] = P('shoulder'), ang = Math.atan2(sx - hx, -(sy - hy)), len = Math.hypot(sx - hx, sy - hy);
  X.save(); X.translate(hx, hy); X.rotate(ang); X.beginPath(); X.moveTo(-50 * s, 10 * s); X.lineTo(50 * s, 10 * s); X.bezierCurveTo(58 * s, -len * 0.4, 62 * s, -len * 0.8, 56 * s, -len - 10 * s); X.lineTo(-56 * s, -len - 10 * s); X.bezierCurveTo(-62 * s, -len * 0.8, -58 * s, -len * 0.4, -50 * s, 10 * s); X.closePath(); fill(top);
  if (dress) { X.beginPath(); X.moveTo(-56 * s, -len * 0.35); X.lineTo(56 * s, -len * 0.35); X.lineTo(80 * s, 60 * s); X.lineTo(-80 * s, 60 * s); X.closePath(); fill(top); }
  X.restore();
  // head sits on the neck, tipped with the spine, but never so far the face disappears
  const [qx, qy] = P('head'), hr = clamp(Math.atan2(qx - sx, -(qy - sy)), -1.3, 1.3);
  line([[sx, sy], [qx, qy]], 34 * s, darken(skin, 0.15));
  if (J.armsUp) arm('elbowF', 'handF', false);
  brandHead(qx, qy, s, L, t, hr);
  if (!J.armsUp) arm('elbowF', 'handF', false);
}
const YOGA = {
  dog: { footB: [-190, 0], footF: [-170, 0], kneeB: [-130, -120], kneeF: [-112, -116], hip: [-60, -250], shoulder: [120, -95], head: [170, -45], elbowB: [190, -48], elbowF: [204, -44], handB: [258, 0], handF: [270, 0] },
  warrior: { footB: [-210, 0], footF: [190, 0], kneeB: [-105, -118], kneeF: [178, -128], hip: [0, -228], hipW: 30, shoulder: [0, -430], head: [0, -505], elbowB: [-108, -426], elbowF: [108, -426], handB: [-212, -426], handF: [212, -426] },
  tree: { footB: [0, 0], footF: [22, -150], kneeB: [0, -124], kneeF: [100, -180], hip: [0, -250], hipW: 18, shoulder: [0, -452], head: [0, -527], elbowB: [-70, -565], elbowF: [74, -565], handB: [-4, -668], handF: [6, -668], armsUp: true }
};
function yogaPose(t) {
  const order = ['dog', 'warrior', 'tree'], seg = 2.4, i = Math.floor(t / seg) % 3, f = (t % seg) / seg;
  const A = YOGA[order[i]], B = YOGA[order[(i + 1) % 3]], k = ease(clamp((f - 0.72) / 0.28)), J = {};
  Object.keys(A).forEach(key => { J[key] = Array.isArray(A[key]) ? [A[key][0] + (B[key][0] - A[key][0]) * k, A[key][1] + (B[key][1] - A[key][1]) * k] : (k < 0.5 ? A[key] : B[key]); });
  return J;
}
function matScene(c, t) {
  HATS_OFF = true;
  // a light-filled studio: big arched window, hanging plants, timber floor
  rect(0, 0, W, 1420, lin(0, 0, 0, 1420, [[0, [0.97, 0.92, 0.86]], [1, [0.93, 0.86, 0.78]]]));
  X.save(); X.beginPath(); X.moveTo(260, 1150); X.lineTo(260, 520); X.arc(540, 520, 280, PI, 2 * PI); X.lineTo(820, 1150); X.closePath(); X.clip();
  rect(260, 240, 560, 910, lin(0, 240, 0, 1150, [[0, [0.98, 0.84, 0.66]], [1, [0.86, 0.9, 0.8]]]));
  for (let i = 0; i < 6; i++) { circ(300 + i * 110, 1080 - (i % 2) * 40, 110); fill([0.5, 0.7, 0.48], 0.75); }
  X.restore();
  X.lineWidth = 16; X.strokeStyle = css([0.98, 0.97, 0.95]); X.beginPath(); X.moveTo(260, 1150); X.lineTo(260, 520); X.arc(540, 520, 280, PI, 2 * PI); X.lineTo(820, 1150); X.closePath(); X.stroke();
  line([[540, 240], [540, 1150]], 10, [0.98, 0.97, 0.95]); line([[260, 760], [820, 760]], 10, [0.98, 0.97, 0.95]);
  [[130, 300], [950, 360]].forEach(([px, py], i) => { line([[px, 0], [px, py]], 3, [0.5, 0.45, 0.4]); rr(px - 40, py, 80, 60, 14); fill([0.88, 0.65, 0.5]); for (let j = 0; j < 5; j++) { X.save(); X.translate(px - 30 + j * 15, py + 50); X.rotate(-0.3 + j * 0.15 + 0.05 * Math.sin(t + i + j)); ell(0, 60, 9, 60); fill([0.36, 0.62, 0.4]); X.restore(); } });
  rect(0, 1420, W, H - 1420, [0.78, 0.62, 0.46]); for (let i = 1; i < 6; i++) line([[0, 1420 + i * 90], [W, 1420 + i * 90]], 3, [0.6, 0.45, 0.32], 0.5);
  plant(110, 1460);
  X.save(); X.translate(560, 1735); X.scale(1, 0.3); rr(-330, -100, 660, 200, 30); fill([0.42, 0.66, 0.62]); X.restore();
  pet(c, 170, 1830, 0.6, t, { tongue: false });
  if (ME(c).chair) seated(580, 1745, 1.05, ME(c), t, Math.sin(t * 1.2)); else posed(580, 1735, 1.05, ME(c), yogaPose(t), t);
}
// ---- hiking: a bush track winding up towards the ranges, a real pack on
function hikeScene(c, t, p) {
  sky(t, 'day', null, 1100);
  const far = gt([0.6, 0.66, 0.78], 'day'), mid = gt([0.45, 0.55, 0.6], 'day'), bush = gt([0.4, 0.55, 0.38], 'day');
  const ridge = (pts, col, base) => { X.beginPath(); X.moveTo(0, base); pts.forEach(q => X.lineTo(q[0], q[1])); X.lineTo(W, base); X.lineTo(W, H); X.lineTo(0, H); X.closePath(); fill(col); };
  ridge([[0, 860], [200, 640], [380, 820], [560, 560], [760, 800], [920, 660], [W, 780]], far, 900);
  ridge([[0, 1000], [180, 880], [400, 980], [620, 860], [840, 990], [W, 900]], mid, 1040);
  ridge([[0, 1150], [300, 1090], [700, 1140], [W, 1080]], bush, 1180);
  X.beginPath(); X.moveTo(470, 1160); X.bezierCurveTo(560, 1300, 360, 1420, 520, 1560); X.bezierCurveTo(640, 1680, 520, 1800, 600, H); X.lineTo(220, H); X.bezierCurveTo(240, 1780, 330, 1640, 300, 1540); X.bezierCurveTo(260, 1400, 470, 1300, 440, 1160); X.closePath(); fill(gt([0.78, 0.64, 0.46], 'day'));
  const gum = (gx, gy, s2) => { line([[gx, gy], [gx - 8 * s2, gy - 260 * s2]], 18 * s2, [0.88, 0.85, 0.8]); line([[gx - 6 * s2, gy - 150 * s2], [gx + 50 * s2, gy - 230 * s2]], 10 * s2, [0.88, 0.85, 0.8]); [[-40, -300, 70], [30, -330, 60], [60, -260, 55], [-70, -250, 50]].forEach(([dx, dy, r]) => { circ(gx + dx * s2, gy + dy * s2, r * s2); fill(gt([0.42, 0.56, 0.42], 'day')); }); };
  gum(90, 1500, 1.1); gum(960, 1450, 1); gum(820, 1250, 0.6);
  [[150, 1720, 46], [880, 1760, 60], [760, 1660, 30]].forEach(([rx, ry, r]) => { ell(rx, ry, r * 1.4, r); fill([0.6, 0.58, 0.55]); ell(rx - r * 0.3, ry - r * 0.4, r * 0.6, r * 0.3); fill([1, 1, 1], 0.2); });
  const [x, m] = walkX(p, 300, 470, 0, 0.9), L = ME(c), s = 1, packC = [0.85, 0.42, 0.3];
  const ss = s * ({ short: 0.92, tall: 1.08 }[L.height] || 1), bw = ({ slim: 0.86, big: 1.26 }[L.build] || 1), y = 1700;
  const W2 = (lx, ly) => [x + lx * ss * bw, y + ly * ss];
  const [px0, py0] = W2(-102, -500); rr(px0, py0, 204 * ss * bw, 280 * ss, 40 * ss); fill(packC); const [tx0, ty0] = W2(-80, -520); rr(tx0, ty0, 160 * ss * bw, 50 * ss, 20 * ss); fill(darken(packC, 0.2));
  if (ptJoins(c)) person(x - 265, y - 40, 0.9, PT(c), t, { walk: m ? 1 : 0, speed: 9.5 });
  const h = person(x, y, s, L, t, { walk: m ? 1 : 0, armR: [0.3 + 0.15 * Math.sin(t * 7), 0.25] });
  [-1, 1].forEach(sd => line([W2(sd * 52, -440), W2(sd * 42, -300)], 12 * ss, darken(packC, 0.25)));
  line([W2(-46, -360), W2(46, -360)], 7 * ss, darken(packC, 0.35));
  line([[h.R[0], h.R[1] - 30], [h.R[0] + 40, 1705]], 6, [0.3, 0.3, 0.33]);
  pet(c, x + 300, 1780, 0.75, t, { walk: m ? 1 : 0 });
}
// ---- the back garden at home: weatherboards, a paling fence, raised veggie beds
function gardenScene(c, t, p) {
  sky(t, 'day', null, 1100);
  for (let i = 0; i < 6; i++) { circ(80 + i * 200, 1000, 120); fill(gt([0.38, 0.58, 0.38], 'day')); }
  rect(0, 980, W, 300, [0.62, 0.48, 0.34]); for (let i = 0; i < W; i += 34) { rect(i, 975, 30, 305, [0.66, 0.52, 0.37]); X.beginPath(); X.moveTo(i, 975); X.lineTo(i + 15, 960); X.lineTo(i + 30, 975); X.closePath(); fill([0.66, 0.52, 0.37]); }
  rect(0, 1280, W, H - 1280, gt([0.5, 0.72, 0.42], 'day'));
  // the house on the right
  rect(700, 560, 380, 900, [0.93, 0.92, 0.87]); for (let yy = 590; yy < 1460; yy += 40) line([[700, yy], [W, yy]], 3, [0.8, 0.79, 0.74]);
  X.beginPath(); X.moveTo(660, 580); X.lineTo(W, 450); X.lineTo(W, 580); X.closePath(); fill([0.45, 0.47, 0.52]); rect(660, 570, 420, 24, [0.4, 0.42, 0.47]);
  rect(760, 700, 220, 230, [0.98, 0.98, 0.96]); rect(776, 716, 188, 198, lin(0, 716, 0, 914, [[0, [0.7, 0.84, 0.92]], [1, [0.85, 0.92, 0.95]]])); line([[870, 716], [870, 914]], 8, [0.98, 0.98, 0.96]);
  rect(980, 1050, 100, 410, [0.36, 0.5, 0.45]); rect(940, 1440, 140, 30, [0.7, 0.7, 0.7]);
  // two raised beds, plants growing through the scene
  const g = 0.55 + 0.45 * p;
  [[150, 1560, 330], [520, 1640, 300]].forEach(([bx, by, bwid], bi) => {
    rr(bx, by, bwid, 130, 8); fill([0.58, 0.4, 0.26]); rect(bx, by, bwid, 26, [0.45, 0.3, 0.19]); rect(bx + 8, by + 26, bwid - 16, 30, [0.36, 0.25, 0.16]);
    for (let i = 0; i < 4; i++) { const px = bx + 45 + i * (bwid - 90) / 3, kind = (i + bi) % 3, hh = (90 + 30 * kind) * g;
      line([[px, by + 26], [px, by + 26 - hh]], 7, [0.3, 0.55, 0.3]);
      [[-1, 0.4], [1, 0.6], [-1, 0.85]].forEach(([sd, f]) => { ell(px + sd * 24, by + 26 - hh * f, 24 * g, 11 * g); fill([0.36, 0.64, 0.34]); });
      if (kind === 1) { circ(px, by + 26 - hh, 16 * g); fill([0.88, 0.25, 0.22]); } else if (kind === 2) { circ(px, by + 26 - hh, 18 * g); fill([0.98, 0.8, 0.3]); } }
  });
  const tip = 0.35 + 0.12 * Math.sin(t * 2), x = 480, y = 1720;
  const h = person(x, y, 1, ME(c), t, { armR: [0.95 + 0.1 * tip, 1.2], armL: [0.3, 0.4] });
  X.save(); X.translate(h.R[0], h.R[1]); X.rotate(tip); rr(-30, -6, 120, 86, 18); fill([0.35, 0.6, 0.78]); X.beginPath(); X.arc(30, -6, 34, PI, 2 * PI); X.lineWidth = 9; X.strokeStyle = css([0.28, 0.5, 0.66]); X.stroke(); line([[84, 20], [180, -14]], 12, [0.35, 0.6, 0.78]); X.restore();
  circ(h.R[0], h.R[1], 19); fill(C(ME(c).skin));
  const sx = h.R[0] + 180 * Math.cos(tip) + 14 * Math.sin(tip), sy = h.R[1] - 14 + 180 * Math.sin(tip);
  for (let i = 0; i < 7; i++) { const k = (t * 1.6 + i / 7) % 1; circ(sx + 70 * k + (i % 3) * 8, sy + 260 * k * k + 20 * k, 6); fill([0.55, 0.78, 0.95], 0.85); }
  if (ptJoins(c)) person(890, 1730, 0.92, PT(c), t, { flip: -1, armR: [2.4 + 0.3 * Math.sin(t * 4), 2.6] });
  pet(c, ptJoins(c) ? 120 : 880, 1840, 0.6, t, { flip: ptJoins(c) ? 1 : -1, lookUp: 0.3 });
}
// ---- heading out the front door with my gear
function kitbag(c, t, p) {
  HATS_OFF = false;
  sky(t, 'sunrise', 960, 1150);
  rect(0, 1150, W, H - 1150, gt([0.5, 0.7, 0.42], 'sunrise'));
  // the front of the house: weatherboards, the door wide open, porch light on
  rect(0, 520, 560, 1000, [0.9, 0.86, 0.78]); for (let yy = 550; yy < 1520; yy += 40) line([[0, yy], [560, yy]], 3, [0.8, 0.76, 0.68]);
  X.beginPath(); X.moveTo(-40, 540); X.lineTo(600, 540); X.lineTo(520, 440); X.lineTo(0, 440); X.closePath(); fill([0.42, 0.44, 0.5]);
  rect(220, 900, 240, 560, [0.98, 0.86, 0.6]); X.beginPath(); X.moveTo(460, 900); X.lineTo(560, 940); X.lineTo(560, 1500); X.lineTo(460, 1460); X.closePath(); fill([0.3, 0.45, 0.42]);
  circ(500, 840, 16); fill([1, 0.92, 0.6]); circ(500, 840, 34); fill([1, 0.92, 0.6], 0.3);
  rect(180, 1460, 320, 40, [0.7, 0.68, 0.64]); rect(160, 1500, 360, 40, [0.62, 0.6, 0.56]);
  X.beginPath(); X.moveTo(240, 1540); X.lineTo(440, 1540); X.lineTo(760, H); X.lineTo(340, H); X.closePath(); fill([0.82, 0.76, 0.66]);
  [[640, 1300], [900, 1320]].forEach(([bx, by]) => { [[-30, 0, 50], [20, -20, 56], [60, 6, 44]].forEach(([dx, dy, r]) => { circ(bx + dx, by + dy, r); fill(gt([0.34, 0.56, 0.36], 'sunrise')); }); });
  const [x, m] = walkX(p, 340, 640, 0.05, 0.85), L = ME(c), y = 1720, sc = 0.9 + 0.12 * clamp(p * 1.4);
  const ss = sc * ({ short: 0.92, tall: 1.08 }[L.height] || 1), bw = ({ slim: 0.86, big: 1.26 }[L.build] || 1);
  const h = person(x, y, sc, L, t, { walk: m ? 1 : 0, armR: [0.2, 0.1], armL: [0.3, 1.1] });
  // gym bag on a strap from the right shoulder, bottle in the left hand
  const shX = x + 60 * ss * bw, shY = y - 430 * ss, bagX = x - 70 * ss * bw, bagY = y - 230 * ss;
  line([[shX, shY], [bagX + 20, bagY]], 9 * ss, [0.2, 0.22, 0.26]);
  rr(bagX - 110 * ss, bagY - 20 * ss, 190 * ss, 100 * ss, 34 * ss); fill(CORAL); rect(bagX - 110 * ss, bagY + 18 * ss, 190 * ss, 12 * ss, [1, 1, 1], 0.6);
  rr(h.L[0] - 14, h.L[1] - 62, 28, 72, 9); fill([0.35, 0.6, 0.78]); rr(h.L[0] - 10, h.L[1] - 76, 20, 16, 5); fill([0.2, 0.25, 0.3]); circ(h.L[0], h.L[1], 18); fill(C(L.skin));
  pet(c, x + 280, 1790, 0.75, t, { walk: m ? 1 : 0 });
}
const SCENES = {
  title: { label: 'Opening sunrise', fn(c, t, p) { outdoor(c, t, 'sunrise', 1080 - 140 * ease(p)); const q = clamp((p - 0.3) / 0.7), x = -480 + 1500 * q, m = q > 0 && q < 1; if (!(c.me && c.me.unset)) person(x, 1660, 1, ME(c), t, { walk: m ? 1 : 0, armL: [0.12, 0.05], armR: [0.3, 0.2] }); pet(c, x + 250, 1710, 0.9, t, { walk: m ? 1 : 0 }); } },
  end: { label: 'Closing sunset walk', fn(c, t, p) { outdoor(c, t, 'sunset', 960 + 60 * p); const n = 1 + (hasPartner(c) ? 1 : 0) + kidsOf(c).length; const x0 = n > 1 ? 200 : 420; const x = x0 + (1100 + n * 150) * ease(clamp((p - 0.25) / 0.75)), m = p > 0.25; const right = familyRow(c, x, 1690, t, { walk: m ? 1 : 0, s: n > 3 ? 0.85 : 1 }); pet(c, right + 70, 1730, 0.85, t, { walk: m ? 1 : 0 }); } },

  walk: { label: 'Walking with my dog', fn(c, t, p) { outdoor(c, t, 'day'); const x = 80 + 520 * p, dx = x + 270 + 40 * Math.sin(t * 1.5); const h = person(x, 1660, 1, ME(c), t, { walk: 1, armL: [0.12, 0.05], armR: [0.55, 0.35] }); const P0 = petsOf(c)[0]; if (P0 && P0.type === 'dog') { const k = 0.85 * dogSize(P0), dc = dogCollar(P0), cx = dx + dc[0] * k, cy = 1720 + dc[1] * k; X.beginPath(); X.moveTo(h.R[0], h.R[1]); X.quadraticCurveTo((h.R[0] + cx) / 2, Math.max(h.R[1], cy) + 70, cx, cy); X.lineWidth = 5; X.strokeStyle = css([0.85, 0.3, 0.25]); X.stroke(); } pet(c, dx, 1720, 0.85, t, { walk: 1, speed: 12 }); } },
  start: { label: 'Stepping out at sunrise', fn(c, t, p) { outdoor(c, t, 'sunrise', 940); const [x, m] = walkX(p, -120, 420, 0, 0.6); if (ptJoins(c)) person(x - 200, 1650, 0.98, PT(c), t, { walk: m ? 1 : 0, speed: 9.5 }); person(x, 1660, 1.05, ME(c), t, { walk: m ? 1 : 0 }); pet(c, x + 250, 1700, 0.9, t, { walk: m ? 1 : 0 }); } },
  sunrise: { label: 'Standing tall at sunrise', fn(c, t) { outdoor(c, t, 'sunrise', 920); const pj = ptJoins(c); person(pj ? 330 : 400, 1680, 1.1, ME(c), t, { armL: [0.6, 0.6], armR: [0.6, 0.6], bob: 4 * Math.sin(t * 2) }); if (pj) person(620, 1670, 1.02, PT(c), t, { flip: -1, armL: [0.6, 0.6], armR: [0.6, 0.6], bob: 4 * Math.sin(t * 2 + 1) }); pet(c, pj ? 860 : 700, 1740, 0.9, t, { flip: -1, lookUp: 0.6 }); } },
  celebrate: { label: 'Arms up, feeling great', fn(c, t) { outdoor(c, t, 'sunrise', 1000); sunBurst(400, 1250, t); person(400, 1680, 1.05, ME(c), t, { armL: [2.6, 2.7], armR: [2.6, 2.7], bob: Math.abs(Math.sin(t * 3)) * 60 }); pet(c, 520 + 260 * Math.sin(t * 0.9), 1760, 0.85, t, { walk: 1, speed: 14, flip: Math.cos(t * 0.9) > 0 ? 1 : -1 }); } },
  champion: { label: 'Fit and strong at the sports ground', fn(c, t) { sportsGround(t); const f = ease(clamp((t - 0.4) / 0.6)); person(440, 1700, 1.12, ME(c), t, { armL: [1.6 * f + 0.15, 0.1 + 2.9 * f], armR: [1.6 * f + 0.15, 0.1 + 2.9 * f] }); pet(c, 760, 1770, 0.9, t, { flip: -1, lookUp: 0.6 }); } },
  strong: { label: 'Strong pose', fn(c, t) { outdoor(c, t, 'day'); const f = ease(clamp((t - 0.5) / 0.6)); person(420, 1690, 1.12, ME(c), t, { armL: [1.6 * f + 0.15, 0.1 + 2.9 * f], armR: [1.6 * f + 0.15, 0.1 + 2.9 * f] }); pet(c, 720, 1750, 0.9, t, { flip: -1, lookUp: 0.6 }); } },
  jog: { label: 'Running', fn(c, t, p) { outdoor(c, t, 'day'); const x = -150 + 1100 * p; speedLines(x - 150, 1330, t); person(x, 1660, 1, ME(c), t, { walk: 1.3, speed: 12, armL: [-0.5 * Math.sin(t * 12), 1.3], armR: [0.5 * Math.sin(t * 12), 1.3], bob: 8 * Math.abs(Math.sin(t * 12)) }); pet(c, x + 260, 1700, 0.85, t, { walk: 1.3, speed: 15 }); } },
  unwind: { label: 'Sunset stroll to wind down', fn(c, t, p) { outdoor(c, t, 'sunset'); const pj = ptJoins(c), x = (pj ? 60 : 120) + 480 * p; person(x, 1660, 1, ME(c), t, { walk: 1, armL: [0.12, 0.05], armR: [0.12, 0.05] }); if (pj) person(x + 175, 1665, 0.94, PT(c), t, { walk: 1, armL: [0.12, 0.05], armR: [0.12, 0.05] }); pet(c, x + (pj ? 400 : 230) + 30 * Math.sin(t), 1700, 0.85, t, { walk: 1 }); } },
  steady: { label: 'Calm, looking ahead', fn(c, t) { outdoor(c, t, 'sunrise', 900); const pj = ptJoins(c); if (pj) person(740, 1695, 0.98, PT(c), t, { flip: -1 }); person(pj ? 500 : 520, 1700, 1.05, ME(c), t, { flip: -1 }); pet(c, 260, 1740, 0.9, t); } },
  selflove: { label: 'Hand on heart', fn(c, t) { outdoor(c, t, 'sunrise', 930); const k = ease(clamp((t - 0.5) / 0.6)); person(440, 1680, 1.08, ME(c), t, { armR: [0.15 + 0.05 * k, 0.1 - 2.52 * k], bob: 3 * Math.sin(t * 2) }); hearts(440, 1040, t); pet(c, 730, 1740, 0.9, t, { flip: -1, lookUp: 0.7 }); } },
  friends: { label: 'Out with friends', fn(c, t) { outdoor(c, t, 'day'); const wv = 0.4 * Math.sin(t * 6); person(250, 1680, 1, ME(c), t, { armR: [2.5, 2.9 + wv] }); person(640, 1660, 0.95, F2(c), t, { flip: -1, armR: [2.4, 2.9 - wv] }); person(880, 1650, 0.97, FRIEND1, t, { flip: -1 }); pet(c, 430, 1760, 0.8, t); } },
  campfire: { label: 'Evening with my people', fn(c, t) { outdoor(c, t, 'dusk'); campfire(540, 1740, t); person(200, 1700, 0.95, ME(c), t, { armR: [0.6, 1.2] }); person(420, 1640, 0.85, FRIEND1, t); person(680, 1640, 0.85, F2(c), t, { flip: -1 }); if (hasPartner(c)) person(900, 1700, 0.93, PT(c), t, { flip: -1 }); pet(c, 70, 1840, 0.7, t); nightTint(0.15); } },
  couple: { label: 'Walking together', fn(c, t, p) { outdoor(c, t, 'sunset'); const x = 160 + 380 * p; person(x, 1680, 1, ME(c), t, { walk: 1, armL: [0.12, 0.05], armR: [0.5, 0.3] }); if (hasPartner(c)) person(x + 160, 1680, 0.94, PT(c), t, { walk: 1, armL: [0.5, 0.3], armR: [0.12, 0.05] }); pet(c, x + 380, 1720, 0.85, t, { walk: 1 }); hearts(x + 80, 1050, t); } },
  together: { label: 'Side by side at sunset', fn(c, t) { outdoor(c, t, 'sunset'); const n = 1 + (hasPartner(c) ? 1 : 0) + kidsOf(c).length; const s = n > 4 ? 0.85 : 1; const right = familyRow(c, n > 2 ? 170 : 330, 1690, t, { s }); pet(c, Math.min(right + 90, 900), 1745, 0.85 * s, t, { flip: -1 }); } },
  family: { label: 'The whole family together', fn(c, t) { outdoor(c, t, 'sunset', 980); const n = 1 + (hasPartner(c) ? 1 : 0) + kidsOf(c).length; const s = n > 4 ? 0.85 : 1; const right = familyRow(c, n > 2 ? 170 : 330, 1700, t, { s }); hearts(540, 1000, t); pet(c, Math.min(right + 90, 900), 1750, 0.85 * s, t, { flip: -1 }); } },
  pram: { label: 'Pram walk', fn(c, t, p) { outdoor(c, t, 'day'); const x = 40 + 380 * p; const h = person(x, 1680, 1, ME(c), t, { walk: 1, armR: [1.05, 1.35], armL: [0.9, 1.4] }); pram(x + 300, 1700, t, firstBaby(c)); if (hasPartner(c)) person(x - 170, 1660, 0.94, PT(c), t, { walk: 1 }); pet(c, x + 560, 1730, 0.8, t, { walk: 1 }); } },
  holdbaby: { label: 'Holding a baby', fn(c, t) { room(c, t, { wall: [0.95, 0.9, 0.86], window: 'sunrise' }); const h = person(400, 1660, 1, ME(c), t, { armL: [0.25, -1.5], armR: [0.25, -1.5] }); cradle(c, h, 1, firstBaby(c), t, ME(c)); hearts(400, 1000, t); pet(c, 760, 1760, 0.8, t, { flip: -1, lookUp: 0.6 }); } },
  schoolrun: { label: 'School run', fn(c, t, p) { outdoor(c, t, 'sunrise', 900); const x = 80 + 440 * p; person(x, 1670, 1, ME(c), t, { walk: 1, armR: [0.55, 0.15] }); drawKid(firstKid(c), x + 190, 1676, t + 0.4, { walk: 1, speed: 9, armL: [0.9, 0.1], backpack: '#E07B66' }); pet(c, x - 190, 1720, 0.8, t, { walk: 1 }); } },
  parkday: { label: 'Playing with the kids', fn(c, t) { outdoor(c, t, 'day'); const kids = kidsOf(c).length ? kidsOf(c) : [DEFAULT_KID]; const k0 = 640 + 120 * Math.sin(t * 1.3); kids.slice(0, 3).forEach((k, i) => drawKid(k, k0 + i * 130, 1700 + i * 10, t + i, { walk: 1.2, speed: 10, armL: [1.5, 1.2], armR: [1.2 + 0.4 * Math.sin(t * 6 + i), 1.4], flip: Math.cos(t * 1.3) > 0 ? 1 : -1 })); person(250, 1680, 1, ME(c), t, { armL: [1.3, 1.1], armR: [1.3, 1.1], bob: 6 * Math.abs(Math.sin(t * 3)) }); const q = (t * 0.7) % 1, bx = 330 + (k0 - 330) * (Math.floor(t * 0.7) % 2 ? 1 - q : q), by = 1330 - 300 * Math.sin(q * PI); circ(bx, by, 34); fill(CORAL); X.beginPath(); X.arc(bx, by, 34, -0.5, 1.2); X.lineWidth = 6; X.strokeStyle = css([1, 1, 1], 0.8); X.stroke(); pet(c, 470, 1780, 0.8, t, { walk: 1, speed: 13 }); } },
  bedtime: { label: 'Bedtime story', fn(c, t) { room(c, t, { wall: [0.45, 0.45, 0.62], floor: [0.42, 0.36, 0.38], window: 'dusk' }); X.save(); X.translate(470, 1440); X.scale(1.3, 1.3); bed(0, 0, 440, firstKid(c), t); X.restore(); const h = person(280, 1680, 1, ME(c), t, { armL: [0.5, 1.75], armR: [0.5, 1.75] }); book((h.L[0] + h.R[0]) / 2, h.R[1] + 70, t, true); const g = X.createRadialGradient(300, 1250, 10, 300, 1250, 420); g.addColorStop(0, css([1, 0.85, 0.55], 0.35)); g.addColorStop(1, css([1, 0.85, 0.55], 0)); circ(300, 1250, 420); X.fillStyle = g; X.fill(); pet(c, 820, 1840, 0.6, t, { flip: -1, tongue: false }); } },
  familydinner: { label: 'Family dinner', fn(c, t) { room(c, t, { wall: [0.42, 0.34, 0.36], floor: [0.42, 0.32, 0.28], lights: true }); person(200, 1680, 1, ME(c), t, { armR: [0.6, 1.4] }); if (hasPartner(c)) person(880, 1680, 0.95, PT(c), t, { flip: -1, armR: [0.6, 1.4] }); const kids = kidsOf(c); kids.slice(0, 3).forEach((k, i) => drawKid(k, 420 + i * 130, 1560, t + i, { armL: [0.6, 1.5], armR: [0.6, 1.5] })); const bb = babiesOf(c); if (bb.length) baby(420 + Math.min(kids.length, 3) * 130, 1420, 0.8, bb[0], t); table(110, 970, 1450); [300, 540, 780].forEach(bx => bowl(bx, 1440, t)); hearts(540, 1000, t, 2); pet(c, 80, 1840, 0.65, t, { lookUp: 0.8 }); } },
  paint: { label: 'Painting or making art', fn(c, t) { room(c, t, { wall: [0.94, 0.92, 0.88], window: 'day' }); easel(720, 1700, t); const s = 0.25 * Math.sin(t * 4); const h = person(380, 1670, 1, ME(c), t, { armR: [1.35 + s, 1.05 - s] }); line([[h.R[0], h.R[1]], [h.R[0] + 60, h.R[1] - 50]], 8, [0.55, 0.4, 0.28]); circ(h.R[0] + 64, h.R[1] - 54, 9); fill(CORAL); pet(c, 140, 1790, 0.7, t, { tongue: false }); } },
  songs_outdoor: { label: 'Playing music outside at dusk', fn(c, t) { outdoor(c, t, 'dusk'); playGuitar(c, t, 440, 1700, 1.05, 430, 1320); pet(c, 760, 1760, 0.85, t, { flip: -1, tongue: false }); notes(600, 1050, t, 3, [1, 1, 1]); } },
  calm: { label: 'Breathing, calm mind', fn(c, t) { outdoor(c, t, 'sunrise', 930); calmRings(440, 1310, t); const b = Math.sin(t * 1.2); seated(440, 1740, 1.05, ME(c), t, b); pet(c, 790, 1760, 0.8, t, { flip: -1, tongue: false }); } },

  wake: { label: 'Waking up fresh', fn(c, t) { room(c, t, { wall: [0.95, 0.9, 0.84], window: 'sunrise' }); const u = ease(clamp((t - 0.6) / 0.8)) * (0.85 + 0.15 * Math.sin(t * 2)); person(380, 1660, 1, ME(c), t, { armL: [0.15 + 2.7 * u, 0.1 + 2.8 * u], armR: [0.15 + 2.7 * u, 0.1 + 2.8 * u], bob: 6 * u }); pet(c, 760, 1760, 0.85, t, { flip: -1 }); } },
  newfamily: { label: 'A new baby, partner, dog and cat', fn(c, t) { room(c, t, { wall: [0.95, 0.9, 0.86], window: 'sunrise' }); if (hasPartner(c)) person(540, 1680, 0.94, PT(c), t, { flip: -1, armR: [1.3, 0.2] }); const h = person(330, 1660, 1, ME(c), t, { armL: [0.25, -1.5], armR: [0.25, -1.5] }); cradle(c, h, 1, Object.assign({}, firstBaby(c), c.babyLook || {}), t, ME(c)); hearts(440, 1000, t); dog(800, 1770, 0.8, t, petsOf(c).find(x => x.type === 'dog') || { coat: '#A14F26', muzzle: 'dark', ears: 'floppy' }, { flip: -1, lookUp: 0.6 }); cat(140, 1800, 0.75, t + 0.4, { type: 'cat', coat: '#FBF8F2' }, { lookUp: 0.5 }); } },
  freedom: { label: 'Dreaming of a home and a holiday', fn(c, t) { outdoor(c, t, 'day'); person(540, 1700, 1.05, ME(c), t, { armL: [0.12, 0.05], armR: [0.12, 0.05] }); thought(300, 780, 150, 500, 1080, t, 0.3, r => houseIcon(r)); thought(790, 760, 150, 590, 1080, t, 1.0, r => holidayIcon(r, t)); pet(c, 820, 1760, 0.85, t, { flip: -1, lookUp: 0.5 }); } },
  clockplan: { label: 'Planning, clock on the wall', fn(c, t) { room(c, t, { window: 'day' }); wallClock(500, 640, 80, t); person(330, 1650, 1, ME(c), t, { armL: [0.4, 1.2], armR: [0.3, 1.5] }); bulb(330, 940 - 10 * Math.sin(t * 2), t); desk(130, 620); notebook(380, 1340, t); pet(c, 760, 1720, 0.85, t, { flip: -1 }); } },
  idea: { label: 'Lightbulb moment, planning', fn(c, t) { room(c, t, { window: 'day' }); person(330, 1650, 1, ME(c), t, { armL: [0.4, 1.2], armR: [0.3, 1.5] }); bulb(330, 940 - 10 * Math.sin(t * 2), t); desk(130, 620); notebook(380, 1340, t); pet(c, 760, 1720, 0.85, t, { flip: -1 }); } },
  checklist: { label: 'Ticking off small wins', fn(c, t) { room(c, t, { wall: [0.92, 0.9, 0.86] }); const u = ease(clamp((t - 2.6) / 0.5)); person(280, 1660, 1, ME(c), t, { armR: [0.4 + 2.2 * u, 0.4 + 2 * u] }); checklist(530, 760, 460, 3, t, 0.8, 0.6); pet(c, 700, 1760, 0.8, t, { flip: -1 }); } },
  read: { label: 'Reading and learning', fn(c, t) { room(c, t, { wall: [0.93, 0.9, 0.85], window: 'day' }); const h = person(420, 1660, 1, ME(c), t, { armL: [0.3, 0.25], armR: [0.3, 0.25] }); book((h.L[0] + h.R[0]) / 2, h.R[1] + 10, t); const sk = C(ME(c).skin); [h.L, h.R].forEach(([hx, hy], i) => { circ(hx + (i ? -6 : 6), hy - 12, 21); fill(sk); circ(hx + (i ? -16 : 16), hy - 34, 9); fill(sk); }); pet(c, 780, 1760, 0.8, t, { flip: -1, tongue: false }); } },
  soda: { label: 'Choosing a better drink', fn(c, t) { room(c, t, { wall: [0.33, 0.3, 0.42], floor: [0.4, 0.3, 0.26], lights: true }); const l = ease(clamp((t - 1.2) / 0.8)); const h = person(420, 1680, 1.05, ME(c), t, { armR: [0.35 + 0.6 * l, 1.4 + 0.9 * l] }); { const k = c.drink || 'soda'; holdDrink(h.R, t, k === 'tea' || k === 'coffee' ? 'water' : k, ME(c)); } counter(640, 1100, 1470, [0.45, 0.33, 0.27]); pet(c, 160, 1760, 0.8, t); } },
  cuppa: { label: 'A morning cuppa', fn(c, t) { room(c, t, { wall: [0.95, 0.9, 0.84], window: 'sunrise' }); counter(560, 1100); rr(820, 1300, 120, 140, 30); fill([0.85, 0.87, 0.9]); line([[940, 1330], [990, 1300]], 14, [0.85, 0.87, 0.9]); rr(850, 1280, 60, 24, 8); fill([0.3, 0.3, 0.33]); const sip = Math.max(0, Math.sin(t * 0.9 - 1.2)); const h = person(380, 1670, 1.05, ME(c), t, { armR: [0.5 + 0.55 * sip, 1.9 + 0.75 * sip] }); holdDrink(h.R, t, c.drink === 'tea' ? 'tea' : 'coffee', ME(c)); if (ptJoins(c)) { const hp = person(720, 1665, 0.97, PT(c), t, { flip: -1, armR: [0.5 + 0.55 * Math.max(0, Math.sin(t * 0.9 + 0.8)), 1.9 + 0.75 * Math.max(0, Math.sin(t * 0.9 + 0.8))] }); holdDrink(hp.R, t, 'coffee', PT(c)); } pet(c, 150, 1780, 0.75, t, { lookUp: 0.5 }); } },
  fridge: { label: 'Stocking up on good food', fn(c, t) { room(c, t, { wall: [0.92, 0.94, 0.9] }); fridge(60, 1640, ease(clamp((t - 0.4) / 0.8))); const r = ease(clamp((t - 1.4) / 0.7)); person(560, 1660, 1, ME(c), t, { armL: [0.3 + 0.9 * r, 0.5 + 0.8 * r] }); counter(700, 1100); fruitBowl(900, 1440); pet(c, 760, 1780, 0.75, t, { flip: -1, lookUp: 0.5 }); } },
  cook: { label: 'Cooking a real meal', fn(c, t) { room(c, t, { wall: [0.94, 0.9, 0.84], window: 'day' }); counter(380, 1100); stove(640, 1420, t); const s = 0.25 * Math.sin(t * 5); person(260, 1660, 1, ME(c), t, { armR: [0.6 + s, 1.5 + s] }); pet(c, 120, 1780, 0.75, t, { lookUp: 0.7 }); } },
  eat: { label: 'Eating well', fn(c, t) { room(c, t, { wall: [0.93, 0.9, 0.85], window: 'day' }); const h = person(400, 1660, 1, ME(c), t, { armR: [0.4, 1.6], armL: [0.4, 1.6] }); bowl((h.L[0] + h.R[0]) / 2, h.R[1] - 10, t); pet(c, 700, 1760, 0.85, t, { flip: -1, lookUp: 0.8 }); } },
  gym: { label: 'Training with weights', fn(c, t, p) { room(c, t, { wall: [0.86, 0.9, 0.93], floor: [0.4, 0.42, 0.45] }); rect(0, 980, W, 70, [0.95, 0.55, 0.42]); weightRack(700, 1460); rect(0, 1600, W, 10, [1, 1, 1], 0.25); const k = (Math.sin(t * 3.2) + 1) / 2; const h = person(400, 1660, 1, ME(c), t, { armL: [0.15, 0.2 + 2.3 * k], armR: [0.15, 0.2 + 2.3 * (1 - k)] }); dumbbell(h.L[0], h.L[1]); dumbbell(h.R[0], h.R[1]); } },
  progress: { label: 'Watching my progress grow', fn(c, t) { room(c, t, { wall: [0.9, 0.92, 0.9] }); rr(470, 720, 560, 520, 26); fill([1, 1, 1], 0.95); barchart(510, 1190, 480, 400, t, 5, [0.35, 0.68, 0.5]); person(260, 1660, 1, ME(c), t, { armR: [1.9, 1.7] }); pet(c, 760, 1780, 0.75, t, { flip: -1 }); } },
  money: { label: 'Checking my numbers', fn(c, t) { room(c, t, { wall: [0.93, 0.91, 0.86], window: 'day' }); desk(150, 700); person(420, 1650, 1, ME(c), t, { armL: [0.4, 1.3], armR: [0.4, 1.3] }); notebook(300, 1360, t); rr(540, 1350, 120, 90, 10); fill([0.3, 0.32, 0.35]); for (let i = 0; i < 6; i++) rect(555 + (i % 3) * 32, 1365 + Math.floor(i / 3) * 32, 24, 24, [0.85, 0.85, 0.85]); pet(c, 860, 1780, 0.75, t, { flip: -1 }); } },
  jar: { label: 'Saving a little every pay', fn(c, t) { room(c, t, { wall: [0.94, 0.9, 0.82] }); desk(450, 1000); const drops = [0.8, 1.8, 2.8, 3.6]; const coins = 3 + drops.filter(d => t > d + 0.6).length; jar(720, 1440, coins); drops.forEach(d => coinDrop(720, 1440 - coins * 16, (t - d) / 0.6)); person(280, 1660, 1, ME(c), t, { armR: [1.4, 1.5] }); pet(c, 120, 1780, 0.7, t); } },
  laptop: { label: 'Focused work on my laptop', fn(c, t, p) { room(c, t, { wall: [0.88, 0.9, 0.93], window: 'sunrise' }); person(380, 1650, 1, ME(c), t, typing(t)); desk(120, 720); laptop(400, 1440, 'back'); rr(600, 1370, 50, 70, 8); fill([0.95, 0.95, 0.92]); clockRing(500, 600, p); pet(c, 860, 1780, 0.75, t, { flip: -1 }); } },
  hardfirst: { label: 'Doing the hard task first', fn(c, t) { room(c, t, { wall: [0.92, 0.9, 0.86] }); checklist(520, 700, 460, 3, t, 1.2, 99); person(300, 1650, 1, ME(c), t, typing(t)); desk(60, 620); laptop(320, 1440, 'back'); pet(c, 800, 1780, 0.75, t, { flip: -1 }); } },
  ship: { label: 'Finishing and launching', fn(c, t) { room(c, t, { wall: [0.9, 0.92, 0.95] }); const u = ease(clamp((t - 1.8) / 0.4)); desk(520, 1040); laptop(780, 1440, (x, y, w, h) => tick(x + w / 2, y + h / 2, 50, clamp((t - 1) / 0.6))); person(300, 1660, 1, ME(c), t, { armL: [0.2 + 2.5 * u, 0.2 + 2.6 * u], armR: [0.2 + 2.5 * u, 0.2 + 2.6 * u], bob: 20 * u * Math.abs(Math.sin(t * 6)) }); confetti(t, 1.8); pet(c, 140, 1790, 0.7, t, { lookUp: 0.6 }); } },
  call: { label: 'A call with someone I love', fn(c, t) {
    room(c, t, { wall: [0.95, 0.9, 0.86], window: 'day' });
    // a video call: phone held up at chest height, their person smiling back on the screen
    const L = ME(c), x = 420, y = 1680, s = 1.05;
    const ss = s * ({ short: 0.92, tall: 1.08 }[L.height] || 1), bw = ({ slim: 0.86, big: 1.26 }[L.build] || 1);
    const sway = 6 * Math.sin(t * 1.8), hand = [x + 128 * ss * bw, y - 430 * ss + sway], a = armsTo(x, y, s, L, hand[0], hand[1], true);
    const h = person(x, y, s, L, t, { armR: a.armR, armL: [0.25, 0.45 + 0.12 * Math.sin(t * 1.6)] });
    // they look at the screen, so we see the back of the phone with their fingers wrapped round it; the person they're talking to pops up beside it
    const sk = C(L.skin), pw = 78, ph2 = 140, px = hand[0] - pw / 2, py = hand[1] - ph2 + 40;
    rr(px, py, pw, ph2, 14); fill([0.2, 0.21, 0.26]); rr(px + 10, py + 10, 26, 34, 8); fill([0.12, 0.12, 0.15]); circ(px + 18, py + 19, 5); fill([0.3, 0.32, 0.4]); circ(px + 28, py + 34, 5); fill([0.3, 0.32, 0.4]);
    // the hand holds the bottom third only: palm under the base, three fingers across the back, one finger reaching up the far edge, thumb on the near edge
    const fore = (L.outfit === 'tee' || L.outfit === 'dress') ? sk : C(L.top), gy = py + ph2 - 46;
    line([[hand[0], hand[1] + 80], [hand[0] + 2, py + ph2 + 6]], 30 * s, sk);
    rr(px - 4, py + ph2 - 22, pw + 6, 34, 16); fill(sk);
    rr(px + pw - 10, gy - 34, 15, 44, 7.5); fill(darken(sk, 0.04));
    [0, 1, 2].forEach(i => { rr(px + 10, gy + i * 14, pw + 2, 14, 7); fill(i % 2 ? darken(sk, 0.07) : sk); if (i) line([[px + 16, gy + i * 14], [px + pw, gy + i * 14]], 1.5, darken(sk, 0.18), 0.6); });
    rr(px - 10, gy - 6, 18, 46, 9); fill(darken(sk, 0.04));
    // the person they're talking to, waving from a pop-out on the left, little hearts floating up from it
    const other = hasPartner(c) ? PT(c) : FRIEND1, wx = 90, wy = 830, ww = 200, wh = 240;
    rr(wx, wy, ww, wh, 24); fill([1, 1, 1]); rr(wx + 10, wy + 10, ww - 20, wh - 20, 16); fill([0.75, 0.86, 0.92]);
    X.beginPath(); X.moveTo(wx + ww - 70, wy + wh - 4); X.lineTo(wx + ww + 30, wy + wh + 60); X.lineTo(wx + ww - 20, wy + wh - 4); X.closePath(); fill([1, 1, 1]);
    X.save(); X.beginPath(); X.rect(wx + 10, wy + 10, ww - 20, wh - 20); X.clip(); person(wx + ww / 2, wy + 100 + 502 * 0.7, 0.7, other, t, { armL: [0.15, 0.1], armR: [2.4 + 0.3 * Math.sin(t * 5), 2.6] }); X.restore();
    for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; X.save(); X.globalAlpha = Math.sin(k * PI) * 0.9; X.translate(wx + 40 + i * 60, wy - 10 - k * 90); X.scale(0.6, 0.6); X.beginPath(); X.moveTo(0, 28); X.bezierCurveTo(-60, -10, -30, -60, 0, -28); X.bezierCurveTo(30, -60, 60, -10, 0, 28); X.fillStyle = css(CORAL); X.fill(); X.restore(); }
    pet(c, 170, 1790, 0.7, t, { lookUp: 0.4 });
  } },
  talk: { label: 'Talking with someone', fn(c, t) { room(c, t, { wall: [0.95, 0.88, 0.8], floor: [0.6, 0.46, 0.36] }); person(300, 1660, 1, ME(c), t, { armR: [0.5 + 0.2 * Math.sin(t * 3), 1] }); person(780, 1660, 0.98, FRIEND1, t, { flip: -1, armR: [0.4, 1 + 0.2 * Math.sin(t * 2.5)] }); const ph = Math.floor(t / 1.2) % 2, a = Math.sin(((t % 1.2) / 1.2) * PI); ph ? bubble(640, 820, 280, 140, a, [0.88, 0.95, 0.9], 1) : bubble(120, 820, 280, 140, a); } },
  excited: { label: 'Heading out, excited for the day', fn(c, t, p) { room(c, t, { wall: [0.95, 0.9, 0.84], window: 'sunrise' }); const [x, m] = walkX(p, 200, 520, 0.2, 0.8); person(x, 1660, 1, ME(c), t, { walk: m ? 1 : 0 }); pet(c, x + 240, 1740, 0.85, t, { walk: m ? 1 : 0 }); } },
  date: { label: 'Date night', fn(c, t) { room(c, t, { wall: [0.38, 0.32, 0.4], floor: [0.42, 0.32, 0.28], lights: true }); person(300, 1660, 1, ME(c), t, { armR: [0.45, 1.2] }); if (hasPartner(c)) person(760, 1660, 0.94, PT(c), t, { flip: -1, armR: [0.4, 1.2] }); rr(420, 1420, 240, 24, 10); fill([0.6, 0.45, 0.32]); rect(530, 1444, 20, 230, [0.6, 0.45, 0.32]); glass(470, 1410, t); glass(610, 1410, t); hearts(530, 1000, t); } },
  guitar: { label: 'Recording music', fn(c, t) { room(c, t, { wall: [0.55, 0.74, 0.85], floor: [0.72, 0.62, 0.52], pattern: true }); micStand(760, 1680); playGuitar(c, t, 420, 1680, 1, 410, 1300); notes(700, 1000, t); pet(c, 160, 1790, 0.7, t, { tongue: false }); } },
  songcard: { label: 'Finishing a song', fn(c, t) { room(c, t, { wall: [0.55, 0.74, 0.85], floor: [0.72, 0.62, 0.52], pattern: true }); songCard(560, 760, t); const u = ease(clamp((t - 2.2) / 0.4)); person(300, 1680, 1, ME(c), t, { armR: [0.15 + 2 * u, 0.4 + 2.4 * u] }); guitar(760, 1640, -1.35); notes(650, 1100, t, 3, [1, 1, 1]); pet(c, 120, 1800, 0.65, t); } },
  travel: { label: 'Planning a trip', fn(c, t) { room(c, t, { wall: [0.95, 0.9, 0.82], window: 'day', inWindow: () => plane(-200 + 1500 * ((t * 0.18) % 1), 820 + 20 * Math.sin(t), 0.6) }); mapCard(120, 700, t); jar(900, 1440, 6); person(360, 1660, 1, ME(c), t, { armR: [0.3, 0.3] }); suitcase(600, 1700); pet(c, 850, 1800, 0.7, t, { flip: -1 }); } },
  party: { label: 'Dancing at a party', fn(c, t) { room(c, t, { wall: [0.2, 0.18, 0.3], floor: [0.26, 0.22, 0.3], lights: true }); discoBall(540, 330, t); const dn = (ph, sp = 6) => ({ armL: [2.3 + 0.4 * Math.sin(t * sp + ph), 2.6 + 0.3 * Math.sin(t * sp + ph)], armR: [1.1 + 0.6 * Math.sin(t * sp + ph + 1.5), 1.6], bob: 22 * Math.abs(Math.sin(t * sp / 2 + ph)) }); person(900, 1620, 0.85, FRIEND1, t, { flip: -1, ...dn(1.2) }); person(120, 1630, 0.85, F2(c), t, dn(2.4)); if (hasPartner(c)) person(680, 1690, 0.95, PT(c), t, { flip: -1, ...dn(0.6) }); const h = person(380, 1700, 1.02, ME(c), t, { armL: [2.3 + 0.4 * Math.sin(t * 6), 2.6], armR: [1.9, 2.75 + 0.15 * Math.sin(t * 3)], bob: 22 * Math.abs(Math.sin(t * 3)) }); { const k = c.drink || 'soda'; holdDrink(h.R, t, k === 'tea' || k === 'coffee' ? 'soda' : k, ME(c)); } confetti(t % 3, 0); } },
  clean: { label: 'Cleaning the house', fn(c, t) { room(c, t, { wall: [0.88, 0.94, 0.95], floor: [0.82, 0.72, 0.58], window: 'day' }); plant(150, 1460); sofa(560, 1000, 1460, [0.45, 0.62, 0.68]); const sw = Math.sin(t * 3); const h = person(380, 1680, 1, ME(c), t, { armL: [0.55 + 0.1 * sw, 1.35], armR: [0.75 + 0.15 * sw, 1.25] }); const mx = 520 + 80 * sw; line([[h.L[0] - 20, h.L[1] - 50], [mx, 1840]], 10, [0.6, 0.45, 0.3]); rr(mx - 70, 1830, 140, 28, 10); fill([0.35, 0.7, 0.85]); rr(820, 1720, 110, 120, 14); fill([0.95, 0.75, 0.3]); sparkles(t, [[300, 1600, 30], [560, 1820, 34], [700, 1500, 26], [900, 1350, 30], [220, 1420, 24]]); pet(c, 940, 1860, 0.6, t, { flip: -1 }); } },
  cuddle: { label: 'Cuddling up together', fn(c, t) { room(c, t, { wall: [0.5, 0.42, 0.48], floor: [0.42, 0.32, 0.3], window: 'dusk' }); lamp(170, 1460, t); sofa(220, 960, 1500, [0.78, 0.55, 0.45]); const sw = 6 * Math.sin(t * 1.2); if (hasPartner(c)) person(600 + sw, 1690, 0.95, PT(c), t, { flip: -1, armL: [1.25, 1.75], armR: [0.4, 0.5] }); person(480 + sw, 1690, 1.02, ME(c), t, { armR: [0.95, 2.2], armL: [0.3, 0.4] }); hearts(540, 1000, t); pet(c, 860, 1850, 0.65, t, { flip: -1, tongue: false }); } },
  cafe: { label: 'Focused work at a cafe', fn(c, t) { outdoor(c, t, 'day'); rect(0, 1180, W, 40, [0.95, 0.55, 0.42]); for (let i = 0; i < 9; i++) rect(i * 130, 1220, 65, 40, [1, 1, 1], 0.9); person(420, 1660, 1, ME(c), t, typing(t)); table(200, 760, 1440); laptop(470, 1440, 'back'); rr(650, 1370, 54, 70, 10); fill([1, 1, 1]); steam(660, 1370, t, 2, 22); pet(c, 900, 1760, 0.75, t, { flip: -1 }); } },
  cook_together: { label: 'Cooking together, record playing', fn(c, t) { kitchenEve(t); counter(250, 1100, 1440, [0.3, 0.33, 0.32]); rr(320, 1360, 60, 80, 10); fill([0.8, 0.45, 0.3]); [0, 1, 2].forEach(i => { circ(335 + i * 15, 1345 - (i % 2) * 18, 22); fill([0.35, 0.6, 0.35]); }); stove(560, 1420, t); recordPlayer(900, 1440, t); const s = 0.25 * Math.sin(t * 5); person(200, 1660, 1, ME(c), t, { armR: [0.6 + s, 1.5 + s] }); if (hasPartner(c)) person(360, 1700, 0.94, PT(c), t, { armR: [0.3, 0.6] }); pet(c, 100, 1820, 0.7, t, { lookUp: 0.8 }); hearts(300, 1000, t, 2); kitchenGlow(); } },
  footy: { label: 'Kicking the footy', fn(c, t) { kickabout(c, t, false); } },
  soccer: { label: 'Kicking a soccer ball', fn(c, t) { kickabout(c, t, true); } },
  tennis: { label: 'Playing tennis', fn(c, t) { tennis(c, t); } },
  surf: { label: 'Heading out for a surf', fn(c, t, p) { surf(c, t, p); } },
  cycle: { label: 'Going for a ride', fn(c, t, p) { cycle(c, t, p); } },
  swim: { label: 'Swimming laps', fn(c, t, p) { swim(c, t, p); } },
  hoop: { label: 'Shooting hoops', fn(c, t) { hoopScene(c, t); } },
  dance: { label: 'Dance class', fn(c, t) { danceStudio(c, t); } },
  mat: { label: 'Yoga or pilates', fn(c, t) { matScene(c, t); } },
  kitbag: { label: 'Heading out to do my thing', fn(c, t, p) { kitbag(c, t, p); } },
  golf: { label: 'A round of golf', fn(c, t) { golfScene(c, t); } },
  cricket: { label: 'Batting at cricket', fn(c, t) { cricketScene(c, t); } },
  boxing: { label: 'Boxing or martial arts', fn(c, t) { boxingScene(c, t); } },
  hike: { label: 'Hiking a trail', fn(c, t, p) { hikeScene(c, t, p); } },
  paddle: { label: 'Paddling on the water', fn(c, t, p) { paddleScene(c, t, p); } },
  garden: { label: 'In the garden', fn(c, t, p) { gardenScene(c, t, p); } },
  fishing: { label: 'Fishing off the jetty', fn(c, t) { fishingScene(c, t); } },
  hug: { label: 'A big hug at the door', fn(c, t) { hug(c, t); } },
  bbq: { label: 'Backyard barbecue', fn(c, t) { bbq(c, t); } },
};
const PICKABLE = Object.keys(SCENES).filter(k => k !== 'title' && k !== 'end');

// ---------------------------------------------------------------- captions
function wrap(text, maxw) {
  const words = String(text).split(/\s+/).filter(Boolean), lines = []; let cur = '';
  words.forEach(wd => { const test = (cur + ' ' + wd).trim(); if (X.measureText(test).width > maxw && cur) { lines.push(cur); cur = wd; } else cur = test; });
  lines.push(cur); return lines;
}
function caption(text, t) {
  const a = ease(t / 0.9);
  let size = 60; X.font = `700 ${size}px Poppins, "Figtree", sans-serif`;
  let lines = wrap(text, 850);
  if (lines.length > 3) { size = 50; X.font = `700 ${size}px Poppins, "Figtree", sans-serif`; lines = wrap(text, 860); }
  const lh = size * 1.33, h = lines.length * lh + 80, y0 = 230 + (1 - a) * 30;
  rr(70, y0, 940, h, 40); fill([1, 0.99, 0.96], 0.86 * a);
  X.textBaseline = 'alphabetic'; X.textAlign = 'center';
  lines.forEach((ln, i) => { const la = ease((t - 0.15 - i * 0.18) / 0.6); X.fillStyle = css(NAVY, la); X.fillText(ln, W / 2, y0 + 40 + size + i * lh + (1 - la) * 16); });
}
const LOGO = { b1: 'M16.5 51 Q21.5 41.5 30 52 Q38.5 41.5 43.5 51', b2: 'M37.5 35 Q41.5 27.2 47 35.5 Q52.5 27.2 56.5 35', sun: 'M40 78 A28 28 0 0 1 96 78 Z' };
function drawLogo(cx, cy, s, a) {
  if (a <= 0) return;
  X.save(); X.globalAlpha = a; X.translate(cx - 60 * s, cy - 60 * s); X.scale(s, s);
  X.shadowColor = 'rgba(40,25,20,0.3)'; X.shadowBlur = 8;
  const cream = css([1, 0.97, 0.92]);
  X.lineCap = 'butt'; X.lineJoin = 'miter'; X.strokeStyle = cream;
  X.lineWidth = 3.6; X.stroke(new Path2D(LOGO.b1)); X.lineWidth = 3.2; X.stroke(new Path2D(LOGO.b2));
  X.fillStyle = css(CORAL); X.fill(new Path2D(LOGO.sun));
  X.lineCap = 'round'; X.lineWidth = 7; X.beginPath(); X.moveTo(14, 78); X.lineTo(106, 78); X.stroke();
  X.strokeStyle = css([0.47, 0.7, 0.83]); X.lineWidth = 6;
  X.beginPath(); X.moveTo(54, 90); X.lineTo(84, 90); X.moveTo(61, 101); X.lineTo(77, 101); X.stroke();
  X.restore();
}
function glimpseCaption(text, t, size = 78) {
  rect(0, 0, W, H, lin(0, 0, 0, H, [[0, [0.99, 0.75, 0.42], 0.22], [0.5, [0.99, 0.7, 0.5], 0.05], [1, [0.99, 0.6, 0.45], 0.15]]));
  rect(0, 0, W, 1000, lin(0, 0, 0, 1000, [[0, [0.3, 0.18, 0.14], 0.38], [0.6, [0.3, 0.18, 0.14], 0.18], [1, [0.3, 0.18, 0.14], 0]]));
  X.font = `italic 400 ${size}px Poppins, "Figtree", sans-serif`; X.textAlign = 'center';
  const lines = wrap(text, 880), lh = size * 1.3, y0 = 520 - lines.length * lh / 2;
  lines.forEach((ln, i) => {
    const la = ease((t - 0.3 - i * 0.35) / 0.9), y = y0 + i * lh + (1 - la) * 20;
    [[0, 5, 0.35], [2, 3, 0.35], [-2, 3, 0.3]].forEach(([dx, dy, al]) => { X.fillStyle = css([0.3, 0.15, 0.1], al * la); X.fillText(ln, W / 2 + dx, y + dy); });
    X.fillStyle = css([1, 1, 1], la); X.fillText(ln, W / 2, y);
  });
  const la = ease((t - 0.2) / 0.8), ww = 120 * la;
  if (ww > 0.5) line([[W / 2 - ww, y0 - lh * 1.05], [W / 2 + ww, y0 - lh * 1.05]], 4, [1, 1, 1], 0.8 * la);
}

// ---------------------------------------------------------------- timeline
function petName(cfg) {
  const ps = petsOf(cfg); if (!ps.length) return '';
  const names = ps.map(p => (p.name || '').trim()).filter(Boolean);
  const join = a => a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  if (names.length === ps.length) return join(names);
  if (ps.length === 1) return 'my ' + ps[0].type;
  return ps.every(p => p.type === ps[0].type) ? 'my ' + ps[0].type + 's' : 'my pets';
}
function fillText(text, cfg) { return String(text || '').replace(/\{pet\}/g, petName(cfg) || 'my pet'); }
const FIXED_HOME = { title: 'beach', end: 'beach', calm: 'mountains', campfire: 'mountains', friends: 'park', family: 'park', pram: 'park', parkday: 'park', footy: 'park', soccer: 'park', tennis: 'park', hoop: 'park', mat: 'beach', cricket: 'park', hike: 'mountains', garden: 'country', bbq: 'park', schoolrun: 'city', cafe: 'city', surf: 'beach', songs_outdoor: 'beach' };
const ROAM_SCENES = new Set(['kitbag', 'walk', 'jog', 'start', 'sunrise', 'strong', 'selflove', 'unwind', 'couple', 'cycle', 'celebrate', 'steady', 'together']);
const ROAM_SHOW = { walk: 'park', jog: 'beach', couple: 'city', cycle: 'city', celebrate: 'beach', unwind: 'beach', strong: 'park' };
// the setting a scene's picture shows in the chooser
const homeWorld = k => FIXED_HOME[k] || ROAM_SHOW[k] || 'beach';
// opening and closing are in the viewer's own voice, like every line in between
function openingText(cfg) { return (cfg.opening || '').trim() || 'This is me.'; }
function closingText(cfg) { return (cfg.closing || '').trim() || 'I\u2019m off to live it.'; }
// pets and partners: present enough that they feel part of your life, never so often it looks silly
const PET_ALWAYS = new Set(['walk', 'newfamily', 'together']);
const PET_NEVER = new Set(['gym', 'talk', 'date', 'party', 'dance', 'boxing', 'paddle', 'footy', 'soccer', 'tennis', 'surf', 'cycle', 'swim', 'hoop', 'mat', 'golf', 'cricket', 'laptop', 'hardfirst', 'money', 'cafe', 'jar', 'checklist', 'progress', 'clockplan', 'idea', 'ship', 'guitar', 'songcard', 'title', 'end']);
const PT_SCENES = new Set(['campfire', 'couple', 'together', 'family', 'pram', 'familydinner', 'newfamily', 'call', 'date', 'party', 'cuddle', 'cook_together', 'tennis', 'bbq']);
const PT_JOIN = ['unwind', 'start', 'cuppa', 'hike', 'garden', 'sunrise', 'steady'];
const spread = (arr, k) => k <= 0 || !arr.length ? [] : k >= arr.length ? arr.slice() : Array.from({ length: k }, (_, i) => arr[Math.round(i * (arr.length - 1) / Math.max(1, k - 1))]);
function planCompanions(cfg, items) {
  const acts = items.filter(it => it.scene !== 'title'), n = acts.length;
  acts.forEach(it => { it.pet = PET_ALWAYS.has(it.scene); it.pt = false; });
  if ((cfg.pets || []).length) {
    const want = Math.max(2, Math.round(n / 3)) - acts.filter(it => it.pet).length;
    spread(acts.filter(it => !it.pet && !PET_NEVER.has(it.scene)), want).forEach(it => { it.pet = true; });
  }
  if (hasPartner(cfg)) {
    const want = Math.max(2, Math.round(n / 4)) - acts.filter(it => PT_SCENES.has(it.scene)).length;
    spread(acts.filter(it => PT_JOIN.includes(it.scene)), want).forEach(it => { it.pt = true; });
  }
}
function timeline(cfg, targetDur) {
  const items = [{ kind: 'g', text: openingText(cfg), scene: 'title', d: cfg.openD || 5, size: 100 }];
  (cfg.sections || []).forEach(sec => {
    (sec.actions || []).forEach(a => { if (a.text && a.text.trim()) items.push({ kind: 'a', text: a.text, scene: a.scene, world: a.world, d: a.d || 4, src: a }); });
    if (sec.glimpse && sec.glimpse.text && sec.glimpse.text.trim()) items.push({ kind: 'g', text: sec.glimpse.text, scene: sec.glimpse.scene, world: sec.glimpse.world, d: sec.glimpse.d || 4, src: sec.glimpse });
  });
  // every scene has a natural setting; walks, runs and rides move between places so the film keeps changing
  const ROAMS = ['park', 'country', 'beach', 'city', 'lake', 'mountains'], used = { park: 0, country: 0, beach: 1, city: 0, lake: 0, mountains: 0 }; let prev = null;
  // scenes tied to a place claim it first; scenes that can be anywhere then go where the film hasn't been yet
  items.forEach(it => { if (!it.world && FIXED_HOME[it.scene]) it.world = FIXED_HOME[it.scene]; if (it.world && ROAMS.includes(it.world)) used[it.world]++; });
  items.forEach((it, k) => {
    if (!it.world && ROAM_SCENES.has(it.scene)) { const last = (items[k - 1] || {}).world; it.world = ROAMS.filter(w => w !== last).sort((a, b) => used[a] - used[b] || ((ROAMS.indexOf(a) + k) % ROAMS.length) - ((ROAMS.indexOf(b) + k) % ROAMS.length))[0]; used[it.world]++; }
  });
  planCompanions(cfg, items);
  items.push({ kind: 'g', text: closingText(cfg), scene: 'end', d: 7, last: true });
  const roomUse = ROOM_STYLES.map(() => 0); let prevRoom = -1;
  const indoor = sc => { const s = SCENES[sc]; return !!s && /\broom\(/.test(s.fn.toString()); };
  items.forEach(it => { if (!indoor(it.scene)) return; const h0 = roomHash(it.scene); let best = -1; for (let j = 0; j < ROOM_STYLES.length; j++) { const r = (h0 + j) % ROOM_STYLES.length; if (r === prevRoom) continue; if (best < 0 || roomUse[r] < roomUse[best]) best = r; } it.room = best; roomUse[best]++; prevRoom = best; });
  items.forEach(it => { if (it.src) { it.src._world = it.world; it.src._room = it.room; } delete it.src; });
  const raw = items.reduce((s, i) => s + i.d, 0), k = targetDur ? targetDur / raw : 1;
  let s = 0; items.forEach(i => { i.d *= k; i.start = s; s += i.d; });
  return { items, total: s };
}
function render(ctx, cfg, tl, T) {
  X = ctx;
  T = clamp(T, 0, tl.total - 0.001);
  let i = 0; while (i < tl.items.length - 1 && tl.items[i + 1].start <= T) i++;
  const it = tl.items[i], t = T - it.start, p = t / it.d, d = it.d;
  X.save(); X.fillStyle = css(CREAM); X.fillRect(0, 0, W, H);
  let sc = it.world && it.world !== cfg.world ? Object.assign({}, cfg, { world: it.world }) : cfg;
  if (it.pet === false || it.pt) sc = Object.assign({}, sc, it.pet === false ? { pets: [] } : {}, { _pt: !!it.pt });
  ROOMSEL = it.room != null ? it.room : roomHash(it.scene); HATS_OFF = false;
  try { (SCENES[it.scene] || SCENES.sunrise).fn(sc, t, p); } catch (e) { console.error(e); }
  ROOMSEL = null;
  X.restore();
  X.save();
  const txt = fillText(it.text, cfg);
  if (it.kind === 'a') caption(txt, t); else glimpseCaption(txt, t, it.size || 78);
  if (it.scene === 'title') {
    // the brand, as on the home page: the birds-and-sunrise mark over the name in italic Poppins
    const nm = cfg.me && (cfg.me.name || '').trim(), ka = ease((t - 0.2) / 0.8);
    drawLogo(W / 2, 108, 1.65, ka);
    X.font = 'italic 500 50px Poppins, "Figtree", sans-serif'; X.textAlign = 'center';
    X.shadowColor = 'rgba(40,25,20,0.35)'; X.shadowBlur = 12;
    X.fillStyle = css([1, 0.97, 0.92], 0.95 * ka);
    X.fillText((nm ? nm + (/s$/i.test(nm) ? '’' : '’s') + ' ' : '') + 'Motion Mornings', W / 2, 248);
    X.shadowBlur = 0;
  }
  let a = 0;
  if (i === 0) a = 1 - clamp(t / 1.5); else if (t < 0.4) a = 1 - t / 0.4;
  if (d - t < 0.4 && !it.last) a = Math.max(a, 1 - (d - t) / 0.4);
  if (it.last) a = Math.max(a, clamp((t - (d - 2)) / 2));
  if (a > 0) rect(0, 0, W, H, it.last && t > d / 2 ? [0.05, 0.04, 0.06] : CREAM, a);
  X.restore();
}
function drawScene(ctx, cfg, key, t, p = 0.5, roomIx) { X = ctx; X.save(); X.fillStyle = css(CREAM); X.fillRect(0, 0, W, H); ROOMSEL = roomIx != null ? roomIx : roomHash(key); HATS_OFF = false; try { (SCENES[key] || SCENES.sunrise).fn(cfg, t, p); } finally { ROOMSEL = null; } X.restore(); }

// BARE: draw a character on its own with no card behind it, for decorating pages
let BARE = false;
function portrait(ctx, L, t, w, hgt, kind) {
  X = ctx; HATS_OFF = false;
  X.save(); X.clearRect(0, 0, w, hgt);
  if (!BARE) { const g = X.createRadialGradient(w / 2, hgt * 0.42, 10, w / 2, hgt * 0.5, w * 0.7);
  g.addColorStop(0, '#F1F4F7'); g.addColorStop(1, '#D9E0E7'); X.fillStyle = g; X.fillRect(0, 0, w, hgt); }
  ell(w / 2, hgt - 34, w * 0.28, 16); fill([0.25, 0.3, 0.38], 0.16);
  const s = (hgt - 70) / 640, wave = 0.25 * Math.sin(t * 3);
  if (kind === 'pet' && L) {
    // sized so a Great Dane and a chihuahua both fill the frame, the way a pet photo would
    const g = L.type === 'dog' ? dogGeo(L) : null, sz = L.type === 'dog' ? dogSize(L) : 1;
    const tall = L.type === 'dog' ? (-g.hy + g.B.hr + 60) * sz : 330, wide = L.type === 'dog' ? (g.hx + g.B.hr + 70 + g.B.rx * 0.85 + 60) * sz : 360;
    const ps = L.type === 'dog' ? Math.min((hgt - 90) / 500, (w - 40) / 610) : Math.min((hgt - 90) / tall, (w - 60) / wide), left = L.type === 'dog' ? (g.B.rx * 0.85 + 60) * sz : 170;
    const px = (w - wide * ps) / 2 + left * ps;
    if (L.type === 'dog') dog(px, hgt - 40, ps, t, L, { tongue: true }); else cat(px, hgt - 40, ps, t, L, {});
  } else if (L && !L.unset) person(w / 2, hgt - 36, s, L, t, { armR: [2.3, 2.6 + wave], armL: [0.18, 0.1], bob: 2 * Math.abs(Math.sin(t * 1.5)) });
  X.restore();
}
// ---------------------------------------------------------------- kids: social-story films
// A child, the grown-up who goes with them and (optionally) a helper they'll meet, walked through
// what is going to happen, one step at a time, in the order it will happen.
const KIDS = (() => {
  const KID_DEF = { name: '', age: 'little', body: 'm', hair: 'mop', hairCol: '#6B4528', skin: '#F2CBAE', outfit: 'tee', top: '#D94B3F', pants: '#2F4A7A', print: '' };
  const ADULT_DEF = { name: '', body: 'f', hair: 'long', hairCol: '#A47A55', grey: false, skin: '#F2CBAE', facial: 'none', facialCol: '#555555', outfit: 'tee', top: '#F7F3EC', inner: '#F7F3EC', pants: '#4D6E9C' };
  const HELPER_DEF = { name: '', body: 'f', hair: 'curly', hairCol: '#7A4A2C', grey: false, skin: '#EDC2A0', facial: 'none', facialCol: '#555555', outfit: 'dress', top: '#4F86C6', inner: '#4F86C6', pants: '#4F86C6' };
  const MUM2 = { body: 'f', hair: 'ponytail', hairCol: '#2E2622', skin: '#C98E66', facial: 'none', outfit: 'tee', top: '#5FA88F', inner: '#5FA88F', pants: '#30406E' };
  const MUM3 = { body: 'f', hair: 'bun', hairCol: '#D9B373', skin: '#F2D3BC', facial: 'none', outfit: 'tee', top: '#E9A23B', inner: '#E9A23B', pants: '#404D73' };
  const KIDA = { age: 'little', body: 'f', hair: 'bun', hairCol: '#2E2622', skin: '#C98E66', outfit: 'dress', top: '#F2C46F' };
  const KIDB = { age: 'little', body: 'm', hair: 'short', hairCol: '#C9A060', skin: '#F2D3BC', outfit: 'tee', top: '#6FA8DC', pants: '#30406E' };
  const DAD1 = { body: 'm', hair: 'short', hairCol: '#3B2A20', skin: '#E8BA99', facial: 'beard', facialCol: '#3B2A20', outfit: 'hoodie', top: '#4F86C6', pants: '#2B2B30' };
  const DAD2 = { body: 'm', hair: 'fade', hairCol: '#1F1A17', skin: '#8A5434', facial: 'stubble', facialCol: '#1F1A17', outfit: 'tee', top: '#E9A23B', inner: '#E9A23B', pants: '#30406E' };
  const MUM4 = { body: 'f', hair: 'wavy', hairCol: '#B5523A', skin: '#F6D7C3', facial: 'none', outfit: 'dress', top: '#9B6FB5', inner: '#9B6FB5', pants: '#9B6FB5' };
  const KIDC = { age: 'little', body: 'm', hair: 'curly', hairCol: '#1F1A17', skin: '#8A5434', outfit: 'tee', top: '#9B6FB5', pants: '#30406E' };
  const KIDD = { age: 'little', body: 'f', hair: 'ponytail', hairCol: '#C9A060', skin: '#F6D7C3', outfit: 'dress', top: '#5FA88F' };
  const PARK = { world: 'park' }, CITY = { world: 'city' };
  const lerp = (a, b, k) => a + (b - a) * k;
  const SIB_DEF = { name: '', age: 'kid', body: 'f', hair: 'ponytail', hairCol: '#6B4528', skin: '#F2CBAE', outfit: 'tee', top: '#5FA88F', pants: '#30406E', print: '' };
  const BABY_DEF = { name: '', age: 'baby', hairCol: '#6B4528', skin: '#F2CBAE', top: '#F7D9C4', blanket: '#BFD9EA' };
  const KID = c => Object.assign({}, KID_DEF, c.child || {}), AD = c => Object.assign({}, ADULT_DEF, c.adult || {}), HP = c => Object.assign({}, HELPER_DEF, c.helper || {});
  const SB = c => Object.assign({}, SIB_DEF, (c.siblings && c.siblings[0]) || c.sibling || {}), BB = c => Object.assign({}, BABY_DEF, c.baby || {});
  const FRIEND_DEF = { name: '', age: 'little', body: 'f', hair: 'curly', hairCol: '#3B2A20', skin: '#E8BA99', outfit: 'tee', top: '#E9A23B', pants: '#30406E', print: '' };
  const GENERIC = () => [KIDA, KIDB, KIDC, KIDD];
  const EX = (c, i) => { const fr = (c && c.friends) || []; return i < fr.length ? Object.assign({}, FRIEND_DEF, fr[i]) : GENERIC()[(i - fr.length) % 4]; };
  const FR = c => EX(c, 0);
  // the other child in a two-kid scene: a friend if the step says so, otherwise a brother or sister
  const PAL = (c, st) => st && st.with === 'friend' ? FR(c) : SB(c);
  // the family's pets, walking or resting nearby
  const PETS = c => ({ pets: ((c && c.pets) || []).filter(q => q && (q.type === 'dog' || q.type === 'cat')) });
  const hasPet = c => PETS(c).pets.length > 0;
  const ks = (k, s = 1) => kidScale(k) * s;
  // the top of someone's head, for placing what they say
  const adultTop = (x, y, s = 1) => [x, y - 590 * s];
  const kidTop = (k, x, y, s = 1) => [x, y - ks(k, s) * (470 + 118 * kidHead(k))];

  // two-link reach: the arm angles that put a hand on a point, for either arm of anyone facing either way
  function reach(px, py, s, flip, side, tx, ty, out = 1) {
    const l1 = 112, l2 = 104;
    const lx = ((tx - px) / (s * flip)) * side - 72, ly = (ty - py) / s + 426;
    const d = Math.min(Math.hypot(lx, ly), l1 + l2 - 2), phi = Math.atan2(lx, ly);
    const al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const u = phi + out * al, ex = l1 * Math.sin(u), ey = l1 * Math.cos(u);
    return [u, Math.atan2(lx - ex, ly - ey)];
  }
  const wave = (t, k = 0) => [2.5, 2.9 + 0.4 * Math.sin(t * 6 + k)];
  function clap(x, y, s, flip, t) {
    const g = 18 + 16 * Math.abs(Math.sin(t * 5)), cx = x + flip * 70 * s, cy = y - 330 * s;
    return { armL: reach(x, y, s, flip, -1, cx - flip * g * s, cy), armR: reach(x, y, s, flip, 1, cx + flip * g * s, cy) };
  }
  // the grown-up and the child side by side holding hands, child on the right, both facing right
  function pair(c, x, y, t, walk = 0, o = {}) {
    const k = KID(c), kx = x + 160, ky = y + 4, sw = walk ? 5 * Math.sin(t * 7) : 0, hx = x + 106 + sw, hy = y - 228;
    person(x, y, 1, AD(c), t, { walk, armL: [0.15 - 0.2 * walk * Math.sin(t * 7), 0.1], armR: reach(x, y, 1, 1, 1, hx, hy) });
    drawKid(k, kx, ky, t, { walk, speed: 11, armL: reach(kx, ky, ks(k), 1, -1, hx, hy, -1), armR: o.kidWave ? wave(t, 2) : [0.25 + 0.25 * walk * Math.sin(t * 11), 0.2] });
    return { adult: adultTop(x, y), child: kidTop(k, kx, ky) };
  }

  // ---- set pieces
  function clock(x, y, r, h, m, pill, pa = 1) {
    circ(x, y + 8, r + 16); fill([0.2, 0.16, 0.14], 0.18);
    circ(x, y, r + 16); fill(CORAL); circ(x, y, r); fill([0.99, 0.97, 0.92]);
    X.font = `700 ${Math.round(r * 0.24)}px Poppins, sans-serif`; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillStyle = css(NAVY);
    for (let i = 1; i <= 12; i++) { const a = i * PI / 6; X.fillText(String(i), x + Math.sin(a) * r * 0.79, y - Math.cos(a) * r * 0.79 + 2); }
    X.textBaseline = 'alphabetic';
    const ha = ((h % 12) + m / 60) * PI / 6, ma = m * PI / 30;
    line([[x, y], [x + Math.sin(ha) * r * 0.42, y - Math.cos(ha) * r * 0.42]], 13, NAVY);
    line([[x, y], [x + Math.sin(ma) * r * 0.66, y - Math.cos(ma) * r * 0.66]], 8, NAVY);
    circ(x, y, 12); fill(CORAL);
    if (pill && pa > 0) {
      X.save(); X.font = '700 62px Poppins, sans-serif'; const w = Math.max(200, X.measureText(pill).width + 70);
      X.globalAlpha = pa; rr(x - w / 2, y + r + 34, w, 96, 48); fill(NAVY);
      X.fillStyle = css([1, 1, 1]); X.textAlign = 'center'; X.fillText(pill, x, y + r + 104); X.restore();
    }
  }
  // "9", "9:30", "9.30am", "10 o'clock" -> [hours, minutes, label]
  function parseTime(s) {
    const m = String(s || '').trim().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|o'?clock)?$/i);
    if (!m) return null;
    const h = +m[1], mm = +(m[2] || 0); if (h > 23 || mm > 59) return null;
    return [h, mm, `${h > 12 ? h - 12 : h || 12}:${String(mm).padStart(2, '0')}`];
  }
  function bubbleSize(text, w) { X.save(); X.font = '700 50px Poppins, sans-serif'; const lines = wrap(text, w - 70); X.restore(); return { lines, h: lines.length * 62 + 56 }; }
  function speak(text, x, y, w, a, tailX, lines, h) {
    if (a <= 0 || !text) return;
    X.save(); X.font = '700 50px Poppins, sans-serif';
    const lh = 62, yy = y + (1 - a) * 20;
    X.globalAlpha = a; X.shadowColor = 'rgba(40,25,20,0.2)'; X.shadowBlur = 20;
    rr(x, yy, w, h, 34); fill([1, 1, 1]);
    const tx = clamp(tailX, x + 50, x + w - 50);
    X.beginPath(); X.moveTo(tx - 26, yy + h - 2); X.lineTo(tailX - 6, yy + h + 48); X.lineTo(tx + 26, yy + h - 2); X.closePath(); fill([1, 1, 1]);
    X.shadowBlur = 0; X.fillStyle = css(NAVY); X.textAlign = 'center';
    lines.forEach((ln, i) => X.fillText(ln, x + w / 2, yy + 72 + i * lh));
    X.restore();
  }
  // a speech bubble over whoever is talking, kept on screen and clear of the clock
  function bubbleOver(anchor, text, a, clockOn) {
    if (!anchor || !text || a <= 0) return;
    const w = 480, { lines, h } = bubbleSize(text, w);
    let x = clamp(anchor[0] - w / 2 + 40, 30, W - w - 30), y = Math.max(560, anchor[1] - h - 70);
    if (clockOn && x + w > 560 && x < 840 && y < 1040) x = anchor[0] < 700 ? Math.min(x, 560 - w - 6 > 30 ? 560 - w - 6 : x) : Math.max(x, 846);
    x = clamp(x, 30, W - w - 30);
    speak(text, x, y, w, a, anchor[0], lines, h);
  }
  function hall(t) {
    ROOMSEL = 4; room(PARK, t, {}); ROOMSEL = null; HATS_OFF = false;
    X.beginPath(); X.moveTo(-20, 590); X.quadraticCurveTo(540, 680, W + 20, 590); X.lineWidth = 4; X.strokeStyle = css([0.4, 0.3, 0.25]); X.stroke();
    const cols = [CORAL, [0.47, 0.7, 0.83], GOLD, [0.55, 0.78, 0.5], [0.85, 0.55, 0.75]];
    for (let i = 0; i < 13; i++) { const u = (i + 0.5) / 13, x = -20 + u * (W + 40), y = 590 + 4 * 45 * u * (1 - u), sw = 3 * Math.sin(t * 2 + i); X.beginPath(); X.moveTo(x - 30, y); X.lineTo(x + 30, y); X.lineTo(x + sw, y + 62); X.closePath(); fill(cols[i % 5]); }
    rr(30, 1250, 300, 210, 12); fill([0.95, 0.93, 0.88]); rect(40, 1350, 280, 10, [0.8, 0.75, 0.68]);
    [[50, 1265, CORAL], [140, 1265, [0.47, 0.7, 0.83]], [230, 1265, GOLD], [50, 1370, [0.55, 0.78, 0.5]], [140, 1370, [0.85, 0.55, 0.75]], [230, 1370, CORAL]].forEach(([x, y, c]) => { rr(x, y, 80, 75, 10); fill(c); });
    ell(540, 1760, 520, 125); fill([0.47, 0.7, 0.83]); ell(540, 1760, 430, 100); fill([0.99, 0.95, 0.89]); ell(540, 1760, 340, 78); fill(GOLD); ell(540, 1760, 240, 55); fill([0.99, 0.95, 0.89]);
  }
  function ball(x, y, r, c) { circ(x, y, r); fill(c); X.beginPath(); X.arc(x, y, r, -0.5, 1.2); X.lineWidth = r * 0.16; X.strokeStyle = css([1, 1, 1], 0.7); X.stroke(); }
  function planet(x, y, r) { circ(x, y, r); fill([0.3, 0.7, 0.68]); X.save(); X.translate(x, y); X.rotate(-0.3); X.beginPath(); X.ellipse(0, 0, r * 1.7, r * 0.4, 0, 0, 2 * PI); X.lineWidth = 7; X.strokeStyle = css([0.2, 0.5, 0.5]); X.stroke(); X.restore(); }
  function hoop(x, floor) { line([[x, floor], [x, floor - 520]], 14, [0.3, 0.32, 0.38]); ell(x, floor, 70, 16); fill([0.3, 0.32, 0.38]); rect(x - 130, floor - 640, 150, 110, [1, 1, 1]); X.lineWidth = 6; X.strokeStyle = css([0.3, 0.32, 0.38]); X.strokeRect(x - 130, floor - 640, 150, 110); ell(x - 80, floor - 545, 52, 12); X.lineWidth = 8; X.strokeStyle = css(CORAL); X.stroke(); for (let i = 0; i < 5; i++) line([[x - 128 + i * 24, floor - 545], [x - 115 + i * 18, floor - 470]], 3, [1, 1, 1], 0.9); }
  function blocks(x, y) { [[0, 0, CORAL], [70, 0, [0.47, 0.7, 0.83]], [35, -66, GOLD]].forEach(([dx, dy, c]) => { rr(x + dx, y + dy - 64, 64, 64, 8); fill(c); }); }
  function trampoline(x, y, dip) {
    [-150, 150].forEach(dx => line([[x + dx, y], [x + dx * 1.05, y + 130]], 12, [0.25, 0.27, 0.32]));
    ell(x, y, 230, 46); fill([0.25, 0.27, 0.32]);
    X.beginPath(); X.ellipse(x, y + dip * 0.6, 200, 36 + dip * 0.4, 0, 0, 2 * PI); fill([0.17, 0.2, 0.3]);
    ell(x, y, 230, 46); X.lineWidth = 12; X.strokeStyle = css([0.47, 0.7, 0.83]); X.stroke();
  }
  // a sign whose letters take turns in the brand colours
  function rainbowText(text, cx, y, size) {
    const cs = [CORAL, GOLD, [0.55, 0.78, 0.5], [0.47, 0.7, 0.83], [1, 1, 1], [0.85, 0.55, 0.75]];
    X.font = `700 ${size}px Poppins, sans-serif`; X.textAlign = 'left'; let lx = cx - X.measureText(text).width / 2, n = 0;
    [...text].forEach(ch => { X.fillStyle = css(cs[n % cs.length]); if (ch !== ' ') n++; X.fillText(ch, lx, y); lx += X.measureText(ch).width; });
  }
  function signFit(text, maxW, size) { X.font = `700 ${size}px Poppins, sans-serif`; let s = size; while (s > 22 && X.measureText(text).width > maxW) { s -= 2; X.font = `700 ${s}px Poppins, sans-serif`; } return s; }
  // each kind of place gets its own building so the opening scenes don't all look alike
  function buildingKind(sign) {
    const s = String(sign || '').toLowerCase();
    if (/play ?group|kinder|child ?care|day ?care|preschool|creche|nursery/.test(s)) return 'play';
    if (/dentist|dental|orthodont/.test(s)) return 'dentist';
    if (/doctor|clinic|hospital|\bgp\b|medical|surgery|nurse|vaccin|health/.test(s)) return 'clinic';
    if (/school|prep\b|primary|class/.test(s)) return 'school';
    return 'house';
  }
  function signBoard(x, base, sign, y = 290) { if (!sign) return; rr(x + 30, base - y, 300, 70, 16); fill(NAVY); const t = sign.toUpperCase(); rainbowText(t, x + 180, base - y + 50, signFit(t, 270, 40)); }
  function building(x, base, sign) {
    const kind = buildingKind(sign);
    if (kind === 'play') {
      rect(x, base - 300, 360, 300, [0.99, 0.86, 0.55]);
      X.beginPath(); X.moveTo(x - 30, base - 300); X.lineTo(x + 180, base - 440); X.lineTo(x + 390, base - 300); X.closePath(); fill([0.42, 0.7, 0.55]);
      const cols = [CORAL, GOLD, [0.55, 0.78, 0.5], [0.47, 0.7, 0.83]];
      for (let i = 0; i < 9; i++) { const bx = x - 10 + i * 42; X.beginPath(); X.moveTo(bx, base - 300); X.lineTo(bx + 36, base - 300); X.lineTo(bx + 18, base - 268); X.closePath(); fill(cols[i % 4]); }
      circ(x + 180, base - 360, 26); fill([1, 0.97, 0.9]); circ(x + 180, base - 360, 18); fill([0.75, 0.88, 0.95]);
      rr(x + 140, base - 160, 80, 160, 40); fill(CORAL); circ(x + 205, base - 80, 7); fill(GOLD);
      [[x + 30, base - 190], [x + 250, base - 190]].forEach(([wx, wy]) => { rr(wx, wy, 80, 70, 14); fill([0.75, 0.88, 0.95]); X.lineWidth = 6; X.strokeStyle = css([1, 1, 1]); X.stroke(); });
      for (let i = 0; i < 12; i++) { const fx = x - 70 + i * 42; if (fx > x + 120 && fx < x + 230) continue; rr(fx, base - 70, 22, 70, 6); fill(cols[i % 4]); }
      rect(x - 70, base - 46, 500, 8, [1, 0.97, 0.9]);
      signBoard(x, base, sign, 262); return;
    }
    if (kind === 'clinic' || kind === 'dentist') {
      rect(x - 20, base - 330, 400, 330, [0.97, 0.98, 0.99]);
      rect(x - 30, base - 350, 420, 24, [0.82, 0.86, 0.9]);
      rect(x - 20, base - 120, 400, 26, [0.36, 0.62, 0.78]);
      [[x + 10, base - 230], [x + 270, base - 230]].forEach(([wx, wy]) => { rect(wx, wy, 80, 80, [0.75, 0.88, 0.95]); X.lineWidth = 5; X.strokeStyle = css([0.82, 0.86, 0.9]); X.strokeRect(wx, wy, 80, 80); });
      rect(x + 115, base - 200, 130, 200, [0.72, 0.86, 0.94]); line([[x + 180, base - 200], [x + 180, base]], 5, [0.82, 0.86, 0.9]); rect(x + 105, base - 212, 150, 14, [0.82, 0.86, 0.9]);
      circ(x + 180, base - 400, 46); fill([0.3, 0.68, 0.66]);
      if (kind === 'dentist') { X.beginPath(); const cx = x + 180, cy = base - 404; X.moveTo(cx - 24, cy - 18); X.quadraticCurveTo(cx, cy - 34, cx + 24, cy - 18); X.quadraticCurveTo(cx + 30, cy + 4, cx + 16, cy + 30); X.quadraticCurveTo(cx + 8, cy + 10, cx, cy + 10); X.quadraticCurveTo(cx - 8, cy + 10, cx - 16, cy + 30); X.quadraticCurveTo(cx - 30, cy + 4, cx - 24, cy - 18); fill([1, 1, 1]); }
      else { rect(x + 170, base - 428, 20, 56, [1, 1, 1]); rect(x + 152, base - 410, 56, 20, [1, 1, 1]); }
      [[x - 60, base], [x + 420, base]].forEach(([hx, hy]) => { rr(hx - 40, hy - 50, 80, 50, 25); fill([0.4, 0.65, 0.42]); });
      signBoard(x, base, sign, 315);
      return;
    }
    if (kind === 'school') {
      rect(x - 30, base - 320, 420, 320, [0.76, 0.42, 0.35]);
      for (let r = 0; r < 9; r++) for (let c = 0; c < 8; c++) { if ((r + c) % 3) continue; rect(x - 30 + c * 54 + (r % 2) * 26, base - 312 + r * 34, 40, 6, [0.66, 0.34, 0.29]); }
      X.beginPath(); X.moveTo(x - 50, base - 320); X.lineTo(x + 180, base - 420); X.lineTo(x + 410, base - 320); X.closePath(); fill([0.3, 0.38, 0.5]);
      circ(x + 180, base - 352, 30); fill([1, 0.97, 0.9]); line([[x + 180, base - 352], [x + 180, base - 372]], 5, NAVY); line([[x + 180, base - 352], [x + 194, base - 352]], 5, NAVY);
      rr(x + 130, base - 170, 100, 170, 50); fill([0.3, 0.38, 0.5]);
      [[x, base - 220], [x + 280, base - 220]].forEach(([wx, wy]) => { rect(wx, wy, 80, 90, [0.75, 0.88, 0.95]); X.lineWidth = 6; X.strokeStyle = css([1, 0.97, 0.9]); X.strokeRect(wx, wy, 80, 90); line([[wx + 40, wy], [wx + 40, wy + 90]], 5, [1, 0.97, 0.9]); });
      if (sign) { rr(x + 40, base - 300, 280, 60, 12); fill([1, 0.97, 0.9]); const t = sign.toUpperCase(); X.font = `700 ${signFit(t, 250, 34)}px Poppins, sans-serif`; X.textAlign = 'center'; X.fillStyle = css(NAVY); X.fillText(t, x + 180, base - 258); }
      return;
    }
    rect(x, base - 300, 360, 300, [0.98, 0.9, 0.78]);
    X.beginPath(); X.moveTo(x - 30, base - 300); X.lineTo(x + 180, base - 440); X.lineTo(x + 390, base - 300); X.closePath(); fill(CORAL);
    rr(x + 140, base - 160, 80, 160, 10); fill([0.47, 0.7, 0.83]); circ(x + 205, base - 80, 7); fill(GOLD);
    [[x + 30, base - 200], [x + 250, base - 200]].forEach(([wx, wy]) => { rect(wx, wy, 80, 70, [0.75, 0.88, 0.95]); X.lineWidth = 6; X.strokeStyle = css([1, 1, 1]); X.strokeRect(wx, wy, 80, 70); });
    signBoard(x, base, sign);
  }
  function shopFront(t, sign) {
    outdoor(CITY, t, 'day');
    rect(0, 560, W, 770, [0.86, 0.62, 0.48]);
    rr(80, 600, 920, 130, 18); fill(NAVY);
    if (sign) { const st = sign.toUpperCase(), sz = signFit(st, 860, 110); X.font = `700 ${sz}px Poppins, sans-serif`; X.textAlign = 'center'; X.fillStyle = css([1, 0.95, 0.85]); X.fillText(st, 540, 665 + sz * 0.36); }
    for (let i = 0; i < 12; i++) { rect(i * 90, 760, 90, 100, i % 2 ? [1, 0.97, 0.92] : CORAL); X.beginPath(); X.arc(i * 90 + 45, 860, 45, 0, PI); fill(i % 2 ? [1, 0.97, 0.92] : CORAL); }
    rect(110, 930, 860, 360, [0.3, 0.38, 0.45]); line([[540, 930], [540, 1290]], 12, [0.86, 0.62, 0.48]);
    [[180, 960], [600, 960]].forEach(([x, y]) => { X.beginPath(); X.moveTo(x, y + 200); X.lineTo(x + 120, y); X.lineTo(x + 170, y); X.lineTo(x + 50, y + 200); X.closePath(); fill([1, 1, 1], 0.12); });
    [[40, 1330], [1040, 1330]].forEach(([x, y]) => { rr(x - 36, y - 80, 72, 80, 10); fill([0.95, 0.92, 0.86]); [[-20, -100, 30], [14, -116, 34], [26, -90, 24]].forEach(([dx, dy, r]) => { circ(x + dx, y + dy, r); fill([0.35, 0.6, 0.38]); }); });
  }
  function clothTable(x0, x1, top, floor) {
    rr(x0, top, x1 - x0, 34, 12); fill([0.98, 0.97, 0.94]); rect(x0 + 15, top + 30, x1 - x0 - 30, floor - top - 50, [0.98, 0.97, 0.94]);
    for (let i = 0; i < Math.floor((x1 - x0 - 30) / 75); i++) rect(x0 + 15 + i * 75, top + 30, 36, floor - top - 50, CORAL, 0.25);
    rect(x0 + 15, floor - 20, x1 - x0 - 30, 20, [0.85, 0.82, 0.78]);
  }
  function chairBack(x) { rr(x - 95, 1190, 190, 300, 18); fill([0.55, 0.4, 0.28]); rr(x - 75, 1210, 150, 120, 12); fill([0.62, 0.46, 0.33]); }
  function plateOfFood(x, y) {
    ell(x, y, 120, 26); fill([1, 1, 1]); ell(x, y - 2, 96, 18); fill([0.93, 0.93, 0.95]);
    [[-50, -14], [-26, -20]].forEach(([dx, dy]) => { line([[x + dx, y + dy + 14], [x + dx, y + dy - 6]], 10, [0.45, 0.65, 0.35]); [[-10, -14, 14], [8, -16, 15], [0, -26, 14]].forEach(([a, b, r]) => { circ(x + dx + a, y + dy + b, r); fill([0.3, 0.58, 0.3]); }); });
    [[18, -10, -0.3], [38, -8, -0.15], [56, -12, 0.1]].forEach(([dx, dy, r]) => { X.save(); X.translate(x + dx, y + dy); X.rotate(r); rr(-8, -26, 16, 44, 7); fill([0.95, 0.55, 0.22]); X.restore(); });
  }
  function fork(hx, hy, ang, food) {
    X.save(); X.translate(hx, hy); X.rotate(ang);
    rr(-4, -64, 8, 70, 4); fill([0.75, 0.76, 0.8]); [-9, -3, 3, 9].forEach(dx => rr(dx - 2, -92, 4, 30, 2)); fill([0.75, 0.76, 0.8]);
    if (food) { [[-8, -98, 11], [7, -100, 12], [0, -110, 11]].forEach(([a, b, r]) => { circ(a, b, r); fill([0.3, 0.58, 0.3]); }); }
    X.restore();
  }
  // home kitchen table: the child behind a plate of something new, the grown-up beside them
  function foodScene(c, t, mode) {
    ROOMSEL = 1; room(PARK, t, { window: 'day' }); ROOMSEL = null; HATS_OFF = false;
    // the child sits a little closer to us here, so the plate and the bite read clearly
    const k = KID(c), kx = 610, zs = 1.25, s = ks(k, zs), ky = 1340 + s * 426, ad = AD(c), mx = 250, my = 1780;
    chairBack(mx); chairBack(kx);
    const mouth = [kx, ky - s * (470 + 12 * kidHead(k))], rest = [kx + 78, 1414];
    let hand = rest, food = false, lean = 0;
    if (mode === 'bite') { const u = ease(clamp((t - 1) / 1)) * (1 - ease(clamp((t - 3.2) / 0.9))); hand = [lerp(rest[0], kx + 42, u), lerp(rest[1], mouth[1] + 78, u)]; food = t < 2.3 || t > 3.6 ? true : false; }
    else if (mode === 'look') lean = 6 * Math.sin(t * 1.5);
    const adArms = mode === 'look' ? { armL: [0.08, 0.04], armR: [0.25, 0.15] } : clap(mx, my, 1, 1, t);
    person(mx, my, 1, ad, t, adArms);
    const armL = mode === 'ok' ? [2.5, 2.9 + 0.35 * Math.sin(t * 5)] : reach(kx, ky, s, 1, -1, kx - 74, 1424, -1);
    drawKid(k, kx, ky + lean, t, { s: zs, armR: reach(kx, ky, s, 1, 1, hand[0], hand[1], -1), armL, eyesClosed: mode === 'bite' && t > 2 && t < 2.8 });
    clothTable(140, 940, 1430, 1720);
    plateOfFood(kx + 6, 1450);
    rr(330, 1370, 70, 70, 12); fill([0.47, 0.7, 0.83]); rr(345, 1385, 40, 45, 8); fill([1, 1, 1], 0.5);
    // the fork points where it's going: at the plate while looking, at the mouth for the bite
    const ang = mode === 'bite' ? Math.atan2(mouth[0] - hand[0], -(mouth[1] - hand[1])) * ease(clamp((t - 1) / 0.6)) - 0.35 * (1 - ease(clamp((t - 1) / 0.6))) : -0.35;
    X.save(); X.translate(hand[0], hand[1]); X.scale(0.72, 0.72); fork(0, 0, ang, food && mode === 'bite'); X.restore();
    circ(hand[0], hand[1], 20 * s); fill(k.skin);
    if (mode === 'ok' && t > 0.8) hearts(kx, 1100, t, 1);
    return { adult: adultTop(mx, my), child: [kx, ky - s * (470 + 118 * kidHead(k))], helper: null };
  }

  // sound lines coming off a noisy group, pulsing outwards
  function noise(x, y, t, a = 1) {
    for (let i = 0; i < 3; i++) { const k = (t * 1.4 + i / 3) % 1, r = 40 + k * 90; X.beginPath(); X.arc(x, y, r, -0.7, 0.7); X.lineWidth = 7; X.strokeStyle = css(NAVY, a * 0.55 * (1 - k)); X.stroke(); X.beginPath(); X.arc(x, y, r, PI - 0.7, PI + 0.7); X.stroke(); }
  }
  // the head's centre and half-width for a kid drawn at (x, y), so hands can find their ears
  function kidHeadAt(k, x, y, s = 1) { const sc = ks(k, s), hs = kidHead(k); return [x, y + sc * (-470 - 32 * hs), 50 * hs * sc]; }
  // a crowd that streams in from the right and fills the back of the room
  function crowd(c, t, arrive, scale = 0.86, y0 = 1560) {
    const q = ease(clamp(t / arrive)), m = q < 0.98 ? 1 : 0;
    [[MUM2, 900, 0], [DAD1, 1010, 0.3], [MUM3, 690, 0.6], [DAD2, 800, 0.2], [MUM4, 590, 0.5]].forEach(([L, x, d], i) => person(lerp(x + 700 + i * 60, x, q), y0, scale, L, t + d, { flip: -1, walk: m, armR: !m && i % 2 ? [0.5 + 0.2 * Math.sin(t * 3 + i), 1.1] : [0.2, 0.1] }));
    [[EX(c, 0), 650], [EX(c, 2), 760], [EX(c, 1), 880], [EX(c, 3), 980]].forEach(([k, x], i) => drawKid(k, lerp(x + 800 + i * 50, x, q), y0 + 60, t + i * 0.4, { flip: -1, walk: m, speed: 11, s: 0.95, armL: !m ? [2.3 + 0.4 * Math.sin(t * 5 + i), 2.7] : [0.2, 0.1], armR: !m && i % 2 ? [2.4, 2.9 + 0.3 * Math.sin(t * 6 + i)] : [0.2, 0.1] }));
    return q;
  }

  // ---- kinder or school: a classroom with a door, bag hooks, an alphabet strip and a whiteboard
  const HOOKS_Y = 1385;
  function classroom(t) {
    room(PARK, t, { wall: [0.86, 0.92, 0.95], floor: [0.74, 0.62, 0.5] }); HATS_OFF = false;
    const cs = [CORAL, GOLD, [0.55, 0.78, 0.5], [0.47, 0.7, 0.83], [0.85, 0.55, 0.75]];
    X.font = '700 46px Poppins, sans-serif'; X.textAlign = 'center';
    'ABCDEFGHIJ'.split('').forEach((ch, i) => { const x = 60 + i * 106; rr(x - 42, 560, 84, 84, 12); fill(cs[i % 5]); X.fillStyle = css([1, 1, 1]); X.fillText(ch, x, 618); });
    // the door they come in and out of
    rect(30, 900, 210, 560, [0.98, 0.97, 0.94]); rect(46, 916, 178, 544, [0.47, 0.62, 0.72]); circ(206, 1200, 10); fill(GOLD); rr(80, 960, 110, 120, 10); fill([0.82, 0.92, 0.98]);
    // whiteboard with a drawing on it
    rect(660, 700, 380, 270, [0.42, 0.42, 0.46]); rect(672, 712, 356, 246, [1, 1, 1]);
    circ(760, 790, 34); fill(GOLD, 0.9); line([[700, 930], [790, 860], [860, 910], [1000, 830]], 6, [0.47, 0.7, 0.83]); X.font = '700 40px Poppins, sans-serif'; X.fillStyle = css(CORAL); X.fillText('Hello!', 930, 790);
    // hooks with little bags at kid height
    rect(300, HOOKS_Y - 30, 330, 14, [0.62, 0.46, 0.33]);
    [340, 410, 550, 610].forEach((x, i) => { line([[x, HOOKS_Y - 18], [x, HOOKS_Y + 6]], 6, [0.5, 0.5, 0.55]); rr(x - 26, HOOKS_Y + 2, 52, 66, 12); fill(cs[(i + 2) % 5]); rr(x - 18, HOOKS_Y + 30, 36, 24, 6); fill([1, 1, 1], 0.35); });
  }
  // a little one sitting cross-legged: legs tucked under, drawn over the cut-off body
  function sitKid(k, x, y, t, o = {}) {
    const s = ks(k, o.s || 1), L = Object.assign({ pants: '#30406E' }, k), dress = L.outfit === 'dress';
    X.save(); X.beginPath(); X.rect(0, 0, W, y - 8 * s); X.clip();
    const h = drawKid(k, x, y + 190 * s, t, o); X.restore();
    ell(x, y - 20 * s, 120 * s, 46 * s); fill(dress ? L.top : L.pants);
    [-1, 1].forEach(sd => { ell(x + sd * 92 * s, y - 2 * s, 30 * s, 16 * s); fill([0.13, 0.11, 0.1]); });
    return h;
  }

  // ---- home with the family: a living room with a sofa, and toys to share
  function lounge(t, c) {
    ROOMSEL = 0; room(PARK, t, { window: 'day' }); ROOMSEL = null; HATS_OFF = false;
    rr(560, 1230, 470, 120, 40); fill([0.47, 0.62, 0.72]); rr(540, 1320, 510, 150, 34); fill([0.42, 0.57, 0.67]); rr(520, 1290, 70, 180, 30); fill([0.38, 0.52, 0.62]); rr(990, 1290, 70, 180, 30); fill([0.38, 0.52, 0.62]);
    rr(640, 1258, 110, 80, 22); fill(GOLD); rr(820, 1262, 110, 76, 22); fill(CORAL);
    ell(500, 1760, 470, 110); fill([0.85, 0.55, 0.45]); ell(500, 1760, 400, 86); fill([0.93, 0.7, 0.58]);
    if (c && hasPet(c)) pet(PETS(c), 860, 1620, 0.55, t, { flip: -1 });
  }
  function teddy(x, y, sc = 1, rot = 0) {
    X.save(); X.translate(x, y); X.rotate(rot); X.scale(sc, sc); const b = [0.72, 0.5, 0.3], d = [0.6, 0.4, 0.24];
    [[-26, -88], [26, -88]].forEach(([a, c]) => { circ(a, c, 16); fill(b); circ(a, c, 8); fill(d); });
    ell(0, -10, 40, 48); fill(b); circ(0, -64, 34); fill(b); ell(0, -54, 16, 11); fill([0.9, 0.78, 0.62]); circ(0, -58, 5); fill([0.15, 0.1, 0.08]);
    [-12, 12].forEach(a => { circ(a, -72, 4); fill([0.15, 0.1, 0.08]); }); ell(-34, -6, 14, 22); fill(d); ell(34, -6, 14, 22); fill(d); ell(-20, 34, 18, 13); fill(d); ell(20, 34, 18, 13); fill(d);
    X.restore();
  }
  function truck(x, y, sc = 1) {
    X.save(); X.translate(x, y); X.scale(sc, sc);
    rr(-70, -50, 90, 50, 8); fill(CORAL); rr(20, -64, 52, 64, 8); fill(GOLD); rr(30, -56, 30, 24, 4); fill([0.82, 0.92, 0.98]);
    [-44, 44].forEach(a => { circ(a, 4, 17); fill([0.18, 0.18, 0.2]); circ(a, 4, 7); fill([0.7, 0.7, 0.72]); }); X.restore();
  }
  // little cross scribbles over someone who's upset
  function cross(x, y, t) { for (let i = 0; i < 2; i++) { const a = 0.6 + 0.4 * Math.sin(t * 8 + i * 2); X.save(); X.translate(x + (i ? 34 : -34), y - 10 * i); X.rotate(0.4 * (i ? 1 : -1)); X.beginPath(); for (let k = 0; k < 4; k++) { X.lineTo(k * 12 - 18, k % 2 ? -10 : 10); } X.lineWidth = 6; X.lineCap = 'round'; X.strokeStyle = css(CORAL, a); X.stroke(); X.restore(); } }

  // ---- sitting, lying and costumes for the next set of places
  // someone sitting on a seat, facing us: the body is drawn down to the seat, then the shins hang in front
  function seated(L, x, seatY, s, t, o, kid) {
    const yy = seatY + 262 * s;
    X.save(); X.beginPath(); X.rect(0, 0, W, seatY + 4); X.clip();
    const h = kid ? drawKid(L, x, yy, t, Object.assign({}, o, { s: (o && o.s) || 1 })) : person(x, yy, s, L, t, o || {});
    X.restore();
    const dress = L.outfit === 'dress', lc = dress ? L.skin : (L.pants || '#30406E'), sc = kid ? s : s;
    [-1, 1].forEach(sd => { line([[x + sd * 30 * sc, seatY + 6], [x + sd * 34 * sc, seatY + 150 * sc]], (dress ? 26 : 44) * sc, lc); ell(x + sd * 38 * sc, seatY + 158 * sc, 30 * sc, 14 * sc); fill([0.13, 0.11, 0.1]); });
    return h;
  }
  const seatKid = (k, x, seatY, t, o = {}) => seated(k, x, seatY, ks(k, o.s || 1), t, o, true);
  function chair(x, seatY, w, col) { rr(x - w / 2, seatY - 220, w, 230, 22); fill(darken(C(col), 0.1)); rr(x - w / 2 - 6, seatY - 8, w + 12, 34, 14); fill(col); }
  // a white coat, a hairdresser's apron
  const coat = L => Object.assign({}, L, { outfit: 'jacket', top: '#F4F6F8', inner: L.outfit === 'dress' ? L.top : (L.inner || L.top), pants: L.outfit === 'dress' ? '#30406E' : L.pants });
  const apron = L => Object.assign({}, L, { outfit: 'jacket', top: '#2B2B30', inner: L.outfit === 'dress' ? L.top : (L.inner || L.top), pants: L.outfit === 'dress' ? '#2B2B30' : L.pants });
  function sticker(x, y, r = 22) { X.beginPath(); for (let j = 0; j < 10; j++) { const a = -PI / 2 + j * PI / 5, rr2 = j % 2 ? r * 0.45 : r; X.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } X.closePath(); fill(GOLD); X.lineWidth = 3; X.strokeStyle = css([1, 1, 1]); X.stroke(); }
  // clinic: pale walls, a poster and a sink; the waiting room has a fish tank
  function clinic(t, waiting) {
    room(PARK, t, { wall: [0.88, 0.94, 0.92], floor: [0.8, 0.8, 0.82] }); HATS_OFF = false;
    if (waiting) {
      rr(640, 860, 380, 260, 18); fill([0.35, 0.36, 0.4]); rr(656, 876, 348, 228, 12); fill([0.55, 0.8, 0.9]);
      for (let i = 0; i < 6; i++) { const yy = 1070 - i * 10, sw = 10 * Math.sin(t * 2 + i); line([[680 + i * 50, 1104], [676 + i * 50 + sw, yy - 30]], 6, [0.3, 0.6, 0.35]); }
      [[0, 930, CORAL], [1, 990, GOLD], [2, 1040, [0.47, 0.62, 0.95]]].forEach(([i, y, c]) => { const fx = 690 + ((t * (40 + i * 15) + i * 120) % 290), dir = 1; ell(fx, y + 6 * Math.sin(t * 3 + i), 22, 13); fill(c); X.beginPath(); X.moveTo(fx - 18 * dir, y); X.lineTo(fx - 36 * dir, y - 12); X.lineTo(fx - 36 * dir, y + 12); X.closePath(); fill(c); circ(fx + 10, y - 3, 3); fill([0.1, 0.1, 0.1]); });
      for (let i = 0; i < 4; i++) { const q = (t * 0.5 + i / 4) % 1; circ(980, 1090 - q * 200, 5 + i); X.lineWidth = 2; X.strokeStyle = css([1, 1, 1], 0.7 * (1 - q)); X.stroke(); }
    } else {
      rr(90, 600, 230, 300, 10); fill([1, 1, 1]); X.lineWidth = 6; X.strokeStyle = css([0.6, 0.6, 0.65]); X.strokeRect(90, 600, 230, 300);
      ['E', 'F P', 'T O Z'].forEach((r, i) => { X.font = `700 ${70 - i * 18}px Poppins, sans-serif`; X.textAlign = 'center'; X.fillStyle = css(NAVY); X.fillText(r, 205, 690 + i * 80); });
      rect(820, 1180, 200, 22, [0.95, 0.95, 0.96]); rr(840, 1200, 160, 120, 10); fill([0.9, 0.9, 0.92]); line([[920, 1180], [920, 1130], [960, 1130]], 8, [0.7, 0.7, 0.74]);
    }
  }
  // an examination bed to sit on
  function examBed(x, seatY) { rr(x - 230, seatY - 10, 460, 40, 14); fill([0.47, 0.62, 0.72]); rect(x - 200, seatY + 30, 400, 1700 - seatY - 30, [0.82, 0.84, 0.88]); rect(x - 230, seatY - 4, 460, 8, [1, 1, 1], 0.5); }
  function salon(t) {
    room(PARK, t, { wall: [0.95, 0.88, 0.86], floor: [0.3, 0.3, 0.34] }); HATS_OFF = false;
    rr(330, 600, 420, 560, 30); fill([0.82, 0.68, 0.45]); rr(350, 620, 380, 520, 22); fill([0.78, 0.88, 0.94]); X.beginPath(); X.moveTo(400, 1050); X.lineTo(520, 700); X.lineTo(560, 700); X.lineTo(440, 1050); X.closePath(); fill([1, 1, 1], 0.35);
    rect(0, 1440, W, 30, [0.85, 0.85, 0.88]);
  }
  function bathroom(t) {
    room(PARK, t, { wall: [0.85, 0.92, 0.96], floor: [0.92, 0.92, 0.94] }); HATS_OFF = false;
    for (let y = 700; y < 1460; y += 70) for (let x = 0; x < W; x += 70) { X.lineWidth = 2; X.strokeStyle = css([1, 1, 1], 0.6); X.strokeRect(x, y, 70, 70); }
  }
  function bike(x, y, t, col = CORAL, spin = 1) {
    const a = t * 6 * spin;
    [[x - 110, y - 70], [x + 110, y - 70]].forEach(([wx, wy]) => { circ(wx, wy, 70); X.lineWidth = 12; X.strokeStyle = css([0.18, 0.18, 0.2]); X.stroke(); for (let i = 0; i < 4; i++) { const aa = a + i * PI / 4; line([[wx - 60 * Math.cos(aa), wy - 60 * Math.sin(aa)], [wx + 60 * Math.cos(aa), wy + 60 * Math.sin(aa)]], 3, [0.7, 0.7, 0.72]); } circ(wx, wy, 8); fill([0.5, 0.5, 0.55]); });
    line([[x - 110, y - 70], [x - 20, y - 70], [x + 60, y - 190], [x - 50, y - 180], [x - 20, y - 70]], 14, col); line([[x + 60, y - 190], [x + 110, y - 70]], 14, col);
    line([[x - 50, y - 180], [x - 60, y - 200]], 10, [0.2, 0.2, 0.22]); rr(x - 96, y - 214, 76, 20, 10); fill([0.2, 0.2, 0.22]);
    line([[x + 60, y - 190], [x + 64, y - 240]], 10, [0.2, 0.2, 0.22]); line([[x + 36, y - 246], [x + 96, y - 236]], 12, [0.2, 0.2, 0.22]);
    const px = x - 20, py = y - 70; return { seat: [x - 58, y - 214], bars: [[x + 40, y - 244], [x + 92, y - 236]], pedals: [[px + 34 * Math.cos(a), py + 34 * Math.sin(a)], [px - 34 * Math.cos(a), py - 34 * Math.sin(a)]] };
  }
  // the child on a bike: body above the seat, legs to the pedals, hands on the bars
  function rider(k, b, t, o = {}) {
    const s = ks(k), [sx, sy] = b.seat, yy = sy + 262 * s;
    X.save(); X.beginPath(); X.rect(0, 0, W, sy + 4); X.clip();
    drawKid(k, sx, yy, t, Object.assign({ armL: reach(sx, yy, s, 1, -1, b.bars[0][0], b.bars[0][1], -1), armR: reach(sx, yy, s, 1, 1, b.bars[1][0], b.bars[1][1], -1) }, o));
    X.restore();
    b.pedals.forEach(([px, py], i) => { const hx = sx + (i ? -16 : 16) * s; line([[hx, sy], [(hx + px) / 2 + 14, (sy + py) / 2], [px, py]], 40 * s, k.outfit === 'dress' ? k.skin : (k.pants || '#30406E')); ell(px + 6, py, 26 * s, 13 * s); fill([0.13, 0.11, 0.1]); });
    if (o.helmet !== false) { const [hx, hy, hw] = kidHeadAt(k, sx, yy); X.beginPath(); X.arc(hx, hy - hw * 0.15, hw * 1.18, PI, 2 * PI); X.closePath(); fill(o.helmetCol || [0.47, 0.62, 0.95]); rr(hx - hw * 1.2, hy - hw * 0.22, hw * 2.4, hw * 0.22, 6); fill(darken(C(o.helmetCol || [0.47, 0.62, 0.95]), 0.2)); }
    return kidTop(k, sx, yy);
  }

  // ---- the scenes a story step can use. Each returns where heads are, so a speech bubble can find its speaker.
  const SC = {
    title: { label: 'Setting off', fn(c, t, p) { outdoor(PARK, t, 'sunrise', 1080 - 140 * ease(p)); const q = clamp((p - 0.25) / 0.75); return pair(c, -420 + 1500 * q, 1680, t, q > 0 && q < 1 ? 1 : 0); } },
    goto: { label: 'Walking there together', place: true, fn(c, t, p, st) { outdoor(PARK, t, 'day'); building(660, 1330, st.place); const q = ease(clamp(p / 0.8)); return pair(c, lerp(-60, 400, q), 1700, t, q < 0.98 ? 1 : 0); } },
    arrive: { label: 'Arriving, someone says hi', helper: true, fn(c, t) {
      hall(t); const hp = HP(c);
      person(880, 1690, 0.98, hp, t, { flip: -1, armR: t > 1.6 ? wave(t) : [0.2, 0.1] });
      const q = ease(clamp(t / 2.6)), a = pair(c, lerp(-320, 200, q), 1690, t, q < 0.98 ? 1 : 0);
      return Object.assign(a, { helper: adultTop(880, 1690, 0.98) });
    } },
    bounce: { label: 'Trampoline and toys', fn(c, t) {
      hall(t); hoop(990, 1640); planet(900, 1700, 34); blocks(40, 1700); ball(250, 1790, 40, CORAL);
      person(150, 1700, 1, AD(c), t, clap(150, 1700, 1, 1, t));
      const k = KID(c), b = 150 * Math.abs(Math.sin(t * 3)), dip = Math.max(0, 1 - b / 30) * 22, y = 1590 - b + dip * 0.6;
      trampoline(560, 1590, dip);
      drawKid(k, 560, y, t, { armL: [2.4 + 0.3 * Math.sin(t * 6), 2.8], armR: [2.4 + 0.3 * Math.sin(t * 6 + 1), 2.8] });
      return { adult: adultTop(150, 1700), child: kidTop(k, 560, 1440) };
    } },
    blocks: { label: 'Building a block tower', fn(c, t) {
      hall(t); const k = KID(c), sk = ks(k), kx = 470, ky = 1730, bx = 700, base = 1728, sz = 66;
      const cyc = t % 6.5, n = Math.min(6, 1 + Math.floor(cyc / 0.7)), fall = clamp((cyc - 4.6) / 0.8), cols = [CORAL, GOLD, [0.47, 0.7, 0.83], [0.55, 0.78, 0.5], [0.85, 0.55, 0.75], CORAL];
      person(170, 1720, 1, AD(c), t, cyc > 4.8 ? clap(170, 1720, 1, 1, t) : { armR: [0.3, 0.2] });
      const top = [bx, base - n * sz], placing = cyc < 4.2;
      drawKid(k, kx, ky, t, { armR: placing ? reach(kx, ky, sk, 1, 1, top[0] - 30, top[1] + 20, -1) : [2.5, 2.9 + 0.3 * Math.sin(t * 6)], armL: placing ? [0.3, 0.2] : [2.5, 2.8] });
      for (let i = 0; i < n; i++) {
        const wob = i * 0.012 * Math.sin(t * 9) * clamp((cyc - 3.8) / 0.8), d = ease(fall), dir = i % 2 ? 1 : -1;
        const x = bx + d * dir * (40 + i * 34) + wob * i * 40, y = base - (i + 0.5) * sz + d * (i * sz - (i % 3) * 6), r = d * dir * (0.5 + i * 0.3) + wob;
        X.save(); X.translate(x, y); X.rotate(r); rr(-sz / 2, -sz / 2, sz, sz, 8); fill(cols[i]); rr(-sz / 2 + 10, -sz / 2 + 10, sz - 20, sz - 20, 6); fill([1, 1, 1], 0.18); X.restore();
      }
      if (fall > 0.6) hearts(kx + 60, 1250, cyc - 5, 2);
      return { adult: adultTop(170, 1720), child: kidTop(k, kx, ky) };
    } },
    others: { label: 'Other kids arrive', fn(c, t) {
      hall(t); const k = KID(c);
      person(110, 1690, 1, AD(c), t, {});
      const q = ease(clamp(t / 2.4)), m = q < 0.98 ? 1 : 0;
      person(lerp(1350, 760, q), 1690, 0.97, MUM2, t, { flip: -1, walk: m, armR: !m ? wave(t, 1) : [0.2, 0.1] });
      person(lerp(1550, 980, q), 1690, 0.99, MUM3, t + 0.4, { flip: -1, walk: m });
      drawKid(EX(c, 0), lerp(1250, 620, q), 1700, t + 0.2, { flip: -1, walk: m, speed: 11 });
      drawKid(EX(c, 1), lerp(1450, 870, q), 1705, t + 0.6, { flip: -1, walk: m, speed: 11 });
      drawKid(k, 300, 1700, t, { armR: t > 2.2 ? wave(t) : [0.2, 0.1] });
      return { adult: adultTop(110, 1690), child: kidTop(k, 300, 1700), friend: kidTop(EX(c, 0), lerp(1250, 620, q), 1700) };
    } },
    hello: { label: 'Saying hello', fn(c, t) {
      hall(t); const k = KID(c);
      person(780, 1690, 0.97, MUM2, t, { flip: -1, armR: [0.5 + 0.15 * Math.sin(t * 2), 1.0] });
      drawKid(EX(c, 0), 640, 1705, t, { flip: -1 });
      const mx = 330, kx = 170, y = 1690, hx = 245, hy = y - 228;
      person(mx, y, 1, AD(c), t, { armL: reach(mx, y, 1, 1, -1, hx, hy), armR: t > 1 ? wave(t) : [0.2, 0.1] });
      drawKid(k, kx, y + 6, t, { armR: reach(kx, y + 6, ks(k), 1, 1, hx, hy, -1) });
      return { adult: adultTop(mx, y), child: kidTop(k, kx, y + 6), friend: kidTop(EX(c, 0), 640, 1705) };
    } },
    busy: { label: 'Lots of people come in', fn(c, t) {
      hall(t); const k = KID(c), q = crowd(c, t, 1.6);
      if (q > 0.5) { noise(760, 1180, t, ease((q - 0.5) / 0.5)); noise(900, 1280, t + 0.4, ease((q - 0.5) / 0.5)); }
      person(110, 1700, 1, AD(c), t, { armR: reach(110, 1700, 1, 1, 1, 220, 1478) });
      drawKid(k, 260, 1710, t, { smile: false, armL: reach(260, 1710, ks(k), 1, -1, 220, 1478, -1) });
      return { adult: adultTop(110, 1700), child: kidTop(k, 260, 1710) };
    } },
    ears: { label: 'Too loud: covering ears', fn(c, t) {
      hall(t); crowd(c, 99, 1, 0.72, 1500); noise(780, 1150, t, 0.7);
      const k = KID(c), kx = 400, ky = 1720, [hx, hy, hw] = kidHeadAt(k, kx, ky), s = ks(k);
      // Mumma stands close with a hand on his shoulder
      person(230, 1710, 1, AD(c), t, { armR: reach(230, 1710, 1, 1, 1, kx - 30, ky - 420 * s + 6 * Math.sin(t * 2)), armL: [0.2, 0.1] });
      const hh = drawKid(k, kx, ky, t, { smile: false, eyesClosed: t % 3 > 1.2 && t % 3 < 2.2, armL: reach(kx, ky, s, 1, -1, hx - hw + 8, hy + 2, -1), armR: reach(kx, ky, s, 1, 1, hx + hw - 8, hy + 2, -1) });
      // hands over the ears sit on top of the hair
      [hh.L, hh.R].forEach(h => { circ(h[0], h[1], 21 * s); fill(k.skin); });
      return { adult: adultTop(230, 1710), child: kidTop(k, kx, ky) };
    } },
    mumplay: { label: 'Playing with their grown-up', fn(c, t) {
      hall(t);
      // the busy part of the room stays small and far away
      person(760, 1470, 0.62, MUM2, t, { flip: -1, armR: [0.4, 1 + 0.2 * Math.sin(t * 3)] }); person(900, 1470, 0.62, DAD1, t + 1, { flip: -1 }); person(1010, 1475, 0.62, MUM3, t + 2, { flip: -1 });
      drawKid(EX(c, 0), 800, 1520, t, { s: 0.75, armL: [2.4, 2.8], armR: [2.4, 2.8 + 0.3 * Math.sin(t * 6)] }); drawKid(EX(c, 2), 930, 1525, t + 1, { s: 0.75, flip: -1 }); ball(860, 1430 - 120 * Math.abs(Math.sin(t * 2.2)), 18, GOLD);
      // up close: Mumma and the child rolling a ball between them
      // up close: Mumma and the child gently tossing a ball between them
      const k = KID(c), mx = 200, kx = 520, y = 1740, sk = ks(k), A = [318, 1450], B = [458, 1588];
      const per = 2.4, ph = (t % per) / per, toKid = Math.floor(t / per) % 2 === 0, fl = clamp((ph - 0.25) / 0.5), u = ease(fl);
      const from = toKid ? A : B, to = toKid ? B : A, bx = lerp(from[0], to[0], u), by = lerp(from[1], to[1], u) - 150 * Math.sin(fl * PI);
      const near = (P, w) => [lerp(P[0] + (P === A ? -24 : 24), bx, w), lerp(P[1] + 30, by, w)];
      const mHold = toKid ? 1 - fl : fl, kHold = toKid ? fl : 1 - fl;
      person(mx, y, 1, AD(c), t, { armL: [0.2, 0.1], armR: reach(mx, y, 1, 1, 1, ...near(A, mHold > 0.5 ? 1 : 0.2), -1) });
      const kh = near(B, kHold > 0.5 ? 1 : 0.2);
      drawKid(k, kx, y + 6, t, { flip: -1, armR: reach(kx, y + 6, sk, -1, 1, kh[0] - 14, kh[1], -1), armL: reach(kx, y + 6, sk, -1, -1, kh[0] + 14, kh[1] + 4, -1) });
      ball(bx, by, 30, CORAL);
      if (t > 1) hearts(360, 1180, t, 1);
      return { adult: adultTop(mx, y), child: kidTop(k, kx, y + 6) };
    } },
    leave: { label: 'Leaving early, waving bye', fn(c, t, p) {
      hall(t); crowd(c, 99, 1, 0.72, 1500);
      const q = ease(clamp((p - 0.15) / 0.85));
      return pair(c, lerp(260, 1250, q), 1720, t, q > 0 && q < 1 ? 1 : 0, { kidWave: true });
    } },
    hook: { label: 'Bag on the hook', fn(c, t) {
      classroom(t); const k = KID(c), kx = 470, ky = 1720, s = ks(k), u = ease(clamp((t - 0.6) / 1.2));
      const hand = [lerp(kx + 70, 480, u), lerp(1560, HOOKS_Y + 6, u)];
      person(800, 1720, 1, AD(c), t, { flip: -1, armR: [0.3, 0.2] });
      drawKid(k, kx, ky, t, { armR: reach(kx, ky, s, 1, 1, hand[0], hand[1], -1), armL: [0.2, 0.1] });
      rr(hand[0] - 26, hand[1] + 4, 52, 66, 12); fill(CORAL); circ(hand[0], hand[1], 20 * s); fill(k.skin);
      return { adult: adultTop(800, 1720), child: kidTop(k, kx, ky) };
    } },
    goodbye: { label: 'Saying goodbye at the door', helper: true, fn(c, t) {
      classroom(t); const k = KID(c), hp = HP(c), kx = 560, tx = 760, y = 1720, s = ks(k);
      const q = ease(clamp((t - 1.8) / 2.2)), ax = lerp(400, 150, q), m = q > 0 && q < 0.98 ? 1 : 0;
      person(ax, y, 1, AD(c), t, { flip: -1, walk: m, armR: t < 1.9 || !m ? wave(t) : [0.2, 0.1] });
      const hx = kx + 90, hy = y - 228;
      person(tx, y, 0.98, hp, t, { flip: -1, armR: reach(tx, y, 0.98, -1, 1, hx, hy) });
      drawKid(k, kx, y + 4, t, { armR: reach(kx, y + 4, s, 1, 1, hx, hy, -1), armL: wave(t, 1) });
      return { adult: adultTop(ax, y), child: kidTop(k, kx, y + 4), helper: adultTop(tx, y, 0.98) };
    } },
    mattime: { label: 'Story time on the mat', helper: true, fn(c, t) {
      classroom(t); const k = KID(c), hp = HP(c);
      rr(60, 1600, 720, 230, 30); fill([0.47, 0.7, 0.83], 0.55); rr(90, 1625, 660, 180, 24); fill([0.99, 0.95, 0.89], 0.5);
      const tx = 900, ty = 1720, bx = 800, by = 1380 + 4 * Math.sin(t * 1.4);
      person(tx, ty, 1, hp, t, { flip: -1, armR: reach(tx, ty, 1, -1, 1, bx - 40, by + 30, -1), armL: reach(tx, ty, 1, -1, -1, bx + 40, by + 30, -1) });
      X.save(); X.translate(bx, by); X.rotate(-0.08); rr(-90, -60, 180, 120, 8); fill(CORAL); rect(-82, -52, 80, 104, [1, 1, 1]); rect(2, -52, 80, 104, [1, 1, 1]); circ(-42, -12, 18); fill(GOLD); line([[20, -20], [62, -20]], 5, [0.6, 0.6, 0.65]); line([[20, 0], [62, 0]], 5, [0.6, 0.6, 0.65]); X.restore();
      sitKid(EX(c, 0), 200, 1700, t + 0.4, { armL: [0.5, 1.2], armR: [0.5, 1.2] }); sitKid(EX(c, 2), 600, 1700, t + 0.9, { armL: [0.5, 1.2], armR: [0.5, 1.2] });
      sitKid(EX(c, 1), 290, 1790, t, { armL: [0.5, 1.2], armR: [0.5, 1.2] }); sitKid(k, 470, 1790, t, { armL: [0.5, 1.2], armR: t % 4 > 2 ? [2.6, 3] : [0.5, 1.2] });
      return { adult: [380, 1100], child: [470, 1470], helper: adultTop(tx, ty) };
    } },
    lunch: { label: 'Lunch with the other kids', fn(c, t) {
      classroom(t); const k = KID(c);
      [[260, EX(c, 0)], [440, k], [620, EX(c, 1)], [800, EX(c, 2)]].forEach(([x, kk], i) => { const s = ks(kk); const bite = kk === k && t % 3 > 1.5; drawKid(kk, x, 1580, t + i * 0.3, { armL: reach(x, 1580, s, 1, -1, x - 40, 1450, -1), armR: bite ? reach(x, 1580, s, 1, 1, x + 20, 1580 - s * 520, -1) : reach(x, 1580, s, 1, 1, x + 40, 1450, -1) }); });
      clothTable(150, 920, 1450, 1720);
      [[260, CORAL], [440, [0.47, 0.7, 0.83]], [620, GOLD], [800, [0.55, 0.78, 0.5]]].forEach(([x, col]) => { rr(x - 50, 1420, 100, 40, 8); fill(col); circ(x - 20, 1418, 12); fill([0.95, 0.55, 0.22]); rr(x + 2, 1406, 30, 16, 6); fill([0.93, 0.85, 0.6]); });
      return { adult: [300, 1000], child: kidTop(k, 440, 1580) };
    } },
    pickup: { label: 'Pick-up: they come back', fn(c, t) {
      classroom(t); const k = KID(c), s = ks(k), y = 1720;
      const q = ease(clamp(t / 1.8)), ax = lerp(120, 400, q), kx = lerp(860, 560, ease(clamp((t - 0.6) / 1.4))), m = q < 0.98 ? 1 : 0, hug = t > 2.1;
      person(ax, y, 1, AD(c), t, { walk: m, armL: hug ? reach(ax, y, 1, 1, -1, kx - 30, y - 240, -1) : [0.2, 0.1], armR: hug ? reach(ax, y, 1, 1, 1, kx + 20, y - 220, -1) : [0.2, 0.1] });
      drawKid(k, kx, y + 4, t, { flip: -1, walk: !hug && t > 0.6 ? 1.3 : 0, speed: 13, armL: hug ? reach(kx, y + 4, s, -1, -1, ax + 40, y - 330) : [2.6, 2.9], armR: hug ? reach(kx, y + 4, s, -1, 1, ax + 70, y - 300) : [2.6, 3.0] });
      if (hug) hearts((ax + kx) / 2, 1150, t - 2.1, 2);
      return { adult: adultTop(ax, y), child: kidTop(k, kx, y + 4) };
    } },
    share: { label: 'Sharing a toy', pair: true, fn(c, t, p, st) {
      lounge(t, c); const k = KID(c), sb = PAL(c, st), kx = 330, sx = 700, y = 1760, sk = ks(k), ss = ks(sb);
      const u = ease(clamp((t - 1) / 1.4)), ty = 1500 - 40 * Math.sin(u * PI), tx = lerp(sx - 110, kx + 100, u);
      drawKid(sb, sx, y, t + 0.5, { flip: -1, armR: reach(sx, y, ss, -1, 1, tx + 20, ty + 30, -1), armL: [0.2, 0.1] });
      drawKid(k, kx, y + 6, t, { armR: u > 0.4 ? reach(kx, y + 6, sk, 1, 1, tx - 20, ty + 34, -1) : [0.6, 0.6], armL: [0.2, 0.1] });
      teddy(tx, ty + 40, 0.9, 0.15 * Math.sin(t * 2));
      if (t > 2.6) hearts(520, 1250, t - 2.6, 1);
      return { adult: [300, 1000], child: kidTop(k, kx, y + 6), sibling: kidTop(sb, sx, y), friend: kidTop(sb, sx, y) };
    } },
    tug: { label: 'Both want the same toy', pair: true, fn(c, t, p, st) {
      lounge(t, c); const k = KID(c), sb = PAL(c, st), kx = 330, sx = 720, y = 1760, sk = ks(k), ss = ks(sb), pull = 26 * Math.sin(t * 4), mx = 525 + pull, my = 1540;
      drawKid(sb, sx, y, t, { flip: -1, smile: false, armR: reach(sx, y, ss, -1, 1, mx + 50, my, -1), armL: reach(sx, y, ss, -1, -1, mx + 70, my + 6, -1) });
      drawKid(k, kx, y + 6, t, { smile: false, armR: reach(kx, y + 6, sk, 1, 1, mx - 50, my, -1), armL: reach(kx, y + 6, sk, 1, -1, mx - 70, my + 6, -1) });
      truck(mx, my + 34, 0.9);
      const [hx1, hy1] = kidTop(k, kx, y + 6), [hx2, hy2] = kidTop(sb, sx, y); cross(hx1, hy1 - 30, t); cross(hx2, hy2 - 30, t + 1);
      return { adult: [300, 1000], child: [hx1, hy1], sibling: [hx2, hy2], friend: [hx2, hy2] };
    } },
    breathe: { label: 'Taking a big breath', fn(c, t) {
      lounge(t, c); const k = KID(c), kx = 520, y = 1760, sk = ks(k), br = 0.5 - 0.5 * Math.cos(t * 1.6), [hx, hy] = kidHeadAt(k, kx, y);
      person(260, y - 10, 1, AD(c), t, { armR: reach(260, y - 10, 1, 1, 1, kx - 40, y - 420 * sk), armL: [0.2, 0.1] });
      drawKid(k, kx, y, t, { eyesClosed: br > 0.5, bob: 6 * br, armL: [0.3 + 1.2 * br, 0.4 + 1.6 * br], armR: [0.3 + 1.2 * br, 0.4 + 1.6 * br] });
      for (let i = 0; i < 3; i++) { const r = 60 + i * 50 + 50 * br; circ(hx, hy - 10, r); X.lineWidth = 5; X.strokeStyle = css([0.47, 0.7, 0.83], 0.35 - i * 0.1); X.stroke(); }
      return { adult: adultTop(260, y - 10), child: kidTop(k, kx, y) };
    } },
    sorry: { label: 'Saying sorry, a hug', pair: true, fn(c, t, p, st) {
      lounge(t, c); const k = KID(c), sb = PAL(c, st), sk = ks(k), ss = ks(sb), y = 1760, kx = 450, sx = 620;
      const ksh = [kx + 30, y - 420 * sk], ssh = [sx - 30, y - 420 * ss];
      drawKid(sb, sx, y, t + 0.3, { flip: -1, armR: reach(sx, y, ss, -1, 1, ksh[0] - 10, ksh[1] + 10), armL: reach(sx, y, ss, -1, -1, ksh[0] + 20, ksh[1] + 30, -1) });
      drawKid(k, kx, y + 6, t, { armR: reach(kx, y + 6, sk, 1, 1, ssh[0] + 10, ssh[1] + 14), armL: reach(kx, y + 6, sk, 1, -1, ssh[0] - 20, ssh[1] + 30, -1) });
      teddy(240, 1780, 0.8);
      hearts(535, 1250, t, 2);
      return { adult: [300, 1000], child: kidTop(k, kx, y + 6), sibling: kidTop(sb, sx, y), friend: kidTop(sb, sx, y) };
    } },
    baby_gentle: { label: 'Gentle with the baby', fn(c, t) {
      ROOMSEL = 0; room(PARK, t, { window: 'day' }); ROOMSEL = null; HATS_OFF = false;
      const ad = AD(c), b = BB(c), mx = 380, my = 1700, h = person(mx, my, 1, ad, t, { armL: [0.25, -1.5], armR: [0.25, -1.5] });
      cradle(c, h, 1, b, t, ad);
      const k = KID(c), kx = 690, ky = 1720, sk = ks(k), stroke = 10 * Math.sin(t * 1.8);
      drawKid(k, kx, ky, t, { flip: -1, armR: reach(kx, ky, sk, -1, 1, 500 + stroke, 1400, -1), armL: [0.2, 0.1] });
      for (let i = 0; i < 3; i++) { const a = 0.5 + 0.5 * Math.sin(t * 3 + i * 2); X.save(); X.globalAlpha = a; X.translate(540 + i * 30, 1300 - i * 40); X.rotate(t + i); X.beginPath(); for (let j = 0; j < 8; j++) { const r = j % 2 ? 6 : 16, aa = j * PI / 4; X.lineTo(Math.cos(aa) * r, Math.sin(aa) * r); } X.closePath(); fill(GOLD); X.restore(); }
      return { adult: adultTop(mx, my), child: kidTop(k, kx, ky) };
    } },
    baby_quiet: { label: 'Quiet while the baby sleeps', fn(c, t) {
      ROOMSEL = 6; room(PARK, t, { window: 'dusk' }); ROOMSEL = null; HATS_OFF = false;
      const b = BB(c), k = KID(c), kx = 300, ky = 1740, sk = ks(k), [hx, hy] = kidHeadAt(k, kx, ky);
      // a bassinet with the baby asleep
      rr(560, 1440, 380, 170, 60); fill([0.95, 0.93, 0.88]); [600, 900].forEach(x => line([[x, 1600], [x - 20 * Math.sign(x - 750), 1740]], 12, [0.62, 0.46, 0.33]));
      ell(740, 1452, 150, 30); fill(b.blanket || '#BFD9EA'); circ(660, 1440, 34); fill(b.skin);
      X.beginPath(); X.arc(660, 1432, 34, PI * 1.05, PI * 1.95); X.lineWidth = 8; X.strokeStyle = css(C(b.hairCol)); X.stroke();
      [-1, 1].forEach(sd => { X.beginPath(); X.arc(660 + sd * 12, 1442, 6, 0.1 * PI, 0.9 * PI); X.lineWidth = 3; X.strokeStyle = css([0.2, 0.15, 0.15]); X.stroke(); });
      for (let i = 0; i < 3; i++) { const q = (t * 0.35 + i / 3) % 1; X.font = `700 ${34 + 8 * i}px Poppins, sans-serif`; X.textAlign = 'left'; X.fillStyle = css([1, 1, 1], Math.sin(q * PI) * 0.85); X.fillText('z', 700 + 26 * i + 30 * q, 1380 - 140 * q); }
      const hh = drawKid(k, kx, ky, t, { armR: reach(kx, ky, sk, 1, 1, hx + 6, hy + 36, -1), armL: [0.2, 0.1] });
      rr(hh.R[0] - 4, hh.R[1] - 34, 9, 34, 4); fill(k.skin); circ(hh.R[0], hh.R[1], 18 * sk); fill(k.skin);
      return { adult: [300, 1000], child: kidTop(k, kx, ky) };
    } },
    // ---- the doctor and the dentist
    waiting: { label: 'In the waiting room', fn(c, t) {
      clinic(t, true); const k = KID(c), ad = AD(c);
      [180, 420, 640].forEach(x => chair(x, 1500, 170, [0.47, 0.7, 0.83]));
      seated(ad, 180, 1500, 1, t, { armR: [0.4, 0.9], armL: [0.2, 0.3] });
      const sk = ks(k), [hx] = kidHeadAt(k, 420, 1500 + 262 * sk);
      seatKid(k, 420, 1500, t, { armL: reach(420, 1500 + 262 * sk, sk, 1, -1, 400, 1440, -1), armR: reach(420, 1500 + 262 * sk, sk, 1, 1, 450, 1440, -1) });
      rr(372, 1400, 96, 70, 6); fill(CORAL); rect(420, 1404, 3, 62, [1, 1, 1], 0.7);
      return { adult: [180, 1500 - 330], child: kidTop(k, 420, 1500 + 262 * sk) };
    } },
    checkup: { label: 'The doctor checks them', helper: true, fn(c, t) {
      clinic(t, false); const k = KID(c), dr = coat(HP(c)), sk = ks(k), kx = 520, seatY = 1440;
      examBed(kx, seatY);
      const ky = seatY + 262 * sk; seatKid(k, kx, seatY, t, { armL: [0.25, 0.15], armR: [0.25, 0.15] });
      const ear = t % 5 > 2.5, [hx, hy, hw] = kidHeadAt(k, kx, ky), chest = [kx - 6, seatY - 120 * sk];
      const target = ear ? [hx + hw + 26, hy] : chest, dx = 790;
      const h = person(dx, 1720, 1, dr, t, { flip: -1, armR: reach(dx, 1720, 1, -1, 1, target[0] + 20, target[1] + 10, -1), armL: [0.2, 0.1] });
      line([[dx - 20, 1290], [dx - 40, 1330], [dx, 1360], [dx + 30, 1330], [dx + 20, 1290]], 5, [0.3, 0.3, 0.34]);
      if (ear) { rr(h.R[0] - 50, h.R[1] - 10, 50, 18, 8); fill([0.2, 0.2, 0.24]); circ(h.R[0] - 52, h.R[1] - 1, 8); fill(GOLD); }
      else { line([[dx, 1360], [h.R[0], h.R[1]]], 5, [0.3, 0.3, 0.34]); circ(h.R[0] - 14, h.R[1], 14); fill([0.75, 0.76, 0.8]); }
      return { adult: [300, 1000], child: kidTop(k, kx, ky), helper: adultTop(dx, 1720) };
    } },
    needle: { label: 'A quick needle', helper: true, fn(c, t) {
      clinic(t, false); const k = KID(c), ad = AD(c), dr = coat(HP(c)), sk = ks(k), kx = 520, seatY = 1440, ky = seatY + 262 * sk;
      examBed(kx, seatY);
      const arm = [kx + 92 * sk, seatY - 150 * sk], done = t > 3.2, close = ease(clamp((t - 1.2) / 0.8)) * (1 - ease(clamp((t - 2.8) / 0.4)));
      person(250, 1720, 1, ad, t, { armR: reach(250, 1720, 1, 1, 1, kx - 80 * sk, seatY - 100 * sk, -1), armL: [0.2, 0.1] });
      seatKid(k, kx, seatY, t, { eyesClosed: t > 1.4 && t < 3, armL: reach(kx, ky, sk, 1, -1, kx - 80 * sk, seatY - 96 * sk, -1), armR: [0.3, 0.2] });
      const dx = 800, nx = lerp(arm[0] + 120, arm[0] + 22, close), ny = arm[1] - 6;
      person(dx, 1720, 1, dr, t, { flip: -1, armR: reach(dx, 1720, 1, -1, 1, nx + 70, ny + 6, -1), armL: [0.2, 0.1] });
      if (!done) { X.save(); X.translate(nx, ny); rr(0, -9, 60, 18, 6); fill([0.95, 0.97, 1]); rect(8, -6, 34, 12, [0.6, 0.85, 0.95]); rect(58, -3, 24, 6, [0.6, 0.6, 0.65]); line([[-26, 0], [0, 0]], 3, [0.7, 0.7, 0.75]); X.restore(); }
      else { X.save(); X.translate(arm[0], arm[1]); X.rotate(0.3); rr(-20, -9, 40, 18, 6); fill([0.95, 0.75, 0.6]); X.restore(); hearts(kx, 1180, t - 3.2, 1); }
      for (let i = 0; i < 3; i++) if (t > 1.2 && t < 3) { const r = 60 + i * 40 + 30 * Math.sin(t * 1.6); const [hx, hy] = kidHeadAt(k, kx, ky); circ(hx, hy, r); X.lineWidth = 4; X.strokeStyle = css([0.47, 0.7, 0.83], 0.3 - i * 0.08); X.stroke(); }
      return { adult: adultTop(250, 1720), child: kidTop(k, kx, ky), helper: adultTop(dx, 1720) };
    } },
    sticker: { label: 'All done, a sticker!', helper: true, fn(c, t) {
      clinic(t, false); const k = KID(c), ad = AD(c), hp = HP(c), pro = c._pro === 'apron' ? apron(hp) : coat(hp), kx = 520, ky = 1720, sk = ks(k);
      person(220, ky, 1, ad, t, clap(220, ky, 1, 1, t));
      drawKid(k, kx, ky, t, { armL: wave(t), armR: [0.3, 0.2] });
      sticker(kx + 4, ky - 330 * sk, 26 * sk / 0.46);
      person(820, ky, 1, pro, t + 1, { flip: -1, armR: [2.4, 2.9 + 0.3 * Math.sin(t * 5)] });
      if (t > 0.8) hearts(kx, 1200, t, 2);
      return { adult: adultTop(220, ky), child: kidTop(k, kx, ky), helper: adultTop(820, ky) };
    } },
    dentist_chair: { label: 'In the big dentist chair', helper: true, fn(c, t) {
      clinic(t, false); const k = KID(c), dn = coat(HP(c)), sk = ks(k), tilt = 0.25 + 0.95 * ease(clamp((t - 0.6) / 1.6));
      line([[560, 700], [560, 820], [460, 900]], 14, [0.7, 0.7, 0.74]); X.beginPath(); X.ellipse(460, 920, 70, 34, -0.3, 0, 2 * PI); fill([0.35, 0.36, 0.4]); ell(460, 935, 54, 18); fill([1, 0.97, 0.8], 0.6 + 0.4 * ease(clamp((t - 2) / 0.4)));
      // the chair leans back with the child in it
      rect(560, 1500, 60, 200, [0.6, 0.6, 0.64]); ell(590, 1700, 140, 20); fill([0.5, 0.5, 0.54]);
      X.save(); X.translate(600, 1500); X.rotate(-tilt); rr(-60, -400, 160, 420, 50); fill([0.3, 0.62, 0.66]); X.restore();
      rr(560, 1460, 360, 70, 30); fill([0.3, 0.62, 0.66]);
      X.save(); X.translate(640, 1480); X.rotate(-tilt); drawKid(k, 0, 0 + 262 * sk - 14, t, { smile: tilt < 1, armL: [0.2, 0.1], armR: [0.2, 0.1] }); X.restore();
      [-1, 1].forEach(sd => { line([[700, 1500], [860, 1490 + sd * 8]], 40 * sk, k.outfit === 'dress' ? k.skin : (k.pants || '#30406E')); ell(870, 1490 + sd * 8, 28 * sk, 12 * sk); fill([0.13, 0.11, 0.1]); });
      const dx = 300; person(dx, 1720, 1, dn, t, { armR: [0.9, 1.3], armL: [0.2, 0.1] }); rect(dx - 34, 1236, 68, 30, [0.7, 0.88, 0.95]);
      return { adult: [300, 1000], child: [640, 1130], helper: adultTop(dx, 1720) };
    } },
    teeth_count: { label: 'Counting teeth with the mirror', helper: true, fn(c, t) {
      clinic(t, false); const k = KID(c), dn = coat(HP(c)), sk = ks(k), tilt = 1.2;
      line([[560, 700], [560, 820], [460, 900]], 14, [0.7, 0.7, 0.74]); X.beginPath(); X.ellipse(460, 920, 70, 34, -0.3, 0, 2 * PI); fill([0.35, 0.36, 0.4]); ell(460, 935, 54, 18); fill([1, 0.97, 0.8]);
      X.save(); X.globalAlpha = 0.18; X.beginPath(); X.moveTo(420, 950); X.lineTo(500, 950); X.lineTo(700, 1350); X.lineTo(330, 1350); X.closePath(); fill([1, 0.97, 0.7]); X.restore();
      rect(560, 1500, 60, 200, [0.6, 0.6, 0.64]); ell(590, 1700, 140, 20); fill([0.5, 0.5, 0.54]);
      X.save(); X.translate(600, 1500); X.rotate(-tilt); rr(-60, -400, 160, 420, 50); fill([0.3, 0.62, 0.66]); X.restore(); rr(560, 1460, 360, 70, 30); fill([0.3, 0.62, 0.66]);
      X.save(); X.translate(640, 1480); X.rotate(-tilt); drawKid(k, 0, 262 * sk - 14, t, { smile: false, armL: [0.2, 0.1], armR: [0.2, 0.1] }); X.restore();
      [-1, 1].forEach(sd => { line([[700, 1500], [860, 1490 + sd * 8]], 40 * sk, k.outfit === 'dress' ? k.skin : (k.pants || '#30406E')); ell(870, 1490 + sd * 8, 28 * sk, 12 * sk); fill([0.13, 0.11, 0.1]); });
      const dx = 330, wig = 8 * Math.sin(t * 4), mouth = [500, 1330];
      const h = person(dx, 1720, 1, dn, t, { armR: reach(dx, 1720, 1, 1, 1, mouth[0] - 40, mouth[1] + 20 + wig, -1), armL: [0.2, 0.1] }); rect(dx - 34, 1236, 68, 30, [0.7, 0.88, 0.95]);
      line([[h.R[0], h.R[1]], [mouth[0] - 6, mouth[1] + wig]], 6, [0.7, 0.72, 0.76]); circ(mouth[0], mouth[1] + wig, 12); fill([0.85, 0.9, 0.95]);
      X.font = '700 46px Poppins, sans-serif'; X.textAlign = 'center'; const n = 1 + Math.floor(t * 1.2) % 10; X.fillStyle = css(NAVY, 0.85); X.fillText(String(n), 760, 1150 - 20 * ((t * 1.2) % 1));
      return { adult: [300, 1000], child: [640, 1130], helper: adultTop(dx, 1720) };
    } },
    // ---- haircuts
    haircut: { label: 'Snip snip at the hairdresser', helper: true, fn(c, t) {
      salon(t); const k = KID(c), hd = apron(HP(c)), sk = ks(k), kx = 540, seatY = 1460, ky = seatY + 262 * sk;
      chair(kx, seatY, 210, [0.2, 0.2, 0.24]); rect(kx - 20, seatY + 30, 40, 220, [0.6, 0.6, 0.64]); ell(kx, 1720, 120, 20); fill([0.5, 0.5, 0.54]);
      seatKid(k, kx, seatY, t, { armL: [0.2, 0.1], armR: [0.2, 0.1] });
      const [hx, hy, hw] = kidHeadAt(k, kx, ky); X.beginPath(); X.moveTo(hx - hw * 0.6, hy + hw * 1.05); X.lineTo(hx + hw * 0.6, hy + hw * 1.05); X.lineTo(kx + 170 * sk / 0.46 * 0.6, seatY + 40); X.lineTo(kx - 170 * sk / 0.46 * 0.6, seatY + 40); X.closePath(); fill([0.47, 0.62, 0.95]);
      const snip = Math.abs(Math.sin(t * 8)), sxp = hx + hw + 30, syp = hy - hw * 0.4 + 10 * Math.sin(t * 1.3);
      person(840, 1720, 1, hd, t, { flip: -1, armR: reach(840, 1720, 1, -1, 1, sxp + 30, syp + 10, -1), armL: [0.2, 0.1] });
      X.save(); X.translate(sxp, syp); [-1, 1].forEach(sd => { X.save(); X.rotate(sd * 0.3 * snip); line([[0, 0], [-46, 0]], 6, [0.75, 0.76, 0.8]); X.restore(); }); circ(10, -8, 9); X.lineWidth = 4; X.strokeStyle = css(CORAL); X.stroke(); circ(10, 8, 9); X.stroke(); X.restore();
      for (let i = 0; i < 6; i++) { const q = (t * 0.6 + i / 6) % 1; line([[hx + 20 + i * 8, hy + 40 + q * 300], [hx + 30 + i * 8, hy + 52 + q * 300]], 4, k.hairCol, 1 - q); }
      X.font = '700 40px Poppins, sans-serif'; X.textAlign = 'center'; X.fillStyle = css(NAVY, 0.6 * snip); X.fillText('snip', sxp + 20, syp - 50);
      return { adult: [300, 1000], child: kidTop(k, kx, ky), helper: adultTop(840, 1720) };
    } },
    clippers: { label: 'The buzzy clippers', helper: true, fn(c, t) {
      salon(t); const k = KID(c), hd = apron(HP(c)), sk = ks(k), kx = 540, seatY = 1460, ky = seatY + 262 * sk;
      chair(kx, seatY, 210, [0.2, 0.2, 0.24]); rect(kx - 20, seatY + 30, 40, 220, [0.6, 0.6, 0.64]); ell(kx, 1720, 120, 20); fill([0.5, 0.5, 0.54]);
      const ad = AD(c); person(220, 1720, 1, ad, t, { armR: [0.3, 0.2], armL: [0.2, 0.1] });
      seatKid(k, kx, seatY, t, { armL: [0.2, 0.1], armR: [0.2, 0.1] });
      const [hx, hy, hw] = kidHeadAt(k, kx, ky); X.beginPath(); X.moveTo(hx - hw * 0.6, hy + hw * 1.05); X.lineTo(hx + hw * 0.6, hy + hw * 1.05); X.lineTo(kx + 100, seatY + 40); X.lineTo(kx - 100, seatY + 40); X.closePath(); fill([0.47, 0.62, 0.95]);
      const bz = 3 * Math.sin(t * 60), cx = hx + hw + 18 + bz, cy = hy + 4;
      person(840, 1720, 1, hd, t, { flip: -1, armR: reach(840, 1720, 1, -1, 1, cx + 40, cy + 20, -1), armL: [0.2, 0.1] });
      rr(cx - 6, cy - 22, 50, 44, 10); fill([0.25, 0.25, 0.28]); rect(cx - 10, cy - 18, 6, 36, [0.8, 0.8, 0.84]);
      for (let i = 0; i < 3; i++) { X.beginPath(); X.arc(cx + 60, cy, 20 + i * 14, -0.6, 0.6); X.lineWidth = 4; X.strokeStyle = css(NAVY, 0.4 - i * 0.1); X.stroke(); }
      X.font = '700 40px Poppins, sans-serif'; X.textAlign = 'center'; X.fillStyle = css(NAVY, 0.5 + 0.3 * Math.sin(t * 10)); X.fillText('bzzz', cx + 80, cy - 50);
      return { adult: adultTop(220, 1720), child: kidTop(k, kx, ky), helper: adultTop(840, 1720) };
    } },
    mirror: { label: 'All done, look in the mirror', helper: true, fn(c, t) {
      salon(t); const k = KID(c), hd = apron(HP(c)), sk = ks(k), kx = 520, ky = 1720;
      person(830, ky, 1, hd, t, { flip: -1, armR: [2.4, 2.9 + 0.3 * Math.sin(t * 5)] });
      const hand = [kx + 110 * sk / 0.46 * 0.5, ky - 400 * sk];
      drawKid(k, kx, ky, t, { armR: reach(kx, ky, sk, 1, 1, hand[0], hand[1], -1), armL: [0.3, 0.2] });
      rr(hand[0] - 8, hand[1] - 70, 16, 70, 6); fill([0.82, 0.68, 0.45]); ell(hand[0], hand[1] - 100, 44, 54); fill([0.82, 0.68, 0.45]); ell(hand[0], hand[1] - 100, 34, 44); fill([0.78, 0.88, 0.94]);
      if (t > 0.8) hearts(kx, 1180, t, 2);
      return { adult: [300, 1000], child: kidTop(k, kx, ky), helper: adultTop(830, ky) };
    } },
    // ---- bedtime
    bath: { label: 'Bath time', fn(c, t) {
      bathroom(t); const k = KID(c), sk = ks(k), kx = 520, rim = 1450;
      X.save(); X.beginPath(); X.rect(0, 0, W, rim); X.clip(); drawKid(k, kx, rim + 220 * sk, t, { armL: [2.2 + 0.3 * Math.sin(t * 3), 2.6], armR: [1.4, 1.6 + 0.4 * Math.sin(t * 4)] }); X.restore();
      rr(180, rim - 20, 700, 260, 80); fill([1, 1, 1]); rect(180, rim - 20, 700, 40, [0.95, 0.96, 0.98]);
      for (let i = 0; i < 14; i++) { const x = 230 + (i * 47) % 600, y = rim - 20 + 6 * Math.sin(t * 2 + i); circ(x, y, 26 + (i % 3) * 8); fill([1, 1, 1], 0.95); circ(x - 6, y - 6, 6); fill([0.8, 0.9, 1], 0.7); }
      const dx = 760 + 20 * Math.sin(t * 1.2); ell(dx, rim - 50, 34, 24); fill(GOLD); circ(dx + 26, rim - 78, 18); fill(GOLD); X.beginPath(); X.moveTo(dx + 40, rim - 80); X.lineTo(dx + 62, rim - 74); X.lineTo(dx + 40, rim - 70); X.closePath(); fill([0.95, 0.55, 0.22]);
      for (let i = 0; i < 4; i++) { const q = (t * 0.4 + i / 4) % 1; circ(300 + i * 140 + 20 * Math.sin(q * 6), rim - 60 - q * 400, 14 + 6 * i % 3); X.lineWidth = 3; X.strokeStyle = css([0.6, 0.8, 0.95], 0.8 * (1 - q)); X.stroke(); }
      return { adult: [300, 1000], child: kidTop(k, kx, rim + 220 * sk) };
    } },
    brushteeth: { label: 'Brushing teeth', fn(c, t) {
      bathroom(t); const k = KID(c), sk = ks(k), kx = 470, ky = 1720;
      rr(330, 760, 300, 300, 20); fill([0.8, 0.68, 0.5]); rr(346, 776, 268, 268, 14); fill([0.78, 0.88, 0.94]);
      rect(300, 1300, 360, 26, [0.97, 0.97, 0.98]); rr(320, 1326, 320, 300, 10); fill([0.9, 0.9, 0.92]); line([[480, 1300], [480, 1250], [520, 1250]], 10, [0.7, 0.7, 0.74]);
      rr(560, 1700, 120, 40, 8); fill(CORAL);
      const [hx, hy] = kidHeadAt(k, kx + 140, ky - 50), bx = hx + 30 + 12 * Math.sin(t * 14), by = hy + 22;
      drawKid(k, kx + 140, ky - 50 + 50, t, { s: 1, armR: reach(kx + 140, ky, sk, 1, 1, bx + 20, by + 6, -1), armL: [0.2, 0.1] });
      line([[bx - 10, by], [bx + 60, by + 6]], 10, [0.47, 0.62, 0.95]); rr(bx - 26, by - 10, 22, 16, 4); fill([1, 1, 1]);
      for (let i = 0; i < 4; i++) { circ(bx - 30 + 14 * Math.sin(t * 5 + i), by - 10 - i * 10, 6); fill([1, 1, 1], 0.8); }
      return { adult: [300, 1000], child: kidTop(k, kx + 140, ky) };
    } },
    sleep: { label: 'Goodnight, lights out', fn(c, t) {
      ROOMSEL = 6; room(PARK, t, { window: 'dusk' }); ROOMSEL = null; HATS_OFF = false;
      const k = KID(c), ad = AD(c), dim = ease(clamp((t - 2.2) / 1.2));
      bed(160, 1470, 560, k, t);
      if (hasPet(c)) pet(PETS(c), 560, 1760, 0.55, t * 0.3, { flip: -1, tongue: false });
      teddy(270, 1460, 0.5, -0.4);
      const q = ease(clamp((t - 0.6) / 1.8)), ax = lerp(820, 1000, q);
      person(ax, 1720, 0.95, ad, t, { flip: -1, walk: q > 0 && q < 1 ? 1 : 0, armR: wave(t) });
      rect(0, 0, W, H, [0.08, 0.08, 0.2], 0.45 * dim);
      const g = X.createRadialGradient(900, 1560, 4, 900, 1560, 220); g.addColorStop(0, css([1, 0.85, 0.5], 0.5 * (0.4 + 0.6 * dim))); g.addColorStop(1, css([1, 0.85, 0.5], 0)); X.fillStyle = g; X.fillRect(680, 1340, 440, 440);
      circ(900, 1560, 22); fill([1, 0.9, 0.6]); rr(880, 1580, 40, 30, 8); fill([0.9, 0.9, 0.92]);
      return { adult: adultTop(ax, 1720, 0.95), child: [280, 1380] };
    } },
    // ---- learning to ride a bike
    helmet: { label: 'Helmet on, click!', fn(c, t) {
      outdoor(PARK, t, 'day'); const k = KID(c), ad = AD(c), sk = ks(k), kx = 470, ky = 1720;
      bike(760, 1720, 0, CORAL, 0);
      person(230, ky, 1, ad, t, { armR: [0.5, 1.0], armL: [0.2, 0.1] });
      const [hx, hy, hw] = kidHeadAt(k, kx, ky), u = ease(clamp((t - 0.6) / 1.2)), lift = (1 - u) * 160;
      drawKid(k, kx, ky, t, { armL: reach(kx, ky, sk, 1, -1, hx - hw * 1.1, hy - lift + 10, -1), armR: reach(kx, ky, sk, 1, 1, hx + hw * 1.1, hy - lift + 10, -1) });
      X.beginPath(); X.arc(hx, hy - hw * 0.15 - lift, hw * 1.18, PI, 2 * PI); X.closePath(); fill([0.47, 0.62, 0.95]); rr(hx - hw * 1.2, hy - hw * 0.22 - lift, hw * 2.4, hw * 0.22, 6); fill([0.36, 0.48, 0.8]);
      if (u >= 1) { line([[hx - hw * 0.9, hy - 4], [hx - hw * 0.5, hy + hw * 0.9], [hx + hw * 0.5, hy + hw * 0.9], [hx + hw * 0.9, hy - 4]], 4, [0.2, 0.2, 0.24]); X.font = '700 40px Poppins, sans-serif'; X.textAlign = 'center'; X.fillStyle = css(NAVY, clamp((t - 1.8) * 2) * (1 - clamp((t - 3) * 2))); X.fillText('click!', hx + 90, hy + 80); }
      return { adult: adultTop(230, ky), child: kidTop(k, kx, ky) };
    } },
    bike_held: { label: 'Riding with a hand on the seat', fn(c, t, p) {
      outdoor(PARK, t, 'day'); const k = KID(c), ad = AD(c), x = lerp(250, 650, ease(p)), wob = 0.03 * Math.sin(t * 3);
      X.save(); X.translate(x, 1740); X.rotate(wob); X.translate(-x, -1740);
      const b = bike(x, 1740, t, CORAL); const head = rider(k, b, t); X.restore();
      const ax = x - 260; person(ax, 1720, 1, ad, t, { walk: 1, armR: reach(ax, 1720, 1, 1, 1, b.seat[0] - 30, b.seat[1] + 20, -1), armL: [0.3, 0.2] });
      return { adult: adultTop(ax, 1720), child: head };
    } },
    bike_wobble: { label: 'Wobbly is OK', fn(c, t, p) {
      outdoor(PARK, t, 'day'); const k = KID(c), x = lerp(300, 700, p), wob = 0.12 * Math.sin(t * 2.4);
      X.save(); X.translate(x, 1740); X.rotate(wob); X.translate(-x, -1740);
      const b = bike(x, 1740, t, CORAL); const head = rider(k, b, t, { smile: true }); X.restore();
      for (let i = 0; i < 3; i++) { X.beginPath(); X.arc(x - 260 - i * 30, 1600, 30 + i * 18, -0.8, 0.8); X.lineWidth = 5; X.strokeStyle = css(NAVY, 0.25 - i * 0.06); X.stroke(); }
      return { adult: [200, 1000], child: head };
    } },
    bike_ride: { label: 'Riding all by themselves!', fn(c, t, p) {
      outdoor(PARK, t, 'day'); const k = KID(c), ad = AD(c), x = lerp(-150, 1250, p);
      person(170, 1690, 0.95, ad, t, clap(170, 1690, 0.95, 1, t));
      if (hasPet(c)) pet(PETS(c), x - 330, 1770, 0.6, t, { walk: 1, speed: 14 });
      const b = bike(x, 1760, t, CORAL); const head = rider(k, b, t);
      line([[x - 200, 1700], [x - 320, 1700]], 6, [1, 1, 1], 0.7); line([[x - 220, 1660], [x - 300, 1660]], 6, [1, 1, 1], 0.5);
      if (p > 0.3) hearts(170, 1120, t, 2);
      return { adult: adultTop(170, 1690, 0.95), child: head };
    } },
    playball: { label: 'Playing with other kids', fn(c, t) {
      hall(t); const k = KID(c);
      person(150, 1520, 0.78, AD(c), t, { armR: [0.4 + 0.2 * Math.sin(t * 2.5), 1] });
      person(330, 1520, 0.78, MUM2, t, { flip: -1, armR: [0.4, 1 + 0.2 * Math.sin(t * 3)] });
      person(960, 1520, 0.78, MUM3, t, { flip: -1 });
      planet(1000, 1600, 26); blocks(820, 1560);
      const q = (t * 0.55) % 1, dir = Math.floor(t * 0.55) % 2, x0 = 380, x1 = 790, bx = dir ? lerp(x1, x0, q) : lerp(x0, x1, q), by = 1560 - 260 * Math.sin(q * PI);
      drawKid(k, 300, 1770, t, { armL: [1.3, 1.1], armR: [1.4, 1.2] });
      drawKid(EX(c, 0), 560, 1780, t, { armL: [2.5, 2.9], armR: [2.5, 2.9] });
      drawKid(EX(c, 1), 860, 1770, t, { flip: -1, armL: [1.3, 1.1], armR: [1.4, 1.2] });
      ball(bx, by, 36, CORAL);
      return { adult: adultTop(150, 1520, 0.78), child: kidTop(k, 300, 1770), friend: kidTop(EX(c, 0), 560, 1780) };
    } },
    cafe: { label: 'At a cafe', place: true, fn(c, t, p, st) {
      shopFront(t, st.place); chairBack(330); chairBack(730);
      const k = KID(c), ad = AD(c), my = 1780, ky = 1545, mx = 340, kx = 720, s = ks(k);
      const hm = person(mx, my, 1, ad, t, { armL: [0.08, 0.04], armR: reach(mx, my, 1, 1, 1, 466, 1392, -1) });
      drawKid(k, kx, ky, t, { flip: -1, armR: reach(kx, ky, s, -1, 1, 650, 1428, -1), armL: reach(kx, ky, s, -1, -1, 790, 1428, -1) });
      clothTable(190, 890, 1430, 1720);
      ell(545, 1440, 66, 14); fill([1, 1, 1]); circ(530, 1426, 22); fill([0.78, 0.55, 0.32]); circ(560, 1430, 18); fill([0.85, 0.62, 0.38]);
      mug(612, 1446, t, 'tea', 0.5);
      holdDrink(hm.R, t, 'coffee', ad);
      return { adult: adultTop(mx, my), child: kidTop(k, kx, ky) };
    } },
    food_look: { label: 'Looking at a new food', fn(c, t) { return foodScene(c, t, 'look'); } },
    food_bite: { label: 'Taking a little bite', fn(c, t) { return foodScene(c, t, 'bite'); } },
    food_ok: { label: 'Proud after trying', fn(c, t) { return foodScene(c, t, 'ok'); } },
    home: { label: 'Walking home', fn(c, t, p) { outdoor(PARK, t, 'sunset', 960 + 60 * p); const q = ease(clamp((p - 0.2) / 0.8)), m = q > 0 && q < 1 ? 1 : 0, h = pair(c, lerp(200, 1300, q), 1690, t, m); if (hasPet(c)) pet(PETS(c), lerp(200, 1300, q) + 330, 1730, 0.7, t, { walk: m }); return h; } },
  };
  // everyday family scenes from the main film builder that also suit kids' stories
  const BORROW = { parkday: 'At the park', familydinner: 'Dinner together', bedtime: 'Bedtime story', schoolrun: 'Walking to school' };
  Object.entries(BORROW).forEach(([key, label]) => {
    SC[key] = { label, fn(c, t, p) { SCENES[key].fn({ world: 'park', me: AD(c), kids: [KID(c)], pets: [] }, t, p); return { adult: [300, 1090], child: [480, 1380] }; } };
  });
  const PLACES = [
    ['Getting there and home', ['goto', 'schoolrun', 'home']],
    ['Playgroup room', ['arrive', 'blocks', 'bounce', 'others', 'hello', 'busy', 'ears', 'mumplay', 'playball', 'leave']],
    ['Kinder or school', ['hook', 'goodbye', 'mattime', 'lunch', 'pickup']],
    ['Brothers, sisters and babies', ['share', 'tug', 'breathe', 'sorry', 'baby_gentle', 'baby_quiet']],
    ['The doctor', ['waiting', 'checkup', 'needle', 'sticker']],
    ['The dentist', ['waiting', 'dentist_chair', 'teeth_count', 'sticker']],
    ['Haircut', ['haircut', 'clippers', 'mirror']],
    ['Bedtime', ['bath', 'brushteeth', 'bedtime', 'sleep']],
    ['Learning to ride a bike', ['helmet', 'bike_held', 'bike_wobble', 'bike_ride']],
    ['Cafe', ['cafe']],
    ['At home', ['food_look', 'food_bite', 'food_ok', 'familydinner']],
    ['Outside', ['parkday']]];
  const PICK = [...new Set(PLACES.flatMap(p => p[1]))];

  // ---- names in the words: {child} and {adult} become the cast's names
  function names(text, c) {
    const sx = c2 => c2.sex || (c2.body === 'm' ? 'm' : 'f'), sn = (SB(c).name || '').trim() || ({ m: 'their brother', f: 'their sister', x: 'their sibling' }[sx(SB(c))]), bn = (BB(c).name || '').trim() || 'the baby';
    const fn0 = ((c.friends && c.friends[0] && c.friends[0].name) || '').trim() || 'their friend';
    text = String(text || '').replace(/\{sibling\}/g, sn).replace(/\{baby\}/g, bn).replace(/\{friend\}/g, fn0);
    const kn = (KID(c).name || '').trim() || 'the child', an = (AD(c).name || '').trim() || ({ m: 'Dad', f: 'Mum', x: 'their grown-up' }[sx(AD(c))]), hn = (HP(c).name || '').trim() || 'a friend';
    return String(text || '').replace(/\{child\}/g, kn).replace(/\{adult\}/g, an).replace(/\{helper\}/g, hn);
  }

  // ---- timing: every step is long enough for its words, or for the voice recorded for it
  const LEAD = 0.5, TAIL = 0.9;
  function stepLen(text, voice) {
    if (voice) return Math.max(3.2, LEAD + voice + TAIL);
    const words = String(text || '').split(/\s+/).filter(Boolean).length;
    return clamp(2.6 + words * 0.32, 4.5, 9);
  }
  // story: { title, titleScene?, steps: [{ id, text, scene, place, say: { who, words }, time }], ending }
  // voices: { [stepId | 'title' | 'end']: seconds }
  function timeline(story, voices = {}) {
    const items = [];
    items.push({ id: 'title', kind: 'title', scene: 'title', text: story.title || '', d: voices.title ? Math.max(5, 1.6 + voices.title + TAIL) : 5, voiceAt: 1.6 });
    (story.steps || []).forEach(st => { if (!(st.text || '').trim() && !st.say) return; items.push({ id: st.id, kind: 'step', scene: SC[st.scene] ? st.scene : 'goto', step: st, text: st.text || '', d: stepLen(st.text, voices[st.id]), voiceAt: LEAD }); });
    items.push({ id: 'end', kind: 'end', scene: SC[story.endScene] ? story.endScene : 'home', text: story.ending || '', d: voices.end ? Math.max(5.5, LEAD + voices.end + 2.6) : 6, voiceAt: LEAD });
    let s = 0; items.forEach(i => { i.start = s; s += i.d; i.voice = voices[i.id] || 0; });
    return { items, total: s };
  }
  function brand(t) {
    const ka = ease((t - 0.2) / 0.8);
    drawLogo(W / 2 - 66, 108, 1.65, ka);
    X.font = 'italic 500 50px Poppins, "Figtree", sans-serif'; X.textAlign = 'center';
    X.shadowColor = 'rgba(40,25,20,0.35)'; X.shadowBlur = 12; X.fillStyle = css([1, 0.97, 0.92], 0.95 * ka);
    X.fillText('Motion Mornings', W / 2, 248); X.shadowBlur = 0;
    const cols = [CORAL, GOLD, [0.55, 0.78, 0.5], [0.47, 0.7, 0.83]];
    X.save(); X.translate(604, 160); X.rotate(-0.38); X.font = '700 58px Poppins, sans-serif'; X.textAlign = 'left'; X.lineJoin = 'round';
    let lx = 0;
    [...'KIDS'].forEach((ch, i) => {
      const k = ease((t - 0.5 - i * 0.12) / 0.35), bob = 5 * Math.sin(t * 3 + i * 1.3), w = X.measureText(ch).width;
      if (k > 0) {
        X.save(); X.translate(lx + w / 2, bob + (1 - k) * 30); X.rotate(i % 2 ? 0.1 : -0.08); X.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); X.globalAlpha = k;
        X.lineWidth = 12; X.strokeStyle = css([1, 0.97, 0.92]); X.strokeText(ch, -w / 2, 0);
        X.shadowColor = 'rgba(40,25,20,0.25)'; X.shadowBlur = 6; X.fillStyle = css(cols[i]); X.fillText(ch, -w / 2, 0);
        X.restore();
      }
      lx += w + 4;
    });
    X.restore();
  }
  function frame(ctx, cast, story, tl, T) {
    X = ctx; T = clamp(T, 0, tl.total - 0.001);
    let i = 0; while (i < tl.items.length - 1 && tl.items[i + 1].start <= T) i++;
    const it = tl.items[i], t = T - it.start, p = clamp(t / it.d), st = it.step || {};
    X.save(); X.fillStyle = css(CREAM); X.fillRect(0, 0, W, H); HATS_OFF = false; ROOMSEL = null;
    let heads = null;
    try { heads = SC[it.scene].fn(cast, t, p, { place: names(st.place || '', cast), with: st.with }); } catch (e) { console.error(e); }
    ROOMSEL = null; X.restore();
    X.save();
    const tm = parseTime(st.time);
    if (tm) clock(700, 790, 120, tm[0], tm[1], tm[2], ease((t - (it.voice ? it.voiceAt : 0.4)) / 0.6));
    if (it.kind === 'step' && !st.glimpse) caption(names(it.text, cast), t);
    else { glimpseCaption(names(it.text, cast), t, 84); if (it.kind === 'title') brand(t); }
    if (st.say && st.say.words && heads) {
      const at = it.voice ? it.voiceAt + Math.min(0.6, it.voice * 0.25) : 1.2;
      bubbleOver(heads[st.say.who] || heads.child, names(st.say.words, cast), ease((t - at) / 0.4), !!tm);
    }
    X.restore();
    if (i > 0) { const a = 1 - ease(t / 0.35); if (a > 0) rect(0, 0, W, H, CREAM, a); }
    const out = clamp((T - (tl.total - 0.9)) / 0.9); if (out > 0) rect(0, 0, W, H, CREAM, ease(out));
  }
  // one still of a scene, for the scene picker
  function still(ctx, cast, key, place, withWho) {
    X = ctx; X.save(); X.fillStyle = css(CREAM); X.fillRect(0, 0, W, H); HATS_OFF = false;
    try { SC[key].fn(cast, 2.4, 0.55, { place: names(place || '', cast), with: withWho }); } catch (e) { console.error(e); }
    ROOMSEL = null; X.restore();
  }
  // a character on their own, for the look editor
  function portraitOf(ctx, w, h, look, kind, t, bare) {
    BARE = !!bare; X = ctx; X.save(); X.clearRect(0, 0, w, h);
    if (!bare) { const g = X.createRadialGradient(w / 2, h * 0.42, 10, w / 2, h * 0.5, w * 0.7); g.addColorStop(0, '#F1F4F7'); g.addColorStop(1, '#D9E0E7'); X.fillStyle = g; X.fillRect(0, 0, w, h); }
    ell(w / 2, h - 34, w * 0.26, 14); fill([0.25, 0.3, 0.38], 0.16);
    const wv = { armR: [0.3 + 0.1 * Math.sin(t * 2), 0.25], armL: [0.2, 0.1] };
    if (kind === 'baby') { const b = Object.assign({}, BABY_DEF, look), sc = (h - 40) / 150; ell(w / 2, h * 0.62, 70 * sc, 30 * sc); fill(b.blanket); baby(w / 2, h * 0.6, sc, b, t); X.restore(); return; }
    if (kind === 'sibling') look = Object.assign({}, SIB_DEF, look), kind = 'child';
    if (kind === 'friend') look = Object.assign({}, FRIEND_DEF, look), kind = 'child';
    if (kind === 'pet') { X.restore(); portrait(ctx, Object.assign({ type: 'dog', coat: '#A14F26', ears: 'floppy' }, look), t, w, h, 'pet'); return; }
    if (kind === 'child') { const k = Object.assign({}, KID_DEF, look), s = (h - 60) / (ks(k) * (470 + 118 * kidHead(k))) * ks(k); drawKid(k, w / 2, h - 34, t, Object.assign({ s: s / ks(k) }, wv)); }
    else { const L = Object.assign({}, kind === 'helper' ? HELPER_DEF : ADULT_DEF, look); person(w / 2, h - 34, (h - 60) / 600, L, t, wv); }
    X.restore();
  }
  // the demo family, a made-up mum and daughter, used on the home and kids pages
  const DEMO_CAST = {
    child: Object.assign({}, KID_DEF, { name: 'Ava', sex: 'f', body: 'f', hair: 'ponytail', hairCol: '#2E2622', skin: '#ECC3A3', top: '#5FA88F', pants: '#30406E', years: 4, age: 'little' }),
    adult: Object.assign({}, ADULT_DEF, { name: 'Mum', sex: 'f', body: 'f', hair: 'long', hairCol: '#2A211C', skin: '#E8BA99', outfit: 'tee', top: '#E9A23B', inner: '#E9A23B', pants: '#30406E', earrings: 'hoops' }),
    helper: Object.assign({}, HELPER_DEF, { name: 'Miss Jo' }),
    siblings: [], friends: [Object.assign({}, FRIEND_DEF, { name: 'Leo', sex: 'm', body: 'm', hair: 'short', hairCol: '#C9A060', skin: '#F2D3BC', top: '#6FA8DC' })],
    pets: [{ type: 'dog', name: 'Biscuit', coat: '#C9A060', ears: 'floppy', size: 'm', muzzle: 'dark' }], baby: {} };
  const DEMOS = {
    playgroup: { label: 'Playgroup', music: 'morning-mood', cast: DEMO_CAST, story: { title: 'Ava Goes to Playgroup', ending: 'Playgroup was fun!', steps: [
      { id: 'd1', scene: 'goto', place: 'Play group', text: 'On Wednesday, Mum and Ava are going to playgroup.' },
      { id: 'd2', scene: 'arrive', text: 'Miss Jo is there to say hello.', say: { who: 'child', words: 'Hi Miss Jo!' } },
      { id: 'd3', scene: 'blocks', text: 'Ava can build a big tower with the blocks.' },
      { id: 'd4', scene: 'others', text: 'Other kids come too. Leo is there!', say: { who: 'friend', words: 'Hi Ava!' } },
      { id: 'd5', scene: 'busy', text: 'Sometimes it gets busy and loud. That\u2019s OK.' },
      { id: 'd6', scene: 'ears', text: 'Ava can hold Mum\u2019s hand until she feels ready.' },
      { id: 'd7', scene: 'playball', text: 'Then Ava and Leo play ball together.' }] } },
    // a different family for the second demo: Dad and his son, with their own song
    doctor: { label: 'The doctor', music: 'italian-andante', cast: Object.assign({}, DEMO_CAST, {
      child: Object.assign({}, KID_DEF, { name: 'Theo', sex: 'm', body: 'm', hair: 'short', hairCol: '#1F1A17', skin: '#D6A27C', outfit: 'hoodie', top: '#F2BC6B', pants: '#30406E', years: 5, age: 'little' }),
      adult: Object.assign({}, ADULT_DEF, { name: 'Dad', sex: 'm', body: 'm', hair: 'fade', hairCol: '#1F1A17', skin: '#C98E66', facial: 'beard', facialCol: '#1F1A17', glasses: 'square', outfit: 'shirt', top: '#3F7FA3', inner: '#EFE8DC', pants: '#2F3A4F' }),
      helper: Object.assign({}, HELPER_DEF, { name: 'Dr Lee' }), friends: [], pets: [] }), story: { title: 'Theo Goes to the Doctor', ending: 'Theo was so brave!', steps: [
      { id: 'e1', scene: 'goto', place: 'Doctor', text: 'Today Dad and Theo are going to see the doctor.' },
      { id: 'e2', scene: 'waiting', text: 'First they wait in the waiting room. There are fish to look at!' },
      { id: 'e3', scene: 'checkup', text: 'Dr Lee listens to Theo\u2019s heart and looks in his ears.', say: { who: 'helper', words: 'Hello Theo!' } },
      { id: 'e4', scene: 'needle', text: 'Sometimes Theo needs a quick needle. He holds Dad\u2019s hand and takes a big breath.' },
      { id: 'e5', scene: 'sticker', text: 'Then it\u2019s all done! Theo might get a sticker.', say: { who: 'child', words: 'I did it!' } }] } } };
  return { SC, PICK, PLACES, SIB_DEF, BABY_DEF, FRIEND_DEF, timeline, frame, still, portraitOf, names, parseTime, KID_DEF, ADULT_DEF, HELPER_DEF, stepLen, DEMOS };
})();
return { W, H, SCENES, portrait, homeWorld, openingText, closingText, DEFAULT_KID, petsOf, PICKABLE, WORLDS: Object.keys(WORLDS), DEFAULT_ME, DEFAULT_PARTNER, timeline, render, drawScene, fillText, petName, KIDS };
})();
