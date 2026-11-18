# Guía sencilla: cómo está organizado el código de API Renfi

Esta guía explica el proyecto de forma simple, pensada para personas que están aprendiendo. No necesitas saber todo de memoria: la idea es entender **qué hace cada carpeta** y **cómo viaja una petición** desde que llega hasta que se guarda o se consulta un dato.

---

## 1. ¿Qué es esta API?

Es un **backend**: la parte del sistema que trabaja “detrás de escena”. Las aplicaciones (la web pública de usuarios y el panel de administración en Angular) no tocan la base de datos directamente. Le hacen preguntas a la API por internet, y la API responde.

```
  Frontend (Angular)  ──── petición HTTP ────►  API Renfi  ────►  Base de datos
   (lo que ve el usuario)   "dame las fincas"   (este proyecto)    (donde están los datos)
                       ◄──── respuesta JSON ────
```

Tecnologías principales:

| Tecnología | ¿Para qué sirve? |
|---|---|
| **Node.js** | Permite ejecutar JavaScript fuera del navegador (en el servidor). |
| **TypeScript** | JavaScript con “tipos”: ayuda a evitar errores escribiendo qué forma tienen los datos. |
| **Express 5** | Librería que facilita crear las “rutas” (URLs) de la API. |
| **PostgreSQL (Azure)** | La base de datos donde se guardan todos los datos (Azure Database for PostgreSQL). |

---

## 2. Estructura de carpetas

```
API-Renfi/
├── src/                  ← Todo el código fuente (lo que escribimos)
│   ├── index.ts          ← 1. Arranque: enciende el servidor
│   ├── app.ts            ← 2. Configura Express y conecta todas las rutas
│   ├── config/           ← Lee las variables del archivo .env
│   ├── conexion/         ← Conecta con la base de datos
│   ├── routes/           ← 3. Las URLs que existen (ej: /api/finca)
│   ├── controllers/      ← 4. Recibe la petición y devuelve la respuesta
│   ├── services/         ← 5. Reglas del negocio (la “lógica”)
│   ├── dao/              ← 6. Habla con la base de datos (llama a procedimientos almacenados)
│   ├── models/           ← 7. Describe la forma de los datos (Usuario, Finca…)
│   └── middlewares/      ← Filtros que se ejecutan antes o después (errores, IDs, login)
├── db/
│   └── azure/
│       ├── schema.sql        ← “Plano” de la base de datos: tablas, triggers y procedimientos sp_*
│       ├── seed_demo.sql     ← Datos de ejemplo solo para desarrollo
│       └── migrar_datos.md   ← Cómo traer los datos de una base anterior
├── test/                 ← Pruebas automáticas
├── .env                  ← Tus configuraciones privadas (NO se sube a git)
├── .env.example          ← Plantilla del .env, sin datos sensibles
├── package.json          ← Lista de librerías y comandos (npm start, npm test…)
└── tsconfig.json         ← Configuración del compilador de TypeScript
```

---

## 3. El camino de una petición (la idea más importante)

Imagina que el código es un **restaurante**. Cada capa tiene un trabajo distinto:

| Capa | Carpeta | Analogía del restaurante | Qué hace |
|---|---|---|---|
| **Ruta** | `routes/` | La carta del menú | Dice qué pedidos existen (`GET /api/finca`, `POST /api/reserva`…). |
| **Controlador** | `controllers/` | El mesero | Recibe el pedido, lo revisa a nivel básico y devuelve la respuesta. |
| **Servicio** | `services/` | El chef | Aplica las reglas: validaciones, cálculos, decisiones del negocio. |
| **DAO** | `dao/` | El bodeguero | Va a la base de datos a buscar o guardar lo que se necesita. |
| **Base de datos** | (externa) | La despensa | Guarda los datos de forma permanente. |

### Ejemplo real: “registrar un usuario”

