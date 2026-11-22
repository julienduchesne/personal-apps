export type Accidental = -1 | 0 | 1 | null;

export interface Note {
  id: string;
  x: number;
  y: number;
  step: number;
  accidental: Accidental;
  hollow: boolean;
}

export interface Staff {
  image?: string;
  imageCrop?: { x: number; y: number; width: number; height: number };
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  spacing: number;
  page?: number;
  line?: number;
  track?: number;
  notes: Note[];
}

export interface Score {
  id: string;
  title: string;
  key: number;
  pages?: string[];
  staves: Staff[];
}

export const steps = Array.from({ length: 22 }, (_, index) => index - 5);
export const keys = ["C♭", "G♭", "D♭", "A♭", "E♭", "B♭", "F", "C", "G", "D", "A", "E", "B", "F♯", "C♯"];

function pitch(step: number, key: number, accidental: Accidental) {
  const letter = (step % 7 + 7) % 7;
  const octave = 4 + (step - letter) / 7;
  const signature = key > 0
    ? Number([3, 0, 4, 1, 5, 2, 6].slice(0, key).includes(letter))
    : -Number([6, 2, 5, 1, 4, 0, 3].slice(0, -key).includes(letter));
  return { letter, octave, alteration: accidental ?? signature };
}

export function noteName(step: number, key: number, accidental: Accidental = null) {
  const { letter, octave, alteration } = pitch(step, key, accidental);
  return `${"CDEFGAB"[letter]}${["♭", "", "♯"][alteration + 1]}${octave}`;
}

export function soundingMidi(note: Note, key: number) {
  const { letter, octave, alteration } = pitch(note.step, key, note.accidental);
  // Written classical guitar notation sounds an octave lower.
  return 12 * octave + [0, 2, 4, 5, 7, 9, 11][letter] + alteration;
}

export function scoreEvents(score: Score, track = 1) {
  return score.staves.flatMap((staff, staffIndex) => {
    if ((staff.track ?? 1) !== track) return [];
    const groups: { staffIndex: number; notes: Note[] }[] = [];
    for (const note of [...staff.notes].sort((a, b) => a.x - b.x)) {
      const last = groups.at(-1);
      if (last && note.x - last.notes[0].x < staff.spacing * 1.08) last.notes.push(note);
      else groups.push({ staffIndex, notes: [note] });
    }
    return groups;
  });
}

export const exercise: Score = {
  id: "open-strings",
  title: "Open String Study",
  key: 0,
  staves: [[-5, -2, 1, 4, 6, 9, 6, 4], [1, 4, 6, 9, 4, 6, 4, 1]].map((row, index) => ({
    width: 600, height: 190, left: 28, right: 572, top: 63, spacing: 15,
    notes: row.map((step, offset) => ({
      id: `demo-${index}-${offset}`, x: 115 + offset * 61, y: 63 + (10 - step) * 7.5,
      step, accidental: null, hollow: false,
    })),
  })),
};
