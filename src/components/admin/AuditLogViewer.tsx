import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, Search, Filter, Eye, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const tableNameLabels: Record<string, string> = {
  user_module_permissions: 'Permissões de Módulo',
  user_roles: 'Roles de Usuário',
  empresa_modulos: 'Módulos da Empresa',
  empresas: 'Empresas',
  profiles: 'Perfis de Usuário'
};

const actionLabels: Record<string, { label: string; color: string }> = {
  INSERT: { label: 'Criação', color: 'bg-green-500' },
  UPDATE: { label: 'Atualização', color: 'bg-blue-500' },
  DELETE: { label: 'Exclusão', color: 'bg-red-500' }
};

export const AuditLogViewer: React.FC = () => {
  const [tableName, setTableName] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const { data: logs = [], isLoading, refetch } = useAuditLogs({
    tableName: tableName || undefined,
    action: action || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate + 'T23:59:59') : undefined,
    limit: 200
  });

  // Fetch profiles for user names
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email');
      if (error) throw error;
      return data;
    }
  });

  const getUserName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name || profile?.email || userId.slice(0, 8);
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.details?.toLowerCase().includes(term) ||
      log.table_name.toLowerCase().includes(term) ||
      getUserName(log.user_id).toLowerCase().includes(term)
    );
  });

  const renderDataDiff = (oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null) => {
    if (!oldData && !newData) return null;

    const allKeys = new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {})
    ]);

    const changes: { key: string; oldValue: unknown; newValue: unknown }[] = [];
    
    allKeys.forEach(key => {
      const oldValue = oldData?.[key];
      const newValue = newData?.[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ key, oldValue, newValue });
      }
    });

    if (changes.length === 0) return <p className="text-muted-foreground text-sm">Nenhuma alteração detectada</p>;

    return (
      <div className="space-y-2">
        {changes.map(({ key, oldValue, newValue }) => (
          <div key={key} className="text-sm border-l-2 border-primary/30 pl-3">
            <span className="font-medium text-foreground">{key}:</span>
            {oldValue !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-red-400 line-through text-xs">
                  {typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue)}
                </span>
              </div>
            )}
            {newValue !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-xs">
                  {typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Auditoria de Permissões
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={tableName} onValueChange={setTableName}>
            <SelectTrigger>
              <SelectValue placeholder="Tabela" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {Object.entries(tableNameLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={action} onValueChange={setAction}>
            <SelectTrigger>
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              <SelectItem value="INSERT">Criação</SelectItem>
              <SelectItem value="UPDATE">Atualização</SelectItem>
              <SelectItem value="DELETE">Exclusão</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Data inicial"
          />

          <div className="flex gap-2">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Data final"
            />
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Logs List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum registro de auditoria encontrado
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredLogs.map((log) => {
                const actionInfo = actionLabels[log.action] || { label: log.action, color: 'bg-gray-500' };
                const isExpanded = expandedLog === log.id;

                return (
                  <div
                    key={log.id}
                    className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div 
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Badge className={`${actionInfo.color} text-white`}>
                          {actionInfo.label}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">
                            {tableNameLabels[log.table_name] || log.table_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.details}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Por: <span className="font-medium">{getUserName(log.user_id)}</span>
                            {' • '}
                            {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t">
                        <h4 className="text-sm font-medium mb-2">Alterações:</h4>
                        {renderDataDiff(log.old_data, log.new_data)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>{filteredLogs.length} registros encontrados</span>
        </div>
      </CardContent>
    </Card>
  );
};
