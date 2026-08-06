import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Leaf, Loader2, MessageSquare, Send, ShieldCheck } from "lucide-react";

const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

const estilo = {
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 },
  card: { border: "1px solid rgba(45, 75, 59, .16)", borderRadius: 14, padding: 18, background: "rgba(255,255,255,.72)" },
  titulo: { margin: 0, fontSize: 18 },
  texto: { margin: "8px 0 0", color: "#526057", lineHeight: 1.55 },
  barra: { height: 9, borderRadius: 999, background: "rgba(45,75,59,.11)", overflow: "hidden", marginTop: 10 },
  progresso: (valor) => ({ height: "100%", width: `${Math.max(0, Math.min(100, Number(valor) || 0))}%`, background: "#496f5a", borderRadius: 999 }),
  cabecalho: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 },
  selo: { display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 999, background: "rgba(73,111,90,.10)", color: "#345242", fontSize: 12, fontWeight: 700 },
  lista: { display: "grid", gap: 10, padding: 0, margin: "14px 0 0", listStyle: "none" },
  linha: { display: "flex", justifyContent: "space-between", gap: 18, borderBottom: "1px solid rgba(45,75,59,.10)", paddingBottom: 9 },
};

const rotulosComponentes = {
  reducaoEmissoes: "Redução de emissões",
  reducao_emissoes: "Redução de emissões",
  kmBaixaEmissao: "Quilômetros de baixa emissão",
  km_baixa_emissao: "Quilômetros de baixa emissão",
  energiaLimpa: "Energia limpa",
  energia_limpa: "Energia limpa",
  eficienciaOperacional: "Eficiência operacional",
  eficiencia_operacional: "Eficiência operacional",
  ocupacao: "Ocupação da capacidade",
  evolucaoMeta: "Evolução contra a meta",
  evolucao_meta: "Evolução contra a meta",
  qualidadeDados: "Qualidade dos dados",
  qualidade_dados: "Qualidade dos dados",
  evidencias: "Evidências disponíveis",
};

const formatarComponente = (chave) =>
  rotulosComponentes[chave] || String(chave).replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

function EstadoVazio({ titulo, texto }) {
  return (
    <div className="cp-vazio">
      <Leaf size={22} />
      <strong>{titulo}</strong>
      <p>{texto}</p>
    </div>
  );
}

