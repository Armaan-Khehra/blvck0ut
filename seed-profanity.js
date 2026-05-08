require('dotenv').config();
const db = require('./src/data/database');

const GUILD_ID = process.env.GUILD_ID;
const BOT_ID = 'system';

// Comprehensive profanity/slur list
const WORDS = [
    // Racial slurs
    'nigger', 'nigga', 'n1gger', 'n1gga', 'nigg3r', 'nigg4', 'n!gger', 'n!gga',
    'niqqa', 'niqquer', 'negro', 'negr0',
    'chink', 'ch1nk',
    'spic', 'sp1c', 'spick',
    'wetback', 'w3tback',
    'beaner', 'b3aner',
    'gook', 'g00k',
    'kike', 'k1ke',
    'coon', 'c00n',
    'darkie', 'darky',
    'paki', 'pak1',
    'zipperhead',
    'raghead', 'towelhead',
    'sandnigger', 'sandn1gger',
    'redskin',
    'cracker',

    // Homophobic/transphobic slurs
    'faggot', 'fagg0t', 'fag', 'f4g', 'f4ggot', 'fags',
    'dyke', 'dyk3',
    'tranny', 'tr4nny',

    // Ableist slurs
    'retard', 'r3tard', 'retarded', 'r3tarded',

    // Sexist/misogynistic slurs
    'whore', 'wh0re',
    'slut', 'sl00t',
    'cunt', 'c0nt',

    // General profanity (strong)
    'fuck', 'fck', 'fuk', 'f0ck', 'phuck',
    'shit', 'sh1t', 'sh!t', 'sht',
    'bitch', 'b1tch', 'b!tch',
    'ass', 'a$$',
    'asshole', 'assh0le',
    'dick', 'd1ck',
    'cock', 'c0ck',
    'pussy', 'pu$$y', 'puss1',
    'bastard', 'b4stard',
    'damn', 'dammit',
    'stfu', 'gtfo', 'kys',
];

const insert = db.prepare(`
    INSERT OR IGNORE INTO word_filter (guild_id, word, added_by) VALUES (?, ?, ?)
`);

const insertMany = db.transaction((words) => {
    let count = 0;
    for (const word of words) {
        const result = insert.run(GUILD_ID, word.toLowerCase(), BOT_ID);
        if (result.changes > 0) count++;
    }
    return count;
});

const added = insertMany(WORDS);
const total = db.prepare('SELECT COUNT(*) as count FROM word_filter WHERE guild_id = ?').get(GUILD_ID);
console.log(`Added ${added} new words (${total.count} total in filter)`);
