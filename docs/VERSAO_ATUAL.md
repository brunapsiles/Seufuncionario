# Versão publicada

## v132

- Portal externo individual por cliente, com link seguro, revogável e validade
  opcional.
- Seleção explícita dos projetos, tarefas, documentos, relatórios, orçamentos,
  pedidos e entregas visíveis em cada acesso.
- Acompanhamento de progresso, prazos, entregas e dados logísticos sem expor
  outros registros do workspace.
- Aprovação de entregas, abertura de chamados e envio de documentos pelo
  cliente, sempre com protocolo e proteção contra duplicidade.
- Trilha autenticada para a equipe, incluindo download protegido dos arquivos
  recebidos e status de aplicação de cada interação.
- Tokens armazenados somente como hash, política de conteúdo restritiva,
  bloqueio de indexação e isolamento por empresa e workspace.
- Módulo isolado em `src/features/portal/`, carregado sob demanda.

## Base preservada da v131

- Formulários públicos avançados com link próprio e código de incorporação,
  sem exigir conta de quem responde.
- Editor de campos com obrigatoriedade, opções, reordenação e condições de
  exibição.
- Upload seguro de arquivos, assinatura desenhada, consentimento de
  privacidade e confirmação de pagamento por Pix ou link HTTPS.
- Personalização de logotipo, cores, botão e mensagem de confirmação.
- Protocolo único, proteção contra envio duplicado e painel autenticado de
  respostas e anexos.
- Conversão automática e opcional da resposta em tarefa, lead, chamado ou caso
  de processo, reutilizando as regras dos módulos existentes.
- Snapshot publicado e respostas persistidos em tabelas D1 próprias, isolados
  por empresa e workspace.
- Módulo isolado em `src/features/forms/`, carregado sob demanda.

## Base preservada da v130

- Chat corporativo com canais abertos para toda a empresa, grupos privados e
  mensagens diretas sem misturar essas conversas com o chat dos especialistas.
- Threads vinculadas à mensagem original, menções por pessoa e contagem de não
  lidas individual por usuário.
- Reações, mensagens fixadas, busca por texto, autor ou arquivo e anexos
  baixáveis com limite seguro para o armazenamento do workspace.
- Conversão de qualquer mensagem em tarefa operacional rastreável, preservando
  a audiência e o vínculo com canal e mensagem de origem.
- Resumo por IA com decisões, ações, responsáveis, prazos, riscos e pendências;
  quando o provedor não responde, o app produz um resumo local sem inventar
  informações.
- Privacidade aplicada também ao dono do workspace: grupos e mensagens diretas
  só são entregues aos participantes, e salvamentos do restante do workspace
  não apagam conversas privadas invisíveis.
- Participantes podem reagir e fixar mensagens sem alterar texto, autoria ou
  visibilidade de mensagens alheias.
- Módulo isolado em `src/features/chat/`, carregado sob demanda.

## Base preservada da v129

- Dashboards configuráveis e pessoais, com criação, duplicação, renomeação e
  exclusão de visões.
- Escolha dos indicadores exibidos, tamanhos compacto ou largo e ordem por
  arrastar ou por controles acessíveis de teclado.
- Filtros persistentes por período e projeto.
- Indicadores de receita, despesas, margem, metas e OKRs, tarefas atrasadas,
  projetos em risco, capacidade, SLA, emissões e operação logística.
- Gráfico de evolução financeira, distribuição por status e Escopos 1, 2 e 3,
  além de uma tabela unificada de itens que pedem atenção.
- Valores derivados dos módulos existentes, sem duplicar totais nem criar
  números artificiais.
- Múltiplos painéis isolados por usuário, empresa e workspace.
- Módulo isolado em `src/features/dashboard/`, carregado sob demanda.

## Base preservada da v128

- Caixa de entrada pessoal com menções, tarefas atribuídas, comentários,
  aprovações pendentes, alterações importantes e notificações gerais.
- Itens agrupados por assunto, com filtros por categoria e contadores de
  pendências.
- Marcação como lida por item, grupo ou filtro, além de retorno para não lida.
- Adiamento até amanhã ou por uma semana, com área própria para itens adiados.
- Estado de leitura e adiamento individual por usuário, persistido em tabela D1
  e isolado por empresa e workspace.
- A caixa compartilhada de conversas com clientes foi preservada em uma aba
  separada, sem misturar atendimento externo com prioridades pessoais.
- Módulo isolado em `src/features/inbox/`, carregado sob demanda.

