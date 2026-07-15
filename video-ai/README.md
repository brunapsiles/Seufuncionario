# Seu Funcionário Video AI

Motor próprio de vídeo generativo baseado no modelo aberto Wan 2.2 TI2V 5B.
Não usa créditos de uma API de IA, não depende do computador do usuário e não
impõe franquia comercial de gerações. A capacidade real depende da GPU e do
espaço em disco contratados para executar o modelo.

## Infraestrutura mínima

- GPU NVIDIA com 24 GB de VRAM (RTX 3090, RTX 4090 ou equivalente)
- 48 GB de RAM recomendados
- 80 GB de armazenamento persistente
- Docker com NVIDIA Container Toolkit

O perfil `advanced` produz 121 quadros em 1280x704 a 24 fps. O perfil
`standard` produz 81 quadros em 832x480 e reduz o tempo de GPU.

## Implantação

1. Crie um servidor GPU na Vast.ai ou RunPod com armazenamento persistente.
2. Copie esta pasta para o servidor e renomeie `.env.example` para `.env`.
3. Defina um `API_TOKEN` longo e execute `docker compose up -d --build`.
4. Publique a porta 8000 atrás de HTTPS.
5. No Cloudflare Worker, configure os segredos `VIDEO_AI_URL` e
   `VIDEO_AI_TOKEN`. O token deve ser igual ao usado pelo servidor.

O primeiro uso baixa aproximadamente 34 GB de pesos. Depois disso o modelo fica
no volume persistente e não precisa ser baixado novamente.

## Contrato da API

- `GET /health` — saúde, GPU e tamanho da fila.
- `POST /v1/videos` — cria um trabalho e devolve `requestId` imediatamente.
- `GET /v1/videos/{requestId}` — consulta progresso e URL final.
- `DELETE /v1/videos/{requestId}` — cancela um trabalho que ainda está na fila.
- `GET /v1/videos/{requestId}/content?sig=...` — entrega o MP4 assinado.

As rotas de criação e consulta exigem `Authorization: Bearer <API_TOKEN>`.
Os arquivos finais usam URLs assinadas com expiração e identificadores
aleatórios de 128 bits. Trabalhos pendentes sobrevivem a reinicializações. Os
resultados antigos são removidos automaticamente conforme `OUTPUT_TTL_HOURS`.

## Política de custo

A fila usa somente uma GPU por vez. Para reduzir custo, configure a hospedagem
com escala para zero e limite máximo de um worker. Não configure workers mínimos
permanentes durante a fase inicial. Não existe cobrança por geração no código;
o provedor cobra apenas o tempo e o armazenamento da máquina.

