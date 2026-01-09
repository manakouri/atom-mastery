import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

console.log("🚀 index.js has started loading!");

// --- FIREBASE CONFIG ---
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

// --- TEST DATA (To ensure it works without atomsdata.js for now) ---
const test_sessions = [
  { session_id: 1, title: "The 10 Symbols", li: "To understand 0-9", status: "grey" }
];

function App() {
  const [status, setStatus] = useState('Ready to Seed');

  const runTestSeed = async () => {
    setStatus('Seeding...');
    try {
      await setDoc(doc(db, "master_sessions", "test_session_1"), test_sessions[0]);
      setStatus('✅ Success! Check Firebase Console.');
    } catch (e) {
      console.error(e);
      setStatus('❌ Error: ' + e.message);
    }
  };

  return (
    <div className="p-10 max-w-lg mx-auto mt-20 bg-white shadow-2xl rounded-3xl border border-slate-200">
      <h1 className="text-2xl font-black mb-4">Connection Test</h1>
      <p className="text-slate-600 mb-8">If you can see this, React is working perfectly.</p>
      
      <div className="p-4 bg-slate-50 rounded-xl mb-6 font-mono text-sm border border-slate-200">
        Status: <span className="text-blue-600 font-bold">{status}</span>
      </div>

      <button 
        onClick={runTestSeed}
        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
      >
        Test Firebase Connection
      </button>
    </div>
  );
}

// MOUNTING LOGIC
const container = document.getElementById('root');
if (container) {
    console.log("👾 Mounting React...");
    const root = createRoot(container);
    root.render(<App />);
} else {
    console.error("Critical Error: #root element not found!");
}
