import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, User, Mail, Shield, Users } from 'lucide-react';
import { z } from 'zod';

const usernameSchema = z.string().min(3, 'Usuário deve ter pelo menos 3 caracteres');
const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');

// Master user domain for username-based login
const MASTER_DOMAIN = '@sistema.local';

const Auth: React.FC = () => {
  const [loginType, setLoginType] = useState<'master' | 'client'>('client');
  
  // Master login state
  const [username, setUsername] = useState('');
  
  // Client login state
  const [email, setEmail] = useState('');
  
  // Shared state
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ field?: string; password?: string }>({});
  
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const validateMasterForm = (): boolean => {
    const newErrors: { field?: string; password?: string } = {};
    
    try {
      usernameSchema.parse(username);
    } catch {
      newErrors.field = 'Usuário deve ter pelo menos 3 caracteres';
    }
    
    try {
      passwordSchema.parse(password);
    } catch {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateClientForm = (): boolean => {
    const newErrors: { field?: string; password?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch {
      newErrors.field = 'Email inválido';
    }
    
    try {
      passwordSchema.parse(password);
    } catch {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleMasterSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMasterForm()) return;
    
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

  const handleClientSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateClientForm()) return;
    
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    
    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
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
            Selecione o tipo de acesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={loginType} onValueChange={(v) => { setLoginType(v as 'master' | 'client'); setErrors({}); }}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="client" className="gap-2">
                <Users className="w-4 h-4" />
                Cliente
              </TabsTrigger>
              <TabsTrigger value="master" className="gap-2">
                <Shield className="w-4 h-4" />
                Master
              </TabsTrigger>
            </TabsList>

            {/* Client Login */}
            <TabsContent value="client">
              <form onSubmit={handleClientSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="client-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-muted/50 border-border"
                    />
                  </div>
                  {errors.field && <p className="text-sm text-destructive">{errors.field}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="client-password" className="text-foreground">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="client-password"
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
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Entrar como Cliente
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  Use o email fornecido pelo administrador da sua empresa
                </p>
              </form>
            </TabsContent>

            {/* Master Login */}
            <TabsContent value="master">
              <form onSubmit={handleMasterSignIn} className="space-y-4">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-4">
                  <p className="text-xs text-primary flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Acesso restrito a administradores do sistema
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="master-username" className="text-foreground">Usuário</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="master-username"
                      type="text"
                      placeholder="usuario.master"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 bg-muted/50 border-border"
                    />
                  </div>
                  {errors.field && <p className="text-sm text-destructive">{errors.field}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="master-password" className="text-foreground">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="master-password"
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
