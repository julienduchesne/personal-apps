"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/components/Link";
import { recordPlay } from "@/app/actions";
import type { Piece, Proficiency, KnowledgeLevel } from "@/lib/types";
import styles from "./Pieces.module.css";
import { SheetMusicControls } from "./SheetMusicControls";

const PROFICIENCY_LABELS: Record<Proficiency, string> = {
  new: "New",
  struggling: "Struggling",
  learning: "Learning",
  comfortable: "Comfortable",
  very_proficient: "Very proficient",
};

const PROFICIENCY_CLASS: Record<Proficiency, string> = {
  new: styles.proficiencyNew,
  struggling: styles.proficiencyStruggling,
  learning: styles.proficiencyLearning,
  comfortable: styles.proficiencyComfortable,
  very_proficient: styles.proficiencyVeryProficient,
};

const KNOWLEDGE_LABELS: Record<KnowledgeLevel, string> = {
  none: "None",
  partial: "Partial",
  mostly: "Mostly",
  by_heart: "By heart",
};

const KNOWLEDGE_CLASS: Record<KnowledgeLevel, string> = {
  none: styles.knowledgeNone,
  partial: styles.knowledgePartial,
  mostly: styles.knowledgeMostly,
  by_heart: styles.knowledgeByHeart,
};

const PROFICIENCY_ORDER: Record<Proficiency, number> = {
  new: 0,
  struggling: 1,
  learning: 2,
  comfortable: 3,
  very_proficient: 4,
};

const KNOWLEDGE_ORDER: Record<KnowledgeLevel, number> = {
  none: 0,
  partial: 1,
  mostly: 2,
  by_heart: 3,
};

type SortKey = "name" | "playCount" | "level" | "knowledge" | "lastPlayed";

function sortPieces(pieces: Piece[], sortKey: SortKey): Piece[] {
  return [...pieces].sort((a, b) => {
    switch (sortKey) {
      case "name":
        return a.title.localeCompare(b.title);
      case "playCount":
        return b.playCount - a.playCount;
      case "level":
        return PROFICIENCY_ORDER[a.proficiency] - PROFICIENCY_ORDER[b.proficiency];
      case "knowledge":
        return KNOWLEDGE_ORDER[a.knowledge ?? "none"] - KNOWLEDGE_ORDER[b.knowledge ?? "none"];
      case "lastPlayed": {
        if (!a.lastPlayed && !b.lastPlayed) return 0;
        if (!a.lastPlayed) return 1;
        if (!b.lastPlayed) return -1;
        return b.lastPlayed.localeCompare(a.lastPlayed);
      }
    }
  });
}

export function PieceList({
  pieces,
  editId,
}: {
  pieces: Piece[];
  editId: string | null;
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("name");

  async function handleMarkPlayed(id: string) {
    await recordPlay(id);
    router.refresh();
  }

  if (pieces.length === 0) {
    return <p className={styles.emptyState}>No pieces yet. Add one above.</p>;
  }

  const sorted = sortPieces(pieces, sortKey);

  return (
    <>
      <div className={styles.sortControls}>
        <label htmlFor="piece-sort" className={styles.sortLabel}>Sort by</label>
        <select
          id="piece-sort"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className={styles.sortSelect}
        >
          <option value="name">Name</option>
          <option value="playCount">Times played</option>
          <option value="level">Level</option>
          <option value="knowledge">Knowledge</option>
          <option value="lastPlayed">Last played</option>
        </select>
      </div>
      <ul className={styles.pieceList}>
        {sorted.map((p) => (
          <li key={p.id} className={styles.pieceCard}>
            <span className={styles.pieceTitleCell}>
              <span className={styles.pieceTitle}>{p.title}</span>
              {p.troubleNotes.trim() && (
                <span className={styles.troubleBadge} title={p.troubleNotes}>
                  trouble
                </span>
              )}
            </span>
            <div className={styles.pieceMeta}>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Level</span>
                <span className={`${styles.proficiency} ${PROFICIENCY_CLASS[p.proficiency]}`}>
                  {PROFICIENCY_LABELS[p.proficiency]}
                </span>
              </span>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Knowledge</span>
                <span className={`${styles.knowledge} ${KNOWLEDGE_CLASS[p.knowledge ?? "none"]}`}>
                  {KNOWLEDGE_LABELS[p.knowledge ?? "none"]}
                </span>
              </span>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Last played</span>
                <span className={styles.metaValue}>{p.lastPlayed ?? "—"}</span>
              </span>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Plays</span>
                <span className={styles.metaValue}>{p.playCount}</span>
              </span>
            </div>
            <span className={styles.pieceActions}>
              <button
                type="button"
                onClick={() => handleMarkPlayed(p.id)}
                className={styles.smallButton}
              >
                Mark as played
              </button>
              {editId !== p.id ? (
                <Link href={`/pieces?edit=${p.id}`} className={styles.editLink}>
                  Edit
                </Link>
              ) : (
                <span className={styles.editingBadge}>(editing)</span>
              )}
              {p.youtubeUrl && (
                <a
                  href={p.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.youtubeLink}
                >
                  ▶ YouTube
                </a>
              )}
              <SheetMusicControls
                pieceId={p.id}
                hasSheetMusic={p.hasSheetMusic ?? false}
              />
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
