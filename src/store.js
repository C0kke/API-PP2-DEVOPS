let personas = [];

const store = {
  getAll() {
    return [...personas];
  },

  add(person) {
    const cleanRut = store.normalizeRut(person.rut);
    const exists = personas.some(p => store.normalizeRut(p.rut) === cleanRut);
    if (exists) {
      const err = new Error(`La persona con el RUT ${person.rut} ya está registrada.`);
      err.status = 400;
      throw err;
    }

    const newPerson = {
      nombre: person.nombre.trim(),
      rut: cleanRut,
      fechaNacimiento: person.fechaNacimiento.trim(),
      ciudad: person.ciudad.trim(),
      gustos: person.gustos || []
    };

    personas.push(newPerson);
    return newPerson;
  },

  deleteByRut(rut) {
    const cleanRut = store.normalizeRut(rut);
    const initialLength = personas.length;
    personas = personas.filter(p => store.normalizeRut(p.rut) !== cleanRut);
    return personas.length < initialLength;
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

  clear() {
    personas = [];
  }
};

module.exports = store;