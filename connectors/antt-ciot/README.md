# To Do Green ANTT CIOT Connector

Microservico Windows para ligar o ERP To Do Green ao mecanismo oficial de geracao CIOT da ANTT.

## O que ele faz

- Expoe `POST /ciot` para o ERP.
- Exige `Authorization: Bearer <token>`.
- Recebe o payload que o ERP ja envia hoje.
- Aciona um adaptador local da ANTT via processo configurado.
- Devolve `ciotCode` de 12 digitos e `protocol` para o ERP gravar.

## Por que existe

A ANTT disponibiliza DCS, biblioteca DLL e executavel oficiais para geracao do CIOT. O Worker em Cloudflare nao deve executar DLL/EXE Windows nem acessar token A3 local. Este conector fica em servidor Windows controlado pela empresa e faz essa ponte.

## Rodar localmente

```powershell
cd connectors\antt-ciot
copy appsettings.example.json appsettings.Production.json
dotnet run --urls http://127.0.0.1:8088
```

Teste de saude:

```powershell
curl.exe http://127.0.0.1:8088/health
```

## Contrato esperado pelo ERP

```http
POST /ciot
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

Entrada resumida:

```json
{
  "mode": "direct_api",
  "requiresIpef": false,
  "environment": "homologation",
  "baseUrl": "https://appservices-hml.antt.gov.br/ciot",
  "certificate": {
    "standard": "ICP-Brasil",
    "type": "A1",
    "pfxBase64": "...",
    "password": "..."
  },
  "ciot": {}
}
```

Saida esperada:

```json
{
  "ciotCode": "123456789012",
  "protocol": "PROTOCOLO-ANTT",
  "raw": {}
}
```

## Configuracao no ERP

Na tela de CIOT:

- Base URL ANTT: conforme DCS, homologacao ou producao.
- URL HTTPS do conector: `https://<host-do-conector>/ciot`
- Token do conector: mesmo valor de `Connector:Token`.
- Certificado: A1 enviado pelo portal ou A3 ligado ao adaptador local.

O processo pode rodar em HTTP local atras de IIS, Caddy, Nginx ou Cloudflare Tunnel. A URL exposta para o ERP precisa ser HTTPS.

## Instalar em servidor Windows

No servidor Windows que ficara com a DLL/EXE da ANTT:

```powershell
cd connectors\antt-ciot\scripts
.\bootstrap-windows.ps1 `
  -AnttPackageUrl "https://url-oficial-da-antt/pacote-ciot.zip" `
  -DcsUrl "https://url-oficial-da-antt/dcs-ciot.pdf"
```

O script:

- baixa o pacote oficial da ANTT;
- baixa o DCS, se a URL for informada;
- publica o microservico .NET;
- gera token forte;
- grava `appsettings.Production.json`;
- instala e inicia o Windows Service.

Depois disso, exponha `http://127.0.0.1:8088` por HTTPS usando IIS, Caddy, Nginx ou Cloudflare Tunnel e configure a URL publica no ERP.

## Ponto que ainda depende da ANTT

`AnttProcess:ExecutablePath` deve apontar para um adaptador que saiba chamar a DLL/EXE oficial da ANTT com o DCS vigente. O microservico ja isola essa chamada, mas a assinatura final do adaptador precisa respeitar o pacote tecnico baixado no portal da ANTT.

Se o fornecedor/arquivo oficial exigir outro formato de chamada, ajuste apenas `AnttCiotProcessClient`.
