#!/usr/bin/env bash
# Prevent deployment when the Tab14 repeater accordion is accidentally removed.
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
TSX="$ROOT/meditap-app/src/pages/Tab14.tsx"
CSS="$ROOT/meditap-app/src/pages/Tab14.css"

fail() {
  echo "Accordion guard failed: $1" >&2
  exit 1
}

[[ -f "$TSX" ]] || fail "missing $TSX"
[[ -f "$CSS" ]] || fail "missing $CSS"

grep -qF "function Tab14RepeaterAccordion" "$TSX" ||
  fail "Tab14RepeaterAccordion component is missing"
grep -qF "<Tab14RepeaterAccordion" "$TSX" ||
  fail "repeater sections do not use Tab14RepeaterAccordion"
grep -qF "Expand all" "$TSX" ||
  fail "Expand all control is missing"
grep -qF "Collapse all" "$TSX" ||
  fail "Collapse all control is missing"
grep -qF ".tab14-repeater-accordion" "$CSS" ||
  fail "accordion CSS is missing"

for section in allergy medication chronic hospitalVisit labResult; do
  grep -qF "sectionKey=\"$section\"" "$TSX" ||
    fail "$section section is not protected by the accordion"
done

if grep -qE '<h3>Medication|<h3>Allergy|<h3>Chronic Conditions|<h3>Hospital Visit' "$TSX"; then
  fail "a repeater section has reverted to the legacy flat heading layout"
fi

echo "Tab14 accordion guard passed."
