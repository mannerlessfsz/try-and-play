/**
 * Parser de Notas Fiscais - Serviço (NFS-e) e Comércio (NF-e)
 */

export interface NotaServico {
  tipo: "servico";
  numero: string;
  serie: string;
  dataEmissao: string;
  prestador: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia: string;
    endereco: string;
    municipio: string;
    uf: string;
    inscricaoMunicipal: string;
  };
  tomador: {
    cpfCnpj: string;
    razaoSocial: string;
    endereco: string;
    municipio: string;
    uf: string;
    email: string;
  };
  servico: {
    discriminacao: string;
    codigoServico: string;
    aliquotaISS: string;
    valorServicos: string;
    valorDeducoes: string;
    baseCalculo: string;
    valorISS: string;
    valorIR: string;
    valorPIS: string;
    valorCOFINS: string;
    valorCSLL: string;
    valorINSS: string;
    valorLiquido: string;
  };
  codigoVerificacao: string;
  naturezaOperacao: string;
  regimeEspecial: string;
  optanteSimplesNacional: string;
  status: string;
}

export interface ItemComercio {
  numero: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: string;
  valorUnitario: string;
  valorTotal: string;
  icmsBase: string;
  icmsAliquota: string;
  icmsValor: string;
  ipiAliquota: string;
  ipiValor: string;
}

export interface NotaComercio {
  tipo: "comercio";
  numero: string;
  serie: string;
  chaveAcesso: string;
  dataEmissao: string;
  dataSaida: string;
  naturezaOperacao: string;
  tipoOperacao: string;
  emitente: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia: string;
    inscricaoEstadual: string;
    endereco: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  destinatario: {
    cpfCnpj: string;
    razaoSocial: string;
    inscricaoEstadual: string;
    endereco: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  itens: ItemComercio[];
  totais: {
    baseCalculoICMS: string;
    valorICMS: string;
    valorProdutos: string;
    valorFrete: string;
    valorSeguro: string;
    valorDesconto: string;
    valorIPI: string;
    outrasDespesas: string;
    valorTotal: string;
  };
  transporte: {
    modalidade: string;
    transportadora: string;
    cnpjTransportadora: string;
    volumes: string;
    pesoLiquido: string;
    pesoBruto: string;
  };
  informacoesAdicionais: string;
  protocolo: string;
}

export type NotaFiscal = NotaServico | NotaComercio;

function getTextContent(parent: Element | Document | null, selector: string): string {
  if (!parent) return "";
  const el = parent.querySelector(selector);
  return el?.textContent?.trim() || "";
}

function formatCnpj(value: string): string {
  if (!value || value.length !== 14) return value;
  return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatCpfCnpj(value: string): string {
  if (!value) return "";
  if (value.length === 11) return value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  if (value.length === 14) return formatCnpj(value);
  return value;
}

export function parseNFeXml(xmlContent: string): NotaComercio | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "text/xml");
  
  const nfe = doc.querySelector("nfeProc") || doc.querySelector("NFe") || doc.querySelector("nfe");
  if (!nfe) return null;

  const ide = doc.querySelector("ide");
  const emit = doc.querySelector("emit");
  const dest = doc.querySelector("dest");
  const total = doc.querySelector("total ICMSTot") || doc.querySelector("ICMSTot");
  const transp = doc.querySelector("transp");
  const infAdic = doc.querySelector("infAdic");
  const protNFe = doc.querySelector("protNFe infProt");

  // Parse items
  const dets = doc.querySelectorAll("det");
  const itens: ItemComercio[] = [];
  
  dets.forEach((det, index) => {
    const prod = det.querySelector("prod");
    const icms = det.querySelector("ICMS");
    const ipi = det.querySelector("IPI");
    
    // Try to find ICMS values from any ICMS sub-element
    let icmsBase = "", icmsAliq = "", icmsVal = "";
    if (icms) {
      const icmsInner = icms.querySelector("[vBC]") || icms.children[0];
      if (icmsInner) {
        icmsBase = getTextContent(icmsInner, "vBC");
        icmsAliq = getTextContent(icmsInner, "pICMS");
        icmsVal = getTextContent(icmsInner, "vICMS");
      }
    }

    itens.push({
      numero: index + 1,
      codigo: getTextContent(prod, "cProd"),
      descricao: getTextContent(prod, "xProd"),
      ncm: getTextContent(prod, "NCM"),
      cfop: getTextContent(prod, "CFOP"),
      unidade: getTextContent(prod, "uCom"),
      quantidade: getTextContent(prod, "qCom"),
      valorUnitario: getTextContent(prod, "vUnCom"),
      valorTotal: getTextContent(prod, "vProd"),
      icmsBase,
      icmsAliquota: icmsAliq,
      icmsValor: icmsVal,
      ipiAliquota: ipi ? getTextContent(ipi, "pIPI") : "",
      ipiValor: ipi ? getTextContent(ipi, "vIPI") : "",
    });
  });

