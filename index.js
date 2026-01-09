import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { master_sessions, master_atoms } from './atomsdata.js';

// 1. YOUR FIREBASE CONFIG (Required for initialization)
const firebaseConfig = {
  apiKey: "AIzaSyB5L2VJahLNK76xWxC7MjsGbbcf70HjARs",
  authDomain: "number-knowledge-71dba.firebaseapp.com",
  projectId: "number-knowledge-71dba",
  storageBucket: "number-knowledge-71dba.firebasestorage.app",
  messagingSenderId: "931772776390",
  appId: "1:931772776390:web:e6fddd88629bcf1d803cc7"
};

// 2. INITIALIZE THE CONNECTION
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runFullRepair() {
    console.log("🚀 Starting Full Database Repair...");

    try {
        // --- ATOMS SYNC ---
        console.log("Updating Master Atoms...");
        for (const atom of master_atoms) {
            await setDoc(doc(db, "master_atoms", atom.atom_id), atom);
        }

        // --- OLD DOC CLEANUP ---
        console.log("Identifying old collision documents...");
        const sessionSnap = await getDocs(collection(db, "master_sessions"));
        
        for (const oldDoc of sessionSnap.docs) {
            // This deletes the old "session_1", "session_2" docs that were causing the overwriting
            if (oldDoc.id.startsWith("session_") || !oldDoc.id.includes("-")) {
                await deleteDoc(doc(db, "master_sessions", oldDoc.id));
                console.log(`🗑️ Deleted old collision doc: ${oldDoc.id}`);
            }
        }

        // --- NEW UNIQUE SESSIONS UPLOAD ---
        console.log("Uploading unique strand-based sessions...");
        for (const session of master_sessions) {
            // This creates "Times Tables-1", "Place Value-1", etc.
            const uniqueId = `${session.strand}-${session.session_id}`;
            
            await setDoc(doc(db, "master_sessions", uniqueId), {
                ...session,
                id: uniqueId 
            });
            console.log(`➡️ Successfully Uploaded: ${uniqueId}`);
        }

        console.log("✨ REPAIR COMPLETE!");
        alert("Repair Complete! Both strands are now safely in Firebase with unique IDs.");

    } catch (error) {
        console.error("❌ Repair failed:", error);
    }
}

runFullRepair();
