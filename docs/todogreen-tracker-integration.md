# Integração To Do Green + Sistemas Tracker

Este documento é o checklist técnico para conectar o rastreamento veicular da Sistemas Tracker à vertical privada da To Do Green no Seu Funcionário.

## Objetivo

Receber dados operacionais da frota em modo somente leitura, sem enviar comandos ao equipamento de rastreamento.

Dados previstos:

- identificação do veículo
- placa e/ou IMEI
- latitude e longitude
- velocidade
- direção
- ignição
- odômetro
- endereço, quando fornecido
- data e hora da posição
- eventos e alertas

## Informações necessárias da Sistemas Tracker

Solicitar ao fornecedor:

1. URL base da API de produção e, se existir, ambiente de homologação.
2. Endpoint para listar veículos e/ou consultar a posição mais recente.
3. Método de autenticação: Bearer, API Key ou Basic.
4. Nome do cabeçalho da API Key, se aplicável.
5. Identificador da conta, cliente ou grupo, se necessário.
6. Exemplo real de resposta JSON com pelo menos dois veículos.
7. Dicionário dos campos e unidades usadas.
8. Regra de paginação, cursor ou janela de datas, se existir.
9. Limites de requisição e política de rate limit.
10. Fuso horário utilizado nas datas.
11. Documentação de webhook, se disponível.
12. Forma de assinatura do webhook e nome do cabeçalho da assinatura.
13. Lista de tipos de evento/alerta e respectivos códigos.
14. Procedimento para renovação ou rotação da credencial.

## Segurança

As credenciais não são armazenadas no banco nem enviadas ao navegador.

O Worker espera referências de segredo, normalmente:

- `TODOGREEN_TRACKER_API_TOKEN`
- `TODOGREEN_TRACKER_WEBHOOK_SECRET`

Os valores desses segredos devem ser cadastrados apenas no cofre do Cloudflare Worker.

A integração bloqueia chamadas para localhost, redes privadas e endpoints sem HTTPS.

## Endpoints internos já preparados

### Configuração

`PUT /api/todogreen/tracker/config`

Salva apenas a configuração não sensível da integração.

### Teste da conexão

`POST /api/todogreen/tracker/test`

Consulta a API configurada e confirma se a coleção de registros pode ser localizada. Não importa dados.

### Sincronização manual

`POST /api/todogreen/tracker/sync`

Importa os dados recebidos conforme o mapeamento configurado.

### Veículos rastreados

`GET /api/todogreen/tracker/vehicles`

Retorna os veículos recebidos e a última posição disponível.

### Saúde da integração

`GET /api/todogreen/tracker/health`

Retorna somente estado operacional: configuração, modo de sincronização, presença dos segredos, última execução, último sucesso, erro e contadores. Nunca retorna valores de segredo.

### Histórico de sincronizações

`GET /api/todogreen/tracker/runs`

Retorna as execuções recentes com quantidades importadas, atualizadas, ignoradas e com erro.

### Eventos recentes

`GET /api/todogreen/tracker/events`

Retorna eventos normalizados. O payload bruto armazenado para auditoria não é devolvido por esse endpoint.

### Diagnóstico de amostra JSON

`POST /api/todogreen/tracker/preview`

Recebe uma amostra no formato:

```json
{
  "payload": {
    "data": {
      "vehicles": []
    }
  },
  "collectionPath": "data.vehicles"
}
```

A amostra é analisada em memória e não é gravada. A resposta mostra somente os caminhos dos campos encontrados e sugestões de correspondência. Os valores da amostra não são devolvidos.

Esse endpoint permite preparar o mapeamento antes de cadastrar a credencial real.

## Webhook

Após salvar a configuração, o endpoint público é:

`POST /api/todogreen/tracker/webhook/{integrationId}`

O serviço atual valida HMAC-SHA256 no cabeçalho `x-tracker-signature`.

Caso a Sistemas Tracker utilize outro padrão de assinatura, adaptar o verificador somente depois de receber a documentação oficial. Não afrouxar a validação para aceitar webhooks sem assinatura.

## Mapeamento inicial esperado

| Campo interno | Exemplo de caminho externo |
| --- | --- |
| id | `id` ou `vehicle.id` |
| imei | `imei` ou `device.imei` |
| plate | `plate` ou `placa` |
| name | `name` |
| latitude | `latitude` ou `location.latitude` |
| longitude | `longitude` ou `location.longitude` |
| speed | `speed` ou `velocidade` |
| heading | `heading` |
| ignition | `ignition` ou `ignicao` |
| odometer | `odometer` ou `hodometro` |
| address | `address` |
| recordedAt | `recordedAt`, `timestamp` ou equivalente |
| eventId | `eventId` |
| eventType | `eventType` |
| severity | `severity` |
| title | `title` |

Os nomes acima são exemplos. O mapeamento final deve seguir o JSON real do fornecedor.

## Critério para ativação

A integração pode sair do estado de preparação quando todos os itens abaixo estiverem atendidos:

- documentação oficial recebida
- credencial de homologação ou produção cadastrada no cofre
- teste de conexão bem-sucedido
- mapeamento conferido contra amostra real
- placas/identificadores conciliados com a frota To Do Green
- datas e fuso horário validados
- pelo menos uma sincronização sem erro
- webhook validado, caso seja utilizado
- ausência de valores fictícios na interface

## Estratégia de entrada em produção

1. Configurar primeiro em modo manual.
2. Executar teste de conexão sem importação.
3. Validar uma amostra pelo endpoint de diagnóstico.
4. Executar sincronização manual com poucos veículos.
5. Conferir placa, posição, horário, velocidade e ignição.
6. Validar os eventos.
7. Só então ativar polling ou webhook.
8. Acompanhar `/health` e `/runs` nas primeiras execuções.

A integração permanece somente leitura mesmo depois da ativação. Qualquer comando remoto para veículo deve ser tratado como um projeto separado, com nova análise de segurança e autorização explícita.
