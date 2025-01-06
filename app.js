require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

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
},{
    type: 'reply',
    reply: {
        id: 'gestionar_cita',
        title: 'Gestionar cita'
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
function agendarCita(fecha, horario, cliente, servicio) {
    if (!citas[fecha]) {
        citas[fecha] = {};
    }
    
    if (!citas[fecha][horario]) {
        citas[fecha][horario] = {
            cliente,
            servicio,
            fecha,
            horario
        };
        return true;
    }
    return false;
}

// Función para enviar lista de horarios como botones
async function sendHorariosButtons(phone_number_id, to) {
    const horariosDisponibles = getHorariosDisponibles();
    
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
                        text: '🗓️ Horarios disponibles para hoy:\n\n' + 
                             (horariosDisponibles.length > 0 ? 
                                'Selecciona un horario:' : 
                                'Lo siento, no hay horarios disponibles para hoy.')
                    },
                    action: {
                        buttons: horariosDisponibles.map((horario, index) => ({
                            type: 'reply',
                            reply: {
                                id: `horario_${index}`,
                                title: horario
                            }
                        }))
                    }
                }
            },
        });
    } catch (error) {
        console.error('Error sending horarios buttons:', error);
    }
}

// Función para enviar lista de servicios como botones después de seleccionar horario
async function sendServiciosButtons(phone_number_id, to, horarioSeleccionado) {
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
                        text: `Has seleccionado el horario: ${horarioSeleccionado}\n\nAhora elige el servicio:`
                    },
                    action: {
                        buttons: servicios.slice(0, 3).map((servicio, index) => ({
                            type: 'reply',
                            reply: {
                                id: `servicio_${index}_${horarioSeleccionado}`,
                                title: servicio
                            }
                        }))
                    }
                }
            },
        });
    } catch (error) {
        console.error('Error sending servicios buttons:', error);
    }
}

// Función para buscar citas de un cliente
function getCitasCliente(telefono) {
    const citasCliente = [];
    Object.keys(citas).forEach(fecha => {
        Object.keys(citas[fecha]).forEach(horario => {
            if (citas[fecha][horario].cliente === telefono) {
                citasCliente.push({
                    ...citas[fecha][horario],
                    fecha,
                    horario
                });
            }
        });
    });
    return citasCliente;
}

