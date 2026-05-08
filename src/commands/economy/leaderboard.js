const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { getLeaderboard } = require('../../utils/economy');
const { generateLeaderboardImage } = require('../../utils/leaderboardImage');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription(`${theme.emojis.fire} The richest souls in the realm`),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const rows = getLeaderboard.all(guildId);

        if (rows.length === 0) {
            return interaction.reply({
                embeds: [errorEmbed('No souls have been collected yet... the vault is empty.')],
                ephemeral: true,
            });
        }

        await interaction.deferReply();

        try {
            // Build entries with avatar URLs and display names
            const entries = [];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const net = row.balance + row.bank;

                // Fetch the member for display name and avatar
                let displayName = 'Unknown';
                let avatarURL = null;
                try {
                    const member = await interaction.guild.members.fetch(row.user_id);
                    displayName = member.displayName;
                    avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });
                } catch {
                    try {
                        const user = await interaction.client.users.fetch(row.user_id);
                        displayName = user.username;
                        avatarURL = user.displayAvatarURL({ extension: 'png', size: 128 });
                    } catch {
                        displayName = `User ${row.user_id.slice(-4)}`;
                    }
                }

                entries.push({
                    rank: i + 1,
                    username: displayName,
                    displayName,
                    avatarURL,
                    netWorth: net,
                });
            }

            // Find requester's rank
            const allUsers = require('../../data/database').prepare(`
                SELECT user_id, (balance + bank) as net FROM economy_users
                WHERE guild_id = ? ORDER BY net DESC
            `).all(guildId);

            const userRank = allUsers.findIndex(u => u.user_id === interaction.user.id);
            const requester = {
                rank: userRank >= 0 ? userRank + 1 : 0,
                total: allUsers.length,
            };

            // Generate the image
            const buffer = await generateLeaderboardImage(entries, requester);
            const attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.png' });

            await interaction.editReply({ files: [attachment] });
        } catch (error) {
            logger.error(`[Leaderboard] Image generation error: ${error.message}`);
            logger.error(error.stack);
            await interaction.editReply({
                embeds: [errorEmbed(`Failed to generate the leaderboard image: ${error.message}`)],
            });
        }
    },
};
