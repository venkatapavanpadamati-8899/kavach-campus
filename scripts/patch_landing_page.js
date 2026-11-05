const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(
  "import React from 'react';",
  "import React, { useState } from 'react';"
);

code = code.replace(
  "  UserCheck\n} from 'lucide-react';",
  "  UserCheck,\n  Menu,\n  X\n} from 'lucide-react';"
);

code = code.replace(
  'export default function LandingPage() {',
  'export default function LandingPage() {\n  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);'
);

const oldNavActions = `        {/* Right CTA / Sign In */}
        <div className={styles.navActions}>
          <Link href="/login" className={styles.signInBtn}>
            <User size={16} />
            <span>Sign In</span>
          </Link>
        </div>
      </nav>`;

const newNavActions = `        {/* Right CTA / Sign In */}
        <div className={styles.navActions}>
          <Link href="/login" className={styles.signInBtn}>
            <User size={16} />
            <span>Sign In</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            className={styles.mobileMenuBtn}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className={styles.mobileNavDropdown}>
          <Link href="/" className={styles.mobileNavDropdownLink} onClick={() => setMobileMenuOpen(false)}>
            Home
          </Link>
          <a href="#safety-features" className={styles.mobileNavDropdownLink} onClick={() => setMobileMenuOpen(false)}>
            Safety Features
          </a>
          <a href="#how-it-works" className={styles.mobileNavDropdownLink} onClick={() => setMobileMenuOpen(false)}>
            How It Works
          </a>
          <Link href="/features" className={styles.mobileNavDropdownLink} onClick={() => setMobileMenuOpen(false)}>
            Platform Capabilities
          </Link>
          <Link href="/about" className={styles.mobileNavDropdownLink} onClick={() => setMobileMenuOpen(false)}>
            About Us
          </Link>
          <Link href="/contact" className={styles.mobileNavDropdownLink} onClick={() => setMobileMenuOpen(false)}>
            Campus Helpdesk & Contact
          </Link>
          <Link href="/privacy" className={styles.mobileNavDropdownLink} onClick={() => setMobileMenuOpen(false)}>
            Privacy Charter
          </Link>
        </div>
      )}`;

code = code.replace(/\r\n/g, '\n');
code = code.replace(oldNavActions, newNavActions);

fs.writeFileSync('src/app/page.tsx', code, 'utf-8');
console.log('Updated landing page navigation');

