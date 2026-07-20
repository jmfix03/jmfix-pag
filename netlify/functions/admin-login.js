exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  if (!process.env.ADMIN_PASSWORD) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error:
          "Todavía no configuraste la variable de entorno ADMIN_PASSWORD en Netlify",
      }),
    };
  }

  let password = "";
  try {
    password = JSON.parse(event.body || "{}").password || "";
  } catch (e) {
    // body inválido, sigue con password vacío
  }

  if (password === process.env.ADMIN_PASSWORD) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return {
    statusCode: 401,
    headers,
    body: JSON.stringify({ ok: false, error: "Contraseña incorrecta" }),
  };
};
