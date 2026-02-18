import { useState, useMemo, useRef, useCallback } from "react";
import { FileText, Plus, Trash2, Upload, Download, Search, ChevronLeft, ChevronRight, FileUp, Loader2, Pencil, Check } from "lucide-react";
import { NotasCompactCards, NotasAccordionCards, NotasGridCards } from "./NotasViewCards";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotasEntradaST, NotaEntradaSTInsert } from "@/hooks/useNotasEntradaST";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatCurrencyRaw = (v: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const formatPctRaw = (v: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v * 100);

const formatPct = (v: number) => `${formatPctRaw(v)}%`;

const formatNumberRaw = (v: number) =>
  new Intl.NumberFormat("pt-BR").format(v);

const parseBRLNumber = (s: string): number => {
  if (!s) return 0;
  const cleaned = s.replace(/R\$\s?/g, "").replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const parseUSNumber = (s: string): number => {
  if (!s) return 0;
  const cleaned = s.replace(/R\$\s?/g, "").replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const parsePct = (s: string): number => {
  if (!s) return 0;
  const n = parseFloat(s.replace("%", "").replace(",", ".").trim());
  return isNaN(n) ? 0 : n;
};

/** Format ISO/DB date string to dd/mm/yyyy */
const formatDateBR = (val: any): string => {
  if (!val) return "";
  const s = String(val);
  // Already dd/mm/yyyy?
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  // ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.substring(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  try {
    const dt = new Date(s + (s.length === 10 ? "T12:00:00" : ""));
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString("pt-BR");
    }
  } catch {}
  return s;
};

/** Parse dd/mm/yyyy to yyyy-mm-dd for DB storage */
const parseDateBR = (s: string): string | null => {
  if (!s) return null;
  const trimmed = s.trim();
  // dd/mm/yyyy or dd-mm-yyyy
  const match = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  // Already ISO?
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.substring(0, 10);
  return trimmed || null;
};

const ROWS_PER_PAGE = 100;

const columns: { key: string; label: string; width: string; type?: "number" | "currency" | "pct" | "date" }[] = [
  { key: "nfe", label: "NF-e", width: "w-20" },
  { key: "fornecedor", label: "Fornecedor", width: "w-48" },
  { key: "competencia", label: "Comp.", width: "w-24", type: "date" },
  { key: "ncm", label: "NCM", width: "w-28" },
  { key: "quantidade", label: "QTD.", width: "w-16", type: "number" },
  { key: "valor_produto", label: "Valor Produto", width: "w-28", type: "currency" },
  { key: "ipi", label: "IPI", width: "w-24", type: "currency" },
  { key: "frete", label: "Frete", width: "w-24", type: "currency" },
  { key: "desconto", label: "Desconto", width: "w-24", type: "currency" },
  { key: "valor_total", label: "Valor Total", width: "w-28", type: "currency" },
  { key: "pct_mva", label: "% MVA", width: "w-20", type: "pct" },
  { key: "pct_icms_interno", label: "% ICMS Int.", width: "w-20", type: "pct" },
  { key: "pct_fecp", label: "% FECP", width: "w-20", type: "pct" },
  { key: "pct_icms_interestadual", label: "% ICMS Interest.", width: "w-24", type: "pct" },
  { key: "bc_icms_st", label: "BC ICMS ST", width: "w-28", type: "currency" },
  { key: "valor_icms_nf", label: "ICMS na NF", width: "w-28", type: "currency" },
  { key: "valor_icms_st", label: "Valor ICMS ST", width: "w-28", type: "currency" },
  { key: "valor_fecp", label: "Valor FECP", width: "w-28", type: "currency" },
  { key: "valor_st_un", label: "Valor ST UN", width: "w-24", type: "currency" },
  { key: "total_st", label: "TOTAL ST", width: "w-28", type: "currency" },
  { key: "chave_nfe", label: "Chave NFE", width: "w-[340px]" },
];

interface NotasEntradaSTManagerProps {
  empresaId?: string;
}

export function NotasEntradaSTManager({ empresaId }: NotasEntradaSTManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { notas, isLoading, addNota, updateNota, deleteNota, addMany } = useNotasEntradaST(empresaId);
  const [search, setSearch] = useState("");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newNota, setNewNota] = useState<Record<string, string>>({});
  const [importingNfe, setImportingNfe] = useState(false);
  const nfeInputRef = useRef<HTMLInputElement>(null);
  const [selectedCompetencia, setSelectedCompetencia] = useState<string | null>(null);

  // Drag-to-scroll logic for horizontal table navigation
  const useDragScroll = () => {
    const ref = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      isDragging.current = true;
      startX.current = e.pageX - el.offsetLeft;
      scrollLeft.current = el.scrollLeft;
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const el = ref.current;
      if (!el) return;
      const x = e.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft.current - (x - startX.current);
    }, []);

    const onMouseUp = useCallback(() => {
      isDragging.current = false;
      const el = ref.current;
      if (el) {
        el.style.cursor = "grab";
        el.style.userSelect = "";
      }
    }, []);

    return { ref, onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp };
  };

  const filteredScrollProps = useDragScroll();
  

  // Extract unique competências
  const competencias = useMemo(() => {
    const set = new Set<string>();
    notas.forEach((n) => {
      if (n.competencia) {
        // Extract YYYY-MM from date
        const d = new Date(n.competencia);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          set.add(key);
        }
      }
    });
    return Array.from(set).sort().reverse();
  }, [notas]);

  // Auto-select latest competência when not yet selected
  const activeCompetencia = useMemo(() => {
    if (selectedCompetencia !== null) return selectedCompetencia;
    return competencias.length > 0 ? competencias[0] : "todas";
  }, [selectedCompetencia, competencias]);

  const filtered = useMemo(() => {
    let result = notas;
    
    // Filter by competência
    if (activeCompetencia && activeCompetencia !== "todas") {
      result = result.filter((n) => {
        if (!n.competencia) return false;
        const d = new Date(n.competencia);
        if (isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return key === activeCompetencia;
      });
    }

    // Filter by search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.nfe.toLowerCase().includes(s) ||
          n.fornecedor.toLowerCase().includes(s) ||
          (n.ncm && n.ncm.toLowerCase().includes(s))
      );
    }
    
    return result;
  }, [notas, search, activeCompetencia]);

  // Reversed display: last records first, but keep original numbering
  const filteredReversed = useMemo(() => {
    return [...filtered].reverse();
  }, [filtered]);


  // Totals
  const totals = useMemo(() => {
    const sum = (key: keyof typeof notas[0]) =>
      notas.reduce((acc, n) => acc + (Number(n[key]) || 0), 0);
    return {
      quantidade: sum("quantidade"),
      valor_produto: sum("valor_produto"),
      valor_total: sum("valor_total"),
      valor_icms_nf: sum("valor_icms_nf"),
      valor_icms_st: sum("valor_icms_st"),
      valor_fecp: sum("valor_fecp"),
      total_st: sum("total_st"),
    };
  }, [notas]);

  const handleAdd = () => {
    if (!empresaId || !newNota.nfe || !newNota.fornecedor) {
      toast.error("NF-e e Fornecedor são obrigatórios");
      return;
    }

    // Validar chave NFE se preenchida
    const chaveNfe = (newNota.chave_nfe || "").replace(/\D/g, "");
    if (chaveNfe && chaveNfe.length !== 44) {
      toast.error(`Chave NFE inválida — deve ter 44 dígitos. Atualmente tem ${chaveNfe.length}.`);
      return;
    }

    const nota: NotaEntradaSTInsert = {
      empresa_id: empresaId,
      nfe: newNota.nfe,
      fornecedor: newNota.fornecedor,
      competencia: newNota.competencia || null,
      ncm: newNota.ncm || null,
      quantidade: Number(newNota.quantidade) || 0,
      valor_produto: Number(newNota.valor_produto) || 0,
      ipi: Number(newNota.ipi) || 0,
      frete: Number(newNota.frete) || 0,
      desconto: Number(newNota.desconto) || 0,
      valor_total: Number(newNota.valor_total) || 0,
      pct_mva: Number(newNota.pct_mva) || 0,
      pct_icms_interno: Number(newNota.pct_icms_interno) || 0,
      pct_fecp: Number(newNota.pct_fecp) || 0,
      pct_icms_interestadual: Number(newNota.pct_icms_interestadual) || 0,
      bc_icms_st: Number(newNota.bc_icms_st) || 0,
      valor_icms_nf: Number(newNota.valor_icms_nf) || 0,
      valor_icms_st: Number(newNota.valor_icms_st) || 0,
      valor_fecp: Number(newNota.valor_fecp) || 0,
      valor_st_un: Number(newNota.valor_st_un) || 0,
      total_st: Number(newNota.total_st) || 0,
      data_pagamento: newNota.data_pagamento || null,
      chave_nfe: chaveNfe || null,
      observacoes: newNota.observacoes || null,
    } as any;

    addNota.mutate(nota as any, {
      onSuccess: () => {
        setShowAddDialog(false);
        setNewNota({});
      },
    });
  };

  const handleImportXlsx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaId) return;

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });

      // Find header row
      let headerIdx = -1;
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const row = rows[i].map((c: any) => String(c).toLowerCase().trim());
        if (row.some((c: string) => c.includes("nf-e") || c.includes("nfe"))) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) {
        toast.error("Cabeçalho não encontrado na planilha");
        return;
      }

      const headers = rows[headerIdx].map((c: any) => String(c).toLowerCase().trim());
      console.log("[XLSX Import] Headers found:", headers);
      console.log("[XLSX Import] First data row sample:", rows[headerIdx + 1]);
      const dataRows = rows.slice(headerIdx + 1);

      const getCol = (keywords: string[]) =>
        headers.findIndex((h: string) => keywords.some((k) => h.includes(k)));

      const colNfe = getCol(["nf-e", "nfe"]);
      const colForn = getCol(["fornecedor"]);
      const colComp = getCol(["comp"]);
      const colNcm = getCol(["ncm"]);
      const colQtd = getCol(["qtd"]);
      const colValProd = getCol(["valor produto", "valor prod"]);
      const colIpi = getCol(["ipi"]);
      const colFrete = getCol(["frete"]);
      const colDesc = getCol(["desconto"]);
      const colValTotal = getCol(["valor total"]);
      const colMva = getCol(["mva"]);
      const colIcmsInt = getCol(["icms interno", "icms int"]);
      const colFecp = getCol(["fecp"]);
      const colIcmsInter = getCol(["icms interest", "icms inter"]);
      const colBcSt = getCol(["bc icms", "bc icms st"]);
      const colIcmsNf = getCol(["icms na nf", "valor icms na"]);
      const colIcmsSt = getCol(["valor icms st", "icms st"]);
      const colVFecp = getCol(["valor fecp"]);
      const colStUn = getCol(["st un", "valor st un"]);
      const colTotalSt = getCol(["total st"]);
      // coluna "pagamento" removida intencionalmente
      console.log("[XLSX Import] Column indices:", { colNfe, colForn, colComp, colNcm, colQtd, colValProd, colValTotal, colMva, colIcmsInt, colFecp, colIcmsInter, colBcSt, colIcmsNf, colIcmsSt, colVFecp, colStUn, colTotalSt });

      const parseNum = (v: any): number => {
        if (typeof v === "number") return v;
        const s = String(v);
        // Try US format first (as in the file: R$ 71,250.00)
        const us = parseUSNumber(s);
        if (us !== 0) return us;
        return parseBRLNumber(s);
      };

      const parseDate = (v: any): string | null => {
        if (!v) return null;

        // Handle Date objects directly (cellDates:true)
        if (v instanceof Date && !isNaN(v.getTime())) {
          const y = v.getFullYear();
          const m = v.getMonth() + 1;
          const d = v.getDate();
          if (y > 1900) return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          return null;
        }

        // Handle Excel serial date numbers
        if (typeof v === "number" && v > 1 && v < 100000) {
          const excelEpoch = new Date(Date.UTC(1899, 11, 30));
          const date = new Date(excelEpoch.getTime() + v * 86400000);
          return date.toISOString().split("T")[0];
        }

        const s = String(v).trim();
        if (!s) return null;

        // Formato brasileiro: dd/mm/yyyy ou dd-mm-yyyy
        // Também trata formato americano m/d/yy do Excel (quando raw:false era usado)
        const brMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (brMatch) {
          let [, a, b, c] = brMatch;
          let y = Number(c);
          if (y < 100) y += 2000;
          const n1 = Number(a);
          const n2 = Number(b);
          // Se o segundo número > 12, é formato americano m/d/yy (mês/dia/ano)
          if (n2 > 12 && n1 <= 12) {
            return `${y}-${String(n1).padStart(2, "0")}-${String(n2).padStart(2, "0")}`;
          }
          // Senão, assume brasileiro dd/mm/yyyy
          return `${y}-${String(n2).padStart(2, "0")}-${String(n1).padStart(2, "0")}`;
        }

        // Try yyyy-mm-dd (ISO)
        const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if (isoMatch) {
          return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
        }

        // Try mm/yyyy (competência sem dia)
        const compMatch = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
        if (compMatch) {
          return `${compMatch[2]}-${compMatch[1].padStart(2, "0")}-01`;
        }

        return null;
      };

      // Build a set of existing nota keys to detect duplicates
      const existingKeys = new Set(
        notas.map((n) => `${n.nfe}|${n.fornecedor}|${n.ncm || ""}|${n.valor_total}`)
      );

      const notasToInsert: NotaEntradaSTInsert[] = [];
      let skippedCount = 0;

      for (const row of dataRows) {
        const nfe = String(row[colNfe] ?? "").replace(/,/g, "").trim();
        const forn = String(row[colForn] ?? "").trim();
        if (!nfe || !forn) continue;

        const ncm = colNcm >= 0 ? String(row[colNcm] ?? "").trim() : "";
        const valorTotal = colValTotal >= 0 ? parseNum(row[colValTotal]) : 0;
        const key = `${nfe}|${forn}|${ncm}|${valorTotal}`;

        // Skip if already exists in DB or already queued for insert
        if (existingKeys.has(key)) {
          skippedCount++;
          continue;
        }
        existingKeys.add(key);

        notasToInsert.push({
          empresa_id: empresaId,
          nfe,
          fornecedor: forn,
          competencia: colComp >= 0 ? parseDate(row[colComp]) : null,
          ncm: ncm || null,
          quantidade: colQtd >= 0 ? parseNum(row[colQtd]) : 0,
          valor_produto: colValProd >= 0 ? parseNum(row[colValProd]) : 0,
          ipi: colIpi >= 0 ? parseNum(row[colIpi]) : 0,
          frete: colFrete >= 0 ? parseNum(row[colFrete]) : 0,
          desconto: colDesc >= 0 ? parseNum(row[colDesc]) : 0,
          valor_total: valorTotal,
          pct_mva: colMva >= 0 ? parsePct(String(row[colMva])) : 0,
          pct_icms_interno: colIcmsInt >= 0 ? parsePct(String(row[colIcmsInt])) : 0,
          pct_fecp: colFecp >= 0 ? parsePct(String(row[colFecp])) : 0,
          pct_icms_interestadual: colIcmsInter >= 0 ? parsePct(String(row[colIcmsInter])) : 0,
          bc_icms_st: colBcSt >= 0 ? parseNum(row[colBcSt]) : 0,
          valor_icms_nf: colIcmsNf >= 0 ? parseNum(row[colIcmsNf]) : 0,
          valor_icms_st: colIcmsSt >= 0 ? parseNum(row[colIcmsSt]) : 0,
          valor_fecp: colVFecp >= 0 ? parseNum(row[colVFecp]) : 0,
          valor_st_un: colStUn >= 0 ? parseNum(row[colStUn]) : 0,
          total_st: colTotalSt >= 0 ? parseNum(row[colTotalSt]) : 0,
          data_pagamento: null,
          chave_nfe: null,
          observacoes: null,
        });
      }

      if (notasToInsert.length === 0) {
        if (skippedCount > 0) {
          toast.info(`Todas as ${skippedCount} notas da planilha já existem no sistema`);
        } else {
          toast.error("Nenhuma nota válida encontrada na planilha");
        }
        return;
      }

      if (skippedCount > 0) {
        toast.info(`${skippedCount} nota(s) duplicada(s) ignorada(s)`);
      }

      addMany.mutate(notasToInsert as any);
    } catch (err: any) {
      toast.error("Erro ao ler arquivo: " + err.message);
    }

    e.target.value = "";
  };

  const handleExportCsv = () => {
    if (notas.length === 0) return;
    const header = columns.map((c) => c.label).join(";");
    const lines = notas.map((n: any) =>
      columns
        .map((c) => {
          const v = n[c.key];
          if (c.type === "currency") return formatCurrency(Number(v) || 0);
          if (c.type === "pct") return formatPct(Number(v) || 0);
          return String(v ?? "");
        })
        .join(";")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notas_entrada_st.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportNfe = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaId) return;

    const fileName = file.name.toLowerCase();
    const isXML = fileName.endsWith(".xml");
    const isPDF = fileName.endsWith(".pdf");

    if (!isXML && !isPDF) {
      toast.error("Arquivo deve ser XML ou PDF de NF-e");
      return;
    }

    setImportingNfe(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/parse-nfe`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: formData,
      });

      const result = await res.json();

      if (!result.success) {
        toast.error("Erro ao processar NF-e: " + (result.error || "Erro desconhecido"));
        return;
      }

      const nfe = result.data;

      // Map each product from the NF-e to a nota entrada ST record
      const notasToInsert: NotaEntradaSTInsert[] = nfe.produtos.map((prod: any) => ({
        empresa_id: empresaId,
        nfe: nfe.numero || "",
        fornecedor: nfe.emitente?.nome || "",
        competencia: nfe.data_emissao || null,
        ncm: prod.ncm || null,
        quantidade: prod.quantidade || 0,
        valor_produto: prod.valor_total || 0,
        ipi: 0,
        frete: 0,
        desconto: 0,
        valor_total: prod.valor_total || 0,
        pct_mva: 0,
        pct_icms_interno: 0,
        pct_fecp: 0,
        pct_icms_interestadual: 0,
        bc_icms_st: 0,
        valor_icms_nf: 0,
        valor_icms_st: 0,
        valor_fecp: 0,
        valor_st_un: 0,
        total_st: 0,
        data_pagamento: null,
        chave_nfe: nfe.chave_acesso || null,
        observacoes: `CFOP: ${prod.cfop || ""} | Chave: ${nfe.chave_acesso || ""}`,
      }));

      if (notasToInsert.length === 0) {
        // If no products, create a single entry with totals
        const singleNota: NotaEntradaSTInsert = {
          empresa_id: empresaId,
          nfe: nfe.numero || "",
          fornecedor: nfe.emitente?.nome || "",
          competencia: nfe.data_emissao || null,
          ncm: null,
          quantidade: 1,
          valor_produto: nfe.total_produtos || 0,
          ipi: nfe.total_ipi || 0,
          frete: 0,
          desconto: 0,
          valor_total: nfe.total_nfe || 0,
          pct_mva: 0,
          pct_icms_interno: 0,
          pct_fecp: 0,
          pct_icms_interestadual: 0,
          bc_icms_st: 0,
          valor_icms_nf: nfe.total_icms || 0,
          valor_icms_st: 0,
          valor_fecp: 0,
          valor_st_un: 0,
          total_st: 0,
          data_pagamento: null,
          chave_nfe: nfe.chave_acesso || null,
          observacoes: `Chave: ${nfe.chave_acesso || ""}`,
        };
        addNota.mutate(singleNota as any);
        toast.success("NF-e importada com sucesso (1 registro)");
      } else {
        addMany.mutate(notasToInsert as any);
        toast.success(`NF-e importada: ${notasToInsert.length} produto(s)`);
      }
    } catch (err: any) {
      toast.error("Erro ao importar NF-e: " + err.message);
    } finally {
      setImportingNfe(false);
      e.target.value = "";
    }
  };

  const formatCell = (nota: any, col: (typeof columns)[0]) => {
    const v = nota[col.key];
    if (col.type === "currency") return formatCurrency(Number(v) || 0);
    if (col.type === "pct") return formatPct(Number(v) || 0);
    if (col.type === "number") return new Intl.NumberFormat("pt-BR").format(Number(v) || 0);
    if (col.type === "date" && v) return formatDateBR(v);
    return String(v ?? "");
  };


  if (!empresaId) {
    return (
      <div className="glass rounded-2xl p-8 text-center space-y-4">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Selecione uma empresa no painel acima para continuar.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--orange))] to-[hsl(var(--orange))/0.6] flex items-center justify-center">
            <FileText className="w-5 h-5 text-background" />
          </div>
          <div>
            <h3 className="font-bold text-base">Notas Entrada ST</h3>
            <p className="text-[11px] text-muted-foreground">
              {notas.length} nota{notas.length !== 1 ? "s" : ""} cadastrada{notas.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

          <div className="flex items-center gap-2 flex-wrap">

          {/* Competência filter */}
          <Select value={activeCompetencia} onValueChange={(v) => { setSelectedCompetencia(v); setPage(0); }}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Competência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas competências</SelectItem>
              {competencias.map((c) => {
                const [y, m] = c.split("-");
                return (
                  <SelectItem key={c} value={c}>
                    {m}/{y}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar NF-e, fornecedor..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-8 h-8 text-xs w-48"
            />
          </div>

          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls" onChange={handleImportXlsx} className="hidden" />
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
              <span>
                <Upload className="w-3.5 h-3.5" /> Importar XLSX
              </span>
            </Button>
          </label>

          <label className="cursor-pointer">
            <input
              ref={nfeInputRef}
              type="file"
              accept=".xml,.pdf"
              onChange={handleImportNfe}
              className="hidden"
              disabled={importingNfe}
            />
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild disabled={importingNfe}>
              <span>
                {importingNfe ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
                Importar NF-e
              </span>
            </Button>
          </label>

          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportCsv} disabled={notas.length === 0}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Nova Nota
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Nota de Entrada ST</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  { key: "nfe", label: "NF-e *", type: "text" },
                  { key: "fornecedor", label: "Fornecedor *", type: "text" },
                  { key: "competencia", label: "Competência", type: "date" },
                  { key: "ncm", label: "NCM", type: "text" },
                  { key: "quantidade", label: "QTD", type: "number" },
                  { key: "valor_produto", label: "Valor Produto", type: "number" },
                  { key: "ipi", label: "IPI", type: "number" },
                  { key: "frete", label: "Frete", type: "number" },
                  { key: "desconto", label: "Desconto", type: "number" },
                  { key: "valor_total", label: "Valor Total", type: "number" },
                  { key: "pct_mva", label: "% MVA", type: "number" },
                  { key: "pct_icms_interno", label: "% ICMS Interno", type: "number" },
                  { key: "pct_fecp", label: "% FECP", type: "number" },
                  { key: "pct_icms_interestadual", label: "% ICMS Interest.", type: "number" },
                  { key: "bc_icms_st", label: "BC ICMS ST", type: "number" },
                  { key: "valor_icms_nf", label: "ICMS na NF", type: "number" },
                  { key: "valor_icms_st", label: "Valor ICMS ST", type: "number" },
                  { key: "valor_fecp", label: "Valor FECP", type: "number" },
                  { key: "valor_st_un", label: "Valor ST UN", type: "number" },
                  { key: "total_st", label: "Total ST", type: "number" },
                  { key: "chave_nfe", label: "Chave NFE", type: "text", minLength: 44, maxLength: 44, pattern: "[0-9]*", placeholder: "44 dígitos numéricos" },
                ].map((f) => (
                  <div key={f.key} className={f.key === "fornecedor" ? "col-span-2" : f.key === "chave_nfe" ? "col-span-2" : ""}>
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      type={f.type}
                      value={newNota[f.key] || ""}
                      onChange={(e) => {
                        const val = f.key === "chave_nfe" ? e.target.value.replace(/\D/g, "") : e.target.value;
                        setNewNota((p) => ({ ...p, [f.key]: val }));
                      }}
                      className="h-8 text-xs mt-1"
                      step={f.type === "number" ? "0.01" : undefined}
                      maxLength={(f as any).maxLength}
                      placeholder={(f as any).placeholder}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleAdd} disabled={addNota.isPending}>
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Totals summary */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "QTD Total", value: totals.quantidade.toLocaleString("pt-BR") },
          { label: "Valor Produtos", value: formatCurrency(totals.valor_produto) },
          { label: "ICMS ST", value: formatCurrency(totals.valor_icms_st) },
          { label: "FECP", value: formatCurrency(totals.valor_fecp) },
          { label: "Total ST", value: formatCurrency(totals.total_st), highlight: true },
        ].map((t) => (
          <div
            key={t.label}
            className={`glass rounded-lg px-3 py-2 ${t.highlight ? "border-[hsl(var(--orange))/0.3]" : ""}`}
          >
            <p className="text-[10px] text-muted-foreground">{t.label}</p>
            <p className={`text-sm font-bold ${t.highlight ? "text-[hsl(var(--orange))]" : ""}`}>{t.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="glass rounded-xl p-8 text-center text-xs text-muted-foreground">Carregando...</div>
        ) : filteredReversed.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-xs text-muted-foreground">
            {search || activeCompetencia !== "todas" ? "Nenhuma nota encontrada para o filtro selecionado" : "Nenhuma nota cadastrada. Importe uma planilha ou adicione manualmente."}
          </div>
        ) : (
          filteredReversed.map((nota, idx) => {
            const originalIdx = notas.findIndex((n) => n.id === nota.id) + 1;
            const isEditing = editingRowId === nota.id;

            const renderField = (label: string, colKey: string, colType?: string, colSpan?: boolean) => {
              const col = columns.find(c => c.key === colKey);
              const value = (nota as any)[colKey];
              const formatted = col
                ? formatCell(nota, col)
                : colType === "currency" ? formatCurrency(Number(value) || 0)
                : colType === "pct" ? formatPct(Number(value) || 0)
                : colType === "number" ? new Intl.NumberFormat("pt-BR").format(Number(value) || 0)
                : colType === "date" ? formatDateBR(value)
                : String(value ?? "");

              return (
                <div key={colKey} className={colSpan ? "col-span-2 sm:col-span-3 lg:col-span-4" : ""}>
                  <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                  {isEditing ? (
                    <Input
                      className="h-7 text-xs px-2 border-dashed border-muted-foreground/30 bg-transparent focus:bg-background"
                      defaultValue={
                        value != null
                          ? colType === "currency" ? formatCurrencyRaw(Number(value))
                          : colType === "pct" ? formatPctRaw(Number(value))
                          : colType === "number" ? formatNumberRaw(Number(value))
                          : colType === "date" ? formatDateBR(value)
                          : String(value)
                          : ""
                      }
                      placeholder={colType === "date" ? "dd/mm/aaaa" : "—"}
                      onBlur={(e) => {
                        const raw = e.target.value;
                        let newVal: any = raw || null;
                        if (raw && colType === "currency") newVal = parseBRLNumber(raw);
                        else if (raw && colType === "pct") newVal = parseFloat(raw.replace(",", ".")) / 100;
                        else if (raw && colType === "number") newVal = parseFloat(raw.replace(",", "."));
                        else if (raw && colType === "date") newVal = parseDateBR(raw);

                        if (colKey === "chave_nfe" && newVal) {
                          const digits = String(newVal).replace(/\D/g, "");
                          if (digits.length !== 44) {
                            toast.error(`Chave NFE inválida — deve ter 44 dígitos (tem ${digits.length}).`);
                            return;
                          }
                          newVal = digits;
                        }

                        const oldVal = (nota as any)[colKey];
                        if (newVal !== oldVal && !(newVal == null && oldVal == null)) {
                          updateNota.mutate({ id: nota.id, [colKey]: newVal } as any);
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    />
                  ) : (
                    <p className={`text-xs font-medium truncate ${colType === "currency" || colType === "number" ? "font-mono" : ""}`}>
                      {formatted || "—"}
                    </p>
                  )}
                </div>
              );
            };

            return (
              <motion.div
                key={nota.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02, duration: 0.2 }}
                className="glass rounded-xl border border-border/30 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/20">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-muted-foreground">#{originalIdx}</span>
                    <span className="text-sm font-bold">NF-e {(nota as any).nfe}</span>
                    <span className="text-xs text-muted-foreground">— {(nota as any).fornecedor}</span>
                    {(nota as any).competencia && (
                      <Badge variant="outline" className="text-[10px]">{formatDateBR((nota as any).competencia)}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 w-7 p-0 ${isEditing ? "text-green-500 hover:text-green-600" : "text-muted-foreground hover:text-primary"}`}
                      onClick={() => setEditingRowId(isEditing ? null : nota.id)}
                      title={isEditing ? "Confirmar" : "Editar"}
                    >
                      {isEditing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteNota.mutate(nota.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Body - grid de campos */}
                <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-4 gap-y-2.5">
                  {renderField("NCM", "ncm")}
                  {renderField("Quantidade", "quantidade", "number")}
                  {renderField("Valor Produto", "valor_produto", "currency")}
                  {renderField("IPI", "ipi", "currency")}
                  {renderField("Frete", "frete", "currency")}
                  {renderField("Desconto", "desconto", "currency")}
                  {renderField("Valor Total", "valor_total", "currency")}
                  {renderField("% MVA", "pct_mva", "pct")}
                  {renderField("% ICMS Interno", "pct_icms_interno", "pct")}
                  {renderField("% FECP", "pct_fecp", "pct")}
                  {renderField("% ICMS Interest.", "pct_icms_interestadual", "pct")}
                  {renderField("BC ICMS ST", "bc_icms_st", "currency")}
                  {renderField("ICMS na NF", "valor_icms_nf", "currency")}
                  {renderField("Valor ICMS ST", "valor_icms_st", "currency")}
                  {renderField("Valor FECP", "valor_fecp", "currency")}
                  {renderField("Valor ST UN", "valor_st_un", "currency")}
                  {renderField("TOTAL ST", "total_st", "currency")}
                  {renderField("Data Pagamento", "data_pagamento", "date")}
                  {renderField("Doc. Pagamento", "numero_doc_pagamento")}
                  {renderField("Código Barras", "codigo_barras")}
                  {renderField("Produto", "produto")}
                  {renderField("Créd. ICMS Próprio", "credito_icms_proprio", "currency")}
                  {renderField("Créd. ICMS ST", "credito_icms_st", "currency")}
                  {renderField("Status", "status")}
                  {renderField("Observações", "observacoes")}
                  {renderField("Chave NFE", "chave_nfe", undefined, true)}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

    </motion.div>
  );
}
