import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { firebaseConfig } from "./firebaseConfig.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
        ...doc.data(),
        source: "firebase"
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

export async function loadRankingsFromFirebase() {
  try {
    const rankingQuery = query(
      collection(db, "rankings"),
      orderBy("reachedStage", "desc"),
      limit(10),
    );

    const querySnapshot = await getDocs(rankingQuery);
    const rankings = [];

    querySnapshot.forEach((docSnap) => {
      rankings.push({
        firebaseId: docSnap.id,
        ...docSnap.data(),
      });
    });

    return rankings;
  } catch (error) {
    console.warn("랭킹 불러오기 실패:", error);
    return [];
  }
}

export async function saveRankingToFirebase(rankingData) {
  try {
    const docRef = await addDoc(collection(db, "rankings"), {
      playerName: rankingData.playerName ?? "익명",
      reachedStage: Number(rankingData.reachedStage) || 1,
      characterSlots: Array.isArray(rankingData.characterSlots)
        ? rankingData.characterSlots
        : [],
      createdAt: serverTimestamp(),
    });

    console.log("랭킹 저장 성공:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.warn("랭킹 저장 실패:", error);
    return null;
  }
}