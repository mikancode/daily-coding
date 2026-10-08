// キャラのお題ごとに、配布 pt で組めるビルドを総当たりして解の分布を出力する
// 使い方: node 20260924-skill-tree-puzzle/scripts/verify.js

import { CHARACTERS } from '../src/data/characters.js';
import { enumerateBuilds } from '../src/core/enumerate.js';
import { clearsChallenge, winningOrders } from '../src/core/challenge.js';

/** 各お題は、複数の路線（能力の組）でクリアできるようにする */
const MIN_ROUTES = 2;

/**
 * 連戦のお題で確かめる4項目。仮データの間は判定を出力するだけで、終了コードには反映しない
 * @param {import('../src/types.js').SkillTree} tree
 * @param {import('../src/types.js').Challenge} challenge
 * @param {readonly (readonly string[])[]} minimumSolutions
 * @param {import('../src/types.js').Build[]} builds 列挙した全ビルド
 */
function verifySequence(tree, challenge, minimumSolutions, builds) {
  const independent = { ...challenge, mode: /** @type {const} */ ('independent') };
  console.log('連戦の検証:');

  for (const enemy of challenge.enemies) {
    const solo = { ...independent, enemies: [enemy] };
    const soloClears = builds.filter((build) => clearsChallenge(build, solo)).length;
    console.log(`- ${enemy.name}が報酬なしで単体で倒せる: ${soloClears > 0 ? 'OK' : 'NG'}（${soloClears} 件）`);
  }

  const withoutRewards = builds.filter((build) => clearsChallenge(build, independent)).length;
  console.log(`- 報酬なしで全員に勝てるビルドが無い: ${withoutRewards === 0 ? 'OK' : 'NG'}（${withoutRewards} 件）`);

  const allOrders = builds.filter(
    (build) => winningOrders(build, challenge).length === factorial(challenge.enemies.length),
  ).length;
  console.log(`- どの順番でも勝てるビルド: ${allOrders} 件（少数が望ましい）`);

  console.log('- 最少 pt の解ごとの勝てる順番:');
  const owned = (/** @type {readonly string[]} */ ids) => new Set([tree.originId, ...ids]);
  for (const solution of minimumSolutions) {
    const ownedIds = owned(solution);
    const build = tree.nodes.filter((node) => ownedIds.has(node.id));
    const orders = winningOrders(build, challenge).map((order) =>
      order.map((index) => challenge.enemies[index].name).join('→'),
    );
    console.log(`  - ${solution.join(', ')}: ${orders.join(' / ')}`);
  }
}

/**
 * ステータス以外の効果を持つノード。路線は、取った能力ノードの組で分ける
 * @param {import('../src/types.js').SkillNode} node
 */
function isAbilityNode(node) {
  return node.effects.some((effect) => effect.type !== 'stat');
}

/**
 * クリアできたビルドを、取った能力ノードの組ごとにまとめる
 * @typedef {{ abilityIds: string[], minimumPoints: number, count: number }} AbilitySet
 */

/**
 * 他にクリアできる組を部分集合に持たない組を、路線として出す。
 * ステータスだけでクリアできると、空の組がすべての組の部分集合になるので、路線は1つになる
 * @param {import('../src/types.js').SkillTree} tree
 * @param {ReadonlyMap<string, AbilitySet>} abilitySets
 */
