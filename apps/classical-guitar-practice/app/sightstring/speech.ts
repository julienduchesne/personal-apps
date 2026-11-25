import { noteName, type Note, type SpeechMode } from "./score";

const solfege = ["do", "re", "mi", "fa", "sol", "la", "si"];
const names = {
  solfege: { do: "do", dos: "do", re: "re", raie: "re", mi: "mi", mie: "mi", fa: "fa",
    sol: "sol", sole: "sol", la: "la", si: "si" },
  letters: { a: "a", ay: "a", b: "b", bee: "b", be: "b", c: "c", see: "c", sea: "c",
    d: "d", dee: "d", e: "e", f: "f", ef: "f", eff: "f", g: "g", gee: "g" },
} satisfies Record<SpeechMode, Record<string, string>>;

const alterations: Record<string, string> = {
  sharp: "#", diese: "#", flat: "b", bemol: "b", natural: "", becarre: "",
};

export function spokenPitches(transcript: string, mode: SpeechMode) {
  const words = transcript.toLowerCase()
    .replace(/♯|#/g, " sharp ").replace(/♭/g, " flat ").replace(/♮/g, " natural ")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "").match(/[a-z]+/g) ?? [];
  const vocabulary: Record<string, string> = names[mode];
  const pitches: string[] = [];
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    const base = Object.hasOwn(vocabulary, word) ? vocabulary[word] : undefined;
    if (!base) {
      if (word.length === 2 && word.endsWith("b") && mode === "letters" && /^[a-g]/.test(word)) pitches.push(word);
      continue;
    }
    const next = words[index + 1];
    pitches.push(base + (Object.hasOwn(alterations, next) ? alterations[words[++index]] : ""));
  }
  return pitches;
}

export function spokenPitch(note: Note, key: number, mode: SpeechMode) {
  const [letter, sign] = noteName(note.step, key, note.accidental);
  const base = mode === "solfege" ? solfege["CDEFGAB".indexOf(letter)] : letter.toLowerCase();
  return base + (sign === "♯" ? "#" : sign === "♭" ? "b" : "");
}

interface RecognitionResult {
  isFinal: boolean;
  0?: { transcript: string };
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  start(): void;
  abort(): void;
}

export function listenForSpeech(
  mode: SpeechMode, signal: AbortSignal, onReady: () => void, onPitch: (pitch: string) => void, onError: (message: string) => void,
) {
  const browser = window as Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const SpeechRecognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  if (!SpeechRecognition) throw new Error("This browser does not support speech recognition. Try Safari or Chrome.");

  const recognition = new SpeechRecognition();
  recognition.lang = mode === "solfege" ? "fr-FR" : "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;
  let startedAt = 0;
  let restart = 0;
  const stopped = "Speech recognition stopped. Start listening again to continue.";

  signal.addEventListener("abort", () => {
    window.clearTimeout(restart);
    recognition.onend = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onstart = null;
    recognition.abort();
  }, { once: true });

  recognition.onstart = () => {
    startedAt = Date.now();
    onReady();
  };
  recognition.onresult = ({ resultIndex, results }) => {
    for (let index = resultIndex; index < results.length && !signal.aborted; index++) {
      if (!results[index].isFinal) continue;
      for (const pitch of spokenPitches(results[index][0]?.transcript ?? "", mode)) {
        if (signal.aborted) break;
        onPitch(pitch);
      }
    }
  };
  recognition.onerror = ({ error }) => {
    if (signal.aborted || error === "no-speech") return;
    onError(error === "not-allowed" || error === "service-not-allowed"
      ? "Allow speech recognition and microphone access in your browser to continue." : stopped);
  };
  recognition.onend = () => {
    if (signal.aborted) return;
    if (!startedAt || Date.now() - startedAt < 400) {
      onError(stopped);
      return;
    }
    restart = window.setTimeout(() => {
      startedAt = 0;
      try { recognition.start(); }
      catch { onError(stopped); }
    }, 180);
  };
  recognition.start();
}
