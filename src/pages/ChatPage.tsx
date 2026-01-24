import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, MessageSquare } from "lucide-react";
import { ChatBubble } from "@/components/ChatBubble";
import { ChatInput } from "@/components/ChatInput";
import { PromptChip } from "@/components/PromptChip";
import { toast } from "sonner";
import type { ChatMessage, Video, ChatResponse } from "@/types";

const SUGGESTED_PROMPTS = [
  "Grow on Instagram",
  "Grow on YouTube",
  "Fix low reach",
  "Make viral thumbnails",
  "Create a 7 day plan",
  "Resume learning",
];

export default function ChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savedVideoIds, setSavedVideoIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ message: content }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please wait a moment.");
          return;
        }
        if (response.status === 402) {
          toast.error("Service credits needed. Please contact support.");
          return;
        }
        throw new Error("Failed to get response");
      }

      const data: ChatResponse = await response.json();

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message,
        recommended_videos: data.recommended_videos,
        followup_questions: data.followup_questions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Something went wrong. Please try again.");
      
      // Remove the user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayVideo = (video: Video) => {
    navigate(`/video/${video.id}`);
  };

  const handleSaveVideo = (video: Video) => {
    setSavedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(video.id)) {
        next.delete(video.id);
        toast.success("Video removed from saved");
      } else {
        next.add(video.id);
        toast.success("Video saved!");
      }
      return next;
    });
  };

  const isEmptyState = messages.length === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 glass sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-sm">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg gradient-text">InVideo AI</h1>
              <p className="text-xs text-muted-foreground">Your learning assistant</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary/50"
            >
              Admin
            </button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container px-4 py-6 flex flex-col">
        {isEmptyState ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in">
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-2xl gradient-primary flex items-center justify-center glow animate-float">
                <MessageSquare className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="font-display text-3xl font-bold">
                What do you want to <span className="gradient-text">learn</span> today?
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Ask me anything about content creation, social media growth, or video production. I'll find the perfect videos for you.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <PromptChip
                  key={prompt}
                  label={prompt}
                  onClick={() => handleSendMessage(prompt)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Chat messages */
          <div className="flex-1 space-y-6 overflow-y-auto scrollbar-thin pb-4">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                onPlayVideo={handlePlayVideo}
                onSaveVideo={handleSaveVideo}
                savedVideoIds={savedVideoIds}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground animate-pulse" />
                </div>
                <div className="glass rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Suggested prompts when chatting */}
        {!isEmptyState && messages.length > 0 && (
          <div className="flex flex-wrap gap-2 py-3">
            {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
              <PromptChip
                key={prompt}
                label={prompt}
                onClick={() => handleSendMessage(prompt)}
                className="text-xs"
              />
            ))}
          </div>
        )}

        {/* Chat input */}
        <div className="pt-2">
          <ChatInput
            onSend={handleSendMessage}
            isLoading={isLoading}
            placeholder="Ask about growing on social media, creating content..."
          />
        </div>
      </main>
    </div>
  );
}
