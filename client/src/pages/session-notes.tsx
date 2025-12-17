import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  FileText,
  Calendar,
  Target,
  BookOpen,
  Lightbulb,
  ClipboardList,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface SessionNote {
  id: string;
  couple_id: string;
  therapist_id: string;
  session_date: string;
  title: string;
  summary?: string;
  key_themes?: string[];
  homework_assigned?: string;
  next_session_goals?: string;
  is_private?: boolean;
  created_at?: string;
}

export default function SessionNotes() {
  const { profile } = useAuth();

  const {
    data: notes,
    isLoading,
    error,
  } = useQuery<SessionNote[]>({
    queryKey: ["session-notes-client", profile?.couple_id],
    enabled: !!profile?.couple_id,
    queryFn: async () => {
      if (!profile?.couple_id) throw new Error("No couple ID");

      const { data, error } = await supabase
        .from("Couples_session_notes")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .eq("is_private", false)
        .order("session_date", { ascending: false });

      if (error) throw error;
      return data as SessionNote[];
    },
  });

  const groupNotesByMonth = (notes: SessionNote[]) => {
    const grouped: Record<string, SessionNote[]> = {};
    notes.forEach((note) => {
      const monthKey = format(new Date(note.session_date), "MMMM yyyy");
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(note);
    });
    return Object.entries(grouped);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4"
              data-testid="button-back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Session Notes</h1>
          </div>
          <p className="text-muted-foreground">
            Summaries and homework from your therapy sessions
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              Failed to load session notes. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {!notes || notes.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Session Notes Yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your therapist will share session summaries and homework here after your appointments.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupNotesByMonth(notes).map(([month, monthNotes]) => (
              <div key={month}>
                <h2 className="text-lg font-semibold text-muted-foreground mb-3">{month}</h2>
                <Accordion type="single" collapsible className="space-y-2">
                  {monthNotes.map((note) => (
                    <AccordionItem key={note.id} value={note.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline py-4" data-testid={`session-note-${note.id}`}>
                        <div className="flex items-center gap-3 text-left">
                          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="font-medium">{note.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(note.session_date), "EEEE, MMMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="space-y-4">
                          {note.summary && (
                            <div className="bg-muted/50 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <BookOpen className="h-4 w-4 text-primary" />
                                <h4 className="font-medium">Summary</h4>
                              </div>
                              <p className="text-sm text-muted-foreground">{note.summary}</p>
                            </div>
                          )}

                          {note.key_themes && note.key_themes.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="h-4 w-4 text-amber-500" />
                                <h4 className="font-medium text-sm">Key Themes</h4>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {note.key_themes.map((theme, idx) => (
                                  <Badge key={idx} variant="secondary">{theme}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {note.homework_assigned && (
                            <div className="bg-primary/5 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <ClipboardList className="h-4 w-4 text-primary" />
                                <h4 className="font-medium">Homework</h4>
                              </div>
                              <p className="text-sm">{note.homework_assigned}</p>
                            </div>
                          )}

                          {note.next_session_goals && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Target className="h-4 w-4 text-emerald-500" />
                                <h4 className="font-medium text-sm">Goals for Next Session</h4>
                              </div>
                              <p className="text-sm text-muted-foreground">{note.next_session_goals}</p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
