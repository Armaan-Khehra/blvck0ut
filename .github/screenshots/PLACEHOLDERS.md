# Screenshot placeholders

The README expects the following media files in this folder. Drop them in (any size, but ~720p reads well on GitHub) and they'll appear in the showcase grid automatically. If a file is missing, GitHub will just show a broken-image icon — only commit the ones you have.

| Path | What to capture |
| --- | --- |
| `hunt.gif`     | A `/hunt` run — embed appearing, drops scrolling, rarity icons |
| `shop.png`     | The `/shop` paginated embed |
| `rank.png`     | The `/rank` canvas-rendered card |
| `welcome.png`  | The welcome embed + generated banner image |
| `queue.png`    | A `/queue` or `/nowplaying` embed mid-music |
| `tarot.png`    | A `/tarot` reading |

## How to record GIFs (macOS)

1. Use **CleanShot X** (`⌘ + Shift + 6`) → "Record Screen" → "GIF". Keep clips ≤ 8 seconds and ≤ 5 MB so GitHub doesn't lazy-load them.
2. Or QuickTime "New Screen Recording" + convert with `ffmpeg`:
   ```bash
   ffmpeg -i input.mov -vf "fps=15,scale=720:-1:flags=lanczos" -c:v gif output.gif
   ```

## Static screenshots

Crop the Discord client to just the embed, ~720px wide, and save as PNG. Avoid showing real usernames/IDs that aren't yours.
