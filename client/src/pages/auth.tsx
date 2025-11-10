import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Heart, Users, Shield, Lock, Check, Sparkles } from 'lucide-react';
import coupleArt from '@assets/Screenshot_20251109_193551_Chrome Beta_1762734968356.jpg';

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Refined couple-themed background - minimalist approach */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Soft radial gradients for depth (subtle, calming) */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-radial from-secondary/8 via-accent/5 to-transparent rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-gradient-radial from-primary/8 via-tertiary/5 to-transparent rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3" />
        
        {/* Minimalist line art - intertwined paths (partnership journey) */}
        <svg className="absolute top-1/4 right-10 w-48 h-48 text-primary/6" viewBox="0 0 200 200">
          <path d="M40,100 Q70,50 100,100 T160,100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M40,100 Q70,150 100,100 T160,100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="100" r="4" fill="currentColor" />
          <circle cx="160" cy="100" r="4" fill="currentColor" />
        </svg>
        
        {/* Balanced connection nodes (emotional balance) */}
        <svg className="absolute bottom-1/3 left-16 w-40 h-40 text-accent/7" viewBox="0 0 100 100">
          <line x1="30" y1="50" x2="70" y2="50" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="30" cy="50" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="70" cy="50" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="3" fill="currentColor" opacity="0.5" />
        </svg>
        
        {/* Partnership rings (overlapping, unity) */}
        <svg className="absolute top-1/2 left-1/3 w-56 h-56 -translate-x-1/2 -translate-y-1/2 text-secondary/6" viewBox="0 0 120 120">
          <circle cx="45" cy="60" r="25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="75" cy="60" r="25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        
        {/* Subtle couple silhouettes (therapy context) */}
        <svg className="absolute bottom-20 right-20 w-32 h-32 text-tertiary/5" viewBox="0 0 100 100">
          <path d="M35,40 Q35,30 40,30 Q45,30 45,40 L45,60 Q45,70 40,75 Q35,70 35,60 Z" fill="currentColor" />
          <path d="M55,40 Q55,30 60,30 Q65,30 65,40 L65,60 Q65,70 60,75 Q55,70 55,60 Z" fill="currentColor" />
        </svg>
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Form */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-8 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            {/* Logo and branding */}
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 rounded-full blur-3xl" />
                  <img 
                    src={coupleArt} 
                    alt="ALEIC - Couple Connection" 
                    className="relative h-32 w-auto drop-shadow-2xl"
                    data-testid="img-logo"
                  />
                </div>
              </div>
              <div>
                <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-3 tracking-tight">
                  ALEIC
                </h1>
                <div className="space-y-2 max-w-sm mx-auto">
                  <p className="text-sm font-medium text-muted-foreground/90">
                    <span className="text-primary font-semibold">A</span>ssisted{' '}
                    <span className="text-accent font-semibold">L</span>earning for{' '}
                    <span className="text-secondary font-semibold">E</span>mpathetic and{' '}
                    <span className="text-tertiary font-semibold">I</span>nsightful{' '}
                    <span className="text-primary font-semibold">C</span>ouples
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-2">
                    Evidence-based tools for stronger relationships
                  </p>
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center space-y-2 p-3 rounded-lg bg-card/50 border border-primary/20" data-testid="badge-trust-connection">
                <div className="inline-flex p-2 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 text-primary">
                  <Heart className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Connection</p>
              </div>
              <div className="text-center space-y-2 p-3 rounded-lg bg-card/50 border border-accent/20" data-testid="badge-trust-growth">
                <div className="inline-flex p-2 rounded-full bg-gradient-to-br from-accent/20 to-secondary/10 text-accent">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Growth</p>
              </div>
              <div className="text-center space-y-2 p-3 rounded-lg bg-card/50 border border-secondary/20" data-testid="badge-trust-privacy">
                <div className="inline-flex p-2 rounded-full bg-gradient-to-br from-secondary/20 to-primary/10 text-secondary">
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

        {/* Right side - Hero with couple-themed art */}
        <div className="hidden lg:flex flex-1 relative items-center justify-center p-12 overflow-hidden">
          {/* Layered gradient background with softer blending */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-accent/90 to-secondary/95" />
          <div className="absolute inset-0 bg-gradient-to-tr from-secondary/40 via-tertiary/30 to-transparent" />
          
          {/* Couple-themed decorative art overlay */}
          <div className="absolute inset-0 overflow-hidden opacity-15">
            {/* Large focal illustration - intertwined infinity paths (endless partnership) */}
            <svg className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 text-white" viewBox="0 0 400 400">
              <path d="M100,200 Q150,100 200,200 Q250,300 300,200" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
              <path d="M100,200 Q150,300 200,200 Q250,100 300,200" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
              <circle cx="100" cy="200" r="8" fill="currentColor" opacity="0.6" />
              <circle cx="300" cy="200" r="8" fill="currentColor" opacity="0.6" />
              <circle cx="200" cy="200" r="12" fill="currentColor" opacity="0.3" />
            </svg>
            
            {/* Compass overlay (guided journey) */}
            <svg className="absolute top-16 right-16 w-32 h-32 text-white/30" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
              <line x1="50" y1="15" x2="50" y2="35" stroke="currentColor" strokeWidth="2" />
              <line x1="50" y1="65" x2="50" y2="85" stroke="currentColor" strokeWidth="2" />
              <line x1="15" y1="50" x2="35" y2="50" stroke="currentColor" strokeWidth="2" />
              <line x1="65" y1="50" x2="85" y2="50" stroke="currentColor" strokeWidth="2" />
            </svg>
            
            {/* Holding hands silhouette (connection) */}
            <svg className="absolute bottom-16 left-16 w-48 h-48 text-white/20" viewBox="0 0 200 200">
              <path d="M60,100 L70,90 Q75,85 80,90 L90,100 L100,90 Q105,85 110,90 L120,100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <ellipse cx="75" cy="85" rx="6" ry="8" fill="currentColor" />
              <ellipse cx="105" cy="85" rx="6" ry="8" fill="currentColor" />
            </svg>
          </div>
          
          {/* Content with improved readability */}
          <div className="relative z-10 max-w-lg space-y-8 text-white drop-shadow-2xl">
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
