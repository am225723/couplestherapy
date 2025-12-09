// Module Subscription Routes for ALEIC
// Handles module catalog, checkout, subscription management

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient.js";
import { supabaseAdmin } from "../supabase.js";
import crypto from "crypto";

const router = Router();

// Client-side Supabase for user auth verification
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

// Helper to get user from auth header
async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// GET /api/modules - List all available modules with user's subscription status
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = await getUserFromRequest(req);
    
    // Get all active modules
    const { data: modules, error: modulesError } = await supabaseAdmin
      .from("Couples_modules")
      .select("id, slug, name, description, icon, app_url")
      .eq("is_active", true)
      .order("slug");

    if (modulesError) throw modulesError;

    // If user is authenticated, get their subscription status
    let userSubscriptions: any[] = [];
    if (user) {
      const { data: subs, error: subsError } = await supabaseAdmin
        .from("Couples_module_subscriptions")
        .select("module_id, status, current_period_end, cancel_at_period_end")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"]);

      if (!subsError && subs) {
        userSubscriptions = subs;
      }
    }

    // Get pricing from Stripe products
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 100 });
    const prices = await stripe.prices.list({ active: true, limit: 100 });

    // Build response with subscription status and pricing
    const modulesWithStatus = (modules || []).map((mod: any) => {
      const subscription = userSubscriptions.find(s => s.module_id === mod.id);
      const product = products.data.find(p => p.metadata?.module_slug === mod.slug);
      const modulesPrices = product 
        ? prices.data.filter(p => p.product === product.id)
        : [];

      return {
        ...mod,
        is_subscribed: !!subscription,
        subscription_status: subscription?.status || null,
        subscription_ends_at: subscription?.current_period_end || null,
        cancel_at_period_end: subscription?.cancel_at_period_end || false,
        stripe_product_id: product?.id || null,
        prices: modulesPrices.map(p => ({
          id: p.id,
          unit_amount: p.unit_amount,
          currency: p.currency,
          interval: p.recurring?.interval || 'one_time',
        })),
      };
    });

    res.json({ modules: modulesWithStatus });
  } catch (error: any) {
    console.error("Error fetching modules:", error);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

// GET /api/modules/stripe-key - Get Stripe publishable key
router.get("/stripe-key", async (_req: Request, res: Response) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (error: any) {
    console.error("Error getting Stripe key:", error);
    res.status(500).json({ error: "Failed to get Stripe configuration" });
  }
});

