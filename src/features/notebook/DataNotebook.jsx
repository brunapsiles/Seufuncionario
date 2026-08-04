import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Download,
  HelpCircle,
  Plus,
  Table2,
  Trash2,
  Type,
} from "lucide-react";
import { Button, Empty, Field, PageTitle } from "../../components/ui.jsx";
import {
  COMMANDS,
  RECIPES,
  SOURCES,
  formatCell,
  loadSource,
  makeCell,
  moveCell,
  parsePipeline,
  removeCell,
  runPipeline,
  sourceById,
  suggestChart,
  toCsv,
  updateCell,
} from "./notebookDomain.js";

const baixarCsv = (conteudo, nome) => {
  // O BOM faz o Excel em português abrir o arquivo com acento certo. Sem ele,
  // "Serviço" vira "ServiÃ§o" e a pessoa acha que o app corrompeu o dado.
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", conteudo], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

function ResultTable({ resultado }) {
  const grafico = useMemo(() => suggestChart(resultado), [resultado]);
  if (!resultado.colunas.length)
    return (
      <p className="muted">
        Nenhuma linha para esta consulta. Confira o filtro ou o período.
      </p>
    );

  return (
    <>
      <div className="nb-tabela-quadro">
        <table className="nb-tabela">
          <thead>
            <tr>
              {resultado.colunas.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resultado.linhas.slice(0, 100).map((linha, i) => (
              <tr key={`${i}-${resultado.colunas.map((c) => linha[c]).join("|")}`}>
                {resultado.colunas.map((c) => (
                  <td key={c} className={typeof linha[c] === "number" ? "num" : ""}>
                    {formatCell(linha[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {resultado.linhas.length > 100 && (
        <p className="muted">
          Mostrando as 100 primeiras de {resultado.linhas.length}. Baixe o CSV
          para ver tudo.
        </p>
      )}
      {grafico && (
        <ul className="nb-grafico">
          {resultado.linhas.map((linha) => (
            <li key={String(linha[grafico.rotulo])}>
              <span className="nb-grafico-rotulo">
                {formatCell(linha[grafico.rotulo])}
              </span>
              <span className="nb-grafico-barra">
                <i
                  style={{
                    width: `${grafico.maximo ? (Number(linha[grafico.valor]) / grafico.maximo) * 100 : 0}%`,
                  }}
                />
              </span>
              <b>{formatCell(linha[grafico.valor])}</b>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function QueryCell({ cell, dados, onChange }) {
  const { passos, erros } = useMemo(
    () => parsePipeline(cell.consulta),
    [cell.consulta],
  );
  const resultado = useMemo(
    () => (erros.length ? null : runPipeline(dados, passos, { sourceId: cell.fonte })),
    [dados, passos, erros.length, cell.fonte],
  );
  const fonte = sourceById(cell.fonte);

  return (
    <>
      <div className="nb-cel-topo">
        <Field label="Fonte">
          <select
            aria-label="Fonte de dados"
            value={cell.fonte}
            onChange={(e) => onChange({ fonte: e.target.value })}
          >
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <p className="muted">
          {dados.length} linha(s) · campos: {fonte.fields.join(", ")}
        </p>
      </div>

      <textarea
        className="nb-consulta"
        aria-label="Consulta"
        spellCheck={false}
        rows={4}
        value={cell.consulta}
        placeholder={"filtrar tipo = receita\nagrupar mes\nsomar valor"}
        onChange={(e) => onChange({ consulta: e.target.value })}
      />

      {erros.length > 0 && (
        <ul className="nb-erros">
          {erros.map((e) => (
            <li key={`${e.linha}-${e.texto}`}>
              <AlertTriangle size={14} />
              <span>
                <b>Linha {e.linha}:</b> {e.texto}
              </span>
            </li>
          ))}
        </ul>
      )}

      {resultado && (
        <>
          {resultado.avisos.map((a) => (
            <p className="nb-aviso" key={a}>
              <HelpCircle size={14} /> {a}
            </p>
          ))}
          <ResultTable resultado={resultado} />
          {resultado.colunas.length > 0 && (
            <Button
              icon={Download}
              variant="secondary"
              onClick={() =>
                baixarCsv(toCsv(resultado), `${cell.titulo || "consulta"}.csv`)
              }
            >
              Baixar CSV
            </Button>
          )}
        </>
      )}
    </>
  );
}

export default function DataNotebook({ db, update, business, setToast }) {
  const guardado = db?.notebook || null;
  const [cells, setCells] = useState(
    () => guardado?.cells?.length ? guardado.cells : [makeCell({})],
  );
  const [ajuda, setAjuda] = useState(false);

  // Os dados de cada fonte são lidos uma vez por render e reaproveitados por
  // todas as células: com dez células a mais, ler dez vezes a mesma coleção
  // deixaria a tela lenta à toa.
  const porFonte = useMemo(() => {
    const mapa = {};
    for (const fonte of SOURCES)
      mapa[fonte.id] = loadSource(db, fonte.id, business?.id);
    return mapa;
  }, [db, business?.id]);

  const aplicar = (proximas) => {
    setCells(proximas);
    update((atual) => ({
      ...atual,
      notebook: {
        ...(atual.notebook || {}),
        cells: proximas,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const semDados = Object.values(porFonte).every((linhas) => !linhas.length);

  return (
    <PageTitle
      eyebrow="NOTEBOOK DE DADOS"
      title="Pergunte para os seus próprios números"
      text="Monte perguntas sobre o que o negócio já registrou. Escreve-se em português, uma instrução por linha, e o resultado sai na hora."
      action={
        <Button
          icon={Plus}
          onClick={() => aplicar([...cells, makeCell({ tipo: "consulta" })])}
        >
          Nova consulta
        </Button>
      }
    >
      <div className="nb-barra">
        <button
          type="button"
          className="btn tiny"
          onClick={() => aplicar([...cells, makeCell({ tipo: "texto" })])}
        >
          <Type size={13} /> Bloco de texto
        </button>
        <button
          type="button"
          className={`btn tiny${ajuda ? " ativo" : ""}`}
          onClick={() => setAjuda(!ajuda)}
        >
          <BookOpen size={13} /> Comandos
        </button>
        {RECIPES.map((r) => (
          <button
            key={r.label}
            type="button"
            className="btn tiny"
            onClick={() => {
              aplicar([
                ...cells,
                makeCell({
                  tipo: "consulta",
                  titulo: r.label,
                  fonte: r.fonte,
                  consulta: r.consulta,
                }),
              ]);
              setToast?.(`"${r.label}" adicionada abaixo.`);
            }}
          >
            <Plus size={12} /> {r.label}
          </button>
        ))}
      </div>

      {ajuda && (
        <ul className="nb-ajuda">
          {COMMANDS.map((c) => (
            <li key={c.nome}>
              <code>{c.exemplo}</code>
              <span>{c.ajuda}</span>
            </li>
          ))}
        </ul>
      )}

      {semDados && (
        <Empty
          icon={Table2}
          title="Ainda não há números para perguntar"
          text="O notebook lê o que já foi registrado no app: lançamentos do financeiro, tarefas, pedidos, contatos, agendamentos, contas e horas. Registre alguma coisa e volte aqui."
        />
      )}

      <div className="nb-celulas">
        {cells.map((cell, i) => (
          <section className="nb-cel" key={cell.id}>
            <header className="nb-cel-cabeca">
              <input
                className="nb-titulo"
                aria-label={`Título da célula ${i + 1}`}
                value={cell.titulo}
                placeholder={
                  cell.tipo === "texto" ? "Anotação" : "Nome desta pergunta"
                }
                onChange={(e) =>
                  aplicar(updateCell(cells, cell.id, { titulo: e.target.value }))
                }
              />
              <button
                type="button"
                className="icon-button"
                aria-label={`Subir célula ${i + 1}`}
                disabled={i === 0}
                onClick={() => aplicar(moveCell(cells, cell.id, "cima"))}
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Descer célula ${i + 1}`}
                disabled={i === cells.length - 1}
                onClick={() => aplicar(moveCell(cells, cell.id, "baixo"))}
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Apagar célula ${i + 1}`}
                onClick={() => aplicar(removeCell(cells, cell.id))}
              >
                <Trash2 size={14} />
              </button>
            </header>

            {cell.tipo === "texto" ? (
              <textarea
                className="nb-texto"
                aria-label={`Anotação ${i + 1}`}
                rows={3}
                value={cell.texto}
                placeholder="Escreva aqui a conclusão, o combinado ou o que precisa ser feito."
                onChange={(e) =>
                  aplicar(updateCell(cells, cell.id, { texto: e.target.value }))
                }
              />
            ) : (
              <QueryCell
                cell={cell}
                dados={porFonte[cell.fonte] || []}
                onChange={(mudancas) =>
                  aplicar(updateCell(cells, cell.id, mudancas))
                }
              />
            )}
          </section>
        ))}
      </div>
    </PageTitle>
  );
}
