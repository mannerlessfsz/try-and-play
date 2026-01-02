import jsPDF from "jspdf";
import { Orcamento, OrcamentoItem } from "@/hooks/useOrcamentos";

interface EmpresaInfo {
  nome: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  logo_url?: string | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("pt-BR");
};

// Helper to load image as base64
const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export async function generateOrcamentoPdf(
  orcamento: Orcamento & { itens?: OrcamentoItem[] },
  empresa: EmpresaInfo
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const primaryColor: [number, number, number] = [124, 58, 237]; // Purple
  const darkColor: [number, number, number] = [30, 30, 35];
  const grayColor: [number, number, number] = [120, 120, 130];
  const lightGray: [number, number, number] = [245, 245, 250];

  // ============ HEADER ============
  // Purple bar at top
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, "F");

  // Try to load and add logo
  let logoXOffset = 0;
  if (empresa.logo_url) {
    try {
      const logoBase64 = await loadImageAsBase64(empresa.logo_url);
      if (logoBase64) {
        // Add logo on the left side of header
        doc.addImage(logoBase64, 'PNG', margin, 5, 25, 25);
        logoXOffset = 30; // Offset company name to the right
      }
    } catch (e) {
      console.warn("Could not load logo:", e);
    }
  }

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(empresa.nome.toUpperCase(), margin + logoXOffset, 22);

  // Company info on header right
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let headerRightY = 14;
  if (empresa.cnpj) {
    doc.text(`CNPJ: ${empresa.cnpj}`, pageWidth - margin, headerRightY, { align: "right" });
    headerRightY += 5;
  }
  if (empresa.email) {
    doc.text(empresa.email, pageWidth - margin, headerRightY, { align: "right" });
    headerRightY += 5;
  }
  if (empresa.telefone) {
    doc.text(empresa.telefone, pageWidth - margin, headerRightY, { align: "right" });
  }

  y = 50;

  // ============ ORÇAMENTO TITLE ============
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, contentWidth, 25, 3, 3, "F");

  doc.setTextColor(...primaryColor);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ORÇAMENTO DE SERVIÇOS", margin + 8, y + 11);

  doc.setTextColor(...darkColor);
  doc.setFontSize(12);
  doc.text(`Nº ${orcamento.numero || "-"}`, margin + 8, y + 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text(`Data: ${formatDate(orcamento.data_orcamento)}`, pageWidth - margin - 8, y + 11, { align: "right" });
  if (orcamento.data_validade) {
    doc.text(`Validade: ${formatDate(orcamento.data_validade)}`, pageWidth - margin - 8, y + 20, { align: "right" });
  }

  y += 35;

  // ============ CLIENT INFO ============
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, contentWidth, orcamento.cliente ? 35 : 20, 3, 3, "F");

  doc.setTextColor(...primaryColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", margin + 8, y + 10);

  doc.setTextColor(...darkColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  if (orcamento.cliente) {
    doc.text(orcamento.cliente.nome, margin + 8, y + 20);
    if (orcamento.cliente.cpf_cnpj) {
      doc.setFontSize(9);
      doc.setTextColor(...grayColor);
      doc.text(`CPF/CNPJ: ${orcamento.cliente.cpf_cnpj}`, margin + 8, y + 28);
    }
    y += 45;
  } else {
    doc.text("Não especificado", margin + 8, y + 20);
    y += 30;
  }

  // ============ DESCRIÇÃO / TÍTULO ============
  if (orcamento.titulo || orcamento.descricao) {
    doc.setFillColor(...lightGray);
    const descHeight = orcamento.descricao ? 30 : 20;
    doc.roundedRect(margin, y, contentWidth, descHeight, 3, 3, "F");

    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIÇÃO", margin + 8, y + 10);

    doc.setTextColor(...darkColor);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(orcamento.titulo, margin + 8, y + 20);

    if (orcamento.descricao) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...grayColor);
      const splitDesc = doc.splitTextToSize(orcamento.descricao, contentWidth - 16);
      doc.text(splitDesc.slice(0, 2), margin + 8, y + 28);
    }

    y += descHeight + 10;
  }

  // ============ ITEMS TABLE ============
  const itens = orcamento.itens || [];

  if (itens.length > 0) {
    // Table header
    doc.setFillColor(...primaryColor);
    doc.rect(margin, y, contentWidth, 10, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    const colX = {
      desc: margin + 5,
      qtd: margin + contentWidth * 0.55,
      unit: margin + contentWidth * 0.68,
      total: pageWidth - margin - 5,
    };

    doc.text("DESCRIÇÃO", colX.desc, y + 7);
    doc.text("QTD", colX.qtd, y + 7);
    doc.text("VALOR UNIT.", colX.unit, y + 7);
    doc.text("TOTAL", colX.total, y + 7, { align: "right" });

    y += 10;

    // Table rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    itens.forEach((item, index) => {
      const rowHeight = 10;
      const isEven = index % 2 === 0;

      if (isEven) {
        doc.setFillColor(250, 250, 255);
        doc.rect(margin, y, contentWidth, rowHeight, "F");
      }

      doc.setTextColor(...darkColor);
      const truncatedDesc = item.descricao.length > 50 
        ? item.descricao.substring(0, 50) + "..." 
        : item.descricao;
      doc.text(truncatedDesc, colX.desc, y + 7);
      doc.text(`${item.quantidade} ${item.unidade || "UN"}`, colX.qtd, y + 7);
      doc.text(formatCurrency(item.valor_unitario), colX.unit, y + 7);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(item.total), colX.total, y + 7, { align: "right" });
      doc.setFont("helvetica", "normal");

      y += rowHeight;

      // Check page break
      if (y > 260) {
        doc.addPage();
        y = margin;
      }
    });

    // Subtotal row
    y += 3;
    doc.setFillColor(...lightGray);
    doc.rect(margin, y, contentWidth, 12, "F");

    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SUBTOTAL", margin + contentWidth * 0.55, y + 9);
    doc.text(formatCurrency(orcamento.subtotal || 0), colX.total, y + 9, { align: "right" });

    y += 15;

    // Discount if any
    if (orcamento.desconto_valor && orcamento.desconto_valor > 0) {
      doc.setTextColor(...grayColor);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Desconto: ${formatCurrency(orcamento.desconto_valor)}`, colX.total, y, { align: "right" });
      y += 8;
    }

    // TOTAL
    doc.setFillColor(...primaryColor);
    doc.roundedRect(margin + contentWidth * 0.5, y, contentWidth * 0.5, 16, 3, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL", margin + contentWidth * 0.55, y + 11);
    doc.setFontSize(14);
    doc.text(formatCurrency(orcamento.total || 0), pageWidth - margin - 8, y + 11, { align: "right" });

    y += 25;
  }

  // ============ CONDIÇÃO DE PAGAMENTO ============
  if (orcamento.condicao_pagamento) {
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, y, contentWidth, 20, 3, 3, "F");

    doc.setTextColor(...primaryColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("CONDIÇÃO DE PAGAMENTO", margin + 8, y + 9);

    doc.setTextColor(...darkColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(orcamento.condicao_pagamento, margin + 8, y + 17);

    y += 28;
  }

  // ============ OBSERVAÇÕES ============
  if (orcamento.observacoes) {
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, y, contentWidth, 25, 3, 3, "F");

    doc.setTextColor(...primaryColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÕES", margin + 8, y + 9);

    doc.setTextColor(...grayColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const splitObs = doc.splitTextToSize(orcamento.observacoes, contentWidth - 16);
    doc.text(splitObs.slice(0, 3), margin + 8, y + 17);

    y += 33;
  }

  // ============ FOOTER ============
  const footerY = doc.internal.pageSize.getHeight() - 20;

  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setTextColor(...grayColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Este orçamento é válido pelos termos e prazos descritos acima.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );
  doc.text(
    `Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
    pageWidth / 2,
    footerY + 5,
    { align: "center" }
  );

  // Save/Download
  const fileName = `Orcamento_${orcamento.numero || orcamento.id.slice(0, 8)}_${orcamento.titulo.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20)}.pdf`;
  doc.save(fileName);
}