## Base preservada da v127

- Contas a receber e a pagar: o dinheiro combinado que ainda não caiu, que era
  o buraco entre o livro-caixa e a realidade do negócio.
- Vencimento, pagamento parcial e situação calculada: a vencer, vence hoje,
  atrasada há X dias ou quitada.
- Inadimplência por faixa de atraso (a vencer, até 15, 16-30, 31-60, mais de 60).
- Fluxo de caixa projetado por semana, com entradas, saídas e saldo acumulado.
- Fila "precisa de atenção agora" com o que vence em sete dias e o que atrasou.
- Dar baixa lança automaticamente no Financeiro como Receita ou Despesa, para
  que o livro-caixa e as contas nunca contem histórias diferentes.
- Conta mensal: ao quitar, a do mês seguinte é criada sozinha, com o dia
  ajustado quando o mês seguinte é mais curto.
- Nomes de clientes e leads já cadastrados aparecem como sugestão.
- Módulo isolado em `src/features/finance/`, carregado sob demanda.

## Base preservada da v126

- Metas e OKRs: objetivos com resultados-chave mensuráveis, categoria que não
  existia no produto.
- Quatro tipos de resultado-chave: número (de → até, com unidade), percentual,
  marco (feito ou não) e tarefas concluídas com progresso automático.
- Metas decrescentes funcionam (reduzir de 100 para 60 conta como progresso).
- Peso por resultado-chave para objetivos com prioridades diferentes.
- Ciclos mensal, trimestral e anual, com o período calculado sozinho.
- Situação comparando o progresso real com o tempo já decorrido do ciclo:
  no ritmo, atenção, em risco, concluída ou ciclo encerrado.
- Marca visual na barra mostrando onde a meta deveria estar hoje.
- Histórico de evolução com mini gráfico em SVG puro, sem biblioteca.
- Resumo do painel com total, progresso médio e quantas metas pedem atenção.
- Módulo isolado em `src/features/goals/`, carregado sob demanda.

## Base preservada da v125

- Assinatura eletrônica simples de documentos, sem serviço externo e sem custo.
- Cada assinatura registra quem assinou, papel, e-mail opcional, data e hora.
- Impressão digital determinística do texto detecta qualquer alteração feita
  depois da assinatura, e o cartão do documento avisa "Alterado após assinar".
- Código de verificação legível (SF-XXXX-XXXX) para conferência sem sistema.
- Desenho da assinatura no dedo ou no mouse, opcional: assinar pelo nome
  também vale e continua funcionando quando o navegador não oferece canvas.
- Bloco de assinaturas anexado automaticamente às exportações em PDF, DOCX e TXT,
  com o aviso legal de que é assinatura eletrônica simples (Lei 14.063/2020) e
  não substitui certificado ICP-Brasil quando a lei exigir.

## Base preservada da v124

- Hierarquia universal de trabalho com organização, workspace, espaço, pasta e
  lista.
- A organização deriva da empresa já existente, sem duplicar cadastros.
- Projetos e tarefas existentes são vinculados por referência e preservam todos
  os dados, responsáveis, dependências e históricos originais.
- Árvore navegável, breadcrumbs, favoritos, movimentação validada, duplicação
  de ramificações completas, arquivamento e restauração.
- Estruturas compartilhadas com toda a empresa por padrão, com opção privada e
  controle separado de visualização e edição.
- Regras de domínio impedem níveis inválidos, nomes duplicados no mesmo local e
  ciclos ao mover estruturas.
- Métricas consolidadas de estruturas, projetos, tarefas concluídas e atrasadas.
- Interface responsiva carregada sob demanda.
- Modal acessível extraído do arquivo central para componente compartilhado.
- Coleção `workNodes` protegida pelo mesmo escopo de visibilidade do workspace.

## Base preservada da v123

- Motor universal de precificação e impacto extraído para
  `src/features/pricing/pricingImpactDomain.js`.
- Modelos configuráveis para serviços, produtos, projetos e transporte sem
  restringir o produto a um único setor.
- Direcionadores de custo fixo, unidade, hora, distância, peso e
  tonelada-quilômetro.
- Memória de cálculo com custo direto, impostos, comissão, desconto, preço
  mínimo, margem desejada, preço final e preço unitário.
- Validação impede configurações economicamente impossíveis.
- Cenários preservam entradas, premissas, resultado, cliente e versão do modelo.
- Conversão opcional de cenário em orçamento comercial, mantendo vínculo com a
  memória de cálculo.
