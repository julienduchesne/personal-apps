"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { DeletedScoreError, deleteLocalScore, deleteScore, downloadUrl, listBestAttempts, listScores, loadScanPhoto, recoverLocalScores, saveAttempt, saveScore } from "./library";
import { guitarStrings, suggestFingerings } from "./fingering";
import { listen } from "./microphone";
import { playScore } from "./playback";
import { scanPage } from "./recognition";
import { RandomPractice } from "./RandomPractice";
import { generateRandomExercise, type RandomSettings } from "./randomExercise";
import { beatUnits, displayAccidental, exercise, keys, leaderboardSize, noteName, practiceNoteName, scoreEvents, scoreMeter, soundingMidi, steps, type Finger, type Meter, type Note, type PracticeAttempt, type Score, type Staff, type TimeSignature } from "./score";
import styles from "./Sightstring.module.css";

function StaffPaper({ staff, active, correct, reviewing, selected, onPick, showPhoto = true, keySignature = 0, fingers, timeSignature = staff.timeSignature }: {
  staff: Staff;
  active?: Set<string>;
  correct?: Set<string>;
  reviewing?: boolean;
  selected?: string;
  onPick?: (x: number, y: number) => void;
  showPhoto?: boolean;
  keySignature?: number;
  fingers?: ReadonlyMap<string, Finger>;
  timeSignature?: TimeSignature | null;
}) {
  const x = (position: number) => `${100 * position / staff.width}%`;
  const y = (position: number) => `${100 * position / staff.height}%`;
  const { spacing, imageCrop } = staff;
  const photo = showPhoto ? staff.image : undefined;
  const imageStyle = photo && imageCrop ? {
    backgroundSize: `${x(imageCrop.width)} ${y(imageCrop.height)}`,
    backgroundPosition: `${100 * imageCrop.x / (imageCrop.width - staff.width || 1)}% ${100 * imageCrop.y / (imageCrop.height - staff.height || 1)}%`,
  } : {};
  const alterations = new Map<number, number>();
  function pick(event: MouseEvent<HTMLDivElement>) {
    const region = event.currentTarget.getBoundingClientRect();
    onPick?.((event.clientX - region.left) * staff.width / region.width,
      (event.clientY - region.top) * staff.height / region.height);
  }
  return (
    <div className={styles.paper} data-score-view={photo ? "photo" : "notation"} style={{
      aspectRatio: `${staff.width} / ${staff.height}`,
      ...imageStyle,
      backgroundImage: photo ? `url("${photo}")` : undefined,
    }} onClick={onPick ? pick : undefined} aria-hidden="true">
      {!photo && <>
        {[0, 1, 2, 3, 4].map((line) => (
          <i key={line} data-staff-line={line} className={styles.line}
            style={{ left: x(staff.left), width: x(staff.right - staff.left), top: y(staff.top + line * spacing) }} />
        ))}
        {[staff.left, ...(!staff.image && staff.notes.some((note) => note.x > 330) ? [330] : []),
          ...(!staff.image ? [staff.right - 5] : []), staff.right].map((bar) => (
          <i key={bar} className={styles.bar} style={{ left: x(bar), top: y(staff.top), height: y(spacing * 4) }} />
        ))}
        {/* Bravura’s G-clef baseline sits 4.5 staff spaces down in this image. */}
        <i data-clef="treble" className={styles.clef} style={{
          left: x(staff.left + spacing * 0.8), top: y(staff.top + 3 * spacing - 4.5 * spacing),
          width: x(3 * spacing), height: y(7.5 * spacing),
        }} />
        {timeSignature && [timeSignature.beats, timeSignature.beatUnit].map((number, index) => (
          <i key={index} className={styles.meterDigit} data-meter-digit={number} style={{
            left: x(timeSignature.x), top: y(staff.top + (index * 2 + 1) * spacing),
            fontSize: `${245 * spacing / staff.width}cqw`,
          }}>{number}</i>
        ))}
      </>}
      {staff.notes.map((note) => {
        const id = note.id;
        const hit = correct?.has(id);
        const current = active?.has(id);
        const chosen = selected === id;
        const up = note.voice ? note.voice === "melody" : note.step < 6;
        const overlaps = note.voice && staff.notes.some((other) =>
          other.x === note.x && other.voice !== note.voice && Math.abs(other.step - note.step) < 2);
        const noteX = overlaps ? note.x + (up ? 0.5 : -0.5) * spacing : note.x;
        const noteY = !photo && staff.image ? staff.top + (10 - note.step) * spacing / 2 : note.y;
        const sign = displayAccidental(note, keySignature);
        const accidental = !photo && staff.image && sign === null && alterations.get(note.step) ? 0 : sign;
        alterations.set(note.step, sign ?? 0);
        const finger = fingers?.get(id);
        const ledgers: number[] = [];
        for (let step = 0; step >= note.step; step -= 2) ledgers.push(step);
        for (let step = 12; step <= note.step; step += 2) ledgers.push(step);
        return (
          <span key={id} data-note={id} data-duration={note.duration} data-status={hit ? "correct" : current ? "current" : undefined}
            data-selected={chosen || undefined} data-review={reviewing || undefined} className={styles.mark}>
            {(current || chosen) && (
              <i className={styles.cursor} style={{
                left: x(noteX - spacing * 0.95), width: x(spacing * 1.9), top: y(noteY - spacing), height: y(spacing * 2),
              }} />
            )}
            {!photo && <>
              {accidental !== null && <i className={styles.accidental} style={{
                left: x(noteX - spacing * 0.8), top: y(noteY), fontSize: `${160 * spacing / staff.width}cqw`,
              }}>
                {["♭", "♮", "♯"][accidental + 1]}
              </i>}
              {ledgers.map((step) => <i key={step} className={styles.line} style={{
                left: x(noteX - spacing * 0.95), width: x(spacing * 1.9), top: y(staff.top + (10 - step) * spacing / 2),
              }} />)}
              <i className={styles.stem} style={{
                left: x(noteX + (up ? 0.58 : -0.65) * spacing), top: y(noteY + (up ? -3 : 0) * spacing), height: y(spacing * 3),
              }} />
            </>}
            {(!photo || hit || current || reviewing) && (
              <i className={`${styles.head} ${note.hollow ? styles.hollow : ""}`} style={{
                left: x(noteX - spacing * 0.68), width: x(spacing * 1.36),
                top: y(noteY - spacing * 0.46), height: y(spacing * 0.92),
              }} />
            )}
            {finger !== undefined && <i className={styles.finger} data-finger={finger} style={{
              left: x(noteX + spacing * 0.85),
              top: y(noteY + spacing * (note.voice === "bass" ? 0.9 : -0.85)),
              fontSize: `max(0.625rem, ${85 * spacing / staff.width}cqw)`,
            }}>{finger}</i>}
          </span>
        );
      })}
    </div>
  );
}

