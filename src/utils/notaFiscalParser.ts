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
  // Try direct querySelector first
  const el = parent.querySelector(selector);
  if (el?.textContent?.trim()) return el.textContent.trim();
  // Fallback: case-insensitive search through children (handles namespaced XML)
  return getTextContentByLocalName(parent, selector);
}

function getTextContentByLocalName(parent: Element | Document | null, localName: string): string {
  if (!parent) return "";
  const elements = parent.getElementsByTagName("*");
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.localName.toLowerCase() === localName.toLowerCase()) {
      return el.textContent?.trim() || "";
    }
  }
  return "";
}

function findElementByLocalName(parent: Element | Document | null, ...names: string[]): Element | null {
  if (!parent) return null;
  const elements = parent.getElementsByTagName("*");
  for (const name of names) {
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].localName.toLowerCase() === name.toLowerCase()) {
        return elements[i];
      }
    }
  }
  return null;
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
  
  // Check for XML parse errors
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    console.warn("[parseNFSeXml] XML parse error:", parseError.textContent);
    return null;
  }

  // Try various NFS-e XML schemas (different municipalities use different root elements)
  const nfse = doc.querySelector("Nfse") || 
               doc.querySelector("CompNfse") || 
               doc.querySelector("NFSe") ||
               doc.querySelector("InfNfse") ||
               doc.querySelector("tcCompNfse") ||
               doc.querySelector("ListaNfse") ||
               doc.querySelector("ConsultarNfseResposta") ||
               doc.documentElement;

  if (!nfse) return null;

  // Check if it's actually a NFS-e - be more permissive, use case-insensitive local name search
  const hasNfseElements = findElementByLocalName(doc, "InfNfse", "infNFSe", "infnfse") || 
                          findElementByLocalName(doc, "Servico", "servico") || 
                          findElementByLocalName(doc, "PrestadorServico", "Prestador", "DadosPrestador", "prestador") ||
                          findElementByLocalName(doc, "ValorServicos", "valorServicos") ||
                          findElementByLocalName(doc, "Discriminacao", "discriminacao") ||
                          findElementByLocalName(doc, "xLocEmi"); // SPED Nacional
  
  if (!hasNfseElements) {
    console.warn("[parseNFSeXml] No NFS-e elements found in XML. Root element:", doc.documentElement?.tagName);
    return null;
  }

  // Use case-insensitive element finders for all lookups
  const infNfse = findElementByLocalName(doc, "InfNfse", "infNFSe", "infnfse") || nfse;
  const prestador = findElementByLocalName(doc, "PrestadorServico", "Prestador", "DadosPrestador", "prestador", "emit");
  const tomador = findElementByLocalName(doc, "TomadorServico", "Tomador", "tomador", "dest");
  const servico = findElementByLocalName(doc, "Servico", "servico");
  const valores = findElementByLocalName(servico || doc as any, "Valores", "valores") || 
                  findElementByLocalName(doc, "Valores", "valores");

  const endPrestador = findElementByLocalName(prestador, "Endereco", "endereco", "end");
  const endTomador = findElementByLocalName(tomador, "Endereco", "endereco", "end");
  const idPrestador = findElementByLocalName(prestador, "IdentificacaoPrestador", "identificacaoPrestador") || prestador;
  const idTomador = findElementByLocalName(tomador, "IdentificacaoTomador", "identificacaoTomador", "CpfCnpj", "cpfCnpj") || 
                    findElementByLocalName(tomador, "CpfCnpj", "cpfCnpj");

  // SPED Nacional uses different field names
  const optanteSN = getTextContentByLocalName(infNfse || doc.documentElement, "OptanteSimplesNacional") || 
                    getTextContentByLocalName(infNfse || doc.documentElement, "optanteSimplesNacional") ||
                    getTextContentByLocalName(doc, "regTrib");

  // Try multiple field name patterns for each value
  const getVal = (el: Element | Document | null, ...names: string[]) => {
    for (const n of names) {
      const v = getTextContentByLocalName(el, n);
      if (v) return v;
    }
    return "";
  };

  const numero = getVal(infNfse, "Numero", "numero", "nNFSe") || 
                 getVal(doc, "Numero", "numero", "nNFSe");
  
  return {
    tipo: "servico",
    numero,
    serie: getVal(infNfse, "Serie", "serie") || "U",
    dataEmissao: (getVal(infNfse, "DataEmissao", "dataEmissao", "dhEmi", "dEmi") || 
                  getVal(doc, "DataEmissao", "dataEmissao", "dhEmi", "dEmi"))?.split("T")[0] || "",
    prestador: {
      cnpj: formatCnpj(getVal(idPrestador, "Cnpj", "CNPJ", "cnpj")),
      razaoSocial: getVal(prestador, "RazaoSocial", "razaoSocial", "xRazaoSocial", "xNome"),
      nomeFantasia: getVal(prestador, "NomeFantasia", "nomeFantasia", "xFant"),
      endereco: getVal(endPrestador, "Endereco", "Logradouro", "endereco", "xLgr"),
      municipio: getVal(endPrestador, "Cidade", "CodigoMunicipio", "cidade", "xMun", "cMun"),
      uf: getVal(endPrestador, "Uf", "UF", "uf"),
      inscricaoMunicipal: getVal(idPrestador, "InscricaoMunicipal", "inscricaoMunicipal", "IM"),
    },
    tomador: {
      cpfCnpj: formatCpfCnpj(
        getVal(idTomador, "Cnpj", "CNPJ", "cnpj") || 
        getVal(idTomador, "Cpf", "CPF", "cpf")
      ),
      razaoSocial: getVal(tomador, "RazaoSocial", "razaoSocial", "xRazaoSocial", "xNome"),
      endereco: getVal(endTomador, "Endereco", "Logradouro", "endereco", "xLgr"),
      municipio: getVal(endTomador, "Cidade", "CodigoMunicipio", "cidade", "xMun", "cMun"),
      uf: getVal(endTomador, "Uf", "UF", "uf"),
      email: getVal(tomador, "Email", "email"),
    },
    servico: {
      discriminacao: getVal(servico || doc as any, "Discriminacao", "discriminacao", "xDescServ"),
      codigoServico: getVal(servico || doc as any, "ItemListaServico", "itemListaServico", "CodigoTributacaoMunicipio", "codigoTributacaoMunicipio", "cServ"),
      aliquotaISS: getVal(valores, "Aliquota", "aliquota", "pAliqAplic"),
      valorServicos: getVal(valores, "ValorServicos", "valorServicos", "vServPrest", "vLiq"),
      valorDeducoes: getVal(valores, "ValorDeducoes", "valorDeducoes", "vDescIncond"),
      baseCalculo: getVal(valores, "BaseCalculo", "baseCalculo", "vBC") || getVal(valores, "ValorServicos", "valorServicos", "vServPrest"),
      valorISS: getVal(valores, "ValorIss", "ValorISS", "valorIss", "vISS"),
      valorIR: getVal(valores, "ValorIr", "ValorIR", "valorIr", "vRetIR"),
      valorPIS: getVal(valores, "ValorPis", "ValorPIS", "valorPis", "vRetPIS"),
      valorCOFINS: getVal(valores, "ValorCofins", "ValorCOFINS", "valorCofins", "vRetCOFINS"),
      valorCSLL: getVal(valores, "ValorCsll", "ValorCSLL", "valorCsll", "vRetCSLL"),
      valorINSS: getVal(valores, "ValorInss", "ValorINSS", "valorInss", "vRetINSS"),
      valorLiquido: getVal(valores, "ValorLiquidoNfse", "ValorLiquido", "valorLiquidoNfse", "valorLiquido", "vLiq"),
    },
    codigoVerificacao: getVal(infNfse, "CodigoVerificacao", "codigoVerificacao", "cLocIncworking", "chSubstNFSe") || 
                       getVal(doc, "CodigoVerificacao", "codigoVerificacao"),
    naturezaOperacao: getVal(infNfse, "NaturezaOperacao", "naturezaOperacao") || 
                      getVal(doc, "NaturezaOperacao", "naturezaOperacao"),
    regimeEspecial: getVal(infNfse, "RegimeEspecialTributacao", "regimeEspecialTributacao") || "",
    optanteSimplesNacional: optanteSN === "1" || optanteSN?.toLowerCase() === "sim" ? "Sim" : "Não",
    status: getVal(infNfse, "Situacao", "situacao", "nfseStatus") || "Emitida",
  };
}

