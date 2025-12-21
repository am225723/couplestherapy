import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { authenticatedFetchJson } from "@/lib/authenticated-fetch";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Couple, Profile } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  MessageSquare,
  Send,
  CheckCircle2,
  User,
  Users,
  Heart,
  Clock,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface TherapistPrompt {
  id: string;
  couple_id: string;
  therapist_id: string;
  tool_name: string;
  title: string;
  description: string | null;
  suggested_action: string;
  is_enabled: boolean;
  target_user_id: string | null;
  created_at: string;
}

interface ReflectionResponse {
  id: string;
  prompt_id: string;
  couple_id: string;
  responder_id: string;
  response_text: string;
  is_shared_with_partner: boolean;
  created_at: string;
  updated_at: string;
}

interface ResponseData {
  own: ReflectionResponse | null;
  partner: ReflectionResponse | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

function ReflectionPromptCard({
  prompt,
  userId,
  coupleId,
  partnerName,
}: {
  prompt: TherapistPrompt;
  userId: string;
  coupleId: string;
  partnerName: string;
}) {
  const { toast } = useToast();
  const [responseText, setResponseText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const responsesQuery = useQuery<ResponseData>({
    queryKey: ["/api/therapist-prompts/reflection-responses/prompt", prompt.id],
    queryFn: async () => {
      const response = await authenticatedFetchJson(
        `/api/therapist-prompts/reflection-responses/prompt/${prompt.id}`
      );
      return response as ResponseData;
    },
    enabled: !!prompt.id,
  });

  const submitMutation = useMutation({
    mutationFn: async (text: string) => {
      return authenticatedFetchJson("/api/therapist-prompts/reflection-responses", {
        method: "POST",
        body: JSON.stringify({
          prompt_id: prompt.id,
          response_text: text,
        }),
      });
    },
    onSuccess: () => {
      toast({ title: "Response saved" });
      setResponseText("");
      setIsEditing(false);
      queryClient.invalidateQueries({
        queryKey: ["/api/therapist-prompts/reflection-responses/prompt", prompt.id],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save response",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async ({ id, share }: { id: string; share: boolean }) => {
      return authenticatedFetchJson(`/api/therapist-prompts/reflection-responses/${id}/share`, {
        method: "PATCH",
        body: JSON.stringify({ is_shared_with_partner: share }),
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.share ? "Response shared with partner" : "Response is now private",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/therapist-prompts/reflection-responses/prompt", prompt.id],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update sharing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const ownResponse = responsesQuery.data?.own;
  const partnerResponse = responsesQuery.data?.partner;
  const hasResponded = !!ownResponse;

  return (
    <Card className="overflow-hidden" data-testid={`reflection-prompt-${prompt.id}`}>
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <CardTitle className="text-base">{prompt.title}</CardTitle>
              </div>
              {prompt.description && (
                <CardDescription className="text-sm">{prompt.description}</CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {prompt.target_user_id ? (
                <Badge variant="outline" className="gap-1 text-xs">
                  <User className="h-3 w-3" />
                  Personal
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  Both
                </Badge>
              )}
              {hasResponded && (
                <Badge className="gap-1 bg-green-600 text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  Responded
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </div>

      <CardContent className="pt-4 space-y-4">
        <div className="p-4 rounded-lg bg-muted/50 border-l-4 border-l-violet-500">
          <p className="text-sm italic text-foreground/80">{prompt.suggested_action}</p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Asked {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
          </p>
        </div>

        {hasResponded && !isEditing ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Your Response</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`share-${prompt.id}`} className="text-xs text-muted-foreground">
                      {ownResponse.is_shared_with_partner ? (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Shared
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <EyeOff className="h-3 w-3" /> Private
                        </span>
                      )}
                    </Label>
                    <Switch
                      id={`share-${prompt.id}`}
                      checked={ownResponse.is_shared_with_partner}
                      onCheckedChange={(checked) =>
                        shareMutation.mutate({ id: ownResponse.id, share: checked })
                      }
                      disabled={shareMutation.isPending}
                      data-testid={`switch-share-${prompt.id}`}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setResponseText(ownResponse.response_text);
                      setIsEditing(true);
                    }}
                    data-testid={`button-edit-response-${prompt.id}`}
                  >
                    Edit
                  </Button>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{ownResponse.response_text}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {format(new Date(ownResponse.updated_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>

            {partnerResponse && (
              <div className="p-4 rounded-lg bg-accent/30 border">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{getInitials(partnerName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{partnerName}'s Response</span>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    <Heart className="h-3 w-3 mr-1" />
                    Shared with you
                  </Badge>
                </div>
                <p className="text-sm whitespace-pre-wrap">{partnerResponse.response_text}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(partnerResponse.updated_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              placeholder="Share your thoughts and reflections..."
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className="min-h-32 resize-none"
              data-testid={`textarea-response-${prompt.id}`}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Your response will be private by default. You can share it with your partner later.
              </p>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setResponseText("");
                    }}
                    data-testid={`button-cancel-edit-${prompt.id}`}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={() => submitMutation.mutate(responseText)}
                  disabled={submitMutation.isPending || !responseText.trim()}
                  className="gap-2"
                  data-testid={`button-submit-response-${prompt.id}`}
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {hasResponded ? "Update" : "Submit"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CoupleWithPartners extends Couple {
  partner1?: Profile | null;
  partner2?: Profile | null;
}

export default function ReflectionPromptsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const coupleQuery = useQuery<CoupleWithPartners | null>({
    queryKey: ["couple", profile?.couple_id],
    queryFn: async () => {
      if (!profile?.couple_id) return null;
      const { data, error } = await supabase
        .from("Couples_couples")
        .select(`
          *,
          partner1:Couples_profiles!Couples_couples_partner1_id_fkey(*),
          partner2:Couples_profiles!Couples_couples_partner2_id_fkey(*)
        `)
        .eq("id", profile.couple_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.couple_id,
  });

  const couple = coupleQuery.data;

  const promptsQuery = useQuery<TherapistPrompt[]>({
    queryKey: ["/api/therapist-prompts", profile?.couple_id, "reflection"],
    queryFn: async () => {
      if (!profile?.couple_id) return [];
      const { data, error } = await supabase
        .from("Couples_therapist_prompts")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .eq("tool_name", "reflection")
        .eq("is_enabled", true)
        .or(`target_user_id.is.null,target_user_id.eq.${profile?.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.couple_id && !!profile?.id,
  });

  const partnerName = couple?.partner1?.id === profile?.id
    ? couple?.partner2?.full_name || "Partner"
    : couple?.partner1?.full_name || "Partner";

  if (!profile || coupleQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingPrompts = promptsQuery.data || [];

  return (
    <div className="container max-w-4xl py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <Sparkles className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              Reflection Prompts
            </h1>
            <p className="text-muted-foreground">
              Guided questions from your therapist to help deepen your connection
            </p>
          </div>
        </div>
      </div>

      {promptsQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : pendingPrompts.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Reflection Prompts Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your therapist hasn't sent any reflection questions yet. Check back later for new prompts to explore together.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pendingPrompts.map((prompt) => (
            <ReflectionPromptCard
              key={prompt.id}
              prompt={prompt}
              userId={profile.id}
              coupleId={couple?.id || profile.couple_id || ""}
              partnerName={partnerName}
            />
          ))}
        </div>
      )}
    </div>
  );
}
