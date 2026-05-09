const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');
const { sendLog } = require('../../utils/channelLog');

// Ensure a row exists, then update only the welcome_ping_enabled column.
const upsert = db.prepare(`
    INSERT INTO guild_config (guild_id, welcome_ping_enabled) VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET welcome_ping_enabled = excluded.welcome_ping_enabled
`);

const getConfig = db.prepare('SELECT welcome_ping_enabled FROM guild_config WHERE guild_id = ?');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcomeping')
        .setDescription(`${theme.emojis.bat} Toggle the public welcome ping in general chat`)
        .addSubcommand(sub =>
            sub.setName('enable').setDescription('Resume welcome pings for new members'))
        .addSubcommand(sub =>
            sub.setName('disable').setDescription('Silence welcome pings (e.g. while inviting alts / boost accounts)'))
        .addSubcommand(sub =>
            sub.setName('status').setDescription('Check whether welcome pings are currently on or off'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'status') {
            const row = getConfig.get(guildId);
            // Default to enabled when no row exists yet.
            const enabled = !row || row.welcome_ping_enabled !== 0;

            const embed = createEmbed({
                title: `${theme.emojis.bat} Welcome ping`,
                description: enabled
                    ? `${theme.emojis.fire} **Enabled** — new members get pinged in the welcome channel.`
                    : `${theme.emojis.skull} **Disabled** — joins will arrive silently.`,
                color: enabled ? theme.colors.accent : theme.colors.void,
            });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const enable = sub === 'enable';
        upsert.run(guildId, enable ? 1 : 0);

        sendLog(interaction.client, {
            title: `${theme.emojis.bat} Welcome Ping ${enable ? 'Enabled' : 'Disabled'}`,
            description: enable
                ? 'New member welcome pings have been resumed.'
                : 'New member welcome pings have been silenced.',
            color: enable ? theme.colors.success : theme.colors.blood,
            fields: [
                { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
            ],
        });

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.bat} Welcome ping ${enable ? 'enabled' : 'disabled'}`,
                enable
                    ? `New souls will be greeted in the welcome channel again.`
                    : `Joins will arrive silently. Run \`/welcomeping enable\` to turn them back on.`,
            )],
            ephemeral: true,
        });
    },
};
