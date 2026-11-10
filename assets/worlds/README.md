# Unused channel-world experiments

The active portfolio now uses the layered Gotham wasteland (`SpriteCity`) on every route. The drift, arcade, and football artwork in this folder is retained as source material only; `Portfolio.tsx` does not render `WorldScene` or import `world-scenes.css`.

Nothing below is part of the current design. It is kept so the generated work can be recovered without regenerating it.

Each page is a separate, fixed world viewed through the shared CRT overlay:

| Channel | Route | World | Source |
| --- | --- | --- | --- |
| 01 | `/` | Gotham wasteland | `assets/city/source/wasteland-backdrop.png` plus sprite layers |
| 02 | `/about/` | JDM drift event at night | `source/jdm-drift.png` |
| 03 | `/work/` | Cyberpunk arcade alley | `source/cyberpunk-arcade.png` |
| 04 | `/projects/` | Packers sideline experiment | `source/football-sideline.png` |

The full-size PNGs are generated masters. `npm run world:assets`, `npm run world:props`, and `npm run world:animations` rebuild the optimized experimental assets in `public/worlds/`. `WorldScene.tsx` and `world-scenes.css` remain unused. `channel-tv.css` still supplies the CRT glass, channel navigation, and tuning effect for the active wasteland routes.

The generated backdrops are full-scene art, not transparent sprite atlases. The separate transparent animation strips have eight checked cells each. The active Gotham assets remain in their own transparent sprites and atlases.
