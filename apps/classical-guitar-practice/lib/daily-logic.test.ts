import { describe, it, expect } from "vitest";
import {
  resolveExercisesByTitle,
  selectOnePerCategory,
  nextDue,
  getFamiliarPiecesDue,
  getNewPiece,
} from "./daily-logic";
import type { Exercise, Piece } from "./types";

const EXERCISES: Exercise[] = [
  { name: "Ex A", category: "right_hand", focus: "Focus A" },
  { name: "Ex B", category: "right_hand", focus: "Focus B" },
  { name: "Ex C", category: "left_hand", focus: "Focus C" },
  { name: "Ex D", category: "coordination_scales", focus: "Focus D" },
  { name: "Ex E", category: "specialized", focus: "Focus E" },
];

function makePiece(overrides: Partial<Piece> = {}): Piece {
  return {
    id: "test-id",
    title: "Test Piece",
    proficiency: "comfortable",
    lastPlayed: null,
    playCount: 0,
    troubleNotes: "",
    goalBpm: null,
    currentCleanBpm: null,
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("resolveExercisesByTitle", () => {
  it("returns exercises matching the given titles", () => {
    const result = resolveExercisesByTitle(EXERCISES, ["Ex A", "Ex C"]);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Ex A");
    expect(result[1].name).toBe("Ex C");
  });

  it("skips titles that don't match any exercise", () => {
    const result = resolveExercisesByTitle(EXERCISES, [
      "Ex A",
      "Unknown Exercise",
      "Ex C",
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.name)).toEqual(["Ex A", "Ex C"]);
  });

  it("returns empty array when no titles match", () => {
    expect(resolveExercisesByTitle(EXERCISES, ["Unknown", "Also Unknown"])).toHaveLength(0);
  });

  it("returns empty array for empty titles input", () => {
    expect(resolveExercisesByTitle(EXERCISES, [])).toHaveLength(0);
  });
});

describe("selectOnePerCategory", () => {
  it("picks one exercise per category that has exercises", () => {
    const result = selectOnePerCategory(EXERCISES);
    expect(result).toHaveLength(4);
    for (const title of result) {
      expect(EXERCISES.some((e) => e.name === title)).toBe(true);
    }
  });

  it("picks the first exercise when random() returns 0", () => {
    const result = selectOnePerCategory(EXERCISES, () => 0);
    expect(result[0]).toBe("Ex A"); // first right_hand
    expect(result[1]).toBe("Ex C"); // only left_hand
    expect(result[2]).toBe("Ex D"); // only coordination_scales
    expect(result[3]).toBe("Ex E"); // only specialized
  });

  it("picks the last exercise when random() returns 0.99", () => {
    const result = selectOnePerCategory(EXERCISES, () => 0.99);
    expect(result[0]).toBe("Ex B"); // last right_hand (index 1 of 2)
  });

  it("skips categories with no exercises", () => {
    const onlyRightHand: Exercise[] = [
      { name: "Solo", category: "right_hand", focus: "Focus" },
    ];
    const result = selectOnePerCategory(onlyRightHand);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Solo");
  });

  it("returns empty array when exercise list is empty", () => {
    expect(selectOnePerCategory([])).toHaveLength(0);
  });
});

describe("nextDue", () => {
  it("returns today when piece has never been played", () => {
    const piece = makePiece({ lastPlayed: null });
    const today = new Date().toISOString().slice(0, 10);
    expect(nextDue(piece)).toBe(today);
  });

  it("adds 7 days for comfortable proficiency", () => {
    const piece = makePiece({ proficiency: "comfortable", lastPlayed: "2024-01-01" });
    expect(nextDue(piece)).toBe("2024-01-08");
  });

  it("adds 14 days for very_proficient", () => {
    const piece = makePiece({ proficiency: "very_proficient", lastPlayed: "2024-01-01" });
    expect(nextDue(piece)).toBe("2024-01-15");
  });

  it("adds 2 days for struggling", () => {
    const piece = makePiece({ proficiency: "struggling", lastPlayed: "2024-01-01" });
    expect(nextDue(piece)).toBe("2024-01-03");
  });

  it("adds 5 days for learning", () => {
    const piece = makePiece({ proficiency: "learning", lastPlayed: "2024-01-01" });
    expect(nextDue(piece)).toBe("2024-01-06");
  });

  it("adds 0 days for new proficiency", () => {
    const piece = makePiece({ proficiency: "new", lastPlayed: "2024-06-15" });
    expect(nextDue(piece)).toBe("2024-06-15");
  });
});

describe("getFamiliarPiecesDue", () => {
  it("returns pieces due on or before the given date", () => {
    const pieces = [
      makePiece({ proficiency: "comfortable", lastPlayed: "2024-01-01" }), // due 2024-01-08
      makePiece({ proficiency: "comfortable", lastPlayed: "2024-01-10" }), // due 2024-01-17
    ];
    expect(getFamiliarPiecesDue(pieces, "2024-01-09")).toHaveLength(1);
    expect(getFamiliarPiecesDue(pieces, "2024-01-17")).toHaveLength(2);
  });

  it("excludes pieces with new proficiency", () => {
    const pieces = [makePiece({ proficiency: "new", lastPlayed: null })];
    expect(getFamiliarPiecesDue(pieces, "2030-01-01")).toHaveLength(0);
  });

  it("sorts results by due date ascending", () => {
    const pieces = [
      makePiece({ title: "B", proficiency: "comfortable", lastPlayed: "2024-01-05" }), // due 2024-01-12
      makePiece({ title: "A", proficiency: "struggling", lastPlayed: "2024-01-01" }), // due 2024-01-03
    ];
    const result = getFamiliarPiecesDue(pieces, "2024-01-31");
    expect(result[0].title).toBe("A");
    expect(result[1].title).toBe("B");
  });

  it("includes a piece that has never been played (due today)", () => {
    const today = new Date().toISOString().slice(0, 10);
    const pieces = [makePiece({ proficiency: "comfortable", lastPlayed: null })];
    expect(getFamiliarPiecesDue(pieces, today)).toHaveLength(1);
  });

  it("returns empty array when no pieces are due", () => {
    const pieces = [
      makePiece({ proficiency: "comfortable", lastPlayed: "2024-01-01" }), // due 2024-01-08
    ];
    expect(getFamiliarPiecesDue(pieces, "2024-01-07")).toHaveLength(0);
  });
});

describe("getNewPiece", () => {
  it("returns null when there are no learning pieces", () => {
    const pieces = [
      makePiece({ proficiency: "comfortable" }),
      makePiece({ proficiency: "very_proficient" }),
    ];
    expect(getNewPiece(pieces)).toBeNull();
  });

  it("returns null for empty list", () => {
    expect(getNewPiece([])).toBeNull();
  });

  it("returns the most recently created piece among new/learning/struggling", () => {
    const pieces = [
      makePiece({ title: "Old Learning", proficiency: "learning", createdAt: "2024-01-01T00:00:00Z" }),
      makePiece({ title: "Newest New", proficiency: "new", createdAt: "2024-01-10T00:00:00Z" }),
      makePiece({ title: "Mid Struggling", proficiency: "struggling", createdAt: "2024-01-05T00:00:00Z" }),
    ];
    expect(getNewPiece(pieces)?.title).toBe("Newest New");
  });

  it("includes struggling pieces", () => {
    const pieces = [makePiece({ proficiency: "struggling", title: "Struggling" })];
    expect(getNewPiece(pieces)?.title).toBe("Struggling");
  });

  it("excludes comfortable and very_proficient pieces", () => {
    const pieces = [
      makePiece({ proficiency: "comfortable" }),
      makePiece({ proficiency: "very_proficient" }),
      makePiece({ title: "Learning", proficiency: "learning" }),
    ];
    expect(getNewPiece(pieces)?.title).toBe("Learning");
  });
});
