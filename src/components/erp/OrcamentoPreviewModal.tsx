import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { Orcamento, OrcamentoItem } from "@/hooks/useOrcamentos";

interface EmpresaInfo {
  nome: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  logo_url?: string | null;
}

interface OrcamentoPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: (Orcamento & { itens?: OrcamentoItem[] }) | null;
  empresa: EmpresaInfo;
  onDownload: () => void;
  isDownloading?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("pt-BR");
};

export function OrcamentoPreviewModal({
  open,
  onOpenChange,
  orcamento,
  empresa,
  onDownload,
  isDownloading,
}: OrcamentoPreviewModalProps) {
  if (!orcamento) return null;

  const itens = orcamento.itens || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 flex-row items-center justify-between border-b border-border/50">
          <DialogTitle className="text-lg">Visualização do Orçamento</DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={onDownload}
              disabled={isDownloading}
              className="bg-purple-500 hover:bg-purple-600"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Gerando..." : "Baixar PDF"}
            </Button>
          </div>
        </DialogHeader>

        {/* PDF Preview - Simulated */}
        <div className="flex-1 overflow-auto p-4 bg-muted/30">
          <div className="bg-white text-black rounded-lg shadow-lg max-w-[210mm] mx-auto">
            {/* Header */}
            <div className="bg-purple-600 text-white p-6 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                {empresa.logo_url && (
                  <img 
                    src={empresa.logo_url} 
                    alt="Logo" 
                    className="h-12 w-auto object-contain bg-white/10 rounded p-1"
                  />
                )}
                <h1 className="text-xl font-bold tracking-wide">{empresa.nome.toUpperCase()}</h1>
              </div>
              <div className="text-right text-sm opacity-90">
                {empresa.cnpj && <p>CNPJ: {empresa.cnpj}</p>}
                {empresa.email && <p>{empresa.email}</p>}
                {empresa.telefone && <p>{empresa.telefone}</p>}
              </div>
            </div>

            {/* Orçamento Title Box */}
            <div className="mx-6 mt-6 p-4 bg-gray-100 rounded-lg flex justify-between items-start">
              <div>
                <h2 className="text-purple-600 font-bold text-lg">ORÇAMENTO DE SERVIÇOS</h2>
                <p className="text-gray-800 font-medium">Nº {orcamento.numero || "-"}</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Data: {formatDate(orcamento.data_orcamento)}</p>
                {orcamento.data_validade && (
                  <p>Validade: {formatDate(orcamento.data_validade)}</p>
                )}
              </div>
            </div>

            {/* Client Info */}
            <div className="mx-6 mt-4 p-4 bg-gray-100 rounded-lg">
              <p className="text-purple-600 font-bold text-xs mb-1">CLIENTE</p>
              {orcamento.cliente ? (
                <>
                  <p className="text-gray-800 font-medium">{orcamento.cliente.nome}</p>
                  {orcamento.cliente.cpf_cnpj && (
                    <p className="text-gray-500 text-sm">CPF/CNPJ: {orcamento.cliente.cpf_cnpj}</p>
                  )}
                </>
              ) : (
                <p className="text-gray-600">Não especificado</p>
              )}
            </div>

            {/* Description */}
            {(orcamento.titulo || orcamento.descricao) && (
              <div className="mx-6 mt-4 p-4 bg-gray-100 rounded-lg">
                <p className="text-purple-600 font-bold text-xs mb-1">DESCRIÇÃO</p>
                <p className="text-gray-800 font-medium">{orcamento.titulo}</p>
                {orcamento.descricao && (
                  <p className="text-gray-500 text-sm mt-1">{orcamento.descricao}</p>
                )}
              </div>
            )}

            {/* Items Table */}
            {itens.length > 0 && (
              <div className="mx-6 mt-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-purple-600 text-white">
                      <th className="text-left p-2 rounded-tl-lg">DESCRIÇÃO</th>
                      <th className="text-center p-2">QTD</th>
                      <th className="text-right p-2">VALOR UNIT.</th>
                      <th className="text-right p-2 rounded-tr-lg">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, index) => (
                      <tr
                        key={item.id || index}
                        className={index % 2 === 0 ? "bg-purple-50" : "bg-white"}
                      >
                        <td className="p-2 text-gray-800">{item.descricao}</td>
                        <td className="p-2 text-center text-gray-600">
                          {item.quantidade} {item.unidade || "UN"}
                        </td>
                        <td className="p-2 text-right text-gray-600">
                          {formatCurrency(item.valor_unitario)}
                        </td>
                        <td className="p-2 text-right font-semibold text-gray-800">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Subtotal */}
                <div className="mt-2 p-3 bg-gray-100 rounded-lg flex justify-between">
                  <span className="font-semibold text-gray-700">SUBTOTAL</span>
                  <span className="font-bold text-gray-800">
                    {formatCurrency(orcamento.subtotal || 0)}
                  </span>
                </div>

                {/* Discount */}
                {orcamento.desconto_valor && orcamento.desconto_valor > 0 && (
                  <div className="mt-1 px-3 text-right text-gray-500 text-sm">
                    Desconto: {formatCurrency(orcamento.desconto_valor)}
                  </div>
                )}

                {/* Total */}
                <div className="mt-2 p-4 bg-purple-600 text-white rounded-lg flex justify-between items-center">
                  <span className="font-bold text-lg">TOTAL</span>
                  <span className="font-bold text-xl">
                    {formatCurrency(orcamento.total || 0)}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Condition */}
            {orcamento.condicao_pagamento && (
              <div className="mx-6 mt-4 p-4 bg-gray-100 rounded-lg">
                <p className="text-purple-600 font-bold text-xs mb-1">CONDIÇÃO DE PAGAMENTO</p>
                <p className="text-gray-800">{orcamento.condicao_pagamento}</p>
              </div>
            )}

            {/* Observations */}
            {orcamento.observacoes && (
              <div className="mx-6 mt-4 p-4 bg-gray-100 rounded-lg">
                <p className="text-purple-600 font-bold text-xs mb-1">OBSERVAÇÕES</p>
                <p className="text-gray-500 text-sm">{orcamento.observacoes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mx-6 mt-6 mb-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
              <p>Este orçamento é válido pelos termos e prazos descritos acima.</p>
              <p className="mt-1">
                Documento gerado em {new Date().toLocaleDateString("pt-BR")} às{" "}
                {new Date().toLocaleTimeString("pt-BR")}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
