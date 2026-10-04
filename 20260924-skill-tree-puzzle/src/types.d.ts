// 判定・データ・表示が共有する型の定義。
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

/** 攻撃（通常攻撃の1発・反撃）を当てた直後。与えたダメージ × ratio を切り捨てて回復する。最大 HP は超えない */
export interface DrainEffect {
  readonly type: 'drain';
  readonly ratio: number;
}

/** 攻撃（通常攻撃の1発・反撃）を受けた直後。ダメージが0でも、この戦闘中の攻撃が amount 上がる */
export interface RageEffect {
  readonly type: 'rage';
  readonly amount: number;
}

/** 攻撃（通常攻撃の1発・反撃）で、相手の防御を引かない */
export interface PierceEffect {
  readonly type: 'pierce';
}

/** 攻撃（通常攻撃の1発・反撃）を当てた直後。この戦闘中、相手の防御を amount 下げる。0 未満にはしない */
export interface ArmorBreakEffect {
  readonly type: 'armorBreak';
  readonly amount: number;
}

/** ターン数が every の倍数のとき、通常攻撃の与ダメージを damageMultiplier 倍にする */
export interface TempoEffect {
  readonly type: 'tempo';
  readonly every: number;
  readonly damageMultiplier: number;
}

/**
 * 周期スキル。回ってきたターンは物理で殴り、通常攻撃の与ダメージを 1 + perTurn × 経過ターン数 倍にする。
 * 経過ターン数は前回の発動から（初回は戦闘開始から）数える
 */
export interface ChargeEffect {
  readonly type: 'charge';
  readonly perTurn: number;
}

/** 攻撃（通常攻撃の1発・反撃）を当てた直後。相手に刻印を amount 付ける */
export interface MarkEffect {
  readonly type: 'mark';
  readonly amount: number;
}

/** 周期スキル。回ってきたターンは物理で殴り、相手の刻印を全部使って、通常攻撃の与ダメージを 1 + perMark × 使った数 倍にする */
export interface BurstEffect {
  readonly type: 'burst';
  readonly perMark: number;
}

/** ローテーションに入る能力 */
export type RotationSkill = ElementEffect | ChargeEffect | BurstEffect;

/** 能力。ツリーのノードと敵の両方が同じ定義で持つ */
export type Effect =
  | StatEffect
  | MultiHitEffect
  | ConditionalEffect
  | ElementEffect
  | CounterEffect
  | RegenEffect
  | PoisonEffect
  | EndureEffect
  | DrainEffect
  | RageEffect
  | PierceEffect
  | ArmorBreakEffect
  | TempoEffect
  | ChargeEffect
  | MarkEffect
  | BurstEffect;

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
  /** 最少クリア pt。配布 pt で組めるビルドの総当たりと一致することをテストで確かめる */
  readonly minimumPoints: number;
  /** 開発用のお題。URL に `?debug` を付けたときだけ選べる。省略は公開 */
  readonly debugOnly?: boolean;
}

/** キャラごとにツリーとお題を持つ。お題はキャラ専用で、敵を共有するときは敵の定義を import する */
export interface Character {
  /** 保存キーの区切りに使うので、`:` を含めない */
  readonly id: string;
  readonly name: string;
  readonly tree: SkillTree;
  readonly challenges: readonly Challenge[];
}

/** 戦う側の能力を集計したもの。敵と味方で同じ形。1発あたりのダメージは attack × ratio */
export interface CombatantProfile {
  maxHp: number;
  attack: number;
  defense: number;
  hits: number;
  ratio: number;
  conditionals: ConditionalEffect[];
  tempos: TempoEffect[];
  /** 周期スキルを、ローテーションの順に並べたもの。空なら毎ターン物理 */
  rotation: RotationSkill[];
  /** 反撃のダメージの合計。0 なら反撃しない */
  counter: number;
  regen: number;
  poison: number;
  endure: boolean;
  /** 吸収の割合の合計。0 なら吸収しない */
  drain: number;
  rage: number;
  pierce: boolean;
  armorBreak: number;
  mark: number;
  /** 味方は属性の軽減を持たないので空 */
  resistances: Readonly<Partial<Record<ElementId, number>>>;
}

export type Actor = 'player' | 'boss';

/**
 * 攻撃を受けた側の、その1発で変わった状態。変わったものだけを持つ。
 * 逆上・破甲・刻印は1発ごとに起きるので、行を増やさず攻撃の行に添える
 */
export interface TargetChanges {
  /** 逆上で上がったあとの攻撃 */
  readonly attack?: number;
  /** 破甲で下がったあとの防御 */
  readonly defense?: number;
  /** 付いたあとの刻印の数 */
  readonly marks?: number;
}

/** actor は行動した側。HP は行動を受けた側（regen・endure・drain は自分）の残り */
export type LogEntry =
  | {
      readonly type: 'hit';
      readonly actor: Actor;
      readonly turn: number;
      readonly element: ElementId;
      readonly damage: number;
      readonly targetHp: number;
      /** 好機の倍率。掛からなかったターンは持たない */
      readonly tempo?: number;
      readonly changes?: TargetChanges;
    }
  | {
      readonly type: 'counter';
      readonly actor: Actor;
      readonly turn: number;
      readonly damage: number;
      readonly targetHp: number;
      readonly changes?: TargetChanges;
    }
  | { readonly type: 'drain'; readonly actor: Actor; readonly turn: number; readonly amount: number; readonly hp: number }
  | { readonly type: 'charge'; readonly actor: Actor; readonly turn: number; readonly multiplier: number }
  | { readonly type: 'burst'; readonly actor: Actor; readonly turn: number; readonly marks: number; readonly multiplier: number }
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

/** デバッグ入力のボタンを並べるときの区分 */
export type AbilityGroup = 'stat' | 'ability' | 'element';

/** デバッグ入力で指定できる能力1つぶん。表の1行 */
export interface AbilityDefinition {
  /** 入力に書く語。英語名で、大文字小文字は区別しない */
  readonly name: string;
  readonly label: string;
  readonly group: AbilityGroup;
  /** 引数の並びと規定値。引数を取らない能力は空 */
  readonly defaults: readonly number[];
  /** 規定値で埋めたあとの引数を検査し、不正なら理由を返す */
  readonly check?: (args: readonly number[]) => string | null;
  readonly build: (...args: number[]) => Effect;
}

export interface AbilityError {
  readonly word: string;
  readonly reason: string;
}

export type ParsedAbilities =
  | { readonly ok: true; readonly effects: readonly Effect[] }
  | { readonly ok: false; readonly errors: readonly AbilityError[] };
