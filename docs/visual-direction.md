# Personal uplink: visual direction

The city is the scene. Navigation, portrait and dialogue are instruments placed over it. Avoid a full-screen tinted panel. Preserve Harry's preferred first character likeness and the bust's existing talking frames.

## Reference study

- [Fallout (1997), official Bethesda gallery](https://fallout.bethesda.net/en/games/fallout): portrait-led dialogue, green display text, numbered records and mechanical control surfaces. Adapted into the portrait uplink and dialogue controls.
- [NASA Graphics Standards Manual (1976)](https://www.nasa.gov/wp-content/uploads/2015/01/nasa_graphics_manual_nhb_1430-2_jan_1976.pdf): disciplined identification, repeated rules, compact supporting labels and strong hierarchy. Adapted into station identity and header rules; no NASA branding copied.
- [Apollo DSKY, Smithsonian collection](https://airandspace.si.edu/collection-objects/display-keyboard-apollo-guidance-computer/nasm_A19760811000): separate numeric readouts, concise labels and physical keys. Adapted into numbered inset controls.
- [NASA Apollo computer history](https://www.nasa.gov/wp-content/uploads/static/history/computers/Ch2-7.html): labeled status indicators and grouped display functions. Adapted into the compact uplink and system indicators.
- [IBM 3270 terminal documentation](https://www.ibm.com/docs/en/zos-basic-skills?topic=enhanced-introduction-3270-terminal): fixed-width display language and compact command presentation. Adapted into supporting type and dialogue.
- [DEC PDP-1, Computer History Museum](https://computerhistory.org/exhibits/pdp-1/): early interactive computing and instrument-console character. Used as a reference for the restrained hardware vocabulary.
- [IBM 3270, Columbia Computing History](https://www1.columbia.edu/cu/computinghistory/3270.html): terminal construction and screen organization. Used alongside the IBM reference.
- [Science Fiction Design, Vitra Design Museum](https://www.design-museum.de/en/exhibitions/detailpages/science-fiction-design.html): space-age forms and the relationship between physical products and imagined futures. Informed circular targeting rings and the warm ivory/amber palette.

These are design interpretations, not claims of exact historical reproduction. The result deliberately combines a 1970s instrument-panel vocabulary with a 1990s RPG portrait and the existing pixel city.

## Copy

Hero: “Human ideas. Digital machinery.”
Description: “Web & mobile software, made in London. A little curiosity goes a long way.”
Navigation: Personnel / Field work / Inventions. Routes and content remain About / Work / Projects.

The dialogue introduces Harry, explains his actual stack and Agomi experience, and directs visitors to the two existing projects. Avoid invented achievements, fake live telemetry that implies a real measurement, and generic promises about the future. Station labels and the signal graphic are decorative world-building.

## Current revision: photo, not illustrated mascot

The user rejected the invented character and the formal instrument-panel layout. The home page now uses a background-removed photographic portrait, pixelated by a WebGL fragment shader, rather than the illustrated vault-suit bust. Colour is the default; a physical-looking side control switches to green phosphor. The shader applies nearest-cell sampling, palette quantization, ordered dithering, scanlines, refresh band, grain and restrained sync drift. Voice activity changes signal interference, not the photographed mouth.

The homepage copy is plain and personal. Navigation is About me / Work / Projects. Removed invented system branding, fake signal percentages, slogans, card-based navigation and decorative telemetry. The city remains unobscured between the two small groups of controls.

## Current frame implementation

The user requested generated artwork instead of a device built from UI boxes. The shell is now `/public/frames/pip-frame-v1.png`, a generated open frame with alpha transparency through its center. The city is visible through the opening. Existing text, tabs, shader portrait and controls are layered over it; there is no opaque CRT background. A transparent power hit target aligns with the illustrated dial, and brightness remains a real accessible range input.
