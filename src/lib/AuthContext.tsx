import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile 
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  googleAccessToken: string | null;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  connectDrive: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(localStorage.getItem('google_drive_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  const login = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = async (email: string, password: string, name: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
  };

  const connectDrive = async () => {
    const driveProvider = new GoogleAuthProvider();
    driveProvider.addScope('https://www.googleapis.com/auth/drive.file');
    // Ensure account selection and consent screen appear
    driveProvider.setCustomParameters({ 
      prompt: 'select_account',
      access_type: 'offline'
    });
    
    try {
      console.log('Opening Drive connection popup...');
      const result = await signInWithPopup(auth, driveProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      
      if (token) {
        setGoogleAccessToken(token);
        localStorage.setItem('google_drive_token', token);
        console.log('Drive token acquired successfully');
      } else {
        console.warn('Popup closed but no token was returned');
      }
      return token;
    } catch (error: any) {
      console.error('Error connecting Google Drive:', error);
      
      // Provide user-friendly error messages
      let message = 'Failed to connect to Google Drive.';
      if (error.code === 'auth/popup-blocked') {
        message = 'The popup was blocked by your browser. Please allow popups for this site and try again.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = 'The connection window was closed before it could complete.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        message = 'Only one connection request can be handled at a time.';
      } else if (error.message) {
        message += `\nError: ${error.message}`;
      }
      
      alert(message);
      return null;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setGoogleAccessToken(null);
    localStorage.removeItem('google_drive_token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, googleAccessToken, login, loginWithEmail, registerWithEmail, logout, connectDrive }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
