#!/usr/bin/env tsx
// scripts/migrate.ts
// CLI tool for running database migrations

import "dotenv/config";
import {
  runMigrations,
  getMigrationStatus,
  rollbackLastMigration,
} from "../lib/migrations";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "up";

  console.log("🗄️  Album Club - Database Migration Tool\n");

  try {
    switch (command) {
      case "up":
        {
          // Run all pending migrations
          const dryRun = args.includes("--dry-run");
          const target = args.find((a) => a.startsWith("--target="))?.split("=")[1];

          console.log("Running migrations...\n");
          const result = await runMigrations({ dryRun, target });

          console.log("\n" + "=".repeat(50));
          console.log("Migration Summary:");
          console.log("=".repeat(50));
          console.log(`Applied: ${result.applied.length}`);
          console.log(`Failed: ${result.failed.length}`);
          console.log(`Skipped: ${result.skipped.length}`);

          if (result.errors.length > 0) {
            console.log("\nErrors:");
            result.errors.forEach((e) => {
              console.log(`  ${e.migration}: ${e.error}`);
            });
          }

          process.exit(result.success ? 0 : 1);
        }
        break;

      case "status":
        {
          // Show migration status
          const status = await getMigrationStatus();

          console.log("Migration Status:");
          console.log("=".repeat(50));
          console.log(`Total: ${status.total}`);
          console.log(`Applied: ${status.applied}`);
          console.log(`Pending: ${status.pending}`);
          console.log();

          status.migrations.forEach((m) => {
            const icon =
              m.status === "applied"
                ? "✓"
                : m.status === "failed"
                ? "✗"
                : "○";
            const statusText = m.status.toUpperCase().padEnd(8);

            let line = `${icon} [${statusText}] ${m.name}`;

            if (m.appliedAt) {
              line += ` (${new Date(m.appliedAt).toLocaleString()})`;
            }
            if (m.executionTime) {
              line += ` ${m.executionTime}ms`;
            }

            console.log(line);

            if (m.error) {
              console.log(`           Error: ${m.error}`);
            }
          });

          process.exit(0);
        }
        break;

      case "rollback":
        {
          // Rollback last migration
          console.log("⚠️  WARNING: This will mark the last migration as not applied.");
          console.log("You must MANUALLY reverse the database changes!\n");

          const result = await rollbackLastMigration();

          if (result.success) {
            console.log(`\n✓ Rolled back: ${result.migration}`);
            console.log("\n⚠️  IMPORTANT: Manually reverse the database changes!");
            process.exit(0);
          } else {
            console.error(`\n✗ Rollback failed: ${result.error}`);
            process.exit(1);
          }
        }
        break;

      case "help":
      default:
        {
          console.log("Usage: npm run migrate [command] [options]\n");
          console.log("Commands:");
          console.log("  up              Run all pending migrations (default)");
          console.log("  status          Show migration status");
          console.log("  rollback        Rollback last migration (DANGEROUS)");
          console.log("  help            Show this help message");
          console.log("\nOptions:");
          console.log("  --dry-run       Show what would be executed without running");
          console.log("  --target=NAME   Run migrations up to specific file");
          console.log("\nExamples:");
          console.log("  npm run migrate");
          console.log("  npm run migrate up");
          console.log("  npm run migrate up -- --dry-run");
          console.log("  npm run migrate up -- --target=003_add_reviews.sql");
          console.log("  npm run migrate status");
          console.log("  npm run migrate rollback");

          process.exit(0);
        }
        break;
    }
  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
