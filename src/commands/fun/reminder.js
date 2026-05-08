const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');

const insertReminder = db.prepare(
    'INSERT INTO reminders (guild_id, channel_id, user_id, message, remind_at) VALUES (?, ?, ?, ?, ?)'
);

function parseDuration(input) {
    const match = input.match(/^(\d+)\s*(m|min|h|hr|d|day|s|sec)s?$/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = { s: 1000, sec: 1000, m: 60000, min: 60000, h: 3600000, hr: 3600000, d: 86400000, day: 86400000 };
    return value * (multipliers[unit] || 0);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminder')
        .setDescription(`${theme.emojis.candle} The shadows will remind you`)
        .addStringOption(opt => opt.setName('time').setDescription('When (e.g. 30m, 2h, 1d)').setRequired(true))
        .addStringOption(opt => opt.setName('message').setDescription('What to remember').setRequired(true)),

    async execute(interaction) {
        const timeStr = interaction.options.getString('time');
        const message = interaction.options.getString('message');

        const ms = parseDuration(timeStr);
        if (!ms || ms < 1000 || ms > 7 * 86400000) {
            return interaction.reply({
                embeds: [errorEmbed('Invalid time. Use formats like `30s`, `5m`, `2h`, `1d`. Max 7 days.')],
                ephemeral: true,
            });
        }

        const remindAt = new Date(Date.now() + ms).toISOString();
        insertReminder.run(interaction.guild.id, interaction.channel.id, interaction.user.id, message, remindAt);

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.candle} Reminder set`,
                `The shadows will whisper to you in **${timeStr}**.\n\n> ${message}`,
                theme.gifs.reminder,
            )],
        });
    },
};
