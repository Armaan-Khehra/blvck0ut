const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// ─── Register Fonts ───
// Try custom fonts first; fall back to Noto if they fail (e.g. on ARM32)
const FONT_DIR = path.join(__dirname, '../../assets/fonts');
let useCustomFonts = false;
try {
    GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Cinzel-Bold.ttf'), 'Cinzel');
    GlobalFonts.registerFromPath(path.join(FONT_DIR, 'CinzelDecorative-Bold.ttf'), 'CinzelDecorative');
    GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Raleway-SemiBold.ttf'), 'Raleway');
    GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Raleway-Regular.ttf'), 'RalewayRegular');
    // Check if they actually registered
    const families = GlobalFonts.families.map(f => f.family);
    useCustomFonts = families.includes('Cinzel') && families.includes('Raleway');
} catch { useCustomFonts = false; }
// ARM32: if custom fonts registered successfully, trust them regardless of arch

// Register ALL Noto system fonts (always needed for unicode fallback, primary on ARM)
const NOTO_DIRS = [
    '/usr/share/fonts/truetype/noto',
    '/usr/share/fonts/opentype/noto',
];
const notoFallbacks = [];
for (const dir of NOTO_DIRS) {
    try {
        if (!fs.existsSync(dir)) continue;
        for (const file of fs.readdirSync(dir)) {
            if (!file.endsWith('.ttf') && !file.endsWith('.ttc')) continue;
            if (!/Regular|Bold|SemiBold/i.test(file) && file !== 'NotoColorEmoji.ttf') continue;
            const name = file.replace(/\.(ttf|ttc)$/, '').replace(/-/g, '');
            try {
                GlobalFonts.registerFromPath(path.join(dir, file), name);
                notoFallbacks.push(name);
            } catch { /* skip broken fonts */ }
        }
    } catch { /* skip if dir unavailable */ }
}
if (notoFallbacks.length > 0) {
    logger.info(`[Fonts] Registered ${notoFallbacks.length} Noto fallback fonts`);
}
const NOTO_FALLBACK_STR = notoFallbacks.length > 0 ? ', ' + notoFallbacks.join(', ') : '';

// Font aliases — use custom if available, Noto otherwise
const FONT = {
    titleBold: useCustomFonts ? 'bold 34px Cinzel' : `bold 34px NotoSansBold, NotoSansRegular${NOTO_FALLBACK_STR}`,
    subtitle: useCustomFonts ? '14px RalewayRegular' : `14px NotoSansRegular${NOTO_FALLBACK_STR}`,
    nameBold: useCustomFonts ? `bold 18px Raleway${NOTO_FALLBACK_STR}` : `bold 18px NotoSansBold, NotoSansRegular${NOTO_FALLBACK_STR}`,
    name: useCustomFonts ? `16px Raleway${NOTO_FALLBACK_STR}` : `16px NotoSansRegular${NOTO_FALLBACK_STR}`,
    medal: useCustomFonts ? 'bold 15px Cinzel' : `bold 15px NotoSansBold, NotoSansRegular${NOTO_FALLBACK_STR}`,
    rank: useCustomFonts ? 'bold 16px Raleway' : `bold 16px NotoSansBold, NotoSansRegular${NOTO_FALLBACK_STR}`,
    worthBig: useCustomFonts ? 'bold 20px Raleway' : `bold 20px NotoSansBold, NotoSansRegular${NOTO_FALLBACK_STR}`,
    worth: useCustomFonts ? '17px Raleway' : `17px NotoSansRegular${NOTO_FALLBACK_STR}`,
    label: useCustomFonts ? '12px RalewayRegular' : `12px NotoSansRegular${NOTO_FALLBACK_STR}`,
    footer: useCustomFonts ? '14px RalewayRegular' : `14px NotoSansRegular${NOTO_FALLBACK_STR}`,
    footerSmall: useCustomFonts
        ? '11px RalewayRegular, NotoSansSymbolsRegular, NotoSansSymbols2Regular'
        : `11px NotoSansRegular, NotoSansSymbolsRegular, NotoSansSymbols2Regular${NOTO_FALLBACK_STR}`,
    placeholder: (size) => useCustomFonts ? `bold ${size}px Raleway` : `bold ${size}px NotoSansBold, NotoSansRegular`,
};
logger.info(`[Fonts] Using ${useCustomFonts ? 'custom' : 'Noto'} fonts`);

