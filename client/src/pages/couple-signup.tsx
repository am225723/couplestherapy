import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";

const coupleSignupSchema = z
  .object({
    invitation_code: z.string().min(1, "Invitation code is required"),
    partner1_email: z.string().email("Invalid email address"),
    partner1_password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    partner1_name: z.string().min(1, "Name is required"),
    partner2_email: z.string().email("Invalid email address"),
    partner2_password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    partner2_name: z.string().min(1, "Name is required"),
  })
  .refine((data) => data.partner1_email !== data.partner2_email, {
    message: "Partners must have different email addresses",
    path: ["partner2_email"],
  });

type CoupleSignupForm = z.infer<typeof coupleSignupSchema>;

export default function CoupleSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CoupleSignupForm>({
    resolver: zodResolver(coupleSignupSchema),
    defaultValues: {
      invitation_code: "",
      partner1_email: "",
      partner1_password: "",
      partner1_name: "",
      partner2_email: "",
      partner2_password: "",
      partner2_name: "",
    },
  });

  const onSubmit = async (data: CoupleSignupForm) => {
    setIsSubmitting(true);

    try {
      // Call secure backend endpoint
      const response = await fetch("/api/public/register-couple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
      }

      toast({
        title: "Couple Registered Successfully!",
        description: `Welcome ${data.partner1_name} and ${data.partner2_name}! You can now sign in.`,
      });

      // Redirect to login
      setLocation("/auth/login");
    } catch (error: any) {
      console.error("Couple signup error:", error);
      toast({
        title: "Registration Failed",
        description:
          error.message || "Failed to create couple. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Couple Sign Up</CardTitle>
          <CardDescription>
            Register as a couple using your therapist's invitation code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Invitation Code */}
              <FormField
                control={form.control}
                name="invitation_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invitation Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="INVITE123"
                        data-testid="input-invitation-code"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Partner 1 Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Partner 1 Information</h3>

                <FormField
                  control={form.control}
                  name="partner1_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Alex Johnson"
                          data-testid="input-partner1-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partner1_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="alex@example.com"
                          data-testid="input-partner1-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partner1_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          data-testid="input-partner1-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Partner 2 Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Partner 2 Information</h3>

                <FormField
                  control={form.control}
                  name="partner2_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jordan Smith"
                          data-testid="input-partner2-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partner2_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="jordan@example.com"
                          data-testid="input-partner2-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partner2_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          data-testid="input-partner2-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-signup"
              >
                {isSubmitting ? "Creating Couple..." : "Register as Couple"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-primary underline hover-elevate"
                  onClick={() => setLocation("/auth/login")}
                  data-testid="link-login"
                >
                  Sign in
                </button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
