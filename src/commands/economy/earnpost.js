const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

const EMBED_COLOR = 0x0d0d0d;
const FOOTER_TEXT = '♱ blvck0ut • embrace the void\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003';

const GIFS = {
    banner:   'https://media.tenor.com/CuSESkhuAbAAAAAM/skull-smoke.gif',
    passive:  'https://media.tenor.com/p5AuoSVzvtgAAAAM/darksouls-coin-darksouls-gold-coin.gif',
    commands: 'https://media1.tenor.com/m/xFhmcVVSbp8AAAAC/fire-purple.gif',
    rp:       'https://media1.tenor.com/m/rSdLVVXVJ8cAAAAC/dark-gothic.gif',
    gamble:   'https://media.tenor.com/jTN5-Xr0U6oAAAAM/slot-machine-slots.gif',
    drops:    'https://media.tenor.com/A1xLYeCAOh0AAAAM/la-black-spirit-ghost.gif',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('earnpost')
        .setDescription(`${theme.emojis.skull} Post the 'How to Earn Souls' guide`)
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
                `# ${E.skull} H O W   T O   E A R N   S O U L S ${E.skull}`,
                `### *every soul in the void has a price — here's how to collect.*`,
                '',
                BORDER,
            ].join('\n'))
            .setThumbnail(GIFS.banner)
            .setFooter({ text: FOOTER_TEXT }),
        ] });

        // ═══════════════════════════════════════════
        //  PASSIVE EARNING
        // ═══════════════════════════════════════════
        await channel.send({ embeds: [new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setDescription([
                `## ${E.crystal}  passive earning`,
                '',
                `> this allows passive generation of income for`,
                `> members who are actively chatting in the server`,
                '',
                `${E.souls} **amount given:** between ${E.souls} **10** to **30**`,
                `${E.bat} **cooldown:** 30 seconds`,
                '',
                `> just keep talking — the void rewards the devoted.`,
                '',
                `${E.rose} type \`/leaderboard\` to see your server rank`,
                `${E.ribbon} type \`/inventory\` to see items you currently own`,
                '',
                BORDER,
            ].join('\n'))
            .setThumbnail(GIFS.passive)
            .setFooter({ text: FOOTER_TEXT }),
        ] });

        // ═══════════════════════════════════════════
        //  EARNING COMMANDS
        // ═══════════════════════════════════════════
        await channel.send({ embeds: [new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setDescription([
                `## ${E.fire}  earning commands`,
                '',
                `${E.skull} **\`/daily\`** — daily soul offering`,
                `> amount: ${E.souls} **1,500** ・ cooldown: **24 hours**`,
                '',
                `${E.bat} **\`/work\`** — dark labor`,
                `> amount: ${E.souls} **500 — 2,000** ・ cooldown: **5 minutes**`,
                '',
                `${E.cross} **\`/crime\`** — risky heist`,
                `> success (55%): ${E.souls} **1,000 — 5,000**`,
                `> failure: lose ${E.souls} **500 — 1,500** ・ cooldown: **10 minutes**`,
                '',
                `${E.fire} **\`/clickcake\`** — (coming soon)`,
                '',
                `> *all amounts are affected by your multiplier ${E.crystal}*`,
                '',
                BORDER,
            ].join('\n'))
            .setThumbnail(GIFS.commands)
            .setFooter({ text: FOOTER_TEXT }),
        ] });

        // ═══════════════════════════════════════════
        //  SOUL DROPS & PICK
        // ═══════════════════════════════════════════
        await channel.send({ embeds: [new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setDescription([
                `## ${E.puff}  soul drops`,
                '',
                `> the void randomly spawns lost souls in active channels,`,
                `> allowing users to \`/pick\` dropped currency`,
                '',
                `${E.souls} **amount given:** between ${E.souls} **200** to **2,000**`,
                `${E.bat} **type:** 1 person can pick per spawn`,
                `${E.cross} **speed:** you have **30 seconds** to claim`,
                `${E.crystal} **requires:** no code needed — just be fast`,
                '',
                `> *stay active and keep your eyes open ${E.skull}*`,
                '',
                BORDER,
            ].join('\n'))
            .setThumbnail(GIFS.drops)
            .setFooter({ text: FOOTER_TEXT }),
        ] });

        // ═══════════════════════════════════════════
        //  GAMBLING / LUCK
        // ═══════════════════════════════════════════
        await channel.send({ embeds: [new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setDescription([
                `## ${E.heart}  luck / chance / reward`,
                '',
                `> bet amount must be between ${E.souls} **100** to **25,000**`,
                '',
                `${E.skull} **\`/coinflip <amount> <heads|tails>\`**`,
                `> pick a side — **1.8x** payout on win`,
                '',
                `${E.bat} **\`/dice <amount>\`**`,
                `> roll against the house — **2x** payout on win`,
                '',
                `${E.fire} **\`/slots <amount>\`**`,
                `> spin the void machine — **2x to 15x** payout`,
                '',
                `> *the house always has an edge... but fortune`,
                `> favors the bold ${E.crystal}*`,
                '',
                BORDER,
            ].join('\n'))
            .setThumbnail(GIFS.gamble)
            .setFooter({ text: FOOTER_TEXT }),
        ] });

        // ═══════════════════════════════════════════
        //  ROLEPLAY COMMANDS
        // ═══════════════════════════════════════════
        await channel.send({ embeds: [new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setDescription([
                `## ${E.rose}  roleplay commands`,
                '',
                `> must include the \`>\` prefix to trigger these commands`,
                `> these commands can **increase or decrease** your souls`,
                `> between ${E.souls} **600** to **6,000**, so choose carefully`,
                `> **cooldown:** between 1 to 6 minutes`,
                '',
                `### ${E.heart}  dark intimacy`,
                `> \`>bite\` \`>embrace\` \`>chain\` \`>possess\``,
                `> \`>bleed\` \`>whisper\` \`>seduce\` \`>bind\``,
                '',
                `### ${E.skull}  occult actions`,
                `> \`>ritual\` \`>summon\` \`>hex\` \`>sacrifice\``,
                `> \`>resurrect\` \`>conjure\` \`>invoke\` \`>banish\``,
                '',
                `### ${E.bat}  gothic expression`,
                `> \`>haunt\` \`>wither\` \`>decay\` \`>lament\``,
                `> \`>scream\` \`>mourn\` \`>torment\` \`>brood\``,
                '',
                `### ${E.cross}  violent / aggressive`,
                `> \`>stab\` \`>devour\` \`>curse\` \`>reap\``,
                `> \`>strangle\` \`>impale\` \`>shatter\` \`>consume\``,
                '',
                `> ${E.fire} **warning:** certain words may also increase or`,
                `> decrease your souls between ${E.souls} **1** to **100,000**,`,
                `> so watch what you say`,
                '',
                BORDER,
            ].join('\n'))
            .setThumbnail(GIFS.rp)
            .setFooter({ text: FOOTER_TEXT }),
        ] });

        // ═══════════════════════════════════════════
        //  CLOSING / COOLDOWNS
        // ═══════════════════════════════════════════
        await channel.send({ embeds: [new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setDescription([
                `## ${E.ribbon}  cooldowns`,
                '',
                `> type \`/cooldowns\` to see all commands currently on cooldown`,
                `> certain commands have cooldowns to prevent abuse`,
                '',
                `*the void rewards patience and devotion.*`,
                `*grind, gamble, roleplay — ascend through the darkness ${E.skull}*`,
                '',
                BORDER,
            ].join('\n'))
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp(),
        ] });

        await interaction.editReply({ embeds: [createEmbed({ description: `${E.skull} Earn guide posted.`, color: theme.colors.success })] });
        } catch (error) {
            const logger = require('../../utils/logger');
            logger.error(`[EarnPost] Error: ${error.message}`);
            await interaction.editReply({ embeds: [require('../../utils/embeds').errorEmbed(`Failed to post: ${error.message}`)] }).catch(() => {});
        }
    },
};
