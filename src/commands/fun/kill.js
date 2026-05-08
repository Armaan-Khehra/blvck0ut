const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier } = require('../../utils/economy');

const REWARD_MIN = 50;
const REWARD_MAX = 120;

const GIFS = [
    'https://media.tenor.com/7548ZBxUqdQAAAAC/akame-ga-kill-anime.gif',
    'https://media.tenor.com/EvqzJVOihJAAAAAC/sebastian-michaelis-kuroshitsuji.gif',
    'https://media.tenor.com/MGona8etQlYAAAAC/reze-chainsaw-man.gif',
    'https://media.tenor.com/U_f8VreD6OMAAAAC/black-thunder-anime-darkness-anime.gif',
    'https://media.tenor.com/SjYjO_H10K4AAAAC/soul-eater-black-star.gif',
    'https://media.tenor.com/67pweBlV9XQAAAAC/hxh-hunter-x-hunter.gif',
];

const RESPONSES = [
    '{user} ended {target}\'s mortal existence\n*rest in pieces*',
    '{user} sent {target} to meet the reaper\n*no resurrection this time*',
    '{user} erased {target} from the realm of the living\n*the void claims another*',
    '{user} executed {target} in cold blood\n*the shadows applauded*',
    '{user} struck {target} down without mercy\n*their name is forgotten already*',
    '{user} obliterated {target} from existence\n*not even a ghost remains*',
    '{user} sacrificed {target} to the dark gods\n*the ritual is complete*',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kill')
        .setDescription(`${theme.emojis.skull} End someone's existence`)
        .addUserOption(opt => opt.setName('user').setDescription('Who to eliminate').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        if (!target) {
            return interaction.reply({ content: 'mention someone to kill. `-kill @user`', ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'you can\'t escape that easily...', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const baseReward = Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) + REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, userId, baseReward, interaction.member);
        addSouls(guildId, userId, reward, 'kill', `Killed ${target.username}`);

        const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)]
            .replace('{user}', `**${interaction.member.displayName}**`)
            .replace('{target}', `${target}`);
        const gif = GIFS[Math.floor(Math.random() * GIFS.length)];

        const embed = new EmbedBuilder()
            .setDescription(`${theme.emojis.skull} ${response}\n\n+${formatSouls(reward)}`)
            .setImage(gif)
            .setColor(0x2b2d31);
        await interaction.reply({ embeds: [embed] });
    },
};
