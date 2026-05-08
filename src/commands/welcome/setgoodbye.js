const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');
const { sendLog } = require('../../utils/channelLog');

const upsert = db.prepare(`
    INSERT INTO guild_config (guild_id, goodbye_channel_id) VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET goodbye_channel_id = excluded.goodbye_channel_id
`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setgoodbye')
        .setDescription(`${theme.emojis.coffin} Designate the crypt for departures`)
        .addChannelOption(opt =>
            opt.setName('channel').setDescription('The farewell channel').setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        upsert.run(interaction.guild.id, channel.id);

        sendLog(interaction.client, {
            title: `${theme.emojis.coffin} Goodbye Channel Updated`,
            description: `The farewell channel has been changed.`,
            color: theme.colors.success,
            fields: [
                { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.crystal} Channel`, value: `${channel} (#${channel.name})`, inline: true },
            ],
        });

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.coffin} Crypt designated`,
                `Departing souls will be mourned in ${channel}.`,
            )],
        });
    },
};
