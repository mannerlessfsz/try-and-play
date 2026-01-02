import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClientes, ClienteInsert, Cliente } from "@/hooks/useClientes";
import { Loader2, Save, X } from "lucide-react";

interface ClienteFormModalProps {
  open: boolean;
  onClose: () => void;
  empresaId: string;
  cliente?: Cliente | null;
}

export function ClienteFormModal({ open, onClose, empresaId, cliente }: ClienteFormModalProps) {
  const { addCliente, updateCliente } = useClientes(empresaId);
  const [formData, setFormData] = useState<Partial<ClienteInsert>>({
    tipo_pessoa: "fisica",
    ativo: true,
  });

  const isEditing = !!cliente;

  useEffect(() => {
    if (cliente) {
      setFormData({
        tipo_pessoa: cliente.tipo_pessoa || "fisica",
        nome: cliente.nome,
        nome_fantasia: cliente.nome_fantasia,
        cpf_cnpj: cliente.cpf_cnpj,
        rg_ie: cliente.rg_ie,
        email: cliente.email,
        telefone: cliente.telefone,
        celular: cliente.celular,
        cep: cliente.cep,
        endereco: cliente.endereco,
        numero: cliente.numero,
        bairro: cliente.bairro,
        cidade: cliente.cidade,
        estado: cliente.estado,
        complemento: cliente.complemento,
        limite_credito: cliente.limite_credito,
        data_nascimento: cliente.data_nascimento,
        observacoes: cliente.observacoes,
        ativo: cliente.ativo ?? true,
      });
    } else {
      setFormData({ tipo_pessoa: "fisica", ativo: true });
    }
  }, [cliente, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome) return;

    if (isEditing && cliente) {
      updateCliente.mutate(
        { id: cliente.id, ...formData },
        {
          onSuccess: () => {
            setFormData({ tipo_pessoa: "fisica", ativo: true });
            onClose();
          },
        }
      );
    } else {
      addCliente.mutate(
        { ...formData, empresa_id: empresaId, nome: formData.nome } as ClienteInsert,
        {
          onSuccess: () => {
            setFormData({ tipo_pessoa: "fisica", ativo: true });
            onClose();
          },
        }
      );
    }
  };

  const updateField = (field: keyof ClienteInsert, value: string | number | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isPending = addCliente.isPending || updateCliente.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-green-500">
            {isEditing ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Pessoa */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Pessoa *</Label>
              <Select
                value={formData.tipo_pessoa || "fisica"}
                onValueChange={(v) => updateField("tipo_pessoa", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Pessoa Física</SelectItem>
                  <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{formData.tipo_pessoa === "juridica" ? "CNPJ" : "CPF"}</Label>
              <Input
                placeholder={formData.tipo_pessoa === "juridica" ? "00.000.000/0000-00" : "000.000.000-00"}
                value={formData.cpf_cnpj || ""}
                onChange={(e) => updateField("cpf_cnpj", e.target.value)}
              />
            </div>
          </div>

          {/* Nome e Nome Fantasia */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{formData.tipo_pessoa === "juridica" ? "Razão Social *" : "Nome Completo *"}</Label>
              <Input
                required
                placeholder="Nome do cliente"
                value={formData.nome || ""}
                onChange={(e) => updateField("nome", e.target.value)}
              />
            </div>
            {formData.tipo_pessoa === "juridica" && (
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input
                  placeholder="Nome fantasia"
                  value={formData.nome_fantasia || ""}
                  onChange={(e) => updateField("nome_fantasia", e.target.value)}
                />
              </div>
            )}
            {formData.tipo_pessoa === "fisica" && (
              <div className="space-y-2">
                <Label>RG</Label>
                <Input
                  placeholder="RG"
                  value={formData.rg_ie || ""}
                  onChange={(e) => updateField("rg_ie", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Contato */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={formData.email || ""}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                placeholder="(00) 0000-0000"
                value={formData.telefone || ""}
                onChange={(e) => updateField("telefone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Celular</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={formData.celular || ""}
                onChange={(e) => updateField("celular", e.target.value)}
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                placeholder="00000-000"
                value={formData.cep || ""}
                onChange={(e) => updateField("cep", e.target.value)}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Endereço</Label>
              <Input
                placeholder="Rua, Avenida..."
                value={formData.endereco || ""}
                onChange={(e) => updateField("endereco", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input
                placeholder="Nº"
                value={formData.numero || ""}
                onChange={(e) => updateField("numero", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input
                placeholder="Bairro"
                value={formData.bairro || ""}
                onChange={(e) => updateField("bairro", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                placeholder="Cidade"
                value={formData.cidade || ""}
                onChange={(e) => updateField("cidade", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Input
                placeholder="UF"
                maxLength={2}
                value={formData.estado || ""}
                onChange={(e) => updateField("estado", e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input
                placeholder="Apto, Sala..."
                value={formData.complemento || ""}
                onChange={(e) => updateField("complemento", e.target.value)}
              />
            </div>
          </div>

          {/* Limite de crédito */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Limite de Crédito (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.limite_credito || ""}
                onChange={(e) => updateField("limite_credito", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={formData.data_nascimento || ""}
                onChange={(e) => updateField("data_nascimento", e.target.value)}
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações sobre o cliente..."
              value={formData.observacoes || ""}
              onChange={(e) => updateField("observacoes", e.target.value)}
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-500 hover:bg-green-600" disabled={isPending}>
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEditing ? "Atualizar" : "Salvar"} Cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
