// O rosto da Semente.
//
// Desenhado como SVG em vez de imagem: acompanha o tamanho sem borrar, muda
// de estado sem trocar de arquivo, e não depende de um asset que pode faltar
// no bundle de produção.
//
// A identidade é a da marca: cabeça branca arredondada, olhos verdes que
// brilham, e a folha brotando no topo — a semente que virou planta.

export default function SementeAvatar({ estado = "calma", tamanho = 30 }) {
  return (
    <span
      className={`semente-avatar semente-avatar--${estado}`}
      style={{ width: tamanho, height: tamanho }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" width="100%" height="100%" role="presentation" focusable="false">
        {/* A folha: dois gomos e a nervura, brotando da antena. */}
        <path
          d="M24 11c0-4.2-3-7.4-7.6-8.2-.6-.1-1 .4-.9 1C16.3 8.2 19.4 11 24 11z"
          className="semente-folha semente-folha--esquerda"
        />
        <path
          d="M24 11c0-4.2 3-7.4 7.6-8.2.6-.1 1 .4.9 1C31.7 8.2 28.6 11 24 11z"
          className="semente-folha semente-folha--direita"
        />
        <path d="M24 15.5V10" className="semente-caule" />

        {/* A cabeça. */}
        <rect x="8" y="15" width="32" height="26" rx="11" className="semente-cabeca" />

        {/* A viseira, onde os olhos acendem. */}
        <rect x="13" y="20.5" width="22" height="14" rx="7" className="semente-viseira" />
        <circle cx="19.5" cy="27.5" r="3.1" className="semente-olho" />
        <circle cx="28.5" cy="27.5" r="3.1" className="semente-olho" />

        {/* As orelhas. */}
        <rect x="4.5" y="24" width="3.5" height="8" rx="1.75" className="semente-orelha" />
        <rect x="40" y="24" width="3.5" height="8" rx="1.75" className="semente-orelha" />
      </svg>
    </span>
  );
}
