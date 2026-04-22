import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { googleDriveService } from '../services/googleDriveService';
import { Customer, Measurement, CustomerImage, MeasurementValues } from '../types';
import { cn, formatDate } from '../lib/utils';
import { 
  ArrowLeft, Edit2, Plus, Calendar, Ruler, 
  Image as ImageIcon, Trash2, Camera, Upload, Send, Scissors,
  Loader2, LogIn, AlertCircle, X
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [storageProvider, setStorageProvider] = useState<'firebase' | 'googledrive'>('firebase');
  const [googleFolderId, setGoogleFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStorageProvider(data.storageProvider || 'firebase');
        setGoogleFolderId(data.googleDriveFolderId || null);
      }
    };
    fetchSettings();
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
      alert(error.message || 'Image upload failed');
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

  const deleteImage = async (img: CustomerImage) => {
    if (!window.confirm('Delete this photo?')) return;
    await deleteDoc(doc(db, 'customers', customer.id, 'images', img.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500">
          <ArrowLeft size={24} />
        </button>
        <button 
          onClick={onEdit}
          className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center"
        >
          <Edit2 size={14} className="mr-2" /> Edit Info
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-3xl mx-auto mb-4">
          {customer.name.charAt(0)}
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{customer.name}</h2>
          {customer.customerNo && (
            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase tracking-wider">
              ID No. {customer.customerNo}
            </span>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200">
              {customer.phone}
            </a>
          )}
          {customer.email && (
            <span className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 italic">
              {customer.email}
            </span>
          )}
        </div>
        {customer.address && (
          <p className="mt-4 text-sm text-gray-400 leading-relaxed italic">{customer.address}</p>
        )}
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
                    onClick={connectDrive}
                    className="flex items-center space-x-2 bg-amber-100 text-amber-700 px-3 py-2 rounded-lg text-xs font-bold active:scale-95 transition-all"
                  >
                    <LogIn size={14} />
                    <span>Connect Drive</span>
                  </button>
                )}
                <label className={cn(
                  "bg-blue-600 text-white p-2 rounded-lg cursor-pointer active:scale-95 transition-transform",
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
              <div className="grid grid-cols-2 gap-3">
                {images.map((img) => {
                  const displayUrl = img.googleFileId ? `https://lh3.googleusercontent.com/d/${img.googleFileId}` : img.url;
                  return (
                    <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm bg-gray-100">
                      <img 
                        src={displayUrl} 
                        alt="Customer" 
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300" 
                        referrerPolicy="no-referrer"
                        onClick={() => setSelectedImage(displayUrl)}
                      />
                      <button 
                        onClick={() => deleteImage(img)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <Trash2 size={14} />
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
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X size={24} />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage} 
              alt="Full Size" 
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
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
