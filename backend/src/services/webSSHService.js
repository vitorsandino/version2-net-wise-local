import { NodeSSH } from 'node-ssh';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function decryptPassword(encryptedPassword) {
  const parts = encryptedPassword.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function setupWebSSH(io) {
  io.on('connection', (socket) => {
    let ssh = new NodeSSH();

    socket.on('ssh-connect', async (data) => {
      try {
        const { host, port, username, passwordEncrypted } = data;
        const password = decryptPassword(passwordEncrypted);

        await ssh.connect({
          host,
          port: port || 22,
          username,
          password,
          tryKeyboard: true,
        });

        socket.emit('ssh-status', { status: 'connected' });

        const shell = await ssh.requestShell();

        shell.on('data', (data) => {
          socket.emit('ssh-data', data.toString());
        });

        shell.on('close', () => {
          socket.emit('ssh-status', { status: 'disconnected' });
          socket.disconnect();
        });

        socket.on('ssh-input', (input) => {
          shell.write(input);
        });

        socket.on('ssh-resize', (data) => {
          shell.setWindow(data.rows, data.cols, data.height, data.width);
        });

        socket.on('disconnect', () => {
          shell.end();
          ssh.dispose();
        });

      } catch (error) {
        socket.emit('ssh-status', { status: 'error', message: error.message });
        socket.disconnect();
      }
    });
  });
}
