-- Prueba transaccional: no conserva respuestas ficticias.
begin;
set local role anon;
do $$
declare
  respuesta jsonb := '{
    "rama":"Rovers", "participacion":"Todavía no", "productosDisponibles":["Toallitas"],
    "otroProducto":"", "hablaMenstruacion":"Con total naturalidad", "infoMenstrualScouts":1,
    "informacion":3, "interrupcionActividad":"No, nunca", "necesitoSinProducto":"Alguna vez",
    "naturalidadMenstruacion":4, "comentariosMenstruacion":"COMENTARIO_PRIVADO_DE_PRUEBA",
    "igualdadParticipacion":"Sí, siempre", "conoceESI":1, "conocimiento":3, "temasESI":["Derechos"],
    "trabajaESI":"A veces", "frecuenciaESI":"Varias veces por año", "comodidadESI":4,
    "infoGrupoESI":"Sí, suficiente", "referenteESI":0, "herramientasEducadores":"En parte",
    "masESI":"Sí, mucho", "evaluacionGeneral":5
  }';
  anterior jsonb := public.habitarnos_estadisticas();
  actual jsonb;
  invalida jsonb;
begin
  assert public.habitarnos_guardar_encuesta(respuesta) = '{"ok":true}'::jsonb;
  actual := public.habitarnos_estadisticas();
  assert (actual ->> 'total')::int = (anterior ->> 'total')::int + 1;
  assert (actual -> 'productos' ->> 'Toallitas')::int = coalesce((anterior -> 'productos' ->> 'Toallitas')::int, 0) + 1;
  assert (actual -> 'temasESI' ->> 'Derechos')::int = coalesce((anterior -> 'temasESI' ->> 'Derechos')::int, 0) + 1;
  assert actual::text not like '%COMENTARIO_PRIVADO_DE_PRUEBA%';
  assert not (actual ? 'comentariosMenstruacion');
  assert not (actual ? 'otroProducto');

  -- El rol público puede usar las dos operaciones pero no leer ni alterar la tabla.
  begin
    perform datos from habitarnos_privado.respuestas;
    raise exception 'Se permitió leer respuestas individuales';
  exception when insufficient_privilege then null;
  end;
  begin
    update habitarnos_privado.respuestas set datos = '{}'::jsonb;
    raise exception 'Se permitió alterar respuestas';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from habitarnos_privado.respuestas;
    raise exception 'Se permitió eliminar respuestas';
  exception when insufficient_privilege then null;
  end;

  for invalida in
    select valor from (values
      (respuesta - 'rama'),
      (respuesta || '{"rama":"Inexistente"}'::jsonb),
      (respuesta || '{"conocimiento":6}'::jsonb),
      (respuesta || '{"conocimiento":"3"}'::jsonb),
      (respuesta || '{"conoceESI":true}'::jsonb),
      (respuesta || '{"temasESI":["Derechos","Derechos"]}'::jsonb),
      (respuesta || '{"productosDisponibles":["Inexistente"]}'::jsonb),
      (respuesta || '{"temasESI":null}'::jsonb),
      (respuesta || '{"noPermitido":1}'::jsonb),
      (respuesta || jsonb_build_object('otroProducto', repeat('x',201))),
      (respuesta || jsonb_build_object('comentariosMenstruacion',repeat('x',2001)))
    ) as casos(valor)
  loop
    begin
      perform public.habitarnos_guardar_encuesta(invalida);
      raise exception 'Se aceptó una respuesta inválida';
    exception when sqlstate '22023' then null;
    end;
  end loop;

  -- Listas vacías y los valores No (0) también son respuestas válidas.
  perform public.habitarnos_guardar_encuesta(respuesta || '{"productosDisponibles":[],"temasESI":[],"infoMenstrualScouts":0,"conoceESI":0}'::jsonb);
end;
$$;
reset role;
rollback;
select public.habitarnos_estadisticas() ->> 'total' as respuestas_conservadas;
