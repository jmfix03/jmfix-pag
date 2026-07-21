import { createHash } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const MAX_LOOKUPS = 5;
const WINDOW_MS = 60 * 60 * 1000;

function firebaseDb() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(serviceAccount) });
  return getFirestore(app);
}

function clientIp(request) {
  return request.headers.get("x-nf-client-connection-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function response(status, body) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function verifyTurnstile(token, ip) {
  const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY || "", response: token, remoteip: ip }),
  });
  const result = await verification.json();
  const expectedHostname = process.env.TURNSTILE_HOSTNAME;
  return result.success === true && result.action === "order_lookup" && (!expectedHostname || result.hostname === expectedHostname);
}

async function consumeLookup(ip) {
  const salt = process.env.LOOKUP_RATE_LIMIT_SALT;
  if (!salt) throw new Error("Falta configurar LOOKUP_RATE_LIMIT_SALT.");
  const key = createHash("sha256").update(`${salt}:${ip}`).digest("hex");
  const db = firebaseDb();
  const ref = db.collection("lookupRateLimits").doc(key);
  const now = Date.now();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.data();
    const startedAt = current?.windowStartedAt?.toMillis?.() || 0;
    const expired = now - startedAt >= WINDOW_MS;
    const count = expired ? 0 : Number(current?.count || 0);
    if (count >= MAX_LOOKUPS) return { allowed: false };
    transaction.set(ref, {
      count: count + 1,
      windowStartedAt: Timestamp.fromMillis(expired || !startedAt ? now : startedAt),
      expiresAt: Timestamp.fromMillis(now + WINDOW_MS),
    }, { merge: true });
    return { allowed: true };
  });
}

function publicOrder(data) {
  const date = data.fechaIngreso?.toDate?.();
  return {
    numero: data.numero,
    fechaIngreso: date ? date.toISOString().slice(0, 10) : null,
    estado: data.estado || "",
    detalleDiagnostico: data.detalleDiagnostico || "",
    garantia: data.garantia || "",
    total: data.total ?? null,
    pagado: data.pagado ?? 0,
    saldo: data.saldo ?? 0,
  };
}

export default async (request) => {
  if (request.method !== "POST") return response(405, { error: "Método no permitido." });
  if (!process.env.TURNSTILE_SECRET_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return response(500, { error: "La búsqueda segura no está configurada." });
  let input;
  try {
    const body = await request.text();
    if (!body || body.length > 1000) throw new Error();
    input = JSON.parse(body);
  } catch {
    return response(400, { error: "Solicitud inválida." });
  }
  const numero = String(input.numero || "").trim();
  const token = String(input.turnstileToken || "").trim();
  if (!/^\d{1,10}$/.test(numero) || !token) return response(400, { error: "Completá la verificación e ingresá un número de orden válido." });

  const ip = clientIp(request);
  try {
    if (!(await verifyTurnstile(token, ip))) return response(403, { error: "No se pudo validar la verificación. Intentá nuevamente." });
    if (!(await consumeLookup(ip)).allowed) return response(429, { error: "Alcanzaste el máximo de 5 búsquedas por hora. Probá más tarde." });
    const snapshot = await firebaseDb().collection("publicOrders").doc(numero).get();
    if (!snapshot.exists) return response(404, { error: "No encontramos ninguna orden con ese número." });
    return response(200, { order: publicOrder(snapshot.data()) });
  } catch (error) {
    console.error("Error en búsqueda pública", error);
    return response(500, { error: "No pudimos realizar la búsqueda. Probá de nuevo más tarde." });
  }
};
