import { useState } from "react";
import { useContasBancarias, ContaBancariaInput } from "@/hooks/useContasBancarias";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Building2, Wallet, Loader2 } from "lucide-react";

interface ContasBancariasManagerProps {
  empresaId: string;
}

const BANCOS = [
  "Banco do Brasil", "Bradesco", "Caixa Econômica", "Itaú", "Santander",
  "Nubank", "Inter", "C6 Bank", "BTG Pactual", "Sicoob", "Sicredi", "Outro"
];

const TIPOS_CONTA = [
  { value: "corrente", label: "Conta Corrente" },
  { value: "poupanca", label: "Poupança" },
  { value: "investimento", label: "Investimento" },
  { value: "caixa", label: "Caixa" },
];

const CORES = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
];

export function ContasBancariasManager({ empresaId }: ContasBancariasManagerProps) {
  const { contas, isLoading, createConta, updateConta, deleteConta, isCreating } = useContasBancarias(empresaId);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ContaBancariaInput>>({
    nome: "",
    banco: "",
    agencia: "",
    conta: "",
    tipo: "corrente",
    saldo_inicial: 0,
    cor: "#3b82f6",
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      banco: "",
      agencia: "",
      conta: "",
      tipo: "corrente",
      saldo_inicial: 0,
      cor: "#3b82f6",
    });
    setEditingId(null);
  };

  const handleOpenEdit = (conta: typeof contas[0]) => {
    setFormData({
      nome: conta.nome,
      banco: conta.banco,
      agencia: conta.agencia || "",
      conta: conta.conta || "",
      tipo: conta.tipo,
      saldo_inicial: conta.saldo_inicial || 0,
      cor: conta.cor || "#3b82f6",
    });
    setEditingId(conta.id);
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.nome || !formData.banco) return;

    if (editingId) {
      updateConta({ id: editingId, ...formData });
    } else {
      createConta({ ...formData, empresa_id: empresaId } as ContaBancariaInput);
    }
    setIsOpen(false);
    resetForm();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Contas Bancárias</h3>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Conta" : "Nova Conta Bancária"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome da Conta *</Label>
                <Input
                  placeholder="Ex: Conta Principal"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Banco *</Label>
                <Select value={formData.banco} onValueChange={(v) => setFormData(prev => ({ ...prev, banco: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANCOS.map(banco => (
                      <SelectItem key={banco} value={banco}>{banco}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Agência</Label>
                  <Input
                    placeholder="0000"
                    value={formData.agencia}
                    onChange={(e) => setFormData(prev => ({ ...prev, agencia: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Input
                    placeholder="00000-0"
                    value={formData.conta}
                    onChange={(e) => setFormData(prev => ({ ...prev, conta: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Conta</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONTA.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Saldo Inicial</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.saldo_inicial}
                  onChange={(e) => setFormData(prev => ({ ...prev, saldo_inicial: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  {CORES.map(cor => (
                    <button
                      key={cor}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.cor === cor ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: cor }}
                      onClick={() => setFormData(prev => ({ ...prev, cor }))}
                    />
                  ))}
                </div>
              </div>
              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600" 
                onClick={handleSubmit}
                disabled={isCreating || !formData.nome || !formData.banco}
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? "Salvar Alterações" : "Criar Conta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {contas.length === 0 ? (
        <div className="bg-card/30 backdrop-blur-xl rounded-xl border border-blue-500/20 p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
          <h4 className="font-semibold text-foreground mb-2">Nenhuma conta cadastrada</h4>
          <p className="text-sm text-muted-foreground mb-4">Cadastre suas contas bancárias para gerenciar seu fluxo de caixa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contas.map(conta => (
            <div 
              key={conta.id} 
              className="bg-card/30 backdrop-blur-xl rounded-xl border border-blue-500/20 p-4 hover:border-blue-500/40 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${conta.cor}20` }}
                  >
                    <Wallet className="w-5 h-5" style={{ color: conta.cor || "#3b82f6" }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{conta.nome}</h4>
                    <p className="text-xs text-muted-foreground">{conta.banco}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleOpenEdit(conta)}
                    className="p-1.5 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteConta(conta.id)}
                    className="p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {conta.agencia && <p>Agência: {conta.agencia}</p>}
                {conta.conta && <p>Conta: {conta.conta}</p>}
                <p className="capitalize">Tipo: {conta.tipo}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-foreground/10">
                <p className="text-xs text-muted-foreground">Saldo Inicial</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(conta.saldo_inicial || 0)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
