import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_TAB = process.env.GOOGLE_SHEET_TAB || 'Dashboard';
const ACTIONS_TAB = process.env.GOOGLE_COUNTERMEASURES_TAB || 'Registro_Contramedidas';
const ACTION_HEADERS = ['ID', 'Fecha registro', 'Fecha scrap', 'Departamento', 'Problema', 'Contramedida', 'Responsable', 'Fecha compromiso', 'Estatus', 'Notas', 'Última actualización', 'Causa', 'Semana', 'Contención', 'Efectividad'];

function getAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) throw new Error('Faltan GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY');
  return new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function client() {
  if (!SHEET_ID) throw new Error('Falta GOOGLE_SHEET_ID');
  return google.sheets({ version: 'v4', auth: getAuth() });
}

function normalizeKey(key) {
  return key.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^\w]/g, '');
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  const n = parseFloat(value.toString().replace(/[$,\s]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

export async function getScrapData() {
  const sheets = client();
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${SHEET_TAB}!A1:Z10000` });
  const rows = response.data.values || [];
  if (!rows.length) return [];
  const headerIndexes = rows[0].map((h, i) => ({ h, i })).filter(({ h }) => h && h.toString().trim());
  return rows.slice(1).filter((row) => row.some((cell) => cell !== '')).map((row) => {
    const record = {};
    headerIndexes.forEach(({ h, i }) => { record[normalizeKey(h)] = row[i] ?? ''; });
    record.quantity_num = parseNumber(record.quantity);
    record.unit_cost_num = parseNumber(record.unit_cost);
    record.total_cost_num = parseNumber(record.total_cost);
    return record;
  });
}

async function ensureActionsTab(sheets) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID, fields: 'sheets.properties(sheetId,title,gridProperties)' });
  let actionSheet = meta.data.sheets?.find((sheet) => sheet.properties.title === ACTIONS_TAB);
  if (!actionSheet) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { requests: [{ addSheet: { properties: { title: ACTIONS_TAB } } }] } });
    const refreshed = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID, fields: 'sheets.properties(sheetId,title,gridProperties)' });
    actionSheet = refreshed.data.sheets?.find((sheet) => sheet.properties.title === ACTIONS_TAB);
  }
  const columnCount = actionSheet?.properties?.gridProperties?.columnCount || 0;
  if (columnCount < ACTION_HEADERS.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ appendDimension: { sheetId: actionSheet.properties.sheetId, dimension: 'COLUMNS', length: ACTION_HEADERS.length - columnCount } }] },
    });
  }
  const header = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${ACTIONS_TAB}!A1:O1` });
  if (!header.data.values?.length) {
    await sheets.spreadsheets.values.update({ spreadsheetId: SHEET_ID, range: `${ACTIONS_TAB}!A1:O1`, valueInputOption: 'RAW', requestBody: { values: [ACTION_HEADERS] } });
  } else {
    await sheets.spreadsheets.values.update({ spreadsheetId: SHEET_ID, range: `${ACTIONS_TAB}!L1:O1`, valueInputOption: 'RAW', requestBody: { values: [['Causa', 'Semana', 'Contención', 'Efectividad']] } });
  }
}

export async function getCountermeasures() {
  const sheets = client();
  await ensureActionsTab(sheets);
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${ACTIONS_TAB}!A2:O10000` });
  return (response.data.values || []).filter((row) => row[0]).map((row) => ({
    id: row[0], createdAt: row[1], scrapDate: row[2], department: row[3], problem: row[4], action: row[5], owner: row[6], dueDate: row[7], status: row[8] || 'Abierta', notes: row[9] || '', updatedAt: row[10] || row[1], cause: row[11] || '', week: row[12] || '', containment: row[13] || '', effectiveness: row[14] || 'Pendiente de validar',
  })).reverse();
}

export async function addCountermeasure(input) {
  const sheets = client();
  await ensureActionsTab(sheets);
  const now = new Date().toISOString();
  const item = {
    id: `CM-${Date.now().toString(36).toUpperCase()}`,
    createdAt: now, scrapDate: input.scrapDate || '', department: input.department,
    problem: input.problem, action: input.action, owner: input.owner,
    dueDate: input.dueDate || '', status: input.status || 'Abierta', notes: input.notes || '', updatedAt: now, cause: input.cause || '', week: input.week || '', containment: input.containment || '', effectiveness: input.effectiveness || 'Pendiente de validar',
  };
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID, range: `${ACTIONS_TAB}!A:K`, valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[item.id, item.createdAt, item.scrapDate, item.department, item.problem, item.action, item.owner, item.dueDate, item.status, item.notes, item.updatedAt, item.cause, item.week, item.containment, item.effectiveness]] },
  });
  return item;
}

export async function updateCountermeasure(id, input) {
  const sheets = client();
  await ensureActionsTab(sheets);
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${ACTIONS_TAB}!A2:O10000` });
  const rows = response.data.values || [];
  const index = rows.findIndex((row) => row[0] === id);
  if (index < 0) throw new Error('Contramedida no encontrada.');
  const row = rows[index];
  const item = {
    id, createdAt: row[1], scrapDate: input.scrapDate ?? row[2], department: input.department ?? row[3],
    problem: input.problem ?? row[4], action: input.action ?? row[5], owner: input.owner ?? row[6],
    dueDate: input.dueDate ?? row[7], status: input.status ?? row[8], notes: input.notes ?? row[9], updatedAt: new Date().toISOString(), cause: input.cause ?? row[11] ?? '', week: input.week ?? row[12] ?? '', containment: input.containment ?? row[13] ?? '', effectiveness: input.effectiveness ?? row[14] ?? 'Pendiente de validar',
  };
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID, range: `${ACTIONS_TAB}!A${index + 2}:O${index + 2}`, valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[item.id, item.createdAt, item.scrapDate, item.department, item.problem, item.action, item.owner, item.dueDate, item.status, item.notes, item.updatedAt, item.cause, item.week, item.containment, item.effectiveness]] },
  });
  return item;
}

