# 🌿 API Renfi — Backend RESTful

Backend RESTful para la plataforma **Renfi**, una solución integral para la gestión y reserva de fincas vacacionales y turísticas. Esta API alimenta tanto la aplicación pública de usuarios como el panel de administración en Angular ([Renfi Frontend](https://github.com/Ache-dev/Renfi)).

Desarrollado con **Node.js**, **Express 5**, **TypeScript** y **SQL Server**.

---

## 🏛️ Arquitectura del Proyecto (Clean Architecture & Clean Code)

El proyecto sigue una arquitectura en capas desacopladas (**Layered Architecture**) aplicando los principios **SOLID**, separación de responsabilidades y tipado estricto con TypeScript:

```
API-Renfi/
├── .env                       # Variables de entorno locales
├── .env.example               # Plantilla de variables de entorno
├── BD Renfi.sql               # Script DDL y Procedimientos Almacenados SQL Server
├── package.json               # Dependencias y scripts de ejecución
├── tsconfig.json              # Configuración de TypeScript
├── src/
│   ├── config/                # Configuración global y variables de entorno tipadas
│   │   └── env.config.ts
│   ├── conexion/              # Conectividad a base de datos y ConnectionPool
│   │   ├── config.ts          # Configuración del driver mssql
│   │   └── connection.ts      # Singleton resiliente del ConnectionPool
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
   - **Retorno de Identificadores Creados**: En todas las operaciones de creación (`POST /api/reserva`, `POST /api/factura`, `POST /api/pago`, `POST /api/finca`, `POST /api/usuario`, etc.), la API captura `SCOPE_IDENTITY()` y retorna explícitamente los IDs (`IdReserva`, `idReserva`, `id`, `IdFactura`, `IdPago`, etc.), evitando errores de resolución en el frontend.
   - **Filtros Dinámicos en Reservas**: `GET /api/reserva` ahora procesa parámetros de consulta (`?Correo=&NumeroDocumento=&IdFinca=&Estado=`), tal como lo requiere `ReservaService.listarReservas`.
   - **Compatibilidad con Panel de Administración**: Se soporta la eliminación tanto por parámetro de ruta (`DELETE /:id`) como por parámetro de consulta (`DELETE /delete?id=:id`), utilizado por `admin-resources.config.ts`.
   - **Consulta Enriquecida de Fincas e Imágenes**: `GET /api/finca/:id` ahora retorna los datos completos del propietario (`NombrePropietario`, `ApellidoPropietario`, `TelefonoPropietario`, `CorreoPropietario`), y `GET /api/imagen/finca/:id` responde sin bloqueos ni requerimientos circulares.
   - **Actualizaciones Parciales de Perfil**: El endpoint `PUT /api/usuario/:id` ahora admite actualizaciones parciales (como la realizada desde `MiCuentaUsuarios`), conservando los datos previos del usuario en lugar de requerir el objeto completo.

2. **Calidad de Código y Arquitectura**:
   - **Capa de Servicios**: Se separó la lógica de negocio y las validaciones de las capas de transporte (controladores) y persistencia (DAOs).
   - **ConnectionPool Singleton**: Manejo seguro del pool de SQL Server con reconexión automática y cierre controlado (*graceful shutdown*).
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
| `POST` | `/api/usuario` | Registra un nuevo usuario | `{ "NombreUsuario": "...", "ApellidoUsuario": "...", "Correo": "...", "Contrasena": "...", "Telefono": "...", "IdRol": 2 }` |
| `PUT` | `/api/usuario/:id` | Actualiza un usuario (parcial o total) | `{ "NombreUsuario": "...", "Telefono": "..." }` |
| `DELETE`| `/api/usuario/:id` | Elimina un usuario por ID | Ninguno |
| `DELETE`| `/api/usuario/delete?id=:id` | Elimina un usuario por query param | Ninguno |

### 2. Fincas (`/api/finca`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/finca` | Lista todas las fincas disponibles |
| `GET` | `/api/finca/:id` | Obtiene detalle completo de una finca |
| `POST` | `/api/finca` | Registra una nueva finca |
| `PUT` | `/api/finca/:id` | Actualiza los datos de una finca |
| `DELETE`| `/api/finca/:id` | Elimina una finca |
| `DELETE`| `/api/finca/delete?id=:id` | Elimina una finca por query param |
| `GET` | `/api/finca/report/mas-reservadas` | Reporte: Fincas con más reservas |
| `GET` | `/api/finca/report/promedio-calificacion` | Reporte: Promedio de calificación |
| `GET` | `/api/finca/report/total-ingresos` | Reporte: Total de ingresos por finca |
| `GET` | `/api/finca/report/mas-ingresos` | Reporte: Top fincas con mayores ingresos |

### 3. Reservas (`/api/reserva`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/reserva` | Lista reservas (soporta `?Correo=`, `?NumeroDocumento=`, `?IdFinca=`) |
| `GET` | `/api/reserva/:id` | Obtiene una reserva por ID |
| `GET` | `/api/reserva/usuario/:numeroDocumento` | Lista reservas de un usuario específico |
| `POST` | `/api/reserva` | Crea una reserva y genera factura automática inicial |
| `PUT` | `/api/reserva/:id` | Actualiza estado o fechas de una reserva |
| `DELETE`| `/api/reserva/:id` | Cancela/elimina una reserva |

### 4. Pagos (`/api/pago`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/pago` | Lista todos los pagos |
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
| `POST` | `/api/imagen` | Asocia una imagen a una finca |
| `PUT` | `/api/imagen/:id` | Actualiza URL de una imagen |
| `DELETE`| `/api/imagen/:id` | Elimina una imagen |

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

# Base de Datos SQL Server
DB_USER=sa
DB_PASSWORD=Passw0rd!
DB_SERVER=localhost
DB_DATABASE=Renfi
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Seguridad JWT
JWT_SECRET=renfi_jwt_super_secret_key_2025_safe_token
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*
```

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

