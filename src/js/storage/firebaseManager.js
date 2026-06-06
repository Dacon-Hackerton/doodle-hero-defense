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
      source: "invasion",
      meta: character.meta ?? {},
      createdAt: serverTimestamp()
    });

    console.log("난입 캐릭터 Firebase 저장 성공:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("난입 캐릭터 Firebase 저장 실패:", error);
    return null;
  }
}

export async function loadRandomInvasionCharacterFromFirebase() {
  try {
    const querySnapshot = await getDocs(collection(db, "invasionCharacters"));

    if (querySnapshot.empty) {
      console.log("저장된 난입 캐릭터가 없습니다.");
      return null;
    }

    const characters = [];

    querySnapshot.forEach((doc) => {
      characters.push({
        firebaseId: doc.id,
        ...doc.data()
      });
    });

    const randomIndex = Math.floor(Math.random() * characters.length);
    const randomCharacter = characters[randomIndex];

    console.log("랜덤 난입 캐릭터 불러오기 성공:", randomCharacter);
    return randomCharacter;
  } catch (error) {
    console.error("랜덤 난입 캐릭터 불러오기 실패:", error);
    return null;
  }
}