import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { master_sessions, master_atoms } from './atomsdata.js'; // Ensure the path is correct

const db = getFirestore();

async function runFullRepair() {
    console.log("🚀 Starting Full Database Repair...");

    try {
        // 1. CLEAN UP MASTER ATOMS
        console.log("Updating Master Atoms...");
        for (const atom of master_atoms) {
            // Atoms already have unique IDs (e.g., TT-1.1, PV-1.1)
            await setDoc(doc(db, "master_atoms", atom.atom_id), atom);
        }
        console.log("✅ Atoms Synced.");

        // 2. CLEAN UP MASTER SESSIONS
        console.log("Cleaning and Updating Master Sessions...");
        
        // We fetch existing docs to identify ones with the old "session_X" naming style
        const sessionSnap = await getDocs(collection(db, "master_sessions"));
        
        // Note: We don't necessarily need to delete the whole collection, 
        // but it's cleaner to remove the old "session_1" style docs.
        for (const oldDoc of sessionSnap.docs) {
            if (oldDoc.id.startsWith("session_")) {
                await deleteDoc(doc(db, "master_sessions", oldDoc.id));
                console.log(`🗑️ Deleted old collision doc: ${oldDoc.id}`);
            }
        }

        // 3. UPLOAD NEW UNIQUE SESSIONS
        for (const session of master_sessions) {
            // Create a Unique ID combining Strand and Session Number
            const uniqueId = `${session.strand}-${session.session_id}`;
            
            await setDoc(doc(db, "master_sessions", uniqueId), {
                ...session,
                id: uniqueId // Ensure the internal ID matches the document name
            });
            console.log(`➡️ Uploaded: ${uniqueId}`);
        }

        console.log("✨ REPAIR COMPLETE! Both strands are now safely in Firebase.");
        alert("Repair Complete! Refresh your app to see the unified roadmap.");

    } catch (error) {
        console.error("❌ Repair failed:", error);
        alert("Repair failed. Check the console for details.");
    }
}

// To run this, you can just call the function:
runFullRepair();
