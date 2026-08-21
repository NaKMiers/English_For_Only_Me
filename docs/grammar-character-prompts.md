# Grammar Character Prompt Pack

Prompts for generating the 17 family creatures and the sensei as flat image
assets, plus the specs they have to meet to drop into the comic layer without
touching layout.

Why images at all: the cast used to be hand-written inline SVG rigs, and they
were both slow in bulk and crude to look at. They are gone. Generated portraits
replaced them - better looking than anything hand-drawn in path data here, and
cheaper than a rig, because the browser decodes one small raster and composites
it with no per-node work.

**Status: 16 of 17 families and all 6 sensei expressions are generated and
wired.** `relative-clauses` (the Serpent) has no art and falls back to its family
mark; generate prompt 8 below and drop the file in to finish the set. The flat
marks in `components/grammar/cast/sigils.tsx` are still what the 40-card index
draws, by design - see `CreatureSigil`.

## House style block

Paste this ahead of every creature prompt. It is what keeps 17 separate
generations comparable, which is the whole point of a bestiary - a learner has to
recognise "another one of those" without reading the label.

```
Black and white manga bestiary illustration, single character, centered,
full body, facing the viewer. Heavy uniform 4px black ink outline, flat
white paper fill, screen-tone dot shading only, exactly one spot colour:
pure red (#E03020) used only for the eyes and at most one accent. No
gradients, no airbrush, no glow, no rim light, no 3D render, no gloss.
Bold silhouette readable at 64 pixels wide. Plain flat #FDF6EF background,
no scenery, no ground shadow, no text, no logo, no watermark, no frame,
no signature. Square composition with even margin on all four sides.
```

Negative prompt, if the tool takes one separately:

```
color, colours, gradient, soft shading, painterly, watercolour, 3D render,
photorealistic, anime eyes with highlights, background scenery, text,
letters, watermark, signature, frame, border, multiple characters, cropped
limbs, busy detail, thin lines
```

## The cast

One line per family. Append it to the house style block. The bracketed slug is
the filename - it must match the `GrammarFamily` union in
`src/modules/grammar/types.ts` exactly, because the loader keys off it.

