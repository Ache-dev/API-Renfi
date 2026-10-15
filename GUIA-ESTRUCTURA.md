# Guía sencilla: cómo está organizado Renfi (API, web y app móvil)

Esta guía explica **todo Renfi** de forma simple, pensada para personas que están aprendiendo. No necesitas saber todo de memoria: la idea es entender **qué hace cada proyecto**, **qué hace cada carpeta** y **cómo viaja una petición** desde que alguien toca un botón hasta que se guarda o se consulta un dato.

Renfi son **tres proyectos** que trabajan juntos. Esta guía vive en el de la API, pero describe los tres.

---

## 1. ¿Qué es Renfi?

Renfi es una plataforma para **reservar fincas** en Antioquia: los clientes buscan una finca, reservan fechas y pagan; los dueños publican y administran sus fincas; y el administrador supervisa todo.

Está formada por tres proyectos y un servicio en la nube:

| Proyecto | Repositorio | ¿Qué es? | Tecnología |
|---|---|---|---|
| **API Renfi** | `Ache-dev/API-Renfi` | El **backend**: la parte que trabaja “detrás de escena”, valida quién eres y qué puedes hacer, y guarda los datos. | Node.js, TypeScript, Express 5 |
| **Renfi (web)** | `Ache-dev/Renfi` | El **sitio web**: catálogo público, cuenta del cliente, panel del dueño y panel del administrador. | Angular 20 |
| **Renfi ExpoGO** | `Resx1983/Renfi-ExpoGO` | La **app móvil** (Android, iOS y web). | Expo (React Native) |
| **Supabase** | (en la nube) | La **base de datos** (PostgreSQL) y el **almacén de fotos** (Storage). | PostgreSQL + Storage |

```
  Web (Angular) ───┐
                   ├──── petición HTTPS + token ────►  API Renfi  ────►  Supabase
  App móvil (Expo) ┘     "dame las fincas"            (este proyecto)    ├─ Base de datos (datos)
                   ◄──── respuesta JSON ────                             └─ Storage (fotos)
```

**La regla más importante:** ni la web ni la app hablan jamás con Supabase. Todo pasa por la API. Ella es la única que tiene la llave de la base de datos y la que decide quién puede hacer qué.

### Quién usa Renfi (los roles)

| Rol | ¿Qué puede hacer? | ¿Dónde? |
|---|---|---|
| **Visitante** (sin sesión) | Ver el catálogo de fincas, sus fotos y el calendario de fechas ocupadas. | Web y app |
| **Cliente** | Todo lo anterior + reservar, pagar, ver y cancelar **sus** reservas, editar su perfil. | Web y app |
| **Dueño de finca** | Publicar fincas a su nombre, personalizar su ficha y galería, ver y gestionar las reservas y pagos de **sus** fincas. | API y web (panel “Mi finca”) |
| **Administrador** | Todo: usuarios, roles, catálogos, todas las reservas, facturas y pagos, reportes. | Web y app |

Tecnologías principales de la API:

| Tecnología | ¿Para qué sirve? |
|---|---|
| **Node.js** | Permite ejecutar JavaScript fuera del navegador (en el servidor). |
| **TypeScript** | JavaScript con “tipos”: ayuda a evitar errores escribiendo qué forma tienen los datos. |
| **Express 5** | Librería que facilita crear las “rutas” (URLs) de la API. |
| **Supabase (PostgreSQL + Storage)** | La base de datos donde se guardan los datos y el almacén donde se guardan las fotos. |
| **JWT + bcrypt** | El “token” de sesión y el cifrado de contraseñas. |
| **multer + sharp** | Reciben y optimizan las fotos que se suben. |

---

## 2. Estructura de carpetas

### 2.1. API Renfi (`API-Renfi/`)

