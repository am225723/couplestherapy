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

const therapistSignupSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
    full_name: z.string().min(1, "Full name is required"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type TherapistSignupForm = z.infer<typeof therapistSignupSchema>;

export default function TherapistSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TherapistSignupForm>({
    resolver: zodResolver(therapistSignupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirm_password: "",
      full_name: "",
    },
  });

  const onSubmit = async (data: TherapistSignupForm) => {
    setIsSubmitting(true);

    try {
      // Step 1: Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      // Step 2: Create therapist profile
      const { error: profileError } = await supabase
        .from("Couples_profiles")
        .insert({
          id: authData.user.id,
          full_name: data.full_name,
          role: "therapist",
          couple_id: null,
        });

      if (profileError) throw profileError;

      toast({
        title: "Account Created Successfully",
        description: "Welcome! You can now sign in and start managing couples.",
      });

      // Redirect to login
      setLocation("/auth/login");
    } catch (error: any) {
      console.error("Therapist signup error:", error);
      toast({
        title: "Signup Failed",
        description:
          error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Therapist Sign Up</CardTitle>
          <CardDescription>
            Create your therapist account to start managing couples
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Dr. Jane Smith"
                        data-testid="input-full-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="therapist@example.com"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        data-testid="input-confirm-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-signup"
              >
                {isSubmitting
                  ? "Creating Account..."
                  : "Create Therapist Account"}
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
