// Configuración del sitio. Se lee en el servidor en tiempo de ejecución (variables de entorno de Dokploy).
export const site = {
  name: process.env.SITE_NAME || "Rifan2 RD",
  url: (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  description:
    process.env.SITE_DESCRIPTION ||
    "Rifas transparentes en República Dominicana: boletos desde RD$5, sorteos verificables y ganadores reales.",
  whatsapp: process.env.WHATSAPP || "", // ej. 18095551234
  instagram: process.env.INSTAGRAM || "", // sin @
  legalName: process.env.LEGAL_NAME || "",
  permit: process.env.PERMIT || "", // número de permiso / resolución
  turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
};

export const TIMEZONE = "America/Santo_Domingo";
