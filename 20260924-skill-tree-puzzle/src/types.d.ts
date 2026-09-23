// 型はこのファイルに集約する。独立リポジトリへ移すとき、.ts へ機械的に移せるようにするため

export type NodeId = string;

/** 'physical' は属性ノードを取らなくても常に使える */
export type ElementId = 'physical' | 'fire' | 'ice' | 'thunder';

export type StatId = 'attack' | 'hp' | 'defense';

export interface StatEffect {
  readonly type: 'stat';
  readonly stat: StatId;
  readonly amount: number;
}

/** 1発あたりのダメージは 攻撃 × ratio。単純に分割するなら ratio = 1 / hits をデータに書く */
export interface MultiHitEffect {
  readonly type: 'multiHit';
  readonly hits: number;
  readonly ratio: number;
}

/** 現在 HP が 最大 HP × hpRatioAtMost 以下のとき、与ダメージを damageMultiplier 倍にする */
export interface ConditionalEffect {
  readonly type: 'conditional';
  readonly hpRatioAtMost: number;
  readonly damageMultiplier: number;
}

export interface ElementEffect {
  readonly type: 'element';
  readonly element: ElementId;
}

export type Effect = StatEffect | MultiHitEffect | ConditionalEffect | ElementEffect;

/** 表示位置。単位はグリッドのマス目で、画面上の大きさへの換算は描画側で行う */
export interface GridPosition {
  readonly x: number;
  readonly y: number;
}

export interface SkillNode {
  readonly id: NodeId;
  readonly name: string;
  readonly pos: GridPosition;
  readonly effects: readonly Effect[];
}

/** 無向グラフ。起点ノードは最初から取得済みで、基礎ステータスを効果として持つ */
export interface SkillTree {
  readonly originId: NodeId;
  readonly nodes: readonly SkillNode[];
  readonly edges: readonly (readonly [NodeId, NodeId])[];
}

/** 取得済みノード。起点を含む */
export type Build = readonly SkillNode[];

export interface Challenge {
  readonly id: string;
  readonly name: string;
  readonly hp: number;
  readonly attack: number;
  /** 被弾1回ごとに返してくる反撃のダメージ。0 なら反撃しない */
  readonly counter: number;
  /** 属性ごとの軽減率（0〜1）。1 なら無効、0.5 なら半減。書いていない属性は軽減しない */
  readonly resistances: Readonly<Partial<Record<ElementId, number>>>;
  /** このターン数を終えてもボスが残っていれば負け */
  readonly turnLimit: number;
  /** 配布ポイント。起点は含まない */
  readonly points: number;
}

export type LogEntry =
  | {
      readonly type: 'playerHit';
      readonly turn: number;
      readonly element: ElementId;
      readonly damage: number;
      readonly bossHp: number;
    }
  | { readonly type: 'counter'; readonly turn: number; readonly damage: number; readonly playerHp: number }
  | { readonly type: 'bossAttack'; readonly turn: number; readonly damage: number; readonly playerHp: number }
  | { readonly type: 'turnLimit'; readonly turn: number };

export type LoseReason = 'defeated' | 'turnLimit';

export interface SimulationSummary {
  readonly turns: number;
  readonly bossHp: number;
  readonly playerHp: number;
  /** 勝ったときは null */
  readonly loseReason: LoseReason | null;
}

export interface SimulationResult {
  readonly result: 'win' | 'lose';
  readonly log: readonly LogEntry[];
  readonly summary: SimulationSummary;
}