// ─── Color Palette ───
const COLORS = {
    bgGradientTop: '#0d0d1a',
    bgGradientBot: '#050508',
    cardBorder: '#1e1e35',
    gold: '#d4af37',
    silver: '#a8a8b0',
    bronze: '#cd7f32',
    purple: '#6a0dad',
    purpleDim: '#3d1f6d',
    text: '#e0e0e8',
    textDim: '#6e6e82',
    textMuted: '#444458',
    accent: '#8b5cf6',
};

const MEDAL_LABELS = ['I', 'II', 'III'];
const MEDAL_COLORS = [COLORS.gold, COLORS.silver, COLORS.bronze];

// ─── Canvas Dimensions (optimized for GIF size) ───
const WIDTH = 800;
const ROW_HEIGHT = 64;
const HEADER_HEIGHT = 120;
const FOOTER_HEIGHT = 76;
const PADDING = 30;
const AVATAR_SIZE = 42;

// ─── Helper Functions ───

async function fetchAvatar(url) {
    try { return await loadImage(url); } catch { return null; }
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function drawCircularImage(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
}

function drawPlaceholderAvatar(ctx, x, y, size, username, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = FONT.placeholder(Math.floor(size * 0.45));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((username || '?')[0].toUpperCase(), x + size / 2, y + size / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
}

function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (ctx.measureText(t + '...').width > maxWidth && t.length > 0) t = t.slice(0, -1);
    return t + '...';
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// ─── Drawing Functions ───

function drawBackground(ctx, W, H) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, COLORS.bgGradientTop);
    bgGrad.addColorStop(1, COLORS.bgGradientBot);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    for (const x of [0, W]) {
        const glow = ctx.createRadialGradient(x, H / 2, 0, x, H / 2, 400);
        glow.addColorStop(0, 'rgba(106, 13, 173, 0.06)');
        glow.addColorStop(1, 'rgba(106, 13, 173, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
    }

    roundRect(ctx, 1, 1, W - 2, H - 2, 14);
    ctx.strokeStyle = COLORS.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawHeader(ctx, W, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.text;
    ctx.font = FONT.titleBold;
    ctx.textAlign = 'center';
    ctx.fillText('Soul Leaderboard', W / 2, 50);

    ctx.fillStyle = COLORS.textDim;
    ctx.font = FONT.subtitle;
    ctx.fillText('the wealthiest mortals in the realm', W / 2, 75);
    ctx.textAlign = 'left';

    const divY = 95;
    const divGrad = ctx.createLinearGradient(PADDING + 60, 0, W - PADDING - 60, 0);
    divGrad.addColorStop(0, 'transparent');
    divGrad.addColorStop(0.3, COLORS.purpleDim);
    divGrad.addColorStop(0.5, COLORS.purple);
    divGrad.addColorStop(0.7, COLORS.purpleDim);
    divGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING + 60, divY);
    ctx.lineTo(W - PADDING - 60, divY);
    ctx.stroke();

    ctx.fillStyle = COLORS.purple;
    ctx.save();
    ctx.translate(W / 2, divY);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
    ctx.globalAlpha = 1;
}

function drawRow(ctx, entry, avatar, i, W, alpha, slideX, worth) {
    const y = HEADER_HEIGHT + (i * ROW_HEIGHT);
    const isTop3 = i < 3;
    const rowX = PADDING;
    const rowW = W - PADDING * 2;
    const rowH = ROW_HEIGHT - 4;

    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(slideX, 0);

    roundRect(ctx, rowX, y, rowW, rowH, 10);
    if (isTop3) {
        const g = ctx.createLinearGradient(rowX, 0, rowX + rowW, 0);
        g.addColorStop(0, 'rgba(106, 13, 173, 0.12)');
        g.addColorStop(0.5, 'rgba(106, 13, 173, 0.06)');
        g.addColorStop(1, 'rgba(106, 13, 173, 0.02)');
        ctx.fillStyle = g;
    } else {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(18, 18, 31, 0.6)' : 'rgba(15, 15, 28, 0.3)';
    }
    ctx.fill();
    if (isTop3) { ctx.strokeStyle = 'rgba(106, 13, 173, 0.2)'; ctx.lineWidth = 1; ctx.stroke(); }

    const cy = y + rowH / 2;
    const rx = rowX + 24;

    // Medal / rank
    if (isTop3) {
        const mc = MEDAL_COLORS[i];
        ctx.beginPath(); ctx.arc(rx, cy, 15, 0, Math.PI * 2); ctx.fillStyle = mc + '30'; ctx.fill();
        ctx.beginPath(); ctx.arc(rx, cy, 15, 0, Math.PI * 2); ctx.strokeStyle = mc; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = mc; ctx.font = FONT.medal;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(MEDAL_LABELS[i], rx, cy);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    } else {
        ctx.fillStyle = COLORS.textDim; ctx.font = FONT.rank;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`#${entry.rank}`, rx, cy);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }

    // Avatar
    const ax = rx + 32, ay = cy - AVATAR_SIZE / 2;
    if (avatar) {
        drawCircularImage(ctx, avatar, ax, ay, AVATAR_SIZE);
        if (isTop3) {
            ctx.beginPath();
            ctx.arc(ax + AVATAR_SIZE / 2, ay + AVATAR_SIZE / 2, AVATAR_SIZE / 2 + 2, 0, Math.PI * 2);
            ctx.strokeStyle = MEDAL_COLORS[i] + '80'; ctx.lineWidth = 2; ctx.stroke();
        }
    } else {
        drawPlaceholderAvatar(ctx, ax, ay, AVATAR_SIZE, entry.displayName, COLORS.purpleDim);
    }

    // Name
    const nx = ax + AVATAR_SIZE + 14;
    ctx.font = isTop3 ? FONT.nameBold : FONT.name;
    ctx.fillStyle = isTop3 ? COLORS.text : COLORS.silver;
    ctx.textBaseline = 'middle';
    ctx.fillText(truncateText(ctx, entry.displayName, 300), nx, cy);
    ctx.textBaseline = 'alphabetic';

    // Worth
    const ws = worth.toLocaleString();
    const wx = W - PADDING - 20;
    ctx.font = FONT.label; ctx.fillStyle = COLORS.textDim;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('souls', wx, cy);
    const slw = ctx.measureText('souls').width;

    ctx.font = isTop3 ? FONT.worthBig : FONT.worth;
    ctx.fillStyle = isTop3 ? COLORS.gold : COLORS.accent;
    const nmx = wx - slw - 8;
    ctx.fillText(ws, nmx, cy);

    const nw = ctx.measureText(ws).width;
    const dx = nmx - nw - 10;
    ctx.beginPath(); ctx.arc(dx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = isTop3 ? COLORS.gold + '60' : COLORS.accent + '40'; ctx.fill();
    ctx.beginPath(); ctx.arc(dx, cy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = isTop3 ? COLORS.gold : COLORS.accent; ctx.fill();

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
    ctx.globalAlpha = 1;
}

function drawFooter(ctx, W, H, req, alpha, rowCount) {
    ctx.globalAlpha = alpha;
    const fdy = HEADER_HEIGHT + (rowCount * ROW_HEIGHT) + 10;
    const fg = ctx.createLinearGradient(PADDING + 60, 0, W - PADDING - 60, 0);
    fg.addColorStop(0, 'transparent'); fg.addColorStop(0.3, COLORS.textMuted);
    fg.addColorStop(0.5, COLORS.purpleDim); fg.addColorStop(0.7, COLORS.textMuted);
    fg.addColorStop(1, 'transparent');
    ctx.strokeStyle = fg; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PADDING + 60, fdy); ctx.lineTo(W - PADDING - 60, fdy); ctx.stroke();

    if (req && req.rank > 0) {
        ctx.fillStyle = COLORS.textDim; ctx.font = FONT.footer;
        ctx.textAlign = 'center';
        ctx.fillText(`Your rank:  #${req.rank}  of  ${req.total}`, W / 2, fdy + 28);
    }
    ctx.fillStyle = COLORS.textMuted; ctx.font = FONT.footerSmall;
    ctx.textAlign = 'center';
    ctx.fillText('\u2720 blvck0ut \u2022 embrace the void \u2720', W / 2, H - 14);
    ctx.globalAlpha = 1;
}

// ─── Main: Generate Static Leaderboard Image (PNG) ───

async function generateLeaderboardImage(entries, requester) {
    const rowCount = entries.length;
    const H = HEADER_HEIGHT + (rowCount * ROW_HEIGHT) + FOOTER_HEIGHT + 20;

    const canvas = createCanvas(WIDTH, H);
    const ctx = canvas.getContext('2d');

    const avatars = await Promise.all(entries.map(e => fetchAvatar(e.avatarURL)));

    // Draw everything at full opacity, no animation
    drawBackground(ctx, WIDTH, H);
    drawHeader(ctx, WIDTH, 1);

    for (let i = 0; i < rowCount; i++) {
        drawRow(ctx, entries[i], avatars[i], i, WIDTH, 1, 0, entries[i].netWorth);
    }

    drawFooter(ctx, WIDTH, H, requester, 1, rowCount);

    return canvas.toBuffer('image/png');
}

module.exports = { generateLeaderboardImage };
