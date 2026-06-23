/**
 * タイプ別シンボル SVG ジェネレータ
 * 16タイプ分のシンボル画像(cards/<id>.svg) と OGP(ogp.svg) を生成する。
 * 実行: node tools/gen-cards.js
 */
const fs = require("fs");
const path = require("path");

const W = 600,
  H = 900;
const CX = 300,
  CY = 392; // 紋章の中心
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "cards");

/* ---------- 小道具 ---------- */
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
// 多角形の点列
function polyStar(cx, cy, spikes, outer, inner, rot = -Math.PI / 2) {
  let pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (Math.PI * i) / spikes;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
}

/* ---------- 配色 ---------- */
const AURA = {
  divine: { bg0: "#241a52", bg1: "#0c0823", accent: "#f4d35e", ray: "#ffe9a8" },
  ominous: { bg0: "#3a0d18", bg1: "#08060b", accent: "#ff3b4e", ray: "#ff7a5c" },
  mystic: { bg0: "#172a5e", bg1: "#070a1f", accent: "#9db4ff", ray: "#bcd0ff" },
};

/* ---------- 背景の光 ---------- */
function rays(aura) {
  const col = AURA[aura].ray;
  let out = `<g opacity="0.16">`;
  if (aura === "ominous") {
    // 禍々しい：中心から伸びる棘
    for (let i = 0; i < 18; i++) {
      const a = (Math.PI * 2 * i) / 18;
      const x1 = CX + Math.cos(a) * 60,
        y1 = CY + Math.sin(a) * 60;
      const x2 = CX + Math.cos(a) * 520,
        y2 = CY + Math.sin(a) * 520;
      const w = 14;
      const px = Math.cos(a + Math.PI / 2) * w,
        py = Math.sin(a + Math.PI / 2) * w;
      out += `<path d="M${x1 + px} ${y1 + py} L${x2} ${y2} L${x1 - px} ${
        y1 - py
      } Z" fill="${col}"/>`;
    }
  } else {
    // 神々しい／神秘：放射状の光
    for (let i = 0; i < 24; i++) {
      const a = (Math.PI * 2 * i) / 24;
      const w = 9;
      const x1 = CX + Math.cos(a) * 40,
        y1 = CY + Math.sin(a) * 40;
      const x2 = CX + Math.cos(a) * 560,
        y2 = CY + Math.sin(a) * 560;
      const px = Math.cos(a + Math.PI / 2) * w,
        py = Math.sin(a + Math.PI / 2) * w;
      out += `<path d="M${x1 + px} ${y1 + py} L${x2} ${y2} L${x1 - px} ${
        y1 - py
      } Z" fill="${col}"/>`;
    }
  }
  return out + `</g>`;
}

function starfield(seed) {
  const rnd = mulberry32(seed);
  let out = `<g>`;
  for (let i = 0; i < 70; i++) {
    const x = 30 + rnd() * (W - 60);
    const y = 30 + rnd() * (H - 60);
    // 中央紋章付近は避ける
    if (Math.hypot(x - CX, y - CY) < 175) continue;
    const r = rnd() * 1.8 + 0.4;
    const o = (rnd() * 0.7 + 0.2).toFixed(2);
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(
      1
    )}" fill="#fff" opacity="${o}"/>`;
  }
  return out + `</g>`;
}

/* ---------- 紋章の周囲（ハロー／棘の輪） ---------- */
function halo(aura, color) {
  const a = AURA[aura];
  if (aura === "ominous") {
    // 棘の輪
    const pts = polyStar(CX, CY, 24, 168, 150);
    let dots = "";
    for (let i = 0; i < 24; i++) {
      const ang = (Math.PI * 2 * i) / 24;
      dots += `<circle cx="${(CX + Math.cos(ang) * 150).toFixed(1)}" cy="${(
        CY +
        Math.sin(ang) * 150
      ).toFixed(1)}" r="2" fill="${a.accent}"/>`;
    }
    return `<polygon points="${pts}" fill="none" stroke="${a.accent}" stroke-width="2" opacity="0.8"/>${dots}`;
  }
  // 神々しい：二重リング＋珠
  let beads = "";
  const n = aura === "mystic" ? 12 : 16;
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n;
    beads += `<circle cx="${(CX + Math.cos(ang) * 158).toFixed(1)}" cy="${(
      CY +
      Math.sin(ang) * 158
    ).toFixed(1)}" r="3.4" fill="${a.accent}"/>`;
  }
  return (
    `<circle cx="${CX}" cy="${CY}" r="158" fill="none" stroke="${a.accent}" stroke-width="1.5" opacity="0.55"/>` +
    `<circle cx="${CX}" cy="${CY}" r="150" fill="none" stroke="${color}" stroke-width="2.5" opacity="0.9"/>` +
    beads
  );
}

