import { useState, useEffect, useMemo } from "react";
import { Calendar, dateFnsLocalizer, View, SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CalendarEvent } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const eventFormSchema = z
  .object({
    title: z.string().min(1, "Event title is required"),
    description: z.string().optional(),
    start_at: z.date(),
    end_at: z.date(),
    is_all_day: z.boolean().default(false),
  })
  .refine((data) => data.end_at >= data.start_at, {
    message: "End time must be after start time",
    path: ["end_at"],
  });

type EventFormValues = z.infer<typeof eventFormSchema>;

interface CalendarEventWithDates
  extends Omit<CalendarEvent, "start_at" | "end_at"> {
  start: Date;
  end: Date;
  title: string;
}

export default function CalendarPage() {
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      start_at: new Date(),
      end_at: new Date(Date.now() + 60 * 60 * 1000),
      is_all_day: false,
    },
  });

  // Check for pre-filled event data from localStorage (from date-night page)
  useEffect(() => {
    const prefilledData = localStorage.getItem("prefilled_event");
    if (prefilledData) {
      try {
        const { title, description } = JSON.parse(prefilledData);
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        form.reset({
          title: title || "",
          description: description || "",
          start_at: now,
          end_at: oneHourLater,
          is_all_day: false,
        });
        setIsEventModalOpen(true);
        localStorage.removeItem("prefilled_event");
      } catch (error) {
        console.error("Error parsing prefilled event data:", error);
      }
    }
  }, []);

  // Fetch calendar events
  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar", profile?.couple_id],
    enabled: !!profile?.couple_id,
    queryFn: async () => {
      const response = await fetch(`/api/calendar/${profile?.couple_id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch calendar events");
      }
      return response.json();
    },
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!profile?.couple_id) return;

    const channel = supabase
      .channel(`calendar-${profile.couple_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Couples_calendar_events",
          filter: `couple_id=eq.${profile.couple_id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({
            queryKey: ["/api/calendar", profile.couple_id],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.couple_id]);

  // Transform events for react-big-calendar
  const calendarEvents: CalendarEventWithDates[] = useMemo(() => {
    return events.map((event) => ({
      ...event,
      start: new Date(event.start_at),
      end: new Date(event.end_at),
      title: event.title,
    }));
  }, [events]);

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const response = await apiRequest("POST", "/api/calendar", {
        ...data,
        start_at: data.start_at.toISOString(),
        end_at: data.end_at.toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/calendar", profile?.couple_id],
      });
      toast({
        title: "Event created",
        description: "Your calendar event has been created successfully.",
      });
      setIsEventModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EventFormValues }) => {
      const response = await apiRequest("PATCH", `/api/calendar/${id}`, {
        ...data,
        start_at: data.start_at.toISOString(),
        end_at: data.end_at.toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/calendar", profile?.couple_id],
      });
      toast({
        title: "Event updated",
        description: "Your calendar event has been updated successfully.",
      });
      setIsEventModalOpen(false);
      setSelectedEvent(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update event",
        variant: "destructive",
      });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest(
        "DELETE",
        `/api/calendar/${eventId}`,
        {},
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/calendar", profile?.couple_id],
      });
      toast({
        title: "Event deleted",
        description: "Your calendar event has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setEventToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event",
        variant: "destructive",
      });
    },
  });

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSelectedEvent(null);
    form.reset({
      title: "",
      description: "",
      start_at: slotInfo.start,
      end_at: slotInfo.end,
      is_all_day: slotInfo.slots.length > 1,
    });
    setIsEventModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarEventWithDates) => {
    const originalEvent = events.find((e) => e.id === event.id);
    if (originalEvent) {
      setSelectedEvent(originalEvent);
      form.reset({
        title: originalEvent.title,
        description: originalEvent.description || "",
        start_at: new Date(originalEvent.start_at),
        end_at: new Date(originalEvent.end_at),
        is_all_day: originalEvent.is_all_day || false,
      });
      setIsEventModalOpen(true);
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    form.reset({
      title: "",
      description: "",
      start_at: now,
      end_at: oneHourLater,
      is_all_day: false,
    });
    setIsEventModalOpen(true);
  };

  const onSubmit = (data: EventFormValues) => {
    if (selectedEvent) {
      updateEventMutation.mutate({ id: selectedEvent.id, data });
    } else {
      createEventMutation.mutate(data);
    }
  };

  const handleDeleteClick = (eventId: string) => {
    setEventToDelete(eventId);
    setIsDeleteDialogOpen(true);
    setIsEventModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (eventToDelete) {
      deleteEventMutation.mutate(eventToDelete);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          data-testid="loader-calendar"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold">Calendar</h1>
            <p className="text-muted-foreground">
              Plan events and dates together
            </p>
          </div>
          <Button onClick={handleCreateEvent} data-testid="button-create-event">
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div style={{ height: "600px" }} data-testid="calendar-container">
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                selectable
                popup
                style={{ height: "100%" }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Form Dialog */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent
          className="sm:max-w-[500px]"
          data-testid="dialog-event-form"
        >
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {selectedEvent ? "Edit Event" : "Create Event"}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent
                ? "Update your calendar event details"
                : "Add a new event to your calendar"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Date night dinner"
                        data-testid="input-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Details about the event..."
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_all_day"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">All-day event</FormLabel>
                      <FormDescription>
                        This event will last the entire day
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-all-day"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={format(field.value, "yyyy-MM-dd'T'HH:mm")}
                          onChange={(e) =>
                            field.onChange(new Date(e.target.value))
                          }
                          data-testid="input-start-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={format(field.value, "yyyy-MM-dd'T'HH:mm")}
                          onChange={(e) =>
                            field.onChange(new Date(e.target.value))
                          }
                          data-testid="input-end-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="gap-2">
                {selectedEvent && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleDeleteClick(selectedEvent.id)}
                    disabled={deleteEventMutation.isPending}
                    data-testid="button-delete-event"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={
                    createEventMutation.isPending ||
                    updateEventMutation.isPending
                  }
                  data-testid="button-submit-event"
                >
                  {createEventMutation.isPending ||
                  updateEventMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : selectedEvent ? (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Event
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteEventMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteEventMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
