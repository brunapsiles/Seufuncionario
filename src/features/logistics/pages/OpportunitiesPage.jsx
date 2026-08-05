import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Leaf, Plus, Target } from "lucide-react";
import {
  ESTAGIOS_OPORTUNIDADE,
  analisarOportunidade,
  normalizarOportunidade,
  resumirPipeline,
} from "../opportunityIntelligenceDomain.js";
import "./TodoGreenPages.css";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

// Os campos que o motor precisa para responder alguma coisa. Ficam agrupados
// por pergunta de negócio, não por tipo de dado — quem preenche é vendedor
// saindo de reunião, não analista.
const CAMPOS_OPERACAO = [
  { key: "distanciaKm", label: "Distância por viagem (km)", type: "number" },
  { key: "viagensMes", label: "Viagens por mês", type: "number" },
  { key: "ocupacaoPrevistaPercent", label: "Ocupação prevista (%)", type: "number" },
  { key: "frotaLimpaPercent", label: "Frota de baixa emissão (%)", type: "number" },
  { key: "veiculosDisponiveis", label: "Veículos disponíveis hoje", type: "number" },
];

const CAMPOS_CONTRATO = [
  { key: "valorMensal", label: "Valor mensal (R$)", type: "number" },
  { key: "mesesContrato", label: "Duração (meses)", type: "number" },
  { key: "probabilidade", label: "Probabilidade (%)", type: "number" },
];

const FORM_VAZIO = {
  cliente: "",
  productId: "middle-mile",
  estagio: "Diagnóstico",
  tipoVeiculo: "elétrico",
  distanciaKm: "",
  viagensMes: "",
  ocupacaoPrevistaPercent: "",
  frotaLimpaPercent: "",
  veiculosDisponiveis: "",
  valorMensal: "",
  mesesContrato: "12",
  probabilidade: "",
  nextStep: "",
};

const gravidadeRotulo = { alta: "Crítico", media: "Atenção", baixa: "Observação" };

function BlocoAmbiental({ ambiental }) {
  if (!ambiental.disponivel)
    return (
      <div className="tdg-opp-pendente">
        <AlertTriangle size={16} />
        <span>{ambiental.motivo}</span>
      </div>
    );
  return (
    <div className="tdg-opp-bloco">
      <h4>
        <Leaf size={15} />
        Potencial ambiental
      </h4>
      <div className="tdg-opp-numeros">
        <article>
          <small>CO2 evitado no contrato</small>
          <strong>{NUM.format(ambiental.co2ContratoToneladas)} t</strong>
          <span>{NUM.format(ambiental.co2MensalKg)} kg por mês</span>
        </article>
        <article>
          <small>Redução sobre o cenário diesel</small>
          <strong>{NUM.format(ambiental.reducaoPercent)}%</strong>
          <span>{NUM.format(ambiental.dieselEvitadoLitrosMes)} L de diesel por mês</span>
        </article>
        <article>
          <small>Qualidade do dado</small>
          <strong>{ambiental.qualidadeDados}%</strong>
          <span>Fatores {ambiental.versaoFatores}</span>
        </article>
      </div>
      <p className="tdg-opp-ressalva">{ambiental.usoPermitido}</p>
      {ambiental.tipoVeiculoPresumido && (
        <p className="tdg-opp-ressalva">
          Tipo de veículo não informado: o cálculo assumiu frota de baixa emissão. Confirme
          antes de levar o número ao cliente.
        </p>
      )}
      <details className="tdg-opp-memoria">
        <summary>Ver memória de cálculo</summary>
        <ol>
          {ambiental.memoria.passos.map((passo) => (
            <li key={passo.ordem}>
              {passo.descricao} — <em>{passo.formula}</em> ={" "}
              {NUM.format(passo.resultado)} {passo.unidade}
            </li>
          ))}
        </ol>
        <ul>
          {ambiental.memoria.fatoresUsados.map((fator) => (
            <li key={fator.chave}>
              {fator.valor} {fator.unidade} — {fator.fonte} (versão {fator.versao})
            </li>
          ))}
        </ul>
        <p>{ambiental.memoria.ressalva}</p>
      </details>
    </div>
  );
}

