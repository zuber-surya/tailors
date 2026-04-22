import React, { useState } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Customer } from '../types';
import { X, Save, User, Phone, Mail, MapPin } from 'lucide-react';

interface CustomerFormProps {
  customer?: Customer;
  onClose: () => void;
}

export function CustomerForm({ customer, onClose }: CustomerFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    customerNo: customer?.customerNo || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name) return;

    setLoading(true);
    try {
      if (customer) {
        await updateDoc(doc(db, 'customers', customer.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'customers'), {
          ...formData,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, customer ? 'update' : 'create', 'customers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 max-w-lg w-full">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">{customer ? 'Edit Customer' : 'Add New Customer'}</h2>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative col-span-2">
              <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type="text"
                required
                placeholder="Full Name"
                className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="relative">
              <div className="absolute left-3 top-3.5 text-gray-400 font-bold text-xs">NO.</div>
              <input
                type="text"
                placeholder="Cust. No"
                className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={formData.customerNo}
                onChange={(e) => setFormData({ ...formData, customerNo: e.target.value })}
              />
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type="tel"
                placeholder="Phone"
                className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
            <input
              type="email"
              placeholder="Email Address"
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="relative">
            < MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
            <textarea
              placeholder="Complete Address"
              rows={3}
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
        >
          <Save size={20} />
          <span>{loading ? 'Saving...' : 'Save Customer'}</span>
        </button>
      </form>
    </div>
  );
}
