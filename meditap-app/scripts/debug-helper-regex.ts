import {
  epicSectionHeaderRegex,
  findEpicSectionHits,
} from '../src/intake/epicMyHealthSummaryToc';

const sample =
  'McEvoy, M.D., Ph.D. Allergies - as of 08/07/2026 Active Allergy Reactions Criticality';

const re = epicSectionHeaderRegex('Allergies', true);
console.log('helper source', re.source);
re.lastIndex = 0;
let m: RegExpExecArray | null;
while ((m = re.exec(sample))) {
  console.log('helper exec', {
    index: m.index,
    g0: m[0],
    g1: m[1],
    g2: m[2],
  });
}

console.log('find hits', findEpicSectionHits(sample, 'Allergies'));
