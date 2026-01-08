/**
 * Gerenciador de permissões para usuários (standalone, sem vínculo com empresa)
 * 
 * Permite atribuir permissões globais a usuários que não estão vinculados a empresas
 * ou gerenciar permissões específicas por empresa quando selecionada.
 * 
 * Usa o editor hierárquico completo: Módulo → Sub-módulo → Recurso → Ações
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { HierarchicalPermissionsEditor } from './HierarchicalPermissionsEditor';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Globe, Building2, Loader2, Zap } from 'lucide-react';

interface UserPermissionsManagerProps {
  userId: string;
  userName: string;
  isMaster?: boolean;
}

interface UserEmpresa {
  id: string;
  user_id: string;
  empresa_id: string;
  is_owner: boolean;
}

interface Empresa {
  id: string;
  nome: string;
}

interface EmpresaModulo {
  empresa_id: string;
  modulo: string;
  modo: string;
}

export function UserPermissionsManager({ 
  userId, 
  userName, 
  isMaster = false 
}: UserPermissionsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('global');

  // Fetch user's linked companies
  const { data: userEmpresas = [], isLoading: loadingEmpresas } = useQuery({
    queryKey: ['user-empresas-permissions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_empresas')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data as UserEmpresa[];
    },
    enabled: isOpen,
  });

  // Fetch empresa details
  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas-for-permissions', userEmpresas.map(ue => ue.empresa_id)],
    queryFn: async () => {
      if (userEmpresas.length === 0) return [];
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome')
        .in('id', userEmpresas.map(ue => ue.empresa_id));
      if (error) throw error;
      return data as Empresa[];
    },
    enabled: isOpen && userEmpresas.length > 0,
  });

  // Fetch empresa modules with mode (basico/pro)
  const { data: allEmpresaModulos = [] } = useQuery({
    queryKey: ['all-empresa-modulos-for-user-with-mode', userId],
    queryFn: async () => {
      if (userEmpresas.length === 0) return [];
      const { data, error } = await supabase
        .from('empresa_modulos')
        .select('empresa_id, modulo, modo')
        .in('empresa_id', userEmpresas.map(ue => ue.empresa_id))
        .eq('ativo', true);
      if (error) throw error;
      return data as EmpresaModulo[];
    },
    enabled: isOpen && userEmpresas.length > 0,
  });

  const getEmpresaName = (empresaId: string) => 
    empresas.find(e => e.id === empresaId)?.nome || 'Empresa';

  // Verifica se a empresa tem pelo menos um módulo em modo Pro
  const isEmpresaProMode = (empresaId: string): boolean => {
    const modulos = allEmpresaModulos.filter(m => m.empresa_id === empresaId);
    return modulos.some(m => m.modo === 'pro');
  };

  if (isMaster) {
    return (
      <Badge variant="outline" className="gap-1 text-yellow-500 border-yellow-500">
        <Settings className="w-3 h-3" /> Acesso Total
      </Badge>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Settings className="w-4 h-4" />
          Permissões
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Permissões de {userName}
          </DialogTitle>
        </DialogHeader>

        {loadingEmpresas ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="global" className="gap-2">
                <Globe className="w-4 h-4" />
                Global (Standalone)
              </TabsTrigger>
              {userEmpresas.map(ue => {
                const isPro = isEmpresaProMode(ue.empresa_id);
                return (
                  <TabsTrigger key={ue.empresa_id} value={ue.empresa_id} className="gap-2">
                    <Building2 className="w-4 h-4" />
                    {getEmpresaName(ue.empresa_id)}
                    {isPro && <Zap className="w-3 h-3 text-amber-500" />}
                    {ue.is_owner && <span className="text-yellow-500">★</span>}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Global/Standalone Permissions */}
            <TabsContent value="global" className="mt-4">
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <Globe className="w-4 h-4 inline mr-2" />
                    Permissões globais são aplicadas quando o usuário não está vinculado a nenhuma empresa 
                    ou para funcionalidades que não dependem de empresa.
                  </p>
                </div>
                <HierarchicalPermissionsEditor
                  userId={userId}
                  empresaId={null}
                  isProMode={true} // Global sempre tem acesso a tudo
                />
              </div>
            </TabsContent>

            {/* Per-Company Permissions */}
            {userEmpresas.map(ue => {
              const isPro = isEmpresaProMode(ue.empresa_id);
              return (
                <TabsContent key={ue.empresa_id} value={ue.empresa_id} className="mt-4">
                  <div className="space-y-4">
                    <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4 inline mr-2" />
                        Permissões específicas para <strong>{getEmpresaName(ue.empresa_id)}</strong>.
                      </p>
                      {isPro ? (
                        <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500">
                          <Zap className="w-3 h-3" /> Modo Pro
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Modo Básico</Badge>
                      )}
                    </div>
                    <HierarchicalPermissionsEditor
                      userId={userId}
                      empresaId={ue.empresa_id}
                      isProMode={isPro}
                    />
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}