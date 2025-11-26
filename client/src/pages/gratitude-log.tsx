import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, Sparkles, Upload } from "lucide-react";
import { GratitudeLog, Profile, TherapistComment } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

type GratitudeWithAuthor = GratitudeLog & {
  author?: Profile;
  comments?: TherapistComment[];
};

export default function GratitudeLogPage() {
  const [logs, setLogs] = useState<GratitudeWithAuthor[]>([]);
  const [newText, setNewText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.couple_id) {
      fetchLogs();
      subscribeToComments();
    }
  }, [profile?.couple_id]);

  const fetchLogs = async () => {
    if (!profile?.couple_id) return;

    try {
      const { data: logsData, error: logsError } = await supabase
        .from("Couples_gratitude_logs")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .order("created_at", { ascending: false });

      if (logsError) throw logsError;

      const userIds = [...new Set(logsData.map((log) => log.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("Couples_profiles")
        .select("*")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const { data: comments } = await supabase
        .from("Couples_therapist_comments")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .eq("related_activity_type", "gratitude_logs")
        .eq("is_private_note", false);

      // Generate signed URLs for images (valid for 1 hour)
      const logsWithSignedUrls = await Promise.all(
        logsData.map(async (log) => {
          let signedUrl: string | null = null;

          if (log.image_url) {
            const { data, error } = await supabase.storage
              .from("gratitude-images")
              .createSignedUrl(log.image_url, 3600); // 1 hour expiry

            if (!error && data) {
              signedUrl = data.signedUrl;
            }
          }

          return {
            ...log,
            image_url: signedUrl, // Replace file path with signed URL
            author: profiles.find((p) => p.id === log.user_id),
            comments:
              comments?.filter((c) => c.related_activity_id === log.id) || [],
          };
        }),
      );

      setLogs(logsWithSignedUrls);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToComments = () => {
    if (!profile?.couple_id) return;

    const channel = supabase
      .channel("gratitude_comments")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Couples_therapist_comments",
          filter: `couple_id=eq.${profile.couple_id}`,
        },
        (payload) => {
          if (
            payload.new.related_activity_type === "gratitude_logs" &&
            !payload.new.is_private_note
          ) {
            fetchLogs();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.couple_id || (!newText.trim() && !selectedImage))
      return;

    setSubmitting(true);
    setUploading(!!selectedImage);

    let uploadedFilePath: string | null = null;

    try {
      let imageUrl: string | null = null;

      // Upload image if selected
      if (selectedImage) {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${selectedImage.name}`;
        const filePath = `${profile.couple_id}/${user.id}/${fileName}`;
        uploadedFilePath = filePath;

        const { error: uploadError } = await supabase.storage
          .from("gratitude-images")
          .upload(filePath, selectedImage, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Store the file path (not public URL) for signed URL generation
        imageUrl = filePath;
      }

      // Insert gratitude log
      const { error: insertError } = await supabase
        .from("Couples_gratitude_logs")
        .insert({
          couple_id: profile.couple_id,
          user_id: user.id,
          text_content: newText.trim() || null,
          image_url: imageUrl,
        });

      if (insertError) {
        // Clean up uploaded file if database insert fails
        if (uploadedFilePath) {
          await supabase.storage
            .from("gratitude-images")
            .remove([uploadedFilePath]);
        }
        throw insertError;
      }

      setNewText("");
      setSelectedImage(null);
      setImagePreview(null);

      toast({
        title: "Gratitude shared!",
        description: "Your moment of gratitude has been added.",
      });

      fetchLogs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Gratitude Log</h1>
          </div>
          <p className="text-muted-foreground">
            Share moments of appreciation and connection
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                placeholder="What are you grateful for today? Share a moment that made you smile..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="min-h-32 resize-none"
                data-testid="textarea-new-gratitude"
              />

              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="rounded-lg max-h-64 w-full object-cover"
                    data-testid="img-preview"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                    data-testid="button-remove-image"
                  >
                    ×
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                  data-testid="input-image-upload"
                />
                <label htmlFor="image-upload">
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    data-testid="button-upload-image"
                  >
                    <span className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      {selectedImage ? "Change Image" : "Add Image"}
                    </span>
                  </Button>
                </label>

                <Button
                  type="submit"
                  disabled={(!newText.trim() && !selectedImage) || submitting}
                  data-testid="button-submit-gratitude"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Heart className="mr-2 h-4 w-4" />
                      Share Gratitude
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {logs.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No gratitude entries yet. Be the first to share something
                  beautiful!
                </p>
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id} data-testid={`card-gratitude-${log.id}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {log.author?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {log.author?.full_name || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {log.created_at
                          ? formatDistanceToNow(new Date(log.created_at), {
                              addSuffix: true,
                            })
                          : "Recently"}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {log.image_url && (
                    <img
                      src={log.image_url}
                      alt="Gratitude moment"
                      className="rounded-lg w-full object-cover max-h-96"
                      data-testid={`img-gratitude-${log.id}`}
                    />
                  )}

                  {log.text_content && (
                    <p className="text-base leading-relaxed whitespace-pre-wrap">
                      {log.text_content}
                    </p>
                  )}

                  {log.comments && log.comments.length > 0 && (
                    <div className="border-l-4 border-primary/30 pl-4 mt-4 space-y-2">
                      <p className="text-sm font-medium text-primary">
                        Therapist Comment
                      </p>
                      {log.comments.map((comment) => (
                        <p
                          key={comment.id}
                          className="text-sm text-muted-foreground italic"
                        >
                          {comment.comment_text}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
