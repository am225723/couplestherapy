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
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import {
  MessageCircle,
  Loader2,
  ArrowLeft,
  User,
  Users,
  Calendar,
} from "lucide-react";

export default function TherapistMessages() {
  const { profile } = useAuth();

  const messagesQuery = useQuery<{
    id: string;
    title: string;
    content: string | null;
    created_at: string;
    individual_id: string | null;
    audience: "couple" | "individual";
  }[]>({
    queryKey: ["/api/therapist-thoughts/client/messages"],
    enabled: !!profile?.couple_id,
  });

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
              Messages from Your Therapist
            </h1>
            <p className="text-muted-foreground mt-1">
              Notes, insights, and guidance from your therapy sessions
            </p>
          </div>
        </div>

        {messagesQuery.isLoading && (
          <Card data-testid="card-messages-loading">
            <CardContent className="py-12 flex items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading messages...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {messagesQuery.isSuccess && messagesQuery.data && messagesQuery.data.length === 0 && (
          <Card data-testid="card-no-messages">
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No messages yet</h3>
              <p className="text-muted-foreground">
                Your therapist hasn't sent any messages yet. Check back after your next session.
              </p>
            </CardContent>
          </Card>
        )}

        {messagesQuery.isSuccess && messagesQuery.data && messagesQuery.data.length > 0 && (
          <div className="space-y-4">
            {messagesQuery.data.map((message) => (
              <Card key={message.id} data-testid={`message-card-${message.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                        {message.title}
                        {message.audience === "individual" ? (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Just for you
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            For both of you
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1.5 mt-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(message.created_at).toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {message.content && (
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-foreground whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
