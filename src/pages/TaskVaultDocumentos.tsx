import { useState, useMemo, useRef } from "react";
import { ModulePageWrapper } from "@/components/ModulePageWrapper";
import { useNavigate } from "react-router-dom";
import {
  Plus, Edit, Trash2, Loader2, FileText, ArrowLeft, Search,
  Tag, Upload, X, ExternalLink, Eye, EyeOff, CheckCircle2
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
import { motion, AnimatePresence } from "framer-motion";
import {
  useDocumentoModelos,
  DocumentoModelo,
  DocumentoModeloForm,
  TIPOS_DOCUMENTO,
} from "@/hooks/useDocumentoModelos";

const DEPARTAMENTOS = [
  { value: "fiscal", label: "Fiscal" },
  { value: "contabil", label: "Contábil" },
  { value: "departamento_pessoal", label: "Depto. Pessoal" },
];

const emptyForm: DocumentoModeloForm = {
  nome: "",
  descricao: "",
  palavrasChave: [],
  tipoDocumento: "geral",
  departamento: null,
  empresaId: null,
};

export default function TaskVaultDocumentos() {
  const navigate = useNavigate();
  const { modelos, loading, addModelo, updateModelo, deleteModelo, uploadArquivoModelo } = useDocumentoModelos();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DocumentoModeloForm>({ ...emptyForm });
  const [palavraInput, setPalavraInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterDepto, setFilterDepto] = useState<string>("todos");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let list = modelos;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(
        (m) =>
          m.nome.toLowerCase().includes(s) ||
          m.descricao.toLowerCase().includes(s) ||
          m.palavrasChave.some((p) => p.toLowerCase().includes(s))
      );
    }
    if (filterTipo !== "todos") list = list.filter((m) => m.tipoDocumento === filterTipo);
    if (filterDepto !== "todos") list = list.filter((m) => m.departamento === filterDepto);
    return list;
  }, [modelos, searchTerm, filterTipo, filterDepto]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setPalavraInput("");
    setShowModal(true);
  };

  const openEdit = (m: DocumentoModelo) => {
    setEditingId(m.id);
    setForm({
      nome: m.nome,
      descricao: m.descricao,
      palavrasChave: [...m.palavrasChave],
      tipoDocumento: m.tipoDocumento,
      departamento: m.departamento,
      empresaId: m.empresaId,
    });
    setPalavraInput("");
    setShowModal(true);
  };

  const handleAddPalavra = () => {
    const word = palavraInput.trim().toLowerCase();
    if (word && !form.palavrasChave.includes(word)) {
      setForm((f) => ({ ...f, palavrasChave: [...f.palavrasChave, word] }));
    }
    setPalavraInput("");
  };

  const handleRemovePalavra = (word: string) => {
    setForm((f) => ({ ...f, palavrasChave: f.palavrasChave.filter((p) => p !== word) }));
  };

  const handleSave = async () => {
    if (!form.nome.trim()) return;
    let ok: boolean;
    if (editingId) {
      ok = (await updateModelo(editingId, form)) ?? false;
    } else {
      ok = await addModelo(form);
    }
    if (ok) setShowModal(false);
  };

  const handleFileUpload = async (modeloId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadArquivoModelo(modeloId, file);
  };

  if (loading) {
    return (
      <ModulePageWrapper accentHsl="var(--module-red)">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      </ModulePageWrapper>
    );
  }

  return (
    <ModulePageWrapper accentHsl="var(--module-red)">
      <div className="max-w-6xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/taskvault")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Modelos de Documentos</h1>
              <p className="text-sm text-muted-foreground">
                Cadastre templates e palavras-chave para validação automática
              </p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-red-500 hover:bg-red-600">
            <Plus className="w-4 h-4 mr-2" /> Novo Modelo
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, descrição ou palavra-chave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TIPOS_DOCUMENTO.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDepto} onValueChange={setFilterDepto}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {DEPARTAMENTOS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((modelo, i) => (
              <motion.div
                key={modelo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className={`border-foreground/10 hover:border-red-500/30 transition-all ${!modelo.ativo ? "opacity-50" : ""}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-red-400" />
                        <h3 className="font-semibold text-foreground text-sm">{modelo.nome}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(modelo)} className="p-1.5 hover:bg-muted rounded transition-colors">
                          <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => updateModelo(modelo.id, { ativo: !modelo.ativo })} className="p-1.5 hover:bg-muted rounded transition-colors">
                          {modelo.ativo ? <Eye className="w-3.5 h-3.5 text-green-400" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                        <button onClick={() => deleteModelo(modelo.id)} className="p-1.5 hover:bg-red-500/20 rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>

                    {modelo.descricao && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{modelo.descricao}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-300">
                        {TIPOS_DOCUMENTO.find((t) => t.value === modelo.tipoDocumento)?.label || modelo.tipoDocumento}
                      </Badge>
                      {modelo.departamento && (
                        <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-300">
                          {DEPARTAMENTOS.find((d) => d.value === modelo.departamento)?.label || modelo.departamento}
                        </Badge>
                      )}
                    </div>

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1">
                      {modelo.palavrasChave.slice(0, 6).map((p) => (
                        <span key={p} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-foreground/5 rounded text-[10px] text-muted-foreground">
                          <Tag className="w-2.5 h-2.5" />
                          {p}
                        </span>
                      ))}
                      {modelo.palavrasChave.length > 6 && (
                        <span className="text-[10px] text-muted-foreground">+{modelo.palavrasChave.length - 6}</span>
                      )}
                    </div>

                    {/* File */}
                    {modelo.arquivoModeloUrl ? (
                      <a
                        href={modelo.arquivoModeloUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-background/50 rounded border border-foreground/10 text-xs hover:border-red-500/30 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-400" />
                        <span className="truncate flex-1">{modelo.arquivoModeloNome}</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </a>
                    ) : (
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs border-dashed"
                          onClick={() => {
                            const inp = document.getElementById(`file-${modelo.id}`) as HTMLInputElement;
                            inp?.click();
                          }}
                        >
                          <Upload className="w-3 h-3 mr-1" /> Enviar arquivo modelo
                        </Button>
                        <input
                          id={`file-${modelo.id}`}
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => handleFileUpload(modelo.id, e)}
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {modelo.palavrasChave.length} palavra(s)-chave configurada(s)
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum modelo de documento cadastrado</p>
            <Button onClick={openCreate} className="mt-4 bg-red-500 hover:bg-red-600">
              <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Modelo
            </Button>
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Modelo" : "Novo Modelo de Documento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: DAS - Simples Nacional"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o modelo de documento..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Documento</Label>
                <Select value={form.tipoDocumento} onValueChange={(v) => setForm((f) => ({ ...f, tipoDocumento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departamento</Label>
                <Select value={form.departamento || "nenhum"} onValueChange={(v) => setForm((f) => ({ ...f, departamento: v === "nenhum" ? null : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {DEPARTAMENTOS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Keywords */}
            <div>
              <Label>Palavras-chave para validação</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={palavraInput}
                  onChange={(e) => setPalavraInput(e.target.value)}
                  placeholder="Digite uma palavra-chave..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPalavra();
                    }
                  }}
                />
                <Button variant="outline" size="sm" onClick={handleAddPalavra} disabled={!palavraInput.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {form.palavrasChave.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.palavrasChave.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs gap-1">
                      <Tag className="w-3 h-3" />
                      {p}
                      <button onClick={() => handleRemovePalavra(p)} className="ml-1 hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                Essas palavras serão buscadas no texto extraído do PDF para validação
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-red-500 hover:bg-red-600" disabled={!form.nome.trim()}>
                {editingId ? "Salvar" : "Criar Modelo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ModulePageWrapper>
  );
}
