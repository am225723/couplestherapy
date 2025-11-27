import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  MessageCircle,
  Loader2,
  ArrowLeft,
  User,
  Users,
  Calendar,
  CheckCircle2,
  FileText,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";

interface TherapistThought {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  individual_id: string | null;
  thought_type: "todo" | "message" | "file_reference";
  file_reference: string | null;
  priority: "low" | "medium" | "high" | null;
  is_completed: boolean | null;
  audience: "couple" | "individual";
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function renderContentWithLinks(content: string | null) {
  if (!content) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part) && isValidUrl(part)) {
      urlRegex.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          {part}
          <ExternalLink className="h-3 w-3" />
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function ThoughtCard({
  thought,
  onToggleComplete,
}: {
  thought: TherapistThought;
  onToggleComplete?: (id: string) => void;
}) {
  const getIcon = () => {
    switch (thought.thought_type) {
      case "todo":
        return (
          <CheckCircle2
            className={`h-5 w-5 ${thought.is_completed ? "text-muted-foreground" : "text-green-600 dark:text-green-400"}`}
          />
        );
      case "file_reference":
        return (
          <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        );
      default:
        return (
          <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        );
    }
  };

  const getTypeLabel = () => {
    switch (thought.thought_type) {
      case "todo":
        return "To-Do";
      case "file_reference":
        return "Resource";
      default:
        return "Message";
    }
  };

  return (
    <Card
      data-testid={`thought-card-${thought.id}`}
      className={thought.is_completed ? "opacity-60" : ""}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          {thought.thought_type === "todo" && (
            <Checkbox
              checked={thought.is_completed || false}
              onCheckedChange={() => onToggleComplete?.(thought.id)}
              className="mt-1.5"
              data-testid={`checkbox-complete-${thought.id}`}
            />
          )}
          <div className="flex-1 min-w-0">
            <CardTitle
              className={`text-lg flex items-center gap-2 flex-wrap ${thought.is_completed ? "line-through text-muted-foreground" : ""}`}
            >
              {getIcon()}
              {thought.title || "Untitled"}
              <Badge variant="outline" className="text-xs">
                {getTypeLabel()}
              </Badge>
              {thought.audience === "individual" ? (
                <Badge
                  variant="secondary"
                  className="text-xs flex items-center gap-1"
                >
                  <User className="h-3 w-3" />
                  Just for you
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs flex items-center gap-1"
                >
                  <Users className="h-3 w-3" />
                  For both
                </Badge>
              )}
              {thought.thought_type === "todo" &&
                thought.priority &&
                !thought.is_completed && (
                  <Badge
                    variant={
                      thought.priority === "high"
                        ? "destructive"
                        : thought.priority === "medium"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-xs"
                  >
                    {thought.priority}
                  </Badge>
                )}
              {thought.is_completed && (
                <Badge variant="secondary" className="text-xs">
                  Completed
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(thought.created_at).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {thought.content && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p
              className={`whitespace-pre-wrap ${thought.is_completed ? "text-muted-foreground" : "text-foreground"}`}
            >
              {renderContentWithLinks(thought.content)}
            </p>
          </div>
        )}
        {thought.file_reference && isValidUrl(thought.file_reference) && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <a
              href={thought.file_reference}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1 text-sm break-all"
            >
              {thought.file_reference}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TherapistThoughts() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const thoughtsQuery = useQuery<TherapistThought[]>({
    queryKey: ["/api/therapist-thoughts/client/messages"],
    enabled: !!profile?.couple_id,
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(
        "PATCH",
        `/api/therapist-thoughts/client/${id}/complete`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/therapist-thoughts/client/messages"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update to-do",
        variant: "destructive",
      });
    },
  });

  const handleToggleComplete = (id: string) => {
    completeMutation.mutate(id);
  };

  const thoughts = thoughtsQuery.data || [];
  const todos = thoughts.filter((t) => t.thought_type === "todo");
  const messages = thoughts.filter((t) => t.thought_type === "message");
  const files = thoughts.filter((t) => t.thought_type === "file_reference");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              From Your Therapist
            </h1>
            <p className="text-muted-foreground mt-1">
              Messages, to-dos, and resources from your therapy sessions
            </p>
          </div>
        </div>

        {thoughtsQuery.isLoading && (
          <Card data-testid="card-thoughts-loading">
            <CardContent className="py-12 flex items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {thoughtsQuery.isSuccess && thoughts.length === 0 && (
          <Card data-testid="card-no-thoughts">
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nothing here yet</h3>
              <p className="text-muted-foreground">
                Your therapist hasn't shared anything yet. Check back after your
                next session.
              </p>
            </CardContent>
          </Card>
        )}

        {thoughtsQuery.isSuccess && thoughts.length > 0 && (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" data-testid="tab-all">
                All ({thoughts.length})
              </TabsTrigger>
              <TabsTrigger value="messages" data-testid="tab-messages">
                Messages ({messages.length})
              </TabsTrigger>
              <TabsTrigger value="todos" data-testid="tab-todos">
                To-Dos ({todos.length})
              </TabsTrigger>
              <TabsTrigger value="files" data-testid="tab-files">
                Resources ({files.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-6">
              {thoughts.map((thought) => (
                <ThoughtCard
                  key={thought.id}
                  thought={thought}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </TabsContent>

            <TabsContent value="messages" className="space-y-4 mt-6">
              {messages.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No messages yet
                  </CardContent>
                </Card>
              ) : (
                messages.map((thought) => (
                  <ThoughtCard
                    key={thought.id}
                    thought={thought}
                    onToggleComplete={handleToggleComplete}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="todos" className="space-y-4 mt-6">
              {todos.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No to-dos yet
                  </CardContent>
                </Card>
              ) : (
                todos.map((thought) => (
                  <ThoughtCard
                    key={thought.id}
                    thought={thought}
                    onToggleComplete={handleToggleComplete}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="files" className="space-y-4 mt-6">
              {files.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No resources yet
                  </CardContent>
                </Card>
              ) : (
                files.map((thought) => (
                  <ThoughtCard
                    key={thought.id}
                    thought={thought}
                    onToggleComplete={handleToggleComplete}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
