import { useMemo } from "react";
import { ArrowDown, ArrowUp, Lock, RotateCcw, Search } from "lucide-react";
import {
  MAX_MENU,
  buildNavigation,
  canRemove,
  isPinned,
  moveMenuItem,
  normalizeMenu,
  readVisits,
  resetMenu,
  suggestForMenu,
  toggleMenuItem,
  unusedInMenu,
} from "./menuDomain.js";

export default function MenuSettings({
  db,
  update,
  nav = [],
  groups = [],
  setToast,
  go,
}) {
  const ids = useMemo(() => nav.map((n) => n[0]), [nav]);
  const menu = useMemo(
    () => normalizeMenu(db.preferences?.mainMenu, ids),
    [db.preferences?.mainMenu, ids],
  );
  const porId = useMemo(() => new Map(nav.map((n) => [n[0], n])), [nav]);
  const visitas = useMemo(
    () => readVisits(typeof window !== "undefined" ? window.localStorage : null),
    [],
  );

  const salvar = (proximo) =>
    update({
      ...db,
      preferences: { ...db.preferences, mainMenu: proximo },
    });

  const alternar = (id) => salvar(toggleMenuItem(menu, id, ids));
  const mover = (id, dir) => salvar(moveMenuItem(menu, id, dir, ids));

  const restaurar = () => {
    salvar(resetMenu(ids));
    setToast?.("Menu voltou ao padrão.");
  };

  const sugestoes = useMemo(
    () => suggestForMenu(visitas, menu, ids),
    [visitas, menu, ids],
  );
  const semUso = useMemo(() => unusedInMenu(visitas, menu), [visitas, menu]);
  const { rest } = useMemo(
    () => buildNavigation(nav, menu, groups),
    [nav, menu, groups],
  );

  const nomeDe = (id) => porId.get(id)?.[1] || id;

  return (
    <section className="section ms">
      <header className="section-head">
        <div>
          <h2>Personalizar menu</h2>
          <p className="muted">
            Escolha o que fica no menu principal. O que ficar de fora{" "}
            <strong>continua disponível</strong> em “Todas as ferramentas”, no
            fim do menu, e pela busca.
          </p>
        </div>
        <button type="button" className="btn" onClick={restaurar}>
          <RotateCcw size={15} /> Voltar ao padrão
        </button>
      </header>

      <section className="ms-bloco">
        <h3>
          Meu menu ({menu.length} de {MAX_MENU})
        </h3>
        <ul className="ms-escolhidos">
          {menu.map((id, i) => {
            const item = porId.get(id);
            if (!item) return null;
            const Icone = item[2];
            return (
              <li key={id}>
                {Icone ? <Icone size={16} /> : null}
                <span className="ms-nome">{item[1]}</span>
                {isPinned(id) ? (
                  <span className="ms-fixo" title="Sempre no menu">
                    <Lock size={13} /> fixo
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Subir ${item[1]}`}
                      disabled={i === 0}
                      onClick={() => mover(id, "up")}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Descer ${item[1]}`}
                      disabled={i === menu.length - 1}
                      onClick={() => mover(id, "down")}
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn tiny"
                      disabled={!canRemove(menu, id)}
                      onClick={() => alternar(id)}
                    >
                      Tirar
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {sugestoes.length > 0 && (
        <section className="ms-bloco">
          <h3>Você usa bastante e não está no menu</h3>
          <p className="muted">
            Baseado no que você abriu de verdade. Nada entra sozinho — você
            decide.
          </p>
          <ul className="ms-sugestoes">
            {sugestoes.map((s) => (
              <li key={s.id}>
                <span>{nomeDe(s.id)}</span>
                <span className="muted">{s.visits}x</span>
                <button
                  type="button"
                  className="btn tiny"
                  onClick={() => alternar(s.id)}
                >
                  Colocar no menu
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {semUso.length > 0 && (
        <section className="ms-bloco">
          <h3>Está no menu e você nunca abriu</h3>
          <p className="muted">
            Só um aviso. Tirar daqui não apaga nada nem bloqueia o acesso.
          </p>
          <ul className="ms-sugestoes">
            {semUso.map((id) => (
              <li key={id}>
                <span>{nomeDe(id)}</span>
                <button
                  type="button"
                  className="btn tiny"
                  disabled={!canRemove(menu, id)}
                  onClick={() => alternar(id)}
                >
                  Tirar do menu
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="ms-bloco">
        <h3>Tudo o que existe</h3>
        <p className="muted">
          <Search size={14} /> Estas ferramentas continuam funcionando mesmo
          fora do menu. Marque as que quiser à mão.
        </p>
        {rest.map((group, gi) => (
          <div className="ms-grupo" key={group.label || `g${gi}`}>
            {group.label && <h4>{group.label}</h4>}
            <ul className="ms-todos">
              {group.items.map(([id, label, Icone]) => (
                <li key={id}>
                  <button type="button" onClick={() => alternar(id)}>
                    {Icone ? <Icone size={15} /> : null}
                    <span>{label}</span>
                    <span className="ms-add">+ menu</span>
                  </button>
                  <button
                    type="button"
                    className="ms-abrir"
                    onClick={() => go?.(id)}
                  >
                    abrir
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!rest.length && (
          <p className="muted">Tudo o que existe já está no seu menu.</p>
        )}
      </section>
    </section>
  );
}
