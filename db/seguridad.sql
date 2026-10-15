-- =============================================================================
-- SEGURIDAD PARA UNA BASE SUPABASE YA CREADA
-- Ejecutar en SQL Editor SOLO cuando API-Renfi ya corra con la clave secret
-- (sb_secret_...) en SUPABASE_KEY y la app Expo ya no hable directo con Supabase.
-- Es idempotente: se puede ejecutar varias veces.
-- Efecto: la clave publishable (anon) deja de poder leer o escribir cualquier dato.
-- =============================================================================

-- 1. RLS activo en todas las tablas
ALTER TABLE public."Rol" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Municipio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Finca" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Imagen" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MetodoDePago" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Reserva" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Factura" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Pago" ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODAS las políticas existentes de las tablas (incluye las "Permitir_Todo_*")
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('Rol','Usuario','Municipio','Finca','Imagen','MetodoDePago','Reserva','Factura','Pago')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- 3. Quitar permisos a los roles públicos (tablas, secuencias y funciones SP_* / RPC)
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- 4. La API (clave secret = service_role) conserva acceso completo
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- 5. Verificación: esta consulta debe devolver 0 filas
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated');
