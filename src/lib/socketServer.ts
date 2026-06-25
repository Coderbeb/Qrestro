import type { Server as SocketIOServer } from 'socket.io';

/**
 * Retrieves the global Socket.io server instance.
 * The instance is set by the custom server (server.ts) at startup.
 * Returns null if Socket.io is not initialized (e.g. during build).
 */
export function getIO(): SocketIOServer | null {
  return (globalThis as Record<string, unknown>).__io as SocketIOServer | null ?? null;
}

/**
 * Emit a Socket.io event to all clients in a specific restaurant's room.
 * Safe to call even if Socket.io is not initialized — silently no-ops.
 *
 * @param ownerId - The restaurant owner's ID (used as the room name)
 * @param event - The event name (e.g. 'order:new', 'order:updated')
 * @param data - The payload to send
 */
export function emitToRestaurant(ownerId: string, event: string, data: unknown): void {
  const io = getIO();
  if (io) {
    io.to(`restaurant:${ownerId}`).emit(event, data);
  }
}
