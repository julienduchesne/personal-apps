function createPitchDetector(sampleRate: number, size: number) {
  const firstLag = Math.max(2, Math.floor(sampleRate / 1400));
  const lastLag = Math.min(Math.floor(size / 2), Math.floor(sampleRate / 72));
  const length = size - lastLag;
  const differences = new Float32Array(lastLag + 1).fill(1);
  return (samples: Float32Array) => {
    let total = 0;
    for (let lag = 1; lag <= lastLag; lag++) {
      let difference = 0;
      for (let n = 0; n < length; n++) {
        const delta = samples[n] - samples[n + lag];
        difference += delta * delta;
      }
      total += difference;
      differences[lag] = total > 0 ? difference * lag / total : 1;
    }

    for (let lag = firstLag; lag < lastLag; lag++) {
      if (differences[lag] >= 0.15) continue;
      while (lag < lastLag && differences[lag + 1] < differences[lag]) lag++;
      if (lag === lastLag) return null;
      const left = differences[lag - 1];
      const center = differences[lag];
      const right = differences[lag + 1];
      const curvature = left - 2 * center + right;
      const fraction = curvature > 0 ? 0.5 * (left - right) / curvature : 0;
      const period = lag + fraction;
      const pitch = 69 + 12 * Math.log2(sampleRate / (period * 440));
      const midi = Math.round(pitch);
      return Math.abs(midi - pitch) <= 0.4 ? { midi, period } : null;
    }
    return null;
  };
}

interface Pitch {
  midi: number;
  period: number;
}

function rms(samples: Float32Array) {
  let energy = 0;
  for (const value of samples) energy += value * value;
  return Math.sqrt(energy / samples.length);
}

export function createListeningDetector(sampleRate: number) {
  const step = Math.max(1, Math.floor(sampleRate / 22_050));
  const bufferSize = 4096 * 2 ** Math.ceil(Math.log2(step));
  const rate = sampleRate / step;
  const size = Math.round(rate * 0.05);
  const estimate = createPitchDetector(rate, size);
  const samples = new Float32Array(bufferSize / step | 0);
  const work = [new Float32Array(samples.length), new Float32Array(samples.length)];
  const window = samples.subarray(samples.length - size);
  const envelope = Float32Array.from({ length: size }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / size));
  const ringing = new Map<number, Pitch & { level: number; replucked: boolean }>();
  let previous: number | undefined;
  let stable = 0;

  function levelOf(period: number) {
    const angle = 2 * Math.PI / period;
    const sine = Math.sin(angle);
    const cosine = Math.cos(angle);
    let a = 0;
    let b = 0;
    let phaseCos = 1;
    let phaseSin = 0;
    for (let i = 0; i < size; i++) {
      const value = window[i] * envelope[i];
      a += value * phaseCos;
      b += value * phaseSin;
      const nextCos = phaseCos * cosine - phaseSin * sine;
      phaseSin = phaseSin * cosine + phaseCos * sine;
      phaseCos = nextCos;
    }
    return 4 * Math.hypot(a, b) / size;
  }

  function isolate(blockers: Pitch[]) {
    let source = samples;
    let first = 0;
    for (const [index, { period }] of blockers.entries()) {
      const delay = Math.floor(period);
      const fraction = period - delay;
      const output = work[index];
      first += delay + 1;
      for (let i = first; i < source.length; i++) {
        const older = source[i - delay] * (1 - fraction) + source[i - delay - 1] * fraction;
        output[i] = source[i] - older;
      }
      source = output;
    }
    return source.subarray(source.length - size);
  }

  function detect(input: Float32Array, expected: readonly number[]) {
    if (!expected.length) return;
    for (let i = 0; i < samples.length; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += input[i * step + j];
      samples[i] = sum / step;
    }
    const volume = rms(window);
    for (const [midi, voice] of ringing) {
      const level = levelOf(voice.period);
      if (level < 0.002) {
        ringing.delete(midi);
        continue;
      }
      if (level > Math.max(voice.level * 1.32, voice.level + 0.004)) voice.replucked = true;
      voice.level = Math.max(level, voice.level * 0.84);
    }

    const expectedPluck = (pitch: Pitch | null): pitch is Pitch =>
      !!pitch && expected.includes(pitch.midi) && (ringing.get(pitch.midi)?.replucked ?? true);
    const raw = volume >= 0.0018 ? estimate(window) : null;
    let pitch = expectedPluck(raw) ? raw : null;
    if (!pitch && volume >= 0.0018) {
      // Subtract a period of each ringing string so a quieter new pluck can stand out.
      const blockers: Pitch[] = [...ringing.values()]
        .filter(({ midi }) => !expected.includes(midi))
        .sort((a, b) => b.level - a.level)
        .slice(0, 2);
      if (raw && !expected.includes(raw.midi) && !blockers.some(({ midi }) => midi === raw.midi) && blockers.length < 2) {
        blockers.push(raw);
      }
      const estimateResidual = (voices: Pitch[]) => {
        const residual = isolate(voices);
        return rms(residual) >= Math.max(0.0025, volume * 0.10) ? estimate(residual) : null;
      };
      for (let count = 1; !pitch && count <= blockers.length; count++) {
        const isolated = estimateResidual(blockers.slice(0, count));
        if (expectedPluck(isolated)) pitch = isolated;
      }
      if (!pitch && expected.length === 2) {
        // Two strings starting together may hide each other's periodicity.
        for (const [index, midi] of expected.entries()) {
          const other = expected[1 - index];
          if (other === midi) break;
          const period = rate / (440 * 2 ** ((other - 69) / 12));
          const voice = { midi: other, period };
          const resting = blockers.find(({ midi }) => ringing.has(midi));
          const isolated = estimateResidual(resting ? [voice, resting] : [voice]);
          if (isolated?.midi === midi && expectedPluck(isolated)) {
            pitch = isolated;
            break;
          }
        }
      }
    }
    stable = pitch?.midi === previous ? stable + 1 : 1;
    previous = pitch?.midi;
    if (pitch && stable >= 2) {
      ringing.set(pitch.midi, { ...pitch, level: levelOf(pitch.period), replucked: false });
      previous = undefined;
      stable = 0;
      return pitch.midi;
    }
  }

  return { bufferSize, detect };
}

