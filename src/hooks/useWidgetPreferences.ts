import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type WidgetType = 
  | "resumo_financeiro" 
  | "alertas_vencimento" 
  | "metricas_vendas" 
  | "estoque_critico";

export interface WidgetPreference {
  id: string;
  user_id: string;
  empresa_id: string;
  widget_type: WidgetType;
  is_active: boolean;
  position_x: number;
  position_y: number;
}

export interface WidgetConfig {
  type: WidgetType;
  title: string;
  icon: string;
  navigateTo: string;
  moduleColor: "blue" | "magenta" | "orange" | "green";
}

export const AVAILABLE_WIDGETS: WidgetConfig[] = [
  {
    type: "resumo_financeiro",
    title: "Resumo Rápido",
    icon: "Wallet",
    navigateTo: "transacoes",
    moduleColor: "green",
  },
  {
    type: "alertas_vencimento",
    title: "Alertas de Vencimento",
    icon: "AlertTriangle",
    navigateTo: "transacoes",
    moduleColor: "orange",
  },
  {
    type: "metricas_vendas",
    title: "Métricas de Vendas",
    icon: "TrendingUp",
    navigateTo: "vendas",
    moduleColor: "blue",
  },
  {
    type: "estoque_critico",
    title: "Estoque Crítico",
    icon: "Package",
    navigateTo: "produtos",
    moduleColor: "magenta",
  },
];

export function useWidgetPreferences(empresaId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["widget-preferences", empresaId, user?.id],
    queryFn: async () => {
      if (!empresaId || !user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_widget_preferences")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("user_id", user.id);

      if (error) throw error;
      return data as WidgetPreference[];
    },
    enabled: !!empresaId && !!user?.id,
  });

  const toggleWidget = useMutation({
    mutationFn: async ({ widgetType, isActive }: { widgetType: WidgetType; isActive: boolean }) => {
      if (!empresaId || !user?.id) throw new Error("Missing context");

      const existing = preferences?.find(p => p.widget_type === widgetType);

      if (existing) {
        const { error } = await supabase
          .from("user_widget_preferences")
          .update({ is_active: isActive })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_widget_preferences")
          .insert({
            user_id: user.id,
            empresa_id: empresaId,
            widget_type: widgetType,
            is_active: isActive,
            position_x: 20,
            position_y: 20,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widget-preferences", empresaId, user?.id] });
    },
  });

  const updatePosition = useMutation({
    mutationFn: async ({ widgetType, x, y }: { widgetType: WidgetType; x: number; y: number }) => {
      if (!empresaId || !user?.id) throw new Error("Missing context");

      const existing = preferences?.find(p => p.widget_type === widgetType);

      if (existing) {
        const { error } = await supabase
          .from("user_widget_preferences")
          .update({ position_x: x, position_y: y })
          .eq("id", existing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widget-preferences", empresaId, user?.id] });
    },
  });

  // Get active widgets with their configs
  const activeWidgets = AVAILABLE_WIDGETS.filter(widget => {
    const pref = preferences?.find(p => p.widget_type === widget.type);
    // Default: resumo_financeiro is active if no preference exists
    if (!pref) return widget.type === "resumo_financeiro";
    return pref.is_active;
  }).map(widget => {
    const pref = preferences?.find(p => p.widget_type === widget.type);
    return {
      ...widget,
      position: pref ? { x: pref.position_x, y: pref.position_y } : { x: 20, y: 20 },
    };
  });

  const isWidgetActive = (widgetType: WidgetType): boolean => {
    const pref = preferences?.find(p => p.widget_type === widgetType);
    if (!pref) return widgetType === "resumo_financeiro"; // default active
    return pref.is_active;
  };

  return {
    preferences,
    activeWidgets,
    isLoading,
    toggleWidget,
    updatePosition,
    isWidgetActive,
    availableWidgets: AVAILABLE_WIDGETS,
  };
}