/* =========================================================
   紋章（エンブレム）— タイプごとのベクター図像
   いずれも中心 (CX,CY) 周辺に描画
   ========================================================= */
const E = {};

E.heart_bandage = (c, a) => {
  // 自己犠牲：包帯の十字を抱く心臓＋小さな光輪
  const heart = `M300 350 C 282 322, 244 326, 244 360 C 244 392, 286 414, 300 432 C 314 414, 356 392, 356 360 C 356 326, 318 322, 300 350 Z`;
  return `
    <ellipse cx="300" cy="300" rx="46" ry="14" fill="none" stroke="${a}" stroke-width="3" opacity="0.85"/>
    <path d="${heart}" fill="${c}" opacity="0.92"/>
    <path d="${heart}" fill="none" stroke="${a}" stroke-width="2"/>
    <g stroke="#fff" stroke-width="9" stroke-linecap="round" opacity="0.95">
      <line x1="276" y1="372" x2="324" y2="372"/>
      <line x1="300" y1="354" x2="300" y2="392"/>
    </g>`;
};

E.globe = (c, a) => {
  return `
    <circle cx="${CX}" cy="${CY}" r="92" fill="${c}" opacity="0.20"/>
    <circle cx="${CX}" cy="${CY}" r="92" fill="none" stroke="${c}" stroke-width="3"/>
    <ellipse cx="${CX}" cy="${CY}" rx="36" ry="92" fill="none" stroke="${a}" stroke-width="2" opacity="0.8"/>
    <ellipse cx="${CX}" cy="${CY}" rx="74" ry="92" fill="none" stroke="${a}" stroke-width="2" opacity="0.6"/>
    <line x1="208" y1="${CY}" x2="392" y2="${CY}" stroke="${a}" stroke-width="2" opacity="0.8"/>
    <line x1="226" y1="${CY - 52}" x2="374" y2="${CY - 52}" stroke="${a}" stroke-width="1.5" opacity="0.6"/>
    <line x1="226" y1="${CY + 52}" x2="374" y2="${CY + 52}" stroke="${a}" stroke-width="1.5" opacity="0.6"/>
    <g fill="${a}" opacity="0.9">${polyStar ? "" : ""}</g>`;
};

E.shooting_star = (c, a) => {
  const star = polyStar(CX, CY - 18, 5, 64, 26);
  return `
    <g opacity="0.5" stroke="${a}" stroke-width="6" stroke-linecap="round">
      <line x1="${CX - 70}" y1="${CY + 96}" x2="${CX - 18}" y2="${CY + 30}"/>
      <line x1="${CX - 30}" y1="${CY + 104}" x2="${CX + 6}" y2="${CY + 44}"/>
    </g>
    <polygon points="${star}" fill="${c}"/>
    <polygon points="${star}" fill="none" stroke="${a}" stroke-width="2.5"/>
    <polygon points="${polyStar(CX, CY - 18, 5, 30, 12)}" fill="#fff" opacity="0.85"/>`;
};

E.flame_heart = (c, a) => {
  const flame = `M300 296 C 338 344, 350 372, 326 410 C 322 380, 306 372, 308 350
    C 290 372, 276 392, 286 420 C 250 404, 250 360, 286 330
    C 282 352, 296 358, 296 344 C 296 326, 300 312, 300 296 Z`;
  return `
    <path d="M300 470 C 250 430, 234 392, 300 412 C 366 392, 350 430, 300 470 Z" fill="${c}" opacity="0.35"/>
    <path d="${flame}" fill="${c}" opacity="0.95"/>
    <path d="${flame}" fill="none" stroke="${a}" stroke-width="2"/>`;
};

