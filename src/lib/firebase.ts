import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  push,
  child
} from "firebase/database";
import { AppState, ProductType, BigRecord, SmallRecord, Profile } from "../types";

export const firebaseConfig = {
  apiKey: "AIzaSyDMtl_OolzCM699u8GsXYByKGzCdZcZE0g",
  authDomain: "income-details-7831b.firebaseapp.com",
  databaseURL: "https://income-details-7831b-default-rtdb.firebaseio.com",
  projectId: "income-details-7831b",
  storageBucket: "income-details-7831b.appspot.com",
  messagingSenderId: "879276775958",
  appId: "1:879276775958:web:14546def9134efc5c4b337"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

// Enforce local persistence safely, catching sandboxed iframe issues
try {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Auth security persistence setup failed:", error);
  });
} catch (error) {
  console.warn("Failed to set persistence due to iframe security constraints:", error);
}

// Root path in Realtime Database
const ROOT = "My Income";

/**
 * Custom sign in that auto-registers with the password on first attempt,
 * ensuring "no sign up page" but also "no lock out on first use".
 */
export async function loginUser(email: string, pass: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error: any) {
    // If user does not exist, silently create account
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/invalid-credential" ||
      error.code === "auth/invalid-login-credentials"
    ) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        return userCredential.user;
      } catch (signUpError) {
        throw error; // throw original login error if creating fails too
      }
    }
    throw error;
  }
}

export function logoutUser() {
  return signOut(auth);
}

// Subscribe to auth state
export { onAuthStateChanged };

// Realtime Database getters/listeners
export function listenToAppState(callback: (state: Partial<AppState>) => void) {
  const dbRef = ref(database, ROOT);
  return onValue(dbRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      // Parse productTypes if stored as object keys
      const rawProductTypes = data.productTypes || {};
      const productTypesList: ProductType[] = Object.keys(rawProductTypes).map((key) => ({
        id: key,
        ...rawProductTypes[key]
      }));

      // Parse seasons if stored
      const rawSeasons = data.seasons || {};
      const seasonsList: string[] = typeof rawSeasons === "object" 
        ? Object.values(rawSeasons) 
        : [];

      callback({
        currentSeason: data.currentSeason || "",
        seasons: seasonsList,
        photoQualityKB: data.photoQualityKB !== undefined ? Number(data.photoQualityKB) : 50,
        profile: {
          name: data.profile?.name || "Md Nazrul Islam",
          avatarUrl: data.profile?.avatarUrl || ""
        },
        productTypes: productTypesList,
        notepad: data.notepad || ""
      });
    } else {
      // Initialize if empty
      callback({
        currentSeason: "",
        seasons: [],
        photoQualityKB: 50,
        profile: { name: "Md Nazrul Islam", avatarUrl: "" },
        productTypes: [],
        notepad: ""
      });
    }
  });
}

// Listen to specific data of current season
export function listenToSeasonRecords(
  seasonName: string,
  callback: (data: { bigRecords: BigRecord[]; smallRecords: SmallRecord[] }) => void
) {
  if (!seasonName) {
    callback({ bigRecords: [], smallRecords: [] });
    return () => {};
  }

  // Path: My Income / <seasonName> / ...
  const seasonRef = ref(database, `${ROOT}/${seasonName}`);
  return onValue(seasonRef, (snapshot) => {
    const bigRecords: BigRecord[] = [];
    const smallRecords: SmallRecord[] = [];

    if (snapshot.exists()) {
      const val = snapshot.val();
      
      if (val.bigRecords) {
        Object.keys(val.bigRecords).forEach((key) => {
          bigRecords.push({ id: key, ...val.bigRecords[key] });
        });
      }
      if (val.smallRecords) {
        Object.keys(val.smallRecords).forEach((key) => {
          smallRecords.push({ id: key, ...val.smallRecords[key] });
        });
      }
    }
    
    // Sort records by date descending
    bigRecords.sort((a, b) => b.date.localeCompare(a.date));
    smallRecords.sort((a, b) => b.date.localeCompare(a.date));

    callback({ bigRecords, smallRecords });
  });
}

// Listen to specific notepad of current season
export function listenToSeasonNotepad(
  seasonName: string,
  callback: (text: string) => void
) {
  if (!seasonName) {
    callback("");
    return () => {};
  }
  const notepadRef = ref(database, `${ROOT}/${seasonName}/notepad`);
  return onValue(notepadRef, (snapshot) => {
    callback(snapshot.val() || "");
  });
}

