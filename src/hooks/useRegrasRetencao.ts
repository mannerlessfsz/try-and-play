import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RegraRetencao {
  id: string;
  codigo_servico: string;
  descricao_servico: string;
  aliquota_ir: number;
  aliquota_pis: number;
  aliquota_cofins: number;
  aliquota_csll: number;
  aliquota_inss: number;
  aliquota_iss: number;
  reter_ir: boolean;
  reter_pis: boolean;
  reter_cofins: boolean;
  reter_csll: boolean;
  reter_inss: boolean;
  reter_iss: boolean;
  valor_minimo_retencao: number;
}

export interface DivergenciaRetencao {
  imposto: string;
  valorLido: number;
  valorCalculado: number;
  diferenca: number;
  aliquota: number;
}

export interface ValidacaoNota {
  temRegra: boolean;
  regra: RegraRetencao | null;
  divergencias: DivergenciaRetencao[];
  totalDivergencias: number;
}

export function useRegrasRetencao() {
  return useQuery({
    queryKey: ["regras-retencao-servico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regras_retencao_servico")
        .select("*")
        .eq("ativo", true);
      if (error) throw error;
      return data as RegraRetencao[];
    },
  });
}

function normalizeCodigoServico(codigo: string | null | undefined): string {
  if (!codigo) return "";
  // Remove leading zeros from each part, e.g. "01.02" -> "1.02", "17.05" stays
  return codigo.replace(/\s/g, "").replace(/^0+/, "").replace(/\.0+/g, ".");
}

export function validarRetencoes(
  nota: any,
  regras: RegraRetencao[]
): ValidacaoNota {
  const codigoServico = nota.servico?.codigo_servico || nota.servico?.codigoServico || "";
  const normalizado = normalizeCodigoServico(codigoServico);
  
  const regra = regras.find(r => {
    const regraCode = normalizeCodigoServico(r.codigo_servico);
    return regraCode === normalizado || normalizado.startsWith(regraCode);
  });

  if (!regra) {
    return { temRegra: false, regra: null, divergencias: [], totalDivergencias: 0 };
  }

  const valorBase = nota.servico?.valor_servicos || nota.servico?.valorServicos || 0;
  const base = typeof valorBase === "string" ? parseFloat(valorBase) : valorBase;
  
  if (!base || base <= 0) {
    return { temRegra: true, regra, divergencias: [], totalDivergencias: 0 };
  }

  const divergencias: DivergenciaRetencao[] = [];
  const TOLERANCIA = 0.50; // R$0.50 de tolerância para arredondamentos

  const verificar = (
    imposto: string,
    aliquota: number,
    deveReter: boolean,
    valorLido: number
  ) => {
    const valorCalculado = deveReter ? Math.round(base * aliquota * 100) / 100 : 0;
    const diferenca = Math.abs(valorLido - valorCalculado);
    
    if (diferenca > TOLERANCIA) {
      divergencias.push({ imposto, valorLido, valorCalculado, diferenca, aliquota });
    }
  };

  const retIR = nota.retencoes?.ir || 0;
  const retPIS = nota.retencoes?.pis || 0;
  const retCOFINS = nota.retencoes?.cofins || 0;
  const retCSLL = nota.retencoes?.csll || 0;
  const retINSS = nota.retencoes?.inss || 0;
  const retISS = nota.retencoes?.iss || 0;

  verificar("IR", regra.aliquota_ir, regra.reter_ir, retIR);
  verificar("PIS", regra.aliquota_pis, regra.reter_pis, retPIS);
  verificar("COFINS", regra.aliquota_cofins, regra.reter_cofins, retCOFINS);
  verificar("CSLL", regra.aliquota_csll, regra.reter_csll, retCSLL);
  verificar("INSS", regra.aliquota_inss, regra.reter_inss, retINSS);
  verificar("ISS", regra.aliquota_iss, regra.reter_iss, retISS);

  return {
    temRegra: true,
    regra,
    divergencias,
    totalDivergencias: divergencias.length,
  };
}
