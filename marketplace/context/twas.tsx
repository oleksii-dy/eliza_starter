"use client"

import { createContext, useContext, useState, ReactNode } from 'react';
import { IListing } from '@/lib/api';

interface TwasContextType {
    listing: IListing | null;
    setListing: (listing: IListing | null) => void;
}

const TwasContext = createContext<TwasContextType | undefined>(undefined);

export function TwasProvider({ children }: { children: ReactNode }) {
    const [listing, setListing] = useState<IListing | null>(null);

    const value = {
        listing,
        setListing,
    };

    return (
        <TwasContext.Provider value={value}>
            {children}
        </TwasContext.Provider>
    );
}

export function useTwas() {
    const context = useContext(TwasContext);
    if (context === undefined) {
        throw new Error('useTwas must be used within a TwasProvider');
    }
    return context;
}
