# Manual técnico — Despliegue de Renfi en Microsoft Azure

Este documento describe la infraestructura de producción de Renfi en Azure, las decisiones que la definieron y el procedimiento completo, paso a paso, para reproducir el despliegue, actualizarlo, operarlo y desmontarlo. Cubre los dos repositorios del proyecto:

| Repositorio | Contenido | Tecnología |
|---|---|---|
| `Renfi` | Aplicación web (portal público, panel del administrador y panel "Mi finca" del dueño) | Angular 20, Bootstrap 5.3 |
| `API-Renfi` | API REST, esquema de base de datos y scripts de migración | Node.js 22, Express 5, TypeScript, PostgreSQL 16 |

> **Fecha del despliegue:** 19 de noviembre de 2026.
> **Suscripción:** Azure for Students (tenant *Tecnológico de Antioquia Institución Universitaria*).
> **Objetivo de diseño:** el menor costo posible dentro del crédito estudiantil, sin sacrificar seguridad básica (TLS, secretos fuera del código, mínimo privilegio).

---

## Índice

1. [Datos clave del entorno](#1-datos-clave-del-entorno)
2. [Arquitectura](#2-arquitectura)
3. [Restricciones de la suscripción y decisiones tomadas](#3-restricciones-de-la-suscripción-y-decisiones-tomadas)
4. [Inventario de recursos y configuración](#4-inventario-de-recursos-y-configuración)
5. [Costos](#5-costos)
6. [Requisitos previos](#6-requisitos-previos)
7. [Procedimiento de despliegue paso a paso](#7-procedimiento-de-despliegue-paso-a-paso)
8. [Variables de entorno de producción](#8-variables-de-entorno-de-producción)
9. [Seguridad](#9-seguridad)
10. [Verificación (pruebas de humo)](#10-verificación-pruebas-de-humo)
11. [Operación y mantenimiento](#11-operación-y-mantenimiento)
12. [Problemas encontrados y soluciones](#12-problemas-encontrados-y-soluciones)
13. [Limitaciones conocidas y mejoras futuras](#13-limitaciones-conocidas-y-mejoras-futuras)
14. [Desmontar el entorno](#14-desmontar-el-entorno)
15. [Anexo A — Script completo de despliegue](#anexo-a--script-completo-de-despliegue)
16. [Anexo B — Glosario](#anexo-b--glosario)

---

## 1. Datos clave del entorno

| Elemento | Valor |
|---|---|
| **URL de la aplicación web** | https://strenfiz0a193.z14.web.core.windows.net |
| **URL base de la API** | https://api-renfi-z0a193.azurewebsites.net/api |
| **URL pública de imágenes** | `https://strenfiz0a193.blob.core.windows.net/fincas-imagenes/<ruta>` |
| **Servidor PostgreSQL** | `pg-renfi-z0a193.postgres.database.azure.com:5432`, base `renfi` |
| **Grupo de recursos** | `rg-renfi` |
| **Sufijo de nombres** | `z0a193` (garantiza nombres únicos a nivel global) |
| **Suscripción** | Azure for Students — `b25319a6-2f30-46cb-85d5-5cd0b5c6b1b5` |
| **Regiones** | `northcentralus` (base de datos y almacenamiento), `belgiumcentral` (API) |
| **Costo mensual estimado** | ≈ USD 16–17 (prácticamente todo es la base de datos) |

Las contraseñas **no** están en este documento ni en los repositorios. Ver [§9.6 Gestión de secretos](#96-gestión-de-secretos).

---

## 2. Arquitectura

### 2.1 Diagrama

```
                         ┌──────────────────────────────────────────────┐
                         │                 Navegador                    │
                         │  (portal público, panel admin, "Mi finca")   │
                         └───────┬──────────────────┬──────────────┬────┘
               1. HTML/JS/CSS    │   2. Llamadas    │  3. Imágenes │
                  (HTTPS)        │   REST + JWT     │   (HTTPS,    │
                                 │   (HTTPS, CORS)  │   anónimo)   │
                                 ▼                  │              ▼
 ┌────────────────────────────────────────┐         │   ┌───────────────────────────────┐
 │ Storage Account  strenfiz0a193         │         │   │ Storage Account strenfiz0a193 │
 │ Sitio web estático (contenedor $web)   │         │   │ Contenedor  fincas-imagenes   │
 │ Angular compilado · northcentralus     │         │   │ (lectura pública de blobs)    │
 └────────────────────────────────────────┘         │   └───────────────▲───────────────┘
                                                    ▼                   │ 5. Subir / borrar
                              ┌──────────────────────────────────────┐  │    (identidad
                              │ App Service  api-renfi-z0a193        │──┘    administrada,
                              │ Linux · Node 22 LTS · plan F1 gratis │       rol Storage Blob
                              │ Express 5 + sharp · belgiumcentral   │       Data Contributor)
                              └──────────────────┬───────────────────┘
                                                 │ 4. SQL sobre TLS (rol renfi_app,
                                                 │    solo EXECUTE sobre funciones sp_*)
                                                 ▼
                              ┌──────────────────────────────────────┐
                              │ PostgreSQL Flexible Server 16        │
                              │ pg-renfi-z0a193 · Burstable B1ms     │
                              │ 32 GB · backups 7 días · northcentral│
                              └──────────────────────────────────────┘
```

### 2.2 Flujo de una petición

1. El navegador descarga la aplicación Angular desde el **sitio web estático** de la cuenta de almacenamiento. Cualquier ruta que no exista como archivo (por ejemplo `/fincas/3`) devuelve `index.html`, y el router de Angular resuelve la vista.
2. Angular llama a la API en `https://api-renfi-z0a193.azurewebsites.net/api/...`. La URL está compilada dentro de la aplicación (`src/environments/environment.ts`). Las rutas protegidas llevan el token JWT en la cabecera `Authorization: Bearer ...`.
3. Las imágenes de las fincas se cargan **directamente desde Blob Storage**, sin pasar por la API. La API solo entrega la URL pública (`UrlImagen`).
4. La API consulta PostgreSQL por TLS con el rol `renfi_app`. Ese rol no puede leer tablas: solo puede ejecutar los procedimientos `sp_*` definidos en `db/azure/schema.sql`.
5. Cuando un administrador o dueño sube una foto, la API la recibe (máximo 5 MB), la convierte a WebP con `sharp` y la guarda en el contenedor `fincas-imagenes` usando su **identidad administrada**. No hay claves de almacenamiento en la configuración.

### 2.3 Componentes y responsabilidad

| Componente | Servicio Azure | Responsabilidad |
|---|---|---|
| Frontend | Storage Account → *Static website* | Servir los archivos estáticos de Angular por HTTPS |
| API | App Service (Linux, plan F1) | Lógica de negocio, autenticación JWT, validación, procesamiento de imágenes |
| Base de datos | Azure Database for PostgreSQL – Flexible Server | Datos del dominio, reglas de negocio en procedimientos y triggers |
| Imágenes | Storage Account → Blob, contenedor `fincas-imagenes` | Almacenar y servir las fotos de fincas |
| Identidad | Identidad administrada asignada por el sistema | Permitir a la API escribir en Blob Storage sin secretos |

---

## 3. Restricciones de la suscripción y decisiones tomadas

La suscripción **Azure for Students** impone límites que no aparecen en la documentación general de Azure y que condicionaron la arquitectura.

### 3.1 Política de regiones permitidas

La suscripción tiene asignada la política *"Allowed resource deployment regions"*. Solo se pueden crear recursos en:

| Región permitida | Uso en Renfi |
|---|---|
| `northcentralus` | PostgreSQL y Storage Account |
| `belgiumcentral` | App Service (plan y API) |
| `francecentral` | — (sin cuota para F1) |
| `brazilsouth` | — |
| `chilecentral` | — |

Se puede consultar en cualquier momento con:

```powershell
az policy assignment list --query "[].{politica:displayName,parametros:parameters}" -o json
```

> El grupo de recursos `rg-renfi` quedó en `eastus2`. Esto es válido, porque un grupo de recursos solo guarda metadatos y sus recursos pueden estar en otras regiones. La política solo restringe los recursos, no el grupo.

### 3.2 Decisiones por componente

| Necesidad | Primera opción | Qué pasó | Opción final | Motivo |
|---|---|---|---|---|
| Base de datos | PostgreSQL B1ms en `eastus2` | *"The location is restricted from performing this operation"* | PostgreSQL B1ms en `northcentralus` | Primera región permitida y de las más baratas |
| API | App Service F1 en `northcentralus` | *"Current Limit (F1 App Service instances): 0"* | App Service F1 en `belgiumcentral` | Única región permitida con cuota F1 (gratis) |
| Frontend | Azure Static Web Apps (Free) | *RequestDisallowedByAzure*: Static Web Apps solo existe en `eastus2`, `centralus`, `westus2`, `westeurope` y `eastasia`, y la política las bloquea todas | Sitio web estático de la Storage Account | Cuesta centavos, tiene HTTPS y reutiliza la cuenta de imágenes |
| Imágenes | Blob Storage Standard LRS Hot | Sin problemas | Igual | Lo más barato con lectura pública directa |

**Consecuencia de separar regiones:** la API (Bélgica) y la base de datos (EE. UU.) están en continentes distintos. Cada consulta a la base agrega aproximadamente 100 ms de ida y vuelta. Es aceptable para un proyecto académico; para producción real, ver [§13](#13-limitaciones-conocidas-y-mejoras-futuras).

### 3.3 Por qué estos SKU

- **PostgreSQL Burstable B1ms** (1 vCore, 2 GB RAM): es el nivel más pequeño de Flexible Server. Los niveles *General Purpose* cuestan entre 5 y 10 veces más. La carga de Renfi (un proyecto académico con poco tráfico) cabe de sobra en un núcleo con créditos de ráfaga.
- **32 GB de almacenamiento**: es el mínimo que admite Flexible Server. El crecimiento automático está desactivado para que el costo no suba solo.
- **Sin alta disponibilidad ni backup geo-redundante**: ambos duplican o encarecen el costo. Los backups locales de 7 días son gratuitos hasta el tamaño del almacenamiento aprovisionado.
- **App Service F1**: es gratuito. A cambio tiene 60 minutos de CPU al día, 1 GB de RAM, sin *Always On* y sin dominios personalizados con TLS.
- **Storage Standard LRS, nivel Hot**: replicación local (la más barata) y nivel Hot porque las imágenes se leen con frecuencia (el nivel Cool cobra por lectura).

---

## 4. Inventario de recursos y configuración

Todos los recursos están en el grupo `rg-renfi`.

### 4.1 PostgreSQL — `pg-renfi-z0a193`

| Parámetro | Valor |
|---|---|
| Tipo | Azure Database for PostgreSQL – Flexible Server |
| Versión | PostgreSQL 16 |
| SKU | `Standard_B1ms` (Burstable, 1 vCore, 2 GiB) |
| Almacenamiento | 32 GB, crecimiento automático desactivado |
| Región | `northcentralus` |
| Alta disponibilidad | Desactivada |
| Retención de backups | 7 días, sin backup geo-redundante |
| Acceso de red | Público, restringido por reglas de firewall |
| TLS obligatorio | `require_secure_transport = on` |
| Extensiones permitidas | `azure.extensions = BTREE_GIST` (la usa la restricción que impide reservas solapadas) |
| Usuario administrador | `renfiadmin` (solo para tareas de administración, nunca en la API) |
| Usuario de la aplicación | `renfi_app` (límite de 30 conexiones, solo `EXECUTE` sobre `sp_*`) |
| Base de datos | `renfi` |

**Reglas de firewall:**

| Regla | Rango | Propósito |
|---|---|---|
| `AllowAllAzureServicesAndResourcesWithinAzureIps_…` | `0.0.0.0` | Permite conexiones desde servicios de Azure (la API). Es la opción gratuita; la alternativa privada (VNet) requiere un plan de App Service de pago |
| `mi-ip` | `181.58.39.61` | IP del equipo desde el que se cargó el esquema. **Eliminar o actualizar** cuando cambie (ver [§11.8](#118-gestionar-el-firewall-de-la-base-de-datos)) |

**Contenido inicial cargado:**

| Script | Qué crea |
|---|---|
| `db/azure/schema.sql` | 9 tablas, restricciones, triggers, 68 procedimientos `sp_*`, permisos de `renfi_app`, filas semilla: 3 roles, 12 municipios, métodos de pago y el administrador base (inactivo y sin clave) |
| `db/azure/seed_demo.sql` | Usuarios de demostración con claves públicas y 6 fincas de ejemplo (ver [§9.5](#95-usuarios-de-demostración)) |

### 4.2 Storage Account — `strenfiz0a193`

| Parámetro | Valor |
|---|---|
| Tipo | StorageV2, `Standard_LRS`, nivel de acceso Hot |
| Región | `northcentralus` |
| TLS mínimo | 1.2 |
| Acceso público a blobs | Permitido (requerido por el contenedor de imágenes y el sitio estático) |
| Endpoint de blobs | `https://strenfiz0a193.blob.core.windows.net/` |
| Endpoint del sitio web | `https://strenfiz0a193.z14.web.core.windows.net/` |

| Contenedor | Acceso | Contenido |
|---|---|---|
| `$web` | Lo sirve el endpoint del sitio estático | Salida de `ng build` (`dist/MiPrimerApp/browser`) |
| `fincas-imagenes` | Lectura pública anónima de blobs (`blob`) | Fotos en WebP con ruta `finca-{IdFinca}/{uuid}.webp` y caché de 1 año (`immutable`) |

**Sitio web estático:** documento índice `index.html`, documento de error 404 `index.html`. Así, una ruta como `/fincas/3` devuelve la aplicación y Angular resuelve la vista. El código HTTP de esas rutas es 404, pero el contenido es correcto (ver [§13](#13-limitaciones-conocidas-y-mejoras-futuras)).

### 4.3 App Service — `plan-renfi` y `api-renfi-z0a193`

| Parámetro | Valor |
|---|---|
| Plan | `plan-renfi`, Linux, SKU **F1** (gratis), región `belgiumcentral` |
| Aplicación | `api-renfi-z0a193` |
| Pila | `NODE|22-lts` |
| Comando de inicio | `node dist/index.js` |
| Always On | Desactivado (F1 no lo permite) |
| Compilación en el servidor | Desactivada (`SCM_DO_BUILD_DURING_DEPLOYMENT=false`): se despliega ya compilado |
| Identidad | Asignada por el sistema |
| Rol de la identidad | `Storage Blob Data Contributor` sobre `strenfiz0a193` |
| TLS mínimo | 1.2 |
| FTP | Solo FTPS |
| HTTPS obligatorio | **No** (pendiente, ver [§9.7](#97-endurecimientos-pendientes)) |
| Puerto | Lo asigna App Service en la variable `PORT`; la API la lee automáticamente |

**Límites del plan F1 que conviene conocer:**

| Límite | Efecto en Renfi |
|---|---|
| 60 minutos de CPU al día | Si se agota, la API responde 403 hasta el día siguiente. Procesar imágenes con `sharp` es lo que más CPU consume |
| 1 GB de RAM | Suficiente; `sharp` procesa las imágenes de una en una (cupo interno) |
| Sin Always On | La app se descarga tras ~20 min sin tráfico; la siguiente petición tarda varios segundos (*cold start*) |
| Sin dominio propio con TLS | Se usa el dominio `azurewebsites.net` |

---

## 5. Costos

Precios de referencia en USD, aproximados y sujetos a cambios. Verifíquelos en la [calculadora de precios de Azure](https://azure.microsoft.com/pricing/calculator/) para la región correspondiente.

| Recurso | Concepto | Costo mensual aprox. |
|---|---|---|
| PostgreSQL B1ms | Cómputo (730 h) | USD 12–13 |
| PostgreSQL | 32 GB de almacenamiento | USD 3,5–4 |
| PostgreSQL | Backups (hasta 32 GB) | Incluido |
| App Service F1 | Plan gratuito | USD 0 |
| Storage Account | Almacenamiento y operaciones de imágenes y sitio | < USD 0,50 |
| Transferencia de datos | Salida a Internet (primeros 100 GB/mes gratis) | ≈ USD 0 |
| **Total** | | **≈ USD 16–17 / mes** |

Con el crédito de USD 100 de Azure for Students, esto alcanza para unos **6 meses** de funcionamiento continuo.

**Cómo gastar menos:**

- **Detener la base de datos cuando no se use.** Detenida, no se cobra el cómputo, solo el almacenamiento (≈ USD 4/mes). Azure la vuelve a encender automáticamente a los 7 días. Ver [§11.5](#115-detener-y-arrancar-la-base-de-datos).
- **Configurar una alerta de presupuesto.** Ver [§11.10](#1110-alerta-de-presupuesto).
- **No activar** alta disponibilidad, backup geo-redundante, crecimiento automático del almacenamiento ni planes de App Service de pago sin necesidad.

---

## 6. Requisitos previos

### 6.1 Herramientas en el equipo (Windows)

| Herramienta | Versión usada | Instalación | Para qué |
|---|---|---|---|
| Azure CLI | 2.93.0 | `winget install -e --id Microsoft.AzureCLI` | Crear y configurar recursos |
| Cliente PostgreSQL (`psql`) | 17.12 | `winget install -e --id PostgreSQL.PostgreSQL.17` con componentes de línea de comandos solamente | Cargar el esquema |
| Node.js | 24.x (local) | <https://nodejs.org> | Compilar API y frontend |
| `tar` | Incluido en Windows 10/11 | — | Crear el ZIP de despliegue de la API |

Instalación del cliente PostgreSQL **sin el servidor** (solo herramientas de línea de comandos):

```powershell
winget install -e --id PostgreSQL.PostgreSQL.17 --accept-package-agreements --accept-source-agreements `
  --override "--mode unattended --unattendedmodeui none --enable-components commandlinetools --disable-components server,pgAdmin,stackbuilder"
```

Si después de instalar los comandos no se reconocen en la misma terminal, agréguelos a la ruta de la sesión:

```powershell
$env:Path += ";C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin;C:\Program Files\PostgreSQL\17\bin"
```

### 6.2 Acceso a Azure

```powershell
az login --use-device-code   # abre https://login.microsoft.com/device e ingresa el código
az account show              # debe mostrar "Azure for Students"
```

La cuenta necesita el rol **Owner** (o *Contributor* + *User Access Administrator*) sobre la suscripción, porque el despliegue asigna un rol a la identidad administrada.

### 6.3 Proveedores de recursos

En una suscripción nueva hay que registrar los proveedores una vez:

```powershell
az provider register -n Microsoft.DBforPostgreSQL --wait
az provider register -n Microsoft.Web --wait
az provider register -n Microsoft.Storage --wait
```

---

## 7. Procedimiento de despliegue paso a paso

Los comandos están en **PowerShell** y son los que efectivamente funcionaron con Azure CLI 2.93. El [Anexo A](#anexo-a--script-completo-de-despliegue) los reúne en un solo script.

### Paso 0 — Variables

```powershell
$SUF = "z0a193"                 # sufijo único: letras minúsculas y números
$RG  = "rg-renfi"
$LOC_DATOS = "northcentralus"   # PostgreSQL y Storage
$LOC_API   = "belgiumcentral"   # App Service (única región permitida con cuota F1)
$PG  = "pg-renfi-$SUF"
$ST  = "strenfi$SUF"            # máx. 24 caracteres, solo minúsculas y números
$APP = "api-renfi-$SUF"

# Contraseñas: solo letras y números, porque van dentro de una URL de conexión
function Nueva-Clave { -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 24 | % {[char]$_}) }
$ADMIN_PW = Nueva-Clave    # administrador del servidor PostgreSQL
$APP_PW   = Nueva-Clave    # rol renfi_app que usa la API
```

> Guarde `$ADMIN_PW` y `$APP_PW` en un gestor de contraseñas **antes de seguir**. Si se pierden, se pueden restablecer (ver [§11.7](#117-rotar-contraseñas-y-secretos)), pero es trabajo extra.

### Paso 1 — Grupo de recursos

```powershell
az group create -n $RG -l eastus2
```

### Paso 2 — Servidor PostgreSQL

```powershell
az postgres flexible-server create -g $RG -n $PG -l $LOC_DATOS `
  --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 16 `
  --admin-user renfiadmin --admin-password $ADMIN_PW `
  --public-access 0.0.0.0 --backup-retention 7 --yes
```

- Tarda entre 5 y 10 minutos.
- `--public-access 0.0.0.0` crea la regla que permite el acceso desde servicios de Azure.
- En Azure CLI 2.93 **no** se deben usar `--high-availability` (ya no existe; la HA está desactivada por defecto) ni `--database-name` (solo aplica a clústeres elásticos). La base se crea en el paso siguiente.

**Extensión, base de datos y firewall:**

```powershell
# Permitir btree_gist (la usa el esquema para impedir reservas que se solapan)
az postgres flexible-server parameter set -g $RG --server-name $PG --name azure.extensions --value BTREE_GIST

# Crear la base de datos
az postgres flexible-server db create -g $RG -s $PG --name renfi

# Permitir la IP del equipo que va a cargar el esquema
$IP = Invoke-RestMethod https://api.ipify.org
az postgres flexible-server firewall-rule create -g $RG -s $PG --name mi-ip --start-ip-address $IP --end-ip-address $IP
```

> Ojo con los nombres de los argumentos: en `firewall-rule` y `db`, el servidor va en `-s`/`--server-name` y `--name` es el nombre de la regla o de la base.

### Paso 3 — Esquema y datos iniciales

Desde la carpeta del repositorio `API-Renfi`:

```powershell
$DST = "postgresql://renfiadmin:$ADMIN_PW@$PG.postgres.database.azure.com:5432/renfi?sslmode=require"

# 1) Crear el rol de la API ANTES del esquema: la sección 8 de schema.sql le concede
#    EXECUTE sobre los sp_* solo si el rol ya existe.
psql $DST -v ON_ERROR_STOP=1 -c "CREATE ROLE renfi_app LOGIN PASSWORD '$APP_PW' CONNECTION LIMIT 30;"

# 2) Esquema: tablas, triggers, procedimientos, permisos y filas semilla
psql $DST -v ON_ERROR_STOP=1 -q -f db/azure/schema.sql

# 3) (Opcional, SOLO demostración) usuarios con claves públicas y 6 fincas de ejemplo
psql $DST -v ON_ERROR_STOP=1 -v permitir_demo=1 -q -f db/azure/seed_demo.sql
```

Durante el paso 2 aparecen avisos como `WARNING: no privileges could be revoked for "gbt_..."`. **Son inofensivos:** el esquema revoca permisos de forma general y las funciones internas de la extensión `btree_gist` no los tenían.

**Comprobación:**

```powershell
@'
select 'roles', count(*) from "Rol"
union all select 'municipios', count(*) from "Municipio"
union all select 'procedimientos sp_', count(*) from pg_proc where proname like 'sp\_%'
union all select 'permisos renfi_app', count(*) from information_schema.routine_privileges where grantee = 'renfi_app';
'@ | psql $DST -At
```

Resultado esperado: 3 roles, 12 municipios, 68 procedimientos y 68 permisos.

> Si la base viene de Supabase u otro PostgreSQL con datos reales, en lugar del paso 3 siga `db/azure/migrar_datos.md`, y para las imágenes `scripts/migrar-storage.sh`.

### Paso 4 — Storage Account, contenedor de imágenes y sitio estático

```powershell
az storage account create -n $ST -g $RG -l $LOC_DATOS `
  --sku Standard_LRS --kind StorageV2 --access-tier Hot `
  --allow-blob-public-access true --min-tls-version TLS1_2

# Contenedor de imágenes con lectura pública anónima de blobs (no de listados)
az storage container create --account-name $ST -n fincas-imagenes --public-access blob --auth-mode key

# Sitio web estático para el frontend (crea el contenedor $web)
az storage blob service-properties update --account-name $ST --auth-mode key `
  --static-website --index-document index.html --404-document index.html

az storage account show -n $ST -g $RG --query "primaryEndpoints.web" -o tsv   # URL del frontend
```

`--auth-mode key` hace que la CLI obtenga la clave de la cuenta usando los permisos de *Owner* del usuario. Muestra advertencias largas recomendando otras formas de autenticación; se pueden ignorar.

### Paso 5 — App Service para la API

```powershell
# Plan gratuito F1 (Linux)
az appservice plan create -g $RG -n plan-renfi --is-linux --sku F1 -l $LOC_API

# Aplicación con Node 22 LTS (ver opciones: az webapp list-runtimes --os linux)
az webapp create -g $RG -p plan-renfi -n $APP --runtime "NODE:22-lts"
az webapp config set -g $RG -n $APP --startup-file "node dist/index.js" --always-on false
```

**Identidad administrada con acceso a Blob Storage:**

```powershell
$PRINCIPAL = az webapp identity assign -g $RG -n $APP --query principalId -o tsv
$STID = az storage account show -n $ST -g $RG --query id -o tsv
az role assignment create --assignee-object-id $PRINCIPAL --assignee-principal-type ServicePrincipal `
  --role "Storage Blob Data Contributor" --scope $STID
```

El código (`src/conexion/storage.ts`) usa `DefaultAzureCredential` cuando no hay `AZURE_STORAGE_CONNECTION_STRING`, de modo que en Azure se autentica con esta identidad sin ningún secreto.

**Configuración (variables de entorno):**

```powershell
$JWT = node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
$WEB = (az storage account show -n $ST -g $RG --query "primaryEndpoints.web" -o tsv).TrimEnd('/')

az webapp config appsettings set -g $RG -n $APP --settings `
  NODE_ENV=production `
  "DATABASE_URL=postgresql://renfi_app:$APP_PW@$PG.postgres.database.azure.com:5432/renfi?sslmode=require" `
  DB_POOL_MAX=5 `
  "JWT_SECRET=$JWT" JWT_EXPIRES_IN=1d `
  "AZURE_STORAGE_ACCOUNT_URL=https://$ST.blob.core.windows.net" `
  AZURE_STORAGE_CONTAINER=fincas-imagenes `
  "CORS_ORIGIN=$WEB" `
  SCM_DO_BUILD_DURING_DEPLOYMENT=false
```

El significado de cada variable está en la [§8](#8-variables-de-entorno-de-producción).

### Paso 6 — Compilar y desplegar la API

App Service ejecuta Linux, y la dependencia `sharp` trae binarios nativos por plataforma. Por eso las dependencias de producción se instalan **para Linux x64 con glibc** aunque se compile desde Windows, en una carpeta temporal para no tocar el `node_modules` local:

```powershell
cd C:\ruta\a\API-Renfi
npm ci                               # dependencias completas (incluye TypeScript)
Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue
npm run build                        # tsc → dist/ ; debe terminar sin errores

$S = "$env:TEMP\renfi-api"
Remove-Item $S -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory $S | Out-Null
Copy-Item dist, package.json, package-lock.json $S -Recurse

Push-Location $S
npm ci --omit=dev --os=linux --cpu=x64 --libc=glibc   # solo producción, binarios de Linux
Remove-Item "$env:TEMP\renfi-api.zip" -ErrorAction SilentlyContinue
tar -a -cf "$env:TEMP\renfi-api.zip" *                 # ZIP con rutas compatibles con Linux
Pop-Location

az webapp deploy -g $RG -n $APP --src-path "$env:TEMP\renfi-api.zip" --type zip
```

Resultado esperado: `Status: Site started successfully` y `Deployment has completed successfully`. El ZIP pesa unos 26 MB.

> **Por qué `tar` y no `Compress-Archive`:** en Windows PowerShell 5.1, `Compress-Archive` guarda las rutas con barras invertidas (`\`), que Linux no interpreta como carpetas. El `tar` incluido en Windows genera un ZIP estándar.
>
> **Por qué no compilar en Azure:** la compilación remota (Oryx) instala las dependencias con `NODE_ENV=production` y omite TypeScript, que es una dependencia de desarrollo. Compilar localmente es más simple y predecible.

### Paso 7 — Compilar y desplegar el frontend

1. **Apuntar Angular a la API.** `angular.json` no define `fileReplacements`, así que la compilación de producción usa `src/environments/environment.ts`. Se actualizaron ese archivo y `environment.prod.ts`:

   ```ts
   export const environment = {
     production: true,
     apiUrl: 'https://api-renfi-z0a193.azurewebsites.net/api'
   };
   ```

2. **Compilar:**

   ```powershell
   cd C:\ruta\a\Renfi
   npm ci
   npm run build     # salida: dist/MiPrimerApp/browser
   ```

3. **Subir al contenedor `$web`:**

   ```powershell
   az storage blob upload-batch -s .\dist\MiPrimerApp\browser -d '$web' `
     --account-name $ST --auth-mode key --overwrite
   ```

   `'$web'` va entre comillas simples para que PowerShell no lo interprete como variable.

### Paso 8 — Ajustar CORS

Si en el paso 5 `CORS_ORIGIN` quedó con `*` (por ejemplo, porque la URL del frontend aún no existía), se restringe al origen real:

```powershell
az webapp config appsettings set -g $RG -n $APP --settings "CORS_ORIGIN=https://$ST.z14.web.core.windows.net"
```

Cambiar una variable reinicia la API automáticamente. El valor debe ir **sin barra final**.

### Paso 9 — Verificar

Ver la [§10](#10-verificación-pruebas-de-humo).

---

## 8. Variables de entorno de producción

Se definen en **App Service → Configuración → Variables de entorno** (o con `az webapp config appsettings set`). Nunca van en un archivo `.env` dentro del ZIP ni en el repositorio.

| Variable | Valor en producción | Descripción |
|---|---|---|
| `NODE_ENV` | `production` | Activa la verificación TLS estricta con PostgreSQL, `trust proxy = 1` y el modo de producción de Express |
| `PORT` | *(la define App Service)* | Puerto donde escucha Express. No se configura manualmente |
| `DATABASE_URL` | `postgresql://renfi_app:<clave>@pg-renfi-z0a193.postgres.database.azure.com:5432/renfi?sslmode=require` | Conexión con el rol de mínimo privilegio. **Secreto** |
| `DB_POOL_MAX` | `5` | Conexiones máximas por instancia. Debe cumplirse `instancias × DB_POOL_MAX ≤ 30` (límite del rol `renfi_app`); B1ms admite unas 50 conexiones en total |
| `TRUST_PROXY` | *(vacía → 1 en producción)* | Número de proxies delante de la API. Necesario para que el límite de peticiones vea la IP real del cliente |
| `JWT_SECRET` | 96 caracteres hexadecimales aleatorios | Firma de los tokens de sesión. Mínimo 32 caracteres o la API no arranca. **Secreto** |
| `JWT_EXPIRES_IN` | `1d` | Duración de la sesión |
| `AZURE_STORAGE_ACCOUNT_URL` | `https://strenfiz0a193.blob.core.windows.net` | Cuenta de almacenamiento, sin contenedor ni barra final |
| `AZURE_STORAGE_CONTAINER` | `fincas-imagenes` | Contenedor de imágenes |
| `AZURE_STORAGE_CONNECTION_STRING` | *(no definida)* | Solo para desarrollo. En Azure debe quedar vacía para usar la identidad administrada |
| `CORS_ORIGIN` | `https://strenfiz0a193.z14.web.core.windows.net` | Único origen autorizado a llamar la API desde un navegador |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` | Desactiva la compilación remota; el ZIP ya viene compilado |

La API valida al arrancar que existan `DATABASE_URL`, `AZURE_STORAGE_ACCOUNT_URL`, `AZURE_STORAGE_CONTAINER` y un `JWT_SECRET` válido, y que la base responda. Si algo falta, el proceso termina con un mensaje claro en los registros.

---

## 9. Seguridad

### 9.1 Cifrado en tránsito

- Navegador ↔ frontend, API e imágenes: HTTPS con certificados administrados por Microsoft (`*.web.core.windows.net`, `*.azurewebsites.net`, `*.blob.core.windows.net`).
- API ↔ PostgreSQL: TLS obligatorio en el servidor (`require_secure_transport = on`) y verificación del certificado en el cliente (`rejectUnauthorized: true` cuando `NODE_ENV=production`).
- TLS mínimo 1.2 en Storage y App Service.

### 9.2 Mínimo privilegio en la base de datos

- La API **no** usa el administrador `renfiadmin`. Usa `renfi_app`, que:
  - no tiene permisos sobre tablas ni vistas;
  - solo tiene `EXECUTE` sobre los 68 procedimientos `sp_*`;
  - tiene un límite de 30 conexiones y tiempos máximos (`statement_timeout = 15s`, `lock_timeout = 5s`, `idle_in_transaction_session_timeout = 10s`).
- Aunque existiera una inyección SQL en la API, el atacante solo podría invocar los mismos procedimientos que la aplicación ya expone.

### 9.3 Almacenamiento sin secretos

- La API escribe en Blob Storage con su **identidad administrada** y el rol `Storage Blob Data Contributor`. No hay claves de cuenta ni cadenas de conexión en la configuración.
- El contenedor `fincas-imagenes` permite **leer** blobs individuales de forma anónima, pero no listar el contenedor. Las rutas incluyen un UUID, así que no se pueden adivinar.
- Las subidas no sobrescriben archivos existentes (`ifNoneMatch: '*'`).

### 9.4 Protecciones de la API

| Protección | Valor |
|---|---|
| CORS | Solo el origen del frontend |
| Límite de peticiones por IP | 300 por minuto en total y 60 escrituras por minuto |
| Tamaño del cuerpo JSON | 100 KB |
| Tamaño de imagen | 5 MB, un archivo por petición, convertido a WebP |
| Tiempo máximo de petición | 60 s (cabeceras: 15 s) |
| Contraseñas | Hash bcrypt |
| Autorización | JWT; rutas de administración restringidas por rol y rutas de fincas por dueño |

### 9.5 Usuarios de demostración

Para la presentación del proyecto se cargó `db/azure/seed_demo.sql`, que activa los botones de **acceso rápido** de la pantalla de inicio de sesión:

| Correo | Rol |
|---|---|
| `admin@renfi.com` | Administrador |
| `cliente@renfi.com` | Cliente |
| `dueno@renfi.com` | Dueño de finca |
| `juan.perez@example.com` | Cliente |

> ⚠️ **Riesgo:** las contraseñas de estos usuarios están publicadas en el repositorio (`seed_demo.sql`) y la aplicación es pública. Cualquier persona puede entrar como administrador y modificar o borrar datos. Es aceptable **solo** mientras dure la demostración. Después, aplique [§11.7](#117-rotar-contraseñas-y-secretos) para cambiar las claves o desactivar los usuarios demo.

### 9.6 Gestión de secretos

| Secreto | Dónde vive | Quién lo usa |
|---|---|---|
| Clave de `renfiadmin` | Gestor de contraseñas del equipo | Personas, para administrar la base |
| Clave de `renfi_app` | Dentro de `DATABASE_URL` en la configuración de App Service | La API |
| `JWT_SECRET` | Configuración de App Service (no existe en ningún otro lugar) | La API |
| Claves de la Storage Account | Azure (las obtiene la CLI bajo demanda) | Solo la CLI al desplegar el frontend |

Reglas:

- Ningún secreto va en los repositorios. `.env` está en `.gitignore`.
- Las contraseñas generadas contienen solo letras y números para no romper la URL de conexión.
- Quien tenga rol *Owner* o *Contributor* sobre la suscripción puede ver la configuración de App Service: limite esos roles a quien los necesite.

### 9.7 Endurecimientos pendientes

| Pendiente | Comando | Prioridad |
|---|---|---|
| Forzar HTTPS en la API (hoy acepta HTTP) | `az webapp update -g rg-renfi -n api-renfi-z0a193 --https-only true` | Alta |
| Cambiar o desactivar usuarios demo tras la presentación | Ver [§11.7](#117-rotar-contraseñas-y-secretos) | Alta |
| Quitar la regla `mi-ip` cuando no se administre la base | Ver [§11.8](#118-gestionar-el-firewall-de-la-base-de-datos) | Media |
| Desactivar FTP por completo | `az webapp config set -g rg-renfi -n api-renfi-z0a193 --ftps-state Disabled` | Baja |

---

## 10. Verificación (pruebas de humo)

Pruebas realizadas al terminar el despliegue, con su resultado:

| # | Prueba | Comando | Resultado obtenido |
|---|---|---|---|
| 1 | La API responde y lee la base | `curl https://api-renfi-z0a193.azurewebsites.net/api/municipio` | 200, lista de 12 municipios |
| 2 | Catálogo de fincas | `curl https://api-renfi-z0a193.azurewebsites.net/api/finca` | 200, 6 fincas demo |
| 3 | Frontend | `curl -I https://strenfiz0a193.z14.web.core.windows.net/` | 200 |
| 4 | Rutas internas de Angular | `curl https://strenfiz0a193.z14.web.core.windows.net/fincas/1` | Devuelve `index.html` (con código 404, esperado) |
| 5 | CORS | Petición con cabecera `Origin` del frontend | `Access-Control-Allow-Origin: https://strenfiz0a193.z14.web.core.windows.net` |
| 6 | Inicio de sesión | `POST /api/usuario/login` con los tres usuarios demo | 200 en los tres |
| 7 | Subida de imagen (identidad administrada → Blob) | `POST /api/finca/1/imagenes` con token de administrador | 201, imagen convertida a WebP |
| 8 | Lectura pública de la imagen | `curl -I <UrlImagen>` | 200, `image/webp` |
| 9 | Borrado de imagen | `DELETE /api/imagen/1` | 200 (la imagen de prueba se eliminó) |

Ejemplo de prueba de inicio de sesión (Git Bash):

```bash
curl -s -X POST https://api-renfi-z0a193.azurewebsites.net/api/usuario/login \
  -H 'Content-Type: application/json' \
  -d '{"correo":"cliente@renfi.com","contrasena":"<clave>"}'
```

> La primera petición después de un rato sin uso puede tardar entre 10 y 30 segundos por el *cold start* del plan F1. Es normal.

---

## 11. Operación y mantenimiento

En todos los comandos: `$RG="rg-renfi"; $APP="api-renfi-z0a193"; $PG="pg-renfi-z0a193"; $ST="strenfiz0a193"`.

### 11.1 Publicar una nueva versión de la API

Repita el [Paso 6](#paso-6--compilar-y-desplegar-la-api). La API se reinicia sola al terminar el despliegue. Si se agregó una variable de entorno nueva, configúrela **antes** de desplegar.

Si el cambio modifica la base de datos (nuevas columnas o procedimientos), aplique primero el script SQL con `renfiadmin` y luego despliegue la API. Recuerde conceder `EXECUTE` a `renfi_app` sobre cualquier `sp_*` nuevo (la sección 8 de `schema.sql` lo hace si se vuelve a ejecutar).

### 11.2 Publicar una nueva versión del frontend

```powershell
cd C:\ruta\a\Renfi
npm run build
# Opcional: limpiar archivos antiguos (los nombres llevan hash y se acumulan)
az storage blob delete-batch -s '$web' --account-name $ST --auth-mode key
az storage blob upload-batch -s .\dist\MiPrimerApp\browser -d '$web' --account-name $ST --auth-mode key --overwrite
```

Durante los segundos entre el borrado y la subida, el sitio no está disponible. Si se omite el borrado, no hay corte, pero quedan archivos viejos sin uso (ocupan muy poco).

### 11.3 Ver registros de la API

```powershell
# Activar el registro de la consola del contenedor (una vez)
az webapp log config -g $RG -n $APP --docker-container-logging filesystem

# Ver en vivo
az webapp log tail -g $RG -n $APP

# Descargar
az webapp log download -g $RG -n $APP --log-file "$env:TEMP\logs-renfi.zip"
```

La API escribe una línea por petición con fecha, método y ruta, y los errores con el prefijo del módulo (por ejemplo `[Storage]`).

### 11.4 Reiniciar la API

```powershell
az webapp restart -g $RG -n $APP
```

### 11.5 Detener y arrancar la base de datos

```powershell
az postgres flexible-server stop  -g $RG -n $PG    # deja de cobrar el cómputo
az postgres flexible-server start -g $RG -n $PG    # tarda unos minutos
```

Con la base detenida, la API no arranca (verifica la conexión al iniciar) y responde con error. Azure enciende el servidor automáticamente a los 7 días de estar detenido.

### 11.6 Backups y restauración

- Azure hace backups automáticos completos y de los registros de transacciones, con **7 días** de retención.
- Permite restaurar a **cualquier momento** dentro de esos 7 días (*point-in-time restore*) en un **servidor nuevo**:

```powershell
az postgres flexible-server restore -g $RG -n pg-renfi-restaurado `
  --source-server $PG --restore-time "2026-11-20T15:00:00Z"
```

Después hay que apuntar `DATABASE_URL` al servidor restaurado (o copiar los datos de vuelta) y borrar el servidor que sobre para no pagar dos.

Para una copia manual (antes de un cambio riesgoso):

```powershell
pg_dump "postgresql://renfiadmin:<clave>@$PG.postgres.database.azure.com:5432/renfi?sslmode=require" `
  --format=custom -f renfi_respaldo.dump
```

El archivo contiene datos personales: guárdelo en un lugar seguro y no lo suba al repositorio.

### 11.7 Rotar contraseñas y secretos

**Clave del rol de la API (`renfi_app`):**

```powershell
psql $DST -c "ALTER ROLE renfi_app PASSWORD '<nueva-clave>';"
az webapp config appsettings set -g $RG -n $APP --settings `
  "DATABASE_URL=postgresql://renfi_app:<nueva-clave>@$PG.postgres.database.azure.com:5432/renfi?sslmode=require"
```

**Clave del administrador del servidor:**

```powershell
az postgres flexible-server update -g $RG -n $PG --admin-password "<nueva-clave>"
```

**Secreto JWT** (cierra la sesión de todos los usuarios):

```powershell
$JWT = node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
az webapp config appsettings set -g $RG -n $APP --settings "JWT_SECRET=$JWT"
```

**Usuarios de demostración.** Para desactivarlos tras la presentación:

```sql
UPDATE "Usuario" SET "Estado" = 'Inactivo'
WHERE "Correo" IN ('cliente@renfi.com', 'dueno@renfi.com', 'juan.perez@example.com');
```

Para el administrador, asigne una clave nueva y fuerte con el script del repositorio. Cree un `.env` temporal en `API-Renfi` con `DATABASE_URL` apuntando a Azure (con `renfiadmin`) y ejecute:

```powershell
$env:ADMIN_CONTRASENA = "<clave-larga-y-unica>"; npm run crear-admin
```

Borre el `.env` temporal al terminar.

### 11.8 Gestionar el firewall de la base de datos

```powershell
# Ver reglas
az postgres flexible-server firewall-rule list -g $RG -s $PG -o table

# Actualizar la IP de administración
$IP = Invoke-RestMethod https://api.ipify.org
az postgres flexible-server firewall-rule update -g $RG -s $PG --name mi-ip --start-ip-address $IP --end-ip-address $IP

# Quitarla cuando no se administre la base
az postgres flexible-server firewall-rule delete -g $RG -s $PG --name mi-ip --yes
```

**No** borre la regla `AllowAllAzureServicesAndResourcesWithinAzureIps_…`: la API dejaría de conectarse.

### 11.9 Escalar si F1 se queda corto

Síntomas: respuestas 403 *"The web app is stopped"* o *"Quota exceeded"* hacia el final del día, o lentitud constante.

```powershell
az appservice plan update -g $RG -n plan-renfi --sku B1          # ≈ USD 13/mes, sin límite de CPU diario
az webapp config set -g $RG -n $APP --always-on true             # elimina el cold start (no disponible en F1)
```

Para volver a F1: `az appservice plan update -g $RG -n plan-renfi --sku F1` (desactive antes Always On).

### 11.10 Alerta de presupuesto

En el portal: **Cost Management → Budgets → Add**, con alcance en la suscripción, por ejemplo USD 20 mensuales y alertas por correo al 50 %, 80 % y 100 %. El saldo restante del crédito estudiantil se consulta en <https://www.microsoftazuresponsorships.com/Balance>.

### 11.11 Subir las fotos de las fincas

El seed de demostración crea las fincas **sin imágenes**. Se agregan desde la aplicación:

1. Iniciar sesión como administrador (o como dueño de la finca).
2. Panel de administración → **Fincas** → botón **Fotos** (o *Agregar fotos*) en cada finca.
3. Hasta 10 imágenes por finca, de máximo 5 MB cada una. La primera queda como portada.

Si existen fotos en un proyecto anterior de Supabase, se pueden copiar con `scripts/migrar-storage.sh` (requiere la base de origen con la tabla `Imagen`).

### 11.12 Desarrollo local después del despliegue

`src/environments/environment.ts` ahora apunta a la API de Azure, y como `angular.json` no usa `fileReplacements`, **`ng serve` también la usa**. Para trabajar contra la API local, cambie temporalmente `apiUrl` a `http://localhost:3000/api` o agregue `fileReplacements` en la configuración `development` de `angular.json` para usar `environment.development.ts`.

---

## 12. Problemas encontrados y soluciones

| # | Síntoma | Causa | Solución |
|---|---|---|---|
| 1 | `az` y `psql` no se reconocen | No estaban instalados | Instalación con `winget` ([§6.1](#61-herramientas-en-el-equipo-windows)) y ruta agregada a `$env:Path` |
| 2 | `az login` termina con código 255 aunque el inicio de sesión fue exitoso | La salida se cortó con `Select-Object -First 5` y la CLI recibió el cierre de la tubería | Ninguna; comprobar con `az account show`. Ejecutar `az login` sin filtrar la salida |
| 3 | `unrecognized arguments: --high-availability Disabled` | El argumento ya no existe en Azure CLI 2.93 | Omitirlo; la HA está desactivada por defecto |
| 4 | `--database-name ... only be used when --node-count is present` | En la CLI nueva ese argumento es solo para clústeres elásticos | Crear la base después con `az postgres flexible-server db create` |
| 5 | `The location is restricted from performing this operation` (PostgreSQL en `eastus2`) | Política de regiones permitidas de Azure for Students | Usar `northcentralus` ([§3.1](#31-política-de-regiones-permitidas)) |
| 6 | `Current Limit (F1 App Service instances): 0` en `northcentralus` y `francecentral` | La suscripción no tiene cuota de F1 en esas regiones | Crear el plan en `belgiumcentral` |
| 7 | `RequestDisallowedByAzure` al crear Static Web Apps | Static Web Apps solo existe en regiones que la política bloquea | Usar el sitio web estático de la Storage Account |
| 8 | `firewall-rule create`: `-n` o `--name` toman otro significado | En los subcomandos `firewall-rule` y `db`, el servidor va en `-s` y `--name` es la regla o la base | `-s $PG --name mi-ip` |
| 9 | `npm run build` de la API falla con `Cannot find module 'pg'` | El `node_modules` local estaba incompleto | `npm ci` antes de compilar y borrar `dist` para no desplegar una compilación vieja |
| 10 | Warnings `no privileges could be revoked for "gbt_..."` al cargar el esquema | El esquema revoca permisos en general; las funciones de `btree_gist` no los tenían | Inofensivo, no requiere acción |
| 11 | Los botones de *acceso rápido* fallaban con "Credenciales incorrectas" | Solo se había cargado `schema.sql`: el administrador base está inactivo y sin clave, y los demás usuarios demo no existían | Cargar `seed_demo.sql` con `-v permitir_demo=1` ([§9.5](#95-usuarios-de-demostración)) |
| 12 | Las fincas aparecen sin fotos | El seed de demostración no incluye imágenes | Subirlas desde el panel ([§11.11](#1111-subir-las-fotos-de-las-fincas)); la subida a Blob se verificó en producción |
| 13 | Consulta SQL en una línea de PowerShell fallaba (`unterminated quoted identifier`) | PowerShell no escapa `\"` como Bash | Pasar el SQL por la entrada estándar con un *here-string* `@' ... '@ \| psql` |

---

## 13. Limitaciones conocidas y mejoras futuras

| Limitación | Impacto | Mejora sugerida |
|---|---|---|
| API y base de datos en continentes distintos | ~100 ms extra por consulta | Pedir cuota F1/B1 en `northcentralus`, o mover la base a una región cercana a la API cuando la política lo permita |
| *Cold start* del plan F1 | Primera petición lenta tras inactividad | Plan B1 con Always On |
| 60 min de CPU diarios en F1 | La API se detiene si se agotan | Plan B1 |
| Rutas de Angular devuelven HTTP 404 (con el contenido correcto) | Algunos rastreadores o herramientas lo interpretan como error | Azure Front Door o Static Web Apps (cuando haya región permitida) con reglas de reescritura |
| Sin dominio propio | URLs técnicas | Dominio propio + Azure Front Door o plan B1 con certificado administrado |
| Base con acceso público filtrado por firewall | Superficie mayor que una red privada | VNet + Private Endpoint (requiere planes de pago) |
| Despliegue manual desde un equipo | Depende de la persona y de su máquina | GitHub Actions: compilar en Linux y desplegar con `azure/webapps-deploy` y `az storage blob upload-batch` |
| Sin monitoreo de errores | Los fallos solo se ven en los registros | Application Insights (tiene nivel gratuito de 5 GB/mes) |
| La URL de la API está compilada en el frontend | Cambiar la API obliga a recompilar | Cargar la configuración desde un `config.json` en tiempo de ejecución |

---

## 14. Desmontar el entorno

Todo el despliegue vive en un solo grupo de recursos. Para eliminarlo por completo (base de datos, imágenes, API y sitio web), **sin posibilidad de recuperación**:

```powershell
# 1) Respaldo previo, si se quieren conservar los datos
pg_dump "postgresql://renfiadmin:<clave>@pg-renfi-z0a193.postgres.database.azure.com:5432/renfi?sslmode=require" --format=custom -f renfi_final.dump

# 2) Eliminar todo
az group delete -n rg-renfi --yes
```

Los nombres con sufijo (`strenfiz0a193`, `api-renfi-z0a193`, `pg-renfi-z0a193`) quedan libres después de unos minutos.

---

## Anexo A — Script completo de despliegue

Script de referencia en PowerShell que reproduce el entorno desde cero. Supone que las herramientas están instaladas, que se ejecutó `az login` y que se lanza desde la carpeta que contiene ambos repositorios (`API-Renfi` y `Renfi`).

```powershell
$ErrorActionPreference = "Stop"
$env:Path += ";C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin;C:\Program Files\PostgreSQL\17\bin"

# ---------- Variables ----------
$SUF = -join ((48..57)+(97..122) | Get-Random -Count 6 | % {[char]$_})
$RG = "rg-renfi"; $LOC_DATOS = "northcentralus"; $LOC_API = "belgiumcentral"
$PG = "pg-renfi-$SUF"; $ST = "strenfi$SUF"; $APP = "api-renfi-$SUF"
function Nueva-Clave { -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 24 | % {[char]$_}) }
$ADMIN_PW = Nueva-Clave; $APP_PW = Nueva-Clave
Write-Host "Sufijo: $SUF  — GUARDE estas claves:  renfiadmin=$ADMIN_PW  renfi_app=$APP_PW"
$RAIZ = Get-Location

# ---------- Proveedores y grupo ----------
"Microsoft.DBforPostgreSQL","Microsoft.Web","Microsoft.Storage" | % { az provider register -n $_ --wait }
az group create -n $RG -l eastus2 -o none

# ---------- PostgreSQL ----------
az postgres flexible-server create -g $RG -n $PG -l $LOC_DATOS --tier Burstable --sku-name Standard_B1ms `
  --storage-size 32 --version 16 --admin-user renfiadmin --admin-password $ADMIN_PW `
  --public-access 0.0.0.0 --backup-retention 7 --yes -o none
az postgres flexible-server parameter set -g $RG --server-name $PG --name azure.extensions --value BTREE_GIST -o none
az postgres flexible-server db create -g $RG -s $PG --name renfi -o none
$IP = Invoke-RestMethod https://api.ipify.org
az postgres flexible-server firewall-rule create -g $RG -s $PG --name mi-ip --start-ip-address $IP --end-ip-address $IP -o none

$DST = "postgresql://renfiadmin:$ADMIN_PW@$PG.postgres.database.azure.com:5432/renfi?sslmode=require"
psql $DST -v ON_ERROR_STOP=1 -c "CREATE ROLE renfi_app LOGIN PASSWORD '$APP_PW' CONNECTION LIMIT 30;"
psql $DST -v ON_ERROR_STOP=1 -q -f "$RAIZ\API-Renfi\db\azure\schema.sql"
# Solo para demostraciones:
# psql $DST -v ON_ERROR_STOP=1 -v permitir_demo=1 -q -f "$RAIZ\API-Renfi\db\azure\seed_demo.sql"

# ---------- Storage ----------
az storage account create -n $ST -g $RG -l $LOC_DATOS --sku Standard_LRS --kind StorageV2 --access-tier Hot `
  --allow-blob-public-access true --min-tls-version TLS1_2 -o none
az storage container create --account-name $ST -n fincas-imagenes --public-access blob --auth-mode key -o none
az storage blob service-properties update --account-name $ST --auth-mode key --static-website `
  --index-document index.html --404-document index.html -o none
$WEB = (az storage account show -n $ST -g $RG --query "primaryEndpoints.web" -o tsv).TrimEnd('/')

# ---------- App Service ----------
az appservice plan create -g $RG -n plan-renfi --is-linux --sku F1 -l $LOC_API -o none
az webapp create -g $RG -p plan-renfi -n $APP --runtime "NODE:22-lts" -o none
az webapp config set -g $RG -n $APP --startup-file "node dist/index.js" --always-on false -o none
az webapp update -g $RG -n $APP --https-only true -o none
$PRINCIPAL = az webapp identity assign -g $RG -n $APP --query principalId -o tsv
$STID = az storage account show -n $ST -g $RG --query id -o tsv
az role assignment create --assignee-object-id $PRINCIPAL --assignee-principal-type ServicePrincipal `
  --role "Storage Blob Data Contributor" --scope $STID -o none
$JWT = node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
az webapp config appsettings set -g $RG -n $APP -o none --settings NODE_ENV=production `
  "DATABASE_URL=postgresql://renfi_app:$APP_PW@$PG.postgres.database.azure.com:5432/renfi?sslmode=require" `
  DB_POOL_MAX=5 "JWT_SECRET=$JWT" JWT_EXPIRES_IN=1d `
  "AZURE_STORAGE_ACCOUNT_URL=https://$ST.blob.core.windows.net" AZURE_STORAGE_CONTAINER=fincas-imagenes `
  "CORS_ORIGIN=$WEB" SCM_DO_BUILD_DURING_DEPLOYMENT=false

# ---------- Despliegue de la API ----------
Set-Location "$RAIZ\API-Renfi"
npm ci; Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue; npm run build
$S = "$env:TEMP\renfi-api"; Remove-Item $S -Recurse -Force -ErrorAction SilentlyContinue; New-Item -ItemType Directory $S | Out-Null
Copy-Item dist, package.json, package-lock.json $S -Recurse
Push-Location $S; npm ci --omit=dev --os=linux --cpu=x64 --libc=glibc
Remove-Item "$env:TEMP\renfi-api.zip" -ErrorAction SilentlyContinue; tar -a -cf "$env:TEMP\renfi-api.zip" *; Pop-Location
az webapp deploy -g $RG -n $APP --src-path "$env:TEMP\renfi-api.zip" --type zip

# ---------- Despliegue del frontend ----------
Set-Location "$RAIZ\Renfi"
$API = "https://$APP.azurewebsites.net/api"
foreach ($f in "src\environments\environment.ts", "src\environments\environment.prod.ts") {
  (Get-Content $f -Raw) -replace "apiUrl: '[^']*'", "apiUrl: '$API'" | Set-Content $f -NoNewline -Encoding utf8
}
npm ci; npm run build
az storage blob upload-batch -s .\dist\MiPrimerApp\browser -d '$web' --account-name $ST --auth-mode key --overwrite -o none

Set-Location $RAIZ
Write-Host "Frontend: $WEB"
Write-Host "API:      $API"
```

> Este script incluye `--https-only true`, que en el despliegue original quedó pendiente ([§9.7](#97-endurecimientos-pendientes)). Revise las regiones antes de ejecutarlo: la política de la suscripción o las cuotas pueden haber cambiado.

---

## Anexo B — Glosario

| Término | Significado |
|---|---|
| **App Service** | Servicio de Azure para alojar aplicaciones web sin administrar servidores |
| **Plan de App Service** | Define la capacidad (CPU, RAM) y el precio en que corren las aplicaciones. F1 es el nivel gratuito |
| **Azure for Students** | Suscripción gratuita para estudiantes con crédito de USD 100 y restricciones de región y cuota |
| **Blob Storage** | Almacenamiento de archivos (objetos) de Azure |
| **Burstable (B1ms)** | Nivel de PostgreSQL con CPU que acumula créditos en reposo y los gasta en picos; el más económico |
| **Cold start** | Demora de la primera petición cuando la aplicación estaba descargada por inactividad |
| **CORS** | Mecanismo del navegador que solo permite a ciertos orígenes llamar a la API |
| **Flexible Server** | Modalidad actual de Azure Database for PostgreSQL |
| **Identidad administrada** | Identidad que Azure asigna a un recurso para autenticarse ante otros servicios sin contraseñas |
| **JWT** | Token firmado que identifica al usuario en cada petición |
| **LRS** | *Locally Redundant Storage*: tres copias dentro del mismo centro de datos |
| **Point-in-time restore** | Restauración de la base a un instante exacto dentro del periodo de retención |
| **Política de Azure** | Regla de la suscripción que permite o bloquea operaciones (aquí, regiones) |
| **Sitio web estático** | Función de Storage que sirve archivos HTML/JS/CSS por HTTPS desde el contenedor `$web` |
| **sp_\*** | Procedimientos almacenados de Renfi; única vía de acceso a los datos para la API |
