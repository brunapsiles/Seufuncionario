import { describe, expect, it } from "vitest";
import {
  nextBestAction,
  parseDelimitedText,
  parseOfxTransactions,
} from "./App.jsx";

describe("ativação, foco diário e importação", () => {
  it("prioriza uma tarefa atrasada antes de sugestões genéricas", () => {
    const result = nextBestAction(
      {
        tasks: [
          {
            id: "future",
            title: "Tarefa futura",
            due: "2026-07-25",
            status: "A fazer",
            ownerId: "user-1",
          },
          {
            id: "late",
            title: "Responder proposta",
            due: "2026-07-19",
            status: "Em andamento",
            ownerId: "user-1",
          },
        ],
      },
      null,
      "user-1",
      "2026-07-20",
    );
    expect(result).toMatchObject({
      tone: "danger",
      title: "Responder proposta",
      page: "operacao",
    });
  });

  it("lê CSV do Excel com ponto e vírgula, acentos e campos entre aspas", () => {
    const rows = parseDelimitedText(
      'Nome;E-mail;Empresa\n"Maria da Silva";maria@example.com;"Ateliê; Aurora"',
    );
    expect(rows).toEqual([
      {
        nome: "Maria da Silva",
        "e-mail": "maria@example.com",
        empresa: "Ateliê; Aurora",
      },
    ]);
  });

  it("converte créditos e débitos de um extrato OFX", () => {
    const rows = parseOfxTransactions(`
      <OFX><BANKTRANLIST>
      <STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260718120000<TRNAMT>150.50<FITID>1<MEMO>Venda
      <STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260719120000<TRNAMT>-30.25<FITID>2<NAME>Internet
      </BANKTRANLIST></OFX>
    `);
    expect(rows).toMatchObject([
      { type: "Receita", value: 150.5, date: "2026-07-18", description: "Venda" },
      { type: "Despesa", value: 30.25, date: "2026-07-19", description: "Internet" },
    ]);
  });
});
