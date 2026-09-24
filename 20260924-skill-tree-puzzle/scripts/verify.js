// お題ごとに、配布 pt で組めるビルドを総当たりして解の分布を出力する
// 使い方: node 20260924-skill-tree-puzzle/scripts/verify.js

import { TREE } from '../src/data/tree.js';
import { CHALLENGES } from '../src/data/challenges.js';
import { enumerateBuilds } from '../src/core/enumerate.js';
import { simulate } from '../src/core/simulate.js';

const nodesById = new Map(TREE.nodes.map((node) => [node.id, node]));

/** @param {import('../src/types.js').Challenge} challenge */
function verify(challenge) {
  console.log(`## ${challenge.name}（${challenge.id}）配布 ${challenge.points} pt`);

  const startedAt = performance.now();
  let enumerated = 0;
  let cleared = 0;
  let minimumPoints = Infinity;
  /** @type {string[][]} 最少 pt の解。起点を除いたノード ID */
  let minimumSolutions = [];
  for (const ids of enumerateBuilds(TREE, challenge.points)) {
    enumerated++;
    const build = ids.map((id) => nodesById.get(id));
    if (simulate(build, challenge).result !== 'win') {
      continue;
    }
    cleared++;
    const acquired = ids.slice(1);
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
    return;
  }
  console.log(`クリアできるビルド: ${cleared} 件`);
  console.log(`最少クリア pt: ${minimumPoints}`);
  console.log(`最少 pt での解: ${minimumSolutions.length} 件`);
  for (const solution of minimumSolutions) {
    console.log(`- ${solution.length === 0 ? '（起点のみ）' : solution.join(', ')}`);
  }
}

for (const challenge of CHALLENGES) {
  verify(challenge);
  console.log();
}
