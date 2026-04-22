import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Customer } from '../types';
import { Search, UserPlus, Phone, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerListProps {
  onSelect: (customer: Customer) => void;
  onAdd: () => void;
}

export function CustomerList({ onSelect, onAdd }: CustomerListProps) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'customers'),
      where('ownerId', '==', user.uid),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        setCustomers(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, 'list', 'customers');
      }
    );

    return () => unsubscribe();
  }, [user]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.customerNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search customers..."
          className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-20 text-center">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Users size={32} />
            </div>
            <p className="text-gray-500 font-medium">No customers found</p>
            <button
              onClick={onAdd}
              className="mt-4 text-blue-600 font-semibold flex items-center justify-center mx-auto"
            >
              <UserPlus className="mr-2" size={18} />
              Add your first customer
            </button>
          </div>
        ) : (
          <AnimatePresence mode='popLayout'>
            {filteredCustomers.map((customer) => (
              <motion.button
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={customer.id}
                onClick={() => onSelect(customer)}
                className="w-full bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center text-left">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg mr-4">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                       <h3 className="font-bold text-gray-900">{customer.name}</h3>
                       {customer.customerNo && (
                         <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase">
                           No. {customer.customerNo}
                         </span>
                       )}
                    </div>
                    <p className="text-sm text-gray-500 flex items-center mt-0.5">
                      <Phone size={12} className="mr-1" /> {customer.phone || 'No phone'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-gray-300" size={20} />
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>

      <button
        onClick={onAdd}
        className="fixed bottom-24 right-4 bg-blue-600 text-white p-4 rounded-2xl shadow-xl shadow-blue-500/30 active:scale-95 transition-transform z-10"
      >
        <UserPlus size={24} />
      </button>
    </div>
  );
}

import { Users } from 'lucide-react';
