const { SlashCommandBuilder, PermissionFlagsBits, StickerFormatType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const logger = require('../../utils/logger');
const { sendLog } = require('../../utils/channelLog');

let sharp;
try { sharp = require('sharp'); } catch { sharp = null; }

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stealsticker')
        .setDescription(`${theme.emojis.crystal} Steal a sticker (reply to a message with a sticker, or use -stealsticker)`)
        .addStringOption(opt => opt.setName('name').setDescription('Custom name for the sticker').setRequired(false))
        .addStringOption(opt => opt.setName('tag').setDescription('Emoji tag for the sticker (e.g. wave, smile)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let sticker = null;

        // Check if this came from a prefix reply with sticker data
        if (interaction._prefixReplyData?.sticker) {
            sticker = interaction._prefixReplyData.sticker;
        }

        // For slash commands, try to find a sticker from the interaction's message reference
        // (slash commands can't directly reference stickers, so this mainly works via prefix)
        if (!sticker && interaction._prefixReplyData === undefined) {
            return interaction.editReply({
                embeds: [errorEmbed('Reply to a message that has a sticker with `-stealsticker` to steal it.')],
            });
        }

        if (!sticker) {
            return interaction.editReply({
                embeds: [errorEmbed('No sticker found in the replied message. Make sure the message has a sticker.')],
            });
        }

        const customName = interaction.options.getString('name') || sticker.name;
        const tag = interaction.options.getString('tag') || sticker.tags || 'skull';

        // Determine sticker URL and format
        const formatExtMap = {
            [StickerFormatType.PNG]: 'png',
            [StickerFormatType.APNG]: 'png',
            [StickerFormatType.Lottie]: 'json',
            [StickerFormatType.GIF]: 'gif',
        };

        const ext = formatExtMap[sticker.format] || 'png';

        // Lottie stickers can't be stolen (they require special handling)
        if (sticker.format === StickerFormatType.Lottie) {
            return interaction.editReply({
                embeds: [errorEmbed('Lottie stickers can\'t be stolen — Discord only allows PNG, APNG, and GIF stickers for server uploads.')],
            });
        }

        const stickerURL = `https://media.discordapp.net/stickers/${sticker.id}.${ext}?passthrough=true`;

        try {
            // Download the sticker
            const response = await fetch(stickerURL);
            if (!response.ok) {
                // Try alternate URL format
                const altURL = `https://cdn.discordapp.com/stickers/${sticker.id}.${ext}?passthrough=true`;
                const altResponse = await fetch(altURL);
                if (!altResponse.ok) {
                    return interaction.editReply({
                        embeds: [errorEmbed('Failed to download the sticker. It might be a default Discord sticker that can\'t be stolen.')],
                    });
                }
                var buffer = Buffer.from(await altResponse.arrayBuffer());
            } else {
                var buffer = Buffer.from(await response.arrayBuffer());
            }

            logger.info(`[StealSticker] Downloaded ${(buffer.length / 1024).toFixed(0)}KB, format: ${ext}, sticker ID: ${sticker.id}`);

            // Discord sticker size limit is 512KB — compress if needed
            const MAX_SIZE = 512 * 1024;
            if (buffer.length > MAX_SIZE) {
                if (!sharp) {
                    return interaction.editReply({
                        embeds: [errorEmbed(`Sticker is too large (${(buffer.length / 1024).toFixed(0)}KB). Discord limit is 512KB and sharp is not installed for compression.`)],
                    });
                }

                logger.info(`[StealSticker] Compressing sticker from ${(buffer.length / 1024).toFixed(0)}KB...`);

                const isGif = ext === 'gif';

                if (isGif) {
                    // GIFs: try re-encoding at full size first (sharp can often shrink without resizing)
                    // Then progressively reduce size, keeping max colors as long as possible
                    for (const [size, colors] of [[320, 256], [300, 256], [280, 256], [256, 256], [240, 192], [200, 128], [160, 128], [128, 64]]) {
                        if (buffer.length <= MAX_SIZE) break;
                        try {
                            buffer = await sharp(buffer, { animated: true })
                                .resize(size, size, { fit: 'inside' })
                                .gif({ effort: 10, colours: colors })
                                .toBuffer();
                            logger.info(`[StealSticker] GIF compressed to ${size}px/${colors}col: ${(buffer.length / 1024).toFixed(0)}KB`);
                        } catch (compErr) {
                            logger.warn(`[StealSticker] GIF compression at ${size}px failed: ${compErr.message}`);
                        }
                    }

                    // Last resort: convert to static PNG
                    if (buffer.length > MAX_SIZE) {
                        try {
                            buffer = await sharp(buffer, { animated: false })
                                .resize(320, 320, { fit: 'inside' })
                                .png({ compressionLevel: 9 })
                                .toBuffer();
                        } catch (compErr) {
                            logger.warn(`[StealSticker] Static PNG fallback failed: ${compErr.message}`);
                        }
                    }
                } else {
                    // PNG/APNG: resize progressively
                    for (const size of [320, 256, 200, 160, 128]) {
                        if (buffer.length <= MAX_SIZE) break;
                        try {
                            buffer = await sharp(buffer)
                                .resize(size, size, { fit: 'inside' })
                                .png({ compressionLevel: 9 })
                                .toBuffer();
                        } catch (compErr) {
                            logger.warn(`[StealSticker] PNG compression at ${size}px failed: ${compErr.message}`);
                        }
                    }
                }

                if (buffer.length > MAX_SIZE) {
                    return interaction.editReply({
                        embeds: [errorEmbed(`Sticker is still too large after compression (${(buffer.length / 1024).toFixed(0)}KB). Can't get it under 512KB.`)],
                    });
                }

                logger.info(`[StealSticker] Compressed to ${(buffer.length / 1024).toFixed(0)}KB`);
            }

            // Strip any existing server branding (gg/xxx, .gg/xxx, discord.gg/xxx etc.)
            const strippedName = customName
                .replace(/\.?gg\/\S+/gi, '')
                .replace(/discord\.\S+/gi, '')
                .replace(/[^a-zA-Z0-9_\-. ]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 30) || 'stolen_sticker';
            // Append our server branding — trim base if needed to fit within 30 char limit
            const suffix = ' .gg/blvck0ut';
            const cleanName = (strippedName.slice(0, 30 - suffix.length) + suffix).slice(0, 30);

            // Create the sticker
            const created = await interaction.guild.stickers.create({
                file: buffer,
                name: cleanName,
                tags: tag,
                description: `Stolen via blvck0ut by ${interaction.user.tag}`,
                reason: `Sticker stolen by ${interaction.user.tag} via /stealsticker`,
            });

            sendLog(interaction.client, {
                title: `${theme.emojis.crystal} Sticker Stolen`,
                description: `A sticker was stolen from another server.`,
                color: theme.colors.success,
                fields: [
                    { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: `${theme.emojis.bat} Sticker Name`, value: created.name, inline: true },
                ],
            });

            await interaction.editReply({
                embeds: [successEmbed(
                    `${theme.emojis.crystal} Sticker Stolen`,
                    `The sticker **${created.name}** has been stolen and added to this server.`,
                )],
            });

        } catch (err) {
            logger.error(`[StealSticker] Failed: ${err.message}`, err.stack);

            let reason = err.message;
            if (err.message.includes('Maximum number')) reason = 'Server sticker slots are full.';
            else if (err.message.includes('Missing Permissions')) reason = 'Bot lacks permissions to manage stickers.';
            else if (err.message.includes('Invalid Asset')) reason = 'Discord rejected the sticker file — it might be an unsupported format.';
            else if (err.message.includes('Invalid Form Body')) reason = 'Invalid sticker data. The file might be corrupted or in the wrong format.';
            else reason = reason.slice(0, 100);

            await interaction.editReply({
                embeds: [errorEmbed(`Failed to steal sticker: ${reason}`)],
            });
        }
    },
};
