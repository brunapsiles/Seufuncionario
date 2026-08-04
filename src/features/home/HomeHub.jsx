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

const HOME_MODES = [
  ["funcoes", "Funções", Compass],
  ["areas", "Áreas", Workflow],
  ["especialistas", "Especialistas", Bot],
  ["negocios", "Meus negócios", Building2],
];

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
        {item.meta?.length > 0 && (
          <span className="home-hub-card-meta">
            {item.meta.map((meta) => (
              <span key={meta}>{meta}</span>
            ))}
          </span>
        )}
      </span>
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  );
}

function NavigationSection({
  eyebrow,
  title,
  text,
  items,
  kind,
  emptyTitle,
  emptyText,
}) {
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

function overdueTasksForBusiness(tasks, businessId, today) {
  return (tasks || []).filter((task) => {
    if (!task?.due || task.businessId !== businessId) return false;
    const status = normalize(task.status);
    return !status.includes("concluido") && !status.includes("arquivad") && task.due < today;
  }).length;
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
  specialists = [],
  businessCatalog = [],
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("funcoes");
  const [visits] = useState(() => {
    if (typeof window === "undefined") return {};
    return readVisits(window.localStorage);
  });
  const todayYmd = useMemo(() => new Date().toISOString().slice(0, 10), []);
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
          description: selected ? "Selecionado agora" : null,
          meta: [
            `${overdueTasksForBusiness(db.tasks, item.id, todayYmd)} atrasadas`,
            item.id === business?.id ? "negócio ativo" : "abrir contexto",
          ],
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
    [
      business?.id,
      businessCatalog,
      db.businesses,
      db.tasks,
      go,
      setToast,
      todayYmd,
      update,
    ],
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
        description: null,
        meta: ["módulo"],
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
        description: null,
        meta: [tool.specialist ? `especialista: ${tool.specialist}` : "IA"],
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

  const specialistCards = useMemo(() => {
    const standard = (specialists || []).map(([name, icon, description]) => ({
      id: `specialist-${name}`,
      title: name,
      subtitle: "Especialista do time",
      description,
      icon: icon || Bot,
      search: `${name} ${description || ""}`,
      onClick: () => {
        update((current) => ({
          ...current,
          preferences: {
            ...(current.preferences || {}),
            specialist: name,
          },
        }));
        setToast?.(`${name} no comando`);
        go("agentes");
      },
    }));
    const custom = (db.customSpecialists || []).map((item) => ({
      id: `custom-specialist-${item.name}`,
      title: item.name,
      subtitle: "Funcionário sob medida",
      description: item.instructions,
      icon: Sparkles,
      search: `${item.name} ${item.instructions || ""}`,
      onClick: () => {
        update((current) => ({
          ...current,
          preferences: {
            ...(current.preferences || {}),
            specialist: item.name,
          },
        }));
        setToast?.(`${item.name} no comando`);
        go("agentes");
      },
    }));
    return [...custom, ...standard];
  }, [db.customSpecialists, go, setToast, specialists, update]);

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
  const filteredSpecialists = specialistCards.filter((item) =>
    matchesQuery(item, query),
  );
  const activeItems = {
    funcoes: filteredTasks,
    areas: filteredAreas,
    especialistas: filteredSpecialists,
    negocios: filteredBusinesses,
  }[mode];
  const activeCopy = {
    funcoes: {
      eyebrow: "CATÁLOGO",
      title: "Todas as funções disponíveis",
      text: "O menu inicial mostra tudo que a pessoa pode abrir agora, sem depender do menu lateral.",
      emptyTitle: query ? "Nenhuma função encontrada" : "Nenhuma função disponível",
      emptyText: query
        ? "A busca não encontrou funções com esse termo."
        : "As funções aparecem quando existem rotas ou ferramentas disponíveis.",
    },
    areas: {
      eyebrow: "ÁREAS",
      title: "Escolha pela área que precisa resolver",
      text: "Agrupamentos reais do menu, levando para a primeira função segura daquela área.",
      emptyTitle: query ? "Nenhuma área encontrada" : "Nenhuma área encontrada",
      emptyText: query
        ? "A busca não encontrou áreas com esse termo."
        : "As áreas aparecem quando existem grupos de navegação disponíveis.",
    },
    especialistas: {
      eyebrow: "ESPECIALISTAS",
      title: "Escolha o especialista que assume a conversa",
      text: "Equipe padrão e funcionários sob medida que já existem no app.",
      emptyTitle: query
        ? "Nenhum especialista encontrado"
        : "Nenhum especialista disponível",
      emptyText: query
        ? "A busca não encontrou especialistas com esse termo."
        : "Os especialistas aparecem quando existem no time configurado.",
    },
    negocios: {
      eyebrow: "NEGÓCIOS",
      title: "Abra o contexto do negócio",
      text: "Selecione o negócio real para acessar tarefas atrasadas, registros, inbox e operação daquele contexto.",
      emptyTitle: query ? "Nenhum negócio encontrado" : "Nenhum negócio configurado ainda",
      emptyText: query
        ? "A busca não encontrou negócios com esse termo."
        : "Configure um negócio para receber caminhos mais específicos na home.",
    },
  }[mode];
  const counts = {
    funcoes: filteredTasks.length,
    areas: filteredAreas.length,
    especialistas: filteredSpecialists.length,
    negocios: filteredBusinesses.length,
  };

  return (
    <div className="home-hub">
      <section className="home-hub-hero" aria-labelledby="home-hub-title">
        <div className="home-hub-hero-copy">
          <span className="home-hub-kicker">
            {/* O selo da marca usa o mascote, não um robô genérico de biblioteca:
                é a mesma figura do topo e do "pensando". */}
            <img
              className="home-hub-selo-mascote"
              src="/mascote-48.png"
              alt=""
              width="20"
              height="20"
            />{" "}
            Seu Funcionário
          </span>
          <h1 id="home-hub-title">O que você quer resolver agora?</h1>
          <p>
            Escolha uma função, uma área ou o especialista certo. O hub agora
            mostra o catálogo completo do Seu Funcionário logo na entrada.
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
              <strong>{taskCards.length}</strong> funções
            </span>
            <span>
              <strong>{areaCards.length}</strong> áreas
            </span>
            <span>
              <strong>{specialistCards.length}</strong> especialistas
            </span>
            <span>
              <strong>{businessCards.length}</strong> negócios
            </span>
          </div>
        </div>
      </section>

      <div className="home-hub-switcher" aria-label="Escolher tipo de entrada">
        {HOME_MODES.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={mode === id ? "active" : ""}
            onClick={() => setMode(id)}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
            <strong>{counts[id]}</strong>
          </button>
        ))}
      </div>

      {!query && popularCards.length > 0 && mode === "funcoes" && (
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
        eyebrow={activeCopy.eyebrow}
        title={activeCopy.title}
        text={activeCopy.text}
        items={activeItems}
        kind={mode}
        emptyTitle={activeCopy.emptyTitle}
        emptyText={activeCopy.emptyText}
      />

      {query && !activeItems.length && (
        <p className="home-hub-more">
          Dica: troque entre funções, áreas, especialistas e negócios para buscar
          em outro conjunto real do app.
        </p>
      )}
    </div>
  );
}
