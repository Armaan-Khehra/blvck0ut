# Contributing to blvck0ut

Thanks for taking a look. blvck0ut started as a personal bot, but I'm happy to take PRs that fit the project's goth/vampire aesthetic and don't break existing servers.

## Getting set up

1. Fork the repo and clone your fork.
2. `npm install`
3. Copy `.env.example` to `.env` and fill in a test bot token + your dev guild ID.
4. `npm run deploy` to register slash commands in your test guild.
5. `npm run dev` to start the bot with nodemon hot-reload.

## Project conventions

- **Slash commands live in `src/commands/<category>/<name>.js`** and are auto-loaded — no central registry to update.
- **Every reply uses `createEmbed`** from `src/utils/embeds.js`. No raw text replies.
- **Theme everything** — pull colors, dividers and emojis from `src/utils/theme.js`. Don't hardcode hex codes or unicode emojis when an animated server emoji exists for the concept.
- **Persist state through helpers** — touch the SQLite DB through `src/utils/economy.js`, `src/utils/leveling.js`, `src/utils/hunting.js` etc., not directly.
- **Cooldowns** go through `economy.checkCooldown` / `setCooldown`. Don't hand-roll them.
- **No copyrighted assets** in the repo. Tenor/giphy URLs are fine; uploaded images and fonts must have a clear license.

## Pull requests

- Branch off `main`, name your branch `feat/<thing>` or `fix/<thing>`.
- One feature per PR. Smaller is better.
- If you're adding a command, include a one-line description in the command's `setDescription`, mention it in `README.md`, and make sure it works without crashing when invoked outside its target context (e.g. without economy data).
- Run `node deploy-commands.js` against your dev guild before opening the PR, just to confirm the slash schema is valid.

## Reporting bugs

Open an issue with:

- What you ran / clicked
- What you expected
- What actually happened (paste the embed/error)
- Node version + OS

That's it. Have fun.
