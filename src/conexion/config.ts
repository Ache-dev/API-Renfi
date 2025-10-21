import { config } from "mssql";

export const sqlConfig: config = {
    user: 'sa',
    password: 'Passw0rd!',
    database: 'Finca',
    server: 'localhost',
    //port:1433  //Optional si es otro no standard
    options: {
        trustServerCertificate: true,
        encrypt: true
    }
}