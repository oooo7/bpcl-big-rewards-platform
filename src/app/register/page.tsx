'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BillUploader from '@/components/BillUploader';
import ScratchCard from '@/components/ScratchCard';
import { Fuel, QrCode, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

function RegisterForm() {
  const searchParams = useSearchParams();
  const stationCode = searchParams?.get('station') || 'GJ1001';

  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('CAR');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [fuelType, setFuelType] = useState('PETROL');
  const [fuelAmount, setFuelAmount] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [rewardResult, setRewardResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName || !mobileNumber || mobileNumber.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number and full name.');
      return;
    }

    if (!vehicleNumber || !fuelAmount || !billNumber) {
      setErrorMsg('Please complete all mandatory vehicle and fuel bill fields.');
      return;
    }

    if (!selectedFile) {
      setErrorMsg('Please upload a clear image or PDF of your fuel receipt.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/registrations/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignSlug: 'sapno-ki-sawari-season-2',
          stationCode,
          fullName,
          mobileNumber,
          vehicleType,
          vehicleNumber,
          fuelType,
          fuelAmount: parseFloat(fuelAmount),
          billNumber,
          fileName: selectedFile.name,
          fileFormat: selectedFile.type.includes('pdf') ? 'PDF' : 'JPG',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || data.error || 'Submission failed. Please try again.');
        setLoading(false);
        return;
      }

      setRegistrationId(data.registrationId);
      setRewardResult(data.rewardResult);
      setSubmitSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return !submitSuccess ? (
    <div className="bg-white rounded-2xl bpcl-card-shadow p-6 sm:p-8 border border-slate-200">
      {/* Header Badge */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
        <div>
          <span className="text-xs font-bold text-bpcl-yellow uppercase bg-bpcl-darkBlue px-3 py-1 rounded-full">
            Step 1 of 2 • Registration
          </span>
          <h1 className="text-2xl font-extrabold text-bpcl-darkBlue mt-2">BPCL Fuel Bill Upload</h1>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-bold text-slate-500 block">Station Code</span>
          <span className="text-sm font-black text-bpcl-blue bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 inline-block font-mono">
            {stationCode}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Customer Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Chaudhari"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-bpcl-blue text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mobile Number (10 Digits) *
            </label>
            <input
              type="tel"
              maxLength={10}
              required
              placeholder="e.g. 9825012345"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-bpcl-blue text-sm outline-none font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Vehicle Type *
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-bpcl-blue text-sm outline-none bg-white"
            >
              <option value="CAR">Car / SUV</option>
              <option value="TWO_WHEELER">Two Wheeler / Motorcycle</option>
              <option value="COMMERCIAL">Commercial / Truck / Bus</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Vehicle Registration Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. GJ01AB1234"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-bpcl-blue text-sm outline-none font-mono uppercase"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Fuel Type *
            </label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-bpcl-blue text-sm outline-none bg-white"
            >
              <option value="PETROL">Petrol</option>
              <option value="DIESEL">Diesel</option>
              <option value="CNG">CNG</option>
              <option value="EV">EV Charge</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Fuel Amount (₹) *
            </label>
            <input
              type="number"
              min={100}
              required
              placeholder="e.g. 1500"
              value={fuelAmount}
              onChange={(e) => setFuelAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-bpcl-blue text-sm outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Bill / Invoice Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. INV-2026-8801"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-bpcl-blue text-sm outline-none font-mono uppercase"
            />
          </div>
        </div>

        {/* Bill Uploader Component */}
        <div className="pt-2">
          <BillUploader
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
            onClearFile={() => setSelectedFile(null)}
          />
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full bpcl-gradient-header text-white font-extrabold text-base py-3.5 px-6 rounded-xl hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Validating Submission...' : 'Submit & Play Instant Scratch & Win'}
            {!loading && <ArrowRight className="w-5 h-5 text-bpcl-yellow" />}
          </button>
        </div>
      </form>
    </div>
  ) : (
    /* Thank You & Scratch Card Screen */
    <div className="bg-white rounded-2xl bpcl-card-shadow p-6 sm:p-8 text-center border-2 border-bpcl-yellow space-y-6">
      <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-10 h-10" />
      </div>

      <div>
        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase">
          Submission Successfully Validated
        </span>
        <h2 className="text-2xl font-black text-bpcl-darkBlue mt-2">Thank You, {fullName}!</h2>
        <p className="text-xs text-slate-600 mt-1">
          Your fuel bill <span className="font-mono font-bold text-slate-900">{billNumber}</span> at Station{' '}
          <span className="font-mono font-bold text-slate-900">{stationCode}</span> has been received.
        </p>
      </div>

      {/* Instant Scratch & Win Canvas */}
      <div className="py-2">
        <ScratchCard
          rewardTitle={rewardResult?.rewardTitle || '₹100 Fuel Voucher'}
          couponCode={rewardResult?.couponCode || 'BPCL100'}
          isWinner={rewardResult?.won !== false}
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-slate-700 space-y-1">
        <div className="font-bold text-bpcl-darkBlue">Automatic Draw Eligibility Confirmed</div>
        <p>
          You are now automatically entered into all <span className="font-bold text-bpcl-blue">Fortnightly Lucky Draws</span> & the <span className="font-bold text-bpcl-blue">Grand Bumper Draw</span>!
        </p>
      </div>

      <button
        onClick={() => {
          setSubmitSuccess(false);
          setSelectedFile(null);
          setBillNumber('');
          setFuelAmount('');
        }}
        className="text-xs font-bold text-bpcl-blue hover:underline"
      >
        Submit Another Bill
      </button>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 py-10 px-4 max-w-3xl mx-auto w-full">
        <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-500">Loading form...</div>}>
          <RegisterForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
