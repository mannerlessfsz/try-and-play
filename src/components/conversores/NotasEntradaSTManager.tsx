import { useState, useMemo, useRef, useCallback } from "react";
import { FileText, Plus, Trash2, Upload, Download, Search, ChevronLeft, ChevronRight, FileUp, Loader2, Building2, SearchCheck, ChevronDown, ChevronUp, List } from "lucide-react";
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
import { formatCnpj, cleanCnpj, isValidCnpj, fetchCnpjData } from "@/utils/cnpjUtils";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatPct = (v: number) => `${v.toFixed(2)}%`;

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

const ROWS_PER_PAGE = 100;

const columns: { key: string; label: string; width: string; type?: "number" | "currency" | "pct" }[] = [
  { key: "nfe", label: "NF-e", width: "w-20" },
  { key: "fornecedor", label: "Fornecedor", width: "w-48" },
  { key: "competencia", label: "Comp.", width: "w-24" },
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
  { key: "data_pagamento", label: "Pagamento", width: "w-24" },
];

export function NotasEntradaSTManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Local empresa selector state
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(() => {
    return localStorage.getItem("notasST_empresaId") || null;
  });
  const [showNewEmpresaDialog, setShowNewEmpresaDialog] = useState(false);
  const [newEmpresaForm, setNewEmpresaForm] = useState({ nome: "", cnpj: "" });
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  // Fetch empresas directly
  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-conversores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome, cnpj")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Auto-select first empresa or restore from localStorage
  const empresaAtiva = useMemo(() => {
    if (selectedEmpresaId) {
      const found = empresas.find((e) => e.id === selectedEmpresaId);
      if (found) return found;
    }
    if (empresas.length > 0) return empresas[0];
    return null;
  }, [empresas, selectedEmpresaId]);

  const handleSelectEmpresa = (id: string) => {
    setSelectedEmpresaId(id);
    localStorage.setItem("notasST_empresaId", id);
  };

  const createEmpresa = useMutation({
    mutationFn: async (data: { nome: string; cnpj: string }) => {
      const { data: result, error } = await supabase
        .from("empresas")
        .insert({ nome: data.nome, cnpj: data.cnpj || null })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["empresas-conversores"] });
      handleSelectEmpresa(data.id);
      setShowNewEmpresaDialog(false);
      setNewEmpresaForm({ nome: "", cnpj: "" });
      toast.success("Empresa cadastrada com sucesso");
    },
    onError: (err: any) => {
      toast.error("Erro ao cadastrar empresa: " + err.message);
    },
  });

  const { notas, isLoading, addNota, deleteNota, addMany } = useNotasEntradaST(empresaAtiva?.id);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newNota, setNewNota] = useState<Record<string, string>>({});
  const [importingNfe, setImportingNfe] = useState(false);
  const nfeInputRef = useRef<HTMLInputElement>(null);
  const [selectedCompetencia, setSelectedCompetencia] = useState<string>("todas");
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [allRecordsPage, setAllRecordsPage] = useState(0);

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
  const allRecordsScrollProps = useDragScroll();

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

  const filtered = useMemo(() => {
    let result = notas;
    
    // Filter by competência
    if (selectedCompetencia && selectedCompetencia !== "todas") {
      result = result.filter((n) => {
        if (!n.competencia) return false;
        const d = new Date(n.competencia);
        if (isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return key === selectedCompetencia;
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
  }, [notas, search, selectedCompetencia]);

  // Reversed display: last records first, but keep original numbering
  const filteredReversed = useMemo(() => {
    return [...filtered].reverse();
  }, [filtered]);

  // All records (unfiltered) reversed for the collapsible card
  const allNotasReversed = useMemo(() => {
    return [...notas].reverse();
  }, [notas]);

  const allRecordsTotalPages = Math.max(1, Math.ceil(allNotasReversed.length / ROWS_PER_PAGE));
  const allRecordsPaged = allNotasReversed.slice(allRecordsPage * ROWS_PER_PAGE, (allRecordsPage + 1) * ROWS_PER_PAGE);

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
    if (!empresaAtiva?.id || !newNota.nfe || !newNota.fornecedor) {
      toast.error("NF-e e Fornecedor são obrigatórios");
      return;
    }

    const nota: NotaEntradaSTInsert = {
      empresa_id: empresaAtiva.id,
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
    if (!file || !empresaAtiva?.id) return;

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });

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

        // Try dd/mm/yyyy or dd/mm/yy (Brazilian format)
        const brMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (brMatch) {
          let [, a, b, c] = brMatch;
          let year = Number(c);
          if (year < 100) year += 2000;
          const day = Number(a);
          const month = Number(b);
          // Validate month/day ranges
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          }
          // If month > 12, maybe it's mm/dd/yyyy format
          if (day >= 1 && day <= 12 && month >= 1 && month <= 31) {
            return `${year}-${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}`;
          }
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
          empresa_id: empresaAtiva.id,
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
    if (!file || !empresaAtiva?.id) return;

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
        empresa_id: empresaAtiva.id,
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
        observacoes: `CFOP: ${prod.cfop || ""} | Chave: ${nfe.chave_acesso || ""}`,
      }));

      if (notasToInsert.length === 0) {
        // If no products, create a single entry with totals
        const singleNota: NotaEntradaSTInsert = {
          empresa_id: empresaAtiva.id,
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
    if (col.key === "competencia" && v) {
      try {
        const d = new Date(v);
        return d.toLocaleDateString("pt-BR");
      } catch {
        return String(v);
      }
    }
    if (col.key === "data_pagamento" && v) {
      try {
        const d = new Date(v);
        return d.toLocaleDateString("pt-BR");
      } catch {
        return String(v);
      }
    }
    return String(v ?? "");
  };

  const handleCnpjChange = (value: string) => {
    const formatted = formatCnpj(value);
    setNewEmpresaForm((p) => ({ ...p, cnpj: formatted }));
  };

  const handleBuscarCnpj = async () => {
    const digits = cleanCnpj(newEmpresaForm.cnpj);
    if (digits.length !== 14) {
      toast.error("Digite um CNPJ completo com 14 dígitos");
      return;
    }
    if (!isValidCnpj(digits)) {
      toast.error("CNPJ inválido (dígito verificador incorreto)");
      return;
    }

    // Check if empresa already exists with this CNPJ
    const existing = empresas.find((e) => e.cnpj && cleanCnpj(e.cnpj) === digits);
    if (existing) {
      handleSelectEmpresa(existing.id);
      setShowNewEmpresaDialog(false);
      toast.info(`Empresa "${existing.nome}" já cadastrada — selecionada automaticamente`);
      return;
    }

    setBuscandoCnpj(true);
    try {
      const data = await fetchCnpjData(digits);
      setNewEmpresaForm({
        nome: data.razao_social || data.nome_fantasia || "",
        cnpj: formatCnpj(digits),
      });
      toast.success("Dados encontrados na Receita Federal");
    } catch (err: any) {
      toast.error(err.message || "Erro ao buscar CNPJ");
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const renderNewEmpresaDialog = () => (
    <Dialog open={showNewEmpresaDialog} onOpenChange={(open) => {
      setShowNewEmpresaDialog(open);
      if (!open) setNewEmpresaForm({ nome: "", cnpj: "" });
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Nova Empresa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <div className="flex gap-2">
              <Input
                value={newEmpresaForm.cnpj}
                onChange={(e) => handleCnpjChange(e.target.value)}
                placeholder="00.000.000/0001-00"
                maxLength={18}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleBuscarCnpj}
                disabled={buscandoCnpj || cleanCnpj(newEmpresaForm.cnpj).length < 14}
                title="Buscar CNPJ na Receita Federal"
              >
                {buscandoCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchCheck className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Digite o CNPJ e clique na lupa para buscar automaticamente
            </p>
          </div>
          <div className="space-y-2">
            <Label>Nome da Empresa *</Label>
            <Input
              value={newEmpresaForm.nome}
              onChange={(e) => setNewEmpresaForm((p) => ({ ...p, nome: e.target.value }))}
              placeholder="Razão Social ou Nome Fantasia"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewEmpresaDialog(false)}>Cancelar</Button>
          <Button
            onClick={() => createEmpresa.mutate(newEmpresaForm)}
            disabled={!newEmpresaForm.nome || createEmpresa.isPending}
          >
            {createEmpresa.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (!empresaAtiva) {
    return (
      <div className="glass rounded-2xl p-8 text-center space-y-4">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Nenhuma empresa cadastrada.</p>
        <Button onClick={() => setShowNewEmpresaDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Cadastrar Empresa
        </Button>
        {renderNewEmpresaDialog()}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {renderNewEmpresaDialog()}

      {/* Empresa Selector */}
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={empresaAtiva.id} onValueChange={handleSelectEmpresa}>
          <SelectTrigger className="w-60 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {empresas.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome} {e.cnpj ? `(${e.cnpj})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setShowNewEmpresaDialog(true)}>
          <Plus className="w-3.5 h-3.5" /> Nova
        </Button>
      </div>

      {/* Header */}
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
          <Select value={selectedCompetencia} onValueChange={(v) => { setSelectedCompetencia(v); setPage(0); }}>
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
                  { key: "data_pagamento", label: "Data Pagamento", type: "date" },
                ].map((f) => (
                  <div key={f.key} className={f.key === "fornecedor" ? "col-span-2" : ""}>
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      type={f.type}
                      value={newNota[f.key] || ""}
                      onChange={(e) => setNewNota((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="h-8 text-xs mt-1"
                      step={f.type === "number" ? "0.01" : undefined}
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

      {/* Filtered table (by competência) */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-border/30 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {selectedCompetencia !== "todas"
              ? `${filteredReversed.length} registro${filteredReversed.length !== 1 ? "s" : ""} na competência ${selectedCompetencia.split("-").reverse().join("/")}`
              : `${filteredReversed.length} registro${filteredReversed.length !== 1 ? "s" : ""}`}
          </p>
          {selectedCompetencia !== "todas" && (
            <Badge variant="outline" className="text-[10px]">
              Filtrado: {selectedCompetencia.split("-").reverse().join("/")}
            </Badge>
          )}
        </div>
        <div ref={filteredScrollProps.ref} onMouseDown={filteredScrollProps.onMouseDown} onMouseMove={filteredScrollProps.onMouseMove} onMouseUp={filteredScrollProps.onMouseUp} onMouseLeave={filteredScrollProps.onMouseLeave} className="overflow-x-auto cursor-grab scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          <div className="min-w-[1800px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8 text-[10px] px-2">#</TableHead>
                  {columns.map((col) => (
                    <TableHead key={col.key} className={`text-[10px] px-2 whitespace-nowrap ${col.width}`}>
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="w-8 px-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 2} className="text-center text-xs text-muted-foreground py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredReversed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 2} className="text-center text-xs text-muted-foreground py-8">
                      {search || selectedCompetencia !== "todas" ? "Nenhuma nota encontrada para o filtro selecionado" : "Nenhuma nota cadastrada. Importe uma planilha ou adicione manualmente."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReversed.map((nota, idx) => {
                    // Original index (1-based) from the full notas array
                    const originalIdx = notas.findIndex((n) => n.id === nota.id) + 1;
                    return (
                      <TableRow key={nota.id} className={`transition-all duration-150 ${idx % 2 === 0 ? "bg-muted/20" : ""} hover:bg-primary/10 hover:shadow-[inset_3px_0_0_hsl(var(--primary))] hover:scale-[1.002]`}>
                        <TableCell className="text-[10px] text-muted-foreground px-2 font-mono">
                          {originalIdx}
                        </TableCell>
                        {columns.map((col) => (
                          <TableCell
                            key={col.key}
                            className={`text-[11px] px-2 whitespace-nowrap ${
                              col.type === "currency" || col.type === "number"
                                ? "text-right font-mono"
                                : col.type === "pct"
                                ? "text-center font-mono"
                                : ""
                            }`}
                          >
                            {formatCell(nota, col)}
                          </TableCell>
                        ))}
                        <TableCell className="px-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteNota.mutate(nota.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Collapsible card: all records */}
      {selectedCompetencia !== "todas" && notas.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <button
            onClick={() => { setShowAllRecords((v) => !v); setAllRecordsPage(0); }}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium">Todos os registros</span>
              <Badge variant="secondary" className="text-[10px]">{notas.length}</Badge>
            </div>
            {showAllRecords ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showAllRecords && (
            <>
              <div ref={allRecordsScrollProps.ref} onMouseDown={allRecordsScrollProps.onMouseDown} onMouseMove={allRecordsScrollProps.onMouseMove} onMouseUp={allRecordsScrollProps.onMouseUp} onMouseLeave={allRecordsScrollProps.onMouseLeave} className="overflow-x-auto cursor-grab scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent border-t border-border/30">
                <div className="min-w-[1800px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-8 text-[10px] px-2">#</TableHead>
                        {columns.map((col) => (
                          <TableHead key={col.key} className={`text-[10px] px-2 whitespace-nowrap ${col.width}`}>
                            {col.label}
                          </TableHead>
                        ))}
                        <TableHead className="w-8 px-2" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRecordsPaged.map((nota, idx) => {
                        const originalIdx = notas.findIndex((n) => n.id === nota.id) + 1;
                        return (
                          <TableRow key={nota.id} className={`transition-all duration-150 ${idx % 2 === 0 ? "bg-muted/20" : ""} hover:bg-primary/10 hover:shadow-[inset_3px_0_0_hsl(var(--primary))] hover:scale-[1.002]`}>
                            <TableCell className="text-[10px] text-muted-foreground px-2 font-mono">
                              {originalIdx}
                            </TableCell>
                            {columns.map((col) => (
                              <TableCell
                                key={col.key}
                                className={`text-[11px] px-2 whitespace-nowrap ${
                                  col.type === "currency" || col.type === "number"
                                    ? "text-right font-mono"
                                    : col.type === "pct"
                                    ? "text-center font-mono"
                                    : ""
                                }`}
                              >
                                {formatCell(nota, col)}
                              </TableCell>
                            ))}
                            <TableCell className="px-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteNota.mutate(nota.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
              {allRecordsTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-border/30">
                  <p className="text-[10px] text-muted-foreground">
                    {notas.length} registro{notas.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={allRecordsPage === 0} onClick={() => setAllRecordsPage((p) => p - 1)}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-[10px] text-muted-foreground px-2">
                      {allRecordsPage + 1} / {allRecordsTotalPages}
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={allRecordsPage >= allRecordsTotalPages - 1} onClick={() => setAllRecordsPage((p) => p + 1)}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
