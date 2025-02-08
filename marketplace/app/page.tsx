"use client";
import '@reown/appkit/react';
import { CreateListing } from '@/components/CreateListing';
import { useTwas } from '@/context/twas';
import Link from 'next/link';
import { BuyListing } from '@/components/BuyListing';

export default function Home() {
  const { listing } = useTwas();

  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <nav className="w-full px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold">
              Twas
            </Link>
            <Link
              href="/"
              className="hidden sm:block text-gray-600 hover:text-gray-900"
            >
              Home
            </Link>
          </div>
          <div>
            {/* @ts-expect-error msg */}
            <appkit-button />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 px-4 sm:px-6 py-8">
        {listing ? (
          <BuyListing />
        ) : (
          <CreateListing />
        )}
      </div>
    </main>
  );
}