# Versão publicada

## v121

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
