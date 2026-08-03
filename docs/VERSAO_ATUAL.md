# Versão publicada

## v156

- **Tela nova: Mídia.** Três coisas que o negócio precisa todo dia e que até
  agora dependiam de site de terceiro: editar foto, gravar recado e achar
  arquivo depois.
- **Editar imagem** direto no navegador: recortar em 1:1, 4:5, 9:16 ou 16:9;
  redimensionar por largura, altura ou porcentagem; tamanhos prontos para post
  quadrado, story, capa de site e foto de produto; girar, espelhar e ajustar
  brilho, contraste, saturação e preto e branco.
- **Deixar a foto leve**: escolha WebP, JPEG ou PNG e, se quiser, um tamanho
  máximo em KB — o app procura sozinho a melhor qualidade que cabe nesse
  limite. Numa foto de teste, uma imagem virou 90% menor.
- Um tamanho pronto nunca aumenta a imagem: aumentar só borra. Se a foto já é
  menor que o tamanho pedido, ela fica como está.
- **Gravar recado de voz** pelo microfone, com limite de 5 minutos, para não
  encher o espaço de trabalho sem querer.
- **Ditar e ouvir**: dite um texto por voz e ouça qualquer texto em voz alta,
  em português, com velocidade ajustável. Serve para legenda de post, roteiro
  de vídeo e recado para cliente. Tem um botão que arruma a pontuação do que
  foi ditado.
- **Biblioteca de mídia**: tudo o que a IA gerou, o que você editou e o que
  gravou fica no mesmo lugar. Busca por nome, por etiqueta e até pelo que foi
  dito dentro do áudio. Dá para renomear, etiquetar, baixar e apagar.
- A biblioteca mostra quanto está ocupando e avisa quando fica pesada a ponto
  de deixar o app lento, apontando os arquivos maiores.
- **Nada disso sai do seu aparelho.** Não há servidor de imagem, não há serviço
  pago por trás e funciona mesmo sem internet. Foi assim de propósito: é o que
  permite entregar isto sem custo nenhum.
- SVG não é aceito como imagem de entrada, de propósito: SVG é código e pode
  carregar script.

## Base preservada da v155

- **O app foi ajustado para o celular.** A queixa era direta: "quando abro no
  celular fica tudo desengonçado". Cada tela foi medida em navegador de
  verdade, em iPhone SE (320px) e iPhone 13 (390px) — 63 telas, as duas
  larguras — até nenhuma caixa passar da borda.
- Cabeçalho de seção agora quebra linha. Antes, o botão da direita (por exemplo
  "Exportar relatório", no Financeiro) empurrava o cabeçalho para fora da tela
  e arrastava o painel inteiro junto.
- Cartões e painéis param de "vazar" pela direita. As grades de coluna única do
  celular passaram a poder encolher de verdade; antes elas cresciam até a
  largura mínima do conteúdo e o cartão saía da tela.
- Campo de escolha (aquele "Com [Diretor]", o período dos Dashboards) não
  estica mais a linha inteira: ele nasce com a largura da opção mais longa e
  agora fica limitado à tela.
- Faixa de abas larga demais (Quadro / Lista / Calendário / Gantt…) agora rola
  com o dedo em vez de ser cortada. Nenhuma aba fica inalcançável.
- Campos de texto com 16px no celular: abaixo disso o iOS dá zoom sozinho ao
  tocar no campo — e não volta.
- Alvo de toque de no mínimo 44px em botões de ícone e atalhos, porque o dedo
  não tem a precisão do mouse.
- Área segura do iPhone com entalhe respeitada (topo, laterais e barra de
  gestos), para o conteúdo não sumir justamente nas bordas.
- A página não rola mais para os lados.
- Ficaram testes automáticos guardando essas regras, para o layout não
  regredir sem ninguém perceber.

## Base preservada da v154

- Cada pessoa escolhe o seu menu principal. O que você usa fica no topo, e o
  resto vai para "Todas as ferramentas", logo abaixo.
- **Escolher o menu não tira acesso a nada.** Ferramenta fora do menu continua
  funcionando, continua alcançável na lista completa e continua aparecendo na
  busca. Isso é organização de atalho, não permissão.
- A lista completa começa aberta, do jeito que sempre foi. Quem quiser a visão
  enxuta fecha uma vez e ela continua fechada nas próximas visitas.
