import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Heart, MessageCircle, Sparkles, ArrowRight, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import heroImage1 from '@assets/stock_images/couple_holding_hands_ae5c3006.jpg';
import heroImage2 from '@assets/stock_images/couple_smiling_toget_3b915229.jpg';
import heroImage3 from '@assets/stock_images/couple_holding_hands_21b95250.jpg';

const heroImages = [heroImage1, heroImage2, heroImage3];

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-screen flex">
      {/* Left side - Hero images with carousel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 relative overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
        {/* Rotating hero images */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
            <img
              src={heroImages[currentImageIndex]}
              alt="Couples therapy"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Overlay content on images */}
        <div className="relative z-20 p-12 flex flex-col justify-end text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold mb-4">Strengthen Your Bond</h2>
            <p className="text-lg text-white/90 mb-8">
              Evidence-based tools and AI-powered insights to build lasting connection
            </p>
            
            {/* Image carousel indicators */}
            <div className="flex gap-2">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentImageIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/50'
                  }`}
                  data-testid={`button-carousel-${index}`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* ALEIC branding */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">ALEIC</h1>
                <p className="text-xs text-muted-foreground">Couples Therapy Platform</p>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-foreground mb-2">
              {isSignUp ? 'Begin Your Journey' : 'Welcome Back'}
            </h2>
            <p className="text-muted-foreground">
              {isSignUp
                ? 'Create your account to access evidence-based relationship tools'
                : 'Continue strengthening your connection'}
            </p>
          </div>

          {/* Auth form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  data-testid="input-fullname"
                  type="text"
                  placeholder="Enter your name"
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
              className="w-full"
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

          {/* Trust badges */}
          <div className="mt-10 pt-8 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div data-testid="badge-trust-connection">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs font-medium text-foreground">19+ Tools</p>
                <p className="text-xs text-muted-foreground">Evidence-based</p>
              </div>

              <div data-testid="badge-trust-growth">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-2">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <p className="text-xs font-medium text-foreground">AI Insights</p>
                <p className="text-xs text-muted-foreground">Personalized</p>
              </div>

              <div data-testid="badge-trust-privacy">
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-6 w-6 text-secondary" />
                </div>
                <p className="text-xs font-medium text-foreground">HIPAA</p>
                <p className="text-xs text-muted-foreground">Compliant</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
