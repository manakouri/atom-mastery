import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// 1. IMPORT YOUR DATA
// Ensure atomsdata.js is in the same folder as this file!
import { master_sessions, master_atoms } from './atomsdata.js';

// 2. YOUR UPDATED FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyB5L2VJahLNK76xWxC7MjsGbbcf70HjARs",
  authDomain: "number-knowledge-71dba.firebaseapp.com",
  projectId: "number-knowledge-71dba",
  storageBucket: "number-knowledge-71dba.firebasestorage.app",
  messagingSenderId: "931772776390",
  appId: "1:931772776390:web:e6fddd88629bcf1d803cc7",
  measurementId: "G-QQ34HTK4CE"
};

// 3. INITIALIZE FIREBASE
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 4. THE MAIN APP COMPONENT
function App() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [message, setMessage] = useState('');

  const seedDatabase = async () => {
    if (!confirm("This will upload all 35 sessions to your 'Number Knowledge' database. Continue?")) return;
    
    setIsSeeding(true);
    setMessage('Connecting to Firebase...');

    try {
      // Step A: Push Sessions
      for (const session of master_sessions) {
        const docId = `session_${session.session_id}`;
        // Use setDoc so it updates the document if it already exists
        await setDoc(doc(db, "master_sessions", docId), session);
        console.log(`✅ Uploaded Session: ${docId}`);
      }

      // Step B: Push Atoms
      for (const atom of master_atoms) {
        await setDoc(doc(db, "master_atoms", atom.atom_id), atom);
        console.log(`✅ Uploaded Atom: ${atom.atom_id}`);
      }

      setMessage('🚀 Database Initialized! 35 sessions and all atoms are now live.');
    } catch (error) {
      console.error("Seeding error:", error);
      setMessage(`❌ Error: ${error.message}. Check your Firestore Rules!`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-20 px-6">
      <header className="mb-12 border-b border-slate-200 pb-8 text-center sm:text-left">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Maths Mastery <span className="text-blue-600">Setup</span>
        </h1>
        <p className="text-slate-500 mt-2 text-lg">Project: number-knowledge-71dba</p>
      </header>

      <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="flex items-center space-x-4 mb-6">
          <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl">1</div>
          <h2 className="text-2xl font-bold">Initialize Your Data</h2>
        </div>
        
        <p className="text-slate-600 mb-8 leading-relaxed">
          This tool will take your structured curriculum from <span className="font-mono text-sm bg-slate-100 px-1">atomsdata.js</span> and push it into your Firestore collections. 
          This only needs to be done once to set up your dashboard.
        </p>

        <button 
          onClick={seedDatabase}
          disabled={isSeeding}
          className={`w-full py-5 rounded-2xl font-extrabold text-white text-lg transition-all transform active:scale-[0.98] ${
            isSeeding 
              ? 'bg-slate-400 cursor-wait' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 hover:shadow-blue-300'
          }`}
        >
          {isSeeding ? 'Writing to Cloud...' : '🚀 Push Data to Firebase'}
        </button>

        {message && (
          <div className={`mt-8 p-5 rounded-2xl text-sm font-semibold animate-pulse ${
            message.includes('❌') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
          }`}>
            {message}
          </div>
        )}
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60">
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-2">Collection: master_sessions</h3>
            <p className="text-xs text-slate-500">Will contain 35 documents (session_1 to session_35).</p>
        </div>
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-2">Collection: master_atoms</h3>
            <p className="text-xs text-slate-500">Will contain all learning atoms keyed by their ID (e.g., PV-1.1).</p>
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
