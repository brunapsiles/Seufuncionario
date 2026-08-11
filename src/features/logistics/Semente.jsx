import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Mic, Send, X } from "lucide-react";
import SementeAvatar from "./SementeAvatar.jsx";
import {
  HABILIDADES,
  SEMENTE,
  atalhosDaTela,
  corpoDaPergunta,
  especialistaDaTela,
  textoDaProposta,
} from "./sementeDomain.js";
import "./Semente.css";

// A Semente na tela.
//
// Recolhida por padrão, num botão pequeno no canto. Quem trabalha na vertical
// veio resolver alguma coisa — um painel aberto por cima do conteúdo, sem
// pedir, atrapalha em vez de ajudar. Ela aparece, fica à mão, e só ocupa
// espaço quando alguém chama. A escolha de fechar é lembrada entre telas.
//
// Ela fala com /api/todogreen/semente, não com o /api/ai genérico. A diferença
// não é o modelo — é a mesma cadeia de provedores por baixo — e sim o que
// chega junto da pergunta: a carteira real de quem perguntou, as ferramentas
// de consulta ao CRM e à pesquisa externa, e o direito de propor uma ação.
// Perguntar "o que está parado?" para um endpoint que só recebe o resumo do
// painel devolve conselho de logística; para este, devolve os nomes das contas.
//
// Ação proposta NÃO é ação executada. A resposta pode vir com uma proposta, e
// a proposta vira um botão. Quem clica é a pessoa. Modelo que grava no banco
// sozinho, a partir de texto livre, é injeção de prompt com permissão de
// escrita — e o dado do cliente é que paga.

const CHAVE_ABERTA = "todogreen:semente:aberta";

let contador = 0;
const proximoId = () => (contador += 1);

const lerArquivoComoBase64 = (arquivo) => new Promise((resolve, reject) => {
  const leitor = new FileReader();
  leitor.onload = () => resolve(String(leitor.result || "").split(",")[1] || "");
  leitor.onerror = () => reject(new Error("Não consegui ler o áudio."));
  leitor.readAsDataURL(arquivo);
});

const imagemSegura = (value) => {
  const url = String(value || "");
  return /^data:image\/(?:png|jpe?g|webp);base64,/i.test(url) || /^https:\/\//i.test(url) ? url : "";
};