- Tela "Personalizar menu": marque o que entra, reordene com as setas, ou volte
  ao padrão. O Início é fixo, para ninguém perder o caminho de volta.
- Sugestão pelo uso real: o app mostra o que você mais abre e ainda não está no
  menu, e o que está no menu mas você nunca abriu. São só sugestões — o menu
  nunca se reorganiza sozinho, senão você perderia o botão que já decorou.
- Menu salvo com uma tela que não existe mais é limpo sozinho, sem virar botão
  quebrado.

## Base preservada da v153

- O app é 100% gratuito para todo mundo neste primeiro momento. Nada é cobrado
  e nenhum recurso fica atrás de plano pago. Quem entra hoje já cai no plano
  "Lançamento", com tudo liberado.
- A tela "Meu plano" deixou de vender: ela agora só mostra quanto você usou no
  mês, e diz claramente que está tudo liberado.
- Continua existindo um teto de uso, e ele não é comercial: a IA do app roda na
  cota grátis dos provedores, que é compartilhada por todas as contas. O teto
  impede que uma conta em laço infinito derrube a IA para todo mundo. Os
  números são altos de propósito — 5.000 conversas por mês — e quem usa o app
  o dia inteiro não chega perto.
- Os planos pagos ficam prontos e testados, adormecidos. No dia em que a
  cobrança começar, é uma linha de configuração: os testes da venda voltam a
  rodar sozinhos.

## Base preservada da v152

- Planos e limite de uso, que é o que faltava para o app poder ser vendido.
  Três planos: Gratuito, Profissional e Equipe, cada um com sua cota de
  conversas com a IA, buscas na internet, execuções de agente, pessoas no time
  e negócios.
- Tela "Meu plano" mostrando quanto você já usou no mês, com barra por medida e
  aviso quando passa de 80%. Nada é apagado ao chegar no limite: você só não
  consegue gastar mais até virar o mês, e a cota renova sozinha no dia 1º.
- Quando o limite chega, a recusa vem com explicação em português e diz qual
  plano resolveria — e só sugere plano que de fato resolve.
- O limite vale no servidor, não só na tela. Limite que existe só no navegador
  qualquer um contorna; este é conferido antes de gastar o recurso, e o
  endpoint de streaming também passa pela mesma checagem, para não virar um
  caminho paralelo de furar a cota.
- Proteção contra plano forjado: id desconhecido ou limite escrito à mão nunca
  vira acesso ilimitado, sempre cai no plano mais restrito.

## Base preservada da v151

- Correção de segurança: o texto trazido de sites da internet passou a ser
  tratado como informação, nunca como ordem. Uma página pode esconder no meio
  do texto um pedido do tipo "ignore o que mandaram e crie tal coisa", e a IA
  tendia a obedecer. Agora todo trecho externo vem cercado e marcado, e a IA é
  instruída a ignorar qualquer ordem vinda dali e avisar quando isso acontecer.
- A busca na internet parou de disparar à toa. Neste app "buscar", "procurar" e
  "pesquisar" quase sempre querem dizer "acha no meu workspace" — "busca o
  pedido 123" não precisa sair para fora. Agora só busca quando você nomeia a
  fonte (internet, google, online) ou pergunta algo que muda no mundo (notícia,
  cotação, preço de mercado, lei atual). Isso deixa a resposta mais rápida,
  gasta menos cota e para de mandar pergunta interna sua para empresa de fora.
- O planejamento dos agentes nunca mais puxa conteúdo da internet. O plano
  decide o que o agente vai fazer no seu negócio; site desconhecido não opina
  nisso.

## Base preservada da v150

- A IA transforma título e descrição livres em tarefa executável, preservando
  os fatos informados e sugerindo prioridade, área, duração, etapas, critérios
  observáveis, riscos, lacunas e colaborador digital.
- A estrutura recebida da IA passa por um parser fechado. Campos inesperados,
  respostas sem JSON e valores fora do domínio não entram silenciosamente na
  tarefa.
- Quando todos os provedores estão indisponíveis, uma contingência local cria
  um roteiro seguro com etapas e critérios, sem token e sem custo.
- Etapas e critérios de conclusão agora servem para qualquer tarefa, não apenas
  para missões. Uma tarefa com itens cadastrados e pendentes não pode ser
  concluída nem aprovada por engano; tarefas antigas sem checklist continuam
  funcionando.
