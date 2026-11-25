import disposableDomains from "./disposable-domains.json";

// Refresh the list with `npm run update:disposable-domains`.
const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set(disposableDomains);

/**
 * True if the email's domain, or any parent domain, is a known
 * disposable/temporary inbox provider (e.g. "x@dvdee.com" or
 * "x@mail.dvdee.com"). Expects an already-validated email.
 */
export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;

  const labels = email.slice(at + 1).trim().toLowerCase().replace(/\.$/, "").split(".");

  // Check "a.b.c.com", "b.c.com", "c.com" (never the bare TLD)
  for (let i = 0; i < labels.length - 1; i++) {
    if (DISPOSABLE_DOMAINS.has(labels.slice(i).join("."))) {
      return true;
    }
  }
  return false;
}
