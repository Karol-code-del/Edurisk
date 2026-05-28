const fetch = globalThis.fetch;

const cleanPhone = (telefono) => {
  const digits = String(telefono).replace(/\D/g, '');
  if (!digits) {
    throw new Error('Número de teléfono inválido para WhatsApp.');
  }
  return `+${digits}`;
};

const sendWithTwilio = async (to, message) => {
  const accountSid = process.env.WHATSAPP_TWILIO_ACCOUNT_SID;
  const authToken = process.env.WHATSAPP_TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.WHATSAPP_TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Falta configuración Twilio de WhatsApp en .env. Revisa WHATSAPP_TWILIO_ACCOUNT_SID, WHATSAPP_TWILIO_AUTH_TOKEN y WHATSAPP_TWILIO_FROM_NUMBER.');
  }

  const body = new URLSearchParams({
    To: `whatsapp:${to}`,
    From: `whatsapp:${fromNumber}`,
    Body: message
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || JSON.stringify(result));
  }

  return result;
};

const sendWithMeta = async (to, message) => {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  if (!apiUrl || !apiToken) {
    throw new Error('Falta configuración de WhatsApp Meta en .env. Revisa WHATSAPP_API_URL y WHATSAPP_API_TOKEN.');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: `whatsapp:${to}`,
      type: 'text',
      text: { body: message }
    })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message || JSON.stringify(result));
  }

  return result;
};

const sendGeneric = async (to, message) => {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const fromNumber = process.env.WHATSAPP_SENDER_NUMBER;
  if (!apiUrl || !apiToken || !fromNumber) {
    throw new Error('Falta configuración de WhatsApp genérica en .env. Revisa WHATSAPP_API_URL, WHATSAPP_API_TOKEN y WHATSAPP_SENDER_NUMBER.');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: `whatsapp:${to}`,
      from: `whatsapp:${fromNumber}`,
      body: message
    })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || JSON.stringify(result));
  }

  return result;
};

const sendWithUltramsg = async (to, message) => {
  const instanceId = process.env.WHATSAPP_ULTRAMSG_INSTANCE_ID;
  const token = process.env.WHATSAPP_ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    throw new Error('Falta configuración UltraMsg en .env. Revisa WHATSAPP_ULTRAMSG_INSTANCE_ID y WHATSAPP_ULTRAMSG_TOKEN.');
  }

  const toNumber = to.replace(/^\+/, '');
  const apiUrl = `https://api.ultramsg.com/${instanceId}/messages/chat?token=${token}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: toNumber,
      body: message
    })
  });

  const result = await response.json();
  if (!response.ok || result.status === 'error') {
    throw new Error(result.error || JSON.stringify(result));
  }

  return result;
};

const sendWhatsAppMessage = async (telefono, message) => {
  const to = cleanPhone(telefono);
  const provider = (process.env.WHATSAPP_PROVIDER || 'twilio').toLowerCase();

  if (!fetch) {
    throw new Error('fetch no está disponible en este entorno de Node. Usa Node 18+ o configura node-fetch.');
  }

  if (provider === 'twilio') {
    return await sendWithTwilio(to, message);
  }

  if (provider === 'meta') {
    return await sendWithMeta(to, message);
  }

  if (provider === 'ultramsg') {
    return await sendWithUltramsg(to, message);
  }

  return await sendGeneric(to, message);
};

module.exports = {
  sendWhatsAppMessage
};
