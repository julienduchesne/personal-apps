import { describe, expect, it } from "vitest";
import { createListeningDetector } from "./microphone";

interface Pluck {
  time: number;
  midi: number;
  amplitude: number;
}

function play(plucks: Pluck[], expected: number[], simultaneous = false) {
  const sampleRate = 48_000;
  const detector = createListeningDetector(sampleRate);
  const samples = new Float32Array(detector.bufferSize);
  const remaining = [...expected];
  const detected: { midi: number; time: number }[] = [];
  for (let time = 0; time < 0.45 && remaining.length; time += 0.0167) {
    for (let i = 0; i < samples.length; i++) {
      const t = time - (samples.length - i) / sampleRate;
      samples[i] = plucks.reduce((mix, pluck) => {
        const age = t - pluck.time;
        if (age < 0) return mix;
        const phase = 2 * Math.PI * 440 * 2 ** ((pluck.midi - 69) / 12) * age;
        return mix + pluck.amplitude * Math.min(1, age / 0.002) * Math.exp(-2 * age)
          * (Math.sin(phase) + 0.35 * Math.sin(2 * phase + 0.35) + 0.15 * Math.sin(3 * phase - 0.2));
      }, 0);
    }
    const midi = detector.detect(samples, simultaneous ? remaining : remaining.slice(0, 1));
    if (midi !== undefined) {
      detected.push({ midi, time });
      remaining.splice(remaining.indexOf(midi), 1);
    }
  }
  return detected;
}

describe("listening detector", () => {
  const lowE = { time: 0, midi: 40, amplitude: 0.25 };
  const a = { time: 0.067, midi: 45, amplitude: 0.10 };

  it("hears the newer string over louder notes that are still ringing", () => {
    const detected = play([lowE, a, { time: 0.157, midi: 50, amplitude: 0.08 }], [40, 45, 50]);
    expect(detected.map(({ midi }) => midi)).toEqual([40, 45, 50]);
    expect(detected[2].time).toBeLessThan(0.25);
  });

  it("waits for a fresh pluck instead of counting a ringing pitch twice", () => {
    expect(play([lowE], [40, 40]).map(({ midi }) => midi)).toEqual([40]);
    expect(play([lowE, a], [40, 45, 40]).map(({ midi }) => midi)).toEqual([40, 45]);
  });

  it("waits for the expected pitch when a different string is plucked", () => {
    expect(play([lowE, { ...a, midi: 46 }], [40, 45]).map(({ midi }) => midi)).toEqual([40]);
  });

  it("hears both notes of a simultaneous perfect fifth without counting a single note as a pair", () => {
    const pair = [{ time: 0, midi: 52, amplitude: 0.12 }, { time: 0, midi: 59, amplitude: 0.12 }];
    expect(play(pair, [52, 59], true).map(({ midi }) => midi).sort()).toEqual([52, 59]);
    expect(play(pair.slice(0, 1), [52, 59], true).map(({ midi }) => midi)).toEqual([52]);
  });
});
