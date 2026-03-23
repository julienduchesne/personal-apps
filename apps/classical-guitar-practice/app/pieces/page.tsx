import { getPieces } from "@/app/actions";
import { AddPieceForm } from "./AddPieceForm";
import { Modal } from "@/components/Modal";

export const dynamic = "force-dynamic";
import { PieceList } from "./PieceList";
import { EditPieceForm } from "./EditPieceForm";
import { Link } from "@/components/Link";
import type { Piece } from "@/lib/types";
import styles from "./Pieces.module.css";

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function PiecesPage({ searchParams }: Props) {
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : null;
  const showAdd = params.add === "1";
  const pieces = await getPieces();
  const pieceToEdit: Piece | null =
    editId ? pieces.find((p) => p.id === editId) ?? null : null;

  return (
    <main>
      <h1>Pieces</h1>

      {showAdd && (
        <Modal closePath="/pieces">
          <AddPieceForm />
        </Modal>
      )}

      {pieceToEdit && (
        <Modal closePath="/pieces">
          <EditPieceForm piece={pieceToEdit} />
        </Modal>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All pieces</h2>
          <Link href="/pieces?add=1" className={styles.addButton}>+</Link>
        </div>
        <PieceList pieces={pieces} editId={editId} />
      </section>
    </main>
  );
}