E.skull = (c, a) => {
  return `
    <path d="M236 360 C 236 300, 364 300, 364 360 C 364 398, 344 410, 344 430
      L 256 430 C 256 410, 236 398, 236 360 Z" fill="#e9e4d8"/>
    <path d="M270 430 L270 452 M300 430 L300 456 M330 430 L330 452"
      stroke="#0a0a12" stroke-width="6"/>
    <ellipse cx="272" cy="372" rx="20" ry="24" fill="#0a0a12"/>
    <ellipse cx="328" cy="372" rx="20" ry="24" fill="#0a0a12"/>
    <circle cx="278" cy="368" r="5" fill="${a}"/>
    <circle cx="334" cy="368" r="5" fill="${a}"/>
    <path d="M300 396 L290 416 L310 416 Z" fill="#0a0a12"/>
    <path d="M236 360 C 236 300, 364 300, 364 360" fill="none" stroke="${c}" stroke-width="3" opacity="0.7"/>`;
};

E.prism = (c, a) => {
  const tri = `M300 304 L372 446 L228 446 Z`;
  let beams = "";
  const cols = ["#ff5d73", "#ffd166", "#06d6a0", "#4cc9f0", "#b186ff"];
  cols.forEach((col, i) => {
    const y = 392 + (i - 2) * 16;
    beams += `<line x1="372" y1="430" x2="540" y2="${y}" stroke="${col}" stroke-width="5" opacity="0.85" stroke-linecap="round"/>`;
  });
  return `
    <line x1="80" y1="430" x2="300" y2="430" stroke="#fff" stroke-width="5" opacity="0.8"/>
    ${beams}
    <path d="${tri}" fill="${c}" opacity="0.30"/>
    <path d="${tri}" fill="none" stroke="${a}" stroke-width="3"/>`;
};

E.swords = (c, a) => {
  function sword(rot) {
    return `<g transform="rotate(${rot} ${CX} ${CY})">
      <line x1="${CX}" y1="${CY - 96}" x2="${CX}" y2="${CY + 70}" stroke="#dfe3ea" stroke-width="9"/>
      <polygon points="${CX - 5},${CY - 96} ${CX + 5},${CY - 96} ${CX},${CY - 118}" fill="#dfe3ea"/>
      <line x1="${CX - 26}" y1="${CY + 70}" x2="${CX + 26}" y2="${CY + 70}" stroke="${a}" stroke-width="8"/>
      <line x1="${CX}" y1="${CY + 70}" x2="${CX}" y2="${CY + 96}" stroke="${a}" stroke-width="9"/>
      <circle cx="${CX}" cy="${CY + 100}" r="7" fill="${a}"/>
    </g>`;
  }
  return `
    <circle cx="${CX}" cy="${CY}" r="60" fill="${c}" opacity="0.18"/>
    ${sword(28)}${sword(-28)}
    <path d="M${CX - 8} ${CY - 70} q 8 14 0 28 q -8 -14 0 -28 Z" fill="${a}" opacity="0.9"/>`;
};

E.tower = (c, a) => {
  return `
    <ellipse cx="${CX}" cy="300" rx="40" ry="12" fill="none" stroke="${a}" stroke-width="3" opacity="0.8"/>
    <rect x="262" y="330" width="76" height="150" rx="6" fill="${c}" opacity="0.30" stroke="${c}" stroke-width="3"/>
    <polygon points="256,330 344,330 300,300" fill="${a}" opacity="0.9"/>
    <g fill="${a}" opacity="0.9">
      <rect x="278" y="350" width="14" height="18" rx="3"/>
      <rect x="308" y="350" width="14" height="18" rx="3"/>
      <rect x="278" y="384" width="14" height="18" rx="3"/>
      <rect x="308" y="384" width="14" height="18" rx="3"/>
      <rect x="290" y="430" width="20" height="50" rx="8"/>
    </g>`;
};

