import { describe, expect, it } from "vitest";
import { normalizeCrmContacts, normalizedPhone, splitGroupedPhones } from "./crmContactNormalizationDomain.js";

describe("normalização dos contatos importados no CRM", () => {
  it("separa nomes e telefones agrupados pela posição dos e-mails", () => {
    const contacts = ["marx.sobrinho", "danilo.diego", "fabricio.lucchini", "vitor.malaguti"].map((email, index) => ({
      id: String(index), name: "Marx/ Danilo/Fabricio/Vitor", email: `${email}@lojasrenner.com.br`,
      phone: "55 11 93092-6897\n55 11 95787-4644\n55 11 99696-3246\n55 11 93367-8264",
      department: "Operações", relationshipRole: "Operações",
    }));
    expect(normalizeCrmContacts(contacts).map(({ name, phone }) => ({ name, phone }))).toEqual([
      { name: "Marx", phone: "+5511930926897" },
      { name: "Danilo", phone: "+5511957874644" },
      { name: "Fabricio", phone: "+5511996963246" },
      { name: "Vitor", phone: "+5511933678264" },
    ]);
  });

  it("não transforma vários telefones concatenados em um único WhatsApp", () => {
    expect(normalizedPhone("55119309268975511957874644")).toBe("");
    expect(splitGroupedPhones("5197665842\n11911754906\n5196935661", 3)).toEqual([
      "+555197665842", "+5511911754906", "+555196935661",
    ]);
  });

  it("remove contatos repetidos pelo e-mail", () => {
    expect(normalizeCrmContacts([
      { name: "Kamila", email: "kamila@example.com", phone: "11999998888" },
      { name: "Kamila repetida", email: "KAMILA@example.com", phone: "11999998888" },
    ])).toHaveLength(1);
  });
});
