import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  message: string;
  session_id?: string;
}

interface VideoResult {
  id: string;
  show_id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  duration: number;
  difficulty: string;
  similarity: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, session_id } = (await req.json()) as ChatRequest;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Step 1: Generate embedding for the user's message
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: message,
        model: "text-embedding-3-small",
      }),
    });

    let matchedVideos: VideoResult[] = [];

    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.data?.[0]?.embedding;

      if (embedding) {
        // Step 2: Vector similarity search
        const { data: videos, error } = await supabase.rpc("match_videos", {
          query_embedding: embedding,
          match_threshold: 0.3,
          match_count: 10,
        });

        if (!error && videos) {
          matchedVideos = videos as VideoResult[];
        }
      }
    }

    // Step 3: Fetch show information for matched videos
    const showIds = [...new Set(matchedVideos.map(v => v.show_id))];
    let showsMap: Record<string, { name: string; subcategory_id: string }> = {};
    
    if (showIds.length > 0) {
      const { data: shows } = await supabase
        .from("shows")
        .select("id, name, subcategory_id")
        .in("id", showIds);
      
      if (shows) {
        showsMap = shows.reduce((acc, show) => {
          acc[show.id] = { name: show.name, subcategory_id: show.subcategory_id };
          return acc;
        }, {} as Record<string, { name: string; subcategory_id: string }>);
      }
    }

    // Enrich videos with show names
    const enrichedVideos = matchedVideos.map(v => ({
      ...v,
      show_name: showsMap[v.show_id]?.name || "Unknown Show",
    }));

    // Step 4: Build context for AI
    const videoContext = enrichedVideos.length > 0
      ? enrichedVideos.map((v, i) => 
          `${i + 1}. "${v.title}" from "${v.show_name}" - ${v.description || 'No description'} (${v.difficulty}, ${Math.floor(v.duration / 60)}min, ID: ${v.id})`
        ).join("\n")
      : "No matching videos found in the database.";

    const systemPrompt = `You are an AI assistant for InVideo, a video learning platform focused on content creation and social media growth. You help users discover educational videos.

CRITICAL RULES:
1. You can ONLY recommend videos from the provided context below. Never make up or hallucinate video titles, shows, or content.
2. If the context shows "No matching videos found", acknowledge this honestly and ask clarifying questions.
3. Always respond with valid JSON matching the exact schema specified.
4. Be conversational and helpful, but stay focused on video recommendations.
5. Include the exact video IDs from the context in your recommendations.

AVAILABLE VIDEOS:
${videoContext}

Respond with this exact JSON structure:
{
  "assistant_message": "Your conversational response here",
  "followup_questions": ["Question 1?", "Question 2?"],
  "recommended_videos": [
    {"video_id": "exact-uuid-from-context", "reason": "Why this video is relevant"}
  ]
}

If no videos match, set recommended_videos to empty array and ask clarifying questions.`;

    // Step 5: Call AI for response
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      parsedResponse = {
        assistant_message: content || "I'm having trouble processing your request. Could you try again?",
        followup_questions: [],
        recommended_videos: [],
      };
    }

    // Step 6: Validate recommended videos exist in our results
    const validVideoIds = new Set(enrichedVideos.map(v => v.id));
    const validRecommendations = (parsedResponse.recommended_videos || []).filter(
      (rec: { video_id: string }) => validVideoIds.has(rec.video_id)
    );

    // Enrich recommendations with full video data
    const enrichedRecommendations = validRecommendations.map((rec: { video_id: string; reason: string }) => {
      const video = enrichedVideos.find(v => v.id === rec.video_id);
      return {
        ...rec,
        video: video,
      };
    });

    // Step 7: Store messages if session exists
    if (session_id) {
      await supabase.from("chat_messages").insert([
        { session_id, role: "user", content: message },
        { 
          session_id, 
          role: "assistant", 
          content: parsedResponse.assistant_message,
          recommended_videos: enrichedRecommendations,
          followup_questions: parsedResponse.followup_questions,
        },
      ]);
    }

    return new Response(
      JSON.stringify({
        message: parsedResponse.assistant_message,
        followup_questions: parsedResponse.followup_questions || [],
        recommended_videos: enrichedRecommendations,
        retrieval_count: enrichedVideos.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
