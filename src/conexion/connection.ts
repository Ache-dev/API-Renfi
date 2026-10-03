import { Pool, QueryResult, QueryResultRow, types } from "pg";
import fs from "fs";
import path from "path";
import { pgConfig } from "./config";
import envConfig from "../config/env.config";

let pool: Pool | null = null;

/**
 * Retorna la instancia activa del Pool de PostgreSQL / Supabase (Singleton).
 */
export default function getPool(): Pool {
    if (!pool) {
        pool = new Pool(pgConfig);

        pool.on("error", (err) => {
            console.error("[PostgreSQL Pool Error]:", err);
        });
    }
    return pool;
}

// ---- Modo embebido (PGlite) ----
type PGlite = import("@electric-sql/pglite").PGlite;
let embedded: Promise<PGlite> | null = null;

// OIDs donde PGlite difiere de pg: int8, numeric, date, timestamp, timestamptz.
// Se reutilizan los parsers de pg para que el JSON de respuesta no cambie.
const PG_PARSED_OIDS = [20, 1700, 1082, 1114, 1184];

// pg serializa Date en hora local para timestamp/date; PGlite usa UTC. Se alinea con pg para evitar desfases.
const localTs = (v: any) => {
    if (!(v instanceof Date)) return String(v);
    const z = (n: number, l = 2) => String(n).padStart(l, "0");
    return `${v.getFullYear()}-${z(v.getMonth() + 1)}-${z(v.getDate())} ${z(v.getHours())}:${z(v.getMinutes())}:${z(v.getSeconds())}.${z(v.getMilliseconds(), 3)}`;
};

// Persistencia por instantánea: la BD vive en memoria y se vuelca a un .tgz con escritura atómica
// (tmp + rename). Un reinicio brusco (ts-node-dev en Windows) pierde a lo sumo la última ráfaga de
// escrituras, pero nunca deja los datos corruptos como pasaba con el directorio de PGlite.
// ponytail: volcado completo (~4,5 MB gz) por ráfaga; suficiente para desarrollo local.
const snapshotPath = (): string | null => {
    const f = envConfig.DB.EMBEDDED_FILE;
    return f.startsWith("memory://") ? null : path.resolve(f);
};
let snapshotLsn = "";
let snapshotTimer: NodeJS.Timeout | null = null;
let snapshotChain: Promise<void> = Promise.resolve();

const walLsn = async (db: PGlite) =>
    (await db.query<{ l: string }>("SELECT pg_current_wal_lsn()::text AS l")).rows[0]?.l ?? "";

async function guardarInstantanea(db: PGlite): Promise<void> {
    const file = snapshotPath();
    if (!file) return;
    const lsn = await walLsn(db);
    if (lsn === snapshotLsn) return; // solo hubo lecturas
    const dump = await db.dumpDataDir("gzip");
    fs.writeFileSync(`${file}.tmp`, Buffer.from(await dump.arrayBuffer()));
    fs.renameSync(`${file}.tmp`, file);
    snapshotLsn = lsn;
}

function encolarInstantanea(db: PGlite): Promise<void> {
    snapshotChain = snapshotChain
        .then(() => guardarInstantanea(db))
        .catch((e) => console.error("[PGlite] No se pudo guardar la instantánea:", e));
    return snapshotChain;
}

function programarInstantanea(db: PGlite): void {
    if (!snapshotPath() || snapshotTimer) return;
    snapshotTimer = setTimeout(() => {
        snapshotTimer = null;
        void encolarInstantanea(db);
    }, 400);
}

function getEmbedded(): Promise<PGlite> {
    if (!embedded) {
        embedded = (async () => {
            const { PGlite } = await import("@electric-sql/pglite");
            const parsers: Record<number, (v: string) => any> = {};
            for (const oid of PG_PARSED_OIDS) parsers[oid] = types.getTypeParser(oid, "text");
            const options = { parsers, serializers: { 1114: localTs, 1082: localTs } };
            const file = snapshotPath();
            let db: PGlite;
            if (file && fs.existsSync(file)) {
                try {
                    db = new PGlite({ ...options, loadDataDir: new Blob([fs.readFileSync(file)]) });
                    await db.waitReady;
                    snapshotLsn = await walLsn(db);
                } catch (error) {
                    // Instantánea ilegible: se aparta (no se borra) y se arranca una BD nueva.
                    const aparte = `${file}.corrupto-${Date.now()}`;
                    console.error(`[PGlite] Instantánea ilegible, se movió a ${aparte}:`, error);
                    fs.renameSync(file, aparte);
                    db = new PGlite(options);
                    await db.waitReady;
                }
            } else {
                db = new PGlite(options);
                await db.waitReady;
            }
            const r = await db.query<{ t: string | null }>(`SELECT to_regclass('public."Rol"')::text AS t`);
            if (!r.rows[0]?.t) {
                console.log("[PGlite] BD nueva: cargando supabase_schema.sql ...");
                // Adaptacion: se omiten CREATE EXTENSION (no usadas) y GRANT a roles de Supabase (anon/...) que no existen en PGlite.
                const sql = fs.readFileSync(path.resolve(__dirname, "../../supabase_schema.sql"), "utf8")
                    .replace(/^(CREATE EXTENSION|GRANT) .*$/gm, "");
                await db.exec(sql);
            }
            // Seed demo: se aplica si no hay fincas (BD nueva o ya existente sin datos).
            const f = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public."Finca"`);
            if (!f.rows[0]?.n) {
                console.log("[PGlite] Sin fincas: cargando db/seed.sql ...");
                await db.exec(fs.readFileSync(path.resolve(__dirname, "../../db/seed.sql"), "utf8"));
            }
            return db;
        })();
        embedded.catch(() => { embedded = null; });
    }
    return embedded;
}

/**
 * Helper para ejecutar consultas parametrizadas (pool de pg o PGlite embebido).
 */
export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> {
    if (envConfig.DB.EMBEDDED) {
        const db = await getEmbedded();
        const r = await db.query<T>(text, params);
        programarInstantanea(db);
        return {
            rows: r.rows,
            rowCount: r.affectedRows || r.rows.length,
            fields: r.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
        } as unknown as QueryResult<T>;
    }
    const client = getPool();
    return await client.query<T>(text, params);
}

/**
 * Cierra ordenadamente la conexión activa (pool o PGlite).
 */
export async function closeConnection(): Promise<void> {
    if (embedded) {
        try {
            const db = await embedded;
            if (snapshotTimer) {
                clearTimeout(snapshotTimer);
                snapshotTimer = null;
            }
            await encolarInstantanea(db);
            await db.close();
        } catch (error) {
            console.error("[PGlite Close Error]:", error);
        }
        embedded = null;
    }
    if (pool) {
        try {
            await pool.end();
            pool = null;
        } catch (error) {
            console.error("[PostgreSQL Pool Close Error]:", error);
        }
    }
}
