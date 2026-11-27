import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { APP_CONFIG } from '../config/env';
import { IAuthRepository, RegisterInput, UserProfile, UserRole } from '../types';

interface StoredAccount {
  profile: UserProfile;
  password: string;
}

type AuthListener = (user: UserProfile | null) => void;

const SEEDED_ACCOUNTS: StoredAccount[] = [
  {
    password: 'student123',
    profile: {
      uid: 'uid-stu-9921',
      email: 'raghu@college.edu',
      name: 'Raghu',
      studentId: 'STU-9921',
      department: 'Computer Science & Eng',
      role: 'student',
      createdAt: '2026-09-01T09:00:00.000Z'
    }
  },
  {
    password: 'student123',
    profile: {
      uid: 'uid-stu-9922',
      email: 'ananya@college.edu',
      name: 'Ananya Sharma',
      studentId: 'STU-9922',
      department: 'Electronics & Comm',
      role: 'student',
      createdAt: '2026-09-05T10:30:00.000Z'
    }
  },
  {
    password: 'admin123',
    profile: {
      uid: 'uid-adm-0001',
      email: 'librarian@college.edu',
      name: 'Dr. Rao (Head Librarian)',
      studentId: 'STAFF-001',
      department: 'Central Library',
      role: 'admin',
      createdAt: '2026-08-15T08:00:00.000Z'
    }
  }
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERS_COL = 'users';

function mapFirebaseAuthError(err: any): string {
  const code = err?.code || '';
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/user-not-found' ||
    code === 'auth/wrong-password'
  ) {
    return 'Invalid email or password.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists.';
  }
  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error while reaching Firebase Auth. Check your connection.';
  }
  return err?.message || 'Authentication failed.';
}

/**
 * Local Mock Authentication Manager (when APP_CONFIG.DATA_PROVIDER === 'mock').
 */
class LocalAuthManager implements IAuthRepository {
  private accounts: StoredAccount[] = [...SEEDED_ACCOUNTS];
  private currentUser: UserProfile | null = null;
  private listeners: Set<AuthListener> = new Set();
  private nextStudentNum = 9923;

  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentUser);
      } catch (err) {
        console.warn('Error in auth listener', err);
      }
    });
  }

  async signInWithEmail(email: string, password: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const found = this.accounts.find((acc) => acc.profile.email.toLowerCase() === cleanEmail);
    if (!found || found.password !== password) {
      throw new Error('Invalid email or password.');
    }

    this.currentUser = { ...found.profile };
    this.notifyListeners();
    return this.currentUser;
  }

  async registerWithEmail(input: RegisterInput): Promise<UserProfile> {
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.name.trim();
    const cleanDept = input.department.trim() || 'Computer Science & Eng';

    if (!cleanName) {
      throw new Error('Please enter your full name.');
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!input.password || input.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const exists = this.accounts.some((acc) => acc.profile.email.toLowerCase() === cleanEmail);
    if (exists) {
      throw new Error('An account with this email already exists.');
    }

    const assignedRole: UserRole = input.role || 'student';
    const assignedId =
      input.studentId?.trim() ||
      (assignedRole === 'admin' ? `STAFF-${this.nextStudentNum++}` : `STU-${this.nextStudentNum++}`);

    const profile: UserProfile = {
      uid: `uid-${assignedRole === 'admin' ? 'adm' : 'stu'}-${Date.now()}`,
      email: cleanEmail,
      name: cleanName,
      studentId: assignedId.toUpperCase(),
      department: cleanDept,
      role: assignedRole,
      createdAt: new Date().toISOString()
    };

    this.accounts.push({ profile, password: input.password });
    this.currentUser = { ...profile };
    this.notifyListeners();
    return this.currentUser;
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    this.notifyListeners();
  }

  async switchRoleForDev(role: UserRole): Promise<UserProfile | null> {
    const targetEmail = role === 'admin' ? 'librarian@college.edu' : 'raghu@college.edu';
    const found = this.accounts.find((acc) => acc.profile.email === targetEmail);
    if (!found) return null;

    this.currentUser = { ...found.profile };
    this.notifyListeners();
    return this.currentUser;
  }
}

/**
 * Live Firebase Authentication + Firestore `users/{uid}` profile manager.
 */
class FirebaseAuthManager implements IAuthRepository {
  private currentUser: UserProfile | null = null;
  private listeners: Set<AuthListener> = new Set();
  private authUnsub: (() => void) | null = null;

  constructor() {
    this.initAuthListener();
  }

  private initAuthListener() {
    if (this.authUnsub) return;
    this.authUnsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        this.currentUser = null;
        this.notifyListeners();
        return;
      }

