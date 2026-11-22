export function createPitchDetector(sampleRate: number, size: number) {
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
      const pitch = 69 + 12 * Math.log2(sampleRate / ((lag + fraction) * 440));
      const midi = Math.round(pitch);
      return Math.abs(midi - pitch) <= 0.4 ? midi : null;
    }
    return null;
  };
}

export async function listen(onPitch: (midi: number) => void, signal: AbortSignal, onEnded: () => void) {
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
    const analyser = audio.createAnalyser();
    analyser.fftSize = 4096;
    const mute = audio.createGain();
    mute.gain.value = 0;
    source.connect(analyser).connect(mute).connect(audio.destination);

    const samples = new Float32Array(analyser.fftSize);
    const estimate = createPitchDetector(audio.sampleRate, samples.length);
    let checkedAt = -Infinity;
    let attackAt = -Infinity;
    let peak = 0;
    let attack = 0;
    let lastAttack = -1;
    let previous: number | null = null;
    let last: number | null = null;
    let stable = 0;
    let quiet = 0;

    const process = (now: number) => {
      if (signal.aborted) return;
      frame = requestAnimationFrame(process);
      if (now - checkedAt < 28) return;
      checkedAt = now;
      analyser.getFloatTimeDomainData(samples);
      const recent = samples.subarray(samples.length - 1024);
      const rms = Math.sqrt(recent.reduce((sum, value) => sum + value * value, 0) / recent.length);
      if (rms > 0.003 && rms > peak * 1.65 && now - attackAt > 70) {
        attack++;
        attackAt = now;
      }
      peak = Math.max(rms, peak * 0.82);
      if (rms < 0.0018) {
        quiet++;
        if (quiet >= 2) {
          previous = last = null;
          stable = 0;
        }
        return;
      }
      quiet = 0;
      const midi = estimate(samples);
      stable = midi === previous ? stable + 1 : 1;
      previous = midi;
      if (midi !== null && stable >= 2 && (midi !== last || attack !== lastAttack)) {
        last = midi;
        lastAttack = attack;
        onPitch(midi);
      }
    };
    frame = requestAnimationFrame(process);
  } catch (error) {
    stop();
    throw error;
  }
}
