import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5L2VJahLNK76xWxC7MjsGbbcf70HjARs",
  authDomain: "number-knowledge-71dba.firebaseapp.com",
  projectId: "number-knowledge-71dba",
  storageBucket: "number-knowledge-71dba.firebasestorage.app",
  messagingSenderId: "931772776390",
  appId: "1:931772776390:web:e6fddd88629bcf1d803cc7",
  measurementId: "G-QQ34HTK4CE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Main App Component
function App() {
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState(null);

  const seedDatabase = async () => {
    setSeeding(true);
    setMessage('Starting database seed...');
    
    try {
      // Import data from atomsdata.js
      const { master_sessions, master_atoms } = await import('./atomsdata.js');
      
      // Seed master_sessions with unique composite keys
      setMessage(`Seeding ${master_sessions.length} sessions...`);
      let sessionCount = 0;
      for (const session of master_sessions) {
        // Create unique ID combining session_id and strand
        const docId = `${session.session_id}_${session.strand}`;
        await setDoc(doc(db, 'master_sessions', docId), session);
        sessionCount++;
      }
      
      // Seed master_atoms
      setMessage(`Seeding ${master_atoms.length} atoms...`);
      for (const atom of master_atoms) {
        await setDoc(doc(db, 'master_atoms', atom.atom_id), atom);
      }
      
      setMessage(`✅ Successfully seeded ${sessionCount} sessions and ${master_atoms.length} atoms!`);
      setStats({
        sessions: sessionCount,
        atoms: master_atoms.length
      });
    } catch (error) {
      setMessage(`❌ Error seeding database: ${error.message}`);
      console.error('Seed error:', error);
    } finally {
      setSeeding(false);
    }
  };

  const checkDatabase = async () => {
    try {
      const sessionsSnap = await getDocs(collection(db, 'master_sessions'));
      const atomsSnap = await getDocs(collection(db, 'master_atoms'));
      
      setStats({
        sessions: sessionsSnap.size,
        atoms: atomsSnap.size
      });
      setMessage(`Database contains ${sessionsSnap.size} sessions and ${atomsSnap.size} atoms`);
    } catch (error) {
      setMessage(`❌ Error checking database: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">
            Maths Mastery Dashboard
          </h1>
          <p className="text-gray-600 mb-8">
            35-Session Roadmap Tracker with Firebase Integration
          </p>

          <div className="space-y-4">
            <div className="flex gap-4">
              <button
                onClick={seedDatabase}
                disabled={seeding}
                className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {seeding ? 'Seeding Database...' : '🌱 Seed Database'}
              </button>
              
              <button
                onClick={checkDatabase}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                📊 Check Database
              </button>
            </div>

            {message && (
              <div className={`p-4 rounded-lg ${
                message.startsWith('✅') 
                  ? 'bg-green-100 text-green-800 border border-green-300' 
                  : message.startsWith('❌')
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-blue-100 text-blue-800 border border-blue-300'
              }`}>
                <p className="font-medium">{message}</p>
              </div>
            )}

            {stats && (
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                  <div className="text-3xl font-bold text-indigo-900">{stats.sessions}</div>
                  <div className="text-sm text-indigo-600 mt-1">Sessions</div>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                  <div className="text-3xl font-bold text-purple-900">{stats.atoms}</div>
                  <div className="text-sm text-purple-600 mt-1">Atoms</div>
                </div>
              </div>
            )}

            <div className="mt-8 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-bold text-yellow-900 mb-2">⚠️ Setup Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800">
                <li>✅ Firebase configured for project: <strong>number-knowledge-71dba</strong></li>
                <li>Create <code className="bg-yellow-100 px-1 rounded">atomsdata.js</code> exporting <code>master_sessions</code> and <code>master_atoms</code></li>
                <li>Ensure Firestore rules allow read/write access (start in test mode)</li>
                <li>Click "Seed Database" to populate Firestore</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Render app
const root = createRoot(document.getElementById('root'));
root.render(<App />);
