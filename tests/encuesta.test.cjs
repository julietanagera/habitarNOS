const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { parseHTML } = require("linkedom");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const tick = () => new Promise((resolve) => setImmediate(resolve));
const datos = {
  rama: "Rovers", participacion: "Todavía no", productosDisponibles: ["Toallitas"],
  otroProducto: "", hablaMenstruacion: "Con total naturalidad", infoMenstrualScouts: 1,
  informacion: 3, interrupcionActividad: "No, nunca", necesitoSinProducto: "Alguna vez",
  naturalidadMenstruacion: 4, comentariosMenstruacion: "", igualdadParticipacion: "Sí, siempre",
  conoceESI: 1, conocimiento: 3, temasESI: ["Derechos"], trabajaESI: "A veces",
  frecuenciaESI: "Varias veces por año", comodidadESI: 4, infoGrupoESI: "Sí, suficiente",
  referenteESI: 0, herramientasEducadores: "En parte", masESI: "Sí, mucho", evaluacionGeneral: 5,
};

function api(fetch, key = "sb_publishable_prueba") {
  const context = {
    window: { HABITARNOS_CONFIG: { supabaseUrl: "https://prueba.supabase.co", supabasePublishableKey: key } },
    fetch, AbortController, setTimeout, clearTimeout,
  };
  vm.runInNewContext(read("frontend/js/encuesta-api.js"), context);
  return context.window.HabitarNosEncuesta;
}

test("usa la clave pública y envía las respuestas a la función de Supabase", async () => {
  const requests = [];
  const client = api(async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({ ok: true }) };
  });
  assert.equal((await client.guardar(datos)).ok, true);
  const { url, options } = requests[0];
  assert.equal(url, "https://prueba.supabase.co/rest/v1/rpc/habitarnos_guardar_encuesta");
  assert.equal(options.headers.apikey, "sb_publishable_prueba");
  assert.equal(options.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(options.body), { respuesta: datos });
});

test("no acepta claves secretas ni configuración incompleta", async () => {
  for (const key of ["", "sb_secret_no_publicar", "eyJhbGciOi_servicerole"]) {
    await assert.rejects(api(() => assert.fail("No debe enviar una petición"), key).estadisticas(), /todavía no está habilitada/);
  }
});

test("un error HTTP o una falla de conexión no se presenta como envío exitoso", async () => {
  await assert.rejects(api(async () => ({ ok: false })).guardar(datos), /Intentá nuevamente/);
  await assert.rejects(api(async () => { throw new TypeError("fetch failed"); }).guardar(datos), /Revisá tu conexión/);
});

function formulario({ falla = false, incompleto = false } = {}) {
  const { document, Event } = parseHTML(read("frontend/encuesta/index.html"));
  const form = document.getElementById("form-encuesta");
  let resets = 0;
  const guardadas = [];
  const charts = [];
  for (const [name, value] of Object.entries(datos)) {
    const controls = [...form.querySelectorAll(`[name="${name}"]`)];
    if (controls[0]?.type === "radio" || controls[0]?.type === "checkbox") {
      for (const control of controls) {
        if ((Array.isArray(value) ? value : [String(value)]).includes(control.value)) {
          control.setAttribute("checked", "");
        }
      }
    } else {
      Object.defineProperty(form, name, { value: { value }, configurable: true });
    }
  }
  if (incompleto) form.querySelector('[name="conocimiento"][checked]').removeAttribute("checked");
  form.checkValidity = () => true;
  form.reset = () => { resets++; };
  const ventana = {
    HabitarNosEncuesta: {
      guardar: async (respuesta) => {
        if (falla) throw new Error("No se pudo conectar");
        guardadas.push(JSON.parse(JSON.stringify(respuesta)));
      },
      estadisticas: async () => ({
        total: guardadas.length, promedioConocimiento: guardadas.length ? 3 : null,
        promedioEvaluacion: guardadas.length ? 5 : null,
        ramas: guardadas.length ? [{ rama: "Rovers", cantidad: 1 }] : [],
      }),
    },
  };
  class Chart {
    constructor(canvas, options) { charts.push({ canvas, options }); }
    destroy() {}
  }
  vm.runInNewContext(read("frontend/js/script.js"), {
    window: ventana, document, Chart, console: { error() {} },
  });
  return { document, form, guardadas, charts, resets: () => resets,
    enviar: async () => { form.dispatchEvent(new Event("submit", { cancelable: true })); await tick(); await tick(); },
  };
}

test("el formulario real conserva sus campos y actualiza los gráficos al enviar", async () => {
  const prueba = formulario();
  await tick();
  assert.match(prueba.document.getElementById("total-encuestas").textContent, /Todavía no hay respuestas/);
  await prueba.enviar();
  assert.deepEqual(prueba.guardadas, [datos]);
  assert.equal(prueba.resets(), 1);
  assert.match(prueba.document.getElementById("mensaje-encuesta").textContent, /Encuesta enviada/);
  assert.match(prueba.document.getElementById("total-encuestas").textContent, /Respuestas recibidas: 1/);
  assert.equal(prueba.charts.length, 1);
  assert.equal(prueba.charts[0].options.data.labels[0], "Rovers");
});

test("si el envío falla, conserva lo escrito y permite reintentar", async () => {
  const prueba = formulario({ falla: true });
  await prueba.enviar();
  assert.equal(prueba.resets(), 0);
  assert.equal(prueba.guardadas.length, 0);
  assert.match(prueba.document.getElementById("mensaje-encuesta").textContent, /No se pudo conectar/);
  assert.equal(Boolean(prueba.form.querySelector(".btn-enviar").disabled), false);
});

test("no envía la encuesta si falta una pregunta obligatoria", async () => {
  const prueba = formulario({ incompleto: true });
  await prueba.enviar();
  assert.equal(prueba.guardadas.length, 0);
  assert.match(prueba.document.getElementById("mensaje-encuesta").textContent, /Completá todas/);
});

test("enlaces, estilos, scripts y PDF locales existen bajo /habitarNOS/", () => {
  const site = path.join(root, "frontend");
  function visitar(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(dir, entry.name);
      return entry.isDirectory() ? visitar(file) : [file];
    });
  }
  for (const file of visitar(site).filter((file) => file.endsWith(".html"))) {
    const { document } = parseHTML(fs.readFileSync(file, "utf8"));
    // Los parciales resuelven sus enlaces desde la raíz mediante navbar.js.
    const relative = path.relative(site, file).replaceAll("\\", "/");
    const base = new URL(relative.startsWith("partials/") ? "index.html" : relative,
      "https://julietanagera.github.io/habitarNOS/");
    for (const element of document.querySelectorAll("[src], [href]")) {
      const ref = element.getAttribute("src") || element.getAttribute("href");
      if (!ref || /^(https?:|mailto:|tel:|#)/.test(ref)) continue;
      const url = new URL(ref, base);
      assert.ok(url.pathname.startsWith("/habitarNOS/"), `${relative}: ${ref} pierde la base del sitio`);
      const destination = path.join(site, decodeURIComponent(url.pathname.slice("/habitarNOS/".length)));
      assert.ok(fs.existsSync(destination), `${relative}: falta ${ref}`);
      if (url.hash && destination.endsWith(".html")) {
        const target = parseHTML(fs.readFileSync(destination, "utf8")).document;
        assert.ok(target.getElementById(decodeURIComponent(url.hash.slice(1))), `${relative}: falta el ancla ${ref}`);
      }
    }
  }
});
