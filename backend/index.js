const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "frontend")));

/* ---------------- Normalización de etiquetas ---------------- */

const SINONIMOS = {
    "si": "Sí",
    "sí": "Sí",
    "sii": "Sí",
    "sipi": "Sí",
    "no": "No",
    "nose": "No sé",
    "no se": "No sé",
    "no sé": "No sé",
    "no se no": "No sé",
    "frecuente": "Frecuentemente",
    "frecuentemente": "Frecuentemente",
    "menos1": "Menos de una vez",
    "menos de 1": "Menos de una vez",
    "4a6": "4 a 6 veces",
    "4 a 6": "4 a 6 veces",
    "siempre": "Siempre",
    "a veces": "A veces",
    "nunca": "Nunca",
    "a veces si": "A veces",
    "no me corresponde": "No me corresponde",
    "no aplica": "No me corresponde",
};

function textoNormalizado(column) {
    const clausulas = Object.entries(SINONIMOS)
        .map(([valor, etiqueta]) => `WHEN '${valor}' THEN '${etiqueta}'`)
        .join(" ");
    return `CASE LOWER(TRIM(${column})) ${clausulas} WHEN '' THEN 'Sin respuesta' ELSE COALESCE(TRIM(${column}), 'Sin respuesta') END`;
}

function niveles(column, etiquetas) {
    const clausulas = etiquetas
        .map((etiqueta, indice) => `WHEN ${indice + 1} THEN '${indice + 1} - ${etiqueta}'`)
        .join(" ");
    return `CASE ${column} ${clausulas} ELSE 'Sin respuesta' END`;
}

