import { Link } from "@/components/Link";
import { getExercises } from "@/app/actions";
import { Modal } from "@/components/Modal";
import { AddExerciseForm } from "./AddExerciseForm";
import { EditExerciseForm } from "./EditExerciseForm";
import { ExerciseSheetMusicControls } from "./ExerciseSheetMusicControls";

export const dynamic = "force-dynamic";
import type { Exercise, ExerciseCategory } from "@/lib/types";
import styles from "./Exercises.module.css";

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  right_hand: "Right Hand (Arpeggios & Tone)",
  left_hand: "Left Hand (Strength & Agility)",
  coordination_scales: "Coordination & Scales",
  specialized: "Specialized Technique",
};

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function ExercisesPage({ searchParams }: Props) {
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : null;
  const showAdd = params.add === "1";
  const exercises = await getExercises();

  const exerciseToEdit: Exercise | null =
    editId ? exercises.find((e) => e.id === editId) ?? null : null;

  const byCategory = new Map<ExerciseCategory, Exercise[]>();
  for (const e of exercises) {
    const list = byCategory.get(e.category) ?? [];
    list.push(e);
    byCategory.set(e.category, list);
  }
  const order: ExerciseCategory[] = [
    "right_hand",
    "left_hand",
    "coordination_scales",
    "specialized",
  ];

  return (
    <main>
      <div className={styles.pageHeader}>
        <h1>Exercises</h1>
        <Link href="/exercises?add=1" className={styles.addButton}>+</Link>
      </div>
      <p className={styles.intro}>
        <Link href="/exercises/daily-pick">See today&apos;s daily pick</Link>
      </p>

      {showAdd && (
        <Modal closePath="/exercises">
          <AddExerciseForm />
        </Modal>
      )}

      {exerciseToEdit && (
        <Modal closePath="/exercises">
          <EditExerciseForm exercise={exerciseToEdit} />
        </Modal>
      )}

      {exercises.length === 0 && (
        <p className={styles.emptyState}>No exercises yet. Add one above.</p>
      )}

      {order.map((cat) => {
        const list = byCategory.get(cat) ?? [];
        if (list.length === 0) return null;
        return (
          <section key={cat} className={styles.categorySection}>
            <h2 className={styles.categoryTitle}>{CATEGORY_LABELS[cat]}</h2>
            <ul className={styles.exerciseList}>
              {list.map((e) => (
                <li key={e.id} className={styles.exerciseItem}>
                  <div className={styles.exerciseHeader}>
                    <div>
                      <span className={styles.exerciseName}>{e.name}</span>
                      <span className={styles.exerciseFocus}>{e.focus}</span>
                    </div>
                    <span className={styles.exerciseActions}>
                      <Link
                        href={`/exercises?edit=${e.id}`}
                        className={styles.editLink}
                      >
                        Edit
                      </Link>
                      {e.youtubeUrl && (
                        <a
                          href={e.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.youtubeLink}
                        >
                          ▶ YouTube
                        </a>
                      )}
                      <ExerciseSheetMusicControls
                        exerciseId={e.id}
                        hasSheetMusic={e.hasSheetMusic ?? false}
                      />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
