// Seed script to create Stripe products and prices for ALEIC modules
// Run this script once to set up the module products in Stripe:
// npx tsx server/seed-module-products.ts

import { getUncachableStripeClient } from "./stripeClient.js";

const MODULES = [
  {
    slug: "chores",
    name: "Chores App",
    description: "Track and manage household chores together. Assign tasks, set schedules, and celebrate when chores are done.",
  },
  {
    slug: "ifs",
    name: "IFS App",
    description: "Internal Family Systems exercises for deeper self-understanding and partner connection.",
  },
  {
    slug: "conflict-resolution",
    name: "Conflict Resolution",
    description: "Guided tools and exercises for navigating disagreements constructively.",
  },
];

// Pricing: $5/month or $50/year
const MONTHLY_PRICE = 500; // $5.00 in cents
const YEARLY_PRICE = 5000; // $50.00 in cents

async function seedProducts() {
  console.log("Starting Stripe product seeding...");
  
  const stripe = await getUncachableStripeClient();

  for (const module of MODULES) {
    console.log(`\nProcessing module: ${module.name}`);

    // Check if product already exists
    const existingProducts = await stripe.products.search({
      query: `metadata['module_slug']:'${module.slug}'`,
    });

    let product;
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`  Product already exists: ${product.id}`);
    } else {
      // Create product
      product = await stripe.products.create({
        name: module.name,
        description: module.description,
        metadata: {
          module_slug: module.slug,
          type: "module",
        },
      });
      console.log(`  Created product: ${product.id}`);
    }

    // Check/create monthly price
    const monthlyPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    });

    const existingMonthly = monthlyPrices.data.find(
      p => p.recurring?.interval === "month" && p.unit_amount === MONTHLY_PRICE
    );
    const existingYearly = monthlyPrices.data.find(
      p => p.recurring?.interval === "year" && p.unit_amount === YEARLY_PRICE
    );

    if (!existingMonthly) {
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: MONTHLY_PRICE,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: {
          module_slug: module.slug,
          interval: "month",
        },
      });
      console.log(`  Created monthly price: ${monthlyPrice.id} ($${MONTHLY_PRICE / 100}/mo)`);
    } else {
      console.log(`  Monthly price exists: ${existingMonthly.id}`);
    }

    if (!existingYearly) {
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: YEARLY_PRICE,
        currency: "usd",
        recurring: { interval: "year" },
        metadata: {
          module_slug: module.slug,
          interval: "year",
        },
      });
      console.log(`  Created yearly price: ${yearlyPrice.id} ($${YEARLY_PRICE / 100}/yr)`);
    } else {
      console.log(`  Yearly price exists: ${existingYearly.id}`);
    }
  }

  console.log("\n✅ Stripe product seeding complete!");
}

seedProducts().catch(console.error);
