import { findEpicSectionHits } from '../src/intake/epicMyHealthSummaryToc';

const sample = 'McEvoy, M.D., Ph.D. Allergies - as of 08/07/2026 Active Allergy Reactions';
const title = 'Allergies';
const rest = '[^\\n]*';
const re = new RegExp(
  `(?:(?:^|\\n)([ \\t]*${title}\\b${rest})|(?<=[^A-Za-z\\n])(${title}\\s*-\\s*(?:as of|documented)\\b${rest}))`,
  'gi'
);
console.log('source', re.source);
console.log('match', sample.match(re));
re.lastIndex = 0;
let m: RegExpExecArray | null;
while ((m = re.exec(sample))) console.log('exec', m.index, JSON.stringify(m[1]), JSON.stringify(m[2]));

console.log('hits on sample', findEpicSectionHits(sample, 'Allergies').length);
console.log(
  'hits detail',
  findEpicSectionHits(sample, 'Allergies').map((h) => ({ kind: h.kind, start: h.startIndex }))
);

const documented =
  'foo bar Allergies - documented as of this encounter (statuses as of 08/07/2026) Active';
console.log('documented hits', findEpicSectionHits(documented, 'Allergies'));
