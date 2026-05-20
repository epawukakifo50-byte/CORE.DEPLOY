import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without passing the specific database ID 
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); 
export const auth = getAuth(app);

// Check for redirect result on load
getRedirectResult(auth)
  .then((result) => {
    if (result) {
      console.log('Redirect sign-in successful:', result.user.uid);
    }
  })
  .catch((error) => {
    console.error("Redirect sign-in error:", error);
    alert(`Ошибка авторизации (Redirect): ${error.message}. Убедитесь, что домен ${window.location.hostname} добавлен в список Authorized Domains в Firebase Authentication.`);
  });

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const isIframe = window !== window.parent;
    if (isIframe) {
      // In AI Studio Preview iframe, popup is the only way, but it might be blocked.
      await signInWithPopup(auth, provider);
    } else {
      // On Vercel and mobile, redirect is far more stable.
      // Trying popup first, fall back to redirect if needed, but let's just use popup
      // unless on mobile. Actually let's just stick to redirect if not iframe for now.
      await signInWithRedirect(auth, provider);
    }
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.log('Login popup closed by user.');
      // Fallback: try redirect if popup blocked
      await signInWithRedirect(auth, provider);
    } else {
      console.error("Login failed:", error);
      alert(`Ошибка авторизации: ${error.message}. Проверьте Authorized Domains.`);
    }
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
  }
};
