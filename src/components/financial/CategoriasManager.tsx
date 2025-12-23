import { useState } from "react";
import { useCategorias, CategoriaInput } from "@/hooks/useCategorias";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Tag, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface CategoriasManagerProps {
  empresaId: string;
}

const CORES = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
];

const ICONES = [
  "tag", "shopping-cart", "home", "car", "briefcase", 
  "coffee", "gift", "heart", "star", "zap"
];

export function CategoriasManager({ empresaId }: CategoriasManagerProps) {
  const { categorias, isLoading, createCategoria, updateCategoria, deleteCategoria, isCreating } = useCategorias(empresaId);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CategoriaInput>>({
    nome: "",
    tipo: "despesa",
    cor: "#3b82f6",
    icone: "tag",
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      tipo: "despesa",
      cor: "#3b82f6",
      icone: "tag",
    });
    setEditingId(null);
  };

  const handleOpenEdit = (categoria: typeof categorias[0]) => {
    setFormData({
      nome: categoria.nome,
      tipo: categoria.tipo,
      cor: categoria.cor || "#3b82f6",
      icone: categoria.icone || "tag",
    });
    setEditingId(categoria.id);
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.nome || !formData.tipo) return;

    if (editingId) {
      updateCategoria({ id: editingId, ...formData });
    } else {
      createCategoria({ ...formData, empresa_id: empresaId } as CategoriaInput);
    }
    setIsOpen(false);
    resetForm();
  };

  const categoriasReceita = categorias.filter(c => c.tipo === "receita");
  const categoriasDespesa = categorias.filter(c => c.tipo === "despesa");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const renderCategoriaCard = (categoria: typeof categorias[0]) => (
    <div 
      key={categoria.id} 
      className="bg-card/30 backdrop-blur-xl rounded-xl border border-blue-500/20 p-4 hover:border-blue-500/40 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${categoria.cor}20` }}
          >
            <Tag className="w-5 h-5" style={{ color: categoria.cor || "#3b82f6" }} />
          </div>
          <div>
            <h4 className="font-medium text-foreground">{categoria.nome}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              categoria.tipo === "receita" 
                ? "bg-green-500/20 text-green-300" 
                : "bg-red-500/20 text-red-300"
            }`}>
              {categoria.tipo === "receita" ? "Receita" : "Despesa"}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => handleOpenEdit(categoria)}
            className="p-1.5 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => deleteCategoria(categoria.id)}
            className="p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Categorias Financeiras</h3>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  placeholder="Ex: Alimentação"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4 text-green-400" />
                        Receita
                      </div>
                    </SelectItem>
                    <SelectItem value="despesa">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="w-4 h-4 text-red-400" />
                        Despesa
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2 flex-wrap">
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
                disabled={isCreating || !formData.nome}
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? "Salvar Alterações" : "Criar Categoria"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {categorias.length === 0 ? (
        <div className="bg-card/30 backdrop-blur-xl rounded-xl border border-blue-500/20 p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
            <Tag className="w-8 h-8 text-blue-500" />
          </div>
          <h4 className="font-semibold text-foreground mb-2">Nenhuma categoria cadastrada</h4>
          <p className="text-sm text-muted-foreground mb-4">Cadastre categorias para organizar suas transações.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Receitas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-400">
              <ArrowUpRight className="w-4 h-4" />
              Receitas ({categoriasReceita.length})
            </div>
            <div className="space-y-2">
              {categoriasReceita.map(renderCategoriaCard)}
              {categoriasReceita.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma categoria de receita</p>
              )}
            </div>
          </div>

          {/* Despesas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-red-400">
              <ArrowDownRight className="w-4 h-4" />
              Despesas ({categoriasDespesa.length})
            </div>
            <div className="space-y-2">
              {categoriasDespesa.map(renderCategoriaCard)}
              {categoriasDespesa.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma categoria de despesa</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