```
API-Renfi/
├── src/                  ← Todo el código fuente (lo que escribimos)
│   ├── index.ts          ← 1. Arranque: enciende el servidor
│   ├── app.ts            ← 2. Configura Express y conecta todas las rutas
│   ├── config/           ← Lee las variables del archivo .env
│   ├── conexion/         ← Conecta con Supabase (supabase.ts) y con Storage (storage.ts)
│   ├── routes/           ← 3. Las URLs que existen (ej: /api/finca) y quién puede usarlas
│   ├── controllers/      ← 4. Recibe la petición y devuelve la respuesta
│   ├── services/         ← 5. Reglas del negocio (la “lógica”)
│   ├── dao/              ← 6. Habla con la base de datos
│   ├── models/           ← 7. Describe la forma de los datos (Usuario, Finca…)
│   └── middlewares/      ← Filtros: sesión y permisos, errores, IDs, subida de archivos, límite de intentos
├── db/
│   ├── seed.sql          ← Datos de ejemplo para empezar (roles, municipios, usuarios…)
│   ├── migraciones/      ← Cambios de la base de datos, numerados (001, 002, 003…)
│   └── seguridad.sql     ← Cierra la base de datos a todo el que no sea la API
├── supabase_schema.sql   ← “Plano” base de la base de datos (¡solo para una base nueva!)
├── test/                 ← Pruebas automáticas
├── .env                  ← Tus configuraciones privadas (NO se sube a git)
├── .env.example          ← Plantilla del .env, sin datos sensibles
├── package.json          ← Lista de librerías y comandos (npm start, npm test…)
└── tsconfig.json         ← Configuración del compilador de TypeScript
```

### 2.2. Web (`Renfi/`, Angular)

```
Renfi/
├── src/
│   ├── app/
│   │   ├── app-routing-module.ts  ← Las páginas que existen y quién puede entrar a cada una
│   │   ├── core/                  ← Lo compartido por toda la web
│   │   │   ├── interceptors/      ← auth.interceptor: agrega el token a cada petición
│   │   │   ├── models/            ← Forma de los datos (Finca, Reserva, Imagen…)
│   │   │   └── services/          ← Hablan con la API (fincas, imágenes, usuarios, gestión de fincas)
│   │   ├── template/              ← Páginas públicas: inicio, detalle de finca, iniciar sesión,
│   │   │   │                         registrarse, sobre nosotros, encabezado y pie
│   │   │   └── services/          ← Sesión (auth-state), login, reservas, checkout…
│   │   ├── usuario/               ← Zona del cliente: mi cuenta, pasarela de pago, comprobante
│   │   ├── dueno/                 ← Panel “Mi finca” del dueño: resumen, mis fincas, reservas, ingresos
│   │   └── administrador/         ← Panel del administrador: una pantalla por entidad
│   │       ├── resource-crud/     ← Pantalla genérica de listar/crear/editar/borrar
│   │       ├── admin-resources.config.ts ← Describe los campos de cada entidad
│   │       ├── shared/            ← Piezas compartidas con el panel del dueño (gestor de fincas, galería)
│   │       └── guards/            ← Porteros que impiden entrar a quien no corresponde
│   ├── environments/              ← environment.ts: aquí está la URL de la API
│   └── styles.css                 ← Estilos globales (colores, botones, tarjetas)
├── public/                        ← Imágenes e íconos estáticos
├── DESIGN.md / PRODUCT.md         ← Sistema de diseño y visión del producto
└── package.json                   ← Librerías y comandos (npm start, ng test…)
```

### 2.3. App móvil (`Renfi-ExpoGO/`, Expo)

```
Renfi-ExpoGO/
├── src/
│   ├── app/              ← Las pantallas. Cada archivo es una ruta (Expo Router):
│   │   ├── index.tsx             → inicio con el catálogo
│   │   ├── fincas/[id].tsx       → detalle de una finca
│   │   ├── reserva/              → pago y comprobante
│   │   ├── iniciar-sesion.tsx, registrarse.tsx, mi-cuenta.tsx, sobre-nosotros.tsx
│   │   └── administrador/        → panel admin (listas, formularios, galería de cada finca)
│   ├── components/       ← Piezas reutilizables (encabezado, calendario, botones…)
│   ├── services/         ← Hablan con la API (api.ts es el cliente HTTP; auth, fincas, reservas, admin, fotos)
│   ├── context/          ← AuthContext: guarda quién inició sesión
│   ├── constants/        ← Colores, tipografías y configuración del panel admin
│   └── types/            ← Forma de los datos
├── __tests__/            ← Pruebas automáticas
├── app.json              ← Configuración de la app (nombre, íconos, permisos)
├── .env.example          ← Plantilla: EXPO_PUBLIC_API_URL
└── package.json          ← Librerías y comandos
```

---

