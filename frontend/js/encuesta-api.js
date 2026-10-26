(function () {
  function configuracion() {
    const config = window.HABITARNOS_CONFIG || {};
    const url = (config.supabaseUrl || "").replace(/\/+$/, "");
    const key = config.supabasePublishableKey || "";
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) ||
        !key.startsWith("sb_publishable_")) {
      throw new Error("La encuesta todavía no está habilitada. Volvé a intentarlo más tarde.");
    }
    return { url, key };
  }

  async function rpc(nombre, parametros = {}) {
    const { url, key } = configuracion();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${url}/rest/v1/rpc/${nombre}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: key },
        body: JSON.stringify(parametros),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error("No pudimos conectar con la encuesta. Intentá nuevamente en unos minutos.");
      }
      return await response.json();
    } catch (error) {
      if (error.name === "AbortError" || error.name === "TypeError") {
        throw new Error("No pudimos conectar con la encuesta. Revisá tu conexión e intentá nuevamente.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  window.HabitarNosEncuesta = Object.freeze({
    guardar: (respuesta) => rpc("habitarnos_guardar_encuesta", { respuesta }),
    estadisticas: () => rpc("habitarnos_estadisticas"),
  });
})();