      try {
        const userRef = doc(db, USERS_COL, fbUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          this.currentUser = snap.data() as UserProfile;
        } else {
          const email = (fbUser.email || '').toLowerCase();
          const seeded = SEEDED_ACCOUNTS.find((a) => a.profile.email === email);
          const fallbackProfile: UserProfile = seeded
            ? { ...seeded.profile, uid: fbUser.uid }
            : {
                uid: fbUser.uid,
                email,
                name: fbUser.displayName || email.split('@')[0] || 'Student',
                studentId: `STU-${fbUser.uid.slice(0, 4).toUpperCase()}`,
                department: 'Computer Science & Eng',
                role: email === 'librarian@college.edu' ? 'admin' : 'student',
                createdAt: new Date().toISOString()
              };
          await setDoc(userRef, fallbackProfile);
          this.currentUser = fallbackProfile;
        }
      } catch (err) {
        console.warn('Error loading Firestore user profile:', err);
      }

      this.notifyListeners();
    });
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentUser);
      } catch (err) {
        console.warn('Error in Firebase auth listener', err);
      }
    });
  }

  async signInWithEmail(email: string, password: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const userSnap = await getDoc(doc(db, USERS_COL, cred.user.uid));
      if (userSnap.exists()) {
        this.currentUser = userSnap.data() as UserProfile;
        this.notifyListeners();
        return this.currentUser;
      }

      const seeded = SEEDED_ACCOUNTS.find((a) => a.profile.email === cleanEmail);
      const profile: UserProfile = seeded
        ? { ...seeded.profile, uid: cred.user.uid }
        : {
            uid: cred.user.uid,
            email: cleanEmail,
            name: cleanEmail.split('@')[0],
            studentId: `STU-${cred.user.uid.slice(0, 4).toUpperCase()}`,
            department: 'Computer Science & Eng',
            role: cleanEmail === 'librarian@college.edu' ? 'admin' : 'student',
            createdAt: new Date().toISOString()
          };
      await setDoc(doc(db, USERS_COL, cred.user.uid), profile);
      this.currentUser = profile;
      this.notifyListeners();
      return profile;
    } catch (err: any) {
      // Auto-provision seeded dev test accounts on first click in a brand-new Firebase project
      const code = err?.code || '';
      const seededMatch = SEEDED_ACCOUNTS.find(
        (a) => a.profile.email === cleanEmail && a.password === password
      );
      if (
        APP_CONFIG.ALLOW_DEV_QUICK_LOGIN &&
        seededMatch &&
        (code === 'auth/user-not-found' || code === 'auth/invalid-credential')
      ) {
        return this.registerWithEmail({
          email: seededMatch.profile.email,
          password: seededMatch.password,
          name: seededMatch.profile.name,
          studentId: seededMatch.profile.studentId,
          department: seededMatch.profile.department,
          role: seededMatch.profile.role
        });
      }
      throw new Error(mapFirebaseAuthError(err));
    }
  }

  async registerWithEmail(input: RegisterInput): Promise<UserProfile> {
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.name.trim();
    const cleanDept = input.department.trim() || 'Computer Science & Eng';

    if (!cleanName) {
      throw new Error('Please enter your full name.');
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!input.password || input.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, input.password);
      const assignedRole: UserRole = input.role || 'student';
      const assignedId =
        input.studentId?.trim() ||
        `${assignedRole === 'admin' ? 'STAFF' : 'STU'}-${cred.user.uid.slice(0, 4).toUpperCase()}`;

      const profile: UserProfile = {
        uid: cred.user.uid,
        email: cleanEmail,
        name: cleanName,
        studentId: assignedId.toUpperCase(),
        department: cleanDept,
        role: assignedRole,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, USERS_COL, cred.user.uid), profile);
      this.currentUser = profile;
      this.notifyListeners();
      return profile;
    } catch (err: any) {
      throw new Error(mapFirebaseAuthError(err));
    }
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
    this.currentUser = null;
    this.notifyListeners();
  }

  async switchRoleForDev(role: UserRole): Promise<UserProfile | null> {
    if (!APP_CONFIG.ALLOW_DEV_QUICK_LOGIN) return null;
    const seeded = SEEDED_ACCOUNTS.find((a) => a.profile.role === role);
    if (!seeded) return null;
    return this.signInWithEmail(seeded.profile.email, seeded.password);
  }
}

export const AuthService: IAuthRepository =
  APP_CONFIG.DATA_PROVIDER === 'firestore'
    ? new FirebaseAuthManager()
    : new LocalAuthManager();
