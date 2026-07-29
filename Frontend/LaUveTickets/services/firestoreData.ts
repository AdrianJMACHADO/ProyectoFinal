import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import * as Crypto from 'expo-crypto';

import { getFirebaseAuth, getFirebaseDb } from '../config/firebase';

export type FeriaRecord = {
  idFeria: number;
  nombre: string;
  fecha: string;
};

export type TicketRecord = {
  idTicket: number;
  qrToken: string;
  idFeria: number | null;
  nombre: string;
  tipo: string;
  fecha_creacion?: string;
  cantidad_inicial: number;
  usos?: number;
  estado?: 'ACTIVO' | 'INACTIVO';
  agotado?: boolean;
};

type NewFeria = Omit<FeriaRecord, 'idFeria'>;
type NewTicket = Omit<TicketRecord, 'idTicket' | 'fecha_creacion' | 'qrToken'>;

const FERIAS = 'ferias';
const TICKETS = 'tickets';
const COUNTERS = 'counters';

const generateQrToken = () =>
  `${Crypto.randomUUID()}${Crypto.randomUUID()}`.replace(/-/g, '').toLowerCase();

const timestampToIso = (value: unknown): string | undefined => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return typeof value === 'string' ? value : undefined;
};

const allocateNumericId = async (counterName: string): Promise<number> => {
  const db = getFirebaseDb();
  const counterRef = doc(db, COUNTERS, counterName);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const id = snapshot.exists() ? Number(snapshot.data().nextId ?? 1) : 1;
    transaction.set(counterRef, { nextId: id + 1 }, { merge: true });
    return id;
  });
};

export const listFerias = async (): Promise<FeriaRecord[]> => {
  const db = getFirebaseDb();
  const snapshot = await getDocs(query(collection(db, FERIAS), orderBy('fecha', 'desc')));
  return snapshot.docs.map((item) => item.data() as FeriaRecord);
};

