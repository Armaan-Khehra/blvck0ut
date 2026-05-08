const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { getMonsterEmoji, getMonsterImageUrl } = require('../../utils/monsterEmojis');
const { formatCooldown, addSouls, getCurrencyEmoji } = require('../../utils/economy');
const {
    MONSTERS,
    ensureHuntProfile,
    getTeam,
    getEffectiveStats,
    checkBattleCooldown,
    recordBattleWin,
    recordBattleLoss,
    simulateBattle,
    calculateBattleReward,
} = require('../../utils/hunting');

const activeBattles = new Set();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('battle')
        .setDescription('⚔️ Challenge another player to a PvP battle')
        .addUserOption(opt => opt.setName('opponent').setDescription('The player to challenge').setRequired(true)),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const challenger = interaction.user;
        const opponent = interaction.options.getUser('opponent');

        if (!opponent) return interaction.reply({ embeds: [errorEmbed('Mention a player to challenge! Usage: `-battle @user`')] });
        if (opponent.id === challenger.id) return interaction.reply({ embeds: [errorEmbed('You can\'t battle yourself, shadow warrior.')] });
        if (opponent.bot) return interaction.reply({ embeds: [errorEmbed('Bots don\'t have souls to fight with.')] });

        const cKey = `${guildId}_${challenger.id}`;
        const dKey = `${guildId}_${opponent.id}`;
        if (activeBattles.has(cKey)) return interaction.reply({ embeds: [errorEmbed('You\'re already in a battle!')] });
        if (activeBattles.has(dKey)) return interaction.reply({ embeds: [errorEmbed(`**${opponent.username}** is already in a battle!`)] });

        ensureHuntProfile(guildId, challenger.id);
        ensureHuntProfile(guildId, opponent.id);

        const cCooldown = checkBattleCooldown(guildId, challenger.id);
        if (cCooldown > 0) return interaction.reply({ embeds: [errorEmbed(`Your wounds haven't healed. Wait **${formatCooldown(cCooldown)}**.`)] });
        const dCooldown = checkBattleCooldown(guildId, opponent.id);
        if (dCooldown > 0) return interaction.reply({ embeds: [errorEmbed(`**${opponent.username}** is still recovering. Wait **${formatCooldown(dCooldown)}**.`)] });

        const challengerTeam = getTeam(guildId, challenger.id);
        const opponentTeam = getTeam(guildId, opponent.id);
        const cFilled = challengerTeam.filter(s => s.monster_collection_id);
        const dFilled = opponentTeam.filter(s => s.monster_collection_id);

        if (cFilled.length === 0) return interaction.reply({ embeds: [errorEmbed('Your team is empty! Use `-team set 1 <monster>` to build your team.')] });
        if (dFilled.length === 0) return interaction.reply({ embeds: [errorEmbed(`**${opponent.username}** doesn't have a team set up yet.`)] });

        // ─── Challenge ───
        const cEmojis = cFilled.map(s => getMonsterEmoji(s.monster_id, MONSTERS[s.monster_id]?.fallbackEmoji || '?')).join(' ');
        const dEmojis = dFilled.map(s => getMonsterEmoji(s.monster_id, MONSTERS[s.monster_id]?.fallbackEmoji || '?')).join(' ');

        const sent = await interaction.reply({
            embeds: [createEmbed({
                description: `⚔️ **${challenger.username}** challenges **${opponent.username}**!\n\n${cEmojis}  **vs**  ${dEmojis}\n\n${opponent}, do you accept?`,
                color: theme.colors.blood,
            })],
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`battle_accept_${challenger.id}_${opponent.id}`).setLabel('Accept').setStyle(ButtonStyle.Success).setEmoji('⚔️'),
                new ButtonBuilder().setCustomId(`battle_decline_${challenger.id}_${opponent.id}`).setLabel('Decline').setStyle(ButtonStyle.Danger).setEmoji('❌'),
            )],
            fetchReply: true,
        });

        const collector = sent.createMessageComponentCollector({ filter: i => i.user.id === opponent.id, time: 30_000, max: 1 });

        collector.on('collect', async (btn) => {
            if (btn.customId.startsWith('battle_decline')) {
                return btn.update({ embeds: [createEmbed({ description: `${theme.emojis.skull} **${opponent.username}** fled from the battle.`, color: theme.colors.danger })], components: [] });
            }

            activeBattles.add(cKey);
            activeBattles.add(dKey);
            try {
                await btn.update({ embeds: [createEmbed({ description: `⚔️ **${challenger.username}** vs **${opponent.username}**\n\n*The shadows clash...*`, color: theme.colors.blood })], components: [] });
                await sleep(1500);
                await runBattle(sent, challenger, opponent, challengerTeam, opponentTeam, guildId);
            } finally {
                activeBattles.delete(cKey);
                activeBattles.delete(dKey);
            }
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) sent.edit({ embeds: [createEmbed({ description: `${theme.emojis.skull} **${opponent.username}** didn't respond. Challenge expired.`, color: theme.colors.danger })], components: [] }).catch(() => {});
        });
    },
};

