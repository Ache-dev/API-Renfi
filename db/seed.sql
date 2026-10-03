-- Seed demo de Renfi: fuente unica de verdad (antes SEED_FINCAS / SEED_USUARIOS en memoria).
-- Idempotente. Se aplica al iniciar la BD cuando public."Finca" tiene 0 filas.

INSERT INTO public."Rol" ("IdRol", "NombreRol") VALUES (1,'Administrador'),(2,'Cliente'),(3,'Propietario') ON CONFLICT DO NOTHING;

INSERT INTO public."Municipio" ("IdMunicipio", "NombreMunicipio") OVERRIDING SYSTEM VALUE VALUES
(1,'Medellín'),(2,'Guatapé'),(3,'Santa Fe de Antioquia'),(4,'Jardín'),(5,'Jericó'),(6,'Rionegro'),
(7,'El Peñol'),(8,'Barbosa'),(9,'Girardota'),(10,'Copacabana'),(11,'San Jerónimo'),(12,'La Ceja')
ON CONFLICT DO NOTHING;

-- Usuarios demo (contrasena en texto plano; login acepta plano o SHA-512).
-- NumeroDocumento 1 = admin@renfi.com (propietario de las fincas demo).
INSERT INTO public."Usuario" ("NumeroDocumento","IdRol","NombreUsuario","ApellidoUsuario","Telefono","Contrasena","Correo","Estado") OVERRIDING SYSTEM VALUE VALUES
(1,1,'Admin','Renfi','3001234567','admin123','admin@renfi.com','Activo'),
(10002,2,'Juan','Pérez','3109876543','cliente123','juan.perez@example.com','Activo'),
(10003,2,'Cliente','Demo','3114567890','cliente123','cliente@renfi.com','Activo')
ON CONFLICT DO NOTHING;

INSERT INTO public."Finca" ("IdFinca","IdMunicipio","NumeroDocumentoUsuario","NombreFinca","Direccion","InformacionAdicional","Capacidad","Precio","Estado","Calificacion")
OVERRIDING SYSTEM VALUE
SELECT v.id, m."IdMunicipio", 1, v.nombre, v.dir, v.info, v.cap, v.precio, 'Disponible', 5
FROM (VALUES
(1,'Guatapé','Finca Campestre El Paraíso','Km 5 Vía El Peñol - Guatapé','Hermosa finca colonial frente a la represa, muelle privado, jacuzzi climatizado, zona BBQ y amplios corredores con chambranas tradicionales.',16,850000),
(2,'Santa Fe de Antioquia','Villa Los Samanes de Santa Fe','Vereda El Espinal, Santa Fe de Antioquia','Clima cálido garantizado, piscina olímpica privada, palmeras, kiosco campestre y amplias áreas verdes para descanso familiar.',20,1200000),
(3,'Rionegro','Hacienda La Cordillera','Vereda Las Cuchillas, Rionegro','Exclusiva hacienda cafetera tradicional con vista panorámica a la cordillera, chimenea de leña, senderos y arquitectura en madera noble.',12,950000),
(4,'Jardín','Cabaña El Cafetal de Jardín','Camino a La Herradura, Jardín','Auténtica arquitectura andina rodeada de cafetales y orquídeas. Balcón perimetral con vistas a los majestuosos Farallones.',8,450000),
(5,'Jericó','Refugio de Jericó','Vereda Castocá, Jericó','Tranquilidad absoluta, amaneceres entre la niebla montañera, senderos ecológicos y ambiente acogedor de tapia pisada.',10,580000),
(6,'San Jerónimo','Hacienda San Jerónimo del Sol','Sector La Loma, San Jerónimo','Piscina con cascada, cancha deportiva, salón de juegos y zona de hamacas bajo frondosos árboles frutales.',25,1500000)
) AS v(id,muni,nombre,dir,info,cap,precio)
JOIN public."Municipio" m ON m."NombreMunicipio" = v.muni
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('public."Usuario"','NumeroDocumento'), (SELECT MAX("NumeroDocumento") FROM public."Usuario"));
SELECT setval(pg_get_serial_sequence('public."Municipio"','IdMunicipio'), (SELECT MAX("IdMunicipio") FROM public."Municipio"));
SELECT setval(pg_get_serial_sequence('public."Finca"','IdFinca'), (SELECT MAX("IdFinca") FROM public."Finca"));