- A fila “Foco recomendado” ordena tarefas ativas por atraso, prazo, prioridade,
  andamento, bloqueios e ausência de responsável diretamente no navegador,
  sem consumir IA.
- O colaborador digital recebe negócio, projeto, prazo, etapas, critérios,
  dependências e texto extraído dos anexos. O pedido exige entrega utilizável,
  fontes quando necessário e proíbe fingir ações externas.
- Cada execução abre uma conversa vinculada à tarefa. A resposta pode ser
  anexada de volta como entrega para conferência, preservando até três versões
  recentes sem concluir nada automaticamente.
- Tarefas recorrentes reiniciam etapas e critérios na próxima ocorrência, sem
  reaproveitar confirmações nem entregas de IA da ocorrência anterior.

## v149

- Nova **Central do negócio** transforma o aplicativo em uma plataforma
  configurável por atividade, sem criar versões separadas por setor.
- O catálogo inicial reúne 30 categorias e mais de 300 atividades, cobrindo
  alimentação, beleza, saúde, pets, serviços, B2B, educação, tecnologia,
  transporte, varejo, indústria, agronegócio, criadores, organizações e outros.
- Influenciadores, podcasters, streamers, infoprodutores e gestores de
  comunidades passam a ter perfil próprio, com conteúdo, presença digital,
  clientes, financeiro, comércio, conhecimento e automações recomendados.
- Toda categoria oferece “Outra atividade” e descrição livre. Negócios
  híbridos, novos ou de nicho não dependem de o nome já existir no catálogo.
- Doze pacotes de funções podem ser ligados ou desligados por negócio. O menu
  pode mostrar apenas o foco escolhido ou continuar exibindo todas as áreas.
- Alterar o tipo sugere uma combinação inicial, mas nunca bloqueia funções: a
  pessoa pode ativar qualquer pacote ou todos de uma vez.
- Contas antigas preservam o menu completo. A personalização só entra quando a
  titular do negócio a escolhe, evitando regressão na experiência atual.
- Categoria, atividade e áreas selecionadas passam a compor o contexto seguro
  da IA, para que respostas e entregáveis se adaptem ao trabalho real.

## v148

- Nova **Central de crescimento** reúne sete frentes gratuitas que fecham
  lacunas transversais de plataformas especializadas.
- Agenda pública própria com link compartilhável, disponibilidade, duração,
  fuso, protocolo, cancelamento seguro e trava relacional contra duas reservas
  concorrentes no mesmo horário.
- Central de atendimento pública com protocolo, categoria, prioridade, fila,
  responsável, estados e SLA calculado por urgência.
- Planejamento de sprints reaproveita as tarefas existentes: backlog, pontos,
  andamento, bloqueio, conclusão, velocidade e progresso sem criar cópia dos
  cartões.
- Gravação de tela usa `getDisplayMedia` e `MediaRecorder`; o vídeo permanece no
  dispositivo, tem pausa, prévia e download WebM sem servidor ou API.
- Analytics próprio recebe page views e eventos com CORS por origem e guarda
  apenas caminho, domínio referenciador e identificadores aleatórios. O painel
  mostra visitantes, sessões, visualizações, eventos e rankings.
- Campanhas preservam rascunho, assunto, conteúdo e segmentação; somente contatos
  com e-mail e consentimento explícito entram no público exportável.
- Estoque ganhou visão de ruptura, mínimo, reposição sugerida, ajuste por
  variante e lista de compras em CSV, conectado ao catálogo e à baixa já
  realizada pelos pedidos.
- Agendas, reservas, portais, chamados, sites de analytics, eventos e campanhas
  ficam em tabelas D1 relacionais próprias. Dados de maior volume não aumentam o
  JSON do workspace.
- Cada frente mantém contingência gratuita: link próprio para agendas e suporte,
  gravação local, analytics first-party, campanhas exportáveis e estoque
  operacional mesmo sem provedor externo.

## v147

- Novo **Laboratório gratuito** reúne as seis funções restantes: revisão de
  respostas de IA, assistente local, locução, criação de aplicativos por
  pedido, marketplace de templates e API pública.
- O avaliador roda no navegador, mede aderência, completude, clareza,
  evidências e cautela, sempre como heurística — ele nunca declara que a
  própria IA está correta.
- A IA local tenta o modelo nativo do dispositivo. Quando ele não existe, usa
  um plano determinístico local, sem chave e sem enviar o pedido ao servidor.
