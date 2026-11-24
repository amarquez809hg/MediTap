import {
  epicTocSearchableTitles,
  findEpicSectionHits,
} from '../src/intake/epicMyHealthSummaryToc';

const sample = 'McEvoy, M.D., Ph.D. Allergies - as of 08/07/2026 Active Allergy Reactions Criticality';

const titles = epicTocSearchableTitles().filter((t) => /allerg/i.test(t.tocTitle));
console.log('searchable', titles);

const needle = 'Allergies'.trim().toLowerCase();
const targets = epicTocSearchableTitles().filter((t) => {
  if (t.tocTitle.toLowerCase() === needle || t.key.toLowerCase() === needle) {
    return t.searchTitle.toLowerCase() === t.tocTitle.toLowerCase();
  }
  return t.searchTitle.toLowerCase() === needle;
});
console.log('targets', targets);

console.log('hits', findEpicSectionHits(sample, 'Allergies'));
console.log('hits allergies key', findEpicSectionHits(sample, 'allergies'));
