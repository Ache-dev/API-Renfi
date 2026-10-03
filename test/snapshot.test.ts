import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';

const file = path.join(os.tmpdir(), `renfi-snapshot-${process.pid}.tgz`);
process.env.DB_EMBEDDED = 'true';
process.env.DB_EMBEDDED_FILE = file;
process.env.NODE_ENV = 'test';

import { query, closeConnection } from '../src/conexion/connection';

test('la instantánea conserva las escrituras entre reinicios', async () => {
    try {
        await query('INSERT INTO public."Rol" ("NombreRol") VALUES ($1)', ['Rol-Instantanea']);
        await closeConnection(); // fuerza el volcado final
        assert.ok(fs.existsSync(file), 'se creó el archivo de instantánea');
        assert.ok(!fs.existsSync(`${file}.tmp`), 'no queda el temporal');

        const rs = await query('SELECT COUNT(*)::int AS n FROM public."Rol" WHERE "NombreRol" = $1', ['Rol-Instantanea']);
        assert.equal(rs.rows[0].n, 1);
    } finally {
        await closeConnection();
        fs.rmSync(file, { force: true });
    }
});
