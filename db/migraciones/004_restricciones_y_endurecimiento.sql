-- =============================================================================
-- MIGRACIÓN 004: restricciones de integridad y endurecimiento de la base
-- La base deja de confiar en que la API valide todo: un dato imposible (precio
-- negativo, fechas al revés, dos reservas en las mismas noches, una factura pagada
-- dos veces...) se rechaza aquí aunque llegue por un fallo de la API o por SQL directo.
--
-- Las restricciones CHECK se crean NOT VALID: aplican desde ya a toda fila nueva o
-- modificada, y al final se intenta validarlas contra las filas antiguas. Si alguna
-- fila antigua las incumple, la restricción queda activa para lo nuevo y se avisa con
-- un NOTICE para que corrijas esos datos y repitas la migración.
--
-- Es idempotente (se puede repetir). Orden: 1) desplegar la API nueva  2) esta migración.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Funciones SP_* heredadas: la API no las usa (habla con PostgREST). Eran
--    superficie de ataque: SP_IniciarSesion comparaba contraseñas en texto plano y
--    SP_ListarUsuarios devolvía la columna Contrasena.
-- -----------------------------------------------------------------------------
DO $$
DECLARE f record;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure AS firma
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname LIKE 'SP\_%'
    LOOP
        EXECUTE 'DROP FUNCTION ' || f.firma || ' CASCADE';
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Restricciones CHECK (mismos límites que src/services/validacion.ts)
-- -----------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('Usuario', 'ck_usuario_nombres', $c$char_length(btrim("NombreUsuario")) BETWEEN 1 AND 100 AND char_length(btrim("ApellidoUsuario")) BETWEEN 1 AND 100$c$),
        ('Usuario', 'ck_usuario_correo', $c$"Correo" = lower(btrim("Correo")) AND "Correo" ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'$c$),
        ('Usuario', 'ck_usuario_telefono', $c$"Telefono" IS NULL OR "Telefono" = '' OR "Telefono" ~ '^\+?[0-9 ()-]{7,20}$'$c$),
        -- Solo hashes bcrypt: nunca más una contraseña en texto plano o SHA-512 sin sal
        ('Usuario', 'ck_usuario_contrasena', $c$"Contrasena" LIKE '$2%'$c$),
        ('Usuario', 'ck_usuario_estado', $c$"Estado" IN ('Activo', 'Inactivo')$c$),

        ('Rol', 'ck_rol_nombre', $c$char_length(btrim("NombreRol")) >= 1$c$),
        ('Municipio', 'ck_municipio_nombre', $c$char_length(btrim("NombreMunicipio")) >= 1$c$),
        ('MetodoDePago', 'ck_metodo_nombre', $c$char_length(btrim("NombreMetodoDePago")) >= 1$c$),

        ('Finca', 'ck_finca_basicos', $c$char_length(btrim("NombreFinca")) >= 1
            AND "Precio" BETWEEN 1 AND 20000000
            AND "Capacidad" BETWEEN 1 AND 500
            AND "Calificacion" BETWEEN 1 AND 5
            AND "Estado" IN ('Disponible', 'No disponible')
            AND cardinality("Comodidades") <= 30$c$),

        -- Precio máximo x 90 noches cabe en un INT: el monto nunca desborda
        ('Reserva', 'ck_reserva_fechas', $c$"FechaEntrada" IS NOT NULL AND "FechaSalida" IS NOT NULL
            AND "FechaSalida" > "FechaEntrada"
            AND "FechaSalida" - "FechaEntrada" <= INTERVAL '90 days'$c$),
        ('Reserva', 'ck_reserva_monto', $c$"MontoReserva" > 0$c$),
        ('Reserva', 'ck_reserva_estado', $c$"Estado" IN ('Pendiente', 'Activa', 'Confirmada', 'Finalizada', 'Cancelada')$c$),

        ('Factura', 'ck_factura_total', $c$"Total" >= 0$c$),

        ('Pago', 'ck_pago_monto', $c$"Monto" > 0$c$),
        ('Pago', 'ck_pago_estado', $c$"EstadoPago" IN ('Pendiente', 'Pagado', 'Rechazado')$c$)
    ) AS v(tabla, nombre, expr)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = r.nombre) THEN
            EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID', r.tabla, r.nombre, r.expr);
        END IF;
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Unicidad y reservas sin solapes. Si los datos actuales la incumplen, se avisa y
--    se sigue: corrige los duplicados/solapes listados y repite la migración.
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
    -- "Ana@x.com" y "ana@x.com" son la misma cuenta
    CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_correo_lower ON public."Usuario" (lower("Correo"));
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Hay correos repetidos sin distinguir mayúsculas: SELECT lower("Correo"), count(*) FROM public."Usuario" GROUP BY 1 HAVING count(*) > 1;';
END $$;

