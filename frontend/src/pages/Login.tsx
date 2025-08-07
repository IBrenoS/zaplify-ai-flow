import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('E-mail ou senha incorretos');
        } else {
          toast.error('Erro ao fazer login: ' + error.message);
        }
      } else {
        toast.success('Login realizado com sucesso!');
        navigate('/');
      }
    } catch (error) {
      toast.error('Erro inesperado ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Login Form */}
      <div className="flex-1 md:w-2/5 bg-background p-8 flex flex-col justify-center relative z-10">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-zaplify rounded-xl flex items-center justify-center">
              <div className="w-6 h-6 bg-primary-foreground rounded-sm"></div>
            </div>
            <span className="text-2xl font-poppins font-bold text-foreground">Zaplify</span>
          </div>

          {/* Form Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-poppins font-bold text-foreground">Entrar</h1>
            <p className="text-muted-foreground">
              Acesse sua conta para continuar
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="bg-card border-border text-foreground placeholder:text-muted-foreground h-12"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="bg-card border-border text-foreground placeholder:text-muted-foreground h-12 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-gradient-zaplify text-primary-foreground font-poppins font-semibold text-base hover:shadow-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Links */}
          <div className="space-y-4 text-center">
            <div>
              <Link 
                to="/forgot-password" 
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Esqueci minha senha
              </Link>
            </div>

            <div>
              <p className="text-muted-foreground">
                Ainda não tem uma conta?{' '}
                <Link 
                  to="/sign-up" 
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Cadastre-se aqui
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Visual Section (Hidden on Mobile) */}
      <div className="hidden md:flex md:w-3/5 relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20">
        {/* Animated Wave Background */}
        <div className="absolute inset-0">
          <svg 
            className="absolute inset-0 w-full h-full" 
            viewBox="0 0 1200 800" 
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.2" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.15" />
                <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            
            {/* Animated Waves */}
            <path 
              d="M0,300 Q300,200 600,300 T1200,300 L1200,800 L0,800 Z" 
              fill="url(#waveGradient1)"
              className="animate-[wave1_20s_ease-in-out_infinite]"
            />
            <path 
              d="M0,400 Q400,300 800,400 T1200,400 L1200,800 L0,800 Z" 
              fill="url(#waveGradient2)"
              className="animate-[wave2_25s_ease-in-out_infinite_reverse]"
            />
            <path 
              d="M0,500 Q200,400 400,500 T800,500 T1200,500 L1200,800 L0,800 Z" 
              fill="url(#waveGradient1)"
              className="animate-[wave3_30s_ease-in-out_infinite]"
            />
          </svg>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-center p-16 text-white">
          <div className="max-w-lg space-y-6">
            <h2 className="text-4xl font-poppins font-bold leading-tight">
              Bem-vindo de volta ao seu centro de comando.
            </h2>
            <p className="text-xl font-inter text-white/90 leading-relaxed">
              Acesse seus assistentes, monitore seus funis e continue a transformar conversas em resultados.
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-zaplify rounded-full opacity-20 blur-xl"></div>
        <div className="absolute bottom-32 right-32 w-24 h-24 bg-gradient-zaplify rounded-full opacity-15 blur-lg"></div>
        <div className="absolute top-1/2 right-10 w-16 h-16 bg-gradient-zaplify rounded-full opacity-25 blur-md"></div>
      </div>
    </div>
  );
};

export default Login;