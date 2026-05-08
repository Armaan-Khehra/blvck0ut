const { SlashCommandBuilder } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');

const setAfk = db.prepare(
    'INSERT OR REPLACE INTO afk_users (guild_id, user_id, reason) VALUES (?, ?, ?)'
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription(`${theme.emojis.moon} Set yourself as AFK`)
        .addStringOption(opt => opt.setName('reason').setDescription('Why are you going AFK?').setRequired(false)),

    async execute(interaction) {
        const reason = interaction.options.getString('reason') || 'AFK';

        setAfk.run(interaction.guild.id, interaction.user.id, reason);

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.moon} AFK Set`,
                `**${interaction.user.tag}** is now AFK: ${reason}`,
                theme.gifs.afk,
            )],
        });
    },
};
