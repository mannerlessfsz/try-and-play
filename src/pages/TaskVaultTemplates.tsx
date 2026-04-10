import { useState, useMemo, useRef } from "react";
import { ModulePageWrapper } from "@/components/ModulePageWrapper";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trash2, Loader2, FileText, ArrowLeft, Search,
  Tag, Upload, X, Eye, EyeOff, CheckCircle2, Edit,
  FileUp, Settings2, AlertTriangle
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

const DEPARTAMENTOS = [
  { value: "fiscal", label: "Fiscal" },
  { value: "contabil", label: "Contábil" },
  { value: "departamento_pessoal", label: "Depto. Pessoal" },
];

const emptyForm: DocumentoModeloForm = {
  nome: "",
  tipo_documento: "obrigacao",
  palavras_chave: [],
  descricao: "",
  departamento: "",
  ativo: true,
};

export default function TaskVaultTemplates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    modelos, isLoading,
    createModelo, updateModelo, deleteModelo,
    isCreating, isUpdating, isDeleting,
  } = useDocumentoModelos();

  const [showDialog, setShowDialog] = useState(false);
  const [editingModelo, setEditingModelo] = useState<DocumentoModelo | null>(null);
  const [form, setForm] = useState<DocumentoModeloForm>(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [newKeyword, setNewKeyword] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered list
  const filtered = useMemo(() => {
    return (modelos || []).filter(m => {
      const matchSearch = !searchTerm ||
        m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.palavras_chave?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchDept = filterDept === "all" || m.departamento === filterDept;
      return matchSearch && matchDept;
    });
  }, [modelos, searchTerm, filterDept]);

  const handleOpenNew = () => {
    setEditingModelo(null);
    setForm(emptyForm);
    setSelectedFile(null);
    setShowDialog(true);
  };

  const handleOpenEdit = (modelo: DocumentoModelo) => {
    setEditingModelo(modelo);
    setForm({
      nome: modelo.nome,
      tipo_documento: modelo.tipo_documento,
      palavras_chave: modelo.palavras_chave || [],
      descricao: modelo.descricao || "",
      departamento: modelo.departamento || "",
      ativo: modelo.ativo,
    });
    setSelectedFile(null);
    setShowDialog(true);
  };

  const handleAddKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !form.palavras_chave.includes(kw)) {
      setForm(prev => ({ ...prev, palavras_chave: [...prev.palavras_chave, kw] }));
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setForm(prev => ({ ...prev, palavras_chave: prev.palavras_chave.filter(k => k !== kw) }));
  };

  const handleSave = () => {
    if (!form.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (form.palavras_chave.length === 0) {
      toast({ title: "Adicione ao menos uma palavra-chave", variant: "destructive" });
      return;
    }

    if (editingModelo) {
      updateModelo({ id: editingModelo.id, ...form }, {
        onSuccess: () => setShowDialog(false),
      });
    } else {
      createModelo(form, {
        onSuccess: () => setShowDialog(false),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Excluir este template?")) {
      deleteModelo(id);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Extract keywords from filename
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
      const words = nameWithoutExt.split(/[-_\s]+/).filter(w => w.length > 2);
      if (words.length > 0 && form.palavras_chave.length === 0) {
        setForm(prev => ({ ...prev, palavras_chave: words }));
      }
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
          <Button onClick={handleOpenNew} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" />
            Novo Template
          </Button>
        </div>

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
            { label: "Total", value: modelos?.length || 0, color: "text-primary" },
            { label: "Ativos", value: modelos?.filter(m => m.ativo).length || 0, color: "text-emerald-500" },
            { label: "Inativos", value: modelos?.filter(m => !m.ativo).length || 0, color: "text-muted-foreground" },
            { label: "Palavras-chave", value: modelos?.reduce((acc, m) => acc + (m.palavras_chave?.length || 0), 0) || 0, color: "text-amber-500" },
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
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum template encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie templates para validar automaticamente os documentos enviados nas tarefas
              </p>
              <Button onClick={handleOpenNew} className="gap-2">
                <Plus className="w-4 h-4" /> Criar Template
              </Button>
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
                              {TIPOS_DOCUMENTO.find(t => t.value === modelo.tipo_documento)?.label || modelo.tipo_documento}
                            </Badge>
                          </div>
                          {modelo.descricao && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{modelo.descricao}</p>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                            {(modelo.palavras_chave || []).map(kw => (
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
                            disabled={isDeleting}
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
              {/* Nome */}
              <div className="space-y-2">
                <Label>Nome do Template *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: DARF - Imposto de Renda"
                  className="rounded-xl"
                />
              </div>

              {/* Tipo + Departamento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.tipo_documento}
                    onValueChange={(v) => setForm(prev => ({ ...prev, tipo_documento: v }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
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
                    onValueChange={(v) => setForm(prev => ({ ...prev, departamento: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {DEPARTAMENTOS.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Descrição */}
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
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
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
                {form.palavras_chave.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.palavras_chave.map(kw => (
                      <Badge key={kw} variant="secondary" className="gap-1 font-mono text-xs">
                        {kw}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
                          onClick={() => handleRemoveKeyword(kw)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
                {form.palavras_chave.length === 0 && (
                  <div className="flex items-center gap-2 text-amber-500 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Adicione pelo menos uma palavra-chave
                  </div>
                )}
              </div>

              <Separator />

              {/* Ativo */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Template Ativo</Label>
                  <p className="text-xs text-muted-foreground">Templates inativos não serão usados na validação</p>
                </div>
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm(prev => ({ ...prev, ativo: v }))}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isCreating || isUpdating}
                className="gap-2 rounded-xl"
              >
                {(isCreating || isUpdating) && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle2 className="w-4 h-4" />
                {editingModelo ? "Salvar Alterações" : "Criar Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ModulePageWrapper>
  );
}
