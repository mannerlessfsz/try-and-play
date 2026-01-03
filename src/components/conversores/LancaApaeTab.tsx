import { useState } from "react";
import { 
  FileUp, FileDown, FileText, CheckCircle, 
  AlertTriangle, Upload, Download, Eye, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface ArquivoApae {
  id: string;
  nome: string;
  tipo: "entrada" | "saida";
  status: "pendente" | "processado" | "erro";
  registros: number;
  dataProcessamento: string | null;
}

export function LancaApaeTab() {
  const { toast } = useToast();
  const [arquivos, setArquivos] = useState<ArquivoApae[]>([
    { id: "1", nome: "APAE_DEZ_2024.txt", tipo: "entrada", status: "processado", registros: 1250, dataProcessamento: "2024-12-20" },
    { id: "2", nome: "APAE_NOV_2024.txt", tipo: "entrada", status: "processado", registros: 980, dataProcessamento: "2024-11-15" },
  ]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoSaida, setTipoSaida] = useState<string>("txt");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleProcessar = () => {
    if (!selectedFile) {
      toast({ title: "Selecione um arquivo", variant: "destructive" });
      return;
    }
    
    toast({ title: "Arquivo processado!", description: `${selectedFile.name} foi processado com sucesso.` });
    
    setArquivos(prev => [...prev, {
      id: Date.now().toString(),
      nome: selectedFile.name,
      tipo: "entrada",
      status: "processado",
      registros: Math.floor(Math.random() * 1000) + 100,
      dataProcessamento: new Date().toISOString().split('T')[0]
    }]);
    
    setSelectedFile(null);
  };

  const totalProcessados = arquivos.filter(a => a.status === "processado").length;
  const totalRegistros = arquivos.reduce((acc, a) => acc + a.registros, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-indigo-500" />
            Lança APAE
          </CardTitle>
          <CardDescription>
            Importe e processe arquivos APAE para lançamento no sistema contábil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span className="text-sm">Total Arquivos</span>
              </div>
              <p className="text-2xl font-bold mt-1">{arquivos.length}</p>
            </div>
            <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/30">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Processados</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-green-600">{totalProcessados}</p>
            </div>
            <div className="p-4 rounded-lg border bg-indigo-500/10 border-indigo-500/30">
              <div className="flex items-center gap-2 text-indigo-600">
                <FileDown className="w-4 h-4" />
                <span className="text-sm">Total Registros</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-indigo-600">{totalRegistros.toLocaleString()}</p>
            </div>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Arraste um arquivo APAE ou clique para selecionar
            </p>
            <div className="flex items-center justify-center gap-4">
              <div>
                <Label htmlFor="apae-file" className="sr-only">Arquivo APAE</Label>
                <Input 
                  id="apae-file" 
                  type="file" 
                  accept=".txt,.csv"
                  onChange={handleFileChange}
                  className="max-w-xs"
                />
              </div>
              <Select value={tipoSaida} onValueChange={setTipoSaida}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="txt">TXT</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleProcessar} className="bg-indigo-500 hover:bg-indigo-600">
                <FileUp className="w-4 h-4 mr-1" /> Processar
              </Button>
            </div>
            {selectedFile && (
              <p className="text-sm text-indigo-500 mt-2">Arquivo selecionado: {selectedFile.name}</p>
            )}
          </div>

          {/* Arquivos List */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Arquivo</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Registros</th>
                  <th className="text-left p-3 font-medium">Processado em</th>
                  <th className="text-center p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {arquivos.map(arquivo => (
                  <tr key={arquivo.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium">{arquivo.nome}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        arquivo.status === "processado" ? "bg-green-500/20 text-green-600" :
                        arquivo.status === "erro" ? "bg-red-500/20 text-red-600" :
                        "bg-yellow-500/20 text-yellow-600"
                      }`}>
                        {arquivo.status}
                      </span>
                    </td>
                    <td className="p-3 text-center font-medium">{arquivo.registros.toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground">
                      {arquivo.dataProcessamento ? new Date(arquivo.dataProcessamento).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}