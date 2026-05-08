const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');
const { sendLog } = require('../../utils/channelLog');

const upsert = db.prepare(`
    INSERT INTO guild_config (guild_id, welcome_channel_id) VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET welcome_channel_id = excluded.welcome_channel_id
`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription(`${theme.emojis.rose} Designate the gateway for arrivals`)
        .addChannelOption(opt =>
            opt.setName('channel').setDescription('The welcome channel').setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        upsert.run(interaction.guild.id, channel.id);

        sendLog(interaction.client, {
            title: `${theme.emojis.rose} Welcome Channel Updated`,
            description: `The welcome channel has been changed.`,
            color: theme.colors.success,
            fields: [
                { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.crystal} Channel`, value: `${channel} (#${channel.name})`, inline: true },
            ],
        });

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.rose} Gateway set`,
                `New souls will be welcomed in ${channel}.`,
            )],
        });
    },
};
