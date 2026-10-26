-- Las respuestas individuales no se exponen en la API pública.
create schema if not exists habitarnos_privado;
revoke all on schema habitarnos_privado from public, anon, authenticated;

create table habitarnos_privado.respuestas (
  id bigint generated always as identity primary key,
  creada_en timestamptz not null default now(),
  datos jsonb not null check (jsonb_typeof(datos) = 'object')
);
alter table habitarnos_privado.respuestas enable row level security;
revoke all on habitarnos_privado.respuestas from public, anon, authenticated;
revoke all on all sequences in schema habitarnos_privado from public, anon, authenticated;

create or replace function public.habitarnos_guardar_encuesta(respuesta jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  campo text;
  opciones jsonb := '{
    "rama": ["Manada", "Unidad", "Caminantes", "Rovers"],
    "participacion": ["Sí, en varias", "Sí, en una", "Todavía no"],
    "hablaMenstruacion": ["Con total naturalidad", "Con algunas incomodidades", "Es un tema tabú", "No se habla"],
    "interrupcionActividad": ["Sí, seguido", "Alguna vez", "No, nunca", "No me corresponde"],
    "necesitoSinProducto": ["Sí, seguido", "Alguna vez", "No, nunca", "No me corresponde"],
    "igualdadParticipacion": ["Sí, siempre", "En general sí", "No, se nota la diferencia", "No lo noté"],
    "trabajaESI": ["Sí, seguido", "A veces", "Casi nunca", "Nunca", "No sé"],
    "frecuenciaESI": ["Varias veces por año", "Una vez por año", "Casi nunca", "Nunca"],
    "infoGrupoESI": ["Sí, suficiente", "Sí, pero poca", "No"],
    "herramientasEducadores": ["Sí, totalmente", "En parte", "No", "No sé"],
    "masESI": ["Sí, mucho", "Sí, un poco", "No, está bien así"]
  }';
  multiples jsonb := '{
    "productosDisponibles": ["Toallitas", "Tampones", "Protectores diarios", "Copa menstrual", "Toallitas reutilizables"],
    "temasESI": ["Cuidado de la salud", "Afectividad", "Derechos", "Diversidad", "Identidad"]
  }';
begin
  if jsonb_typeof(respuesta) is distinct from 'object' or octet_length(respuesta::text) > 12000 then
    raise exception 'Respuesta inválida' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_object_keys(respuesta) as claves(nombre)
    where nombre <> all(array[
      'rama', 'participacion', 'productosDisponibles', 'otroProducto',
      'hablaMenstruacion', 'infoMenstrualScouts', 'informacion',
      'interrupcionActividad', 'necesitoSinProducto', 'naturalidadMenstruacion',
      'comentariosMenstruacion', 'igualdadParticipacion', 'conoceESI',
      'conocimiento', 'temasESI', 'trabajaESI', 'frecuenciaESI', 'comodidadESI',
      'infoGrupoESI', 'referenteESI', 'herramientasEducadores', 'masESI', 'evaluacionGeneral'
    ])
  ) then
    raise exception 'Campos desconocidos' using errcode = '22023';
  end if;

  for campo in select jsonb_object_keys(opciones) loop
    if not coalesce((opciones -> campo) @> jsonb_build_array(respuesta -> campo), false) then
      raise exception 'Opción inválida: %', campo using errcode = '22023';
    end if;
  end loop;

  foreach campo in array array['informacion', 'naturalidadMenstruacion', 'conocimiento', 'comodidadESI', 'evaluacionGeneral'] loop
    if jsonb_typeof(respuesta -> campo) is distinct from 'number' or
       not coalesce((respuesta ->> campo) = any(array['1', '2', '3', '4', '5']), false) then
      raise exception 'Escala inválida: %', campo using errcode = '22023';
    end if;
  end loop;

  foreach campo in array array['infoMenstrualScouts', 'conoceESI', 'referenteESI'] loop
    if jsonb_typeof(respuesta -> campo) is distinct from 'number' or
       not coalesce((respuesta ->> campo) = any(array['0', '1']), false) then
      raise exception 'Respuesta inválida: %', campo using errcode = '22023';
    end if;
  end loop;

  for campo in select jsonb_object_keys(multiples) loop
    if jsonb_typeof(respuesta -> campo) is distinct from 'array' then
      raise exception 'Lista inválida: %', campo using errcode = '22023';
    end if;
    if not ((multiples -> campo) @> (respuesta -> campo)) or
       jsonb_array_length(respuesta -> campo) <> (
         select count(distinct valor) from jsonb_array_elements(respuesta -> campo) as elementos(valor)
       ) then
      raise exception 'Opciones inválidas: %', campo using errcode = '22023';
    end if;
  end loop;

  foreach campo in array array['otroProducto', 'comentariosMenstruacion'] loop
    if respuesta ? campo and (
      jsonb_typeof(respuesta -> campo) is distinct from 'string' or
      char_length(respuesta ->> campo) > case when campo = 'otroProducto' then 200 else 2000 end
    ) then
      raise exception 'Texto inválido: %', campo using errcode = '22023';
    end if;
  end loop;

  insert into habitarnos_privado.respuestas(datos) values (respuesta);
  return '{"ok": true}'::jsonb;
