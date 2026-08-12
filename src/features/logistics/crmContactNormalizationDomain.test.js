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

  it("um registro com duas pessoas vira dois contatos, e o e-mail fica com a dona dele", () => {
    // O defeito que apareceu em produção: "Thiago Souza / Fernanda Pereira"
    // virava UM contato chamado Thiago, com o e-mail da Fernanda e sem
    // telefone. A Fernanda sumia do CRM — e, se era ela a de Compras, o
    // painel dizia "contato não mapeado" com a conta cheia de contatos.
    expect(normalizeCrmContacts([{
      id: "1",
      name: "Thiago Souza / Fernanda Pereira",
      title: "Compras",
      department: "Compras",
      email: "fernanda.pereira@adidas.com",
      phone: "19982414440 / 11987654321",
      relationshipRole: "Operações",
    }]).map(({ id, name, email, phone }) => ({ id, name, email, phone }))).toEqual([
      { id: "1", name: "Thiago Souza", email: "", phone: "+5519982414440" },
      { id: "1-2", name: "Fernanda Pereira", email: "fernanda.pereira@adidas.com", phone: "+5511987654321" },
    ]);
  });

  it("o e-mail vai por quem ele nomeia, não pela posição no campo", () => {
    // Aqui a ordem posicional daria o e-mail ao Thiago. O nome no e-mail é a
    // evidência; a posição é palpite.
    const [primeiro, segundo] = normalizeCrmContacts([{
      id: "x", name: "Thiago Souza | Fernanda Pereira", email: "fernanda.pereira@empresa.com.br", phone: "",
    }]);
    expect(primeiro.email).toBe("");
    expect(segundo.email).toBe("fernanda.pereira@empresa.com.br");
  });

  it("dois e-mails no mesmo campo chegam cada um na sua pessoa", () => {
    expect(normalizeCrmContacts([{
      id: "y", name: "Ana Lima; Bruno Costa", email: "bruno.costa@x.com ana.lima@x.com", phone: "",
    }]).map(({ name, email }) => ({ name, email }))).toEqual([
      { name: "Ana Lima", email: "ana.lima@x.com" },
      { name: "Bruno Costa", email: "bruno.costa@x.com" },
    ]);
  });

  it("e-mail que não nomeia ninguém não é descartado nem duplicado", () => {
    const contatos = normalizeCrmContacts([{
      id: "z", name: "Ana Lima / Bruno Costa", email: "comercial@x.com", phone: "",
    }]);
    expect(contatos.map((item) => item.email)).toEqual(["comercial@x.com", ""]);
  });

  it("separar as pessoas é estável: normalizar de novo não cria contato novo", () => {
    // Cada salvamento passa por aqui. Se a segunda passada multiplicasse os
    // contatos, o CRM cresceria sozinho a cada edição da conta.
    const primeira = normalizeCrmContacts([{
      id: "1", name: "Thiago Souza / Fernanda Pereira", email: "fernanda.pereira@adidas.com",
      phone: "19982414440 / 11987654321",
    }]);
    expect(normalizeCrmContacts(primeira)).toEqual(primeira);
  });

  it("remove contatos repetidos pelo e-mail", () => {
    expect(normalizeCrmContacts([
      { name: "Kamila", email: "kamila@example.com", phone: "11999998888" },
      { name: "Kamila repetida", email: "KAMILA@example.com", phone: "11999998888" },
    ])).toHaveLength(1);
  });
});
