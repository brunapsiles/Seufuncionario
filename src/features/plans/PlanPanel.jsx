import { useEffect, useState } from "react";
import { AlertTriangle, Check, Gauge } from "lucide-react";
import { LAUNCH_MODE, PLANS, formatPrice } from "./planDomain.js";

const Barra = ({ percent, status }) => (
  <div className="pn-bar" aria-hidden="true">
    <span className={`pn-fill ${status}`} style={{ width: `${percent}%` }} />
  </div>
);

export default function PlanPanel({ setToast }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch("/api/plan");
        const j = await r.json();
        if (!vivo) return;
        if (!r.ok) {
          setErro(j?.error || "Não foi possível ler o seu plano agora.");
          return;
        }
        setDados(j);
      } catch {
        if (vivo) setErro("Não foi possível falar com o servidor agora.");
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const apertados = (dados?.usage || []).filter((u) => u.status !== "ok");

  return (
    <section className="section pn">
      <header className="section-head">
        <div>
          <h2>Meu plano</h2>
          <p className="muted">
            {LAUNCH_MODE
              ? "Está tudo liberado, de graça. Aqui você vê quanto já usou neste mês."
              : "Quanto você já usou neste mês e o que cada plano libera."}
          </p>
        </div>
      </header>

      {carregando && <p className="muted">Carregando...</p>}
      {erro && <p className="pn-erro">{erro}</p>}

      {dados && (
        <>
          <div className="pn-atual">
            <div>
              <span className="muted">Seu plano hoje</span>
              <strong>{dados.plan.name}</strong>
              <p className="muted">{dados.plan.pitch}</p>
            </div>
            <span className="pn-preco">{formatPrice(dados.plan.price)}</span>
          </div>

          {apertados.length > 0 && (
            <div className="pn-aviso">
              <AlertTriangle size={16} />
              <span>
                {apertados.some((u) => u.status === "esgotado")
                  ? "Você chegou ao limite de algo neste mês. A cota volta no dia 1º."
                  : "Você está chegando perto do limite de algo neste mês."}
              </span>
            </div>
          )}

          <h3>
            <Gauge size={16} /> Uso de {dados.period.split("-").reverse().join("/")}
          </h3>
          <ul className="pn-uso">
            {dados.usage.map((u) => (
              <li key={u.metric} className={u.status}>
                <div className="pn-linha">
                  <span>{u.label}</span>
                  <strong>
                    {u.unlimited
                      ? `${u.used} — sem limite`
                      : `${u.used} de ${u.limit}${u.unit ? ` ${u.unit}` : ""}`}
                  </strong>
                </div>
                {!u.unlimited && <Barra percent={u.percent} status={u.status} />}
              </li>
            ))}
          </ul>

          {dados.suggestion && (
            <div className="pn-sugestao">
              <p>
                O plano <strong>{dados.suggestion.planName}</strong> resolve o que
                está apertado agora
                {dados.suggestion.solves?.length
                  ? `: ${dados.suggestion.solves.join(", ").toLowerCase()}.`
                  : "."}
              </p>
              <span className="pn-preco">
                {formatPrice(dados.suggestion.price)}
              </span>
            </div>
          )}

          {!LAUNCH_MODE && <h3>Planos</h3>}
          {!LAUNCH_MODE && <div className="pn-planos">
            {PLANS.map((p) => (
              <article
                key={p.id}
                className={p.id === dados.plan.id ? "atual" : ""}
              >
                <header>
                  <strong>{p.name}</strong>
                  <span className="pn-preco">{formatPrice(p.price)}</span>
                </header>
                <p className="muted">{p.pitch}</p>
                <ul>
                  <li>
                    <Check size={13} />{" "}
                    {p.limits.aiPerMonth.toLocaleString("pt-BR")} conversas com a
                    IA por mês
                  </li>
                  <li>
                    <Check size={13} />{" "}
                    {p.limits.webSearchPerMonth.toLocaleString("pt-BR")} buscas na
                    internet
                  </li>
                  <li>
                    <Check size={13} />{" "}
                    {p.limits.agentRunsPerMonth.toLocaleString("pt-BR")} execuções
                    de agente
                  </li>
                  <li>
                    <Check size={13} /> {p.limits.members}{" "}
                    {p.limits.members === 1 ? "pessoa" : "pessoas"} no time
                  </li>
                  <li>
                    <Check size={13} />{" "}
                    {p.limits.businesses === null
                      ? "Negócios sem limite"
                      : `${p.limits.businesses} ${p.limits.businesses === 1 ? "negócio" : "negócios"}`}
                  </li>
                </ul>
                {p.id === dados.plan.id ? (
                  <span className="pn-badge">Seu plano</span>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      setToast?.(
                        "A troca de plano ainda não está aberta: falta ligar o meio de pagamento. Está anotado nas pendências da titular.",
                      )
                    }
                  >
                    Quero este
                  </button>
                )}
              </article>
            ))}
          </div>}

          <p className="muted pn-nota">
            {LAUNCH_MODE
              ? "Nenhum recurso está fechado e nada é cobrado. Os números acima existem só como proteção: a IA do app roda numa cota compartilhada, e o teto impede que uma conta em laço infinito derrube a IA para todo mundo. Usando normalmente, você não chega perto."
              : "A cota mensal renova sozinha no dia 1º. Nada é apagado quando o limite chega: você só não consegue gastar mais até virar o mês."}
          </p>
        </>
      )}
    </section>
  );
}
