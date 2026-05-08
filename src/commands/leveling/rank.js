const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const leveling = require('../../utils/leveling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription(`${theme.emojis.fire} Check your level and XP`)
        .addUserOption(opt => opt.setName('user').setDescription('Check another mortal\'s rank')),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;
        const user = leveling.ensureUser(guildId, target.id);
        const progress = leveling.getLevelProgress(user);
        const bar = leveling.progressBar(progress.percentage);

        // Calculate rank
        const allUsers = leveling.getAllUsers.all(guildId);
        const rankIndex = allUsers.findIndex(u => u.user_id === target.id);
        const rank = rankIndex >= 0 ? rankIndex + 1 : allUsers.length + 1;

        const embed = createEmbed({
            title: `${theme.emojis.crystal} Level Card`,
            thumbnail: theme.gifs.rank,
            description: `**${target.username}**'s dark ascension`,
            color: theme.colors.accent,
            fields: [
                { name: `${theme.emojis.fire} Level`, value: `**${user.level}**`, inline: true },
                { name: `${theme.emojis.skull} Rank`, value: `**#${rank}** / ${allUsers.length}`, inline: true },
                { name: `${theme.emojis.bat} Messages`, value: `**${user.messages.toLocaleString()}**`, inline: true },
                { name: `${theme.emojis.moon} Progress`, value: `${bar} **${progress.percentage}%**\n${progress.currentXp.toLocaleString()} / ${progress.neededXp.toLocaleString()} XP`, inline: false },
                { name: `${theme.emojis.crystal} Total XP`, value: `**${user.total_xp.toLocaleString()}**`, inline: true },
            ],
            thumbnail: target.displayAvatarURL({ size: 256 }),
        });

        await interaction.reply({ embeds: [embed] });
    },
};
