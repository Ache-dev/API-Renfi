export interface Reserva {
    IdReserva: number;
    IdFinca: number;
    FechaReserva?: Date;
    FechaEntrada?: Date;
    FechaSalida?: Date;
    Estado: string;
    MontoReserva?: number;
}