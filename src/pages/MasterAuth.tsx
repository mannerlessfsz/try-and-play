import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, User, Shield } from 'lucide-react';
import { z } from 'zod';

const usernameSchema = z.string().min(3, 'Usuário deve ter pelo menos 3 caracteres');
const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');

// Master user domain for username-based login
const MASTER_DOMAIN = '@sistema.local';

const MasterAuth: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  
  const { signIn, user, loading } = useAuth();
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    const masterEmail = `${username}${MASTER_DOMAIN}`;
    const { error } = await signIn(masterEmail, password);
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
        title: 'Bem-vindo, Administrador!',
        description: 'Acesso master concedido'
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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md glass border-destructive/30 relative z-10">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">
            <span className="text-destructive">VAULT</span>
            <span className="text-foreground">CORP</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Acesso restrito - Administrador Master
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-6">
            <p className="text-xs text-destructive flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Esta área é exclusiva para administradores do sistema
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">Usuário</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="usuario.master"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-muted/50 border-border"
                />
              </div>
              {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
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
              className="w-full bg-destructive hover:bg-destructive/90"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Acesso Master
            </Button>
          </form>

          {/* Sem links visíveis - rota oculta por segurança */}
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterAuth;
