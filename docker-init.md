Sim, existe exatamente essa lógica no terminal — é o mesmo “Stop” que você vê no Docker Desktop.
No terminal, o equivalente é:

powershell

docker stop <nome-ou-id-do-container>
Por exemplo, para parar só o seu api-gateway sem remover ele:

powershell

docker stop infrastructure-api-gateway-1
E se quiser parar todos de uma vez, mantendo eles disponíveis para “startar” depois:

powershell

docker stop $(docker ps -q)
Depois, para iniciar novamente (sem recriar nem remover nada):

powershell

docker start <nome-ou-id-do-container>

Ou todos:

powershell

docker start $(docker ps -aq)

📌 Resumindo:

stop = igual ao botão vermelho do Docker Desktop (para, mas mantém o container).

start = igual ao botão verde (inicia de novo).

down = derruba e remove os containers criados pelo compose.

up = cria e sobe novamente.
