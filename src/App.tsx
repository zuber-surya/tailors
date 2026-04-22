/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Layout } from './components/Layout';
import { CustomerList } from './components/CustomerList';
import { CustomerForm } from './components/CustomerForm';
import { CustomerProfile } from './components/CustomerProfile';
import { SyncContacts } from './components/SyncContacts';
import { Settings } from './components/Settings';
import { LoginForm } from './components/LoginForm';
import { Customer } from './types';
import { Scissors } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [view, setView] = useState<{ type: 'list' | 'profile' | 'form', customer?: Customer }>({ type: 'list' });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md w-full mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-12 pb-24">
        <div className="text-center px-6">
          <div className="w-20 h-20 bg-blue-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/40 rotate-12">
            <Scissors size={40} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-3">TailorMate</h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            The professional measurement & customer manager for modern tailors.
          </p>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 mx-4">
          <LoginForm />
          <p className="text-[10px] text-gray-400 text-center mt-8 px-8 leading-normal uppercase tracking-widest font-bold">
            Secure processing by Firebase
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    // If not in home or customers tab, override based on activeTab
    if (activeTab === 'sync') return <SyncContacts />;
    if (activeTab === 'settings') return <Settings />;

    // Default Home/Customers logic
    switch (view.type) {
      case 'list':
        return (
          <CustomerList 
            onSelect={(c) => setView({ type: 'profile', customer: c })} 
            onAdd={() => setView({ type: 'form' })}
          />
        );
      case 'profile':
        return view.customer ? (
          <CustomerProfile 
            customer={view.customer} 
            onBack={() => setView({ type: 'list' })}
            onEdit={() => setView({ type: 'form', customer: view.customer })}
          />
        ) : null;
      case 'form':
        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-lg"
            >
              <CustomerForm 
                customer={view.customer} 
                onClose={() => setView({ type: 'list' })} 
              />
            </motion.div>
          </div>
        );
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${view.type}-${view.customer?.id}`}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