E.house_heart = (c, a) => {
  return `
    <polygon points="300,300 380,366 220,366" fill="${a}" opacity="0.9"/>
    <rect x="244" y="366" width="112" height="112" rx="6" fill="${c}" opacity="0.28" stroke="${c}" stroke-width="3"/>
    <path d="M300 404 C 290 392, 270 396, 270 414 C 270 430, 294 442, 300 450
      C 306 442, 330 430, 330 414 C 330 396, 310 392, 300 404 Z" fill="${a}"/>
    <rect x="286" y="452" width="28" height="26" fill="${a}" opacity="0.5"/>`;
};

E.wolf = (c, a) => {
  return `
    <circle cx="${CX}" cy="${CY - 6}" r="96" fill="none" stroke="${a}" stroke-width="2" opacity="0.5"/>
    <path d="M300 470
      L246 410 L232 332 L276 360 L300 348 L324 360 L368 332 L354 410 Z"
      fill="#11131c" stroke="${c}" stroke-width="3"/>
    <polygon points="246,410 232,332 276,360" fill="${c}" opacity="0.5"/>
    <polygon points="354,410 368,332 324,360" fill="${c}" opacity="0.5"/>
    <path d="M276 392 l14 8 l10 -6 l10 6 l14 -8" fill="none" stroke="${a}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="283" cy="384" r="6" fill="${a}"/>
    <circle cx="317" cy="384" r="6" fill="${a}"/>
    <polygon points="300,430 292,418 308,418" fill="${a}"/>`;
};

E.void = (c, a) => {
  let rings = "";
  for (let i = 0; i < 5; i++) {
    const r = 150 - i * 12;
    rings += `<ellipse cx="${CX}" cy="${CY}" rx="${r}" ry="${(r * 0.42).toFixed(
      0
    )}" fill="none" stroke="${i % 2 ? a : c}" stroke-width="${(5 - i * 0.6).toFixed(
      1
    )}" opacity="${(0.85 - i * 0.12).toFixed(2)}"/>`;
  }
  return `
    <g transform="rotate(-20 ${CX} ${CY})">${rings}</g>
    <circle cx="${CX}" cy="${CY}" r="58" fill="#000"/>
    <circle cx="${CX}" cy="${CY}" r="58" fill="none" stroke="${a}" stroke-width="2.5"/>
    <circle cx="${CX}" cy="${CY}" r="70" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.6"/>`;
};

E.burst = (c, a) => {
  const s1 = polyStar(CX, CY, 12, 150, 40);
  const s2 = polyStar(CX, CY, 8, 110, 30, 0);
  return `
    <polygon points="${s1}" fill="${c}" opacity="0.35"/>
    <polygon points="${s2}" fill="${a}" opacity="0.55"/>
    <circle cx="${CX}" cy="${CY}" r="46" fill="#fff"/>
    <circle cx="${CX}" cy="${CY}" r="64" fill="none" stroke="#fff" stroke-width="2" opacity="0.7"/>
    <circle cx="${CX}" cy="${CY}" r="46" fill="none" stroke="${a}" stroke-width="3"/>`;
};

E.mountain = (c, a) => {
  return `
    <circle cx="${CX}" cy="318" r="30" fill="none" stroke="${a}" stroke-width="3" opacity="0.85"/>
    <path d="M210 470 L300 320 L390 470 Z" fill="${c}" opacity="0.30" stroke="${c}" stroke-width="3"/>
    <path d="M270 372 L300 320 L330 372 L312 384 L300 372 L288 384 Z" fill="#fff" opacity="0.85"/>
    <path d="M252 470 q 20 -40 48 -30 q 28 10 48 30" fill="none" stroke="${a}" stroke-width="3" stroke-dasharray="6 7" opacity="0.9"/>`;
};

E.crown = (c, a) => {
  return `
    <path d="M232 446 L232 372 L272 410 L300 350 L328 410 L368 372 L368 446 Z"
      fill="${c}" opacity="0.35" stroke="${a}" stroke-width="3.5" stroke-linejoin="round"/>
    <rect x="232" y="446" width="136" height="20" rx="5" fill="${a}"/>
    <circle cx="232" cy="368" r="9" fill="${a}"/>
    <circle cx="368" cy="368" r="9" fill="${a}"/>
    <circle cx="300" cy="344" r="10" fill="#fff"/>
    <circle cx="272" cy="426" r="6" fill="#fff" opacity="0.9"/>
    <circle cx="328" cy="426" r="6" fill="#fff" opacity="0.9"/>`;
};

