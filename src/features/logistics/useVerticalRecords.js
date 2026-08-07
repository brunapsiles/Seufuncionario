import { useCallback, useEffect, useState } from "react";

// ===== A vertical lendo de um lugar só =====
//
// A tela montava os próprios dados a partir do `db` — o JSON do espaço de
// trabalho — enquanto clientes, ESG, Tracker e portal já vinham da API. Duas
// fontes para a mesma vertical significavam painel somando coisas diferentes e
// portal do cliente cego para o que foi escrito por dentro.
//
// Este gancho é a fonte única. Ele carrega tudo numa chamada e devolve as
// operações de escrita já com o recarregamento embutido: quem chama não
// precisa lembrar de sincronizar, e é justamente esse "lembrar" que produzia
// tela desatualizada.

const VAZIO = Object.freeze({
  opportunities: [],
  proposals: [],
  operations: [],
  financial: [],
  scenarios: [],
});

const pedir = async (caminho, authHeaders, opcoes = {}) => {
  const resposta = await fetch(`/api/todogreen/records${caminho}`, {
    method: opcoes.method || "GET",
    headers: {
      ...(opcoes.body ? { "content-type": "application/json" } : {}),
      ...(authHeaders?.() || {}),
    },
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const erro = new Error(corpo.error || "Não foi possível falar com o servidor.");
    erro.status = resposta.status;
    throw erro;
  }
  return corpo;
};

export function useVerticalRecords(authHeaders, { ativo = true } = {}) {
  const [dados, setDados] = useState(VAZIO);
  const [carregando, setCarregando] = useState(ativo);
  const [erro, setErro] = useState("");

  const recarregar = useCallback(async () => {
    if (!ativo) return;
    setCarregando(true);
    try {
      const corpo = await pedir("", authHeaders);
      setDados({ ...VAZIO, ...corpo });
      setErro("");
    } catch (razao) {
      // Lista vazia com o motivo à vista, e nunca dado velho fingindo ser
      // atual: um painel que continua mostrando o número de antes durante uma
      // falha é pior do que um painel que admite não saber.
      setDados(VAZIO);
      setErro(razao.message);
    } finally {
      setCarregando(false);
    }
  }, [ativo, authHeaders]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const criar = useCallback(
    async (colecao, corpo) => {
      const resposta = await pedir(`/${colecao}`, authHeaders, { method: "POST", body: corpo });
      await recarregar();
      return resposta.registro;
    },
    [authHeaders, recarregar],
  );

  const atualizar = useCallback(
    async (colecao, id, corpo) => {
      const resposta = await pedir(`/${colecao}/${encodeURIComponent(id)}`, authHeaders, {
        method: "PATCH",
        body: corpo,
      });
      await recarregar();
      return resposta.registro;
    },
    [authHeaders, recarregar],
  );

  const arquivar = useCallback(
    async (colecao, id) => {
      await pedir(`/${colecao}/${encodeURIComponent(id)}`, authHeaders, { method: "DELETE" });
      await recarregar();
    },
    [authHeaders, recarregar],
  );

  return { dados, carregando, erro, recarregar, criar, atualizar, arquivar };
}

export const REGISTROS_VAZIOS = VAZIO;
