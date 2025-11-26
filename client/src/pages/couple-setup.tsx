import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, Users, Copy, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CoupleSetup() {
  const [coupleCode, setCoupleCode] = useState("");
  const [myCouple, setMyCouple] = useState<{ id: string; code: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleCreateCouple = async () => {
    if (!user || !profile) return;

    setCreating(true);

    try {
      // First create the couple record (it will auto-generate join_code)
      const { data: coupleData, error: coupleError } = await supabase
        .from("Couples_couples")
        .insert({
          partner1_id: user.id,
          partner2_id: null,
          therapist_id: null,
        })
        .select()
        .single();

      if (coupleError) throw coupleError;

      // Extract the join code from the returned couple data
      const joinCode = coupleData.id.substring(0, 8).toUpperCase();

      // Update the couple with the join_code
      const { error: codeError } = await supabase
        .from("Couples_couples")
        .update({ join_code: joinCode })
        .eq("id", coupleData.id);

      if (codeError) throw codeError;

      // Update the user's profile with couple_id
      const { error: updateError } = await supabase
        .from("Couples_profiles")
        .update({ couple_id: coupleData.id })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();

      setMyCouple({ id: coupleData.id, code: joinCode });

      toast({
        title: "Couple created!",
        description: "Share your Couple ID with your partner so they can join.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinCouple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !coupleCode.trim()) return;

    setLoading(true);

    try {
      // Securely join the couple using RPC function
      // This atomically checks the join_code and sets partner2_id
      const { data: coupleId, error: joinError } = await supabase.rpc(
        "join_couple_as_partner2",
        { code: coupleCode },
      );

      if (joinError) {
        toast({
          title: "Failed to join",
          description:
            joinError.message ||
            "Please check the Couple ID or the couple may already be full.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!coupleId) {
        toast({
          title: "Couple not found",
          description:
            "Please check the Couple ID or the couple may already be full.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Update profile with couple_id
      const { error: profileError } = await supabase
        .from("Couples_profiles")
        .update({ couple_id: coupleId })
        .eq("id", user.id);

      if (profileError) throw profileError;

      await refreshProfile();

      toast({
        title: "Joined couple!",
        description: "You are now paired with your partner.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (myCouple) {
      navigator.clipboard.writeText(myCouple.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Couple ID copied to clipboard",
      });
    }
  };

  if (myCouple) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Heart className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl">Couple Created!</CardTitle>
            </div>
            <CardDescription>
              Share this ID with your partner so they can join
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-muted rounded-lg text-center">
              <Label className="text-sm text-muted-foreground mb-2 block">
                Your Couple ID
              </Label>
              <div className="text-3xl font-bold tracking-wider text-primary mb-4">
                {myCouple.code}
              </div>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                data-testid="button-copy-code"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy ID
                  </>
                )}
              </Button>
            </div>

            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                Your partner should use the "Join a Couple" option and enter
                this ID to complete the pairing.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full"
              data-testid="button-continue"
            >
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">Set Up Your Couple</CardTitle>
          </div>
          <CardDescription>
            Before you can start your journey together, you need to create or
            join a couple
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              One partner should create a couple and share the ID. The other
              partner can then join using that ID.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                Option 1: Create a New Couple
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start a new couple and get a unique ID to share with your
                partner.
              </p>
              <Button
                onClick={handleCreateCouple}
                disabled={creating}
                className="w-full max-w-xs"
                data-testid="button-create-couple"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Heart className="mr-2 h-4 w-4" />
                    Create Couple
                  </>
                )}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-4 text-muted-foreground">
                  OR
                </span>
              </div>
            </div>

            <form onSubmit={handleJoinCouple} className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  Option 2: Join Your Partner's Couple
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  If your partner already created a couple, enter their Couple
                  ID below.
                </p>
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <Label htmlFor="couple-code">Partner's Couple ID</Label>
                <Input
                  id="couple-code"
                  type="text"
                  placeholder="ABC123"
                  value={coupleCode}
                  onChange={(e) => setCoupleCode(e.target.value.toUpperCase())}
                  required
                  data-testid="input-couple-code"
                  className="text-center text-lg tracking-wider"
                  maxLength={8}
                />
              </div>
              <div className="flex justify-center">
                <Button
                  type="submit"
                  disabled={loading || !coupleCode.trim()}
                  className="w-full max-w-xs"
                  data-testid="button-join-couple"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Join Couple
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
