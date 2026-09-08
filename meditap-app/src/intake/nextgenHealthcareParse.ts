/**
 * NextGen Healthcare portal / CCD-style exports — detector stub.
 * Full dialect parsers land after fixture analysis (same training loop as Athena/Meditech).
 */

import { collapseWs } from './intakeFieldLabels';

/**
 * Conservative detector for NextGen-branded continuity / patient summary PDFs.
 * Returns false until we lock real fixtures — selection still routes here so
 * preferred-vendor mode does not accidentally run Athena/Meditech/Epic.
 */
export function isNextGenHealthcareDocument(text: string): boolean {
  const flat = collapseWs(text);
  if (!/NextGen/i.test(flat)) return false;
  return /NextGen\s+Healthcare|NextGen\s+Enterprise|NextGen\s+Office|NextGen\s+Patient\s+Portal/i.test(
    flat
  );
}
