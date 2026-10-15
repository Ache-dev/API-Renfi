// Estas pruebas solo hacen lecturas contra el Supabase configurado en .env (nunca escriben datos).
process.env.NODE_ENV = 'test';

import type { AddressInfo } from 'net';
import app from '../src/app';

const server = app.listen(0);
export const ready = new Promise<void>((r) => server.once('listening', () => r()));
export const baseUrl = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
export const stop = () => new Promise((r) => server.close(r));