E.tree = (c, a) => {
  return `
    <circle cx="${CX}" cy="372" r="86" fill="${c}" opacity="0.22"/>
    <path d="M300 470 L300 360" stroke="${a}" stroke-width="8" stroke-linecap="round"/>
    <path d="M300 392 L262 360 M300 392 L338 360 M300 416 L274 396 M300 416 L326 396"
      stroke="${a}" stroke-width="5" stroke-linecap="round"/>
    <path d="M300 300 C 340 330, 356 360, 332 392 C 360 380, 360 350, 340 332
      C 360 340, 366 364, 348 388 C 384 372, 372 326, 320 312
      C 300 304, 300 300, 300 300 Z" fill="${c}" opacity="0.8"/>
    <path d="M300 300 C 260 330, 244 360, 268 392 C 240 380, 240 350, 260 332
      C 240 340, 234 364, 252 388 C 216 372, 228 326, 280 312
      C 300 304, 300 300, 300 300 Z" fill="${c}" opacity="0.8"/>
    <g fill="#fff">
      <circle cx="276" cy="350" r="2.5"/><circle cx="322" cy="362" r="2.5"/>
      <circle cx="300" cy="338" r="3"/><circle cx="312" cy="384" r="2"/>
    </g>`;
};

E.clock = (c, a) => {
  let ticks = "";
  for (let i = 0; i < 12; i++) {
    const ang = (Math.PI * 2 * i) / 12 - Math.PI / 2;
    const x1 = CX + Math.cos(ang) * 86,
      y1 = CY + Math.sin(ang) * 86;
    const x2 = CX + Math.cos(ang) * 98,
      y2 = CY + Math.sin(ang) * 98;
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(
      1
    )}" y2="${y2.toFixed(1)}" stroke="${a}" stroke-width="3"/>`;
  }
  return `
    <ellipse cx="${CX}" cy="${CY}" rx="150" ry="92" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.5" transform="rotate(18 ${CX} ${CY})"/>
    <circle cx="${CX}" cy="${CY}" r="98" fill="${c}" opacity="0.18"/>
    <circle cx="${CX}" cy="${CY}" r="98" fill="none" stroke="${a}" stroke-width="3"/>
    ${ticks}
    <line x1="${CX}" y1="${CY}" x2="${CX + 6}" y2="${CY - 56}" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    <line x1="${CX}" y1="${CY}" x2="${CX + 52}" y2="${CY + 18}" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
    <circle cx="${CX}" cy="${CY}" r="8" fill="${a}"/>
    <circle cx="${CX + 118}" cy="${CY - 40}" r="9" fill="${a}" opacity="0.9"/>`;
};

// 無休労働理想主義者：休まず昇り続ける太陽（労働の理想郷）
E.sun = (c, a) => {
  let beams = "";
  for (let i = 0; i < 16; i++) {
    const ang = (Math.PI * 2 * i) / 16;
    const x1 = CX + Math.cos(ang) * 70,
      y1 = CY + Math.sin(ang) * 70;
    const len = i % 2 ? 130 : 112;
    const x2 = CX + Math.cos(ang) * len,
      y2 = CY + Math.sin(ang) * len;
    beams += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(
      1
    )}" y2="${y2.toFixed(1)}" stroke="${a}" stroke-width="${
      i % 2 ? 4 : 6
    }" stroke-linecap="round"/>`;
  }
  return `
    ${beams}
    <circle cx="${CX}" cy="${CY}" r="62" fill="${c}" opacity="0.9"/>
    <circle cx="${CX}" cy="${CY}" r="62" fill="none" stroke="${a}" stroke-width="3"/>
    <circle cx="${CX}" cy="${CY}" r="44" fill="#fff" opacity="0.85"/>`;
};