## 3. El camino de una petición (la idea más importante)

### 3.1. Dentro de la API

Imagina que el código de la API es un **restaurante**. Cada capa tiene un trabajo distinto:

| Capa | Carpeta | Analogía del restaurante | Qué hace |
|---|---|---|---|
| **Ruta** | `routes/` | La carta del menú y el portero | Dice qué pedidos existen (`GET /api/finca`, `POST /api/reserva`…) y quién puede hacerlos. |
| **Controlador** | `controllers/` | El mesero | Recibe el pedido, lo revisa a nivel básico y devuelve la respuesta. |
| **Servicio** | `services/` | El chef | Aplica las reglas: validaciones, cálculos, decisiones del negocio. |
| **DAO** | `dao/` | El bodeguero | Va a la base de datos a buscar o guardar lo que se necesita. |
| **Base de datos** | (Supabase) | La despensa | Guarda los datos de forma permanente. |

#### Ejemplo real: “registrar un usuario”

```
POST /api/usuario   (la web o la app envían los datos del nuevo usuario)
   │
   ▼
routes/usuario.route.ts          → “esta URL existe”; limita los intentos para frenar abusos
   │
   ▼
controllers/usuario.controller.ts → recibe los datos del cuerpo de la petición
   │
   ▼
services/usuario.service.ts      → valida, comprueba que el correo no exista,
   │                               fija el rol de Cliente y cifra la contraseña (bcrypt)
   ▼
dao/usuario.dao.ts               → guarda: supabase.from('Usuario').insert(...)
   │
   ▼
Supabase (PostgreSQL)            → guarda el usuario y devuelve su número de documento
   │
   ▼
La respuesta viaja de regreso por las mismas capas hasta quien llamó (en formato JSON)
```

**Regla de oro:** cada capa solo habla con la de al lado. La ruta no toca la base de datos; el DAO no decide reglas de negocio. Así el código es más fácil de entender y de cambiar.

### 3.2. De punta a punta: de un botón a la base de datos

Esto pasa cuando un cliente reserva una finca desde la web o la app:

```
1. El cliente elige fechas y toca “Ir al pago”       (web: detalle-finca-component / app: fincas/[id].tsx)
2. El servicio del front arma la petición            (web: reserva.service.ts / app: reservas.service.ts)
3. El cliente HTTP agrega el token de sesión          (web: auth.interceptor / app: api.ts)
4. POST /api/reserva  ────────────────────────────►   API: comprueba el token, valida fechas y capacidad,
                                                       calcula el monto (noches × precio) y crea la factura
5. POST /api/pago     ────────────────────────────►   API: comprueba que la factura es del cliente y registra el pago
6. La API responde y el front muestra el comprobante
```

### 3.3. ¿Cómo sabe la API quién eres? (la sesión)

1. Al iniciar sesión (`POST /api/usuario/login`), la API verifica tu contraseña y te entrega un **token** (JWT).
2. El front lo guarda y lo envía en cada petición: `Authorization: Bearer <token>`.
3. En cada petición, la API revisa el token **y** vuelve a consultar tu usuario: si te desactivaron, te borraron, cambiaste de contraseña o de rol, el token deja de valer al instante.
4. Si el token falta o venció, la API responde `401` y el front te lleva a iniciar sesión.

### 3.4. ¿Y si algo falla?

Todos los errores se envían al **middleware de errores** (`middlewares/error.middleware.ts`), que responde siempre con un formato parecido a este:

```json
{ "success": false, "message": "La ruta 'GET /api/algo' no existe en esta API." }
```

Los códigos más comunes: `400` datos inválidos, `401` sin sesión o sesión vencida, `403` no tienes permiso, `404` no existe, `409` conflicto (ej. fechas ya reservadas o correo repetido), `413` archivo demasiado grande, `429` demasiados intentos.

---

## 4. Qué hay dentro de cada proyecto, paso a paso

### 4.1. API: dentro de `src/`

