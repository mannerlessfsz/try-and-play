import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================================
// MOTOR MATEMÁTICO MATRICIAL DE EQUIVALÊNCIA PATRIMONIAL
// Implementação do pseudocódigo: (I - P)^-1 * P * L
// ============================================================================

/** Inversão de matriz NxN via eliminação de Gauss-Jordan */
function invertMatrix(matrix: number[][]): number[][] | null {
  const N = matrix.length;
  // Augmented matrix [M | I]
  const aug: number[][] = matrix.map((row, i) => {
    const identity = new Array(N).fill(0);
    identity[i] = 1;
    return [...row, ...identity];
  });

  for (let col = 0; col < N; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < N; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) return null; // Singular matrix

    // Scale pivot row
    for (let j = 0; j < 2 * N; j++) aug[col][j] /= pivot;

    // Eliminate column
    for (let row = 0; row < N; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * N; j++) aug[row][j] -= factor * aug[col][j];
    }
  }

  return aug.map((row) => row.slice(N));
}

/** Multiplica matriz por vetor */
function matVecMul(mat: number[][], vec: number[]): number[] {
  return mat.map((row) => row.reduce((sum, val, j) => sum + val * vec[j], 0));
}

/** Multiplica matriz por matriz */
function matMul(A: number[][], B: number[][]): number[][] {
  const N = A.length;
  const result: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++)
      for (let k = 0; k < N; k++)
        result[i][j] += A[i][k] * B[k][j];
  return result;
}

interface ProcessarRequest {
  grupo_id: string;
  periodo: string; // YYYY-MM
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { grupo_id, periodo } = (await req.json()) as ProcessarRequest;

