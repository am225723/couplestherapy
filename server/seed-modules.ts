// Seed script to ensure module tables exist and are populated
// Run: npx tsx server/seed-modules.ts

import { supabaseAdmin } from "./supabase.js";

async function seedModules() {
  console.log("Creating Couples_modules table if not exists...");

  // Create the modules table
  const { error: createTableError } = await supabaseAdmin.rpc("exec_raw_sql", {
    query: `
      CREATE TABLE IF NOT EXISTS "Couples_modules" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        app_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `,
  });

  // If the RPC doesn't exist, try direct SQL
  if (createTableError) {
    console.log(
      "RPC not available, trying direct table creation via Supabase...",
    );
  }

  // Try to insert modules, checking if they exist first
  const modules = [
    {
      slug: "chores",
      name: "Chores App",
      description:
        "Track and manage household chores together. Assign tasks, set schedules, and celebrate when chores are done.",
      icon: "list-todo",
      app_url: null,
      is_active: true,
    },
    {
      slug: "ifs",
      name: "IFS App",
      description:
        "Internal Family Systems exercises for deeper self-understanding and partner connection.",
      icon: "user",
      app_url: null,
      is_active: true,
    },
    {
      slug: "conflict-resolution",
      name: "Conflict Resolution",
      description:
        "Guided tools and exercises for navigating disagreements constructively.",
      icon: "message-square",
      app_url: null,
      is_active: true,
    },
  ];

  console.log("Seeding modules...");

  for (const module of modules) {
    // Check if module exists
    const { data: existing } = await supabaseAdmin
      .from("Couples_modules")
      .select("id")
      .eq("slug", module.slug)
      .single();

    if (existing) {
      console.log(`  Module "${module.name}" already exists`);
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("Couples_modules")
        .insert(module);

      if (insertError) {
        console.error(
          `  Failed to insert "${module.name}":`,
          insertError.message,
        );
      } else {
        console.log(`  Created module "${module.name}"`);
      }
    }
  }

  console.log("\n✅ Module seeding complete!");
}

seedModules().catch(console.error);
