import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Upload, FileText, AlertCircle,
  Shield, MapPin, Bell, Star,
  Phone, Mail, Globe, MessageCircle, Camera, ExternalLink,
  Users, Building2, Pill, Activity, ChevronDown,
  Lock, Clock, CheckCircle2
} from 'lucide-react';
import doctorBanner from '../assets/doctor-banner.png';
import logoImg from '../assets/logo.png';
import aboutImg from '../assets/aboutus.png';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost/MedcareAssist/Backend/api';

const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        setHasIntersected(true);
      }
    }, { threshold: 0.1, ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [options]);

  return [ref, isIntersecting, hasIntersected];
};

const FadeInSection = ({ children, delay = 0, className = "" }) => {
  const [ref, , hasIntersected] = useIntersectionObserver({ threshold: 0.15 });
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${
        hasIntersected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const StatItem = ({ stat, delay }) => {
  const [ref, , hasIntersected] = useIntersectionObserver({ threshold: 0.5 });
  const [count, setCount] = useState(0);

  const targetValue = parseFloat(stat.value.replace(/,/g, '').replace(/[^0-9.]/g, ''));
  const suffix = stat.value.replace(/[0-9.,]/g, '');
  const isDecimal = stat.value.includes('.');

  useEffect(() => {
    if (!hasIntersected) return;

    let start = 0;
    const duration = 2000;
    const increment = targetValue / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= targetValue) {
        setCount(targetValue);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [hasIntersected, targetValue]);

  const displayCount = isDecimal 
    ? count.toFixed(1) 
    : Math.floor(count).toLocaleString();

  return (
    <div
      ref={ref}
      className={`text-center group transition-all duration-1000 transform ${
        hasIntersected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-white/20 transition-colors">
        <stat.icon className="w-7 h-7 text-white" />
      </div>
      <div className="text-4xl font-extrabold text-white mb-1">
        {displayCount}{suffix}
      </div>
      <div className="text-blue-200 font-medium text-sm">{stat.label}</div>
    </div>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [globalSearch, setGlobalSearch] = useState('');
  const [medResults, setMedResults] = useState([]);
  const [pharmResults, setPharmResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState('');
  const [openFaq, setOpenFaq] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [systemStats, setSystemStats] = useState({ active_users: 0, partner_pharmacies: 0, prescriptions_processed: 0, uptime: '99.9%' });
  const debounceRef = useRef(null);
  const searchBarRef = useRef(null);

  useEffect(() => {
    // Fetch feedbacks
    fetch(`${API}/public/get_feedbacks.php`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') {
          // ensure valid format
          setFeedbacks(Array.isArray(d.data) ? d.data : []);
        }
      })
      .catch(err => console.error("Feedback fetch error", err));
      
    // Fetch live system stats
    fetch(`${API}/public/get_home_stats.php`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') {
          setSystemStats(d.data);
        }
      })
      .catch(err => console.error("Stats fetch error", err));

    const handleClickOutside = (event) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (globalSearch.trim().length < 2) {
      setMedResults([]);
      setPharmResults([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIsSearching(true);
      setShowDropdown(true);

      const fetchMed = fetch(`${API}/public/search_medicines.php?q=${encodeURIComponent(globalSearch.trim())}`)
        .then(r => r.json())
        .then(d => d.status === 'success' ? d.data || [] : [])
        .catch(() => []);

      const fetchPharm = fetch(`${API}/public/get_pharmacies.php?q=${encodeURIComponent(globalSearch.trim())}`)
        .then(r => r.json())
        .then(d => d.status === 'success' ? d.data || [] : [])
        .catch(() => []);

      Promise.all([fetchMed, fetchPharm]).then(([meds, pharms]) => {
        setMedResults(meds);
        setPharmResults(pharms);
        setIsSearching(false);
      });
    }, 400);
  }, [globalSearch]);

  const handleResultClick = (type) => {
    setLoginPrompt(`Please login or register to ${type === 'medicine' ? 'reserve medicines' : 'upload a prescription to this pharmacy'}. Redirecting...`);
    setShowDropdown(false);
    setTimeout(() => navigate('/login'), 500);
  };

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    document.documentElement.style.scrollBehavior = 'smooth';
    return () => { 
      document.documentElement.style.scrollBehavior = 'auto'; 
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate('/');
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const navbarHeight = 80; 
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setMobileMenuOpen(false);
    }
  };

  const navItems = [
    { label: 'Home', id: 'home' },
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'About Us', id: 'about-us' },
    { label: 'Contact', id: 'contact' },
  ];

  const features = [
    { icon: Search, title: 'Search Medicines', desc: 'Find medicines across hundreds of partner pharmacies instantly', color: 'bg-blue-100 text-blue-600' },
    { icon: Upload, title: 'Upload Prescription', desc: 'Securely upload and manage your prescriptions online', color: 'bg-emerald-100 text-emerald-600' },
    { icon: Bell, title: 'Medicine reminder', desc: 'Get timely alerts to never miss a dose of your medication', color: 'bg-purple-100 text-purple-600' },
    { icon: FileText, title: 'Health Records', desc: 'Keep all your health records organized in one place', color: 'bg-amber-100 text-amber-600' },
    { icon: AlertCircle, title: 'Emergency SOS', desc: 'One-tap emergency assistance available 24/7', color: 'bg-red-100 text-red-600' },
  ];

  const stats = [ // code line 481 in the box colour
    { value: `${systemStats.active_users}+`, label: 'Active Users', icon: Users },
    { value: `${systemStats.partner_pharmacies}+`, label: 'Partner Pharmacies', icon: Building2 },
    { value: `${systemStats.prescriptions_processed}+`, label: 'Prescriptions Processed', icon: FileText },
    { value: systemStats.uptime, label: 'Uptime Guaranteed', icon: Activity },
  ];

  const steps = [ //code line 484
    { num: '01', title: 'Create Your Account', desc: 'Sign up as a patient in seconds. No complex forms, just your basic details.' },
    { num: '02', title: 'Find Medicines & Pharmacies', desc: 'Search for medicines or find verified pharmacies near your location.' },
    { num: '03', title: 'Order & Track', desc: 'Place your order, upload prescriptions if needed, and track delivery in real-time.' },
  ];

  return (
    <div className="min-h-screen bg-white font-['Inter']">
      {loginPrompt && (
        <div className="fixed top-24 right-6 z-[100] flex items-center gap-3 bg-blue-600 text-white px-5 py-4 rounded-xl shadow-2xl animate-fadeIn max-w-sm">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <p className="text-sm font-semibold leading-snug">{loginPrompt}</p>
        </div>
      )}

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 shadow-sm h-[80px]">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity" onClick={handleLogoClick}>
            <img src={logoImg} alt="MedCare Assist Logo" className="h-24 object-contain" />
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button key={item.label} onClick={() => scrollToSection(item.id)}
                className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors bg-transparent border-none cursor-pointer">
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-5 flex-1 max-w-xl ml-8 justify-end">
            <div ref={searchBarRef} className="relative w-full max-w-[360px] mr-2">
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                <input 
                  type="text" 
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  onFocus={() => { if(globalSearch.trim().length >= 2) setShowDropdown(true); }}
                  placeholder="Search medicines..." 
                  className="w-full text-gray-700 placeholder-gray-400 focus:outline-none text-sm bg-transparent"
                />
              </div>
              
              {showDropdown && (
                <div className="absolute top-full left-0 w-full md:w-[450px] mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-96 overflow-y-auto z-50 animate-fadeIn divide-y divide-gray-50">
                  {isSearching ? (
                     <div className="p-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                       <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> Searching...
                     </div>
                  ) : (
                    <>
                      {medResults.length > 0 && (
                        <div className="py-2">
                          <div className="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">Medicines</div>
                          {medResults.map(med => (
                            <div key={med.medicine_id} onClick={() => handleResultClick('medicine')} className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Pill className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 text-sm">{med.brand_name}</div>
                                  <div className="text-xs text-gray-500">{med.generic_name}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {pharmResults.length > 0 && (
                        <div className="py-2">
                          <div className="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">Pharmacies</div>
                          {pharmResults.map(ph => (
                            <div key={ph.pharmacy_id || ph.id} onClick={() => handleResultClick('pharmacy')} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 text-sm">{ph.pharmacy_name || ph.name}</div>
                                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3 text-emerald-500" /> {ph.address}, {ph.district}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {medResults.length === 0 && pharmResults.length === 0 && (
                         <div className="p-4 text-center text-sm text-gray-500">No results found</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => navigate('/register')}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
            >
              Register
            </button>
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <div className="w-6 h-0.5 bg-gray-700 mb-1.5" />
            <div className="w-6 h-0.5 bg-gray-700 mb-1.5" />
            <div className="w-6 h-0.5 bg-gray-700" />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3 shadow-lg">
            {navItems.map((item) => (
              <button key={item.label} onClick={() => scrollToSection(item.id)}
                className="block text-gray-700 font-medium py-1 bg-transparent border-none cursor-pointer w-full text-left">
                {item.label}
              </button>
            ))}
            <div className="pt-2">
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input 
                  type="text" 
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  onFocus={() => { if(globalSearch.trim().length >= 2) setShowDropdown(true); }}
                  placeholder="Search medicines or pharmacies..." 
                  className="w-full text-gray-700 placeholder-gray-400 focus:outline-none text-sm bg-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </nav>

      <div className="mt-[80px]"></div>

      {/* Hero Section */}
      <section id="home" className="bg-[#eef5fc] relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute -left-64 -top-32 w-[600px] h-[600px] bg-[#d9e8fa] rounded-full mix-blend-multiply opacity-80" />
          <div className="absolute -left-20 -bottom-48 w-[500px] h-[500px] bg-[#cce0f5] rounded-full mix-blend-multiply opacity-60" />
          <div className="absolute -right-32 top-10 w-[700px] h-[700px] bg-[#dcecf9] rounded-full mix-blend-multiply opacity-90" />
        </div>

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-end relative z-10">
          <FadeInSection className="pb-20 pt-10">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              SRI LANKA'S SMART HEALTHCARE PLATFORM
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              Your Health,<br />
              <span className="text-blue-600">Managed <br />Smarter & Safer</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
              MedCare Assist connects patients with verified pharmacies, streamlines prescription management, and ensures your medications are always accessible — wherever you are.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <button onClick={() => navigate('/login?type=patient')}
                className="flex items-center gap-2 px-7 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                <Users className="w-5 h-5" /> Patient Login
              </button>
              <button onClick={() => navigate('/login?type=pharmacy')}
                className="flex items-center gap-2 px-7 py-3.5 bg-white text-blue-600 rounded-xl font-semibold border-2 border-blue-200 hover:border-blue-400 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                <Pill className="w-5 h-5" /> Pharmacist Login
              </button>
            </div>


          </FadeInSection>

          <div className="relative hidden lg:block">
            <FadeInSection delay={200} className="relative w-full h-[520px] flex items-center justify-center">
              <img 
                src={doctorBanner} 
                alt="MedCare Assist Doctor" 
                className="absolute z-10 h-[115%] object-contain"
              />

              {[
                { icon: Shield, label: 'Secure & Private', sub: 'HIPAA Compliant', color: 'bg-blue-600', pos: 'top-8 left-4 z-20' },
                { icon: MapPin, label: 'Nearby Pharmacies', sub: '25+ Partners', color: 'bg-emerald-600', pos: 'top-40 -right-4 z-20' },
                { icon: Bell, label: 'Emergency SOS', sub: '24/7 Available', color: 'bg-red-500', pos: 'bottom-32 left-0 z-20' },
                { icon: Lock, label: 'HIPAA Compliant', sub: 'Data Protected', color: 'bg-purple-600', pos: 'bottom-16 right-4 z-20' },
              ].map((card) => (
                <div key={card.label} className={`absolute ${card.pos} flex items-center gap-3 bg-white/95 backdrop-blur rounded-xl shadow-lg px-4 py-3 border border-gray-100 hover:shadow-xl transition-shadow cursor-default animate-pulse-slow`}>
                  <div className={`w-9 h-9 ${card.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <card.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{card.label}</p>
                    <p className="text-xs text-gray-500">{card.sub}</p>
                  </div>
                </div>
              ))}
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Features Strip */}
      <section id="features" className="py-16 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <FadeInSection>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Features</h2>
              <p className="text-gray-500 max-w-xl mx-auto">A complete pharmacy management ecosystem designed for patients, pharmacists, and pharmacy owners</p>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {features.map((f, i) => (
              <FadeInSection key={f.title} delay={i * 100}>
                <div className="group h-full bg-white border border-gray-100 rounded-2xl p-6 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default">
                  <div className={`w-14 h-14 ${f.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <f.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="py-16 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl py-12 lg:py-16 px-6 shadow-xl">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((s, i) => (
                <StatItem key={s.label} stat={s} delay={i * 150} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <FadeInSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-3">How It Works</h2>
              <p className="text-gray-500 max-w-lg mx-auto">Get started with MedCare Assist in three simple steps</p>
            </div>
          </FadeInSection>
          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((step, i) => (
              <FadeInSection key={step.num} delay={i * 200}>
                <div className="relative text-center group">
                  <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 text-2xl font-extrabold shadow-lg group-hover:shadow-blue-300 group-hover:scale-105 transition-all">
                    {step.num}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-blue-200" />
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about-us" className="py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <FadeInSection>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-center text-gray-900 mb-16">About Us</h2>
          </FadeInSection>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeInSection>
              <img src={aboutImg} alt="About Us" className="w-full h-auto object-cover rounded-[2rem] shadow-sm" />
            </FadeInSection>

            <FadeInSection delay={200}>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 leading-tight mb-6">
                Empowering Healthcare in <span className="text-blue-600">Sri Lanka</span>
              </h2>
              <p className="text-[15px] text-gray-600 mb-6 leading-relaxed">
                MedCare Assist was born from a vision to bridge the gap between patients and pharmacies. In a world where timing is everything, we provide a seamless digital platform that ensures you never have to worry about finding essential medicines or managing your health records.
              </p>
              <p className="text-[15px] text-gray-600 mb-10 leading-relaxed">
                We are committed to the highest standards of data security and medical ethics, ensuring that your journey to recovery is supported by the smartest tools available today.
              </p>

              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                {[
                  'Digital Transformation',
                  'Safe & Verified',
                  'Nationwide Reach',
                  'User Centric Design'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-gray-700 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Everything You Need for Better Health */}
      <section className="py-20 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <FadeInSection>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">Everything You Need for Better Health</h2>
            <p className="text-gray-500 max-w-2xl mx-auto mb-16 text-lg">Our platform provides comprehensive tools to manage every aspect of your medical journey with ease and reliability.</p>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Search, title: 'Instant Medicine Search', 
                desc: 'Search for over 50,000+ medicines with detailed information on usage, side effects, and availability across pharmacies.',
                bullets: ['Medical history locker', 'Availability stock status'],
                color: 'text-blue-600 bg-blue-50'
              },
              {
                icon: Upload, title: 'Seamless Uploads', 
                desc: 'Just snap a photo of your prescription and upload. Our partner pharmacies will process it and provide quotes instantly.',
                bullets: ['Secure system', 'Comparison of prices'],
                color: 'text-emerald-600 bg-emerald-50'
              },
              {
                icon: Shield, title: 'Secure Your Medical Records', 
                desc: 'Secure your medical records in our system. Your don\'t think much about this, We are here to protect you.',
                bullets: ['Anytime everywhere access', 'Brand vs Generic info', 'Pharmacist validation'],
                color: 'text-blue-600 bg-blue-50'
              }
            ].map((card, i) => (
              <FadeInSection key={card.title} delay={i * 200}>
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left h-full">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${card.color}`}>
                    <card.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h3>
                  <p className="text-gray-500 mb-6 text-sm leading-relaxed">{card.desc}</p>
                  <ul className="space-y-3">
                    {card.bullets.map((bullet, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="max-w-3xl mx-auto px-6">
          <FadeInSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Frequently Asked Questions</h2>
              <p className="text-gray-500">Find answers to the most common questions about MedCare Assist.</p>
            </div>
          </FadeInSection>

          <div className="space-y-4">
            {[
              { q: 'How do I upload a prescription?', a: 'You can easily upload your prescription by logging into your patient dashboard and clicking on "Upload Prescription". You can take a photo or upload a PDF.' },
              { q: 'Is my data secure?', a: 'Yes, we take your privacy very seriously. Our platform uses end-to-end encryption to ensure your medical data and personal information are strictly protected.' },
              { q: 'What are the delivery times?', a: 'Delivery times vary based on the pharmacy and your location, but most orders within city limits are delivered within 2-4 hours.' },
              { q: 'How can I find my order status?', a: 'Once you place an order, you can track it in real-time from your dashboard under the "Orders" section.' },
            ].map((faq, i) => (
              <FadeInSection key={i} delay={i * 100}>
                <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50">
                  <button 
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                  >
                    <span className="font-bold text-gray-900">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 px-6 pb-6' : 'max-h-0 px-6 pb-0'}`}>
                    <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Feedback & Success Stories */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-blue-50 rounded-[3rem] p-10 lg:p-16">
            <FadeInSection>
              <div className="text-center mb-14">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Feedback & Success Stories</h2>
                <p className="text-gray-500">See what our users have to say about their experience with MedCare Assist.</p>
              </div>
            </FadeInSection>

            <div className="grid md:grid-cols-3 gap-8">
              {feedbacks.length > 0 ? (
                feedbacks.map((feedback, i) => (
                  <FadeInSection key={feedback.id || i} delay={i * 200}>
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm h-full flex flex-col">
                      <div className="flex gap-1 mb-6">
                        {[1,2,3,4,5].map(star => (
                          <Star key={star} className={`w-4 h-4 ${star <= feedback.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed mb-8 flex-grow">"{feedback.feedback_text}"</p>
                      <div className="flex items-center gap-4 mt-auto">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0">
                          {feedback.patient_name ? feedback.patient_name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{feedback.patient_name || 'Anonymous'}</h4>
                          <p className="text-xs text-gray-500">Verified Patient</p>
                        </div>
                      </div>
                    </div>
                  </FadeInSection>
                ))
              ) : (
                <div className="col-span-3 text-center text-gray-500 py-10">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>No feedback available yet. Check back soon!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <FadeInSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Get In Touch</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Have questions? We'd love to hear from you</p>
            </div>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Mail, title: 'Email', value: 'support@medcareassist.lk', sub: 'We reply within 24 hours', color: 'text-blue-600 bg-blue-50' },
              { icon: Phone, title: 'Phone', value: '+94 11 234 5678', sub: 'Mon-Fri from 8AM to 6PM', color: 'text-emerald-600 bg-emerald-50' },
              { icon: MapPin, title: 'Address', value: 'Badulla, Sri Lanka', sub: 'Head Office, Badulla ', color: 'text-purple-600 bg-purple-50' },
              { icon: Clock, title: 'Hours', value: 'Mon-Fri 8AM-6PM', sub: 'Weekend support via email', color: 'text-amber-600 bg-amber-50' },
            ].map((info, i) => (
              <FadeInSection key={info.title} delay={i * 100}>
                <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center flex flex-col justify-center items-center">
                  <div className={`w-14 h-14 ${info.color} rounded-2xl flex items-center justify-center mb-5`}>
                    <info.icon className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-gray-900 text-lg mb-2">{info.title}</h4>
                  <p className="text-sm font-semibold text-blue-600 mb-1">{info.value}</p>
                  <p className="text-xs text-gray-400">{info.sub}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white text-gray-600 py-14 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center mb-4 cursor-pointer" onClick={handleLogoClick}>
              <img src={logoImg} alt="MedCare Assist Logo" className="h-16 object-contain" />
            </div>
            <p className="text-sm leading-relaxed mb-5">Your trusted pharmacy management companion. Connecting patients and pharmacies seamlessly.</p>
            <div className="flex gap-3">
              {[Globe, MessageCircle, Camera, ExternalLink].map((Icon, i) => (
                <div key={i} className="w-9 h-9 bg-white text-blue-600 shadow-sm border border-blue-100 rounded-lg flex items-center justify-center hover:bg-blue-600 hover:text-white cursor-pointer transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
              ))}
            </div>
          </div>

          {[
            { title: 'Quick Links', links: ['Home', 'About Us', 'Features', 'How It Works'] },
            { title: 'Services', links: ['Search Medicine', 'Prescription Upload', 'Find Pharmacy', 'Health Records'] },
            { title: 'Support', links: ['Help Center', 'FAQs', 'Contact Us', 'Privacy Policy'] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-gray-900 font-bold mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-sm text-gray-400">&copy; 2026 MedCare Assist by CST group No 03 Present. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm font-medium">
            <a href="/privacy" className="text-gray-500 hover:text-blue-600 transition-colors">Privacy</a>
            <a href="/terms" className="text-gray-500 hover:text-blue-600 transition-colors">Terms</a>
            <a href="#" className="text-gray-500 hover:text-blue-600 transition-colors">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
