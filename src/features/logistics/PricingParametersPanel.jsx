import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Scale } from "lucide-react";
import {
  PARAMETROS,
  simularEfeito,
  validarParametros,
} from "./pricingParametersDomain.js";

// ===== Régua comercial (tela do gestor) =====
//
// Onde o gestor define margem mínima, margem alvo, OPEX, administrativo,
// impostos, risco e comissão — os números que até aqui viviam fixos no código.
//
// A tela mostra o efeito no preço ANTES de salvar: o gestor vê o piso e o
// recomendado sobre um custo de referência enquanto digita. Mexer em régua às
// cegas é como esta ferramenta perderia a confiança do comercial no primeiro
// mês.

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const pedir = async (opcoes = {}, authHeaders) => {
  const resposta = await fetch("/api/todogreen/pricing-parameters", {
    ...opcoes,
    headers: {
      ...(opcoes.body ? { "content-type": "application/json" } : {}),
      ...(authHeaders?.() || {}),
    },
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados?.error || "Não foi possível carregar.");
  return dados;
};

export default function PricingParametersPanel({ authHeaders, setToast }) {
  const [dados, setDados] = useState(null);
  const [valores, setValores] = useState(null);
  const [versao, setVersao] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");

  const carregar = () =>
    pedir({}, authHeaders)
      .then((d) => {
        setDados(d);
        setValores({ ...d.atual.parametros });
      })
      .catch((causa) => setAviso(causa.message))
      .finally(() => setCarregando(false));

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validacao = useMemo(
    () => (valores ? validarParametros(valores) : null),
    [valores],
  );
  const efeito = useMemo(
    () => (validacao?.valido ? simularEfeito(valores, 10000) : null),
    [validacao, valores],
  );

  const salvar = async () => {
    setSalvando(true);
    setAviso("");
    try {
      const resposta = await pedir(
        {
          method: "POST",
          body: JSON.stringify({ versao, parametros: valores, justificativa }),
        },
        authHeaders,
      );
      setToast?.(`Régua ${resposta.versao} em vigor. ${resposta.mudanca}`);
      setVersao("");
      setJustificativa("");
      await carregar();
    } catch (causa) {
      setAviso(causa.message);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando)
    return (
      <section className="tdg-panel">
        <div className="tdg-esg-carregando">
          <Loader2 className="girando" size={20} /> Carregando régua comercial...
        </div>
      </section>
    );

  if (!dados)
    return (
      <section className="tdg-panel">
        <div className="tdg-alert" role="alert">
          <AlertTriangle size={18} />
          <span>{aviso || "Não foi possível carregar a régua."}</span>
        </div>
      </section>
    );

  const somenteLeitura = !dados.podeEditar;

  return (
    <>
      {aviso ? (
        <div className="tdg-alert" role="alert">
          <AlertTriangle size={18} />
          <span>{aviso}</span>
        </div>
      ) : null}

      <section className="tdg-panel">
        <div className="tdg-section-head">
          <div>
            <span className="tdg-kicker">RÉGUA COMERCIAL</span>
            <h2>Margem, OPEX, impostos e comissão</h2>
            <p>
              {dados.atual.deFabrica
                ? "Nenhuma régua definida ainda: valem os padrões de fábrica abaixo."
                : `Em vigor: ${dados.atual.versao} · responsável ${dados.atual.responsavel || "—"}`}
            </p>
          </div>
          <Scale size={22} />
        </div>

        <form className="tdg-form" onSubmit={(e) => e.preventDefault()}>
          {Object.entries(PARAMETROS).map(([chave, def]) => (
            <label key={chave}>
              <span>{def.rotulo} ({def.min}–{def.max}%)</span>
              <input
                inputMode="decimal"
                value={valores?.[chave] ?? ""}
                disabled={somenteLeitura}
                onChange={(e) =>
                  setValores((v) => ({ ...v, [chave]: e.target.value }))
                }
                title={def.descricao}
              />
              <small className="tdg-esg-nota">{def.descricao}</small>
            </label>
          ))}
        </form>

        {validacao && !validacao.valido ? (
          <div className="tdg-alert" role="alert">
            <AlertTriangle size={18} />
            <span>{validacao.erros.join(" ")}</span>
          </div>
        ) : null}

        {efeito ? (
          <div className="tdg-esg-pesos">
            <div>
              <small>custo de referência</small>
              <strong>{brl.format(efeito.custoDireto)}</strong>
            </div>
            <div>
              <small>custo carregado</small>
              <strong>{brl.format(efeito.custoCarregado)}</strong>
            </div>
            <div>
              <small>preço mínimo</small>
              <strong>{brl.format(efeito.precoMinimo)}</strong>
            </div>
            <div>
              <small>preço recomendado</small>
              <strong>{brl.format(efeito.precoRecomendado)}</strong>
            </div>
          </div>
        ) : null}
        <p className="tdg-esg-nota">
          O quadro acima mostra o efeito da régua sobre um custo direto de
          referência de {brl.format(10000)} — confira antes de pôr em vigor.
          Produtos com regra própria de margem continuam usando a regra do
          produto.
        </p>

        {somenteLeitura ? (
          <p className="tdg-esg-nota">
            Seu papel pode consultar a régua, mas a alteração é de quem gere
            preço.
          </p>
        ) : (
          <form className="tdg-form" onSubmit={(e) => e.preventDefault()}>
            <label>
              <span>Versão nova (ex.: v2.ago)</span>
              <input value={versao} onChange={(e) => setVersao(e.target.value)} />
            </label>
            <label>
              <span>Justificativa (fica no registro)</span>
              <input
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Por que a régua muda"
              />
            </label>
            <button
              className="tdg-action"
              type="button"
              disabled={salvando || !validacao?.valido || !versao || justificativa.length < 5}
              onClick={salvar}
            >
              {salvando ? "Salvando..." : "Pôr em vigor"}
            </button>
          </form>
        )}
      </section>

      {dados.historico?.length ? (
        <section className="tdg-panel">
          <div className="tdg-section-head">
            <div>
              <span className="tdg-kicker">HISTÓRICO</span>
              <h2>Cada régua, com o que mudou e por quê</h2>
            </div>
          </div>
          <ul className="tdg-esg-historico">
            {dados.historico.map((h) => (
              <li key={h.versao}>
                <div className="tdg-esg-ponto">
                  <strong>{h.versao}</strong>
                  <small>
                    {h.status === "active" ? "em vigor" : "encerrada"} · desde{" "}
                    {h.vigenciaInicio}
                    {h.vigenciaFim ? ` até ${h.vigenciaFim}` : ""} ·{" "}
                    {h.responsavel || "—"}
                  </small>
                </div>
                <p>{h.mudanca}</p>
                <p><em>{h.justificativa}</em></p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
