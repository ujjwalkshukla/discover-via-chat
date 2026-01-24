-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Create shows table
CREATE TABLE public.shows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create videos table with vector embeddings
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER NOT NULL DEFAULT 0, -- in seconds
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  order_index INTEGER NOT NULL DEFAULT 0,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_sessions table
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  recommended_videos JSONB, -- Array of {video_id, reason}
  followup_questions JSONB, -- Array of strings
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create saved_videos table
CREATE TABLE public.saved_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Create index for vector similarity search
CREATE INDEX videos_embedding_idx ON public.videos USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create function to match videos by embedding similarity
CREATE OR REPLACE FUNCTION public.match_videos(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  show_id UUID,
  title TEXT,
  description TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  difficulty TEXT,
  order_index INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.show_id,
    v.title,
    v.description,
    v.video_url,
    v.thumbnail_url,
    v.duration,
    v.difficulty,
    v.order_index,
    1 - (v.embedding <=> query_embedding) AS similarity
  FROM public.videos v
  WHERE v.embedding IS NOT NULL
    AND 1 - (v.embedding <=> query_embedding) > match_threshold
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_videos ENABLE ROW LEVEL SECURITY;

-- Public read access for content tables (anyone can browse videos)
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view subcategories" ON public.subcategories FOR SELECT USING (true);
CREATE POLICY "Anyone can view shows" ON public.shows FOR SELECT USING (true);
CREATE POLICY "Anyone can view videos" ON public.videos FOR SELECT USING (true);

-- Admin insert policies (using service role in edge functions)
CREATE POLICY "Service role can insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can insert subcategories" ON public.subcategories FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can insert shows" ON public.shows FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can insert videos" ON public.videos FOR INSERT WITH CHECK (true);

-- Chat session policies
CREATE POLICY "Users can view their own sessions" ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sessions" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anonymous sessions allowed" ON public.chat_sessions FOR INSERT WITH CHECK (user_id IS NULL);
CREATE POLICY "Anyone can view anonymous sessions" ON public.chat_sessions FOR SELECT USING (user_id IS NULL);

-- Chat message policies
CREATE POLICY "Users can view messages in their sessions" ON public.chat_messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.chat_sessions cs WHERE cs.id = session_id AND (cs.user_id = auth.uid() OR cs.user_id IS NULL)));
CREATE POLICY "Users can create messages in their sessions" ON public.chat_messages FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_sessions cs WHERE cs.id = session_id AND (cs.user_id = auth.uid() OR cs.user_id IS NULL)));

-- Saved videos policies
CREATE POLICY "Users can view their saved videos" ON public.saved_videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save videos" ON public.saved_videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave videos" ON public.saved_videos FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add trigger for chat_sessions
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();