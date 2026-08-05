const TENANT_ID = "todogreen";
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const clean = (value, max = 500) => String(value || "").trim().slice(0, max);
const parse = (value, fallback) => { try { return JSON.parse(value || ""); } catch { return fallback; } };
const sha256 = async (value) => { const bytes = new TextEncoder().encode(value); const digest = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join(""); };

async function userFromRequest(request, env) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  return env.DB.prepare(`SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`)
    .bind(await sha256(token), new Date().toISOString()).first();
}

async function accessFor(env, user) {
  const email = String(user.email || "").toLowerCase();
  const admins = String(env.TODOGREEN_ADMIN_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  const manual = await env.DB.prepare(`SELECT role, permissions_json, workspace_owner_id FROM tenant_users WHERE tenant_id = ? AND user_id = ? AND status = 'active'`)
    .bind(TENANT_ID, user.id).first().catch(() => null);
  if (!admins.includes(email) && !email.endsWith("@todogreen.com.br") && !manual) return null;
  const permissions = admins.includes(email) ? ["*"] : parse(manual?.permissions_json, []);
  return { ownerId: manual?.workspace_owner_id || user.id, role: admins.includes(email) ? "admin" : manual?.role || "auditor", permissions };
}
const canWrite = (access) => ["owner", "admin"].includes(access.role) || access.permissions.includes("*") || access.permissions.includes("fleet:manage");
const mapVehicle = (row) => ({
  id: row.id, prefix: row.prefix, plate: row.plate, manufacturer: row.manufacturer, model: row.model, modelYear: row.model_year,
  category: row.category, energyType: row.energy_type, status: row.status, operationalUnit: row.operational_unit, costCenter: row.cost_center,
  payloadKg: row.payload_kg, volumeM3: row.volume_m3, palletCapacity: row.pallet_capacity, odometerKm: row.odometer_km,
  acquisitionValue: row.acquisition_value, monthlyFixedCost: row.monthly_fixed_cost, revenueAccumulated: row.revenue_accumulated,
  costAccumulated: row.cost_accumulated, energyConsumptionKwhPerKm: row.energy_consumption_kwh_per_km,
  emissionFactorKgCo2ePerKwh: row.emission_factor_kgco2e_per_kwh, batteryCapacityKwh: row.battery_capacity_kwh,
  batterySohPercent: row.battery_soh_percent, nominalRangeKm: row.nominal_range_km, realRangeKm: row.real_range_km,
  nextMaintenanceAt: row.next_maintenance_at || "", nextDocumentDueAt: row.next_document_due_at || "",
  fields: parse(row.fields_json, {}), revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at,
});
const num = (value) => Math.max(0, Number(value) || 0);

export async function handleTodoGreenFleet(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/todogreen/fleet")) return null;
  const user = await userFromRequest(request, env);
  if (!user) return json({ error: "Sua sessão expirou. Entre novamente." }, 401);
  const access = await accessFor(env, user);
  if (!access) return json({ error: "Você não tem acesso à Frota da To Do Green." }, 403);
  const parts = url.pathname.split("/").filter(Boolean);
  const vehicleId = parts[3] || "";
  const subresource = parts[4] || "";

  if (request.method === "GET" && !vehicleId) {
    const rows = await env.DB.prepare(`SELECT * FROM todogreen_fleet_vehicles WHERE workspace_owner_id = ? AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 500`)
      .bind(access.ownerId).all();
    const vehicles = (rows.results || []).map(mapVehicle);
    return json({ vehicles, access: { role: access.role, canWrite: canWrite(access) } });
  }

  if (request.method === "GET" && vehicleId && subresource === "maintenance") {
    const rows = await env.DB.prepare(`SELECT * FROM todogreen_fleet_maintenance_orders WHERE workspace_owner_id = ? AND vehicle_id = ? AND archived_at IS NULL ORDER BY created_at DESC LIMIT 200`)
      .bind(access.ownerId, vehicleId).all();
    return json({ orders: rows.results || [] });
  }

  if (!canWrite(access)) return json({ error: "Você não pode alterar a Frota." }, 403);

  if (request.method === "POST" && !vehicleId) {
    const body = await request.json().catch(() => ({}));
    if (!clean(body.prefix, 50)) return json({ error: "Informe o prefixo do veículo." }, 400);
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO todogreen_fleet_vehicles
      (id, tenant_id, workspace_owner_id, prefix, plate, manufacturer, model, model_year, category, energy_type, status,
       operational_unit, cost_center, payload_kg, volume_m3, pallet_capacity, odometer_km, acquisition_value, monthly_fixed_cost,
       revenue_accumulated, cost_accumulated, energy_consumption_kwh_per_km, emission_factor_kgco2e_per_kwh, battery_capacity_kwh,
       battery_soh_percent, nominal_range_km, real_range_km, next_maintenance_at, next_document_due_at, fields_json, revision,
       created_by, updated_by, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, NULL)`)
      .bind(id, TENANT_ID, access.ownerId, clean(body.prefix, 50), clean(body.plate, 20).toUpperCase(), clean(body.manufacturer, 100), clean(body.model, 100), Number(body.modelYear) || null,
        clean(body.category, 80), clean(body.energyType, 40) || "electric", clean(body.status, 40) || "available", clean(body.operationalUnit, 120), clean(body.costCenter, 120),
        num(body.payloadKg), num(body.volumeM3), num(body.palletCapacity), num(body.odometerKm), num(body.acquisitionValue), num(body.monthlyFixedCost), num(body.revenueAccumulated),
        num(body.costAccumulated), num(body.energyConsumptionKwhPerKm), num(body.emissionFactorKgCo2ePerKwh), num(body.batteryCapacityKwh), Math.min(100, num(body.batterySohPercent || 100)),
        num(body.nominalRangeKm), num(body.realRangeKm), clean(body.nextMaintenanceAt, 20) || null, clean(body.nextDocumentDueAt, 20) || null, JSON.stringify(body.fields || {}), user.id, user.id, now, now).run();
    const row = await env.DB.prepare("SELECT * FROM todogreen_fleet_vehicles WHERE id = ?").bind(id).first();
    return json({ vehicle: mapVehicle(row) }, 201);
  }

  if (request.method === "PATCH" && vehicleId && !subresource) {
    const body = await request.json().catch(() => ({}));
    const current = await env.DB.prepare("SELECT * FROM todogreen_fleet_vehicles WHERE id = ? AND workspace_owner_id = ? AND archived_at IS NULL").bind(vehicleId, access.ownerId).first();
    if (!current) return json({ error: "Veículo não encontrado." }, 404);
    if (body.revision && Number(body.revision) !== Number(current.revision)) return json({ error: "Veículo alterado por outra pessoa. Recarregue.", code: "revision_conflict", current: mapVehicle(current) }, 409);
    const before = mapVehicle(current); const next = { ...before, ...body, fields: body.fields || before.fields }; const now = new Date().toISOString();
    await env.DB.prepare(`UPDATE todogreen_fleet_vehicles SET prefix=?, plate=?, manufacturer=?, model=?, model_year=?, category=?, energy_type=?, status=?, operational_unit=?, cost_center=?, payload_kg=?, volume_m3=?, pallet_capacity=?, odometer_km=?, acquisition_value=?, monthly_fixed_cost=?, revenue_accumulated=?, cost_accumulated=?, energy_consumption_kwh_per_km=?, emission_factor_kgco2e_per_kwh=?, battery_capacity_kwh=?, battery_soh_percent=?, nominal_range_km=?, real_range_km=?, next_maintenance_at=?, next_document_due_at=?, fields_json=?, revision=revision+1, updated_by=?, updated_at=? WHERE id=? AND workspace_owner_id=? AND revision=?`)
      .bind(clean(next.prefix,50), clean(next.plate,20).toUpperCase(), clean(next.manufacturer,100), clean(next.model,100), Number(next.modelYear)||null, clean(next.category,80), clean(next.energyType,40), clean(next.status,40), clean(next.operationalUnit,120), clean(next.costCenter,120), num(next.payloadKg), num(next.volumeM3), num(next.palletCapacity), num(next.odometerKm), num(next.acquisitionValue), num(next.monthlyFixedCost), num(next.revenueAccumulated), num(next.costAccumulated), num(next.energyConsumptionKwhPerKm), num(next.emissionFactorKgCo2ePerKwh), num(next.batteryCapacityKwh), Math.min(100,num(next.batterySohPercent)), num(next.nominalRangeKm), num(next.realRangeKm), clean(next.nextMaintenanceAt,20)||null, clean(next.nextDocumentDueAt,20)||null, JSON.stringify(next.fields||{}), user.id, now, vehicleId, access.ownerId, current.revision).run();
    const row = await env.DB.prepare("SELECT * FROM todogreen_fleet_vehicles WHERE id = ?").bind(vehicleId).first();
    return json({ vehicle: mapVehicle(row) });
  }

  if (request.method === "POST" && vehicleId && subresource === "maintenance") {
    const body = await request.json().catch(() => ({}));
    if (!clean(body.title, 200)) return json({ error: "Informe o título da manutenção." }, 400);
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO todogreen_fleet_maintenance_orders (id, workspace_owner_id, vehicle_id, maintenance_type, status, title, description, supplier, scheduled_at, downtime_hours, parts_cost, labor_cost, other_cost, fields_json, revision, created_by, updated_by, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, 0, 0, 0, 0, '{}', 1, ?, ?, ?, ?, NULL)`)
      .bind(id, access.ownerId, vehicleId, clean(body.maintenanceType,60)||"preventive", clean(body.title,200), clean(body.description,2000), clean(body.supplier,160), clean(body.scheduledAt,30)||null, user.id, user.id, now, now).run();
    return json({ ok: true, id }, 201);
  }

  if (request.method === "DELETE" && vehicleId) {
    const now = new Date().toISOString();
    await env.DB.prepare("UPDATE todogreen_fleet_vehicles SET archived_at=?, updated_at=?, updated_by=?, revision=revision+1 WHERE id=? AND workspace_owner_id=?").bind(now, now, user.id, vehicleId, access.ownerId).run();
    return json({ ok: true });
  }
  return json({ error: "Método não permitido." }, 405);
}