export const subscribeFerias = (
  onData: (ferias: FeriaRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const db = getFirebaseDb();
  return onSnapshot(
    query(collection(db, FERIAS), orderBy('fecha', 'desc')),
    snapshot => onData(snapshot.docs.map(item => item.data() as FeriaRecord)),
    error => onError?.(error),
  );
};

export const createFeria = async (data: NewFeria): Promise<FeriaRecord> => {
  const db = getFirebaseDb();
  const idFeria = await allocateNumericId(FERIAS);
  const feria: FeriaRecord = { idFeria, ...data };
  await runTransaction(db, async (transaction) => {
    transaction.set(doc(db, FERIAS, String(idFeria)), feria);
  });
  return feria;
};

export const updateFeria = async (
  idFeria: number,
  data: Partial<NewFeria>,
): Promise<void> => {
  const db = getFirebaseDb();
  await updateDoc(doc(db, FERIAS, String(idFeria)), data);
};

export const listTickets = async (): Promise<TicketRecord[]> => {
  const db = getFirebaseDb();
  const snapshot = await getDocs(
    query(collection(db, TICKETS), orderBy('fecha_creacion', 'desc')),
  );

  const tickets = snapshot.docs.map((item) => {
    const data = item.data();
    const usos = Number(data.usos ?? 0);
    const cantidadInicial = Number(data.cantidad_inicial ?? 0);
    const qrToken =
      typeof data.qrToken === 'string' && data.qrToken.length >= 32
        ? data.qrToken
        : generateQrToken();
    return {
      ...(data as TicketRecord),
      qrToken,
      fecha_creacion: timestampToIso(data.fecha_creacion),
      agotado: data.agotado ?? usos >= cantidadInicial,
    };
  });

  await Promise.all(
    snapshot.docs.map((item, index) =>
      item.data().qrToken
        ? Promise.resolve()
        : updateDoc(item.ref, { qrToken: tickets[index].qrToken }),
    ),
  );

  return tickets;
};

const normalizeTicket = (data: Record<string, unknown>): TicketRecord => {
  const usos = Number(data.usos ?? 0);
  const cantidadInicial = Number(data.cantidad_inicial ?? 0);
  const qrToken =
    typeof data.qrToken === 'string' && data.qrToken.length >= 32
      ? data.qrToken
      : generateQrToken();

  return {
    ...(data as TicketRecord),
    qrToken,
    fecha_creacion: timestampToIso(data.fecha_creacion),
    agotado:
      typeof data.agotado === 'boolean'
        ? data.agotado
        : usos >= cantidadInicial,
  };
};

export const subscribeTickets = (
  onData: (tickets: TicketRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const db = getFirebaseDb();
  return onSnapshot(
    query(collection(db, TICKETS), orderBy('fecha_creacion', 'desc')),
    snapshot => {
      const tickets = snapshot.docs.map(item => normalizeTicket(item.data()));
      onData(tickets);

      snapshot.docs.forEach((item, index) => {
        if (!item.data().qrToken) {
          void updateDoc(item.ref, { qrToken: tickets[index].qrToken });
        }
      });
    },
    error => onError?.(error),
  );
};

export const getTicket = async (idTicket: number): Promise<TicketRecord | null> => {
  const db = getFirebaseDb();
  const snapshot = await getDoc(doc(db, TICKETS, String(idTicket)));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  const usos = Number(data.usos ?? 0);
  const cantidadInicial = Number(data.cantidad_inicial ?? 0);
  return {
    ...(data as TicketRecord),
    fecha_creacion: timestampToIso(data.fecha_creacion),
    agotado: data.agotado ?? usos >= cantidadInicial,
  };
};

export const getTicketByQrCredential = async (
  idTicket: number,
  qrToken: string,
): Promise<TicketRecord | null> => {
  const ticket = await getTicket(idTicket);
  if (!ticket?.qrToken || ticket.qrToken !== qrToken) return null;
  return ticket;
};

export const createTicket = async (data: NewTicket): Promise<TicketRecord> => {
  const db = getFirebaseDb();
  const idTicket = await allocateNumericId(TICKETS);
  const ticketRef = doc(db, TICKETS, String(idTicket));

  await runTransaction(db, async (transaction) => {
    transaction.set(ticketRef, {
      idTicket,
      qrToken: generateQrToken(),
      idFeria: data.idFeria ?? null,
      nombre: data.nombre,
      tipo: data.tipo,
      cantidad_inicial: data.cantidad_inicial,
      usos: data.usos ?? 0,
      estado: data.estado ?? 'ACTIVO',
      agotado: false,
      fecha_creacion: serverTimestamp(),
    });
  });

  const created = await getTicket(idTicket);
  if (!created) throw new Error('No se pudo recuperar el ticket creado');
  return created;
};

export const createTickets = async (
  data: NewTicket,
  count: number,
): Promise<TicketRecord[]> => {
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error('La cantidad de tickets debe estar entre 1 y 100');
  }
  if (count === 1) return [await createTicket(data)];

  const db = getFirebaseDb();
  const qrTokens = Array.from({ length: count }, generateQrToken);
  const counterRef = doc(db, COUNTERS, TICKETS);
  const ids = await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(counterRef);
    const firstId = snapshot.exists() ? Number(snapshot.data().nextId ?? 1) : 1;
    transaction.set(
      counterRef,
      { nextId: firstId + count },
      { merge: true },
    );

    const allocatedIds = Array.from({ length: count }, (_, index) => firstId + index);
    allocatedIds.forEach((idTicket, index) => {
      transaction.set(doc(db, TICKETS, String(idTicket)), {
        idTicket,
        qrToken: qrTokens[index],
        idFeria: data.idFeria ?? null,
        nombre: data.nombre,
        tipo: data.tipo,
        cantidad_inicial: data.cantidad_inicial,
        usos: data.usos ?? 0,
        estado: data.estado ?? 'ACTIVO',
        agotado: false,
        fecha_creacion: serverTimestamp(),
      });
    });
    return allocatedIds;
  });

  const created = await Promise.all(ids.map(getTicket));
  return created.filter((ticket): ticket is TicketRecord => ticket !== null);
};

export const updateTicket = async (
  idTicket: number,
  data: Partial<Omit<TicketRecord, 'idTicket' | 'fecha_creacion'>>,
): Promise<void> => {
  const db = getFirebaseDb();
  const definedData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );

  if (data.usos !== undefined) {
    const current = await getTicket(idTicket);
    if (!current) throw new Error('Ticket no encontrado');
    definedData.agotado = data.usos >= current.cantidad_inicial;
  }

  await updateDoc(doc(db, TICKETS, String(idTicket)), definedData);
};

export const consumeTicket = async (idTicket: number): Promise<TicketRecord> => {
  const db = getFirebaseDb();
  const ticketRef = doc(db, TICKETS, String(idTicket));
  const consumptionRef = doc(collection(db, 'consumos'));
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) throw new Error('Debes iniciar sesión para consumir el ticket');

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ticketRef);
    if (!snapshot.exists()) throw new Error('Ticket no encontrado');

    const ticket = snapshot.data() as TicketRecord;
    const usos = Number(ticket.usos ?? 0);
    if (ticket.estado !== 'ACTIVO') {
      throw new Error('El ticket está inactivo');
    }
    if (ticket.agotado || usos >= ticket.cantidad_inicial) {
      throw new Error('El ticket ya no tiene usos disponibles');
    }

    const nuevosUsos = usos + 1;
    transaction.update(ticketRef, {
      usos: nuevosUsos,
      agotado: nuevosUsos >= ticket.cantidad_inicial,
    });
    transaction.set(consumptionRef, {
      ticketId: idTicket,
      empleadoUid: currentUser.uid,
      cantidad: 1,
      usosAntes: usos,
      usosDespues: nuevosUsos,
      fecha: serverTimestamp(),
    });
  });

  const updated = await getTicket(idTicket);
  if (!updated) throw new Error('No se pudo recuperar el ticket actualizado');
  return updated;
};
