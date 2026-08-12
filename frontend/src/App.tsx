import React, { useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ScrapedLeadsQueue } from './components/ScrapedLeadsQueue';
import { TrustBar } from './components/TrustBar';
import { ProcessStepSection } from './components/ProcessStepSection';
import { InsuranceSection } from './components/InsuranceSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { SMSModal } from './components/SMSModal';

export const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      {/* Sticky Header with Track Dispatch Lookup */}
      <Header onTrackDispatch={handleTrackDispatchLookup} />

      {/* Main Split Screen Hero & Form */}
      <main className="flex-grow">
        <Hero onFormSubmitted={handleLeadSubmitted} />
        
        {/* Command Center Emergency Scraped Leads Queue */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrapedLeadsQueue />
        </div>

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
      <Footer />

      {/* Post-Submission Live Dispatch Tracker & 90-Min Countdown Modal */}
      <SMSModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        leadData={activeLead}
      />
    </div>
  );
};

export default App;
