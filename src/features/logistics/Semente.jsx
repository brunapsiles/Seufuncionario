import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Leaf, Send, X } from "lucide-react";
import { aiWorkspaceContext } from "../../session/telemetria.js";
import {
  HABILIDADES,
  SEMENTE,
  atalhosDaTela,
  corpoDaPergunta,
  especialistaDaTela,
  eventosDoTrecho,
} from "./sementeDomain.js";
import "./Semente.css";

// A Semente na tela.
//
// Recolhida por padrão, num botão pequeno no canto. Quem trabalha na vertical
// veio resolver alguma coisa — um painel aberto por cima do conteúdo, sem
// pedir, atrapalha em vez de ajudar. Ela aparece, fica à mão, e só ocupa
// espaço quando alguém chama.
//
// Três decisões que valem explicação:
//
// 1) A escolha de fechar é lembrada (localStorage). Se a pessoa fechou, ela
//    não volta abrindo sozinha na próxima tela — isso é o que transforma
//    assistente em incômodo.
//
// 2) O especialista vem da tela, não de uma lista que a pessoa escolhe. Quem
//    está em precificação pergunta de margem; obrigar a escolher "quem
//    responde" antes de perguntar é trabalho que o produto deveria fazer.
//
// 3) Ela usa a API de IA inteira, não uma versão reduzida: mesmo endpoint,
//    mesmo streaming, mesmo espaço de trabalho, mesma memória de conversa,
//    mesma busca na internet e a mesma contingência de provedores do resto do
//    Seu Funcionário. Ver `corpoDaPergunta` em sementeDomain.js.

const CHAVE_ABERTA = "todogreen:semente:aberta";

let contador = 0;
const proximoId = () => (contador += 1);

// Avatar da Semente: a folha da marca sobre o verde da vertical. Um SVG
// simples em vez de imagem — carrega junto do bundle, acompanha o tema e não
// depende de arquivo que pode faltar em produção.
function Avatar({ estado }) {
  return (
    <span className={`semente-avatar semente-avatar--${estado}`} aria-hidden="true">
      <Leaf size={18} strokeWidth={2.2} />
    </span>
  );
}

