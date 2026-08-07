import { Suspense, lazy } from "react";

const LogisticsVertical = lazy(() => import("../features/logistics/LogisticsVertical.jsx"));
const CustomerPortal = lazy(() => import("../features/logistics/CustomerPortal.jsx"));

export function resolvePrimaryRoute(pathname, authenticated) {
  const path = String(pathname || "/");
  const publicMatch = path.match(/^\/s\/([^/]+)(?:\/([^/]+))?/);
  if (publicMatch) return { kind: "public-site", slug: publicMatch[1], page: publicMatch[2] || "" };
  const inviteMatch = path.match(/^\/convite\/([^/]+)/);
  if (inviteMatch) return { kind: "invite", token: inviteMatch[1] };
  if (!authenticated) return { kind: "login" };
  if (/^\/portal-cliente(?:\/|$)/.test(path)) return { kind: "customer-portal" };
  if (/^\/todogreen(?:\/|$)/.test(path)) return { kind: "todogreen" };
  return { kind: "workspace" };
}

export default function PrimaryAppRouter({
  route,
  db,
  update,
  setToast,
  authHeaders,
  PublicSite,
  AcceptInvite,
  Login,
}) {
  if (route.kind === "public-site")
    return <PublicSite site={db.sites.find((item) => item.slug === route.slug)} page={route.page} />;
  if (route.kind === "invite")
    return <AcceptInvite db={db} update={update} token={route.token} />;
  if (route.kind === "login") return <Login update={update} />;
  if (route.kind === "customer-portal")
    return (
      <Suspense fallback={<div className="inbox-loading">Abrindo seu portal...</div>}>
        <CustomerPortal />
      </Suspense>
    );
  if (route.kind === "todogreen")
    return (
      <Suspense fallback={<div className="inbox-loading">Carregando To Do Green...</div>}>
        <LogisticsVertical db={db} setToast={setToast} authHeaders={authHeaders} />
      </Suspense>
    );
  return null;
}
