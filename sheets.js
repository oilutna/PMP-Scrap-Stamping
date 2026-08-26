import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_TAB = process.env.GOOGLE_SHEET_TAB || 'Dashboard';

function getAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Faltan las variables de entorno GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY'
    );
  }

  return new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

function normalizeKey(key) {
  return key
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '');
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  const cleaned = value.toString().replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export async function getScrapData() {
  if (!SHEET_ID) {
    throw new Error('Falta la variable de entorno GOOGLE_SHEET_ID');
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A1:Z10000`,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) return [];

  const rawHeader = rows[0];

  // Ignora columnas iniciales sin nombre (botones/filtros de Google Sheets)
  const headerIndexes = rawHeader
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => h && h.toString().trim() !== '');

  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell !== ''));

  const data = dataRows.map((row) => {
    const record = {};
    headerIndexes.forEach(({ h, i }) => {
      record[normalizeKey(h)] = row[i] ?? '';
    });
    record.quantity_num = parseNumber(record.quantity);
    record.unit_cost_num = parseNumber(record.unit_cost);
    record.total_cost_num = parseNumber(record.total_cost);
    return record;
  });

  return data;
}
