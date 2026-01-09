import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// 1. IMPORT FROM YOUR GITHUB FILE
// IMPORTANT: You MUST include the '.js' extension for browser imports!
import { master_sessions, master_atoms } from './atomsdata.js';

// 2. YOUR FIREBASE CONFIG
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

function App() {
  const [status, setStatus] = useState('Standby');
  const [count, setCount] = useState(0);

  const seedDatabase = async () => {
    setStatus('Seeding...');
    try {
      let sessionsPushed = 0;
      for (const s of master_sessions) {
        await setDoc(doc(db, "master_sessions", `session_${s.session_id}`), s);
        sessionsPushed++;
        setCount(sessionsPushed);
      }
      setStatus('✅ Success! 35 Sessions Live.');
    } catch (err) {
      setStatus('❌ Error: ' + err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full">
        <h1 className="text-2xl font-black text-slate-900 mb-2 text-center">Number Knowledge</h1>
        <p className="text-center text-slate-500 text-sm mb-8 italic">Database Initialization</p>
        
        <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Status</div>
            <div className="text-lg font-bold text-blue-600">{status}</div>
            {status === 'Seeding...' && (
                <div className="mt-2 text-sm text-slate-500 font-mono">Progress: {count} / 35</div>
            )}
        </div>

        <button 
          onClick={seedDatabase}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          Initialize 35 Sessions
        </button>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
