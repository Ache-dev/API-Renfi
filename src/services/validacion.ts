import { AppError } from '../middlewares/error.middleware';

// Validaciones compartidas por los servicios. Los límites coinciden con las restricciones de
// db/migraciones/004: la API responde un 400 claro antes de que la base rechace el dato.

/**
 * Texto recortado. Rechaza lo que no sea texto, lo vacío (si es obligatorio) y lo que supere `max`.
 */
export const texto = (campo: string, v: unknown, max: number, obligatorio = true): string => {
    if (v === undefined || v === null || v === '') {
        if (obligatorio) throw new AppError(`${campo} es obligatorio`, 400);
        return '';
    }
    if (typeof v !== 'string' && typeof v !== 'number') throw new AppError(`${campo} debe ser texto`, 400);
    const t = String(v).trim();
    if (obligatorio && !t) throw new AppError(`${campo} es obligatorio`, 400);
    if (t.length > max) throw new AppError(`${campo} no puede superar ${max} caracteres`, 400);
    return t;
};

export const entero = (campo: string, v: unknown, min: number, max: number): number => {
    const n = Number(v);
    if (v === '' || v === null || typeof v === 'boolean' || !Number.isInteger(n) || n < min || n > max) {
        throw new AppError(`${campo} debe ser un entero entre ${min} y ${max}`, 400);
    }
    return n;
};

/**
 * Devuelve el valor oficial de la lista (sin distinguir mayúsculas) o lanza 400.
 */
export const unoDe = (campo: string, v: unknown, opciones: readonly string[]): string => {
    const valido = opciones.find((o) => o.toLowerCase() === String(v ?? '').trim().toLowerCase());
    if (!valido) throw new AppError(`${campo} debe ser uno de: ${opciones.join(', ')}`, 400);
    return valido;
};

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const correo = (v: unknown): string => {
    const c = texto('Correo', v, 254).toLowerCase();
    if (!CORREO.test(c)) throw new AppError('Correo no tiene un formato válido', 400);
    return c;
};

const TELEFONO = /^\+?[0-9 ()-]{7,20}$/;
export const telefono = (v: unknown): string => {
    const t = texto('Telefono', v, 20, false);
    if (t && !TELEFONO.test(t)) throw new AppError('Telefono debe tener entre 7 y 20 dígitos (se admiten +, espacios, guiones y paréntesis)', 400);
    return t;
};

// Límites de dinero: Precio x noches debe caber en un INT de Postgres (2.147.483.647)
export const PRECIO_MAXIMO = 20_000_000;
export const NOCHES_MAXIMAS = 90;
export const MONTO_MAXIMO = 2_000_000_000;

export const ESTADOS_USUARIO = ['Activo', 'Inactivo'] as const;
export const ESTADOS_RESERVA = ['Pendiente', 'Activa', 'Confirmada', 'Finalizada', 'Cancelada'] as const;
export const ESTADOS_PAGO = ['Pendiente', 'Pagado', 'Rechazado'] as const;
