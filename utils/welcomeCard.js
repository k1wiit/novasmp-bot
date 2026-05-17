const { createCanvas, loadImage } = require('@napi-rs/canvas');

// ── Palette ──────────────────────
const THEME = {
  bgDeep:     '#00020a',
  bgMid:      '#010510',
  galaxyBlue: '#2a3f5c',
  galaxyGrey: '#1a2c42',
  dustBrown:  '#3d2810',
  dustDark:   '#1e1208',
  coreWarm:   '#e8c4b0',
  corePink:   '#c48070',
  coreGlow:   '#f0d4c0',
  novaWhite:  '#dce8ff',
  novaBlue:   '#90b8e8',
  novaCore:   '#ffffff',
  panelBg:    '#00020c',
  panelBorder:'#1a2c42',
  panelAccent:'#4a6a94',
  labelColor:    '#7a9bb8',
  titleColor:    '#dce8f5',
  nameColor:     '#ffffff',
  subtitleColor: '#3d5570',
  badgeBg:       '#020818',
  badgeBorder:   '#1e3050',
  badgeText:     '#7a9bb8',
  avatarFill:    '#000814',
  avatarRing:    '#3a5878',
  avatarInner:   '#1a2c42',
  underline:     '#3a5878',
  underlineGlow: '#2a4060',
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function blurCircle(ctx, x, y, r, color, alpha, blur) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateStars(count, w, h, seed) {
  const rand = seededRand(seed);
  const stars = [];
  const palette = [
    '#ffffff', '#ffffff', '#ffffff',
    '#dce8ff', '#dce8ff',
    '#c8d8f0',
    '#f0e8d8',
  ];
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const size = 0.2 + rand() * 1.1;
    const alpha = 0.15 + rand() * 0.70;
    const color = palette[Math.floor(rand() * palette.length)];
    stars.push({ x, y, size, alpha, color });
  }
  return stars;
}

function drawDiffractionSpikes(ctx, x, y, length, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.5;
  ctx.filter = 'blur(0.5px)';
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const grad = ctx.createLinearGradient(x, y, x + dx*length, y + dy*length);
    grad.addColorStop(0,   rgba(color, 0.9));
    grad.addColorStop(0.4, rgba(color, 0.4));
    grad.addColorStop(1,   rgba(color, 0));
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx * length, y + dy * length);
    ctx.stroke();
  }
  ctx.restore();
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '...').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '...';
}

