/**
 * Converts any user input into a valid Firebase project ID.
 * Rules: lowercase, alphanumeric + hyphens, must start with a letter,
 * no consecutive hyphens, no trailing hyphens, max 30 chars.
 */
export function toProjectId(input) {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9-]/g, '-')                      // non-valid chars → hyphen
    .replace(/-+/g, '-')                               // collapse consecutive hyphens
    .replace(/^[^a-z]+/, '')                           // must start with a letter
    .replace(/-+$/, '')                                // no trailing hyphens
    .slice(0, 30);
}
