import { ExternalLink, Mail, MessageCircle, Phone } from "lucide-react";
import { POSICOES, PODERES, montarMapa } from "./relationshipMapDomain.js";
import { whatsappUrl } from "./accountIntelligenceDomain.js";
import "./RelationshipMap.css";

// O mapa de relacionamento da conta.
//
// Três eixos que já estavam no cadastro e nenhuma tela lia: influência,
// apoio e nível de acesso. Aqui eles viram leitura visual — linha é área,
// ordem é poder, cor é posição — porque em venda enterprise a pergunta que
// decide a conta é "estou falando com quem decide, e essa pessoa está do meu
// lado?", e ela não se responde numa lista alfabética de contatos.

// Força do relacionamento em três degraus. Não é nota: é o estado da conta em
// canal, decisor e aliado — as três conquistas que precedem qualquer venda.
function Forca({ nivel, total, leitura }) {
  return (
    <div className="tdg-map-forca">
      <span className="tdg-map-degraus" role="img" aria-label={`Força do relacionamento: ${nivel} de ${total}`}>
        {Array.from({ length: total }, (_, indice) => (
          <i key={indice} className={indice < nivel ? "cheio" : "vazio"} />
        ))}
      </span>
      <small>{leitura}</small>
    </div>
  );
}

function Contato({ contato }) {
  const posicao = POSICOES[contato.posicao];
  return (
    <article className={`tdg-map-no tdg-map-no--${contato.posicao}`}>
      <header>
        <strong>{contato.nome}</strong>
        <span className="tdg-map-poder">{PODERES[contato.poder].rotulo}</span>
      </header>
      <small>{contato.cargo || contato.papel || "Cargo não informado"}</small>
      <div className="tdg-map-rodape">
        <span className="tdg-map-posicao" title={posicao.rotulo}>
          {posicao.sinal} {posicao.rotulo}
        </span>
        <span className="tdg-map-canais">
          {contato.canais.telefone && (
            <a href={whatsappUrl(contato.canais.telefone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${contato.nome}`}>
              <MessageCircle size={13} />
            </a>
          )}
          {contato.canais.telefone && (
            <a href={`tel:${contato.canais.telefone}`} aria-label={`Telefone de ${contato.nome}`}><Phone size={13} /></a>
          )}
          {contato.canais.email && (
            <a href={`mailto:${contato.canais.email}`} aria-label={`E-mail de ${contato.nome}`}><Mail size={13} /></a>
          )}
          {contato.canais.linkedin && (
            <a href={contato.canais.linkedin} target="_blank" rel="noreferrer" aria-label={`LinkedIn de ${contato.nome}`}>
              <ExternalLink size={13} />
            </a>
          )}
        </span>
      </div>
    </article>
  );
}

export default function RelationshipMap({ contatos = [], conta = "" }) {
  const mapa = montarMapa(contatos);

  return (
    <section className="tdg-panel tdg-map" aria-label={`Mapa de relacionamento${conta ? ` — ${conta}` : ""}`}>
      <header className="tdg-map-topo">
        {/* O nome da conta não se repete aqui: ele já está no topo da página,
            e dois títulos iguais confundem quem navega por leitor de tela. */}
        <div>
          <span className="tdg-kicker">MAPA DE RELACIONAMENTO</span>
          <h3>Quem decide, quem apoia, quem atravessa</h3>
        </div>
        <Forca {...mapa.forca} />
      </header>

      {mapa.total === 0 ? (
        <p className="tdg-map-vazio">
          Nenhum contato mapeado nesta conta. Comece pelo decisor econômico e por quem lidera Compras —
          sem essas duas pessoas, a proposta não tem para quem ir.
        </p>
      ) : (
        <>
          <div className="tdg-map-legenda" aria-label="Legenda das posições">
            {Object.entries(POSICOES).map(([chave, item]) => (
              <span key={chave}>
                {item.sinal} {item.rotulo}
                <b>{mapa.porPosicao[chave] || 0}</b>
              </span>
            ))}
          </div>

          <div className="tdg-map-areas">
            {mapa.areas.map((area) => (
              <div className="tdg-map-area" key={area.area}>
                <h4>{area.area}<small>{area.contatos.length}</small></h4>
                <div className="tdg-map-linha">
                  {area.contatos.map((contato) => <Contato contato={contato} key={contato.id} />)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* O buraco do mapa é a informação mais acionável dele: mostra onde a
          venda trava antes de travar. */}
      {mapa.lacunas.length > 0 && (
        <div className="tdg-map-lacunas">
          <strong>O que falta mapear</strong>
          {mapa.lacunas.map((lacuna) => <span key={lacuna}>{lacuna}</span>)}
        </div>
      )}
    </section>
  );
}