function CartaoOportunidade({ registro, analise, aberta, alternar }) {
  const { ambiental, greenScore, financeiro, operacional, expansao, riscos } = analise;
  const criticos = riscos.filter((risco) => risco.gravidade === "alta").length;
  return (
    <article className={`tdg-opp-card${aberta ? " aberta" : ""}`}>
      <button type="button" className="tdg-opp-head" onClick={alternar} aria-expanded={aberta}>
        {aberta ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
        <span className="tdg-opp-head-nome">
          <strong>{registro.cliente || "Oportunidade sem cliente"}</strong>
          <small>
            {analise.estagio} · {financeiro.probabilidade}% de probabilidade
          </small>
        </span>
        <span className="tdg-opp-head-valor">
          <strong>{BRL.format(financeiro.valorContrato)}</strong>
          <small>{BRL.format(financeiro.valorPonderado)} ponderado</small>
        </span>
        <span className="tdg-opp-head-esg">
          {ambiental.disponivel ? (
            <>
              <strong>{NUM.format(ambiental.co2ContratoToneladas)} t</strong>
              <small>CO2 evitado</small>
            </>
          ) : (
            <>
              <strong>—</strong>
              <small>sem dado operacional</small>
            </>
          )}
        </span>
        {criticos > 0 && (
          <span className="tdg-opp-alerta">
            <AlertTriangle size={14} />
            {criticos}
          </span>
        )}
      </button>

      {aberta && (
        <div className="tdg-opp-corpo">
          <div className="tdg-opp-acao">
            <Target size={16} />
            <div>
              <strong>{analise.proximaAcao.acao}</strong>
              <p>{analise.proximaAcao.porque}</p>
            </div>
            <span className={`tdg-opp-urgencia u-${analise.proximaAcao.urgencia}`}>
              {gravidadeRotulo[analise.proximaAcao.urgencia]}
            </span>
          </div>

          <BlocoAmbiental ambiental={ambiental} />

          {greenScore.disponivel && (
            <div className="tdg-opp-bloco">
              <h4>Green Score projetado: {NUM.format(greenScore.valor)}</h4>
              <div className="tdg-opp-componentes">
                {Object.entries(greenScore.componentes).map(([chave, componente]) => (
                  <div key={chave}>
                    <span>{componente.rotulo}</span>
                    <div className="tdg-opp-barra">
                      <i style={{ width: `${(componente.contribuicao / componente.maximo) * 100}%` }} />
                    </div>
                    <small>
                      {NUM.format(componente.contribuicao)} de {componente.maximo}
                    </small>
                  </div>
                ))}
              </div>
              <p className="tdg-opp-ressalva">
                {greenScore.ressalva} Pesos {greenScore.versaoPesos}.
              </p>
            </div>
          )}

          <div className="tdg-opp-bloco">
            <h4>Impacto financeiro e operacional</h4>
            <div className="tdg-opp-numeros">
              <article>
                <small>Valor mensal</small>
                <strong>{BRL.format(financeiro.valorMensal)}</strong>
                <span>
                  {financeiro.baseDoValor === "contrato"
                    ? "derivado do valor total informado"
                    : financeiro.baseDoValor === "ausente"
                      ? "valor não informado"
                      : `${financeiro.mesesContrato} meses de contrato`}
                </span>
              </article>
              <article>
                <small>Receita no ano corrente</small>
                <strong>{BRL.format(financeiro.valorNoAnoCorrente)}</strong>
                <span>se fechar agora</span>
              </article>
              <article>
                <small>Frota necessária</small>
                <strong>{operacional.veiculosNecessarios}</strong>
                <span>
                  {NUM.format(operacional.kmMes)} km por mês · {operacional.motoristasNecessarios}{" "}
                  motorista(s)
                </span>
              </article>
            </div>
          </div>

          <div className="tdg-opp-duas">
            <div className="tdg-opp-bloco">
              <h4>Riscos</h4>
              {riscos.length === 0 && <p className="tdg-opp-ressalva">Nenhum risco identificado com os dados atuais.</p>}
              <ul className="tdg-opp-riscos">
                {riscos.map((risco) => (
                  <li key={risco.tipo} className={`g-${risco.gravidade}`}>
                    <span>{gravidadeRotulo[risco.gravidade]}</span>
                    {risco.texto}
                  </li>
                ))}
              </ul>
            </div>
            <div className="tdg-opp-bloco">
              <h4>Potencial de expansão</h4>
              {expansao.caminhos.length === 0 && <p className="tdg-opp-ressalva">{expansao.resumo}</p>}
              <ul className="tdg-opp-expansao">
                {expansao.caminhos.map((caminho) => (
                  <li key={caminho.tipo}>
                    <strong>{caminho.titulo}</strong>
                    <small>{caminho.base}</small>
                    <small>{caminho.ganhoEstimado}</small>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function OpportunitiesPage({ opportunities = [], onCreate, setToast }) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [abertaId, setAbertaId] = useState(null);

  const registros = useMemo(
    () => opportunities.map((item) => normalizarOportunidade(item)),
    [opportunities],
  );
  const resumo = useMemo(() => resumirPipeline(registros), [registros]);
  const analises = useMemo(
    () => new Map(registros.map((registro) => [registro.id, analisarOportunidade(registro)])),
    [registros],
  );

  const campo = (key) => (event) =>
    setForm((atual) => ({ ...atual, [key]: event.target.value }));

  const salvar = (event) => {
    event.preventDefault();
    onCreate?.({
      id: `opp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastInteractionAt: new Date().toISOString(),
      ...form,
      // Números saem do formulário como texto; guardar assim faria o motor
      // somar strings e produzir um pipeline errado sem erro nenhum.
      ...Object.fromEntries(
        [...CAMPOS_OPERACAO, ...CAMPOS_CONTRATO].map(({ key }) => [key, Number(form[key] || 0)]),
      ),
    });
    setForm(FORM_VAZIO);
    setToast?.("Oportunidade registrada com potencial ESG calculado.");
  };

  return (
    <section className="tdg-panel tdg-page tdg-opp-page">
      <header className="tdg-page-title">
        <div>
          <span>PIPELINE COMERCIAL</span>
          <h2>Oportunidades</h2>
          <p>
            Cada oportunidade mostra o CO2 que a operação proposta evita, o Green Score que o
            cliente passaria a ter, o que isso vale em dinheiro e em frota, e o que está
            travando o negócio. Os números vêm dos mesmos motores que apuram a operação
            executada — o que é prometido aqui é o que será medido depois.
          </p>
        </div>
      </header>

      <div className="tdg-opp-resumo">
        <article>
          <small>Oportunidades abertas</small>
          <strong>{resumo.total}</strong>
        </article>
        <article>
          <small>Valor em contrato</small>
          <strong>{BRL.format(resumo.valorTotal)}</strong>
        </article>
        <article>
          <small>Ponderado pela probabilidade</small>
          <strong>{BRL.format(resumo.valorPonderado)}</strong>
          <span>é este que vai para o forecast</span>
        </article>
        <article>
          <small>CO2 potencial na carteira</small>
          <strong>{NUM.format(resumo.co2PotencialToneladas)} t</strong>
          {resumo.semDadoAmbiental > 0 && (
            <span>{resumo.semDadoAmbiental} sem dado operacional</span>
          )}
        </article>
      </div>

      <form className="tdg-client-admin-form" onSubmit={salvar}>
        <strong>Nova oportunidade</strong>
        <div className="tdg-form-row">
          <label>
            <span>Cliente</span>
            <input required value={form.cliente} onChange={campo("cliente")} />
          </label>
          <label>
            <span>Estágio</span>
            <select value={form.estagio} onChange={campo("estagio")}>
              {ESTAGIOS_OPORTUNIDADE.map((estagio) => (
                <option key={estagio} value={estagio}>
                  {estagio}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Tipo de veículo</span>
            <select value={form.tipoVeiculo} onChange={campo("tipoVeiculo")}>
              <option value="elétrico">Elétrico</option>
              <option value="diesel">Diesel</option>
            </select>
          </label>
        </div>
        <div className="tdg-form-row tdg-opp-form-larga">
          {CAMPOS_CONTRATO.map(({ key, label, type }) => (
            <label key={key}>
              <span>{label}</span>
              <input type={type} value={form[key]} onChange={campo(key)} />
            </label>
          ))}
        </div>
        <div className="tdg-form-row tdg-opp-form-larga">
          {CAMPOS_OPERACAO.map(({ key, label, type }) => (
            <label key={key}>
              <span>{label}</span>
              <input type={type} value={form[key]} onChange={campo(key)} />
            </label>
          ))}
        </div>
        <p className="tdg-opp-ressalva">
          Distância e viagens por mês são o que destrava o cálculo ambiental. Sem elas a
          oportunidade entra no pipeline, mas sem potencial ESG.
        </p>
        <button className="tdg-action" type="submit">
          <Plus size={16} />
          Registrar oportunidade
        </button>
      </form>

      {registros.length === 0 && (
        <p className="tdg-opp-vazio">
          Nenhuma oportunidade registrada ainda. A primeira que você cadastrar já sai com
          potencial ambiental, Green Score projetado e próxima ação.
        </p>
      )}

      <div className="tdg-opp-lista">
        {registros.map((registro) => (
          <CartaoOportunidade
            key={registro.id}
            registro={registro}
            analise={analises.get(registro.id)}
            aberta={abertaId === registro.id}
            alternar={() => setAbertaId((atual) => (atual === registro.id ? null : registro.id))}
          />
        ))}
      </div>
    </section>
  );
}
