-- =============================================================================
-- MIGRACIÓN 001: imágenes en Supabase Storage y ficha completa de la finca
-- Ejecutar en SQL Editor de Supabase. Es idempotente (se puede repetir).
-- Orden sugerido: 1) esta migración  2) desplegar la API nueva  3) db/seguridad.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. IMAGEN: metadatos y orden de la galería
--    RutaStorage guarda la ruta dentro del bucket (no la URL completa), así se
--    puede cambiar de bucket o dominio sin tocar los datos. UrlImagen queda para
--    imágenes externas ya existentes.
-- -----------------------------------------------------------------------------
ALTER TABLE public."Imagen"
    ADD COLUMN IF NOT EXISTS "RutaStorage"      VARCHAR(300),
    ADD COLUMN IF NOT EXISTS "Orden"            INT       NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "EsPortada"        BOOLEAN   NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS "TextoAlternativo" VARCHAR(200),
    ADD COLUMN IF NOT EXISTS "TipoMime"         VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "TamanoBytes"      INT,
    ADD COLUMN IF NOT EXISTS "Ancho"            INT,
    ADD COLUMN IF NOT EXISTS "Alto"             INT,
    ADD COLUMN IF NOT EXISTS "FechaCreacion"    TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public."Imagen" ALTER COLUMN "UrlImagen" DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_imagen_origen') THEN
        ALTER TABLE public."Imagen"
            ADD CONSTRAINT ck_imagen_origen CHECK ("UrlImagen" IS NOT NULL OR "RutaStorage" IS NOT NULL);
    END IF;
END $$;

-- Imágenes existentes: ordenarlas por Id dentro de cada finca y marcar la primera como portada
WITH ordenadas AS (
    SELECT "IdImagen",
           ROW_NUMBER() OVER (PARTITION BY "IdFinca" ORDER BY "IdImagen") AS n
    FROM public."Imagen"
    WHERE "Orden" = 0
)
UPDATE public."Imagen" i
SET "Orden" = o.n
FROM ordenadas o
WHERE i."IdImagen" = o."IdImagen";

UPDATE public."Imagen" i
SET "EsPortada" = TRUE
WHERE i."Orden" = (SELECT MIN("Orden") FROM public."Imagen" x WHERE x."IdFinca" = i."IdFinca")
  AND NOT EXISTS (SELECT 1 FROM public."Imagen" p WHERE p."IdFinca" = i."IdFinca" AND p."EsPortada");

-- Una sola portada por finca y galería ordenada
CREATE UNIQUE INDEX IF NOT EXISTS "ux_imagen_portada" ON public."Imagen"("IdFinca") WHERE "EsPortada";
CREATE INDEX IF NOT EXISTS "idx_imagen_finca_orden" ON public."Imagen"("IdFinca", "Orden");

-- -----------------------------------------------------------------------------
-- 2. FINCA: ficha completa
-- -----------------------------------------------------------------------------
ALTER TABLE public."Finca"
    ADD COLUMN IF NOT EXISTS "Habitaciones"   INT          NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "Banos"          INT          NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "Camas"          INT          NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "NochesMinimas"  INT          NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "Comodidades"    TEXT[]       NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS "Reglas"         TEXT,
    ADD COLUMN IF NOT EXISTS "HoraEntrada"    TIME         NOT NULL DEFAULT '15:00',
    ADD COLUMN IF NOT EXISTS "HoraSalida"     TIME         NOT NULL DEFAULT '11:00',
    ADD COLUMN IF NOT EXISTS "PermiteMascotas" BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS "PermiteEventos"  BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS "Latitud"        NUMERIC(9,6),
    ADD COLUMN IF NOT EXISTS "Longitud"       NUMERIC(9,6),
    ADD COLUMN IF NOT EXISTS "FechaCreacion"  TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_finca_ficha') THEN
        ALTER TABLE public."Finca" ADD CONSTRAINT ck_finca_ficha CHECK (
            "Habitaciones" BETWEEN 0 AND 100
            AND "Banos" BETWEEN 0 AND 100
            AND "Camas" BETWEEN 0 AND 200
            AND "NochesMinimas" BETWEEN 1 AND 30
            AND ("Reglas" IS NULL OR char_length("Reglas") <= 1000)
            AND ("Latitud" IS NULL OR "Latitud" BETWEEN -90 AND 90)
            AND ("Longitud" IS NULL OR "Longitud" BETWEEN -180 AND 180)
            AND (("Latitud" IS NULL) = ("Longitud" IS NULL))
        );
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. STORAGE: bucket público de imágenes de fincas
--    - Lectura pública por URL (catálogo servido por la CDN de Supabase).
--    - Sin políticas de escritura: solo la API (clave secret) puede subir o borrar.
--    - La API convierte todo a WebP antes de subir, por eso solo se admite image/webp.
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('fincas-imagenes', 'fincas-imagenes', TRUE, 5242880, ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Refrescar el esquema que expone la API REST de Supabase
NOTIFY pgrst, 'reload schema';

-- Verificación: debe devolver el bucket y las columnas nuevas
SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'fincas-imagenes';
