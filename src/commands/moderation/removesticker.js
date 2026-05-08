const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const logger = require('../../utils/logger');
const { sendLog } = require('../../utils/channelLog');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removesticker')
        .setDescription(`${theme.emojis.skull} Remove a sticker from the server (reply to a message with a sticker)`)
        .addStringOption(opt => opt.setName('name').setDescription('Name of the sticker to remove (if not replying)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let stickerToRemove = null;

        // Option 1: Replied to a message with a sticker (prefix command)
        if (interaction._prefixReplyData?.sticker) {
            const stickerId = interaction._prefixReplyData.sticker.id;
            // Find this sticker in the server's sticker list
            const guildStickers = await interaction.guild.stickers.fetch();
            stickerToRemove = guildStickers.find(s => s.id === stickerId);

            if (!stickerToRemove) {
                return interaction.editReply({
                    embeds: [errorEmbed('That sticker doesn\'t belong to this server — can only remove server stickers.')],
                });
            }
        }

        // Option 2: By name
        if (!stickerToRemove) {
            const name = interaction.options.getString('name');
            if (name) {
                const guildStickers = await interaction.guild.stickers.fetch();
                stickerToRemove = guildStickers.find(s => s.name.toLowerCase() === name.toLowerCase());

                if (!stickerToRemove) {
                    return interaction.editReply({
                        embeds: [errorEmbed(`No server sticker found with the name **${name}**.`)],
                    });
                }
            }
        }

        if (!stickerToRemove) {
            return interaction.editReply({
                embeds: [errorEmbed('Reply to a message with a sticker using `-removesticker`, or use `-removesticker <name>`.')],
            });
        }

        const stickerName = stickerToRemove.name;

        try {
            await stickerToRemove.delete(`Removed by ${interaction.user.tag} via /removesticker`);

            sendLog(interaction.client, {
                title: `${theme.emojis.skull} Sticker Removed`,
                description: `A sticker was removed from the server.`,
                color: theme.colors.danger,
                fields: [
                    { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: `${theme.emojis.bat} Sticker`, value: stickerName, inline: true },
                ],
            });

            await interaction.editReply({
                embeds: [successEmbed(
                    `${theme.emojis.skull} Sticker Removed`,
                    `The sticker **${stickerName}** has been removed from the server.`,
                )],
            });
        } catch (err) {
            logger.error(`[RemoveSticker] Failed: ${err.message}`);

            let reason = err.message;
            if (err.message.includes('Missing Permissions')) reason = 'Bot lacks permissions to manage stickers.';
            else reason = reason.slice(0, 100);

            await interaction.editReply({
                embeds: [errorEmbed(`Failed to remove sticker: ${reason}`)],
            });
        }
    },
};
