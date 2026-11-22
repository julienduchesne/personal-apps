import { exerciseStaff, type Accidental, type Note, type Score } from "./score";

export const guitarStrings = [
  { number: 6, openMidi: 40, name: "Low E" },
  { number: 5, openMidi: 45, name: "A" },
  { number: 4, openMidi: 50, name: "D" },
  { number: 3, openMidi: 55, name: "G" },
  { number: 2, openMidi: 59, name: "B" },
  { number: 1, openMidi: 64, name: "High E" },
];

export const frets = Array.from({ length: 19 }, (_, index) => index);

export interface RandomSettings {
  strings: number[];
  firstFret: number;
  lastFret: number;
}

const spelling: [letter: number, accidental: Accidental][] = [
  [0, null], [0, 1], [1, null], [2, -1], [2, null], [3, null],
  [3, 1], [4, null], [4, 1], [5, null], [6, -1], [6, null],
];

function spellNotes(midiPitches: number[]): Pick<Note, "step" | "accidental">[] {
  const alterations = new Map<number, Accidental>();
  return midiPitches.map((midi, index) => {
    if (index % 4 === 0) alterations.clear();
    const [letter, sign] = spelling[midi % 12];
    // Guitar is written an octave above its sounding pitch.
    const step = (Math.floor(midi / 12) - 4) * 7 + letter;
    const accidental = sign ?? (alterations.get(step) ? 0 : null);
    alterations.set(step, sign);
    return { step, accidental };
  });
}

export function generateRandomExercise({ strings, firstFret, lastFret }: RandomSettings): Score {
  const availableFrets = frets.filter((fret) => fret >= firstFret && fret <= lastFret);
  const pitches = [...new Set(guitarStrings
    .filter(({ number }) => strings.includes(number))
    .flatMap(({ openMidi }) => availableFrets.map((fret) => openMidi + fret)))];
  if (!pitches.length) throw new Error("Choose at least one string and a valid fret range.");

  const notes: number[] = [];
  for (let index = 0; index < 16; index++) {
    const choices = pitches.length > 1 ? pitches.filter((pitch) => pitch !== notes.at(-1)) : pitches;
    notes.push(choices[Math.floor(Math.random() * choices.length)]);
  }
  const id = crypto.randomUUID();
  return {
    id, title: "Random sightreading", key: 0,
    staves: [notes.slice(0, 8), notes.slice(8)].map((line, index) => exerciseStaff(`${id}-${index}`, spellNotes(line))),
  };
}
