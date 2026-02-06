import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Category, Subcategory, Show } from "@/types";

export default function AdminPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [shows, setShows] = useState<Show[]>([]);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [subcategoryForm, setSubcategoryForm] = useState({ category_id: "", name: "", description: "" });
  const [showForm, setShowForm] = useState({ subcategory_id: "", name: "", description: "", thumbnail_url: "" });
  const [videoForm, setVideoForm] = useState({
    show_id: "",
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    duration: 0,
    difficulty: "beginner" as "beginner" | "intermediate" | "advanced",
    order_index: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [catRes, subRes, showRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("subcategories").select("*").order("name"),
      supabase.from("shows").select("*").order("name"),
    ]);

    if (catRes.data) setCategories(catRes.data as Category[]);
    if (subRes.data) setSubcategories(subRes.data as Subcategory[]);
    if (showRes.data) setShows(showRes.data as Show[]);
  };

  const handleSubmit = async (type: string, data: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ type, data }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`);
      fetchData();

      // Reset forms
      if (type === "category") setCategoryForm({ name: "", description: "" });
      if (type === "subcategory") setSubcategoryForm({ category_id: "", name: "", description: "" });
      if (type === "show") setShowForm({ subcategory_id: "", name: "", description: "", thumbnail_url: "" });
      if (type === "video") setVideoForm({
        show_id: "",
        title: "",
        description: "",
        video_url: "",
        thumbnail_url: "",
        duration: 0,
        difficulty: "beginner",
        order_index: 0,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSubcategories = subcategoryForm.category_id
    ? subcategories.filter((s) => s.category_id === subcategoryForm.category_id)
    : subcategories;

  const filteredShowSubcategories = showForm.subcategory_id
    ? subcategories
    : subcategories;

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
          <h1 className="font-display font-bold ml-4">Admin Upload</h1>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-4xl">
        <Tabs defaultValue="video" className="space-y-6">
          <TabsList className="glass">
            <TabsTrigger value="category">Category</TabsTrigger>
            <TabsTrigger value="subcategory">Subcategory</TabsTrigger>
            <TabsTrigger value="show">Show</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
          </TabsList>

          {/* Category Form */}
          <TabsContent value="category">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="font-display">Add Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-name">Name</Label>
                  <Input
                    id="cat-name"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="e.g., Social Media Growth"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-desc">Description</Label>
                  <Textarea
                    id="cat-desc"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    placeholder="Brief description of this category"
                  />
                </div>
                <Button
                  onClick={() => handleSubmit("category", categoryForm)}
                  disabled={!categoryForm.name || isLoading}
                  className="gradient-primary glow-sm"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Category
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subcategory Form */}
          <TabsContent value="subcategory">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="font-display">Add Subcategory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={subcategoryForm.category_id}
                    onValueChange={(v) => setSubcategoryForm({ ...subcategoryForm, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sub-name">Name</Label>
                  <Input
                    id="sub-name"
                    value={subcategoryForm.name}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                    placeholder="e.g., Instagram Reels"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sub-desc">Description</Label>
                  <Textarea
                    id="sub-desc"
                    value={subcategoryForm.description}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
                    placeholder="Brief description"
                  />
                </div>
                <Button
                  onClick={() => handleSubmit("subcategory", subcategoryForm)}
                  disabled={!subcategoryForm.category_id || !subcategoryForm.name || isLoading}
                  className="gradient-primary glow-sm"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Subcategory
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Show Form */}
          <TabsContent value="show">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="font-display">Add Show</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Subcategory</Label>
                  <Select
                    value={showForm.subcategory_id}
                    onValueChange={(v) => setShowForm({ ...showForm, subcategory_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="show-name">Name</Label>
                  <Input
                    id="show-name"
                    value={showForm.name}
                    onChange={(e) => setShowForm({ ...showForm, name: e.target.value })}
                    placeholder="e.g., Reels Masterclass"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="show-desc">Description</Label>
                  <Textarea
                    id="show-desc"
                    value={showForm.description}
                    onChange={(e) => setShowForm({ ...showForm, description: e.target.value })}
                    placeholder="Brief description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="show-thumb">Thumbnail URL</Label>
                  <Input
                    id="show-thumb"
                    value={showForm.thumbnail_url}
                    onChange={(e) => setShowForm({ ...showForm, thumbnail_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <Button
                  onClick={() => handleSubmit("show", showForm)}
                  disabled={!showForm.subcategory_id || !showForm.name || isLoading}
                  className="gradient-primary glow-sm"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Show
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Form */}
          <TabsContent value="video">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="font-display">Add Video</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Show</Label>
                  <Select
                    value={videoForm.show_id}
                    onValueChange={(v) => setVideoForm({ ...videoForm, show_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a show" />
                    </SelectTrigger>
                    <SelectContent>
                      {shows.map((show) => (
                        <SelectItem key={show.id} value={show.id}>
                          {show.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vid-title">Title</Label>
                  <Input
                    id="vid-title"
                    value={videoForm.title}
                    onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                    placeholder="e.g., How to Go Viral on Instagram"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vid-desc">Description</Label>
                  <Textarea
                    id="vid-desc"
                    value={videoForm.description}
                    onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                    placeholder="Video description (used for AI matching)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vid-url">Video URL</Label>
                    <Input
                      id="vid-url"
                      value={videoForm.video_url}
                      onChange={(e) => setVideoForm({ ...videoForm, video_url: e.target.value })}
                      placeholder="YouTube URL or video URL"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vid-thumb">Thumbnail URL</Label>
                    <Input
                      id="vid-thumb"
                      value={videoForm.thumbnail_url}
                      onChange={(e) => setVideoForm({ ...videoForm, thumbnail_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vid-duration">Duration (seconds)</Label>
                    <Input
                      id="vid-duration"
                      type="number"
                      value={videoForm.duration}
                      onChange={(e) => setVideoForm({ ...videoForm, duration: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select
                      value={videoForm.difficulty}
                      onValueChange={(v: "beginner" | "intermediate" | "advanced") => 
                        setVideoForm({ ...videoForm, difficulty: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vid-order">Order Index</Label>
                    <Input
                      id="vid-order"
                      type="number"
                      value={videoForm.order_index}
                      onChange={(e) => setVideoForm({ ...videoForm, order_index: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => handleSubmit("video", videoForm)}
                  disabled={!videoForm.show_id || !videoForm.title || !videoForm.video_url || isLoading}
                  className="gradient-primary glow-sm"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Video
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <Card className="glass">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold gradient-text">{categories.length}</div>
              <p className="text-sm text-muted-foreground">Categories</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold gradient-text">{shows.length}</div>
              <p className="text-sm text-muted-foreground">Shows</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold gradient-text">{subcategories.length}</div>
              <p className="text-sm text-muted-foreground">Subcategories</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
