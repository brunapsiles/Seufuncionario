# Versão publicada

## v144

- Portfólio de projetos: um andar acima do cronograma de cada projeto. Mostra
  o conjunto e responde a pergunta que importa — se um projeto escorregar, o
  que mais atrasa junto.
- Dependência entre projetos ("B só começa depois que A terminar", com folga
  opcional). A data de quem depende é recalculada sozinha.
- Dependência em círculo é recusada na hora de cadastrar, com o motivo escrito:
  um projeto passaria a esperar o outro em roda e nenhuma data fecharia.
- Simulação de atraso: escolha o projeto e os dias, e a tela lista quem
  escorrega junto e qual passa a ser o novo prazo de cada um.
- Corrente que define a data final do portfólio fica marcada na tabela.
- Semáforo de situação por projeto sempre com o motivo escrito ao lado. Sinal
  vermelho sem explicação não ajuda ninguém a decidir o que fazer.
- Por que atrasou: aponta espera por outro projeto, tarefa travada e tarefa sem
  responsável. Quando o dado cadastrado não permite dizer, o app assume que não
  sabe em vez de chutar um motivo.
- Trabalho repetido: mesma tarefa aberta em dois projetos diferentes.
- Riscos com chance × impacto, nível, matriz 5x5 e aviso de risco grave sem
  dono ou sem plano — risco registrado e esquecido continua sendo risco.
- RACI por atividade, com as duas regras que fazem valer a pena: duas pessoas
  respondendo é o mesmo que ninguém respondendo, e atividade sem ninguém
  fazendo não sai do papel. Mais o resumo de quem está respondendo por mais
  coisa.
- Correção: com dois projetos empurrando o mesmo, o empurrão informado saía
  menor do que o real (media do empurrão anterior em vez da data cadastrada).

## Base preservada da v143

- Conhecimento conectado: a anotação deixa de ser arquivo solto e vira rede.
  Escrever `[[nome da nota]]` liga as duas, e a ligação vale nos dois sentidos.
- "Citada em": toda nota mostra quem aponta para ela, com o trecho da frase.
- "Citada sem ligação": quando outra nota escreve o nome em texto corrido sem
  ligar, o app avisa e transforma em ligação com um clique.
- "Pode ter a ver": sugestão de ligação por termos raros em comum. Palavra que
  aparece em quase toda nota não conecta nada, então pesa pelo inverso da
  frequência. Nota que já está ligada nos dois sentidos não é sugerida de novo.
- Rede de ideias: desenho da vizinhança da nota, com lista de botões ao lado
  para navegar. Nota citada que ainda não existe aparece tracejada e pode ser
  criada dali.
- Nota do dia com roteiro de journaling (foco, o que aconteceu, o que aprendi,
  para amanhã). Abrir duas vezes no mesmo dia não duplica.
- Transclusão: `![[Nota]]` traz o texto dela para dentro, e `![[Nota#^bloco]]`
  traz só um parágrafo. Quando duas notas se embutem uma na outra, o app para e
  avisa em vez de travar a tela.
- Cartões de revisão: linhas no formato `pergunta :: resposta` viram cartões, e
  a volta deles é espaçada conforme o acerto. Cartão errado volta no mesmo dia.
- Saúde da rede: notas citadas mas ainda não escritas, notas soltas (que
  ninguém cita e que não citam ninguém) e títulos repetidos, que deixam a
  ligação ambígua.
- Exportação de todas as notas em markdown, com cabeçalho legível.

## Base preservada da v142

- Análise de dados sobre o que já existe no workspace: financeiro, contas,
  funil de oportunidades, horas trabalhadas e planilhas. Nenhuma importação
  nova é necessária, a análise lê os dados que a titular já cadastrou.
- Medidas básicas explicadas em português: quantidade, soma, média, mediana e
  desvio. Quando a média fica bem acima da mediana, a tela avisa que poucos
  valores altos estão puxando a média para cima.
- Valores fora do padrão pelo método do intervalo entre quartis, dizendo se o
  valor está acima ou abaixo do esperado.
- Correlação entre duas fontes diferentes, sempre com o aviso de que
  correlação não significa que uma coisa causa a outra.
- Tendência e projeção com grau de confiança (alta, média ou baixa). Quando a
  confiança é baixa, a tela manda tratar o número como palpite, em vez de
  apresentar como previsão.
- Mês fora do padrão destacado no gráfico da série, pelo afastamento em
  relação à média.
- Faixas de valor agrupadas automaticamente, para enxergar os grupos de
  ticket sem precisar escolher a faixa na mão.
- Qualidade dos dados: tipo de cada coluna, quanto está preenchido, linhas
  repetidas e qual gráfico é o indicado para aquele formato, com a
  justificativa.
- Correção importante: texto que não é número (ex.: "abacaxi") virava zero
  silenciosamente e estragava média e soma. Agora só entra no cálculo o que
  realmente parece número, e data em formato ISO não é mais lida como valor.

