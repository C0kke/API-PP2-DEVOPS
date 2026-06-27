const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath);
}

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({ connectionString })
  : new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'personas_db',
  });

let isInitialized = false;

async function initDB() {
  if (isInitialized) return;
  const queryText = `
    CREATE TABLE IF NOT EXISTS personas (
      rut VARCHAR(50) PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      fecha_nacimiento VARCHAR(50) NOT NULL,
      ciudad VARCHAR(255) NOT NULL,
      gustos TEXT[] DEFAULT '{}'::TEXT[]
    );
  `;
  await pool.query(queryText);
  isInitialized = true;
}

const store = {
  async getAll() {
    await initDB();
    const res = await pool.query('SELECT * FROM personas');
    return res.rows.map(row => ({
      nombre: row.nombre,
      rut: row.rut,
      fechaNacimiento: row.fecha_nacimiento,
      ciudad: row.ciudad,
      gustos: row.gustos || []
    }));
  },

  async add(person) {
    await initDB();
    const cleanRut = store.normalizeRut(person.rut);

    const checkRes = await pool.query('SELECT rut FROM personas WHERE rut = $1', [cleanRut]);
    if (checkRes.rows.length > 0) {
      const err = new Error(`La persona con el RUT ${person.rut} ya está registrada.`);
      err.status = 400;
      throw err;
    }

    const queryText = `
      INSERT INTO personas (nombre, rut, fecha_nacimiento, ciudad, gustos)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      person.nombre.trim(),
      cleanRut,
      person.fechaNacimiento.trim(),
      person.ciudad.trim(),
      person.gustos || []
    ];

    const res = await pool.query(queryText, values);
    const row = res.rows[0];
    return {
      nombre: row.nombre,
      rut: row.rut,
      fechaNacimiento: row.fecha_nacimiento,
      ciudad: row.ciudad,
      gustos: row.gustos || []
    };
  },

  async deleteByRut(rut) {
    await initDB();
    const cleanRut = store.normalizeRut(rut);
    const res = await pool.query('DELETE FROM personas WHERE rut = $1', [cleanRut]);
    return res.rowCount > 0;
  },

  normalizeRut(rut) {
    if (!rut || typeof rut !== 'string') return '';
    let clean = '';
    const upper = rut.toUpperCase().trim();
    for (let i = 0; i < upper.length; i++) {
      const char = upper[i];
      if (char !== '.' && char !== '-' && char !== ' ') {
        clean += char;
      }
    }
    return clean;
  },

  async clear() {
    await initDB();
    await pool.query('DELETE FROM personas');
  },

  async close() {
    await pool.end();
  }
};

module.exports = store;