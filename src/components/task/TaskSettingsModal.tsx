import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, Trash2, FileText, Building2, LayoutGrid,
  Calendar, AlertTriangle, Save, X, Edit, Loader2, Briefcase
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTarefasModelo, REGIMES_TRIBUTARIOS, DEPARTAMENTOS, PERIODICIDADES, TarefaModeloFormData, TarefaModelo } from "@/hooks/useTarefasModelo";
import { Database } from "@/integrations/supabase/types";

type DepartamentoTipo = Database['public']['Enums']['departamento_tipo'];
type RegimeTributario = Database['public']['Enums']['regime_tributario'];

interface TaskSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

export function TaskSettingsModal({ isOpen, onClose, initialTab = "modelos" }: TaskSettingsModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editingModelo, setEditingModelo] = useState<TarefaModelo | null>(null);
  const [showModeloForm, setShowModeloForm] = useState(false);
  const [formData, setFormData] = useState<TarefaModeloFormData>({
    titulo: "",
    descricao: "",
    departamento: "fiscal",
    prioridade: "media",
    dia_vencimento: undefined,
    prazo_dias: undefined,
    requer_anexo: false,
    justificativa: "",
    periodicidade: "mensal",
    regimes: [],
  });

  const { 
    tarefasModelo, 
    isLoading,
    createTarefaModelo, 
    updateTarefaModelo, 
    deleteTarefaModelo,
    toggleAtivo,
    isCreating,
    isUpdating
  } = useTarefasModelo();

  const resetForm = () => {
    setFormData({
      titulo: "",
      descricao: "",
      departamento: "fiscal",
      prioridade: "media",
      dia_vencimento: undefined,
      prazo_dias: undefined,
      requer_anexo: false,
      justificativa: "",
      periodicidade: "mensal",
      regimes: [],
    });
    setEditingModelo(null);
    setShowModeloForm(false);
  };

  const handleEditModelo = (modelo: TarefaModelo) => {
    setEditingModelo(modelo);
    setFormData({
      titulo: modelo.titulo,
      descricao: modelo.descricao || "",
      departamento: modelo.departamento,
      prioridade: modelo.prioridade,
      dia_vencimento: modelo.dia_vencimento || undefined,
      prazo_dias: modelo.prazo_dias || undefined,
      requer_anexo: modelo.requer_anexo || false,
      justificativa: modelo.justificativa || "",
      periodicidade: modelo.periodicidade,
      regimes: modelo.regimes || [],
    });
    setShowModeloForm(true);
  };

  const handleSaveModelo = () => {
    if (!formData.titulo) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    if (formData.regimes.length === 0) {
      toast({ title: "Selecione ao menos um regime tributário", variant: "destructive" });
      return;
    }

    if (editingModelo) {
      updateTarefaModelo({ id: editingModelo.id, ...formData });
    } else {
      createTarefaModelo(formData);
    }
    resetForm();
  };

  const handleToggleRegime = (regime: RegimeTributario) => {
    setFormData(prev => ({
      ...prev,
      regimes: prev.regimes.includes(regime)
        ? prev.regimes.filter(r => r !== regime)
        : [...prev.regimes, regime]
    }));
  };

  const getRegimeLabel = (regime: RegimeTributario) => 
    REGIMES_TRIBUTARIOS.find(r => r.value === regime)?.label || regime;

  const getDepartamentoLabel = (dep: DepartamentoTipo) => 
    DEPARTAMENTOS.find(d => d.value === dep)?.label || dep;

  const getPeriodicidadeLabel = (per: string) =>
    PERIODICIDADES.find(p => p.value === per)?.label || per;

  const groupedModelos = tarefasModelo.reduce((acc, modelo) => {
    const dep = modelo.departamento;
    if (!acc[dep]) acc[dep] = [];
    acc[dep].push(modelo);
    return acc;
  }, {} as Record<DepartamentoTipo, TarefaModelo[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden bg-card border-red-500/30">
        <DialogHeader className="border-b border-red-500/20 pb-4">
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-red-500" />
            Configurações do TaskVault
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid grid-cols-3 bg-background/50 border border-foreground/10 mb-4">
            <TabsTrigger value="modelos" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Modelos de Tarefas
            </TabsTrigger>
            <TabsTrigger value="regimes" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-2" />
              Regimes Tributários
            </TabsTrigger>
            <TabsTrigger value="departamentos" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
              <Briefcase className="w-4 h-4 mr-2" />
              Departamentos
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[55vh] pr-2">
            {/* Tab: Modelos de Tarefas */}
            <TabsContent value="modelos" className="mt-0">
              {showModeloForm ? (
                <div className="space-y-4 p-4 bg-background/50 rounded-lg border border-foreground/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">
                      {editingModelo ? "Editar Modelo" : "Novo Modelo de Tarefa"}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={resetForm}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Título *</label>
                      <Input 
                        value={formData.titulo}
                        onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                        placeholder="Ex: Entrega de SPED Fiscal"
                        className="bg-background border-foreground/20"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
                      <Input 
                        value={formData.descricao}
                        onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                        placeholder="Descrição detalhada"
                        className="bg-background border-foreground/20"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Departamento *</label>
                      <select 
                        value={formData.departamento}
                        onChange={(e) => setFormData(prev => ({ ...prev, departamento: e.target.value as DepartamentoTipo }))}
                        className="w-full h-9 px-3 rounded-md bg-background border border-foreground/20 text-sm"
                      >
                        {DEPARTAMENTOS.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Periodicidade *</label>
                      <select 
                        value={formData.periodicidade}
                        onChange={(e) => setFormData(prev => ({ ...prev, periodicidade: e.target.value as any }))}
                        className="w-full h-9 px-3 rounded-md bg-background border border-foreground/20 text-sm"
                      >
                        {PERIODICIDADES.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Prioridade</label>
                      <select 
                        value={formData.prioridade}
                        onChange={(e) => setFormData(prev => ({ ...prev, prioridade: e.target.value }))}
                        className="w-full h-9 px-3 rounded-md bg-background border border-foreground/20 text-sm"
                      >
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Dia do Vencimento</label>
                      <Input 
                        type="number"
                        min={1}
                        max={31}
                        value={formData.dia_vencimento || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, dia_vencimento: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="Ex: 15"
                        className="bg-background border-foreground/20"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Prazo em Dias</label>
                      <Input 
                        type="number"
                        min={1}
                        value={formData.prazo_dias || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, prazo_dias: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="Ex: 5"
                        className="bg-background border-foreground/20"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={formData.requer_anexo}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requer_anexo: !!checked }))}
                      />
                      <label className="text-sm text-muted-foreground">Requer anexo para conclusão</label>
                    </div>

                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground mb-2 block">Regimes Tributários *</label>
                      <div className="flex flex-wrap gap-2">
                        {REGIMES_TRIBUTARIOS.map(regime => (
                          <Badge
                            key={regime.value}
                            variant={formData.regimes.includes(regime.value) ? "default" : "outline"}
                            className={`cursor-pointer transition-all ${
                              formData.regimes.includes(regime.value) 
                                ? "bg-red-500 hover:bg-red-600 text-white border-red-500" 
                                : "hover:bg-red-500/20 border-foreground/30"
                            }`}
                            onClick={() => handleToggleRegime(regime.value)}
                          >
                            {regime.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4 border-t border-foreground/10">
                    <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                    <Button 
                      onClick={handleSaveModelo} 
                      className="bg-red-500 hover:bg-red-600"
                      disabled={isCreating || isUpdating}
                    >
                      {(isCreating || isUpdating) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      {editingModelo ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => setShowModeloForm(true)} 
                      className="bg-red-500 hover:bg-red-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Modelo
                    </Button>
                  </div>
                  
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                    </div>
                  ) : Object.entries(groupedModelos).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum modelo de tarefa cadastrado
                    </div>
                  ) : (
                    Object.entries(groupedModelos).map(([dep, modelos]) => (
                      <div key={dep} className="space-y-2">
                        <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2 pb-1 border-b border-red-500/20">
                          <Briefcase className="w-4 h-4" />
                          {getDepartamentoLabel(dep as DepartamentoTipo)}
                          <span className="text-xs text-muted-foreground font-normal">({modelos.length})</span>
                        </h4>
                        <div className="grid gap-2">
                          {modelos.map(modelo => (
                            <div 
                              key={modelo.id} 
                              className={`p-3 rounded-lg border transition-all ${
                                modelo.ativo !== false 
                                  ? "bg-background/50 border-foreground/10 hover:border-red-500/30" 
                                  : "bg-background/20 border-foreground/5 opacity-60"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-foreground">{modelo.titulo}</span>
                                    {modelo.ativo === false && (
                                      <Badge variant="outline" className="text-xs">Inativo</Badge>
                                    )}
                                  </div>
                                  {modelo.descricao && (
                                    <p className="text-xs text-muted-foreground mb-2">{modelo.descricao}</p>
                                  )}
                                  <div className="flex flex-wrap gap-1">
                                    <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-300">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      {getPeriodicidadeLabel(modelo.periodicidade)}
                                    </Badge>
                                    {modelo.regimes?.map(regime => (
                                      <Badge key={regime} variant="outline" className="text-xs bg-red-500/10 border-red-500/30 text-red-300">
                                        {getRegimeLabel(regime)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditModelo(modelo)}
                                    className="hover:bg-blue-500/20 text-blue-400"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => toggleAtivo({ id: modelo.id, ativo: modelo.ativo === false })}
                                    className="hover:bg-yellow-500/20 text-yellow-400"
                                  >
                                    {modelo.ativo !== false ? (
                                      <AlertTriangle className="w-4 h-4" />
                                    ) : (
                                      <FileText className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => deleteTarefaModelo(modelo.id)}
                                    className="hover:bg-red-500/20 text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            {/* Tab: Regimes Tributários */}
            <TabsContent value="regimes" className="mt-0">
              <div className="space-y-4">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-400 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-semibold text-sm">Regimes do Sistema</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Os regimes tributários são definidos no sistema e vinculados às empresas. 
                    Cada empresa tem seu regime configurado no cadastro, e as tarefas modelo 
                    são filtradas automaticamente com base nesse regime.
                  </p>
                </div>
                
                <div className="grid gap-2">
                  {REGIMES_TRIBUTARIOS.map((regime, index) => (
                    <div 
                      key={regime.value}
                      className="p-3 rounded-lg border border-foreground/10 bg-background/50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{regime.label}</span>
                          <p className="text-xs text-muted-foreground">Código: {regime.value}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">Sistema</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab: Departamentos */}
            <TabsContent value="departamentos" className="mt-0">
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Briefcase className="w-4 h-4" />
                    <span className="font-semibold text-sm">Departamentos Disponíveis</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Os departamentos organizam as tarefas por área de atuação. 
                    Cada tarefa modelo pertence a um departamento específico.
                  </p>
                </div>
                
                <div className="grid gap-2">
                  {DEPARTAMENTOS.map((dep, index) => (
                    <div 
                      key={dep.value}
                      className="p-3 rounded-lg border border-foreground/10 bg-background/50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{dep.label}</span>
                          <p className="text-xs text-muted-foreground">Código: {dep.value}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">Sistema</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
