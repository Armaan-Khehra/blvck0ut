const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const logger = require('../../utils/logger');
const path = require('path');
const fs = require('fs');

// ─── Font Setup (same pattern as leaderboardImage.js) ───
// Try custom fonts first; detect if they actually work (they fail on ARM32)
const fontsDir = path.join(__dirname, '../../../assets/fonts');
let useCustomFonts = false;
try {
    GlobalFonts.registerFromPath(path.join(fontsDir, 'Cinzel-Bold.ttf'), 'Cinzel');
    GlobalFonts.registerFromPath(path.join(fontsDir, 'Raleway-SemiBold.ttf'), 'Raleway');
    GlobalFonts.registerFromPath(path.join(fontsDir, 'Raleway-Regular.ttf'), 'RalewayReg');
    const families = GlobalFonts.families.map(f => f.family);
    useCustomFonts = families.includes('Cinzel') && families.includes('Raleway');
} catch { useCustomFonts = false; }
// ARM32: fonts register as families but can't actually render glyphs — force Noto
if (process.arch === 'arm') useCustomFonts = false;

// Register ALL Noto system fonts (primary on ARM, fallback elsewhere)
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
const NOTO_FB = notoFallbacks.length > 0 ? ', ' + notoFallbacks.join(', ') : '';

// Font aliases — use custom if they actually work, Noto otherwise
const QF = {
    quote:     (size) => useCustomFonts ? `bold ${size}px Cinzel${NOTO_FB}` : `bold ${size}px NotoSansBold, NotoSansRegular${NOTO_FB}`,
    name:      (size) => useCustomFonts ? `bold ${size}px Cinzel${NOTO_FB}` : `bold ${size}px NotoSansBold, NotoSansRegular${NOTO_FB}`,
    username:  (size) => useCustomFonts ? `bold ${size}px Raleway${NOTO_FB}` : `bold ${size}px NotoSansBold, NotoSansRegular${NOTO_FB}`,
    watermark: (size) => useCustomFonts ? `${size}px Raleway${NOTO_FB}` : `${size}px NotoSansRegular${NOTO_FB}`,
};

