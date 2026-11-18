# Migrar los datos de Supabase a Azure Database for PostgreSQL

Pasos para ejecutar **tú**, en orden. Nada de esto lo ejecuta la API ni el repositorio.
Las contraseñas van en variables de entorno de tu terminal (nunca en el repo ni en el historial compartido).

## 0. Requisitos

- Cliente PostgreSQL (`pg_dump`, `pg_restore`, `psql`) de versión **igual o mayor** a la del servidor de Supabase.
- El servidor de Azure ya creado, con `azure.extensions` = `BTREE_GIST`, tu IP permitida en el firewall del servidor y SSL activo.
- Una ventana sin escrituras: pon la API actual en mantenimiento o detenla antes del paso 2, para que el volcado sea consistente.

```bash
# Origen (Supabase). Usa la conexión directa o el "Session pooler" (puerto 5432).
# NO uses el "Transaction pooler" (6543): pg_dump no funciona con él.
export SRC="postgresql://postgres:<contraseña-supabase>@db.<project-ref>.supabase.co:5432/postgres"

# Destino (Azure), como ADMINISTRADOR del servidor (no el rol renfi_app)
export DST="postgresql://<admin>:<contraseña-admin>@<servidor>.postgres.database.azure.com:5432/renfi?sslmode=require"
```

## 1. Crear el esquema en Azure (base vacía)

```bash
psql "$DST" -v ON_ERROR_STOP=1 -f db/azure/schema.sql
```

Esto crea tablas, restricciones, triggers, procedimientos y las filas semilla (roles, municipios, métodos de pago y el administrador de ejemplo).
Como tus datos reales traen sus propias filas de esas tablas, hay que vaciar **la base nueva de Azure** antes de restaurar:

```bash
# ⚠️ Destructivo, pero SOLO sobre la base nueva de Azure ($DST). Comprueba que $DST apunta a Azure:
echo "$DST" | sed 's#//[^@]*@#//***@#'
psql "$DST" -v ON_ERROR_STOP=1 -c 'TRUNCATE "Pago","Factura","Reserva","Imagen","Finca","Usuario","Municipio","MetodoDePago","Rol" RESTART IDENTITY CASCADE;'
```

## 2. Revisar que los datos de origen cumplen las reglas del esquema nuevo

El esquema de Azure tiene todas las restricciones **validadas**, y además cuotas (máx. 50 fincas por propietario, 10 imágenes por finca, 20 reservas pendientes por usuario). Si en el origen hay filas antiguas que las incumplen, `pg_restore` fallaría en esas filas. El diagnóstico es solo de lectura (solo `SELECT`):

```bash
psql "$SRC" -f db/azure/diagnostico_origen.sql
```

Cada consulta debe devolver 0 filas.

Corrige en el origen lo que aparezca antes de seguir.

## 3. Volcar solo los datos de las 9 tablas

Se vuelcan **solo los datos** y solo las tablas del dominio (nada de los esquemas internos de Supabase como `auth`, `storage` o `realtime`, ni sus roles, ni RLS):

```bash
pg_dump "$SRC" --data-only --no-owner --no-privileges --format=custom \
  -t 'public."Rol"' -t 'public."Usuario"' -t 'public."Municipio"' -t 'public."Finca"' \
  -t 'public."Imagen"' -t 'public."MetodoDePago"' -t 'public."Reserva"' -t 'public."Factura"' -t 'public."Pago"' \
  -f renfi_datos.dump
```

El archivo `renfi_datos.dump` contiene datos personales: guárdalo en un lugar seguro y bórralo al terminar (no lo subas al repo).

## 4. Restaurar en Azure

```bash
pg_restore --dbname="$DST" --data-only --no-owner --no-privileges --exit-on-error --single-transaction renfi_datos.dump
```

- `--single-transaction`: si algo falla, no queda nada a medias.
- No se usa `--disable-triggers` (requiere superusuario y Azure no lo da). No hace falta: `pg_restore` carga las tablas en orden de dependencias y el trigger de pagos solo comprueba que lo pagado no supere la factura.
- El volcado incluye el valor actual de las secuencias (`SEQUENCE SET`), así que los siguientes Ids continúan donde iban.

## 5. Verificar

```bash
# Conteos: deben coincidir en origen y destino
for t in Rol Usuario Municipio Finca Imagen MetodoDePago Reserva Factura Pago; do
  echo -n "$t  origen="; psql "$SRC" -Atc "SELECT count(*) FROM public.\"$t\""
  echo -n "$t  destino="; psql "$DST" -Atc "SELECT count(*) FROM public.\"$t\""
done

# Secuencias: el siguiente Id generado debe ser mayor que el máximo existente
psql "$DST" -c "SELECT max(\"IdFinca\") AS max_finca, nextval(pg_get_serial_sequence('\"Finca\"', 'IdFinca')) AS siguiente FROM \"Finca\";"
```

Si alguna secuencia quedó por detrás del máximo, avánzala:

```sql
SELECT setval(pg_get_serial_sequence('"Usuario"', 'NumeroDocumento'), (SELECT MAX("NumeroDocumento") FROM "Usuario"));
-- igual para "Finca"/IdFinca, "Imagen"/IdImagen, "Reserva"/IdReserva, "Factura"/IdFactura, "Pago"/IdPago,
-- "Rol"/IdRol, "Municipio"/IdMunicipio y "MetodoDePago"/IdMetodoDePago
```

## 6. Rol de la API y prueba de humo

```bash
# Crea el rol si aún no existe y vuelve a ejecutar la sección 8 de schema.sql (concede EXECUTE sobre los sp_*)
psql "$DST" -c "CREATE ROLE renfi_app LOGIN PASSWORD '<contraseña-larga>';"
psql "$DST" -c "DO \$\$ DECLARE f record; BEGIN GRANT USAGE ON SCHEMA public TO renfi_app; FOR f IN SELECT p.oid::regprocedure AS firma FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname LIKE 'sp\_%' LOOP EXECUTE 'GRANT EXECUTE ON FUNCTION ' || f.firma || ' TO renfi_app'; END LOOP; END \$\$;"

# Apunta DATABASE_URL (en tu .env local) al rol renfi_app y arranca la API
npm start
```

Las imágenes se copian aparte con `scripts/migrar-storage.sh` (las rutas `RutaStorage` no cambian, así que no hay que tocar la base).

## 7. Después

- El esquema no trae contraseña de administrador: tras restaurar tus usuarios reales ya tienes los tuyos. Si migraste sin administrador, créalo con `ADMIN_CONTRASENA='<clave-larga>' npm run crear-admin`.
- Borra `renfi_datos.dump`.
- Deja el proyecto de Supabase en solo lectura unos días como respaldo antes de eliminarlo.