DO $$
BEGIN
    -- Una reserva tiene una sola factura
    CREATE UNIQUE INDEX IF NOT EXISTS ux_factura_reserva ON public."Factura" ("IdReserva");
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Hay reservas con más de una factura: SELECT "IdReserva", count(*) FROM public."Factura" GROUP BY 1 HAVING count(*) > 1;';
END $$;

DO $$
BEGIN
    -- Dos reservas vivas de la misma finca no pueden compartir noches, ni con peticiones simultáneas
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ex_reserva_sin_solape') THEN
        ALTER TABLE public."Reserva" ADD CONSTRAINT ex_reserva_sin_solape
            EXCLUDE USING gist ("IdFinca" WITH =, tsrange("FechaEntrada", "FechaSalida") WITH &&)
            WHERE (lower("Estado") NOT IN ('cancelada', 'cancelado', 'anulada', 'anulado'));
    END IF;
EXCEPTION WHEN exclusion_violation THEN
    RAISE NOTICE 'Hay reservas solapadas en la misma finca: cancélalas o corrígelas y repite la migración.';
END $$;

-- -----------------------------------------------------------------------------
-- 4. Pagos: lo pagado de una factura nunca supera su total (evita pagar dos veces).
--    FOR UPDATE sobre la factura serializa pagos simultáneos de la misma factura.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_pago_no_excede_factura()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_total INT;
    v_pagado BIGINT;
BEGIN
    IF NEW."EstadoPago" IS DISTINCT FROM 'Pagado' THEN
        RETURN NEW;
    END IF;
    SELECT "Total" INTO v_total FROM public."Factura" WHERE "IdFactura" = NEW."IdFactura" FOR UPDATE;
    SELECT COALESCE(SUM("Monto"), 0) INTO v_pagado
    FROM public."Pago"
    WHERE "IdFactura" = NEW."IdFactura" AND "EstadoPago" = 'Pagado' AND "IdPago" <> NEW."IdPago";
    IF v_pagado + NEW."Monto" > v_total THEN
        RAISE EXCEPTION 'La factura ya está pagada o el pago supera el saldo pendiente.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_pago_no_excede_factura ON public."Pago";
CREATE TRIGGER tg_pago_no_excede_factura
    BEFORE INSERT OR UPDATE ON public."Pago"
    FOR EACH ROW EXECUTE FUNCTION public.fn_pago_no_excede_factura();

-- -----------------------------------------------------------------------------
-- 5. Validar las restricciones contra las filas antiguas (las que pasen quedan VALID)
-- -----------------------------------------------------------------------------
DO $$
DECLARE c record;
BEGIN
    FOR c IN
        SELECT conrelid::regclass AS tabla, conname
        FROM pg_constraint
        WHERE NOT convalidated AND contype = 'c' AND connamespace = 'public'::regnamespace
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', c.tabla, c.conname);
        EXCEPTION WHEN check_violation THEN
            RAISE NOTICE 'Filas antiguas de % incumplen %: aplica a lo nuevo; corrige esas filas y repite la migración.', c.tabla, c.conname;
        END;
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Permisos: lo nuevo tampoco queda al alcance de la clave publishable (anon)
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.fn_pago_no_excede_factura() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- Verificación 1: restricciones que siguen pendientes de validar (ideal: 0 filas)
SELECT conrelid::regclass AS tabla, conname AS restriccion
FROM pg_constraint
WHERE NOT convalidated AND connamespace = 'public'::regnamespace;

-- Verificación 2: políticas de Storage. Solo debe haber lectura; cualquier INSERT/UPDATE/DELETE
-- para anon o authenticated permitiría subir o borrar imágenes sin pasar por la API.
SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