// 復讐：すべてを焼き尽くす炎
E.flame = (c, a) => {
  const flame = `M300 298 C 348 358, 360 396, 332 450 C 326 414, 308 406, 312 378
    C 286 406, 268 434, 282 468 C 236 446, 236 388, 282 348
    C 276 380, 296 388, 296 366 C 296 340, 300 318, 300 298 Z`;
  const inner = `M300 360 C 322 392, 328 418, 308 448 C 304 422, 296 416, 298 396
    C 286 414, 282 432, 292 452 C 270 436, 272 406, 298 386 Z`;
  return `
    <path d="${flame}" fill="${c}" opacity="0.95"/>
    <path d="${flame}" fill="none" stroke="${a}" stroke-width="2.5"/>
    <path d="${inner}" fill="#fff" opacity="0.5"/>`;
};

// 企業戦士：ビルと剣
E.corp_warrior = (c, a) => {
  return `
    <rect x="262" y="332" width="76" height="150" rx="4" fill="${c}" opacity="0.30" stroke="${c}" stroke-width="3"/>
    <polygon points="258,332 342,332 300,304" fill="${a}" opacity="0.9"/>
    <g fill="${a}" opacity="0.85">
      <rect x="276" y="350" width="12" height="16" rx="2"/><rect x="312" y="350" width="12" height="16" rx="2"/>
      <rect x="276" y="380" width="12" height="16" rx="2"/><rect x="312" y="380" width="12" height="16" rx="2"/>
      <rect x="276" y="410" width="12" height="16" rx="2"/><rect x="312" y="410" width="12" height="16" rx="2"/>
    </g>
    <line x1="${CX}" y1="298" x2="${CX}" y2="478" stroke="#dfe3ea" stroke-width="9"/>
    <polygon points="${CX - 5},298 ${CX + 5},298 ${CX},276" fill="#dfe3ea"/>
    <line x1="${CX - 30}" y1="446" x2="${CX + 30}" y2="446" stroke="${a}" stroke-width="9"/>
    <circle cx="${CX}" cy="486" r="8" fill="${a}"/>`;
};

// アウトロー：禁止スラッシュをかけた時計（法定労働時間・記録を無視）
E.no_clock = (c, a) => {
  let ticks = "";
  for (let i = 0; i < 12; i++) {
    const ang = (Math.PI * 2 * i) / 12 - Math.PI / 2;
    const x1 = CX + Math.cos(ang) * 72,
      y1 = CY + Math.sin(ang) * 72;
    const x2 = CX + Math.cos(ang) * 84,
      y2 = CY + Math.sin(ang) * 84;
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(
      1
    )}" y2="${y2.toFixed(1)}" stroke="${a}" stroke-width="3"/>`;
  }
  return `
    <circle cx="${CX}" cy="${CY}" r="84" fill="${c}" opacity="0.18"/>
    <circle cx="${CX}" cy="${CY}" r="84" fill="none" stroke="${a}" stroke-width="3"/>
    ${ticks}
    <line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - 46}" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    <line x1="${CX}" y1="${CY}" x2="${CX + 40}" y2="${CY + 16}" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
    <circle cx="${CX}" cy="${CY}" r="7" fill="${a}"/>
    <circle cx="${CX}" cy="${CY}" r="116" fill="none" stroke="#ff3b4e" stroke-width="12" opacity="0.92"/>
    <line x1="${CX - 82}" y1="${CY - 82}" x2="${CX + 82}" y2="${CY + 82}" stroke="#ff3b4e" stroke-width="12" opacity="0.92" stroke-linecap="round"/>`;
};

