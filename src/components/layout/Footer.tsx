export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#E5E7EB] mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-[#9CA3AF]">
          © {new Date().getFullYear()} QualScore. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-xs text-[#9CA3AF]">
          <a href="#" className="hover:text-[#1A73E8] transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-[#1A73E8] transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-[#1A73E8] transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
