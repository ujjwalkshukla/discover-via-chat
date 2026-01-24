import { Play, Bookmark, Clock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Video } from "@/types";

interface VideoCardProps {
  video: Video;
  reason?: string;
  onPlay: (video: Video) => void;
  onSave: (video: Video) => void;
  isSaved?: boolean;
}

export function VideoCard({ video, reason, onPlay, onSave, isSaved = false }: VideoCardProps) {
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

  return (
    <Card className="group glass overflow-hidden transition-all duration-300 hover:glow-sm hover:scale-[1.02] animate-fade-in">
      <CardContent className="p-0">
        <div className="relative aspect-video bg-muted overflow-hidden">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full gradient-primary opacity-30 flex items-center justify-center">
              <Play className="w-12 h-12 text-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Button
            onClick={() => onPlay(video)}
            size="icon"
            className="absolute inset-0 m-auto w-14 h-14 rounded-full gradient-primary opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 glow"
          >
            <Play className="w-6 h-6 fill-current" />
          </Button>
          <Badge className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm border-none">
            <Clock className="w-3 h-3 mr-1" />
            {formatDuration(video.duration)}
          </Badge>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-semibold text-foreground line-clamp-2 leading-tight">
              {video.title}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className={`shrink-0 transition-colors ${isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
              onClick={() => onSave(video)}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-1">
            {video.show_name}
          </p>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={difficultyColors[video.difficulty]}>
              <BarChart3 className="w-3 h-3 mr-1" />
              {video.difficulty}
            </Badge>
          </div>

          {reason && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-primary/50 pl-2">
              {reason}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
