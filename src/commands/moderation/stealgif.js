const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const logger = require('../../utils/logger');
const { sendLog } = require('../../utils/channelLog');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execFileAsync = promisify(execFile);

let sharp;
try { sharp = require('sharp'); } catch { sharp = null; }

// Find ffmpeg binary
let ffmpegPath = 'ffmpeg';
try {
    ffmpegPath = require('ffmpeg-static') || 'ffmpeg';
} catch { /* use system ffmpeg */ }

// Convert mp4/webm to gif using ffmpeg
async function videoToGif(inputBuffer, maxSize = 320, maxColors = 256, fps = 12) {
    const tmpDir = os.tmpdir();
    const ts = Date.now();
    const inputPath = path.join(tmpDir, `stealgif_in_${ts}.mp4`);
    const outputPath = path.join(tmpDir, `stealgif_out_${ts}.gif`);
    const palettePath = path.join(tmpDir, `stealgif_palette_${ts}.png`);

    try {
        fs.writeFileSync(inputPath, inputBuffer);

        // Two-pass: generate palette then use it for high quality GIF
        // Pass 1: Generate full palette (stats_mode=diff keeps detail in moving parts)
        await execFileAsync(ffmpegPath, [
            '-i', inputPath,
            '-vf', `fps=${fps},scale=${maxSize}:-1:flags=lanczos,palettegen=max_colors=${maxColors}:stats_mode=diff`,
            '-y', palettePath,
        ], { timeout: 30000 });

        // Pass 2: Use palette with sierra2_4a dithering (smoother than bayer)
        await execFileAsync(ffmpegPath, [
            '-i', inputPath,
            '-i', palettePath,
            '-lavfi', `fps=${fps},scale=${maxSize}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle`,
            '-y', outputPath,
        ], { timeout: 30000 });

        const gifBuffer = fs.readFileSync(outputPath);

        // Cleanup
        try { fs.unlinkSync(inputPath); } catch {}
        try { fs.unlinkSync(palettePath); } catch {}
        try { fs.unlinkSync(outputPath); } catch {}

        return gifBuffer;
    } catch (err) {
        // Cleanup on error
        try { fs.unlinkSync(inputPath); } catch {}
        try { fs.unlinkSync(palettePath); } catch {}
        try { fs.unlinkSync(outputPath); } catch {}
        throw err;
    }
}

// Random fun adjectives for generic/unnamed GIFs
const ADJECTIVES = ['cursed', 'haunted', 'void', 'dark', 'shadow', 'grim', 'wicked', 'phantom', 'lost', 'fallen', 'cryptic', 'eerie', 'hollow', 'sinister', 'spectral'];
const NOUNS = ['soul', 'relic', 'artifact', 'spirit', 'omen', 'wraith', 'hex', 'ritual', 'sigil', 'glyph', 'charm', 'totem', 'ember', 'shade', 'echo'];

