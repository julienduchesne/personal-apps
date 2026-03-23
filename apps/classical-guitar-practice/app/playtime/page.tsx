export const dynamic = "force-dynamic";

import { getPlaytimeSessions, getPlayTarget } from "@/app/actions";
import { EditPlaytimeForm } from "./EditPlaytimeForm";
import { Modal } from "@/components/Modal";
import { PlaytimeCalendar } from "./PlaytimeCalendar";
import { PlaytimeSessionList } from "./PlaytimeSessionList";
import type { PlaytimeSession } from "@/lib/types";
import styles from "./Playtime.module.css";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PlaytimePage({ searchParams }: Props) {
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : null;
  const [sessions, playTarget] = await Promise.all([
    getPlaytimeSessions(),
    getPlayTarget(),
  ]);
  const sessionToEdit: PlaytimeSession | null =
    editId ? sessions.find((s) => s.id === editId) ?? null : null;

  return (
    <main>
      <h1>Playtime</h1>

      {sessionToEdit && (
        <Modal closePath="/playtime">
          <EditPlaytimeForm session={sessionToEdit} />
        </Modal>
      )}

      <PlaytimeCalendar sessions={sessions} playTarget={playTarget} />

      <div className={styles.sessionsSection}>
        <PlaytimeSessionList sessions={sessions} />
      </div>
    </main>
  );
}
