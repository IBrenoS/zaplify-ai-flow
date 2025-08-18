from supabase import create_client, Client
from app.core.config import settings

# Inicializa o cliente do Supabase usando as configurações do .env
supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
