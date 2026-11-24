/**
 * Refreshes lib/auth/disposable-domains.json from the community-maintained
 * blocklist at https://github.com/disposable-email-domains/disposable-email-domains
 *
 * That list is deliberately conservative (it excludes providers that also
 * offer real, permanent mailboxes), which keeps false positives low.
 *
 * Usage: npm run update:disposable-domains
 */
import fs from "fs/promises";
import path from "path";

const SOURCE_URL =
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf";
const OUTPUT = path.join(process.cwd(), "lib/auth/disposable-domains.json");
const DOMAIN_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/;
// Guard against a truncated or broken download wiping out the list.
const MIN_EXPECTED = 5000;

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Failed to download blocklist: HTTP ${res.status}`);
  }

  const domains = [
    ...new Set(
      (await res.text())
        .split("\n")
        .map((line) => line.trim().toLowerCase())
        .filter((line) => line && !line.startsWith("#") && DOMAIN_RE.test(line))
    ),
  ].sort();

  if (domains.length < MIN_EXPECTED) {
    throw new Error(
      `Only ${domains.length} domains parsed (expected >= ${MIN_EXPECTED}); refusing to overwrite.`
    );
  }

  await fs.writeFile(OUTPUT, JSON.stringify(domains, null, 0).replace(/","/g, '",\n"') + "\n");
  console.log(`Wrote ${domains.length} domains to ${path.relative(process.cwd(), OUTPUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
