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
  allowAccidentals: boolean;
  noteCount: number | "";
  withBass: boolean;
}

export const maximumExerciseNotes = 128;

export function isValidNoteCount(count: RandomSettings["noteCount"]): count is number {
  return typeof count === "number" && Number.isInteger(count) && count >= 1 && count <= maximumExerciseNotes;
}

const spelling: [letter: number, accidental: Accidental][] = [
  [0, null], [0, 1], [1, null], [2, -1], [2, null], [3, null],
  [3, 1], [4, null], [4, 1], [5, null], [6, -1], [6, null],
];

function spellNotes(onsets: { melody: number; bass?: number }[], withBass: boolean) {
  const alterations = new Map<number, Accidental>();
  return onsets.flatMap(({ melody, bass }, beat) => {
    if (beat % 4 === 0) alterations.clear();
    function spell(midi: number, voice?: Note["voice"]) {
      const [letter, sign] = spelling[midi % 12];
      // Guitar is written an octave above its sounding pitch.
      const step = (Math.floor(midi / 12) - 4) * 7 + letter;
      const accidental = sign ?? (alterations.get(step) ? 0 : null);
      alterations.set(step, sign);
      return { step, accidental, beat, voice };
    }
    return bass === undefined ? [spell(melody, withBass ? "melody" : undefined)] : [spell(bass, "bass"), spell(melody, "melody")];
  });
}

function availablePositions({ strings, firstFret, lastFret, allowAccidentals }: RandomSettings) {
  const availableFrets = frets.filter((fret) => fret >= firstFret && fret <= lastFret);
  return guitarStrings
    .filter(({ number }) => strings.includes(number))
    .flatMap(({ number, openMidi }) => availableFrets.map((fret) => ({ string: number, fret, pitch: openMidi + fret })))
    .filter(({ pitch }) => allowAccidentals || spelling[pitch % 12][1] === null);
}

export function availablePitches(settings: RandomSettings) {
  return [...new Set(availablePositions(settings).map(({ pitch }) => pitch))];
}

export function bassNotesByMelody(settings: RandomSettings) {
  const positions = availablePositions(settings);
  const pairs = new Map<number, Set<number>>();
  for (const melody of positions) {
    for (const bass of positions) {
      if (bass.string <= melody.string || bass.pitch >= melody.pitch) continue;
      // Open strings can ring without extending the left hand’s reach.
      if (bass.fret && melody.fret && Math.abs(bass.fret - melody.fret) > 4) continue;
      // A melody near a bass harmonic is ambiguous on a single microphone.
      const ratio = 2 ** ((melody.pitch - bass.pitch) / 12);
      const harmonic = Math.round(ratio);
      if (harmonic > 1 && Math.abs(12 * Math.log2(ratio / harmonic)) < 0.2) continue;
      const choices = pairs.get(melody.pitch) ?? new Set<number>();
      choices.add(bass.pitch);
      pairs.set(melody.pitch, choices);
    }
  }
  return pairs;
}

const major = [0, 2, 4, 5, 7, 9, 11];
const progressions = [[0, 3, 4, 0], [0, 5, 4, 0], [0, 1, 4, 0]];

function chooseScale(pitches: number[], allowAccidentals: boolean) {
  if (!allowAccidentals) return major;
  const pitchClasses = new Set(pitches.map((pitch) => pitch % 12));
  let bestCoverage = -1;
  let bestScales: number[][] = [];
  for (let root = 0; root < 12; root++) {
    const scale = major.map((step) => (root + step) % 12);
    const coverage = scale.filter((pitch) => pitchClasses.has(pitch)).length;
    if (coverage > bestCoverage) {
      bestCoverage = coverage;
      bestScales = [];
    }
    if (coverage === bestCoverage) bestScales.push(scale);
  }
  return bestScales[Math.floor(Math.random() * bestScales.length)];
}

function choosePitch(pitches: number[], previous: number | undefined, chord: number[], preferred?: (pitch: number) => boolean) {
  const weights = pitches.map((pitch) => {
    const distance = previous === undefined ? 0 : Math.abs(pitch - previous);
    const motion = distance <= 2 ? 6 : distance <= 5 ? 3 : 1;
    return motion * (chord.includes(pitch % 12) ? 2 : 1) * (preferred?.(pitch) ? 2 : 1);
  });
  let pick = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (const [index, weight] of weights.entries()) {
    pick -= weight;
    if (pick < 0) return pitches[index];
  }
  return pitches[pitches.length - 1];
}

export function generateRandomExercise(settings: RandomSettings): Score {
  const { noteCount } = settings;
  if (!isValidNoteCount(noteCount)) throw new Error("Invalid exercise length.");
  const pitches = availablePitches(settings);
  if (!pitches.length) throw new Error("No notes match the selected strings, frets, and accidentals.");
  const pairs = settings.withBass ? bassNotesByMelody(settings) : null;
  if (pairs?.size === 0) throw new Error("No playable bass and melody pairs in this range.");

  const scale = chooseScale(pitches, settings.allowAccidentals);
  const progression = progressions[Math.floor(Math.random() * progressions.length)];
  const lastBar = Math.ceil(noteCount / 4) - 1;
  const notes: { melody: number; bass?: number }[] = [];
  const midpoint = (Math.min(...pitches) + Math.max(...pitches)) / 2;
  let previousBass: number | undefined;
  for (let index = 0; index < noteCount; index++) {
    const previous = notes.at(-1)?.melody;
    const strongBeat = index % 2 === 0;
    const paired = pairs && strongBeat ? pairs : null;
    const available = paired ? [...paired.keys()] : pitches;
    const choices = available.length > 1 ? available.filter((pitch) => pitch !== previous) : available;
    const bar = Math.floor(index / 4);
    const ending = index === noteCount - 1;
    // A dominant bar leads back to the tonic near the end of a longer phrase.
    const degree = bar === lastBar ? 0 : lastBar > 1 && bar === lastBar - 1 ? 4 : progression[bar % progression.length];
    const chord = [0, 2, 4].map((offset) => scale[(degree + offset) % 7]);
    const scaleNotes = choices.filter((pitch) => scale.includes(pitch % 12));
    const chordNotes = scaleNotes.filter((pitch) => chord.includes(pitch % 12));
    const tonicNotes = ending ? chordNotes.filter((pitch) => pitch % 12 === scale[0]) : [];
    const candidates = tonicNotes.length ? tonicNotes
      : (strongBeat || ending) && chordNotes.length ? chordNotes : scaleNotes.length ? scaleNotes : choices;
    const melody = choosePitch(candidates, previous, chord, settings.withBass
      ? undefined : (pitch) => strongBeat ? pitch <= midpoint : pitch > midpoint);
    if (!paired) {
      notes.push({ melody });
      continue;
    }
    const bassOptions = [...paired.get(melody)!];
    const chordBass = bassOptions.filter((pitch) => chord.includes(pitch % 12));
    const bass = choosePitch(chordBass.length ? chordBass : bassOptions, previousBass, chord);
    notes.push({ melody, bass });
    previousBass = bass;
  }
  const id = crypto.randomUUID();
  return {
    id, title: "Random sightreading", key: 0,
    staves: Array.from({ length: Math.ceil(noteCount / 8) }, (_, index) =>
      exerciseStaff(`${id}-${index}`, spellNotes(notes.slice(index * 8, (index + 1) * 8), settings.withBass))),
  };
}
