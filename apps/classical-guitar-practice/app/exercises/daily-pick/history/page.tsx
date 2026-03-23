export const dynamic = "force-dynamic";

import { getDailyPickHistory } from "@/app/actions";
import { Link } from "@/components/Link";
import styles from "./History.module.css";

export default async function DailyPickHistoryPage() {
  const history = await getDailyPickHistory();

  return (
    <main>
      <Link href="/exercises/daily-pick" className={styles.back}>
        ← Back to Daily pick
      </Link>
      <h1>Pick history</h1>
      {history.length === 0 ? (
        <p className={styles.muted}>No history yet.</p>
      ) : (
        <div className={styles.entries}>
          {history.map((entry) => (
            <section key={entry.date} className={styles.entry}>
              <h2 className={styles.entryDate}>{entry.date}</h2>
              <ul className={styles.exerciseList}>
                {entry.exercises.map((e) => (
                  <li key={e.name} className={styles.exerciseItem}>
                    <span className={styles.exerciseName}>{e.name}</span>
                    <span className={styles.exerciseFocus}>{e.focus}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