function Practice({ score, onBack, onGenerate, onSave }: {
  score: Score;
  onBack: () => void;
  onGenerate?: () => void;
  onSave?: (title: string) => Promise<void>;
}) {
  const [track, setTrack] = useState(1);
  const [showFingering, setShowFingering] = useState(false);
  const [scoreView, setScoreView] = useState<"photo" | "notation">("photo");
  const [title, setTitle] = useState(score.title);
  const [naming, setNaming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const tracks = [...new Set(score.staves.filter((staff) => staff.notes.length > 0).map((staff) => staff.track ?? 1))].sort((a, b) => a - b);
  const selected = tracks.includes(track) ? track : tracks[0] ?? 1;
  const hasPhoto = score.staves.some((staff) => (staff.track ?? 1) === selected && staff.image);

  async function save() {
    if (!onSave || !title.trim() || saving) return;
    setSaving(true);
    setSaveMessage("");
    try {
      await onSave(title.trim());
      setNaming(false);
      setSaveMessage("Exercise saved to your scores.");
    } catch {
      setSaveMessage("Couldn’t save the exercise. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <div className={styles.actions}>
      <button className={styles.textButton} onClick={onBack}>{onSave ? "Practice settings" : "Back to scores"}</button>
      {onGenerate && <button className={styles.secondary} onClick={onGenerate}>New exercise</button>}
      {onSave && !naming && <button className={styles.secondary} onClick={() => setNaming(true)}>Save exercise</button>}
    </div>
    {onSave && naming && <form className={styles.saveExercise} onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <label>Score title<input autoFocus required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <div className={styles.actions}>
        <button className={styles.primary} disabled={saving || !title.trim()}>{saving ? "Saving…" : "Save to library"}</button>
        <button className={styles.secondary} type="button" disabled={saving} onClick={() => {
          setNaming(false);
          setTitle(score.title);
          setSaveMessage("");
        }}>Cancel</button>
      </div>
    </form>}
    {saveMessage && <p role={onSave ? "alert" : "status"}>{saveMessage}</p>}
    <div className={styles.practiceOptions}>
      {tracks.length > 1 && <label className={styles.trackPicker}>Practice track
        <select value={selected} onChange={(event) => setTrack(Number(event.target.value))}>
          {tracks.map((number) => <option key={number} value={number}>Track {number}</option>)}
        </select>
      </label>}
      {hasPhoto && <label className={styles.trackPicker}>Score view
        <select value={scoreView} onChange={(event) => setScoreView(event.target.value === "photo" ? "photo" : "notation")}>
          <option value="photo">Photo</option>
          <option value="notation">Sheet music</option>
        </select>
      </label>}
      <label className={styles.checkbox}>
        <input type="checkbox" checked={showFingering} onChange={(event) => setShowFingering(event.target.checked)} />
        Show fingering
      </label>
    </div>
    {hasPhoto && scoreView === "notation" && <p className={styles.location}>Shows detected pitches. Use the photo for rhythm and markings.</p>}
    {showFingering && <p className={styles.location}>Fretting fingers are suggested where none were set. 0 means open string.</p>}
    <PracticeTrack key={selected} score={score} track={selected} showPhoto={scoreView === "photo"} showFingering={showFingering} />
  </>;
}

function formatDuration(durationMs: number, precision = 3) {
  if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(precision)} s`;
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = ((durationMs % 60_000) / 1000).toFixed(precision).padStart(precision + 3, "0");
  return `${minutes}:${seconds}`;
}

function RunningTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = () => setElapsed(Math.max(0, Math.floor((performance.now() - startedAt) / 100) * 100));
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  return <span role="timer" aria-label="Elapsed time" className={styles.timer}>{formatDuration(elapsed, 1)}</span>;
}

function bestTimes(attempts: PracticeAttempt[]) {
  return [...new Map(attempts.map((attempt) => [attempt.id, attempt])).values()]
    .sort((a, b) => a.durationMs - b.durationMs || a.id.localeCompare(b.id))
    .slice(0, leaderboardSize);
}

function PracticeTrack({ score, track, showPhoto, showFingering }: {
  score: Score; track: number; showPhoto: boolean; showFingering: boolean;
}) {
  const events = useMemo(() => scoreEvents(score, track), [score, track]);
  const fingers = useMemo(() => showFingering ? suggestFingerings(score, track) : undefined, [score, showFingering, track]);
  const [progress, setProgress] = useState({ index: 0, correct: new Set<string>() });
  const latest = useRef(progress);
  const [state, setState] = useState<"idle" | "starting" | "listening">("idle");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [latestAttempt, setLatestAttempt] = useState<PracticeAttempt>();
  const [failedAttempts, setFailedAttempts] = useState<PracticeAttempt[]>([]);
  const [leaderboardState, setLeaderboardState] = useState<"loading" | "ready" | "failed">("loading");
  const [reload, setReload] = useState(0);
  const startedAt = useRef<number | null>(null);
  const microphone = useRef<AbortController | null>(null);
  const playback = useRef<AbortController | null>(null);
  const [playbackIndex, setPlaybackIndex] = useState<number | null>(null);
  const systems = useRef<HTMLDivElement>(null);
  const event = events[progress.index];
  const shownEvent = playbackIndex === null ? event : events[playbackIndex];
  const staffIndex = shownEvent?.staffIndex;
  const visibleStaff = staffIndex ?? (playbackIndex === -1 ? events[0]?.staffIndex : events.at(-1)?.staffIndex);
  const previousStaff = useRef(visibleStaff);
  const nextStaff = score.staves.findIndex((staff, index) => visibleStaff !== undefined && index > visibleStaff && (staff.track ?? 1) === track);
  const visibleStaves = visibleStaff === undefined ? [] : nextStaff < 0 ? [visibleStaff] : [visibleStaff, nextStaff];
  const total = events.reduce((count, item) => count + item.notes.length, 0);
  const meter = scoreMeter(score, track);

  function stop() {
    microphone.current?.abort();
    microphone.current = null;
    setState("idle");
  }

  function stopPlayback() {
    playback.current?.abort();
    playback.current = null;
    setPlaybackIndex(null);
  }

  async function startPlayback() {
    stop();
    const controller = new AbortController();
    playback.current = controller;
    setPlaybackIndex(-1);
    setError("");
    try {
      await playScore(score, track, controller.signal, setPlaybackIndex, stopPlayback);
    } catch {
      if (controller.signal.aborted) return;
      stopPlayback();
      setError("Couldn’t play the score.");
    }
  }

  useEffect(() => {
    const pause = () => { if (document.hidden) { stop(); stopPlayback(); } };
    document.addEventListener("visibilitychange", pause);
    return () => {
      microphone.current?.abort();
      playback.current?.abort();
      document.removeEventListener("visibilitychange", pause);
    };
  }, []);

  useEffect(() => {
    if (visibleStaff !== previousStaff.current) systems.current?.scrollIntoView({ block: "nearest" });
    previousStaff.current = visibleStaff;
  }, [visibleStaff]);

  useEffect(() => {
    if (!event) stop();
  }, [event]);

  useEffect(() => {
    const controller = new AbortController();
    listBestAttempts(score.id, track, controller.signal).then((stored) => {
      if (controller.signal.aborted) return;
      setAttempts((current) => bestTimes([...stored, ...current]));
      setLeaderboardState("ready");
    }).catch(() => {
      if (!controller.signal.aborted) setLeaderboardState("failed");
    });
    return () => controller.abort();
  }, [score.id, track, reload]);

  async function record(attempt: PracticeAttempt) {
    setFailedAttempts((current) => current.filter(({ id }) => id !== attempt.id));
    try {
      await saveAttempt(score.id, track, attempt);
      setAttempts((current) => bestTimes([...current, attempt]));
    } catch {
      setFailedAttempts((current) => [...current, attempt]);
    }
  }

  async function start() {
    const controller = new AbortController();
    microphone.current = controller;
    setError("");
    setState("starting");
    try {
      await listen((midi) => {
        const previous = latest.current;
        const current = events[previous.index];
        const matches = current?.notes.filter((note) => soundingMidi(note, score.key) === midi && !previous.correct.has(note.id));
        if (!matches?.length) return;
        const correct = new Set([...previous.correct, ...matches.map((note) => note.id)]);
        const next = { index: previous.index + Number(current.notes.every((note) => correct.has(note.id))), correct };
        latest.current = next;
        setProgress(next);
        const now = performance.now();
        startedAt.current ??= now;
        if (next.index === events.length) {
          const attempt = { id: crypto.randomUUID(), durationMs: Math.round(now - startedAt.current), completedAt: new Date().toISOString() };
          setLatestAttempt(attempt);
          void record(attempt);
        }
      }, () => {
        const { index, correct } = latest.current;
        return events[index]?.notes.filter((note) => !correct.has(note.id)).map((note) => soundingMidi(note, score.key)) ?? [];
      }, controller.signal, () => {
        stop();
        setError("The microphone disconnected. Start listening again to continue.");
      });
      if (!controller.signal.aborted) setState("listening");
    } catch (cause) {
      if (controller.signal.aborted) return;
      stop();
      setError(cause instanceof DOMException && cause.name === "NotAllowedError"
        ? "Allow microphone access in your browser and try again."
        : cause instanceof Error ? cause.message : "The microphone could not start.");
    }
  }

  const remaining = event?.notes.filter((note) => !progress.correct.has(note.id)) ?? [];
  const highlighted = playbackIndex === null ? remaining : shownEvent?.notes ?? [];
  const paired = event?.notes.some((note) => note.voice === "bass");
  const prompt = remaining.length <= 1 ? "Play" : paired ? "Play together" : "Pick each note separately";
  return <>
    <header className={styles.heading}>
      <h1>{score.title}</h1>
      <p>{progress.correct.size} of {total} notes played</p>
      {meter && <p>Time signature {meter.beats}/{meter.beatUnit}</p>}
      <progress aria-label="Practice progress" max={total} value={progress.correct.size} />
      <a className={styles.textButton} href="#sightstring-best-times">Best times</a>
    </header>
    <div className={styles.systems} ref={systems}>
      {visibleStaves.map((index) => {
        const staff = score.staves[index];
        const next = index === nextStaff;
        return <section key={index} data-practice-line={next ? "next" : "current"}
          aria-label={staff.page && staff.line ? `Page ${staff.page}, line ${staff.line}, track ${track}` : `Staff ${index + 1}`}>
          <p className={styles.location}>{next ? "Next line" : "Current line"}
            {staff.page && staff.line ? ` · Page ${staff.page} · Line ${staff.line}` : ""}
          </p>
          <StaffPaper staff={staff} active={staffIndex === index ? new Set(highlighted.map((note) => note.id)) : undefined}
            correct={playbackIndex === null ? progress.correct : undefined} showPhoto={showPhoto} keySignature={score.key} fingers={fingers}
            timeSignature={score.timeSignature === undefined ? staff.timeSignature
              : score.timeSignature && (index === events[0]?.staffIndex || staff.timeSignature)
                ? { ...score.timeSignature, x: staff.timeSignature?.x ?? staff.left + staff.spacing * 4.4 } : null} />
        </section>;
      })}
    </div>
    <section className={styles.leaderboard} id="sightstring-best-times" aria-labelledby="sightstring-best-times-heading">
      <h2 id="sightstring-best-times-heading">Best times</h2>
      {attempts.length > 0 && <ol>
        {attempts.map(({ id, durationMs, completedAt }) => <li key={id}>
          <strong>{formatDuration(durationMs)}</strong>{" · "}
          <time dateTime={completedAt}>{new Date(completedAt).toLocaleDateString()}</time>
        </li>)}
      </ol>}
      {leaderboardState === "loading" && <p>Loading best times…</p>}
      {leaderboardState === "ready" && !attempts.length && <p>No completed attempts yet.</p>}
      {leaderboardState === "failed" && <div className={styles.actions}>
        <p role="alert">Couldn’t load best times.</p>
        <button className={styles.textButton} onClick={() => {
          setLeaderboardState("loading");
          setReload((current) => current + 1);
        }}>Reload best times</button>
      </div>}
      {failedAttempts.length > 0 && <div className={styles.actions}>
        <p role="alert">Some attempts couldn’t be saved.</p>
        <button className={styles.textButton} onClick={() => failedAttempts.forEach((attempt) => void record(attempt))}>Retry saving attempts</button>
      </div>}
    </section>
    <div className={styles.transport}>
      <div aria-live="polite">
        <strong>{playbackIndex === -1 && meter ? "Counting in" : playbackIndex !== null ? "Playing score"
          : !event ? "Score complete" : state === "listening" ? "Listening" : state === "starting" ? "Starting microphone…" : "Play at your own pace"}</strong>
        <p>{playbackIndex !== null ? null : !event ? latestAttempt && `Time: ${formatDuration(latestAttempt.durationMs)}` : state === "listening"
          ? `${prompt} · ${remaining.map((note) => practiceNoteName(note, score.key)).join(", ")}`
          : paired ? "Use standard tuning and pluck both notes together." : "Use standard tuning and pluck one note at a time."}</p>
        {error && <p role="alert">{error}</p>}
      </div>
      {event && startedAt.current !== null && <RunningTimer startedAt={startedAt.current} />}
      <button className={styles.transportButton} onClick={playbackIndex === null ? startPlayback : stopPlayback}>
        {playbackIndex === null ? "Play score" : "Stop playback"}
      </button>
      {playbackIndex === null && (!event ? <button className={styles.transportButton} onClick={() => {
        const reset = { index: 0, correct: new Set<string>() };
        startedAt.current = null;
        setLatestAttempt(undefined);
        latest.current = reset;
        setProgress(reset);
      }}>Play again</button>
        : state === "listening" ? <button className={styles.transportButton} onClick={stop}>Pause</button>
          : <button disabled={state === "starting"} className={styles.transportButton} onClick={start}>Start listening</button>)}
    </div>
  </>;
}

async function scanPhotos(files: File[], offset = 0, savedPhotos?: string[]) {
  if (files.length + offset > 24) throw new Error("A score can have up to 24 photos.");
  const pages: string[] = [];
  const staves: Staff[] = [];
  for (const [index, file] of files.entries()) {
    const page = offset + index + 1;
    try {
      const result = await scanPage(file, savedPhotos?.[index]);
      pages.push(result.photo);
      staves.push(...result.staves.map((staff) => ({ ...staff, page })));
    } catch (cause) {
      throw new Error(`Page ${page}: ${cause instanceof Error ? cause.message : "Couldn’t read this photo."}`);
    }
  }
  return { pages, staves };
}

function Review({ initial, editing, onBack, onSave, onDelete }: {
  initial: Score; editing: boolean; onBack: () => void;
  onSave: (score: Score) => Promise<void>; onDelete?: () => Promise<void>;
}) {
  const [score, setScore] = useState(initial);
  const [meterDraft, setMeterDraft] = useState<{ beats: number | ""; beatUnit: Meter["beatUnit"] }>();
  const [index, setIndex] = useState(0);
  const [selection, setSelection] = useState<Note | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [readingPhotos, setReadingPhotos] = useState(false);
  const extraCamera = useRef<HTMLInputElement>(null);
  const extraPhotos = useRef<HTMLInputElement>(null);
  const replacing = useRef(false);
  const busy = readingPhotos || saving || deleting;
  const staff = score.staves[index];
  const existing = staff.notes.some((note) => note.id === selection?.id);
  const meter = meterDraft ?? scoreMeter(score);
  const beats = meter?.beats ?? "";
  const beatUnit = meter?.beatUnit ?? 4;
  const validMeter = beats === "" || (Number.isInteger(beats) && beats >= 1 && beats <= 32);

  function pick(x: number, y: number) {
    if (adding) {
      if (x < staff.left || x > staff.right) return;
      const step = Math.round(10 - 2 * (y - staff.top) / staff.spacing);
      if (!steps.includes(step)) return;
      setSelection({ id: crypto.randomUUID(), x, y, step, accidental: null, hollow: false });
      setAdding(false);
      return;
    }
    const candidates = staff.notes.map((note) => ({ note, distance: Math.hypot(note.x - x, note.y - y) }))
      .filter(({ distance }) => distance <= staff.spacing * 1.6)
      .sort((a, b) => a.distance - b.distance);
    setSelection(candidates[0]?.note ?? null);
  }

  function update(note: Note | null) {
    if (!selection) return;
    const notes = staff.notes.filter((entry) => entry.id !== selection.id);
    if (note) notes.push(note);
    notes.sort((a, b) => a.x - b.x);
    setScore({ ...score, staves: score.staves.map((entry, i) => i === index ? { ...entry, notes } : entry) });
    setSelection(null);
  }

  function move(next: number) {
    setSelection(null);
    setAdding(false);
    setIndex(next);
  }

  async function readPhotos(loadFiles: () => Promise<File[]>, replace: boolean, savedPhotos?: string[]) {
    const pages = score.pages ?? [];
    const offset = replace ? 0 : pages.length;
    setError("");
    setReadingPhotos(true);
    try {
      const scans = await scanPhotos(await loadFiles(), offset, savedPhotos);
      setScore((current) => ({
        ...current,
        pages: replace ? scans.pages : [...pages, ...scans.pages],
        staves: replace ? scans.staves : [...current.staves, ...scans.staves],
      }));
      move(replace ? 0 : score.staves.length);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t read the photos.");
    } finally {
      setReadingPhotos(false);
    }
  }

  function choosePhotos(input: HTMLInputElement | null, replace: boolean) {
    replacing.current = replace;
    input?.click();
  }

  function photosChosen(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (files.length) void readPhotos(async () => files, replacing.current);
    replacing.current = false;
  }

  async function save() {
    setError("");
    setSaving(true);
    const timeSignature = meterDraft === undefined ? score.timeSignature : beats === "" ? null : { beats, beatUnit };
    try { await onSave({ ...score, title: score.title.trim(), timeSignature }); }
    catch { setError("Couldn’t save the score to your library. Try again."); }
    finally { setSaving(false); }
  }

  async function removeScore() {
    const related = initial.generated ? "practice times" : "photos and practice times";
    if (!onDelete || !window.confirm(`Delete “${initial.title}” and its ${related}?`)) return;
    setError("");
    setDeleting(true);
    try { await onDelete(); }
    catch { setError("Couldn’t finish deleting the score. Try again."); }
    finally { setDeleting(false); }
  }

  const backButton = <button className={styles.textButton} disabled={deleting} onClick={onBack}>Back to scores</button>;
  const titleField = <label>Score title<input maxLength={200} value={score.title}
    onChange={(event) => setScore({ ...score, title: event.target.value })} /></label>;
  const meterFields = <fieldset className={styles.meterFields}>
    <legend>Time signature</legend>
    <label>Beats per measure<input type="number" min={1} max={32} value={beats}
      onChange={(event) => setMeterDraft({ beats: event.target.value === "" ? "" : event.target.valueAsNumber, beatUnit })} /></label>
    <label>Beat unit<select value={beatUnit} onChange={(event) => setMeterDraft({
      beats: beats === "" ? 4 : beats, beatUnit: Number(event.target.value) as Meter["beatUnit"],
    })}>
      {beatUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
    </select></label>
  </fieldset>;
  const actions = <>
    {error && <p role="alert">{error}</p>}
    <div className={styles.actions}>
      <button className={styles.primary} disabled={busy || !validMeter || !score.title.trim() || !score.staves.some((entry) => entry.notes.length)} onClick={save}>
        {saving ? "Saving…" : "Save and practice"}
      </button>
      {onDelete && <button className={`${styles.secondary} ${styles.deleteScore}`} disabled={busy} onClick={removeScore}>
        {deleting ? "Deleting…" : "Delete score"}
      </button>}
    </div>
  </>;

  if (score.generated) return <>
    {backButton}
    <header className={styles.heading}><h1>Edit score</h1></header>
    {titleField}
    {meterFields}
    {actions}
  </>;

  return <>
    {backButton}
    <header className={styles.heading}>
      <h1>{editing ? "Edit score" : "Review scan"}</h1>
      <p>Check the detected notes and set the key signature. Tap a note to correct its pitch or accidental.</p>
    </header>
    <div className={styles.fields}>
      {titleField}
      <label>Key signature<select value={score.key} onChange={(e) => setScore({ ...score, key: Number(e.target.value) })}>
        {keys.map((key, i) => <option key={key} value={i - 7}>{key} major</option>)}
      </select></label>
    </div>
    {meterFields}
    {editing && <details className={styles.rescan}>
      <summary>Rescan</summary>
      <p>Review the new scan and save it to replace this score’s notes.</p>
      <div className={styles.actions}>
        {!!initial.pages?.length && <button className={styles.primary} disabled={busy} onClick={() => {
          const sources = initial.pages ?? [];
          void readPhotos(() => Promise.all(sources.map(loadScanPhoto)), true, sources);
        }}>Rescan saved photos</button>}
        <button className={styles.secondary} disabled={busy} onClick={() => choosePhotos(extraCamera.current, true)}>Take a new photo</button>
        <button className={styles.secondary} disabled={busy} onClick={() => choosePhotos(extraPhotos.current, true)}>Choose replacement photos</button>
      </div>
    </details>}
    <div className={styles.staffNavigation}>
      <button className={styles.secondary} disabled={index === 0} onClick={() => move(index - 1)}>Previous</button>
      <strong className={styles.staffCounter}>Staff {index + 1} of {score.staves.length}
        {staff.page && staff.line && <span className={styles.location}>Page {staff.page} · Line {staff.line} · Track {staff.track ?? 1}</span>}
      </strong>
      <button className={styles.secondary} disabled={index + 1 === score.staves.length} onClick={() => move(index + 1)}>Next</button>
    </div>
    <StaffPaper staff={staff} reviewing selected={selection?.id} onPick={pick} />
    <div className={styles.staffNavigation}>
      <span>{staff.notes.length} notes</span>
      <button className={styles.secondary} onClick={() => { setAdding(!adding); setSelection(null); }}>
        {adding ? "Cancel adding" : "Add a note"}
      </button>
    </div>
    {adding && <p role="status">Tap where the notehead belongs on the staff.</p>}
    <div className={styles.noteList}>
      {staff.notes.map((note, i) => <button className={styles.secondary} aria-label={`Edit note ${i + 1} ${noteName(note.step, score.key, note.accidental)}`}
        key={note.id} onClick={() => { setSelection(note); setAdding(false); }}>{noteName(note.step, score.key, note.accidental)}</button>)}
    </div>
    {selection && <form className={styles.editor} onSubmit={(e) => { e.preventDefault(); update(selection); }}>
      <div className={styles.fields}>
        <label>Written pitch<select value={selection.step} onChange={(e) => setSelection({ ...selection, step: Number(e.target.value) })}>
          {steps.map((step) => <option key={step} value={step}>{noteName(step, score.key)}</option>)}
        </select></label>
        <label>Accidental<select value={selection.accidental ?? "key"} onChange={(e) => {
          const value = e.target.value;
          setSelection({ ...selection, accidental: value === "key" ? null : value === "-1" ? -1 : value === "1" ? 1 : 0 });
        }}>
          <option value="key">Use key signature</option><option value="-1">Flat ♭</option>
          <option value="0">Natural ♮</option><option value="1">Sharp ♯</option>
        </select></label>
        <label>Fingering<select value={selection.finger ?? ""} onChange={(event) => {
          const value = event.target.value;
          setSelection({ ...selection, finger: value === "" ? undefined : Number(value) as Finger });
        }}>
          <option value="">Automatic</option>
          {[0, 1, 2, 3, 4].map((finger) => <option key={finger} value={finger}>{finger}</option>)}
        </select></label>
      </div>
      <label className={styles.checkbox}><input type="checkbox" checked={selection.hollow}
        onChange={(e) => setSelection({ ...selection, hollow: e.target.checked })} /> Hollow notehead</label>
      <div className={styles.actions}>
        <button className={styles.primary} type="submit">Save note</button>
        <button className={styles.secondary} type="button" onClick={() => setSelection(null)}>Cancel</button>
        {existing && <button className={styles.secondary} type="button" onClick={() => update(null)}>Remove note</button>}
      </div>
    </form>}
    {(score.pages?.length ?? 24) < 24 && <div className={styles.actions} aria-label="Add pages">
      <button className={styles.secondary} disabled={busy} onClick={() => choosePhotos(extraCamera.current, false)}>Take another photo</button>
      <button className={styles.secondary} disabled={busy} onClick={() => choosePhotos(extraPhotos.current, false)}>Add photos</button>
    </div>}
    <input hidden ref={extraCamera} aria-label="Take an extra score photo" type="file" accept="image/*" capture="environment"
      onChange={(event) => photosChosen(event.target)} />
    <input hidden ref={extraPhotos} aria-label="Upload additional score photos" type="file" accept="image/*" multiple
      onChange={(event) => photosChosen(event.target)} />
    {readingPhotos && <span role="status">Reading the photos…</span>}
    {actions}
  </>;
}

export function Sightstring() {
  const [scores, setScores] = useState<Score[]>([]);
  const [screen, setScreen] = useState<
    { name: "library" | "random" } | { name: "review"; score: Score; editing: boolean } | { name: "practice"; score: Score; random?: boolean }
  >({ name: "library" });
  const [randomSettings, setRandomSettings] = useState<RandomSettings>({
    strings: guitarStrings.map(({ number }) => number), firstFret: 0, lastFret: 4, allowAccidentals: false, noteCount: 40, withBass: false,
  });
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const camera = useRef<HTMLInputElement>(null);
  const photos = useRef<HTMLInputElement>(null);
  const started = useRef(false);
  const locallyDeleted = useRef(new Set<string>());

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function loadLibrary() {
      const local = await recoverLocalScores().catch(() => []);
      try {
        const stored = await listScores();
        const missing = local.filter(({ id }) => !stored.some((score) => score.id === id));
        const migrated = await Promise.allSettled(missing.map(saveScore));
        const library = [...stored, ...missing.flatMap((score, i) => {
          const result = migrated[i];
          if (result.status === "fulfilled") return [result.value];
          if (result.reason instanceof DeletedScoreError) {
            void deleteLocalScore(score.id).catch(() => {});
            return [];
          }
          return [score];
        })];
        setScores((current) => [...current, ...library.filter(({ id }) => !locallyDeleted.current.has(id) && !current.some((score) => score.id === id))]);
        if (migrated.some((result) => result.status === "rejected" && !(result.reason instanceof DeletedScoreError))) {
          setError("Some scores are still on this device. Edit and save them to retry.");
        }
      } catch {
        setScores((current) => [...current, ...local.filter(({ id }) => !locallyDeleted.current.has(id) && !current.some((score) => score.id === id))]);
        setError("Couldn’t load your saved scores. Reload to try again.");
      }
    }
    void loadLibrary();
  }, []);

  function back() { setScreen({ name: "library" }); }
  function random() { setScreen({ name: "random" }); }
  function generate() { setScreen({ name: "practice", score: generateRandomExercise(randomSettings), random: true }); }

  async function addToLibrary(score: Score) {
    const saved = await saveScore(score);
    setScores((existing) => [saved, ...existing.filter((entry) => entry.id !== saved.id)]);
    return saved;
  }

  async function importPhotos(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    setError("");
    setImporting(true);
    try {
      const { pages, staves } = await scanPhotos(selected);
      setScreen({ name: "review", editing: false, score: {
        id: crypto.randomUUID(), title: "Untitled score", key: 0, pages, staves,
      } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t read the score."); }
    finally { setImporting(false); }
  }

  const canSaveExercise = screen.name === "practice" && screen.random && !scores.some(({ id }) => id === screen.score.id);
  return <div className={styles.sightstring}>
    {screen.name === "practice" ? <Practice key={screen.score.id} score={screen.score}
      onBack={canSaveExercise ? random : back} onGenerate={screen.random ? generate : undefined}
      onSave={canSaveExercise ? async (title) => {
        const saved = await addToLibrary({ ...screen.score, title });
        setScreen((current) => current.name === "practice" && current.score.id === saved.id
          ? { ...current, score: saved } : current);
      } : undefined} />
      : screen.name === "review" ? <Review initial={screen.score} editing={screen.editing} onBack={back} onSave={async (score) => {
        setScreen({ name: "practice", score: await addToLibrary(score) });
      }} onDelete={screen.editing ? async () => {
        const { id } = screen.score;
        await deleteScore(id);
        locallyDeleted.current.add(id);
        setScores((existing) => existing.filter((score) => score.id !== id));
        back();
      } : undefined} />
        : screen.name === "random" ? <RandomPractice settings={randomSettings} onChange={setRandomSettings} onBack={back} onGenerate={generate} />
        : <>
          <header className={styles.heading}>
            <h1>Sightstring</h1>
            <p>Photograph a guitar score and see the notes turn green as you play.</p>
          </header>
          <section className={styles.intro} aria-label="Import a score">
            <StaffPaper staff={exercise.staves[0]} correct={new Set(["demo-0-0", "demo-0-1", "demo-0-2"])}
              active={new Set(["demo-0-3"])} />
            <div className={styles.importActions}>
              <button className={styles.primary} disabled={importing} onClick={() => camera.current?.click()}>Take a photo</button>
              <button className={styles.secondary} disabled={importing} onClick={() => photos.current?.click()}>Choose photos</button>
              <input hidden ref={camera} aria-label="Take a score photo" type="file" accept="image/*" capture="environment"
                onChange={(e) => { void importPhotos(e.target.files); e.target.value = ""; }} />
              <input hidden ref={photos} aria-label="Upload score photos" type="file" accept="image/*" multiple
                onChange={(e) => { void importPhotos(e.target.files); e.target.value = ""; }} />
              {importing && <p role="status">Reading the score…</p>}
              {error && <p role="alert">{error}</p>}
            </div>
          </section>
          <section className={styles.library}>
            <h2>Your scores</h2>
            <div className={styles.scoreRow}>
              <div><strong>{exercise.title}</strong><p>Built-in exercise</p></div>
              <button className={styles.secondary} aria-label={`Practice ${exercise.title}`} disabled={importing}
                onClick={() => setScreen({ name: "practice", score: exercise })}>Practice</button>
            </div>
            <div className={styles.scoreRow}>
              <div><strong>Random sightreading</strong><p>Choose strings and frets</p></div>
              <button className={styles.secondary} aria-label="Set up random sightreading" disabled={importing} onClick={random}>Set up</button>
            </div>
            {scores.map((score) => {
              const images = score.pages ?? score.staves.flatMap((staff) => staff.image ? [staff.image] : []);
              return <section className={styles.savedScore} key={score.id} aria-label={score.title}>
                <div className={styles.scoreRow}>
                  <div><strong>{score.title}</strong><p>{score.staves.reduce((count, staff) => count + staff.notes.length, 0)} notes</p></div>
                  <div className={styles.actions}>
                    <button className={styles.textButton} disabled={importing}
                      onClick={() => setScreen({ name: "review", score, editing: true })}>Edit</button>
                    <button className={styles.secondary} disabled={importing} onClick={() => setScreen({ name: "practice", score })}>Practice</button>
                  </div>
                </div>
                <div className={styles.actions}>
                  {images.map((source, index) => {
                    const filename = `${score.title} - ${score.pages ? "page" : "staff"} ${index + 1}`;
                    return <a key={index} className={styles.textButton} href={downloadUrl(source, filename)}
                      download={`${filename}.jpg`}>{images.length === 1 ? "Download image" : `Download ${score.pages ? "page" : "staff"} ${index + 1}`}</a>;
                  })}
                </div>
              </section>;
            })}
            <p className={styles.local}>Scores and photos are saved to your library. Microphone audio stays in this browser.</p>
          </section>
        </>}
  </div>;
}
