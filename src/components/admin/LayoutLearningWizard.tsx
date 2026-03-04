import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSearch, Wand2, Save, Loader2, Check, X, ArrowLeft, ArrowRight, Sparkles, Tag, Eye } from 'lucide-react';

interface DetectedTag {
  tag: string;
  value: string;
  path: string;
  depth: number;
  parentTag: string;
}

interface FieldMapping {
  tag: string;
  grupo: string;
  campo_destino: string;
  tipo_dado: string;
  obrigatorio: boolean;
  selected: boolean;
}

const GRUPOS = ['ide', 'prestador', 'tomador', 'servico', 'retencoes', 'regime', 'emitente', 'destinatario', 'totais', 'itens', 'contexto'];
const TIPOS_DADO = ['texto', 'numero', 'data', 'cnpj', 'cpf', 'moeda', 'booleano'];

// Auto-suggest grupo and campo based on tag name
function suggestMapping(tag: string): { grupo: string; campo_destino: string; tipo_dado: string } {
  const t = tag.toLowerCase();
  
  // CNPJ/CPF
  if (t.includes('cnpj')) return { grupo: t.includes('prest') ? 'prestador' : t.includes('toma') ? 'tomador' : t.includes('emit') ? 'emitente' : t.includes('dest') ? 'destinatario' : 'ide', campo_destino: 'cnpj', tipo_dado: 'cnpj' };
  if (t.includes('cpf')) return { grupo: t.includes('toma') ? 'tomador' : 'ide', campo_destino: 'cpf_cnpj', tipo_dado: 'cpf' };
  
  // Valores monetários
  if (t.includes('valserv') || t === 'vserv') return { grupo: 'servico', campo_destino: 'valor_servicos', tipo_dado: 'moeda' };
  if (t.includes('valpis') || t === 'vpis' || t.includes('retpis')) return { grupo: 'retencoes', campo_destino: 'pis', tipo_dado: 'moeda' };
  if (t.includes('valcof') || t === 'vcofins' || t.includes('retcof')) return { grupo: 'retencoes', campo_destino: 'cofins', tipo_dado: 'moeda' };
  if (t.includes('valcsll') || t === 'vcsll' || t.includes('retcsll')) return { grupo: 'retencoes', campo_destino: 'csll', tipo_dado: 'moeda' };
  if (t.includes('valir') || t === 'virrf' || t.includes('retir')) return { grupo: 'retencoes', campo_destino: 'ir', tipo_dado: 'moeda' };
  if (t.includes('valinss') || t === 'vinss' || t.includes('retinss')) return { grupo: 'retencoes', campo_destino: 'inss', tipo_dado: 'moeda' };
  if (t.includes('valiss') || t === 'viss') return { grupo: 'retencoes', campo_destino: 'iss_retido', tipo_dado: 'moeda' };
  if (t.includes('aliq')) return { grupo: 'servico', campo_destino: 'aliquota_iss', tipo_dado: 'numero' };
  if (t.includes('basecalc')) return { grupo: 'servico', campo_destino: 'base_calculo', tipo_dado: 'moeda' };
  if (t.includes('valliq') || t === 'vliq') return { grupo: 'servico', campo_destino: 'valor_liquido', tipo_dado: 'moeda' };
  if (t.includes('valprod') || t === 'vprod') return { grupo: 'totais', campo_destino: 'valor_produtos', tipo_dado: 'moeda' };
  if (t.includes('vnf')) return { grupo: 'totais', campo_destino: 'valor_nota', tipo_dado: 'moeda' };
  
  // Datas
  if (t.includes('dtemis') || t.includes('dataemissao') || t === 'dhemi') return { grupo: 'ide', campo_destino: 'data_emissao', tipo_dado: 'data' };
  if (t.includes('dtcomp') || t.includes('competencia')) return { grupo: 'ide', campo_destino: 'competencia', tipo_dado: 'data' };
  
  // Identificação
  if (t === 'numero' || t === 'nnf' || t.includes('numnfse')) return { grupo: 'ide', campo_destino: 'numero', tipo_dado: 'texto' };
  if (t.includes('serie')) return { grupo: 'ide', campo_destino: 'serie', tipo_dado: 'texto' };
  if (t.includes('codverif')) return { grupo: 'ide', campo_destino: 'codigo_verificacao', tipo_dado: 'texto' };
  
  // Razão social
  if (t.includes('razao') || t.includes('xnome') || t.includes('rsocial')) {
    if (t.includes('prest')) return { grupo: 'prestador', campo_destino: 'razao_social', tipo_dado: 'texto' };
    if (t.includes('toma')) return { grupo: 'tomador', campo_destino: 'razao_social', tipo_dado: 'texto' };
    return { grupo: 'ide', campo_destino: 'razao_social', tipo_dado: 'texto' };
  }
  
  // Inscrição municipal
  if (t.includes('inscmun') || t.includes('im')) return { grupo: t.includes('prest') ? 'prestador' : 'ide', campo_destino: 'inscricao_municipal', tipo_dado: 'texto' };
  
  // Discriminação/Descrição
  if (t.includes('discrim') || t.includes('descserv')) return { grupo: 'servico', campo_destino: 'discriminacao', tipo_dado: 'texto' };
  
  // Município
  if (t.includes('codmun') || t.includes('cmun')) return { grupo: 'ide', campo_destino: 'codigo_municipio', tipo_dado: 'texto' };
  if (t.includes('xmun') || t.includes('municipio')) return { grupo: 'ide', campo_destino: 'municipio', tipo_dado: 'texto' };
  
  // UF
  if (t === 'uf' || t.includes('siglaestado')) return { grupo: 'ide', campo_destino: 'uf', tipo_dado: 'texto' };
  
  // Optante Simples
  if (t.includes('optsn') || t.includes('simplesn')) return { grupo: 'regime', campo_destino: 'optante_simples', tipo_dado: 'booleano' };
  
  // Default
  return { grupo: 'ide', campo_destino: tag.toLowerCase(), tipo_dado: 'texto' };
}