```
POST /api/usuario   (el frontend envía los datos del nuevo usuario)
   │
   ▼
routes/usuario.route.ts          → “esta URL existe y va al controlador de crear usuario”
   │
   ▼
controllers/usuario.controller.ts → recibe los datos del cuerpo de la petición
   │
   ▼
services/usuario.service.ts      → valida, prepara los datos (ej: contraseña)
   │
   ▼
dao/usuario.dao.ts               → ejecuta: SELECT public."SP_RegistrarUsuario"(...)
   │
   ▼
Base de datos                    → guarda el usuario y devuelve su número de documento
   │
   ▼
La respuesta viaja de regreso por las mismas capas hasta el frontend (en formato JSON)
```

**Regla de oro:** cada capa solo habla con la de al lado. La ruta no toca la base de datos; el DAO no decide reglas de negocio. Así el código es más fácil de entender y de cambiar.

### ¿Y si algo falla?

Todos los errores se envían al **middleware de errores** (`middlewares/error.middleware.ts`), que responde siempre con un formato parecido a este:

```json
{ "success": false, "message": "La ruta 'GET /api/algo' no existe en esta API." }
```

---

## 4. Qué hay dentro de `src/`, paso a paso

1. **`index.ts`**: el “botón de encendido”. Enciende el servidor en el puerto 3000 (por defecto) y cierra bien las conexiones cuando lo apagas.
2. **`app.ts`**: prepara Express: permite peticiones de otros sitios (CORS), entiende JSON, registra las rutas (`/api/usuario`, `/api/finca`, etc.) y el manejo de errores.
3. **`config/env.config.ts`**: lee el archivo `.env` y deja la configuración lista para usar (puerto, base de datos, clave JWT…).
4. **`conexion/`**: crea la conexión con la base de datos. Lo explicamos en detalle en la sección 5.
5. **`routes/`**: una carpeta con un archivo por entidad. Ejemplo: `finca.route.ts` define `GET /api/finca`, `POST /api/finca`, etc.
6. **`controllers/`**: una función por cada acción (listar, crear, actualizar, borrar).
7. **`services/`**: la lógica de negocio. Ejemplo: en reservas, aquí se valida que las fechas tengan sentido.
8. **`dao/`**: las consultas a la base de datos. Usan funciones guardadas en la base de datos (`SP_...`) o consultas SQL directas.
9. **`models/`**: “plantillas” de los datos. Ejemplo: un `Usuario` tiene `NombreUsuario`, `Correo`, `IdRol`… y así se sabe qué forma tiene cada objeto.
10. **`middlewares/`**: filtros reutilizables:
    - `error.middleware.ts`: captura errores y responde en JSON.
    - `validate-id.middleware.ts`: revisa que el `:id` sea un número válido.
    - `auth.middleware.ts`: revisa el token JWT (la “llave” de sesión).

**Las entidades del sistema** (una carpeta de cada una en routes, controllers, services, dao y models):
`usuario`, `finca`, `reserva`, `pago`, `factura`, `metododepago`, `municipio`, `imagen`, `rol`.

---

## 5. ¿Dónde está alojada la base de datos y cómo funciona?

Esta es la parte que más confunde al principio, así que la explicamos con calma.

### 5.1. La base de datos es PostgreSQL

La base de datos es **PostgreSQL**, alojada en **Azure Database for PostgreSQL**. Las imágenes de las fincas viven en **Azure Blob Storage**. La API se conecta con la librería `pg` y necesita estas variables en el `.env`:

| Variable | ¿Qué es? |
|---|---|
| `DATABASE_URL` | Cadena de conexión del rol `renfi_app` (solo puede ejecutar procedimientos). |
| `AZURE_STORAGE_ACCOUNT_URL` | URL de la cuenta de almacenamiento (`https://<cuenta>.blob.core.windows.net`). |
| `AZURE_STORAGE_CONTAINER` | Contenedor público de imágenes (`fincas-imagenes`). |
| `AZURE_STORAGE_CONNECTION_STRING` | Solo desarrollo; en Azure se usa identidad administrada. |

