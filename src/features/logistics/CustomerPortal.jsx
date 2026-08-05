import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  FileText,
  Gauge,
  Home,
  Leaf,
  Loader2,
  MessageSquare,
  PackageCheck,
  Route,
  Sparkles,
} from "lucide-react";
import "./CustomerPortal.css";

// ===== Sala do Cliente =====
//
// Experiência separada, mesma infraestrutura. Esta tela nunca pede o cliente:
// ela pergunta ao servidor quem é a sessão e recebe de volta o cliente, o
// papel, as permissões e o menu já filtrados. Se um dia alguém acrescentar um
// item interno ao menu do servidor, ele apareceria aqui — por isso o filtro
// verdadeiro vive lá, e o teste do servidor é quem o guarda.

const ICONES = {
  inicio: Home,
  operacoes: Route,
  "green-score": Gauge,
  esg: Leaf,
  relatorios: FileText,
  documentos: FileText,
  solicitacoes: PackageCheck,
  assistente: MessageSquare,
};

const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

const authHeaders = () => {
  try {
    const token = localStorage.getItem("seu-funcionario-auth-token") || "";
    return token ? { authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const pedir = async (caminho) => {
  const resposta = await fetch(`/api/todogreen/portal/${caminho}`, {
    headers: authHeaders(),
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados?.error || "Não foi possível carregar.");
  return dados;
};

function Indicador({ rotulo, valor, detalhe, tom = "neutro" }) {
  return (
    <div className={`cp-indicador ${tom}`}>
      <span>{rotulo}</span>
      <strong>{valor}</strong>
      {detalhe ? <small>{detalhe}</small> : null}
    </div>
  );
}

function SemDados({ titulo, texto }) {
  return (
    <div className="cp-vazio">
      <Sparkles size={22} />
      <strong>{titulo}</strong>
      <p>{texto}</p>
    </div>
  );
}

function Inicio({ resumo }) {
  if (!resumo) return null;
  if (resumo.semDados)
    return (
      <SemDados
        titulo="Ainda não há operação registrada"
        texto="Assim que a To Do Green registrar as primeiras operações do seu contrato, os indicadores aparecem aqui — com a memória de cálculo por trás de cada número."
      />
    );

  const { operacoes, ambiental, greenScore } = resumo;
  return (
    <>
      <div className="cp-indicadores">
        <Indicador
          rotulo="Green Score"
          valor={greenScore ? numero.format(greenScore.valor) : "—"}
          detalhe={
            greenScore
              ? `pesos ${greenScore.versaoPesos} · indicador proprietário, não é certificação`
              : "ainda não calculado"
          }
          tom={greenScore ? "bom" : "neutro"}
        />
        <Indicador
          rotulo="CO₂ evitado"
          valor={`${numero.format(ambiental.co2EvitadoKg / 1000)} t`}
          detalhe={`${numero.format(ambiental.reducaoPercent)}% de redução`}
          tom="bom"
        />
        <Indicador
          rotulo="Diesel não consumido"
          valor={`${inteiro.format(ambiental.dieselEvitadoL)} L`}
          detalhe={`${ambiental.calculos} cálculo(s) auditável(is)`}
        />
        <Indicador
          rotulo="Operações"
          valor={inteiro.format(operacoes.total)}
          detalhe={`${inteiro.format(operacoes.entregas)} entregas`}
        />
        <Indicador
          rotulo="Distância"
          valor={`${inteiro.format(operacoes.distanciaKm)} km`}
          detalhe={`ocupação média ${numero.format(operacoes.ocupacaoMedia)}%`}
        />
      </div>
      {ambiental.qualidadeDados > 0 && ambiental.qualidadeDados < 70 ? (
        <div className="cp-alerta">
          <AlertTriangle size={18} />
          <span>
            A qualidade dos dados destes cálculos está em{" "}
            {numero.format(ambiental.qualidadeDados)}%. Números com qualidade
            baixa servem para acompanhar tendência, não para relatório
            regulatório.
          </span>
        </div>
      ) : null}
    </>
  );
}

function Operacoes({ operacoes, carregando }) {
  if (carregando)
    return (
      <div className="cp-carregando">
        <Loader2 className="girando" size={20} /> Carregando operações...
      </div>
    );
  if (!operacoes.length)
    return (
      <SemDados
        titulo="Nenhuma operação no período"
        texto="As viagens, coletas e entregas executadas para o seu contrato aparecem aqui, com origem, destino, data e situação."
      />
    );
  return (
    <div className="cp-tabela-frame">
      <table className="cp-tabela">
        <thead>
          <tr>
            <th>Referência</th>
            <th>Data</th>
            <th>Origem</th>
            <th>Destino</th>
            <th>Situação</th>
            <th>Entregas</th>
          </tr>
        </thead>
        <tbody>
          {operacoes.map((op) => (
            <tr key={op.id}>
              <td>{op.referencia || "—"}</td>
              <td>{op.data || "—"}</td>
              <td>{op.origem || "—"}</td>
              <td>{op.destino || "—"}</td>
              <td>
                <span className={`cp-situacao ${op.status}`}>{op.status}</span>
              </td>
              <td>{inteiro.format(op.campos?.deliveries || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmBreve({ titulo }) {
  return (
    <SemDados
      titulo={titulo}
      texto="Esta área do seu portal está sendo liberada. Enquanto isso, fale com o seu contato na To Do Green pelas Solicitações."
    />
  );
}

export default function CustomerPortal() {
  const [sessao, setSessao] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [operacoes, setOperacoes] = useState([]);
  const [carregandoOperacoes, setCarregandoOperacoes] = useState(false);
  const [aba, setAba] = useState("inicio");
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([pedir("sessao"), pedir("resumo")])
      .then(([s, r]) => {
        if (!vivo) return;
        setSessao(s);
        setResumo(r.resumo);
      })
      .catch((causa) => vivo && setErro(causa.message))
      .finally(() => vivo && setPronto(true));
    return () => {
      vivo = false;
    };
  }, []);

  const carregarOperacoes = useCallback(() => {
    setCarregandoOperacoes(true);
    pedir("operacoes")
      .then((d) => setOperacoes(d.operacoes || []))
      .catch((causa) => setErro(causa.message))
      .finally(() => setCarregandoOperacoes(false));
  }, []);

  useEffect(() => {
    if (aba === "operacoes" && !operacoes.length) carregarOperacoes();
  }, [aba, operacoes.length, carregarOperacoes]);

  const menu = useMemo(() => sessao?.menu || [], [sessao]);

  if (!pronto)
    return (
      <main className="cp cp-centro">
        <Loader2 className="girando" size={28} />
        <p>Abrindo seu portal...</p>
      </main>
    );

  if (erro)
    return (
      <main className="cp cp-centro">
        <div className="cp-bloqueio">
          <AlertTriangle size={26} />
          <h1>Portal indisponível</h1>
          <p>{erro}</p>
          <p className="cp-bloqueio-dica">
            Se você é cliente da To Do Green e deveria ter acesso, peça ao seu
            contato para liberar o seu e-mail no portal.
          </p>
        </div>
      </main>
    );

  return (
    <main className="cp" aria-labelledby="cp-titulo">
      <header className="cp-topo">
        <div>
          <span className="cp-marca">To Do Green</span>
          <h1 id="cp-titulo">{sessao.cliente.nome}</h1>
          <p>Portal do cliente · {sessao.usuario.nome}</p>
        </div>
      </header>

      <nav className="cp-menu" aria-label="Navegação do portal">
        {menu.map((item) => {
          const Icone = ICONES[item.id] || Home;
          return (
            <button
              key={item.id}
              type="button"
              className={aba === item.id ? "ativo" : ""}
              onClick={() => setAba(item.id)}
              aria-current={aba === item.id ? "page" : undefined}
            >
              <Icone size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <section className="cp-conteudo">
        {aba === "inicio" && <Inicio resumo={resumo} />}
        {aba === "operacoes" && (
          <Operacoes operacoes={operacoes} carregando={carregandoOperacoes} />
        )}
        {aba === "green-score" && <EmBreve titulo="Green Score detalhado" />}
        {aba === "esg" && <EmBreve titulo="ESG e Escopo 3" />}
        {aba === "relatorios" && <EmBreve titulo="Relatórios" />}
        {aba === "documentos" && <EmBreve titulo="Documentos" />}
        {aba === "solicitacoes" && <EmBreve titulo="Solicitações" />}
        {aba === "assistente" && <EmBreve titulo="Assistente" />}
      </section>

      <footer className="cp-rodape">
        Green Score e indicadores ambientais são estimativas próprias da To Do
        Green, com metodologia e memória de cálculo disponíveis nos relatórios.
        Não constituem certificação.
      </footer>
    </main>
  );
}