// ─── Run Battle ───
async function runBattle(message, challenger, opponent, cTeamRaw, dTeamRaw, guildId) {
    const buildTeam = (raw) => raw
        .filter(s => s.monster_collection_id && s.monster_id)
        .map(s => {
            const m = MONSTERS[s.monster_id];
            const stats = getEffectiveStats(s, s.eq_item_id);
            return { monsterId: s.monster_id, name: m?.name || '???', emoji: getMonsterEmoji(s.monster_id, m?.fallbackEmoji || '?'), hp: stats.hp, maxHp: stats.maxHp, attack: stats.attack, defense: stats.defense };
        });

    const cBattle = buildTeam(cTeamRaw);
    const dBattle = buildTeam(dTeamRaw);
    const result = simulateBattle(cBattle, dBattle);

    // ─── Group turns into matchups (each time a new monster pair fights) ───
    const matchups = [];
    let current = { turns: [], cMon: null, dMon: null };

    for (const turn of result.turns) {
        const cMon = turn.attackerSide === 'challenger' ? turn.attacker : turn.defender;
        const dMon = turn.attackerSide === 'defender' ? turn.attacker : turn.defender;

        // Detect new matchup
        if (!current.cMon || cMon.name !== current.cMon.name || dMon.name !== current.dMon.name) {
            if (current.turns.length > 0) matchups.push({ ...current });
            current = { turns: [], cMon, dMon };
        }
        current.turns.push(turn);
    }
    if (current.turns.length > 0) matchups.push({ ...current });

    // ─── Show each matchup as one embed (max 4 matchups shown) ───
    const shown = matchups.slice(0, 4);
    for (let i = 0; i < shown.length; i++) {
        const mu = shown[i];
        const embed = buildMatchupEmbed(challenger, opponent, mu, i + 1, shown.length);
        try { await message.edit({ embeds: [embed] }); } catch {}
        await sleep(3500);
    }

    await sleep(1500);

    // ─── Final Result ───
    const winnerUser = result.winner === 'challenger' ? challenger : opponent;
    const loserUser = result.winner === 'challenger' ? opponent : challenger;
    const loserTeam = result.winner === 'challenger' ? dBattle : cBattle;

    const winReward = calculateBattleReward(loserTeam);
    const loseReward = Math.floor(Math.random() * 21) + 10;

    addSouls(guildId, winnerUser.id, winReward, 'battle_win', `PvP victory vs ${loserUser.username}`);
    addSouls(guildId, loserUser.id, loseReward, 'battle_loss', `PvP consolation vs ${winnerUser.username}`);
    recordBattleWin(guildId, winnerUser.id);
    recordBattleLoss(guildId, loserUser.id);

    // Build final state
    const cState = cBattle.map(m => `${m.emoji}${getFinalHp(m, 'challenger', result.turns) <= 0 ? '💀' : '💚'}`).join(' ');
    const dState = dBattle.map(m => `${m.emoji}${getFinalHp(m, 'defender', result.turns) <= 0 ? '💀' : '💚'}`).join(' ');

    const totalHits = result.turns.length;
    const crits = result.turns.filter(t => t.critical).length;
    const kills = result.turns.filter(t => t.fainted).length;

    const resultEmbed = createEmbed({
        title: `${theme.emojis.fire} ${winnerUser.username} wins!`,
        description: [
            `**${challenger.username}** vs **${opponent.username}**`,
            '',
            cState,
            dState,
            '',
            `${theme.emojis.dagger} **Winner:** ${winnerUser} — ${getCurrencyEmoji()} **+${winReward.toLocaleString()}**`,
            `${theme.emojis.skull} **Loser:** ${loserUser} — ${getCurrencyEmoji()} **+${loseReward.toLocaleString()}**`,
            '',
            `\`${totalHits} hits · ${crits} crits · ${kills} kills\``,
        ].join('\n'),
        color: theme.colors.gold,
        thumbnail: winnerUser.displayAvatarURL({ size: 256 }),
    });

    try { await message.edit({ embeds: [resultEmbed] }); } catch {
        await message.channel?.send({ embeds: [resultEmbed] }).catch(() => {});
    }
}

