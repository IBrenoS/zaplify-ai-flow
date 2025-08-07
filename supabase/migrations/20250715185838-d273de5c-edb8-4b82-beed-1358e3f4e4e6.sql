-- Create assistants table
CREATE TABLE public.assistants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  personality TEXT,
  knowledge_base TEXT[],
  objectives TEXT[],
  voice_tone TEXT,
  whatsapp_phone TEXT,
  advanced_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own assistants" 
ON public.assistants 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assistants" 
ON public.assistants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assistants" 
ON public.assistants 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistants" 
ON public.assistants 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_assistants_updated_at
BEFORE UPDATE ON public.assistants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();