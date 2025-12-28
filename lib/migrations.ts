// lib/migrations.ts
// Database migration runner with tracking and rollback support

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase/migrations");

export interface Migration {
  name: string;
  content: string;
  checksum: string;
}

export interface MigrationRecord {
  id: number;
  name: string;
  applied_at: string;
  checksum: string;
  execution_time_ms: number | null;
  success: boolean;
  error_message: string | null;
}

export interface MigrationResult {
  success: boolean;
  applied: string[];
  failed: string[];
  skipped: string[];
  errors: Array<{ migration: string; error: string }>;
}

/**
 * Calculate SHA-256 checksum of migration content
 */
function calculateChecksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Get Supabase client from environment variables
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Read all migration files from the migrations directory
 */
export async function readMigrations(): Promise<Migration[]> {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = files
      .filter((f) => f.endsWith(".sql"))
      .sort(); // Alphabetical order (e.g., 001_, 002_, etc.)

    const migrations: Migration[] = [];

    for (const file of sqlFiles) {
      const content = await fs.readFile(
        path.join(MIGRATIONS_DIR, file),
        "utf-8"
      );
      migrations.push({
        name: file,
        content,
        checksum: calculateChecksum(content),
      });
    }

    return migrations;
  } catch (error) {
    throw new Error(
      `Failed to read migrations: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get applied migrations from the database
 */
export async function getAppliedMigrations(): Promise<MigrationRecord[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("_migrations")
    .select("*")
    .order("applied_at", { ascending: true });

  if (error) {
    // If table doesn't exist yet, return empty array
    if (error.message.includes("does not exist")) {
      return [];
    }
    throw new Error(`Failed to fetch migrations: ${error.message}`);
  }

  return (data || []) as MigrationRecord[];
}

/**
 * Check if migrations table exists
 */
export async function migrationTableExists(): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("_migrations").select("id").limit(1);

  return !error || !error.message.includes("does not exist");
}

/**
 * Mark a migration as applied (interactive mode)
 * Shows the SQL and waits for user to confirm they ran it manually
 */
async function runMigration(
  migration: Migration,
  dryRun: boolean = false
): Promise<{ success: boolean; executionTimeMs: number; error?: string }> {
  const supabase = getSupabaseClient();
  const startTime = Date.now();

  try {
    if (dryRun) {
      console.log(`[DRY RUN] Would show migration: ${migration.name}`);
      return { success: true, executionTimeMs: 0 };
    }

    // Display the migration SQL
    console.log(`\n${"=".repeat(70)}`);
    console.log(`📝 Migration: ${migration.name}`);
    console.log("=".repeat(70));
    console.log("\n🔗 COPY THE SQL BELOW AND RUN IN SUPABASE SQL EDITOR:");
    console.log(`   https://supabase.com/dashboard/project/houteunrytkvhrmagjrg/sql\n`);
    console.log(migration.content);
    console.log("\n" + "=".repeat(70));

    // Wait for user confirmation (interactive terminal)
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      readline.question(
        "\n✅ Did you run this migration successfully in Supabase? (yes/no): ",
        (ans: string) => {
          readline.close();
          resolve(ans.toLowerCase().trim());
        }
      );
    });

    if (answer !== "yes" && answer !== "y") {
      throw new Error("Migration skipped by user");
    }

    const executionTimeMs = Date.now() - startTime;

    // Record successful migration
    await supabase.from("_migrations").insert({
      name: migration.name,
      checksum: migration.checksum,
      execution_time_ms: executionTimeMs,
      success: true,
    });

    console.log(`✓ Marked ${migration.name} as applied`);

    return { success: true, executionTimeMs };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    // Don't record skipped migrations
    if (errorMessage.includes("skipped")) {
      console.log(`⊗ Skipped ${migration.name}`);
      return { success: false, executionTimeMs, error: errorMessage };
    }

    // Record failed migration
    if (!dryRun) {
      await supabase.from("_migrations").insert({
        name: migration.name,
        checksum: migration.checksum,
        execution_time_ms: executionTimeMs,
        success: false,
        error_message: errorMessage,
      });
    }

    return { success: false, executionTimeMs, error: errorMessage };
  }
}

/**
 * Run pending migrations
 */
