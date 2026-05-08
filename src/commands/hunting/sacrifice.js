const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sacrifice')
        .setDescription(`${theme.emojis.candle} Sacrifice a creature to gain essence`),

    async execute(interaction) {
        const embed = createEmbed({
            title: `${theme.emojis.candle} The Altar`,
            description: [
                '*The sacrificial altar hums with dark energy...*',
                '',
                '**Coming soon.**',
                '',
                'Sacrifice creatures to gain **Essence** — a dark currency used to:',
                '• Upgrade your auto-hunt familiar',
                '• Purchase powerful items from the void shop',
                '• Enhance your battle team',
                '',
                '*The ritual is not yet ready. Return later, hunter.*',
            ].join('\n'),
            color: theme.colors.blood,
        });

        return interaction.reply({ embeds: [embed] });
    },
};
