export function createQuoteHandlers({ json, allowed, randomHex, escMail, moneyBRL }) {
  function renderPublicQuote(token, snap, status) {
    const esc = escMail;
    const items = Array.isArray(snap.items) ? snap.items : [];
    const rows = items
      .map(
        (i) =>
          `<tr><td>${esc(i.name)}</td><td class="c">${Number(i.quantity) || 0}</td><td class="r">${moneyBRL((Number(i.price) || 0) * (Number(i.quantity) || 0))}</td></tr>`,
      )
      .join("");
    const decided = status === "aprovado" || status === "recusado";
    const banner =
      status === "aprovado"
        ? '<div class="banner ok">✓ Você aprovou este orçamento. Obrigado! O responsável foi avisado.</div>'
        : status === "recusado"
          ? '<div class="banner bad">Você recusou este orçamento.</div>'
          : "";
    const actions = decided
      ? ""
      : `<div class="actions"><form method="post" action="/api/public-quotes/${esc(token)}/decision"><input type="hidden" name="decision" value="recusado"><button class="btn ghost" type="submit">Recusar</button></form><form method="post" action="/api/public-quotes/${esc(token)}/decision"><input type="hidden" name="decision" value="aprovado"><button class="btn" type="submit">Aprovar orçamento</button></form></div>`;
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Orçamento — ${esc(snap.businessName || "Seu Funcionário")}</title><style>*{box-sizing:border-box}body{margin:0;background:#f4f2fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#211846;padding:5vh 16px}.card{max-width:560px;margin:0 auto;background:#fff;border:1px solid #e6e2f2;border-radius:20px;padding:28px;box-shadow:0 20px 50px rgba(60,40,120,.08)}.biz{font-size:.78rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#0b9f8f}h1{margin:6px 0 2px;font-size:1.5rem}.to{margin:0 0 18px;color:#665f75}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{padding:9px 6px;border-bottom:1px solid #eee;font-size:.94rem;text-align:left}th{font-size:.72rem;text-transform:uppercase;letter-spacing:.03em;color:#8a83a0}.c{text-align:center}.r{text-align:right;white-space:nowrap}.total{display:flex;justify-content:space-between;align-items:center;margin:14px 0;padding-top:12px;border-top:2px solid #211846;font-size:1.05rem}.total strong{font-size:1.4rem}.valid,.notes{color:#665f75;font-size:.9rem;margin:6px 0}.actions{display:flex;gap:10px;margin-top:22px}.actions form{flex:1}.btn{width:100%;padding:13px;border:0;border-radius:12px;background:linear-gradient(135deg,#0b9f8f,#16b8a6);color:#fff;font-size:1rem;font-weight:700;cursor:pointer}.btn.ghost{background:#f0edf9;color:#0b9f8f}.banner{padding:12px 14px;border-radius:12px;margin:6px 0 14px;font-weight:600}.banner.ok{background:#e7f7ec;color:#16a34a}.banner.bad{background:#fdeaea;color:#dc2626}.foot{margin-top:22px;text-align:center;color:#a49dbb;font-size:.78rem}</style></head><body><main class="card"><div class="biz">${esc(snap.businessName || "")}</div><h1>Orçamento</h1><p class="to">Para <strong>${esc(snap.clientName || "cliente")}</strong></p>${banner}<table><thead><tr><th>Item</th><th class="c">Qtd</th><th class="r">Valor</th></tr></thead><tbody>${rows}</tbody></table><div class="total"><span>Total</span><strong>${moneyBRL(Number(snap.total) || 0)}</strong></div>${snap.validUntil ? `<p class="valid">Válido até ${esc(snap.validUntil)}</p>` : ""}${snap.notes ? `<p class="notes">${esc(snap.notes)}</p>` : ""}${actions}<p class="foot">Enviado via Seu Funcionário</p></main></body></html>`;
  }

  async function handlePublicQuote(request, env, url) {
    if (!env.DB) return json({ error: "Indisponível." }, 503);
    const decisionMatch = url.pathname.match(
      /^\/api\/public-quotes\/([a-f0-9]{16,})\/decision\/?$/i,
    );
    if (decisionMatch) {
      if (request.method !== "POST")
        return json({ error: "Método não permitido." }, 405);
      const ip = request.headers.get("cf-connecting-ip") || "public";
      if (!allowed(`quote-decision:${ip}`, 10))
        return json({ error: "Muitas tentativas. Aguarde." }, 429);
      const token = decisionMatch[1];
      const ct = request.headers.get("content-type") || "";
      const isJson = ct.includes("application/json");
      let decision = "";
      if (isJson) {
        try {
          decision = (await request.json()).decision;
        } catch {}
      } else {
        try {
          decision = (await request.formData()).get("decision");
        } catch {}
      }
      decision =
        decision === "aprovado"
          ? "aprovado"
          : decision === "recusado"
            ? "recusado"
            : "";
      const backToPage = () =>
        new Response(null, {
          status: 303,
          headers: { location: `/orcamento/${token}` },
        });
      if (!decision)
        return isJson ? json({ error: "Decisão inválida." }, 400) : backToPage();
      const row = await env.DB.prepare(
        "SELECT status FROM public_quotes WHERE token = ?",
      )
        .bind(token)
        .first();
      if (!row)
        return isJson
          ? json({ error: "Orçamento não encontrado." }, 404)
          : backToPage();
      if (row.status === "pendente") {
        await env.DB.prepare(
          "UPDATE public_quotes SET status = ?, decided_at = ? WHERE token = ? AND status = 'pendente'",
        )
          .bind(decision, new Date().toISOString(), token)
          .run();
      }
      return isJson
        ? json({
            ok: true,
            status: row.status === "pendente" ? decision : row.status,
          })
        : backToPage();
    }
    const viewMatch = url.pathname.match(/^\/orcamento\/([a-f0-9]{16,})\/?$/i);
    if (!viewMatch) return null;
    if (request.method !== "GET")
      return json({ error: "Método não permitido." }, 405);
    const notFound = () =>
      new Response(
        '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Orçamento indisponível</title><body style="font-family:Arial,sans-serif;max-width:600px;margin:12vh auto;padding:24px;color:#211846"><h1>Orçamento não encontrado</h1><p>O link pode estar incorreto ou o orçamento foi removido.</p></body></html>',
        {
          status: 404,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          },
        },
      );
    const row = await env.DB.prepare(
      "SELECT snapshot_json, status FROM public_quotes WHERE token = ?",
    )
      .bind(viewMatch[1])
      .first();
    if (!row) return notFound();
    let snap = {};
    try {
      snap = JSON.parse(row.snapshot_json) || {};
    } catch {}
    return new Response(renderPublicQuote(viewMatch[1], snap, row.status), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }

  async function handleQuotes(request, env, user, url) {
    const action = url.pathname.replace("/api/quotes", "").replace(/^\//, "");
    if (action === "share" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Dados inválidos." }, 400);
      }
      const q = body.quote;
      if (!q || typeof q !== "object" || !q.id)
        return json({ error: "Orçamento inválido." }, 400);
      const snapshot = {
        clientName: String(q.clientName || "").slice(0, 160),
        items: (Array.isArray(q.items) ? q.items : []).slice(0, 100).map((i) => ({
          name: String(i.name || "").slice(0, 200),
          quantity: Number(i.quantity) || 0,
          price: Number(i.price) || 0,
        })),
        total: Number(q.total) || 0,
        validUntil: String(q.validUntil || "").slice(0, 20),
        notes: String(q.notes || "").slice(0, 1000),
        businessName: String(body.businessName || "").slice(0, 120),
      };
      const existing = await env.DB.prepare(
        "SELECT token FROM public_quotes WHERE owner_id = ? AND quote_id = ?",
      )
        .bind(user.id, q.id)
        .first();
      const token = existing?.token || randomHex(16);
      if (existing) {
        await env.DB.prepare(
          "UPDATE public_quotes SET snapshot_json = ? WHERE token = ?",
        )
          .bind(JSON.stringify(snapshot), token)
          .run();
      } else {
        await env.DB.prepare(
          "INSERT INTO public_quotes (token, owner_id, quote_id, snapshot_json, status, created_at) VALUES (?, ?, ?, ?, 'pendente', ?)",
        )
          .bind(
            token,
            user.id,
            q.id,
            JSON.stringify(snapshot),
            new Date().toISOString(),
          )
          .run();
      }
      return json({ ok: true, token, url: `${url.origin}/orcamento/${token}` });
    }
    if (action === "status" && request.method === "GET") {
      const rows = await env.DB.prepare(
        "SELECT quote_id AS quoteId, token, status, decided_at AS decidedAt FROM public_quotes WHERE owner_id = ?",
      )
        .bind(user.id)
        .all();
      return json({ items: rows.results || [] });
    }
    return json({ error: "Ação inválida." }, 404);
  }

  return { handlePublicQuote, handleQuotes };
}