// ─── Build a single matchup embed ───
// Shows the two monsters fighting with combat lines + HP bars
function buildMatchupEmbed(challenger, opponent, matchup, num, total) {
    const { turns, cMon, dMon } = matchup;

    // Header: big emojis facing off
    const header = `${cMon.emoji}  **vs**  ${dMon.emoji}`;

    // Combat lines — show up to 6 turns to keep it readable
    const displayTurns = turns.length <= 6 ? turns : [
        turns[0],
        turns[1],
        ...turns.filter(t => t.critical || t.fainted),
        turns[turns.length - 1],
    ].filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 6);

    const combatLines = displayTurns.map(t => {
        const crit = t.critical ? ' ✦ **CRIT!**' : '';
        const hpPct = Math.max(0, Math.round((t.defenderHpAfter / t.defenderMaxHp) * 100));
        const bar = buildHpBar(t.defenderHpAfter, t.defenderMaxHp);

        let line = `${t.attacker.emoji} **${t.attacker.name}** hits **${t.defender.name}** for **${t.damage}**${crit}`;
        line += `\n${bar} \`${t.defenderHpAfter}/${t.defenderMaxHp} HP\``;

        if (t.fainted) {
            line += `\n> ${theme.emojis.skull} **${t.defender.name}** has fallen!`;
        }
        return line;
    });

    // Get the thumbnail from the matchup
    const thumb = getMonsterImageUrl(cMon.monsterId) || getMonsterImageUrl(dMon.monsterId);

    return createEmbed({
        title: `⚔️ Round ${num}/${total}`,
        description: [
            `**${challenger.username}** vs **${opponent.username}**`,
            '',
            header,
            `\`${cMon.name}\`  ⚔️ ATK ${cMon.attack} | 🛡️ DEF ${cMon.defense}`,
            `\`${dMon.name}\`  ⚔️ ATK ${dMon.attack} | 🛡️ DEF ${dMon.defense}`,
            '',
            ...combatLines,
        ].join('\n'),
        color: theme.colors.blood,
        thumbnail: thumb || undefined,
    });
}

// ─── HP Bar with colored hearts ───
function buildHpBar(current, max) {
    const ratio = Math.max(0, Math.min(1, current / max));
    const length = 10;
    const filled = Math.min(length, Math.max(0, Math.round(ratio * length)));
    const empty = length - filled;

    let heart;
    if (ratio > 0.5) heart = '💚';
    else if (ratio > 0.2) heart = '💛';
    else if (ratio > 0) heart = '❤️';
    else heart = '🖤';

    return `${heart} \`[${'█'.repeat(filled)}${'░'.repeat(empty)}]\``;
}

// ─── Get final HP from turn log ───
function getFinalHp(monster, side, turns) {
    let hp = monster.maxHp;
    for (const t of turns) {
        if (t.defender.name === monster.name && t.attackerSide !== side) {
            hp = t.defenderHpAfter;
        }
    }
    return hp;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