export async function runMigrations(options: {
  dryRun?: boolean;
  target?: string; // Run up to specific migration
} = {}): Promise<MigrationResult> {
  const { dryRun = false, target } = options;

  const result: MigrationResult = {
    success: true,
    applied: [],
    failed: [],
    skipped: [],
    errors: [],
  };

  try {
    // Read all migration files
    const migrations = await readMigrations();

    if (migrations.length === 0) {
      console.log("No migrations found");
      return result;
    }

    // Check if migrations table exists
    const tableExists = await migrationTableExists();

    // Get already applied migrations
    const appliedMigrations = tableExists ? await getAppliedMigrations() : [];
    const appliedNames = new Set(
      appliedMigrations.filter((m) => m.success).map((m) => m.name)
    );

    // Filter pending migrations
    let pendingMigrations = migrations.filter(
      (m) => !appliedNames.has(m.name)
    );

    // If target specified, only run up to that migration
    if (target) {
      const targetIndex = pendingMigrations.findIndex((m) => m.name === target);
      if (targetIndex === -1) {
        throw new Error(`Target migration not found: ${target}`);
      }
      pendingMigrations = pendingMigrations.slice(0, targetIndex + 1);
    }

    if (pendingMigrations.length === 0) {
      console.log("All migrations already applied");
      return result;
    }

    console.log(
      `Found ${pendingMigrations.length} pending migration(s)${
        dryRun ? " (DRY RUN)" : ""
      }`
    );

    // Run each pending migration
    for (const migration of pendingMigrations) {
      console.log(`\nRunning migration: ${migration.name}`);

      const migrationResult = await runMigration(migration, dryRun);

      if (migrationResult.success) {
        console.log(
          `✓ Success (${migrationResult.executionTimeMs}ms)${
            dryRun ? " [DRY RUN]" : ""
          }`
        );
        result.applied.push(migration.name);
      } else {
        console.error(`✗ Failed: ${migrationResult.error}`);
        result.failed.push(migration.name);
        result.errors.push({
          migration: migration.name,
          error: migrationResult.error || "Unknown error",
        });
        result.success = false;

        // Stop on first failure
        console.error("\nStopping due to migration failure");
        break;
      }
    }

    // Verify checksums for applied migrations
    for (const applied of appliedMigrations.filter((m) => m.success)) {
      const migration = migrations.find((m) => m.name === applied.name);
      if (migration && migration.checksum !== applied.checksum) {
        console.warn(
          `⚠️  Warning: Migration ${applied.name} has been modified since it was applied`
        );
      }
    }
  } catch (error) {
    console.error(
      "Migration error:",
      error instanceof Error ? error.message : error
    );
    result.success = false;
    result.errors.push({
      migration: "SYSTEM",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
  total: number;
  applied: number;
  pending: number;
  migrations: Array<{
    name: string;
    status: "applied" | "pending" | "failed";
    appliedAt?: string;
    executionTime?: number;
    error?: string;
  }>;
}> {
  const migrations = await readMigrations();
  const tableExists = await migrationTableExists();
  const appliedMigrations = tableExists ? await getAppliedMigrations() : [];

  const appliedMap = new Map(appliedMigrations.map((m) => [m.name, m]));

  const status = migrations.map((m) => {
    const applied = appliedMap.get(m.name);

    if (applied) {
      return {
        name: m.name,
        status: applied.success ? ("applied" as const) : ("failed" as const),
        appliedAt: applied.applied_at,
        executionTime: applied.execution_time_ms || undefined,
        error: applied.error_message || undefined,
      };
    }

    return {
      name: m.name,
      status: "pending" as const,
    };
  });

  const appliedCount = status.filter((s) => s.status === "applied").length;

  return {
    total: migrations.length,
    applied: appliedCount,
    pending: migrations.length - appliedCount,
    migrations: status,
  };
}

/**
 * Rollback last migration (dangerous!)
 */
export async function rollbackLastMigration(): Promise<{
  success: boolean;
  migration?: string;
  error?: string;
}> {
  const supabase = getSupabaseClient();

  try {
    // Get last applied migration
    const { data, error } = await supabase
      .from("_migrations")
      .select("*")
      .eq("success", true)
      .order("applied_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return { success: false, error: "No migrations to rollback" };
    }

    const lastMigration = data[0] as MigrationRecord;

    console.warn(`⚠️  Rolling back migration: ${lastMigration.name}`);
    console.warn("This operation cannot be undone!");

    // Delete migration record
    const { error: deleteError } = await supabase
      .from("_migrations")
      .delete()
      .eq("id", lastMigration.id);

    if (deleteError) throw deleteError;

    console.log(
      `✓ Rolled back ${lastMigration.name} - YOU MUST MANUALLY REVERSE THE DATABASE CHANGES!`
    );

    return { success: true, migration: lastMigration.name };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
