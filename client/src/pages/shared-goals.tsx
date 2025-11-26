import { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Target, Plus, Loader2, GripVertical } from "lucide-react";
import { SharedGoal, Profile } from "@shared/schema";

type GoalWithAssignee = SharedGoal & { assignee?: Profile };

export default function SharedGoalsPage() {
  const [goals, setGoals] = useState<GoalWithAssignee[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.couple_id) {
      fetchGoals();
    }
  }, [profile?.couple_id]);

  const fetchGoals = async () => {
    if (!profile?.couple_id) return;

    try {
      const { data: goalsData, error: goalsError } = await supabase
        .from("Couples_shared_goals")
        .select("*")
        .eq("couple_id", profile.couple_id)
        .order("created_at", { ascending: false });

      if (goalsError) throw goalsError;

      const assigneeIds = [
        ...new Set(goalsData.map((g) => g.assigned_to).filter(Boolean)),
      ];
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from("Couples_profiles")
          .select("*")
          .in("id", assigneeIds);

        const goalsWithAssignees = goalsData.map((goal) => ({
          ...goal,
          assignee: profiles?.find((p) => p.id === goal.assigned_to),
        }));

        setGoals(goalsWithAssignees);
      } else {
        setGoals(goalsData);
      }
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

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.couple_id || !newGoalTitle.trim()) return;

    setAdding(true);

    try {
      const { error } = await supabase.from("Couples_shared_goals").insert({
        couple_id: profile.couple_id,
        created_by: user.id,
        title: newGoalTitle.trim(),
        status: "backlog",
      });

      if (error) throw error;

      setNewGoalTitle("");
      fetchGoals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as "backlog" | "doing" | "done";

    try {
      const { error } = await supabase
        .from("Couples_shared_goals")
        .update({ status: newStatus })
        .eq("id", draggableId);

      if (error) throw error;

      fetchGoals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const columns = [
    {
      id: "backlog",
      title: "Backlog",
      goals: goals.filter((g) => g.status === "backlog"),
    },
    {
      id: "doing",
      title: "In Progress",
      goals: goals.filter((g) => g.status === "doing"),
    },
    {
      id: "done",
      title: "Completed",
      goals: goals.filter((g) => g.status === "done"),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Shared Goals</h1>
          </div>
          <p className="text-muted-foreground">
            Track your journey together with shared goals
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleAddGoal} className="flex gap-2">
              <Input
                placeholder="Add a new goal for your relationship..."
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                data-testid="input-new-goal"
              />
              <Button
                type="submit"
                disabled={!newGoalTitle.trim() || adding}
                data-testid="button-add-goal"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Goal
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map((column) => (
              <div key={column.id} className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {column.title}
                  <span className="text-sm text-muted-foreground">
                    ({column.goals.length})
                  </span>
                </h2>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`min-h-64 rounded-lg border-2 border-dashed p-4 space-y-3 ${
                        snapshot.isDraggingOver
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                      data-testid={`droppable-${column.id}`}
                    >
                      {column.goals.map((goal, index) => (
                        <Draggable
                          key={goal.id}
                          draggableId={goal.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`hover-elevate ${snapshot.isDragging ? "shadow-lg" : ""}`}
                              data-testid={`card-goal-${goal.id}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-1 cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <p className="font-medium">{goal.title}</p>
                                    {goal.assignee && (
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                          <AvatarFallback className="text-xs bg-secondary">
                                            {goal.assignee.full_name?.charAt(
                                              0,
                                            ) || "?"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-muted-foreground">
                                          {goal.assignee.full_name}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