1. **`index.ts`**: el “botón de encendido”. Enciende el servidor en el puerto 3000 (por defecto) y cierra bien al apagarlo.
2. **`app.ts`**: prepara Express: permite peticiones de otros sitios (CORS), entiende JSON, registra las rutas (`/api/usuario`, `/api/finca`, etc.) y el manejo de errores.
3. **`config/env.config.ts`**: lee el archivo `.env` y deja la configuración lista (puerto, Supabase, clave JWT…). Si falta `JWT_SECRET`, la API se niega a arrancar.
4. **`conexion/`**: `supabase.ts` crea la conexión con la base de datos y `storage.ts` sube, borra y arma la URL pública de las fotos. Se explican en la sección 5.
5. **`routes/`**: un archivo por entidad. Ejemplo: `finca.route.ts` define `GET /api/finca`, `POST /api/finca`, etc., y qué rol puede usar cada una.
6. **`controllers/`**: una función por cada acción (listar, crear, actualizar, borrar).
7. **`services/`**: la lógica de negocio. Ejemplo: en reservas, aquí se valida que las fechas tengan sentido y se calcula el monto; en imágenes, aquí se valida y optimiza la foto.
8. **`dao/`**: las consultas a la base de datos (`supabase.from('Finca').select(...)`).
9. **`models/`**: “plantillas” de los datos. Ejemplo: un `Usuario` tiene `NombreUsuario`, `Correo`, `IdRol`… y así se sabe qué forma tiene cada objeto.
10. **`middlewares/`**: filtros reutilizables:
    - `auth.middleware.ts`: revisa el token y los permisos (`soloAdmin`, `adminODueno`, `propioOAdmin`, `duenoOAdmin`).
    - `error.middleware.ts`: captura errores y responde en JSON.
    - `validate-id.middleware.ts`: revisa que el `:id` sea un número válido.
    - `rate-limit.middleware.ts`: limita los intentos de login y registro para frenar la fuerza bruta.
    - `upload.middleware.ts`: recibe el archivo de una foto (máx. 5 MB).

**Las entidades del sistema** (un archivo de cada una en routes, controllers, services, dao y models):
`usuario`, `finca`, `reserva`, `pago`, `factura`, `metododepago`, `municipio`, `imagen`, `rol`.

### 4.2. Web: dentro de `src/app/` (Angular)

Angular organiza el código en **módulos** (grupos de piezas) y **componentes** (cada pantalla o trozo de pantalla: un `.ts` con la lógica, un `.html` con lo que se ve y un `.css` con el estilo).

1. **`app-routing-module.ts`**: el mapa de la web. Lista las páginas (`/inicio`, `/fincas/:id`, `/mi-cuenta`, `/reserva/pago`…) y cuáles tienen portero: `/administrador` solo para administradores y `/mi-finca` solo para dueños de finca (y administradores).
2. **`core/`**: lo compartido. El **interceptor** agrega el token a cada petición y, si la API responde `401`, cierra la sesión. Los **servicios** (`finca.service`, `imagen.service`, `gestion-fincas.service`…) son los únicos que hablan con la API.
3. **`template/`**: las páginas públicas (inicio, detalle de finca con calendario y reserva, iniciar sesión, registrarse). Aquí también está `auth-state.service`, que recuerda quién inició sesión.
4. **`usuario/`**: la zona del cliente: **mi cuenta** (perfil y reservas, con opción de cancelar), **pasarela de pago** y **comprobante**.
5. **`dueno/`**: el panel **“Mi finca”**: resumen, mis fincas (crear, editar, subir fotos), reservas recibidas (confirmar, finalizar o cancelar) e ingresos.
6. **`administrador/`**: el panel del administrador, con una pantalla por entidad. La mayoría usa `resource-crud`, una pantalla genérica configurada con `admin-resources.config.ts` (qué campos tiene cada entidad). El gestor de fincas y la galería de fotos están en `shared/` porque los usan tanto el administrador como el dueño.
7. **`guards/`**: los “porteros” (`AdminGuard`, `DuenoGuard`). Importante: ocultar un botón **no** es seguridad; la seguridad real la pone siempre la API.

### 4.3. App móvil: dentro de `src/` (Expo)

1. **`app/`**: cada archivo es una pantalla y su nombre es su ruta (así funciona **Expo Router**). `_layout.tsx` define la navegación general.
2. **`services/api.ts`**: el cliente HTTP. Agrega el token, traduce los errores de red a mensajes claros y cierra la sesión si el token venció. Los demás servicios (`auth`, `fincas`, `reservas`, `admin`) lo usan y **nunca** llaman a Supabase.
3. **`services/fotos.ts`**: abre la galería del teléfono y reduce la foto antes de subirla.
4. **`context/AuthContext.tsx`**: guarda el usuario y el token en el teléfono.
5. **`components/` y `constants/`**: piezas visuales reutilizables y el sistema de colores y tipografías.

