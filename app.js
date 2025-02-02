require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const mongoose = require('mongoose');
const AgendaModel = require('./models/AgendaModel');

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout de 5 segundos
    retryWrites: true,
    w: 'majority'
})
.then(() => console.log('Conectado a MongoDB Atlas'))
.catch((error) => {
    console.error('Error conectando a MongoDB:', error);
    // Opcional: Implementar una estrategia de reconexión
    setTimeout(() => {
        mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    }, 5000);
});

// Manejar eventos de conexión
mongoose.connection.on('disconnected', () => {
    console.log('Desconectado de MongoDB');
});

mongoose.connection.on('error', (error) => {
    console.error('Error de conexión MongoDB:', error);
});

mongoose.connection.on('reconnected', () => {
    console.log('Reconectado a MongoDB');
});

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Horarios disponibles
const horarios = [
    "9:00 AM - 10:00 AM",
    "10:00 AM - 11:00 AM",
    "11:00 AM - 12:00 PM",
    "2:00 PM - 3:00 PM",
    "3:00 PM - 4:00 PM",
    "4:00 PM - 5:00 PM"
];

// Lista de servicios
const servicios = [
    "Corte de cabello",
    "Tinte",
    "Peinado",
    "Trenza",
    "Quemador de grasa",
    "Manicure tradicional",
    "Pedicure tradicional",
    "Limpieza facial",
    "Pigmentación de cejas",
    "Pigmentación de labios",
    "Lifting de pestañas",
    "Laminado de cejas",
    "Piel de porcelana",
    "Depilación con cera",
    "Depilación con láser"
];

const opcionesPrincipales = 
[{
    type: 'reply',
    reply: {
        id: 'ver_horarios',
        title: 'Ver horarios'
    }
},{
    type: 'reply',
    reply: {
        id: 'ver_servicios',
        title: 'Ver servicios'
    }
},{
    type: 'reply',
    reply: {
        id: 'agendar',
        title: 'Agendar'
    }
}];

// Objeto para almacenar las citas
const citas = {};

// Función para obtener la fecha actual en formato YYYY-MM-DD
function getFechaActual() {
    const fecha = new Date();
    return fecha.toISOString().split('T')[0];
}

// Función para obtener horarios disponibles del día
function getHorariosDisponibles() {
    const fechaActual = getFechaActual();
    if (!citas[fechaActual]) {
        citas[fechaActual] = {};
    }
    
    return horarios.filter(horario => !citas[fechaActual][horario]);
}

// Función para agendar una cita
async function agendarCita(fecha, horario, cliente, servicio) {
    try {
        // Verificar si ya existe una cita en ese horario
        const citaExistente = await AgendaModel.findOne({ fecha, horario });
        
        if (citaExistente) {
          return false;
        }
        
        // Crear nueva cita
        const nuevaCita = new AgendaModel({
          cliente,
          servicio,
          fecha,
          horario
        });
        
        await nuevaCita.save();
        return true;
    } catch (error) {
        console.error('Error al agendar cita:', error);
        return false;
    }
}


// Función para buscar citas de un cliente
async function getCitasCliente(telefono) {
    try {
        const citasCliente = await AgendaModel.find({ cliente: telefono });
        return citasCliente;
    } catch (error) {
        console.error('Error al buscar citas:', error);
        return [];
    }
}

// Función para cancelar una cita
async function cancelarCita(fecha, horario) {
    try {
        const resultado = await AgendaModel.deleteOne({ fecha, horario });
        return resultado.deletedCount > 0;
    } catch (error) {
        console.error('Error al cancelar cita:', error);
        return false;
    }
}

// Función para enviar lista de horarios como botones
async function sendHorariosButtons(phone_number_id, from) {
    const horariosDisponibles = getHorariosDisponibles();
    await sendButtons(phone_number_id, from, 
        "📅 Horarios disponibles para hoy:\n\n",
        horariosDisponibles.map((horario, index) => ({
            type: 'reply',
            reply: {
                id: `horario_${index}`,
                title: horario
            }
        }))
    );
}

