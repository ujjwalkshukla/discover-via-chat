import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get all videos without embeddings
    const { data: videos, error: fetchError } = await supabase
      .from("videos")
      .select("id, title, description")
      .is("embedding", null);

    if (fetchError) {
      throw fetchError;
    }

    if (!videos || videos.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No videos need embeddings", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${videos.length} videos without embeddings`);

    let updatedCount = 0;
    const errors: string[] = [];

    for (const video of videos) {
      const textToEmbed = `${video.title} ${video.description || ""}`.trim();
      
      try {
        console.log(`Generating embedding for video: ${video.title}`);
        
        const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: textToEmbed,
            model: "text-embedding-3-small",
          }),
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          console.error(`Embedding API error for ${video.title}: ${errorText}`);
          errors.push(`${video.title}: ${errorText}`);
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data?.[0]?.embedding;

        if (!embedding) {
          console.error(`No embedding returned for ${video.title}`);
          errors.push(`${video.title}: No embedding in response`);
          continue;
        }

        // Update the video with the embedding
        const { error: updateError } = await supabase
          .from("videos")
          .update({ embedding: JSON.stringify(embedding) })
          .eq("id", video.id);

        if (updateError) {
          console.error(`Update error for ${video.title}: ${updateError.message}`);
          errors.push(`${video.title}: ${updateError.message}`);
          continue;
        }

        updatedCount++;
        console.log(`Successfully updated embedding for: ${video.title}`);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Unknown error";
        console.error(`Error processing ${video.title}: ${errorMsg}`);
        errors.push(`${video.title}: ${errorMsg}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${updatedCount} of ${videos.length} videos`,
        updated: updatedCount,
        total: videos.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate embeddings error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