> Por ahora el panel del **dueño de finca** existe solo en la web y en la API; la app móvil tiene las vistas de cliente y de administrador.

---

## 5. ¿Dónde está alojada la base de datos y cómo funciona?

Esta es la parte que más confunde al principio, así que la explicamos con calma.

### 5.1. Supabase: base de datos + almacén de fotos

La base de datos es **PostgreSQL**, un sistema de bases de datos muy conocido. Está alojada en **Supabase**, un servicio en la nube que te da un PostgreSQL listo para usar (sin instalar nada en tu computador) y, además, un **Storage** para guardar archivos como las fotos de las fincas.

La API se conecta a Supabase por **HTTPS** usando la librería `@supabase/supabase-js`. Solo necesita estas variables en su `.env`:

| Variable | ¿Qué es? |
|---|---|
| `SUPABASE_URL` | La URL de tu proyecto (`https://<ref>.supabase.co`). |
| `SUPABASE_KEY` | La llave de la API. En el backend se usa la clave **secret** (`sb_secret_...`). |
| `SUPABASE_BUCKET_FINCAS` | El bucket de fotos (por defecto `fincas-imagenes`). |
| `JWT_SECRET` | Texto largo y aleatorio (mín. 32 caracteres) para firmar los tokens. **Obligatorio.** |
| `JWT_EXPIRES_IN` | Cuánto dura una sesión (por defecto `1d`). |
| `CORS_ORIGIN` | Qué sitios web pueden llamar a la API. |

La web y la app **no** necesitan ninguna llave de Supabase: solo la URL de la API (`apiUrl` en `src/environments/environment.ts` de la web y `EXPO_PUBLIC_API_URL` en el `.env` de la app).

### 5.2. Cómo conectarse a Supabase

1. Abre tu proyecto en el panel de Supabase.
2. Ve a **Project Settings → API Keys**, crea (o copia) la clave **secret** y copia la **Project URL**.
3. Pégalas en `SUPABASE_URL` y `SUPABASE_KEY` dentro del `.env` de la API.
4. Si la base está vacía, arma el esquema (sección 5.4).
5. Inicia la API con `npm start`.

> ⚠️ **Nunca subas un `.env` a git ni pongas la clave *secret* en la web o en la app.** Los tres proyectos ya lo excluyen en su `.gitignore`, pero revísalo antes de un commit. Si una clave se publicó por error, bórrala del repositorio **y** rótala en Supabase: borrar el archivo no la quita del historial de git.

### 5.3. Las fotos de las fincas (Storage)

- Las fotos viven en un bucket **público** de Supabase llamado `fincas-imagenes`: se pueden **ver** con su URL, pero solo la API puede **subir o borrar**.
- Para subir una foto, el front envía el archivo a la API (`POST /api/finca/:id/imagenes`). La API comprueba que sea una imagen real, le quita los datos de ubicación (GPS), la reduce a 1600 px y la convierte a **WebP**. Límites: 5 MB por foto y 10 fotos por finca.
- La primera foto de una finca queda como **portada**; se puede cambiar, reordenar o borrar (el archivo se borra también de Storage).
- En la base de datos solo se guarda la **ruta** del archivo (`finca-12/uuid.webp`). La URL que reciben el front y la app (`UrlImagen`) la calcula la API; no es una columna.

### 5.4. El esquema de la base de datos

El archivo `supabase_schema.sql` es el “plano” base. Tiene:

- **9 tablas**: `Rol`, `Usuario`, `Municipio`, `Finca`, `Imagen`, `MetodoDePago`, `Reserva`, `Factura`, `Pago`.
- **Relaciones** entre tablas (claves foráneas). Por ejemplo, una `Reserva` pertenece a una `Finca` y a un `Usuario`; una `Imagen` pertenece a una `Finca`.
- **36 funciones** llamadas `SP_...`. Quedan en el esquema por compatibilidad, pero la API ya no las usa: los DAO consultan las tablas directamente.
- **Datos semilla** (`db/seed.sql`): roles, municipios de Antioquia, métodos de pago y un usuario administrador.

