import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { UserSettings } from '../types';
import { HardDrive, Cloud, Check, Loader2, LogIn, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export function Settings() {
  const { user, connectDrive, googleAccessToken } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    storageProvider: 'firebase'
  });
  const [folderInput, setFolderInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserSettings;
          setSettings(data);
          setFolderInput(data.googleDriveFolderLink || '');
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user]);

  const handleConnect = async () => {
    const token = await connectDrive();
    if (token) {
      alert("Google Drive connected successfully!");
    }
  };

  const extractFolderId = (url: string) => {
    // Matches patterns like /folders/FOLDER_ID or id=FOLDER_ID
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  };

  const saveFolderLink = async () => {
    if (!user) return;
    const folderId = extractFolderId(folderInput);
    if (!folderId && folderInput) {
      alert("Invalid Google Drive folder link. Please paste a valid sharing link.");
      return;
    }

    setSaving(true);
    try {
      const newSettings = { 
        ...settings, 
        googleDriveFolderLink: folderInput,
        googleDriveFolderId: folderId || undefined
      };
      await setDoc(doc(db, 'users', user.uid), newSettings, { merge: true });
      setSettings(newSettings);
      alert("Folder link saved successfully!");
    } catch (err) {
      console.error('Error saving folder:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateProvider = async (provider: 'firebase' | 'googledrive') => {
    if (!user) return;
    setSaving(true);
    try {
      const newSettings = { ...settings, storageProvider: provider };
      await setDoc(doc(db, 'users', user.uid), newSettings, { merge: true });
      setSettings(newSettings);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-900 mb-6">Application Settings</h2>
        
        <div className="space-y-8">
          <div>
            <label className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 block">
              Image Storage Location
            </label>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => updateProvider('firebase')}
                disabled={saving}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all",
                  settings.storageProvider === 'firebase'
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-gray-100 hover:border-gray-200"
                )}
              >
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    settings.storageProvider === 'firebase' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                  )}>
                    <Cloud size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Firebase Storage (Default)</p>
                    <p className="text-xs text-gray-400">Optimized for speed. No setup required.</p>
                  </div>
                </div>
                {settings.storageProvider === 'firebase' && <Check className="text-blue-600" size={20} />}
              </button>

              <button
                onClick={() => updateProvider('googledrive')}
                disabled={saving}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all",
                  settings.storageProvider === 'googledrive'
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-gray-100 hover:border-gray-200"
                )}
              >
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    settings.storageProvider === 'googledrive' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                  )}>
                    <HardDrive size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Google Drive</p>
                    <p className="text-xs text-gray-400">Save images to your own Google Drive folder.</p>
                  </div>
                </div>
                {settings.storageProvider === 'googledrive' && <Check className="text-blue-600" size={20} />}
              </button>
            </div>
          </div>

          {settings.storageProvider === 'googledrive' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-wider pl-1 block">
                  Shared Folder Link
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Paste your Google Drive folder link here..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={folderInput}
                      onChange={(e) => setFolderInput(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={saveFolderLink}
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
                  >
                    Save Link
                  </button>
                </div>
                {settings.googleDriveFolderId && (
                  <p className="text-[10px] text-green-600 font-bold flex items-center pl-1">
                    <Check size={10} className="mr-1" /> Detected Folder ID: {settings.googleDriveFolderId}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-wider pl-1 block">
                  Permissions
                </label>
                <button 
                  onClick={handleConnect}
                  disabled={saving}
                  className={cn(
                    "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all",
                    googleAccessToken 
                      ? "bg-green-50 border border-green-200 text-green-700" 
                      : "bg-white border border-blue-200 text-blue-700 active:scale-95 shadow-sm"
                  )}
                >
                  {googleAccessToken ? <Check size={16} /> : <LogIn size={16} />}
                  <span>{googleAccessToken ? "Drive Connected" : "Connect Google Drive"}</span>
                </button>
              </div>

              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex items-start space-x-3 text-blue-800 text-sm italic">
                  <AlertCircle className="mt-0.5 shrink-0" size={16} />
                  <p>
                    <strong>Instructions:</strong>
                  </p>
                </div>
                <ul className="text-xs text-blue-700 list-disc ml-8 space-y-1">
                  <li>Create a folder in your Google Drive.</li>
                  <li>Click <strong>Share</strong> and set access to <strong>"Anyone with the link can view"</strong> (Viewer access) to allow images to be visible in the app.</li>
                  <li>Paste the folder link above and click <strong>Save Link</strong>.</li>
                  <li>Click <strong>Connect Google Drive</strong> to authorize uploads.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 italic text-center">
        <p className="text-gray-400 text-sm">App Version 1.2.0 (Build 2026.04)</p>
      </div>
    </div>
  );
}