export function GreenScoreDetalhado({ resumo }) {
  const score = resumo?.greenScore;
  const componentes = useMemo(() => Object.entries(score?.componentes || score?.components || {}), [score]);

  if (!score)
    return (
      <EstadoVazio
        titulo="Green Score ainda não calculado"
        texto="A nota será exibida quando houver operações, fatores ambientais e qualidade mínima de dados suficientes para o cálculo."
      />
    );

  const valor = Number(score.valor ?? score.score ?? 0);
  const anterior = Number(score.anterior ?? score.previousScore ?? 0);
  const variacao = anterior ? valor - anterior : null;

  return (
    <section>
      <div style={estilo.cabecalho}>
        <div>
          <span style={estilo.selo}><ShieldCheck size={15} /> Indicador proprietário da To Do Green</span>
          <h2 style={{ ...estilo.titulo, fontSize: 26, marginTop: 12 }}>Green Score {numero.format(valor)}/100</h2>
          <p style={estilo.texto}>A nota combina impacto ambiental, eficiência operacional e confiabilidade das evidências. Não é uma certificação externa.</p>
        </div>
        {variacao !== null && <strong>{variacao >= 0 ? "+" : ""}{numero.format(variacao)} ponto(s)</strong>}
      </div>

      <div style={estilo.grid}>
        <div style={estilo.card}>
          <span>Nota atual</span>
          <strong style={{ display: "block", fontSize: 34, marginTop: 8 }}>{numero.format(valor)}</strong>
          <div style={estilo.barra}><div style={estilo.progresso(valor)} /></div>
        </div>
        <div style={estilo.card}>
          <span>Versão dos pesos</span>
          <strong style={{ display: "block", fontSize: 22, marginTop: 8 }}>{score.versaoPesos || score.weightsVersion || "—"}</strong>
          <p style={estilo.texto}>Mantém a nota rastreável quando a metodologia evolui.</p>
        </div>
        <div style={estilo.card}>
          <span>Qualidade dos dados</span>
          <strong style={{ display: "block", fontSize: 22, marginTop: 8 }}>{numero.format(score.qualidadeDados ?? resumo?.ambiental?.qualidadeDados ?? 0)}%</strong>
          <p style={estilo.texto}>Quanto maior, mais confiável é o uso do indicador em relatórios.</p>
        </div>
      </div>

      <div style={{ ...estilo.card, marginTop: 16 }}>
        <h3 style={estilo.titulo}>Composição da nota</h3>
        {componentes.length ? (
          <ul style={estilo.lista}>
            {componentes.map(([chave, bruto]) => {
              const valorComponente = typeof bruto === "object" ? bruto.valor ?? bruto.score ?? 0 : bruto;
              return (
                <li key={chave}>
                  <div style={estilo.linha}><span>{formatarComponente(chave)}</span><strong>{numero.format(valorComponente)}</strong></div>
                  <div style={estilo.barra}><div style={estilo.progresso(valorComponente)} /></div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p style={estilo.texto}>A memória de cálculo detalhada está disponível nos relatórios exportáveis.</p>
        )}
      </div>
    </section>
  );
}

export function ImpactoAmbiental({ resumo }) {
  const ambiental = resumo?.ambiental;
  const operacoes = resumo?.operacoes;
  if (!ambiental || resumo?.semDados)
    return (
      <EstadoVazio
        titulo="Impacto ambiental ainda não disponível"
        texto="Os indicadores serão calculados a partir das operações registradas e das evidências de consumo, distância, veículo e energia."
      />
    );

  const convencional = Number(ambiental.emissaoConvencionalKg ?? ambiental.co2ReferenciaKg ?? 0);
  const realizado = Number(ambiental.emissaoTodogreenKg ?? ambiental.co2EmitidoKg ?? Math.max(0, convencional - Number(ambiental.co2EvitadoKg || 0)));

  return (
    <section>
      <div style={estilo.cabecalho}>
        <div>
          <span style={estilo.selo}><Leaf size={15} /> Resultado ambiental do seu contrato</span>
          <h2 style={{ ...estilo.titulo, fontSize: 26, marginTop: 12 }}>Emissões e impacto ambiental</h2>
          <p style={estilo.texto}>Comparação entre o cenário logístico convencional e a operação realizada pela To Do Green, com memória de cálculo auditável.</p>
        </div>
      </div>

      <div className="cp-indicadores">
        <div className="cp-indicador bom"><span>CO₂ evitado</span><strong>{numero.format(Number(ambiental.co2EvitadoKg || 0) / 1000)} t</strong><small>{numero.format(ambiental.reducaoPercent || 0)}% de redução</small></div>
        <div className="cp-indicador"><span>Diesel não consumido</span><strong>{inteiro.format(ambiental.dieselEvitadoL || 0)} L</strong><small>comparação com cenário de referência</small></div>
        <div className="cp-indicador"><span>Distância monitorada</span><strong>{inteiro.format(operacoes?.distanciaKm || 0)} km</strong><small>{inteiro.format(operacoes?.total || 0)} operação(ões)</small></div>
        <div className="cp-indicador"><span>Qualidade dos dados</span><strong>{numero.format(ambiental.qualidadeDados || 0)}%</strong><small>{inteiro.format(ambiental.calculos || 0)} cálculo(s) auditável(is)</small></div>
      </div>

      {(convencional > 0 || realizado > 0) && (
        <div style={{ ...estilo.card, marginTop: 16 }}>
          <h3 style={estilo.titulo}>Comparação de cenários</h3>
          <ul style={estilo.lista}>
            <li style={estilo.linha}><span>Cenário convencional</span><strong>{numero.format(convencional / 1000)} t CO₂e</strong></li>
            <li style={estilo.linha}><span>Operação To Do Green</span><strong>{numero.format(realizado / 1000)} t CO₂e</strong></li>
            <li style={estilo.linha}><span>Redução alcançada</span><strong>{numero.format(ambiental.reducaoPercent || 0)}%</strong></li>
          </ul>
        </div>
      )}

      {Number(ambiental.qualidadeDados || 0) < 70 && Number(ambiental.qualidadeDados || 0) > 0 && (
        <div className="cp-alerta" style={{ marginTop: 16 }}><AlertTriangle size={18} /><span>A qualidade atual permite acompanhar tendência, mas ainda exige cautela para uso regulatório ou divulgação externa.</span></div>
      )}
    </section>
  );
}

export function AssistenteCliente({ enviar, setAviso }) {
  const [pergunta, setPergunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagens, setMensagens] = useState([
    { lado: "assistente", texto: "Pergunte sobre suas operações, entregas, Green Score, emissões, relatórios ou evidências disponíveis neste portal." },
  ]);

  const perguntar = async (evento) => {
    evento.preventDefault();
    const texto = pergunta.trim();
    if (!texto || enviando) return;
    setPergunta("");
    setMensagens((lista) => [...lista, { lado: "cliente", texto }]);
    setEnviando(true);
    try {
      const dados = await enviar("assistente", { pergunta: texto });
      setMensagens((lista) => [...lista, { lado: "assistente", texto: dados.resposta || "Não encontrei uma resposta com os dados disponíveis." }]);
    } catch (erro) {
      setAviso(erro.message);
      setMensagens((lista) => [...lista, { lado: "assistente", texto: "Não consegui responder agora. Tente novamente ou abra uma solicitação para a equipe." }]);
    } finally {
      setEnviando(false);
    }
  };

  const sugestoes = ["Qual foi o CO₂ evitado?", "Como está meu Green Score?", "Quantas operações foram realizadas?", "A qualidade dos dados é suficiente para relatório?"];

  return (
    <section>
      <div style={estilo.cabecalho}>
        <div>
          <span style={estilo.selo}><MessageSquare size={15} /> Assistente restrito aos seus dados</span>
          <h2 style={{ ...estilo.titulo, fontSize: 26, marginTop: 12 }}>Assistente do cliente</h2>
          <p style={estilo.texto}>Ele responde apenas com informações do seu contrato e não acessa dados internos da To Do Green nem de outros clientes.</p>
        </div>
      </div>

      <div style={{ ...estilo.card, minHeight: 280 }}>
        <ol className="cp-sol-conversa" style={{ marginTop: 0 }}>
          {mensagens.map((mensagem, indice) => (
            <li key={`${mensagem.lado}-${indice}`} className={mensagem.lado === "cliente" ? "meu" : "deles"}>
              <strong>{mensagem.lado === "cliente" ? "Você" : "Assistente To Do Green"}</strong>
              <p>{mensagem.texto}</p>
            </li>
          ))}
          {enviando && <li className="deles"><Loader2 className="girando" size={18} /> <span>Analisando seus dados...</span></li>}
        </ol>
      </div>

      <div className="cp-formatos" style={{ marginTop: 12 }}>
        {sugestoes.map((sugestao) => <button type="button" key={sugestao} onClick={() => setPergunta(sugestao)}>{sugestao}</button>)}
      </div>

      <form className="cp-sol-resposta" onSubmit={perguntar} style={{ marginTop: 14 }}>
        <textarea rows={3} required value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Escreva uma pergunta sobre a sua operação" />
        <button type="submit" className="cp-botao" disabled={enviando || !pergunta.trim()}><Send size={16} /> Enviar</button>
      </form>

      <p style={{ ...estilo.texto, display: "flex", alignItems: "center", gap: 7 }}><BarChart3 size={15} /> Respostas ambientais são estimativas baseadas na metodologia e nas evidências registradas.</p>
    </section>
  );
}
