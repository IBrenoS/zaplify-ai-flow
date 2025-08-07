-- Criar tabela de pagamentos para dashboard
CREATE TABLE public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('concluido', 'pendente', 'cancelado')),
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  id_projeto UUID,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own payments" 
ON public.pagamentos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" 
ON public.pagamentos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" 
ON public.pagamentos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payments" 
ON public.pagamentos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pagamentos_updated_at
BEFORE UPDATE ON public.pagamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data for demonstration
INSERT INTO public.pagamentos (user_id, valor, status, data_criacao, descricao) VALUES
-- Dados dos últimos 30 dias (vendas concluídas)
('ea326622-733d-4f36-b0cb-147cad22e806', 1200.00, 'concluido', now() - interval '29 days', 'Venda produto A'),
('ea326622-733d-4f36-b0cb-147cad22e806', 1500.00, 'concluido', now() - interval '28 days', 'Venda produto B'),
('ea326622-733d-4f36-b0cb-147cad22e806', 890.50, 'concluido', now() - interval '27 days', 'Venda produto C'),
('ea326622-733d-4f36-b0cb-147cad22e806', 2100.00, 'concluido', now() - interval '26 days', 'Venda produto D'),
('ea326622-733d-4f36-b0cb-147cad22e806', 750.00, 'concluido', now() - interval '25 days', 'Venda produto E'),
('ea326622-733d-4f36-b0cb-147cad22e806', 4890.00, 'concluido', now() - interval '15 days', 'Venda premium - Dia campeão'),
('ea326622-733d-4f36-b0cb-147cad22e806', 1800.00, 'concluido', now() - interval '10 days', 'Venda produto F'),
('ea326622-733d-4f36-b0cb-147cad22e806', 950.00, 'concluido', now() - interval '5 days', 'Venda produto G'),
('ea326622-733d-4f36-b0cb-147cad22e806', 3200.00, 'concluido', now() - interval '3 days', 'Venda produto H'),
('ea326622-733d-4f36-b0cb-147cad22e806', 1150.00, 'concluido', now() - interval '1 day', 'Venda produto I'),

-- Alguns cancelamentos
('ea326622-733d-4f36-b0cb-147cad22e806', 450.00, 'cancelado', now() - interval '20 days', 'Cancelamento produto X'),
('ea326622-733d-4f36-b0cb-147cad22e806', 320.00, 'cancelado', now() - interval '18 days', 'Cancelamento produto Y'),
('ea326622-733d-4f36-b0cb-147cad22e806', 464.56, 'cancelado', now() - interval '12 days', 'Cancelamento produto Z'),

-- Mais vendas para completar o valor total aproximado
('ea326622-733d-4f36-b0cb-147cad22e806', 2500.00, 'concluido', now() - interval '22 days', 'Venda especial 1'),
('ea326622-733d-4f36-b0cb-147cad22e806', 1800.00, 'concluido', now() - interval '19 days', 'Venda especial 2'),
('ea326622-733d-4f36-b0cb-147cad22e806', 2200.00, 'concluido', now() - interval '16 days', 'Venda especial 3'),
('ea326622-733d-4f36-b0cb-147cad22e806', 1650.00, 'concluido', now() - interval '14 days', 'Venda especial 4'),
('ea326622-733d-4f36-b0cb-147cad22e806', 1900.00, 'concluido', now() - interval '11 days', 'Venda especial 5'),
('ea326622-733d-4f36-b0cb-147cad22e806', 1400.00, 'concluido', now() - interval '8 days', 'Venda especial 6'),
('ea326622-733d-4f36-b0cb-147cad22e806', 1100.00, 'concluido', now() - interval '6 days', 'Venda especial 7'),
('ea326622-733d-4f36-b0cb-147cad22e806', 876.18, 'concluido', now() - interval '4 days', 'Venda especial 8'),
('ea326622-733d-4f36-b0cb-147cad22e806', 1250.00, 'concluido', now() - interval '2 days', 'Venda especial 9');