import { Request, Response } from 'express';

export function handleInboundCallWebhook(req: Request, res: Response) {
  // Pull the public Ngrok/tunnel URL from your environment variables
  const publicUrl = process.env.PUBLIC_URL;
  
  if (!publicUrl) {
    console.warn("⚠️ WARNING: process.env.PUBLIC_URL is not defined in your .env file!");
  }

  // Strip protocols (http:// or https://) out of the PUBLIC_URL if they exist 
  // because the wss:// prefix handles the protocol layer.
  const cleanHost = publicUrl ? publicUrl.replace(/^https?:\/\//, '') : (req.headers.host || 'localhost:3000');
  const clientId = req.query.clientId || 'default_client';

  // Set response headers explicitly for Twilio
  res.type('text/xml');
  res.header('Content-Type', 'text/xml');
  
  // Return the exact clean single-stream configuration string
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${cleanHost}/media-stream?clientId=${clientId}" />
  </Connect>
</Response>`);
}