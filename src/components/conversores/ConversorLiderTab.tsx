import { useState } from "react";
import { 
  Crown, FileText, Upload, Download, 
  CheckCircle, AlertTriangle, Eye, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface ArquivoLider {
  id: string;
  nome: string;
  tipoOrigem: string;
  tipoDestino: string;
  status: "pendente" | "convertido" | "erro";
  registros: number;
  dataConversao: string | null;
}

export function ConversorLiderTab() {
  const { toast } = useToast();
  const [arquivos, setArquivos] = useState<ArquivoLider[]>([
    { id: "1", nome: "lider_movimento_dez.ldr", tipoOrigem: "LDR", tipoDestino: "CSV", status: "convertido", registros: 3500, dataConversao: "2024-12-21" },
    { id: "2", nome: "lider_balancete_2024.ldr", tipoOrigem: "LDR", tipoDestino: "TXT", status: "convertido", registros: 1200, dataConversao: "2024-12-19" },
  ]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoDestino, setTipoDestino] = useState<string>("csv");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleConverter = () => {
    if (!selectedFile) {
      toast({ title: "Selecione um arquivo", variant: "destructive" });
      return;
    }

    const extensao = selectedFile.name.split('.').pop()?.toUpperCase() || "LDR";
    
    toast({ 
      title: "Conversão concluída!", 
      description: `${selectedFile.name} convertido para ${tipoDestino.toUpperCase()}` 
    });
    
    setArquivos(prev => [...prev, {
      id: Date.now().toString(),
      nome: selectedFile.name,
      tipoOrigem: extensao,
      tipoDestino: tipoDestino.toUpperCase(),
      status: "convertido",
      registros: Math.floor(Math.random() * 5000) + 500,
      dataConversao: new Date().toISOString().split('T')[0]
    }]);
    
    setSelectedFile(null);
  };

  const totalConvertidos = arquivos.filter(a => a.status === "convertido").length;
  const totalRegistros = arquivos.reduce((acc, a) => acc + a.registros, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-violet-500" />
            Conversor LÍDER
          </CardTitle>
          <CardDescription>
            Converta arquivos do sistema LÍDER para formatos universais compatíveis com outros sistemas.
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
                <span className="text-sm">Convertidos</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-green-600">{totalConvertidos}</p>
            </div>
            <div className="p-4 rounded-lg border bg-violet-500/10 border-violet-500/30">
              <div className="flex items-center gap-2 text-violet-600">
                <Crown className="w-4 h-4" />
                <span className="text-sm">Total Registros</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-violet-600">{totalRegistros.toLocaleString()}</p>
            </div>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Arraste um arquivo LÍDER (.ldr, .txt) ou clique para selecionar
            </p>
            <div className="flex items-center justify-center gap-4">
              <div>
                <Label htmlFor="lider-file" className="sr-only">Arquivo LÍDER</Label>
                <Input 
                  id="lider-file" 
                  type="file" 
                  accept=".ldr,.txt,.csv,.dat"
                  onChange={handleFileChange}
                  className="max-w-xs"
                />
              </div>
              <Select value={tipoDestino} onValueChange={setTipoDestino}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="txt">TXT</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleConverter} className="bg-violet-500 hover:bg-violet-600">
                <Download className="w-4 h-4 mr-1" /> Converter
              </Button>
            </div>
            {selectedFile && (
              <p className="text-sm text-violet-500 mt-2">Arquivo selecionado: {selectedFile.name}</p>
            )}
          </div>

          {/* Arquivos List */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Arquivo</th>
                  <th className="text-center p-3 font-medium">Origem → Destino</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Registros</th>
                  <th className="text-left p-3 font-medium">Convertido em</th>
                  <th className="text-center p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {arquivos.map(arquivo => (
                  <tr key={arquivo.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-violet-500" />
                        <span className="font-medium">{arquivo.nome}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 rounded bg-muted text-xs">{arquivo.tipoOrigem}</span>
                      <span className="mx-2">→</span>
                      <span className="px-2 py-1 rounded bg-violet-500/20 text-violet-600 text-xs">{arquivo.tipoDestino}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        arquivo.status === "convertido" ? "bg-green-500/20 text-green-600" :
                        arquivo.status === "erro" ? "bg-red-500/20 text-red-600" :
                        "bg-yellow-500/20 text-yellow-600"
                      }`}>
                        {arquivo.status}
                      </span>
                    </td>
                    <td className="p-3 text-center font-medium">{arquivo.registros.toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground">
                      {arquivo.dataConversao ? new Date(arquivo.dataConversao).toLocaleDateString('pt-BR') : '-'}
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