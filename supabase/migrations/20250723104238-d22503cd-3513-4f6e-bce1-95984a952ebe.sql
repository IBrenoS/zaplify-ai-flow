-- Fix database function security by adding search_path to prevent schema injection attacks

-- Update update_updated_at_column function with secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update handle_new_user function with secure search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  
  INSERT INTO public.dashboard_settings (user_id, settings)
  VALUES (NEW.id, '{}');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update get_dashboard_data function with secure search_path
CREATE OR REPLACE FUNCTION public.get_dashboard_data(user_id_param uuid, period_param text DEFAULT '30d'::text, assistant_id_param uuid DEFAULT NULL::uuid)
RETURNS jsonb AS $$
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
        WHEN '1d' THEN
            current_interval := '1 day';
            comparison_interval := '2 days';
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
    -- Para filtro diário, vamos mostrar vendas por hora. Para outros períodos, vendas por dia
    IF period_param = '1d' THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'date', to_char(hora, 'HH24:MI'), 
                'value', total
            ) ORDER BY hora
        ) INTO vendas_dia_a_dia
        FROM (
            SELECT date_trunc('hour', data_criacao) as hora, SUM(valor) as total
            FROM public.pagamentos
            WHERE user_id = user_id_param 
              AND status = 'concluido' 
              AND data_criacao >= now() - current_interval::interval
              AND (assistant_id_param IS NULL OR id_projeto = assistant_id_param)
            GROUP BY hora
            ORDER BY hora
        ) as hourly_sales;
    ELSE
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
    END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;