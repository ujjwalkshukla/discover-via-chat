export interface Video {
  id: string;
  show_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  order_index: number;
  show_name?: string;
  created_at?: string;
}

export interface Show {
  id: string;
  subcategory_id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at?: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommended_videos?: VideoRecommendation[];
  followup_questions?: string[];
  created_at?: string;
}

export interface VideoRecommendation {
  video_id: string;
  reason: string;
  video?: Video;
}

export interface ChatSession {
  id: string;
  user_id: string | null;
  title: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SavedVideo {
  id: string;
  user_id: string;
  video_id: string;
  created_at?: string;
}

export interface ChatResponse {
  message: string;
  followup_questions: string[];
  recommended_videos: VideoRecommendation[];
  retrieval_count: number;
}
