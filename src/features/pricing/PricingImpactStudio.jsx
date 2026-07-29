import { useState } from "react";
import {
  ArrowRight,
  Calculator,
  CircleAlert,
  FileCheck2,
  Leaf,
  Plus,
  Save,
  Scale,
  Trash2,
} from "lucide-react";
import {
  calculateImpact,
  calculatePricing,
  COST_DRIVERS,
  createImpactFactor,
  createPricingModel,
  createPricingScenario,
  PRICING_TEMPLATES,
  quoteFromPricingScenario,
} from "./pricingImpactDomain.js";

const id = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const amount = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const decimal = (value) => Number(value || 0);

export default function PricingImpactStudio({
  db,
  update,
  business,
  setToast,
}) {
  const scoped = (items) =>
    (items || []).filter((item) => !business || item.businessId === business.id);
  const models = scoped(db.pricingModels);
  const scenarios = scoped(db.pricingScenarios);
  const factors = scoped(db.impactFactors);
  const [tab, setTab] = useState("calculator");
  const [selectedModelId, setSelectedModelId] = useState(models[0]?.id || "");
  const [showModel, setShowModel] = useState(models.length === 0);
  const [templateId, setTemplateId] = useState("services");
  const [modelForm, setModelForm] = useState({
    name: "",
    taxPercent: 0,
    commissionPercent: 0,
    targetMarginPercent: 20,
  });
  const [scenarioForm, setScenarioForm] = useState({
    name: "",
    clientName: "",
    quantity: 1,
    hours: 0,
    distanceKm: 0,
    weightKg: 0,
    discount: 0,
  });
  const [impactRows, setImpactRows] = useState([]);
  const [factorForm, setFactorForm] = useState({
    name: "",
    activityUnit: "unidade",
    kgCo2ePerUnit: "",
    scope: "Escopo 3",
    category: "",
    source: "",
    version: "",
  });
  const context = { businessId: business?.id, ownerId: db.user?.id };
  const selectedModel =
    models.find((item) => item.id === selectedModelId) || models[0] || null;
  const pricing = selectedModel
    ? calculatePricing(selectedModel, {
        inputs: {
          quantity: decimal(scenarioForm.quantity),
          hours: decimal(scenarioForm.hours),
          distanceKm: decimal(scenarioForm.distanceKm),
          weightKg: decimal(scenarioForm.weightKg),
        },
        discount: decimal(scenarioForm.discount),
      })
    : null;
  const impact = calculateImpact(impactRows, factors);

  const createModel = (event) => {
    event.preventDefault();
    const model = createPricingModel(
      {
        ...modelForm,
        templateId,
        name:
          modelForm.name ||
          PRICING_TEMPLATES.find((item) => item.id === templateId)?.name,
      },
      context,
    );
    update((current) => ({
      ...current,
      pricingModels: [model, ...(current.pricingModels || [])],
    }));
    setSelectedModelId(model.id);
    setShowModel(false);
    setToast("Modelo de precificação criado");
  };

  const patchModel = (patch) =>
    update((current) => ({
      ...current,
      pricingModels: (current.pricingModels || []).map((model) =>
        model.id === selectedModel.id
          ? { ...model, ...patch, updatedAt: new Date().toISOString() }
          : model,
      ),
    }));

  const patchCost = (costId, patch) =>
    patchModel({
      costItems: selectedModel.costItems.map((item) =>
        item.id === costId ? { ...item, ...patch } : item,
      ),
    });

  const addCost = () =>
    patchModel({
      costItems: [
        ...selectedModel.costItems,
        { id: id(), name: "Novo custo", driver: "fixed", rate: 0 },
      ],
    });

  const saveScenario = () => {
    if (!scenarioForm.name.trim()) {
      setToast("Dê um nome ao cenário");
      return;
    }
    const scenario = createPricingScenario(
      selectedModel,
      {
        name: scenarioForm.name,
        clientName: scenarioForm.clientName,
        inputs: {
          quantity: scenarioForm.quantity,
          hours: scenarioForm.hours,
          distanceKm: scenarioForm.distanceKm,
          weightKg: scenarioForm.weightKg,
        },
        discount: scenarioForm.discount,
        impactEntries: impactRows,
      },
      factors,
      context,
    );
    update((current) => ({
      ...current,
      pricingScenarios: [scenario, ...(current.pricingScenarios || [])],
    }));
    setToast("Cenário e memória de cálculo salvos");
  };

  const createQuote = () => {
    if (!scenarioForm.name.trim()) {
      setToast("Dê um nome ao cenário antes de gerar o orçamento");
      return;
    }
    const scenario = createPricingScenario(
      selectedModel,
      {
        name: scenarioForm.name,
        clientName: scenarioForm.clientName,
        inputs: {
          quantity: scenarioForm.quantity,
          hours: scenarioForm.hours,
          distanceKm: scenarioForm.distanceKm,
          weightKg: scenarioForm.weightKg,
        },
        discount: scenarioForm.discount,
        impactEntries: impactRows,
      },
      factors,
      context,
    );
    const quote = quoteFromPricingScenario(scenario, selectedModel, context);
    update((current) => ({
      ...current,
      pricingScenarios: [scenario, ...(current.pricingScenarios || [])],
      quotes: [quote, ...(current.quotes || [])],
    }));
    setToast("Orçamento criado com memória de cálculo vinculada");
  };

  const saveFactor = (event) => {
    event.preventDefault();
    if (!factorForm.name.trim() || !decimal(factorForm.kgCo2ePerUnit)) return;
    const factor = createImpactFactor(factorForm, context);
    update((current) => ({
      ...current,
      impactFactors: [factor, ...(current.impactFactors || [])],
    }));
    setFactorForm({
      name: "",
      activityUnit: "unidade",
      kgCo2ePerUnit: "",
      scope: "Escopo 3",
      category: "",
      source: "",
      version: "",
    });
    setToast("Fator de impacto registrado com fonte e versão");
  };

  const addImpactRow = () =>
    setImpactRows([
      ...impactRows,
      {
        id: id(),
        factorId: factors[0]?.id || "",
        quantity: 0,
        dataQuality: "estimado",
        evidence: "",
      },
    ]);

  return (
    <main className="pricing-page">
      <header className="pricing-hero">
        <div>
          <span>PRECIFICAÇÃO E IMPACTO</span>
          <h1>Decida com custo, margem e impacto na mesma memória</h1>
          <p>
            Use modelos universais e configure os direcionadores da sua operação.
            Transporte, serviços, produtos e projetos compartilham o mesmo motor.
          </p>
        </div>
        <button className="btn primary" onClick={() => setShowModel(true)}>
          <Plus size={17} /> Novo modelo
        </button>
      </header>

      <nav className="pricing-tabs" aria-label="Áreas da precificação">
        {[
          ["calculator", "Calcular"],
          ["models", "Modelo de custos"],
          ["factors", "Fatores de impacto"],
          ["history", "Cenários salvos"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {models.length > 0 && (
        <section className="pricing-model-picker">
          <label>
            Modelo ativo
            <select
              value={selectedModel?.id || ""}
              onChange={(event) => setSelectedModelId(event.target.value)}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </label>
          <p>{selectedModel?.description}</p>
        </section>
      )}

      {models.length === 0 && !showModel ? (
        <section className="pricing-empty">
          <Calculator />
          <h2>Crie seu primeiro modelo</h2>
          <p>
            Escolha uma base e ajuste todos os custos. Os templates apenas aceleram
            a configuração e não limitam o setor.
          </p>
          <button className="btn primary" onClick={() => setShowModel(true)}>
            Criar modelo
          </button>
        </section>
      ) : (
        <>
          {tab === "calculator" && selectedModel && (
            <section className="pricing-layout">
              <article className="pricing-panel">
                <header>
                  <div>
                    <h2>Dados do cenário</h2>
                    <p>Preencha apenas os direcionadores usados pelo modelo.</p>
                  </div>
                </header>
                <div className="pricing-form-grid">
                  <label>
                    Nome do cenário
                    <input
                      aria-label="Nome do cenário"
                      value={scenarioForm.name}
                      onChange={(event) =>
                        setScenarioForm({ ...scenarioForm, name: event.target.value })
                      }
                      placeholder="Ex.: contrato mensal ou rota elétrica"
                    />
                  </label>
                  <label>
                    Cliente opcional
                    <input
                      value={scenarioForm.clientName}
                      onChange={(event) =>
                        setScenarioForm({
                          ...scenarioForm,
                          clientName: event.target.value,
                        })
                      }
                    />
                  </label>
                  {[
                    ["quantity", "Quantidade"],
                    ["hours", "Horas"],
                    ["distanceKm", "Distância (km)"],
                    ["weightKg", "Peso (kg)"],
                    ["discount", "Desconto (R$)"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        aria-label={label}
                        type="number"
                        min="0"
                        step="0.01"
                        value={scenarioForm[key]}
                        onChange={(event) =>
                          setScenarioForm({
                            ...scenarioForm,
                            [key]: decimal(event.target.value),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="pricing-impact-editor">
                  <header>
                    <div>
                      <h3>Atividades de impacto</h3>
                      <p>Opcional. Use fatores documentados para calcular CO₂e.</p>
                    </div>
                    <button
                      className="btn ghost"
                      disabled={!factors.length}
                      onClick={addImpactRow}
                    >
                      <Plus size={16} /> Adicionar
                    </button>
                  </header>
                  {!factors.length && (
                    <p className="pricing-note">
                      Cadastre um fator de impacto na aba correspondente. Nenhum
                      valor será presumido pelo sistema.
                    </p>
                  )}
                  {impactRows.map((row) => (
                    <div className="pricing-impact-row" key={row.id}>
                      <select
                        aria-label="Fator de impacto"
                        value={row.factorId}
                        onChange={(event) =>
                          setImpactRows(
                            impactRows.map((item) =>
                              item.id === row.id
                                ? { ...item, factorId: event.target.value }
                                : item,
                            ),
                          )
                        }
                      >
                        {factors.map((factor) => (
                          <option key={factor.id} value={factor.id}>
                            {factor.name} · kgCO₂e/{factor.activityUnit}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label="Quantidade da atividade"
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.quantity}
                        onChange={(event) =>
                          setImpactRows(
                            impactRows.map((item) =>
                              item.id === row.id
                                ? { ...item, quantity: decimal(event.target.value) }
                                : item,
                            ),
                          )
                        }
                      />
                      <select
                        value={row.dataQuality}
                        onChange={(event) =>
                          setImpactRows(
                            impactRows.map((item) =>
                              item.id === row.id
                                ? { ...item, dataQuality: event.target.value }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="medido">Medido</option>
                        <option value="fornecedor">Informado por fornecedor</option>
                        <option value="estimado">Estimado</option>
                      </select>
                      <input
                        value={row.evidence}
                        placeholder="Evidência ou documento"
                        onChange={(event) =>
                          setImpactRows(
                            impactRows.map((item) =>
                              item.id === row.id
                                ? { ...item, evidence: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <button
                        aria-label="Remover atividade"
                        onClick={() =>
                          setImpactRows(impactRows.filter((item) => item.id !== row.id))
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </article>

              <aside className="pricing-result">
                <header><Scale /><div><span>Preço recomendado</span><strong>{amount(pricing.finalPrice)}</strong></div></header>
                {!pricing.valid && <div className="pricing-alert"><CircleAlert />{pricing.warning}</div>}
                <dl>
                  <div><dt>Custo direto</dt><dd>{amount(pricing.directCost)}</dd></div>
                  <div><dt>Impostos</dt><dd>{amount(pricing.taxes)}</dd></div>
                  <div><dt>Comissão</dt><dd>{amount(pricing.commission)}</dd></div>
                  <div><dt>Margem</dt><dd>{amount(pricing.marginValue)} · {pricing.marginPercent}%</dd></div>
                  <div><dt>Preço por unidade</dt><dd>{amount(pricing.unitPrice)}</dd></div>
                </dl>
                <div className="pricing-carbon">
                  <Leaf />
                  <span>Impacto calculado</span>
                  <strong>{impact.totalKgCo2e} kgCO₂e</strong>
                  <small>Confiabilidade dos dados: {impact.confidence}%</small>
                </div>
                <div className="pricing-result-actions">
                  <button className="btn ghost" onClick={saveScenario}>
                    <Save size={16} /> Salvar cenário
                  </button>
                  <button className="btn primary" onClick={createQuote}>
                    Criar orçamento <ArrowRight size={16} />
                  </button>
                </div>
              </aside>
            </section>
          )}

          {tab === "models" && selectedModel && (
            <section className="pricing-panel">
              <header>
                <div><h2>Memória de custos</h2><p>Altere direcionadores e taxas sem modificar a aplicação.</p></div>
                <button className="btn ghost" onClick={addCost}><Plus size={16} /> Novo custo</button>
              </header>
              <div className="pricing-rate-grid">
                {(selectedModel.costItems || []).map((item) => (
                  <div key={item.id}>
                    <input
                      aria-label={`Nome do custo ${item.name}`}
                      value={item.name}
                      onChange={(event) => patchCost(item.id, { name: event.target.value })}
                    />
                    <select
                      value={item.driver}
                      onChange={(event) =>
                        patchCost(item.id, { driver: event.target.value })
                      }
                    >
                      {COST_DRIVERS.map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <input
                      aria-label={`Valor de ${item.name}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(event) =>
                        patchCost(item.id, { rate: decimal(event.target.value) })
                      }
                    />
                    <button
                      aria-label={`Excluir ${item.name}`}
                      onClick={() =>
                        patchModel({
                          costItems: selectedModel.costItems.filter(
                            (cost) => cost.id !== item.id,
                          ),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="pricing-form-grid rates">
                {[
                  ["taxPercent", "Impostos (%)"],
                  ["commissionPercent", "Comissão (%)"],
                  ["targetMarginPercent", "Margem desejada (%)"],
                  ["minimumPrice", "Preço mínimo"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={selectedModel[key] || 0}
                      onChange={(event) =>
                        patchModel({ [key]: decimal(event.target.value) })
                      }
                    />
                  </label>
                ))}
              </div>
            </section>
          )}

          {tab === "factors" && (
            <section className="pricing-layout factors">
              <form className="pricing-panel" onSubmit={saveFactor}>
                <header><div><h2>Novo fator de impacto</h2><p>O sistema exige fonte e versão para aumentar a confiabilidade.</p></div></header>
                <div className="pricing-form-grid">
                  <label>Nome *<input aria-label="Nome do fator" required value={factorForm.name} onChange={(event) => setFactorForm({ ...factorForm, name: event.target.value })} /></label>
                  <label>Unidade da atividade<input value={factorForm.activityUnit} onChange={(event) => setFactorForm({ ...factorForm, activityUnit: event.target.value })} /></label>
                  <label>kgCO₂e por unidade *<input aria-label="kgCO2e por unidade" required type="number" min="0" step="0.000001" value={factorForm.kgCo2ePerUnit} onChange={(event) => setFactorForm({ ...factorForm, kgCo2ePerUnit: event.target.value })} /></label>
                  <label>Escopo<select value={factorForm.scope} onChange={(event) => setFactorForm({ ...factorForm, scope: event.target.value })}><option>Escopo 1</option><option>Escopo 2</option><option>Escopo 3</option></select></label>
                  <label>Categoria<input value={factorForm.category} onChange={(event) => setFactorForm({ ...factorForm, category: event.target.value })} /></label>
                  <label>Versão ou ano<input value={factorForm.version} onChange={(event) => setFactorForm({ ...factorForm, version: event.target.value })} /></label>
                </div>
                <label className="pricing-source">Fonte do fator<input value={factorForm.source} placeholder="Publicação, órgão ou metodologia" onChange={(event) => setFactorForm({ ...factorForm, source: event.target.value })} /></label>
                <button className="btn primary"><FileCheck2 size={16} /> Salvar fator</button>
              </form>
              <article className="pricing-panel">
                <header><div><h2>Biblioteca da empresa</h2><p>Nenhum fator genérico é imposto.</p></div></header>
                <div className="pricing-factor-list">
                  {!factors.length && <p className="pricing-note">Nenhum fator cadastrado.</p>}
                  {factors.map((factor) => (
                    <div key={factor.id}><span><strong>{factor.name}</strong><small>{factor.scope} · {factor.kgCo2ePerUnit} kgCO₂e/{factor.activityUnit}</small></span><small>{factor.source || "Sem fonte"} {factor.version && `· ${factor.version}`}</small></div>
                  ))}
                </div>
              </article>
            </section>
          )}

          {tab === "history" && (
            <section className="pricing-panel">
              <header><div><h2>Cenários salvos</h2><p>Compare preço, custo, margem e impacto sem perder premissas.</p></div></header>
              <div className="pricing-history">
                {!scenarios.length && <p className="pricing-note">Nenhum cenário salvo.</p>}
                {scenarios.map((scenario) => (
                  <article key={scenario.id}>
                    <span><strong>{scenario.name}</strong><small>{models.find((model) => model.id === scenario.modelId)?.name || "Modelo removido"}{scenario.clientName && ` · ${scenario.clientName}`}</small></span>
                    <span><strong>{amount(scenario.result?.finalPrice)}</strong><small>Custo {amount(scenario.result?.directCost)}</small></span>
                    <span><strong>{scenario.result?.marginPercent || 0}%</strong><small>Margem</small></span>
                    <span><strong>{scenario.result?.totalKgCo2e || 0} kgCO₂e</strong><small>Confiança {scenario.result?.impactConfidence || 0}%</small></span>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {showModel && (
        <div className="pricing-modal-backdrop" role="presentation">
          <section className="pricing-modal" role="dialog" aria-modal="true">
            <form onSubmit={createModel}>
              <header><h2>Novo modelo de precificação</h2><p>Escolha uma estrutura inicial. Tudo poderá ser editado.</p></header>
              <div className="pricing-template-grid">
                {PRICING_TEMPLATES.map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    className={templateId === template.id ? "active" : ""}
                    onClick={() => setTemplateId(template.id)}
                  >
                    <strong>{template.name}</strong><small>{template.description}</small>
                  </button>
                ))}
              </div>
              <label>Nome do modelo<input aria-label="Nome do modelo" value={modelForm.name} onChange={(event) => setModelForm({ ...modelForm, name: event.target.value })} /></label>
              <div className="pricing-form-grid rates">
                <label>Impostos (%)<input type="number" min="0" value={modelForm.taxPercent} onChange={(event) => setModelForm({ ...modelForm, taxPercent: decimal(event.target.value) })} /></label>
                <label>Comissão (%)<input type="number" min="0" value={modelForm.commissionPercent} onChange={(event) => setModelForm({ ...modelForm, commissionPercent: decimal(event.target.value) })} /></label>
                <label>Margem desejada (%)<input type="number" min="0" value={modelForm.targetMarginPercent} onChange={(event) => setModelForm({ ...modelForm, targetMarginPercent: decimal(event.target.value) })} /></label>
              </div>
              <footer><button type="button" className="btn ghost" onClick={() => setShowModel(false)}>Cancelar</button><button className="btn primary">Criar modelo</button></footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
