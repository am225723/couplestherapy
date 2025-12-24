import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Bell } from "lucide-react";
import { Profile, Couple } from "@shared/schema";
import { supabase } from "@/lib/supabase";

interface ScheduleNotificationDialogProps {
  couple: Couple & { partner1?: Profile; partner2?: Profile };
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ScheduleNotificationDialog({
  couple,
  trigger,
  onSuccess,
}: ScheduleNotificationDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [recipient, setRecipient] = useState<"both" | "partner1" | "partner2">(
    "both",
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error("Not authenticated");
      }

      const payload: any = {
        couple_id: couple.id,
        title,
        body,
        scheduled_at: new Date(scheduledAt).toISOString(),
      };

      if (recipient === "partner1" && couple.partner1_id) {
        payload.user_id = couple.partner1_id;
      } else if (recipient === "partner2" && couple.partner2_id) {
        payload.user_id = couple.partner2_id;
      }

      // Use Supabase Edge Function
      const { data, error } = await supabase.functions.invoke(
        "schedule-notification",
        {
          body: payload,
        },
      );

      if (error) {
        console.error("Edge Function error:", error);
        throw new Error(error.message || "Failed to schedule notification");
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Notification scheduled",
        description: `Notification will be sent on ${new Date(scheduledAt).toLocaleString()}`,
      });
      setOpen(false);
      setTitle("");
      setBody("");
      setScheduledAt("");
      setRecipient("both");
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error scheduling notification",
        description:
          error instanceof Error ? error.message : "Failed to schedule",
        variant: "destructive",
      });
    },
  });

  const isValid =
    title.trim() &&
    body.trim() &&
    scheduledAt &&
    new Date(scheduledAt) > new Date();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-2">
            <Bell className="w-4 h-4" />
            Schedule Notification
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Schedule Push Notification</DialogTitle>
          <DialogDescription>
            Send a notification to {couple.partner1?.full_name || "Partner 1"}
            {couple.partner2 ? ` and ${couple.partner2.full_name}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="recipient" className="text-sm font-medium">
              Send to
            </Label>
            <Select
              value={recipient}
              onValueChange={(v: any) => setRecipient(v)}
            >
              <SelectTrigger id="recipient">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both partners</SelectItem>
                {couple.partner1 && (
                  <SelectItem value="partner1">
                    {couple.partner1.full_name}
                  </SelectItem>
                )}
                {couple.partner2 && (
                  <SelectItem value="partner2">
                    {couple.partner2.full_name}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title" className="text-sm font-medium">
              Notification Title
            </Label>
            <Input
              id="title"
              placeholder="e.g., Weekly Check-in Reminder"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-notification-title"
            />
          </div>

          <div>
            <Label htmlFor="body" className="text-sm font-medium">
              Message
            </Label>
            <Textarea
              id="body"
              placeholder="Enter your message (max 2000 characters)"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 2000))}
              className="resize-none"
              rows={3}
              data-testid="textarea-notification-body"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {body.length}/2000
            </p>
          </div>

          <div>
            <Label htmlFor="time" className="text-sm font-medium">
              Send at (EST)
            </Label>
            <Input
              id="time"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              data-testid="input-notification-datetime"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={!isValid || mutation.isPending}
              className="flex-1 gap-2"
              data-testid="button-schedule-notification"
            >
              {mutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
