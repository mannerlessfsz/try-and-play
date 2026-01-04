import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MODULE_RESOURCES, PERMISSION_ACTIONS } from '@/hooks/useResourcePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  FileDown, 
  Loader2, 
  FileSpreadsheet,
  FileText,
  Users,
  Building2,
  Shield
} from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  ativo: boolean;
}

interface Empresa {
  id: string;
  nome: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
}

interface UserResourcePermission {
  id: string;
  user_id: string;
  empresa_id: string;
  module: string;
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
}

interface UserEmpresa {
  id: string;
  user_id: string;
  empresa_id: string;
  is_owner: boolean;
}

const MODULES = [
  { value: 'all', label: 'Todos os Módulos' },
  { value: 'financialace', label: 'FinancialACE' },
  { value: 'erp', label: 'ERP/Gestão' },
  { value: 'taskvault', label: 'TaskVault' },
  { value: 'conversores', label: 'Conversores' },
];

export function PermissionReportExporter() {
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch data
  const { data: users = [] } = useQuery({
    queryKey: ['report-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data as Profile[];
    }
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ['report-empresas'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_empresas_safe');
      if (error) throw error;
      return (data || []) as Empresa[];
    }
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['report-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data as UserRole[];
    }
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['report-resource-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_resource_permissions').select('*');
      if (error) throw error;
      return data as UserResourcePermission[];
    }
  });

  const { data: userEmpresas = [] } = useQuery({
    queryKey: ['report-user-empresas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_empresas').select('*');
      if (error) throw error;
      return data as UserEmpresa[];
    }
  });

  // Filtered data
  const filteredUsers = users.filter(u => includeInactive || u.ativo);
  
  const getFilteredPermissions = () => {
    let filtered = permissions;
    
    if (selectedEmpresa !== 'all') {
      filtered = filtered.filter(p => p.empresa_id === selectedEmpresa);
    }
    
    if (selectedModule !== 'all') {
      filtered = filtered.filter(p => p.module === selectedModule);
    }
    
    return filtered;
  };

  const getUserRoles = (userId: string): string[] => {
    return roles.filter(r => r.user_id === userId).map(r => r.role);
  };

  const getUserEmpresas = (userId: string): Empresa[] => {
    const userEmpIds = userEmpresas.filter(ue => ue.user_id === userId).map(ue => ue.empresa_id);
    return empresas.filter(e => userEmpIds.includes(e.id));
  };

  const getUserPermissionSummary = (userId: string) => {
    const userPerms = getFilteredPermissions().filter(p => p.user_id === userId);
    
    const summary: Record<string, { 
      view: number; 
      create: number; 
      edit: number; 
      delete: number; 
      export: number; 
      total: number 
    }> = {};
    
    Object.keys(MODULE_RESOURCES).forEach(mod => {
      summary[mod] = { view: 0, create: 0, edit: 0, delete: 0, export: 0, total: 0 };
    });
    
    userPerms.forEach(p => {
      if (!summary[p.module]) return;
      if (p.can_view) { summary[p.module].view++; summary[p.module].total++; }
      if (p.can_create) { summary[p.module].create++; summary[p.module].total++; }
      if (p.can_edit) { summary[p.module].edit++; summary[p.module].total++; }
      if (p.can_delete) { summary[p.module].delete++; summary[p.module].total++; }
      if (p.can_export) { summary[p.module].export++; summary[p.module].total++; }
    });
    
    return summary;
  };

  const exportToCSV = () => {
    setIsExporting(true);
    
    try {
      const lines: string[] = [];
      
      // Header
      lines.push('Relatório de Permissões - VAULT');
      lines.push(`Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`);
      lines.push('');
      
      // CSV Header
      const headers = [
        'Usuário',
        'E-mail',
        'Status',
        'Roles',
        'Empresas',
        'Módulo',
        'Recurso',
        'Visualizar',
        'Criar',
        'Editar',
        'Excluir',
        'Exportar'
      ];
      lines.push(headers.join(';'));
      
      // Data rows
      filteredUsers.forEach(user => {
        const userPerms = getFilteredPermissions().filter(p => p.user_id === user.id);
        const userRoleList = getUserRoles(user.id).join(', ') || 'Nenhum';
        const userEmpList = getUserEmpresas(user.id).map(e => e.nome).join(', ') || 'Nenhuma';
        
        if (userPerms.length === 0) {
          lines.push([
            user.full_name || user.email,
            user.email,
            user.ativo ? 'Ativo' : 'Inativo',
            userRoleList,
            userEmpList,
            '-',
            '-',
            '-',
            '-',
            '-',
            '-',
            '-'
          ].join(';'));
        } else {
          userPerms.forEach(perm => {
            const moduleLabel = MODULES.find(m => m.value === perm.module)?.label || perm.module;
            const resourceLabel = MODULE_RESOURCES[perm.module]?.find(r => r.value === perm.resource)?.label || perm.resource;
            
            lines.push([
              user.full_name || user.email,
              user.email,
              user.ativo ? 'Ativo' : 'Inativo',
              userRoleList,
              userEmpList,
              moduleLabel,
              resourceLabel,
              perm.can_view ? 'Sim' : 'Não',
              perm.can_create ? 'Sim' : 'Não',
              perm.can_edit ? 'Sim' : 'Não',
              perm.can_delete ? 'Sim' : 'Não',
              perm.can_export ? 'Sim' : 'Não'
            ].join(';'));
          });
        }
      });
      
      // Create and download file
      const csvContent = lines.join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `permissoes_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const exportDetailedReport = () => {
    setIsExporting(true);
    
    try {
      const lines: string[] = [];
      
      lines.push('='.repeat(80));
      lines.push('RELATÓRIO DETALHADO DE PERMISSÕES - VAULT');
      lines.push(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`);
      lines.push('='.repeat(80));
      lines.push('');
      
      // Summary
      lines.push('RESUMO GERAL');
      lines.push('-'.repeat(40));
      lines.push(`Total de Usuários: ${filteredUsers.length}`);
      lines.push(`Total de Empresas: ${empresas.length}`);
      lines.push(`Total de Permissões Configuradas: ${getFilteredPermissions().length}`);
      lines.push('');
      
      // Per user details
      filteredUsers.forEach(user => {
        lines.push('');
        lines.push('='.repeat(60));
        lines.push(`USUÁRIO: ${user.full_name || 'Sem nome'}`);
        lines.push(`E-mail: ${user.email}`);
        lines.push(`Status: ${user.ativo ? 'Ativo' : 'Inativo'}`);
        lines.push(`Roles: ${getUserRoles(user.id).join(', ') || 'Nenhum'}`);
        lines.push(`Empresas: ${getUserEmpresas(user.id).map(e => e.nome).join(', ') || 'Nenhuma'}`);
        lines.push('-'.repeat(60));
        
        const summary = getUserPermissionSummary(user.id);
        Object.keys(MODULE_RESOURCES).forEach(mod => {
          const modSummary = summary[mod];
          if (modSummary && modSummary.total > 0) {
            const modLabel = MODULES.find(m => m.value === mod)?.label || mod;
            lines.push(`\n  ${modLabel}:`);
            lines.push(`    Visualizar: ${modSummary.view} | Criar: ${modSummary.create} | Editar: ${modSummary.edit} | Excluir: ${modSummary.delete} | Exportar: ${modSummary.export}`);
            
            const userModPerms = getFilteredPermissions().filter(p => p.user_id === user.id && p.module === mod);
            userModPerms.forEach(perm => {
              const resLabel = MODULE_RESOURCES[mod]?.find(r => r.value === perm.resource)?.label || perm.resource;
              const perms = [];
              if (perm.can_view) perms.push('V');
              if (perm.can_create) perms.push('C');
              if (perm.can_edit) perms.push('E');
              if (perm.can_delete) perms.push('D');
              if (perm.can_export) perms.push('X');
              lines.push(`      - ${resLabel}: [${perms.join(', ')}]`);
            });
          }
        });
      });
      
      lines.push('');
      lines.push('='.repeat(80));
      lines.push('Legenda: V=Visualizar, C=Criar, E=Editar, D=Excluir, X=Exportar');
      lines.push('FIM DO RELATÓRIO');
      lines.push('='.repeat(80));
      
      // Create and download file
      const content = lines.join('\n');
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_permissoes_${new Date().toISOString().split('T')[0]}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const totalPermissions = getFilteredPermissions().length;
  const usersWithPermissions = new Set(getFilteredPermissions().map(p => p.user_id)).size;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="w-5 h-5" />
          Exportar Relatório de Permissões
        </CardTitle>
        <CardDescription>
          Gere relatórios detalhados mostrando quais usuários têm acesso a quais recursos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Empresas</SelectItem>
                {empresas.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Módulo</Label>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o módulo" />
              </SelectTrigger>
              <SelectContent>
                {MODULES.map(mod => (
                  <SelectItem key={mod.value} value={mod.value}>{mod.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2 flex items-end">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeInactive" 
                checked={includeInactive}
                onCheckedChange={(checked) => setIncludeInactive(checked === true)}
              />
              <Label htmlFor="includeInactive">Incluir usuários inativos</Label>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usuários no filtro</p>
              <p className="text-xl font-bold">{filteredUsers.length}</p>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Permissões configuradas</p>
              <p className="text-xl font-bold">{totalPermissions}</p>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usuários com permissões</p>
              <p className="text-xl font-bold">{usersWithPermissions}</p>
            </div>
          </div>
        </div>

        {/* Preview Table */}
        <div className="border rounded-lg">
          <div className="p-3 border-b bg-muted/50">
            <h4 className="font-medium text-sm">Prévia do Relatório (primeiros 10 usuários)</h4>
          </div>
          <div className="max-h-[300px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Empresas</TableHead>
                  <TableHead className="text-center">Permissões</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.slice(0, 10).map(user => {
                  const userPerms = getFilteredPermissions().filter(p => p.user_id === user.id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getUserRoles(user.id).map(role => (
                            <Badge key={role} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                          {getUserRoles(user.id).length === 0 && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getUserEmpresas(user.id).slice(0, 2).map(emp => (
                            <Badge key={emp.id} variant="secondary" className="text-xs">
                              {emp.nome}
                            </Badge>
                          ))}
                          {getUserEmpresas(user.id).length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{getUserEmpresas(user.id).length - 2}
                            </Badge>
                          )}
                          {getUserEmpresas(user.id).length === 0 && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={userPerms.length > 0 ? 'default' : 'outline'}>
                          {userPerms.length} recurso(s)
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={exportToCSV} disabled={isExporting} className="gap-2">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Exportar CSV (Excel)
          </Button>
          <Button onClick={exportDetailedReport} disabled={isExporting} variant="outline" className="gap-2">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Relatório Detalhado (TXT)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
