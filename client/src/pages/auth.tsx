import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Heart, Users, Shield, Lock, Check } from 'lucide-react';
import clientHeroImage from '@assets/generated_images/Client_app_hero_image_9fd4eaf0.png';
import tadiLogo from '@assets/logo_1762363277396.png';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('Couples_profiles')
            .insert({
              id: authData.user.id,
              full_name: fullName,
              role: 'client',
              couple_id: null,
            });

          if (profileError) throw profileError;

          toast({
            title: 'Account created!',
            description: 'Please check your email to verify your account.',
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: 'Welcome back!',
          description: 'Successfully signed in.',
        });
      }
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-accent/5 to-primary/10" />
      
      {/* Soft geometric shapes for visual interest */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Form */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-8 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            {/* Logo and branding */}
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
                  <img 
                    src={tadiLogo} 
                    alt="TADI Logo" 
                    className="relative h-24 w-auto drop-shadow-xl"
                    data-testid="img-logo"
                  />
                </div>
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-3">
                  TADI
                </h1>
                <p className="text-muted-foreground text-base max-w-sm mx-auto">
                  Therapist-Assisted Digital Intervention
                </p>
                <p className="text-sm text-muted-foreground/70 mt-2">
                  Evidence-based tools for stronger relationships
                </p>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center space-y-2 p-3 rounded-lg bg-card/50 border border-primary/10" data-testid="badge-trust-connection">
                <div className="inline-flex p-2 rounded-full bg-primary/10 text-primary">
                  <Heart className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Connection</p>
              </div>
              <div className="text-center space-y-2 p-3 rounded-lg bg-card/50 border border-primary/10" data-testid="badge-trust-growth">
                <div className="inline-flex p-2 rounded-full bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Growth</p>
              </div>
              <div className="text-center space-y-2 p-3 rounded-lg bg-card/50 border border-primary/10" data-testid="badge-trust-privacy">
                <div className="inline-flex p-2 rounded-full bg-primary/10 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Privacy</p>
              </div>
            </div>

            {/* Form card */}
            <Card className="shadow-2xl border-primary/10">
              <CardHeader className="space-y-3 pb-6">
                <CardTitle className="text-3xl font-bold text-center">
                  {isSignUp ? 'Begin Your Journey' : 'Welcome Back'}
                </CardTitle>
                <CardDescription className="text-center text-base">
                  {isSignUp
                    ? 'Create your account to start strengthening your relationship'
                    : 'Continue your path to a stronger connection'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAuth} className="space-y-5">
                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                      <Input
                        id="fullName"
                        data-testid="input-fullname"
                        type="text"
                        placeholder="Your name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="border-primary/20 focus-visible:ring-primary/20"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                    <Input
                      id="email"
                      data-testid="input-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="border-primary/20 focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="password"
                      data-testid="input-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="border-primary/20 focus-visible:ring-primary/20"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full font-medium text-base"
                    disabled={loading}
                    data-testid="button-submit"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {isSignUp ? 'Creating account...' : 'Signing in...'}
                      </>
                    ) : (
                      <>{isSignUp ? 'Create Account' : 'Sign In'}</>
                    )}
                  </Button>
                  
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-primary/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground font-medium">
                        {isSignUp ? 'or sign in' : 'or create account'}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="w-full text-sm text-muted-foreground hover:text-primary font-medium"
                    data-testid="button-toggle-mode"
                  >
                    {isSignUp
                      ? 'Already have an account? Sign in instead'
                      : "Don't have an account? Create one now"}
                  </button>
                </form>
              </CardContent>
            </Card>

            {/* Security badges */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1" data-testid="text-security-encrypted">
                <Lock className="h-3 w-3" />
                <span>End-to-end encrypted</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <div className="flex items-center gap-1" data-testid="text-security-hipaa">
                <Check className="h-3 w-3" />
                <span>HIPAA compliant</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Hero with overlay */}
        <div className="hidden lg:flex flex-1 relative items-center justify-center p-12">
          {/* Image */}
          <img
            src={clientHeroImage}
            alt="Couples connecting"
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          
          {/* Content */}
          <div className="relative z-10 max-w-lg space-y-8 text-white">
            <div className="space-y-6">
              <h2 className="text-5xl font-bold leading-tight drop-shadow-lg">
                Strengthen Your Bond Together
              </h2>
              <p className="text-xl text-white/95 leading-relaxed drop-shadow">
                Evidence-based therapy tools designed to help couples communicate better, 
                deepen connection, and build a lasting partnership.
              </p>
            </div>
            
            <div className="space-y-5 pt-4">
              <div className="flex items-start gap-4" data-testid="feature-daily-rituals">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-lg">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1 drop-shadow">Daily Connection Rituals</h3>
                  <p className="text-sm text-white/90">Build intimacy through shared moments and meaningful interactions</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4" data-testid="feature-guided-conversations">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1 drop-shadow">Guided Conversations</h3>
                  <p className="text-sm text-white/90">Navigate difficult topics with expert therapeutic support</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4" data-testid="feature-private-secure">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1 drop-shadow">Private & Secure</h3>
                  <p className="text-sm text-white/90">Your therapeutic journey is protected and completely confidential</p>
                </div>
              </div>
            </div>

            {/* Platform stats */}
            <div className="grid grid-cols-3 gap-4 pt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center shadow-lg" data-testid="card-stat-tools">
                <div className="text-3xl font-bold drop-shadow">19+</div>
                <div className="text-sm text-white/90">Therapy Tools</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center shadow-lg" data-testid="card-stat-ai">
                <div className="text-3xl font-bold drop-shadow">5</div>
                <div className="text-sm text-white/90">AI Features</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center shadow-lg" data-testid="card-stat-availability">
                <div className="text-3xl font-bold drop-shadow">24/7</div>
                <div className="text-sm text-white/90">Available</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
