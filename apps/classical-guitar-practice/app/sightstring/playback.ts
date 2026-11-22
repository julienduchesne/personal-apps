import { scoreEvents, scoreMeter, soundingMidi, type Score } from "./score";

const quarterSeconds = 60 / 96;

export function playbackPlan(score: Score, track: number) {
  const meter = scoreMeter(score, track);
  const countIn = meter ? { beats: meter.beats, seconds: quarterSeconds * 4 / meter.beatUnit } : undefined;
  let nextStart = countIn ? countIn.beats * countIn.seconds : 0;
  let end = nextStart;
  const events = scoreEvents(score, track).map(({ notes }) => {
    const start = nextStart;
    const pitches = notes.map((note) => ({
      midi: soundingMidi(note, score.key),
      duration: quarterSeconds * (note.duration ?? (note.hollow ? 2 : 1)),
    }));
    const durations = pitches.map(({ duration }) => duration);
    nextStart += Math.min(...durations);
    end = Math.max(end, start + Math.max(...durations));
    return { pitches, start };
  });
  return { countIn, events, end };
}

function guitarSample(audio: AudioContext, midi: number) {
  const rate = audio.sampleRate;
  const buffer = audio.createBuffer(1, Math.round(rate * 2.5), rate);
  const samples = buffer.getChannelData(0);
  const frequency = 440 * 2 ** ((midi - 69) / 12);
  for (const [index, level] of [0.65, 0.29, 0.18, 0.12, 0.08, 0.04].entries()) {
    const partial = (index + 1) * frequency;
    if (partial >= rate / 2) break;
    const radians = 2 * Math.PI * partial / rate;
    const decay = Math.exp(-(1.8 + index * 1.4) / rate);
    let amplitude = level;
    for (let i = 0; i < samples.length; i++) {
      samples[i] += amplitude * Math.min(1, i / (rate * 0.004)) * Math.sin(i * radians);
      amplitude *= decay;
    }
  }
  return buffer;
}

export async function playScore(
  score: Score, track: number, signal: AbortSignal, onNote: (index: number) => void, onEnd: () => void,
) {
  const audio = new AudioContext();
  let timer = 0;
  function close() {
    window.clearInterval(timer);
    signal.removeEventListener("abort", close);
    if (audio.state !== "closed") void audio.close().catch(() => {});
  }
  signal.addEventListener("abort", close, { once: true });
  try {
    await audio.resume();
    signal.throwIfAborted();
    const { countIn, events, end } = playbackPlan(score, track);
    const samples = new Map<number, AudioBuffer>();
    const start = audio.currentTime + 0.12;
    let scheduled = 0;
    let ticks = 0;
    let playing = -1;

    function update() {
      const elapsed = audio.currentTime - start;
      if (elapsed >= end + 0.1) {
        close();
        onEnd();
        return;
      }
      const lookAhead = elapsed + 0.2;
      if (countIn) {
        while (ticks < countIn.beats && ticks * countIn.seconds <= lookAhead) {
          const when = start + ticks * countIn.seconds;
          const click = audio.createOscillator();
          const gain = audio.createGain();
          click.frequency.value = ticks === 0 ? 1400 : 950;
          gain.gain.setValueAtTime(0.07, when);
          gain.gain.exponentialRampToValueAtTime(0.001, when + 0.045);
          click.connect(gain).connect(audio.destination);
          click.start(when);
          click.stop(when + 0.045);
          ticks++;
        }
      }
      while (scheduled < events.length && events[scheduled].start <= lookAhead) {
        const event = events[scheduled++];
        for (const { midi, duration } of event.pitches) {
          const buffer = samples.get(midi) ?? guitarSample(audio, midi);
          samples.set(midi, buffer);
          const note = audio.createBufferSource();
          const gain = audio.createGain();
          const when = start + event.start;
          const release = when + Math.max(0.07, duration - 0.035);
          note.buffer = buffer;
          gain.gain.setValueAtTime(0.35 / Math.sqrt(event.pitches.length), when);
          gain.gain.setTargetAtTime(0, release, 0.025);
          note.connect(gain).connect(audio.destination);
          note.start(when);
          note.stop(release + 0.08);
        }
      }
      const previous = playing;
      while (playing + 1 < events.length && events[playing + 1].start <= elapsed) playing++;
      if (playing !== previous) onNote(playing);
    }

    timer = window.setInterval(update, 25);
    update();
  } catch (cause) {
    close();
    throw cause;
  }
}
