import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Mail, Copy, Check, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const addCoupleSchema = z.object({
  partner1Email: z.string().email("Please enter a valid email"),
  partner1Name: z.string().min(1, "Please enter a name"),
  partner1Password: z.string().min(6, "Password must be at least 6 characters"),
  partner2Email: z.string().email("Please enter a valid email"),
  partner2Name: z.string().min(1, "Please enter a name"),
  partner2Password: z.string().min(6, "Password must be at least 6 characters"),
});

type AddCoupleFormData = z.infer<typeof addCoupleSchema>;

interface AddCoupleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  therapistId: string;
  onSuccess?: () => void;
}

export function AddCoupleModal({
  open,
  onOpenChange,
  therapistId,
  onSuccess,
}: AddCoupleModalProps) {
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<AddCoupleFormData>({
    resolver: zodResolver(addCoupleSchema),
    defaultValues: {
      partner1Email: "",
      partner1Name: "",
      partner1Password: "",
      partner2Email: "",
      partner2Name: "",
      partner2Password: "",
    },
  });

  const createCoupleMutation = useMutation({
    mutationFn: async (data: AddCoupleFormData) => {
      const response = await apiRequest(
        "POST",
        "/api/therapist/create-couple",
        {
          therapist_id: therapistId,
          partner1_email: data.partner1Email,
          partner1_name: data.partner1Name,
          partner1_password: data.partner1Password,
          partner2_email: data.partner2Email,
          partner2_name: data.partner2Name,
          partner2_password: data.partner2Password,
        },
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Couple Created",
        description: "The couple has been added to your roster.",
      });
      if (data.invite_code) {
        setInviteCode(data.invite_code);
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/therapist/couples"] });
        onOpenChange(false);
        form.reset();
        onSuccess?.();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create couple",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: AddCoupleFormData) => {
    createCoupleMutation.mutate(data);
  };

  const handleCopyInvite = async () => {
    if (inviteCode) {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setInviteCode(null);
    form.reset();
    queryClient.invalidateQueries({ queryKey: ["/api/therapist/couples"] });
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add New Couple
          </DialogTitle>
          <DialogDescription>
            {inviteCode
              ? "Share this invite code with your clients to connect them to ALEIC."
              : "Enter the details for both partners. They will receive an invitation to join ALEIC."}
          </DialogDescription>
        </DialogHeader>

        {inviteCode ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Invite Code</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-background rounded border font-mono text-lg">
                  {inviteCode}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyInvite}
                  data-testid="button-copy-invite"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              onClick={handleClose}
              className="w-full"
              data-testid="button-done"
            >
              Done
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Partner 1
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="partner1Name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Full name"
                            {...field}
                            data-testid="input-partner1-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="partner1Email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="email"
                              placeholder="email@example.com"
                              className="pl-9"
                              {...field}
                              data-testid="input-partner1-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="partner1Password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temporary Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="Min 6 characters"
                            className="pl-9"
                            {...field}
                            data-testid="input-partner1-password"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Partner 2
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="partner2Name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Full name"
                            {...field}
                            data-testid="input-partner2-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="partner2Email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="email"
                              placeholder="email@example.com"
                              className="pl-9"
                              {...field}
                              data-testid="input-partner2-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="partner2Password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temporary Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="Min 6 characters"
                            className="pl-9"
                            {...field}
                            data-testid="input-partner2-password"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={createCoupleMutation.isPending}
                data-testid="button-create-couple"
              >
                {createCoupleMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create Couple
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