function drawGalaxy(ctx, cx, cy) {
  const T = THEME;

  blurCircle(ctx, cx, cy, 380, T.galaxyBlue, 0.12, 60);
  blurCircle(ctx, cx, cy, 260, T.galaxyBlue, 0.18, 40);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.42);

  // Aeussere Scheibe
  ctx.save();
  ctx.scale(1, 0.28);
  const diskOuter = ctx.createRadialGradient(0, 0, 0, 0, 0, 320);
  diskOuter.addColorStop(0,   rgba(T.galaxyBlue, 0.0));
  diskOuter.addColorStop(0.3, rgba(T.galaxyBlue, 0.55));
  diskOuter.addColorStop(0.7, rgba(T.galaxyGrey, 0.35));
  diskOuter.addColorStop(1,   rgba(T.galaxyGrey, 0.0));
  ctx.filter = 'blur(6px)';
  ctx.fillStyle = diskOuter;
  ctx.beginPath();
  ctx.arc(0, 0, 320, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Spiralarme
  ctx.save();
  ctx.scale(1, 0.28);
  ctx.filter = 'blur(8px)';
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle = T.galaxyBlue;
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.arc(0, 0, 240, 0, Math.PI);
  ctx.stroke();
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.arc(0, 0, 200, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Kern: warmes Rosa-Weiss
  ctx.save();
  ctx.scale(1, 0.55);
  ctx.filter = 'blur(16px)';
  ctx.globalAlpha = 0.55;
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
  coreGrad.addColorStop(0,   T.coreGlow);
  coreGrad.addColorStop(0.4, rgba(T.corePink, 0.6));
  coreGrad.addColorStop(1,   rgba(T.corePink, 0));
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.scale(1, 0.55);
  ctx.filter = 'blur(4px)';
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = T.coreWarm;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();

  // Supernova unten-links
  const SNX = cx - 108, SNY = cy + 158;
  blurCircle(ctx, SNX, SNY, 28, T.novaBlue,  0.35, 16);
  blurCircle(ctx, SNX, SNY, 14, T.novaWhite, 0.55,  7);
  blurCircle(ctx, SNX, SNY,  5, T.novaCore,  0.90,  2);
  ctx.fillStyle = T.novaCore;
  ctx.beginPath();
  ctx.arc(SNX, SNY, 2.5, 0, Math.PI * 2);
  ctx.fill();
  drawDiffractionSpikes(ctx, SNX, SNY, 38, T.novaWhite, 0.75);
}

async function createWelcomeCard(user, memberCount) {
  const W = 1360, H = 560;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const T = THEME;

  roundRect(ctx, 0, 0, W, H, 28);
  ctx.clip();

  // Hintergrund
  const bgGrad = ctx.createRadialGradient(340, H * 0.45, 0, W * 0.5, H * 0.5, W * 0.75);
  bgGrad.addColorStop(0,   T.bgMid);
  bgGrad.addColorStop(0.5, T.bgDeep);
  bgGrad.addColorStop(1,   '#000002');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Sterne
  const stars = generateStars(700, W, H, 137);
  for (const s of stars) {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const brightStars = [
    { x: 560, y: 72  }, { x: 1050, y: 180 }, { x: 1240, y: 95  },
    { x: 870, y: 450 }, { x: 1160, y: 370 }, { x: 990,  y: 280 },
    { x: 710, y: 42  }, { x: 1310, y: 330 }, { x: 430,  y: 490 },
  ];
  for (const s of brightStars) {
    blurCircle(ctx, s.x, s.y, 4, T.novaWhite, 0.22, 3);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Galaxie
  drawGalaxy(ctx, 270, 275);

  // Avatar
  const AX = 270, AY = 275, AR = 140;
  blurCircle(ctx, AX, AY, AR + 30, T.avatarRing, 0.18, 12);
  blurCircle(ctx, AX, AY, AR + 10, T.galaxyBlue, 0.12,  6);

  ctx.save();
  ctx.strokeStyle = T.avatarRing;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.65;
  ctx.beginPath(); ctx.arc(AX, AY, AR, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = rgba(T.avatarInner, 0.5);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.45;
  ctx.beginPath(); ctx.arc(AX, AY, AR - 6, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(AX, AY, AR - 3, 0, Math.PI * 2);
  ctx.fillStyle = T.avatarFill;
  ctx.fill();
  ctx.clip();
  try {
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 512 }));
    ctx.drawImage(avatar, AX - (AR - 3), AY - (AR - 3), (AR - 3) * 2, (AR - 3) * 2);
  } catch {
    ctx.font = 'bold 80px Georgia, serif';
    ctx.fillStyle = T.avatarRing;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const name = user.displayName || user.globalName || user.username || '?';
    ctx.fillText(name.charAt(0).toUpperCase(), AX, AY);
  }
  ctx.restore();

  // Panel
  const PX = 488, PY = 58, PW = 840, PH = 462;

  ctx.save();
  ctx.globalAlpha = 0.70;
  ctx.fillStyle = T.panelBg;
  roundRect(ctx, PX, PY, PW, PH, 20);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = T.panelBorder;
  ctx.lineWidth = 1.2;
  roundRect(ctx, PX, PY, PW, PH, 20);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.60;
  ctx.fillStyle = T.panelAccent;
  roundRect(ctx, PX, PY + 14, 4, PH - 28, 2);
  ctx.fill();
  ctx.restore();

  const TX = PX + 48;

  ctx.save();
  ctx.font = '400 19px Georgia, serif';
  ctx.fillStyle = T.labelColor;
  ctx.globalAlpha = 0.80;
  ctx.fillText('~ WILLKOMMEN AUF ~', TX, PY + 86);
  ctx.restore();

  ctx.save();
  ctx.font = 'bold 116px Georgia, serif';
  ctx.fillStyle = T.titleColor;
  ctx.fillText('NovaSMP', TX, PY + 222);
  ctx.restore();

  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.globalAlpha = 0.20;
  ctx.fillStyle = T.underlineGlow;
  ctx.fillRect(TX, PY + 240, 520, 7);
  ctx.restore();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = T.underline;
  ctx.fillRect(TX, PY + 242, 520, 2);
  ctx.globalAlpha = 1;

  const displayName = user.displayName || user.globalName || user.username || 'Unbekannt';
  ctx.save();
  ctx.font = '300 33px Georgia, serif';
  ctx.fillStyle = T.labelColor;
  ctx.fillText('Hey,  ', TX, PY + 308);
  const hW = ctx.measureText('Hey,  ').width;
  ctx.font = '600 33px Georgia, serif';
  ctx.fillStyle = T.nameColor;
  const truncated = truncateText(ctx, displayName, PW - hW - 75);
  ctx.fillText(truncated, TX + hW, PY + 308);
  ctx.restore();

  ctx.save();
  ctx.font = '400 22px Georgia, serif';
  ctx.fillStyle = T.subtitleColor;
  ctx.fillText('Schön, dass du dabei bist. Viel Spaß auf dem Server!', TX, PY + 358);
  ctx.restore();

  // Badge — innerhalb des Panels
  const BX = TX, BY = PY + 394, BW = 310, BH = 50;
  ctx.save();
  ctx.fillStyle = T.badgeBg;
  roundRect(ctx, BX, BY, BW, BH, 8);
  ctx.fill();
  ctx.strokeStyle = T.badgeBorder;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.70;
  roundRect(ctx, BX, BY, BW, BH, 8);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.font = '400 21px Georgia, serif';
  ctx.fillStyle = T.badgeText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Mitglied #' + memberCount, BX + BW / 2, BY + BH / 2);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeCard };