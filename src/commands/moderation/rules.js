const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription(`${theme.emojis.skull} Post the server rules & info panel`)
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('Channel to send the rules in')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');

        const E = theme.resolveAnimatedEmojis
            ? theme.resolveAnimatedEmojis(interaction.client)
            : null;
        const border = E?.border || `${theme.emojis.skull}${theme.emojis.fire}${theme.emojis.bat}${theme.emojis.rose}${theme.emojis.crystal}${theme.emojis.dagger}${theme.emojis.skull}${theme.emojis.fire}${theme.emojis.bat}${theme.emojis.rose}${theme.emojis.crystal}${theme.emojis.dagger}`;

        const infoEmbed = createEmbed({
            title: `${theme.emojis.skull} BLVCK0UT ${theme.emojis.skull}`,
            description: [
                border,
                '',
                `${theme.emojis.bat} **Welcome to the void.**`,
                '',
                `This server is **16+** and unapologetically toxic.`,
                `We talk shit, we roast, we don't baby anyone.`,
                `If you can't handle the heat, the exit is right there.`,
                '',
                `But even in the darkness, there are lines.`,
                `Read the rules below or get banished.`,
                '',
                border,
            ].join('\n'),
            color: theme.colors.void,
        });

        const rulesEmbed = createEmbed({
            title: `${theme.emojis.dagger} SERVER RULES ${theme.emojis.dagger}`,
            description: [
                border,
                '',
                `**1.** ${theme.emojis.fire} **16+ Only**`,
                `> This is not a kids' server. If you're under 16, leave now.`,
                '',
                `**2.** ${theme.emojis.skull} **No Slurs**`,
                `> Being toxic is one thing. Slurs are another.`,
                `> Don't throw around racial, homophobic, or any other slurs.`,
                `> You will get warned, then banned. No exceptions.`,
                '',
                `**3.** ${theme.emojis.rose} **No NSFW**`,
                `> Keep that shit out of here. No NSFW images, videos, links, or content.`,
                `> This includes profile pictures and usernames.`,
                '',
                `**4.** ${theme.emojis.bat} **Toxicity ≠ Harassment**`,
                `> Banter and roasting are fine. Genuine targeted harassment is not.`,
                `> Know the difference or get removed.`,
                '',
                `**5.** ${theme.emojis.crystal} **No Spam / Self-Promo**`,
                `> Don't flood channels with garbage. No unsolicited ads or self-promo.`,
                '',
                `**6.** ${theme.emojis.candle} **Listen to Staff**`,
                `> Mods and admins have the final say. Argue and find out.`,
                '',
                `**7.** ${theme.emojis.chain} **Follow Discord TOS**`,
                `> At the end of the day, Discord's rules still apply.`,
                '',
                border,
                '',
                `*By staying in this server, you agree to these rules.*`,
                `*Break them and the void will consume you.* ${theme.emojis.skull}`,
            ].join('\n'),
            color: theme.colors.danger,
        });

        try {
            await channel.send({ embeds: [infoEmbed, rulesEmbed] });

            await interaction.reply({
                embeds: [successEmbed(
                    `${theme.emojis.skull} Rules Posted`,
                    `Server rules have been sent to ${channel}.`,
                )],
                ephemeral: true,
            });
        } catch (error) {
            await interaction.reply({
                embeds: [errorEmbed(`Failed to send rules to ${channel}: \`${error.message}\``)],
                ephemeral: true,
            });
        }
    },
};
