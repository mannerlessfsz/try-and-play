import React, { useState } from 'react';
import { usePermissionProfiles } from '@/hooks/usePermissionProfiles';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, CheckCircle2 } from 'lucide-react';

interface ApplyProfileToUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  empresaId: string;
  empresaNome: string;
}

export function ApplyProfileToUserModal({
  isOpen,
  onClose,
  userId,
  userName,
  empresaId,
  empresaNome,
}: ApplyProfileToUserModalProps) {
  const { profiles, applyProfileToUser, isApplying, getProfileItems } = usePermissionProfiles();
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [assignRole, setAssignRole] = useState(true);

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  const profileItems = selectedProfileId ? getProfileItems(selectedProfileId) : [];

  const getPermissionCount = () => {
    let count = 0;
    profileItems.forEach(item => {
      if (item.can_view) count++;
      if (item.can_create) count++;
      if (item.can_edit) count++;
      if (item.can_delete) count++;
      if (item.can_export) count++;
    });
    return count;
  };

  const handleApply = () => {
    applyProfileToUser({
      profileId: selectedProfileId,
      userId,
      empresaId,
      assignRole,
    });
    onClose();
    setSelectedProfileId('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Aplicar Perfil de Permissões
          </DialogTitle>
          <DialogDescription>
            Aplicar um perfil de permissões substituirá todas as permissões granulares atuais do usuário para esta empresa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">Empresa: {empresaNome}</p>
          </div>

          <div className="space-y-2">
            <Label>Selecione o Perfil</Label>
            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um perfil..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.filter(p => p.ativo).map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    <div className="flex items-center gap-2">
                      <span>{profile.nome}</span>
                      {profile.role_padrao && (
                        <Badge variant="outline" className="text-xs">
                          {profile.role_padrao}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProfile && (
            <div className="space-y-3">
              {selectedProfile.descricao && (
                <p className="text-sm text-muted-foreground">{selectedProfile.descricao}</p>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{getPermissionCount()} permissões serão configuradas</span>
              </div>

              {selectedProfile.role_padrao && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="assignRole"
                    checked={assignRole}
                    onCheckedChange={(checked) => setAssignRole(!!checked)}
                  />
                  <label
                    htmlFor="assignRole"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Atribuir role "{selectedProfile.role_padrao}" ao usuário
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={!selectedProfileId || isApplying}
            className="gap-2"
          >
            {isApplying && <Loader2 className="w-4 h-4 animate-spin" />}
            Aplicar Perfil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
