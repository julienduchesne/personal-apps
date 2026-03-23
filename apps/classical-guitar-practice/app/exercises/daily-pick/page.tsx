export const dynamic = "force-dynamic";

import { getTodayExercises } from "@/app/actions";
import { Link } from "@/components/Link";
import { RegenerateButton } from "./RegenerateButton";
import styles from "./DailyPick.module.css";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function DailyPickPage() {
  const date = today();
  const { exercises } = await getTodayExercises(date);

  return (
    <main>
      <div className={styles.titleRow}>
        <h1>Daily pick</h1>
      </div>
      <p className={styles.date}>{date}</p>
      <div className={styles.actions}>
        <RegenerateButton date={date} />
        <Link href="/exercises/daily-pick/history" className={styles.historyLink}>
          History
        </Link>
      </div>
      <ul className={styles.exerciseList}>
        {exercises.map((e) => (
          <li key={e.name} className={styles.exerciseItem}>
            <span className={styles.exerciseName}>{e.name}</span>
            <span className={styles.exerciseFocus}>{e.focus}</span>
          </li>
        ))}
      </ul>
      {exercises.length === 0 && (
        <p className={styles.muted}>No exercises selected. Regenerate to pick some.</p>
      )}
    </main>
  );
}
