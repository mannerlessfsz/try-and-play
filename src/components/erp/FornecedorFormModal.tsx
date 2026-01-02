import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFornecedores, FornecedorInsert } from "@/hooks/useFornecedores";
import { Loader2, Save, X } from "lucide-react";

interface FornecedorFormModalProps {
  open: boolean;
  onClose: () => void;
  empresaId: string;
}

export function FornecedorFormModal({ open, onClose, empresaId }: FornecedorFormModalProps) {
  const { addFornecedor } = useFornecedores(empresaId);
  const [formData, setFormData] = useState<Partial<FornecedorInsert>>({
    tipo_pessoa: "juridica",
    ativo: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome) return;

    addFornecedor.mutate(
      { ...formData, empresa_id: empresaId, nome: formData.nome } as FornecedorInsert,
      {
        onSuccess: () => {
          setFormData({ tipo_pessoa: "juridica", ativo: true });
          onClose();
        },
      }
    );
  };

  const updateField = (field: keyof FornecedorInsert, value: string | number | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-orange-500">Novo Fornecedor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Pessoa */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Pessoa *</Label>
              <Select
                value={formData.tipo_pessoa || "juridica"}
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
                placeholder="Nome do fornecedor"
                value={formData.nome || ""}
                onChange={(e) => updateField("nome", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{formData.tipo_pessoa === "juridica" ? "Nome Fantasia" : "RG/IE"}</Label>
              <Input
                placeholder={formData.tipo_pessoa === "juridica" ? "Nome fantasia" : "RG ou IE"}
                value={formData.tipo_pessoa === "juridica" ? formData.nome_fantasia || "" : formData.rg_ie || ""}
                onChange={(e) => updateField(formData.tipo_pessoa === "juridica" ? "nome_fantasia" : "rg_ie", e.target.value)}
              />
            </div>
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

          {/* Contato da Empresa */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nome do Contato</Label>
              <Input
                placeholder="Pessoa de contato"
                value={formData.contato_nome || ""}
                onChange={(e) => updateField("contato_nome", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone Contato</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={formData.contato_telefone || ""}
                onChange={(e) => updateField("contato_telefone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail Contato</Label>
              <Input
                type="email"
                placeholder="contato@empresa.com"
                value={formData.contato_email || ""}
                onChange={(e) => updateField("contato_email", e.target.value)}
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
                placeholder="Sala, Galpão..."
                value={formData.complemento || ""}
                onChange={(e) => updateField("complemento", e.target.value)}
              />
            </div>
          </div>

          {/* Dados comerciais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prazo de Entrega (dias)</Label>
              <Input
                type="number"
                placeholder="Ex: 15"
                value={formData.prazo_entrega_dias || ""}
                onChange={(e) => updateField("prazo_entrega_dias", parseInt(e.target.value) || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Condição de Pagamento</Label>
              <Input
                placeholder="Ex: 30/60/90 dias"
                value={formData.condicao_pagamento || ""}
                onChange={(e) => updateField("condicao_pagamento", e.target.value)}
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações sobre o fornecedor..."
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
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={addFornecedor.isPending}>
              {addFornecedor.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Fornecedor
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
