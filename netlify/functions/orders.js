const { getStore } = require("@netlify/blobs");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function isAdmin(event) {
  const header =
    event.headers["x-admin-password"] || event.headers["X-Admin-Password"];
  return Boolean(ADMIN_PASSWORD) && header === ADMIN_PASSWORD;
}

// Lo que puede ver un cliente (nada de notas internas si algún día se agregan)
function publicView(order) {
  const {
    numero,
    fechaIngreso,
    cliente,
    dispositivo,
    estado,
    presupuesto,
    detalleDiagnostico,
    garantia,
    total,
    pagado,
  } = order;
  const saldo = round2((Number(total) || 0) - (Number(pagado) || 0));
  return {
    numero,
    fechaIngreso,
    cliente,
    dispositivo,
    estado,
    presupuesto,
    detalleDiagnostico,
    garantia,
    total,
    pagado,
    saldo,
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

exports.handler = async (event) => {
  const store = getStore({ name: "orders" });
  const method = event.httpMethod;
  const params = event.queryStringParameters || {};

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-password",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };

  if (method === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    if (method === "GET") {
      // Listado completo, solo admin
      if (params.list === "1") {
        if (!isAdmin(event)) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: "No autorizado" }),
          };
        }
        const { blobs } = await store.list();
        const orders = await Promise.all(
          blobs.map((b) => store.get(b.key, { type: "json" }))
        );
        orders.sort((a, b) => String(b.numero).localeCompare(String(a.numero), undefined, { numeric: true }));
        return { statusCode: 200, headers, body: JSON.stringify(orders) };
      }

      // Consulta puntual por número (pública, o completa si es admin)
      const numero = (params.numero || "").trim();
      if (!numero) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Falta el número de orden" }),
        };
      }
      const order = await store.get(numero, { type: "json" });
      if (!order) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: "No encontramos ninguna orden con ese número",
          }),
        };
      }
      const view = isAdmin(event) ? order : publicView(order);
      return { statusCode: 200, headers, body: JSON.stringify(view) };
    }

    if (method === "POST") {
      if (!isAdmin(event)) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: "No autorizado" }),
        };
      }
      const data = JSON.parse(event.body || "{}");
      const numero = String(data.numero || "").trim();
      if (!numero) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Falta el número de orden" }),
        };
      }
      await store.setJSON(numero, { ...data, numero });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (method === "DELETE") {
      if (!isAdmin(event)) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: "No autorizado" }),
        };
      }
      const numero = (params.numero || "").trim();
      if (!numero) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Falta el número de orden" }),
        };
      }
      await store.delete(numero);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Error interno", detail: String(err) }),
    };
  }
};
