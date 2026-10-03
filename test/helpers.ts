process.env.DB_EMBEDDED = 'true';
process.env.DB_EMBEDDED_FILE = 'memory://';
process.env.NODE_ENV = 'test';

import type { AddressInfo } from 'net';
import app from '../src/app';
import { closeConnection } from '../src/conexion/connection';

const server = app.listen(0);
export const ready = new Promise<void>((r) => server.once('listening', () => r()));
export const baseUrl = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
export const stop = async () => {
    await new Promise((r) => server.close(r));
    await closeConnection();
};
