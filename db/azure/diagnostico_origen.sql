-- =============================================================================
-- DIAGNÓSTICO DE LA BASE DE ORIGEN (SOLO LECTURA: únicamente SELECT)
-- Ejecútalo contra la base anterior ANTES de migrar:
--     psql "$SRC" -f db/azure/diagnostico_origen.sql
-- Cada consulta debe devolver 0 filas. Las filas que aparezcan incumplen una restricción del esquema de
-- Azure y harían fallar pg_restore: corrígelas en el origen (o decide qué hacer con ellas) y repite.
-- =============================================================================

\echo '--- Usuario: nombres, correo, teléfono, estado'
SELECT "NumeroDocumento", "Correo" FROM public."Usuario"
WHERE NOT (char_length(btrim("NombreUsuario")) BETWEEN 1 AND 100 AND char_length(btrim("ApellidoUsuario")) BETWEEN 1 AND 100)
   OR NOT ("Correo" = lower(btrim("Correo")) AND "Correo" ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
   OR NOT ("Telefono" IS NULL OR "Telefono" = '' OR "Telefono" ~ '^\+?[0-9 ()-]{7,20}$')
   OR "Estado" NOT IN ('Activo', 'Inactivo');

\echo '--- Usuario: contraseñas que no son bcrypt (esos usuarios deben restablecer su clave antes de migrar)'
SELECT "NumeroDocumento", "Correo" FROM public."Usuario" WHERE "Contrasena" NOT LIKE '$2%';

\echo '--- Usuario: correos repetidos sin distinguir mayúsculas'
SELECT lower("Correo") AS correo, count(*) FROM public."Usuario" GROUP BY 1 HAVING count(*) > 1;

\echo '--- Finca: datos básicos y ficha'
SELECT "IdFinca", "NombreFinca" FROM public."Finca"
WHERE NOT (char_length(btrim("NombreFinca")) >= 1
        AND "Precio" BETWEEN 1 AND 20000000 AND "Capacidad" BETWEEN 1 AND 500 AND "Calificacion" BETWEEN 1 AND 5
        AND "Estado" IN ('Disponible', 'No disponible')
        AND cardinality("Comodidades") <= 30
        AND NOT EXISTS (SELECT 1 FROM unnest("Comodidades") c WHERE char_length(c) > 50)
        AND "Habitaciones" BETWEEN 0 AND 100 AND "Banos" BETWEEN 0 AND 100 AND "Camas" BETWEEN 0 AND 200
        AND "NochesMinimas" BETWEEN 1 AND 30 AND ("Reglas" IS NULL OR char_length("Reglas") <= 1000)
        AND ("Latitud" IS NULL OR "Latitud" BETWEEN -90 AND 90) AND ("Longitud" IS NULL OR "Longitud" BETWEEN -180 AND 180)
        AND (("Latitud" IS NULL) = ("Longitud" IS NULL)));

\echo '--- Finca: propietarios con más de 50 fincas'
SELECT "NumeroDocumentoUsuario", count(*) FROM public."Finca" GROUP BY 1 HAVING count(*) > 50;

\echo '--- Imagen: sin ruta, fuera de límites, o fincas con más de 10 imágenes'
SELECT "IdImagen", "IdFinca" FROM public."Imagen"
WHERE "RutaStorage" IS NULL OR char_length(btrim("RutaStorage")) < 1 OR "Orden" NOT BETWEEN 0 AND 1000
   OR "TamanoBytes" NOT BETWEEN 1 AND 5242880 OR "Ancho" NOT BETWEEN 1 AND 4000 OR "Alto" NOT BETWEEN 1 AND 4000;
SELECT "IdFinca", count(*) FROM public."Imagen" GROUP BY 1 HAVING count(*) > 10;
SELECT "IdFinca", count(*) FROM public."Imagen" WHERE "EsPortada" GROUP BY 1 HAVING count(*) > 1;

\echo '--- Reserva: fechas, monto, estado'
SELECT "IdReserva", "IdFinca" FROM public."Reserva"
WHERE NOT ("FechaEntrada" IS NOT NULL AND "FechaSalida" IS NOT NULL AND "FechaSalida" > "FechaEntrada"
           AND "FechaSalida" - "FechaEntrada" <= INTERVAL '90 days')
   OR NOT ("MontoReserva" > 0)
   OR "Estado" NOT IN ('Pendiente', 'Activa', 'Confirmada', 'Finalizada', 'Cancelada');

\echo '--- Reserva: solapes entre reservas vivas de la misma finca'
SELECT a."IdReserva" AS reserva_a, b."IdReserva" AS reserva_b, a."IdFinca"
FROM public."Reserva" a JOIN public."Reserva" b
  ON a."IdFinca" = b."IdFinca" AND a."IdReserva" < b."IdReserva"
 AND tsrange(a."FechaEntrada", a."FechaSalida") && tsrange(b."FechaEntrada", b."FechaSalida")
WHERE lower(a."Estado") NOT IN ('cancelada', 'cancelado', 'anulada', 'anulado')
  AND lower(b."Estado") NOT IN ('cancelada', 'cancelado', 'anulada', 'anulado');

\echo '--- Reserva: usuarios con más de 20 reservas pendientes'
SELECT "NumeroDocumentoUsuario", count(*) FROM public."Reserva" WHERE lower("Estado") = 'pendiente' GROUP BY 1 HAVING count(*) > 20;

\echo '--- Factura: total negativo o reservas con más de una factura'
SELECT "IdFactura" FROM public."Factura" WHERE NOT ("Total" >= 0);
SELECT "IdReserva", count(*) FROM public."Factura" GROUP BY 1 HAVING count(*) > 1;

\echo '--- Pago: monto, estado y pagos que superan el total de la factura'
SELECT "IdPago" FROM public."Pago" WHERE NOT ("Monto" > 0) OR "EstadoPago" NOT IN ('Pendiente', 'Pagado', 'Rechazado');
SELECT f."IdFactura", f."Total", sum(p."Monto") AS pagado
FROM public."Factura" f JOIN public."Pago" p ON p."IdFactura" = f."IdFactura" AND p."EstadoPago" = 'Pagado'
GROUP BY f."IdFactura", f."Total" HAVING sum(p."Monto") > f."Total";

\echo '--- Catálogos con nombre vacío'
SELECT 'Rol' AS tabla, "IdRol" AS id FROM public."Rol" WHERE char_length(btrim("NombreRol")) < 1
UNION ALL SELECT 'Municipio', "IdMunicipio" FROM public."Municipio" WHERE char_length(btrim("NombreMunicipio")) < 1
UNION ALL SELECT 'MetodoDePago', "IdMetodoDePago" FROM public."MetodoDePago" WHERE char_length(btrim("NombreMetodoDePago")) < 1;
