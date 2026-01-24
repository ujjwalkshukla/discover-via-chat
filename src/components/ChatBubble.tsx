import { User, Bot } from "lucide-react";
import { VideoCard } from "./VideoCard";
import type { ChatMessage, Video } from "@/types";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  message: ChatMessage;
  onPlayVideo: (video: Video) => void;
  onSaveVideo: (video: Video) => void;
  savedVideoIds: Set<string>;
}

export function ChatBubble({ message, onPlayVideo, onSaveVideo, savedVideoIds }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 animate-slide-up", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary/20 text-primary" : "gradient-primary text-primary-foreground"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className={cn("flex-1 max-w-[85%] space-y-4", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-primary text-primary-foreground ml-auto"
              : "glass"
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Recommended videos */}
        {message.recommended_videos && message.recommended_videos.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {message.recommended_videos.map((rec) => (
              rec.video && (
                <VideoCard
                  key={rec.video_id}
                  video={rec.video}
                  reason={rec.reason}
                  onPlay={onPlayVideo}
                  onSave={onSaveVideo}
                  isSaved={savedVideoIds.has(rec.video_id)}
                />
              )
            ))}
          </div>
        )}

        {/* Followup questions as chips */}
        {message.followup_questions && message.followup_questions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {message.followup_questions.map((question, index) => (
              <button
                key={index}
                className="text-xs px-3 py-1.5 rounded-full bg-secondary/60 text-secondary-foreground hover:bg-primary/20 hover:text-primary transition-colors border border-border/50"
              >
                {question}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
