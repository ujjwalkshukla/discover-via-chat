-- Drop existing function and recreate with 384 dimensions for gte-small model
DROP FUNCTION IF EXISTS public.match_videos;

-- Update the embedding column to use 384 dimensions (gte-small model)
ALTER TABLE public.videos 
DROP COLUMN IF EXISTS embedding;

ALTER TABLE public.videos 
ADD COLUMN embedding vector(384);

-- Recreate the index for 384 dimensions
CREATE INDEX IF NOT EXISTS videos_embedding_idx ON public.videos USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create function to match videos by embedding similarity with 384 dimensions
CREATE OR REPLACE FUNCTION public.match_videos(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.2,
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