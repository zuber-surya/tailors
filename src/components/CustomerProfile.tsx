import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { googleDriveService } from '../services/googleDriveService';
import { Customer, Measurement, CustomerImage, MeasurementValues } from '../types';
import { cn, formatDate } from '../lib/utils';
import { 
  ArrowLeft, Edit2, Plus, Calendar, Ruler, 
  Image as ImageIcon, Trash2, Camera, Upload, Send, Scissors,
  Loader2, LogIn, AlertCircle, X, Phone, Mail,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerProfileProps {
  customer: Customer;
  onBack: () => void;
  onEdit: () => void;
}

const MEASUREMENT_LABELS: Record<string, string> = {
  length: 'Length (લંબાઈ)',
  chest: 'Chest (છાતી)',
  waist: 'Waist (કમર)',
  hips: 'Hips (હિપ્સ)',
  shoulder: 'Shoulder (સો.)',
  sleeves: 'Sleeves (બા.)',
  collar: 'Neck (સ્ટેન્ડ)',
  armhole: 'Armhole (મુ.)',
  pantLength: 'Pant Len. (લંબાઈ)',
  pantMori: 'Bottom (મો.)',
  pantSeat: 'Seat (ઝોલો)',
  pantWaist: 'P. Waist (કમર)',
};

export function CustomerProfile({ customer, onBack, onEdit }: CustomerProfileProps) {
  const { user, googleAccessToken, connectDrive } = useAuth();
  const [activeTab, setActiveTab] = useState<'measurements' | 'gallery'>('measurements');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [images, setImages] = useState<CustomerImage[]>([]);
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [storageProvider, setStorageProvider] = useState<'firebase' | 'googledrive'>('firebase');
  const [googleFolderId, setGoogleFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStorageProvider(data.storageProvider || 'firebase');
        setGoogleFolderId(data.googleDriveFolderId || null);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const mq = query(
      collection(db, 'customers', customer.id, 'measurements'),
      orderBy('date', 'desc')
    );
    const iq = query(
      collection(db, 'customers', customer.id, 'images'),
      orderBy('createdAt', 'desc')
    );

    const unsubM = onSnapshot(mq, (snapshot) => {
      setMeasurements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Measurement)));
    });
    const unsubI = onSnapshot(iq, (snapshot) => {
      setImages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerImage)));
    });

    return () => { unsubM(); unsubI(); };
  }, [customer.id]);

  const deleteCustomer = async () => {
    if (!window.confirm(`Are you sure you want to delete ${customer.name}? This will remove all their data. This action cannot be undone.`)) return;
    try {
      // Note: In production, you'd want to delete subcollections and storage files too.
      // For now, we delete the main document.
      await deleteDoc(doc(db, 'customers', customer.id));
      onBack();
    } catch (error) {
      console.error('Failed to delete customer', error);
      alert('Failed to delete customer. Please try again.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !customer.id) return;

    setUploading(true);
    try {
      let url = '';
      let storagePath = '';
      let googleFileId = '';

      if (storageProvider === 'googledrive') {
        if (!googleAccessToken) {
          throw new Error("Google Drive is not connected. Please go to Settings and click 'Connect Google Drive'.");
        }
        if (!googleFolderId) {
          throw new Error("No Google Drive folder link found. Please go to Settings and paste a folder link.");
        }

        const driveResponse = await googleDriveService.uploadFile(file, googleFolderId, googleAccessToken);
        url = driveResponse.webViewLink;
        googleFileId = driveResponse.id;
      } else {
        storagePath = `customers/${customer.id}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        url = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'customers', customer.id, 'images'), {
        customerId: customer.id,
        url,
        storagePath: storagePath || null,
        googleFileId: googleFileId || null,
        createdAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error('Image upload failed', error);
      let message = error.message || 'Image upload failed';
      
      if (message.toLowerCase().includes('invalid credentials') || message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('expired')) {
        message = "Your Google Drive session has expired. Please click 'Connect Drive' to resume uploading.";
      } else if (message.toLowerCase().includes('quota')) {
        message = "Google Drive storage quota exceeded. Please check your storage space.";
      }
      
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const deleteMeasurement = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this measurement entry? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'customers', customer.id, 'measurements', id));
    } catch (error) {
      console.error('Failed to delete measurement', error);
    }
  };

  const handleConnectDrive = async () => {
    setConnecting(true);
    try {
      await connectDrive();
    } catch (err) {
      console.error('Connect failed:', err);
    } finally {
      setConnecting(false);
    }
  };

  const deleteImage = async (img: CustomerImage) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      // Delete from Firebase Storage if it exists
      if (img.storagePath) {
        try {
          const storageRef = ref(storage, img.storagePath);
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.warn('Failed to delete from storage, it might already be gone', storageErr);
        }
      }

      // Delete from Google Drive if it exists
      if (img.googleFileId && googleAccessToken) {
        try {
          await googleDriveService.deleteFile(img.googleFileId, googleAccessToken);
        } catch (driveErr) {
          console.warn('Failed to delete from Google Drive', driveErr);
        }
      }
      
      await deleteDoc(doc(db, 'customers', customer.id, 'images', img.id));
    } catch (error) {
      console.error('Failed to delete image', error);
      alert('Failed to delete image entry from database.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center space-x-2">
          <button 
            onClick={deleteCustomer}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Delete Customer"
          >
            <Trash2 size={20} />
          </button>
          <button 
            onClick={onEdit}
            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center"
          >
            <Edit2 size={14} className="mr-2" /> Edit Info
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-5">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-2xl shrink-0">
          {customer.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-black text-gray-900 truncate tracking-tight">{customer.name}</h2>
            {customer.customerNo && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase tracking-wider whitespace-nowrap">
                #{customer.customerNo}
              </span>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {customer.phone && (
              <a 
                href={`tel:${customer.phone}`} 
                className="flex items-center justify-center w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all active:scale-[0.98]"
              >
                <Phone size={14} className="mr-2" /> {customer.phone}
              </a>
            )}
            {customer.email && (
              <span className="flex items-center text-[10px] text-gray-400 font-medium italic truncate pl-1">
                <Mail size={10} className="mr-1" /> {customer.email}
              </span>
            )}
          </div>
          {customer.address && (
            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 italic pl-1">{customer.address}</p>
          )}
        </div>
      </div>

      <div className="flex p-1 bg-gray-100 rounded-2xl">
        {(['measurements', 'gallery'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 rounded-xl font-bold text-sm transition-all capitalize",
              activeTab === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="min-h-[300px]">
        {activeTab === 'measurements' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900">Measurement History</h3>
              {!editingMeasurement && (
                <button 
                  onClick={() => setEditingMeasurement({} as Measurement)}
                  className="bg-blue-600 text-white p-2 rounded-lg"
                >
                  <Plus size={18} />
                </button>
              )}
            </div>

            <AnimatePresence>
              {editingMeasurement && (
                <MeasurementForm 
                  customerId={customer.id} 
                  measurement={editingMeasurement.id ? editingMeasurement : undefined}
                  onClose={() => setEditingMeasurement(null)} 
                />
              )}
            </AnimatePresence>

            {measurements.length === 0 ? (
              <div className="py-12 text-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                <Ruler size={32} className="mx-auto mb-2 opacity-20" />
                No measurements recorded yet
              </div>
            ) : (
              measurements.map((m) => (
                <div key={m.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      <Calendar size={12} className="mr-1.5" />
                      {formatDate(m.date)}
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => setEditingMeasurement(m)} className="text-gray-300 hover:text-blue-500 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => deleteMeasurement(m.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-y-4 gap-x-2 mb-4">
                    {Object.entries(m.values).map(([key, val]) => val !== undefined && (
                      <div key={key} className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-tight text-gray-400 font-extrabold leading-none mb-1">
                          {MEASUREMENT_LABELS[key] || key}
                        </span>
                        <span className="text-base font-black text-gray-800 tabular-nums">{val}</span>
                      </div>
                    ))}
                  </div>

                  {m.notes && (
                    <div className="pt-3 border-t border-gray-50 text-sm text-gray-500 italic">
                      {m.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900">Gallery</h3>
              <div className="flex space-x-2">
                {storageProvider === 'googledrive' && !googleAccessToken && (
                  <button
                    onClick={handleConnectDrive}
                    disabled={connecting}
                    className="flex items-center space-x-2 bg-amber-100 text-amber-700 px-3 py-2 rounded-lg text-xs font-bold active:scale-95 transition-all"
                  >
                    {connecting ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                    <span>{connecting ? "Connecting..." : "Connect Drive"}</span>
                  </button>
                )}
                
                {/* Camera Button */}
                <label className={cn(
                  "bg-green-600 text-white p-2 rounded-lg cursor-pointer active:scale-95 transition-transform flex items-center justify-center",
                  uploading && "opacity-50 pointer-events-none"
                )}>
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    onChange={handleImageUpload} 
                  />
                </label>

                {/* Upload Button */}
                <label className={cn(
                  "bg-blue-600 text-white p-2 rounded-lg cursor-pointer active:scale-95 transition-transform flex items-center justify-center",
                  uploading && "opacity-50 pointer-events-none"
                )}>
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
            </div>

            {storageProvider === 'googledrive' && !googleAccessToken && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start space-x-2 text-amber-800 text-[10px] leading-snug">
                <AlertCircle className="shrink-0 mt-0.5" size={14} />
                <p>
                  Drive session expired. Click <strong>Connect Drive</strong> to enable uploads.
                </p>
              </div>
            )}

            {uploading && (
              <div className="bg-blue-50 p-4 rounded-xl text-blue-600 text-center font-bold text-sm animate-pulse">
                Uploading image...
              </div>
            )}

            {images.length === 0 ? (
              <div className="py-12 text-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                <ImageIcon size={32} className="mx-auto mb-2 opacity-20" />
                No photos uploaded yet
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((img, idx) => {
                  const displayUrl = img.googleFileId ? `https://lh3.googleusercontent.com/d/${img.googleFileId}` : img.url;
                  return (
                    <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group shadow-sm bg-gray-100">
                      <img 
                        src={displayUrl} 
                        alt="Customer" 
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300" 
                        referrerPolicy="no-referrer"
                        onClick={() => setSelectedIndex(idx)}
                      />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteImage(img);
                        }}
                        className="absolute top-1 right-1 p-1 bg-black/40 text-white rounded-md transition-all active:scale-90 z-10"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedIndex !== null && images[selectedIndex] && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden"
            onClick={() => setSelectedIndex(null)}
          >
            {/* Close Button */}
            <button 
              className="absolute top-6 right-6 z-[60] p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              onClick={() => setSelectedIndex(null)}
            >
              <X size={24} />
            </button>

            {/* Navigation Arrows */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 sm:px-8 z-[60] pointer-events-none">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(prev => prev !== null ? (prev - 1 + images.length) % images.length : null);
                }}
                className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-full backdrop-blur-md transition-all active:scale-95 pointer-events-auto"
              >
                <ChevronLeft size={32} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(prev => prev !== null ? (prev + 1) % images.length : null);
                }}
                className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-full backdrop-blur-md transition-all active:scale-95 pointer-events-auto"
              >
                <ChevronRight size={32} />
              </button>
            </div>

            {/* Image Slider */}
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <AnimatePresence mode="wait">
                <motion.img 
                  key={selectedIndex}
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  src={images[selectedIndex].googleFileId ? `https://lh3.googleusercontent.com/d/${images[selectedIndex].googleFileId}` : images[selectedIndex].url} 
                  alt="Full Size" 
                  className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
                  referrerPolicy="no-referrer"
                  onClick={(e) => e.stopPropagation()}
                />
              </AnimatePresence>
            </div>

            {/* Image Counter */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 text-white text-sm font-bold rounded-full backdrop-blur-md z-[60]">
              {selectedIndex + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MeasurementForm({ customerId, measurement, onClose }: { customerId: string, measurement?: Measurement, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(measurement?.notes || '');
  const [values, setValues] = useState<MeasurementValues>(measurement?.values || {
    // Top
    length: undefined,
    chest: undefined,
    waist: undefined,
    hips: undefined,
    shoulder: undefined,
    sleeves: undefined,
    collar: undefined,
    armhole: undefined,
    // Bottom
    pantLength: undefined,
    pantMori: undefined,
    pantSeat: undefined,
    pantWaist: undefined,
  });

  const topFields = [
    { key: 'length', label: MEASUREMENT_LABELS.length },
    { key: 'chest', label: MEASUREMENT_LABELS.chest },
    { key: 'waist', label: MEASUREMENT_LABELS.waist },
    { key: 'hips', label: MEASUREMENT_LABELS.hips },
    { key: 'shoulder', label: MEASUREMENT_LABELS.shoulder },
    { key: 'sleeves', label: MEASUREMENT_LABELS.sleeves },
    { key: 'collar', label: MEASUREMENT_LABELS.collar },
    { key: 'armhole', label: MEASUREMENT_LABELS.armhole },
  ];

  const bottomFields = [
    { key: 'pantLength', label: MEASUREMENT_LABELS.pantLength },
    { key: 'pantMori', label: MEASUREMENT_LABELS.pantMori },
    { key: 'pantSeat', label: MEASUREMENT_LABELS.pantSeat },
    { key: 'pantWaist', label: MEASUREMENT_LABELS.pantWaist },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        customerId,
        date: measurement?.date || serverTimestamp(),
        notes,
        values: Object.fromEntries(Object.entries(values).filter(([_, v]) => v !== undefined)),
        updatedAt: serverTimestamp(),
      };

      if (measurement?.id) {
        await updateDoc(doc(db, 'customers', customerId, 'measurements', measurement.id), data);
      } else {
        await addDoc(collection(db, 'customers', customerId, 'measurements'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-blue-50/50 rounded-2xl border border-blue-100 p-5 overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1 flex items-center justify-between">
            <span>Top / Kurta</span>
            <Scissors size={10} />
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {topFields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 pl-1">{f.label}</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full bg-white border border-blue-100 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                  value={values[f.key] || ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 border-b border-indigo-100 pb-1 flex items-center justify-between">
            <span>Bottom / Pant</span>
            <Ruler size={10} />
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {bottomFields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 pl-1">{f.label}</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                  value={values[f.key] || ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 pl-1 uppercase">Notes</label>
          <textarea
            placeholder="Special instructions..."
            className="w-full bg-white border border-blue-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 resize-none font-medium"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex space-x-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-gray-500 bg-white rounded-xl border border-gray-100 active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-blue-500/20"
          >
            <Send size={16} className="mr-2" />
            {loading ? 'Saving...' : measurement?.id ? 'Update Entry' : 'Save Entry'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