## Base preservada da v141

- Busca por significado em todo o workspace, com a fonte de cada resultado:
  tarefas, documentos, reuniões, CRM, contatos, contas, financeiro, funil,
  metas, base de conhecimento e a própria memória da IA.
- Radical de palavra em português: buscar "clientes" acha "cliente", "pagamentos"
  acha "pagamento".
- Glossário da empresa: cadastrar "NF = nota fiscal" faz a sigla encontrar o
  termo escrito por extenso.
- Título pesa mais que o corpo no ranqueamento, e o trecho vem com a palavra
  destacada.
- A busca respeita a visibilidade: item privado de outra pessoa não aparece.
- Resposta com citações numeradas e clicáveis, usando SOMENTE o que está no
  workspace. Quando a informação não está lá, a IA diz que não encontrou em vez
  de completar com conhecimento geral.
- Memória da IA controlável: painel para ver, editar, fixar e apagar.
- Escopo por memória: só sua, da empresa, de um projeto, de um cliente ou de um
  especialista. Memória de projeto não vaza para fora do projeto.
- Dado sensível (CPF, CNPJ, cartão, senha, conta, saúde) é detectado e a memória
  fica PENDENTE de aprovação. A IA não usa até a titular aprovar.
- Detecção de memórias que se batem, separando contradição de repetição.
- Data de revisão por memória, com aviso quando vence. Nada é apagado sozinho.
- Exportação das memórias em JSON.
- Saúde do conteúdo: conteúdo repetido e conteúdo sem mexer há mais de seis
  meses, só como aviso.
- `PENDENCIAS_DA_TITULAR.md` ganhou a seção do que não é possível construir e
  por quê, e a chave de busca ficou com o passo a passo concreto.

## Base preservada da v140

- Captura de tarefa em linguagem natural, em português: "ligar pro fornecedor
  sexta às 15h por 30min !alta #compras @ana" cria a tarefa com data, hora,
  duração, prioridade, projeto e responsável separados, e o título limpo.
- Entende hoje, amanhã, depois de amanhã, dia da semana, "próxima sexta",
  "em 3 dias", "em 2 semanas", 15/08, "dia 15 de agosto", e "dia 5" que já
  passou vira o mês seguinte.
- Entende recorrência: "toda segunda", "todos os dias", "todo mês".
- Data impossível (31/02) é recusada em vez de virar data errada.
- Prévia na tela mostrando o que foi entendido, e aviso quando nada de data ou
  hora foi reconhecido.
- Agendamento inteligente: encaixa as tarefas em aberto nos horários livres,
  respeitando jornada, almoço, dias úteis e os compromissos já marcados.
- Nunca agenda depois do prazo da tarefa, e quando não cabe diz por quê em vez
  de sumir com a tarefa.
- Respeita a hora pedida quando ela está livre, e desvia quando está ocupada.
- Carga de cada dia com capacidade, ocupado, livre e aviso de sobrecarga.
- Aviso de compromissos sobrepostos na agenda.
- Tarefas atrasadas trazidas para o próximo dia útil de uma vez.
- Jornada de trabalho configurável (começo, fim, almoço).
- Módulo isolado em `src/features/planner/`, carregado sob demanda.

## Base preservada da v139

- Quadro rápido de reunião: caneta, marca-texto, régua e borracha, com desenho
  por mouse, dedo ou caneta de tablet.
- Reconhecimento de forma: retângulo, elipse, triângulo e linha desenhados
  tortos viram formas limpas. Quando o traço não parece nada, o desenho é
  mantido como está em vez de o app chutar uma forma errada.
- Régua encaixa em ângulos de 15 graus, saindo horizontal, vertical ou diagonal
  exata, preservando o comprimento do traço.
- Borracha apaga por proximidade do traço, não por retângulo.
- Notas com reações (👍 ❤️ ❓ ⚠️), que somam por pessoa e desfazem no segundo
  toque.
- As notas escritas viram tarefas de verdade.
- Salva sozinho a cada traço, para retomar a reunião depois; exporta em SVG.
- Declarado na própria tela: reconhecimento de escrita à mão e edição simultânea
  entre pessoas não estão incluídos, e por quê.

## Base preservada da v138

- Diagramas técnicos: 26 formas em sete categorias — fluxograma, BPMN, UML,
  organograma, redes e segurança, nuvem e processo industrial.
- Conectores que grudam nas formas: escolhem sozinhos o par de lados mais curto
  e se reposicionam quando a forma se move.
- Roteamento em cotovelo: nunca desenha diagonal.
- Encaixe na grade, alinhamento (esquerda, centro, direita, topo, base) e
  distribuição com espaçamento igual.
- Validação do diagrama: conector inválido, forma solta, ciclos, partes que não
  se conectam, e as regras de BPMN (evento inicial sem entrada, evento final sem
  saída, gateway com pelo menos dois caminhos, tarefa inalcançável).
