import React from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  headerStep?: string;
  minimalHeader?: boolean;
  noPadding?: boolean;
  bgColor?: string;
}

export default function Layout({
  children,
  headerStep,
  minimalHeader = false,
  noPadding = false,
  bgColor = 'bg-[#F2F6FB]',
}: LayoutProps) {
  return (
    <div className={`min-h-screen flex flex-col ${bgColor}`}>
      <Header minimal={minimalHeader} step={headerStep} />
      <main className={`flex-1 ${noPadding ? '' : 'py-8 sm:py-12'}`}>
        <div className={noPadding ? '' : 'max-w-5xl mx-auto px-4 sm:px-6'}>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
