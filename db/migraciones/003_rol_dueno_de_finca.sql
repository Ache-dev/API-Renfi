-- =============================================================================
-- MIGRACIÓN 003: rol "Dueño de finca"
-- Un dueño de finca puede publicar fincas a su nombre, personalizar su ficha y
-- galería, y ver las reservas y pagos que reciben SUS fincas (nada de las demás).
-- La API reconoce el rol por su NOMBRE ("Dueño de finca"), no por su Id.
--
-- El seed anterior traía un rol 3 llamado "Propietario": si existe se renombra
-- (así los usuarios que ya lo tenían pasan a ser dueños de finca sin tocar nada).
-- Es idempotente (se puede repetir). Orden: 1) esta migración  2) desplegar la API nueva.
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public."Rol" WHERE "NombreRol" = 'Dueño de finca') THEN
        RAISE NOTICE 'El rol "Dueño de finca" ya existe: no se cambia nada.';
    ELSIF EXISTS (SELECT 1 FROM public."Rol" WHERE "NombreRol" = 'Propietario') THEN
        UPDATE public."Rol" SET "NombreRol" = 'Dueño de finca' WHERE "NombreRol" = 'Propietario';
    ELSE
        -- El seed insertó Ids explícitos sin avanzar la secuencia: se alinea antes de insertar
        PERFORM setval(pg_get_serial_sequence('public."Rol"', 'IdRol'), GREATEST((SELECT COALESCE(MAX("IdRol"), 0) FROM public."Rol"), 1));
        INSERT INTO public."Rol" ("NombreRol") VALUES ('Dueño de finca');
    END IF;
END $$;

-- Refrescar el esquema que expone la API REST de Supabase
NOTIFY pgrst, 'reload schema';

-- Verificación: debe listar los roles, incluido "Dueño de finca"
SELECT "IdRol", "NombreRol" FROM public."Rol" ORDER BY "IdRol";
