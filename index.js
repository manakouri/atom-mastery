import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { master_sessions, master_atoms } from './atomsdata.js';

const firebaseConfig = {
  apiKey: "AIzaSyB5L2VJahLNK76xWxC7MjsGbbcf70HjARs",
  authDomain: "number-knowledge-71dba.firebaseapp.com",
  projectId: "number-knowledge-71dba",
  storageBucket: "number-knowledge-71dba.firebasestorage.app",
  messagingSenderId: "931772776390",
  appId: "1:931772776390:web:e6fddd88629bcf1d803cc7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function RepairTool() {
  const [log, setLog] = useState([]);
  const addLog = (m) => setLog(prev => [...prev, m]);

  const runRepair = async () => {
    addLog("🧹 Cleaning up old random documents...");
    const querySnapshot = await getDocs(collection(db, "master_atoms"));
    for (const d of querySnapshot.docs) {
      await deleteDoc(doc(db, "master_atoms", d.id));
    }

    addLog("🚀 Seeding Atoms with CORRECT IDs...");
    for (const atom of master_atoms) {
      // THE SECRET SAUCE: Use atom.atom_id as the Document Name
      const atomName = atom.atom_id; 
      await setDoc(doc(db, "master_atoms", atomName), atom);
      addLog(`✅ Created Atom Document: ${atomName}`);
    }

    addLog("🚀 Refreshing Sessions...");
    for (const session of master_sessions) {
      const sessionName = `session_${session.session_id}`;
      await setDoc(doc(db, "master_sessions", sessionName), session);
      addLog(`✅ Updated Session: ${sessionName}`);
    }
    
    addLog("🎉 REPAIR COMPLETE! Go check your Firebase console.");
  };

  return (
    <div className="p-10 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Firebase Repair Tool</h1>
      <button onClick={runRepair} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold">
        Clear & Re-Seed Database
      </button>
      <div className="mt-6 p-4 bg-slate-100 rounded-lg font-mono text-xs h-64 overflow-y-auto">
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<RepairTool />);
