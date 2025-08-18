from app.models.assistant import Assistant
from typing import List


def create_system_prompt(assistant: Assistant, context: str = "") -> str:
    """
    Constrói o prompt de sistema final para a IA com base nas configurações
    do assistente e no contexto recuperado.
    """
    prompt_parts: List[str] = []

    # 1. Identidade e Objetivo Principal
    prompt_parts.append(
        f"Você é '{assistant.name}', um assistente virtual especialista. "
        f"Seu arquétipo de personalidade é '{assistant.arquétipo}'. "
        f"Seu objetivo principal e mais importante é: '{assistant.objetivo_principal}'."
    )

    # 2. Conhecimento Estruturado (Formulário Guiado)
    knowledge_base = [
        f"- Sobre o produto/serviço: {assistant.sobre_o_produto}",
        f"- Principais benefícios: {assistant.principais_beneficios}",
        f"- Público-alvo: {assistant.publico_alvo}",
        f"- Diferenciais competitivos: {assistant.diferenciais_competitivos}",
        f"- Preços e produtos: {assistant.lista_precos}",
        f"- Link de pagamento: {assistant.link_pagamento}",
    ]
    # Filtra apenas os campos que foram preenchidos
    filled_knowledge = [item for item in knowledge_base if "None" not in item]
    if filled_knowledge:
        prompt_parts.append(
            "Utilize as seguintes informações como sua base de conhecimento primária para responder:\n"
            + "\n".join(filled_knowledge)
        )

    # 3. Contexto de Documentos (RAG)
    if context:
        prompt_parts.append(
            f"Adicionalmente, use o seguinte CONTEXTO recuperado de documentos para dar mais detalhes à sua resposta. "
            f"CONTEXTO:\n{context}"
        )

    # 4. Estilo de Comunicação (Sliders)
    prompt_parts.append(
        "MODULE SEU ESTILO DE COMUNICAÇÃO SEGUINDO ESTAS REGRAS:\n"
        f"- Nível de Formalidade: {assistant.nivel_formalidade}/10 (onde 1 é muito casual e 10 é extremamente formal).\n"
        f"- Nível de Detalhe nas Respostas: {assistant.nivel_detalhe}/10 (onde 1 é muito conciso e 10 é muito detalhado).\n"
        f"- Frequência de Uso de Emojis: {assistant.uso_emojis}/10 (onde 0 é nunca e 10 é frequentemente)."
    )

    # 5. Instruções de Estilo Derivadas da Voz
    if assistant.instrucoes_de_voz:
        prompt_parts.append(
            "ADICIONALMENTE, INCORPORE ESTAS CARACTERÍSTICAS DE ESTILO DERIVADAS DE UMA AMOSTRA DE VOZ:\n"
            f"{assistant.instrucoes_de_voz}"
        )
    # 5. Instruções Customizadas (Prioridade Máxima)
    if assistant.instrucoes_customizadas:
        prompt_parts.append(
            "ACIMA DE TUDO, SIGA ESTAS INSTRUÇÕES CUSTOMIZADAS E INQUEBRÁVEIS:\n"
            f"{assistant.instrucoes_customizadas}"
        )

    # Junta todas as partes em um único prompt
    return "\n\n".join(prompt_parts)
