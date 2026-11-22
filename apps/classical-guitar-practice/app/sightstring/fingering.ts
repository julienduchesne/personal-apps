import { scoreEvents, soundingMidi, type Finger, type Score } from "./score";

export const guitarStrings = [
  { number: 6, openMidi: 40, name: "Low E" },
  { number: 5, openMidi: 45, name: "A" },
  { number: 4, openMidi: 50, name: "D" },
  { number: 3, openMidi: 55, name: "G" },
  { number: 2, openMidi: 59, name: "B" },
  { number: 1, openMidi: 64, name: "High E" },
];

export const frets = Array.from({ length: 19 }, (_, index) => index);

type Position = { string: number; fret: number; finger: Finger };

function findShape(choices: { string: number; fret: number; finger?: Finger }[][], previousAnchor: number) {
  if (!choices.length || choices.length > guitarStrings.length || choices.some((positions) => !positions.length)) return;
  const chosen: Position[] = [];
  let best: { anchor: number; positions: Position[]; cost: number } | undefined;

  for (const anchor of frets.slice(1)) {
    function choose(index: number, cost: number) {
      if (best && cost >= best.cost) return;
      if (index === choices.length) {
        best = { anchor, positions: [...chosen], cost };
        return;
      }
      for (const { string, fret, finger: specified } of choices[index]) {
        if (fret && (fret < anchor || fret > anchor + 4)) continue;
        const finger = (fret ? Math.min(4, fret - anchor + 1) : 0) as Finger;
        if (specified !== undefined && specified !== finger) continue;
        if (chosen.some((position) => position.string === string || (position.finger === finger && position.fret !== fret))) continue;
        chosen.push({ string, fret, finger });
        choose(index + 1, cost + (fret ? 1 + fret / 18 + (fret === anchor + 4 ? 2 : 0) : 0));
        chosen.pop();
      }
    }
    choose(0, Math.abs(anchor - previousAnchor));
  }
  return best;
}

export function suggestFingerings(
  score: Score,
  track: number,
  range?: { strings: number[]; firstFret: number; lastFret: number },
) {
  const suggestions = new Map<string, Finger>();
  const { strings = guitarStrings.map(({ number }) => number), firstFret = 0, lastFret = 18 } = range ?? {};
  let anchor = Math.max(1, firstFret);
  for (const { notes } of scoreEvents(score, track)) {
    for (const note of notes) {
      if (note.finger !== undefined) suggestions.set(note.id, note.finger);
    }
    if (notes.every((note) => note.finger !== undefined)) continue;
    const choices = notes.map((note) => {
      const midi = soundingMidi(note, score.key);
      return guitarStrings.filter(({ number }) => strings.includes(number)
        && (!note.voice || (number >= 4) === (note.voice === "bass")))
        .map(({ number, openMidi }) => ({ string: number, fret: midi - openMidi, finger: note.finger }))
        .filter(({ fret }) => fret >= firstFret && fret <= lastFret);
    });
    const shape = findShape(choices, anchor);
    if (!shape) continue;
    anchor = shape.anchor;
    notes.forEach((note, index) => suggestions.set(note.id, shape.positions[index].finger));
  }
  return suggestions;
}