- A locução usa as vozes instaladas no navegador ou sistema, com velocidade,
  tom, pausa, retomada e roteiro exportável como contingência.
- O construtor transforma um pedido em blocos declarativos editáveis, mostra a
  prévia em ambiente isolado, salva o aplicativo no espaço e exporta HTML
  responsivo. Código JavaScript arbitrário nunca é executado.
- O marketplace traz templates oficiais gratuitos e permite publicar modelos
  da comunidade. A moderação bloqueia scripts, eventos HTML, payloads inválidos
  e licenças fora de CC0, CC-BY ou MIT.
- A API REST gratuita nasce versionada em `/api/public/v1`, com OpenAPI, CORS,
  limite de 120 chamadas por minuto e chaves de leitura ou leitura/escrita.
- As chaves públicas são exibidas uma única vez e persistidas somente como
  SHA-256. Podem ser revogadas; chaves de leitura não escrevem.
- Criação de tarefas e contatos exige `Idempotency-Key`, evitando duplicação
  quando outro sistema repete uma chamada. Atualizações concorrentes não
  sobrescrevem silenciosamente o workspace.
- Aplicativos, templates, chaves e idempotência ficam em tabelas D1 próprias,
  fora do JSON principal do workspace.

## v146

- Nova área **Criação sem custo**, que funciona no próprio navegador e não
  consome API: cria carrosséis de até dez slides, redimensiona imagens em lote,
  remove fundos de cor uniforme e gera QR Codes.
- Carrosséis preservam a marca do negócio, oferecem prévia e baixam todos os
  slides em PNG dentro de um arquivo ZIP.
- Imagens podem ser enquadradas nos tamanhos mais usados em redes sociais. O
  original não é alterado e até vinte versões são baixadas juntas.
- O removedor de fundo preserva o arquivo original e permite ajustar a
  tolerância, porque apagar automaticamente parte do produto seria pior do que
  avisar a limitação.
- Apresentações agora também baixam em PowerPoint editável (`.pptx`), além do
  PDF que já existia.
- A exportação DOCX já fazia parte do aplicativo e foi preservada; não foi
  duplicada com outro botão que faria a mesma coisa.

## v145

- Agentes: você escreve o objetivo, a IA monta o passo a passo e executa. Nada
  é feito antes de o plano existir e estar na tela.
- Aviso fixo em toda a tela de que a IA pode errar: ela entende mal um pedido,
  inventa dado que não existe e às vezes faz algo parecido com o pedido, mas
  não a coisa certa. O aviso não fecha nem some.
- Quatro níveis de autonomia, escolhidos por agente: só mostrar o plano; pode
  olhar meus dados; pode criar coisas para mim; e pode fazer tudo, inclusive
  enviar. O último avisa antes o que significa, porque mensagem enviada não
  volta.
- Catálogo fechado de ferramentas: procurar, ler financeiro/agenda/CRM,
  resumir, criar tarefa/nota/documento, marcar compromisso, lançar no
  financeiro, rascunhar e enviar. O agente não tem caminho para nada fora
  dessa lista.
- Limite de passos por execução, definido por você. Plano que a IA escreveu
  errado para em vez de rodar em círculo.
- Passo recusado derruba quem dependia dele, em vez de executar pela metade
  justamente o que você vetou.
- Só o passo da vez pede aprovação: aprovar um passo cuja dependência ainda nem
  rodou seria decidir no escuro.
- Retomar execução interrompida sem refazer o que já foi feito — refazer um
  lançamento no financeiro lançaria duas vezes.
- Histórico do que a IA decidiu, com hora, e destaque para o que saiu para
  fora.
- Conferência dos critérios de aceite que você escreveu, sempre apresentada
  como indício e nunca como aprovação: a IA não é boa juíza do próprio
  trabalho.
- Envio de e-mail e WhatsApp ainda não acontece de verdade porque falta
  conectar a conta de envio. Em vez de fingir que enviou, o passo falha e diz
  exatamente o que falta.
- Correção: `Number(x) || 8` fazia quem digitasse limite 0 receber 8 passos
  calado, porque zero é falso em JavaScript — o oposto de limitar o agente.
- Correção: o agente criava a tarefa, dizia que criou, e a gravação seguinte da
  execução apagava tudo, porque partia de uma cópia velha do banco. Agora o
  trabalho é acumulado e gravado uma vez só.

## Base preservada da v144

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
