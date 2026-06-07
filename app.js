/* ============================================
   QuoteSnap — Core Application Logic
   Voice-to-Quote & Invoicing for Tradespeople
   ============================================ */

const Store = {
  state: {
    user: {
      name: 'Mike Connor',
      business: 'Connor Electrical',
      email: 'mike@connorelectrical.com',
      phone: '(555) 123-4567',
      plan: 'Pro'
    },
    quotes: [
      {
        id: 'QS-2401',
        customer: 'Sarah Mitchell',
        company: 'Mitchell Properties',
        amount: 3500.00,
        status: 'paid',
        date: '2026-06-04',
        items: [
          { description: 'Full Rewire - 3 Bed Flat', quantity: 1, unit: 'job', rate: 2800.00 },
          { description: 'Consumer Unit Upgrade', quantity: 1, unit: 'unit', rate: 450.00 },
          { description: 'Testing & Certification', quantity: 1, unit: 'job', rate: 250.00 }
        ],
        email: 'sarah@mitchellprops.com',
        phone: '(555) 987-6543',
        address: '12 Oakwood Drive, London'
      },
      {
        id: 'QS-2402',
        customer: 'Tom Davies',
        company: '',
        amount: 890.50,
        status: 'sent',
        date: '2026-06-05',
        items: [
          { description: 'New Light Installation - Kitchen', quantity: 6, unit: 'lights', rate: 85.00 },
          { description: 'Dimmer Switch Install', quantity: 2, unit: 'switches', rate: 45.00 },
          { description: 'Materials & Wiring', quantity: 1, unit: 'lot', rate: 140.50 }
        ],
        email: 'tom.davies@email.com',
        phone: '(555) 234-5678',
        address: '45 Maple Street, Manchester'
      },
      {
        id: 'QS-2403',
        customer: 'Emma Wilson',
        company: 'Wilson Renovations',
        amount: 12400.00,
        status: 'draft',
        date: '2026-06-06',
        items: [
          { description: 'Full Commercial Rewire', quantity: 1, unit: 'job', rate: 8500.00 },
          { description: '3-Phase Supply Installation', quantity: 1, unit: 'unit', rate: 2400.00 },
          { description: 'Fire Alarm System', quantity: 1, unit: 'system', rate: 1500.00 }
        ],
        email: 'emma@wilsonreno.com',
        phone: '(555) 876-5432',
        address: '88 Commerce Road, Birmingham'
      }
    ],
    invoices: [],
    settings: {
      defaultTaxRate: 20,
      currency: 'GBP',
      paymentTerms: 30,
      businessLogo: null
    },
    currentPage: 'dashboard',
    currentQuote: null,
    currentInvoice: null
  },

  listeners: [],

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },

  getState() {
    return this.state;
  },

  dispatch(action) {
    switch (action.type) {
      case 'SET_PAGE':
        this.state.currentPage = action.payload;
        break;
      case 'SET_CURRENT_QUOTE':
        this.state.currentQuote = action.payload;
        break;
      case 'ADD_QUOTE':
        this.state.quotes.unshift(action.payload);
        break;
      case 'UPDATE_QUOTE':
        {
          const idx = this.state.quotes.findIndex(q => q.id === action.payload.id);
          if (idx !== -1) this.state.quotes[idx] = { ...this.state.quotes[idx], ...action.payload };
        }
        break;
      case 'DELETE_QUOTE':
        this.state.quotes = this.state.quotes.filter(q => q.id !== action.payload);
        break;
      case 'UPDATE_SETTINGS':
        this.state.settings = { ...this.state.settings, ...action.payload };
        break;
      case 'UPDATE_USER':
        this.state.user = { ...this.state.user, ...action.payload };
        break;
      default:
        break;
    }
    this.listeners.forEach(l => l(this.state));
  }
};

/* ============================================
   ROUTER
   ============================================ */
