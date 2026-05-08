const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const logger = require('../../utils/logger');
const { sendLog } = require('../../utils/channelLog');

// Matches custom Discord emojis: <:name:id> or <a:name:id>
const EMOJI_REGEX = /<(a?):(\w+):(\d+)>/g;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steal')
        .setDescription(`${theme.emojis.crystal} Steal emojis from other servers`)
        .addStringOption(opt => opt.setName('emojis').setDescription('Paste the emoji(s) you want to steal').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('Custom name for the emoji (single emoji only)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const input = interaction.options.getString('emojis');
        const customName = interaction.options.getString('name');

        // Parse all custom emojis from the input
        const emojis = [];
        let match;
        // Reset regex state
        EMOJI_REGEX.lastIndex = 0;
        while ((match = EMOJI_REGEX.exec(input)) !== null) {
            emojis.push({
                animated: match[1] === 'a',
                name: match[2],
                id: match[3],
            });
        }

        if (emojis.length === 0) {
            return interaction.editReply({
                embeds: [errorEmbed('No custom emojis found. Paste Discord emojis like 🔮 (custom ones, not unicode).')],
            });
        }

        // If a custom name is provided, only apply it to the first emoji
        if (customName && emojis.length === 1) {
            emojis[0].name = customName.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32);
        }

        const results = { success: [], failed: [] };

        for (let idx = 0; idx < emojis.length; idx++) {
            const emoji = emojis[idx];
            const ext = emoji.animated ? 'gif' : 'png';
            const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}?size=128&quality=lossless`;

            // Small delay between requests to avoid rate limits
            if (idx > 0) await new Promise(r => setTimeout(r, 1000));

            try {
                // Fetch the emoji image with timeout
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeout);
                if (!response.ok) {
                    results.failed.push({ name: emoji.name, reason: `Download failed (${response.status})` });
                    continue;
                }

                const buffer = Buffer.from(await response.arrayBuffer());

                // Check file size (Discord limit is 256KB for emojis)
                if (buffer.length > 256 * 1024) {
                    results.failed.push({ name: emoji.name, reason: 'Too large (>256KB)' });
                    continue;
                }

                // Create the emoji in the server
                const dataUri = `data:image/${ext};base64,${buffer.toString('base64')}`;
                const created = await interaction.guild.emojis.create({
                    attachment: dataUri,
                    name: emoji.name,
                    reason: `Stolen by ${interaction.user.tag} via /steal`,
                });

                results.success.push(created.toString());
            } catch (err) {
                logger.error(`[Steal] Failed to steal ${emoji.name}: ${err.message}`);

                let reason = 'Unknown error';
                if (err.message.includes('Maximum number')) reason = 'Server emoji slots full';
                else if (err.message.includes('Missing Permissions')) reason = 'Bot lacks permissions';
                else if (err.message.includes('Invalid Form Body')) reason = 'Invalid emoji data';
                else reason = err.message.slice(0, 50);

                results.failed.push({ name: emoji.name, reason });
            }
        }

        // Build response
        const parts = [];
        if (results.success.length > 0) {
            parts.push(`**Stolen:** ${results.success.join(' ')}`);
        }
        if (results.failed.length > 0) {
            const failedList = results.failed.map(f => `\`${f.name}\` — ${f.reason}`).join('\n');
            parts.push(`**Failed:**\n${failedList}`);
        }

        if (results.success.length > 0) {
            sendLog(interaction.client, {
                title: `${theme.emojis.crystal} Emoji Stolen`,
                description: `Emoji(s) were stolen from another server.`,
                color: theme.colors.success,
                fields: [
                    { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: `${theme.emojis.bat} Stolen`, value: results.success.join(' ').slice(0, 1024) || 'N/A', inline: false },
                    { name: `${theme.emojis.skull} Failed`, value: `${results.failed.length}`, inline: true },
                ],
            });

            await interaction.editReply({
                embeds: [successEmbed(
                    `${theme.emojis.crystal} Emoji${results.success.length > 1 ? 's' : ''} Stolen`,
                    parts.join('\n\n'),
                    theme.gifs.steal,
                )],
            });
        } else {
            await interaction.editReply({
                embeds: [errorEmbed(parts.join('\n\n'))],
            });
        }
    },
};
