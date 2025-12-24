import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import {
  Loader2,
  Calendar,
  Clock,
  Bell,
  Plus,
  Trash2,
  Save,
  AlertCircle,
} from "lucide-react";
import { Couple } from "@shared/schema";

interface CheckinSchedule {
  id: string;
  couple_id: string;
  therapist_id: string;
  day_of_week: number;
  time_of_day: string;
  is_active: boolean;
  notification_title: string;
  notification_body: string;
  created_at: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface CheckinRemindersProps {
  couple: Couple;
}

export function CheckinReminders({ couple }: CheckinRemindersProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [newSchedule, setNewSchedule] = useState({
    day_of_week: 0,
    time_of_day: "18:00",
    notification_title: "Weekly Check-In Time",
    notification_body:
      "Take a few minutes to reflect on your relationship this week.",
  });

  const { data: schedules, isLoading } = useQuery<CheckinSchedule[]>({
    queryKey: ["/api/checkin-schedules", couple.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Couples_checkin_schedules")
        .select("*")
        .eq("couple_id", couple.id)
        .order("day_of_week", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!couple.id,
  });

  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("Couples_checkin_schedules")
        .insert({
          id: crypto.randomUUID(),
          couple_id: couple.id,
          therapist_id: user.id,
          day_of_week: newSchedule.day_of_week,
          time_of_day: newSchedule.time_of_day,
          notification_title: newSchedule.notification_title,
          notification_body: newSchedule.notification_body,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/checkin-schedules", couple.id],
      });
      toast({
        title: "Reminder Created",
        description: "Weekly check-in reminder has been scheduled.",
      });
      setNewSchedule({
        day_of_week: 0,
        time_of_day: "18:00",
        notification_title: "Weekly Check-In Time",
        notification_body:
          "Take a few minutes to reflect on your relationship this week.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create reminder. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const { error } = await supabase
        .from("Couples_checkin_schedules")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/checkin-schedules", couple.id],
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update reminder.",
        variant: "destructive",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("Couples_checkin_schedules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/checkin-schedules", couple.id],
      });
      toast({
        title: "Reminder Deleted",
        description: "The check-in reminder has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete reminder.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Weekly Check-In Reminders
        </CardTitle>
        <CardDescription>
          Schedule automated reminders for this couple to complete their weekly
          check-ins.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {schedules && schedules.length > 0 ? (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Active Reminders</Label>
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                    data-testid={`schedule-item-${schedule.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {
                            DAYS_OF_WEEK.find(
                              (d) => d.value === schedule.day_of_week,
                            )?.label
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{schedule.time_of_day} EST</span>
                      </div>
                      <Badge
                        variant={schedule.is_active ? "default" : "secondary"}
                      >
                        {schedule.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={(checked) =>
                          toggleScheduleMutation.mutate({
                            id: schedule.id,
                            is_active: checked,
                          })
                        }
                        data-testid={`toggle-schedule-${schedule.id}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          deleteScheduleMutation.mutate(schedule.id)
                        }
                        disabled={deleteScheduleMutation.isPending}
                        data-testid={`delete-schedule-${schedule.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No check-in reminders scheduled yet.</p>
              </div>
            )}

            <div className="pt-4 border-t space-y-4">
              <Label className="text-sm font-medium">Add New Reminder</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="day">Day of Week</Label>
                  <Select
                    value={newSchedule.day_of_week.toString()}
                    onValueChange={(value) =>
                      setNewSchedule({
                        ...newSchedule,
                        day_of_week: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger data-testid="select-day">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem
                          key={day.value}
                          value={day.value.toString()}
                        >
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time (EST)</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newSchedule.time_of_day}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        time_of_day: e.target.value,
                      })
                    }
                    data-testid="input-time"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Notification Title</Label>
                <Input
                  id="title"
                  value={newSchedule.notification_title}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      notification_title: e.target.value,
                    })
                  }
                  placeholder="Weekly Check-In Time"
                  data-testid="input-notification-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Notification Message</Label>
                <Input
                  id="body"
                  value={newSchedule.notification_body}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      notification_body: e.target.value,
                    })
                  }
                  placeholder="Take a few minutes to reflect..."
                  data-testid="input-notification-body"
                />
              </div>
              <Button
                onClick={() => createScheduleMutation.mutate()}
                disabled={createScheduleMutation.isPending}
                className="w-full"
                data-testid="button-add-reminder"
              >
                {createScheduleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Reminder
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