const Router = {
  navigate(page, data = null) {
    if (data) {
      Store.dispatch({ type: 'SET_CURRENT_QUOTE', payload: data });
    }
    Store.dispatch({ type: 'SET_PAGE', payload: page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

/* ============================================
   HELPERS
   ============================================ */
function formatCurrency(amount) {
  return '£' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function generateQuoteId() {
  const num = String(Store.getState().quotes.length + 2404).padStart(4, '0');
  return `QS-${num}`;
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ============================================
   TOAST SYSTEM
   ============================================ */
const Toast = {
  show(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: '⚡' };
    toast.innerHTML = `<span>${icons[type]}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

/* ============================================
   SPEECH RECOGNITION
   ============================================ */
const SpeechEngine = {
  recognition: null,
  isListening: false,
  onResult: null,

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not available');
      return false;
    }
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-GB';

    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (this.onResult) this.onResult(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      this.isListening = false;
      if (this.onError) this.onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    return true;
  },

  start() {
    if (!this.recognition) return;
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      console.warn('Speech start failed:', e);
    }
  },

  stop() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
      this.isListening = false;
    } catch (e) {}
  },

  toggle() {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
    return this.isListening;
  }
};

/* ============================================
   RENDER ENGINE
   ============================================ */
const Render = {
  app: document.getElementById('app'),

  init() {
    SpeechEngine.init();
    Store.subscribe(() => this.render());
    this.render();
    this.bindGlobalListeners();
  },

  bindGlobalListeners() {
    document.addEventListener('click', (e) => {
      const sidebar = document.querySelector('.app-sidebar');
      const overlay = document.querySelector('.sidebar-overlay');
      if (e.target.closest('.sidebar-overlay')) {
        sidebar.classList.remove('open');
        overlay.remove();
      }
    });
  },

  render() {
    const state = Store.getState();
    const page = state.currentPage;

    if (page === 'landing' || page === 'landing') {
      this.app.innerHTML = this.renderLanding();
    } else {
      this.app.innerHTML = this.renderAppShell();
    }

    this.bindDynamicListeners();
  },

  /* ============ LANDING ============ */
  renderLanding() {
    return `
      <div class="landing">
        <div class="landing-bg"></div>
        <div class="landing-grid"></div>

        <header class="landing-header">
          <div class="landing-logo">
            <span class="landing-logo-icon">QS</span>
            <span>QuoteSnap</span>
          </div>
          <nav class="landing-nav">
            <a href="#" data-nav="features">Features</a>
            <a href="#" data-nav="pricing">Pricing</a>
            <a href="#" data-nav="testimonials">Reviews</a>
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('dashboard')">Sign In</button>
            <button class="btn btn-primary btn-sm" onclick="Router.navigate('dashboard')">Get Started</button>
          </nav>
        </header>

        <section class="landing-hero">
          <div class="landing-badge">⚡ Trusted by 2,400+ Tradespeople</div>
          <h1>Snap a Quote.<br>Land the <span>Job.</span></h1>
          <p>Turn voice into professional quotes and invoices in seconds. No paperwork, no admin — just your tools and your phone. Built for tradespeople who'd rather work than type.</p>
          <div class="btn-group">
            <button class="btn btn-primary btn-lg" onclick="Router.navigate('dashboard')">Start Free Trial →</button>
            <button class="btn btn-secondary btn-lg" onclick="document.getElementById('features-section').scrollIntoView({behavior:'smooth'})">See How It Works</button>
          </div>
          <div class="landing-stats">
            <div class="landing-stat-item">
              <div class="number">2.4K+</div>
              <div class="label">Trades Active</div>
            </div>
            <div class="landing-stat-item">
              <div class="number">£12M+</div>
              <div class="label">Quotes Generated</div>
            </div>
            <div class="landing-stat-item">
              <div class="number">3.2×</div>
              <div class="label">Faster Invoicing</div>
            </div>
          </div>
        </section>

        <section id="features-section" class="landing-demo">
          <h2>Three <span class="text-gradient">Seconds</span> to Quote</h2>
          <p>Speak naturally. We turn your voice into a polished quote. Send it before you've packed your tools.</p>
          <div class="flow-steps">
            <div class="flow-step">
              <div class="flow-step-number">01</div>
              <div class="flow-step-icon">🎤</div>
              <h3>Speak It</h3>
              <p>Just describe the job naturally — "rewire three-bed flat, consumer unit, testing" — and we handle the rest.</p>
            </div>
            <div class="flow-step">
              <div class="flow-step-number">02</div>
              <div class="flow-step-icon">⚡</div>
              <h3>Auto-Magically Formats</h3>
              <p>Our AI extracts materials, labour, and quantities into a proper line-item quote. Review and adjust in seconds.</p>
            </div>
            <div class="flow-step">
              <div class="flow-step-number">03</div>
              <div class="flow-step-icon">📨</div>
              <h3>Send & Get Paid</h3>
              <p>Email or text the quote instantly. Track when it's seen. Get paid 3× faster with integrated payment links.</p>
            </div>
          </div>
        </section>

        <section class="landing-features">
          <h2>Everything You <span class="text-gradient">Need</span></h2>
          <div class="features-grid">
            <div class="feature-card">
              <div class="icon">🎤</div>
              <h3>Voice Capture</h3>
              <p>Describe the job on-site. AI transcribes and structures it into a perfect quote. No typing required.</p>
            </div>
            <div class="feature-card">
              <div class="icon">📋</div>
              <h3>Smart Templates</h3>
              <p>Save common jobs as templates. One tap to generate a full quote for repeat work or similar projects.</p>
            </div>
            <div class="feature-card">
              <div class="icon">📊</div>
              <h3>Job Tracking</h3>
              <p>Know which quotes are seen, what's overdue, and who's ready to book. Dashboard shows your pipeline at a glance.</p>
            </div>
            <div class="feature-card">
              <div class="icon">💰</div>
              <h3>Instant Invoicing</h3>
              <p>Convert any accepted quote to an invoice with one click. Accept card, bank transfer, or cash payments.</p>
            </div>
            <div class="feature-card">
              <div class="icon">📱</div>
              <h3>Mobile First</h3>
              <p>Built for the job site. Works perfectly on your phone. Generate and send quotes while standing in the customer's driveway.</p>
            </div>
            <div class="feature-card">
              <div class="icon">🔒</div>
              <h3>Professional Branding</h3>
              <p>Add your logo, colours, and business details. Quotes look like they came from a £500/mo operation — because you are.</p>
            </div>
          </div>
        </section>

        <section class="landing-pricing">
          <h2>Simple <span class="text-gradient">Pricing</span></h2>
          <p>No contracts. No hidden fees. Cancel anytime. Start with everything you need.</p>
          <div class="pricing-cards">
            <div class="pricing-card">
              <div class="plan-name">Starter</div>
              <div class="plan-price">Free</div>
              <div class="plan-period">Forever — no credit card</div>
              <ul class="plan-features">
                <li>5 quotes per month</li>
                <li>Basic voice capture</li>
                <li>Email delivery</li>
                <li>Quote templates</li>
              </ul>
              <button class="btn btn-secondary" onclick="Router.navigate('dashboard')">Get Started</button>
            </div>
            <div class="pricing-card featured">
              <div class="plan-name">Pro</div>
              <div class="plan-price">£12</div>
              <div class="plan-period">per month, per tradesperson</div>
              <ul class="plan-features">
                <li>Unlimited quotes & invoices</li>
                <li>Advanced voice AI</li>
                <li>Payment links (card + bank)</li>
                <li>Custom branding & logo</li>
                <li>Job pipeline dashboard</li>
                <li>Priority support</li>
              </ul>
              <button class="btn btn-primary" onclick="Router.navigate('dashboard')">Start Free Trial</button>
            </div>
          </div>
        </section>

        <section class="landing-testimonials">
          <h2>Real Trades, <span class="text-gradient">Real Results</span></h2>
          <div class="testimonial-card">
            <div class="quote">I was spending 2 hours every evening on paperwork. QuoteSnap cut that to 15 minutes. I sent a quote from inside a customer's loft last week — he'd paid before I'd even packed my drill.</div>
            <div class="author">
              <div class="author-avatar">JD</div>
              <div class="author-info">
                <div class="name">James Dobson</div>
                <div class="title">Spark Electrical Services · 14 years</div>
              </div>
            </div>
          </div>
        </section>

        <section class="landing-cta">
          <h2>Ready to <span class="text-gradient">Snap</span> Your Way to More Jobs?</h2>
          <p>Join 2,400+ tradespeople who've stopped doing admin and started doing what they're paid for.</p>
          <button class="btn btn-primary btn-lg" onclick="Router.navigate('dashboard')">Start Free Trial →</button>
        </section>

        <footer class="landing-footer">
          <p>© 2026 QuoteSnap. Built for trades who build things. All rights reserved.</p>
        </footer>
      </div>
    `;
  },

  /* ============ APP SHELL ============ */
  renderAppShell() {
    const state = Store.getState();
    const page = state.currentPage;
    const user = state.user;

    return `
      <div class="app-wrapper">
        <!-- Mobile sidebar overlay -->
        <div class="sidebar-overlay hidden" id="sidebar-overlay"></div>

        <!-- Sidebar -->
        <aside class="app-sidebar" id="sidebar">
          <div class="sidebar-logo">
            <span class="logo-icon">QS</span>
            <span>QuoteSnap</span>
          </div>
          <nav class="sidebar-nav">
            <div class="nav-item ${page === 'dashboard' ? 'active' : ''}" data-page="dashboard">
              <span class="nav-icon">📊</span>
              <span>Dashboard</span>
            </div>
            <div class="nav-item ${page === 'new-quote' ? 'active' : ''}" data-page="new-quote">
              <span class="nav-icon">⚡</span>
              <span>New Quote</span>
            </div>
            <div class="nav-item ${page === 'quotes' ? 'active' : ''}" data-page="quotes">
              <span class="nav-icon">📋</span>
              <span>Quotes</span>
              <span class="nav-badge">${state.quotes.length}</span>
            </div>
            <div class="nav-item ${page === 'invoices' ? 'active' : ''}" data-page="invoices">
              <span class="nav-icon">💰</span>
              <span>Invoices</span>
            </div>
            <div class="nav-item ${page === 'templates' ? 'active' : ''}" data-page="templates">
              <span class="nav-icon">📁</span>
              <span>Templates</span>
            </div>
            <div class="nav-item ${page === 'settings' ? 'active' : ''}" data-page="settings">
              <span class="nav-icon">⚙️</span>
              <span>Settings</span>
            </div>
          </nav>
          <div class="sidebar-footer">
            <div class="user-info" data-page="settings">
              <div class="user-avatar">MC</div>
              <div class="user-details">
                <div class="name">${user.name}</div>
                <div class="plan">✦ ${user.plan} Plan</div>
              </div>
            </div>
          </div>
        </aside>

        <!-- Main content -->
        <main class="app-main">
          <header class="app-header">
            <div style="display:flex;align-items:center;gap:12px;">
              <button class="mobile-menu-btn" id="mobile-menu-toggle">☰</button>
              <h2 id="page-title">${this.getPageTitle(page)}</h2>
            </div>
            <div class="app-header-actions">
              <button class="btn btn-primary btn-sm" onclick="Router.navigate('new-quote')">+ New Quote</button>
            </div>
          </header>
          <div class="page-content page-enter">
            ${this.renderPage(page)}
          </div>

          <!-- Deerflow Attribution -->
          <div class="deerflow-credit">
            <a href="https://deerflow.tech" target="_blank" title="Created by Deerflow">✦ Made by Deerflow</a>
          </div>
        </main>
      </div>

      <!-- Toast Container -->
      <div id="toast-container" class="toast-container"></div>
    `;
  },

  getPageTitle(page) {
    const titles = {
      'dashboard': 'Dashboard',
      'new-quote': 'New Quote',
      'quotes': 'All Quotes',
      'quote-detail': 'Quote Details',
      'invoices': 'Invoices',
      'templates': 'Templates',
      'settings': 'Settings'
    };
    return titles[page] || 'Dashboard';
  },

  renderPage(page) {
    switch (page) {
      case 'dashboard': return this.renderDashboard();
      case 'new-quote': return this.renderNewQuote();
      case 'quotes': return this.renderQuoteList();
      case 'quote-detail': return this.renderQuoteDetail();
      case 'invoices': return this.renderInvoices();
      case 'templates': return this.renderTemplates();
      case 'settings': return this.renderSettings();
      default: return this.renderDashboard();
    }
  },

  /* ============ DASHBOARD ============ */
  renderDashboard() {
    const state = Store.getState();
    const quotes = state.quotes;
    const totalValue = quotes.reduce((sum, q) => sum + q.amount, 0);
    const paidQuotes = quotes.filter(q => q.status === 'paid');
    const pendingQuotes = quotes.filter(q => q.status === 'sent' || q.status === 'draft');
    const conversionRate = quotes.length > 0 ? Math.round((paidQuotes.length / quotes.length) * 100) : 0;

    return `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Quotes</div>
          <div class="stat-value">${quotes.length}</div>
          <div class="stat-change up">↑ 12% this month</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Quote Value</div>
          <div class="stat-value">${formatCurrency(totalValue)}</div>
          <div class="stat-change up">↑ 8% this month</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Conversion</div>
          <div class="stat-value">${conversionRate}%</div>
          <div class="stat-change ${conversionRate >= 50 ? 'up' : 'down'}">${conversionRate >= 50 ? '↑' : '↓'} Industry avg: 42%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pending</div>
          <div class="stat-value">${pendingQuotes.length}</div>
          <div class="stat-change ${pendingQuotes.length <= 2 ? 'up' : 'down'}">${pendingQuotes.length <= 2 ? '↑ Nearly cleared' : '↓ Action needed'}</div>
        </div>
      </div>

      <div class="section-header" style="margin-top:16px;">
        <h3>Recent Quotes</h3>
        <button class="btn btn-ghost btn-sm" onclick="Router.navigate('quotes')">View All →</button>
      </div>

      <div class="recent-quotes">
        <table class="quote-table">
          <thead>
            <tr>
              <th>Quote ID</th>
              <th>Customer</th>
              <th class="hide-mobile">Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${quotes.slice(0, 5).map(q => `
              <tr style="cursor:pointer;" onclick="Router.navigate('quote-detail', ${JSON.stringify(q).replace(/"/g, '&quot;')})">
                <td><span class="quote-id">${q.id}</span></td>
                <td><span class="quote-customer">${q.customer}</span></td>
                <td class="hide-mobile">${formatDate(q.date)}</td>
                <td><span class="quote-amount">${formatCurrency(q.amount)}</span></td>
                <td><span class="status-badge ${q.status}">${q.status === 'paid' ? '✓' : q.status === 'sent' ? '→' : '○'} ${q.status}</span></td>
                <td style="text-align:right;color:var(--text-muted);">→</td>
              </tr>
            `).join('')}
            ${quotes.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No quotes yet. Create your first one!</td></tr>' : ''}
          </tbody>
        </table>
      </div>

      ${quotes.length === 0 ? `
        <div style="text-align:center;padding:60px 24px;">
          <div style="font-size:3rem;margin-bottom:16px;">🎤</div>
          <h3 style="font-family:var(--font-display);font-size:1.5rem;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:8px;">Ready to Create Your First Quote?</h3>
          <p style="color:var(--text-secondary);margin-bottom:24px;">Just speak what you did. We'll handle the paperwork.</p>
          <button class="btn btn-primary btn-lg" onclick="Router.navigate('new-quote')">Create a Quote →</button>
        </div>
      ` : ''}
    `;
  },

  /* ============ NEW QUOTE ============ */
  renderNewQuote() {
    return `
      <div class="quote-flow">
        <div class="progress-steps" id="progress-steps">
          <div class="progress-step active" data-step="1">
            <span class="step-circle">1</span>
            <span class="step-label">Voice / Describe</span>
          </div>
          <div class="progress-connector"></div>
          <div class="progress-step" data-step="2">
            <span class="step-circle">2</span>
            <span class="step-label">Line Items</span>
          </div>
          <div class="progress-connector"></div>
          <div class="progress-step" data-step="3">
            <span class="step-circle">3</span>
            <span class="step-label">Customer</span>
          </div>
          <div class="progress-connector"></div>
          <div class="progress-step" data-step="4">
            <span class="step-circle">4</span>
            <span class="step-label">Preview & Send</span>
          </div>
        </div>

        <div id="quote-step-container">
          ${this.renderVoiceStep()}
        </div>
      </div>
    `;
  },

  renderVoiceStep() {
    return `
      <div class="step-panel" id="voice-step">
        <h3>🎤 Describe the Job</h3>
        <p class="step-subtitle">Speak naturally, or type in the details. Say what you did, materials used, and any measurements.</p>

        <div class="voice-input-area">
          <textarea id="voice-text" placeholder="e.g. Full rewire of a 3-bedroom flat, new consumer unit, 6 LED downlights in kitchen, testing and certification..." rows="4"></textarea>
          <div class="voice-controls">
            <button class="voice-btn" id="voice-toggle" title="Click to speak">
              <span id="voice-icon">🎤</span>
            </button>
            <span class="voice-status" id="voice-status">Tap the mic to speak your quote</span>
          </div>
        </div>

        <div style="margin-top:20px;">
          <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:12px;">💡 Try saying something like:</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <button class="btn btn-sm btn-secondary" onclick="document.getElementById('voice-text').value = 'Rewire 3-bed semi-detached house, consumer unit upgrade, 10 new sockets, 4 new light points, testing and certificate. Labour: 5 days.'; this.style.borderColor='var(--accent)';">🏠 Rewire a house</button>
            <button class="btn btn-sm btn-secondary" onclick="document.getElementById('voice-text').value = 'Install 6 LED downlights in kitchen, new dimmer switch, wire and materials supplied, 1 day labour.'; this.style.borderColor='var(--accent)';">💡 Kitchen lights</button>
            <button class="btn btn-sm btn-secondary" onclick="document.getElementById('voice-text').value = 'Full commercial inspection and testing for small office unit, 12 circuits, EICR certificate, 3 hours on site.'; this.style.borderColor='var(--accent)';">🔌 EICR Testing</button>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn btn-ghost" onclick="Router.navigate('dashboard')">← Cancel</button>
          <button class="btn btn-primary" id="voice-next-btn">Parse & Continue →</button>
        </div>
      </div>
    `;
  },

  renderLineItemsStep(items) {
    if (!items) {
      items = [
        { description: '', quantity: 1, unit: 'job', rate: 0 }
      ];
    }

    const itemsHtml = items.map((item, i) => `
      <div class="line-item-row" data-index="${i}">
        <input type="text" class="item-desc" value="${item.description}" placeholder="Description of work / materials" />
        <input type="number" class="item-qty" value="${item.quantity}" min="1" step="1" placeholder="Qty" />
        <input type="text" class="item-unit" value="${item.unit}" placeholder="unit" />
        <input type="number" class="item-rate" value="${item.rate}" min="0" step="0.01" placeholder="Rate" />
        <span class="item-amount">${formatCurrency(item.rate * item.quantity)}</span>
        <button class="remove-item" onclick="this.closest('.line-item-row').remove(); updateLineItemsTotal();">✕</button>
      </div>
    `).join('');

    const total = items.reduce((sum, item) => sum + (item.rate * item.quantity), 0);

    return `
      <div class="step-panel" id="line-items-step">
        <h3>📋 Review Line Items</h3>
        <p class="step-subtitle">We parsed your description. Review the items below and adjust quantities or rates.</p>

        <div class="line-items-editor" id="line-items-editor">
          ${itemsHtml}
        </div>

        <div style="margin:16px 0;">
          <button class="btn btn-sm btn-secondary" onclick="addLineItem()">+ Add Line Item</button>
        </div>

        <div class="line-items-total">
          <span class="total-label">Total (exc. tax)</span>
          <span class="total-amount" id="line-items-total">${formatCurrency(total)}</span>
        </div>

        <div class="step-actions">
          <button class="btn btn-ghost" id="back-to-voice">← Back</button>
          <button class="btn btn-primary" id="items-next-btn">Customer Details →</button>
        </div>
      </div>
    `;
  },

  renderCustomerStep() {
    return `
      <div class="step-panel" id="customer-step">
        <h3>👤 Customer Details</h3>
        <p class="step-subtitle">Who's the quote for? Add their contact details so we can send the quote directly.</p>

        <div class="customer-form">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" id="cust-name" placeholder="e.g. Sarah Mitchell" />
          </div>
          <div class="form-group">
            <label>Company (optional)</label>
            <input type="text" id="cust-company" placeholder="e.g. Mitchell Properties" />
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" id="cust-email" placeholder="sarah@example.com" />
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="tel" id="cust-phone" placeholder="(555) 987-6543" />
          </div>
          <div class="form-group full-width">
            <label>Address</label>
            <textarea id="cust-address" placeholder="Full address of the job site"></textarea>
          </div>
          <div class="form-group full-width">
            <label>Notes (optional)</label>
            <textarea id="cust-notes" placeholder="Any special notes about the quote or customer..."></textarea>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn btn-ghost" id="back-to-items">← Back</button>
          <button class="btn btn-primary" id="customer-next-btn">Preview Quote →</button>
        </div>
      </div>
    `;
  },

  renderPreviewStep(quoteData) {
    const state = Store.getState();
    const user = state.user;
    const { items, customer, total } = quoteData;
    const quoteId = generateQuoteId();

    return `
      <div class="step-panel" id="preview-step">
        <h3>👀 Preview Quote</h3>
        <p class="step-subtitle">Here's how your quote looks to the customer. Make any final adjustments.</p>

        <div class="quote-preview" id="quote-preview-content">
          <div class="quote-preview-header">
            <div class="preview-brand">
              <h2>${user.business}</h2>
              <div class="tagline">${user.name} · ${user.phone}</div>
            </div>
            <div class="preview-meta">
              <div class="meta-label">Quote #</div>
              <div class="meta-value">${quoteId}</div>
              <div class="meta-label" style="margin-top:8px;">Date</div>
              <div class="meta-value">${formatDate(new Date().toISOString().split('T')[0])}</div>
            </div>
          </div>

          <div class="quote-preview-body">
            <div class="preview-customer">
              <h4>Prepared for</h4>
              <p>${customer.name}${customer.company ? ` · ${customer.company}` : ''}</p>
            </div>

            <table class="preview-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unit}</td>
                    <td>${formatCurrency(item.rate)}</td>
                    <td>${formatCurrency(item.rate * item.quantity)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="preview-total">
              <div class="total-row">
                <span class="total-label">Total Due</span>
                <span class="total-value">${formatCurrency(total)}</span>
              </div>
            </div>

            <div class="quote-preview-notes">
              <p>Payment terms: Net 30 days. Valid for 14 days.</p>
              <p>${customer.notes || 'Thank you for your business!'}</p>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn btn-ghost" id="back-to-customer">← Edit Customer</button>
          <div style="display:flex;gap:12px;">
            <button class="btn btn-secondary" id="save-as-draft">Save as Draft</button>
            <button class="btn btn-primary" id="send-quote-btn">📨 Send Quote</button>
          </div>
        </div>
      </div>
    `;
  },

  /* ============ QUOTE LIST ============ */
  renderQuoteList() {
    const quotes = Store.getState().quotes;
    const statuses = ['all', 'draft', 'sent', 'paid', 'lost'];

    return `
      <div class="section-header">
        <h3>All Quotes (${quotes.length})</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${statuses.map(s => `
            <button class="btn btn-sm ${s === 'all' ? 'btn-primary' : 'btn-secondary'}" data-filter="${s}" onclick="filterQuotes('${s}')">${s.charAt(0).toUpperCase() + s.slice(1)}</button>
          `).join('')}
        </div>
      </div>

      <div class="recent-quotes">
        <table class="quote-table" id="quote-table">
          <thead>
            <tr>
              <th>Quote ID</th>
              <th>Customer</th>
              <th class="hide-mobile">Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="quote-table-body">
            ${quotes.map(q => `
              <tr data-status="${q.status}" style="cursor:pointer;" onclick="Router.navigate('quote-detail', ${JSON.stringify(q).replace(/"/g, '&quot;')})">
                <td><span class="quote-id">${q.id}</span></td>
                <td><span class="quote-customer">${q.customer}</span></td>
                <td class="hide-mobile">${formatDate(q.date)}</td>
                <td><span class="quote-amount">${formatCurrency(q.amount)}</span></td>
                <td><span class="status-badge ${q.status}">${q.status === 'paid' ? '✓' : q.status === 'sent' ? '→' : '○'} ${q.status}</span></td>
                <td style="text-align:right;color:var(--text-muted);">→</td>
              </tr>
            `).join('')}
            ${quotes.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No quotes yet. Create your first one!</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;
  },

  /* ============ QUOTE DETAIL ============ */
  renderQuoteDetail() {
    const quote = Store.getState().currentQuote;
    if (!quote) return '<div style="text-align:center;padding:60px;">Select a quote to view details.</div>';

    return `
      <div class="quote-detail">
        <div class="quote-detail-header">
          <h2>${quote.id}</h2>
          <span class="status-badge ${quote.status}" style="font-size:0.9rem;padding:6px 18px;">${quote.status}</span>
        </div>

        <div class="quote-detail-card" style="margin-bottom:20px;">
          <div class="detail-row">
            <span class="detail-label">Customer</span>
            <span class="detail-value">${quote.customer}${quote.company ? ` · ${quote.company}` : ''}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Email</span>
            <span class="detail-value">${quote.email}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Phone</span>
            <span class="detail-value">${quote.phone}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Address</span>
            <span class="detail-value">${quote.address}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date</span>
            <span class="detail-value">${formatDate(quote.date)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Total Amount</span>
            <span class="detail-value" style="font-family:var(--font-display);font-size:1.4rem;color:var(--accent);">${formatCurrency(quote.amount)}</span>
          </div>
        </div>

        <div class="quote-detail-card" style="margin-bottom:20px;">
          <h3 style="font-family:var(--font-display);font-size:1rem;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:16px;">Line Items</h3>
          ${quote.items.map(item => `
            <div class="detail-row">
              <span class="detail-value">${item.description}</span>
              <span class="detail-value" style="font-family:var(--font-mono);">${item.quantity} × ${formatCurrency(item.rate)}</span>
            </div>
          `).join('')}
        </div>

        <div class="quote-detail-actions">
          <button class="btn btn-primary" onclick="Toast.show('Quote sent to ${quote.email}', 'success')">📨 Send Quote</button>
          <button class="btn btn-success" onclick="Toast.show('Invoice created from ${quote.id}', 'success')">💰 Convert to Invoice</button>
          <button class="btn btn-secondary" onclick="window.print()">🖨️ Print / PDF</button>
          <button class="btn btn-ghost" style="color:var(--danger);" onclick="if(confirm('Delete this quote?')) { Store.dispatch({type:'DELETE_QUOTE',payload:'${quote.id}'}); Toast.show('Quote deleted','error'); Router.navigate('quotes'); }">🗑️ Delete</button>
        </div>

        <div class="quote-detail-actions" style="margin-top:8px;">
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('quotes')">← Back to Quotes</button>
        </div>
      </div>
    `;
  },

  /* ============ INVOICES ============ */
  renderInvoices() {
    return `
      <div style="text-align:center;padding:80px 24px;">
        <div style="font-size:3rem;margin-bottom:16px;">💰</div>
        <h3 style="font-family:var(--font-display);font-size:1.5rem;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:8px;">Invoices Coming Soon</h3>
        <p style="color:var(--text-secondary);max-width:400px;margin:0 auto 24px;">Convert any accepted quote into a professional invoice with one click. Payment links included.</p>
        <button class="btn btn-primary" onclick="Toast.show('Invoicing will be ready next week!', 'info')">Notify Me When Ready</button>
      </div>
    `;
  },

  /* ============ TEMPLATES ============ */
  renderTemplates() {
    return `
      <div style="text-align:center;padding:80px 24px;">
        <div style="font-size:3rem;margin-bottom:16px;">📁</div>
        <h3 style="font-family:var(--font-display);font-size:1.5rem;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:8px;">Save Time with Templates</h3>
        <p style="color:var(--text-secondary);max-width:400px;margin:0 auto 24px;">Save common jobs as templates. One tap to pre-fill all items for repeat work.</p>
        <button class="btn btn-primary" onclick="Toast.show('Templates unlocked in Pro plan!', 'success')">Upgrade to Pro</button>
      </div>
    `;
  },

  /* ============ SETTINGS ============ */
  renderSettings() {
    const user = Store.getState().user;
    const settings = Store.getState().settings;

    return `
      <div class="settings-form">
        <div class="settings-section">
          <h3>Business Profile</h3>
          <div class="customer-form" style="grid-template-columns:1fr;">
            <div class="form-group">
              <label>Business Name</label>
              <input type="text" id="s-business" value="${user.business}" />
            </div>
            <div class="form-group" style="grid-column:1/-1;">
              <label>Your Full Name</label>
              <input type="text" id="s-name" value="${user.name}" />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="s-email" value="${user.email}" />
            </div>
            <div class="form-group">
              <label>Phone</label>
              <input type="tel" id="s-phone" value="${user.phone}" />
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h3>Logo</h3>
          <div class="logo-upload-area" id="logo-upload">
            ${settings.businessLogo ? `<img src="${settings.businessLogo}" alt="logo" />` : '+'}
          </div>
          <p style="color:var(--text-muted);font-size:0.8rem;margin-top:8px;">Upload your business logo (PNG, JPG)</p>
        </div>

        <div class="settings-section">
          <h3>Business Details</h3>
          <div class="customer-form" style="grid-template-columns:1fr 1fr;">
            <div class="form-group">
              <label>Default Tax Rate (%)</label>
              <input type="number" id="s-tax" value="${settings.defaultTaxRate}" />
            </div>
            <div class="form-group">
              <label>Payment Terms (Days)</label>
              <input type="number" id="s-terms" value="${settings.paymentTerms}" />
            </div>
            <div class="form-group">
              <label>Currency</label>
              <select id="s-currency">
                <option value="GBP" ${settings.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                <option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
              </select>
            </div>
          </div>
        </div>

        <button class="btn btn-primary btn-lg" onclick="saveSettings()">💾 Save Settings</button>
      </div>
    `;
  },

  /* ============ DYNAMIC BINDING ============ */
  bindDynamicListeners() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      el.addEventListener('click', () => {
        const page = el.dataset.page;
        Router.navigate(page);
      });
    });

    // Sidebar footer user info
    const userInfo = document.querySelector('.sidebar-footer .user-info');
    if (userInfo) {
      userInfo.addEventListener('click', () => Router.navigate('settings'));
    }

    // Mobile menu toggle
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        const overlay = document.getElementById('sidebar-overlay') || document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebar-overlay';
        if (sidebar.classList.contains('open')) {
          document.body.appendChild(overlay);
          overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.remove();
          });
        } else {
          const existing = document.getElementById('sidebar-overlay');
          if (existing) existing.remove();
        }
      });
    }

    // Landing nav links
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.dataset.nav;
        const section = document.getElementById(`${target}-section`) || document.querySelector(`.landing-${target}`);
        if (!section) {
          const sections = {
            'features': document.querySelector('.landing-demo'),
            'pricing': document.querySelector('.landing-pricing'),
            'testimonials': document.querySelector('.landing-testimonials')
          };
          if (sections[target]) sections[target].scrollIntoView({ behavior: 'smooth' });
        } else {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // === QUOTE FLOW ===

    // Voice → Next
    const voiceNextBtn = document.getElementById('voice-next-btn');
    if (voiceNextBtn) {
      voiceNextBtn.addEventListener('click', () => {
        const text = document.getElementById('voice-text').value.trim();
        if (!text) {
          Toast.show('Please describe the job first', 'error');
          return;
        }
        const items = this.parseVoiceText(text);
        this.showStep(2, items);
      });
    }

    // Voice toggle
    const voiceToggle = document.getElementById('voice-toggle');
    if (voiceToggle) {
      voiceToggle.addEventListener('click', () => {
        if (!SpeechEngine.recognition) {
          Toast.show('Speech recognition not available in this browser. Try Chrome.', 'error');
          const textarea = document.getElementById('voice-text');
          textarea.focus();
          return;
        }
        const isNowListening = SpeechEngine.toggle();
        const icon = document.getElementById('voice-icon');
        const status = document.getElementById('voice-status');
        if (isNowListening) {
          voiceToggle.classList.add('recording');
          icon.textContent = '⏹';
          status.textContent = '🎙️ Listening... speak now';
          status.classList.add('recording');
          SpeechEngine.onResult = (transcript) => {
            const textarea = document.getElementById('voice-text');
            textarea.value = transcript;
            textarea.scrollTop = textarea.scrollHeight;
          };
          SpeechEngine.onError = (error) => {
            if (error === 'not-allowed') {
              Toast.show('Microphone access denied. Please allow microphone permissions.', 'error');
            }
            voiceToggle.classList.remove('recording');
            icon.textContent = '🎤';
            status.textContent = 'Tap the mic to speak';
            status.classList.remove('recording');
          };
        } else {
          voiceToggle.classList.remove('recording');
          icon.textContent = '🎤';
          status.textContent = '✅ Captured! Review and continue';
          status.classList.remove('recording');
        }
      });
    }

    // Back to voice
    const backToVoice = document.getElementById('back-to-voice');
    if (backToVoice) {
      backToVoice.addEventListener('click', () => this.showStep(1));
    }

    // Items → Next
    const itemsNextBtn = document.getElementById('items-next-btn');
    if (itemsNextBtn) {
      itemsNextBtn.addEventListener('click', () => {
        const total = updateLineItemsTotal();
        if (total <= 0) {
          Toast.show('Please add at least one line item with a rate', 'error');
          return;
        }
        this.showStep(3);
      });
    }

    // Back to items
    const backToItems = document.getElementById('back-to-items');
    if (backToItems) {
      backToItems.addEventListener('click', () => this.showStep(2));
    }

    // Customer → Preview
    const customerNextBtn = document.getElementById('customer-next-btn');
    if (customerNextBtn) {
      customerNextBtn.addEventListener('click', () => {
        const name = document.getElementById('cust-name').value.trim();
        const email = document.getElementById('cust-email').value.trim();
        if (!name || !email) {
          Toast.show('Please enter customer name and email', 'error');
          return;
        }
        this.showStep(4);
      });
    }

    // Back to customer
    const backToCustomer = document.getElementById('back-to-customer');
    if (backToCustomer) {
      backToCustomer.addEventListener('click', () => this.showStep(3));
    }

    // Save as draft
    const saveDraft = document.getElementById('save-as-draft');
    if (saveDraft) {
      saveDraft.addEventListener('click', () => this.finalizeQuote('draft'));
    }

    // Send quote
    const sendBtn = document.getElementById('send-quote-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.finalizeQuote('sent'));
    }

    // Line item rate inputs update total
    document.querySelectorAll('.item-rate, .item-qty').forEach(el => {
      el.addEventListener('input', debounce(() => updateLineItemsTotal(), 200));
    });
  },

  /* ============ QUOTE PARSER ============ */
  parseVoiceText(text) {
    // Smart parsing: extract common patterns from natural language
    const items = [];
    const lines = text.split(/[,.\n]+/).map(l => l.trim()).filter(Boolean);

    // Known patterns
    const unitKeywords = {
      'rewire': { desc: 'Rewire', unit: 'job', defaultQty: 1, rate: 2800 },
      'consumer unit': { desc: 'Consumer Unit Upgrade', unit: 'unit', defaultQty: 1, rate: 450 },
      'downlight': { desc: 'LED Downlight Installation', unit: 'light', defaultQty: 6, rate: 85 },
      'socket': { desc: 'New Socket Installation', unit: 'socket', defaultQty: 5, rate: 55 },
      'switch': { desc: 'Light Switch Installation', unit: 'switch', defaultQty: 2, rate: 35 },
      'testing': { desc: 'Testing & Certification', unit: 'job', defaultQty: 1, rate: 250 },
      'certification': { desc: 'Testing & Certification', unit: 'job', defaultQty: 1, rate: 250 },
      'eicr': { desc: 'EICR Inspection & Test', unit: 'cert', defaultQty: 1, rate: 180 },
      'light': { desc: 'Light Fitting Installation', unit: 'light', defaultQty: 4, rate: 65 },
      'dimmer': { desc: 'Dimmer Switch Install', unit: 'switch', defaultQty: 1, rate: 45 },
      'labour': { desc: 'Labour (per day)', unit: 'day', defaultQty: 3, rate: 350 },
      'inspection': { desc: 'Inspection & Testing', unit: 'job', defaultQty: 1, rate: 200 },
      'install': { desc: 'Installation Work', unit: 'job', defaultQty: 1, rate: 500 },
      'materials': { desc: 'Materials & Supplies', unit: 'lot', defaultQty: 1, rate: 200 }
    };

    // Try to match known patterns in the full text
    const textLower = text.toLowerCase();
    const matchedPatterns = new Set();

    // Extract numbers: look for "X [unit]" patterns
    const numberPattern = /(\d+)\s*(downlight|socket|switch|light|day|unit)s?/gi;
    let match;
    while ((match = numberPattern.exec(textLower)) !== null) {
      const qty = parseInt(match[1]);
      const keyword = match[2].toLowerCase();
      if (unitKeywords[keyword]) {
        const template = { ...unitKeywords[keyword] };
        template.quantity = qty;
        template.rate = template.rate; // Keep default rate, user adjusts
        // Adjust description for quantity
        template.description = `${qty}× ${template.desc}`;
        items.push(template);
        matchedPatterns.add(keyword);
      }
    }

    // Also match general keywords
    for (const [keyword, template] of Object.entries(unitKeywords)) {
      if (matchedPatterns.has(keyword)) continue;
      if (textLower.includes(keyword)) {
        // Check if this keyword is part of a larger pattern already matched
        let alreadyCovered = false;
        for (const mp of matchedPatterns) {
          if (keyword.includes(mp) || mp.includes(keyword)) {
            alreadyCovered = true;
            break;
          }
        }
        if (!alreadyCovered) {
          items.push({ ...template, description: template.desc });
          matchedPatterns.add(keyword);
        }
      }
    }

    // If nothing parsed, create a generic catch-all item
    if (items.length === 0) {
      // Try to create a single item from the full text
      const words = text.split(/\s+/);
      const summary = words.slice(0, 8).join(' ') + (words.length > 8 ? '...' : '');
      items.push({
        description: summary || 'Electrical Work',
        quantity: 1,
        unit: 'job',
        rate: 0
      });
    }

    return items;
  },

  /* ============ STEP NAVIGATION ============ */
  showStep(step, data) {
    const container = document.getElementById('quote-step-container');
    const steps = document.querySelectorAll('.progress-step');
    const connectors = document.querySelectorAll('.progress-connector');

    // Update progress indicators
    steps.forEach((s, i) => {
      const num = i + 1;
      s.classList.remove('active', 'done');
      if (num < step) {
        s.classList.add('done');
      } else if (num === step) {
        s.classList.add('active');
      }
    });

    connectors.forEach((c, i) => {
      c.classList.toggle('done', i < step - 1);
    });

    // Gather data from previous steps
    let quoteData = {};

    // Step 1: Voice
    if (step >= 2) {
      const text = document.getElementById('voice-text').value.trim();
      const parsedItems = data || this.parseVoiceText(text);
      quoteData.voiceText = text;
      quoteData.items = parsedItems;

      if (step === 2) {
        container.innerHTML = this.renderLineItemsStep(parsedItems);
        // Recalculate total
        setTimeout(() => updateLineItemsTotal(), 50);
        return;
      }
    }

    // Step 3: Customer
    if (step >= 3) {
      // Get items from the editor
      const editor = document.getElementById('line-items-editor');
      if (editor) {
        const rows = editor.querySelectorAll('.line-item-row');
        const items = Array.from(rows).map(row => ({
          description: row.querySelector('.item-desc').value,
          quantity: parseFloat(row.querySelector('.item-qty').value) || 1,
          unit: row.querySelector('.item-unit').value || 'job',
          rate: parseFloat(row.querySelector('.item-rate').value) || 0
        }));
        quoteData.items = items;
      }

      if (step === 3) {
        container.innerHTML = this.renderCustomerStep();
        return;
      }
    }

    // Step 4: Preview
    if (step === 4) {
      // Get customer data
      const customer = {
        name: document.getElementById('cust-name').value.trim(),
        company: document.getElementById('cust-company').value.trim(),
        email: document.getElementById('cust-email').value.trim(),
        phone: document.getElementById('cust-phone').value.trim(),
        address: document.getElementById('cust-address').value.trim(),
        notes: document.getElementById('cust-notes').value.trim()
      };
      quoteData.customer = customer;

      // Get items again
      const editor = document.getElementById('line-items-editor');
      if (editor) {
        const rows = editor.querySelectorAll('.line-item-row');
        const items = Array.from(rows).map(row => ({
          description: row.querySelector('.item-desc').value,
          quantity: parseFloat(row.querySelector('.item-qty').value) || 1,
          unit: row.querySelector('.item-unit').value || 'job',
          rate: parseFloat(row.querySelector('.item-rate').value) || 0
        }));
        quoteData.items = items;
      }

      quoteData.total = quoteData.items.reduce((sum, item) => sum + (item.rate * item.quantity), 0);

      container.innerHTML = this.renderPreviewStep(quoteData);
      return;
    }

    // Fallback to step 1
    container.innerHTML = this.renderVoiceStep();
  },

  /* ============ FINALIZE QUOTE ============ */
  finalizeQuote(status) {
    const state = Store.getState();
    const user = state.user;

    // Get all current data from the DOM
    const previewContent = document.getElementById('quote-preview-content');
    if (!previewContent) {
      Toast.show('Something went wrong. Please start again.', 'error');
      return;
    }

    // We need to rebuild from stored data
    const voiceTextInput = document.getElementById('voice-text');
    const voiceText = voiceTextInput ? voiceTextInput.value : '';

    // Extract from preview or stored data
    const quoteData = {
      id: generateQuoteId(),
      customer: document.getElementById('cust-name')?.value || 'Unknown',
      company: document.getElementById('cust-company')?.value || '',
      email: document.getElementById('cust-email')?.value || '',
      phone: document.getElementById('cust-phone')?.value || '',
      address: document.getElementById('cust-address')?.value || '',
      notes: document.getElementById('cust-notes')?.value || '',
      date: new Date().toISOString().split('T')[0],
      status: status,
      items: [],
      amount: 0
    };

    // Try to get items from line items editor if still in DOM
    const editor = document.getElementById('line-items-editor');
    if (editor) {
      const rows = editor.querySelectorAll('.line-item-row');
      quoteData.items = Array.from(rows).map(row => ({
        description: row.querySelector('.item-desc').value,
        quantity: parseFloat(row.querySelector('.item-qty').value) || 1,
        unit: row.querySelector('.item-unit').value || 'job',
        rate: parseFloat(row.querySelector('.item-rate').value) || 0
      }));
    }

    quoteData.amount = quoteData.items.reduce((sum, item) => sum + (item.rate * item.quantity), 0);

    // Save
    Store.dispatch({ type: 'ADD_QUOTE', payload: quoteData });

    // Show success
    if (status === 'sent') {
      Toast.show(`✅ Quote ${quoteData.id} sent to ${quoteData.customer}!`, 'success');
    } else {
      Toast.show(`💾 Quote ${quoteData.id} saved as draft`, 'info');
    }

    Router.navigate('dashboard');
  }
};

/* ============ GLOBAL FUNCTIONS ============ */

function addLineItem() {
  const editor = document.getElementById('line-items-editor');
  const index = editor.children.length;
  const row = document.createElement('div');
  row.className = 'line-item-row';
  row.dataset.index = index;
  row.innerHTML = `
    <input type="text" class="item-desc" value="" placeholder="Description of work / materials" />
    <input type="number" class="item-qty" value="1" min="1" step="1" placeholder="Qty" />
    <input type="text" class="item-unit" value="job" placeholder="unit" />
    <input type="number" class="item-rate" value="0" min="0" step="0.01" placeholder="Rate" />
    <span class="item-amount">£0.00</span>
    <button class="remove-item" onclick="this.closest('.line-item-row').remove(); updateLineItemsTotal();">✕</button>
  `;
  editor.appendChild(row);

  // Bind events
  row.querySelectorAll('.item-rate, .item-qty').forEach(el => {
    el.addEventListener('input', debounce(() => updateLineItemsTotal(), 200));
  });
}

function updateLineItemsTotal() {
  const rows = document.querySelectorAll('.line-item-row');
  let total = 0;
  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
    const amount = qty * rate;
    total += amount;
    const amountEl = row.querySelector('.item-amount');
    if (amountEl) amountEl.textContent = formatCurrency(amount);
  });
  const totalEl = document.getElementById('line-items-total');
  if (totalEl) totalEl.textContent = formatCurrency(total);
  return total;
}

function filterQuotes(filter) {
  const rows = document.querySelectorAll('#quote-table-body tr');
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.className = `btn btn-sm ${btn.dataset.filter === filter ? 'btn-primary' : 'btn-secondary'}`;
  });
  rows.forEach(row => {
    if (filter === 'all' || row.dataset.status === filter) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function saveSettings() {
  const updates = {
    business: document.getElementById('s-business').value,
    name: document.getElementById('s-name').value,
    email: document.getElementById('s-email').value,
    phone: document.getElementById('s-phone').value
  };
  Store.dispatch({ type: 'UPDATE_USER', payload: updates });
  Store.dispatch({ type: 'UPDATE_SETTINGS', payload: {
    defaultTaxRate: parseFloat(document.getElementById('s-tax').value) || 20,
    paymentTerms: parseInt(document.getElementById('s-terms').value) || 30,
    currency: document.getElementById('s-currency').value
  }});
  Toast.show('✅ Settings saved successfully!', 'success');
}

// Init when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  Render.init();
});
