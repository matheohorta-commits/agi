# The Murder House, in real LEGO parts

A buildable, fan-designed LEGO model of the house from *American Horror Story* season 1
(the Rosenheim Mansion, 1120 Westchester Place, Los Angeles), with:

- **A 3D model where every single part is placed**: 2,547 pieces, 281 part/colour lots, 9 minifigures.
- **An instruction booklet**, page by page, laid out like an official booklet: light-blue pages, big step
  numbers, parts callouts with counts, bag openers, a minifigure page and the parts inventory at the end.
- **Build it yourself mode**: follow the steps and drag each part from the tray onto the model; it snaps in
  when you drop it near its spot (with a click sound, hints, auto-place and a timer).
- **Parts & buying**: the full parts list with estimated BrickLink prices and how common each part is,
  plus a BrickLink wanted-list XML, a Rebrickable CSV and a spreadsheet CSV.
- **A radio**: two endless built-in stations (spooky lofi and synthwave, generated live with WebAudio)
  and the two Lofi Girl live streams (lofi hip hop radio, and the synthwave radio with the synthwave boy).

## Run it

Easiest: open `standalone/murder-house.html` in a browser (a single self-contained file, works offline;
the fonts and the YouTube streams need a connection).

To work on the code (plain ES modules, no build step):

```bash
cd murder-house
npx http-server -c-1 -p 8120 .     # then open http://localhost:8120
```

`npm run build` regenerates the standalone file, `npm run validate` checks the model.

## The design

**Exterior** (from the real Rosenheim Mansion): red-brown brick with pale stone trim (lintels, sills, quoins),
a bowed stair-hall turret lit by nine Tiffany stained-glass panels (built from stacked trans-colour plates with
black leading), a carved stone entrance portico with a Tudor arch, a curved brick balcony above it, three steep
slate roofs with stepped stone-coped parapet gables and round-top attic windows, three tall chimneys, and a broad
lawn on a knoll edged by low brick walls, a black iron fence, gate lamps and a stepped path up to the porch.

**Interior** (imagined from the show), open at the back like a dollhouse:

| Floor | Rooms |
| --- | --- |
| Basement | Dr. Charles Montgomery's laboratory: operating table, specimen-jar shelves, boiler, chest |
| Ground floor | Grand staircase curving up the turret, living room with fireplace, Ben's office with the patient couch, dining room, black & white kitchen (Moira's) |
| Upper floor | Master bedroom, Violet's room, the nursery, bathroom with a tub, study opening onto the balcony |
| Attic | The Rubber Man's chest, old trunks and junk (the roof lifts off) |
| Backyard | The gazebo over Moira's grave |

**Residents**: Tate, Violet, Ben, Vivien, Constance, Moira (young and old), the Rubber Man and Dr. Charles
Montgomery, all built from plain, cheap minifigure parts.

## Making sure it is real and buildable

- `js/core/catalog.js` is generated from the Rebrickable catalogue (`tools/gen-catalog.py`). Every part/colour
  combination in the model is checked against it: nothing is used in a colour that was never produced.
  The same data (how many sets since 2015 contain the part in that colour) drives the price estimate and
  steers the design to the most common, cheapest parts and colours.
- `tools/validate.mjs` checks that no two parts overlap, that every part is connected by studs to the base,
  and that after **every** instruction step nothing is left floating.

```
connectivity: 1 component(s); main = 2534 parts; 0 parts not connected to the base
build order: 239 steps; 0 parts left floating at the end of their step
catalogue check: 0 problems
```

## Code map

| Path | What |
| --- | --- |
| `js/core/parts.js` | Part library: real LEGO design ids, sizes, studs, geometry type |
| `js/core/colors.js` | Colours with Rebrickable and BrickLink ids |
| `js/core/builder.js` | Model builder: occupancy grid, brick walls with a running bond, plate/tile fills, gable and pyramid roofs, hidden supports |
| `js/model/house.js` | The Murder House design, section by section (= instruction bags) |
| `js/model/furniture.js` | Furniture, trees and minifigures |
| `js/core/steps.js` | Turns the build order into instruction steps |
| `js/core/bom.js` | Parts list, prices, BrickLink/Rebrickable exports |
| `js/gfx/` | three.js geometry for every part, instanced renderer, part thumbnails |
| `js/ui/` | Booklet, build mode, parts list, radio |

Prices are estimates (a base price per part scaled by how common the part is in that colour); check BrickLink
for live prices. This is an unofficial fan project, not affiliated with the LEGO Group or FX.
