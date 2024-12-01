# Bot de WhatsApp Business API

Este es un bot de WhatsApp que utiliza la API oficial de WhatsApp Business para interactuar con los usuarios.

## Funcionalidades

- Saludo automático
- Mostrar horarios disponibles
- Lista de servicios
- Botones interactivos para agendar citas

## Configuración

1. Instalar las dependencias:
```bash
npm install
```

2. Configurar las variables de entorno:
Crear un archivo `.env` con las siguientes variables:
```
WHATSAPP_TOKEN=your_token_here
VERIFY_TOKEN=your_verify_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
```

3. Iniciar el servidor:
```bash
npm start
```

## Uso

El bot responde a los siguientes comandos:
- "hola": Muestra un mensaje de bienvenida
- "horarios": Muestra los horarios disponibles
- "servicios": Muestra la lista de servicios
- "agendar": Muestra botones interactivos para agendar

## Requisitos

- Node.js
- Una cuenta de WhatsApp Business API
- Un servidor con HTTPS para los webhooks
