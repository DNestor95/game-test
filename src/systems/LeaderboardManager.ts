import {
  LEADERBOARD_KEY,
  LEADERBOARD_MAX_ENTRIES,
  LeaderboardEntry,
} from '../config/GameConfig';

/**
 * Manages a persistent top-scores leaderboard stored in localStorage.
 * Supports multiple concurrent browser sessions — each read/write is
 * atomic through localStorage's synchronous API.
 */
export class LeaderboardManager {
  /** Retrieve the current leaderboard, sorted by score descending. */
  static getEntries(): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as LeaderboardEntry[];
    } catch {
      return [];
    }
  }

  /**
   * Add an entry to the leaderboard.
   * Re-reads localStorage to avoid overwriting entries from other sessions.
   * @returns 1-based rank of the new entry, or 0 if it didn't make the board.
   */
  static addEntry(entry: LeaderboardEntry): number {
    // Re-read to avoid overwriting concurrent sessions
    const entries = this.getEntries();
    entries.push(entry);
    entries.sort((a, b) => b.score - a.score);
    const trimmed = entries.slice(0, LEADERBOARD_MAX_ENTRIES);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));

    const rank = trimmed.findIndex(
      (e) =>
        e.name === entry.name &&
        e.score === entry.score &&
        e.date === entry.date,
    );
    return rank >= 0 ? rank + 1 : 0;
  }

  /** Check whether a score would place on the leaderboard. */
  static qualifies(score: number): boolean {
    if (score <= 0) return false;
    const entries = this.getEntries();
    if (entries.length < LEADERBOARD_MAX_ENTRIES) return true;
    return score > entries[entries.length - 1].score;
  }
}
