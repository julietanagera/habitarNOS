(function () {
  const encuesta = window.HabitarNosEncuesta;

  const COLORES = [
    "#3F5B4B",
    "#B52B32",
    "#A8B89F",
    "#171717",
    "#6d8b7f",
    "#96262c",
    "#c4cdbd",
    "#5f5f5f",
  ];

  /* ---------------- Formulario ---------------- */

  const form = document.getElementById("form-encuesta");
  const mensaje = document.getElementById("mensaje-encuesta");

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      mensaje.className = "encuesta-mensaje";
      mensaje.textContent = "";

      const gruposObligatorios = [
        "infoMenstrualScouts",
        "informacion",
        "naturalidadMenstruacion",
        "conoceESI",
        "conocimiento",
        "comodidadESI",
        "referenteESI",
        "evaluacionGeneral",
      ];

      const sinResponder = gruposObligatorios.filter(
        (nombre) => !radioMarcada(form, nombre)
      );

      if (sinResponder.length > 0 || !form.checkValidity()) {
        mensaje.className = "encuesta-mensaje error";
        mensaje.textContent =
          "Completá todas las preguntas obligatorias antes de enviar.";
        return;
      }

      const datos = {
        rama: form.rama.value,
        participacion: form.participacion.value,
        productosDisponibles: valoresMarcados(form, "productosDisponibles"),
        otroProducto: form.otroProducto.value.trim(),
        hablaMenstruacion: form.hablaMenstruacion.value,
        infoMenstrualScouts: Number(radioMarcada(form, "infoMenstrualScouts")),
        informacion: Number(radioMarcada(form, "informacion")),
        interrupcionActividad: form.interrupcionActividad.value,
        necesitoSinProducto: form.necesitoSinProducto.value,
        naturalidadMenstruacion: Number(
          radioMarcada(form, "naturalidadMenstruacion")
        ),
        comentariosMenstruacion: form.comentariosMenstruacion.value.trim(),
        igualdadParticipacion: form.igualdadParticipacion.value,
        conoceESI: Number(radioMarcada(form, "conoceESI")),
        conocimiento: Number(radioMarcada(form, "conocimiento")),
        temasESI: valoresMarcados(form, "temasESI"),
        trabajaESI: form.trabajaESI.value,
        frecuenciaESI: form.frecuenciaESI.value,
        comodidadESI: Number(radioMarcada(form, "comodidadESI")),
        infoGrupoESI: form.infoGrupoESI.value,
        referenteESI: Number(radioMarcada(form, "referenteESI")),
        herramientasEducadores: form.herramientasEducadores.value,
        masESI: form.masESI.value,
        evaluacionGeneral: Number(radioMarcada(form, "evaluacionGeneral")),
      };

      const boton = form.querySelector(".btn-enviar");
      boton.disabled = true;

      try {
        await encuesta.guardar(datos);

        mensaje.className = "encuesta-mensaje exito";
        mensaje.textContent = "¡Encuesta enviada! Gracias por participar.";
        form.reset();
        await cargarEstadisticas();
      } catch (error) {
        console.error(error);
        mensaje.className = "encuesta-mensaje error";
        mensaje.textContent =
          error.message || "No se pudo enviar la encuesta. Intentá nuevamente más tarde.";
      } finally {
        boton.disabled = false;
      }
    });
  }

  function valoresMarcados(form, nombre) {
    return Array.from(
      form.querySelectorAll(`input[name="${nombre}"]:checked`)
    ).map((input) => input.value);
  }

  function radioMarcada(form, nombre) {
    const input = form.querySelector(`input[name="${nombre}"]:checked`);
    return input ? input.value : "";
  }

  /* ---------------- Estadísticas ---------------- */

  const contenedor = document.getElementById("estadisticas");
  if (!contenedor) return;

  const graficos = [];
  const resultados = document.createElement("div");
  contenedor.appendChild(resultados);

  function cargarEstadisticas() {
    return encuesta.estadisticas()
    .then((datos) => {
      graficos.splice(0).forEach((chart) => chart.destroy());
      resultados.replaceChildren();
      document.getElementById("total-encuestas").textContent =
        "Respuestas recibidas: " + datos.total;

      if (datos.total === 0) {
        document.getElementById("total-encuestas").textContent =
          "Todavía no hay respuestas. ¡Podés ser la primera persona en participar!";
        return;
      }
      if (typeof Chart === "undefined") {
        throw new Error("No se pudieron cargar los gráficos. Recargá la página para volver a intentarlo.");
      }

      tarjetaPromedios(datos);
      grafico("Por rama", graficoDona, datos.ramas, "rama", "cantidad");
      grafico(
        "Productos de gestión menstrual que se usan",
        graficoBarras,
        objetoAArray(datos.productos)
      );
      grafico("Ejes de ESI de interés", graficoBarras, objetoAArray(datos.temasESI));
      grafico(
        "Nivel de conocimiento sobre ESI (1 a 5)",
        graficoBarras,
        datos.conocimientoESI,
        "nivel",
        "cantidad"
      );
      grafico(
        "Naturalidad para hablar de menstruación (1 a 5)",
        graficoBarras,
        datos.naturalidadMenstruacion,
        "nivel",
        "cantidad"
      );
      grafico(
        "Evaluación general del proyecto (1 a 5)",
        graficoBarras,
        datos.evaluacionGeneral,
        "nivel",
        "cantidad"
      );
      grafico(
        "Información sobre salud menstrual en scouts",
        graficoBarras,
        datos.informacionMenstrual,
        "respuesta",
        "cantidad",
        true
      );
      grafico(
        "¿Se trabaja la ESI en tu rama?",
        graficoBarras,
        datos.trabajaESI,
        "respuesta",
        "cantidad"
      );
      grafico(
        "Frecuencia de abordaje de la ESI",
        graficoBarras,
        datos.frecuenciaESI,
        "frecuencia",
        "cantidad"
      );
      grafico(
        "¿Necesitaste un producto y no lo tenías?",
        graficoBarras,
        datos.necesidadProducto,
        "respuesta",
        "cantidad"
      );
      grafico(
        "¿La menstruación interrumpió actividades?",
        graficoBarras,
        datos.interrupcionActividad,
        "respuesta",
        "cantidad"
      );
      grafico(
        "Igualdad de participación entre géneros",
        graficoBarras,
        datos.igualdadParticipacion,
        "respuesta",
        "cantidad"
      );
      grafico(
        "¿Hay referente de ESI en el grupo?",
        graficoBarras,
        datos.referenteESI,
        "respuesta",
        "cantidad",
        true
      );
      grafico(
        "Educadores con herramientas para estos temas",
        graficoBarras,
        datos.herramientasEducadores,
        "respuesta",
        "cantidad"
      );
      grafico(
        "¿Querés más ESI en el grupo?",
        graficoBarras,
        datos.masESI,
        "respuesta",
        "cantidad"
      );
    })
    .catch((error) => {
      console.error(error);
      document.getElementById("total-encuestas").textContent =
        error.message || "No se pudieron cargar las estadísticas. Intentá nuevamente más tarde.";
    });
  }

  cargarEstadisticas();

  function tarjetaPromedios(datos) {
    const tarjeta = document.createElement("div");
    tarjeta.innerHTML =
      `<h3>Promedios</h3>` +
      `<p>Conocimiento sobre ESI: <strong>${formatear(datos.promedioConocimiento)} / 5</strong></p>` +
      `<p>Evaluación del proyecto: <strong>${formatear(datos.promedioEvaluacion)} / 5</strong></p>`;
    resultados.appendChild(tarjeta);
  }

  function formatear(valor) {
    if (valor === null || valor === undefined) return "—";
    return (Math.round(valor * 10) / 10).toLocaleString("es-AR");
  }

  function objetoAArray(objeto) {
    return Object.entries(objeto || {}).map(([clave, cantidad]) => ({
      clave,
      cantidad,
    }));
  }

  function grafico(titulo, fabricar, filas, campoEtiqueta, campoValor, booleanas = false) {
    if (!filas || filas.length === 0) return;
    const tarjeta = document.createElement("div");
    tarjeta.innerHTML = `<h3>${titulo}</h3><canvas></canvas>`;
    resultados.appendChild(tarjeta);

    const etiquetas = filas.map((fila) =>
      booleanas
        ? fila[campoEtiqueta] === 1 || fila[campoEtiqueta] === "1"
          ? "Sí"
          : "No"
        : fila[campoEtiqueta] ?? fila.clave
    );
    const valores = filas.map((fila) => fila[campoValor] ?? fila.cantidad);

    fabricar(tarjeta.querySelector("canvas"), etiquetas, valores);
  }

  function graficoBarras(canvas, etiquetas, valores) {
    graficos.push(new Chart(canvas, {
      type: "bar",
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: "Cantidad de respuestas",
            data: valores,
            backgroundColor: COLORES.slice(0, etiquetas.length),
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    }));
  }

  function graficoDona(canvas, etiquetas, valores) {
    graficos.push(new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: etiquetas,
        datasets: [
          {
            data: valores,
            backgroundColor: COLORES.slice(0, etiquetas.length),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
      },
    }));
  }
})();
