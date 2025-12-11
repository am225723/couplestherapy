import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Loader2,
  CheckCircle2,
  Circle,
  Calendar,
  User,
  AlertCircle,
  ListTodo,
  Trash2,
  Edit,
} from "lucide-react";

interface SharedTodo {
  id: string;
  couple_id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  assigned_by: string;
  due_date?: string;
  priority: "low" | "medium" | "high";
  category?: string;
  is_completed: boolean;
  completed_by?: string;
  completed_at?: string;
  is_therapist_assigned: boolean;
  therapist_notes?: string;
  created_at: string;
  updated_at: string;
}

interface ProfileWithCouple {
  id: string;
  couple_id?: string;
  full_name?: string;
  role?: string;
  [key: string]: any;
}

const PRIORITY_COLORS = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

const CATEGORY_OPTIONS = [
  { value: "therapy", label: "Therapy" },
  { value: "relationship", label: "Relationship" },
  { value: "personal", label: "Personal" },
  { value: "household", label: "Household" },
  { value: "communication", label: "Communication" },
  { value: "date-night", label: "Date Night" },
];

export default function SharedTodosPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const coupleId = (profile as ProfileWithCouple)?.couple_id;
  const isTherapist = (profile as ProfileWithCouple)?.role === "therapist";

  const [showCompleted, setShowCompleted] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<SharedTodo | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [category, setCategory] = useState("");

  // Fetch todos
  const { data: todos, isLoading } = useQuery<SharedTodo[]>({
    queryKey: [`/api/shared-todos/couple/${coupleId}?showCompleted=${showCompleted}`],
    enabled: !!coupleId,
  });

  // Create todo
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/shared-todos", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shared-todos/couple", coupleId] });
      toast({ title: "Success", description: "Task created successfully" });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  // Update todo
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return apiRequest("PATCH", `/api/shared-todos/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shared-todos/couple", coupleId] });
      toast({ title: "Success", description: "Task updated successfully" });
      setEditingTodo(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    },
  });

  // Toggle completion
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      return apiRequest("PATCH", `/api/shared-todos/${id}/complete`, { is_completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shared-todos/couple", coupleId] });
    },
  });

  // Delete todo
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/shared-todos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shared-todos/couple", coupleId] });
      toast({ title: "Success", description: "Task deleted" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setDueDate("");
    setPriority("medium");
    setCategory("");
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }

    const data = {
      couple_id: coupleId,
      title: title.trim(),
      description: description.trim() || undefined,
      assigned_to: assignedTo || undefined,
      due_date: dueDate || undefined,
      priority,
      category: category || undefined,
    };

    if (editingTodo) {
      updateMutation.mutate({ id: editingTodo.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (todo: SharedTodo) => {
    setEditingTodo(todo);
    setTitle(todo.title);
    setDescription(todo.description || "");
    setAssignedTo(todo.assigned_to || "");
    setDueDate(todo.due_date ? todo.due_date.split("T")[0] : "");
    setPriority(todo.priority);
    setCategory(todo.category || "");
    setIsAddDialogOpen(true);
  };

  const getAssigneeName = (userId?: string) => {
    if (!userId) return "Unassigned";
    if (userId === user?.id) return "You";
    return "Partner";
  };

  const pendingTodos = todos?.filter((t) => !t.is_completed) || [];
  const completedTodos = todos?.filter((t) => t.is_completed) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ListTodo className="w-8 h-8 text-primary" />
            Shared To-Do List
          </h1>
          <p className="text-muted-foreground">
            Tasks and assignments for you and your partner
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setEditingTodo(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-todo">
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTodo ? "Edit Task" : "Add New Task"}</DialogTitle>
              <DialogDescription>
                {editingTodo ? "Update task details" : "Create a new task for you or your partner"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter task title..."
                  data-testid="input-todo-title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details..."
                  rows={3}
                  data-testid="input-todo-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assigned-to">Assign To</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger data-testid="select-assigned-to">
                      <SelectValue placeholder="Select person" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      <SelectItem value={user?.id || ""}>Me</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="due-date">Due Date</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    data-testid="input-due-date"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full"
                data-testid="button-save-todo"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingTodo ? "Update Task" : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Show completed toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="show-completed"
          checked={showCompleted}
          onCheckedChange={setShowCompleted}
          data-testid="switch-show-completed"
        />
        <Label htmlFor="show-completed" className="text-sm">
          Show completed tasks
        </Label>
      </div>

      {/* Pending Tasks */}
      {pendingTodos.length === 0 && !showCompleted ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">All caught up!</h3>
            <p className="text-muted-foreground mb-4">
              No pending tasks. Add a new task to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingTodos.map((todo) => (
            <Card key={todo.id} className="hover-elevate" data-testid={`card-todo-${todo.id}`}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="p-2 -m-2 touch-manipulation"
                    onClick={() => toggleMutation.mutate({ id: todo.id, is_completed: !todo.is_completed })}
                    data-testid={`checkbox-wrapper-${todo.id}`}
                  >
                    <Checkbox
                      checked={todo.is_completed}
                      onCheckedChange={(checked) => {
                        toggleMutation.mutate({ id: todo.id, is_completed: !!checked });
                      }}
                      className="h-5 w-5"
                      data-testid={`checkbox-todo-${todo.id}`}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="font-medium">{todo.title}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={PRIORITY_COLORS[todo.priority]}>
                          {todo.priority}
                        </Badge>
                        {todo.category && (
                          <Badge variant="outline">{todo.category}</Badge>
                        )}
                        {todo.is_therapist_assigned && (
                          <Badge variant="secondary">From Therapist</Badge>
                        )}
                      </div>
                    </div>
                    {todo.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {todo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {getAssigneeName(todo.assigned_to)}
                      </span>
                      {todo.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(todo.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(todo)}
                      data-testid={`button-edit-todo-${todo.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(todo.id)}
                      data-testid={`button-delete-todo-${todo.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed Tasks */}
      {showCompleted && completedTodos.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground">Completed</h3>
          {completedTodos.map((todo) => (
            <Card key={todo.id} className="opacity-60" data-testid={`card-todo-completed-${todo.id}`}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="p-2 -m-2 touch-manipulation"
                    onClick={() => toggleMutation.mutate({ id: todo.id, is_completed: !todo.is_completed })}
                    data-testid={`checkbox-wrapper-completed-${todo.id}`}
                  >
                    <Checkbox
                      checked={todo.is_completed}
                      onCheckedChange={(checked) => {
                        toggleMutation.mutate({ id: todo.id, is_completed: !!checked });
                      }}
                      className="h-5 w-5"
                      data-testid={`checkbox-todo-completed-${todo.id}`}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium line-through">{todo.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed {todo.completed_at && new Date(todo.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(todo.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
