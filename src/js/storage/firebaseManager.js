import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJZzVhSokVk5iiliZ9gHDcC_4AxIcQwIw",
  authDomain: "doodle-hero-defense.firebaseapp.com",
  projectId: "doodle-hero-defense",
  storageBucket: "doodle-hero-defense.firebasestorage.app",
  messagingSenderId: "658151526331",
  appId: "1:658151526331:web:20baf72d9be613d853be9e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function saveInvasionCharacterToFirebase(character) {
  try {
    const docRef = await addDoc(collection(db, "invasionCharacters"), {
      id: character.id ?? "",
      name: character.name ?? "용사",
      originalName: character.originalName ?? "용사",
      imageData: character.imageData ?? "",
      grade: character.grade ?? "C",
      power: character.stats?.power ?? 0,
      stats: character.stats ?? {},
      source: "firebase",
      meta: character.meta ?? {},
      createdAt: serverTimestamp()
    });

    console.log("난입 캐릭터 Firebase 저장 성공:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.warn("난입 캐릭터 Firebase 저장 실패:", error);
    return null;
  }
}

export async function loadInvasionCharactersFromFirebase() {
  try {
    const querySnapshot = await getDocs(collection(db, "invasionCharacters"));

    if (querySnapshot.empty) {
      return [];
    }

    const characters = [];

    querySnapshot.forEach((doc) => {
      characters.push({
        firebaseId: doc.id,
        source: "firebase",
        ...doc.data()
      });
    });

    return characters;
  } catch (error) {
    console.warn("Failed to load Firebase invasion characters", error);
    return [];
  }
}

export async function loadRandomInvasionCharacterFromFirebase() {
  const characters = await loadInvasionCharactersFromFirebase();

  if (characters.length === 0) {
    return null;
  }

  return characters[Math.floor(Math.random() * characters.length)];
}
