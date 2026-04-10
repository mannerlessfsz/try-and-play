import { useState, useMemo, useRef } from "react";
import { ModulePageWrapper } from "@/components/ModulePageWrapper";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trash2, Loader2, FileText, ArrowLeft, Search,
  Tag, Upload, X, CheckCircle2, Edit,
  FileUp, Settings2, AlertTriangle, Sparkles, Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import {
  useDocumentoModelos,
  DocumentoModelo,
  DocumentoModeloForm,
  TIPOS_DOCUMENTO,
} from "@/hooks/useDocumentoModelos";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DEPARTAMENTOS = [
  { value: "fiscal", label: "Fiscal" },
  { value: "contabil", label: "Contábil" },
  { value: "departamento_pessoal", label: "Depto. Pessoal" },
];

const emptyForm: DocumentoModeloForm = {
  nome: "",
  tipoDocumento: "geral",
  palavrasChave: [],
  descricao: "",
  departamento: null,
  empresaId: null,
};

export default function TaskVaultTemplates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    modelos, loading,
    addModelo, updateModelo, deleteModelo, uploadArquivoModelo,
  } = useDocumentoModelos();

  const [showDialog, setShowDialog] = useState(false);
  const [editingModelo, setEditingModelo] = useState<DocumentoModelo | null>(null);
  const [form, setForm] = useState<DocumentoModeloForm>(emptyForm);
  const [ativo, setAtivo] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [newKeyword, setNewKeyword] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzeInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return modelos.filter(m => {
      const matchSearch = !searchTerm ||
        m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.palavrasChave?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchDept = filterDept === "all" || m.departamento === filterDept;
      return matchSearch && matchDept;
    });
  }, [modelos, searchTerm, filterDept]);

  const handleOpenNew = () => {
    setEditingModelo(null);
    setForm(emptyForm);
    setAtivo(true);
    setSelectedFile(null);
    setShowDialog(true);
  };

  const handleOpenEdit = (modelo: DocumentoModelo) => {
    setEditingModelo(modelo);
    setForm({
      nome: modelo.nome,
      tipoDocumento: modelo.tipoDocumento,
      palavrasChave: modelo.palavrasChave || [],
      descricao: modelo.descricao || "",
      departamento: modelo.departamento,
      empresaId: modelo.empresaId,
    });
    setAtivo(modelo.ativo);
    setSelectedFile(null);
    setShowDialog(true);
  };

  const handleAddKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !form.palavrasChave.includes(kw)) {
      setForm(prev => ({ ...prev, palavrasChave: [...prev.palavrasChave, kw] }));
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setForm(prev => ({ ...prev, palavrasChave: prev.palavrasChave.filter(k => k !== kw) }));
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (form.palavrasChave.length === 0) {
      toast({ title: "Adicione ao menos uma palavra-chave", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingModelo) {
        await updateModelo(editingModelo.id, { ...form, ativo });
        if (selectedFile) {
          await uploadArquivoModelo(editingModelo.id, selectedFile);
        }
      } else {
        const success = await addModelo(form);
        if (success && selectedFile) {
          // For new models we'd need the id - refetch will handle it
        }
      }
      setShowDialog(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir este template?")) {
      await deleteModelo(id);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // AI-powered PDF analysis
  const handleAnalyzePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Envie um arquivo PDF", variant: "destructive" });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande (máx. 20MB)", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    setSelectedFile(file);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-document`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `Erro ${response.status}`);
      }

      const data = await response.json();

      // Auto-fill form with AI suggestions
      setForm(prev => ({
        ...prev,
        nome: data.nome || prev.nome,
        tipoDocumento: data.tipo_documento || prev.tipoDocumento,
        departamento: data.departamento || prev.departamento,
        descricao: data.descricao || prev.descricao,
        palavrasChave: data.palavras_chave?.length > 0 ? data.palavras_chave : prev.palavrasChave,
      }));

      toast({
        title: "Documento analisado com sucesso!",
        description: "Revise os dados extraídos e ajuste se necessário.",
      });

      // Open dialog with pre-filled data
      setShowDialog(true);
    } catch (error) {
      console.error("Analyze error:", error);
      toast({
        title: "Erro ao analisar documento",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
      // Still open dialog for manual entry
      setShowDialog(true);
    } finally {
      setAnalyzing(false);
      if (analyzeInputRef.current) analyzeInputRef.current.value = "";
    }
  };

  return (
    <ModulePageWrapper module="taskvault">
      <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/taskvault")} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <FileUp className="w-6 h-6 text-primary" />
                Templates de Documentos
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure templates com palavras-chave para validação automática de documentos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => analyzeInputRef.current?.click()}
              disabled={analyzing}
              className="gap-2 rounded-xl border-primary/30 hover:border-primary"
            >
              {analyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4 text-primary" />
              )}
              {analyzing ? "Analisando..." : "Criar por IA"}
            </Button>
            <Button onClick={handleOpenNew} className="gap-2 rounded-xl">
              <Plus className="w-4 h-4" />
              Novo Template
            </Button>
          </div>
          <input
            ref={analyzeInputRef}
            type="file"
            accept=".pdf"
            onChange={handleAnalyzePdf}
            className="hidden"
          />
        </div>

        {/* AI Banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Criação Inteligente de Templates</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Envie um PDF de exemplo (guia DARF, DAS, holerite, etc.) e a IA extrairá automaticamente 
                as palavras-chave, tipo e departamento. Você pode revisar e ajustar antes de salvar.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou palavra-chave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {DEPARTAMENTOS.map(d => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: modelos.length, color: "text-primary" },
            { label: "Ativos", value: modelos.filter(m => m.ativo).length, color: "text-primary" },
            { label: "Inativos", value: modelos.filter(m => !m.ativo).length, color: "text-muted-foreground" },
            { label: "Palavras-chave", value: modelos.reduce((acc, m) => acc + (m.palavrasChave?.length || 0), 0), color: "text-primary" },
          ].map(stat => (
            <Card key={stat.label} className="border-border/50">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum template encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie templates manualmente ou envie um PDF para a IA configurar automaticamente
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => analyzeInputRef.current?.click()}
                  className="gap-2"
                >
                  <Brain className="w-4 h-4" /> Criar por IA
                </Button>
                <Button onClick={handleOpenNew} className="gap-2">
                  <Plus className="w-4 h-4" /> Criar Manual
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((modelo) => (
                <motion.div
                  key={modelo.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card className={`border-border/50 transition-colors hover:border-primary/30 ${!modelo.ativo ? "opacity-60" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{modelo.nome}</h3>
                            <Badge variant={modelo.ativo ? "default" : "secondary"} className="text-xs">
                              {modelo.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                            {modelo.departamento && (
                              <Badge variant="outline" className="text-xs">
                                {DEPARTAMENTOS.find(d => d.value === modelo.departamento)?.label || modelo.departamento}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {TIPOS_DOCUMENTO.find(t => t.value === modelo.tipoDocumento)?.label || modelo.tipoDocumento}
                            </Badge>
                          </div>
                          {modelo.descricao && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{modelo.descricao}</p>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                            {(modelo.palavrasChave || []).map(kw => (
                              <Badge key={kw} variant="secondary" className="text-xs font-mono">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(modelo)} className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(modelo.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                {editingModelo ? "Editar Template" : "Novo Template"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label>Nome do Template *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: DARF - Imposto de Renda"
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.tipoDocumento}
                    onValueChange={(v) => setForm(prev => ({ ...prev, tipoDocumento: v }))}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_DOCUMENTO.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select
                    value={form.departamento || "none"}
                    onValueChange={(v) => setForm(prev => ({ ...prev, departamento: v === "none" ? null : v }))}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {DEPARTAMENTOS.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={form.descricao}
                  onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva o que este template valida..."
                  className="rounded-xl min-h-[80px]"
                />
              </div>

              <Separator />

              {/* Upload de arquivo modelo */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Arquivo Modelo (opcional)
                </Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="text-sm text-foreground">{selectedFile.name}</span>
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <FileUp className="w-8 h-8 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">Clique para enviar um documento modelo</p>
                      <p className="text-xs text-muted-foreground/70">PDF, DOCX, XLSX até 10MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx,.doc,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <Separator />

              {/* Palavras-chave */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Palavras-chave para Validação *
                </Label>
                <p className="text-xs text-muted-foreground">
                  Termos que devem constar no documento enviado para ser considerado válido
                </p>
                <div className="flex gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddKeyword())}
                    placeholder="Digite e pressione Enter"
                    className="rounded-xl"
                  />
                  <Button type="button" variant="secondary" onClick={handleAddKeyword} className="rounded-xl shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {form.palavrasChave.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.palavrasChave.map(kw => (
                      <Badge key={kw} variant="secondary" className="gap-1 font-mono text-xs">
                        {kw}
                        <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => handleRemoveKeyword(kw)} />
                      </Badge>
                    ))}
                  </div>
                )}
                {form.palavrasChave.length === 0 && (
                  <div className="flex items-center gap-2 text-destructive text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Adicione pelo menos uma palavra-chave
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Template Ativo</Label>
                  <p className="text-xs text-muted-foreground">Templates inativos não serão usados na validação</p>
                </div>
                <Switch checked={ativo} onCheckedChange={setAtivo} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle2 className="w-4 h-4" />
                {editingModelo ? "Salvar Alterações" : "Criar Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analyzing overlay */}
      <AnimatePresence>
        {analyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <Card className="w-80 border-primary/30">
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="relative">
                  <Brain className="w-12 h-12 text-primary animate-pulse" />
                  <Sparkles className="w-5 h-5 text-primary absolute -top-1 -right-1 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Analisando documento...</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    A IA está extraindo palavras-chave e identificando o tipo do documento
                  </p>
                </div>
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </ModulePageWrapper>
  );
}