async function sendServiciosButtons(phone_number_id, from) {
    try {
        listChunks = chunkArray(servicios, 10);
        let textDefault = 'Selecciona una opción';
        for (let index = 0; index < listChunks.length; index++) {
            const listaX10 = listChunks[index];
            let arrayServicios = limit10Items(listaX10, 'servicio', '');
            if(index >= 1) {
                textDefault = 'Mas servicios disponibles';
            }
            await sendListMessage(phone_number_id, from,
                textDefault,
                `Por favor seleccione una opcion de la siguiente lista`,
                'Muchas gracias!',
                'Ver servicios',
                [
                    {
                    title: 'Servicios disponibles',
                    rows: arrayServicios
                    }
                ]
            );

            // Añadir un pequeño delay entre mensajes para evitar límites de rate
            if (index < listChunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        console.error('Error sending list sendServiciosButtons:', error);
    }
}

// Función para enviar opciones de gestión de citas
async function sendGestionCitaButtons(phone_number_id, to) {
    try {
        await axios({
            method: 'POST',
            url: `${process.env.WHATSAPP_API_URL}/${phone_number_id}/messages`,
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            data: {
                messaging_product: 'whatsapp',
                to: to,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: {
                        text: '¿Qué deseas hacer con tu cita?'
                    },
                    action: {
                        buttons: [
                            {
                                type: 'reply',
                                reply: {
                                    id: 'reagendar_cita',
                                    title: 'Reagendar'
                                }
                            },
                            {
                                type: 'reply',
                                reply: {
                                    id: 'cancelar_cita',
                                    title: 'Cancelar'
                                }
                            }
                        ]
                    }
                }
            },
        });
    } catch (error) {
        console.error('Error sending gestion cita buttons:', error);
    }
}

// Función para mostrar las citas del cliente como botones para seleccionar
async function sendCitasClienteButtons(phone_number_id, to, accion) {
    const citasCliente = await getCitasCliente(to);
    
    if (citasCliente.length === 0) {
        await sendButtons(phone_number_id, to,
            `❌ No tienes citas programadas.\n Selecciona 'Agendar' si deseas programar una nueva cita.`,
            [{
                type: 'reply',
                reply: {
                    id: 'agendar',
                    title: 'Agendar'
                }
            }]
        );
        return;
    }

    try {
        const citasClienteByDay = citasCliente.reduce((acc, cur) => {
            // Usar los campos del documento de Mongoose
            const [year, month, day] = cur.fecha.split('-');
            const fecha = `${month}-${day}`;
            if (!acc[fecha]) {
                acc[fecha] = {
                    year,
                    fecha,
                    citas: []
                };
            }
            acc[fecha].citas.push(cur);
            return acc;
        }, {});
    
        const citasClienteByDayArray = Object.values(citasClienteByDay);
        for (const dia of citasClienteByDayArray) {
            await sendButtons(phone_number_id, to, 
                `Citas programadas para el ${dia.year}-${dia.fecha}:`,
                dia.citas.map((cita, index) => ({
                    type: 'reply',
                    reply: {
                        // Usar los campos del documento de Mongoose
                        id: `${accion}_cita_${cita.fecha}_${cita.horario}`,
                        title: `${cita.horario}`
                    }
                }))
            );
        }
    } catch (error) {
        console.error('Error sending citas cliente buttons:', error);
    }
}

app.get('/', (req, res) => {
    res.send('Bot de WhatsApp Business API');
});

// Webhook verification
app.get('/webhook', (req, res) => {
    const verify_token = process.env.VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === verify_token) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// Webhook for receiving messages
app.post('/webhook', async (req, res) => {
    if ( ! req.body.object) {
        res.sendStatus(404);
    }
    if (req.body.entry &&
        req.body.entry[0].changes &&
        req.body.entry[0].changes[0] &&
        req.body.entry[0].changes[0].value.messages &&
        req.body.entry[0].changes[0].value.messages[0]
    ) {
        // Informaci n del mensaje
        const phone_number_id = req.body.entry[0].changes[0].value.metadata.phone_number_id; // Identificador del n mero de telfono de WhatsApp Business
        const from = req.body.entry[0].changes[0].value.messages[0].from; // N mero de telfono del usuario que env a el mensaje
        
        // Verificar si es una respuesta de botón, lista o un mensaje de texto
        if (req.body.entry[0].changes[0].value.messages[0].type === 'interactive' && req.body.entry[0].changes[0].value.messages[0].interactive.type === 'list_reply'){
            // Manejar respuesta de lista
            const list_id = req.body.entry[0].changes[0].value.messages[0].interactive.list_reply.id;
            if (list_id.startsWith('servicio_')) {
                const servicioSeleccionado = req.body.entry[0].changes[0].value.messages[0].interactive.list_reply.title;
                const [nameList, index, horarioSeleccionado] = list_id.split('_');
                
                //Agenda sin seleccionar horario
                if( ! horarioSeleccionado || horarioSeleccionado == undefined) {
                    await sendTextMessage(phone_number_id, from,
                        `⏰ Para agendar tu cita, selecciona un horario.`
                    );
                    await sendHorariosButtons(phone_number_id, from);
                    res.sendStatus(200);
                    return;
                }
                
                const fechaActual = getFechaActual();
                const citaAgendada = agendarCita(fechaActual, horarioSeleccionado, from, servicioSeleccionado);
                
                if (citaAgendada) {
                    await sendTextMessage(phone_number_id, from,
                        `✅ ¡Cita agendada con éxito!\n\n` +
                        `📅 Fecha: ${fechaActual}\n` +
                        `⏰ Hora: ${horarioSeleccionado}\n` +
                        `💇 Servicio: ${servicioSeleccionado}\n\n` +
                        `Te esperamos!`
                    );
                    await sendButtons(phone_number_id, from,
                        `Si necesitas modificar o cancelar tu cita, selecciona una de las siguientes opciones:`,
                        [{
                            type: 'reply',
                            reply: {
                                id: 'reagendar_cita',
                                title: 'Reagendar cita'
                            }
                        },{
                            type: 'reply',
                            reply: {
                                id: 'cancelar_cita',
                                title: 'Cancelar cita'
                            }
                        }]
                    );
                } else {
                    await sendButtons(phone_number_id, from,
                        `❌ Lo siento, este horario ya no está disponible.\n` +
                        `Por favor, selecciona otro horario seleccionando Agendar.`,
                        [{
                            type: 'reply',
                            reply: {
                                id: 'agendar',
                                title: 'Agendar'
                            }
                        }]
                    );
                }
            }
        }else if (req.body.entry[0].changes[0].value.messages[0].type === 'interactive' && req.body.entry[0].changes[0].value.messages[0].interactive.type === 'button_reply'){
            // Manejar respuesta de botón
            const button_id = req.body.entry[0].changes[0].value.messages[0].interactive.button_reply.id;
            
            if(button_id == 'agendar') {
                await sendHorariosButtons(phone_number_id, from);
            }else if (button_id === 'ver_horarios') {
                await sendHorariosButtons(phone_number_id, from);
            }else if (button_id === 'ver_servicios') {
                await sendServiciosButtons(phone_number_id, from);
            }else if (button_id === 'reagendar_cita') {
                await sendCitasClienteButtons(phone_number_id, from, 'reagendar');
            }
            else if (button_id === 'cancelar_cita') {
                await sendCitasClienteButtons(phone_number_id, from, 'cancelar');
            }else if (button_id.startsWith('cancelar_cita_')) {
                const [, , fecha, horario] = button_id.split('_');
                if (cancelarCita(fecha, horario)) {
                    await sendButtons(phone_number_id, from,
                        `✅ Tu cita ha sido cancelada exitosamente.\n\n` +
                        `Si deseas agendar una nueva cita, selecciona 'Agendar'.`,
                        [{
                            type: 'reply',
                            reply: {
                                id: 'agendar',
                                title: 'Agendar'
                            }
                        }]
                    );
                }
            }else if (button_id.startsWith('horario_')) {
                try {
                    const horarioSeleccionado = req.body.entry[0].changes[0].value.messages[0].interactive.button_reply.title;
                    
                    listChunks = chunkArray(servicios, 10);
                    let textDefault = 'Selecciona una opción';
                    for (let index = 0; index < listChunks.length; index++) {
                        const listaX10 = listChunks[index];
                        let arrayServicios = limit10Items(listaX10, 'servicio', horarioSeleccionado);
                        if(index >= 1) {
                            textDefault = 'Mas servicios disponibles';
                        }
                        await sendListMessage(phone_number_id, from,
                            textDefault,
                            `Has seleccionado el horario: ${horarioSeleccionado}\n\nAhora elige el servicio:`,
                            'Para agregar otro servicio, agenda otra cita al finalizar.',
                            'Ver servicios',
                            [
                              {
                                title: 'Servicios disponibles',
                                rows: arrayServicios
                              }
                            ]
                        );
    
                        // Añadir un pequeño delay entre mensajes para evitar límites de rate
                        if (index < listChunks.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                } catch (error) {
                    console.error('Error sending list horarios_:', error);
                }
                
            }else if (button_id.startsWith('reagendar_cita_')) {
                const [, , fecha, horario] = button_id.split('_');
                // Guardamos temporalmente el servicio actual
                const servicioActual = citas[fecha][horario].servicio;
                // Cancelamos la cita actual
                cancelarCita(fecha, horario);
                // Mostramos los nuevos horarios disponibles
                await sendHorariosButtons(phone_number_id, from);
            }
        } else if (req.body.entry[0].changes[0].value.messages[0].type === 'text') {
            // Manejar mensaje de texto
            const msg_body = req.body.entry[0].changes[0].value.messages[0].text.body;

            switch(msg_body.toLowerCase()) {
                case 'hola':
                case 'buenos dias':
                case 'buenas tardes':
                case 'buenas noches':
                    await sendButtons(phone_number_id, from, 
                        "¡Hola! 👋 Bienvenido a nuestro servicio. ¿En qué puedo ayudarte?", opcionesPrincipales);
                    break;

                case 'gestionar cita':
                case 'modificar cita':
                    await sendGestionCitaButtons(phone_number_id, from);
                    break;

                case 'horarios':
                    await sendHorariosButtons(phone_number_id, from);
                    break;

                case 'servicios':
                    await sendServiciosButtons(phone_number_id, from);
                    break;

                case 'agendar':
                    await sendHorariosButtons(phone_number_id, from);
                    break;

                default:
                    await sendButtons(phone_number_id, from,
                        "No entiendo ese mensaje. Por favor, elige una de las siguientes opciones:",
                        opcionesPrincipales
                    );
            }
        }
    }
    res.sendStatus(200);
});

async function sendTextMessage(phone_number_id, to, message) {
    try {
        await axios({
            method: 'POST',
            url: `${process.env.WHATSAPP_API_URL}/${phone_number_id}/messages`,
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            data: {
                messaging_product: 'whatsapp',
                to: to,
                text: { body: message },
            },
        });
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Función auxiliar para dividir el array en chunks de tamaño específico
const chunkArray = (arr, size) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
    );
};

/**
 * 
 * @param {Number} phone_number_id 
 * @param {Number} to 
 * @param {String} message 
 * @param {Array Object} buttonOptions example: [{
                                type: 'reply',
                                reply: {
                                    id: 'ver_horarios',
                                    title: 'Ver horarios'
                                }
                            },
                            {
                                type: 'reply',
                                reply: {
                                    id: 'ver_servicios',
                                    title: 'Ver servicios'
                                }
                            }]
 */
async function sendButtons(phone_number_id, to, message = "Selecciona una opcion", buttonOptions = []) {
    try {

        // Dividir los botones en grupos de 3
        const buttonChunks = chunkArray(buttonOptions, 3);

        // Enviar cada grupo de botones de forma secuencial
        const responses = [];
        for (let index = 0; index < buttonChunks.length; index++) {
            const buttons = buttonChunks[index];
            
            // Modificar el mensaje para indicar si hay más opciones
            let messageText = message;
            if (index > 0) {
                // messageText = ` (Continuación ${index + 1}/${buttonChunks.length})`;
                messageText = "..."; // Solo enviar los botones
            }

            const response = await axios({
                method: 'POST',
                url: `${process.env.WHATSAPP_API_URL}/${phone_number_id}/messages`,
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    messaging_product: 'whatsapp',
                    to: to,
                    type: 'interactive',
                    interactive: {
                        type: 'button',
                        body: {
                            text: messageText
                        },
                        action: {
                            buttons: buttons
                        }
                    }
                },
            });

            responses.push(response.data);

            // Añadir un pequeño delay entre mensajes para evitar límites de rate
            if (index < buttonChunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return responses;
    } catch (error) {
        console.error('Error sending buttons:', error);
    }
}

/**
 * Funcion auxiliar para enviar listas de mas de 10 elementos
 */
function limit10Items(arrayList, nameList = 'list', informacionAdicional = '') {
    let rowsList = [];
    const hayInformacionAdicional = informacionAdicional !== '';
    let informacionAdicionalValida = informacionAdicional;
    if(hayInformacionAdicional) {
        informacionAdicionalValida = informacionAdicional;
    }
    for (let i = 0; i < arrayList.length; i++) {
        if(i >= 10) {
            break;
        }
        const listItem = arrayList[i];
        rowsList.push({
            id: `${nameList}_${i}_${informacionAdicionalValida}`,
            title: listItem,
            description: ''
        });
    }
    return rowsList;
}

async function sendListMessage(phone_number_id, to, header, body, footer, buttonText, sections) {
  try {
    const interactive = {
      type: 'list',
      header: header ? {
        type: 'text',
        text: header
      } : undefined,
      body: {
        text: body
      },
      footer: footer ? {
        text: footer
      } : undefined,
      action: {
        button: buttonText,
        sections: sections.map(section => ({
          title: section.title,
          rows: section.rows.map(row => ({
            id: row.id || crypto.randomUUID(),
            title: row.title,
            description: row.description || ''
          }))
        }))
      }
    };

    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'interactive',
      interactive: interactive
    };

    const response = await axios(
        {
            method: 'POST',
            url: `${process.env.WHATSAPP_API_URL}/${phone_number_id}/messages`,
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            data
        }
    );

    return response.data;
  } catch (error) {
    console.error('Error sending list message:', error.response ? error.response.data : error.message);
    throw error;
  }
}

app.listen(port, () => {
    console.log(`Webhook is listening on port ${port}`);
});

// sendTextMessage(process.env.WHATSAPP_PHONE_NUMBER_ID,process.env.NUMBER_TEST_ID, "¡Hola! 👋 Bienvenido a nuestro servicio. ¿En qué puedo ayudarte?");