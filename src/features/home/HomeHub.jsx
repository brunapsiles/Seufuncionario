import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  Compass,
  Search,
  Sparkles,
  Star,
  Workflow,
} from "lucide-react";

import { Empty } from "../../components/ui.jsx";
import { readVisits } from "../navigation/menuDomain.js";

const HOME_TASK_LIMIT = 12;

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const matchesQuery = (item, query) => {
  if (!query) return true;
  const haystack = normalize(
    [item.title, item.subtitle, item.description, item.search].filter(Boolean).join(" "),
  );
  return haystack.includes(normalize(query));
};

const compactGroupLabel = (label) =>
  String(label || "")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

function cardClass(kind) {
  return `home-hub-card home-hub-card-${kind}`;
}

function HubCard({ item, kind }) {
  const Icon = item.icon || Compass;
  return (
    <button
      type="button"
      className={cardClass(kind)}
      onClick={item.onClick}
      aria-label={item.ariaLabel || `Abrir ${item.title}`}
    >
      <span className="home-hub-card-icon" aria-hidden="true">
        <Icon size={22} />
      </span>
      <span className="home-hub-card-copy">
        <strong>{item.title}</strong>
        {item.subtitle && <small>{item.subtitle}</small>}
        {item.description && <em>{item.description}</em>}
      </span>
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  );
}

function NavigationSection({ eyebrow, title, text, items, kind, emptyTitle, emptyText }) {
  return (
    <section className="home-hub-section" aria-labelledby={`home-hub-${kind}`}>
      <div className="home-hub-section-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 id={`home-hub-${kind}`}>{title}</h2>
          {text && <p>{text}</p>}
        </div>
      </div>
      {items.length ? (
        <div className={`home-hub-grid home-hub-grid-${kind}`}>
          {items.map((item) => (
            <HubCard key={item.id} item={item} kind={kind} />
          ))}
        </div>
      ) : (
        <div className="home-hub-empty">
          <Empty icon={Sparkles} title={emptyTitle} text={emptyText} />
        </div>
      )}
    </section>
  );
}

function businessDetail(business, businessCatalog) {
  const category = businessCatalog.find(
    (item) => item.id === business?.industryCategoryId,
  );
  return (
    business?.industryActivity ||
    business?.segment ||
    business?.businessTypeLabel ||
    category?.label ||
    "Segmento não informado"
  );
}

