import { useState } from "react";
import { Package, Users, Truck, ShoppingCart, ShoppingBag, BarChart3, Building2, ChevronDown } from "lucide-react";
import { WidgetRibbon } from "@/components/WidgetRibbon";
import { MetricCard } from "@/components/task/MetricCard";
import { useEmpresaAtiva } from "@/hooks/useEmpresaAtiva";
import { useProdutos } from "@/hooks/useProdutos";
import { useClientes } from "@/hooks/useClientes";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useVendas } from "@/hooks/useVendas";
import { useCompras } from "@/hooks/useCompras";
import { useEstoque } from "@/hooks/useEstoque";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const widgetGroups = [
  {
    id: "acoes",
    label: "Ações Rápidas",
    icon: <Package className="w-4 h-4" />,
    items: [
      { id: "novo-produto", label: "Novo Produto", icon: <Package className="w-4 h-4" /> },
      { id: "novo-cliente", label: "Novo Cliente", icon: <Users className="w-4 h-4" /> },
      { id: "nova-venda", label: "Nova Venda", icon: <ShoppingCart className="w-4 h-4" /> },
      { id: "nova-compra", label: "Nova Compra", icon: <ShoppingBag className="w-4 h-4" /> },
    ],
  },
  {
    id: "estoque",
    label: "Estoque",
    icon: <Truck className="w-4 h-4" />,
    items: [
      { id: "entrada", label: "Entrada", icon: <Package className="w-4 h-4" /> },
      { id: "saida", label: "Saída", icon: <Package className="w-4 h-4" /> },
    ],
  },
];

const ERP = () => {
  const [activeTab, setActiveTab] = useState("produtos");
  const { empresaAtiva, empresasDisponiveis, setEmpresaAtiva } = useEmpresaAtiva();
  
  const { produtos, isLoading: loadingProdutos } = useProdutos(empresaAtiva?.id);
  const { clientes, isLoading: loadingClientes } = useClientes(empresaAtiva?.id);
  const { fornecedores, isLoading: loadingFornecedores } = useFornecedores(empresaAtiva?.id);
  const { vendas, totalVendas, vendasPendentes } = useVendas(empresaAtiva?.id);
  const { compras, totalCompras, comprasPendentes } = useCompras(empresaAtiva?.id);
  const { produtosAbaixoMinimo, valorTotalEstoque } = useEstoque(empresaAtiva?.id);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-green-500/20">
        <div className="text-xs font-bold text-green-400 mb-3">Empresa Ativa</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between text-xs bg-card/50 border-green-500/30">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                <span className="truncate">{empresaAtiva?.nome || "Selecione"}</span>
              </div>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {empresasDisponiveis.map((empresa) => (
              <DropdownMenuItem key={empresa.id} onClick={() => setEmpresaAtiva(empresa)}>
                <span className="font-medium">{empresa.nome}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="p-3">
        <div className="text-xs font-bold text-green-400 mb-3">Alertas</div>
        {produtosAbaixoMinimo > 0 && (
          <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
            {produtosAbaixoMinimo} produto(s) abaixo do estoque mínimo
          </div>
        )}
      </div>
    </div>
  );

  if (!empresaAtiva) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Selecione uma empresa para continuar</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <WidgetRibbon groups={widgetGroups} title="ERP" accentColor="blue" sidebarContent={sidebarContent} />
      
      <div className="pt-16 pb-24 pr-72 p-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <MetricCard title="Produtos" value={produtos.length} icon={Package} color="blue" />
          <MetricCard title="Clientes" value={clientes.length} icon={Users} color="green" />
          <MetricCard title="Vendas" value={formatCurrency(totalVendas)} icon={ShoppingCart} color="yellow" />
          <MetricCard title="Compras" value={formatCurrency(totalCompras)} icon={ShoppingBag} color="red" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="compras">Compras</TabsTrigger>
          </TabsList>

          <TabsContent value="produtos">
            <Card>
              <CardHeader><CardTitle>Produtos Cadastrados</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Preço Venda</TableHead>
                      <TableHead>Estoque</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.codigo || "-"}</TableCell>
                        <TableCell>{p.nome}</TableCell>
                        <TableCell>{formatCurrency(p.preco_venda || 0)}</TableCell>
                        <TableCell>{p.estoque_atual ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clientes">
            <Card>
              <CardHeader><CardTitle>Clientes</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Cidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.nome}</TableCell>
                        <TableCell>{c.cpf_cnpj || "-"}</TableCell>
                        <TableCell>{c.telefone || "-"}</TableCell>
                        <TableCell>{c.cidade || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fornecedores">
            <Card>
              <CardHeader><CardTitle>Fornecedores</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Telefone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fornecedores.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>{f.nome}</TableCell>
                        <TableCell>{f.cpf_cnpj || "-"}</TableCell>
                        <TableCell>{f.telefone || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendas">
            <Card>
              <CardHeader><CardTitle>Vendas</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendas.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>{v.numero || "-"}</TableCell>
                        <TableCell>{new Date(v.data_venda).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>{v.cliente?.nome || "-"}</TableCell>
                        <TableCell>{formatCurrency(v.total || 0)}</TableCell>
                        <TableCell><Badge variant="outline">{v.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compras">
            <Card>
              <CardHeader><CardTitle>Compras</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compras.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.numero || "-"}</TableCell>
                        <TableCell>{new Date(c.data_compra).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>{c.fornecedor?.nome || "-"}</TableCell>
                        <TableCell>{formatCurrency(c.total || 0)}</TableCell>
                        <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ERP;
