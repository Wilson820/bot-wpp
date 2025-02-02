const mongoose = require('mongoose');

const AgendaSchema = new mongoose.Schema({
  cliente: { type: String, required: true },
  servicio: { type: String, required: true },
  fecha: { type: String, required: true },
  horario: { type: String, required: true }
});

module.exports = mongoose.model('Agenda', AgendaSchema);