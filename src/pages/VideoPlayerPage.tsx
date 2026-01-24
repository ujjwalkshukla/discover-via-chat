import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Clock, BarChart3, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Video, Show } from "@/types";

export default function VideoPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [show, setShow] = useState<Show | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchVideoData(id);
    }
  }, [id]);

  const fetchVideoData = async (videoId: string) => {
    setIsLoading(true);
    try {
      // Fetch video
      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .select("*")
        .eq("id", videoId)
        .maybeSingle();

      if (videoError) throw videoError;
      if (!videoData) {
        toast.error("Video not found");
        navigate("/");
        return;
      }

      setVideo(videoData as Video);

      // Fetch show
      const { data: showData } = await supabase
        .from("shows")
        .select("*")
        .eq("id", videoData.show_id)
        .maybeSingle();

      if (showData) {
        setShow(showData as Show);

        // Fetch related videos from the same show
        const { data: related } = await supabase
          .from("videos")
          .select("*")
          .eq("show_id", videoData.show_id)
          .neq("id", videoId)
          .order("order_index", { ascending: true })
          .limit(5);

        if (related) {
          setRelatedVideos(related as Video[]);
        }
      }
    } catch (error) {
      console.error("Error fetching video:", error);
      toast.error("Failed to load video");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const difficultyColors = {
    beginner: "bg-success/20 text-success border-success/30",
    intermediate: "bg-warning/20 text-warning border-warning/30",
    advanced: "bg-destructive/20 text-destructive border-destructive/30",
  };

  const getEmbedUrl = (url: string) => {
    // Handle YouTube URLs
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    return url;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl px-4">
          <div className="aspect-video bg-muted rounded-xl" />
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!video) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 glass sticky top-0 z-10">
        <div className="container flex items-center h-14 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video player area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video bg-black rounded-xl overflow-hidden glow">
              {video.video_url.includes("youtube") || video.video_url.includes("youtu.be") ? (
                <iframe
                  src={getEmbedUrl(video.video_url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center gradient-primary">
                  <div className="text-center space-y-4">
                    <Play className="w-16 h-16 mx-auto text-primary-foreground/70" />
                    <p className="text-primary-foreground/70">Video player placeholder</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-2xl font-bold">{video.title}</h1>
              
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-muted-foreground">{show?.name}</span>
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(video.duration)}
                </Badge>
                <Badge variant="outline" className={difficultyColors[video.difficulty]}>
                  <BarChart3 className="w-3 h-3 mr-1" />
                  {video.difficulty}
                </Badge>
              </div>

              {video.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {video.description}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar - Related videos */}
          <div className="space-y-4">
            <h2 className="font-display font-semibold text-lg">
              More from {show?.name}
            </h2>

            {relatedVideos.length === 0 ? (
              <p className="text-muted-foreground text-sm">No more videos in this series</p>
            ) : (
              <div className="space-y-3">
                {relatedVideos.map((relatedVideo) => (
                  <Card
                    key={relatedVideo.id}
                    className="group glass cursor-pointer transition-all hover:glow-sm hover:scale-[1.02]"
                    onClick={() => navigate(`/video/${relatedVideo.id}`)}
                  >
                    <CardContent className="p-3 flex gap-3">
                      <div className="relative w-28 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
                        {relatedVideo.thumbnail_url ? (
                          <img
                            src={relatedVideo.thumbnail_url}
                            alt={relatedVideo.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full gradient-primary opacity-30 flex items-center justify-center">
                            <Play className="w-6 h-6 text-foreground/50" />
                          </div>
                        )}
                        <Badge className="absolute bottom-1 right-1 text-xs bg-black/70 border-none">
                          {formatDuration(relatedVideo.duration)}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {relatedVideo.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`mt-2 text-xs ${difficultyColors[relatedVideo.difficulty]}`}
                        >
                          {relatedVideo.difficulty}
                        </Badge>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 self-center" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
