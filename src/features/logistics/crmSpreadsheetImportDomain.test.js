import { describe, expect, it } from "vitest";
import { parseCrmRows } from "./crmSpreadsheetImportDomain.js";

describe("importação em lote do CRM", () => {
  it("consolida as linhas da Amazon, separa contatos e marca o histórico como Total Express", () => {
    const rows = [
      ["NUCLEO", "GRUPO", "Soma de VOLUME_FCST", "Soma de RECEITA_FCST", "TICKET MÉDIO", "RESPONSÁVEL OPS", "CONTATO", "E-MAIIL", "SUPRIMENTOS", "CONTATO", "E-MAIL"],
      ["KA", "AMAZON RETAIL", 100, 1000, 10, "FERNANDA VASCO", "11 98839-5335", "Vasco, Fernanda <fevasco@amazon.com>"],
      ["KA", "AMAZON DBA", 200, 2000, 10, "MICHEL", "+55 11 95056-1681", "Groenner, Michel <groenner@amazon.com>", "VITOR", "+55 11 97213-0250", "Caliman, Victor <vcaliman@amazon.com>"],
    ];
    const clients = parseCrmRows(rows);
    expect(clients).toHaveLength(1);
    expect(clients[0]).toEqual(expect.objectContaining({ nome: "Amazon" }));
    expect(clients[0].crm.temperature).toBe("Frio");
    expect(clients[0].crm.contacts.map((item) => item.email)).toEqual([
      "fevasco@amazon.com", "groenner@amazon.com", "vcaliman@amazon.com",
    ]);
    expect(clients[0].crm.contacts[0].phone).toBe("+5511988395335");
    expect(clients[0].crm.qualification).toEqual(expect.objectContaining({
      totalExpressHistoricalRevenue: "3000",
      financialDataOwner: "Total Express",
    }));
  });

  it("classifica empresas da Carteira To Do Green como mornas", () => {
    const clients = parseCrmRows([
      ["STATUS", "CLIENTE", "OPORTUNIDADE", "RESPONSÁVEL", "ETAPA"],
      ["", "Adidas", "Projeto Brasil", "Novos negócios", "Negociação"],
    ]);
    expect(clients[0].crm).toEqual(expect.objectContaining({ temperature: "Morno", source: "Carteira To Do Green", stage: "Negociação" }));
  });
});
