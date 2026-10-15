import multer from 'multer';
import { MAX_BYTES } from '../services/imagen.service';

/**
 * Recibe una sola imagen en el campo "imagen" (multipart/form-data), en memoria y con tope de tamaño.
 * El tipo real se valida después, por el contenido del archivo, en imagen.service.
 */
export const recibirImagen = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES, files: 1, fields: 5, parts: 8 }
}).single('imagen');
