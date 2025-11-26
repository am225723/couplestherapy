import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { queryClient } from "@/lib/queryClient";
import { Copy, Plus, CheckCircle, XCircle } from "lucide-react";
import type { InvitationCode } from "@shared/schema";

function generateInvitationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function InvitationCodes() {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch invitation codes
  const { data: codes, isLoading } = useQuery<InvitationCode[]>({
    queryKey: ["/api/invitation-codes"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("Couples_invitation_codes")
        .select("*")
        .eq("therapist_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InvitationCode[];
    },
  });

  // Create new invitation code
  const createCodeMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const code = generateInvitationCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

      const { data, error } = await supabase
        .from("Couples_invitation_codes")
        .insert({
          code,
          therapist_id: user.id,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitation-codes"] });
      toast({
        title: "Invitation Code Created",
        description: "A new invitation code has been generated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Code",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Code Copied",
      description: `Invitation code "${code}" copied to clipboard`,
    });
  };

  const activeOnes = codes?.filter((c) => c.is_active && !c.used_at) || [];
  const usedCodes = codes?.filter((c) => c.used_at) || [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invitation Codes</h1>
            <p className="text-muted-foreground mt-1">
              Generate codes for couples to join your practice
            </p>
          </div>
          <Button
            onClick={() => createCodeMutation.mutate()}
            disabled={createCodeMutation.isPending}
            data-testid="button-generate-code"
          >
            <Plus className="w-4 h-4 mr-2" />
            {createCodeMutation.isPending
              ? "Generating..."
              : "Generate New Code"}
          </Button>
        </div>

        {/* Active Codes */}
        <Card>
          <CardHeader>
            <CardTitle>Active Invitation Codes</CardTitle>
            <CardDescription>
              Share these codes with couples to allow them to register
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading codes...
              </div>
            ) : activeOnes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active codes. Generate one to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {activeOnes.map((code) => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`code-item-${code.code}`}
                  >
                    <div className="flex-1">
                      <div className="font-mono text-2xl font-bold text-primary">
                        {code.code}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Created{" "}
                        {new Date(code.created_at!).toLocaleDateString()}
                        {code.expires_at && (
                          <span>
                            {" "}
                            • Expires{" "}
                            {new Date(code.expires_at!).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(code.code)}
                      data-testid={`button-copy-${code.code}`}
                    >
                      {copiedCode === code.code ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Used Codes */}
        {usedCodes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Used Codes</CardTitle>
              <CardDescription>
                These codes have been used by couples to register
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usedCodes.map((code) => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-muted/50"
                    data-testid={`used-code-item-${code.code}`}
                  >
                    <div className="flex-1">
                      <div className="font-mono text-lg font-bold text-muted-foreground line-through">
                        {code.code}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Used on{" "}
                        {code.used_at &&
                          new Date(code.used_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <XCircle className="w-4 h-4 mr-2" />
                      <span className="text-sm">Used</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use Invitation Codes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <div className="font-bold text-primary min-w-6">1.</div>
              <div>Generate a new invitation code using the button above</div>
            </div>
            <div className="flex gap-3">
              <div className="font-bold text-primary min-w-6">2.</div>
              <div>Share the code with your couple clients</div>
            </div>
            <div className="flex gap-3">
              <div className="font-bold text-primary min-w-6">3.</div>
              <div>
                Couples use the code to register at:{" "}
                <strong className="text-foreground">/auth/couple-signup</strong>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="font-bold text-primary min-w-6">4.</div>
              <div>Once used, the code is automatically marked as inactive</div>
            </div>
            <div className="flex gap-3">
              <div className="font-bold text-primary min-w-6">5.</div>
              <div>Codes expire after 30 days if not used</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
