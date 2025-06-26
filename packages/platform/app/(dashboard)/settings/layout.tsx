'use client';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full mx-24 flex-grow gap-6 m-4">
      <div className="flex h-full w-full flex-grow flex-col items-center justify-start gap-8 py-8">
        {children}
      </div>
    </div>
  );
}
