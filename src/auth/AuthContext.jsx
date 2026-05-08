import { createContext, useContext, useEffect, useState } from 'react';
import { getSession, getToken, onAuthStateChange, logout } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [session, setSession] = useState(undefined); // undefined = loading

    useEffect(() => {
        getSession().then(({ data }) => {
            setSession(data.session);
        });
        const { data: { subscription } } = onAuthStateChange((event, session) => {
            setSession(session);
        });
        return () => subscription.unsubscribe();
    }, []);

    return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}

export const useSession = () => useContext(AuthContext);

export { logout };
