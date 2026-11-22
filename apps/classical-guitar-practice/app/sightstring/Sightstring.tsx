"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { downloadUrl, listScores, loadScanPhoto, recoverLocalScores, saveScore } from "./library";
import { listen } from "./microphone";
import { scanPage } from "./recognition";
import { exercise, keys, noteName, scoreEvents, soundingMidi, steps, type Note, type Score, type Staff } from "./score";
import styles from "./Sightstring.module.css";

function StaffPaper({ staff, active, correct, reviewing, selected, onPick }: {
  staff: Staff;
  active?: Set<string>;
  correct?: Set<string>;
  reviewing?: boolean;
  selected?: string;
  onPick?: (x: number, y: number) => void;
}) {
  const x = (position: number) => `${100 * position / staff.width}%`;
  const y = (position: number) => `${100 * position / staff.height}%`;
  const { spacing, imageCrop } = staff;
  const imageStyle = imageCrop ? {
    backgroundSize: `${x(imageCrop.width)} ${y(imageCrop.height)}`,
    backgroundPosition: `${100 * imageCrop.x / (imageCrop.width - staff.width || 1)}% ${100 * imageCrop.y / (imageCrop.height - staff.height || 1)}%`,
  } : {};
  function pick(event: MouseEvent<HTMLDivElement>) {
    const region = event.currentTarget.getBoundingClientRect();
    onPick?.((event.clientX - region.left) * staff.width / region.width,
      (event.clientY - region.top) * staff.height / region.height);
  }
  return (
    <div className={styles.paper} style={{
      aspectRatio: `${staff.width} / ${staff.height}`,
      ...imageStyle,
      backgroundImage: staff.image ? `url("${staff.image}")` : undefined,
    }} onClick={onPick ? pick : undefined} aria-hidden="true">
      {!staff.image && <>
        {[0, 1, 2, 3, 4].map((line) => (
          <i key={line} className={styles.line} style={{ left: x(staff.left), width: x(staff.right - staff.left), top: y(staff.top + line * spacing) }} />
        ))}
        {[staff.left, 330, staff.right - 5, staff.right].map((bar) => (
          <i key={bar} className={styles.bar} style={{ left: x(bar), top: y(staff.top), height: y(spacing * 4) }} />
        ))}
        <i className={styles.clef} style={{ left: x(46), top: y(77) }}>𝄞</i>
      </>}
      {staff.notes.map((note) => {
        const id = note.id;
        const hit = correct?.has(id);
        const current = active?.has(id);
        const chosen = selected === id;
        const up = note.step < 6;
        const ledgers = [0, -2, -4, 12, 14, 16].filter((step) => step <= 0 ? note.step <= step : note.step >= step);
        return (
          <span key={id} data-note={id} data-status={hit ? "correct" : current ? "current" : undefined}
            data-selected={chosen || undefined} data-review={reviewing || undefined} className={styles.mark}>
            {(current || chosen) && (
              <i className={styles.cursor} style={{
                left: x(note.x - spacing * 0.95), width: x(spacing * 1.9), top: y(note.y - spacing), height: y(spacing * 2),
              }} />
            )}
            {!staff.image && <>
              {ledgers.map((step) => <i key={step} className={styles.line} style={{
                left: x(note.x - spacing * 0.95), width: x(spacing * 1.9), top: y(staff.top + (10 - step) * spacing / 2),
              }} />)}
              <i className={styles.stem} style={{
                left: x(note.x + (up ? 0.58 : -0.65) * spacing), top: y(note.y + (up ? -3 : 0) * spacing), height: y(spacing * 3),
              }} />
            </>}
            {(!staff.image || hit || current || reviewing) && (
              <i className={`${styles.head} ${note.hollow ? styles.hollow : ""}`} style={{
                left: x(note.x - spacing * 0.68), width: x(spacing * 1.36),
                top: y(note.y - spacing * 0.46), height: y(spacing * 0.92),
              }} />
            )}
          </span>
        );
      })}
    </div>
  );
}

