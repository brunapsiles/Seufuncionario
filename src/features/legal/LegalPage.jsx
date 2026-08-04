import { Button, PageTitle } from "../../components/ui.jsx";

export function LegalContent() {
  return (
    <div className="legal-text">
      <p>
        Última atualização: 20 de julho de 2026. Este documento explica, em
        linguagem simples, como o <strong>Seu Funcionário</strong> trata os
        dados da sua conta, em conformidade com a Lei Geral de Proteção de
        Dados (Lei nº 13.709/2018 — LGPD).
      </p>
      <h3>1. Quem trata seus dados</h3>
      <p>
        O Seu Funcionário é operado de forma independente pela pessoa
        responsável pelo produto, que atua como controladora dos dados
        cadastrados na plataforma.
      </p>
      <h3>2. Quais dados coletamos</h3>
      <ul>
        <li>
          <strong>Dados de conta:</strong> nome, e-mail e senha (armazenada
          apenas de forma criptografada, nunca em texto puro).
        </li>
        <li>
          <strong>Dados do seu espaço de trabalho:</strong> tudo o que você
          cadastra para usar o produto — negócios, tarefas, leads, contatos,
          agendamentos, produtos, pedidos, horas trabalhadas, financeiro,
          documentos, sites publicados e conversas com os funcionários de IA.
        </li>
        <li>
          <strong>Dados técnicos:</strong> registros de erro (mensagem,
          página e horário) usados só para corrigir falhas do aplicativo.
        </li>
        <li>
          <strong>Eventos de uso:</strong> nome da funcionalidade utilizada,
          data, resultado da ação e contagens agregadas. Não registramos o
          texto das conversas, documentos, contatos ou valores financeiros
          nessa medição.
        </li>
        <li>
          <strong>Integrações que você conecta:</strong> se você optar por
          conectar sua conta Google, usamos o acesso apenas para as ações que
          você pedir (enviar um e-mail pelo Gmail, criar um evento na sua
          Agenda), sempre com sua autorização explícita a cada conexão.
        </li>
      </ul>
      <h3>3. Por que tratamos esses dados</h3>
      <p>
        Para executar o contrato de uso do produto (fazer o aplicativo
        funcionar e sincronizar entre seus dispositivos), para atender
        solicitações que você faz aos funcionários de IA e, no caso das
        integrações Google, com base no seu consentimento explícito, que pode
        ser revogado a qualquer momento. Os eventos de uso servem para medir
        ativação, estabilidade e utilidade das funcionalidades, sem analisar
        o conteúdo produzido pelo usuário.
      </p>
      <h3>4. Com quem compartilhamos</h3>
      <p>
        Não vendemos nem compartilhamos seus dados com terceiros para fins
        publicitários. Os dados só saem da infraestrutura do produto quando
        estritamente necessário para a funcionalidade solicitada por você
        (por exemplo, o texto de uma pergunta é enviado ao provedor de IA que
        vai respondê-la, ou um e-mail é enviado pela sua própria conta Google
        quando você aciona esse recurso). Nenhum desses parceiros pode usar
        seus dados para fins próprios.
      </p>
      <h3>5. Onde seus dados ficam armazenados</h3>
      <p>
        Os dados da sua conta e do seu espaço de trabalho ficam em banco de
        dados na infraestrutura Cloudflare, com cópia local no seu
        dispositivo para permitir uso offline do aplicativo instalável (PWA).
      </p>
      <h3>6. Por quanto tempo guardamos seus dados</h3>
      <p>
        Enquanto sua conta existir. Se você excluir sua conta, todos os dados
        associados a ela são apagados de forma definitiva, conforme descrito no
        item 8.
      </p>
      <h3>7. Seus direitos como titular dos dados</h3>
      <p>A qualquer momento você pode solicitar, sobre os seus dados:</p>
      <ul>
        <li>Confirmação de que existe tratamento e acesso aos dados;</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>Portabilidade dos dados a outro fornecedor, mediante requisição;</li>
        <li>Eliminação de todos os dados tratados com base no consentimento;</li>
        <li>
          Revogação do consentimento, sem afetar a legalidade do tratamento já
          realizado;
        </li>
        <li>Informação sobre com quem seus dados são compartilhados.</li>
      </ul>
      <h3>8. Como exercer seus direitos</h3>
      <p>
        Em <strong>Configurações → Sua conta</strong> você pode, a qualquer
        momento e sem depender de terceiros: exportar uma cópia completa dos
        seus dados (portabilidade) e excluir permanentemente sua conta e todos
        os dados associados (eliminação). Para outras solicitações, entre em
        contato pelo e-mail informado na tela de login.
      </p>
      <h3>9. Segurança</h3>
      <p>
        Senhas são armazenadas com hash criptográfico (nunca em texto puro), as
        conexões são feitas por HTTPS e o acesso aos dados de cada conta é
        isolado e protegido por sessão autenticada.
      </p>
      <h3>10. Crianças e adolescentes</h3>
      <p>
        O Seu Funcionário é uma ferramenta de gestão empresarial e não é
        direcionado a menores de 18 anos.
      </p>
      <h3>11. Alterações destes termos</h3>
      <p>
        Este documento pode ser atualizado para refletir mudanças no produto ou
        na legislação. A data no topo indica a versão mais recente.
      </p>
    </div>
  );
}

export default function LegalPage({ go }) {
  return (
    <PageTitle
      eyebrow="CONFIGURAÇÕES"
      title="Termos de Uso e Política de Privacidade"
      text="Como o Seu Funcionário trata os dados da sua conta."
      action={
        go && (
          <Button variant="secondary" onClick={() => go("config")}>
            Voltar para Configurações
          </Button>
        )
      }
    >
      <div className="settings-card">
        <LegalContent />
      </div>
    </PageTitle>
  );
}
