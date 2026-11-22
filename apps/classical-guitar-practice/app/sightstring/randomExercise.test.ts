import { describe, expect, it, vi } from "vitest";
import { generateRandomExercise } from "./randomExercise";
import { practiceNoteName, scoreEvents, soundingMidi } from "./score";

describe("random sightreading", () => {
  it("only draws from the chosen strings and inclusive frets", () => {
    const score = generateRandomExercise({ strings: [6, 2], firstFret: 5, lastFret: 8 });
    const notes = scoreEvents(score).map(({ notes: [note] }) => soundingMidi(note, score.key));
    expect(notes).toHaveLength(16);
    expect(notes.every((note) => [45, 46, 47, 48, 64, 65, 66, 67].includes(note))).toBe(true);
    expect(notes.every((note, index) => index === 0 || note !== notes[index - 1])).toBe(true);
  });

  it("can generate open strings or a single high fret without clipping the notes", () => {
    const open = generateRandomExercise({ strings: [6], firstFret: 0, lastFret: 0 });
    expect(open.staves.flatMap(({ notes }) => notes).every((note) => soundingMidi(note, open.key) === 40)).toBe(true);
    const high = generateRandomExercise({ strings: [1], firstFret: 18, lastFret: 18 });
    const notes = high.staves.flatMap(({ notes }) => notes);
    expect(notes.every((note) => soundingMidi(note, high.key) === 82 && note.y >= 20)).toBe(true);
    expect(practiceNoteName(notes[0], high.key)).toBe("Si♭ (B♭6)");
  });

  it("prints a natural when it cancels an accidental in the same measure", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.9);
    try {
      const score = generateRandomExercise({ strings: [1], firstFret: 1, lastFret: 2 });
      expect(score.staves[0].notes.slice(0, 2).map(({ accidental }) => accidental)).toEqual([1, 0]);
    } finally {
      random.mockRestore();
    }
  });
});
