import React, { useEffect, useState } from 'react';
import { collection, query, where, getCountFromServer, limit, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Users, Ruler, Camera, ChevronRight, PlusCircle, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Customer } from '../types';
import { formatDate } from '../lib/utils';

interface DashboardStats {
  customerCount: number;
}

export function Dashboard({ onAddCustomer, onViewCustomers, onSelectCustomer }: { 
  onAddCustomer: () => void, 
  onViewCustomers: () => void,
  onSelectCustomer: (customer: Customer) => void
}) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    customerCount: 0
  });
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        const customersQuery = query(collection(db, 'customers'), where('ownerId', '==', user.uid));
        const customerSnap = await getCountFromServer(customersQuery);
        
        const recentQuery = query(
          collection(db, 'customers'), 
          where('ownerId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const recentSnap = await getDocs(recentQuery);
        const recent = recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));

        setStats({
          customerCount: customerSnap.data().count
        });
        setRecentCustomers(recent);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 font-medium tracking-tight">Welcome back!</p>
        </div>
        <button
          onClick={onAddCustomer}
          className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-90 transition-transform"
        >
          <PlusCircle size={24} />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-blue-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20"
        >
          <Users size={24} className="mb-4 opacity-80" />
          <p className="text-3xl font-black">{stats.customerCount}</p>
          <p className="text-[10px] uppercase font-black tracking-widest opacity-80">Total Clients</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm"
        >
          <Clock size={24} className="mb-4 text-blue-600" />
          <p className="text-3xl font-black text-gray-900">{recentCustomers.length}</p>
          <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Recent New</p>
        </motion.div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="font-black text-gray-900 uppercase tracking-widest text-xs">Recent Activity</h2>
          <button onClick={onViewCustomers} className="text-blue-600 text-xs font-bold hover:underline">View All</button>
        </div>
        
        <div className="space-y-3">
          {recentCustomers.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-200 text-center">
              <p className="text-sm text-gray-400">No customers yet. Start adding!</p>
            </div>
          ) : (
            recentCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => onSelectCustomer(customer)}
                className="w-full bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                    {customer.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{customer.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Added {formatDate(customer.createdAt)}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
              </button>
            ))
          )}
        </div>
      </div>

      <div className="bg-gray-900 p-8 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Pro Tip</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Store infinite photos by connecting your Google Drive in settings.
          </p>
          <button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-all w-full">
            Connect Now
          </button>
        </div>
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-blue-600 rounded-full blur-[60px] opacity-30"></div>
      </div>
    </div>
  );
}
