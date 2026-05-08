const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { sendLog } = require('../../utils/channelLog');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription(`${theme.emojis.bat} Send a message or image to a channel as the bot`)
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send in').setRequired(true))
        .addAttachmentOption(opt => opt.setName('image').setDescription('Image to send').setRequired(false))
        .addStringOption(opt => opt.setName('message').setDescription('Text message to send').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const attachment = interaction.options.getAttachment('image');
        const text = interaction.options.getString('message');

        if (!attachment && !text) {
            return interaction.reply({ embeds: [errorEmbed('Provide an image, a message, or both.')], ephemeral: true });
        }

        try {
            const payload = {};

            if (text) payload.content = text;
            if (attachment) payload.files = [{ attachment: attachment.url, name: attachment.name }];

            await channel.send(payload);

            sendLog(interaction.client, {
                title: `${theme.emojis.bat} Bot Message Sent`,
                description: `A message was sent as the bot.`,
                color: theme.colors.danger,
                fields: [
                    { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: `${theme.emojis.crystal} Target Channel`, value: `${channel} (#${channel.name})`, inline: true },
                    { name: `${theme.emojis.candle} Content`, value: (text || '*[image only]*').slice(0, 1024), inline: false },
                ],
            });

            await interaction.reply({
                embeds: [successEmbed(
                    `${theme.emojis.bat} Sent`,
                    `Message delivered to ${channel}.`,
                )],
                ephemeral: true,
            });
        } catch (error) {
            await interaction.reply({
                embeds: [errorEmbed(`Failed to send to ${channel}: \`${error.message}\``)],
                ephemeral: true,
            });
        }
    },
};
