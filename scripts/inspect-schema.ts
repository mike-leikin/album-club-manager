// scripts/inspect-schema.ts
// Run this script to inspect the current Supabase schema

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectSchema() {
  console.log('🔍 Inspecting Supabase schema...\n');

  // Query to get all tables in the public schema
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');

  if (tablesError) {
    console.error('❌ Error fetching tables:', tablesError);

    // Try a different approach - query known tables
    console.log('\n📋 Trying to inspect known tables...\n');

    const knownTables = ['weeks', 'participants', 'reviews', 'album_picks', 'rounds'];

    for (const tableName of knownTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!error) {
        console.log(`✅ Table "${tableName}" exists`);
        if (data && data.length > 0) {
          console.log('   Sample columns:', Object.keys(data[0]).join(', '));
        }
      } else if (error.code === '42P01') {
        console.log(`❌ Table "${tableName}" does not exist`);
      } else {
        console.log(`⚠️  Table "${tableName}" - error:`, error.message);
      }
    }

    return;
  }

  if (!tables || tables.length === 0) {
    console.log('⚠️  No tables found in public schema');
    return;
  }

  console.log(`Found ${tables.length} tables:\n`);

  // For each table, get a sample row to see the columns
  for (const table of tables) {
    const tableName = (table as any).table_name;
    console.log(`\n📊 Table: ${tableName}`);

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`   ❌ Error querying: ${error.message}`);
    } else if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`   Columns (${columns.length}): ${columns.join(', ')}`);
      console.log('   Sample row:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('   (empty table)');
    }
  }
}

inspectSchema()
  .then(() => {
    console.log('\n✅ Schema inspection complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
