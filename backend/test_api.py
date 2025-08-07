#!/usr/bin/env python3
"""
Script para testar a API do Zaplify AI Flow
"""

import asyncio
import aiohttp
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000/api/v1"

async def test_health_check():
    """Testa o health check"""
    print("🔍 Testando Health Check...")

    async with aiohttp.ClientSession() as session:
        try:
            async with session.get("http://localhost:8000/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print("✅ Health Check OK")
                    print(f"   Status: {data.get('status')}")
                    print(f"   Environment: {data.get('environment')}")
                    return True
                else:
                    print(f"❌ Health Check Failed: {response.status}")
                    return False
        except Exception as e:
            print(f"❌ Erro na conexão: {e}")
            return False

async def test_create_assistant():
    """Testa criação de assistente"""
    print("\n🤖 Testando criação de assistente...")

    assistant_data = {
        "name": "Assistente de Teste",
        "description": "Assistente criado para testar a API",
        "personality": "friendly",
        "objectives": ["qualify_leads", "sales"],
        "product_service": "Software de automação de vendas",
        "main_benefits": "Aumenta produtividade em 300% e reduz tempo de resposta",
        "target_audience": "Empresas de médio porte",
        "can_schedule": True,
        "can_sell": True,
        "can_qualify": True,
        "formality_level": 7,
        "detail_level": 6,
        "emoji_usage": 4
    }

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                f"{BASE_URL}/assistants",
                json=assistant_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 201:
                    data = await response.json()
                    print("✅ Assistente criado com sucesso!")
                    print(f"   ID: {data.get('id')}")
                    print(f"   Nome: {data.get('name')}")
                    return data.get('id')
                else:
                    error = await response.text()
                    print(f"❌ Erro ao criar assistente: {response.status}")
                    print(f"   Detalhes: {error}")
                    return None
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            return None

async def test_get_assistants():
    """Testa listagem de assistentes"""
    print("\n📋 Testando listagem de assistentes...")

    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{BASE_URL}/assistants") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ {len(data)} assistente(s) encontrado(s)")
                    for assistant in data:
                        print(f"   - {assistant.get('name')} (ID: {assistant.get('id')})")
                    return data
                else:
                    error = await response.text()
                    print(f"❌ Erro ao listar assistentes: {response.status}")
                    print(f"   Detalhes: {error}")
                    return []
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            return []

async def test_chat(assistant_id: str):
    """Testa chat com assistente"""
    print(f"\n💬 Testando chat com assistente {assistant_id}...")

    chat_data = {
        "message": "Olá! Preciso de informações sobre o produto de vocês.",
        "conversation_id": "test_conv_001",
        "assistant_id": assistant_id,
        "context": {
            "customer_name": "João Silva",
            "source": "website"
        }
    }

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                f"{BASE_URL}/ai/chat",
                json=chat_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    print("✅ Resposta da IA recebida!")
                    print(f"   Resposta: {data.get('response')}")
                    print(f"   Confiança: {data.get('confidence'):.2f}")
                    print(f"   Tempo: {data.get('processing_time'):.2f}s")
                    return True
                else:
                    error = await response.text()
                    print(f"❌ Erro no chat: {response.status}")
                    print(f"   Detalhes: {error}")
                    return False
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            return False

async def main():
    """Função principal do teste"""
    print("🧪 Zaplify AI Flow - Teste da API")
    print("=" * 40)

    # Teste 1: Health Check
    if not await test_health_check():
        print("❌ Servidor não está rodando. Execute 'python start.py' primeiro.")
        return

    # Teste 2: Criar assistente
    assistant_id = await test_create_assistant()

    # Teste 3: Listar assistentes
    assistants = await test_get_assistants()

    # Teste 4: Chat (apenas se tiver assistente)
    if assistant_id:
        await test_chat(assistant_id)
    elif assistants:
        await test_chat(assistants[0].get('id'))
    else:
        print("\n⚠️  Nenhum assistente disponível para teste de chat")

    print("\n✅ Testes concluídos!")
    print("📚 Acesse http://localhost:8000/api/v1/docs para explorar a API")

if __name__ == "__main__":
    asyncio.run(main())
