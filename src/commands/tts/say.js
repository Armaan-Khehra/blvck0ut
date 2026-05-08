const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { isConnected, queueTTS, getUserVoice } = require('../../utils/tts');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription(`${theme.emojis.moon} Make the bot say something in VC`)
        .addStringOption(opt => opt.setName('text').setDescription('What to say').setRequired(true)),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        if (!isConnected(guildId)) {
            return interaction.reply({
                embeds: [errorEmbed('The TTS spirit is not active. Use `-tts` first to summon it.')],
                ephemeral: true,
            });
        }

        const text = interaction.options.getString('text');
        if (!text || text.trim().length === 0) {
            return interaction.reply({ content: 'Say something...', ephemeral: true });
        }

        const voiceKey = getUserVoice(guildId, userId);
        queueTTS(guildId, text.trim(), voiceKey);

        await interaction.reply({
            content: `${theme.emojis.moon} Speaking: *${text.trim().slice(0, 100)}${text.length > 100 ? '...' : ''}*`,
        });
    },
};
