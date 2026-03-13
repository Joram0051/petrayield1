// ─────────────────────────────────────────────
// firebase.js  –  PetraYield Firebase SDK setup
// Replace the firebaseConfig values with your
// own from Firebase Console → Project Settings
// ─────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ── YOUR FIREBASE CONFIG (replace with yours) ──
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ════════════════════════════════════════════
//  AUTH HELPERS
// ════════════════════════════════════════════

/** Register a new user */
export async function registerUser({ fullName, phone, country, email, password, referralCode }) {
  // Firebase Auth requires email – we build one from phone if no email given
  const loginEmail = email || `${phone.replace(/\D/g,'')}@petrayield.app`;

  const cred = await createUserWithEmailAndPassword(auth, loginEmail, password);
  const uid  = cred.user.uid;

  // Check referral code
  let referredBy = null;
  if (referralCode) {
    const q = query(collection(db, "users"), where("referralCode", "==", referralCode.toUpperCase()));
    const snap = await getDocs(q);
    if (!snap.empty) referredBy = snap.docs[0].id;
  }

  // Generate user's own referral code
  const myCode = "PY-" + Math.random().toString(36).substring(2,8).toUpperCase();

  await setDoc(doc(db, "users", uid), {
    uid,
    fullName,
    phone,
    country,
    loginEmail,
    referralCode: myCode,
    referredBy,
    totalBalance: 0,
    totalEarnings: 0,
    withdrawableBalance: 0,
    referralEarnings: 0,
    activeBarrels: 0,
    createdAt: serverTimestamp(),
    status: "active"
  });

  // Credit referrer level-1 bonus tracking
  if (referredBy) {
    await addDoc(collection(db, "referrals"), {
      referrerId: referredBy,
      refereeId: uid,
      level: 1,
      earned: 0,
      createdAt: serverTimestamp()
    });
  }

  return { uid, referralCode: myCode };
}

/** Login with phone-derived email or real email */
export async function loginUser(phoneOrEmail, password) {
  const loginEmail = phoneOrEmail.includes("@")
    ? phoneOrEmail
    : `${phoneOrEmail.replace(/\D/g,'')}@petrayield.app`;
  const cred = await signInWithEmailAndPassword(auth, loginEmail, password);
  return cred.user;
}

/** Get current user profile from Firestore */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

/** Logout */
export async function logoutUser() {
  await signOut(auth);
}

// ════════════════════════════════════════════
//  DEPOSIT HELPERS
// ════════════════════════════════════════════

/** Create a pending deposit record */
export async function createDeposit({ uid, amount, barrelName, barrelPrice, txHash }) {
  const ref = await addDoc(collection(db, "deposits"), {
    uid,
    amount: parseFloat(amount),
    barrelName,
    barrelPrice: parseFloat(barrelPrice),
    txHash: txHash || "",
    status: "pending",       // pending | confirmed | rejected
    createdAt: serverTimestamp(),
    confirmedAt: null,
    adminNote: ""
  });
  return ref.id;
}

/** Get all deposits for a user */
export async function getUserDeposits(uid) {
  const q = query(
    collection(db, "deposits"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ════════════════════════════════════════════
//  BARREL HELPERS
// ════════════════════════════════════════════

const BARRELS = [
  { name:"Petra Lite",    price:10,  cycle:30,  daily:0.20, total:16,  roi:160 },
  { name:"Petra Core",    price:25,  cycle:60,  daily:0.30, total:43,  roi:172 },
  { name:"Petra Prime",   price:40,  cycle:70,  daily:0.50, total:75,  roi:187 },
  { name:"Petra Pro",     price:60,  cycle:80,  daily:0.90, total:132, roi:220 },
  { name:"Petra Elite",   price:75,  cycle:100, daily:1.10, total:185, roi:246 },
  { name:"Petra Ultra",   price:90,  cycle:110, daily:1.35, total:238, roi:264 },
  { name:"Petra Supreme", price:105, cycle:150, daily:1.70, total:360, roi:343 },
];
export { BARRELS };

/** Activate a barrel for a user (called by admin after confirming deposit) */
export async function activateBarrel(uid, barrelName) {
  const barrel = BARRELS.find(b => b.name === barrelName);
  if (!barrel) throw new Error("Barrel not found");

  const startDate = new Date();
  const endDate   = new Date();
  endDate.setDate(endDate.getDate() + barrel.cycle);

  const ref = await addDoc(collection(db, "barrels"), {
    uid,
    barrelName: barrel.name,
    price: barrel.price,
    cycle: barrel.cycle,
    dailyYield: barrel.daily,
    totalReturn: barrel.total,
    roi: barrel.roi,
    earned: 0,
    daysCompleted: 0,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    status: "active",     // active | completed | reinvested
    createdAt: serverTimestamp()
  });

  // Increment user's active barrel count
  await updateDoc(doc(db, "users", uid), {
    activeBarrels: increment(1),
    totalBalance: increment(barrel.price)
  });

  return ref.id;
}

/** Get all active barrels for a user */
export async function getUserBarrels(uid) {
  const q = query(
    collection(db, "barrels"),
    where("uid", "==", uid),
    where("status", "==", "active")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ════════════════════════════════════════════
//  WITHDRAWAL HELPERS
// ════════════════════════════════════════════

export async function createWithdrawal({ uid, amount, walletAddress }) {
  const fee    = amount * 0.10;
  const netAmt = amount - fee;

  const ref = await addDoc(collection(db, "withdrawals"), {
    uid,
    amount: parseFloat(amount),
    fee,
    netAmount: netAmt,
    walletAddress,
    status: "pending",    // pending | processed | rejected
    createdAt: serverTimestamp(),
    processedAt: null,
    adminNote: ""
  });

  // Deduct from withdrawable balance
  await updateDoc(doc(db, "users", uid), {
    withdrawableBalance: increment(-amount)
  });

  // Log transaction
  await addDoc(collection(db, "transactions"), {
    uid,
    type: "withdrawal",
    amount: -amount,
    note: `Withdrawal to ${walletAddress.slice(0,10)}...`,
    status: "pending",
    createdAt: serverTimestamp()
  });

  return ref.id;
}

/** Get all transactions for a user */
export async function getUserTransactions(uid) {
  const q = query(
    collection(db, "transactions"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ════════════════════════════════════════════
//  REFERRAL HELPERS
// ════════════════════════════════════════════

export async function getUserReferrals(uid) {
  const q = query(collection(db, "referrals"), where("referrerId", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ════════════════════════════════════════════
//  REINVEST HELPER
// ════════════════════════════════════════════

export async function reinvestBarrel(barrelId, uid) {
  const barrelRef  = doc(db, "barrels", barrelId);
  const barrelSnap = await getDoc(barrelRef);
  if (!barrelSnap.exists()) throw new Error("Barrel not found");

  const b          = barrelSnap.data();
  const bonus      = b.totalReturn * 0.05;
  const reinvestAmt = b.totalReturn + bonus;

  // Mark old barrel as reinvested
  await updateDoc(barrelRef, { status: "reinvested" });

  // Find matching or next barrel
  const nextBarrel = BARRELS.find(x => x.price <= reinvestAmt) || BARRELS[0];

  // Create new barrel
  await activateBarrel(uid, nextBarrel.name);

  // Log transaction
  await addDoc(collection(db, "transactions"), {
    uid,
    type: "reinvest",
    amount: reinvestAmt,
    note: `Reinvested ${b.barrelName} → ${nextBarrel.name} (+5% bonus)`,
    status: "completed",
    createdAt: serverTimestamp()
  });

  return { reinvestAmt, newBarrel: nextBarrel.name };
}
