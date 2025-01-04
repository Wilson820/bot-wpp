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
    "Tratamiento capilar",
    "Manicure",
    "Pedicure"
];

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
                        buttons: horariosDisponibles.slice(0, 3).map((horario, index) => ({
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
        const msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // Contenido del mensaje

        // Verificar si es una respuesta de botón o un mensaje de texto
        if (req.body.entry[0].changes[0].value.messages[0].type === 'interactive' && req.body.entry[0].changes[0].value.messages[0].interactive.type === 'button_reply') {
            // Manejar respuesta de botón
            const button_id = req.body.entry[0].changes[0].value.messages[0].interactive.button_reply.id;
            
            if (button_id.startsWith('horario_')) {
                const horarioSeleccionado = req.body.entry[0].changes[0].value.messages[0].interactive.button_reply.title;
                await sendServiciosButtons(phone_number_id, from, horarioSeleccionado);
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
                case 'buenos días':
                case 'buenas tardes':
                case 'buenas noches':
                    await sendTextMessage(phone_number_id, from, 
                        "¡Hola! 👋 Bienvenido a nuestro servicio. ¿En qué puedo ayudarte?\n\n" +
                        "Puedes escribir:\n" +
                        "- 'horarios' para ver los horarios disponibles\n" +
                        "- 'servicios' para ver nuestra lista de servicios\n" +
                        "- 'agendar' para programar una cita\n" +
                        "- 'gestionar cita' para modificar o cancelar tu cita"
                    );
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
                    await sendTextMessage(phone_number_id, from,
                        "No entiendo ese mensaje. Por favor, escribe una de las siguientes opciones:\n" +
                        "- 'horarios'\n" +
                        "- 'servicios'\n" +
                        "- 'agendar'\n" +
                        "- 'gestionar cita'"
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

async function sendButtons(phone_number_id, to) {
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
                        text: '¿Qué te gustaría hacer?'
                    },
                    action: {
                        buttons: [
                            {
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
                            }
                        ]
                    }
                }
            },
        });
    } catch (error) {
        console.error('Error sending buttons:', error);
    }
}

app.listen(port, () => {
    console.log(`Webhook is listening on port ${port}`);
});

// sendTextMessage(process.env.WHATSAPP_PHONE_NUMBER_ID,process.env.NUMBER_TEST_ID, "¡Hola! 👋 Bienvenido a nuestro servicio. ¿En qué puedo ayudarte?");