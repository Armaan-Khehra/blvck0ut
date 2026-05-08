const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { VOICES, getUserVoice, setUserVoice, isConnected, queueTTS } = require('../../utils/tts');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice')
        .setDescription(`${theme.emojis.crystal} Choose your TTS voice`)
        .addStringOption(opt => {
            opt.setName('name').setDescription('Voice name');
            for (const [key, voice] of Object.entries(VOICES)) {
                opt.addChoices({ name: `${voice.emoji} ${voice.label} — ${voice.desc}`, value: key });
            }
            return opt;
        }),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const choice = interaction.options.getString('name');

        if (choice) {
            // Direct voice selection via option
            const success = setUserVoice(guildId, userId, choice);
            if (!success) {
                return interaction.reply({
                    embeds: [errorEmbed('Unknown voice. Use `/voice` to see the list.')],
                    ephemeral: true,
                });
            }

            const voice = VOICES[choice];
            const embed = createEmbed({
                title: `${voice.emoji} Voice Changed`,
                description: `Your TTS voice is now **${voice.label}**\n*${voice.desc}*`,
                color: theme.colors.accent,
            });

            // Play a preview if connected
            if (isConnected(guildId)) {
                queueTTS(guildId, `${interaction.member.displayName} now speaks with the ${voice.label} voice`, choice);
            }

            return interaction.reply({ embeds: [embed] });
        }

        // No option given — show the full voice list
        const currentKey = getUserVoice(guildId, userId);
        const current = VOICES[currentKey];

        const lines = Object.entries(VOICES).map(([key, v]) => {
            const marker = key === currentKey ? ' **\u2190 current**' : '';
            return `${v.emoji} **${v.label}** — *${v.desc}*${marker}`;
        });

        const embed = createEmbed({
            title: `${theme.emojis.crystal} TTS Voices`,
            description: [
                `Current voice: ${current.emoji} **${current.label}**`,
                '',
                ...lines,
                '',
                'Use `-voice <name>` or `/voice <name>` to switch',
            ].join('\n'),
            color: theme.colors.accent,
        });

        return interaction.reply({ embeds: [embed] });
    },
};
