import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Plug,
  Upload,
} from "lucide-react";
import { Button, Empty, Field, PageTitle } from "../../components/ui.jsx";
import { uid } from "../../domain.js";
import {
  CONNECTIONS,
  IMPORTS,
  appointmentsToEvents,
  buildFullExport,
  buildIcs,
  buildImport,
  dedupe,
  exportableCollections,
  guessMapping,
  importById,
  parseCsv,
  toCsv,
  withBom,
} from "./integrationsDomain.js";

const baixar = (conteudo, nome, tipo) => {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

function ImportPanel({ db, update, business, setToast }) {
  const [modeloId, setModeloId] = useState(IMPORTS[0].id);
  const [arquivo, setArquivo] = useState(null); // {header, rows, nome}
  const [mapa, setMapa] = useState({});
  const [erro, setErro] = useState("");

  const modelo = importById(modeloId);

  const previa = useMemo(
    () => (arquivo ? buildImport(arquivo.rows, mapa, modeloId) : null),
    [arquivo, mapa, modeloId],
  );
  const separados = useMemo(
    () => (previa ? dedupe(previa.prontos, db?.[modelo.collection] || []) : null),
    [previa, db, modelo],
  );

  const lerArquivo = (file) => {
    if (!file) return;
    setErro("");
    const leitor = new FileReader();
    leitor.onload = () => {
      const lido = parseCsv(String(leitor.result || ""));
      if (!lido.header.length) {
        setErro("Não consegui ler este arquivo. Ele precisa ter um cabeçalho.");
        return;
      }
      setArquivo({ ...lido, nome: file.name });
      setMapa(guessMapping(lido.header, modeloId));
    };
    leitor.onerror = () => setErro("Não consegui abrir este arquivo.");
    leitor.readAsText(file, "utf-8");
  };

  const trocarModelo = (id) => {
    setModeloId(id);
    if (arquivo) setMapa(guessMapping(arquivo.header, id));
  };

  const importar = () => {
    if (!separados?.entram.length) return;
    const novos = separados.entram.map((item) => ({
      ...item,
      id: uid(),
      businessId: business?.id || null,
      ownerId: db?.user?.id || null,
      createdAt: new Date().toISOString(),
    }));
    update((atual) => ({
      ...atual,
      [modelo.collection]: [...novos, ...(atual[modelo.collection] || [])],
    }));
    setToast?.(`${novos.length} registro(s) importado(s) para ${modelo.label}.`);
    setArquivo(null);
    setMapa({});
  };

  return (
    <section className="int-bloco">
      <h3>
        <Upload size={16} /> Trazer de uma planilha
      </h3>
      <p className="muted">
        Exporte a sua planilha em CSV e solte aqui. O app tenta adivinhar as
        colunas — confira antes de confirmar.
      </p>

      <div className="int-linha">
        <Field label="O que estou trazendo">
          <select
            aria-label="Tipo de importação"
            value={modeloId}
            onChange={(e) => trocarModelo(e.target.value)}
          >
            {IMPORTS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <label className="int-upload">
          <Upload size={16} />
          <span>{arquivo ? arquivo.nome : "Escolher arquivo CSV"}</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(e) => lerArquivo(e.target.files?.[0])}
          />
        </label>
      </div>

      {erro && <div className="ask-error">{erro}</div>}

      {arquivo && (
        <>
          <h4>De qual coluna vem cada campo</h4>
          <div className="int-mapa">
            {modelo.campos.map((campo) => (
              <Field
                key={campo.id}
                label={`${campo.label}${campo.obrigatorio ? " *" : ""}`}
              >
                <select
                  aria-label={`Coluna para ${campo.label}`}
                  value={mapa[campo.id] || ""}
                  onChange={(e) =>
                    setMapa({ ...mapa, [campo.id]: e.target.value })
                  }
                >
                  <option value="">— não trazer —</option>
                  {arquivo.header.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>

          <p className="int-resumo">
            <CheckCircle2 size={15} /> {separados.entram.length} entram
            {separados.repetidos.length > 0 &&
              ` · ${separados.repetidos.length} já existiam`}
            {previa.recusados.length > 0 &&
              ` · ${previa.recusados.length} sem dado obrigatório`}
          </p>

          {previa.recusados.length > 0 && (
            <ul className="int-recusados">
              {previa.recusados.slice(0, 8).map((r) => (
                <li key={r.linha}>
                  <AlertTriangle size={13} /> Linha {r.linha}: {r.motivo}
                </li>
              ))}
            </ul>
          )}

          <Button
            icon={Upload}
            disabled={!separados.entram.length}
            onClick={importar}
          >
            Importar {separados.entram.length} registro(s)
          </Button>
        </>
      )}
    </section>
  );
}

export default function IntegrationsHub({ db, update, business, setToast }) {
  const colecoes = useMemo(() => exportableCollections(db), [db]);
  const agendamentos = useMemo(() => {
    const todos = db?.appointments || [];
    return todos.filter(
      (a) => !business?.id || !a?.businessId || a.businessId === business.id,
    );
  }, [db, business]);

  const baixarAgenda = () => {
    const { conteudo, incluidos } = buildIcs(
      appointmentsToEvents(agendamentos),
      { nome: business?.name ? `Agenda — ${business.name}` : "Agenda" },
    );
    if (!incluidos) {
      setToast?.("Nenhum agendamento com data para exportar.");
      return;
    }
    baixar(conteudo, "agenda.ics", "text/calendar;charset=utf-8");
    setToast?.(`${incluidos} compromisso(s) no arquivo.`);
  };

  const baixarTudo = () => {
    baixar(
      JSON.stringify(buildFullExport(db, business), null, 2),
      "meus-dados.json",
      "application/json",
    );
    setToast?.("Cópia baixada.");
  };

  const baixarColecao = (chave) => {
    const linhas = (db[chave] || []).filter(
      (x) => !business?.id || !x?.businessId || x.businessId === business.id,
    );
    if (!linhas.length) {
      setToast?.("Nada para exportar nesta lista.");
      return;
    }
    baixar(withBom(toCsv(linhas)), `${chave}.csv`, "text/csv;charset=utf-8");
  };

  return (
    <PageTitle
      eyebrow="INTEGRAÇÕES"
      title="Ligar o app ao que você já usa"
      text="Traga o que está na planilha, leve os seus dados para onde quiser e coloque a agenda no seu calendário. Nada aqui depende de serviço pago."
      action={
        <Button icon={Download} onClick={baixarTudo}>
          Baixar tudo
        </Button>
      }
    >
      <ImportPanel
        db={db}
        update={update}
        business={business}
        setToast={setToast}
      />

      <section className="int-bloco">
        <h3>
          <CalendarDays size={16} /> Levar a agenda para o seu calendário
        </h3>
        <p className="muted">
          Gera um arquivo .ics, que o Google Agenda, o iPhone e o Outlook
          importam. Sem chave, sem conta, sem custo.
        </p>
        <Button icon={CalendarDays} variant="secondary" onClick={baixarAgenda}>
          Baixar agenda ({agendamentos.length})
        </Button>
      </section>

      <section className="int-bloco">
        <h3>
          <FileSpreadsheet size={16} /> Levar os dados embora
        </h3>
        <p className="muted">
          Os dados são seus. Baixe qualquer lista em CSV para abrir no Excel, ou
          o espaço inteiro em JSON.
        </p>
        {!colecoes.length ? (
          <Empty
            icon={FileSpreadsheet}
            title="Ainda não há o que exportar"
            text="Assim que você registrar contatos, lançamentos ou pedidos, eles aparecem aqui para baixar."
          />
        ) : (
          <ul className="int-colecoes">
            {colecoes.map((c) => (
              <li key={c.chave}>
                <span>
                  {c.chave} <b>{c.total}</b>
                </span>
                <button
                  type="button"
                  className="btn tiny"
                  onClick={() => baixarColecao(c.chave)}
                >
                  <Download size={12} /> CSV
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="int-bloco">
        <h3>
          <Plug size={16} /> O que dá para conectar
        </h3>
        <ul className="int-conexoes">
          {CONNECTIONS.map((c) => (
            <li key={c.id} className={`int-${c.estado}`}>
              {c.estado === "pronto" ? (
                <CheckCircle2 size={16} />
              ) : (
                <Clock size={16} />
              )}
              <div>
                <strong>{c.nome}</strong>
                <small>
                  {c.estado === "pronto"
                    ? "Funciona agora"
                    : "Depende de uma decisão da titular"}
                </small>
                <p>{c.como}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </PageTitle>
  );
}
