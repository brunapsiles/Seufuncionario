# Versão publicada

## v123

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
