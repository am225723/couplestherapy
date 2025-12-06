import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyTherapistAuth, verifyCoupleExists } from "../_shared/auth.ts";

interface ThoughtInput {
  thought_type: "todo" | "message" | "file_reference";
  title?: string;
  content: string;
  file_reference?: string;
  priority?: "low" | "medium" | "high";
  individual_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authResult = await verifyTherapistAuth(req);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: authResult.status,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    let coupleId: string | null = null;
    let thoughtId: string | null = null;
    
    if (req.method === "POST") {
      const body = await req.json();
      coupleId = body.couple_id;
    } else {
      coupleId = url.searchParams.get("couple_id");
      thoughtId = url.searchParams.get("thought_id");
    }

    if (req.method === "GET") {
      if (!coupleId) {
        return new Response(JSON.stringify({ error: "couple_id is required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const coupleExists = await verifyCoupleExists(coupleId);
      if (!coupleExists) {
        return new Response(JSON.stringify({ error: "Couple not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      const { data, error } = await supabaseAdmin
        .from("Couples_therapist_thoughts")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      coupleId = body.couple_id;
      
      if (!coupleId) {
        return new Response(JSON.stringify({ error: "couple_id is required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const coupleExists = await verifyCoupleExists(coupleId);
      if (!coupleExists) {
        return new Response(JSON.stringify({ error: "Couple not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      const thoughtData: ThoughtInput = {
        thought_type: body.thought_type,
        title: body.title,
        content: body.content,
        file_reference: body.file_reference,
        priority: body.priority || "medium",
        individual_id: body.individual_id || null,
      };

      if (!thoughtData.content || !thoughtData.thought_type) {
        return new Response(
          JSON.stringify({ error: "content and thought_type are required" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("Couples_therapist_thoughts")
        .insert({
          couple_id: coupleId,
          therapist_id: authResult.therapistId,
          thought_type: thoughtData.thought_type,
          title: thoughtData.title,
          content: thoughtData.content,
          file_reference: thoughtData.file_reference,
          priority: thoughtData.priority,
          is_completed: false,
          individual_id: thoughtData.individual_id,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      });
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      thoughtId = body.thought_id;

      if (!thoughtId) {
        return new Response(JSON.stringify({ error: "thought_id is required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const { data: thought, error: fetchError } = await supabaseAdmin
        .from("Couples_therapist_thoughts")
        .select("therapist_id")
        .eq("id", thoughtId)
        .single();

      if (fetchError || !thought) {
        return new Response(JSON.stringify({ error: "Thought not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      if (thought.therapist_id !== authResult.therapistId) {
        return new Response(
          JSON.stringify({ error: "Access denied - can only edit your own thoughts" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403,
          }
        );
      }

      const updateData: Record<string, any> = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.content !== undefined) updateData.content = body.content;
      if (body.priority !== undefined) updateData.priority = body.priority;
      if (body.is_completed !== undefined) updateData.is_completed = body.is_completed;

      const { data, error } = await supabaseAdmin
        .from("Couples_therapist_thoughts")
        .update(updateData)
        .eq("id", thoughtId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      const body = await req.json();
      thoughtId = body.thought_id;

      if (!thoughtId) {
        return new Response(JSON.stringify({ error: "thought_id is required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const { data: thought, error: fetchError } = await supabaseAdmin
        .from("Couples_therapist_thoughts")
        .select("therapist_id")
        .eq("id", thoughtId)
        .single();

      if (fetchError || !thought) {
        return new Response(JSON.stringify({ error: "Thought not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      if (thought.therapist_id !== authResult.therapistId) {
        return new Response(
          JSON.stringify({ error: "Access denied - can only delete your own thoughts" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403,
          }
        );
      }

      const { error } = await supabaseAdmin
        .from("Couples_therapist_thoughts")
        .delete()
        .eq("id", thoughtId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  } catch (error: any) {
    console.error("Therapist thoughts error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process request" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
