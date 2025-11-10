import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Heart, Sparkles, ArrowRight, Shield, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import aleicLogo from '@assets/1762758450973_1762758574241.png';
import coupleArt from '@assets/Screenshot_20251109_193551_Chrome Beta_1762759399065.png';

// Utility to check prefers-reduced-motion
const useReducedMotion = () => {
  return useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
};

// Motion variant helper that respects prefers-reduced-motion
const motionVariant = (shouldReduce: boolean, variant: any, staticFallback: any = {}) => {
  return shouldReduce ? staticFallback : variant;
};

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const reducedMotion = useReducedMotion();

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
      {/* Vibrant gradient background with multiple layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-secondary" />
      <div className="absolute inset-0 bg-gradient-to-tr from-tertiary/40 via-transparent to-accent/40" />
      <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-primary/20 to-secondary/30" />
      
      {/* Couple line art background - elegant and subtle */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <img
          src={coupleArt}
          alt=""
          className="w-96 md:w-[600px] h-auto opacity-[0.15] object-contain"
        />
      </div>

      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-10">
        {/* Brand header with logo above subtitle */}
        <motion.div
          initial={motionVariant(reducedMotion, { opacity: 0, y: 20 }, { opacity: 1, y: 0 })}
          animate={{ opacity: 1, y: 0 }}
          transition={motionVariant(reducedMotion, { duration: 0.6 }, { duration: 0 })}
          className="mb-10 text-center max-w-3xl mx-auto px-4"
        >
          {/* Ornate ALEIC logo */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full" />
            <img
              src={aleicLogo}
              alt="ALEIC"
              className="relative w-64 md:w-80 h-auto drop-shadow-2xl mx-auto"
              data-testid="img-logo"
            />
          </div>
          
          {/* Styled subtitle with prominent ALEIC letters */}
          <motion.p
            initial={motionVariant(reducedMotion, { opacity: 0 }, { opacity: 1 })}
            animate={{ opacity: 1 }}
            transition={motionVariant(reducedMotion, { delay: 0.3, duration: 0.6 }, { duration: 0 })}
            className="text-base md:text-lg text-white/95 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            <span className="text-xl md:text-2xl font-bold text-white">A</span>ssisted{' '}
            <span className="text-xl md:text-2xl font-bold text-white">L</span>earning for{' '}
            <span className="text-xl md:text-2xl font-bold text-white">E</span>mpathetic and{' '}
            <span className="text-xl md:text-2xl font-bold text-white">I</span>nsightful{' '}
            <span className="text-xl md:text-2xl font-bold text-white">C</span>ouples
          </motion.p>
        </motion.div>

        {/* Auth card with elegant white design */}
        <motion.div
          initial={motionVariant(reducedMotion, { opacity: 0, y: 30 }, { opacity: 1, y: 0 })}
          animate={{ opacity: 1, y: 0 }}
          transition={motionVariant(reducedMotion, { delay: 0.2, duration: 0.8 }, { duration: 0 })}
          className="w-full max-w-md"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-8 md:p-10">
            {/* Dynamic headline */}
            <div className="text-center mb-8">
              <motion.h2
                key={isSignUp ? 'signup' : 'signin'}
                initial={motionVariant(reducedMotion, { opacity: 0, y: -10 }, { opacity: 1, y: 0 })}
                animate={{ opacity: 1, y: 0 }}
                transition={motionVariant(reducedMotion, {}, { duration: 0 })}
                className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-2"
              >
                {isSignUp ? 'Begin Your Journey' : 'Welcome Back'}
              </motion.h2>
              <p className="text-gray-600 text-sm">
                {isSignUp
                  ? 'Create your account to strengthen your relationship'
                  : 'Continue your path to connection'}
              </p>
            </div>

            {/* Auth form */}
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <motion.div
                  initial={motionVariant(reducedMotion, { opacity: 0, height: 0 }, { opacity: 1, height: 'auto' })}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={motionVariant(reducedMotion, { opacity: 0, height: 0 }, { opacity: 1, height: 'auto' })}
                  transition={motionVariant(reducedMotion, { duration: 0.3 }, { duration: 0 })}
                  className="space-y-2"
                >
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    data-testid="input-fullname"
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-6"
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
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-toggle-mode"
              >
                {isSignUp
                  ? 'Already have an account? '
                  : "Don't have an account? "}
                <span className="text-primary font-medium">
                  {isSignUp ? 'Sign in' : 'Create one'}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
