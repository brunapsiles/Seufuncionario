import { useMemo, useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight, PieChart } from "lucide-react";
import {
  averageMonthlyResult,
  cashVersusAccrual,
  categoryBreakdown,
  compareMonths,
  monthLabel,
  monthSeries,
  shiftMonth,
  topExpenses,
} from "./statementDomain.js";

const brl = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
const mesAtual = () => new Date().toISOString().slice(0, 7);
const mesCurto = (chave) => {
  const nomes = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  const [ano, mes] = chave.split("-").map(Number);
  return `${nomes[mes - 1]}/${String(ano).slice(2)}`;
};

// Seta de variação: null quando não havia base de comparação.
function Delta({ variacao, invertido = false }) {
  if (variacao.pct === null)
    return <small className="stmt-delta neutro">sem base anterior</small>;
  const subiu = variacao.delta > 0;
  const bom = invertido ? !subiu : subiu;
  if (variacao.delta === 0)
    return <small className="stmt-delta neutro">igual ao mês anterior</small>;
  return (
    <small className={`stmt-delta ${bom ? "bom" : "ruim"}`}>
      {subiu ? "▲" : "▼"} {Math.abs(variacao.pct)}% vs. mês anterior
    </small>
  );
}

export default function MonthlyStatement({ db, business }) {
  const [mes, setMes] = useState(mesAtual());

  const transacoes = useMemo(
    () =>
      (db.transactions || []).filter(
        (t) => !business || t.businessId === business.id,
      ),
    [db.transactions, business],
  );
  const contas = useMemo(
    () =>
      (db.bills || []).filter((b) => !business || b.businessId === business.id),
    [db.bills, business],
  );

  const comparacao = compareMonths(transacoes, mes);
  const serie = monthSeries(transacoes, mes, 6);
  const despesasPorCategoria = categoryBreakdown(transacoes, mes, "Despesa");
  const receitasPorCategoria = categoryBreakdown(transacoes, mes, "Receita");
  const maiores = topExpenses(transacoes, mes, 5);
  const regimes = cashVersusAccrual(transacoes, contas, mes);
  const media = averageMonthlyResult(transacoes, mes, 6);
  const { atual } = comparacao;

  const maiorBarra = Math.max(
    1,
    ...serie.map((m) => Math.max(m.receita, m.despesa)),
  );

  return (
    <section className="stmt">
      <header className="stmt-head">
        <div>
          <h2>
            <BarChart3 size={20} /> Resultado do mês
          </h2>
          <p>
            Quanto entrou, quanto saiu, quanto sobrou — e para onde foi o
            dinheiro. Tudo calculado a partir dos lançamentos do Financeiro.
          </p>
        </div>
        <div className="stmt-nav">
          <button
            className="btn ghost sm"
            onClick={() => setMes(shiftMonth(mes, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <strong>{monthLabel(mes)}</strong>
          <button
            className="btn ghost sm"
            onClick={() => setMes(shiftMonth(mes, 1))}
            aria-label="Mês seguinte"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {atual.lancamentos === 0 ? (
        <div className="stmt-empty">
          <BarChart3 size={28} />
          <h3>Nenhum lançamento em {monthLabel(mes)}</h3>
          <p>
            Registre receitas e despesas no Financeiro, ou dê baixa em contas a
            receber e a pagar — os valores aparecem aqui automaticamente.
          </p>
        </div>
      ) : (
        <>
          <div className="stmt-cards">
            <article className="in">
              <small>Entrou</small>
              <strong>{brl(atual.receita)}</strong>
              <Delta variacao={comparacao.receita} />
            </article>
            <article className="out">
              <small>Saiu</small>
              <strong>{brl(atual.despesa)}</strong>
              <Delta variacao={comparacao.despesa} invertido />
            </article>
            <article className={atual.resultado >= 0 ? "ok" : "warn"}>
              <small>Sobrou</small>
              <strong>{brl(atual.resultado)}</strong>
              <Delta variacao={comparacao.resultado} />
            </article>
            <article>
              <small>Margem</small>
              <strong>
                {atual.margem === null ? "—" : `${atual.margem}%`}
              </strong>
              <small className="stmt-note">
                {atual.margem === null
                  ? "sem receita no mês"
                  : "do que entrou, sobrou isso"}
              </small>
            </article>
          </div>

          <div className="stmt-panels">
            <section className="stmt-series">
              <h3>Últimos seis meses</h3>
              <div className="stmt-chart">
                {serie.map((m) => (
                  <div key={m.month} className="stmt-bar-group">
                    <div className="stmt-bars">
                      <span
                        className="in"
                        style={{ height: `${(m.receita / maiorBarra) * 100}%` }}
                        title={`Entrou ${brl(m.receita)}`}
                      />
                      <span
                        className="out"
                        style={{ height: `${(m.despesa / maiorBarra) * 100}%` }}
                        title={`Saiu ${brl(m.despesa)}`}
                      />
                    </div>
                    <small>{mesCurto(m.month)}</small>
                    <small
                      className={m.resultado >= 0 ? "stmt-res ok" : "stmt-res warn"}
                    >
                      {m.lancamentos === 0 ? "—" : brl(m.resultado)}
                    </small>
                  </div>
                ))}
              </div>
              {media.meses > 0 && (
                <p className="stmt-hint">
                  Média dos {media.meses}{" "}
                  {media.meses === 1 ? "mês com movimento" : "meses com movimento"}:
                  entrou {brl(media.receita)}, saiu {brl(media.despesa)}, sobrou{" "}
                  <strong>{brl(media.resultado)}</strong>.
                </p>
              )}
            </section>

            <section className="stmt-cats">
              <h3>
                <PieChart size={15} /> Para onde foi o dinheiro
              </h3>
              {despesasPorCategoria.length === 0 ? (
                <p className="stmt-hint">Nenhuma saída neste mês.</p>
              ) : (
                <ul className="stmt-cat-list">
                  {despesasPorCategoria.map((c) => (
                    <li key={c.category}>
                      <div className="stmt-cat-top">
                        <span>{c.category}</span>
                        <strong>{brl(c.total)}</strong>
                      </div>
                      <div className="stmt-cat-bar">
                        <span style={{ width: `${c.share}%` }} />
                      </div>
                      <small>
                        {c.share}% das saídas · {c.count}{" "}
                        {c.count === 1 ? "lançamento" : "lançamentos"}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
              {receitasPorCategoria.length > 1 && (
                <>
                  <h4>De onde veio</h4>
                  <ul className="stmt-cat-list compact">
                    {receitasPorCategoria.map((c) => (
                      <li key={c.category}>
                        <div className="stmt-cat-top">
                          <span>{c.category}</span>
                          <strong>{brl(c.total)}</strong>
                        </div>
                        <small>{c.share}% do que entrou</small>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </div>

          <div className="stmt-panels">
            <section className="stmt-top">
              <h3>Maiores saídas do mês</h3>
              <ul>
                {maiores.map((t) => (
                  <li key={t.id}>
                    <span>{t.description}</span>
                    <small>{t.category}</small>
                    <strong>{brl(t.value)}</strong>
                  </li>
                ))}
              </ul>
            </section>

            <section className="stmt-regimes">
              <h3>O que moveu × o que venceu</h3>
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>No caixa</th>
                    <th>Venceu no mês</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Entradas</td>
                    <td>{brl(regimes.caixa.receita)}</td>
                    <td>{brl(regimes.competencia.receita)}</td>
                  </tr>
                  <tr>
                    <td>Saídas</td>
                    <td>{brl(regimes.caixa.despesa)}</td>
                    <td>{brl(regimes.competencia.despesa)}</td>
                  </tr>
                  <tr className="stmt-total">
                    <td>Resultado</td>
                    <td>{brl(regimes.caixa.resultado)}</td>
                    <td>{brl(regimes.competencia.resultado)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="stmt-hint">
                {regimes.diferencaReceita > 0
                  ? `Venceu ${brl(regimes.diferencaReceita)} a mais do que entrou de fato — é o que ficou para receber.`
                  : "Tudo o que vencia no mês entrou no caixa."}
              </p>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
