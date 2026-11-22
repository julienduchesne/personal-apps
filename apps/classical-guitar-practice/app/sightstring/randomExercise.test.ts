import { describe, expect, it, vi } from "vitest";
import { availablePitches, generateRandomExercise } from "./randomExercise";
import { practiceNoteName, scoreEvents, soundingMidi } from "./score";

describe("random sightreading", () => {
  const defaults = { noteCount: 16, allowAccidentals: true, withBass: false };

  it("only draws from the chosen strings and inclusive frets", () => {
    const score = generateRandomExercise({ ...defaults, strings: [6, 2], firstFret: 5, lastFret: 8 });
    const notes = scoreEvents(score).map(({ notes: [note] }) => soundingMidi(note, score.key));
    expect(notes).toHaveLength(16);
    expect(notes.every((note) => [45, 46, 47, 48, 64, 65, 66, 67].includes(note))).toBe(true);
    expect(notes.every((note, index) => index === 0 || note !== notes[index - 1])).toBe(true);
  });

  it("can generate open strings or a single high fret without clipping the notes", () => {
    const open = generateRandomExercise({ ...defaults, strings: [6], firstFret: 0, lastFret: 0 });
    expect(open.staves.flatMap(({ notes }) => notes).every((note) => soundingMidi(note, open.key) === 40)).toBe(true);
    const high = generateRandomExercise({ ...defaults, strings: [1], firstFret: 18, lastFret: 18 });
    const notes = high.staves.flatMap(({ notes }) => notes);
    expect(notes.every((note) => soundingMidi(note, high.key) === 82 && note.y >= 20)).toBe(true);
    expect(practiceNoteName(notes[0], high.key)).toBe("Si♭ (B♭6)");
  });

  it("prints a natural when it cancels an accidental in the same measure", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.9);
    try {
      const score = generateRandomExercise({ ...defaults, strings: [1], firstFret: 1, lastFret: 2 });
      expect(score.staves[0].notes.slice(1, 4).some(({ accidental }) => accidental === 0)).toBe(true);
    } finally {
      random.mockRestore();
    }
  });

  it("keeps only natural pitches when sharps and flats are disabled", () => {
    const settings = { ...defaults, strings: [1], firstFret: 12, lastFret: 18, allowAccidentals: false };
    expect(availablePitches(settings)).toEqual([76, 77, 79, 81]);
    const score = generateRandomExercise(settings);
    expect(score.staves.flatMap(({ notes }) => notes).every((note) => note.accidental === null)).toBe(true);
    expect(availablePitches({ ...settings, firstFret: 18 })).toEqual([]);
  });

  it("engraves any requested length, including a partial final staff", () => {
    const settings = { ...defaults, strings: [1], firstFret: 0, lastFret: 12 };
    const score = generateRandomExercise({ ...settings, noteCount: 37 });
    expect(score.staves.map(({ notes }) => notes.length)).toEqual([8, 8, 8, 8, 5]);
    expect(scoreEvents(generateRandomExercise({ ...settings, noteCount: 1 }))).toHaveLength(1);
    expect(() => generateRandomExercise({ ...settings, noteCount: 129 })).toThrow("Invalid exercise length");
  });

  it("anchors strong beats in the phrase’s triads when enough pitches are available", () => {
    const score = generateRandomExercise({
      ...defaults, strings: [6, 5, 4, 3, 2, 1], firstFret: 0, lastFret: 12, allowAccidentals: false,
    });
    const pitchClasses = scoreEvents(score).map(({ notes: [note] }) => soundingMidi(note, score.key) % 12);
    expect([0, 4, 7]).toContain(pitchClasses[0]);
    expect([0, 4, 7]).toContain(pitchClasses[2]);
    expect([7, 11, 2]).toContain(pitchClasses[8]);
    expect([7, 11, 2]).toContain(pitchClasses[10]);
  });

  it("adds a playable bass note on beats 1 and 3 without changing the exercise length", () => {
    const settings = { ...defaults, strings: [6, 5], firstFret: 0, lastFret: 0, noteCount: 4, withBass: true };
    const score = generateRandomExercise(settings);
    const events = scoreEvents(score);
    expect(events.map(({ notes }) => notes.length)).toEqual([2, 1, 2, 1]);
    expect(events[0].notes.map((note) => [note.voice, soundingMidi(note, score.key)]))
      .toEqual([["bass", 40], ["melody", 45]]);
    expect(events[0].notes[0].x).toBe(events[0].notes[1].x);
    expect(scoreEvents(generateRandomExercise({ ...settings, withBass: false })).every(({ notes }) => notes.length === 1)).toBe(true);
    expect(() => generateRandomExercise({ ...settings, strings: [6] })).toThrow("No playable bass and melody pairs");
    expect(() => generateRandomExercise({ ...settings, strings: [6, 1] })).toThrow("No playable bass and melody pairs");
  });
});