export function LayoutLearningWizard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'xml' | 'txt' | 'csv'>('xml');
  const [detectedTags, setDetectedTags] = useState<DetectedTag[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [layoutName, setLayoutName] = useState('');
  const [layoutVersion, setLayoutVersion] = useState('1.0');
  const [namespacePattern, setNamespacePattern] = useState('');
  const [rootPattern, setRootPattern] = useState('');
  const [previewResult, setPreviewResult] = useState<Record<string, Record<string, string>> | null>(null);

  // Step 1: Upload file
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xml') setFileType('xml');
    else if (ext === 'txt') setFileType('txt');
    else if (ext === 'csv') setFileType('csv');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setFileContent(content);
      toast({ title: `Arquivo "${file.name}" carregado`, description: `${content.length} caracteres` });
    };
    reader.readAsText(file);
  }, [toast]);

  // Step 2: Analyze and detect tags
  const analyzeFile = useCallback(() => {
    if (!fileContent) return;

    if (fileType === 'xml') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(fileContent, 'text/xml');
      const root = doc.documentElement;

      // Auto-detect namespace and root
      const nsMatch = fileContent.match(/xmlns[^=]*=["']([^"']+)["']/);
      if (nsMatch) setNamespacePattern(nsMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      setRootPattern(root.localName || root.tagName);

      // Recursively extract all leaf tags
      const tags: DetectedTag[] = [];
      const seen = new Set<string>();

      function walk(el: Element, depth: number, parentTag: string) {
        const children = el.children;
        if (children.length === 0) {
          // Leaf node
          const tag = el.localName || el.tagName;
          const value = el.textContent?.trim() || '';
          const key = `${parentTag}>${tag}`;
          if (!seen.has(key) && value) {
            seen.add(key);
            tags.push({ tag, value, path: key, depth, parentTag });
          }
        } else {
          for (let i = 0; i < children.length; i++) {
            walk(children[i], depth + 1, el.localName || el.tagName);
          }
        }
      }

      walk(root, 0, '');
      setDetectedTags(tags);

      // Auto-generate mappings with suggestions
      const autoMappings: FieldMapping[] = tags.map(t => {
        const suggestion = suggestMapping(t.tag);
        return {
          tag: t.tag,
          grupo: suggestion.grupo,
          campo_destino: suggestion.campo_destino,
          tipo_dado: suggestion.tipo_dado,
          obrigatorio: false,
          selected: true,
        };
      });
      setMappings(autoMappings);
      setStep(2);
    } else {
      // For TXT/CSV, show first lines
      const lines = fileContent.split('\n').slice(0, 20);
      const tags: DetectedTag[] = lines.map((line, i) => ({
        tag: `Linha ${i + 1}`,
        value: line.substring(0, 100),
        path: `line:${i}`,
        depth: 0,
        parentTag: '',
      }));
      setDetectedTags(tags);
      setMappings([]);
      setStep(2);
    }
  }, [fileContent, fileType]);

  // Step 3: Preview parsed result
  const previewParsing = useCallback(() => {
    const selectedMappings = mappings.filter(m => m.selected);
    const result: Record<string, Record<string, string>> = {};

    if (fileType === 'xml') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(fileContent, 'text/xml');
      const allElements = doc.getElementsByTagName('*');

      for (const mapping of selectedMappings) {
        if (!result[mapping.grupo]) result[mapping.grupo] = {};
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          if ((el.localName || el.tagName).toLowerCase() === mapping.tag.toLowerCase()) {
            const val = el.textContent?.trim() || '';
            if (val) {
              result[mapping.grupo][mapping.campo_destino] = val;
              break;
            }
          }
        }
      }
    }

    setPreviewResult(result);
    setStep(3);
  }, [mappings, fileContent, fileType]);

  // Step 4: Save layout to database
  const saveLayoutMutation = useMutation({
    mutationFn: async () => {
      const { data: layout, error: layoutErr } = await supabase.from('layout_documentos').insert({
        nome: layoutName,
        tipo: fileType,
        versao: layoutVersion,
        namespace_pattern: namespacePattern || null,
        root_element_pattern: rootPattern || null,
        ativo: true,
      }).select().single();

      if (layoutErr || !layout) throw layoutErr || new Error('Erro ao criar layout');

      const selectedMappings = mappings.filter(m => m.selected);
      const campos = selectedMappings.map((m, i) => ({
        layout_id: layout.id,
        grupo: m.grupo,
        campo_destino: m.campo_destino,
        tipo_dado: m.tipo_dado,
        caminhos_xpath: [m.tag],
        obrigatorio: m.obrigatorio,
        ordem: i,
      }));

      if (campos.length > 0) {
        const { error: camposErr } = await supabase.from('layout_campos').insert(campos);
        if (camposErr) throw camposErr;
      }

      return layout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-layouts', 'admin-layout-campos'] });
      toast({ title: 'Layout salvo com sucesso!', description: `${mappings.filter(m => m.selected).length} campos mapeados.` });
      setStep(4);
    },
    onError: (e) => toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }),
  });

  const toggleMapping = (index: number) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, selected: !m.selected } : m));
  };

  const updateMapping = (index: number, field: string, value: any) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map(s => (
          <React.Fragment key={s}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 4 && <div className={`w-12 h-0.5 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        {step === 1 && 'Envie um arquivo de exemplo para o sistema aprender'}
        {step === 2 && 'Revise e ajuste o mapeamento dos campos detectados'}
        {step === 3 && 'Confira o resultado da extração antes de salvar'}
        {step === 4 && 'Layout aprendido e pronto para uso!'}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Enviar Arquivo de Exemplo</CardTitle>
            <CardDescription>Envie um XML, TXT ou CSV que represente o layout que o sistema deve aprender a ler.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <input type="file" accept=".xml,.txt,.csv" onChange={handleFileUpload} className="hidden" id="layout-file-upload" />
              <label htmlFor="layout-file-upload" className="cursor-pointer">
                <FileSearch className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Clique para selecionar ou arraste o arquivo</p>
                <p className="text-xs text-muted-foreground mt-1">XML, TXT, CSV (máx 5MB)</p>
              </label>
            </div>
            {fileName && (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Badge>{fileType.toUpperCase()}</Badge>
                  <span className="text-sm font-medium">{fileName}</span>
                  <span className="text-xs text-muted-foreground">({fileContent.length.toLocaleString()} chars)</span>
                </div>
                <Button onClick={analyzeFile} className="gap-2"><Wand2 className="w-4 h-4" /> Analisar</Button>
              </div>
            )}
            {fileContent && fileType === 'xml' && (
              <div className="max-h-48 overflow-auto bg-muted/30 rounded p-3">
                <pre className="text-xs font-mono whitespace-pre-wrap">{fileContent.substring(0, 2000)}{fileContent.length > 2000 ? '\n...' : ''}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Map Fields */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5" /> Mapeamento de Campos</CardTitle>
                <CardDescription>{detectedTags.length} tags encontradas • {mappings.filter(m => m.selected).length} selecionadas</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMappings(prev => prev.map(m => ({ ...m, selected: true })))}>Selecionar Todos</Button>
                <Button variant="outline" onClick={() => setMappings(prev => prev.map(m => ({ ...m, selected: false })))}>Desmarcar Todos</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome do Layout</Label><Input value={layoutName} onChange={e => setLayoutName(e.target.value)} placeholder="Ex: NFS-e Goiânia" /></div>
                <div><Label>Versão</Label><Input value={layoutVersion} onChange={e => setLayoutVersion(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Namespace Pattern</Label><Input value={namespacePattern} onChange={e => setNamespacePattern(e.target.value)} placeholder="Auto-detectado" /></div>
                <div><Label>Root Element</Label><Input value={rootPattern} onChange={e => setRootPattern(e.target.value)} /></div>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">✓</TableHead>
                    <TableHead className="w-[130px]">Tag XML</TableHead>
                    <TableHead className="w-[140px]">Valor Exemplo</TableHead>
                    <TableHead className="w-[120px]">Grupo</TableHead>
                    <TableHead className="w-[140px]">Campo Destino</TableHead>
                    <TableHead className="w-[100px]">Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping, idx) => (
                    <TableRow key={idx} className={!mapping.selected ? 'opacity-40' : ''}>
                      <TableCell>
                        <Switch checked={mapping.selected} onCheckedChange={() => toggleMapping(idx)} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{mapping.tag}</TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate">{detectedTags[idx]?.value}</TableCell>
                      <TableCell>
                        <Select value={mapping.grupo} onValueChange={v => updateMapping(idx, 'grupo', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{GRUPOS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs" value={mapping.campo_destino} onChange={e => updateMapping(idx, 'campo_destino', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Select value={mapping.tipo_dado} onValueChange={v => updateMapping(idx, 'tipo_dado', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{TIPOS_DADO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Voltar</Button>
              <Button onClick={previewParsing} disabled={!layoutName || mappings.filter(m => m.selected).length === 0} className="gap-2">
                <Eye className="w-4 h-4" /> Pré-visualizar <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 3 && previewResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5" /> Pré-visualização da Extração</CardTitle>
            <CardDescription>Confira se os dados foram extraídos corretamente do arquivo de exemplo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(previewResult).map(([grupo, campos]) => (
                <div key={grupo}>
                  <Badge variant="secondary" className="mb-2">{grupo}</Badge>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(campos).map(([campo, valor]) => (
                      <div key={campo} className="bg-muted/30 rounded p-2">
                        <p className="text-xs text-muted-foreground">{campo}</p>
                        <p className="text-sm font-mono truncate">{valor || <span className="text-destructive">vazio</span>}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Ajustar</Button>
              <Button onClick={() => saveLayoutMutation.mutate()} disabled={saveLayoutMutation.isPending} className="gap-2">
                {saveLayoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Layout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Layout Aprendido!</h3>
            <p className="text-muted-foreground mb-6">
              O sistema agora consegue ler automaticamente arquivos com este formato.
              <br />Nenhuma IA necessária para XMLs — extração 100% determinística.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setStep(1); setFileContent(''); setFileName(''); setDetectedTags([]); setMappings([]); setLayoutName(''); setPreviewResult(null); }}>
                Aprender Outro Layout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
