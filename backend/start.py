#!/usr/bin/env python3
"""
Script de inicialização do backend Zaplify AI Flow
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Verifica se a versão do Python é adequada"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ é necessário")
        sys.exit(1)
    print(f"✅ Python {sys.version}")

def check_env_file():
    """Verifica se o arquivo .env existe"""
    env_file = Path(".env")
    if not env_file.exists():
        print("⚠️  Arquivo .env não encontrado")
        print("📋 Copiando .env.example para .env...")

        example_file = Path(".env.example")
        if example_file.exists():
            import shutil
            shutil.copy(example_file, env_file)
            print("✅ Arquivo .env criado")
            print("🔧 Configure suas variáveis de ambiente no arquivo .env")
        else:
            print("❌ Arquivo .env.example não encontrado")
            return False
    else:
        print("✅ Arquivo .env encontrado")

    return True

def install_dependencies():
    """Instala as dependências do projeto"""
    print("📦 Instalando dependências...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
                      check=True, capture_output=True)
        print("✅ Dependências instaladas")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao instalar dependências: {e}")
        return False

def run_server():
    """Inicia o servidor de desenvolvimento"""
    print("🚀 Iniciando servidor de desenvolvimento...")
    print("📡 Servidor rodando em: http://localhost:8000")
    print("📚 Documentação da API: http://localhost:8000/api/v1/docs")
    print("🔧 Health Check: http://localhost:8000/health")
    print("⏹️  Pressione Ctrl+C para parar")

    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "app.main:app",
            "--reload",
            "--host", "0.0.0.0",
            "--port", "8000"
        ])
    except KeyboardInterrupt:
        print("\n👋 Servidor parado")

def main():
    """Função principal"""
    print("🤖 Zaplify AI Flow - Backend Setup")
    print("=" * 40)

    # Verifica versão do Python
    check_python_version()

    # Verifica arquivo .env
    if not check_env_file():
        sys.exit(1)

    # Pergunta se deve instalar dependências
    install = input("📦 Instalar dependências? (y/N): ").lower().strip()
    if install in ['y', 'yes', 's', 'sim']:
        if not install_dependencies():
            sys.exit(1)

    # Pergunta se deve iniciar o servidor
    start = input("🚀 Iniciar servidor de desenvolvimento? (Y/n): ").lower().strip()
    if start not in ['n', 'no', 'não']:
        run_server()
    else:
        print("✅ Setup concluído!")
        print("🚀 Para iniciar o servidor manualmente:")
        print("   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")

if __name__ == "__main__":
    main()
