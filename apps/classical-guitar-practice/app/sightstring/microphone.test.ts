import { describe, expect, it } from "vitest";
import { createListeningDetector } from "./microphone";

interface Pluck {
  time: number;
  midi: number;
  amplitude: number;
}

function play(plucks: Pluck[], expected: number[]) {
  const sampleRate = 48_000;
  const detector = createListeningDetector(sampleRate);
  const samples = new Float32Array(detector.bufferSize);
  const detected: { midi: number; time: number }[] = [];
  for (let time = 0; time < 0.45 && detected.length < expected.length; time += 0.0167) {
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
    const midi = detector.detect(samples, [expected[detected.length]]);
    if (midi !== undefined) detected.push({ midi, time });
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
});