- Organograma gerado automaticamente a partir de uma base de dados, com os
  níveis de hierarquia posicionados.
- Situação por cor: escrever "atrasado" ou "no prazo" pinta a forma.
- Exportação em SVG, Mermaid e CSV; importação de Mermaid e CSV.
- Módulo isolado em `src/features/diagrams/`, carregado sob demanda.

## Base preservada da v137

- Quadro visual: canvas sem fim com zoom, arraste e enquadrar tudo.
- Sete tipos de elemento: post-it, texto, retângulo, elipse, seta, área e cartão.
- Seis modelos visuais prontos: SWOT, canvas de modelo de negócio, jornada do
  cliente, kanban, retrospectiva e persona.
- Facilitação de reunião: cronômetro de 5 e 10 minutos, votação que abre e
  fecha, painel dos mais votados e agrupamento de post-its por proximidade.
- Transformação em trabalho: os post-its escritos viram tarefas de verdade,
  levando a contagem de votos.
- IA no quadro: agrupar ideias por tema, resumir o quadro e transformar em plano
  de ação, sempre com instrução de não inventar ideias.
- O zoom mantém fixo o ponto sob o cursor, então o quadro não escorrega.
- Correção de tablet: o manifest travava a orientação em retrato
  (`portrait-primary`); agora aceita retrato e paisagem.
- Módulo isolado em `src/features/canvas/`, carregado sob demanda.

## Base preservada da v136

- Reuniões: gravação pelo navegador, envio de áudio, transcrição e ata por IA.
- Transcrição com Whisper no Workers AI, pela rota `/api/transcribe`; o áudio
  não é armazenado no servidor.
- Consentimento de gravação obrigatório antes de gravar, com aviso de que gravar
  sem avisar os participantes pode ser ilegal.
- Transcrição estruturada em falas, com participante e marcação de tempo.
- Quem falou quanto, em turnos e em percentual do que foi dito.
- Correção do nome de um participante em toda a transcrição de uma vez.
- Busca dentro da transcrição.
- Ata gerada pela IA em seções: resumo, decisões, tarefas, riscos, perguntas
  pendentes e temas, com instrução explícita para não inventar prazos.
- Automação pós-reunião: as tarefas da ata viram tarefas de verdade no app, com
  responsável apontado e prazo convertido de DD/MM para data completa.
- Biblioteca de reuniões com busca por título, participante, transcrição ou
  resumo, e filtro por etiqueta.
- Módulo isolado em `src/features/meetings/`, carregado sob demanda.

## Base preservada da v135

- Resultado do mês: quanto entrou, quanto saiu, quanto sobrou e a margem.
- Comparação com o mês anterior em valor e em percentual, com aviso honesto
  quando não existe base anterior de comparação.
- Para onde foi o dinheiro: saídas agrupadas por categoria, com a fatia de cada
  uma, e de onde veio a receita quando há mais de uma origem.
- Gráfico dos últimos seis meses e média dos meses com movimento.
- Maiores saídas do mês, para atacar o que realmente pesa.
- Caixa contra competência: o que efetivamente moveu no mês contra o que venceu
  no mês, usando as contas a receber e a pagar. A diferença é o que ficou para
  receber.
- Margem aparece como travessão, não 0%, quando não houve receita no mês.
- Módulo isolado em `src/features/finance/`, carregado sob demanda.

## Base preservada da v134

- Funil de vendas com oportunidades, etapas com probabilidade e previsão.
- Previsão ponderada: valor × probabilidade da etapa, em vez da soma otimista.
- Probabilidade própria por oportunidade quando ela difere da etapa.
- Taxa de conversão de cada etapa para a seguinte.
- Taxa de fechamento, ticket médio e ciclo médio de venda em dias.
- Previsão por mês a partir da data prevista de fechamento.
- Aviso de oportunidades paradas há mais de 14 dias na mesma etapa.
- Motivos de perda agrupados, para saber por que se perde e não só quanto.
- Quadro por etapa com movimentação e histórico de cada mudança.
- Módulo isolado em `src/features/crm/`, carregado sob demanda.

## Base preservada da v133

- Editor universal com blocos de texto, títulos, listas, checklists, tabelas,
  colunas, imagens, vídeos, arquivos, código, destaques, toggles e gráficos.
- Bases, tarefas e formulários incorporados com visualizações conectadas aos
  registros reais do workspace.
- Conteúdo sincronizado reutilizável, com atualização refletida em todos os
  documentos que usam o mesmo componente.
- Conversão automática de documentos antigos para blocos, sem perder conteúdo,
  versões, assinaturas, importação ou exportação em PDF, DOCX e TXT.
- URLs externas restritas a HTTPS e arquivos referenciados sem gravar dados
  brutos no documento.
- Conteúdo sincronizado isolado por usuário, empresa e workspace, com permissões
  separadas para visualizar e editar.
- Editor e domínio isolados em `src/features/documents/`, carregados sob demanda.

## Base preservada da v132

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