// Database Mutators
export async function updateProfile(name: string, avatarUrl: string) {
  await update(ref(database, `${ROOT}/profile`), { name, avatarUrl });
}

export async function updatePhotoQuality(kb: number) {
  await set(ref(database, `${ROOT}/photoQualityKB`), kb);
}

export async function addSeason(name: string) {
  // Add to seasons array-like storage
  const seasonsRef = ref(database, `${ROOT}/seasons`);
  const snapshot = await get(seasonsRef);
  let currentList: string[] = [];
  if (snapshot.exists()) {
    currentList = Object.values(snapshot.val());
  }
  if (!currentList.includes(name)) {
    currentList.push(name);
    await set(seasonsRef, currentList);
  }
  // Set as active if no season is active yet
  const activeSnap = await get(ref(database, `${ROOT}/currentSeason`));
  if (!activeSnap.exists() || !activeSnap.val()) {
    await set(ref(database, `${ROOT}/currentSeason`), name);
  }
}

export async function selectSeason(name: string) {
  await set(ref(database, `${ROOT}/currentSeason`), name);
}

export async function deleteSeason(name: string) {
  // Remove reference in season list
  const seasonsRef = ref(database, `${ROOT}/seasons`);
  const snapshot = await get(seasonsRef);
  if (snapshot.exists()) {
    const list: string[] = Object.values(snapshot.val());
    const newList = list.filter((s) => s !== name);
    await set(seasonsRef, newList);
  }
  // Delete season's storage folder entirely
  await remove(ref(database, `${ROOT}/${name}`));

  // If we deleted active season, select another or clear
  const activeSnap = await get(ref(database, `${ROOT}/currentSeason`));
  if (activeSnap.exists() && activeSnap.val() === name) {
    const seasonsSnap = await get(seasonsRef);
    if (seasonsSnap.exists()) {
      const list: string[] = Object.values(seasonsSnap.val());
      await set(ref(database, `${ROOT}/currentSeason`), list[0] || "");
    } else {
      await set(ref(database, `${ROOT}/currentSeason`), "");
    }
  }
}

export async function addProductType(name: string, value: number) {
  const productTypesRef = ref(database, `${ROOT}/productTypes`);
  const newTypeRef = push(productTypesRef);
  await set(newTypeRef, { name, value });
}

export async function updateProductType(id: string, name: string, value: number) {
  await update(ref(database, `${ROOT}/productTypes/${id}`), { name, value });
}

export async function deleteProductType(id: string) {
  await remove(ref(database, `${ROOT}/productTypes/${id}`));
}

// Season dynamic values (BigRecord / SmallRecord)
export async function addBigRecord(seasonName: string, date: string, productTypeId: string, piece: number, price: number, photoUrl: string) {
  const recordsRef = ref(database, `${ROOT}/${seasonName}/bigRecords`);
  const newRecordRef = push(recordsRef);
  await set(newRecordRef, { date, productTypeId, piece, price, photoUrl });
}

export async function updateBigRecord(seasonName: string, id: string, data: Partial<Omit<BigRecord, "id">>) {
  await update(ref(database, `${ROOT}/${seasonName}/bigRecords/${id}`), data);
}

export async function deleteBigRecord(seasonName: string, id: string) {
  await remove(ref(database, `${ROOT}/${seasonName}/bigRecords/${id}`));
}

export async function addSmallRecord(seasonName: string, date: string, paidTaka: number) {
  const recordsRef = ref(database, `${ROOT}/${seasonName}/smallRecords`);
  const newRecordRef = push(recordsRef);
  await set(newRecordRef, { date, paidTaka });
}

export async function updateSmallRecord(seasonName: string, id: string, data: Partial<Omit<SmallRecord, "id">>) {
  await update(ref(database, `${ROOT}/${seasonName}/smallRecords/${id}`), data);
}

export async function deleteSmallRecord(seasonName: string, id: string) {
  await remove(ref(database, `${ROOT}/${seasonName}/smallRecords/${id}`));
}

export async function updateSeasonNotepad(seasonName: string, text: string) {
  await set(ref(database, `${ROOT}/${seasonName}/notepad`), text);
}
