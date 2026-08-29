import React, { useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { TrustBar } from './components/TrustBar';
import { ProcessStepSection } from './components/ProcessStepSection';
import { InsuranceSection } from './components/InsuranceSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { SMSModal } from './components/SMSModal';
import { LegalModal } from './components/LegalModal';

export const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');

  const [activeLead, setActiveLead] = useState<{
    leadId: string;
    fullName: string;
    phone: string;
    email: string;
    address: string;
    emergencyType: string;
    waterSource: string;
    affectedRooms: string;
    description: string;
    createdAt?: number;
  } | null>(null);

  const handleLeadSubmitted = (leadData: {
    leadId: string;
    fullName: string;
    phone: string;
    email: string;
    address: string;
    emergencyType: string;
    waterSource: string;
    affectedRooms: string;
    description: string;
    createdAt?: number;
  }) => {
    setActiveLead(leadData);
    setIsModalOpen(true);
  };

  const handleOpenLegalModal = (tab: 'privacy' | 'terms') => {
    setLegalTab(tab);
    setIsLegalModalOpen(true);
  };

  const handleTrackDispatchLookup = (query: string) => {
    try {
      const storedStr = localStorage.getItem('rhr_active_dispatches');
      const dispatches = storedStr ? JSON.parse(storedStr) : [];
      
      const cleanQuery = query.trim().toLowerCase();
      const cleanDigits = query.replace(/\D/g, '');

      const found = dispatches.find((d: any) => {
        const dId = (d.leadId || '').toLowerCase();
        const dPhoneDigits = (d.phone || '').replace(/\D/g, '');
        return dId === cleanQuery || (cleanDigits && dPhoneDigits.includes(cleanDigits));
      });

      if (found) {
        setActiveLead(found);
        setIsModalOpen(true);
      } else {
        alert(`No active dispatch found matching "${query}". Please verify your Dispatch ID (#RHR-XXXX) or phone number.`);
      }
    } catch (err) {
      console.warn('Dispatch lookup error:', err);
      alert('Unable to retrieve dispatch records at this time.');
    }
  };

  return (
    <div className="bg-dark-950 text-slate-100 min-h-screen flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Sticky Header */}
      <Header />

      {/* Main Split Screen Hero & Form */}
      <main className="flex-grow">
        <Hero onFormSubmitted={handleLeadSubmitted} />

        {/* Emergency Network Trust Bar */}
        <TrustBar />

        {/* Clear 3-Step Process Protocol */}
        <ProcessStepSection />

        {/* Direct Insurance Billing & Carrier Network */}
        <InsuranceSection />

        {/* Emergency Guidance & FAQ Accordion */}
        <FAQSection />
      </main>

      {/* High-Trust Footer */}
      <Footer onOpenLegalModal={handleOpenLegalModal} />

      {/* Post-Submission Live Dispatch Tracker & Countdown Modal */}
      <SMSModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        leadData={activeLead}
      />

      {/* Legal & Privacy Overlay Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalTab}
      />
    </div>
  );
};

export default App;
