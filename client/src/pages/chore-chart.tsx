import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertChoreSchema, type Profile, type Chore } from "@shared/schema";
import { Loader2, Plus, Trash2, RotateCcw } from "lucide-react";
import { useState, useMemo } from "react";

interface ChoreWithCreator extends Chore {
  creator_name?: string;
  assigned_to_name?: string;
}

export default function ChoreChart() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"weekly" | "daily">("weekly");

  const form = useForm({
    resolver: zodResolver(insertChoreSchema),
    defaultValues: {
      title: "",
      assigned_to: "",
      recurrence: "daily",
    },
  });

  const choresQuery = useQuery({
    queryKey: [`/api/chores/couple/${profile?.couple_id}`],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (!profile?.couple_id) throw new Error("No couple ID");
      return apiRequest("POST", `/api/chores/couple/${profile.couple_id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Chore added" });
      queryClient.invalidateQueries({ queryKey: [`/api/chores/couple/${profile?.couple_id}`] });
      form.reset();
      setIsOpen(false);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ choreId, completed_by }: { choreId: string; completed_by: string }) => {
      return apiRequest("PATCH", `/api/chores/${choreId}/complete`, { completed_by });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chores/couple/${profile?.couple_id}`] });
    },
  });

  const incompleteMutation = useMutation({
    mutationFn: async (choreId: string) => {
      return apiRequest("PATCH", `/api/chores/${choreId}/incomplete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chores/couple/${profile?.couple_id}`] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (choreId: string) => {
      return apiRequest("DELETE", `/api/chores/${choreId}`, {});
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Chore deleted" });
      queryClient.invalidateQueries({ queryKey: [`/api/chores/couple/${profile?.couple_id}`] });
    },
  });

  const chores = (choresQuery.data || []) as ChoreWithCreator[];
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  const weeklyChores = useMemo(() => {
    return chores.filter((c) => c.recurrence === "weekly");
  }, [chores]);

  const dailyChores = useMemo(() => {
    return chores.filter((c) => c.recurrence === "daily");
  }, [chores]);

  const specificDayChores = useMemo(() => {
    return chores.filter((c) =>
      [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ].includes(c.recurrence) && c.recurrence === dayName
    );
  }, [chores, dayName]);

  const todaysChores = useMemo(() => {
    return [...dailyChores, ...specificDayChores];
  }, [dailyChores, specificDayChores]);

  const getPartnerName = (userId?: string) => {
    if (!userId) return "Unassigned";
    // Simple logic - would need to fetch from profiles in real implementation
    return userId === profile?.id ? "You" : "Your Partner";
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Chore Chart</h1>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-wrap">
          <Button
            variant={viewMode === "daily" ? "default" : "outline"}
            onClick={() => setViewMode("daily")}
            className="gap-2"
            data-testid="button-view-daily"
          >
            Today's Chores
          </Button>
          <Button
            variant={viewMode === "weekly" ? "default" : "outline"}
            onClick={() => setViewMode("weekly")}
            className="gap-2"
            data-testid="button-view-weekly"
          >
            Weekly View
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 ml-auto" data-testid="button-add-chore">
                <Plus className="w-4 h-4" />
                Add Chore
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-sm">
              <DialogHeader>
                <DialogTitle>Add New Chore</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chore Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Do laundry" data-testid="input-chore-title" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assigned_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned To</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-assigned-to">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={profile?.id || ""}>Me</SelectItem>
                              <SelectItem value="partner">My Partner</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recurrence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-frequency">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monday">Every Monday</SelectItem>
                              <SelectItem value="tuesday">Every Tuesday</SelectItem>
                              <SelectItem value="wednesday">Every Wednesday</SelectItem>
                              <SelectItem value="thursday">Every Thursday</SelectItem>
                              <SelectItem value="friday">Every Friday</SelectItem>
                              <SelectItem value="saturday">Every Saturday</SelectItem>
                              <SelectItem value="sunday">Every Sunday</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={createMutation.isPending} className="w-full" data-testid="button-submit-chore">
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Add Chore"
                    )}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Loading State */}
      {choresQuery.isLoading ? (
        <Card>
          <CardContent className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : viewMode === "daily" ? (
        /* Daily View */
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Today - {today.toLocaleDateString()}</h2>
          {todaysChores.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">No chores for today!</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todaysChores.map((chore) => (
                <Card
                  key={chore.id}
                  className={chore.is_completed ? "opacity-60" : ""}
                  data-testid={`card-chore-${chore.id}`}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <Checkbox
                      checked={chore.is_completed}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          completeMutation.mutate({ choreId: chore.id, completed_by: profile?.id || "" });
                        } else {
                          incompleteMutation.mutate(chore.id);
                        }
                      }}
                      data-testid={`checkbox-chore-${chore.id}`}
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${chore.is_completed ? "line-through text-muted-foreground" : ""}`}>
                        {chore.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{getPartnerName(chore.assigned_to)}</p>
                      {chore.completed_at && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          ✓ Completed at {new Date(chore.completed_at).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(chore.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-chore-${chore.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Weekly View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Daily Chores */}
          {dailyChores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Chores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dailyChores.map((chore) => (
                  <div key={chore.id} className="flex items-center gap-3 p-2 rounded hover-elevate" data-testid={`daily-chore-${chore.id}`}>
                    <Checkbox
                      checked={chore.is_completed}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          completeMutation.mutate({ choreId: chore.id, completed_by: profile?.id || "" });
                        } else {
                          incompleteMutation.mutate(chore.id);
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${chore.is_completed ? "line-through text-muted-foreground" : ""}`}>
                        {chore.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{getPartnerName(chore.assigned_to)}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(chore.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Weekly Chores */}
          {weeklyChores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly Chores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {weeklyChores.map((chore) => (
                  <div key={chore.id} className="flex items-center gap-3 p-2 rounded hover-elevate" data-testid={`weekly-chore-${chore.id}`}>
                    <Checkbox
                      checked={chore.is_completed}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          completeMutation.mutate({ choreId: chore.id, completed_by: profile?.id || "" });
                        } else {
                          incompleteMutation.mutate(chore.id);
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${chore.is_completed ? "line-through text-muted-foreground" : ""}`}>
                        {chore.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{getPartnerName(chore.assigned_to)}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(chore.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Specific Day Chores */}
          {chores.some((c) =>
            ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(c.recurrence)
          ) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Day-Specific Chores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {chores
                  .filter((c) =>
                    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(c.recurrence)
                  )
                  .map((chore) => (
                    <div key={chore.id} className="flex items-center gap-3 p-2 rounded hover-elevate" data-testid={`day-chore-${chore.id}`}>
                      <Checkbox
                        checked={chore.is_completed}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            completeMutation.mutate({ choreId: chore.id, completed_by: profile?.id || "" });
                          } else {
                            incompleteMutation.mutate(chore.id);
                          }
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${chore.is_completed ? "line-through text-muted-foreground" : ""}`}>
                          {chore.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {chore.recurrence.charAt(0).toUpperCase() + chore.recurrence.slice(1)} · {getPartnerName(chore.assigned_to)}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(chore.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
