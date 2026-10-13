import logo from '../../assets/logo.png';

const footerSections = [
  {
    title: 'Quick Links',
    items: ['Home', 'About Us', 'Features', 'How It Works'],
  },
  {
    title: 'Services',
    items: ['Medicine Search', 'Prescription Upload', 'Fast Delivery', 'Health Records'],
  },
  {
    title: 'Support',
    items: ['Help Center', 'FAQs', 'Contact Us', 'Privacy Policy'],
  },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#F1F5F9] relative mt-20 rounded-2xl mx-1 md:mx-0">
      <div className="max-w-[1049px] mx-auto px-4 md:px-6 relative pt-12 md:pt-20 pb-0">
        <img
          src={logo}
          alt="Pharmasist"
          className="relative md:absolute object-contain mb-8 md:mb-0"
          style={{ width: 104, height: 104, left: 'auto', top: 0 }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-x-16 md:ml-12">
          <div className="flex flex-col gap-[23.3px]">
            <p className="text-[#64748B] text-sm leading-[22.75px]">
              Connecting patients with pharmacies<br />
              across Sri Lanka. Smart, secure, and<br />
              reliable healthcare at your fingertips.
            </p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#EBF3FF] rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#3B82F6]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <div className="w-10 h-10 bg-[#EBF3FF] rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#3B82F6]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </div>
              <div className="w-10 h-10 bg-[#EBF3FF] rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#3B82F6]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </div>
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title} className="flex flex-col gap-6">
              <h3 className="text-[#0F172A] text-base font-bold">
                {section.title}
              </h3>
              <div className="flex flex-col gap-4">
                {section.items.map((item) => (
                  <button
                    key={item}
                    className="text-left text-[#64748B] text-sm hover:text-[#3B82F6] transition-colors cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between border-t border-[#F1F5F9] py-5 mt-10 md:mt-15 md:ml-12 gap-4 md:gap-0">
          <p className="text-[#64748B] text-sm text-center md:text-left">
            &copy; 2026 Pharmasist. All rights reserved.
          </p>
          <div className="flex items-center gap-4 md:gap-6">
            <span className="text-[#94A3B8] text-sm font-medium cursor-pointer hover:text-[#3B82F6] transition-colors">
              Terms of Service
            </span>
            <span className="text-[#94A3B8] text-sm font-medium cursor-pointer hover:text-[#3B82F6] transition-colors">
              Cookie Policy
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
