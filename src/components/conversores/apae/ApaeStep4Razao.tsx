import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Upload, BookOpen, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import type { RazaoEntry } from "@/utils/razaoParser";
import { parseRazaoFromExcelFile } from "@/utils/razaoParser";
import { toast } from "sonner";

interface Props {
  razaoEntries: RazaoEntry[];
  razaoArquivo: string | null;
  onCarregarRazao: (entries: RazaoEntry[], nomeArquivo: string) => void;
  onRemoverRazao: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function ApaeStep4Razao({ razaoEntries, razaoArquivo, onCarregarRazao, onRemoverRazao, onNext, onBack }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const entries = await parseRazaoFromExcelFile(file);
      if (entries.length === 0) {
        toast.error("Nenhum lançamento encontrado no arquivo do Razão.");
        return;
      }
      onCarregarRazao(entries, file.name);
      toast.success(`${entries.length} lançamentos extraídos do Razão!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar o arquivo do Razão.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Resumo por conta
  const contasUnicas = new Set(razaoEntries.map((e) => e.contaCodigo)).size;
  const totalCredito = razaoEntries.filter((e) => e.credito > 0).length;
  const totalDebito = razaoEntries.filter((e) => e.debito > 0).length;

  // Extrair centros únicos
  const centrosUnicos = new Set<string>();
  for (const entry of razaoEntries) {
    const matches = entry.historico.matchAll(/CENTRO\s+([\d\.]+)/gi);
    for (const m of matches) centrosUnicos.add(m[1]);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-primary" />
            Passo 4: Razão Contábil (Opcional)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Carregue o arquivo do Razão para melhorar a vinculação automática das contas de débito.
            O sistema buscará fornecedores e centros de custo nos lançamentos do Razão.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {razaoEntries.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">
                Carregue o Razão Contábil (XLS/XLSX) para habilitar a busca inteligente de contas.
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Este passo é opcional. Sem o Razão, apenas a busca por nome no Plano de Contas será utilizada.
              </p>
              <label className="cursor-pointer">
                <Button disabled={uploading} asChild>
                  <span>
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Selecionar Arquivo do Razão
                  </span>
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-medium">
                    {razaoArquivo}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={onRemoverRazao}>
                  <Trash2 className="w-4 h-4 mr-1" /> Remover
                </Button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">
                  {razaoEntries.length} lançamentos
                </Badge>
                <Badge variant="secondary">
                  {contasUnicas} contas
                </Badge>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                  {totalDebito} débitos
                </Badge>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                  {totalCredito} créditos
                </Badge>
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                  {centrosUnicos.size} centros de custo
                </Badge>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p>🔍 <strong>Busca no Razão habilitada.</strong> Durante o processamento, quando um fornecedor não for encontrado no Plano de Contas:</p>
                <p className="pl-4">1. O sistema buscará o nome do fornecedor nos históricos do Razão</p>
                <p className="pl-4">2. Se não encontrar, buscará pelo código do Centro de Custo</p>
              </div>

              <label className="cursor-pointer inline-block">
                <Button variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                    Substituir Arquivo
                  </span>
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <Button onClick={onNext}>
          Próximo: Processamento <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
