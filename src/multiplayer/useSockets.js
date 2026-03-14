import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export const useMultiplayer = () => {
    const [socket, setSocket] = useState(null);
    const [otherPlayers, setOtherPlayers] = useState({});
    const socketRef = useRef(null);

    useEffect(() => {
        // En producción (Vercel), se conectará siempre a la instancia de Render, independientemente de Vercel ENV.
        const socketPath = import.meta.env.PROD ? 'https://abyss-82qb.onrender.com' : (import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000');
        const newSocket = io(socketPath);
        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log('%c🔗 Conectado al abismo colectivo. ID: ' + newSocket.id,
                'color: #39FF14; font-size: 14px; font-weight: bold;');
        });

        newSocket.on('connect_error', (err) => {
            console.error('❌ No se pudo conectar al servidor:', err.message);
        });

        // Snapshot of everyone already connected
        newSocket.on('current_players', (players) => {
            console.log('👾 Jugadores actuales en el abismo:', Object.keys(players).length);
            setOtherPlayers(players);
        });

        // Someone new joins
        newSocket.on('user_joined', ({ id, position }) => {
            console.log('👾 Nuevo ser en el caos:', id);
            setOtherPlayers(prev => ({ ...prev, [id]: position }));
        });

        // Someone moves
        newSocket.on('user_moved', ({ id, position }) => {
            setOtherPlayers(prev => ({ ...prev, [id]: position }));
        });

        // Someone leaves
        newSocket.on('user_left', (id) => {
            console.log('💀 Un ser abandonó el caos:', id);
            setOtherPlayers(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        });

        setSocket(newSocket);
        return () => newSocket.disconnect();
    }, []);

    return { socket, socketRef, otherPlayers };
};
