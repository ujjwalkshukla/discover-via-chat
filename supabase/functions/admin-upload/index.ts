import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminUploadRequest {
  type: "category" | "subcategory" | "show" | "video";
  data: Record<string, unknown>;
}

// Access Supabase AI from globalThis
const session = new (globalThis as any).Supabase.ai.Session("gte-small");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // ============================================
    // SECURITY: Authenticate and authorize the user
    // ============================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's token to verify their identity
    const userSupabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: No user ID in token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client to check admin role (bypasses RLS)
    const serviceSupabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: roleData, error: roleError } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Internal error checking permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // User is authenticated and authorized as admin
    // Proceed with the upload operation
    // ============================================
    const { type, data } = (await req.json()) as AdminUploadRequest;

    let result;

    switch (type) {
      case "category": {
        const { data: category, error } = await serviceSupabase
          .from("categories")
          .upsert({ name: data.name, description: data.description }, { onConflict: 'name' })
          .select()
          .single();
        
        if (error) throw error;
        result = category;
        break;
      }

      case "subcategory": {
        const { data: subcategory, error } = await serviceSupabase
          .from("subcategories")
          .upsert({ 
            category_id: data.category_id, 
            name: data.name, 
            description: data.description 
          }, { onConflict: 'name' })
          .select()
          .single();
        
        if (error) throw error;
        result = subcategory;
        break;
      }

      case "show": {
        const { data: show, error } = await serviceSupabase
          .from("shows")
          .upsert({ 
            subcategory_id: data.subcategory_id, 
            name: data.name, 
            description: data.description,
            thumbnail_url: data.thumbnail_url,
          }, { onConflict: 'name' })
          .select()
          .single();
        
        if (error) throw error;
        result = show;
        break;
      }

      case "video": {
        // Generate embedding for video content using gte-small
        let embedding = null;
        
        const textToEmbed = `${data.title} ${data.description || ''}`.trim();
        
        console.log(`Generating embedding for: ${textToEmbed}`);
        
        try {
          embedding = await session.run(textToEmbed, {
            mean_pool: true,
            normalize: true,
          });
          console.log("Embedding generated successfully");
        } catch (e) {
          console.error("Embedding generation failed:", e);
        }

        const { data: video, error } = await serviceSupabase
          .from("videos")
          .insert({ 
            show_id: data.show_id, 
            title: data.title, 
            description: data.description,
            video_url: data.video_url,
            thumbnail_url: data.thumbnail_url,
            duration: data.duration || 0,
            difficulty: data.difficulty || "beginner",
            order_index: data.order_index || 0,
            embedding: embedding ? JSON.stringify(embedding) : null,
          })
          .select()
          .single();
        
        if (error) throw error;
        result = video;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Admin upload error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
