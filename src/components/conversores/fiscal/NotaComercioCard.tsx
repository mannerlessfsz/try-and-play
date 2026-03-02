import { motion } from "framer-motion";
import { Building2, User, Package, DollarSign, Truck, FileText, Calendar, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NotaComercio, formatValor, formatData } from "@/utils/notaFiscalParser";
import { useState } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotaComercioCardProps {
  nota: NotaComercio;
  index: number;
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value || value === "R$ 0,00") return null;
  return (
    <div className="flex items-start justify-between gap-2 py-1">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className={`text-[11px] font-medium text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-3 first:mt-0">
      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: color + "15" }}>
        <Icon className="w-3 h-3" style={{ color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{title}</span>
    </div>
  );
}

export function NotaComercioCard({ nota, index }: NotaComercioCardProps) {
  const [copied, setCopied] = useState(false);
  const [showItens, setShowItens] = useState(false);
  const accentColor = "hsl(var(--orange))";

  const copyToClipboard = () => {
    const text = [
      `NF-e Nº ${nota.numero} | Série ${nota.serie}`,
      `Chave: ${nota.chaveAcesso}`,
      `Data: ${formatData(nota.dataEmissao)}`,
      `Emitente: ${nota.emitente.razaoSocial} - ${nota.emitente.cnpj}`,
      `Destinatário: ${nota.destinatario.razaoSocial} - ${nota.destinatario.cpfCnpj}`,
      `Nat. Operação: ${nota.naturezaOperacao}`,
      `Valor Total: ${formatValor(nota.totais.valorTotal)}`,
      `Itens: ${nota.itens.length}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Dados copiados!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 200, damping: 20 }}
      className="glass rounded-2xl overflow-hidden group relative"
    >
      {/* Top accent line */}
      <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
      
      {/* Ambient glow */}
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none" style={{ background: accentColor }} />

      <div className="p-5 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: accentColor + "15", border: `1px solid ${accentColor}30` }}>
              <Package className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">NF-e Nº {nota.numero}</h3>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0" style={{ borderColor: accentColor + "40", color: accentColor }}>
                  {nota.tipoOperacao}
                </Badge>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                  Série {nota.serie}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatData(nota.dataEmissao)}
                <span className="mx-1">•</span>
                {nota.naturezaOperacao}
              </p>
            </div>
          </div>
          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
            title="Copiar dados"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>

        {/* Chave de Acesso */}
        {nota.chaveAcesso && (
          <div className="mb-3 p-2 rounded-lg bg-foreground/[0.03] border border-foreground/5">
            <span className="text-[10px] text-muted-foreground">Chave de Acesso</span>
            <p className="text-[11px] font-mono break-all">{nota.chaveAcesso}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Emitente */}
          <div className="space-y-0.5">
            <SectionTitle icon={Building2} title="Emitente" color={accentColor} />
            <InfoRow label="Razão Social" value={nota.emitente.razaoSocial} />
            <InfoRow label="CNPJ" value={nota.emitente.cnpj} mono />
            {nota.emitente.nomeFantasia && <InfoRow label="Fantasia" value={nota.emitente.nomeFantasia} />}
            <InfoRow label="IE" value={nota.emitente.inscricaoEstadual} mono />
            <InfoRow label="Município/UF" value={`${nota.emitente.municipio}/${nota.emitente.uf}`} />
          </div>

          {/* Destinatário */}
          <div className="space-y-0.5">
            <SectionTitle icon={User} title="Destinatário" color="hsl(var(--blue))" />
            <InfoRow label="Razão Social" value={nota.destinatario.razaoSocial} />
            <InfoRow label="CPF/CNPJ" value={nota.destinatario.cpfCnpj} mono />
            {nota.destinatario.inscricaoEstadual && <InfoRow label="IE" value={nota.destinatario.inscricaoEstadual} mono />}
            <InfoRow label="Município/UF" value={`${nota.destinatario.municipio}/${nota.destinatario.uf}`} />
          </div>
        </div>

        {/* Itens */}
        <div className="mt-3">
          <button
            onClick={() => setShowItens(!showItens)}
            className="flex items-center gap-2 w-full group/itens"
          >
            <SectionTitle icon={Package} title={`Itens (${nota.itens.length})`} color="hsl(var(--cyan))" />
            <div className="flex-1" />
            {showItens ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          
          {showItens && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1.5">
                  {nota.itens.map((item) => (
                    <div key={item.numero} className="p-2.5 rounded-xl bg-foreground/[0.03] border border-foreground/5">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">#{item.numero}</span>
                          <span className="text-[11px] font-medium truncate">{item.descricao}</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold shrink-0" style={{ color: accentColor }}>
                          {formatValor(item.valorTotal)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                        {item.codigo && <span>Cód: {item.codigo}</span>}
                        {item.ncm && <span>NCM: {item.ncm}</span>}
                        {item.cfop && <span>CFOP: {item.cfop}</span>}
                        <span>{item.quantidade} {item.unidade} × {formatValor(item.valorUnitario)}</span>
                        {item.icmsAliquota && <span>ICMS: {item.icmsAliquota}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </div>

        {/* Totais */}
        <div className="mt-3">
          <SectionTitle icon={DollarSign} title="Totais" color="hsl(var(--yellow))" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5">
            <InfoRow label="Produtos" value={formatValor(nota.totais.valorProdutos)} mono />
            <InfoRow label="ICMS" value={formatValor(nota.totais.valorICMS)} mono />
            <InfoRow label="IPI" value={formatValor(nota.totais.valorIPI)} mono />
            <InfoRow label="Frete" value={formatValor(nota.totais.valorFrete)} mono />
            <InfoRow label="Desconto" value={formatValor(nota.totais.valorDesconto)} mono />
            <InfoRow label="Outras Desp." value={formatValor(nota.totais.outrasDespesas)} mono />
          </div>
        </div>

        {/* Transporte */}
        {nota.transporte.transportadora && (
          <div className="mt-3">
            <SectionTitle icon={Truck} title="Transporte" color="hsl(270 80% 60%)" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <InfoRow label="Modalidade" value={nota.transporte.modalidade} />
              <InfoRow label="Transportadora" value={nota.transporte.transportadora} />
              <InfoRow label="Volumes" value={nota.transporte.volumes} />
              <InfoRow label="Peso Bruto" value={nota.transporte.pesoBruto ? `${nota.transporte.pesoBruto} kg` : ""} />
            </div>
          </div>
        )}

        {/* Info Adicionais */}
        {nota.informacoesAdicionais && (
          <div className="mt-3">
            <SectionTitle icon={FileText} title="Informações Adicionais" color="hsl(var(--muted-foreground))" />
            <div className="p-2.5 rounded-xl bg-foreground/[0.03] border border-foreground/5 text-[10px] text-muted-foreground leading-relaxed max-h-20 overflow-y-auto whitespace-pre-wrap">
              {nota.informacoesAdicionais}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-foreground/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {nota.protocolo && (
              <span className="text-[10px] font-mono text-muted-foreground">
                Protocolo: {nota.protocolo}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground">Valor Total</span>
            <p className="text-lg font-bold font-mono" style={{ color: accentColor }}>
              {formatValor(nota.totais.valorTotal)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
