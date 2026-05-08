const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverstats')
        .setDescription(`${theme.emojis.skull} Gaze upon the crypt's records`),

    async execute(interaction) {
        const guild = interaction.guild;

        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const roles = guild.roles.cache.size - 1; // exclude @everyone
        const emojis = guild.emojis.cache.size;
        const createdAt = Math.floor(guild.createdTimestamp / 1000);

        const embed = createEmbed({
            thumbnail: theme.gifs.serverstats,
            title: `${theme.emojis.skull} Crypt Records \u2022 ${guild.name}`,
            color: theme.colors.accent,
            thumbnail: guild.iconURL({ size: 256 }),
            fields: [
                { name: `${theme.emojis.bat} Souls`, value: `${guild.memberCount}`, inline: true },
                { name: `${theme.emojis.candle} Text Crypts`, value: `${textChannels}`, inline: true },
                { name: `${theme.emojis.music} Voice Chambers`, value: `${voiceChannels}`, inline: true },
                { name: `${theme.emojis.chain} Roles`, value: `${roles}`, inline: true },
                { name: `${theme.emojis.rose} Emojis`, value: `${emojis}`, inline: true },
                { name: `${theme.emojis.moon} Founded`, value: `<t:${createdAt}:R>`, inline: true },
                { name: `${theme.emojis.spider} Owner`, value: `<@${guild.ownerId}>`, inline: true },
                { name: `${theme.emojis.crystal} Boost Level`, value: `${guild.premiumTier || 'None'}`, inline: true },
            ],
        });

        await interaction.reply({ embeds: [embed] });
    },
};
