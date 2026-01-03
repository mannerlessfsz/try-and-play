import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUp, Calendar, Landmark, AlertTriangle } from "lucide-react";
import { ContaBancaria } from "@/hooks/useContasBancarias";

interface ImportExtratoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { mes: number; ano: number; contaBancariaId: string }) => void;
  fileName?: string;
  contas: ContaBancaria[];
  isLoadingContas?: boolean;
  defaultMes?: number;
  defaultAno?: number;
}

const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

export function ImportExtratoModal({ open, onOpenChange, onConfirm, fileName, contas, isLoadingContas, defaultMes, defaultAno }: ImportExtratoModalProps) {
  const currentDate = new Date();
  const [mes, setMes] = useState<number>(defaultMes ?? (currentDate.getMonth() + 1));
  const [ano, setAno] = useState<number>(defaultAno ?? currentDate.getFullYear());
  const [contaBancariaId, setContaBancariaId] = useState<string>("");

  const anos = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  // Reset conta when modal opens
  useEffect(() => {
    if (open && contas.length > 0 && !contaBancariaId) {
      setContaBancariaId(contas[0].id);
    }
  }, [open, contas, contaBancariaId]);

  const handleConfirm = () => {
    if (!contaBancariaId) return;
    onConfirm({ mes, ano, contaBancariaId });
  };

  const selectedConta = contas.find(c => c.id === contaBancariaId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-blue-500" />
            Importar Extrato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {fileName && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Arquivo selecionado:</p>
              <p className="font-medium text-foreground">{fileName}</p>
            </div>
          )}

          {/* Conta Bancária Selector */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Landmark className="w-4 h-4 text-blue-500" />
              Conta Bancária
            </div>
            <p className="text-xs text-muted-foreground">
              Selecione a conta bancária deste extrato. O sistema validará se o extrato pertence a esta conta.
            </p>
            
            {contas.length === 0 ? (
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Nenhuma conta cadastrada</p>
                  <p className="text-xs text-amber-400/80">Cadastre uma conta bancária antes de importar extratos.</p>
                </div>
              </div>
            ) : (
              <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{conta.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {conta.banco} | Ag: {conta.agencia || '-'} | Cc: {conta.conta || '-'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedConta && (
              <div className="p-2 bg-card/50 rounded-lg border border-border/50 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted-foreground">Banco:</span>
                    <span className="ml-1 font-medium">{selectedConta.banco}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Agência:</span>
                    <span className="ml-1 font-medium">{selectedConta.agencia || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Conta:</span>
                    <span className="ml-1 font-medium">{selectedConta.conta || '-'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Competência */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar className="w-4 h-4 text-blue-500" />
              Competência do Extrato
            </div>
            <p className="text-xs text-muted-foreground">
              Informe o mês/ano de referência. Apenas transações dessa competência serão consideradas.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Mês</Label>
                <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Ano</Label>
                <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map((a) => (
                      <SelectItem key={a} value={a.toString()}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-xs text-blue-300">
                Período: 01/{mes.toString().padStart(2, '0')}/{ano} a {new Date(ano, mes, 0).getDate()}/{mes.toString().padStart(2, '0')}/{ano}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="bg-blue-500 hover:bg-blue-600"
            disabled={!contaBancariaId || contas.length === 0}
          >
            <FileUp className="w-4 h-4 mr-2" />
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
