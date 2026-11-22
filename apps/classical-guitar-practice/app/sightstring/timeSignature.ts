import type { TimeSignature } from "./score";

// SMuFL time-signature digit outlines from Bravura, covered by the bundled font license.
const templates = [
  "...####... ..##..##.. .###..###. .###..###. ###....### ###....### ###....### ###....### ###....### ###....### .###..###. .###..###. ..##.###.. ...####...",
  "...#####.. ...#####.. ..######.. ..######.. .#######.. .#..####.. ##..####.. ....####.. ....####.. ....####.. ....####.. ....####.. ...#####.. .#########",
  "..######.. .#....###. ###...#### ####..#### ####..#### .###..#### .....####. .....###.. ...##..... ..##.....# .#######.# .########. ##..#####. #....###..",
  "..#####... .##...###. ####..###. ####..###. .###..###. .....####. ...####... .....####. ..#...#### ####..#### ####..#### ####..#### ###..####. ..#####...",
  "...####... ...####... ...###.... ...###.#.. ..###.##.. ..##.###.. ..##.###.. .##..###.. .#...###.. ########## .....###.. .....###.. .....###.. ...######.",
  ".########. .########. .#######.. .#........ .#........ ########.. ##...####. ......#### .###..#### ####..#### ####..#### ####..#### .##..####. ..#####...",
  "...#####.. ..##..###. .###..###. .###..###. ####..##.. ###....... ########.. ####..###. ####..#### ####...### .###...### .###..#### ..##..###. ...#####..",
  "..####...# #######..# ########## ##.####### #...#####. #......##. .......##. ......##.. .....###.. ....####.. ...####... ...####... ...####... ...####...",
  "..#####... .##....##. ##......#. ###.....#. ####....#. .########. .########. ..######## .#...##### ##....#### #......### ##.....### .##....##. ..#####...",
  "..#####... .###..##.. ####..###. ###...###. ###...#### ####..#### .###..#### ..######## .......### ..##..#### .###..###. .###..###. .###..##.. ..#####...",
].map((glyph) => Uint8Array.from(glyph.replaceAll(" ", ""), (cell) => Number(cell === "#")));

type Match = { digit: number; x: number; width: number; strength: number };

export function readTimeSignature(ink: Uint8Array, width: number, top: number, spacing: number, left: number) {
  const stride = Math.max(1, spacing * 0.13);
  const sample = new Uint8Array(140);

  function findDigits(row: number, digits: number[]) {
    const matches: Match[] = [];
    for (let x = left + spacing * 2.8; x < Math.min(width - spacing, left + spacing * 9); x += stride) {
      let best: Match | undefined;
      for (const glyphWidth of [0.85, 1.05, 1.25, 1.45, 1.65].map((factor) => factor * spacing)) {
        for (const vertical of [-0.13, 0, 0.13]) {
          for (const height of [1.7, 1.95]) {
            let count = 0;
            for (let y = 0; y < 14; y++) {
              const offset = Math.round(top + spacing * (row + vertical + ((y + 0.5) / 14 - 0.5) * height)) * width;
              for (let col = 0; col < 10; col++) {
                const pixel = ink[offset + Math.round(x + ((col + 0.5) / 10 - 0.5) * glyphWidth)];
                sample[y * 10 + col] = pixel;
                count += pixel;
              }
            }
            if (count < 26 || count > 105) continue;
            for (const digit of digits) {
              const glyph = templates[digit];
              let overlap = 0;
              let total = count;
              for (let i = 0; i < glyph.length; i++) {
                total += glyph[i];
                overlap += Number(glyph[i] && sample[i]);
              }
              const strength = 2 * overlap / total;
              if (strength >= 0.73 && (!best || strength > best.strength)) best = { digit, x, width: glyphWidth, strength };
            }
          }
        }
      }
      if (best) matches.push(best);
    }
    return matches;
  }

  const bottom = findDigits(3, [2, 4, 8]);
  if (!bottom.length) return;
  const topMatches = findDigits(1, [2, 3, 4, 5, 6, 7, 8, 9]);
  let best: { meter: TimeSignature; right: number; strength: number } | undefined;
  for (const upper of topMatches) {
    for (const lower of bottom) {
      if (Math.abs(upper.x - lower.x) > spacing * 0.32) continue;
      const strength = (upper.strength + lower.strength) / 2;
      if (strength < 0.79 || (best && strength <= best.strength)) continue;
      best = {
        meter: { beats: upper.digit, beatUnit: lower.digit as TimeSignature["beatUnit"], x: (upper.x + lower.x) / 2 },
        right: Math.max(upper.x + upper.width / 2, lower.x + lower.width / 2),
        strength,
      };
    }
  }
  return best;
}
