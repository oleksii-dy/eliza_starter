"use client";
import '@reown/appkit/react';
export default function Home() {
  return (
    <main className="min-h-screen px-8 py-0 pb-12 flex-1 flex flex-col items-center bg-white">
      <header className="w-full py-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="hidden sm:inline text-xl font-bold">Twas</div>
        </div>
        <div className="flex items-center">
          {/* @ts-expect-error msg */}
          <appkit-button />
        </div>
      </header>
    </main>
  );
}