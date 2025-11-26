import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, Heart, Shield } from "lucide-react";
import { IfsExercise, IfsPart } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

type ExerciseWithParts = IfsExercise & {
  parts: IfsPart[];
};

export default function IfsIntroPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPart, setEditingPart] = useState<IfsPart | null>(null);
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(
    null,
  );

  // Form state
  const [partName, setPartName] = useState("");
  const [whenAppears, setWhenAppears] = useState("");
  const [letterContent, setLetterContent] = useState("");

  // Fetch exercises
  const { data: exercises, isLoading } = useQuery<ExerciseWithParts[]>({
    queryKey: ["/api/ifs/exercises", user?.id],
    enabled: !!user?.id,
  });

  // Get or create active exercise
  const activeExercise =
    exercises?.find((e) => e.status === "in_progress") || null;

  // Create exercise mutation
  const createExerciseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ifs/exercise", {
        user_id: user!.id,
        couple_id: profile!.couple_id,
        status: "in_progress",
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentExerciseId(data.id);
      queryClient.invalidateQueries({
        queryKey: ["/api/ifs/exercises", user?.id],
      });
      toast({
        title: "Exercise Started",
        description: "Begin by identifying a protective part.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start exercise",
        variant: "destructive",
      });
    },
  });

  // Add part mutation
  const addPartMutation = useMutation({
    mutationFn: async (partData: {
      part_name: string;
      when_appears: string;
      letter_content: string;
    }) => {
      const exerciseId = currentExerciseId || activeExercise?.id;
      if (!exerciseId) throw new Error("No active exercise");

      const response = await apiRequest("POST", "/api/ifs/part", {
        exercise_id: exerciseId,
        user_id: user!.id,
        ...partData,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/ifs/exercises", user?.id],
      });
      setShowAddDialog(false);
      setPartName("");
      setWhenAppears("");
      setLetterContent("");
      toast({
        title: "Part Added",
        description:
          "Your protective part has been identified and acknowledged.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add part",
        variant: "destructive",
      });
    },
  });

  // Update part mutation
  const updatePartMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<IfsPart>;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/ifs/part/${id}`,
        updates,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/ifs/exercises", user?.id],
      });
      setEditingPart(null);
      setPartName("");
      setWhenAppears("");
      setLetterContent("");
      toast({
        title: "Part Updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update part",
        variant: "destructive",
      });
    },
  });

  // Delete part mutation
  const deletePartMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/ifs/part/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/ifs/exercises", user?.id],
      });
      toast({
        title: "Part Deleted",
        description: "The protective part has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete part",
        variant: "destructive",
      });
    },
  });

  const handleStartExercise = () => {
    if (!activeExercise) {
      createExerciseMutation.mutate();
    }
    setShowAddDialog(true);
  };

  const handleAddPart = () => {
    if (!partName.trim() || !whenAppears.trim() || !letterContent.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    addPartMutation.mutate({
      part_name: partName,
      when_appears: whenAppears,
      letter_content: letterContent,
    });
  };

  const handleEditPart = (part: IfsPart) => {
    setEditingPart(part);
    setPartName(part.part_name);
    setWhenAppears(part.when_appears);
    setLetterContent(part.letter_content);
  };

  const handleUpdatePart = () => {
    if (
      !editingPart ||
      !partName.trim() ||
      !whenAppears.trim() ||
      !letterContent.trim()
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    updatePartMutation.mutate({
      id: editingPart.id,
      updates: {
        part_name: partName,
        when_appears: whenAppears,
        letter_content: letterContent,
      },
    });
  };

  const handleCancelEdit = () => {
    setEditingPart(null);
    setPartName("");
    setWhenAppears("");
    setLetterContent("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-ifs" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          IFS Introduction
        </h1>
        <p
          className="text-muted-foreground"
          data-testid="text-page-description"
        >
          Inner Family Systems (IFS) helps you identify and understand your
          protective parts. These are inner voices that try to keep you safe,
          but may sometimes hold you back.
        </p>
      </div>

      {/* Info Card */}
      <Card data-testid="card-info">
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2"
            data-testid="text-info-title"
          >
            <Shield className="h-5 w-5" />
            About Protective Parts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p data-testid="text-info-1">
            <strong>Examples of protective parts:</strong> The Critic, The
            Perfectionist, The People Pleaser, The Controller, The Avoider
          </p>
          <p data-testid="text-info-2">
            <strong>How to identify them:</strong> Notice inner voices that
            judge, control, or protect you in specific situations.
          </p>
          <p data-testid="text-info-3">
            <strong>This is private:</strong> Your letters to your parts are
            visible only to you and your therapist, not your partner.
          </p>
        </CardContent>
      </Card>

      {/* Add Part Button */}
      <div className="flex justify-center">
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={handleStartExercise}
              size="lg"
              data-testid="button-add-part"
            >
              <Plus className="h-5 w-5 mr-2" />
              Identify a Protective Part
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="dialog-add-part">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">
                Identify a Protective Part
              </DialogTitle>
              <DialogDescription data-testid="text-dialog-description">
                Follow the three steps to identify and acknowledge a protective
                part.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Step 1: Name the Part */}
              <div className="space-y-2">
                <Label
                  htmlFor="part-name"
                  className="text-base font-semibold"
                  data-testid="label-part-name"
                >
                  Step 1: Name This Part
                </Label>
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="text-part-name-hint"
                >
                  Give this protective part a name that describes its role.
                </p>
                <Input
                  id="part-name"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="e.g., The Critic, The Perfectionist, The Worrier"
                  data-testid="input-part-name"
                />
              </div>

              {/* Step 2: When It Appears */}
              <div className="space-y-2">
                <Label
                  htmlFor="when-appears"
                  className="text-base font-semibold"
                  data-testid="label-when-appears"
                >
                  Step 2: When Does This Part Show Up?
                </Label>
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="text-when-appears-hint"
                >
                  Describe the situations or triggers when you notice this part.
                </p>
                <Textarea
                  id="when-appears"
                  value={whenAppears}
                  onChange={(e) => setWhenAppears(e.target.value)}
                  placeholder="e.g., When I make a mistake, this part tells me I'm not good enough and that I should have done better..."
                  className="min-h-24"
                  data-testid="input-when-appears"
                />
              </div>

              {/* Step 3: Letter to the Part */}
              <div className="space-y-2">
                <Label
                  htmlFor="letter-content"
                  className="text-base font-semibold"
                  data-testid="label-letter"
                >
                  Step 3: Write a Letter to This Part
                </Label>
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="text-letter-hint"
                >
                  Thank this part for trying to protect you. Acknowledge what
                  it's trying to do, even if it's not always helpful.
                </p>
                <Textarea
                  id="letter-content"
                  value={letterContent}
                  onChange={(e) => setLetterContent(e.target.value)}
                  placeholder="Dear [Part Name], I see you trying to protect me by pushing me to be perfect. I know you're worried that if I'm not perfect, people will reject me. Thank you for trying to keep me safe. I want you to know that I'm learning it's okay to make mistakes..."
                  className="min-h-32"
                  data-testid="input-letter"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                data-testid="button-cancel-add"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddPart}
                disabled={addPartMutation.isPending}
                data-testid="button-submit-part"
              >
                {addPartMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Save Part
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Part Dialog */}
      {editingPart && (
        <Dialog
          open={!!editingPart}
          onOpenChange={(open) => !open && handleCancelEdit()}
        >
          <DialogContent className="max-w-2xl" data-testid="dialog-edit-part">
            <DialogHeader>
              <DialogTitle data-testid="text-edit-dialog-title">
                Edit Protective Part
              </DialogTitle>
              <DialogDescription data-testid="text-edit-dialog-description">
                Update the details of this protective part.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label
                  htmlFor="edit-part-name"
                  className="text-base font-semibold"
                  data-testid="label-edit-part-name"
                >
                  Part Name
                </Label>
                <Input
                  id="edit-part-name"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="e.g., The Critic"
                  data-testid="input-edit-part-name"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="edit-when-appears"
                  className="text-base font-semibold"
                  data-testid="label-edit-when-appears"
                >
                  When It Appears
                </Label>
                <Textarea
                  id="edit-when-appears"
                  value={whenAppears}
                  onChange={(e) => setWhenAppears(e.target.value)}
                  className="min-h-24"
                  data-testid="input-edit-when-appears"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="edit-letter-content"
                  className="text-base font-semibold"
                  data-testid="label-edit-letter"
                >
                  Letter to This Part
                </Label>
                <Textarea
                  id="edit-letter-content"
                  value={letterContent}
                  onChange={(e) => setLetterContent(e.target.value)}
                  className="min-h-32"
                  data-testid="input-edit-letter"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePart}
                disabled={updatePartMutation.isPending}
                data-testid="button-update-part"
              >
                {updatePartMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Update Part
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Your Protective Parts */}
      <div>
        <h2 className="text-2xl font-bold mb-4" data-testid="text-parts-title">
          Your Protective Parts
        </h2>
        {activeExercise &&
        activeExercise.parts &&
        activeExercise.parts.length > 0 ? (
          <div className="space-y-4">
            {activeExercise.parts.map((part) => (
              <Card key={part.id} data-testid={`card-part-${part.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle
                        className="flex items-center gap-2"
                        data-testid={`text-part-name-${part.id}`}
                      >
                        <Heart className="h-5 w-5" />
                        {part.part_name}
                      </CardTitle>
                      <CardDescription
                        data-testid={`text-part-date-${part.id}`}
                      >
                        Identified{" "}
                        {formatDistanceToNow(new Date(part.created_at), {
                          addSuffix: true,
                        })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditPart(part)}
                        data-testid={`button-edit-part-${part.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            data-testid={`button-delete-part-${part.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent
                          data-testid={`dialog-delete-confirm-${part.id}`}
                        >
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete this part?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{part.part_name}"
                              and your letter to it. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              data-testid={`button-cancel-delete-${part.id}`}
                            >
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePartMutation.mutate(part.id)}
                              data-testid={`button-confirm-delete-${part.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div data-testid={`container-when-appears-${part.id}`}>
                    <p className="text-sm font-semibold mb-1">
                      When This Part Shows Up:
                    </p>
                    <p
                      className="text-sm text-muted-foreground"
                      data-testid={`text-when-appears-${part.id}`}
                    >
                      {part.when_appears}
                    </p>
                  </div>
                  <div data-testid={`container-letter-${part.id}`}>
                    <p className="text-sm font-semibold mb-1">
                      Your Letter to This Part:
                    </p>
                    <div className="bg-muted p-4 rounded-md">
                      <p
                        className="text-sm whitespace-pre-wrap"
                        data-testid={`text-letter-${part.id}`}
                      >
                        {part.letter_content}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card data-testid="card-no-parts">
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p
                className="text-muted-foreground mb-4"
                data-testid="text-no-parts"
              >
                You haven't identified any protective parts yet.
              </p>
              <Button
                onClick={handleStartExercise}
                data-testid="button-start-first-part"
              >
                <Plus className="h-4 w-4 mr-2" />
                Identify Your First Part
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
