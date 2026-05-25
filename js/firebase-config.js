/* ============================================================
   ASHOKA WATER PARK & RESORT — Firebase Configuration
   Dual-mode: Firebase Firestore / LocalStorage Fallback
   ============================================================ */

const FIREBASE_CONFIG = {
  // Replace with your actual Firebase project config
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

/* ---------- Storage Engine (LocalStorage Fallback) ---------- */
class AshokaDB {
  constructor() {
    this.useFirebase = false;
    this.db = null;
    this.auth = null;
    this._init();
  }

  _init() {
    // Check if Firebase SDKs are loaded and config is set
    if (
      typeof firebase !== 'undefined' &&
      FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY'
    ) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.useFirebase = true;
        console.log('[AshokaDB] Firebase connected');
      } catch (e) {
        console.warn('[AshokaDB] Firebase init failed, using local storage', e);
        this.useFirebase = false;
      }
    } else {
      console.log('[AshokaDB] Using LocalStorage fallback');
      this.useFirebase = false;
    }
  }

  // ---------- CRUD Operations ----------

  _getCollection(name) {
    const data = localStorage.getItem(`ashoka_${name}`);
    return data ? JSON.parse(data) : [];
  }

  _saveCollection(name, data) {
    localStorage.setItem(`ashoka_${name}`, JSON.stringify(data));
  }

  // Add document
  async add(collection, data) {
    const doc = {
      ...data,
      id: this._generateId(),
      createdAt: new Date().toISOString(),
      status: data.status || 'new'
    };

    if (this.useFirebase) {
      try {
        const ref = await this.db.collection(collection).add(doc);
        doc.id = ref.id;
        return doc;
      } catch (e) {
        console.error('[AshokaDB] Firebase add error:', e);
      }
    }

    // LocalStorage fallback
    const items = this._getCollection(collection);
    items.unshift(doc);
    this._saveCollection(collection, items);
    return doc;
  }

  // Get all documents
  async getAll(collection) {
    if (this.useFirebase) {
      try {
        const snapshot = await this.db
          .collection(collection)
          .orderBy('createdAt', 'desc')
          .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        console.error('[AshokaDB] Firebase getAll error:', e);
      }
    }

    return this._getCollection(collection);
  }

  // Update document
  async update(collection, id, data) {
    if (this.useFirebase) {
      try {
        await this.db.collection(collection).doc(id).update(data);
        return true;
      } catch (e) {
        console.error('[AshokaDB] Firebase update error:', e);
      }
    }

    const items = this._getCollection(collection);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...data };
      this._saveCollection(collection, items);
      return true;
    }
    return false;
  }

  // Delete document
  async delete(collection, id) {
    if (this.useFirebase) {
      try {
        await this.db.collection(collection).doc(id).delete();
        return true;
      } catch (e) {
        console.error('[AshokaDB] Firebase delete error:', e);
      }
    }

    let items = this._getCollection(collection);
    items = items.filter(item => item.id !== id);
    this._saveCollection(collection, items);
    return true;
  }

  // Get count
  async count(collection) {
    if (this.useFirebase) {
      try {
        const snapshot = await this.db.collection(collection).get();
        return snapshot.size;
      } catch (e) {
        console.error('[AshokaDB] Firebase count error:', e);
      }
    }

    return this._getCollection(collection).length;
  }

  // Count with filter
  async countWhere(collection, field, value) {
    if (this.useFirebase) {
      try {
        const snapshot = await this.db
          .collection(collection)
          .where(field, '==', value)
          .get();
        return snapshot.size;
      } catch (e) {
        console.error('[AshokaDB] Firebase countWhere error:', e);
      }
    }

    const items = this._getCollection(collection);
    return items.filter(item => item[field] === value).length;
  }

  // ---------- Auth ----------

  async login(email, password) {
    if (this.useFirebase) {
      try {
        const result = await this.auth.signInWithEmailAndPassword(email, password);
        return { success: true, user: result.user };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // Demo credentials fallback
    if (email === 'admin@ashoka.com' && password === 'admin123') {
      const user = { email, uid: 'demo-admin' };
      localStorage.setItem('ashoka_admin_user', JSON.stringify(user));
      return { success: true, user };
    }

    return { success: false, error: 'Invalid email or password' };
  }

  async logout() {
    if (this.useFirebase && this.auth) {
      try {
        await this.auth.signOut();
      } catch (e) {
        console.error('[AshokaDB] Logout error:', e);
      }
    }
    localStorage.removeItem('ashoka_admin_user');
  }

  isLoggedIn() {
    if (this.useFirebase && this.auth) {
      return !!this.auth.currentUser;
    }
    return !!localStorage.getItem('ashoka_admin_user');
  }

  // ---------- Helpers ----------

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }
}

// Global instance
window.ashokaDB = new AshokaDB();
