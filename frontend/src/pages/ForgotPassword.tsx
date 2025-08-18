import React, { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await resetPassword(email);

      if (error) {
        toast.error('Erro ao enviar e-mail de recuperação: ' + error.message);
      } else {
        setIsSubmitted(true);
        toast.success('E-mail de recuperação enviado!');
      }
    } catch (error) {
      toast.error('Erro inesperado ao solicitar recuperação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Form */}
      <div className="flex-1 md:w-2/5 bg-background p-8 flex flex-col justify-center relative z-10">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-zaplify rounded-xl flex items-center justify-center">
              <div className="w-6 h-6 bg-primary-foreground rounded-sm"></div>
            </div>
            <span className="text-2xl font-poppins font-bold text-foreground">Zaplify</span>
          </div>

          {!isSubmitted ? (
            <>
              {/* Form Header */}
              <div className="space-y-2">
                <h1 className="text-3xl font-poppins font-bold text-foreground">Recuperar Senha</h1>
                <p className="text-muted-foreground">
                  Não se preocupe! Insira seu e-mail e enviaremos um link para você redefinir sua senha.
                </p>
              </div>

              {/* Forgot Password Form */}
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

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-zaplify text-primary-foreground font-poppins font-semibold text-base hover:shadow-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </Button>
              </form>

              {/* Back to Login Link */}
              <div className="text-center">
                <p className="text-muted-foreground">
                  Lembrou sua senha?{' '}
                  <Link
                    to="/login"
                    className="text-primary hover:text-primary/80 transition-colors font-medium inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para o Login
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-zaplify rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="h-10 w-10 text-primary-foreground" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-poppins font-bold text-foreground">Verifique seu E-mail</h1>
                  <p className="text-muted-foreground">
                    Enviamos um link de recuperação para{' '}
                    <span className="text-foreground font-medium">{email}</span>.{' '}
                    Por favor, verifique sua caixa de entrada e spam.
                  </p>
                </div>

                <Button
                  asChild
                  className="w-full h-12 bg-gradient-zaplify text-primary-foreground font-poppins font-semibold text-base hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                >
                  <Link to="/login">
                    Voltar para o Login
                  </Link>
                </Button>

                <div className="text-center">
                  <p className="text-muted-foreground text-sm">
                    Não recebeu o e-mail?{' '}
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      Tentar novamente
                    </button>
                  </p>
                </div>
              </div>
            </>
          )}
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
              Sua conta está segura conosco.
            </h2>
            <p className="text-xl font-inter text-white/90 leading-relaxed">
              Recupere o acesso e volte a impulsionar seus resultados com a Zaplify.
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

export default ForgotPassword;
