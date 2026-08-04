import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, LineChart, Sigma, TrendingUp } from "lucide-react";
import {
  anomalies,
  clusterValues,
  correlation,
  dataQuality,
  describe as descrever,
  explainDescribe,
  forecast,
  linearRegression,
  movingAverage,
  outliers,
  suggestChart,
} from "./statsDomain.js";

const brl = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];
const mesCurto = (chave) => {
  const [ano, mes] = String(chave).split("-").map(Number);
  return `${MESES[mes - 1]}/${String(ano).slice(2)}`;
};

// Fontes de dados que já existem no app, sem pedir importação de nada.
const buildSources = (db, business) => {
  const daEmpresa = (lista) =>
    (lista || []).filter((x) => !business || !x.businessId || x.businessId === business.id);
  const fontes = [];
  const tx = daEmpresa(db.transactions);
  if (tx.length > 0) {
    fontes.push({
      id: "receitas",
      label: "Receitas do livro-caixa",
      rows: tx.filter((t) => t.type === "Receita"),
      valueField: "value",
      dateField: "date",
      labelField: "description",
      unit: "R$",
    });
    fontes.push({
      id: "despesas",
      label: "Despesas do livro-caixa",
      rows: tx.filter((t) => t.type !== "Receita"),
      valueField: "value",
      dateField: "date",
      labelField: "description",
      unit: "R$",
    });
  }
  const contas = daEmpresa(db.bills);
  if (contas.length > 0)
    fontes.push({
      id: "contas",
      label: "Contas a receber e a pagar",
      rows: contas,
      valueField: "value",
      dateField: "dueDate",
      labelField: "description",
      unit: "R$",
    });
  const opp = daEmpresa(db.opportunities);
  if (opp.length > 0)
    fontes.push({
      id: "funil",
      label: "Oportunidades do funil",
      rows: opp,
      valueField: "value",
      dateField: "expectedCloseDate",
      labelField: "title",
      unit: "R$",
    });
  const horas = daEmpresa(db.timeEntries);
  if (horas.length > 0)
    fontes.push({
      id: "horas",
      label: "Horas apontadas",
      rows: horas,
      valueField: "hours",
      dateField: "date",
      labelField: "project",
      unit: "h",
    });
  for (const planilha of daEmpresa(db.sheets)) {
    const colunas = planilha.columns || planilha.fields || [];
    const numerica = colunas.find((c) =>
      /valor|preco|preço|total|quantidade|qtd|horas/i.test(c?.name || c || ""),
    );
    if (!numerica) continue;
    const nome = typeof numerica === "string" ? numerica : numerica.name;
    fontes.push({
      id: `planilha-${planilha.id}`,
      label: `Planilha: ${planilha.name || "sem nome"}`,
      rows: (planilha.rows || []).map((r) =>
        Array.isArray(r) ? Object.fromEntries(colunas.map((c, i) => [
          typeof c === "string" ? c : c.name,
          r[i],
        ])) : r.cells || r,
      ),
      valueField: nome,
      dateField: "",
      labelField: typeof colunas[0] === "string" ? colunas[0] : colunas[0]?.name,
      unit: "",
    });
  }
  return fontes;
};

