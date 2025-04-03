import { Server, WebSocket } from 'ws';
import { NextApiRequest, NextApiResponse } from 'next';

const wss = new Server({ noServer: true });

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (message: string) => {
    console.log(`Received message => ${message}`);
  });

  ws.send('Welcome to the real-time notification server!');
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({ message: 'WebSocket server is running' });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export { wss }; 