- Biblioteca empresarial de fatores de impacto sem impor números genéricos.
- Fatores registram unidade, kgCO₂e, escopo, categoria, fonte, versão e validade.
- Atividades podem ser medidas, informadas por fornecedor ou estimadas.
- Nota de confiabilidade considera qualidade, evidência, fonte, versão e aprovação.
- Impacto consolidado por cenário e por Escopo 1, 2 e 3.
- Interface carregada sob demanda e isolada do monólito principal.
- Coleções de precificação e impacto protegidas pelo escopo do workspace.

## Base preservada da v122

- Planejamento de capacidade extraído para `src/features/resources/capacityDomain.js`.
- Perfis de recurso com jornada semanal, dias úteis, função, competências e senioridade.
- Ausências por período reduzem automaticamente a disponibilidade líquida.
- Alocações parciais por percentual ou horas semanais, com projeto opcional.
- Indicadores de capacidade bruta, disponível, planejada, realizada, ociosidade,
  sobrecarga e utilização por pessoa e por equipe.
- Custos, receita e margem planejada calculados por recurso.
- Apontamentos de tempo existentes enriquecem o realizado quando há vínculo de usuário.
- Detecção de conflitos e severidade de sobrecarga.
- Simulação de nova demanda e cenários de contratação com recomendação de quadro.
- Interface responsiva carregada sob demanda, com cadastro de recursos, ausências e alocações.
- Dados protegidos pelo mesmo escopo de proprietário, empresa e visibilidade do workspace.
- O módulo funciona sozinho e integra projetos e horas somente quando configurados.

## Base preservada da v121

- Arquitetura de fórmulas e configuração de gráficos extraída para módulos de domínio.
- Fórmulas avançadas com funções, condições, comparações, validação e diagnóstico.
- Gráficos persistentes nas planilhas, restaurados com segurança ao reabrir.
- Motor de projetos com objetivo, escopo, entregáveis, critérios de sucesso,
  governança, datas, orçamento, custos, horas, status e prioridade.
- Linha de marcos com tipo, responsável, data planejada e vínculo preparado para tarefas.
- Registro integrado de riscos, problemas, decisões e mudanças de escopo.
- Cálculo automático de progresso, saúde, atrasos e variações financeiras e de horas.
- Compatibilidade mantida com projetos, tarefas, fórmulas e planilhas das versões anteriores.
- Cronograma Gantt calculado por tarefas, datas, duração e predecessoras.
- Reprogramação automática respeitando calendários do projeto, dias úteis e feriados.
- Detecção de dependências circulares, caminho crítico e folga por tarefa.
- Baseline preservada para comparação do planejado com o cronograma recalculado.
- Marcos exibidos no mesmo cronograma do projeto.
- Motor relacional extraído para `src/features/databases/relational.js`.
- Relações com um ou vários registros e compatibilidade com valores únicos antigos.
- Relações bidirecionais configuráveis, com sincronização do campo inverso.
- Lookup de campos relacionados e rollup com contagem, únicos, soma, média,
  mínimo, máximo e combinação de textos.
- Exclusão de registro remove referências órfãs nas demais bases.
- Cada registro funciona como página completa com propriedades, conteúdo,
  anexos, comentários e datas de criação e atualização.
- Novos tipos de campo: moeda, percentual, data e hora, e-mail, telefone, URL
  e múltipla seleção.
- Tabela, galeria, quadro e calendário continuam usando a mesma fonte de dados.
- Domínio de processos extraído para `src/features/processes/processDomain.js`.
- Processos configuráveis com etapas ordenadas, formulários e códigos de protocolo.
- Casos operacionais com responsável, prioridade, histórico e etapa atual.
- SLA por etapa com estados no prazo, em risco e atrasado.
- Aprovação obrigatória antes de etapas configuradas.
- Regras de sequência impedem saltos indevidos entre fases.
- Campos obrigatórios gerais e específicos por etapa.
- Campos condicionais e validação de e-mail no motor de formulários.
- Indicadores de volume, conclusão, atraso, tempo médio e distribuição por etapa.
- Respostas persistidas como registros de formulário e casos do processo.
- Conexão opcional com bases relacionais por correspondência de campos.
- Criação opcional de tarefa operacional para cada solicitação.
- Novo módulo carregado sob demanda para reduzir o crescimento do monólito.

A fonte técnica da versão é o histórico de commits da branch `main`.
O código é validado integralmente antes da atualização da branch `main`.