> ⚠️ `supabase_schema.sql` **borra y recrea todas las tablas**: úsalo solo en una base **nueva o vacía**. Si la base ya tiene datos, solo se aplican las migraciones.

**Las migraciones** (`db/migraciones/`) llevan una base ya creada al esquema actual, **en orden**, sin perder datos. Cada una se pega y ejecuta en el **SQL Editor** de Supabase y se puede repetir sin problema:

| Migración | ¿Qué hace? |
|---|---|
| `001_imagenes_y_ficha_finca.sql` | Crea el bucket de fotos, agrega los datos de cada foto (ruta, orden, portada…) y completa la ficha de la finca (habitaciones, baños, camas, comodidades, reglas, horarios, mascotas, eventos, coordenadas). |
| `002_eliminar_url_imagen.sql` | Elimina la columna `UrlImagen`: todas las fotos viven en Storage. Se detiene sin cambiar nada si alguna foto aún no está allí. |
| `003_rol_dueno_de_finca.sql` | Crea el rol “Dueño de finca” (o renombra el antiguo “Propietario”). |

Orden recomendado al actualizar: **1)** ejecutar la migración, **2)** desplegar la API nueva, **3)** ejecutar `db/seguridad.sql` cuando la API ya use la clave secret. Si la API corre antes de que exista una columna que necesita, esas rutas responden `500`.

### 5.5. ¿Cómo se usa la base de datos desde el código?

Los DAO obtienen el cliente con `getSupabase()` (`src/conexion/supabase.ts`) y usan el constructor de consultas:

```ts
const filas = await unwrap(getSupabase().from('Rol').select('IdRol, NombreRol').order('IdRol'));
```

`unwrap()` devuelve los datos o lanza el error de Postgres, que `error.middleware` traduce a una respuesta 4xx en español. Los datos relacionados (por ejemplo, municipio y propietario de una finca) se piden con *embeds*: `Finca` → `Municipio(NombreMunicipio)`.

---

## 6. Seguridad y permisos

- **La API es la única puerta** a la base de datos. Con `db/seguridad.sql` aplicado, la clave pública de Supabase ya no puede leer ni escribir nada.
- **Contraseñas**: se guardan cifradas con bcrypt; nunca se devuelven en ninguna respuesta. Los clientes pueden enviarlas en claro o ya con SHA-512 (la web lo hace).
- **Sesión**: token JWT que dura 1 día y se revalida contra la base de datos en cada petición (se “cancela” al desactivar al usuario, cambiar su contraseña o su rol).
- **Roles**: cada ruta de la API declara quién puede usarla. Resumen:

| Acción | Visitante | Cliente | Dueño de finca | Administrador |
|---|---|---|---|---|
| Ver fincas, fotos y fechas ocupadas | Sí | Sí | Sí | Sí |
| Registrarse (como cliente o como dueño) | Sí | — | — | Puede elegir cualquier rol |
| Ver y editar **su** perfil | No | Sí | Sí | Cualquiera |
| Reservar y pagar (el monto lo calcula la API) | No | Sí, a su nombre | Sí, a su nombre | Cualquiera |
| Ver y cancelar **sus** reservas | No | Sí | Sí | Todas |
| Crear, editar y borrar fincas y sus fotos | No | No | Solo **sus** fincas | Todas |
| Confirmar, finalizar o cancelar reservas de una finca | No | No | Solo las de **sus** fincas | Todas |
| Ver pagos de sus fincas | No | No | Sí | Todos |
| Usuarios, roles, catálogos, facturas, reportes | No | No | No | Sí |

- **Los `.env` no se versionan**: tienen las credenciales de la base de datos.

---

## 7. Cómo ejecutar los proyectos (resumen)

**Arranca primero la API**; la web y la app dependen de ella.

### API (`API-Renfi`)
```bash
npm install     # 1. Instala las librerías
# 2. Crea tu archivo .env copiando .env.example (SUPABASE_URL, SUPABASE_KEY, JWT_SECRET…)
npm start       # 3. Arranca la API en modo desarrollo (http://localhost:3000)
npm test        # 4. Ejecuta las pruebas
npm run build   # 5. Compila TypeScript a JavaScript en la carpeta dist/
npm run serve   # 6. Ejecuta la versión compilada
```
Prueba rápida: abre `http://localhost:3000/health`. Si responde `{"status":"UP"...}`, todo está funcionando.

