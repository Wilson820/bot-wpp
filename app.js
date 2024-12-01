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
    if (req.body.object) {
        if (req.body.entry &&
            req.body.entry[0].changes &&
            req.body.entry[0].changes[0] &&
            req.body.entry[0].changes[0].value.messages &&
            req.body.entry[0].changes[0].value.messages[0]
        ) {
            const phone_number_id = req.body.entry[0].changes[0].value.metadata.phone_number_id;
            const from = req.body.entry[0].changes[0].value.messages[0].from;
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
                        "- 'agendar' para programar una cita"
                    );
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
                    await sendButtons(phone_number_id, from);
                    break;

                default:
                    await sendTextMessage(phone_number_id, from,
                        "No entiendo ese mensaje. Por favor, escribe una de las siguientes opciones:\n" +
                        "- 'horarios'\n" +
                        "- 'servicios'\n" +
                        "- 'agendar'"
                    );
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
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