// Also add a dedicated SPED Nacional parser as additional fallback
export function parseNFSeSpedNacional(xmlContent: string): NotaServico | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "text/xml");
  
  // Check if it's SPED Nacional format (has xmlns with sped.fazenda.gov.br)
  const root = doc.documentElement;
  const ns = root?.namespaceURI || "";
  const isSped = ns.includes("sped.fazenda.gov.br") || root?.tagName === "NFSe";
  
  if (!isSped) return null;
  
  // For SPED Nacional, use getElementsByTagName with wildcard since namespace-qualified selectors don't work
  const allElements = doc.getElementsByTagName("*");
  
  const findEl = (...names: string[]): Element | null => {
    for (const name of names) {
      for (let i = 0; i < allElements.length; i++) {
        if (allElements[i].localName === name) return allElements[i];
      }
    }
    return null;
  };
  
  const getText = (...names: string[]): string => {
    for (const name of names) {
      for (let i = 0; i < allElements.length; i++) {
        if (allElements[i].localName === name) {
          return allElements[i].textContent?.trim() || "";
        }
      }
    }
    return "";
  };

  // Get all text values within a parent element
  const getTextIn = (parent: Element | null, ...names: string[]): string => {
    if (!parent) return "";
    const children = parent.getElementsByTagName("*");
    for (const name of names) {
      for (let i = 0; i < children.length; i++) {
        if (children[i].localName === name) {
          return children[i].textContent?.trim() || "";
        }
      }
    }
    return "";
  };

  const prestEl = findEl("prest", "Prestador", "PrestadorServico");
  const tomEl = findEl("toma", "Tomador", "TomadorServico");
  const servEl = findEl("serv", "Servico");
  const valoresEl = findEl("valores", "Valores");
  const tribEl = findEl("trib");
  const endPrestEl = findEl("endNac") || (prestEl ? findEl("end") : null);
  
  const numero = getText("nNFSe", "Numero", "numero");
  if (!numero && !getText("vServPrest", "ValorServicos")) return null;

  const aliquota = getTextIn(tribEl, "pAliqAplic", "Aliquota", "aliquota") || 
                   getTextIn(valoresEl, "pAliqAplic", "Aliquota");

  return {
    tipo: "servico",
    numero: numero || getText("chSubstNFSe") || "S/N",
    serie: getText("serie", "Serie") || "U",
    dataEmissao: (getText("dhEmi", "DataEmissao", "dataEmissao") || "").split("T")[0],
    prestador: {
      cnpj: formatCnpj(getTextIn(prestEl, "CNPJ", "cnpj") || getText("CNPJ")),
      razaoSocial: getTextIn(prestEl, "xNome", "RazaoSocial", "razaoSocial") || getText("xNome"),
      nomeFantasia: getTextIn(prestEl, "xFant", "NomeFantasia") || "",
      endereco: getTextIn(endPrestEl, "xLgr", "Logradouro") || "",
      municipio: getTextIn(endPrestEl, "xMun", "Cidade") || getText("xLocEmi") || "",
      uf: getTextIn(endPrestEl, "UF", "Uf") || getText("xLocEmi") ? "" : "",
      inscricaoMunicipal: getTextIn(prestEl, "IM", "InscricaoMunicipal") || getText("IM"),
    },
    tomador: {
      cpfCnpj: formatCpfCnpj(getTextIn(tomEl, "CNPJ", "cnpj", "CPF", "cpf") || ""),
      razaoSocial: getTextIn(tomEl, "xNome", "RazaoSocial") || "",
      endereco: getTextIn(tomEl, "xLgr", "Logradouro") || "",
      municipio: getTextIn(tomEl, "xMun", "Cidade") || "",
      uf: getTextIn(tomEl, "UF", "Uf") || "",
      email: getTextIn(tomEl, "email", "Email") || "",
    },
    servico: {
      discriminacao: getTextIn(servEl, "xDescServ", "Discriminacao", "discriminacao") || getText("xDescServ"),
      codigoServico: getTextIn(servEl, "cServ", "ItemListaServico") || getText("cServ"),
      aliquotaISS: aliquota,
      valorServicos: getTextIn(valoresEl, "vServPrest", "vReceb", "ValorServicos") || getText("vServPrest"),
      valorDeducoes: getTextIn(valoresEl, "vDescIncond", "vDescCondworking", "ValorDeducoes") || "0",
      baseCalculo: getTextIn(tribEl, "vBC", "BaseCalculo") || getTextIn(valoresEl, "vServPrest") || "0",
      valorISS: getTextIn(tribEl, "vISS", "ValorIss") || getText("vISS") || "0",
      valorIR: getTextIn(tribEl, "vRetIR") || getText("vRetIR") || "0",
      valorPIS: getTextIn(tribEl, "vRetPIS") || getText("vRetPIS") || "0",
      valorCOFINS: getTextIn(tribEl, "vRetCOFINS") || getText("vRetCOFINS") || "0",
      valorCSLL: getTextIn(tribEl, "vRetCSLL") || getText("vRetCSLL") || "0",
      valorINSS: getTextIn(tribEl, "vRetINSS") || getText("vRetINSS") || "0",
      valorLiquido: getTextIn(valoresEl, "vLiq", "vReceb", "ValorLiquido") || getText("vLiq") || getText("vReceb") || "0",
    },
    codigoVerificacao: getText("chSubstNFSe", "CodigoVerificacao") || "",
    naturezaOperacao: getText("natOp", "NaturezaOperacao") || "",
    regimeEspecial: "",
    optanteSimplesNacional: getText("regTrib") === "4" || getText("OptanteSimplesNacional") === "1" ? "Sim" : "Não",
    status: "Emitida",
  };
}

export function detectAndParseXml(xmlContent: string): NotaFiscal | null {
  // Try NF-e first (most common)
  const nfe = parseNFeXml(xmlContent);
  if (nfe && nfe.itens.length > 0) return nfe;

  // Try SPED Nacional NFS-e (newer format)
  const sped = parseNFSeSpedNacional(xmlContent);
  if (sped && (sped.numero || sped.servico.valorServicos)) return sped;

  // Try standard NFS-e
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
