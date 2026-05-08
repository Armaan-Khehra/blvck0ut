const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const logger = require('../../utils/logger');
const { TRANSFER_TAX, STARTING_BALANCE } = require('../../utils/economy');

const EMBED_COLOR = 0x0d0d0d;
const FOOTER_TEXT = '♱ blvck0ut • embrace the void\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003';

const TAX_PERCENT = Math.round(TRANSFER_TAX * 100);

const GIFS = {
    banner:   'https://media.tenor.com/CuSESkhuAbAAAAAM/skull-smoke.gif',
    currency: 'https://media.tenor.com/p5AuoSVzvtgAAAAM/darksouls-coin-darksouls-gold-coin.gif',
    transfer: 'https://media.tenor.com/hu1VnVyPUu0AAAAM/ghost-spirit.gif',
    perks:    'https://media1.tenor.com/m/rSdLVVXVJ8cAAAAC/dark-gothic.gif',
    closing:  'https://media1.tenor.com/m/xFhmcVVSbp8AAAAC/fire-purple.gif',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economypost')
        .setDescription(`${theme.emojis.skull} Post the 'About Our Economy' info display`)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // Resolve animated emojis dynamically from the bot's cache
        const E = theme.resolveAnimatedEmojis(interaction.client);
        const BORDER = E.border;

        try {
            // Post into the current channel (run this command inside the target thread)
            const channel = interaction.channel;

            // If it's a thread, make sure it's not archived
            if (channel.archived) {
                await channel.setArchived(false);
            }

            // ═══════════════════════════════════════════
            //  BANNER
            // ═══════════════════════════════════════════
            await channel.send({ embeds: [new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setDescription([
                    BORDER,
                    '',
                    `# ${E.skull} A B O U T   O U R   E C O N O M Y ${E.skull}`,
                    `### *the blvck0ut soul economy — earn, spend, ascend.*`,
                    '',
                    BORDER,
                ].join('\n'))
                .setThumbnail(GIFS.banner)
                .setFooter({ text: FOOTER_TEXT }),
            ] });

            // ═══════════════════════════════════════════
            //  WHAT ARE SOULS?
            // ═══════════════════════════════════════════
            await channel.send({ embeds: [new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setDescription([
                    `## ${E.crystal}  what are souls?`,
                    '',
                    `> the blvck0ut economy is a **chat-to-earn** system.`,
                    `> earn our server currency, ${E.souls} **souls**, just by`,
                    `> actively chatting and engaging.`,
                    '',
                    `${E.rose} **${E.souls} souls**`,
                    `> type \`/balance\` to see your current balance`,
                    `> or just simply type \`souls\` for quick access`,
                    '',
                    `${E.bat} **starting balance:** ${E.souls} **${STARTING_BALANCE.toLocaleString()}** souls`,
                    `> every soul that enters the void starts with this offering`,
                    '',
                    `${E.fire} **daily offering:** type \`/daily\` or \`-daily\``,
                    `> to receive ${E.souls} **1,500** souls once every 24 hours`,
                    '',
                    BORDER,
                ].join('\n'))
                .setThumbnail(GIFS.currency)
                .setFooter({ text: FOOTER_TEXT }),
            ] });

            // ═══════════════════════════════════════════
            //  TRANSFERS
            // ═══════════════════════════════════════════
            await channel.send({ embeds: [new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setDescription([
                    `## ${E.ribbon}  transfers`,
                    '',
                    `> transfer via \`/give\` or \`-give\``,
                    '',
                    `${E.cross} amount must be between ${E.souls} **1** to **infinity**`,
                    `${E.skull} **${TAX_PERCENT}% tax** for each transfer`,
                    `${E.heart} the void takes its cut — choose wisely`,
                    '',
                    BORDER,
                ].join('\n'))
                .setThumbnail(GIFS.transfer)
                .setFooter({ text: FOOTER_TEXT }),
            ] });

            // ═══════════════════════════════════════════
            //  WHAT CAN YOU DO WITH SOULS?
            // ═══════════════════════════════════════════
            await channel.send({ embeds: [new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setDescription([
                    `## ${E.fire}  what can you do with souls?`,
                    '',
                    `> use your ${E.souls} souls to buy **special roles** with perks`,
                    `> that basic members don't get, such as:`,
                    '',
                    `${E.heart} higher role hierarchy placement`,
                    `${E.rose} exclusive role color`,
                    `${E.crystal} media permissions`,
                    `${E.bat} bypass slow mode`,
                    `${E.ribbon} early access to locked channels`,
                    `${E.cross} change your server nickname`,
                    `${E.puff} custom autoresponder`,
                    `${E.skull} custom role`,
                    '',
                    `### ${E.crystal}  other ways to unlock perks:`,
                    `> ${E.fire} repping, boosting, or just staying`,
                    `> consistently active in the server.`,
                    '',
                    `*easy to earn, dark to flex, and oh-so void-coded.*`,
                    `*which perk are you grinding for ${E.souls} first?*`,
                    '',
                    BORDER,
                ].join('\n'))
                .setThumbnail(GIFS.perks)
                .setFooter({ text: FOOTER_TEXT }),
            ] });

            // ═══════════════════════════════════════════
            //  USEFUL COMMANDS
            // ═══════════════════════════════════════════
            await channel.send({ embeds: [new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setDescription([
                    `## ${E.puff}  useful commands`,
                    '',
                    `> ${E.souls} \`/balance\` — check your wallet & bank`,
                    `> ${E.ribbon} \`/shop\` — browse the soul shop`,
                    `> ${E.crystal} \`/inventory\` — see items you own`,
                    `> ${E.fire} \`/daily\` — collect your daily offering`,
                    `> ${E.skull} \`/leaderboard\` — see the richest souls`,
                    `> ${E.bat} \`/cooldowns\` — check your cooldown timers`,
                    `> ${E.rose} \`/multiplier\` — see your earning multiplier`,
                    '',
                    `> *prefix:* \`-bal\` \`-shop\` \`-inv\` \`-daily\` \`-lb\` \`-cd\``,
                    '',
                    `*need help? just type \`-help\` or reach out to staff ${E.heart}*`,
                    '',
                    BORDER,
                ].join('\n'))
                .setThumbnail(GIFS.closing)
                .setFooter({ text: FOOTER_TEXT })
                .setTimestamp(),
            ] });

            await interaction.editReply({ embeds: [createEmbed({ description: `${E.skull} Economy info posted.`, color: theme.colors.success })] });
        } catch (error) {
            logger.error(`[EconomyPost] Error: ${error.message}`);
            await interaction.editReply({ embeds: [errorEmbed(`Failed to post: ${error.message}`)] }).catch(() => {});
        }
    },
};
