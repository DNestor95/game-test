import { BASE_SCORE, HACK_COMBO_WINDOW_MS, BEST_SCORE_KEY } from '../config/GameConfig';

export class ScoreManager {
  private _score = 0;
  private _combo = 0;
  private _multiplier = 1;
  private _lastHackTime = 0;
  private _comboWindowMs: number;
  private _bestScore: number;

  /** Spendable credits (earned from kills & hacks; reduced when purchasing items) */
  private _credits = 0;

  constructor() {
    this._comboWindowMs = HACK_COMBO_WINDOW_MS;
    this._bestScore = parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10) || 0;
  }

  get score() { return this._score; }
  get combo() { return this._combo; }
  get multiplier() { return this._multiplier; }
  get bestScore() { return this._bestScore; }
  get credits() { return this._credits; }

  addMultiplier(delta: number) { this._multiplier = Math.max(1, this._multiplier + delta); }
  extendComboWindow(ms: number) { this._comboWindowMs += ms; }

  addHackScore(now: number): number {
    const withinWindow = (now - this._lastHackTime) < this._comboWindowMs;
    if (withinWindow && this._lastHackTime > 0) {
      this._combo += 1;
    } else {
      this._combo = 0;
    }
    this._lastHackTime = now;
    const comboBonus = 1 + this._combo * 0.1;
    const points = Math.floor(BASE_SCORE * this._multiplier * comboBonus);
    this._score += points;
    return points;
  }

  /** Add flat money (from kills or bonus rewards) — updates both score and credits */
  addMoney(amount: number) {
    this._score += amount;
    this._credits += amount;
  }

  /**
   * Spend credits to purchase something.
   * @returns true if the purchase succeeded, false if insufficient credits.
   */
  spendCredits(amount: number): boolean {
    if (this._credits < amount) return false;
    this._credits -= amount;
    return true;
  }

  breakCombo() {
    this._combo = 0;
  }

  saveBest() {
    if (this._score > this._bestScore) {
      this._bestScore = this._score;
      localStorage.setItem(BEST_SCORE_KEY, String(this._bestScore));
    }
  }

  reset() {
    this._score = 0;
    this._credits = 0;
    this._combo = 0;
    this._multiplier = 1;
    this._lastHackTime = 0;
    this._comboWindowMs = HACK_COMBO_WINDOW_MS;
  }
}

