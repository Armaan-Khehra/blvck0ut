const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const { errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const leveling = require('../../utils/leveling');
const logger = require('../../utils/logger');
const path = require('path');
const fs = require('fs');

// ─── Register Fonts (same logic as leaderboardImage.js) ───
const FONT_DIR = path.join(__dirname, '../../../assets/fonts');
let _fontFamily = 'Arial, Helvetica, sans-serif';
try {
    // Register custom fonts if not already registered
    const families = GlobalFonts.families.map(f => f.family);
    if (!families.includes('Raleway')) {
        GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Raleway-SemiBold.ttf'), 'Raleway');
        GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Raleway-Regular.ttf'), 'RalewayRegular');
    }
    // Also register Noto as fallback
    const notoDir = '/usr/share/fonts/truetype/noto';
    if (fs.existsSync(notoDir)) {
        for (const file of fs.readdirSync(notoDir)) {
            if (file.startsWith('NotoSans-') && file.endsWith('.ttf')) {
                const name = file.replace('.ttf', '').replace(/-/g, '');
                if (!families.includes(name)) {
                    try { GlobalFonts.registerFromPath(path.join(notoDir, file), name); } catch {}
                }
            }
        }
    }
    const updated = GlobalFonts.families.map(f => f.family);
    if (updated.includes('Raleway')) {
        _fontFamily = 'Raleway, RalewayRegular, NotoSansRegular, NotoSansBold, Arial, sans-serif';
    } else if (updated.includes('NotoSansRegular')) {
        _fontFamily = 'NotoSansRegular, NotoSansBold, Arial, sans-serif';
    }
} catch { /* keep Arial fallback */ }
const FF = _fontFamily;

// ─── Colors ───
const C = {
    bg:       '#0d0d0d',
    card:     '#161616',
    cardAlt:  '#131313',
    text:     '#e8e8e8',
    sub:      '#6b6b6b',
    accent:   '#6a0dad',      // Purple accent matching bot theme
    accentL:  '#8b5cf6',      // Lighter purple
    gold:     '#f5c842',
    silver:   '#94a3b8',
    bronze:   '#d97706',
    barBg:    '#1e1e1e',
    barFill:  '#6a0dad',
    barGlow:  '#8b5cf6',
    border:   '#1f1f1f',
};

const RANK_COLORS = [C.gold, C.silver, C.bronze];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('levels')
        .setDescription(`${theme.emojis.fire} The highest ascended mortals`),

    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const rows = leveling.getLeaderboard.all(guildId);

        if (rows.length === 0) {
            return interaction.editReply({
                embeds: [errorEmbed('No one has earned XP yet... the void is silent.')],
            });
        }

        try {
            const members = [];
            for (const row of rows) {
                let member = interaction.guild.members.cache.get(row.user_id);
                if (!member) {
                    try { member = await interaction.guild.members.fetch(row.user_id); } catch {}
                }
                if (!member) continue; // Skip users who left the server
                members.push({
                    ...row,
                    username: member.user.username,
                    avatarURL: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
                });
                if (members.length >= 10) break; // Cap at top 10
            }

            const buffer = await generateLeaderboard(interaction.guild, members);
            const attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.png' });
            await interaction.editReply({ files: [attachment] });
        } catch (err) {
            logger.error(`[Leveling] Leaderboard image error: ${err.stack}`);
            const lines = rows.map((row, i) => {
                const medal = ['\u{1F451}', '\u{1F948}', '\u{1F949}'][i] || `\`#${i + 1}\``;
                return `${medal} <@${row.user_id}> — Level **${row.level}** ・ ${row.total_xp.toLocaleString()} XP`;
            });
            await interaction.editReply({ content: lines.join('\n') });
        }
    },
};

// ═══════════════════════════════════════════
//  Image Generation
// ═══════════════════════════════════════════

