import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Plus,
  Calendar,
  Edit3,
  Trash2,
  Loader2,
  ChevronRight,
  Target,
  BookOpen,
  Lightbulb,
  ClipboardList,
  Lock,
} from "lucide-react";
import { format } from "date-fns";

interface SessionNote {
  id: string;
  couple_id: string;
  therapist_id: string;
  session_date: string;
  title: string;
  summary?: string;
  key_themes?: string[];
  interventions_used?: string[];
  homework_assigned?: string;
  progress_notes?: string;
  next_session_goals?: string;
  is_private?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SessionNotesPanelProps {
  coupleId: string;
  therapistId: string;
}

const emptyNote: Omit<SessionNote, "id" | "couple_id" | "therapist_id" | "created_at" | "updated_at"> = {
  session_date: new Date().toISOString().split("T")[0],
  title: "",
  summary: "",
  key_themes: [],
  interventions_used: [],
  homework_assigned: "",
  progress_notes: "",
  next_session_goals: "",
  is_private: false,
};

export function SessionNotesPanel({ coupleId, therapistId }: SessionNotesPanelProps) {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
  const [formData, setFormData] = useState(emptyNote);
  const [themesInput, setThemesInput] = useState("");
  const [interventionsInput, setInterventionsInput] = useState("");

  const notesQuery = useQuery({
    queryKey: ["/api/session-notes/couple", coupleId],
    queryFn: async () => {
      const res = await fetch(`/api/session-notes/couple/${coupleId}`);
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json() as Promise<SessionNote[]>;
    },
    enabled: !!coupleId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/session-notes", {
        ...data,
        couple_id: coupleId,
        therapist_id: therapistId,
        key_themes: themesInput.split(",").map((t) => t.trim()).filter(Boolean),
        interventions_used: interventionsInput.split(",").map((i) => i.trim()).filter(Boolean),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-notes/couple", coupleId] });
      setIsCreateOpen(false);
      setFormData(emptyNote);
      setThemesInput("");
      setInterventionsInput("");
      toast({ title: "Success", description: "Session note created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create session note", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SessionNote>) => {
      if (!selectedNote) return;
      return apiRequest("PATCH", `/api/session-notes/${selectedNote.id}`, {
        ...data,
        key_themes: themesInput.split(",").map((t) => t.trim()).filter(Boolean),
        interventions_used: interventionsInput.split(",").map((i) => i.trim()).filter(Boolean),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-notes/couple", coupleId] });
      setSelectedNote(null);
      setFormData(emptyNote);
      setThemesInput("");
      setInterventionsInput("");
      toast({ title: "Success", description: "Session note updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update session note", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/session-notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-notes/couple", coupleId] });
      setSelectedNote(null);
      toast({ title: "Success", description: "Session note deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete session note", variant: "destructive" });
    },
  });

  const handleOpenNote = (note: SessionNote) => {
    setSelectedNote(note);
    setFormData({
      session_date: note.session_date,
      title: note.title,
      summary: note.summary || "",
      key_themes: note.key_themes || [],
      interventions_used: note.interventions_used || [],
      homework_assigned: note.homework_assigned || "",
      progress_notes: note.progress_notes || "",
      next_session_goals: note.next_session_goals || "",
      is_private: note.is_private || false,
    });
    setThemesInput((note.key_themes || []).join(", "));
    setInterventionsInput((note.interventions_used || []).join(", "));
  };

  const notes = notesQuery.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Session Notes
          </h3>
          <p className="text-sm text-muted-foreground">
            {notes.length} note{notes.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl" data-testid="button-add-session-note">
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Session Note</DialogTitle>
              <DialogDescription>Record details from your therapy session</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Session Date</Label>
                  <Input
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                    data-testid="input-session-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g., Initial Assessment"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    data-testid="input-session-title"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Session Summary</Label>
                <Textarea
                  placeholder="Brief overview of the session..."
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={3}
                  data-testid="input-session-summary"
                />
              </div>
              <div className="space-y-2">
                <Label>Key Themes (comma-separated)</Label>
                <Input
                  placeholder="e.g., communication, trust, intimacy"
                  value={themesInput}
                  onChange={(e) => setThemesInput(e.target.value)}
                  data-testid="input-key-themes"
                />
              </div>
              <div className="space-y-2">
                <Label>Interventions Used (comma-separated)</Label>
                <Input
                  placeholder="e.g., EFT, Gottman Method, CBT"
                  value={interventionsInput}
                  onChange={(e) => setInterventionsInput(e.target.value)}
                  data-testid="input-interventions"
                />
              </div>
              <div className="space-y-2">
                <Label>Homework Assigned</Label>
                <Textarea
                  placeholder="Tasks or exercises for the couple..."
                  value={formData.homework_assigned}
                  onChange={(e) => setFormData({ ...formData, homework_assigned: e.target.value })}
                  rows={2}
                  data-testid="input-homework"
                />
              </div>
              <div className="space-y-2">
                <Label>Progress Notes</Label>
                <Textarea
                  placeholder="Observations and progress..."
                  value={formData.progress_notes}
                  onChange={(e) => setFormData({ ...formData, progress_notes: e.target.value })}
                  rows={3}
                  data-testid="input-progress-notes"
                />
              </div>
              <div className="space-y-2">
                <Label>Goals for Next Session</Label>
                <Textarea
                  placeholder="Focus areas for the next meeting..."
                  value={formData.next_session_goals}
                  onChange={(e) => setFormData({ ...formData, next_session_goals: e.target.value })}
                  rows={2}
                  data-testid="input-next-goals"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.title || createMutation.isPending}
                data-testid="button-save-session-note"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {notesQuery.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : notes.length === 0 ? (
        <Card className="glass-card border-none">
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No session notes yet</p>
            <p className="text-sm text-muted-foreground mt-1">Click "Add Note" to record your first session</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            {notes.map((note) => (
              <Card
                key={note.id}
                className="glass-card border-none cursor-pointer hover-elevate transition-all"
                onClick={() => handleOpenNote(note)}
                data-testid={`card-session-note-${note.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{note.title}</h4>
                        {note.is_private && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(note.session_date), "MMM d, yyyy")}
                      </div>
                      {note.summary && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{note.summary}</p>
                      )}
                      {(note.key_themes?.length || 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.key_themes?.slice(0, 3).map((theme, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {theme}
                            </Badge>
                          ))}
                          {(note.key_themes?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(note.key_themes?.length || 0) - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Edit Session Note
            </DialogTitle>
            <DialogDescription>
              {selectedNote && format(new Date(selectedNote.session_date), "MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Session Date</Label>
                <Input
                  type="date"
                  value={formData.session_date}
                  onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Session Summary
              </Label>
              <Textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Key Themes
              </Label>
              <Input
                value={themesInput}
                onChange={(e) => setThemesInput(e.target.value)}
                placeholder="Comma-separated themes"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Interventions Used
              </Label>
              <Input
                value={interventionsInput}
                onChange={(e) => setInterventionsInput(e.target.value)}
                placeholder="Comma-separated interventions"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Homework Assigned
              </Label>
              <Textarea
                value={formData.homework_assigned}
                onChange={(e) => setFormData({ ...formData, homework_assigned: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Progress Notes</Label>
              <Textarea
                value={formData.progress_notes}
                onChange={(e) => setFormData({ ...formData, progress_notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Goals for Next Session</Label>
              <Textarea
                value={formData.next_session_goals}
                onChange={(e) => setFormData({ ...formData, next_session_goals: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Session Note?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The session note will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => selectedNote && deleteMutation.mutate(selectedNote.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setSelectedNote(null)} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate(formData)}
                disabled={!formData.title || updateMutation.isPending}
                className="flex-1 sm:flex-none"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