export default function HomeHub({
  db,
  update,
  business,
  go,
  setToast,
  visibleNav = [],
  navGroups = [],
  aiTools = {},
  businessCatalog = [],
}) {
  const [query, setQuery] = useState("");
  const [visits] = useState(() => {
    if (typeof window === "undefined") return {};
    return readVisits(window.localStorage);
  });
  const navById = useMemo(
    () => new Map(visibleNav.map(([id, label, icon]) => [id, { id, label, icon }])),
    [visibleNav],
  );

  const businessCards = useMemo(
    () =>
      (db.businesses || []).map((item) => {
        const selected = business?.id === item.id;
        const detail = businessDetail(item, businessCatalog);
        return {
          id: `business-${item.id}`,
          title: item.name,
          subtitle: detail,
          description: selected ? "Selecionado na home" : "Abrir central do negócio",
          icon: Building2,
          search: `${item.name} ${detail} ${item.goal || ""} ${item.focusAreas || ""}`,
          onClick: () => {
            update((current) => ({
              ...current,
              selectedBusinessId: item.id,
            }));
            setToast?.(`${item.name} selecionado`);
            go("perfil-negocio");
          },
        };
      }),
    [business?.id, businessCatalog, db.businesses, go, setToast, update],
  );

  const areaCards = useMemo(
    () =>
      navGroups
        .filter((group) => group.label)
        .map((group) => {
          const items = (group.items || []).map((id) => navById.get(id)).filter(Boolean);
          if (!items.length) return null;
          const first = items[0];
          return {
            id: `area-${group.label}`,
            title: compactGroupLabel(group.label),
            subtitle: `${items.length} funções disponíveis`,
            description: items
              .slice(0, 3)
              .map((item) => item.label)
              .join(", "),
            icon: first.icon || Workflow,
            search: `${group.label} ${items.map((item) => item.label).join(" ")}`,
            onClick: () => go(first.id),
          };
        })
        .filter(Boolean),
    [go, navById, navGroups],
  );

  const routeTaskCards = useMemo(() => {
    const groupByRoute = new Map();
    navGroups.forEach((group) => {
      (group.items || []).forEach((id) => {
        if (group.label) groupByRoute.set(id, compactGroupLabel(group.label));
      });
    });
    return visibleNav
      .filter(([id]) => id !== "inicio")
      .map(([id, label, icon]) => ({
        id: `route-${id}`,
        title: label,
        subtitle: groupByRoute.get(id) || "Navegação principal",
        description: "Abrir módulo",
        icon: icon || Compass,
        search: `${label} ${groupByRoute.get(id) || ""}`,
        onClick: () => go(id),
      }));
  }, [go, navGroups, visibleNav]);

  const aiToolCards = useMemo(
    () =>
      Object.entries(aiTools).map(([id, tool]) => ({
        id: `tool-${id}`,
        title: tool.title,
        subtitle: tool.cta || "Ferramenta de IA",
        description: tool.hint,
        icon: tool.icon || Bot,
        search: `${tool.title} ${tool.cta || ""} ${tool.hint || ""} ${tool.specialist || ""}`,
        onClick: () => {
          setToast?.(`Abra "${tool.title}" em Ferramentas.`);
          go("ferramentas");
        },
      })),
    [aiTools, go, setToast],
  );

  const taskCards = useMemo(
    () => [...routeTaskCards, ...aiToolCards],
    [aiToolCards, routeTaskCards],
  );

  const popularCards = useMemo(() => {
    if (!Object.keys(visits || {}).length) return [];
    return [...visibleNav]
      .filter(([id]) => id !== "inicio" && Number(visits[id]) > 0)
      .sort(([a], [b]) => Number(visits[b]) - Number(visits[a]))
      .slice(0, 4)
      .map(([id, label, icon]) => ({
        id: `popular-${id}`,
        title: label,
        subtitle: `${Number(visits[id])} visitas neste dispositivo`,
        icon: icon || Star,
        search: label,
        onClick: () => go(id),
      }));
  }, [go, visibleNav, visits]);

  const filteredBusinesses = businessCards.filter((item) => matchesQuery(item, query));
  const filteredAreas = areaCards.filter((item) => matchesQuery(item, query));
  const filteredTasks = taskCards.filter((item) => matchesQuery(item, query));
  const visibleTasks = query ? filteredTasks : filteredTasks.slice(0, HOME_TASK_LIMIT);
  const showNoSearchResults =
    query && !filteredBusinesses.length && !filteredAreas.length && !filteredTasks.length;

  return (
    <div className="home-hub">
      <section className="home-hub-hero" aria-labelledby="home-hub-title">
        <div className="home-hub-hero-copy">
          <span className="home-hub-kicker">
            <Bot size={16} aria-hidden="true" /> Seu Funcionário
          </span>
          <h1 id="home-hub-title">Escolha como quer começar</h1>
          <p>
            Encontre o caminho pelo seu negócio, pela área que precisa resolver
            ou pela tarefa que você já quer executar.
          </p>
          <label className="home-hub-search" htmlFor="home-hub-search-input">
            <Search size={19} aria-hidden="true" />
            <input
              id="home-hub-search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="O que você quer fazer hoje?"
              autoComplete="off"
            />
          </label>
          <div className="home-hub-stats" aria-label="Resumo de navegação da home">
            <span>
              <strong>{businessCards.length}</strong> negócios
            </span>
            <span>
              <strong>{areaCards.length}</strong> áreas
            </span>
            <span>
              <strong>{taskCards.length}</strong> funções
            </span>
          </div>
        </div>
        <div className="home-hub-mascot-panel" aria-label="Assistente visual do Seu Funcionário">
          <span className="home-hub-orbit" aria-hidden="true" />
          <img src="/mascot-robot.png" alt="Robô assistente do Seu Funcionário" />
        </div>
      </section>

      {showNoSearchResults ? (
        <div className="home-hub-empty">
          <Empty
            icon={Search}
            title="Nada encontrado"
            text="Tente buscar pelo nome de um módulo, área, negócio ou ferramenta que já existe no app."
          />
        </div>
      ) : (
        <>
          {!query && popularCards.length > 0 && (
            <NavigationSection
              eyebrow="RECENTES"
              title="Mais usados neste dispositivo"
              text="Atalhos baseados no que já foi aberto por aqui."
              items={popularCards}
              kind="popular"
              emptyTitle="Nenhum acesso recente"
              emptyText="Quando você navegar pelo app, os atalhos mais usados aparecem aqui."
            />
          )}

          <NavigationSection
            eyebrow="NEGÓCIO"
            title="Escolha por negócio"
            text="Comece pelo negócio configurado no workspace."
            items={filteredBusinesses}
            kind="business"
            emptyTitle={query ? "Nenhum negócio encontrado" : "Nenhum negócio configurado ainda"}
            emptyText={
              query
                ? "A busca não encontrou negócios com esse termo."
                : "Configure um negócio para receber caminhos mais específicos na home."
            }
          />

          <NavigationSection
            eyebrow="ÁREA"
            title="Escolha por área"
            text="Use os agrupamentos reais do menu para encontrar o departamento certo."
            items={filteredAreas}
            kind="area"
            emptyTitle={query ? "Nenhuma área encontrada" : "Nenhuma área encontrada"}
            emptyText={
              query
                ? "A busca não encontrou áreas com esse termo."
                : "As áreas aparecem quando existem grupos de navegação disponíveis."
            }
          />

          <NavigationSection
            eyebrow="TAREFA"
            title="Escolha por tarefa"
            text="Abra direto um módulo ou ferramenta real do app."
            items={visibleTasks}
            kind="task"
            emptyTitle={query ? "Nenhuma tarefa disponível" : "Nenhuma tarefa disponível"}
            emptyText={
              query
                ? "A busca não encontrou funções com esse termo."
                : "As funções aparecem quando existem rotas ou ferramentas disponíveis."
            }
          />

          {!query && filteredTasks.length > HOME_TASK_LIMIT && (
            <p className="home-hub-more">
              Use a busca para encontrar mais {filteredTasks.length - HOME_TASK_LIMIT} funções
              disponíveis.
            </p>
          )}
        </>
      )}
    </div>
  );
}
