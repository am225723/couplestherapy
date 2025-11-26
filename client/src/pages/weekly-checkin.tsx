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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Lock, Loader2, Heart } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WeeklyCheckin() {
  const [connectedness, setConnectedness] = useState([5]);
  const [conflict, setConflict] = useState([5]);
  const [appreciation, setAppreciation] = useState("");
  const [regrettableIncident, setRegrettableIncident] = useState("");
  const [myNeed, setMyNeed] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.couple_id) return;

    setLoading(true);

    try {
      // Week number and year are auto-calculated by database trigger
      const { error } = await supabase.from("Couples_weekly_checkins").insert({
        couple_id: profile.couple_id,
        user_id: user.id,
        q_connectedness: connectedness[0],
        q_conflict: conflict[0],
        q_appreciation: appreciation,
        q_regrettable_incident: regrettableIncident,
        q_my_need: myNeed,
      });

      if (error) throw error;

      toast({
        title: "Check-in Complete",
        description: "Your weekly reflection has been saved privately.",
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

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Weekly Check-In</h1>
          </div>
          <p className="text-muted-foreground">
            Take a moment to reflect on your week together
          </p>
        </div>

        <Alert className="mb-6 border-primary/20 bg-primary/5">
          <Lock className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            Your responses are completely private. Your partner cannot see what
            you write here. Only your therapist can view both check-ins to
            better support your relationship.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>This Week's Reflection</CardTitle>
              <CardDescription>
                Be honest and thoughtful in your responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="connectedness">
                    How connected did you feel to your partner this week?
                  </Label>
                  <span
                    className="text-2xl font-bold text-primary"
                    data-testid="text-connectedness-value"
                  >
                    {connectedness[0]}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Not at all
                  </span>
                  <Slider
                    id="connectedness"
                    data-testid="slider-connectedness"
                    min={1}
                    max={10}
                    step={1}
                    value={connectedness}
                    onValueChange={setConnectedness}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    Very connected
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="conflict">
                    How well did we handle disagreements this week?
                  </Label>
                  <span
                    className="text-2xl font-bold text-secondary-foreground"
                    data-testid="text-conflict-value"
                  >
                    {conflict[0]}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Poorly</span>
                  <Slider
                    id="conflict"
                    data-testid="slider-conflict"
                    min={1}
                    max={10}
                    step={1}
                    value={conflict}
                    onValueChange={setConflict}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    Very well
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appreciation">
                  What is one thing your partner did this week that you truly
                  appreciated?
                </Label>
                <Textarea
                  id="appreciation"
                  data-testid="textarea-appreciation"
                  placeholder="Share something specific your partner did that made you feel valued..."
                  value={appreciation}
                  onChange={(e) => setAppreciation(e.target.value)}
                  className="min-h-32 resize-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="regrettable">
                  What was one moment of disconnection or a 'regrettable
                  incident' this week?
                </Label>
                <Textarea
                  id="regrettable"
                  data-testid="textarea-regrettable"
                  placeholder="Describe a moment when things didn't go well between you..."
                  value={regrettableIncident}
                  onChange={(e) => setRegrettableIncident(e.target.value)}
                  className="min-h-32 resize-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="need">
                  What is one specific thing you need from your partner next
                  week?
                </Label>
                <Textarea
                  id="need"
                  data-testid="textarea-need"
                  placeholder="Be specific about what would help you feel more connected..."
                  value={myNeed}
                  onChange={(e) => setMyNeed(e.target.value)}
                  className="min-h-32 resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
                data-testid="button-submit-checkin"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Complete Check-In"
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
