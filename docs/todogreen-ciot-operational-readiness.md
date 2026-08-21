# CIOT direto: checklist operacional

Este checklist fecha o que precisa existir fora do ERP para a integracao direta sem IPEF funcionar com frota propria ou ETC subcontratada.

Fonte oficial da ANTT: https://www.gov.br/antt/pt-br/assuntos/cargas/ciot-para-todos-1/documentos-tecnicos/piso-minimo-ciot

## Itens obrigatorios

| Item | Como fica pronto | Evidencia |
| --- | --- | --- |
| DCS vigente | Baixado da pagina oficial da ANTT e salvo em `C:\ANTT\CIOT\downloads` | Caminho registrado em `C:\ToDoGreen\AnttCiotConnector\ops\antt-ciot-install-manifest.json` |
| DLL oficial ANTT | Baixada da pagina oficial, quando a operacao usar biblioteca | Caminho registrado no manifesto |
| EXE oficial ou adaptador EXE | Baixado da ANTT ou informado via `-AnttExecutablePath` | `AnttProcess:ExecutablePath` no `appsettings.Production.json` |
| Servidor Windows | Windows com .NET 8, acesso ao certificado A1/A3 e saida HTTPS para ANTT | Servico `ToDoGreenAnttCiotConnector` iniciado |
| URL HTTPS do conector | Reverse proxy ou tunnel apontando para `http://127.0.0.1:8088` | `https://<host>/health` retorna `operacional` |
| Token interno | Gerado pelo bootstrap ou informado via `-ConnectorToken` | `connector-token.txt` e `erp-ciot-connector.env` criados |
| ERP configurado | Variaveis `TODOGREEN_ANTT_CIOT_CONNECTOR_URL` e `TODOGREEN_ANTT_CIOT_CONNECTOR_TOKEN` aplicadas | Tela CIOT consegue testar credencial e enviar |

## Comando padrao no servidor Windows

```powershell
cd C:\repos\Seufuncionario\connectors\antt-ciot\scripts

.\bootstrap-windows.ps1 `
  -AnttExeUrl "https://url-oficial-da-antt/executavel-ciot-producao.exe" `
  -AnttDllUrl "https://url-oficial-da-antt/biblioteca-ciot-producao.dll" `
  -DcsUrl "https://url-oficial-da-antt/dcs-ciot.pdf" `
  -PublicConnectorUrl "https://ciot.todogreen.com.br"
```

Se a ANTT entregar ZIP unico, use `-AnttPackageUrl` no lugar de `-AnttExeUrl` e `-AnttDllUrl`.

Se os arquivos ja foram baixados manualmente, use `-AnttExePath`, `-AnttDllPath` e `-DcsPath`.

## Saidas geradas pelo bootstrap

| Arquivo | Uso |
| --- | --- |
| `C:\ToDoGreen\AnttCiotConnector\app\appsettings.Production.json` | Configuracao do servico Windows |
| `C:\ToDoGreen\AnttCiotConnector\secrets\connector-token.txt` | Token interno do conector |
| `C:\ToDoGreen\AnttCiotConnector\ops\erp-ciot-connector.env` | Variaveis para colar no ambiente do ERP |
| `C:\ToDoGreen\AnttCiotConnector\ops\antt-ciot-install-manifest.json` | Prova dos artefatos usados na instalacao |

## Publicacao HTTPS

O microservico deve ficar local em `http://127.0.0.1:8088`. A exposicao externa precisa ser HTTPS.

Opcoes prontas no repo:

| Opcao | Arquivo |
| --- | --- |
| Cloudflare Tunnel | `connectors/antt-ciot/deploy/cloudflared-config.example.yml` |
| Caddy | `connectors/antt-ciot/deploy/Caddyfile.example` |

## Verificacao

```powershell
.\verify-connector.ps1 `
  -HealthUrl "https://ciot.todogreen.com.br/health" `
  -ConnectorUrl "https://ciot.todogreen.com.br/ciot" `
  -Token "<TOKEN_DO_CONNECTOR>"
```

O teste de token nao emite CIOT. Ele autentica a chamada e espera uma recusa por modo invalido. Se vier HTTP 400, o token passou. Se vier HTTP 401, o token esta errado.

## O que ainda e externo ao codigo

- A empresa precisa fornecer o certificado digital ICP-Brasil A1 ou A3.
- A URL publica precisa existir no DNS ou tunnel escolhido.
- O pacote oficial da ANTT precisa ser baixado da pagina oficial vigente.
- Se a ANTT exigir chamada via DLL sem EXE, o `-AnttExecutablePath` deve apontar para o adaptador EXE que encapsula a DLL conforme o DCS.
