require('dotenv').config();
const db = require('./src/data/database');

const GUILD_ID = process.env.GUILD_ID;

const LEVEL_ROLES = [
    { level: 1,  role_id: '1471612451282751620' }, // Human
    { level: 5,  role_id: '1471612400552775847' }, // Fledgling
    { level: 10, role_id: '1471612335691923607' }, // Neonates
    { level: 15, role_id: '1471612243698257952' }, // Ancillae
    { level: 20, role_id: '1471612193605947443' }, // Familiars
    { level: 30, role_id: '1471612138023030865' }, // Elders
    { level: 40, role_id: '1471611933365895260' }, // Antediluvian
    { level: 50, role_id: '1471611809269285089' }, // Eldest
];

const upsert = db.prepare(`
    INSERT INTO leveling_roles (guild_id, level, role_id)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id, level) DO UPDATE SET role_id = excluded.role_id
`);

const insertAll = db.transaction((roles) => {
    let count = 0;
    for (const r of roles) {
        upsert.run(GUILD_ID, r.level, r.role_id);
        count++;
    }
    return count;
});

const count = insertAll(LEVEL_ROLES);
console.log(`Seeded ${count} level role rewards for guild ${GUILD_ID}`);

const verify = db.prepare('SELECT * FROM leveling_roles WHERE guild_id = ? ORDER BY level ASC').all(GUILD_ID);
console.log('\nConfigured level roles:');
for (const r of verify) {
    console.log(`  Level ${r.level} → Role ${r.role_id}`);
}
