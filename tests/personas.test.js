const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const handleRequest = require('../src/app');
const store = require('../src/store');

function startTestServer() {
  const server = http.createServer(handleRequest);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      const request = async (path, options = {}) => {
        const url = `${baseUrl}${path}`;
        if (options.body && typeof options.body === 'object') {
          options.body = JSON.stringify(options.body);
          options.headers = {
            'Content-Type': 'application/json',
            ...options.headers
          };
        }
        const res = await fetch(url, options);
        const text = await res.text();
        let body = {};
        if (text) {
          try {
            body = JSON.parse(text);
          } catch (e) {
            body = text;
          }
        }
        return {
          status: res.status,
          body,
          headers: res.headers
        };
      };

      resolve({
        request,
        close: () => new Promise(res => server.close(res))
      });
    });
  });
}

describe('Personas API Endpoints', () => {
  beforeEach(() => {
    store.clear();
  });

  describe('GET /api/personas', () => {
    it('debería retornar una lista vacía de personas al iniciar', async () => {
      const { request, close } = await startTestServer();
      try {
        const response = await request('/api/personas', { method: 'GET' });
        assert.strictEqual(response.status, 200);
        assert.strictEqual(Array.isArray(response.body), true);
        assert.strictEqual(response.body.length, 0);
      } finally {
        await close();
      }
    });

    it('debería retornar todas las personas registradas', async () => {
      store.add({
        nombre: 'Juan Perez',
        rut: '12.345.678-9',
        fechaNacimiento: '1990-05-15',
        ciudad: 'Santiago',
        gustos: ['comida', 'libros', 'juegos']
      });
      store.add({
        nombre: 'Maria Gomez',
        rut: '98.765.432-1',
        fechaNacimiento: '1985-11-20',
        ciudad: 'Concepcion',
        gustos: ['musica', 'videojuegos', 'leer']
      });

      const { request, close } = await startTestServer();
      try {
        const response = await request('/api/personas', { method: 'GET' });
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.body.length, 2);
        assert.strictEqual(response.body[0].nombre, 'Juan Perez');
        assert.strictEqual(response.body[1].nombre, 'Maria Gomez');
        assert.strictEqual(response.body[0].rut, '123456789');
        assert.strictEqual(response.body[1].rut, '987654321');
      } finally {
        await close();
      }
    });
  });

  describe('POST /api/personas', () => {
    it('debería agregar una nueva persona si los datos son correctos', async () => {
      const nuevaPersona = {
        nombre: 'Diego Portales',
        rut: '11.111.111-1',
        fechaNacimiento: '1993-02-11',
        ciudad: 'Valparaiso',
        gustos: ['comida', 'libros', 'juegos']
      };

      const { request, close } = await startTestServer();
      try {
        const response = await request('/api/personas', {
          method: 'POST',
          body: nuevaPersona
        });

        assert.strictEqual(response.status, 201);
        assert.strictEqual(response.body.message, 'Persona agregada correctamente.');
        assert.strictEqual(response.body.persona.nombre, 'Diego Portales');
        assert.strictEqual(response.body.persona.rut, '111111111');
        assert.strictEqual(response.body.persona.ciudad, 'Valparaiso');
        assert.deepStrictEqual(response.body.persona.gustos, ['comida', 'libros', 'juegos']);
        const list = store.getAll();
        assert.strictEqual(list.length, 1);
      } finally {
        await close();
      }
    });

    it('debería rechazar la solicitud si faltan campos obligatorios', async () => {
      const personaIncompleta = {
        nombre: 'Incompleto',
        rut: '22.222.222-2'
      };

      const { request, close } = await startTestServer();
      try {
        const response = await request('/api/personas', {
          method: 'POST',
          body: personaIncompleta
        });

        assert.strictEqual(response.status, 400);
        assert.match(response.body.error, /fecha de nacimiento/);
      } finally {
        await close();
      }
    });

    it('debería rechazar un RUT con formato inválido', async () => {
      const personaConRutInvalido = {
        nombre: 'RUT Malo',
        rut: '1234-invalid',
        fechaNacimiento: '1990-01-01',
        ciudad: 'Antofagasta',
        gustos: ['comida', 'libros', 'juegos']
      };

      const { request, close } = await startTestServer();
      try {
        const response = await request('/api/personas', {
          method: 'POST',
          body: personaConRutInvalido
        });

        assert.strictEqual(response.status, 400);
        assert.match(response.body.error, /RUT/);
      } finally {
        await close();
      }
    });

    it('debería rechazar una fecha vacía o no string', async () => {
      const personaConFechaInvalida = {
        nombre: 'Fecha Mala',
        rut: '15.555.555-5',
        fechaNacimiento: '',
        ciudad: 'Temuco',
        gustos: ['comida', 'libros', 'juegos']
      };

      const { request, close } = await startTestServer();
      try {
        const response = await request('/api/personas', {
          method: 'POST',
          body: personaConFechaInvalida
        });

        assert.strictEqual(response.status, 400);
        assert.match(response.body.error, /fecha de nacimiento/);
      } finally {
        await close();
      }
    });

    it('debería rechazar el registro de un RUT duplicado', async () => {
      const persona = {
        nombre: 'Original',
        rut: '12.345.678-9',
        fechaNacimiento: '1990-01-01',
        ciudad: 'Santiago',
        gustos: ['comida', 'libros', 'juegos']
      };

      const { request, close } = await startTestServer();
      try {
        const response1 = await request('/api/personas', {
          method: 'POST',
          body: persona
        });
        assert.strictEqual(response1.status, 201);

        const personaDuplicada = {
          nombre: 'Duplicado',
          rut: '123456789',
          fechaNacimiento: '1995-10-10',
          ciudad: 'Rancagua',
          gustos: ['comida', 'libros', 'juegos']
        };

        const response2 = await request('/api/personas', {
          method: 'POST',
          body: personaDuplicada
        });

        assert.strictEqual(response2.status, 400);
        assert.match(response2.body.error, /ya está registrada/);
      } finally {
        await close();
      }
    });
  });

  describe('DELETE /api/personas/:rut', () => {
    it('debería eliminar a una persona registrada por su RUT', async () => {
      store.add({
        nombre: 'A eliminar',
        rut: '33.333.333-3',
        fechaNacimiento: '1980-04-04',
        ciudad: 'La Serena',
        gustos: ['comida', 'libros', 'juegos']
      });

      assert.strictEqual(store.getAll().length, 1);

      const { request, close } = await startTestServer();
      try {
        const response = await request('/api/personas/333333333', {
          method: 'DELETE'
        });

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.body.message, 'Persona eliminada correctamente.');
        assert.strictEqual(store.getAll().length, 0);
      } finally {
        await close();
      }
    });

    it('debería poder eliminar a una persona usando RUT con guion y puntos', async () => {
      store.add({
        nombre: 'A eliminar con formato',
        rut: '444444444',
        fechaNacimiento: '1980-04-04',
        ciudad: 'La Serena',
        gustos: ['comida', 'libros', 'juegos']
      });

      const { request, close } = await startTestServer();
      try {
        const response = await request('/api/personas/44.444.444-4', {
          method: 'DELETE'
        });

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.body.message, 'Persona eliminada correctamente.');
        assert.strictEqual(store.getAll().length, 0);
      } finally {
        await close();
      }
    });

    it('debería retornar 404 si el RUT a eliminar no existe', async () => {
      const { request, close } = await startTestServer();
      try {
        const response = await request('/api/personas/99.999.999-9', {
          method: 'DELETE'
        });

        assert.strictEqual(response.status, 404);
        assert.match(response.body.error, /No se encontró/);
      } finally {
        await close();
      }
    });
  });
});