async function generateLeaderboard(guild, members) {
    const W = 880;
    const PAD = 32;
    const HEAD_H = 80;
    const ROW_H = 80;
    const GAP = 5;
    const H = HEAD_H + (members.length * (ROW_H + GAP)) + PAD + 10;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ─── Background ───
    ctx.fillStyle = C.bg;
    roundRect(ctx, 0, 0, W, H, 16);
    ctx.fill();

    // Subtle top accent line
    const topGrad = ctx.createLinearGradient(0, 0, W, 0);
    topGrad.addColorStop(0, 'rgba(0,0,0,0)');
    topGrad.addColorStop(0.3, C.accent);
    topGrad.addColorStop(0.7, C.accentL);
    topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 3);

    // ─── Header ───
    // Title
    ctx.fillStyle = C.text;
    ctx.font = `bold 28px ${FF}`;
    ctx.fillText('LEADERBOARD', PAD, 50);

    // Server name (small, subdued, ASCII-safe)
    ctx.fillStyle = C.sub;
    ctx.font = `14px ${FF}`;
    const safeName = guild.name.replace(/[^\x20-\x7E]/g, '').trim() || 'blvck0ut';
    ctx.fillText(safeName, PAD, 68);

    // Member count on right
    ctx.fillStyle = C.sub;
    ctx.font = `14px ${FF}`;
    const countText = `Top ${members.length}`;
    const countW = ctx.measureText(countText).width;
    ctx.fillText(countText, W - PAD - countW, 50);

    // ─── Rows ───
    for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const y = HEAD_H + i * (ROW_H + GAP);
        const isTop3 = i < 3;

        // Row card
        ctx.fillStyle = i % 2 === 0 ? C.card : C.cardAlt;
        roundRect(ctx, PAD, y, W - PAD * 2, ROW_H, 10);
        ctx.fill();

        // Subtle left accent bar for top 3
        if (isTop3) {
            ctx.fillStyle = RANK_COLORS[i];
            roundRect(ctx, PAD, y, 4, ROW_H, 2);
            ctx.fill();
        }

        const innerX = PAD + 16;

        // ─ Rank ─
        ctx.fillStyle = isTop3 ? RANK_COLORS[i] : C.sub;
        ctx.font = isTop3 ? `bold 24px ${FF}` : `bold 20px ${FF}`;
        const rankStr = `#${i + 1}`;
        ctx.fillText(rankStr, innerX, y + ROW_H / 2 + 8);

        // ─ Avatar ─
        const avX = innerX + 60;
        const avSize = 52;
        const avY = y + (ROW_H - avSize) / 2;

        // Avatar ring for top 3
        if (isTop3) {
            ctx.strokeStyle = RANK_COLORS[i];
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2 + 3, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (m.avatarURL) {
            try {
                const av = await loadImage(m.avatarURL);
                ctx.save();
                ctx.beginPath();
                ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(av, avX, avY, avSize, avSize);
                ctx.restore();
            } catch {
                drawPlaceholder(ctx, avX, avY, avSize);
            }
        } else {
            drawPlaceholder(ctx, avX, avY, avSize);
        }

        // ─ Name + Level ─
        const textX = avX + avSize + 16;

        ctx.fillStyle = C.text;
        ctx.font = `bold 18px ${FF}`;
        let name = `${m.username}`;
        while (ctx.measureText(name).width > 200 && name.length > 5) {
            name = name.slice(0, -4) + '...';
        }
        ctx.fillText(name, textX, y + 34);

        ctx.fillStyle = C.sub;
        ctx.font = `13px ${FF}`;
        ctx.fillText(`Level ${m.level}  ·  ${m.total_xp.toLocaleString()} XP`, textX, y + 54);

        // ─ Progress Bar (right side) ─
        const xpInLevel = m.total_xp - leveling.totalXpForLevel(m.level);
        const progress = leveling.getLevelProgress({ ...m, xp: xpInLevel });

        const barW = 200;
        const barH = 12;
        const barX = W - PAD - barW - 20;
        const barY = y + 28;
        const fillW = Math.max(0, (progress.percentage / 100) * barW);

        // Bar background
        ctx.fillStyle = C.barBg;
        roundRect(ctx, barX, barY, barW, barH, 6);
        ctx.fill();

        // Bar fill
        if (fillW > 0) {
            const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
            grad.addColorStop(0, C.accent);
            grad.addColorStop(1, C.accentL);
            ctx.fillStyle = grad;
            roundRect(ctx, barX, barY, Math.max(fillW, 12), barH, 6);
            ctx.fill();
        }

        // XP text below bar
        ctx.fillStyle = C.sub;
        ctx.font = `11px ${FF}`;
        const xpStr = `${progress.currentXp.toLocaleString()} / ${progress.neededXp.toLocaleString()} XP`;
        ctx.fillText(xpStr, barX, barY + barH + 14);
    }

    // Bottom accent line
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, H - 3, W, 3);

    return canvas.toBuffer('image/png');
}

function drawPlaceholder(ctx, x, y, size) {
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size * 0.35, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size * 0.85, size * 0.3, Math.PI, 0);
    ctx.fill();
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