  const chaveRaw = doc.querySelector("infNFe")?.getAttribute("Id") || "";
  const chaveAcesso = chaveRaw.replace(/^NFe/, "");

  // Tipo operação
  const tpNF = getTextContent(ide, "tpNF");
  const tipoOp = tpNF === "0" ? "Entrada" : tpNF === "1" ? "Saída" : tpNF;

  // Modalidade frete
  const modFrete = getTextContent(transp, "modFrete");
  const modFreteMap: Record<string, string> = {
    "0": "Por conta do emitente",
    "1": "Por conta do destinatário",
    "2": "Por conta de terceiros",
    "3": "Próprio remetente",
    "4": "Próprio destinatário",
    "9": "Sem frete",
  };

  const endEmit = emit?.querySelector("enderEmit");
  const endDest = dest?.querySelector("enderDest");

  return {
    tipo: "comercio",
    numero: getTextContent(ide, "nNF"),
    serie: getTextContent(ide, "serie"),
    chaveAcesso,
    dataEmissao: getTextContent(ide, "dhEmi")?.split("T")[0] || getTextContent(ide, "dEmi"),
    dataSaida: getTextContent(ide, "dhSaiEnt")?.split("T")[0] || getTextContent(ide, "dSaiEnt") || "",
    naturezaOperacao: getTextContent(ide, "natOp"),
    tipoOperacao: tipoOp,
    emitente: {
      cnpj: formatCnpj(getTextContent(emit, "CNPJ")),
      razaoSocial: getTextContent(emit, "xNome"),
      nomeFantasia: getTextContent(emit, "xFant"),
      inscricaoEstadual: getTextContent(emit, "IE"),
      endereco: `${getTextContent(endEmit, "xLgr")}, ${getTextContent(endEmit, "nro")}`,
      municipio: getTextContent(endEmit, "xMun"),
      uf: getTextContent(endEmit, "UF"),
      cep: getTextContent(endEmit, "CEP"),
    },
    destinatario: {
      cpfCnpj: formatCpfCnpj(getTextContent(dest, "CNPJ") || getTextContent(dest, "CPF")),
      razaoSocial: getTextContent(dest, "xNome"),
      inscricaoEstadual: getTextContent(dest, "IE") || "",
      endereco: `${getTextContent(endDest, "xLgr")}, ${getTextContent(endDest, "nro")}`,
      municipio: getTextContent(endDest, "xMun"),
      uf: getTextContent(endDest, "UF"),
      cep: getTextContent(endDest, "CEP"),
    },
    itens,
    totais: {
      baseCalculoICMS: getTextContent(total, "vBC"),
      valorICMS: getTextContent(total, "vICMS"),
      valorProdutos: getTextContent(total, "vProd"),
      valorFrete: getTextContent(total, "vFrete"),
      valorSeguro: getTextContent(total, "vSeg"),
      valorDesconto: getTextContent(total, "vDesc"),
      valorIPI: getTextContent(total, "vIPI"),
      outrasDespesas: getTextContent(total, "vOutro"),
      valorTotal: getTextContent(total, "vNF"),
    },
    transporte: {
      modalidade: modFreteMap[modFrete] || modFrete || "Sem frete",
      transportadora: getTextContent(transp, "xNome"),
      cnpjTransportadora: formatCnpj(getTextContent(transp, "CNPJ")),
      volumes: getTextContent(transp, "qVol"),
      pesoLiquido: getTextContent(transp, "pesoL"),
      pesoBruto: getTextContent(transp, "pesoB"),
    },
    informacoesAdicionais: getTextContent(infAdic, "infCpl"),
    protocolo: getTextContent(protNFe, "nProt"),
  };
}

