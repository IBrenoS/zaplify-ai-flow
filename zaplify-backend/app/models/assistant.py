from pydantic import BaseModel
from typing import Optional
import datetime


# Campos base que são compartilhados para criação e leitura
class AssistantBase(BaseModel):
    name: str

    # Aba "Identidade"
    objetivo_principal: Optional[str] = None
    arquétipo: Optional[str] = None
    instrucoes_customizadas: Optional[str] = None

    # Aba "Conhecimento" (Formulário Guiado)
    sobre_o_produto: Optional[str] = None
    principais_beneficios: Optional[str] = None
    publico_alvo: Optional[str] = None
    diferenciais_competitivos: Optional[str] = None
    lista_precos: Optional[str] = None
    link_pagamento: Optional[str] = None

    # Aba "Recursos Avançados"
    regras_inquebraveis: Optional[str] = None
    habilidade_agendar_compromissos: Optional[bool] = False
    habilidade_vender_produtos: Optional[bool] = False
    instrucoes_de_voz: Optional[str] = None

    # Aba "Comunicação"
    nivel_formalidade: Optional[int] = 5
    nivel_detalhe: Optional[int] = 5
    uso_emojis: Optional[int] = 3


# Modelo para criação de um novo assistente (o que a API recebe)
class AssistantCreate(AssistantBase):
    pass


# Modelo completo que representa um assistente no banco de dados (o que a API retorna)
class Assistant(AssistantBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True
