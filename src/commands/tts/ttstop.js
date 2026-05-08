const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { leaveTTS, isConnected } = require('../../utils/tts');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ttstop')
        .setDescription(`${theme.emojis.coffin} Silence the TTS spirit and leave VC`),

    async execute(interaction) {
        const guildId = interaction.guild.id;

        if (!isConnected(guildId)) {
            return interaction.reply({
                embeds: [errorEmbed('The TTS spirit is not active.')],
                ephemeral: true,
            });
        }

        leaveTTS(guildId);

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.coffin} Spirit Banished`,
                'The TTS spirit retreats to the void. Silence returns.',
            )],
        });
    },
};
