export type Accidental = -1 | 0 | 1 | null;
export type Finger = 0 | 1 | 2 | 3 | 4;
export const noteDurations = [0.0625, 0.125, 0.25, 0.5, 1, 2, 4] as const;

export const beatUnits = [1, 2, 4, 8, 16, 32] as const;

export interface Meter {
  beats: number;
  beatUnit: typeof beatUnits[number];
}

export interface TimeSignature extends Meter {
  x: number;
}

export interface Note {
  id: string;
  x: number;
  y: number;
  step: number;
  accidental: Accidental;
  hollow: boolean;
  duration?: typeof noteDurations[number];
  stem?: { x: number; y: number; up: boolean };
  beam?: { to: string; count: number };
  finger?: Finger;
  voice?: "bass" | "melody";
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
  timeSignature?: TimeSignature;
  barlines?: number[];
  notes: Note[];
}

export interface Score {
  id: string;
  title: string;
  key: number;
  generated?: true;
  timeSignature?: Meter | null;
  pages?: string[];
  staves: Staff[];
}

export interface PracticeAttempt {
  id: string;
  durationMs: number;
  completedAt: string;
}

export const leaderboardSize = 10;
export const steps = Array.from({ length: 22 }, (_, index) => index - 5);
export const keys = ["C♭", "G♭", "D♭", "A♭", "E♭", "B♭", "F", "C", "G", "D", "A", "E", "B", "F♯", "C♯"];

export function scoreMeter(score: Score, track = 1) {
  return score.timeSignature === undefined
    ? (score.staves.find((staff) => (staff.track ?? 1) === track && staff.timeSignature)
      ?? score.staves.find((staff) => staff.timeSignature))?.timeSignature
    : score.timeSignature;
}

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

export function practiceNoteName(note: Note, key: number) {
  const { letter, octave, alteration } = pitch(note.step, key, note.accidental);
  const sign = ["♭", "", "♯"][alteration + 1];
  const solfege = ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"][letter];
  return `${solfege}${sign} (${"CDEFGAB"[letter]}${sign}${octave})`;
}

export function soundingMidi(note: Note, key: number) {
  const { letter, octave, alteration } = pitch(note.step, key, note.accidental);
  // Written classical guitar notation sounds an octave lower.
  return 12 * octave + [0, 2, 4, 5, 7, 9, 11][letter] + alteration;
}

export function displayAccidental(note: Note, key: number): Accidental {
  const alteration = pitch(note.step, key, null).alteration;
  return note.accidental ?? (alteration === 1 || alteration === -1 ? alteration : null);
}

export function scoreEvents(score: Score, track = 1) {
  return score.staves.flatMap((staff, staffIndex) => {
    if ((staff.track ?? 1) !== track) return [];
    const groups: { staffIndex: number; notes: Note[] }[] = [];
    for (const note of [...staff.notes].sort((a, b) => a.x - b.x)) {
      const last = groups.at(-1);
      if (last && note.x - last.notes[0].x < staff.spacing * 1.08
        && !last.notes.some((head) => head.beam?.to === note.id)) last.notes.push(note);
      else groups.push({ staffIndex, notes: [note] });
    }
    return groups;
  });
}

export function exerciseStaff(
  id: string,
  notes: (Pick<Note, "step" | "accidental" | "voice"> & { beat?: number })[],
  noteId = (index: number) => `${id}-${index}`,
): Staff {
  const spacing = 15;
  const positions = notes.map(({ step }) => (10 - step) * spacing / 2);
  const top = Math.max(63, 50 - Math.min(...positions));
  const bottom = Math.max(...notes.map(({ step, voice }, index) =>
    positions[index] + (voice === "bass" || (!voice && step >= 6) ? 50 : 14)));
  return {
    width: 600, height: Math.max(190, top + bottom, top + 77), left: 28, right: 572, top, spacing,
    notes: notes.map(({ beat, ...note }, index) => ({
      ...note, id: noteId(index), x: 115 + (beat ?? index) * 61, y: top + positions[index], hollow: false,
    })),
  };
}

export const exercise: Score = {
  id: "open-strings",
  title: "Open String Study",
  key: 0,
  staves: [[-5, -2, 1, 4, 6, 9, 6, 4], [1, 4, 6, 9, 4, 6, 4, 1]].map((row, index) =>
    exerciseStaff(`demo-${index}`, row.map((step) => ({ step, accidental: null })))),
};
