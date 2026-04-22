import React, { useState } from 'react';
import { UserPlus, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

export function SyncContacts() {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [notSupported, setNotSupported] = useState(false);

  const startSync = async () => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      setNotSupported(true);
      return;
    }

    try {
      const props = ['name', 'tel', 'email'];
      const opts = { multiple: true };
      // @ts-ignore - Contacts API
      const contacts = await navigator.contacts.select(props, opts);

      if (contacts && contacts.length > 0) {
        setSyncing(true);
        let successCount = 0;
        let failCount = 0;

        for (const contact of contacts) {
          try {
            await addDoc(collection(db, 'customers'), {
              name: contact.name?.[0] || 'Unknown Contact',
              phone: contact.tel?.[0] || '',
              email: contact.email?.[0] || '',
              ownerId: user?.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            successCount++;
          } catch (e) {
            failCount++;
          }
        }
        setResult({ success: successCount, failed: failCount });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center text-green-600 mx-auto mb-6">
          <UserPlus size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Import Contacts</h2>
        <p className="text-gray-500 mb-8 max-w-xs mx-auto">
          Automatically convert your device contacts into customer records.
        </p>

        {syncing ? (
          <div className="py-4 space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-blue-600 font-bold">Syncing contacts...</p>
          </div>
        ) : result ? (
          <div className="bg-green-50 p-6 rounded-2xl border border-green-100 space-y-3">
            <CheckCircle2 className="text-green-600 mx-auto" size={32} />
            <div>
              <p className="font-bold text-green-900">{result.success} Customers Imported</p>
              {result.failed > 0 && <p className="text-xs text-red-500">{result.failed} entries failed</p>}
            </div>
            <button 
              onClick={() => setResult(null)}
              className="mt-2 text-sm text-green-600 font-bold underline"
            >
              Sync more
            </button>
          </div>
        ) : notSupported ? (
          <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 mb-6">
            <AlertCircle className="text-orange-600 mx-auto mb-2" size={32} />
            <h3 className="font-bold text-orange-900 mb-1">Feature Not Supported</h3>
            <p className="text-sm text-orange-700">
              Your browser doesn't support the Native Contact Picker API. This usually works on Android Chrome.
            </p>
          </div>
        ) : (
          <button
            onClick={startSync}
            className="w-full bg-black text-white py-4 rounded-2xl font-black flex items-center justify-center space-x-3 active:scale-95 transition-all shadow-xl shadow-black/10"
          >
            <Download size={20} />
            <span>Select Contacts</span>
          </button>
        )}
      </div>

      <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-500/20">
        <h3 className="font-bold text-lg mb-2 flex items-center">
          <AlertCircle size={20} className="mr-2" />
          Pro-Tip
        </h3>
        <p className="text-blue-100 text-sm leading-relaxed">
          Sharing your contact list makes it easier to track clients you already know. We only import name, phone, and email.
        </p>
      </div>
    </div>
  );
}