const partesInline = (texto, prefixo) => {
  const partes = [];
  const padrao = /(\*\*[^*\n]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  let inicio = 0;
  let achado;
  while ((achado = padrao.exec(texto)) !== null) {
    if (achado.index > inicio) partes.push(texto.slice(inicio, achado.index));
    const token = achado[0];
    if (token.startsWith("**")) {
      partes.push(<strong key={`${prefixo}-strong-${achado.index}`}>{token.slice(2, -2)}</strong>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      partes.push(<a key={`${prefixo}-link-${achado.index}`} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>);
    }
    inicio = achado.index + token.length;
  }
  if (inicio < texto.length) partes.push(texto.slice(inicio));
  return partes;
};

// Renderiza o subconjunto de Markdown que a IA usa, com elementos React. Sem
// HTML injetado: símbolos viram formatação, mas o texto do modelo continua
// incapaz de inserir marcação executável na página.
function MensagemSemente({ texto, classe }) {
  const linhas = String(texto || "").split(/\r?\n/);
  const blocos = [];
  for (let indice = 0; indice < linhas.length;) {
    const linha = linhas[indice].trim();
    if (!linha) { indice += 1; continue; }
    const titulo = linha.match(/^#{1,6}\s+(.+)$/);
    if (titulo) {
      blocos.push(<strong className="semente-msg-titulo" key={`titulo-${indice}`}>{partesInline(titulo[1], `titulo-${indice}`)}</strong>);
      indice += 1;
      continue;
    }
    const marcador = linha.match(/^[-*]\s+(.+)$/);
    if (marcador) {
      const itens = [];
      while (indice < linhas.length) {
        const item = linhas[indice].trim().match(/^[-*]\s+(.+)$/);
        if (!item) break;
        itens.push(<li key={`item-${indice}`}>{partesInline(item[1], `item-${indice}`)}</li>);
        indice += 1;
      }
      blocos.push(<ul key={`lista-${indice}`}>{itens}</ul>);
      continue;
    }
    const numerado = linha.match(/^\d+[.)]\s+(.+)$/);
    if (numerado) {
      const itens = [];
      while (indice < linhas.length) {
        const item = linhas[indice].trim().match(/^\d+[.)]\s+(.+)$/);
        if (!item) break;
        itens.push(<li key={`numero-${indice}`}>{partesInline(item[1], `numero-${indice}`)}</li>);
        indice += 1;
      }
      blocos.push(<ol key={`numerada-${indice}`}>{itens}</ol>);
      continue;
    }
    blocos.push(<p key={`paragrafo-${indice}`}>{partesInline(linha, `paragrafo-${indice}`)}</p>);
    indice += 1;
  }
  return <div className={classe}>{blocos}</div>;
}

export default function Semente({ pagina, clienteId, authHeaders, aoAgir }) {
  const [aberta, setAberta] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [mensagens, setMensagens] = useState([]);
  const [pensando, setPensando] = useState(false);
  const [executando, setExecutando] = useState("");
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [modoImagem, setModoImagem] = useState(false);
  const [erroMidia, setErroMidia] = useState("");
  const conversa = useRef(null);
  const arquivoAudio = useRef(null);

  const especialista = especialistaDaTela(pagina);
  const atalhos = atalhosDaTela(pagina);

  useEffect(() => {
    try {
      setAberta(localStorage.getItem(CHAVE_ABERTA) === "1");
    } catch {
      // localStorage bloqueado (janela anônima, política do navegador): a
      // Semente segue funcionando, só não lembra da escolha.
    }
  }, []);

  const alternar = useCallback((proximo) => {
    setAberta(proximo);
    try {
      localStorage.setItem(CHAVE_ABERTA, proximo ? "1" : "0");
    } catch {
      // Ver acima.
    }
  }, []);

  // Rola a própria conversa, não a página. `scrollIntoView` num painel fixo
  // arrasta o conteúdo atrás dele junto — quem está lendo a tela perderia o
  // lugar toda vez que a Semente respondesse, que é o oposto de não atrapalhar.
  useEffect(() => {
    const caixa = conversa.current;
    if (aberta && caixa) caixa.scrollTop = caixa.scrollHeight;
  }, [aberta, mensagens, pensando]);

  const chamar = useCallback(
    async (corpo) => {
      const resposta = await fetch("/api/todogreen/semente", {
        method: "POST",
        headers: { "content-type": "application/json", ...(authHeaders?.() || {}) },
        body: JSON.stringify(corpo),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.error || "Não consegui responder agora.");
      return dados;
    },
    [authHeaders],
  );

  const perguntar = useCallback(
    async (texto) => {
      const { valido, corpo } = corpoDaPergunta({
        pergunta: texto,
        tela: pagina,
        clienteId,
        historico: mensagens,
      });
      if (!valido || pensando) return;
      setMensagens((atual) => [...atual, { id: `voce-${proximoId()}`, de: "voce", texto }]);
      setPergunta("");
      setPensando(true);
      try {
        const dados = await chamar(corpo);
        setMensagens((atual) => [
          ...atual,
          {
            id: `semente-${proximoId()}`,
            de: "semente",
            texto: dados.resposta,
            consultou: dados.consultou || null,
            proposta: dados.proposta || null,
          },
        ]);
      } catch (erro) {
        setMensagens((atual) => [
          ...atual,
          { id: `erro-${proximoId()}`, de: "semente", texto: erro.message, falhou: true },
        ]);
      } finally {
        setPensando(false);
      }
    },
    [chamar, clienteId, mensagens, pagina, pensando],
  );

  const executar = useCallback(
    async (mensagemId, proposta) => {
      setExecutando(mensagemId);
      try {
        const dados = await chamar({ executar: proposta });
        setMensagens((atual) =>
          atual.map((item) =>
            item.id === mensagemId ? { ...item, proposta: null, feito: dados.resumo } : item,
          ),
        );
        aoAgir?.(dados);
      } catch (erro) {
        setMensagens((atual) =>
          atual.map((item) => (item.id === mensagemId ? { ...item, falhaDaAcao: erro.message } : item)),
        );
      } finally {
        setExecutando("");
      }
    },
    [aoAgir, chamar],
  );

  const transcrever = useCallback(async (arquivo) => {
    if (!arquivo || transcrevendo) return;
    setErroMidia("");
    if (!String(arquivo.type || "").startsWith("audio/")) {
      setErroMidia("Escolha um arquivo de áudio.");
      return;
    }
    if (arquivo.size > 6_000_000) {
      setErroMidia("O áudio deve ter no máximo 6 MB.");
      return;
    }
    setTranscrevendo(true);
    try {
      const audio = await lerArquivoComoBase64(arquivo);
      const resposta = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json", ...(authHeaders?.() || {}) },
        body: JSON.stringify({ audio, language: "pt" }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.error || "Não consegui transcrever o áudio.");
      setModoImagem(false);
      setPergunta(String(dados.text || "").trim());
    } catch (erro) {
      setErroMidia(erro.message || "Não consegui transcrever o áudio.");
    } finally {
      setTranscrevendo(false);
      if (arquivoAudio.current) arquivoAudio.current.value = "";
    }
  }, [authHeaders, transcrevendo]);

  const gerarImagem = useCallback(async (texto) => {
    const descricao = String(texto || "").trim();
    if (descricao.length < 5 || pensando) return;
    setMensagens((atual) => [...atual, { id: `voce-${proximoId()}`, de: "voce", texto: `Imagem: ${descricao}` }]);
    setPergunta("");
    setErroMidia("");
    setPensando(true);
    try {
      const resposta = await fetch("/api/media", {
        method: "POST",
        headers: { "content-type": "application/json", ...(authHeaders?.() || {}) },
        body: JSON.stringify({
          type: "image",
          prompt: `Material visual institucional da To Do Green, logística sustentável no Brasil, identidade executiva em verde profundo, verde claro, grafite e fundo off-white, sem gradiente e sem marca de outra empresa. ${descricao}`,
        }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.error || "Não consegui gerar a imagem.");
      const url = imagemSegura(dados.url);
      if (!url) throw new Error("A geração terminou sem uma imagem válida.");
      setMensagens((atual) => [...atual, {
        id: `semente-${proximoId()}`,
        de: "semente",
        texto: "Imagem criada para a To Do Green. Revise antes de usar externamente.",
        imagemUrl: url,
      }]);
    } catch (erro) {
      setMensagens((atual) => [...atual, {
        id: `erro-${proximoId()}`,
        de: "semente",
        texto: erro.message || "Não consegui gerar a imagem.",
        falhou: true,
      }]);
    } finally {
      setPensando(false);
      setModoImagem(false);
    }
  }, [authHeaders, pensando]);

  if (!aberta) {
    return (
      <button
        type="button"
        className="semente-launcher"
        onClick={() => alternar(true)}
        aria-label={`Abrir ${SEMENTE.nome}, ${SEMENTE.assinatura}`}
      >
        <SementeAvatar estado="calma" tamanho={28} />
        <span>{SEMENTE.nome}</span>
      </button>
    );
  }

  return (
    <aside className="semente" aria-label={`${SEMENTE.nome} — ${SEMENTE.assinatura}`}>
      <header className="semente-topo">
        <SementeAvatar estado={pensando ? "pensando" : "calma"} tamanho={34} />
        <div>
          <strong>{SEMENTE.nome}</strong>
          <small>{pensando ? "Analisando..." : especialista}</small>
        </div>
        <button type="button" onClick={() => alternar(false)} aria-label="Fechar a Semente">
          <X size={17} />
        </button>
      </header>

      <div className="semente-conversa" role="log" aria-live="polite" ref={conversa}>
        {mensagens.length === 0 && (
          <div className="semente-boas-vindas">
            <p>{SEMENTE.saudacao}</p>
            <ul className="semente-habilidades">
              {HABILIDADES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <span className="semente-lema">{SEMENTE.lema}</span>
          </div>
        )}

        {mensagens.map((item) => (
          <div className={`semente-bloco semente-bloco--${item.de}`} key={item.id}>
            {/* Dizer o que ela foi buscar não é enfeite: é como alguém confere
                se a resposta veio do dado certo ou de um palpite. */}
            {item.consultou && (
              <small className="semente-consulta">Consultei: {item.consultou.ferramenta}</small>
            )}
            {item.de === "semente" && !item.falhou
              ? <MensagemSemente texto={item.texto} classe="semente-msg semente-msg--semente" />
              : <p className={`semente-msg semente-msg--${item.de}${item.falhou ? " semente-msg--erro" : ""}`}>{item.texto}</p>}
            {item.imagemUrl && <div className="semente-imagem"><img src={item.imagemUrl} alt="Imagem criada pela Semente para a To Do Green" /><a href={item.imagemUrl} download="todogreen-imagem.jpg">Baixar imagem</a></div>}
            {item.proposta && (
              <div className="semente-proposta">
                <strong>{textoDaProposta(item.proposta)}</strong>
                <small>Nada foi gravado ainda. Confirme para executar.</small>
                <button
                  type="button"
                  onClick={() => executar(item.id, item.proposta)}
                  disabled={executando === item.id}
                >
                  <Check size={14} />
                  {executando === item.id ? "Executando..." : "Confirmar e executar"}
                </button>
              </div>
            )}
            {item.feito && <small className="semente-feito">{item.feito}</small>}
            {item.falhaDaAcao && <small className="semente-aviso">{item.falhaDaAcao}</small>}
          </div>
        ))}

        {pensando && (
          <p className="semente-msg semente-msg--semente semente-msg--pensando">Analisando...</p>
        )}
      </div>

      {mensagens.length === 0 && (
        <div className="semente-atalhos">
          {atalhos.map((item) => (
            <button type="button" key={item} onClick={() => perguntar(item)}>
              {item}
            </button>
          ))}
        </div>
      )}

      <form
        className="semente-campo"
        onSubmit={(evento) => {
          evento.preventDefault();
          if (modoImagem) gerarImagem(pergunta);
          else perguntar(pergunta);
        }}
      >
        <div className="semente-midias">
          <button type="button" onClick={() => arquivoAudio.current?.click()} disabled={transcrevendo || pensando} aria-label="Transcrever áudio com Whisper"><Mic size={15} />{transcrevendo ? "Transcrevendo" : "Áudio"}</button>
          <input ref={arquivoAudio} type="file" accept="audio/*" hidden onChange={(evento) => transcrever(evento.target.files?.[0])} />
          <button type="button" className={modoImagem ? "ativo" : ""} onClick={() => { setModoImagem((atual) => !atual); setErroMidia(""); }} disabled={pensando} aria-label="Gerar imagem para a To Do Green"><ImagePlus size={15} />Imagem</button>
        </div>
        {modoImagem && <small className="semente-modo">Modo imagem ativo. Descreva o material que precisa.</small>}
        {erroMidia && <small className="semente-aviso">{erroMidia}</small>}
        <input
          value={pergunta}
          onChange={(evento) => setPergunta(evento.target.value)}
          placeholder={modoImagem ? "Descreva a imagem..." : "Pergunte sobre a sua carteira ou peça uma pesquisa..."}
          aria-label={`Perguntar para a ${SEMENTE.nome}`}
        />
        <button
          type="submit"
          disabled={pensando || pergunta.trim().length < (modoImagem ? 5 : 3)}
          aria-label={modoImagem ? "Gerar imagem" : "Enviar pergunta"}
        >
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}