end;
$$;
revoke all on function public.habitarnos_guardar_encuesta(jsonb) from public, anon, authenticated;
grant execute on function public.habitarnos_guardar_encuesta(jsonb) to anon, authenticated;

-- Solo devuelve conteos y promedios: nunca comentarios ni respuestas completas.
create or replace function public.habitarnos_estadisticas()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with respuestas as (
    select datos from habitarnos_privado.respuestas
  ), campos(campo, destino, etiqueta) as (
    values
      ('rama', 'ramas', 'rama'),
      ('trabajaESI', 'trabajaESI', 'respuesta'),
      ('conocimiento', 'conocimientoESI', 'nivel'),
      ('infoMenstrualScouts', 'informacionMenstrual', 'respuesta'),
      ('frecuenciaESI', 'frecuenciaESI', 'frecuencia'),
      ('naturalidadMenstruacion', 'naturalidadMenstruacion', 'nivel'),
      ('evaluacionGeneral', 'evaluacionGeneral', 'nivel'),
      ('necesitoSinProducto', 'necesidadProducto', 'respuesta'),
      ('interrupcionActividad', 'interrupcionActividad', 'respuesta'),
      ('igualdadParticipacion', 'igualdadParticipacion', 'respuesta'),
      ('referenteESI', 'referenteESI', 'respuesta'),
      ('herramientasEducadores', 'herramientasEducadores', 'respuesta'),
      ('masESI', 'masESI', 'respuesta')
  ), conteos as (
    select c.campo, c.destino, c.etiqueta, r.datos -> c.campo as valor, count(*) as cantidad
    from respuestas r cross join campos c
    group by c.campo, c.destino, c.etiqueta, r.datos -> c.campo
  ), etiquetas as (
    select *, case campo
      when 'conocimiento' then to_jsonb((array['1 - Nada', '2 - Poco', '3 - Algo', '4 - Bastante', '5 - Mucho'])[(valor #>> '{}')::int])
      when 'naturalidadMenstruacion' then to_jsonb((array['1 - Nada natural', '2 - Poco natural', '3 - Algo natural', '4 - Bastante natural', '5 - Muy natural'])[(valor #>> '{}')::int])
      when 'evaluacionGeneral' then to_jsonb((array['1 - Muy malo', '2 - Malo', '3 - Regular', '4 - Bueno', '5 - Excelente'])[(valor #>> '{}')::int])
      else valor end as rotulo
    from conteos
  ), agrupados as (
    select destino, jsonb_agg(jsonb_build_object(etiqueta, rotulo, 'cantidad', cantidad) order by valor) as filas
    from etiquetas group by destino
  ), listas as (
    select campo, elemento, count(*) as cantidad
    from respuestas cross join (values ('productosDisponibles'), ('temasESI')) as listas(campo)
    cross join lateral jsonb_array_elements_text(datos -> campo) as elementos(elemento)
    group by campo, elemento
  )
  select jsonb_build_object(
    'total', (select count(*) from respuestas),
    'promedioConocimiento', (select avg((datos ->> 'conocimiento')::int) from respuestas),
    'promedioEvaluacion', (select avg((datos ->> 'evaluacionGeneral')::int) from respuestas),
    'productos', coalesce((select jsonb_object_agg(elemento, cantidad) from listas where campo = 'productosDisponibles'), '{}'::jsonb),
    'temasESI', coalesce((select jsonb_object_agg(elemento, cantidad) from listas where campo = 'temasESI'), '{}'::jsonb)
  ) || (select jsonb_object_agg(c.destino, coalesce(a.filas, '[]'::jsonb))
        from campos c left join agrupados a on a.destino = c.destino);
$$;
revoke all on function public.habitarnos_estadisticas() from public, anon, authenticated;
grant execute on function public.habitarnos_estadisticas() to anon, authenticated;
