import { availablePitches, bassNotesByMelody, frets, guitarStrings, isValidNoteCount, maximumExerciseNotes, type RandomSettings } from "./randomExercise";
import styles from "./Sightstring.module.css";

function fretLabel(fret: number) {
  return fret === 0 ? "0 (open)" : fret;
}

export function RandomPractice({ settings, onChange, onGenerate, onBack }: {
  settings: RandomSettings;
  onChange: (settings: RandomSettings) => void;
  onGenerate: () => void;
  onBack: () => void;
}) {
  const hasPitches = availablePitches(settings).length > 0;
  const validLength = isValidNoteCount(settings.noteCount);
  const hasBassPairs = !settings.withBass || bassNotesByMelody(settings).size > 0;
  const canGenerate = hasPitches && validLength && hasBassPairs;
  return <>
    <button className={styles.textButton} onClick={onBack}>Back to scores</button>
    <header className={styles.heading}>
      <h1>Random sightreading</h1>
    </header>
    <form className={styles.randomForm} onSubmit={(event) => { event.preventDefault(); if (canGenerate) onGenerate(); }}>
      <fieldset className={styles.strings}>
        <legend>Strings</legend>
        <div className={styles.stringGrid}>
          {guitarStrings.map(({ number, name }) => (
            <label key={number} className={styles.stringOption}>
              <input type="checkbox" checked={settings.strings.includes(number)} aria-label={`String ${number} (${name})`}
                onChange={(event) => {
                  const strings = event.target.checked ? [...settings.strings, number] : settings.strings.filter((n) => n !== number);
                  onChange({ ...settings, strings });
                }} />
              <span>{number} · {name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.fields}>
        <label>First fret<select value={settings.firstFret}
          onChange={(event) => onChange({ ...settings, firstFret: Number(event.target.value) })}>
          {frets.filter((fret) => fret <= settings.lastFret).map((fret) => <option key={fret} value={fret}>{fretLabel(fret)}</option>)}
        </select></label>
        <label>Last fret<select value={settings.lastFret}
          onChange={(event) => onChange({ ...settings, lastFret: Number(event.target.value) })}>
          {frets.filter((fret) => fret >= settings.firstFret).map((fret) => <option key={fret} value={fret}>{fretLabel(fret)}</option>)}
        </select></label>
      </div>
      <label className={styles.exerciseLength}>{settings.withBass ? "Number of melody notes" : "Number of notes"}
        <input type="number" inputMode="numeric" min={1} max={maximumExerciseNotes} value={settings.noteCount}
          onChange={({ target }) => onChange({ ...settings, noteCount: target.value === "" ? "" : target.valueAsNumber })} />
      </label>
      <label className={styles.checkbox}>
        <input type="checkbox" checked={settings.allowAccidentals}
          onChange={(event) => onChange({ ...settings, allowAccidentals: event.target.checked })} />
        Allow sharps and flats
      </label>
      <label className={styles.checkbox}>
        <input type="checkbox" checked={settings.withBass}
          onChange={(event) => onChange({ ...settings, withBass: event.target.checked })} />
        Bass and melody together
      </label>
      {settings.withBass && <p className={styles.local}>Adds a bass note on beats 1 and 3.</p>}
      {!hasPitches && <p className={styles.local} role="status">
        {settings.strings.length ? "No natural notes in this range. Change the frets or strings, or allow sharps and flats." : "Select at least one string."}
      </p>}
      {hasPitches && !hasBassPairs && <p role="status">Choose a string and fret range with a pair the microphone can distinguish.</p>}
      {!validLength && <p role="status">Enter a whole number from 1 to {maximumExerciseNotes}.</p>}
      <button className={styles.primary} type="submit" disabled={!canGenerate}>Generate exercise</button>
    </form>
  </>;
}
