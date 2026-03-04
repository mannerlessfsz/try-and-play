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
  dispensa_simples_prestador: boolean;
  dispensa_mei: boolean;
  valor_minimo_ir: number;
  valor_minimo_pcc: number;
  observacoes: string | null;
}

export interface DivergenciaRetencao {
  imposto: string;
  valorLido: number;
  valorCalculado: number;
  diferenca: number;
  aliquota: number;
  motivo?: string;
}

export interface ValidacaoNota {
  temRegra: boolean;
  regra: RegraRetencao | null;
  divergencias: DivergenciaRetencao[];
  totalDivergencias: number;
  dispensas: string[];
}

export type RegimePrestador = "simples_nacional" | "mei" | "lucro_presumido" | "lucro_real" | "normal" | null;

export function useRegrasRetencao() {
  return useQuery({
    queryKey: ["regras-retencao-servico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regras_retencao_servico")
        .select("*")
        .eq("ativo", true);
      if (error) throw error;
      return (data as any[]).map(d => ({
        ...d,
        dispensa_simples_prestador: d.dispensa_simples_prestador ?? true,
        dispensa_mei: d.dispensa_mei ?? true,
        valor_minimo_ir: d.valor_minimo_ir ?? 10,
        valor_minimo_pcc: d.valor_minimo_pcc ?? 5000,
      })) as RegraRetencao[];
    },
  });
}

function normalizeCodigoServico(codigo: string | null | undefined): string {
  if (!codigo) return "";
  return codigo.replace(/\s/g, "").replace(/^0+/, "").replace(/\.0+/g, ".");
}

/**
 * Detecta regime do prestador a partir de dados da nota
 */
export function detectRegimePrestador(nota: any): RegimePrestador {
  // Check optante_simples flag (from XML or PDF extraction)
  if (nota.optante_simples === true || nota.prestador?.optante_simples === true) {
    return "simples_nacional";
  }
  // Check regime_tributario from empresa externa
  const regime = nota._regime_prestador || nota.prestador?.regime_tributario;
  if (regime) {
    const r = regime.toLowerCase();
    if (r.includes("mei")) return "mei";
    if (r.includes("simples")) return "simples_nacional";
    if (r.includes("presumido")) return "lucro_presumido";
    if (r.includes("real")) return "lucro_real";
  }
  return "normal";
}

export function validarRetencoes(
  nota: any,
  regras: RegraRetencao[],
  regimePrestador?: RegimePrestador
): ValidacaoNota {
  const codigoServico = nota.servico?.codigo_servico || nota.servico?.codigoServico || "";
  const normalizado = normalizeCodigoServico(codigoServico);
  
  const regra = regras.find(r => {
    const regraCode = normalizeCodigoServico(r.codigo_servico);
    return regraCode === normalizado || normalizado.startsWith(regraCode);
  });

  if (!regra) {
    return { temRegra: false, regra: null, divergencias: [], totalDivergencias: 0, dispensas: [] };
  }

  const valorBase = nota.servico?.valor_servicos || nota.servico?.valorServicos || 0;
  const base = typeof valorBase === "string" ? parseFloat(valorBase) : valorBase;
  
  if (!base || base <= 0) {
    return { temRegra: true, regra, divergencias: [], totalDivergencias: 0, dispensas: [] };
  }

  const regime = regimePrestador || detectRegimePrestador(nota);
  const divergencias: DivergenciaRetencao[] = [];
  const dispensas: string[] = [];
  const TOLERANCIA = 0.50;

  // Simples Nacional: dispensa IR, PIS, COFINS, CSLL (IN RFB 1.234/2012)
  const isSimplesNacional = regime === "simples_nacional";
  const isMEI = regime === "mei";

  if (isSimplesNacional && regra.dispensa_simples_prestador) {
    dispensas.push("Prestador Simples Nacional — IR/PIS/COFINS/CSLL dispensados (IN 1.234/12)");
  }
  if (isMEI && regra.dispensa_mei) {
    dispensas.push("Prestador MEI — Todas as retenções federais dispensadas");
  }

  const verificar = (
    imposto: string,
    aliquota: number,
    deveReter: boolean,
    valorLido: number,
    dispensadoPorRegime: boolean,
    valorMinimo: number
  ) => {
    if (dispensadoPorRegime) {
      // Se dispensado mas valor lido > 0, é divergência (não deveria reter)
      if (valorLido > TOLERANCIA) {
        divergencias.push({
          imposto,
          valorLido,
          valorCalculado: 0,
          diferenca: valorLido,
          aliquota,
          motivo: isMEI 
            ? "MEI — retenção não aplicável" 
            : "Simples Nacional — retenção dispensada (IN 1.234/12)",
        });
      }
      return;
    }

    // Valor mínimo de dispensa (IR: R$10; PIS/COFINS/CSLL: R$5.000 base)
    const valorCalculadoBruto = deveReter ? Math.round(base * aliquota * 100) / 100 : 0;
    
    let valorCalculado = valorCalculadoBruto;
    if (imposto === "IR" && valorCalculadoBruto < valorMinimo) {
      valorCalculado = 0; // Dispensado por valor mínimo
      if (valorLido > TOLERANCIA) {
        divergencias.push({
          imposto,
          valorLido,
          valorCalculado: 0,
          diferenca: valorLido,
          aliquota,
          motivo: `Valor calculado (${valorCalculadoBruto.toFixed(2)}) abaixo do mínimo (R$${valorMinimo.toFixed(2)})`,
        });
      }
      return;
    }
    
    // PIS/COFINS/CSLL: base < R$5.000 dispensa retenção
    if (["PIS", "COFINS", "CSLL"].includes(imposto) && base < (regra.valor_minimo_pcc || 5000)) {
      valorCalculado = 0;
      if (valorLido > TOLERANCIA) {
        divergencias.push({
          imposto,
          valorLido,
          valorCalculado: 0,
          diferenca: valorLido,
          aliquota,
          motivo: `Base (${base.toFixed(2)}) abaixo do mínimo para retenção (R$${(regra.valor_minimo_pcc || 5000).toFixed(2)})`,
        });
      }
      return;
    }

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

  const dispensaFederais = (isSimplesNacional && regra.dispensa_simples_prestador) || (isMEI && regra.dispensa_mei);

  verificar("IR", regra.aliquota_ir, regra.reter_ir, retIR, dispensaFederais, regra.valor_minimo_ir);
  verificar("PIS", regra.aliquota_pis, regra.reter_pis, retPIS, dispensaFederais, 0);
  verificar("COFINS", regra.aliquota_cofins, regra.reter_cofins, retCOFINS, dispensaFederais, 0);
  verificar("CSLL", regra.aliquota_csll, regra.reter_csll, retCSLL, dispensaFederais, 0);
  // INSS: MEI dispensa, Simples Nacional depende (geralmente retém)
  verificar("INSS", regra.aliquota_inss, regra.reter_inss, retINSS, isMEI && regra.dispensa_mei, 0);
  // ISS: não dispensado por Simples (município decide)
  verificar("ISS", regra.aliquota_iss, regra.reter_iss, retISS, false, 0);

  return {
    temRegra: true,
    regra,
    divergencias,
    totalDivergencias: divergencias.length,
    dispensas,
  };
}
