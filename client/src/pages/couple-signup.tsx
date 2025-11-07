import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";

const coupleSignupSchema = z.object({
  invitation_code: z.string().min(1, "Invitation code is required"),
  partner1_email: z.string().email("Invalid email address"),
  partner1_password: z.string().min(8, "Password must be at least 8 characters"),
  partner1_name: z.string().min(1, "Name is required"),
  partner2_email: z.string().email("Invalid email address"),
  partner2_password: z.string().min(8, "Password must be at least 8 characters"),
  partner2_name: z.string().min(1, "Name is required"),
}).refine(data => data.partner1_email !== data.partner2_email, {
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
      // Step 1: Validate invitation code
      const { data: invitationData, error: codeError } = await supabase
        .from('Couples_invitation_codes')
        .select('id, therapist_id, is_active, used_at')
        .eq('code', data.invitation_code.trim().toUpperCase())
        .single();

      if (codeError || !invitationData) {
        throw new Error("Invalid invitation code");
      }

      if (!invitationData.is_active || invitationData.used_at) {
        throw new Error("This invitation code has already been used");
      }

      // Step 2: Create Partner 1 account
      const { data: partner1Auth, error: partner1Error } = await supabase.auth.signUp({
        email: data.partner1_email,
        password: data.partner1_password,
      });

      if (partner1Error) throw new Error(`Failed to create Partner 1: ${partner1Error.message}`);
      if (!partner1Auth.user) throw new Error("Partner 1 creation failed");

      // Step 3: Create Partner 2 account
      const { data: partner2Auth, error: partner2Error } = await supabase.auth.signUp({
        email: data.partner2_email,
        password: data.partner2_password,
      });

      if (partner2Error) {
        // If Partner 2 fails, we should ideally rollback Partner 1
        // For now, just throw the error
        throw new Error(`Failed to create Partner 2: ${partner2Error.message}`);
      }
      if (!partner2Auth.user) throw new Error("Partner 2 creation failed");

      // Step 4: Create couple record
      const { data: couple, error: coupleError } = await supabase
        .from('Couples_couples')
        .insert({
          partner1_id: partner1Auth.user.id,
          partner2_id: partner2Auth.user.id,
          therapist_id: invitationData.therapist_id,
        })
        .select()
        .single();

      if (coupleError) throw new Error(`Failed to create couple: ${coupleError.message}`);

      // Step 5: Create profiles for both partners
      const { error: profile1Error } = await supabase
        .from('Couples_profiles')
        .insert({
          id: partner1Auth.user.id,
          full_name: data.partner1_name,
          role: 'client',
          couple_id: couple.id,
        });

      if (profile1Error) {
        console.error('Failed to create Partner 1 profile:', profile1Error);
      }

      const { error: profile2Error } = await supabase
        .from('Couples_profiles')
        .insert({
          id: partner2Auth.user.id,
          full_name: data.partner2_name,
          role: 'client',
          couple_id: couple.id,
        });

      if (profile2Error) {
        console.error('Failed to create Partner 2 profile:', profile2Error);
      }

      // Step 6: Mark invitation code as used
      const { error: updateCodeError } = await supabase
        .from('Couples_invitation_codes')
        .update({
          used_at: new Date().toISOString(),
          used_by_couple_id: couple.id,
        })
        .eq('id', invitationData.id);

      if (updateCodeError) {
        console.error('Failed to mark invitation code as used:', updateCodeError);
      }

      toast({
        title: "Couple Registered Successfully!",
        description: `Welcome ${data.partner1_name} and ${data.partner2_name}! You can now sign in.`,
      });

      // Redirect to login
      setLocation("/auth/login");
    } catch (error: any) {
      console.error('Couple signup error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create couple. Please try again.",
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
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
