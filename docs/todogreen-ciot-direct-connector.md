# CIOT direto sem IPEF

## Arquitetura

```mermaid
flowchart TD
  ERP["ERP To Do Green"] --> Connector["Conector CIOT Windows"]
  Connector --> Official["DLL/EXE oficial ANTT"]
  Official --> ANTT["ANTT"]
  Connector --> ERP
```

## Componentes

| Camada | Funcao | Status |
| --- | --- | --- |
| ERP To Do Green | Prepara CIOT, valida piso minimo, guarda certificado, envia payload e registra retorno | Publicado |
| Conector CIOT | Recebe o payload do ERP e aciona o mecanismo oficial ANTT | Criado em `connectors/antt-ciot` |
| DLL/EXE ANTT | Gera CIOT conforme DCS vigente | Depende do pacote oficial baixado no portal ANTT |
| ANTT | Retorna CIOT/protocolo | Externo |

## Variaveis no ERP

| Campo | Valor |
| --- | --- |
| Base URL ANTT | URL de homologacao ou producao conforme DCS |
| URL HTTPS do conector | `https://<host>/ciot` |
| Token do conector | Mesmo token configurado no microservico |
| Certificado | A1 enviado pelo ERP ou A3 resolvido localmente |

## Contrato de resposta

O ERP considera a emissao concluida quando o conector retorna HTTP 2xx com um dos campos abaixo contendo 12 digitos:

| Campo aceito |
| --- |
| `ciotCode` |
| `ciot` |
| `codigoCiot` |
| `codigoCIOT` |
| `codigo` |
| `code` |
| `numeroCiot` |
| `numeroCIOT` |

## Pendencia tecnica real

Baixar o DCS e o pacote DLL/EXE da ANTT, validar a assinatura final da chamada e adaptar `AnttCiotProcessClient` ao formato oficial. O ERP nao precisa mudar para essa etapa.

## Instalacao Windows

O repositorio inclui `connectors/antt-ciot/scripts/bootstrap-windows.ps1`.

Esse script baixa o pacote oficial da ANTT, publica o microservico, gera o token e instala o Windows Service. Ele precisa ser executado no servidor Windows que tera acesso ao certificado A1/A3 e aos artefatos oficiais da ANTT.
