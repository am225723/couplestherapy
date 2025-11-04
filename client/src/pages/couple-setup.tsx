import { useState } from 'react';
import { useNavigate } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Heart, Loader2, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CoupleSetup() {
  const [partnerEmail, setPartnerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreateCouple = async () => {
    if (!user || !profile) return;

    setCreating(true);

    try {
      const { data: coupleData, error: coupleError } = await supabase
        .from('Couples_couples')
        .insert({
          partner1_id: user.id,
          partner2_id: null,
          therapist_id: null,
        })
        .select()
        .single();

      if (coupleError) throw coupleError;

      const { error: updateError } = await supabase
        .from('Couples_profiles')
        .update({ couple_id: coupleData.id })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();

      toast({
        title: 'Couple created!',
        description: 'You can now use all features. Invite your partner to join.',
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !partnerEmail.trim()) return;

    setLoading(true);

    try {
      const { data: partnerProfile, error: searchError } = await supabase
        .from('Couples_profiles')
        .select('id, full_name, couple_id')
        .eq('id', (
          await supabase.auth.admin.getUserByEmail(partnerEmail)
        ).data.user?.id || '')
        .single();

      if (searchError || !partnerProfile) {
        toast({
          title: 'Partner not found',
          description: 'Please ask your partner to sign up first, or check the email address.',
          variant: 'destructive',
        });
        return;
      }

      if (!partnerProfile.couple_id) {
        toast({
          title: 'Partner has no couple',
          description: 'Ask your partner to create a couple first.',
          variant: 'destructive',
        });
        return;
      }

      const { error: joinError } = await supabase
        .from('Couples_profiles')
        .update({ couple_id: partnerProfile.couple_id })
        .eq('id', user.id);

      if (joinError) throw joinError;

      const { error: updateCoupleError } = await supabase
        .from('Couples_couples')
        .update({ partner2_id: user.id })
        .eq('id', partnerProfile.couple_id);

      if (updateCoupleError) throw updateCoupleError;

      await refreshProfile();

      toast({
        title: 'Joined couple!',
        description: `You're now paired with ${partnerProfile.full_name}`,
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">Set Up Your Couple</CardTitle>
          </div>
          <CardDescription>
            Before you can start your journey together, you need to create or join a couple
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              One partner should create a couple, and the other should join using their email address.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Option 1: Create a New Couple</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start a new couple record. Your partner can join later using your email.
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
                <span className="bg-background px-4 text-muted-foreground">OR</span>
              </div>
            </div>

            <form onSubmit={handleJoinPartner} className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Option 2: Join Your Partner</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  If your partner already created a couple, enter their email to join.
                </p>
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <Label htmlFor="partner-email">Partner's Email</Label>
                <Input
                  id="partner-email"
                  type="email"
                  placeholder="partner@example.com"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  required
                  data-testid="input-partner-email"
                />
              </div>
              <div className="flex justify-center">
                <Button
                  type="submit"
                  disabled={loading || !partnerEmail.trim()}
                  className="w-full max-w-xs"
                  data-testid="button-join-partner"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Join Partner
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
