// ─── Gothic Roleplay Commands ───
// Triggered via > prefix (e.g., >bite, >ritual, >curse)
// Each command can increase or decrease souls between 600-6000
// Cooldown: 3 minutes between uses

const { ensureUser, addSouls, removeSouls, formatSouls, checkCooldown, setCooldownFor, applyMultiplier } = require('../../utils/economy');
const { createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

const RP_COOLDOWN = 3 * 60 * 1000; // 3 minutes
const RP_MIN = 600;
const RP_MAX = 6000;

// ─── RP Command Definitions ───
// Each command has: category, responses (win/lose arrays)
// The bot randomly picks gain or loss, then picks a response
const RP_COMMANDS = {
    // ── Dark Intimacy ──
    bite: {
        category: 'dark intimacy',
        win: [
            '{user} sinks their fangs deep... the blood is rich with {souls}.',
            '{user} bites down with dark hunger — the void rewards their thirst with {souls}.',
            '{user}\'s bite draws power from the darkness... {souls} absorbed.',
        ],
        lose: [
            '{user} bit down but tasted poison... lost {souls} to the venom.',
            '{user}\'s bite was too eager — the darkness took {souls} as punishment.',
            '{user} drew blood, but it was cursed... {souls} dissolved into nothing.',
        ],
    },
    embrace: {
        category: 'dark intimacy',
        win: [
            '{user} pulls a lost soul close... the warmth yields {souls}.',
            '{user}\'s dark embrace draws energy from the void — {souls} gained.',
            '{user} holds the shadows tight... {souls} flow into their veins.',
        ],
        lose: [
            '{user} embraced the void but it embraced back... {souls} drained.',
            '{user}\'s arms wrapped around nothing — {souls} slipped away.',
            '{user} held on too tight and the darkness consumed {souls}.',
        ],
    },
    chain: {
        category: 'dark intimacy',
        win: [
            '{user} binds another in dark chains... the captive yields {souls}.',
            '{user}\'s chains rattle with power — {souls} collected from the bound.',
            '{user} wraps chains of shadow around their prey... {souls} extracted.',
        ],
        lose: [
            '{user}\'s chains shattered on contact... {souls} lost in the recoil.',
            '{user} tried to bind the void itself — foolish. Lost {souls}.',
            '{user}\'s chains turned to ash... {souls} burned away.',
        ],
    },
    possess: {
        category: 'dark intimacy',
        win: [
            '{user} takes control of a wandering spirit... {souls} siphoned.',
            '{user}\'s will is absolute — possession grants {souls}.',
            '{user} reaches into the ethereal plane and possesses {souls} worth of power.',
        ],
        lose: [
            '{user} tried to possess a stronger spirit... rejected. Lost {souls}.',
            '{user}\'s mind was too weak — the possession backfired. {souls} gone.',
            '{user} was overwhelmed by the spirit they tried to control... {souls} stolen.',
        ],
    },
    bleed: {
        category: 'dark intimacy',
        win: [
            '{user} lets the blood flow freely... the offering pleases the void. {souls} gained.',
            '{user}\'s blood drips with dark energy — {souls} crystallized from the crimson.',
            '{user} opens a vein and the shadows drink deeply... {souls} returned.',
        ],
        lose: [
            '{user} bled too much... the void took {souls} along with the blood.',
            '{user}\'s blood was rejected by the darkness — {souls} wasted.',
            '{user} bled out on the altar but the ritual failed... lost {souls}.',
        ],
    },
    whisper: {
        category: 'dark intimacy',
        win: [
            '{user} whispers dark secrets into the void... it whispers back {souls}.',
            '{user}\'s voice carries through the shadows — the dead respond with {souls}.',
            '{user} speaks in tongues of the damned... {souls} manifest.',
        ],
        lose: [
            '{user} whispered into the dark but something whispered back... lost {souls}.',
            '{user}\'s secrets were used against them — {souls} claimed as payment.',
            '{user} spoke forbidden words... the silence cost {souls}.',
        ],
    },
    seduce: {
        category: 'dark intimacy',
        win: [
            '{user} lures a spirit with dark charm... it surrenders {souls}.',
            '{user}\'s allure is irresistible even to the dead — {souls} claimed.',
            '{user} seduces the shadows into submission... {souls} offered willingly.',
        ],
        lose: [
            '{user} tried to charm the uncharmable... lost {souls} to hubris.',
            '{user}\'s seduction failed — the spirit took {souls} instead.',
            '{user} looked into the abyss and it looked back hungrily... {souls} devoured.',
        ],
    },
    bind: {
        category: 'dark intimacy',
        win: [
            '{user} weaves a binding spell of shadow and blood — {souls} sealed.',
            '{user}\'s dark pact is forged... the contract yields {souls}.',
            '{user} binds their fate to the void... {souls} gifted in return.',
        ],
        lose: [
            '{user}\'s binding spell backfired — {souls} consumed by the ritual.',
            '{user} was bound by their own dark magic... {souls} trapped forever.',
            '{user} tried to bind the unbindable... lost {souls} to arrogance.',
        ],
    },

    // ── Occult Actions ──
    ritual: {
        category: 'occult',
        win: [
            '{user} completes a forbidden ritual... the dark gods grant {souls}.',
            '{user}\'s candles flicker as the ritual succeeds — {souls} materialize.',
            '{user} chants in the old tongue... the circle glows with {souls}.',
        ],
        lose: [
            '{user}\'s ritual circle broke mid-chant... {souls} consumed by the backlash.',
            '{user} mispronounced the incantation — the ritual took {souls} as penance.',
            '{user}\'s offering was deemed unworthy... the dark gods took {souls} instead.',
        ],
    },
    summon: {
        category: 'occult',
        win: [
            '{user} summons a creature from the void — it brings {souls} as tribute.',
            '{user}\'s summoning circle pulses with power... {souls} emerge from the rift.',
            '{user} calls upon the darkness and it answers with {souls}.',
        ],
        lose: [
            '{user} summoned something they couldn\'t control... it took {souls} and fled.',
            '{user}\'s summoning went wrong — the entity demanded {souls} to leave.',
            '{user} opened a portal to the wrong dimension... {souls} fell through.',
        ],
    },
    hex: {
        category: 'occult',
        win: [
            '{user} casts a wicked hex... the curse rebounds with {souls}.',
            '{user}\'s hex strikes true — the suffering generates {souls}.',
            '{user} weaves a hex so dark even the void shudders... {souls} earned.',
        ],
        lose: [
            '{user}\'s hex was reflected... cursed themselves and lost {souls}.',
            '{user} hexed the wrong target — the backlash cost {souls}.',
            '{user}\'s hex fizzled pathetically... embarrassment cost {souls}.',
        ],
    },
    sacrifice: {
        category: 'occult',
        win: [
            '{user} makes a blood sacrifice upon the altar... the void accepts and grants {souls}.',
            '{user}\'s sacrifice is deemed worthy — {souls} flow from the darkness.',
            '{user} offers their pain to the old gods... they feast and return {souls}.',
        ],
        lose: [
            '{user}\'s sacrifice was rejected... the altar consumed {souls} anyway.',
            '{user} sacrificed too little — the gods took {souls} to teach generosity.',
            '{user}\'s offering angered the darkness... {souls} ripped away.',
        ],
    },
    resurrect: {
        category: 'occult',
        win: [
            '{user} pulls a soul back from the dead... it carries {souls} from the other side.',
            '{user}\'s necromancy succeeds — the revived spirit offers {souls} in gratitude.',
            '{user} defies death itself... the act of rebellion grants {souls}.',
        ],
        lose: [
            '{user} tried to resurrect the wrong spirit... it dragged {souls} back to the grave.',
            '{user}\'s resurrection failed — death doesn\'t give refunds. Lost {souls}.',
            '{user} disturbed the dead and paid the price... {souls} buried.',
        ],
    },
    conjure: {
        category: 'occult',
        win: [
            '{user} conjures dark matter from the void — {souls} solidify in their palm.',
            '{user}\'s conjuration twists reality... {souls} appear from nothing.',
            '{user} reaches between dimensions and pulls out {souls}.',
        ],
        lose: [
            '{user}\'s conjuration collapsed... {souls} imploded with it.',
            '{user} conjured something horrible and had to pay {souls} to undo it.',
            '{user}\'s magic was unstable — the explosion cost {souls}.',
        ],
    },
    invoke: {
        category: 'occult',
        win: [
            '{user} invokes an ancient power... it stirs and grants {souls}.',
            '{user}\'s invocation echoes through the void — {souls} rain down.',
            '{user} speaks the true name of darkness... {souls} are bestowed.',
        ],
        lose: [
            '{user} invoked something that shouldn\'t be named... it took {souls} as a warning.',
            '{user}\'s invocation was heard by the wrong entity... {souls} claimed.',
            '{user} called too loudly into the void... the echo took {souls}.',
        ],
    },
    banish: {
        category: 'occult',
        win: [
            '{user} banishes a demon back to the pit — it drops {souls} on the way down.',
            '{user}\'s banishment is absolute... the expelled spirit leaves {souls} behind.',
            '{user} forces the darkness to retreat — {souls} left in its wake.',
        ],
        lose: [
            '{user} tried to banish the unbanishable... it laughed and took {souls}.',
            '{user}\'s banishment reversed — they were nearly pulled in. Lost {souls}.',
            '{user}\'s holy words had no power here... the darkness took {souls}.',
        ],
    },

    // ── Gothic Expression ──
    haunt: {
        category: 'gothic expression',
        win: [
            '{user} haunts the halls of the damned... the terror yields {souls}.',
            '{user}\'s ghostly presence chills the air — {souls} crystallize from fear.',
            '{user} becomes one with the shadows... the haunting earns {souls}.',
        ],
        lose: [
            '{user} tried to haunt but got haunted instead... lost {souls} to the real ghost.',
            '{user}\'s haunting was pathetic — the spirits mocked them and took {souls}.',
            '{user} got lost in the haunted halls... {souls} vanished in the fog.',
        ],
    },
    wither: {
        category: 'gothic expression',
        win: [
            '{user} withers everything they touch... the decay generates {souls}.',
            '{user}\'s touch of death spreads — from the rot springs {souls}.',
            '{user} lets entropy consume all... {souls} bloom from the ashes.',
        ],
        lose: [
            '{user} withered too far... their own soul lost {souls} in the decay.',
            '{user}\'s withering touch turned inward — {souls} crumbled to dust.',
            '{user} became the rot... {souls} decomposed.',
        ],
    },
    decay: {
        category: 'gothic expression',
        win: [
            '{user} embraces entropy... the beautiful decay yields {souls}.',
            '{user} watches the world crumble — from destruction comes {souls}.',
            '{user}\'s aura of decay breaks down reality... {souls} form from the ruins.',
        ],
        lose: [
            '{user} decayed too quickly... lost {souls} to their own entropy.',
            '{user}\'s decay was uncontrollable — {souls} rotted away.',
            '{user} fell apart at the seams... {souls} scattered.',
        ],
    },
    lament: {
        category: 'gothic expression',
        win: [
            '{user}\'s sorrowful cry echoes through the void... it weeps back {souls}.',
            '{user} mourns so beautifully the darkness is moved — {souls} gifted.',
            '{user}\'s lament pierces the eternal night... {souls} fall like tears.',
        ],
        lose: [
            '{user} lamented too deeply... the sadness swallowed {souls}.',
            '{user}\'s sorrow attracted something hungry... lost {souls}.',
            '{user} wept into the void and it drank their {souls}.',
        ],
    },
    scream: {
        category: 'gothic expression',
        win: [
            '{user} screams into the abyss... the echo brings back {souls}.',
            '{user}\'s banshee wail shatters the silence — {souls} fall from the cracks.',
            '{user} unleashes a primal scream... the void trembles and releases {souls}.',
        ],
        lose: [
            '{user} screamed but the void screamed louder... {souls} silenced.',
            '{user}\'s voice cracked... the embarrassment cost {souls}.',
            '{user} lost their voice to the darkness... and {souls} with it.',
        ],
    },
    mourn: {
        category: 'gothic expression',
        win: [
            '{user} mourns the fallen with grace... the dead offer {souls} in thanks.',
            '{user}\'s grief is so profound the spirits are moved — {souls} given.',
            '{user} lights candles for the departed... {souls} flicker to life.',
        ],
        lose: [
            '{user} mourned the wrong grave... the spirit was offended and took {souls}.',
            '{user}\'s tears fell on cursed ground... {souls} absorbed by the earth.',
            '{user}\'s grief consumed them... lost {souls} to despair.',
        ],
    },
    torment: {
        category: 'gothic expression',
        win: [
            '{user} torments a trapped spirit... it begs for mercy with {souls}.',
            '{user}\'s cruelty knows no bounds — the suffering produces {souls}.',
            '{user} feeds on anguish... the torment generates {souls}.',
        ],
        lose: [
            '{user} was tormented by their own demons... lost {souls}.',
            '{user}\'s torment backfired — karma took {souls}.',
            '{user} became the tormented... {souls} stripped away by guilt.',
        ],
    },
    brood: {
        category: 'gothic expression',
        win: [
            '{user} broods in the darkest corner... the shadows gather {souls} around them.',
            '{user}\'s brooding intensity attracts dark energy — {souls} condensed.',
            '{user} sits in silence so heavy the void pays {souls} to fill it.',
        ],
        lose: [
            '{user} brooded too long... the darkness grew bored and took {souls}.',
            '{user}\'s angst was too much even for the void... {souls} evaporated.',
            '{user} overthought everything and lost {souls} to existential dread.',
        ],
    },

    // ── Violent / Aggressive ──
    stab: {
        category: 'violent',
        win: [
            '{user} drives a cursed blade into the darkness... it bleeds {souls}.',
            '{user}\'s dagger strikes true — the wound leaks {souls}.',
            '{user} stabs through the veil of reality... {souls} pour through.',
        ],
        lose: [
            '{user}\'s blade shattered on impact... the shards cost {souls}.',
            '{user} stabbed at shadows and hit themselves... lost {souls}.',
            '{user}\'s attack was parried by the void — {souls} taken as punishment.',
        ],
    },
    devour: {
        category: 'violent',
        win: [
            '{user} devours a lesser spirit whole... {souls} absorbed.',
            '{user}\'s hunger is insatiable — they consume {souls} from the ether.',
            '{user} opens their maw and swallows the darkness... {souls} digested.',
        ],
        lose: [
            '{user} bit off more than they could chew... choked on {souls}.',
            '{user} tried to devour a greater spirit... it devoured {souls} instead.',
            '{user}\'s appetite was their downfall — the void ate {souls}.',
        ],
    },
    curse: {
        category: 'violent',
        win: [
            '{user} utters a devastating curse... the affliction yields {souls}.',
            '{user}\'s curse spreads like plague — each victim drops {souls}.',
            '{user} speaks with the tongue of the damned... {souls} manifest from suffering.',
        ],
        lose: [
            '{user}\'s curse bounced back tenfold... lost {souls} to their own hex.',
            '{user} cursed with bad grammar — the curse failed and cost {souls}.',
            '{user} was already cursed... the double curse took {souls}.',
        ],
    },
    reap: {
        category: 'violent',
        win: [
            '{user} swings the scythe of the void... the harvest yields {souls}.',
            '{user} reaps what was sown in darkness — {souls} collected.',
            '{user} becomes death itself... the reaping produces {souls}.',
        ],
        lose: [
            '{user} swung the scythe but missed... the momentum cost {souls}.',
            '{user} tried to reap but the field was barren... lost {souls} to futility.',
            '{user}\'s scythe was dull... the reaping failed and cost {souls}.',
        ],
    },
    strangle: {
        category: 'violent',
        win: [
            '{user} wraps shadow tendrils around a spirit\'s throat... it drops {souls}.',
            '{user}\'s grip tightens on the darkness — {souls} squeezed out.',
            '{user} chokes the life from the void itself... {souls} extracted.',
        ],
        lose: [
            '{user} grabbed at smoke... the shadow laughed and took {souls}.',
            '{user}\'s hands passed through the spirit... wasted energy cost {souls}.',
            '{user} strangled themselves with their own shadows... lost {souls}.',
        ],
    },
    impale: {
        category: 'violent',
        win: [
            '{user} impales a demon on a spike of darkness... it leaks {souls}.',
            '{user}\'s strike pins a spirit to the void wall — {souls} spill out.',
            '{user} drives a stake of shadow through the heart of night... {souls} erupt.',
        ],
        lose: [
            '{user}\'s spike missed entirely... the miss cost {souls}.',
            '{user} was impaled by their own creation... lost {souls} and dignity.',
            '{user}\'s dark spear dissolved before impact — {souls} vanished.',
        ],
    },
    shatter: {
        category: 'violent',
        win: [
            '{user} shatters the barrier between worlds... {souls} flood through.',
            '{user}\'s fist breaks reality — {souls} fall from the cracks.',
            '{user} destroys a soul crystal... {souls} scatter into their grasp.',
        ],
        lose: [
            '{user} tried to shatter the unbreakable... {souls} shattered instead.',
            '{user}\'s power wasn\'t enough — the recoil cost {souls}.',
            '{user} shattered their own reflection... lost {souls} to bad luck.',
        ],
    },
    consume: {
        category: 'violent',
        win: [
            '{user} consumes pure darkness... {souls} fuel their ascension.',
            '{user} absorbs all light around them — {souls} generated from the void.',
            '{user}\'s consumption knows no limit... {souls} flow endlessly.',
        ],
        lose: [
            '{user} consumed something corrupted... {souls} poisoned.',
            '{user} tried to consume the void but it consumed them... lost {souls}.',
            '{user} ate cursed souls and paid the price — {souls} gone.',
        ],
    },
};

/**
 * Handle a >roleplay command from a message.
 * Returns true if a command was found and handled.
 */
function handleRoleplayCommand(message) {
    const content = message.content.trim();
    if (!content.startsWith('>')) return false;

    const commandName = content.slice(1).split(/\s+/)[0]?.toLowerCase();
    if (!commandName) return false;

    const rpCmd = RP_COMMANDS[commandName];
    if (!rpCmd) return false;

    const guildId = message.guild.id;
    const userId = message.author.id;

    // Check cooldown
    const remaining = checkCooldown(guildId, userId, 'rp', RP_COOLDOWN);
    if (remaining > 0) {
        const { formatCooldown } = require('../../utils/economy');
        message.reply({
            content: `${theme.emojis.skull} the void needs time to recover... try again in **${formatCooldown(remaining)}**`,
        }).then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 5000);
        }).catch(() => {});
        return true;
    }

    // Determine win or lose (50/50)
    const isWin = Math.random() < 0.5;

    // Random amount between 600-6000
    const baseAmount = Math.floor(Math.random() * (RP_MAX - RP_MIN + 1)) + RP_MIN;
    const { amount, multiplier } = applyMultiplier(guildId, userId, baseAmount, message.member);

    // Pick a random response
    const responses = isWin ? rpCmd.win : rpCmd.lose;
    const template = responses[Math.floor(Math.random() * responses.length)];

    // Apply the result
    let newBalance;
    if (isWin) {
        newBalance = addSouls(guildId, userId, amount, 'rp_win', `Roleplay: >${commandName}`);
    } else {
        // Cap loss to current balance
        const user = ensureUser(guildId, userId);
        const actualLoss = Math.min(amount, user.balance);
        if (actualLoss <= 0) {
            newBalance = user.balance;
        } else {
            newBalance = removeSouls(guildId, userId, actualLoss, 'rp_lose', `Roleplay: >${commandName}`);
            if (newBalance === null) newBalance = 0;
        }
    }

    // Set cooldown
    setCooldownFor(guildId, userId, 'rp');

    // Format response
    const formattedSouls = formatSouls(amount);
    const responseText = template
        .replace('{user}', `**${message.author.username}**`)
        .replace('{souls}', formattedSouls);

    const multTag = multiplier.total > 1 ? ` (${multiplier.total}x)` : '';
    const resultEmoji = isWin ? theme.emojis.crystal : theme.emojis.skull;
    const resultText = isWin
        ? `**+${amount.toLocaleString()}** souls${multTag}`
        : `**-${amount.toLocaleString()}** souls`;

    // Pick category-appropriate GIF
    const rpGif = theme.rpGifs[rpCmd.category] || theme.rpGifs['violent'];

    const embed = createEmbed({
        description: `${resultEmoji} ${responseText}`,
        color: isWin ? theme.colors.accent : theme.colors.danger,
        image: rpGif,
        fields: [
            { name: `${isWin ? theme.emojis.crystal : theme.emojis.skull} Result`, value: resultText, inline: true },
            { name: `${theme.emojis.diamond} Wallet`, value: `${newBalance.toLocaleString()}`, inline: true },
        ],
        footer: `♱ >${commandName} • ${rpCmd.category}`,
    });

    message.reply({ embeds: [embed] }).catch(() => {});

    return true;
}

// Export the handler + commands list (for earnpost to reference)
module.exports = {
    handleRoleplayCommand,
    RP_COMMANDS,
    RP_COOLDOWN,
    RP_MIN,
    RP_MAX,
};
