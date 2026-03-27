import { ROUND_BASE_NODES, ROUND_BASE_TIMER_S } from '../config/GameConfig';

export interface RoundConfig {
  round: number;
  nodesRequired: number;
  timerSec: number;
  enemySpeedMult: number;
  enemyCountMult: number;
}

export class RoundManager {
  private _round = 1;
  private _nodesHacked = 0;

  get round() { return this._round; }
  get nodesHacked() { return this._nodesHacked; }

  getRoundConfig(): RoundConfig {
    const r = this._round;
    return {
      round: r,
      nodesRequired: ROUND_BASE_NODES + Math.floor((r - 1) * 1.5),
      timerSec: Math.max(15, ROUND_BASE_TIMER_S - (r - 1) * 2),
      enemySpeedMult: 1 + (r - 1) * 0.15,
      enemyCountMult: 1 + (r - 1) * 0.25,
    };
  }

  hackNode() { this._nodesHacked += 1; }

  isRoundComplete(cfg: RoundConfig): boolean {
    return this._nodesHacked >= cfg.nodesRequired;
  }

  nextRound() {
    this._round += 1;
    this._nodesHacked = 0;
  }

  reset() {
    this._round = 1;
    this._nodesHacked = 0;
  }
}