/* ---------- タイプ定義（順序は TYPE_ORDER と一致） ---------- */
const CARDS = [
  { id: "sacrifice", name: "自己犠牲タイプ", sub: "THE MARTYR", color: "#7da2ff", aura: "divine", emblem: "heart_bandage", roman: "I" },
  { id: "service", name: "社会奉仕タイプ", sub: "THE SERVANT", color: "#3fe0a0", aura: "divine", emblem: "globe", roman: "II" },
  { id: "dream", name: "無休労働理想主義者タイプ", sub: "THE UTOPIAN", color: "#ffc24b", aura: "divine", emblem: "sun", roman: "III" },
  { id: "lover", name: "ガチ恋タイプ", sub: "THE DEVOTEE", color: "#ff77ab", aura: "ominous", emblem: "flame_heart", roman: "IV" },
  { id: "doom", name: "破滅タイプ", sub: "RUIN", color: "#b478ff", aura: "ominous", emblem: "skull", roman: "V" },
  { id: "expression", name: "自己表現タイプ", sub: "THE ARTIST", color: "#3fd3e0", aura: "mystic", emblem: "prism", roman: "VI" },
  { id: "revenge", name: "復讐タイプ", sub: "VENGEANCE", color: "#ff5b53", aura: "ominous", emblem: "flame", roman: "VII" },
  { id: "companylove", name: "企業戦士タイプ", sub: "THE CORPORATE SOLDIER", color: "#5b91ff", aura: "divine", emblem: "corp_warrior", roman: "VIII" },
  { id: "familylove", name: "家族愛タイプ", sub: "THE GUARDIAN", color: "#ffa05b", aura: "divine", emblem: "house_heart", roman: "IX" },
  { id: "lonewolf", name: "一匹狼タイプ", sub: "THE LONE WOLF", color: "#8aa0bd", aura: "ominous", emblem: "wolf", roman: "X" },
  { id: "blackhole", name: "ブラックホールタイプ", sub: "THE VOID", color: "#9b8cff", aura: "ominous", emblem: "void", roman: "XI" },
  { id: "whitehole", name: "ホワイトホールタイプ", sub: "RADIANCE", color: "#c9c2ff", aura: "divine", emblem: "burst", roman: "XII" },
  { id: "seeker", name: "求道者タイプ", sub: "THE SEEKER", color: "#c2a37a", aura: "mystic", emblem: "mountain", roman: "XIII" },
  { id: "king", name: "王タイプ", sub: "THE KING", color: "#ffd54a", aura: "divine", emblem: "crown", roman: "XIV" },
  { id: "elf", name: "エルフタイプ", sub: "THE ELF", color: "#52d98a", aura: "mystic", emblem: "tree", roman: "XV" },
  { id: "timetraveler", name: "アウトロータイプ", sub: "THE OUTLAW", color: "#7b7bff", aura: "mystic", emblem: "no_clock", roman: "XVI" },
];

const FONT =
  "'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic',Meiryo,IPAGothic,sans-serif";

function cornerOrnament(x, y, accent) {
  return `<g transform="translate(${x} ${y})" fill="${accent}">
    <polygon points="0,-9 9,0 0,9 -9,0"/>
    <circle cx="0" cy="0" r="2.5" fill="#0c0823"/>
  </g>`;
}

// 大地（地平線）— 絵画的な接地
function ground(aura, color) {
  const a = AURA[aura];
  const top = "#0a0716";
  return `
    <path d="M0 760 Q 300 700 600 760 L600 900 L0 900 Z" fill="${top}"/>
    <path d="M0 760 Q 300 700 600 760" fill="none" stroke="${a.accent}" stroke-width="2" opacity="0.45"/>
    <path d="M0 812 Q 300 768 600 812 L600 900 L0 900 Z" fill="#000" opacity="0.35"/>
    <g fill="${color}" opacity="0.3">
      <circle cx="120" cy="792" r="3"/><circle cx="300" cy="772" r="3"/><circle cx="470" cy="792" r="3"/>
    </g>`;
}

// 天空の象徴（神々しい=太陽光輪／禍々しい=血の月／神秘=月と環）
function celestial(aura, color) {
  const a = AURA[aura];
  if (aura === "ominous") {
    return `<g opacity="0.9">
      <circle cx="${CX}" cy="${CY}" r="172" fill="#1a0710"/>
      <circle cx="${CX}" cy="${CY}" r="172" fill="${color}" opacity="0.16"/>
      <circle cx="${CX}" cy="${CY}" r="172" fill="none" stroke="${a.accent}" stroke-width="2" opacity="0.55"/>
    </g>`;
  }
  if (aura === "mystic") {
    return `<g opacity="0.95">
      <circle cx="${CX}" cy="${CY}" r="176" fill="#0a1030"/>
      <ellipse cx="${CX}" cy="${CY}" rx="210" ry="176" fill="none" stroke="${a.accent}" stroke-width="1.5" opacity="0.4" transform="rotate(20 ${CX} ${CY})"/>
      <circle cx="${CX}" cy="${CY}" r="176" fill="none" stroke="${a.accent}" stroke-width="1.5" opacity="0.5"/>
    </g>`;
  }
  // divine: 後光
  return `<g opacity="0.95">
    <circle cx="${CX}" cy="${CY}" r="176" fill="#140f33"/>
    <circle cx="${CX}" cy="${CY}" r="176" fill="${color}" opacity="0.12"/>
    <circle cx="${CX}" cy="${CY}" r="176" fill="none" stroke="${a.accent}" stroke-width="2" opacity="0.5"/>
    <circle cx="${CX}" cy="${CY}" r="188" fill="none" stroke="${a.accent}" stroke-width="1" opacity="0.3"/>
  </g>`;
}

