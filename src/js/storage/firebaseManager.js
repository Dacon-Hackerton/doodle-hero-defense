import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { firebaseConfig } from "./firebaseConfig.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const INVASION_CHARACTER_LIMIT = 100;
const RANKING_LIMIT = 10;

export async function saveInvasionCharacterToFirebase(character) {
  try {
    const invasionCollectionRef = collection(db, "invasionCharacters");
    const querySnapshot = await getDocs(invasionCollectionRef);

    if (querySnapshot.size >= INVASION_CHARACTER_LIMIT) {
      const docs = querySnapshot.docs;
      const randomIndex = Math.floor(Math.random() * docs.length);
      const randomDoc = docs[randomIndex];

      await deleteDoc(doc(db, "invasionCharacters", randomDoc.id));

      console.log("난입 캐릭터 풀 초과로 기존 캐릭터 삭제:", randomDoc.id);
    }

    const docRef = await addDoc(invasionCollectionRef, {
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
      orderBy("bestPartyPower", "desc"),
      limit(RANKING_LIMIT),
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
    const rankingCollectionRef = collection(db, "rankings");

    const rankingQuery = query(
      rankingCollectionRef,
      orderBy("reachedStage", "desc"),
      orderBy("bestPartyPower", "desc"),
      limit(RANKING_LIMIT),
    );

    const querySnapshot = await getDocs(rankingQuery);

    const currentRankings = [];

    querySnapshot.forEach((docSnap) => {
      currentRankings.push({
        firebaseId: docSnap.id,
        ...docSnap.data(),
      });
    });

    const nextReachedStage = Number(rankingData.reachedStage) || 1;
    const nextBestPartyPower = Number(rankingData.bestPartyPower) || 0;

    if (currentRankings.length >= RANKING_LIMIT) {
      const lastRanking = currentRankings[currentRankings.length - 1];
      const lastReachedStage = Number(lastRanking?.reachedStage) || 0;
      const lastBestPartyPower = Number(lastRanking?.bestPartyPower) || 0;

      const isLowerStage = nextReachedStage < lastReachedStage;
      const isSameStageAndLowerOrSamePower =
        nextReachedStage === lastReachedStage &&
        nextBestPartyPower <= lastBestPartyPower;

      if (isLowerStage || isSameStageAndLowerOrSamePower) {
        console.log("랭킹권이 아니므로 저장하지 않음:", {
          nextReachedStage,
          nextBestPartyPower,
        });
        return null;
      }
    }

    const docRef = await addDoc(rankingCollectionRef, {
      playerName: rankingData.playerName ?? "익명",
      reachedStage: nextReachedStage,
      bestPartyPower: nextBestPartyPower,
      characterSlots: Array.isArray(rankingData.characterSlots)
        ? rankingData.characterSlots
        : [],
      createdAt: serverTimestamp(),
    });

    console.log("랭킹 저장 성공:", docRef.id);

    if (currentRankings.length >= RANKING_LIMIT) {
      const lastRanking = currentRankings[currentRankings.length - 1];

      if (lastRanking?.firebaseId) {
        await deleteDoc(doc(db, "rankings", lastRanking.firebaseId));
        console.log("기존 10등 랭킹 삭제:", lastRanking.firebaseId);
      }
    }

    return docRef.id;
  } catch (error) {
    console.warn("랭킹 저장 실패:", error);
    return null;
  }
}