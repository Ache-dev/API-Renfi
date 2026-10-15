import { test } from 'node:test';
import assert from 'node:assert';
import { normalizarFicha } from '../src/services/finca.service';

test('solo devuelve los campos recibidos (una actualización parcial no pisa lo demás)', () => {
    assert.deepStrictEqual(normalizarFicha({ Habitaciones: '4' }), { Habitaciones: 4 });
    assert.deepStrictEqual(normalizarFicha({}), {});
});

test('convierte tipos que llegan como texto (formularios)', () => {
    assert.deepStrictEqual(
        normalizarFicha({ Habitaciones: '5', Banos: 3, Camas: '8', NochesMinimas: '2', PermiteMascotas: 'true', PermiteEventos: 'false' }),
        { Habitaciones: 5, Banos: 3, Camas: 8, NochesMinimas: 2, PermiteMascotas: true, PermiteEventos: false }
    );
});

test('comodidades: acepta lista o texto con comas, limpia y quita repetidas', () => {
    assert.deepStrictEqual(normalizarFicha({ Comodidades: ' Piscina, Jacuzzi ,,piscina, Piscina ' }).Comodidades, ['Piscina', 'Jacuzzi', 'piscina']);
    assert.deepStrictEqual(normalizarFicha({ Comodidades: ['BBQ', ' WiFi '] }).Comodidades, ['BBQ', 'WiFi']);
    assert.deepStrictEqual(normalizarFicha({ Comodidades: '' }).Comodidades, []);
});

test('comodidades: máximo 30 elementos de 50 caracteres', () => {
    assert.throws(() => normalizarFicha({ Comodidades: Array.from({ length: 31 }, (_, i) => `c${i}`) }), /Comodidades/);
    assert.throws(() => normalizarFicha({ Comodidades: ['x'.repeat(51)] }), /Comodidades/);
});

test('rechaza números fuera de rango o no enteros', () => {
    assert.throws(() => normalizarFicha({ Habitaciones: -1 }), /Habitaciones/);
    assert.throws(() => normalizarFicha({ Banos: 101 }), /Banos/);
    assert.throws(() => normalizarFicha({ Camas: 2.5 }), /Camas/);
    assert.throws(() => normalizarFicha({ NochesMinimas: 0 }), /NochesMinimas/);
    assert.throws(() => normalizarFicha({ NochesMinimas: 31 }), /NochesMinimas/);
    assert.throws(() => normalizarFicha({ Habitaciones: 'abc' }), /Habitaciones/);
});

test('un valor vacío o null en campos con valor por defecto significa "sin cambio"', () => {
    assert.deepStrictEqual(
        normalizarFicha({ Habitaciones: '', Banos: null as any, HoraEntrada: '', PermiteMascotas: null as any, NochesMinimas: '' }),
        {}
    );
});

test('horas en formato HH:MM de 24 horas', () => {
    assert.deepStrictEqual(normalizarFicha({ HoraEntrada: '15:00', HoraSalida: '11:30' }), { HoraEntrada: '15:00', HoraSalida: '11:30' });
    assert.throws(() => normalizarFicha({ HoraEntrada: '25:00' }), /HoraEntrada/);
    assert.throws(() => normalizarFicha({ HoraSalida: '9am' }), /HoraSalida/);
    assert.throws(() => normalizarFicha({ HoraSalida: '11:60' }), /HoraSalida/);
});

test('booleanos inválidos se rechazan', () => {
    assert.throws(() => normalizarFicha({ PermiteMascotas: 'quizás' }), /PermiteMascotas/);
});

test('reglas: se recortan, vacío pasa a null y máximo 1000 caracteres', () => {
    assert.strictEqual(normalizarFicha({ Reglas: '  No fiestas después de las 10pm  ' }).Reglas, 'No fiestas después de las 10pm');
    assert.strictEqual(normalizarFicha({ Reglas: '   ' }).Reglas, null);
    assert.throws(() => normalizarFicha({ Reglas: 'x'.repeat(1001) }), /Reglas/);
});

test('coordenadas: dentro de rango, juntas y con 6 decimales', () => {
    assert.deepStrictEqual(normalizarFicha({ Latitud: '6.2442031', Longitud: -75.5812119 }), { Latitud: 6.244203, Longitud: -75.581212 });
    assert.deepStrictEqual(normalizarFicha({ Latitud: null, Longitud: null }), { Latitud: null, Longitud: null });
    assert.throws(() => normalizarFicha({ Latitud: 91, Longitud: 0 }), /Latitud/);
    assert.throws(() => normalizarFicha({ Latitud: 0, Longitud: 181 }), /Longitud/);
    assert.throws(() => normalizarFicha({ Latitud: 6.2 }), /juntas/);
    assert.throws(() => normalizarFicha({ Latitud: 'x', Longitud: 1 }), /Latitud/);
});