function Fontes({ fontes }) {
  if (!fontes?.length) return null;
  return (
    <ul className="semente-fontes">
      {fontes.map((fonte) => (
        <li key={fonte.url || fonte.title}>
          <a href={fonte.url} target="_blank" rel="noopener noreferrer">
            {fonte.title || fonte.url}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function Semente({ pagina, resumo, authHeaders }) {
  const [aberta, setAberta] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [mensagens, setMensagens] = useState([]);
  const [pensando, setPensando] = useState(false);
  const [buscarNaWeb, setBuscarNaWeb] = useState(false);
  const conversa = useRef(null);

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

  const perguntar = useCallback(
    async (texto) => {
      const { valido, corpo } = corpoDaPergunta({
        pergunta: texto,
        tela: pagina,
        resumo,
        historico: mensagens,
        // Desligado quer dizer "o servidor decide", não "nunca busque". O
        // servidor tem heurística própria (shouldSearchWeb) e reconhece
        // "preço atual do diesel" sozinho; mandar `false` a desligaria.
        buscarNaWeb: buscarNaWeb || undefined,
      });
      if (!valido || pensando) return;
      const requisicao = {
        method: "POST",
        headers: { "content-type": "application/json", ...(authHeaders?.() || {}) },
        body: JSON.stringify({ ...corpo, ...aiWorkspaceContext() }),
      };
      setMensagens((atual) => [...atual, { de: "voce", texto }]);
      setPergunta("");
      setPensando(true);
      try {
        const emStream = await responderEmStream(requisicao, setMensagens);
        if (!emStream) await responderDeUmaVez(requisicao, setMensagens);
      } catch (erro) {
        setMensagens((atual) => [...atual, { de: "semente", texto: erro.message, falhou: true }]);
      } finally {
        setPensando(false);
      }
    },
    [authHeaders, buscarNaWeb, mensagens, pagina, pensando, resumo],
  );

  if (!aberta) {
    return (
      <button
        type="button"
        className="semente-launcher"
        onClick={() => alternar(true)}
        aria-label={`Abrir ${SEMENTE.nome}, ${SEMENTE.assinatura}`}
      >
        <Avatar estado="calma" />
        <span>{SEMENTE.nome}</span>
      </button>
    );
  }

  return (
    <aside className="semente" aria-label={`${SEMENTE.nome} — ${SEMENTE.assinatura}`}>
      <header className="semente-topo">
        <Avatar estado={pensando ? "pensando" : "calma"} />
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
        {mensagens.map((item, indice) => (
          <div className={`semente-bloco semente-bloco--${item.de}`} key={item.id || `${item.de}-${indice}`}>
            <p
              className={`semente-msg semente-msg--${item.de}${item.falhou ? " semente-msg--erro" : ""}`}
            >
              {item.texto}
            </p>
            {/* Resposta de contingência é dita como tal. Entregar texto de
                emergência com cara de análise é a mentira mais cara que uma
                assistente pode contar para quem decide preço. */}
            {item.degradada && (
              <small className="semente-aviso">
                Os provedores de IA não responderam agora. Este é um roteiro de contingência, não
                uma análise dos seus dados.
              </small>
            )}
            <Fontes fontes={item.fontes} />
          </div>
        ))}
        {pensando && <p className="semente-msg semente-msg--semente semente-msg--pensando">Analisando...</p>}
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
          perguntar(pergunta);
        }}
      >
        <button
          type="button"
          className={`semente-web${buscarNaWeb ? " ativo" : ""}`}
          onClick={() => setBuscarNaWeb((atual) => !atual)}
          aria-pressed={buscarNaWeb}
          aria-label="Buscar na internet junto com os dados desta tela"
          title="Buscar na internet junto com os dados desta tela"
        >
          <Globe size={16} />
        </button>
        <input
          value={pergunta}
          onChange={(evento) => setPergunta(evento.target.value)}
          placeholder="Pergunte sobre esta tela..."
          aria-label={`Perguntar para a ${SEMENTE.nome}`}
        />
        <button type="submit" disabled={pensando || pergunta.trim().length < 3} aria-label="Enviar pergunta">
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}

// Streaming primeiro, pelo mesmo motivo do resto do produto: a resposta começa
// a aparecer em vez de manter a pessoa olhando para "Analisando...". Devolve
// `false` quando o caminho não está disponível — aí quem chama usa /api/ai,
// que tem a cadeia inteira de provedores por trás. O streaming fala só com o
// Gemini; sem essa queda, uma falha dele viraria falha da Semente.
async function responderEmStream(requisicao, setMensagens) {
  let resposta;
  try {
    resposta = await fetch("/api/ai/stream", requisicao);
  } catch {
    return false;
  }
  if (
    !resposta.ok ||
    !resposta.body?.getReader ||
    !(resposta.headers.get("content-type") || "").includes("text/event-stream")
  )
    return false;

  const leitor = resposta.body.getReader();
  const decodificador = new TextDecoder();
  let buffer = "";
  let texto = "";
  let fontes = [];
  // A mensagem em construção é identificada por id, não por posição. O
  // controle de "já criei?" fica fora do atualizador de estado de propósito:
  // atualizador tem que ser função pura, e o React pode chamá-lo duas vezes.
  const id = `semente-${proximoId()}`;
  let criada = false;

  const escrever = (conteudo, extra = {}) => {
    if (!criada) {
      criada = true;
      setMensagens((atual) => [...atual, { de: "semente", id, texto: conteudo, ...extra }]);
      return;
    }
    setMensagens((atual) =>
      atual.map((item) => (item.id === id ? { ...item, texto: conteudo, ...extra } : item)),
    );
  };

  while (true) {
    const { done, value } = await leitor.read();
    if (done) break;
    buffer += decodificador.decode(value, { stream: true });
    const { eventos, resto } = eventosDoTrecho(buffer);
    buffer = resto;
    for (const evento of eventos) {
      if (evento.t) {
        texto += evento.t;
        escrever(texto);
      } else if (evento.done && Array.isArray(evento.sources)) {
        fontes = evento.sources;
      } else if (evento.error) {
        // O servidor pediu para cair para /api/ai. Se nada foi escrito ainda,
        // a queda é limpa; se já havia texto na tela, ele fica.
        if (!texto.trim()) return false;
      }
    }
  }

  if (!texto.trim()) return false;
  if (fontes.length) escrever(texto, { fontes });
  return true;
}

async function responderDeUmaVez(requisicao, setMensagens) {
  const resposta = await fetch("/api/ai", requisicao);
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(corpo.error || "Não consegui responder agora.");
  setMensagens((atual) => [
    ...atual,
    {
      de: "semente",
      texto: corpo.content || "Respondi sem conteúdo. Tente perguntar de outro jeito.",
      degradada: !!corpo.degraded,
      fontes: corpo.sources || [],
    },
  ]);
}
