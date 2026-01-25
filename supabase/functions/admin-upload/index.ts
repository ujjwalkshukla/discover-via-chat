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
    const { type, data } = (await req.json()) as AdminUploadRequest;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let result;

    switch (type) {
      case "category": {
        const { data: category, error } = await supabase
          .from("categories")
          .upsert({ name: data.name, description: data.description }, { onConflict: 'name' })
          .select()
          .single();
        
        if (error) throw error;
        result = category;
        break;
      }

      case "subcategory": {
        const { data: subcategory, error } = await supabase
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
        const { data: show, error } = await supabase
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

        const { data: video, error } = await supabase
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
