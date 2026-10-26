const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "habitarnos.db"));

db.exec(`
    CREATE TABLE IF NOT EXISTS respuestas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rama TEXT NOT NULL,
        participacion TEXT NOT NULL,
        productosDisponibles TEXT,
        otroProducto TEXT,
        hablaMenstruacion TEXT,
        infoMenstrualScouts INTEGER,
        informacion INTEGER,
        interrupcionActividad TEXT,
        necesitoSinProducto TEXT,
        naturalidadMenstruacion INTEGER,
        comentariosMenstruacion TEXT,
        igualdadParticipacion TEXT,
        conoceESI INTEGER,
        conocimiento INTEGER,
        temasESI TEXT,
        trabajaESI TEXT,
        frecuenciaESI TEXT,
        comodidadESI INTEGER,
        infoGrupoESI TEXT,
        referenteESI INTEGER,
        herramientasEducadores TEXT,
        masESI TEXT,
        evaluacionGeneral INTEGER
    )
`);

module.exports = db;