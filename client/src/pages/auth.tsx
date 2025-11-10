import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Heart, MessageCircle, Sparkles, ArrowRight, Check } from 'lucide-react';
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Full-screen vibrant gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-secondary" />
      <div className="absolute inset-0 bg-gradient-to-tr from-secondary/40 via-tertiary/30 to-transparent" />
      
      {/* Ambient couple-themed line art - orbiting visuals */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        {/* Large intertwined infinity paths background */}
        <svg className="absolute top-1/2 left-1/2 w-[1200px] h-[1200px] -translate-x-1/2 -translate-y-1/2 text-white" viewBox="0 0 600 600">
          <path d="M150,300 Q225,150 300,300 Q375,450 450,300" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M150,300 Q225,450 300,300 Q375,150 450,300" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <circle cx="150" cy="300" r="12" fill="currentColor" />
          <circle cx="450" cy="300" r="12" fill="currentColor" />
          <circle cx="300" cy="300" r="20" fill="currentColor" opacity="0.4" />
        </svg>
        
        {/* Supporting decorative elements */}
        <svg className="absolute top-20 right-20 w-40 h-40 text-white/30" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M50,15 L50,30 M50,70 L50,85 M15,50 L30,50 M70,50 L85,50" stroke="currentColor" strokeWidth="3" />
        </svg>
        
        <svg className="absolute bottom-32 left-32 w-48 h-48 text-white/20" viewBox="0 0 120 120">
          <circle cx="45" cy="60" r="30" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="75" cy="60" r="30" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      {/* Centered glass-morphism card */}
      <div className="relative z-10 w-full max-w-md mx-6">
        <div className="backdrop-blur-2xl bg-white/10 dark:bg-white/5 rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12">
          {/* Logo and brand header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <img 
                  src={coupleArt} 
                  alt="ALEIC Logo" 
                  className="h-20 w-auto drop-shadow-2xl"
                  data-testid="img-logo"
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
              ALEIC
            </h1>
            <p className="text-white/90 text-sm drop-shadow">
              <span className="font-semibold">A</span>ssisted{' '}
              <span className="font-semibold">L</span>earning for{' '}
              <span className="font-semibold">E</span>mpathetic and{' '}
              <span className="font-semibold">I</span>nsightful{' '}
              <span className="font-semibold">C</span>ouples
            </p>
          </div>

          {/* Form section */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                {isSignUp ? 'Begin Your Journey' : 'Welcome Back'}
              </h2>
              <p className="text-white/80 text-sm drop-shadow">
                {isSignUp
                  ? 'Create your account to start strengthening your relationship'
                  : 'Continue your path to a stronger connection'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-white text-sm font-medium drop-shadow">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    data-testid="input-fullname"
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="bg-white/90 border-white/20 backdrop-blur-sm"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white text-sm font-medium drop-shadow">
                  Email Address
                </Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/90 border-white/20 backdrop-blur-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white text-sm font-medium drop-shadow">
                  Password
                </Label>
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/90 border-white/20 backdrop-blur-sm"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full font-semibold bg-white text-primary hover:bg-white/90"
                disabled={loading}
                data-testid="button-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Toggle sign up/in */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-white/90 hover:text-white text-sm font-medium underline decoration-white/40 hover:decoration-white transition-colors drop-shadow"
                data-testid="button-toggle-mode"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Create one"}
              </button>
            </div>
          </div>

          {/* Trust indicators - 3 key benefits */}
          <div className="space-y-3 pt-4 border-t border-white/20">
            <div className="flex items-center gap-3" data-testid="badge-trust-connection">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-sm drop-shadow">19+ Therapy Tools</p>
                <p className="text-white/80 text-xs drop-shadow">Evidence-based exercises for connection</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3" data-testid="badge-trust-growth">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-sm drop-shadow">AI-Powered Insights</p>
                <p className="text-white/80 text-xs drop-shadow">Personalized guidance for your journey</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3" data-testid="badge-trust-privacy">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-sm drop-shadow">HIPAA Compliant</p>
                <p className="text-white/80 text-xs drop-shadow">Your data is private and secure</p>
              </div>
            </div>
          </div>

          {/* Security footer */}
          <div className="flex items-center justify-center gap-3 text-xs text-white/70 drop-shadow pt-2" data-testid="text-security-encrypted">
            <Check className="h-3 w-3" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
