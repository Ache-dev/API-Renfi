import { migrarImagenesExternas } from '../services/migracion-imagenes.service';

/**
 * Mueve las imágenes con URL externa a Supabase Storage.
 *   npm run migrar:imagenes                 -> simula (no descarga ni escribe nada)
 *   npm run migrar:imagenes -- --ejecutar   -> migra de verdad (requiere SUPABASE_KEY = clave secret)
 */
const ejecutar = process.argv.includes('--ejecutar');

(async () => {
    console.log(ejecutar ? 'Migrando imágenes externas a Supabase Storage...' : 'SIMULACIÓN (agrega --ejecutar para migrar de verdad)');
    const resultados = await migrarImagenesExternas({ ejecutar });

    for (const r of resultados) {
        const marca = r.estado === 'migrada' ? 'OK    ' : r.estado === 'simulada' ? 'PENDIENTE' : 'FALLÓ ';
        console.log(`${marca} imagen ${r.IdImagen} (finca ${r.IdFinca}) ${r.origen}${r.destino ? ` -> ${r.destino}` : ''}${r.detalle ? ` | ${r.detalle}` : ''}`);
    }
    const cuenta = (e: string) => resultados.filter((r) => r.estado === e).length;
    console.log(`\nTotal: ${resultados.length} | migradas: ${cuenta('migrada')} | pendientes (simulación): ${cuenta('simulada')} | fallidas: ${cuenta('fallida')}`);
    // exitCode (y no process.exit) deja cerrar las conexiones HTTP; en Windows exit() puede abortar con un error de libuv
    process.exitCode = cuenta('fallida') ? 1 : 0;
})().catch((err) => {
    console.error('Error inesperado:', err?.message ?? err);
    process.exitCode = 1;
});
