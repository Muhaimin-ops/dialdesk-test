'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

const BUSINESS_ID = '23ec95f8-8372-4266-9719-a09b9540da84';

type WidgetStatus = 'loading' | 'ready' | 'failed';

export default function SampleWebsite() {
  const [origin, setOrigin] = useState('http://localhost:3000');
  const [status, setStatus] = useState<WidgetStatus>('loading');
  const [copied, setCopied] = useState(false);
  const [scriptAttempt, setScriptAttempt] = useState(0);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const snippet = `<script src="${origin}/widget.js" data-business="${BUSINESS_ID}" defer></script>`;

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function openWidget() {
    const button = document.getElementById('dialdesk-widget');
    if (button instanceof HTMLButtonElement) {
      button.click();
      return;
    }
    setStatus('failed');
  }

  return (
    <main className="sample-site">
      <Script
        id="sample-dialdesk-widget"
        key={scriptAttempt}
        src="/widget.js"
        data-business={BUSINESS_ID}
        strategy="afterInteractive"
        onReady={() => {
          setStatus(
            document.getElementById('dialdesk-widget') ? 'ready' : 'failed',
          );
        }}
        onError={() => setStatus('failed')}
      />

      <header className="sample-header">
        <a href="#home" className="sample-brand" aria-label="Northstar Dental home">
          <span className="sample-brand-mark" aria-hidden="true">N</span>
          <span>Northstar <strong>Dental</strong></span>
        </a>
        <nav aria-label="Main navigation" className="sample-nav">
          <a href="#care">Our care</a>
          <a href="#visit">Visit us</a>
          <button className="sample-nav-cta" type="button" onClick={openWidget}>
            Talk to our team
          </button>
        </nav>
      </header>

      <section id="home" className="sample-hero">
        <div className="sample-hero-copy">
          <p className="sample-eyebrow">A sample practice website</p>
          <h1>Good care starts with a conversation.</h1>
          <p className="sample-lede">
            Get clear answers, find a time that works, and feel at ease before you arrive.
          </p>
          <button className="sample-primary" type="button" onClick={openWidget}>
            Talk to the front desk <span aria-hidden="true">↗</span>
          </button>
          <p className="sample-note">The voice assistant opens from the widget in the corner.</p>
        </div>
        <div className="sample-hero-image">
          <img
            src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1400&q=85"
            alt="Bright, welcoming dental clinic reception"
            fetchPriority="high"
          />
          <p className="sample-image-caption">Comfortable care, from the first hello.</p>
        </div>
      </section>

      <section id="care" className="sample-care">
        <div className="sample-care-heading">
          <h2>Care that fits real life.</h2>
          <p>Ask about a visit, check availability, or leave a message for our team.</p>
        </div>
        <div className="sample-services">
          <article>
            <span>01</span>
            <h3>Routine visits</h3>
            <p>Cleanings and checkups that help you stay on top of your dental health.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Restorative care</h3>
            <p>Talk through a concern and let our team help plan the next step.</p>
          </article>
          <article>
            <span>03</span>
            <h3>New patients</h3>
            <p>Ask what to bring and find a first appointment that suits your schedule.</p>
          </article>
        </div>
      </section>

      <section id="visit" className="sample-visit">
        <div>
          <p className="sample-eyebrow">A real widget, running locally</p>
          <h2>Test the complete embed.</h2>
          <p>
            The floating button below is loaded from this app using the same script tag
            you can add to another website.
          </p>
          <div className="sample-widget-controls">
            <div className={`sample-status sample-status-${status}`} role="status" aria-live="polite">
              <span aria-hidden="true" />
              {status === 'loading' && 'Loading widget script'}
              {status === 'ready' && 'Widget button is ready'}
              {status === 'failed' && 'Widget did not load. Check the app server and try again.'}
            </div>
            {status === 'failed' && (
              <button
                className="sample-retry"
                type="button"
                onClick={() => {
                  setStatus('loading');
                  setScriptAttempt((attempt) => attempt + 1);
                }}
              >
                Retry loading
              </button>
            )}
          </div>
        </div>
        <div className="sample-code">
          <div className="sample-code-header">
            <span>Embed code</span>
            <button type="button" onClick={copySnippet} aria-live="polite">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre><code>{snippet}</code></pre>
          <p>Business ID: {BUSINESS_ID}</p>
        </div>
      </section>

      <footer className="sample-footer">
        <a href="#home" className="sample-brand">
          <span className="sample-brand-mark" aria-hidden="true">N</span>
          <span>Northstar <strong>Dental</strong></span>
        </a>
        <p>Sample site for testing DialDesk widget integration.</p>
      </footer>
    </main>
  );
}
