import { frets, guitarStrings, type RandomSettings } from "./randomExercise";
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
  return <>
    <button className={styles.textButton} onClick={onBack}>Back to scores</button>
    <header className={styles.heading}>
      <h1>Random sightreading</h1>
      <p>Choose the strings and frets to use in a 16-note exercise.</p>
    </header>
    <form className={styles.randomForm} onSubmit={(event) => { event.preventDefault(); onGenerate(); }}>
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
      {!settings.strings.length && <p className={styles.local} role="status">Select at least one string.</p>}
      <button className={styles.primary} type="submit" disabled={!settings.strings.length}>Generate exercise</button>
    </form>
  </>;
}
