import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload, Globe, FileText, ChevronRight, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  parseNotasSaidaCSV,
  type NotasSaidaParsed,
  type NotaSaidaRow,
} from "@/utils/notasSaidaParser";
import { decodeCsvBuffer } from "@/utils/fileParserUtils";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
  onAvancar: () => void;
}

export function NotasForaEstadoStep({ onAvancar }: Props) {
  const [parsed, setParsed] = useState<NotasSaidaParsed | null>(null);
  const [filtroUF, setFiltroUF] = useState<string>("todos");

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const text = decodeCsvBuffer(buffer);
      const result = parseNotasSaidaCSV(text);

      if (result.notas.length === 0) {
        toast.error("Nenhuma nota encontrada no arquivo.");
        return;
      }

      setParsed(result);
      toast.success(`${result.notas.length} notas importadas com sucesso`);
    } catch (err: any) {
      toast.error("Erro ao processar arquivo: " + err.message);
    }

    e.target.value = "";
  }, []);

  const ufsDisponiveis = useMemo(() => {
    if (!parsed) return [];
    const ufs = new Set(parsed.notas.map(n => n.estado));
    return Array.from(ufs).sort();
  }, [parsed]);

  const notasFiltradas = useMemo(() => {
    if (!parsed) return [];
    if (filtroUF === "todos") return parsed.notas;
    return parsed.notas.filter(n => n.estado === filtroUF);
  }, [parsed, filtroUF]);

  const totalFiltrado = useMemo(
    () => notasFiltradas.reduce((s, n) => s + n.valorContabil, 0),
    [notasFiltradas]
  );

  // Upload state
  if (!parsed) {
    return (
      <div className="glass rounded-xl p-10 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
          <Globe className="w-7 h-7 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h4 className="font-semibold text-sm">Importar Relação de Notas de Saída</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Faça upload do arquivo CSV <strong>"Relação de Notas de Saída"</strong> exportado do sistema Domínio.
            Os números das notas serão automaticamente normalizados para o formato <code className="bg-muted px-1 rounded">NF xxxx</code>.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <Button asChild variant="default" size="sm" className="gap-2">
            <span>
              <Upload className="w-4 h-4" />
              Selecionar arquivo CSV
              <input
                type="file"
                accept=".csv,.xls,.xlsx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </span>
          </Button>
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header info */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
            {parsed.empresa}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-muted/60">
            {parsed.notas.length} nota(s) importada(s)
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            Total: {formatCurrency(parsed.totalValor)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* UF Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={filtroUF} onValueChange={setFiltroUF}>
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">Todos UF</SelectItem>
                {ufsDisponiveis.map(uf => (
                  <SelectItem key={uf} value={uf} className="text-xs">{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Re-upload */}
          <label className="inline-flex">
            <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <span>
                <Upload className="w-3.5 h-3.5" />
                Reimportar
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Filtered summary */}
      {filtroUF !== "todos" && (
        <Badge variant="secondary" className="text-[10px]">
          {notasFiltradas.length} nota(s) para UF {filtroUF} — {formatCurrency(totalFiltrado)}
        </Badge>
      )}

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[9px] px-2 whitespace-nowrap">Emissão</TableHead>
                <TableHead className="text-[9px] px-2 whitespace-nowrap">Estado</TableHead>
                <TableHead className="text-[9px] px-2 whitespace-nowrap">Documento</TableHead>
                <TableHead className="text-[9px] px-2 whitespace-nowrap">Acumulador</TableHead>
                <TableHead className="text-[9px] px-2 text-right whitespace-nowrap">Valor Contábil</TableHead>
                <TableHead className="text-[9px] px-2 whitespace-nowrap">CFOP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notasFiltradas.map((nota, idx) => (
                <TableRow key={`${nota.documentoNumero}-${idx}`}>
                  <TableCell className="text-[11px] px-2 font-mono">{nota.emissao}</TableCell>
                  <TableCell className="text-[11px] px-2">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                      {nota.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[11px] px-2 font-mono font-semibold">{nota.documento}</TableCell>
                  <TableCell className="text-[11px] px-2 font-mono">{nota.acumulador}</TableCell>
                  <TableCell className="text-[11px] px-2 text-right font-mono">{formatCurrency(nota.valorContabil)}</TableCell>
                  <TableCell className="text-[11px] px-2 font-mono">{nota.cfop}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Avançar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <Button onClick={onAvancar} className="gap-2 text-xs">
          Avançar para Processamento
          <ChevronRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}