export async function listen(
  onPitch: (midi: number) => void, expectedPitches: () => readonly number[], signal: AbortSignal, onEnded: () => void,
) {
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
    throw new Error("Microphone access requires a supported browser and HTTPS.");
  }
  const audio = new AudioContext();
  let stream: MediaStream | undefined;
  let frame = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    stream?.getTracks().forEach((track) => track.stop());
    if (audio.state !== "closed") void audio.close().catch(() => {});
  };
  signal.addEventListener("abort", stop, { once: true });

  try {
    // Safari requires the audio context to resume on the button’s user gesture.
    await audio.resume();
    signal.throwIfAborted();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { autoGainControl: false, noiseSuppression: false, echoCancellation: false },
    });
    signal.throwIfAborted();
    stream.getAudioTracks().forEach((track) => track.addEventListener("ended", onEnded, { once: true }));
    const source = audio.createMediaStreamSource(stream);
    const detector = createListeningDetector(audio.sampleRate);
    const analyser = audio.createAnalyser();
    analyser.fftSize = detector.bufferSize;
    const mute = audio.createGain();
    mute.gain.value = 0;
    source.connect(analyser).connect(mute).connect(audio.destination);

    const samples = new Float32Array(analyser.fftSize);
    let checkedAt = -Infinity;
    const process = (now: number) => {
      if (signal.aborted) return;
      frame = requestAnimationFrame(process);
      if (now - checkedAt < 15) return;
      checkedAt = now;
      analyser.getFloatTimeDomainData(samples);
      const midi = detector.detect(samples, expectedPitches());
      if (midi !== undefined) onPitch(midi);
    };
    frame = requestAnimationFrame(process);
  } catch (error) {
    stop();
    throw error;
  }
}
