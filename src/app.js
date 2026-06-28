const url = require('url');
const store = require('./store');

function isValidRut(rut) {
  if (typeof rut !== 'string') return false;

  let clean = '';
  const upper = rut.toUpperCase().trim();
  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    if (char !== '.' && char !== '-' && char !== ' ') {
      clean += char;
    }
  }

  if (clean.length < 7 || clean.length > 9) return false;

  for (let i = 0; i < clean.length - 1; i++) {
    const char = clean[i];
    if (char < '0' || char > '9') return false;
  }

  const lastChar = clean[clean.length - 1];
  if ((lastChar < '0' || lastChar > '9') && lastChar !== 'K') {
    return false;
  }

  return true;
}

function isValidDate(dateStr) {
  return typeof dateStr === 'string' && dateStr.trim().length > 0;
}

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (!body) {
          resolve({});
        } else {
          resolve(JSON.parse(body));
        }
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

async function handleRequest(req, res) {
  try {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    if (pathname === '/api/personas' && method === 'GET') {
      try {
        const list = await store.getAll();
        return sendJSON(res, 200, list);
      } catch (error) {
        return sendJSON(res, 500, { error: 'Error interno del servidor.' });
      }
    }

    if (pathname === '/api/personas' && method === 'POST') {
      return parseJSONBody(req)
        .then(async body => {
          const { nombre, rut, fechaNacimiento, ciudad, gustos = [] } = body;

          if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
            return sendJSON(res, 400, { error: 'El nombre es obligatorio y debe ser una cadena válida.' });
          }

          if (!rut || !isValidRut(rut)) {
            return sendJSON(res, 400, { error: 'El RUT es obligatorio y debe tener un formato válido (ej: 12345678-9 o 12.345.678-K).' });
          }

          if (!fechaNacimiento || !isValidDate(fechaNacimiento)) {
            return sendJSON(res, 400, { error: 'La fecha de nacimiento es obligatoria y debe ser una cadena válida.' });
          }

          if (!ciudad || typeof ciudad !== 'string' || ciudad.trim().length === 0) {
            return sendJSON(res, 400, { error: 'La ciudad es obligatoria y debe ser una cadena válida.' });
          }

          if (gustos && !Array.isArray(gustos)) {
            const gustosArray = Array.from(gustos);
            gustos = gustosArray;
          }

          if (!gustos) {
            gustos = [];
          }

          try {
            const newPerson = await store.add({ nombre, rut, fechaNacimiento, ciudad, gustos });
            return sendJSON(res, 201, {
              message: 'Persona agregada correctamente.',
              persona: newPerson
            });
          } catch (error) {
            const status = error.status || 500;
            return sendJSON(res, status, { error: error.message });
          }
        })
        .catch(err => {
          return sendJSON(res, 400, { error: 'Cuerpo de solicitud inválido (debe ser JSON).' });
        });
    }

    if (pathname.startsWith('/api/personas/') && method === 'DELETE') {
      const rutParam = decodeURIComponent(pathname.substring('/api/personas/'.length));
      if (!rutParam) {
        return sendJSON(res, 400, { error: 'El RUT es un parámetro requerido.' });
      }

      try {
        const deleted = await store.deleteByRut(rutParam);
        if (!deleted) {
          return sendJSON(res, 404, { error: `No se encontró ninguna persona registrada con el RUT: ${rutParam}` });
        }
        return sendJSON(res, 200, { message: 'Persona eliminada correctamente.' });
      } catch (error) {
        return sendJSON(res, 500, { error: 'Error interno del servidor.' });
      }
    }

    return sendJSON(res, 404, { error: 'Ruta no encontrada.' });
  } catch (err) {
    console.error(err.stack);
    return sendJSON(res, 500, { error: 'Ocurrió un error inesperado en el servidor.' });
  }
}

module.exports = handleRequest;