function randomThemeName() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adj} ${noun}`;
}

// Generate a short contextual name from the GIF description/URL
function generateName(context) {
    // Clean up the context string
    let name = context
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, '')        // strip URLs
        .replace(/tenor|giphy|ezgif/gi, '')     // strip platform names
        .replace(/gif/gi, '')                    // strip 'gif'
        .replace(/[^a-z0-9\s]/g, '')            // only letters, numbers, spaces
        .replace(/\s+/g, ' ')
        .trim();

    // Take first 2-3 meaningful words
    const words = name.split(' ').filter(w => w.length > 1).slice(0, 3);
    name = words.join(' ');

    // If the name is empty or too generic, generate a themed random name
    if (!name || name.length < 3) {
        name = randomThemeName();
    }

    return name;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stealgif')
        .setDescription(`${theme.emojis.crystal} Turn a GIF into a server sticker (reply to a message with a GIF)`)
        .addStringOption(opt => opt.setName('name').setDescription('Custom name for the sticker').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!sharp) {
            return interaction.editReply({
                embeds: [errorEmbed('sharp is not installed — can\'t process GIFs.')],
            });
        }

        // Get GIF data from prefix reply
        const gifData = interaction._prefixReplyData;
        if (!gifData?.gifUrl) {
            return interaction.editReply({
                embeds: [errorEmbed('Reply to a message with a GIF using `-stealgif` to turn it into a sticker.')],
            });
        }

        const { gifUrl, gifContext } = gifData;
        const customName = interaction.options.getString('name');

        // Generate sticker name
        const baseName = customName || generateName(gifContext);
        // Strip existing server vanity links
        const strippedName = baseName
            .replace(/\.?gg\/\S+/gi, '')
            .replace(/discord\.\S+/gi, '')
            .replace(/\s+/g, ' ')
            .trim() || 'gif';
        const suffix = ' .gg/blvck0ut';
        const stickerName = (strippedName.slice(0, 30 - suffix.length) + suffix).slice(0, 30);

        try {
            // Download the GIF
            logger.info(`[StealGif] Downloading GIF: ${gifUrl}`);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            // Try the direct URL first, then try adding .gif for tenor
            let response = await fetch(gifUrl, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) {
                // Try tenor media URL format
                const tenorMediaUrl = gifUrl.replace('tenor.com/view/', 'media.tenor.com/') + '.gif';
                response = await fetch(tenorMediaUrl);
                if (!response.ok) {
                    return interaction.editReply({
                        embeds: [errorEmbed('Failed to download the GIF.')],
                    });
                }
            }

            let buffer = Buffer.from(await response.arrayBuffer());
            const originalSize = buffer.length;
            const contentType = response.headers.get('content-type') || '';
            logger.info(`[StealGif] Downloaded ${(originalSize / 1024).toFixed(0)}KB (${contentType})`);

            // Discord sticker size limit is 512KB
            const MAX_SIZE = 512 * 1024;

            // Detect format and convert if needed
            const isVideo = /video|mp4|webm/i.test(contentType) || /\.mp4|\.webm/i.test(gifUrl);
            const isWebp = /webp/i.test(contentType) || /\.webp/i.test(gifUrl);

            if (isVideo) {
                // Convert video to animated GIF using ffmpeg
                logger.info(`[StealGif] Converting video to GIF with ffmpeg...`);
                const originalVideo = buffer; // Keep original for re-encoding at different sizes
                try {
                    // Quality steps: start high quality, progressively reduce
                    // Each step: [size, maxColors, fps]
                    const qualitySteps = [
                        [320, 256, 12],   // Best: full size, full color
                        [320, 256, 8],    // Reduce framerate first (least visible)
                        [280, 192, 10],   // Slightly smaller + fewer colors
                        [240, 128, 8],    // Medium
                        [200, 128, 8],    // Smaller
                        [160, 64, 6],     // Last resort before static
                    ];
                    for (const [size, colors, fps] of qualitySteps) {
                        buffer = await videoToGif(originalVideo, size, colors, fps);
                        logger.info(`[StealGif] Converted to GIF at ${size}px/${colors}col/${fps}fps: ${(buffer.length / 1024).toFixed(0)}KB`);
                        if (buffer.length <= MAX_SIZE) break;
                    }
                } catch (err) {
                    logger.error(`[StealGif] ffmpeg conversion failed: ${err.message}`);
                    return interaction.editReply({
                        embeds: [errorEmbed('Failed to convert video to GIF. ffmpeg error.')],
                    });
                }
            } else if (isWebp) {
                // Convert webp — check if animated
                logger.info(`[StealGif] Converting webp...`);
                try {
                    const metadata = await sharp(buffer).metadata();
                    if (metadata.pages && metadata.pages > 1) {
                        // Animated webp → animated gif
                        buffer = await sharp(buffer, { animated: true })
                            .gif({ effort: 10 })
                            .toBuffer();
                    } else {
                        // Static webp → png
                        buffer = await sharp(buffer).png({ compressionLevel: 9 }).toBuffer();
                    }
                    logger.info(`[StealGif] Converted webp: ${(buffer.length / 1024).toFixed(0)}KB`);
                } catch (err) {
                    logger.warn(`[StealGif] Webp conversion failed: ${err.message}`);
                }
            }

            // Compress to fit Discord's 512KB sticker limit
            // First resize to sticker dimensions (Discord stickers are 320x320)
            // Start with high colors, only reduce if needed
            for (const size of [320, 280, 240, 200, 160]) {
                if (buffer.length <= MAX_SIZE) break;
                try {
                    buffer = await sharp(buffer, { animated: true })
                        .resize(size, size, { fit: 'inside' })
                        .gif({ effort: 10, colours: 256 })
                        .toBuffer();
                    logger.info(`[StealGif] Resized to ${size}px/256col: ${(buffer.length / 1024).toFixed(0)}KB`);
                } catch (err) {
                    logger.warn(`[StealGif] Resize to ${size}px failed: ${err.message}`);
                }
            }

            // Reduce colors if still too big
            if (buffer.length > MAX_SIZE) {
                for (const colors of [128, 64, 32]) {
                    if (buffer.length <= MAX_SIZE) break;
                    try {
                        buffer = await sharp(buffer, { animated: true })
                            .resize(160, 160, { fit: 'inside' })
                            .gif({ effort: 10, colours: colors })
                            .toBuffer();
                        logger.info(`[StealGif] Reduced to ${colors} colors: ${(buffer.length / 1024).toFixed(0)}KB`);
                    } catch (err) {
                        logger.warn(`[StealGif] Color reduction failed: ${err.message}`);
                    }
                }
            }

            // Last resort: static PNG of first frame
            if (buffer.length > MAX_SIZE) {
                try {
                    buffer = await sharp(buffer, { animated: false })
                        .resize(320, 320, { fit: 'inside' })
                        .png({ compressionLevel: 9 })
                        .toBuffer();
                    logger.info(`[StealGif] Converted to static PNG: ${(buffer.length / 1024).toFixed(0)}KB`);
                } catch (err) {
                    logger.warn(`[StealGif] Static PNG fallback failed: ${err.message}`);
                }
            }

            if (buffer.length > MAX_SIZE) {
                return interaction.editReply({
                    embeds: [errorEmbed(`GIF is still too large after compression (${(buffer.length / 1024).toFixed(0)}KB). Can't get it under 512KB.`)],
                });
            }

            // Create the sticker
            const created = await interaction.guild.stickers.create({
                file: buffer,
                name: stickerName,
                tags: 'skull',
                description: `GIF sticker created via blvck0ut by ${interaction.user.tag}`,
                reason: `GIF stolen by ${interaction.user.tag} via /stealgif`,
            });

            sendLog(interaction.client, {
                title: `${theme.emojis.crystal} GIF Sticker Created`,
                description: `A GIF was turned into a server sticker.`,
                color: theme.colors.success,
                fields: [
                    { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: `${theme.emojis.bat} Sticker Name`, value: created.name, inline: true },
                    { name: `${theme.emojis.crystal} Size`, value: `${(originalSize / 1024).toFixed(0)}KB → ${(buffer.length / 1024).toFixed(0)}KB`, inline: true },
                ],
            });

            await interaction.editReply({
                embeds: [successEmbed(
                    `${theme.emojis.crystal} GIF Sticker Created`,
                    `The sticker **${created.name}** has been created from the GIF.`,
                )],
            });

        } catch (err) {
            logger.error(`[StealGif] Failed: ${err.message}`, err.stack);

            let reason = err.message;
            if (err.message.includes('Maximum number')) reason = 'Server sticker slots are full.';
            else if (err.message.includes('Missing Permissions')) reason = 'Bot lacks permissions to manage stickers.';
            else if (err.message.includes('Invalid Form Body')) reason = 'Discord rejected the sticker — the GIF might be in an unsupported format.';
            else reason = reason.slice(0, 100);

            await interaction.editReply({
                embeds: [errorEmbed(`Failed to create sticker: ${reason}`)],
            });
        }
    },
};