function reportRoutes(tree, abilitySets) {
  const sets = [...abilitySets.values()];
  const isProperSubset = (/** @type {AbilitySet} */ small, /** @type {AbilitySet} */ large) =>
    small.abilityIds.length < large.abilityIds.length && small.abilityIds.every((id) => large.abilityIds.includes(id));
  const routes = sets
    .filter((set) => !sets.some((other) => isProperSubset(other, set)))
    .sort((a, b) => a.minimumPoints - b.minimumPoints);
  const nameOf = new Map(tree.nodes.map((node) => [node.id, node.name]));

  console.log(`路線: ${routes.length} 件`);
  for (const route of routes) {
    const names = route.abilityIds.length === 0 ? '（ステータスのみ）' : route.abilityIds.map((id) => nameOf.get(id)).join('・');
    console.log(`- ${names}: 最少 ${route.minimumPoints} pt（${route.count} 件）`);
  }
  console.log(`- 路線が2つ以上: ${routes.length >= MIN_ROUTES ? 'OK' : 'NG'}`);
  const hasDisjointPair = routes.some((a, index) =>
    routes.slice(index + 1).some((b) => a.abilityIds.every((id) => !b.abilityIds.includes(id))),
  );
  console.log(`- 能力を共有しない2路線がある: ${hasDisjointPair ? 'OK' : 'NG'}`);
}

/** @param {number} n */
function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

/**
 * @param {import('../src/types.js').SkillTree} tree
 * @param {import('../src/types.js').Challenge} challenge
 */
function verify(tree, challenge) {
  console.log(`## ${challenge.name}（${challenge.id}）配布 ${challenge.points} pt`);

  const startedAt = performance.now();
  let enumerated = 0;
  let cleared = 0;
  /** @type {import('../src/types.js').Build[]} */
  const builds = [];
  let minimumPoints = Infinity;
  /** @type {string[][]} 最少 pt の解。起点を除いたノード ID */
  let minimumSolutions = [];
  /** @type {Map<string, AbilitySet>} 能力ノードの組（ID を , で繋いだもの）ごとの集計 */
  const abilitySets = new Map();
  for (const ids of enumerateBuilds(tree, challenge.points)) {
    enumerated++;
    // 列挙は取得順に返す。ローテーションは定義順で回るので、ツリーの定義順に並べ直す
    const owned = new Set(ids);
    const build = tree.nodes.filter((node) => owned.has(node.id));
    if (challenge.mode === 'sequence') {
      builds.push(build);
    }
    if (!clearsChallenge(build, challenge)) {
      continue;
    }
    cleared++;
    const acquired = ids.slice(1);
    const abilityIds = build.filter(isAbilityNode).map((node) => node.id);
    const key = abilityIds.join(',');
    const abilitySet = abilitySets.get(key);
    if (abilitySet === undefined) {
      abilitySets.set(key, { abilityIds, minimumPoints: acquired.length, count: 1 });
    } else {
      abilitySet.minimumPoints = Math.min(abilitySet.minimumPoints, acquired.length);
      abilitySet.count++;
    }
    if (acquired.length < minimumPoints) {
      minimumPoints = acquired.length;
      minimumSolutions = [];
    }
    if (acquired.length === minimumPoints) {
      minimumSolutions.push(acquired);
    }
  }
  const elapsed = performance.now() - startedAt;

  console.log(`列挙したビルド: ${enumerated} 件（${elapsed.toFixed(0)} ms）`);
  // 起点だけのビルドは必ず出るので、0件なら列挙側のバグ
  if (enumerated === 0) {
    console.log('エラー: ビルドを1件も列挙できなかった（列挙のバグ）');
    process.exitCode = 1;
    return;
  }
  if (cleared === 0) {
    console.log('クリアできるビルド: 0 件（このお題は解けない）');
    if (challenge.mode === 'sequence') {
      verifySequence(tree, challenge, [], builds);
    }
    return;
  }
  console.log(`クリアできるビルド: ${cleared} 件`);
  console.log(`最少クリア pt: ${minimumPoints}`);
  console.log(`最少 pt での解: ${minimumSolutions.length} 件`);
  for (const solution of minimumSolutions) {
    console.log(`- ${solution.length === 0 ? '（起点のみ）' : solution.join(', ')}`);
  }
  reportRoutes(tree, abilitySets);
  if (challenge.mode === 'sequence') {
    verifySequence(tree, challenge, minimumSolutions, builds);
  }
}

for (const character of CHARACTERS) {
  console.log(`# ${character.name}（${character.id}）`);
  console.log();
  for (const challenge of character.challenges) {
    verify(character.tree, challenge);
    console.log();
  }
}