const ETIQUETAS_CONOCIMIENTO = ["Nada", "Poco", "Algo", "Bastante", "Mucho"];
const ETIQUETAS_NATURALIDAD = ["Nada natural", "Poco natural", "Algo natural", "Bastante natural", "Muy natural"];
const ETIQUETAS_EVALUACION = ["Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

const NOMBRES_PRODUCTOS = {
    "toallas": "Toallitas",
    "toallitas": "Toallitas",
    "tampones": "Tampones",
    "protectores": "Protectores diarios",
    "protectores diarios": "Protectores diarios",
    "copa": "Copa menstrual",
    "copa menstrual": "Copa menstrual",
    "toallitas reutilizables": "Toallitas reutilizables",
    "esponja": "Esponja menstrual",
    "panuelos": "Pañuelos",
    "nada": "Ninguno",
};

const NOMBRES_TEMAS = {
    "salud": "Cuidado de la salud",
    "cuidado de la salud": "Cuidado de la salud",
    "afectividad": "Afectividad",
    "derechos": "Derechos",
    "diversidad": "Diversidad",
    "identidad": "Identidad",
    "consentimiento": "Consentimiento",
};

function nombreNormalizado(nombres, clave) {
    return nombres[String(clave).toLowerCase()] || clave;
}

/* ---------------- API ---------------- */

app.post("/encuesta", (req, res) => {
    console.log("LLEGÓ UNA ENCUESTA");
    console.log(req.body);

    try {
        const respuesta = req.body;

        const stmt = db.prepare(`
            INSERT INTO respuestas (
                rama,
                participacion,
                productosDisponibles,
                otroProducto,
                hablaMenstruacion,
                infoMenstrualScouts,
                informacion,
                interrupcionActividad,
                necesitoSinProducto,
                naturalidadMenstruacion,
                comentariosMenstruacion,
                igualdadParticipacion,
                conoceESI,
                conocimiento,
                temasESI,
                trabajaESI,
                frecuenciaESI,
                comodidadESI,
                infoGrupoESI,
                referenteESI,
                herramientasEducadores,
                masESI,
                evaluacionGeneral
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            respuesta.rama,
            respuesta.participacion,
            JSON.stringify(respuesta.productosDisponibles),
            respuesta.otroProducto,
            respuesta.hablaMenstruacion,
            respuesta.infoMenstrualScouts ? 1 : 0,
            respuesta.informacion,
            respuesta.interrupcionActividad,
            respuesta.necesitoSinProducto,
            respuesta.naturalidadMenstruacion,
            respuesta.comentariosMenstruacion,
            respuesta.igualdadParticipacion,
            respuesta.conoceESI ? 1 : 0,
            respuesta.conocimiento,
            JSON.stringify(respuesta.temasESI),
            respuesta.trabajaESI,
            respuesta.frecuenciaESI,
            respuesta.comodidadESI,
            respuesta.infoGrupoESI,
            respuesta.referenteESI ? 1 : 0,
            respuesta.herramientasEducadores,
            respuesta.masESI,
            respuesta.evaluacionGeneral
        );

        console.log("ENCUESTA GUARDADA");
        res.send("Encuesta guardada correctamente");

    } catch (error) {
        console.error("ERROR AL GUARDAR:", error);
        res.status(500).send("Error al guardar la encuesta");
    }
});

app.get("/estadisticas", (req, res) => {
    const total = db.prepare("SELECT COUNT(*) AS cantidad FROM respuestas").get();

    const ramas = db.prepare(`
        SELECT TRIM(rama) AS rama, COUNT(*) AS cantidad
        FROM respuestas
        GROUP BY TRIM(rama)
    `).all();

    const trabajaESI = db.prepare(`
        SELECT ${textoNormalizado("trabajaESI")} AS respuesta, COUNT(*) AS cantidad
        FROM respuestas
        GROUP BY ${textoNormalizado("trabajaESI")}
    `).all();

    const conocimientoESI = db.prepare(`
        SELECT ${niveles("conocimiento", ETIQUETAS_CONOCIMIENTO)} AS nivel, COUNT(*) AS cantidad
        FROM respuestas
        GROUP BY ${niveles("conocimiento", ETIQUETAS_CONOCIMIENTO)}
        ORDER BY MIN(conocimiento)
    `).all();

    const informacionMenstrual = db.prepare(`
        SELECT infoMenstrualScouts AS respuesta, COUNT(*) AS cantidad
        FROM respuestas
        GROUP BY infoMenstrualScouts
    `).all();

    const frecuenciaESI = db.prepare(`
        SELECT ${textoNormalizado("frecuenciaESI")} AS frecuencia, COUNT(*) AS cantidad
        FROM respuestas
        GROUP BY ${textoNormalizado("frecuenciaESI")}
    `).all();

    const naturalidadMenstruacion = db.prepare(`
        SELECT ${niveles("naturalidadMenstruacion", ETIQUETAS_NATURALIDAD)} AS nivel, COUNT(*) AS cantidad
        FROM respuestas
        GROUP BY ${niveles("naturalidadMenstruacion", ETIQUETAS_NATURALIDAD)}
        ORDER BY MIN(naturalidadMenstruacion)
    `).all();

    const evaluacionGeneral = db.prepare(`
        SELECT ${niveles("evaluacionGeneral", ETIQUETAS_EVALUACION)} AS nivel, COUNT(*) AS cantidad
        FROM respuestas
        GROUP BY ${niveles("evaluacionGeneral", ETIQUETAS_EVALUACION)}
        ORDER BY MIN(evaluacionGeneral)
    `).all();

    const promedioConocimiento = db.prepare(`
        SELECT AVG(conocimiento) AS promedio
        FROM respuestas
    `).get();

    const promedioEvaluacion = db.prepare(`
        SELECT AVG(evaluacionGeneral) AS promedio
        FROM respuestas
    `).get();

    const respuestas = db.prepare(`
        SELECT productosDisponibles, temasESI
        FROM respuestas
    `).all();

    const productos = {};
    const temasESI = {};

    respuestas.forEach(respuesta => {
        JSON.parse(respuesta.productosDisponibles || "[]").forEach(producto => {
            const nombre = nombreNormalizado(NOMBRES_PRODUCTOS, producto);
            productos[nombre] = (productos[nombre] || 0) + 1;
        });

        JSON.parse(respuesta.temasESI || "[]").forEach(tema => {
            const nombre = nombreNormalizado(NOMBRES_TEMAS, tema);
            temasESI[nombre] = (temasESI[nombre] || 0) + 1;
        });
    });

    const necesidadProducto = db.prepare(`
        SELECT ${textoNormalizado("necesitoSinProducto")} AS respuesta, COUNT(*) AS cantidad
        FROM respuestas
        GROUP BY ${textoNormalizado("necesitoSinProducto")}
    `).all();

    const interrupcionActividad = db.prepare(`
        SELECT ${textoNormalizado("interrupcionActividad")} AS respuesta, COUNT(*) AS cantidad
        FROM respuestas
        GROUP BY ${textoNormalizado("interrupcionActividad")}
    `).all();

    const comentariosMenstruacion = db.prepare(`
        SELECT ${textoNormalizado("comentariosMenstruacion")} AS respuesta, COUNT(*) AS cantidad
        FROM respuestas
        GROUP BY ${textoNormalizado("comentariosMenstruacion")}
    `).all();

    const igualdadParticipacion = db.prepare(`
        SELECT ${textoNormalizado("igualdadParticipacion")} AS respuesta, COUNT(*) AS cantidad
        FROM respuestas
        GROUP BY ${textoNormalizado("igualdadParticipacion")}
    `).all();

    const referenteESI = db.prepare(`
        SELECT referenteESI AS respuesta, COUNT(*) AS cantidad
        FROM respuestas
        GROUP BY referenteESI
    `).all();

    const herramientasEducadores = db.prepare(`
        SELECT ${textoNormalizado("herramientasEducadores")} AS respuesta, COUNT(*) AS cantidad
        FROM respuestas
        GROUP BY ${textoNormalizado("herramientasEducadores")}
    `).all();

    const masESI = db.prepare(`
        SELECT ${textoNormalizado("masESI")} AS respuesta, COUNT(*) AS cantidad
        FROM respuestas
        GROUP BY ${textoNormalizado("masESI")}
    `).all();

    res.json({
        total: total.cantidad,
        ramas,
        trabajaESI,
        conocimientoESI,
        informacionMenstrual,
        productos,
        temasESI,
        frecuenciaESI,
        naturalidadMenstruacion,
        evaluacionGeneral,
        promedioConocimiento: promedioConocimiento.promedio,
        promedioEvaluacion: promedioEvaluacion.promedio,
        necesidadProducto,
        interrupcionActividad,
        comentariosMenstruacion,
        igualdadParticipacion,
        referenteESI,
        herramientasEducadores,
        masESI
    });
});

app.listen(3000, () => {
    console.log("Servidor funcionando en http://localhost:3000");
});