| Family slug            | Species       | Prompt body                                                                                                                                                               |
| ---------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verb-tenses`          | Chronomancer  | A tall robed timekeeper whose torso is an open clock face with two visible hands, a hood shadowing red eyes, sleeves trailing into clock springs. Calm, patient, ancient. |
| `articles-determiners` | Gatekeeper    | A squat armoured warden standing in a stone gate frame it carries on its own shoulders, one flat palm raised to stop you, tiny red eyes under a heavy brow. Immovable.    |
| `prepositions`         | Trickster     | A lean grinning imp balancing on the rim of an open box, one leg inside and one outside, tail curling into a small arrow. Delighted with itself.                          |
| `pronouns`             | Mimic         | Two identical narrow figures back to back, joined at the spine, one drawn with a dashed outline as though it is the reflection. Unsettling symmetry.                      |
| `modals`               | Judge         | A broad seated magistrate holding a balance scale, one pan low, wearing a flat wide cap, mouth a single straight line. Bored, certain, final.                             |
| `conditionals`         | Oracle        | A hooded seer with no visible face, holding a forked staff that splits into two paths, hem dissolving into dots. Speaks only in maybes.                                   |
| `passive`              | Puppet        | A limp marionette hanging from four strings that leave the top of the frame, head tipped, red eyes still open. Something else is acting.                                  |
| `relative-clauses`     | Serpent       | A long coiled serpent looping back through its own body once, head resting on the coil, no legs. Endless subordinate clause.                                              |
| `reported-speech`      | Echo          | A hollow figure with a second fainter outline of itself offset behind it, mouth open mid-word, dashed sound rings at the ear. Says what someone else said.                |
| `comparatives`         | Twin          | Two near-identical brutes side by side, one a clear head taller, the shorter one glaring up. Rivalry, measured.                                                           |
| `infinitives-gerunds`  | Shapeshifter  | A creature whose upper half is angular and lower half is round and smooth, caught mid-transformation, edges rippling. Cannot decide what form it takes.                   |
| `nouns-quantifiers`    | Swarm         | One larger insectile creature with a cluster of six small identical copies orbiting it, all with red pinprick eyes. Countable and uncountable at once.                    |
| `adjectives-adverbs`   | Shifter       | A slim figure whose limbs are notched like dial settings, one arm slid longer than the other, adjusting a slider on its own chest. Modifies whatever it touches.          |
| `questions-negation`   | Inquisitor    | A gaunt interrogator leaning forward, one hand a hook curved like a question mark, a heavy bar slashing across its chest. Asks, then denies.                              |
| `word-order-inversion` | Contortionist | A supple acrobat folded so its head emerges between its own ankles, arms crossed the wrong way. Correct parts, wrong order.                                               |
| `discourse-connectors` | Weaver        | A many-armed spinner pulling three separate threads into one braided cord, threads leaving the frame at the edges. Joins what was separate.                               |
| `phrasal-verbs`        | Chimera       | A single creature built from two mismatched halves - blocky armoured front, wiry animal rear - stitched at the waist with visible ink stitches. Two words, one meaning.   |

## The sensei

The sensei is a character, not a creature: the learner's examiner. Six
expressions and no more - his authority comes from how little his face moves.

Base prompt (append the house style block, and drop the "single character,
full body" line in favour of "head and shoulders, bust only"):

```
An elderly stern Asian martial-arts examiner, bust only, bald crown with a
tight topknot, long thin moustache, deep-set eyes, high straight brows,
plain dark gi collar. Dignified, tired, entirely unimpressed. Head and
shoulders centered, even margin.
```

Generate the same bust six times, changing only the last sentence:

| Expression    | Direction                                                            |
| ------------- | -------------------------------------------------------------------- |
| `neutral`     | Level brows, straight mouth. Waiting.                                |
| `approving`   | Brows raised a fraction, mouth a shallow upward line. Not a smile.   |
| `unimpressed` | Brows flat and low, mouth flat. Has seen this mistake before.        |
| `wary`        | One brow up, one level, eyes narrowed slightly.                      |
| `severe`      | Brows driven down hard to the inner corners, mouth curved down.      |
| `weary`       | Brows sagging outward, eyes half lidded, mouth curved down slightly. |

Consistency matters more than quality here. Generate `neutral` first, then feed
it back as an image reference for the other five so it stays the same man.

## Asset spec

Anything generated has to meet these or it will not drop in cleanly.

- **Format**: WebP, lossy, quality 82. PNG only if the art has hard-edged
  transparency that WebP mangles.
- **Size**: 512x512 source, exported at 256x256. The largest on-screen slot is
  224px wide, so 256 covers it and 512 covers a 2x lesson-page hero.
- **Weight**: under 25KB each. The whole cast is then under 500KB and any single
  page pulls one or two of them. If a file lands over 25KB, the art has more
  detail than the house style allows - regenerate, do not just compress.
- **Background**: flat `#FDF6EF`, not transparent. Transparency forces the night
  theme to show dark room through the character; a flat paper square reads as a
  bestiary plate in both themes.
- **Naming**: `public/creatures/<family-slug>.webp` and
  `public/sensei/<expression>.webp`. Slugs exactly as in the tables above.
- **Trim**: even margin, roughly 8% of the frame. The card draws its own border,
  so art that bleeds to the edge will look clipped.

## How the art is wired

Adding a new or replacement portrait is two steps: convert it, then list it.

1. **Convert** to 512x512 WebP at quality 80 and write it to
   `public/creatures/<family-slug>.webp` or `public/sensei/<expression>.webp`.
   The source PNGs out of the generator are 1254px and over a megabyte each;
   `sharp` at these settings lands every file between 13KB and 55KB with no
   visible loss at the sizes they render.
2. **List it** in `FAMILIES_WITH_PORTRAIT` in
   `components/grammar/cast/portraits.ts`. That array is the manifest - a family
   missing from it draws its flat mark instead, which is why an incomplete cast
   looks deliberate rather than broken. The array is typed `GrammarFamily[]`, so
   a misspelled slug is a compile error rather than a 404 on a lesson page.

Where each one renders:

- `CreatureSigil` with `size="plate"` (lesson page, recall drill, admin contact
  sheet) draws the portrait. With `size="sm"` (the 40-card index) it always draws
  the mark - forty rasters on one scroll, rendered at 64px where the ink detail
  mushes, buys nothing.
- `SenseiPortrait` draws the bust beside a `SpeechBubble`. Expression comes from
  the `BEAT_EXPRESSION` table in `PanelScriptRenderer` for lesson panels, and
  from `resolveDrillBeat`'s `expression` field for drill feedback.
- Ghost state fades a portrait to 80% rather than 45%. Nearly every point is
  unverified, so the harsher fade meant the whole cast was only ever seen at half
  strength; the dashed frame and the `- ghost` label carry the state instead.
- `CreatureMotion` animates by querying part-rig selectors. A raster has no
  parts, so the whole-host recoil on a correct answer lands and the crest pulse
  on a wrong one hits the portrait as a whole, since `partClass('crest')` rides
  on the image element.
