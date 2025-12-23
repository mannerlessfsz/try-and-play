import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, User } from 'lucide-react';
import { z } from 'zod';

const usernameSchema = z.string().min(3, 'Usuário deve ter pelo menos 3 caracteres');
const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');

// Master user domain for username-based login
const MASTER_DOMAIN = '@sistema.local';

const Auth: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const validateForm = (): boolean => {
    const newErrors: { username?: string; password?: string } = {};
    
    try {
      usernameSchema.parse(username);
    } catch {
      newErrors.username = 'Usuário deve ter pelo menos 3 caracteres';
    }
    
    try {
      passwordSchema.parse(password);
    } catch {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Convert username to email format for authentication
  const getEmailFromUsername = (user: string): string => {
    // If already has @ it's an email, use as is
    if (user.includes('@')) {
      return user;
    }
    // Otherwise, append master domain
    return `${user}${MASTER_DOMAIN}`;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    const email = getEmailFromUsername(username);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    
    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'Usuário ou senha incorretos' 
          : error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso'
      });
      navigate('/dashboard');
    }
  };

  // Function to create master user (only used once for initial setup)
  const handleCreateMasterUser = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    const email = getEmailFromUsername(username);
    const { error } = await signUp(email, password, 'Administrador Master');
    setIsLoading(false);
    
    if (error) {
      let errorMessage = error.message;
      if (error.message.includes('already registered')) {
        errorMessage = 'Este usuário já está cadastrado. Tente fazer login.';
      }
      toast({
        title: 'Erro ao criar usuário',
        description: errorMessage,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Usuário master criado!',
        description: 'Você já pode fazer login'
      });
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md glass border-border/50 relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gradient">VAULTCORP</CardTitle>
          <CardDescription className="text-muted-foreground">
            Entre para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username" className="text-foreground">Usuário</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-username"
                  type="text"
                  placeholder="seu.usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-muted/50 border-border"
                />
              </div>
              {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-foreground">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-muted/50 border-border"
                />
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Entrar
            </Button>

            {/* Hidden button for initial master user creation - remove after first use */}
            <Button 
              type="button"
              variant="ghost"
              className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground"
              onClick={handleCreateMasterUser}
              disabled={isLoading}
            >
              Criar usuário master (primeira vez)
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