// POST /api/modules/:moduleSlug/checkout - Create checkout session for a module
router.post("/:moduleSlug/checkout", async (req: Request, res: Response) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { moduleSlug } = req.params;
    const { priceId } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: "Price ID is required" });
    }

    // Get the module
    const { data: moduleData, error: moduleError } = await supabaseAdmin
      .from("Couples_modules")
      .select("id, slug, name")
      .eq("slug", moduleSlug)
      .eq("is_active", true)
      .single();

    if (moduleError || !moduleData) {
      return res.status(404).json({ error: "Module not found" });
    }

    // Check if user already has an active subscription for this module
    const { data: existingSub } = await supabaseAdmin
      .from("Couples_module_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("module_id", moduleData.id)
      .in("status", ["active", "trialing"])
      .limit(1);

    if (existingSub && existingSub.length > 0) {
      return res.status(400).json({ error: "You already have an active subscription for this module" });
    }

    const stripe = await getUncachableStripeClient();

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined;
    
    // Check if user has existing subscription with customer ID
    const { data: existingCustomer } = await supabaseAdmin
      .from("Couples_module_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .limit(1);

    if (existingCustomer && existingCustomer.length > 0 && existingCustomer[0].stripe_customer_id) {
      stripeCustomerId = existingCustomer[0].stripe_customer_id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Get the host for redirect URLs
    const host = req.headers.host || "localhost:5000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/modules?success=true&module=${moduleSlug}`,
      cancel_url: `${baseUrl}/modules?canceled=true&module=${moduleSlug}`,
      metadata: {
        user_id: user.id,
        module_id: moduleData.id,
        module_slug: moduleSlug,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          module_id: moduleData.id,
          module_slug: moduleSlug,
        },
      },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// GET /api/modules/subscriptions - Get user's active subscriptions
router.get("/subscriptions", async (req: Request, res: Response) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { data: subscriptions, error } = await supabaseAdmin
      .from("Couples_module_subscriptions")
      .select(`
        id,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        stripe_subscription_id,
        module:Couples_modules (
          id,
          slug,
          name,
          description,
          icon,
          app_url
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Flatten the response
    const flatSubscriptions = (subscriptions || []).map((sub: any) => ({
      id: sub.id,
      status: sub.status,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
      stripe_subscription_id: sub.stripe_subscription_id,
      module_id: sub.module?.id,
      slug: sub.module?.slug,
      name: sub.module?.name,
      description: sub.module?.description,
      icon: sub.module?.icon,
      app_url: sub.module?.app_url,
    }));

    res.json({ subscriptions: flatSubscriptions });
  } catch (error: any) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

// POST /api/modules/:moduleSlug/portal - Create Stripe billing portal session
router.post("/:moduleSlug/portal", async (req: Request, res: Response) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get user's Stripe customer ID
    const { data: customerResult } = await supabaseAdmin
      .from("Couples_module_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .limit(1);

    if (!customerResult || customerResult.length === 0 || !customerResult[0].stripe_customer_id) {
      return res.status(404).json({ error: "No billing information found" });
    }

    const stripe = await getUncachableStripeClient();
    
    const host = req.headers.host || "localhost:5000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const returnUrl = `${protocol}://${host}/modules`;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerResult[0].stripe_customer_id,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Error creating portal session:", error);
    res.status(500).json({ error: "Failed to create billing portal" });
  }
});

// POST /api/modules/:moduleSlug/launch - Generate access token and launch module
router.post("/:moduleSlug/launch", async (req: Request, res: Response) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { moduleSlug } = req.params;

    // Get module
    const { data: moduleData, error: moduleError } = await supabaseAdmin
      .from("Couples_modules")
      .select("id, slug, name, app_url")
      .eq("slug", moduleSlug)
      .eq("is_active", true)
      .single();

    if (moduleError || !moduleData) {
      return res.status(404).json({ error: "Module not found" });
    }

    // Check if user has active subscription
    const { data: subResult } = await supabaseAdmin
      .from("Couples_module_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("module_id", moduleData.id)
      .in("status", ["active", "trialing"])
      .limit(1);

    if (!subResult || subResult.length === 0) {
      return res.status(403).json({ error: "No active subscription for this module" });
    }

    // Generate short-lived access token (15 minutes)
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token
    const { error: insertError } = await supabaseAdmin
      .from("Couples_module_access_tokens")
      .insert({
        user_id: user.id,
        module_id: moduleData.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) throw insertError;

    // Clean up expired tokens (async, don't wait)
    supabaseAdmin
      .from("Couples_module_access_tokens")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .then(() => {});

    res.json({
      token,
      expires_at: expiresAt.toISOString(),
      module: {
        slug: moduleData.slug,
        name: moduleData.name,
        app_url: moduleData.app_url,
      },
    });
  } catch (error: any) {
    console.error("Error launching module:", error);
    res.status(500).json({ error: "Failed to launch module" });
  }
});

// POST /api/modules/verify-token - Verify access token (called by external modules)
router.post("/verify-token", async (req: Request, res: Response) => {
  try {
    const { token, moduleSlug } = req.body;

    if (!token || !moduleSlug) {
      return res.status(400).json({ error: "Token and module slug required" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Get the module first
    const { data: moduleData } = await supabaseAdmin
      .from("Couples_modules")
      .select("id, slug")
      .eq("slug", moduleSlug)
      .single();

    if (!moduleData) {
      return res.status(401).json({ error: "Invalid module" });
    }

    // Check token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("Couples_module_access_tokens")
      .select("user_id, expires_at")
      .eq("token_hash", tokenHash)
      .eq("module_id", moduleData.id)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Get user info
    const { data: profile } = await supabaseAdmin
      .from("Couples_profiles")
      .select("id, full_name, couple_id")
      .eq("id", tokenData.user_id)
      .single();

    res.json({
      valid: true,
      user_id: tokenData.user_id,
      user_name: profile?.full_name,
      couple_id: profile?.couple_id,
      module_slug: moduleSlug,
    });
  } catch (error: any) {
    console.error("Error verifying token:", error);
    res.status(500).json({ error: "Failed to verify token" });
  }
});

export default router;
