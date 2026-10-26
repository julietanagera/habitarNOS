# HabitarNos

Sitio de la Comunidad Rover Yenien Suyai Lihuén Amuyen.

La versión preparada para publicar está en `frontend/`. GitHub Pages sirve esa
carpeta y Supabase conserva las encuestas. No hace falta pagar un servidor Node.js.

## Publicación

El flujo `.github/workflows/pages.yml` prueba y publica `frontend/` con cada cambio
en `main`. En GitHub, **Settings → Pages → Source** debe ser **GitHub Actions**.
La dirección del repositorio actual es:

https://julietanagera.github.io/habitarNOS/

Los enlaces son relativos: no es necesario renombrar el repositorio ni reemplazar
rutas cuando se agregue un dominio propio.

## Encuesta y base de datos

La configuración pública está en `frontend/js/config.js`. Solo contiene la URL y
una clave `sb_publishable_…`, diseñada para usarse en el navegador. Nunca agregar
una clave secreta, `service_role`, contraseña de base de datos ni token de acceso.

El proyecto Supabase se llama **HabitarNos** y usa el plan **Free**. Este plan tiene
límites y puede pausarse por inactividad; se puede reanudar desde el panel de
Supabase. No se configuró ningún plan de pago.

`supabase/migrations/202610260001_encuesta.sql` crea:

- La tabla `habitarnos_privado.respuestas`, sin acceso para visitantes.
- `habitarnos_guardar_encuesta`: valida y guarda las respuestas anónimas.
- `habitarnos_estadisticas`: devuelve únicamente conteos y promedios.

Los comentarios y los productos escritos en texto libre no aparecen en la API de
estadísticas. Para revisar respuestas completas o exportarlas, usar la cuenta
propietaria en el panel de Supabase. Las dos funciones públicas tienen permisos
deliberados y limitados para permitir participar sin iniciar sesión. Los avisos
de Supabase sobre funciones `SECURITY DEFINER` públicas corresponden a esas dos
operaciones; el acceso directo a la tabla queda bloqueado.

Como cualquier encuesta anónima abierta, no impide por sí sola que una persona
envíe varias respuestas. No se agregó autenticación ni CAPTCHA.

La base SQLite de WSL no se copia ni se publica. La base nueva empieza vacía;
si hay respuestas antiguas que conservar, importarlas por separado antes de
considerar la migración de datos completa.

## Pruebas

```sh
npm ci
npm test
```

Las pruebas verifican el formulario real, los mensajes de error, la actualización
de gráficos y los enlaces a páginas y PDF. `supabase/tests/encuesta.sql` prueba la
validación, las estadísticas y los permisos usando una transacción que termina
con `ROLLBACK`, sin dejar encuestas ficticias.

Para ver el contenido localmente, servir `frontend/` con cualquier servidor de
archivos estáticos. La encuesta se conecta al proyecto Supabase configurado:
no enviar datos ficticios contra la base de publicación.

`backend/` conserva el servidor local original de Express y SQLite como referencia;
no se despliega a GitHub Pages. La carpeta original de WSL no fue modificada.
