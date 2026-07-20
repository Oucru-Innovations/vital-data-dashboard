/**
 * Shared helpers for deriving ward/site organization codes from FHIR
 * managingOrganization references (e.g. "Organization/WardHTDED") and for
 * mapping a raw ward code/string to its parent site.
 *
 * Consolidated from duplicated logic previously in TrackingCurrent.jsx and
 * TrackingHistory.jsx.
 */

// Known site prefixes embedded in ward codes, e.g. "HTDED" -> "HTD", "NTTHED" -> "NTTH"
const KNOWN_SITE_CODES = /(HTD|NHTD|TVH|NTTH)/;

/**
 * Extract ward code from managingOrganization reference
 * @param {Object} subject - The subject Patient resource
 * @returns {string|null} The ward code, or null if not present
 */
export const extractWardCode = (subject) => {
  const orgRef = subject?.managingOrganization?.reference || '';
  // Extract ward code from "Organization/WardHTDED" or "Organization/HTDED" format
  const match = orgRef.match(/Organization\/(?:Ward)?(.+)/);
  return match ? match[1] : null;
};

/**
 * Map a raw ward code (e.g. "WardHTDED", "HTDED") to its parent site code
 * (e.g. "HTD"), using the known site-code patterns. Returns null if no known
 * site prefix is found within the ward code.
 * @param {string} wardCode
 * @returns {string|null}
 */
export const wardCodeToSite = (wardCode) => {
  if (!wardCode) return null;
  const match = String(wardCode).match(KNOWN_SITE_CODES);
  return match ? match[1] : null;
};

/**
 * Extract site (hospital) code from managingOrganization reference.
 * Site is derived from the ward organization reference.
 *
 * Organization reference format: "Organization/WardXXXYY"
 * Where XXX = site/hospital code (e.g., "HTD", "NTTH")
 *       YY = ward code within that site (e.g., "ED" = Emergency Department)
 *
 * @param {Object} subject - The subject Patient resource
 * @returns {string} The site code or "Unknown"
 */
export const extractSiteCode = (subject) => {
  const orgRef = subject?.managingOrganization?.reference || '';

  // Extract ward code from "Organization/WardXXXYY" format
  const wardMatch = orgRef.match(/Organization\/Ward(.+)/i);
  if (wardMatch) {
    const site = wardCodeToSite(wardMatch[1]);
    if (site) return site;
  }

  // Fallback: Try to get from "Organization/SiteXXX" format
  const siteMatch = orgRef.match(/Organization\/Site([A-Z0-9]+)/i);
  if (siteMatch) {
    return siteMatch[1];
  }

  // Last fallback: Try organization display name if available
  const orgDisplay = subject?.managingOrganization?.display;
  if (orgDisplay) {
    return orgDisplay;
  }

  return 'Unknown';
};