### Web (`Renfi`)
```bash
npm install     # 1. Instala las librerías
npm start       # 2. Abre la web en http://localhost:4200 (usa la API de environment.ts)
npm test        # 3. Ejecuta las pruebas (necesita Chrome)
npm run build   # 4. Genera la versión para publicar
```

### App móvil (`Renfi-ExpoGO`)
```bash
npm install                  # 1. Instala las librerías
# 2. Crea tu .env copiando .env.example y pon EXPO_PUBLIC_API_URL
#    (en un celular físico usa la IP de tu PC, ej. http://192.168.1.20:3000, no "localhost")
npx expo start               # 3. Abre la app con Expo Go o un emulador
npm test                     # 4. Ejecuta las pruebas
npx tsc --noEmit             # 5. Revisa los tipos
```

---

## 8. Flujo de ejemplo: crear una finca y adjuntarle fotos

Lo puede hacer un **dueño de finca** (en el panel “Mi finca” de la web) o el **administrador** (en su panel, web o app). Son dos pasos:

1. **Crear la finca**: *Nuevo registro* con nombre, dirección, municipio, precio y capacidad (y, si quieres, la ficha completa: habitaciones, comodidades, reglas, horarios…). La API la guarda; si quien la crea es un dueño, siempre queda a su nombre.
2. **Subir las fotos**: en la galería de esa finca, *Agregar foto*. La primera queda como portada; luego puedes elegir otra portada o eliminar fotos.

A partir de ese momento la finca aparece en el catálogo público, con su portada y su galería, en la web y en la app.

---

## 9. Glosario rápido

| Término | Significado simple |
|---|---|
| **API** | Un “mesero” que recibe pedidos y entrega respuestas entre dos programas. |
| **Backend / Frontend** | El backend es la API (trabaja detrás de escena); el frontend es lo que ve el usuario (la web y la app). |
| **Endpoint / ruta** | Una URL concreta de la API, por ejemplo `GET /api/finca`. |
| **JSON** | Formato de texto para enviar datos, con llaves y valores: `{ "nombre": "Finca" }`. |
| **Controlador, servicio, DAO** | Capas del código de la API con responsabilidades separadas (ver sección 3). |
| **SQL** | El lenguaje para hablar con bases de datos (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). |
| **Tabla** | Como una hoja de Excel: columnas (campos) y filas (registros). |
| **Clave foránea** | Un campo que apunta a un registro de otra tabla (ej: `IdFinca` en Reserva). |
| **Migración** | Un script SQL numerado que cambia la base de datos sin perder los datos. |
| **Supabase** | El servicio en la nube que aloja la base de datos PostgreSQL y el Storage. |
| **Storage / bucket** | El almacén de archivos de Supabase; un bucket es como una carpeta raíz (aquí, las fotos de fincas). |
| **WebP** | Formato de imagen liviano al que la API convierte todas las fotos. |
| **.env** | Archivo con configuraciones privadas (contraseñas, URLs, claves). Nunca se sube a git. |
| **JWT / token** | Una “llave” digital que identifica a un usuario que ya inició sesión y viaja en cada petición (`Authorization: Bearer …`). |
| **bcrypt** | El método con el que se guardan las contraseñas cifradas. |
| **Rol** | El tipo de usuario (Cliente, Dueño de finca, Administrador) que define lo que puede hacer. |
| **Middleware** | Un filtro que se ejecuta entre la petición y la respuesta (sesión, permisos, errores). |
| **CORS** | La regla que decide qué sitios web pueden llamar a la API desde el navegador. |
| **Angular** | El framework con el que está hecha la web. Se organiza en módulos y componentes. |
| **Componente** | Una pantalla o trozo de pantalla de Angular (lógica `.ts`, vista `.html`, estilo `.css`). |
| **Guard (portero)** | Pieza de Angular que decide si puedes entrar a una página (ej. solo administradores). |
| **Interceptor** | Pieza de Angular que se mete en todas las peticiones (aquí, para agregar el token). |
| **Expo / React Native** | La tecnología con la que está hecha la app móvil. |
| **Expo Router** | Sistema donde cada archivo de `src/app/` es una pantalla de la app. |