### 5.2. Cómo conectarse

1. Crea el servidor PostgreSQL y la cuenta de almacenamiento en Azure.
2. Ejecuta `db/azure/schema.sql` como administrador (ver el README, “Despliegue en Azure”).
3. Copia `.env.example` a `.env` y completa las variables.
4. Inicia la API con `npm start`. Si falta algo, falla al arrancar con un mensaje claro.

> ⚠️ **Nunca subas tu `.env` a git.** El archivo `.gitignore` ya lo excluye, pero revísalo antes de un commit.

### 5.4. El esquema de la base de datos

El archivo `db/azure/schema.sql` es el “plano”. Tiene:

- **9 tablas**: `Rol`, `Usuario`, `Municipio`, `Finca`, `Imagen`, `MetodoDePago`, `Reserva`, `Factura`, `Pago`.
- **Relaciones** entre tablas (claves foráneas). Por ejemplo, una `Reserva` pertenece a una `Finca` y a un `Usuario`.
- **Restricciones y triggers** que impiden datos imposibles (fechas al revés, reservas solapadas, pagos que superan la factura).
- **Procedimientos `sp_...`**: la única forma en que la API toca los datos. Su rol de base de datos no puede leer ni escribir tablas directamente.
- **Datos semilla**: roles (Administrador, Cliente, Dueño de finca), municipios de Antioquia, métodos de pago y un usuario administrador.

### 5.5. ¿Cómo se usa la base de datos desde el código?

Los DAO no contienen SQL: llaman a un procedimiento con parámetros mediante los helpers de `src/conexion/postgres.ts`:

```ts
export const listar = (): Promise<Rol[]> => filas('sp_rol_listar');
export const buscarPorId = (id: number): Promise<Rol | null> => fila('sp_rol_buscar', [id]);
```

Si la base rechaza un dato, el error de PostgreSQL (con su código) llega a `error.middleware`, que lo traduce a una respuesta 4xx en español. Los procedimientos ya devuelven los datos relacionados (por ejemplo, municipio y propietario de una finca) en la misma fila.

---

## 6. Cómo ejecutar el proyecto (resumen)

```bash
npm install     # 1. Instala las librerías
# 2. Crea tu archivo .env copiando .env.example con tu DATABASE_URL y las variables de Azure
npm start       # 3. Arranca la API en modo desarrollo (http://localhost:3000)
npm test        # 4. Ejecuta las pruebas
npm run build   # 5. Compila TypeScript a JavaScript en la carpeta dist/
npm run serve   # 6. Ejecuta la versión compilada
```

Prueba rápida: abre `http://localhost:3000/health` en el navegador. Si responde `{"status":"UP"...}`, todo está funcionando.

---

## 7. Glosario rápido

| Término | Significado simple |
|---|---|
| **API** | Un “mesero” que recibe pedidos y entrega respuestas entre dos programas. |
| **Endpoint / ruta** | Una URL concreta de la API, por ejemplo `GET /api/finca`. |
| **JSON** | Formato de texto para enviar datos, con llaves y valores: `{ "nombre": "Finca" }`. |
| **Controlador, servicio, DAO** | Capas del código con responsabilidades separadas (ver sección 3). |
| **SQL** | El lenguaje para hablar con bases de datos (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). |
| **Tabla** | Como una hoja de Excel: columnas (campos) y filas (registros). |
| **Clave foránea** | Un campo que apunta a un registro de otra tabla (ej: `IdFinca` en Reserva). |
| **Función almacenada (SP_)** | Código SQL guardado dentro de la base de datos y reutilizable. |
| **.env** | Archivo con configuraciones privadas (contraseñas, URLs, claves). |
| **JWT** | Un “token” o llave digital que identifica a un usuario que ya inició sesión. |
| **Middleware** | Un filtro que se ejecuta entre la petición y la respuesta. |
