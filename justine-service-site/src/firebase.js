import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBmm9nKCknpmgP8UpyU64mD52RrIUOy41k',
  authDomain: 'my-website-6f396.firebaseapp.com',
  projectId: 'my-website-6f396',
  storageBucket: 'my-website-6f396.firebasestorage.app',
  messagingSenderId: '242174998106',
  appId: '1:242174998106:web:01ed1eb94929409550ca63',
  measurementId: 'G-28YVVT23XD',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics is not needed to show the page, so load it later when the device is idle.
// This keeps the first load fast on low-end phones.
const loadAnalytics = () =>
  import('firebase/analytics')
    .then(({ getAnalytics, isSupported }) => isSupported().then((ok) => ok && getAnalytics(app)))
    .catch(() => {});
if ('requestIdleCallback' in window) requestIdleCallback(loadAnalytics, { timeout: 5000 });
else setTimeout(loadAnalytics, 3000);
