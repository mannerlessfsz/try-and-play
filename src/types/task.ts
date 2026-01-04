export interface Empresa {
  id: string;
  nome: string;
  cnpj?: string;
  email?: string;
}

export interface TarefaArquivo {
  id: string;
  nome: string;
  tamanho: number;
  tipo: string;
  url?: string;
  dataUpload?: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  empresaId: string;
  prioridade: "baixa" | "media" | "alta" | "urgente";
  status: "pendente" | "em_andamento" | "concluida";
  dataVencimento?: string;
  progresso?: number;
  responsavel?: string;
  criadoEm?: string;
  arquivos?: TarefaArquivo[];
}

export interface Atividade {
  id: string;
  tipo: "criacao" | "conclusao" | "comentario" | "edicao";
  descricao: string;
  data?: string;
  timestamp?: string;
  usuario?: string;
  modulo?: string;
  empresaId?: string;
}

export const prioridadeColors = {
  baixa: "bg-green-500/20 text-green-300 border-green-500/30",
  media: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  alta: "bg-red-500/20 text-red-300 border-red-500/30",
  urgente: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

export const statusColors = {
  pendente: "bg-gray-500/20 text-gray-300",
  em_andamento: "bg-blue-500/20 text-blue-300",
  concluida: "bg-green-500/20 text-green-300",
};
