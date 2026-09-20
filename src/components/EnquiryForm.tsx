'use client';

import { useEffect, useRef } from 'react';
import '@/styles/enquiry-form.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const configured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseKey.includes('sb_publishable_xxxxx')
);

// Enquiry form — public submission straight to Supabase. The RLS policy allows
// public insert for the enquiries table, so this runs fully client-side.
export default function EnquiryForm() {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    // Get sub-category ID from URL if on a product / sub-category page
    const urlParams = new URLSearchParams(window.location.search);
    const subCategoryId = urlParams.get('sub_category_id');
    const subCategoryIdInput = document.getElementById('sub-category-id') as HTMLInputElement | null;
    if (subCategoryId && subCategoryIdInput) {
      subCategoryIdInput.value = subCategoryId;
    }

    const onSubmit = async (e: Event) => {
      e.preventDefault();

      const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement | null;
      const submitText = document.getElementById('submit-text');
      const submitLoading = document.getElementById('submit-loading');
      const formMessage = document.getElementById('form-message');

      if (!submitBtn || !submitText || !submitLoading || !formMessage) return;

      // Disable button and show loading
      submitBtn.disabled = true;
      submitText.style.display = 'none';
      submitLoading.style.display = 'inline';

      // Get form data
      const formData = new FormData(form);
      const data = {
        sub_category_id: formData.get('sub_category_id') || null,
        name: formData.get('name'),
        company: formData.get('company') || null,
        phone: formData.get('phone'),
        email: formData.get('email') || null,
        quantity: formData.get('quantity') || null,
        message: formData.get('message') || null
      };

      try {
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabase configuration missing');
        }

        const response = await fetch(`${supabaseUrl}/rest/v1/enquiries`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({
            ...data,
            status: 'new'
          })
        });

        if (response.ok) {
          formMessage.textContent = 'Thank you for your enquiry! We will contact you soon.';
          formMessage.className = 'form-message success';
          formMessage.style.display = 'block';
        } else {
          const error = await response.json();
          formMessage.textContent = error.message || 'Something went wrong. Please try again.';
          formMessage.className = 'form-message error';
          formMessage.style.display = 'block';
        }
      } catch {
        formMessage.textContent = 'Network error. Please check your connection and try again.';
        formMessage.className = 'form-message error';
        formMessage.style.display = 'block';
      } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitText.style.display = 'inline';
        submitLoading.style.display = 'none';
      }
    };

    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, []);

  return (
    <div id="enquiry-form-container">
      <form id="enquiry-form" className="enquiry-form" ref={formRef}>
        <input type="hidden" id="sub-category-id" name="sub_category_id" value="" />

        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input type="text" id="name" name="name" required placeholder="Your name" />
        </div>

        <div className="form-group">
          <label htmlFor="company">Company</label>
          <input type="text" id="company" name="company" placeholder="Company name" />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone *</label>
          <input type="tel" id="phone" name="phone" required placeholder="+91 XXXXX XXXXX" />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" name="email" placeholder="your@email.com" />
        </div>

        <div className="form-group">
          <label htmlFor="quantity">Quantity</label>
          <input type="text" id="quantity" name="quantity" placeholder="e.g., 100 pieces" />
        </div>

        <div className="form-group">
          <label htmlFor="message">Message</label>
          <textarea id="message" name="message" rows={4} placeholder="Tell us about your requirements..."></textarea>
        </div>

        <button type="submit" className="btn btn-primary" id="submit-btn">
          <span id="submit-text">Send Enquiry</span>
          <span id="submit-loading" style={{ display: 'none' }}>Sending...</span>
        </button>

        <div id="form-message" className="form-message" style={{ display: 'none' }}></div>

        {!configured && (
          <p style={{ fontSize: '0.78rem', color: 'var(--steel)', marginTop: 12 }}>
            Online enquiry is not yet connected. Use phone/WhatsApp for immediate assistance.
          </p>
        )}
      </form>
    </div>
  );
}