function Practice({ score, onBack }: { score: Score; onBack: () => void }) {
  const [track, setTrack] = useState(1);
  const tracks = [...new Set(score.staves.filter((staff) => staff.notes.length > 0).map((staff) => staff.track ?? 1))].sort((a, b) => a - b);
  const selected = tracks.includes(track) ? track : tracks[0] ?? 1;
  return <>
    <button className={styles.textButton} onClick={onBack}>Back to scores</button>
    {tracks.length > 1 && <label className={styles.trackPicker}>Practice track
      <select value={selected} onChange={(event) => setTrack(Number(event.target.value))}>
        {tracks.map((number) => <option key={number} value={number}>Track {number}</option>)}
      </select>
    </label>}
    <PracticeTrack key={selected} score={score} track={selected} />
  </>;
}

function PracticeTrack({ score, track }: { score: Score; track: number }) {
  const events = useMemo(() => scoreEvents(score, track), [score, track]);
  const [progress, setProgress] = useState({ index: 0, correct: new Set<string>() });
  const [state, setState] = useState<"idle" | "starting" | "listening">("idle");
  const [error, setError] = useState("");
  const microphone = useRef<AbortController | null>(null);
  const systems = useRef<(HTMLElement | null)[]>([]);
  const event = events[progress.index];
  const staffIndex = event?.staffIndex;
  const total = events.reduce((count, item) => count + item.notes.length, 0);

  function stop() {
    microphone.current?.abort();
    microphone.current = null;
    setState("idle");
  }

  useEffect(() => {
    const pause = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", pause);
    return () => {
      microphone.current?.abort();
      document.removeEventListener("visibilitychange", pause);
    };
  }, []);

  useEffect(() => {
    if (staffIndex !== undefined && staffIndex > 0) {
      systems.current[staffIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [staffIndex]);

  useEffect(() => {
    if (!event) stop();
  }, [event]);

  async function start() {
    const controller = new AbortController();
    microphone.current = controller;
    setError("");
    setState("starting");
    try {
      await listen((midi) => {
        setProgress((previous) => {
          const current = events[previous.index];
          const matches = current?.notes.filter((note) => soundingMidi(note, score.key) === midi && !previous.correct.has(note.id));
          if (!matches?.length) return previous;
          const correct = new Set([...previous.correct, ...matches.map((note) => note.id)]);
          return { index: previous.index + Number(current.notes.every((note) => correct.has(note.id))), correct };
        });
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
  return <>
    <header className={styles.heading}>
      <h1>{score.title}</h1>
      <p>{progress.correct.size} of {total} notes played</p>
      <progress aria-label="Practice progress" max={total} value={progress.correct.size} />
    </header>
    <div className={styles.systems}>
      {score.staves.map((staff, index) => (staff.track ?? 1) === track && (
        <section key={index} ref={(element) => { systems.current[index] = element; }}
          aria-label={staff.page && staff.line ? `Page ${staff.page}, line ${staff.line}, track ${track}` : `Staff ${index + 1}`}>
          {staff.page && staff.line && <p className={styles.location}>Page {staff.page} · Line {staff.line}</p>}
          <StaffPaper staff={staff} active={staffIndex === index ? new Set(remaining.map((note) => note.id)) : undefined} correct={progress.correct} />
        </section>
      ))}
    </div>
    <div className={styles.transport}>
      <div aria-live="polite">
        <strong>{!event ? "Score complete" : state === "listening" ? "Listening" : state === "starting" ? "Starting microphone…" : "Play at your own pace"}</strong>
        <p>{!event ? "You played every note." : state === "listening"
          ? `${remaining.length > 1 ? "Pick each note separately" : "Play"} · ${remaining.map((note) => noteName(note.step, score.key, note.accidental)).join(", ")}`
          : "Use standard tuning and pluck one note at a time."}</p>
        {error && <p role="alert">{error}</p>}
      </div>
      {!event ? <button className={styles.transportButton} onClick={() => {
        setProgress({ index: 0, correct: new Set() });
        systems.current[events[0]?.staffIndex]?.scrollIntoView({ block: "nearest" });
      }}>Play again</button>
        : state === "listening" ? <button className={styles.transportButton} onClick={stop}>Pause</button>
          : <button disabled={state === "starting"} className={styles.transportButton} onClick={start}>Start listening</button>}
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

function Review({ initial, onBack, onSave }: { initial: Score; onBack: () => void; onSave: (score: Score) => Promise<void> }) {
  const [score, setScore] = useState(initial);
  const [index, setIndex] = useState(0);
  const [selection, setSelection] = useState<Note | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [addingPages, setAddingPages] = useState(false);
  const extraCamera = useRef<HTMLInputElement>(null);
  const extraPhotos = useRef<HTMLInputElement>(null);
  const staff = score.staves[index];
  const existing = staff.notes.some((note) => note.id === selection?.id);

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

  async function appendPhotos(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    const pages = score.pages ?? [];
    setError("");
    setAddingPages(true);
    try {
      const scans = await scanPhotos(selected, pages.length);
      setScore((current) => ({ ...current, pages: [...pages, ...scans.pages], staves: [...current.staves, ...scans.staves] }));
      move(score.staves.length);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t add the photos.");
    } finally {
      setAddingPages(false);
    }
  }

  async function save() {
    setError("");
    setSaving(true);
    try { await onSave({ ...score, title: score.title.trim() }); }
    catch { setError("Couldn’t save the score to your library. Try again."); }
    finally { setSaving(false); }
  }

  return <>
    <button className={styles.textButton} onClick={onBack}>Back to scores</button>
    <header className={styles.heading}>
      <h1>Review scan</h1>
      <p>Check the detected notes and set the key signature. Tap a note to correct its pitch or accidental.</p>
    </header>
    <div className={styles.fields}>
      <label>Score title<input maxLength={200} value={score.title} onChange={(e) => setScore({ ...score, title: e.target.value })} /></label>
      <label>Key signature<select value={score.key} onChange={(e) => setScore({ ...score, key: Number(e.target.value) })}>
        {keys.map((key, i) => <option key={key} value={i - 7}>{key} major</option>)}
      </select></label>
    </div>
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
      <button className={styles.secondary} disabled={addingPages || saving} onClick={() => extraCamera.current?.click()}>Take another photo</button>
      <button className={styles.secondary} disabled={addingPages || saving} onClick={() => extraPhotos.current?.click()}>Add photos</button>
      <input hidden ref={extraCamera} aria-label="Take an extra score photo" type="file" accept="image/*" capture="environment"
        onChange={(event) => { void appendPhotos(event.target.files); event.target.value = ""; }} />
      <input hidden ref={extraPhotos} aria-label="Upload additional score photos" type="file" accept="image/*" multiple
        onChange={(event) => { void appendPhotos(event.target.files); event.target.value = ""; }} />
      {addingPages && <span role="status">Reading additional pages…</span>}
    </div>}
    {error && <p role="alert">{error}</p>}
    <button className={styles.primary} disabled={saving || addingPages || !score.title.trim() || !score.staves.some((entry) => entry.notes.length)} onClick={save}>
      {saving ? "Saving…" : "Save and practice"}
    </button>
  </>;
}

export function Sightstring() {
  const [scores, setScores] = useState<Score[]>([]);
  const [screen, setScreen] = useState<{ name: "library" } | { name: "review" | "practice"; score: Score }>({ name: "library" });
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [rescanFor, setRescanFor] = useState<string | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const photos = useRef<HTMLInputElement>(null);
  const replacement = useRef<Score | undefined>(undefined);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function loadLibrary() {
      const local = await recoverLocalScores().catch(() => []);
      try {
        const stored = await listScores();
        const missing = local.filter(({ id }) => !stored.some((score) => score.id === id));
        const migrated = await Promise.allSettled(missing.map(saveScore));
        const library = [...stored, ...missing.map((score, i) => {
          const result = migrated[i];
          return result.status === "fulfilled" ? result.value : score;
        })];
        setScores((current) => [...current, ...library.filter(({ id }) => !current.some((score) => score.id === id))]);
        if (migrated.some(({ status }) => status === "rejected")) {
          setError("Some scores are still on this device. Edit and save them to retry.");
        }
      } catch {
        setScores(local);
        setError("Couldn’t load your saved scores. Reload to try again.");
      }
    }
    void loadLibrary();
  }, []);

  function back() { setScreen({ name: "library" }); }

  function choose(input: HTMLInputElement | null, score?: Score) {
    replacement.current = score;
    input?.click();
  }

  async function scan(loadFiles: () => Promise<File[]>, existing?: Score, savedPhotos?: string[]) {
    setError("");
    setImporting(true);
    try {
      const { pages, staves } = await scanPhotos(await loadFiles(), 0, savedPhotos);
      setRescanFor(null);
      setScreen({ name: "review", score: {
        id: existing?.id ?? crypto.randomUUID(), title: existing?.title ?? "Untitled score",
        key: existing?.key ?? 0, pages, staves,
      } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t read the score."); }
    finally { setImporting(false); }
  }

  function importPhotos(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    void scan(async () => selected, replacement.current);
  }

  return <div className={styles.sightstring}>
    {screen.name === "practice" ? <Practice score={screen.score} onBack={back} />
      : screen.name === "review" ? <Review initial={screen.score} onBack={back} onSave={async (score) => {
        const saved = await saveScore(score);
        setScores((existing) => [saved, ...existing.filter((entry) => entry.id !== saved.id)]);
        setScreen({ name: "practice", score: saved });
      }} />
        : <>
          <header className={styles.heading}>
            <h1>Sightstring</h1>
            <p>Photograph a guitar score and see the notes turn green as you play.</p>
          </header>
          <section className={styles.intro} aria-label="Import a score">
            <StaffPaper staff={exercise.staves[0]} correct={new Set(["demo-0-0", "demo-0-1", "demo-0-2"])}
              active={new Set(["demo-0-3"])} />
            <div className={styles.importActions}>
              <button className={styles.primary} disabled={importing} onClick={() => choose(camera.current)}>Take a photo</button>
              <button className={styles.secondary} disabled={importing} onClick={() => choose(photos.current)}>Choose photos</button>
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
            {scores.map((score) => {
              const images = score.pages ?? score.staves.flatMap((staff) => staff.image ? [staff.image] : []);
              return <section className={styles.savedScore} key={score.id} aria-label={score.title}>
                <div className={styles.scoreRow}>
                  <div><strong>{score.title}</strong><p>{score.staves.reduce((count, staff) => count + staff.notes.length, 0)} notes</p></div>
                  <div className={styles.actions}>
                    <button className={styles.textButton} disabled={importing} onClick={() => setScreen({ name: "review", score })}>Edit</button>
                    <button className={styles.secondary} disabled={importing} onClick={() => setScreen({ name: "practice", score })}>Practice</button>
                  </div>
                </div>
                <div className={styles.actions}>
                  <button className={styles.textButton} disabled={importing} aria-expanded={rescanFor === score.id}
                    onClick={() => setRescanFor(rescanFor === score.id ? null : score.id)}>Rescan</button>
                  {images.map((source, index) => {
                    const filename = `${score.title} - ${score.pages ? "page" : "staff"} ${index + 1}`;
                    return <a key={index} className={styles.textButton} href={downloadUrl(source, filename)}
                      download={`${filename}.jpg`}>{images.length === 1 ? "Download image" : `Download ${score.pages ? "page" : "staff"} ${index + 1}`}</a>;
                  })}
                </div>
                {rescanFor === score.id && <div className={styles.rescan}>
                  <p>Review the new scan before replacing this score’s notes.</p>
                  <div className={styles.actions}>
                    {!!score.pages?.length && <button className={styles.primary} disabled={importing} onClick={() => {
                      const sources = score.pages ?? [];
                      void scan(() => Promise.all(sources.map(loadScanPhoto)), score, sources);
                    }}>Rescan saved photos</button>}
                    <button className={styles.secondary} disabled={importing} onClick={() => choose(camera.current, score)}>Take a new photo</button>
                    <button className={styles.secondary} disabled={importing} onClick={() => choose(photos.current, score)}>Choose replacement photos</button>
                  </div>
                </div>}
              </section>;
            })}
            <p className={styles.local}>Scores and photos are saved to your library. Microphone audio stays in this browser.</p>
          </section>
        </>}
  </div>;
}