function card(cfg) {
  const a = AURA[cfg.aura];
  const seed = hash(cfg.id);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="78%">
      <stop offset="0%" stop-color="${a.bg0}"/>
      <stop offset="100%" stop-color="${a.bg1}"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${cfg.color}" stop-opacity="0.6"/>
      <stop offset="55%" stop-color="${cfg.color}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${cfg.color}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig" cx="50%" cy="46%" r="72%">
      <stop offset="62%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${starfield(seed)}
  ${rays(cfg.aura)}
  <circle cx="${CX}" cy="${CY}" r="230" fill="url(#glow)"/>
  ${celestial(cfg.aura, cfg.color)}
  ${ground(cfg.aura, cfg.color)}

  <!-- 象徴のイラスト（大きめに） -->
  <g transform="translate(${CX} ${CY}) scale(1.42) translate(${-CX} ${-CY})">
    ${E[cfg.emblem](cfg.color, a.accent)}
  </g>

  <rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`;
}

/* ---------- 出力 ---------- */
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
CARDS.forEach((cfg) => {
  fs.writeFileSync(path.join(OUT, cfg.id + ".svg"), card(cfg).trim());
});
console.log("cards written:", CARDS.length);

/* ---------- OGP (1200x630) ---------- */
// スタート画面（暗い背景＋白いカード）を模したデザイン。
function ogp() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" font-family="IPAGothic">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.25" y2="1">
      <stop offset="0%" stop-color="#0f1226"/>
      <stop offset="100%" stop-color="#1a1d3a"/>
    </linearGradient>
    <radialGradient id="pink" cx="78%" cy="2%" r="62%">
      <stop offset="0%" stop-color="#e0518a" stop-opacity="0.42"/>
      <stop offset="60%" stop-color="#e0518a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orange" cx="-2%" cy="104%" r="62%">
      <stop offset="0%" stop-color="#f5a623" stop-opacity="0.34"/>
      <stop offset="60%" stop-color="#f5a623" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e0518a"/>
      <stop offset="100%" stop-color="#f5a623"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="22" stdDeviation="32" flood-color="#070a22" flood-opacity="0.55"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#pink)"/>
  <rect width="1200" height="630" fill="url(#orange)"/>

  <rect x="160" y="70" width="880" height="490" rx="40" fill="#ffffff" filter="url(#shadow)"/>

  <rect x="448" y="138" width="304" height="48" rx="24" fill="#e0518a" fill-opacity="0.12"/>
  <text x="600" y="170" text-anchor="middle" font-size="22" fill="#e0518a" letter-spacing="6">WORK STYLE TYPE</text>

  <text x="504" y="332" text-anchor="middle" font-size="96" fill="#1d2030" stroke="#1d2030" stroke-width="2">長時間労働</text>
  <text x="840" y="332" text-anchor="middle" font-size="96" fill="url(#titleGrad)" stroke="url(#titleGrad)" stroke-width="2">診断</text>

  <text x="600" y="410" text-anchor="middle" font-size="33" fill="#5b6075">あなたはどの「長時間労働タイプ」？</text>

  <rect x="430" y="458" width="340" height="68" rx="34" fill="url(#titleGrad)"/>
  <text x="600" y="502" text-anchor="middle" font-size="30" fill="#ffffff" letter-spacing="2">診断をはじめる</text>
</svg>`;
}
fs.writeFileSync(path.join(ROOT, "ogp.svg"), ogp().trim());
console.log("ogp.svg written");
