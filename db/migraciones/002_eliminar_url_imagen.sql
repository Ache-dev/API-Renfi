-- =============================================================================
-- MIGRACIÓN 002: eliminar Imagen."UrlImagen"
-- Desde ahora todas las imágenes viven en Supabase Storage y se identifican por
-- "RutaStorage". La API sigue devolviendo un campo "UrlImagen", pero lo calcula a
-- partir de la ruta del bucket (ya no es una columna).
--
-- ORDEN: 1) migrar las imágenes (npm run migrar:imagenes -- --ejecutar)
--        2) desplegar la API que ya no usa UrlImagen
--        3) ejecutar este script
-- Si alguna imagen aún no está en Storage, el script se detiene SIN cambiar nada.
-- Es idempotente.
-- =============================================================================

DO $$
DECLARE
    pendientes INT;
BEGIN
    -- Solo se valida mientras exista la columna (si ya se eliminó, no hay nada que revisar)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Imagen' AND column_name = 'UrlImagen'
    ) THEN
        SELECT COUNT(*) INTO pendientes FROM public."Imagen" WHERE "RutaStorage" IS NULL;
        IF pendientes > 0 THEN
            RAISE EXCEPTION 'Hay % imagen(es) sin RutaStorage: ejecuta primero la migración de imágenes a Storage. No se cambió nada.', pendientes;
        END IF;
    END IF;
END $$;

-- La restricción de 001 exigía UrlImagen o RutaStorage; ahora RutaStorage es obligatoria
ALTER TABLE public."Imagen" DROP CONSTRAINT IF EXISTS ck_imagen_origen;
ALTER TABLE public."Imagen" ALTER COLUMN "RutaStorage" SET NOT NULL;

-- Funciones heredadas que usaban UrlImagen (la API ya no usa funciones SP_*)
DROP FUNCTION IF EXISTS public."SP_ListarImagenes"();
DROP FUNCTION IF EXISTS public."SP_RegistrarImagen"(VARCHAR, INT);
DROP FUNCTION IF EXISTS public."SP_ActualizarImagen"(INT, VARCHAR, INT);

ALTER TABLE public."Imagen" DROP COLUMN IF EXISTS "UrlImagen";

-- Refrescar el esquema que expone la API REST de Supabase
NOTIFY pgrst, 'reload schema';

-- Verificación: debe devolver las columnas sin "UrlImagen" y con "RutaStorage" NOT NULL
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Imagen'
ORDER BY ordinal_position;