// Función para cancelar una cita
function cancelarCita(fecha, horario) {
    if (citas[fecha] && citas[fecha][horario]) {
        delete citas[fecha][horario];
        return true;
    }
    return false;
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
    const citasCliente = getCitasCliente(to);
    
    if (citasCliente.length === 0) {
        await sendTextMessage(phone_number_id, to, 
            "No tienes citas programadas. Escribe 'agendar' si deseas programar una nueva cita."
        );
        return;
    }

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
                        text: `Selecciona la cita que deseas ${accion === 'cancelar' ? 'cancelar' : 'reagendar'}:`
                    },
                    action: {
                        buttons: citasCliente.slice(0, 3).map((cita, index) => ({
                            type: 'reply',
                            reply: {
                                id: `${accion}_cita_${cita.fecha}_${cita.horario}`,
                                title: `${cita.fecha} ${cita.horario}`
                            }
                        }))
                    }
                }
            },
        });
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
        
        // Verificar si es una respuesta de botón o un mensaje de texto
        if (req.body.entry[0].changes[0].value.messages[0].type === 'interactive' && req.body.entry[0].changes[0].value.messages[0].interactive.type === 'button_reply') {
            // Manejar respuesta de botón
            const button_id = req.body.entry[0].changes[0].value.messages[0].interactive.button_reply.id;
            
            if (button_id.startsWith('horario_')) {
                const horarioSeleccionado = req.body.entry[0].changes[0].value.messages[0].interactive.button_reply.title;
                await sendButtons(phone_number_id, from, `Has seleccionado el horario: ${horarioSeleccionado}\n\nAhora elige el servicio:`,
                    servicios.map((servicio, index) => ({
                        type: 'reply',
                        reply: {
                            id: `servicio_${index}_${horarioSeleccionado}`,
                            title: servicio
                        }
                    }))
                );
            } 
            else if (button_id.startsWith('servicio_')) {
                const [, , horarioSeleccionado] = button_id.split('_');
                const servicioSeleccionado = req.body.entry[0].changes[0].value.messages[0].interactive.button_reply.title;
                
                const fechaActual = getFechaActual();
                const citaAgendada = agendarCita(fechaActual, horarioSeleccionado, from, servicioSeleccionado);
                
                if (citaAgendada) {
                    await sendTextMessage(phone_number_id, from,
                        `✅ ¡Cita agendada con éxito!\n\n` +
                        `📅 Fecha: ${fechaActual}\n` +
                        `⏰ Hora: ${horarioSeleccionado}\n` +
                        `💇 Servicio: ${servicioSeleccionado}\n\n` +
                        `Te esperamos!\n\n` +
                        `Si necesitas modificar o cancelar tu cita, escribe 'gestionar cita'.`
                    );
                } else {
                    await sendTextMessage(phone_number_id, from,
                        `❌ Lo siento, este horario ya no está disponible.\n` +
                        `Por favor, selecciona otro horario escribiendo 'agendar'.`
                    );
                }
            }
            else if (button_id === 'reagendar_cita') {
                await sendCitasClienteButtons(phone_number_id, from, 'reagendar');
            }
            else if (button_id === 'cancelar_cita') {
                await sendCitasClienteButtons(phone_number_id, from, 'cancelar');
            }
            else if (button_id.startsWith('cancelar_cita_')) {
                const [, , fecha, horario] = button_id.split('_');
                if (cancelarCita(fecha, horario)) {
                    await sendTextMessage(phone_number_id, from,
                        `✅ Tu cita ha sido cancelada exitosamente.\n\n` +
                        `Si deseas agendar una nueva cita, escribe 'agendar'.`
                    );
                }
            }
            else if (button_id.startsWith('reagendar_cita_')) {
                const [, , fecha, horario] = button_id.split('_');
                // Guardamos temporalmente el servicio actual
                const servicioActual = citas[fecha][horario].servicio;
                // Cancelamos la cita actual
                cancelarCita(fecha, horario);
                // Mostramos los nuevos horarios disponibles
                await sendHorariosButtons(phone_number_id, from);
            }
            else if (button_id === 'ver_horarios') {
                const horariosDisponibles = getHorariosDisponibles();
                await sendTextMessage(phone_number_id, from, 
                    "📅 Horarios disponibles para hoy:\n\n" + 
                    horariosDisponibles.join('\n')
                );
            }
            else if (button_id === 'ver_servicios') {
                await sendTextMessage(phone_number_id, from,
                    "✨ Nuestros servicios:\n\n" +
                    servicios.map((servicio, index) => `${index + 1}. ${servicio}`).join('\n')
                );
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
                        "¡Hola! 👋 Bienvenido a nuestro servicio. ¿En qué puedo ayudarte?\n\n" +
                        "Puedes seleccionar una de las siguientes opciones: "+
                        "- 'Horarios' para ver los horarios disponibles\n" +
                        "- 'Servicios' para ver nuestra lista de servicios\n" +
                        "- 'Agendar' para programar una cita\n" +
                        "- 'Gestionar cita' para modificar o cancelar tu cita", opcionesPrincipales);
                    break;

                case 'gestionar cita':
                case 'modificar cita':
                    await sendGestionCitaButtons(phone_number_id, from);
                    break;

                case 'horarios':
                    await sendTextMessage(phone_number_id, from, 
                        "📅 Estos son nuestros horarios disponibles:\n\n" + 
                        horarios.join('\n')
                    );
                    break;

                case 'servicios':
                    await sendTextMessage(phone_number_id, from,
                        "✨ Nuestros servicios:\n\n" +
                        servicios.map((servicio, index) => `${index + 1}. ${servicio}`).join('\n')
                    );
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
        // Función auxiliar para dividir el array en chunks de tamaño específico
        const chunkArray = (arr, size) => {
            return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );
        };

        // Dividir los botones en grupos de 3
        const buttonChunks = chunkArray(buttonOptions, 3);

        // Enviar cada grupo de botones como un mensaje separado
        const responses = await Promise.all(buttonChunks.map(async (buttons, index) => {
            // Modificar el mensaje para indicar si hay más opciones
            let messageText = message;
            if (buttonChunks.length > 1) {
                messageText += `\n\nOpciones (${index + 1}/${buttonChunks.length})`;
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
                            text: message
                        },
                        action: {
                            buttons: buttonOptions
                        }
                    }
                },
            });
            // Añadir un pequeño delay entre mensajes para evitar límites de rate
            if (index < buttonChunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            return response.data;
        }));

        return responses;
    } catch (error) {
        console.error('Error sending buttons:', error);
    }
}

app.listen(port, () => {
    console.log(`Webhook is listening on port ${port}`);
});

// sendTextMessage(process.env.WHATSAPP_PHONE_NUMBER_ID,process.env.NUMBER_TEST_ID, "¡Hola! 👋 Bienvenido a nuestro servicio. ¿En qué puedo ayudarte?");