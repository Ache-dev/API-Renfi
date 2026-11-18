# 🌿 API Renfi — Backend RESTful

Backend RESTful para la plataforma **Renfi**, una solución integral para la gestión y reserva de fincas vacacionales y turísticas. Esta API alimenta la web en Angular ([Renfi](https://github.com/Ache-dev/Renfi)) y la app móvil en Expo ([Renfi-ExpoGO](https://github.com/Resx1983/Renfi-ExpoGO)): catálogo público, reservas y pagos de clientes, panel "Mi finca" de los dueños y panel de administración.

Desarrollado con **Node.js**, **Express 5**, **TypeScript** y **PostgreSQL** sobre **Azure** (Azure Database for PostgreSQL + Azure Blob Storage).

---

## 🏛️ Arquitectura del Proyecto (Clean Architecture & Clean Code)

El proyecto sigue una arquitectura en capas desacopladas (**Layered Architecture**) aplicando los principios **SOLID**, separación de responsabilidades y tipado estricto con TypeScript:

```
API-Renfi/
├── .env                       # Variables de entorno locales
├── .env.example               # Plantilla de variables de entorno
├── db/azure/                  # Esquema (tablas, triggers, procedimientos sp_*), seed demo y guía de migración
├── scripts/migrar-storage.sh  # Copia de imágenes hacia Azure Blob (azcopy)
├── package.json               # Dependencias y scripts de ejecución
├── tsconfig.json              # Configuración de TypeScript
├── src/
│   ├── config/                # Configuración global y variables de entorno tipadas
│   │   └── env.config.ts
│   ├── conexion/              # Conectividad a Azure
│   │   ├── postgres.ts        # Pool de pg (singleton) y helpers que llaman a los sp_*
│   │   └── storage.ts         # Azure Blob Storage (subir, borrar, URL pública)
│   ├── models/                # Entidades del dominio, DTOs y tipos
│   │   ├── usuario.ts         # Usuario, DTOs y UsuarioNormalizado
│   │   ├── finca.ts           # Finca, DTOs y Reportes
│   │   ├── reserva.ts         # Reserva, DTOs y Filtros
│   │   ├── factura.ts         # Factura y DTOs
│   │   ├── pago.ts            # Pago, DTOs y Reporte pendientes
│   │   ├── metododepago.ts    # Métodos de Pago y DTOs
│   │   ├── municipio.ts       # Municipio y Reporte reservas
│   │   ├── imagen.ts          # Imágenes por finca y DTOs
│   │   ├── rol.ts             # Roles de usuario y DTOs
│   │   └── index.ts           # Barrel export de modelos
│   ├── dao/                   # Capa de Acceso a Datos (Data Access Objects / Repositories)
│   │   ├── usuario.dao.ts
│   │   ├── finca.dao.ts
│   │   ├── reserva.dao.ts
│   │   ├── factura.dao.ts
│   │   ├── pago.dao.ts
│   │   ├── metododepago.dao.ts
│   │   ├── municipio.dao.ts
│   │   ├── imagen.dao.ts
│   │   ├── rol.dao.ts
│   │   └── index.ts
│   ├── services/              # Capa de Lógica de Negocio y Reglas de Dominio
│   │   ├── usuario.service.ts # Autenticación, JWT, hashing, normalización
│   │   ├── finca.service.ts   # Búsqueda, reportes y validaciones
│   │   ├── reserva.service.ts # Reglas de reservas, validación de fechas
│   │   ├── pago.service.ts    # Transacciones y registro de pagos
│   │   ├── factura.service.ts # Facturación vinculada a reservas
│   │   ├── metododepago.service.ts
│   │   ├── municipio.service.ts
│   │   ├── imagen.service.ts
│   │   ├── rol.service.ts
│   │   └── index.ts
│   ├── controllers/           # Controladores HTTP (Req, Res, Next)
│   │   ├── usuario.controller.ts
│   │   ├── finca.controller.ts
│   │   ├── reserva.controller.ts
│   │   ├── factura.controller.ts
│   │   ├── pago.controller.ts
│   │   ├── metododepago.controller.ts
│   │   ├── municipio.controller.ts
│   │   ├── imagen.controller.ts
│   │   ├── rol.controller.ts
│   │   └── index.ts
│   ├── routes/                # Definición de rutas y endpoints Express
│   │   ├── usuario.route.ts
│   │   ├── finca.route.ts
│   │   ├── reserva.route.ts
│   │   ├── factura.route.ts
│   │   ├── pago.route.ts
│   │   ├── metododepago.route.ts
│   │   ├── municipio.route.ts
│   │   ├── imagen.route.ts
│   │   └── rol.route.ts
│   ├── middlewares/           # Middlewares de Express
│   │   ├── error.middleware.ts       # Manejo centralizado de errores con JSON
│   │   ├── validate-id.middleware.ts # Validación de IDs (params y query)
│   │   ├── auth.middleware.ts        # Verificación de tokens JWT
│   │   └── index.ts
│   └── index.ts               # Punto de entrada de la aplicación y servidor HTTP
└── dist/                      # Código TypeScript compilado a JavaScript
```

---

## ✨ Mejoras y Ajustes Realizados (Clean Code & Frontend Alignment)

1. **Alineación con el Frontend Renfi (Angular)**:
   - **Formato Normalizado de Usuario**: Se retorna tanto `IdUsuario` como `NumeroDocumento`, y `Rol` como `NombreRol`, permitiendo compatibilidad directa con `AuthService`, `AuthStateService` y el módulo administrativo.
   - **Retorno de Identificadores Creados**: En todas las operaciones de creación (`POST /api/reserva`, `POST /api/factura`, `POST /api/pago`, `POST /api/finca`, `POST /api/usuario`, etc.), el procedimiento almacenado devuelve el Id con `INSERT ... RETURNING` y la API lo retorna explícitamente los IDs (`IdReserva`, `idReserva`, `id`, `IdFactura`, `IdPago`, etc.), evitando errores de resolución en el frontend.
   - **Filtros Dinámicos en Reservas**: `GET /api/reserva` ahora procesa parámetros de consulta (`?Correo=&NumeroDocumento=&IdFinca=&Estado=`), tal como lo requiere `ReservaService.listarReservas`.
   - **Compatibilidad con Panel de Administración**: Se soporta la eliminación tanto por parámetro de ruta (`DELETE /:id`) como por parámetro de consulta (`DELETE /delete?id=:id`), utilizado por `admin-resources.config.ts`.
   - **Consulta Enriquecida de Fincas e Imágenes**: `GET /api/finca/:id` ahora retorna los datos completos del propietario (`NombrePropietario`, `ApellidoPropietario`, `TelefonoPropietario`, `CorreoPropietario`), y `GET /api/imagen/finca/:id` responde sin bloqueos ni requerimientos circulares.
   - **Actualizaciones Parciales de Perfil**: El endpoint `PUT /api/usuario/:id` ahora admite actualizaciones parciales (como la realizada desde `MiCuentaUsuarios`), conservando los datos previos del usuario en lugar de requerir el objeto completo.

2. **Calidad de Código y Arquitectura**:
   - **Capa de Servicios**: Se separó la lógica de negocio y las validaciones de las capas de transporte (controladores) y persistencia (DAOs).
   - **Acceso a datos solo por procedimientos almacenados**: los DAO no contienen SQL; llaman a funciones `sp_*` con parámetros (`pg`, Pool singleton). La base se protege con restricciones y triggers.
   - **Manejo Centralizado de Errores**: Middleware global que captura errores síncronos y asíncronos, retornando siempre un payload JSON estructurado `{ success: false, message: ... }`.
   - **Variables de Entorno Tipadas**: Soporte para `.env` a través de `dotenv` con valores por defecto seguros para desarrollo.
   - **Autenticación JWT**: Emisión y validación opcional/obligatoria de JSON Web Tokens con firma segura.

---

## 📋 Catálogo de Endpoints de la API

La URL base predeterminada es `http://localhost:3000/api`.

### 1. Usuarios (`/api/usuario`)
| Método | Ruta | Descripción | Payload |
|---|---|---|---|
| `POST` | `/api/usuario/login` | Inicia sesión con credenciales | `{ "correo": "admin@renfi.com", "contrasena": "123456" }` |
| `GET` | `/api/usuario` | Lista todos los usuarios | Ninguno |
| `GET` | `/api/usuario/:id` | Obtiene un usuario por su ID | Ninguno |
| `POST` | `/api/usuario` | Registra un usuario (público: cliente, o dueño con `TipoCuenta`) | `{ "NombreUsuario": "...", "ApellidoUsuario": "...", "Correo": "...", "Contrasena": "...", "Telefono": "...", "TipoCuenta": "cliente" \| "dueno" }` (`IdRol` solo lo respeta el administrador) |
| `PUT` | `/api/usuario/:id` | Actualiza un usuario (parcial o total) | `{ "NombreUsuario": "...", "Telefono": "..." }` |
| `DELETE`| `/api/usuario/:id` | Elimina un usuario por ID | Ninguno |
| `DELETE`| `/api/usuario/delete?id=:id` | Elimina un usuario por query param | Ninguno |

### 2. Fincas (`/api/finca`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/finca` | Catálogo público de fincas (con `Imagenes` y `UrlPortada`) |
| `GET` | `/api/finca/mias` | Fincas del dueño autenticado (o todas, si es administrador) |
| `GET` | `/api/finca/:id` | Obtiene detalle completo de una finca |
| `POST` | `/api/finca` | Publica una finca (dueño o administrador; el dueño siempre a su nombre) |
| `POST` | `/api/finca/:id/imagenes` | Sube una foto a la galería (multipart, campo `imagen`) |
| `PUT` | `/api/finca/:id` | Actualiza una finca (administrador o su dueño) |
| `DELETE`| `/api/finca/:id` | Elimina una finca (administrador o su dueño) |
| `DELETE`| `/api/finca/delete?id=:id` | Elimina una finca por query param |
| `GET` | `/api/finca/report/mas-reservadas` | Reporte: Fincas con más reservas |
| `GET` | `/api/finca/report/promedio-calificacion` | Reporte: Promedio de calificación |
| `GET` | `/api/finca/report/total-ingresos` | Reporte: Total de ingresos por finca |
| `GET` | `/api/finca/report/mas-ingresos` | Reporte: Top fincas con mayores ingresos |

### 3. Reservas (`/api/reserva`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/reserva` | Lista reservas (administrador; soporta `?Correo=`, `?NumeroDocumento=`, `?IdFinca=`, `?Estado=`) |
| `GET` | `/api/reserva/mis-fincas` | Reservas recibidas por las fincas del dueño |
| `GET` | `/api/reserva/finca/:id/ocupadas` | Fechas ocupadas de una finca (público, sin datos personales) |
| `PUT` | `/api/reserva/:id/estado` | El dueño o el administrador confirma, finaliza o cancela |
| `GET` | `/api/reserva/:id` | Obtiene una reserva por ID |
| `GET` | `/api/reserva/usuario/:numeroDocumento` | Lista reservas de un usuario específico |
| `POST` | `/api/reserva` | Crea una reserva a nombre del cliente autenticado y su factura (el monto lo calcula la API) |
| `PUT` | `/api/reserva/:id` | Actualiza estado o fechas de una reserva |
| `DELETE`| `/api/reserva/:id` | Cancela/elimina una reserva |

### 4. Pagos (`/api/pago`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/pago` | Lista todos los pagos (administrador) |
| `GET` | `/api/pago/mis-fincas` | Pagos recibidos por las fincas del dueño |
| `GET` | `/api/pago/:id` | Obtiene un pago por ID |
| `POST` | `/api/pago` | Registra un pago y retorna `IdPago` |
| `PUT` | `/api/pago/:id` | Actualiza estado de un pago |
| `DELETE`| `/api/pago/:id` | Elimina un pago |
| `GET` | `/api/pago/report/pendientes` | Reporte: Pagos pendientes por confirmar |

### 5. Facturas (`/api/factura`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/factura` | Lista todas las facturas |
| `GET` | `/api/factura/:id` | Obtiene factura por ID |
| `POST` | `/api/factura` | Registra una factura y retorna `IdFactura` |
| `PUT` | `/api/factura/:id` | Actualiza datos de factura |
| `DELETE`| `/api/factura/:id` | Elimina una factura |

### 6. Métodos de Pago (`/api/metododepago`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/metododepago` | Lista métodos de pago (Tarjeta, PSE, etc.) |
| `GET` | `/api/metododepago/:id` | Obtiene método de pago por ID |
| `POST` | `/api/metododepago` | Crea un método de pago |
| `PUT` | `/api/metododepago/:id` | Actualiza un método de pago |
| `DELETE`| `/api/metododepago/:id` | Elimina un método de pago |

### 7. Municipios (`/api/municipio`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/municipio` | Lista todos los municipios |
| `GET` | `/api/municipio/:id` | Obtiene municipio por ID |
| `POST` | `/api/municipio` | Registra un municipio |
| `PUT` | `/api/municipio/:id` | Actualiza un municipio |
| `DELETE`| `/api/municipio/:id` | Elimina un municipio |
| `GET` | `/api/municipio/report/mas-reservas` | Reporte: Municipios con más reservas |

### 8. Imágenes (`/api/imagen`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/imagen` | Lista todas las imágenes |
| `GET` | `/api/imagen/:id` | Obtiene imagen por ID |
| `GET` | `/api/imagen/finca/:id` | Obtiene todas las imágenes de una finca |
| `PUT` | `/api/imagen/:id` | Cambia portada, orden o texto alternativo (administrador o dueño de la finca) |
| `DELETE`| `/api/imagen/:id` | Elimina una imagen y su archivo (administrador o dueño de la finca) |

Las imágenes se crean subiendo el archivo con `POST /api/finca/:id/imagenes`.

### 9. Roles (`/api/rol`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/rol` | Lista todos los roles disponibles |
| `GET` | `/api/rol/:id` | Obtiene un rol por ID |
| `POST` | `/api/rol` | Crea un nuevo rol |
| `PUT` | `/api/rol/:id` | Actualiza un rol |
| `DELETE`| `/api/rol/:id` | Elimina un rol |

---

## ⚙️ Configuración y Variables de Entorno

Copia el archivo `.env.example` como `.env` y configura los valores correspondientes a tu entorno:

```env
# Servidor
PORT=3000
NODE_ENV=development

# Azure Database for PostgreSQL (rol renfi_app: solo ejecuta los sp_*)
DATABASE_URL=postgresql://renfi_app:<contraseña>@<servidor>.postgres.database.azure.com:5432/renfi

# Azure Blob Storage (contenedor público de imágenes)
AZURE_STORAGE_ACCOUNT_URL=https://<cuenta>.blob.core.windows.net
AZURE_STORAGE_CONTAINER=fincas-imagenes
# Solo desarrollo; en Azure se usa identidad administrada
AZURE_STORAGE_CONNECTION_STRING=

# Seguridad JWT (obligatorio, mínimo 32 caracteres)
JWT_SECRET=
JWT_EXPIRES_IN=1d

# CORS
CORS_ORIGIN=*
```

---

## ☁️ Despliegue en Azure

La API arranca con `npm start` (desarrollo) o `npm run build && npm run serve`. Si falta `DATABASE_URL` o la configuración de Blob, o la base no responde, **falla al arrancar con un mensaje claro**.

### Paso 1: Base de datos (Azure Database for PostgreSQL Flexible Server)
1. En *Server parameters* → `azure.extensions`, habilita `BTREE_GIST`.
2. Crea una base `renfi` y el rol de la API: `CREATE ROLE renfi_app LOGIN PASSWORD '<larga>';`
3. Ejecuta [`db/azure/schema.sql`](db/azure/schema.sql) como administrador. Crea:
   - Las **9 tablas** del dominio, claves foráneas (`CASCADE` / `SET NULL`) e índices.
   - Restricciones `CHECK`, unicidad (correo, una factura por reserva, una portada por finca) y `EXCLUDE` contra reservas solapadas.
   - **Triggers**: un pago no puede exceder el total de su factura; el correo se normaliza a minúsculas.
   - **Procedimientos almacenados `sp_*`** (única vía de acceso de la API) y las vistas internas que usan.
   - Los **datos semilla** (roles, municipios y métodos de pago). El administrador `admin@renfi.com` viene **inactivo y sin contraseña**: actívalo con `ADMIN_CONTRASENA='<clave de 12+ caracteres>' npm run crear-admin`.
   - Permisos: `renfi_app` solo tiene `EXECUTE` sobre los `sp_*`; no puede leer ni escribir tablas.
4. Datos de ejemplo para desarrollo (opcional, **nunca en producción**): `psql ... -v permitir_demo=1 -f db/azure/seed_demo.sql`. Sin esa bandera el script no hace nada.
5. Para traer los datos de una base anterior: [`db/azure/migrar_datos.md`](db/azure/migrar_datos.md) (incluye `diagnostico_origen.sql`, de solo lectura, para detectar filas que incumplen las reglas antes de migrar).

### Paso 2: Blob Storage
Crea el contenedor `fincas-imagenes` con acceso público de lectura a blobs (la cuenta debe permitir acceso anónimo). En Azure, asigna a la identidad de la API el rol *Storage Blob Data Contributor*. Para copiar las imágenes existentes: [`scripts/migrar-storage.sh`](scripts/migrar-storage.sh).

> Las pruebas (`npm test`) leen la base configurada en `DATABASE_URL` y no escriben datos; las que tocan imágenes usan Blob Storage simulado.

---

## 🏡 Rol "Dueño de finca"

El rol `Dueño de finca` viene en el esquema (la API lo reconoce por nombre). Un dueño puede:

| Acción | Endpoint |
|---|---|
| Registrarse como dueño (registro público) | `POST /api/usuario` con `"TipoCuenta": "dueno"` |
| Ver sus fincas | `GET /api/finca/mias` |
| Publicar una finca (siempre a su nombre) | `POST /api/finca` |
| Editar / eliminar **sus** fincas | `PUT` / `DELETE /api/finca/:id` |
| Subir, ordenar, poner portada y borrar fotos de **sus** fincas | `POST /api/finca/:id/imagenes`, `PUT` / `DELETE /api/imagen/:id` |
| Ver reservas y pagos de sus fincas | `GET /api/reserva/mis-fincas`, `GET /api/pago/mis-fincas` |
| Confirmar, finalizar o cancelar una reserva de su finca | `PUT /api/reserva/:id/estado` (`Activa`, `Confirmada`, `Finalizada`, `Cancelada`) |

No puede traspasar fincas, cambiar la calificación ni tocar datos de otros. Una finca con `Estado: "No disponible"` no recibe reservas nuevas.

## 🔐 Seguridad y permisos

La API es la **única puerta de entrada** a la base de datos: las apps (Expo, Angular) nunca hablan con la base ni con Blob Storage directamente.

- **Credenciales de Azure:** `DATABASE_URL` usa el rol `renfi_app` (solo `EXECUTE` sobre `sp_*`). Nunca la pongas en una app ni en git; en Blob usa identidad administrada.
- **Sesión:** `POST /api/usuario/login` devuelve un JWT (`JWT_SECRET` es obligatorio, mínimo 32 caracteres; dura `JWT_EXPIRES_IN`, por defecto 1 día). Se envía como `Authorization: Bearer <token>`.
- **Contraseñas:** se guardan con bcrypt. Los clientes pueden enviarlas en claro o como SHA-512; las contraseñas antiguas (texto plano o SHA-512) se migran a bcrypt en el primer inicio de sesión correcto.
- **Cancelar un token:** en cada petición la API consulta al usuario en la base. Un token deja de valer al instante si el usuario se desactiva (`Estado` distinto de `Activo`), se elimina, o cambia su contraseña; el rol que se aplica es siempre el actual, no el del token. Un cliente cierra sesión descartando su token.
- **Fuerza bruta:** login y registro limitan a 10 intentos por IP cada 15 minutos.

| Recurso | Anónimo | Cliente | Administrador |
|---|---|---|---|
| `GET` fincas, imágenes, municipios, fechas ocupadas de una finca | Sí | Sí | Sí |
| `POST /usuario` (registro) | Sí (Cliente, o Dueño con `TipoCuenta: "dueno"`; nunca Administrador) | — | Puede elegir rol y estado |
| `GET/PUT /usuario/:id` | No | Solo el propio (sin cambiar rol, estado ni correo) | Cualquiera |
| `GET /metododepago` | No | Sí | Sí |
| `POST /reserva`, `POST /pago` | No | A su nombre; el monto lo calcula la API | Cualquiera |
| `GET /reserva/usuario/:doc`, `GET /reserva|factura|pago/:id` | No | Solo lo propio (el dueño, las reservas de sus fincas) | Todo |
| `PUT /reserva/:id` | No | Solo cancelar la propia | Todo |
| Publicar finca, editar/eliminar y gestionar su galería | No | No | Sí (cualquiera) |
| Ídem, solo en **sus** fincas; ver sus reservas y pagos; cambiar estado de sus reservas | No | No | Dueño de finca |
| Listados completos, reportes, roles, y escritura de catálogos | No | No | Sí |

El control de acceso por rol y por propietario lo hace la capa de servicios con el JWT; la base solo ve a `renfi_app`.

---

## 🚦 Límites de uso (contra caídas y sobrecostos)

| Dónde | Límite |
|---|---|
| **Peticiones por IP** | 300 por minuto en total y 60 escrituras por minuto; login y registro, 10 cada 15 min; subida de fotos, 20 cada 10 min. Al pasarse: `429` con `Retry-After`. |
| **Cuerpo JSON** | 100 kb, hasta 50 campos, 2000 caracteres por texto, listas de hasta 100 elementos. |
| **URL y consulta** | URL de hasta 2048 caracteres (`414`); hasta 20 parámetros de 200 caracteres como máximo. |
| **Imágenes** | 5 MB, 10 por finca, 40 megapíxeles; se convierten a WebP de 1600 px. Máximo 2 conversiones a la vez y 8 en espera (después, `503`). Se sirven con caché de un año para reducir ancho de banda. |
| **Conexiones** | Cada petición lenta se corta (cabeceras 15 s, petición 60 s). El pool usa `DB_POOL_MAX` conexiones y espera como máximo 10 s por una libre (`503`). |
| **Base de datos** | El rol `renfi_app` admite 30 conexiones; consultas de más de 15 s se cancelan; locks de más de 5 s fallan. |
| **Campos** | Todos los textos tienen longitud máxima en la API y en la base (`VARCHAR(n)` y `CHECK`): p. ej. nombres 100, reglas 1000, texto alternativo 200, comodidades 30 de 50 caracteres. |
| **Cuotas (triggers)** | 50 fincas por propietario, 10 imágenes por finca, 20 reservas pendientes por usuario. |

Detrás de Azure App Service el límite por IP necesita `TRUST_PROXY=1` (ya es el valor por defecto en producción). El contador vive en la memoria de cada instancia: con varias instancias, cada una cuenta aparte; para un límite global usa Azure Front Door o API Management.

---

## 🛡️ Validación e integridad

- Cuerpo JSON limitado a 100 kb; se rechazan objetos anidados y tipos o rangos inválidos (`src/services/validacion.ts`, con los mismos límites que las restricciones de `db/azure/schema.sql`).
- **Reservas y pagos:** el servidor calcula el monto (noches × precio); sin fechas pasadas, con noches mínimas (de la finca) y máximas.
- Errores de la base `23514`, `23P01` y `22001` se traducen a `400`/`409`. Si la base no responde, la API contesta `503` (ya no hay catálogo demo en memoria).

---

## 🖼️ Imágenes y ficha de las fincas

Las fotos se alojan en **Azure Blob Storage** (contenedor público `fincas-imagenes`); la base de datos guarda solo la ruta relativa (`RutaStorage`) y los metadatos. La URL pública se arma con `AZURE_STORAGE_ACCOUNT_URL` + contenedor + ruta.

**Subir una imagen** (administrador o dueño de la finca): `POST /api/finca/:id/imagenes`, `multipart/form-data`, campo `imagen` (+ opcionales `TextoAlternativo`, `EsPortada=true`).
- Máximo 5 MB y 10 imágenes por finca. Acepta JPG, PNG y WebP, validados por su **contenido** (no por el nombre).
- La API corrige la orientación, elimina los metadatos (EXIF/GPS), reduce a 1600 px y convierte a **WebP** antes de guardar en `finca-{id}/{uuid}.webp`.
- La primera imagen de una finca queda como **portada**. `PUT /api/imagen/:id` cambia portada, orden o texto alternativo; `DELETE /api/imagen/:id` borra la fila y el archivo (y la siguiente imagen pasa a ser portada). Las imágenes solo se crean subiendo el archivo (ya no existen las URL externas).
- `GET /api/finca` y `GET /api/finca/:id` devuelven `Imagenes` (portada primero) y `UrlPortada`. `UrlImagen` ya no es una columna: es un campo que la API calcula con la URL pública del archivo (`RutaStorage`), para que los clientes lo muestren tal cual.

**Ficha de la finca** (se envía en `POST/PUT /api/finca`): `Habitaciones`, `Banos`, `Camas`, `NochesMinimas`, `Comodidades` (lista o texto separado por comas), `Reglas`, `HoraEntrada`/`HoraSalida` (`HH:MM`), `PermiteMascotas`, `PermiteEventos`, `Latitud`/`Longitud` (deben ir juntas). La API valida rangos y la base los refuerza con restricciones.

---

## 🚀 Instalación y Ejecución

### 1. Instalar dependencias
```bash
npm install
```

### 2. Ejecutar en modo desarrollo
```bash
npm start
```
El servidor se iniciará con recarga automática (*live-reload*) en `http://localhost:3000`.

### 3. Compilar a producción
```bash
npm run build
```
Genera la carpeta optimizada `dist/`.

### 4. Ejecutar en producción
```bash
npm run serve
```
Ejecuta el servidor compilado directamente con Node.js desde `dist/index.js`.


