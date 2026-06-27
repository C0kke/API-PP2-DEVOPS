# Backend PP2Devops (Node.js & Express)

Este es un proyecto backend sencillo desarrollado en Node.js y Express que almacena registros de personas en memoria y demuestra la aplicación de conceptos de **Integración Continua (CI)** y **Despliegue Continuo (CD)**.

## Requisitos Previos

- [Node.js](https://nodejs.org/) (versión 18 o superior)
- npm (incluido con Node.js)

## Estructura del Proyecto

```text
PP2Devops/
├── .github/
│   └── workflows/
│       └── ci.yml          # Configuración de Integración Continua (GitHub Actions)
├── src/
│   ├── app.js             # Configuración de Express, middlewares y rutas
│   ├── server.js          # Punto de entrada para inicializar el servidor
│   └── store.js           # Almacén de datos en memoria para personas
├── tests/
│   └── personas.test.js   # Pruebas unitarias con Jest y Supertest
├── package.json           # Dependencias y scripts del proyecto
└── README.md              # Documentación del proyecto
```

## Instalación y Ejecución Local

1. Navegar al directorio del proyecto:
   ```bash
   cd PP2Devops
   ```

2. Instalar las dependencias:
   ```bash
   pnpm install
   ```

3. Iniciar el servidor de desarrollo:
   ```bash
   pnpm start
   ```
   El servidor estará escuchando en `http://localhost:3000`.

## Pruebas Unitarias

Las pruebas unitarias están implementadas con **Jest** y **Supertest** para validar el comportamiento del store en memoria y la consistencia de las rutas.

Para ejecutar las pruebas unitarias:
```bash
pnpm test
```

---

## Rutas de la API (Endpoints)

Todas las respuestas y envíos utilizan formato **JSON**.

### 1. Obtener todas las personas
* **Ruta:** `GET /api/personas`
* **Descripción:** Retorna una lista con todas las personas registradas en el sistema.
* **Respuesta Exitosa (200 OK):**
  ```json
  [
    {
      "nombre": "Juan Perez",
      "rut": "123456789",
      "fechaNacimiento": "1990-05-15",
      "ciudad": "Santiago"
    }
  ]
  ```

### 2. Agregar una persona
* **Ruta:** `POST /api/personas`
* **Descripción:** Registra una nueva persona. El RUT se almacena de forma normalizada (sin puntos ni guiones, en mayúsculas). No se permiten RUTs duplicados.
* **Cuerpo de la Solicitud (JSON):**
  ```json
  {
    "nombre": "Juan Perez",
    "rut": "12.345.678-9",
    "fechaNacimiento": "1990-05-15",
    "ciudad": "Santiago"
  }
  ```
* **Respuesta Exitosa (201 Created):**
  ```json
  {
    "message": "Persona agregada correctamente.",
    "persona": {
      "nombre": "Juan Perez",
      "rut": "123456789",
      "fechaNacimiento": "1990-05-15",
      "ciudad": "Santiago"
    }
  }
  ```
* **Respuesta Errónea (400 Bad Request):**
  * Ocurre si faltan campos obligatorios, el formato del RUT es inválido, el formato de la fecha de nacimiento no es `YYYY-MM-DD`, o si el RUT ya está registrado.
  ```json
  {
    "error": "La persona con el RUT 12345678-9 ya está registrada."
  }
  ```

### 3. Eliminar una persona por RUT
* **Ruta:** `DELETE /api/personas/:rut`
* **Descripción:** Elimina del almacén a la persona asociada al RUT provisto. El parámetro RUT es normalizado automáticamente.
* **Respuesta Exitosa (200 OK):**
  ```json
  {
    "message": "Persona eliminada correctamente."
  }
  ```
* **Respuesta Errónea (404 Not Found):**
  * Ocurre si el RUT provisto no corresponde a ninguna persona registrada.
  ```json
  {
    "error": "No se encontró ninguna persona registrada con el RUT: 12.345.678-9"
  }
  ```

---

## Integración Continua (CI) y Despliegue Continuo (CD)

### Integración Continua (CI)
Se ha configurado un flujo de trabajo automatizado usando **GitHub Actions** en el archivo `.github/workflows/ci.yml`.

**¿Cómo funciona?**
1. Cada vez que se realiza un `push` o se abre un `pull request` hacia las ramas principales (`main`, `master`), GitHub Actions ejecuta automáticamente el pipeline.
2. El pipeline realiza los siguientes pasos:
   - Descarga el código del repositorio.
    - Instala pnpm y Node.js v20.
   - Instala las dependencias definidas (`pnpm install --frozen-lockfile`).
   - Ejecuta las pruebas unitarias (`pnpm test`).
3. Si alguna prueba falla o si hay un error de instalación, el pipeline se marca como fallido, bloqueando integraciones inestables.

### Despliegue Continuo (CD)
Para completar el flujo de DevOps, se puede configurar el Despliegue Continuo utilizando plataformas modernas como **Render**, **Railway** o **Heroku**.

**Estrategia recomendada para CD:**
1. Vincular el repositorio de GitHub con la plataforma de alojamiento (por ejemplo, **Render**).
2. Configurar la plataforma para que escuche la rama `main`/`master`.
3. Activar la opción de **"Auto-Deploy"** para que se despliegue automáticamente ante nuevos cambios, pero **únicamente si el pipeline de Integración Continua (CI) en GitHub Actions ha finalizado de manera exitosa**.
4. La plataforma ejecutará automáticamente:
   - `pnpm install`
   - `pnpm start` (o `node src/server.js`), exponiendo la aplicación en el puerto proveído en `process.env.PORT`.