export default function DataLab({ db, business }) {
  const fontes = useMemo(() => buildSources(db, business), [db, business]);
  const [fonteId, setFonteId] = useState("");
  const fonte = fontes.find((f) => f.id === fonteId) || fontes[0] || null;

  const valores = useMemo(
    () => (fonte?.rows || []).map((r) => r?.[fonte.valueField]),
    [fonte],
  );
  const stats = useMemo(() => descrever(valores), [valores]);
  const foraDoPadrao = useMemo(() => outliers(valores), [valores]);

  // Série por mês, quando a fonte tem data — base da tendência e da anomalia.
  const serieMensal = useMemo(() => {
    if (!fonte?.dateField) return [];
    const mapa = new Map();
    for (const r of fonte.rows || []) {
      const chave = String(r?.[fonte.dateField] || "").slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(chave)) continue;
      const n = Number(String(r?.[fonte.valueField] ?? "").replace(",", ".")) || 0;
      mapa.set(chave, (mapa.get(chave) || 0) + n);
    }
    return [...mapa.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));
  }, [fonte]);

  const serieNumeros = useMemo(() => serieMensal.map((s) => s.total), [serieMensal]);
  const previsao = useMemo(() => forecast(serieNumeros, 3), [serieNumeros]);
  const anomalos = useMemo(() => anomalies(serieNumeros), [serieNumeros]);
  const media3 = useMemo(() => movingAverage(serieNumeros, 3), [serieNumeros]);
  const grupos = useMemo(() => clusterValues(valores, 3), [valores]);
  const tendencia = useMemo(
    () =>
      serieNumeros.length >= 3
        ? linearRegression(serieNumeros.map((_, i) => i + 1), serieNumeros)
        : null,
    [serieNumeros],
  );
  const qualidade = useMemo(() => {
    if (!fonte) return null;
    const campos = [fonte.valueField, fonte.dateField, fonte.labelField].filter(Boolean);
    return dataQuality(fonte.rows, campos);
  }, [fonte]);
  const grafico = useMemo(
    () =>
      suggestChart({
        xType: fonte?.dateField ? "data" : "texto",
        yType: stats.count > 0 ? "numero" : "texto",
        distinctX: qualidade?.columns?.find((c) => c.field === fonte?.labelField)?.distinct || 0,
        points: stats.count,
      }),
    [fonte, stats, qualidade],
  );

  // Comparação entre duas fontes com data, mês a mês.
  const [comparar, setComparar] = useState("");
  const outra = fontes.find((f) => f.id === comparar);
  const correlacao = useMemo(() => {
    if (!outra || !fonte?.dateField || !outra.dateField) return null;
    const somaPorMes = (f) => {
      const mapa = new Map();
      for (const r of f.rows || []) {
        const chave = String(r?.[f.dateField] || "").slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(chave)) continue;
        const n = Number(String(r?.[f.valueField] ?? "").replace(",", ".")) || 0;
        mapa.set(chave, (mapa.get(chave) || 0) + n);
      }
      return mapa;
    };
    const a = somaPorMes(fonte);
    const b = somaPorMes(outra);
    const meses = [...a.keys()].filter((m) => b.has(m)).sort();
    return {
      months: meses.length,
      ...correlation(meses.map((m) => a.get(m)), meses.map((m) => b.get(m))),
    };
  }, [fonte, outra]);

  if (fontes.length === 0)
    return (
      <section className="lab">
        <header className="lab-head">
          <div>
            <h2>
              <Sigma size={20} /> Análise de dados
            </h2>
            <p>
              Estatística, tendência, valores fora do padrão e agrupamento sobre
              os dados que já estão no app.
            </p>
          </div>
        </header>
        <div className="lab-empty">
          <h3>Ainda não há dados para analisar</h3>
          <p>
            Registre lançamentos no Financeiro, contas a receber, oportunidades
            no funil, horas ou uma planilha. A análise aparece sozinha.
          </p>
        </div>
      </section>
    );

  return (
    <section className="lab">
      <header className="lab-head">
        <div>
          <h2>
            <Sigma size={20} /> Análise de dados
          </h2>
          <p>
            Sobre os dados que já estão no app. Cada número vem com a leitura em
            português — e com o aviso quando a amostra é pequena demais para
            concluir algo.
          </p>
        </div>
        <select
          aria-label="Fonte de dados"
          value={fonte?.id || ""}
          onChange={(e) => setFonteId(e.target.value)}
        >
          {fontes.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </header>

      {stats.count === 0 ? (
        <p className="lab-hint">{stats.message}</p>
      ) : (
        <>
          <div className="lab-cards">
            {[
              ["Quantidade", stats.count],
              ["Soma", brl(stats.sum)],
              ["Média", brl(stats.mean)],
              ["Mediana", brl(stats.median)],
              ["Menor", brl(stats.min)],
              ["Maior", brl(stats.max)],
              ["Desvio padrão", brl(stats.stdDev)],
            ].map(([rotulo, valor]) => (
              <article key={rotulo}>
                <small>{rotulo}</small>
                <strong>{valor}</strong>
              </article>
            ))}
          </div>

          <p className="lab-explain">{explainDescribe(stats, { label: fonte.label.toLowerCase() })}</p>

          <div className="lab-panels">
            <section>
              <h3>
                <AlertTriangle size={15} /> Valores fora do padrão
              </h3>
              {foraDoPadrao.high.length === 0 && foraDoPadrao.low.length === 0 ? (
                <p className="lab-hint">
                  {stats.count < 4
                    ? "Poucos valores para essa conclusão."
                    : "Nenhum valor destoa dos demais."}
                </p>
              ) : (
                <>
                  <p className="lab-hint">
                    O normal aqui fica entre {brl(foraDoPadrao.lowerBound)} e{" "}
                    {brl(foraDoPadrao.upperBound)}.
                  </p>
                  <ul className="lab-list">
                    {foraDoPadrao.high.map((v, i) => (
                      <li key={`h${i}`}>
                        <span className="lab-up">acima</span> {brl(v)}
                      </li>
                    ))}
                    {foraDoPadrao.low.map((v, i) => (
                      <li key={`l${i}`}>
                        <span className="lab-down">abaixo</span> {brl(v)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section>
              <h3>
                <BarChart3 size={15} /> Faixas de valor
              </h3>
              {grupos.length <= 1 ? (
                <p className="lab-hint">Os valores não se separam em faixas claras.</p>
              ) : (
                <ul className="lab-list">
                  {grupos.map((g, i) => (
                    <li key={i}>
                      <strong>{brl(g.center)}</strong>
                      <small>
                        {g.values.length}{" "}
                        {g.values.length === 1 ? "valor" : "valores"} em volta
                      </small>
                    </li>
                  ))}
                </ul>
              )}
              <p className="lab-hint">
                Serve para ver se o seu negócio tem, por exemplo, vendas
                pequenas e grandes convivendo em vez de um valor típico.
              </p>
            </section>
          </div>

          {serieMensal.length > 0 && (
            <div className="lab-panels">
              <section>
                <h3>
                  <LineChart size={15} /> Mês a mês
                </h3>
                <div className="lab-chart">
                  {serieMensal.map((s, i) => {
                    const maior = Math.max(...serieNumeros, 1);
                    const anomalo = anomalos.points.some((p) => p.index === i);
                    return (
                      <div key={s.month} className="lab-bar-group">
                        <span
                          className={anomalo ? "lab-bar anomalo" : "lab-bar"}
                          style={{ height: `${(s.total / maior) * 100}%` }}
                          title={`${mesCurto(s.month)}: ${brl(s.total)}`}
                        />
                        <small>{mesCurto(s.month)}</small>
                      </div>
                    );
                  })}
                </div>
                <p className="lab-hint">{anomalos.message}</p>
                {anomalos.points.length > 0 && (
                  <ul className="lab-list">
                    {anomalos.points.map((p) => (
                      <li key={p.index}>
                        <span className={p.kind === "acima" ? "lab-up" : "lab-down"}>
                          {p.kind}
                        </span>
                        {mesCurto(serieMensal[p.index]?.month)} — {brl(p.value)}
                      </li>
                    ))}
                  </ul>
                )}
                {media3.length > 0 && (
                  <p className="lab-hint">
                    Média dos últimos 3 meses: {brl(media3[media3.length - 1])}
                  </p>
                )}
              </section>

              <section>
                <h3>
                  <TrendingUp size={15} /> Para onde está indo
                </h3>
                {previsao.values.length === 0 ? (
                  <p className="lab-hint">{previsao.message}</p>
                ) : (
                  <>
                    <p className="lab-trend">
                      Tendência <strong>{previsao.trend}</strong>
                      {tendencia?.slope != null && (
                        <>
                          {" "}
                          — cerca de {brl(Math.abs(tendencia.slope))} por mês
                        </>
                      )}
                    </p>
                    <ul className="lab-list">
                      {previsao.values.map((v, i) => (
                        <li key={i}>
                          <small>próximo mês {i + 1}</small>
                          <strong>{brl(v)}</strong>
                        </li>
                      ))}
                    </ul>
                    <p
                      className={
                        previsao.confidence === "baixa" ? "lab-warn" : "lab-hint"
                      }
                    >
                      {previsao.message}
                    </p>
                  </>
                )}
              </section>
            </div>
          )}

          {fontes.length > 1 && fonte.dateField && (
            <section className="lab-compare">
              <h3>Comparar com outra fonte</h3>
              <select
                aria-label="Comparar com"
                value={comparar}
                onChange={(e) => setComparar(e.target.value)}
              >
                <option value="">Escolha para comparar</option>
                {fontes
                  .filter((f) => f.id !== fonte.id && f.dateField)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
              </select>
              {correlacao && (
                <p className={correlacao.r == null ? "lab-hint" : "lab-explain"}>
                  {correlacao.months} {correlacao.months === 1 ? "mês" : "meses"} em
                  comum. {correlacao.message}
                </p>
              )}
            </section>
          )}

          {qualidade && (
            <section className="lab-quality">
              <h3>Qualidade dos dados</h3>
              <table>
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Tipo</th>
                    <th>Preenchido</th>
                    <th>Valores distintos</th>
                  </tr>
                </thead>
                <tbody>
                  {qualidade.columns.map((c) => (
                    <tr key={c.field}>
                      <td>{c.field}</td>
                      <td>{c.type}</td>
                      <td className={c.completeness < 80 ? "lab-warn-cell" : ""}>
                        {c.completeness}%
                      </td>
                      <td>{c.distinct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {qualidade.duplicateRows.length > 0 && (
                <p className="lab-warn">
                  {qualidade.duplicateRows.length} linha(s) idêntica(s) a outra.
                  Pode ser lançamento repetido.
                </p>
              )}
              <p className="lab-hint">
                Gráfico indicado para estes dados: <strong>{grafico.chart}</strong>{" "}
                — {grafico.reason}
              </p>
            </section>
          )}
        </>
      )}
    </section>
  );
}