export function parseNFSeXml(xmlContent: string): NotaServico | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "text/xml");
  
  // Try various NFS-e XML schemas
  const nfse = doc.querySelector("Nfse") || 
               doc.querySelector("CompNfse") || 
               doc.querySelector("NFSe") ||
               doc.querySelector("InfNfse") ||
               doc.querySelector("tcCompNfse") ||
               doc.documentElement;

  if (!nfse) return null;

  // Check if it's actually a NFS-e
  const hasNfseElements = doc.querySelector("InfNfse") || 
                          doc.querySelector("Servico") || 
                          doc.querySelector("PrestadorServico") ||
                          doc.querySelector("Prestador");
  
  if (!hasNfseElements) return null;

  const infNfse = doc.querySelector("InfNfse") || nfse;
  const prestador = doc.querySelector("PrestadorServico") || doc.querySelector("Prestador");
  const tomador = doc.querySelector("TomadorServico") || doc.querySelector("Tomador");
  const servico = doc.querySelector("Servico");
  const valores = servico?.querySelector("Valores") || doc.querySelector("Valores");

  const endPrestador = prestador?.querySelector("Endereco");
  const endTomador = tomador?.querySelector("Endereco");
  const idPrestador = prestador?.querySelector("IdentificacaoPrestador") || prestador;
  const idTomador = tomador?.querySelector("IdentificacaoTomador") || tomador?.querySelector("CpfCnpj");

  const optanteSN = getTextContent(infNfse, "OptanteSimplesNacional");

  return {
    tipo: "servico",
    numero: getTextContent(infNfse, "Numero"),
    serie: getTextContent(infNfse, "Serie") || "U",
    dataEmissao: getTextContent(infNfse, "DataEmissao")?.split("T")[0] || "",
    prestador: {
      cnpj: formatCnpj(getTextContent(idPrestador, "Cnpj") || getTextContent(idPrestador, "CNPJ")),
      razaoSocial: getTextContent(prestador, "RazaoSocial"),
      nomeFantasia: getTextContent(prestador, "NomeFantasia"),
      endereco: getTextContent(endPrestador, "Endereco") || getTextContent(endPrestador, "Logradouro"),
      municipio: getTextContent(endPrestador, "Cidade") || getTextContent(endPrestador, "CodigoMunicipio"),
      uf: getTextContent(endPrestador, "Uf") || getTextContent(endPrestador, "UF"),
      inscricaoMunicipal: getTextContent(idPrestador, "InscricaoMunicipal"),
    },
    tomador: {
      cpfCnpj: formatCpfCnpj(
        getTextContent(idTomador, "Cnpj") || 
        getTextContent(idTomador, "CNPJ") || 
        getTextContent(idTomador, "Cpf") || 
        getTextContent(idTomador, "CPF")
      ),
      razaoSocial: getTextContent(tomador, "RazaoSocial"),
      endereco: getTextContent(endTomador, "Endereco") || getTextContent(endTomador, "Logradouro"),
      municipio: getTextContent(endTomador, "Cidade") || getTextContent(endTomador, "CodigoMunicipio"),
      uf: getTextContent(endTomador, "Uf") || getTextContent(endTomador, "UF"),
      email: getTextContent(tomador, "Email"),
    },
    servico: {
      discriminacao: getTextContent(servico, "Discriminacao"),
      codigoServico: getTextContent(servico, "ItemListaServico") || getTextContent(servico, "CodigoTributacaoMunicipio"),
      aliquotaISS: getTextContent(valores, "Aliquota"),
      valorServicos: getTextContent(valores, "ValorServicos"),
      valorDeducoes: getTextContent(valores, "ValorDeducoes"),
      baseCalculo: getTextContent(valores, "BaseCalculo"),
      valorISS: getTextContent(valores, "ValorIss") || getTextContent(valores, "ValorISS"),
      valorIR: getTextContent(valores, "ValorIr") || getTextContent(valores, "ValorIR"),
      valorPIS: getTextContent(valores, "ValorPis") || getTextContent(valores, "ValorPIS"),
      valorCOFINS: getTextContent(valores, "ValorCofins") || getTextContent(valores, "ValorCOFINS"),
      valorCSLL: getTextContent(valores, "ValorCsll") || getTextContent(valores, "ValorCSLL"),
      valorINSS: getTextContent(valores, "ValorInss") || getTextContent(valores, "ValorINSS"),
      valorLiquido: getTextContent(valores, "ValorLiquidoNfse") || getTextContent(valores, "ValorLiquido"),
    },
    codigoVerificacao: getTextContent(infNfse, "CodigoVerificacao"),
    naturezaOperacao: getTextContent(infNfse, "NaturezaOperacao"),
    regimeEspecial: getTextContent(infNfse, "RegimeEspecialTributacao"),
    optanteSimplesNacional: optanteSN === "1" || optanteSN?.toLowerCase() === "sim" ? "Sim" : "Não",
    status: getTextContent(infNfse, "Situacao") || "Emitida",
  };
}

export function detectAndParseXml(xmlContent: string): NotaFiscal | null {
  // Try NF-e first (most common)
  const nfe = parseNFeXml(xmlContent);
  if (nfe && nfe.itens.length > 0) return nfe;

  // Try NFS-e
  const nfse = parseNFSeXml(xmlContent);
  if (nfse && nfse.numero) return nfse;

  return null;
}

export function formatValor(value: string): string {
  if (!value) return "R$ 0,00";
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatData(value: string): string {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return value;
}
