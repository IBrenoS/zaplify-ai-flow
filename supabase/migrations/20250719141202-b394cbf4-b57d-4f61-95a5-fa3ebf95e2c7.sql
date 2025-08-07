-- Update the get_dashboard_data function to accept date period and assistant filters
CREATE OR REPLACE FUNCTION public.get_dashboard_data(
    user_id_param uuid,
    period_param text DEFAULT '30d',
    assistant_id_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    total_vendas_30d DECIMAL;
    canceladas_30d DECIMAL;
    ganho_liquido_30d DECIMAL;
    total_vendas_60d DECIMAL;
    canceladas_60d DECIMAL;
    ganho_liquido_60d DECIMAL;
    vendas_dia_a_dia JSONB;
    dia_campeao_data DATE;
    dia_campeao_valor DECIMAL;
    crescimento_vendas DECIMAL;
    crescimento_canceladas DECIMAL;
    crescimento_ganho_liquido DECIMAL;
    current_interval TEXT;
    comparison_interval TEXT;
BEGIN
    -- Define intervals based on period parameter
    CASE period_param
        WHEN '7d' THEN
            current_interval := '7 days';
            comparison_interval := '14 days';
        WHEN '30d' THEN
            current_interval := '30 days';
            comparison_interval := '60 days';
        WHEN 'all' THEN
            current_interval := '10 years'; -- Effectively all time
            comparison_interval := '20 years';
        ELSE
            current_interval := '30 days';
            comparison_interval := '60 days';
    END CASE;

    -- Calcula os KPIs do período atual
    SELECT COALESCE(SUM(valor), 0) INTO total_vendas_30d 
    FROM public.pagamentos 
    WHERE user_id = user_id_param 
      AND status = 'concluido' 
      AND data_criacao >= now() - current_interval::interval
      AND (assistant_id_param IS NULL OR id_projeto = assistant_id_param);
    
    SELECT COALESCE(SUM(valor), 0) INTO canceladas_30d 
    FROM public.pagamentos 
    WHERE user_id = user_id_param 
      AND status = 'cancelado' 
      AND data_criacao >= now() - current_interval::interval
      AND (assistant_id_param IS NULL OR id_projeto = assistant_id_param);
    
    ganho_liquido_30d := total_vendas_30d - canceladas_30d;

    -- Calcula os KPIs do período anterior para comparação
    SELECT COALESCE(SUM(valor), 0) INTO total_vendas_60d 
    FROM public.pagamentos 
    WHERE user_id = user_id_param 
      AND status = 'concluido' 
      AND data_criacao >= now() - comparison_interval::interval
      AND data_criacao < now() - current_interval::interval
      AND (assistant_id_param IS NULL OR id_projeto = assistant_id_param);
    
    SELECT COALESCE(SUM(valor), 0) INTO canceladas_60d 
    FROM public.pagamentos 
    WHERE user_id = user_id_param 
      AND status = 'cancelado' 
      AND data_criacao >= now() - comparison_interval::interval
      AND data_criacao < now() - current_interval::interval
      AND (assistant_id_param IS NULL OR id_projeto = assistant_id_param);
    
    ganho_liquido_60d := total_vendas_60d - canceladas_60d;

    -- Calcula crescimento percentual
    crescimento_vendas := CASE 
        WHEN total_vendas_60d > 0 THEN (total_vendas_30d - total_vendas_60d) / total_vendas_60d
        ELSE 0 
    END;
    
    crescimento_canceladas := CASE 
        WHEN canceladas_60d > 0 THEN (canceladas_30d - canceladas_60d) / canceladas_60d
        ELSE 0 
    END;
    
    crescimento_ganho_liquido := CASE 
        WHEN ganho_liquido_60d > 0 THEN (ganho_liquido_30d - ganho_liquido_60d) / ganho_liquido_60d
        ELSE 0 
    END;

    -- Encontra o dia campeão (dia com mais vendas)
    SELECT dia, total INTO dia_campeao_data, dia_campeao_valor
    FROM (
        SELECT date_trunc('day', data_criacao)::date as dia, SUM(valor) as total
        FROM public.pagamentos
        WHERE user_id = user_id_param 
          AND status = 'concluido' 
          AND data_criacao >= now() - current_interval::interval
          AND (assistant_id_param IS NULL OR id_projeto = assistant_id_param)
        GROUP BY dia
        ORDER BY total DESC
        LIMIT 1
    ) as max_day;

    -- Calcula os dados para o gráfico de vendas diárias
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', to_char(dia, 'DD/MM'), 
            'value', total
        ) ORDER BY dia
    ) INTO vendas_dia_a_dia
    FROM (
        SELECT date_trunc('day', data_criacao)::date as dia, SUM(valor) as total
        FROM public.pagamentos
        WHERE user_id = user_id_param 
          AND status = 'concluido' 
          AND data_criacao >= now() - current_interval::interval
          AND (assistant_id_param IS NULL OR id_projeto = assistant_id_param)
        GROUP BY dia
        ORDER BY dia
    ) as daily_sales;

    -- Retorna tudo em um único objeto JSON
    RETURN jsonb_build_object(
        'totalVendas', total_vendas_30d,
        'canceladas', canceladas_30d,
        'ganhoLiquido', ganho_liquido_30d,
        'crescimentoVendas', crescimento_vendas,
        'crescimentoCanceladas', crescimento_canceladas,
        'crescimentoGanhoLiquido', crescimento_ganho_liquido,
        'diaCampeao', CASE 
            WHEN dia_campeao_data IS NOT NULL THEN
                jsonb_build_object(
                    'dia', to_char(dia_campeao_data, 'DD/MM'),
                    'valor', dia_campeao_valor
                )
            ELSE NULL
        END,
        'vendasDiaADia', COALESCE(vendas_dia_a_dia, '[]'::jsonb)
    );
END;
$function$