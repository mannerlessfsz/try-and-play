import { motion } from "framer-motion";
import { Building2, User, FileText, DollarSign, Hash, MapPin, Mail, Calendar, Shield, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NotaServico, formatValor, formatData } from "@/utils/notaFiscalParser";
import { useState } from "react";
import { toast } from "sonner";

interface NotaServicoCardProps {
  nota: NotaServico;
  index: number;
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value) return null;
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

export function NotaServicoCard({ nota, index }: NotaServicoCardProps) {
  const [copied, setCopied] = useState(false);
  const accentColor = "hsl(var(--cyan))";

  const copyToClipboard = () => {
    const text = [
      `NFS-e Nº ${nota.numero}`,
      `Data: ${formatData(nota.dataEmissao)}`,
      `Prestador: ${nota.prestador.razaoSocial} - ${nota.prestador.cnpj}`,
      `Tomador: ${nota.tomador.razaoSocial} - ${nota.tomador.cpfCnpj}`,
      `Serviço: ${nota.servico.discriminacao}`,
      `Valor: ${formatValor(nota.servico.valorServicos)}`,
      `ISS: ${formatValor(nota.servico.valorISS)}`,
      `Líquido: ${formatValor(nota.servico.valorLiquido)}`,
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
              <FileText className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">NFS-e Nº {nota.numero}</h3>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0" style={{ borderColor: accentColor + "40", color: accentColor }}>
                  Serviço
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatData(nota.dataEmissao)}
                {nota.codigoVerificacao && (
                  <span className="ml-2 font-mono text-[10px]">Cód: {nota.codigoVerificacao}</span>
                )}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Prestador */}
          <div className="space-y-0.5">
            <SectionTitle icon={Building2} title="Prestador" color={accentColor} />
            <InfoRow label="Razão Social" value={nota.prestador.razaoSocial} />
            <InfoRow label="CNPJ" value={nota.prestador.cnpj} mono />
            {nota.prestador.nomeFantasia && <InfoRow label="Fantasia" value={nota.prestador.nomeFantasia} />}
            <InfoRow label="Insc. Municipal" value={nota.prestador.inscricaoMunicipal} mono />
            {nota.prestador.municipio && <InfoRow label="Município/UF" value={`${nota.prestador.municipio}/${nota.prestador.uf}`} />}
          </div>

          {/* Tomador */}
          <div className="space-y-0.5">
            <SectionTitle icon={User} title="Tomador" color="hsl(var(--blue))" />
            <InfoRow label="Razão Social" value={nota.tomador.razaoSocial} />
            <InfoRow label="CPF/CNPJ" value={nota.tomador.cpfCnpj} mono />
            {nota.tomador.municipio && <InfoRow label="Município/UF" value={`${nota.tomador.municipio}/${nota.tomador.uf}`} />}
            {nota.tomador.email && <InfoRow label="Email" value={nota.tomador.email} />}
          </div>
        </div>

        {/* Serviço */}
        <div className="mt-3">
          <SectionTitle icon={FileText} title="Descrição do Serviço" color="hsl(var(--orange))" />
          <div className="p-3 rounded-xl bg-foreground/[0.03] border border-foreground/5 text-[11px] leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto">
            {nota.servico.discriminacao || "Sem descrição"}
          </div>
          {nota.servico.codigoServico && (
            <InfoRow label="Código do Serviço" value={nota.servico.codigoServico} />
          )}
        </div>

        {/* Valores */}
        <div className="mt-3">
          <SectionTitle icon={DollarSign} title="Valores e Tributos" color="hsl(var(--yellow))" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5">
            <InfoRow label="Valor Serviços" value={formatValor(nota.servico.valorServicos)} mono />
            <InfoRow label="Base Cálculo" value={formatValor(nota.servico.baseCalculo)} mono />
            <InfoRow label="Alíquota ISS" value={nota.servico.aliquotaISS ? `${(parseFloat(nota.servico.aliquotaISS) * 100).toFixed(2)}%` : ""} />
            <InfoRow label="ISS" value={formatValor(nota.servico.valorISS)} mono />
            <InfoRow label="IR" value={formatValor(nota.servico.valorIR)} mono />
            <InfoRow label="PIS" value={formatValor(nota.servico.valorPIS)} mono />
            <InfoRow label="COFINS" value={formatValor(nota.servico.valorCOFINS)} mono />
            <InfoRow label="CSLL" value={formatValor(nota.servico.valorCSLL)} mono />
            <InfoRow label="INSS" value={formatValor(nota.servico.valorINSS)} mono />
          </div>
        </div>

        {/* Footer - Valor Líquido */}
        <div className="mt-4 pt-3 border-t border-foreground/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {nota.optanteSimplesNacional === "Sim" && (
              <Badge variant="outline" className="text-[9px]">
                <Shield className="w-3 h-3 mr-1" /> Simples Nacional
              </Badge>
            )}
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground">Valor Líquido</span>
            <p className="text-lg font-bold font-mono" style={{ color: accentColor }}>
              {formatValor(nota.servico.valorLiquido || nota.servico.valorServicos)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