const QUOTES_CHANNEL_ID = '1473212166675890227';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription(`${theme.emojis.candle} Generate a quote image (or reply to a message with -quote)`)
        .addStringOption(opt => opt.setName('text').setDescription('The quote text').setRequired(false))
        .addUserOption(opt => opt.setName('user').setDescription('Who said it (defaults to you)').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let text;
        let user;
        let displayName;

        // Check if this came from a prefix reply (set by messageCreate handler)
        if (interaction._prefixReplyData) {
            text = interaction._prefixReplyData.text;
            user = interaction._prefixReplyData.user;
            displayName = interaction._prefixReplyData.displayName;
        } else {
            text = interaction.options.getString('text');
            user = interaction.options.getUser('user') || interaction.user;
            const member = interaction.guild.members.cache.get(user.id);
            displayName = member?.displayName || user.username;
        }

        if (!text || text.trim().length === 0) {
            return interaction.editReply({ embeds: [errorEmbed('Reply to a message with `-quote` or use `/quote text:...`')] });
        }

        // Strip emojis (canvas can't render them) and clean up
        text = stripEmojis(text).trim();
        if (!text) {
            return interaction.editReply({ embeds: [errorEmbed('The message only contains emojis which can\'t be rendered as an image.')] });
        }

        // Clean the display name too — if it becomes empty after stripping, fallback to username
        let cleanName = stripEmojis(displayName).trim();
        if (!cleanName || cleanName.length < 1) {
            cleanName = user.username;
        }

        try {
            // Fetch avatar large
            const avatarURL = user.displayAvatarURL({ extension: 'png', size: 512, forceStatic: true });
            const avatarImg = await loadImage(avatarURL);

            const WIDTH = 900;
            const HEIGHT = 450;
            const canvas = createCanvas(WIDTH, HEIGHT);
            const ctx = canvas.getContext('2d');

            // ─── Pure black background ───
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            // ─── Avatar covers the entire left side (edge to edge) ───
            const avAreaWidth = Math.floor(WIDTH * 0.5);

            // "Cover" mode: scale avatar to fill the entire area with no gaps
            const imgAspect = avatarImg.width / avatarImg.height;
            const areaAspect = avAreaWidth / HEIGHT;
            let drawW, drawH;
            if (imgAspect > areaAspect) {
                drawH = HEIGHT;
                drawW = HEIGHT * imgAspect;
            } else {
                drawW = avAreaWidth;
                drawH = avAreaWidth / imgAspect;
            }
            const avOffsetX = (avAreaWidth - drawW) / 2;
            const avOffsetY = (HEIGHT - drawH) / 2;

            // Draw to temp canvas for clean grayscale + smooth fade
            const avCanvas = createCanvas(avAreaWidth, HEIGHT);
            const avCtx = avCanvas.getContext('2d');
            avCtx.drawImage(avatarImg, avOffsetX, avOffsetY, drawW, drawH);

            // Clean grayscale + smooth right fade (no color tinting)
            const imageData = avCtx.getImageData(0, 0, avAreaWidth, HEIGHT);
            const data = imageData.data;
            const fadeRight = avAreaWidth * 0.65;

            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < avAreaWidth; x++) {
                    const idx = (y * avAreaWidth + x) * 4;

                    // Pure grayscale
                    const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
                    data[idx] = gray;
                    data[idx + 1] = gray;
                    data[idx + 2] = gray;

                    // Smooth right fade using cubic ease
                    let alphaMultiplier = 1.0;
                    const fadeStartX = avAreaWidth - fadeRight;
                    if (x > fadeStartX) {
                        const t = (x - fadeStartX) / fadeRight;
                        alphaMultiplier = 1 - (t * t * t);
                    }

                    data[idx + 3] = Math.round(data[idx + 3] * alphaMultiplier * 0.7);
                }
            }
            avCtx.putImageData(imageData, 0, 0);

            // Draw faded avatar onto main canvas
            ctx.drawImage(avCanvas, 0, 0);

            // ─── Border accent: top-left corner (L-shape) ───
            const borderLen = 100;
            const borderThick = 1.5;
            const borderInset = 22;
            // Gradient from white to transparent
            const tlHorizGrad = ctx.createLinearGradient(borderInset, 0, borderInset + borderLen, 0);
            tlHorizGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            tlHorizGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = tlHorizGrad;
            ctx.fillRect(borderInset, borderInset, borderLen, borderThick);

            const tlVertGrad = ctx.createLinearGradient(0, borderInset, 0, borderInset + borderLen);
            tlVertGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            tlVertGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = tlVertGrad;
            ctx.fillRect(borderInset, borderInset, borderThick, borderLen);

            // ─── Border accent: bottom-right corner (L-shape) ───
            const brHorizGrad = ctx.createLinearGradient(WIDTH - borderInset, 0, WIDTH - borderInset - borderLen, 0);
            brHorizGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            brHorizGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = brHorizGrad;
            ctx.fillRect(WIDTH - borderInset - borderLen, HEIGHT - borderInset - borderThick, borderLen, borderThick);

            const brVertGrad = ctx.createLinearGradient(0, HEIGHT - borderInset, 0, HEIGHT - borderInset - borderLen);
            brVertGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            brVertGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = brVertGrad;
            ctx.fillRect(WIDTH - borderInset - borderThick, HEIGHT - borderInset - borderLen, borderThick, borderLen);

            // ─── Quote text area (right side, well centered) ───
            const textAreaX = Math.floor(WIDTH * 0.54);
            const textAreaWidth = WIDTH - textAreaX - 40;

            // Dynamic font size — bold and sharp
            let fontSize;
            if (text.length <= 30) fontSize = 36;
            else if (text.length <= 60) fontSize = 30;
            else if (text.length <= 120) fontSize = 24;
            else if (text.length <= 250) fontSize = 20;
            else fontSize = 17;

            const lineHeight = Math.floor(fontSize * 1.6);

            // Use Cinzel (gothic serif) for quote text, with Noto fallback for non-Latin chars
            ctx.font = QF.quote(fontSize);
            const lines = wrapText(ctx, `\u201C${text}\u201D`, textAreaWidth);

            const maxLines = Math.floor((HEIGHT - 130) / lineHeight);
            const displayLines = lines.slice(0, maxLines);
            if (lines.length > maxLines) {
                displayLines[maxLines - 1] = displayLines[maxLines - 1].replace(/\u201D$/, '') + '...\u201D';
            }

            // Calculate vertical centering
            const totalTextHeight = displayLines.length * lineHeight;
            const separatorGap = 18;
            const separatorH = 1;
            const nameGap = 14;
            const nameSize = 19;
            const usernameGap = 5;
            const usernameSize = 15;
            const totalBlockHeight = totalTextHeight + separatorGap + separatorH + nameGap + nameSize + usernameGap + usernameSize;
            const blockStartY = (HEIGHT - totalBlockHeight) / 2 + fontSize;

            // ─── Draw quote text (bold Cinzel) ───
            ctx.fillStyle = '#ffffff';
            ctx.font = QF.quote(fontSize);
            ctx.textAlign = 'left';

            for (let i = 0; i < displayLines.length; i++) {
                ctx.fillText(displayLines[i], textAreaX, blockStartY + i * lineHeight);
            }

            // ─── Thin separator line ───
            const sepY = blockStartY + displayLines.length * lineHeight + separatorGap;
            const sepGrad = ctx.createLinearGradient(textAreaX, 0, textAreaX + 100, 0);
            sepGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
            sepGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = sepGrad;
            ctx.fillRect(textAreaX, sepY, 100, separatorH);

            // ─── Display name (Cinzel Bold — matches quote style) ───
            const nameY = sepY + separatorH + nameGap + nameSize;
            ctx.fillStyle = '#c0c0c0';
            ctx.font = QF.name(nameSize);
            ctx.textAlign = 'left';
            ctx.fillText(cleanName, textAreaX, nameY);

            // ─── @username (Raleway SemiBold) ───
            const usernameY = nameY + usernameGap + usernameSize;
            ctx.fillStyle = '#666666';
            ctx.font = QF.username(usernameSize);
            ctx.fillText(`@${user.username}`, textAreaX, usernameY);

            // ─── Watermark (bottom-right, subtle) ───
            ctx.fillStyle = '#1c1c1c';
            ctx.font = QF.watermark(11);
            ctx.textAlign = 'right';
            ctx.fillText('blvck0ut', WIDTH - borderInset, HEIGHT - borderInset + 5);

            // ─── Export ───
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'quote.png' });

            // Send to quotes channel
            const quotesChannel =
                interaction.guild.channels.cache.get(QUOTES_CHANNEL_ID) ||
                await interaction.guild.channels.fetch(QUOTES_CHANNEL_ID).catch(() => null);

            if (!quotesChannel) {
                return interaction.editReply({ embeds: [errorEmbed('Quotes channel not found.')] });
            }

            await quotesChannel.send({ files: [attachment] });

            await interaction.editReply({
                embeds: [successEmbed(
                    `${theme.emojis.candle} Quote Posted`,
                    `Your quote has been posted in ${quotesChannel}.`,
                )],
            });

        } catch (error) {
            logger.error(`[Quote] Error: ${error.message}`, error.stack);
            await interaction.editReply({ embeds: [errorEmbed('Failed to generate the quote image.')] });
        }
    },
};

// ─── Strip emojis and special unicode that canvas can't render ───
function stripEmojis(str) {
    return str
        // Remove discord custom emojis <:name:id> and <a:name:id>
        .replace(/<a?:\w+:\d+>/g, '')
        // Remove discord user/channel/role mentions and replace with readable text
        .replace(/<@!?(\d+)>/g, '@user')
        .replace(/<#(\d+)>/g, '#channel')
        .replace(/<@&(\d+)>/g, '@role')
        // Remove unicode emojis
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
        .replace(/[\u{200D}]/gu, '')
        .replace(/[\u{20E3}]/gu, '')
        .replace(/[\u{E0020}-\u{E007F}]/gu, '')
        // Remove decorative box-drawing unicode (not real text)
        .replace(/[\u{2500}-\u{257F}]/gu, '')  // box drawing
        .replace(/[\u{2580}-\u{259F}]/gu, '')  // block elements
        // Clean up extra spaces
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// ─── Word Wrap Helper ───
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
}
