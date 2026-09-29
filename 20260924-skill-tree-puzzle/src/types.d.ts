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

/** 周期スキル。ローテーションで回ってきたターンは、連撃の全段がこの属性になる */
export interface ElementEffect {
  readonly type: 'element';
  readonly element: ElementId;
}

/** 被弾時。相手の攻撃を1発受けるごとに、damage − 相手の防御 を返す */
export interface CounterEffect {
  readonly type: 'counter';
  readonly damage: number;
}

/** ターン開始時。自分の HP を amount 回復する。最大 HP は超えない */
export interface RegenEffect {
  readonly type: 'regen';
  readonly amount: number;
}

/** ターン終了時。相手に、防御を無視して damage を与える */
export interface PoisonEffect {
  readonly type: 'poison';
  readonly damage: number;
}

/** 致死時。戦闘中に1回だけ、HP が0になるダメージを受けても HP 1 で踏みとどまる */
export interface EndureEffect {
  readonly type: 'endure';
}

/** 能力。ツリーのノードと敵の両方が同じ定義で持つ */
export type Effect =
  | StatEffect
  | MultiHitEffect
  | ConditionalEffect
  | ElementEffect
  | CounterEffect
  | RegenEffect
  | PoisonEffect
  | EndureEffect;

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

/** 取得済みノード。起点を含む。ローテーションの順になるので、ツリーの定義順に並べる */
export type Build = readonly SkillNode[];

/** お題の敵1体ぶんの戦闘パラメータ。戦闘ごとに自分の HP は満タンから始まり、持ち越すのは報酬だけ */
export interface Enemy {
  readonly name: string;
  readonly hp: number;
  readonly attack: number;
  readonly defense: number;
  /** 周期スキルは、この並び順でローテーションに入る */
  readonly abilities: readonly Effect[];
  /** 属性ごとの軽減率（0〜1）。1 なら無効、0.5 なら半減。書いていない属性は軽減しない */
  readonly resistances: Readonly<Partial<Record<ElementId, number>>>;
  /** このターン数を終えてもボスが残っていれば負け */
  readonly turnLimit: number;
  /** 連戦で倒したときに、味方の能力として足す。敵自身の能力とは別の数値で、省略は報酬なし */
  readonly reward?: readonly Effect[];
}

/**
 * independent：1つのビルドで、すべての敵に独立に勝てばクリア。
 * sequence：敵を1体ずつ好きな順に倒し、倒すたびに報酬を得る。ある順番で全員に勝てればクリア
 */
export type ChallengeMode = 'independent' | 'sequence';

export interface Challenge {
  readonly id: string;
  readonly name: string;
  /** 省略は independent */
  readonly mode?: ChallengeMode;
  readonly enemies: readonly Enemy[];
  /** 配布ポイント。起点は含まない */
  readonly points: number;
}

/** 戦う側の能力を集計したもの。敵と味方で同じ形。1発あたりのダメージは attack × ratio */
export interface CombatantProfile {
  maxHp: number;
  attack: number;
  defense: number;
  hits: number;
  ratio: number;
  conditionals: ConditionalEffect[];
  /** 周期スキルの属性を、ローテーションの順に並べたもの。空なら毎ターン物理 */
  rotation: ElementId[];
  /** 反撃のダメージの合計。0 なら反撃しない */
  counter: number;
  regen: number;
  poison: number;
  endure: boolean;
  /** 味方は属性の軽減を持たないので空 */
  resistances: Readonly<Partial<Record<ElementId, number>>>;
}

export type Actor = 'player' | 'boss';

/** actor は行動した側。HP は行動を受けた側（regen・endure は自分）の残り */
export type LogEntry =
  | {
      readonly type: 'hit';
      readonly actor: Actor;
      readonly turn: number;
      readonly element: ElementId;
      readonly damage: number;
      readonly targetHp: number;
    }
  | { readonly type: 'counter'; readonly actor: Actor; readonly turn: number; readonly damage: number; readonly targetHp: number }
  | { readonly type: 'poison'; readonly actor: Actor; readonly turn: number; readonly damage: number; readonly targetHp: number }
  | { readonly type: 'regen'; readonly actor: Actor; readonly turn: number; readonly amount: number; readonly hp: number }
  | { readonly type: 'endure'; readonly actor: Actor; readonly turn: number; readonly hp: number }
  | { readonly type: 'turnLimit'; readonly turn: number };

export type LoseReason = 'defeated' | 'turnLimit';

export interface SimulationSummary {
  readonly turns: number;
  readonly bossHp: number;
  readonly playerHp: number;
  readonly playerMaxHp: number;
  /** 能力の HP 加算を含めた最大 HP。Enemy.hp とは限らない */
  readonly bossMaxHp: number;
  /** 勝ったときは null */
  readonly loseReason: LoseReason | null;
}

export interface SimulationResult {
  readonly result: 'win' | 'lose';
  readonly log: readonly LogEntry[];
  readonly summary: SimulationSummary;
}

/** 連戦の進行。画面のメモリだけで持ち、保存しない */
export interface SequenceProgress {
  /** 倒した敵の challenge.enemies での位置。倒した順 */
  readonly defeated: readonly number[];
  /** 倒した順に足した報酬 */
  readonly rewards: readonly Effect[];
  /** 1戦でも戦ったら true。勝敗によらず、やり直すまでビルドを変えられない */
  readonly started: boolean;
}

/** 「保存が無い（none）」と「保存はあるが今のツリーでは組めない（invalid）」を区別する */
export type RestoredBuild =
  | { readonly status: 'none' }
  | { readonly status: 'restored'; readonly owned: Set<NodeId> }
  | { readonly status: 'invalid' };
