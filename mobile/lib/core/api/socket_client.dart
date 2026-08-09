import 'package:socket_io_client/socket_io_client.dart' as io;
import 'env.dart';

/// Lazily-created singleton Socket.io client, mirroring the web app's
/// lib/socket.ts so both clients share the same real-time event contract
/// (post:update, attendance:update, sos:new, sos:ack, sos:resolved).
class SocketClient {
  SocketClient._();
  static final SocketClient instance = SocketClient._();

  io.Socket? _socket;

  io.Socket get socket {
    _socket ??= io.io(
      Env.apiBaseUrl,
      io.OptionBuilder().setTransports(['websocket']).build(),
    );
    return _socket!;
  }

  void joinEvent(int eventId) => socket.emit('join:event', eventId);
  void leaveEvent(int eventId) => socket.emit('leave:event', eventId);
}
