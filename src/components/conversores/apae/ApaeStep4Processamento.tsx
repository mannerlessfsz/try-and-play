import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings2, ArrowRight, ArrowLeft, Loader2, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ApaeRelatorioLinha, ApaeResultado, ApaePlanoContas } from "@/hooks/useApaeSessoes";

/** Remove acentos e converte para maiúsculas */
function toUpperNoAccents(str: string): string {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().trim();
}

interface Props {
  linhas: ApaeRelatorioLinha[];
  planoContas: ApaePlanoContas[];
  resultados: ApaeResultado[];
  onProcessar: (resultados: Omit<ApaeResultado, "id" | "sessao_id" | "created_at">[]) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

export function ApaeStep4Processamento({ linhas, planoContas, resultados, onProcessar, onNext, onBack, saving }: Props) {
  const [processing, setProcessing] = useState(false);

  // Agrupa linhas em pares
  const pares = (() => {
    const map: Record<number, { dados?: ApaeRelatorioLinha; historico?: ApaeRelatorioLinha }> = {};
    linhas.forEach((l) => {
      if (l.par_id == null) return;
      if (!map[l.par_id]) map[l.par_id] = {};
      if (l.tipo_linha === "dados") map[l.par_id].dados = l;
      else map[l.par_id].historico = l;
    });
    return Object.entries(map)
      .map(([parId, pair]) => ({ parId: Number(parId), ...pair }))
      .sort((a, b) => a.parId - b.parId);
  })();

  const handleProcessar = async () => {
    setProcessing(true);
    try {
      const resultadosProcessados: Omit<ApaeResultado, "id" | "sessao_id" | "created_at">[] = [];

      for (const par of pares) {
        const d = par.dados;
        const h = par.historico;
        if (!d) continue;

        const bOdd = d.col_b || "";
        const bEven = h?.col_b || "";
        const cEven = h?.col_c || "";
        const dOdd = d.col_d || "";
        const eEven = h?.col_e || "";

        // Histórico concatenado
        const parts: string[] = [bOdd, bEven];
        if (eEven) parts.push(eEven);
        parts.push(`(CENTRO ${dOdd})`);
        parts.push(`PAGO EM ${cEven}`);
        const historicoConcatenado = toUpperNoAccents(parts.join(" "));

        // Tentar vincular conta débito ao plano de contas
        const contaDebitoDesc = d.col_c || "";
        const contaMatch = planoContas.find(
          (c) => c.descricao.toLowerCase() === contaDebitoDesc.toLowerCase() || c.codigo === contaDebitoDesc
        );

        resultadosProcessados.push({
          par_id: par.parId,
          fornecedor: bOdd,
          conta_debito: contaDebitoDesc,
          conta_debito_codigo: contaMatch?.codigo || null,
          centro_custo: dOdd,
          n_doc: d.col_e || null,
          vencimento: d.col_f || null,
          valor: d.col_g || null,
          data_pagto: d.col_h || null,
          valor_pago: d.col_i || null,
          historico_original: bEven,
          historico_concatenado: historicoConcatenado,
          conta_credito_codigo: null,
          status: contaMatch ? "vinculado" : "pendente",
        });
      }

      await onProcessar(resultadosProcessados);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="w-5 h-5 text-primary" />
            Passo 4: Processamento
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Processa o relatório gerando o histórico concatenado e vinculando ao plano de contas
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary">{pares.length} par(es) para processar</Badge>
            <Badge variant="secondary">{planoContas.length} contas no plano</Badge>
            {resultados.length > 0 && (
              <>
                <Badge className="bg-green-600">{resultados.filter((r) => r.status === "vinculado").length} vinculado(s)</Badge>
                <Badge variant="destructive">{resultados.filter((r) => r.status === "pendente").length} pendente(s)</Badge>
              </>
            )}
          </div>

          {resultados.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <Settings2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">
                Clique em "Processar" para gerar os lançamentos
              </p>
              <Button onClick={handleProcessar} disabled={processing || saving || pares.length === 0}>
                {processing || saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                Processar Relatório
              </Button>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-foreground font-medium mb-2">
                ✅ {resultados.length} lançamento(s) processado(s)
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Avance para o passo de conferência ou reprocesse
              </p>
              <Button variant="outline" size="sm" onClick={handleProcessar} disabled={processing || saving}>
                {processing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Reprocessar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <Button onClick={onNext} disabled={resultados.length === 0}>
          Próximo: Conferência <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