    if (!grupo_id || !periodo) {
      return new Response(JSON.stringify({ error: "grupo_id e periodo são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Buscar empresas ativas do grupo
    const { data: empresas, error: empErr } = await supabase
      .from("grupo_investidas")
      .select("id, nome, cnpj, percentual_participacao, tipo_empresa")
      .eq("grupo_id", grupo_id)
      .eq("ativa", true)
      .order("nome");

    if (empErr || !empresas || empresas.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma empresa ativa no grupo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const N = empresas.length;
    const empresaIds = empresas.map((e: any) => e.id);
    const empresaIndex: Record<string, number> = {};
    empresas.forEach((e: any, i: number) => (empresaIndex[e.id] = i));

    // 2. Buscar participações cruzadas válidas no período
    const { data: participacoes } = await supabase
      .from("eq_participacoes")
      .select("id_investidora, id_investida, percentual")
      .eq("grupo_id", grupo_id)
      .lte("data_inicio", `${periodo}-28`)
      .or(`data_fim.is.null,data_fim.gte.${periodo}-01`);

    // 3. Construir matriz P (NxN)
    const P: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
    if (participacoes) {
      for (const p of participacoes) {
        const i = empresaIndex[p.id_investidora];
        const j = empresaIndex[p.id_investida];
        if (i !== undefined && j !== undefined) {
          P[i][j] = (p.percentual as number) / 100;
        }
      }
    }

    // 4. Buscar lucros pré-equivalência
    const { data: resultados } = await supabase
      .from("eq_resultado_periodo")
      .select("id_empresa, lucro_pre_equivalencia, dividendos_declarados")
      .eq("periodo", periodo)
      .in("id_empresa", empresaIds);

    const L: number[] = new Array(N).fill(0);
    const dividendos: number[] = new Array(N).fill(0);
    if (resultados) {
      for (const r of resultados) {
        const idx = empresaIndex[r.id_empresa];
        if (idx !== undefined) {
          L[idx] = Number(r.lucro_pre_equivalencia) || 0;
          dividendos[idx] = Number(r.dividendos_declarados) || 0;
        }
      }
    }

    // 5. Buscar PL de abertura (snapshot do período anterior ou manual)
    const { data: snapshots } = await supabase
      .from("eq_pl_snapshot")
      .select("id_empresa, pl_fechamento")
      .eq("periodo", periodoAnterior(periodo))
      .in("id_empresa", empresaIds);

    const plAbertura: number[] = new Array(N).fill(0);
    if (snapshots) {
      for (const s of snapshots) {
        const idx = empresaIndex[s.id_empresa];
        if (idx !== undefined) plAbertura[idx] = Number(s.pl_fechamento) || 0;
      }
    }

    // 6. Calcular M = I - P
    const I: number[][] = Array.from({ length: N }, (_, i) => {
      const row = new Array(N).fill(0);
      row[i] = 1;
      return row;
    });
    const M: number[][] = I.map((row, i) => row.map((val, j) => val - P[i][j]));

    // 7. Verificar determinante (invertibilidade)
    const Minv = invertMatrix(M);
    if (!Minv) {
      return new Response(
        JSON.stringify({ error: "Sistema não invertível (I-P). Verifique participações cruzadas com 100%." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. R = Minv * (P * L)
    const PL = matVecMul(P, L);
    const R = matVecMul(Minv, PL);

    // 9. PL fechamento = PL abertura + L + R - dividendos
    const plFechamento = plAbertura.map((pl, i) => pl + L[i] + R[i] - dividendos[i]);

    // 10. Persistir resultados
    const snapshotUpserts = empresas.map((e: any, i: number) => ({
      id_empresa: e.id,
      periodo,
      pl_abertura: round2(plAbertura[i]),
      ajuste_equivalencia: round2(R[i]),
      pl_fechamento: round2(plFechamento[i]),
      processado: true,
      data_processamento: new Date().toISOString(),
    }));

    for (const snap of snapshotUpserts) {
      await supabase.from("eq_pl_snapshot").upsert(snap, { onConflict: "id_empresa,periodo" });
    }

    // Lançamentos
    const lancamentos = empresas
      .map((e: any, i: number) => {
        if (Math.abs(R[i]) < 0.01) return null;
        return {
          id_empresa: e.id,
          periodo,
          valor_equivalencia: round2(R[i]),
          tipo: R[i] >= 0 ? "receita" : "despesa",
        };
      })
      .filter(Boolean);

    if (lancamentos.length > 0) {
      // Delete old lancamentos for this period first
      await supabase.from("eq_lancamentos").delete().eq("periodo", periodo).in("id_empresa", empresaIds);
      await supabase.from("eq_lancamentos").insert(lancamentos);
    }

    // Cache da matriz
    await supabase.from("eq_matriz_cache").upsert(
      {
        grupo_id,
        periodo,
        matriz_json: { P, M, Minv: Minv.map((r) => r.map(round6)) },
        resultado_json: {
          empresas: empresas.map((e: any, i: number) => ({
            id: e.id,
            nome: e.nome,
            lucro: L[i],
            dividendos: dividendos[i],
            equivalencia: round2(R[i]),
            pl_abertura: round2(plAbertura[i]),
            pl_fechamento: round2(plFechamento[i]),
          })),
          total_equivalencia: round2(R.reduce((a, b) => a + b, 0)),
        },
      },
      { onConflict: "grupo_id,periodo" }
    );

    // 11. Calcular valor por sócio externo
    const { data: sociosParts } = await supabase
      .from("eq_participacoes_socios")
      .select("id_empresa, id_socio, percentual, eq_socios(nome, tipo_socio)")
      .in("id_empresa", empresaIds)
      .or(`data_fim.is.null,data_fim.gte.${periodo}-01`);

    const valorSocios: any[] = [];
    if (sociosParts) {
      for (const sp of sociosParts) {
        const idx = empresaIndex[sp.id_empresa];
        if (idx !== undefined) {
          valorSocios.push({
            socio: (sp as any).eq_socios?.nome || "N/A",
            tipo: (sp as any).eq_socios?.tipo_socio || "PF",
            empresa: empresas[idx].nome,
            percentual: sp.percentual,
            valor_patrimonial: round2(plFechamento[idx] * (Number(sp.percentual) / 100)),
          });
        }
      }
    }

    const response = {
      periodo,
      empresas: empresas.map((e: any, i: number) => ({
        id: e.id,
        nome: e.nome,
        tipo: e.tipo_empresa,
        lucro_pre_equivalencia: round2(L[i]),
        dividendos: round2(dividendos[i]),
        equivalencia: round2(R[i]),
        tipo_resultado: R[i] >= 0 ? "receita" : "despesa",
        pl_abertura: round2(plAbertura[i]),
        pl_fechamento: round2(plFechamento[i]),
      })),
      matriz: { P, dimensao: N },
      valor_socios: valorSocios,
      totais: {
        total_equivalencia: round2(R.reduce((a, b) => a + b, 0)),
        total_receitas: round2(R.filter((v) => v >= 0).reduce((a, b) => a + b, 0)),
        total_despesas: round2(R.filter((v) => v < 0).reduce((a, b) => a + b, 0)),
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// UTILS
// ============================================================================

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round6(v: number): number {
  return Math.round(v * 1000000) / 1000000;
}

function periodoAnterior(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}
