'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * React hook for connecting to the Socket.io server and listening for
 * restaurant-specific events (order:new, order:updated, etc.).
 *
 * Connects on mount, joins the restaurant room, and disconnects on unmount.
 * Automatically reconnects if the connection drops.
 *
 * @param ownerId - The restaurant owner's ID to join the room for
 * @param listeners - Map of event names to handler callbacks
 */
export function useSocket(
  ownerId: string | null,
  listeners: Record<string, (data: unknown) => void> = {}
): { connected: boolean } {
  const socketRef = useRef<Socket | null>(null);
  const connectedRef = useRef(false);
  // Store listeners in a ref to avoid re-triggering the effect on every render
  const listenersRef = useRef(listeners);
  listenersRef.current = listeners;

  const connect = useCallback(() => {
    if (!ownerId || socketRef.current?.connected) return;

    const socket = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      connectedRef.current = true;
      console.log(`🔌 [Socket.io] Connected successfully! Room: restaurant:${ownerId}`);
      socket.emit('join-restaurant', ownerId);
    });

    socket.on('disconnect', (reason) => {
      connectedRef.current = false;
      console.log(`🔌 [Socket.io] Disconnected. Reason: ${reason}`);
    });

    // Attach event listeners
    const eventNames = Object.keys(listenersRef.current);
    for (const event of eventNames) {
      socket.on(event, (data: unknown) => {
        console.log(`🔌 [Socket.io] Received event "${event}":`, data);
        listenersRef.current[event]?.(data);
      });
    }

    socketRef.current = socket;
  }, [ownerId]);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        connectedRef.current = false;
      }
    };
  }, [connect]);

  // Re-attach listeners when they change (new event names added)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const eventNames = Object.keys(listenersRef.current);
    for (const event of eventNames) {
      // Remove old listener and add new one
      socket.off(event);
      socket.on(event, (data: unknown) => {
        listenersRef.current[event]?.(data);
      });
    }
  }, [Object.keys(listeners).join(',')]);

  return { connected: connectedRef.current };
}
