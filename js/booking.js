/* ============================================================
   ASHOKA WATER PARK & RESORT — Booking & Inquiry JS
   Form handling, WhatsApp builder, Pricing calculator
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ---------- Booking Calculator ----------
  const calcForm = document.getElementById('booking-calculator-form');

  if (calcForm) {
    const roomTypeSelect = calcForm.querySelector('#calc-room-type');
    const adultsInput = calcForm.querySelector('#calc-adults');
    const childrenInput = calcForm.querySelector('#calc-children');
    const nightsInput = calcForm.querySelector('#calc-nights');
    const roomCostEl = document.getElementById('calc-room-cost');
    const parkCostEl = document.getElementById('calc-park-cost');
    const totalEl = document.getElementById('calc-total');

    const PRICES = {
      'waterpark': { room: 0, park: 200, label: 'Water Park Only' },
      'deluxe': { room: 3000, park: 0, label: 'Deluxe Room' },
      'family': { room: 5000, park: 0, label: 'Family Suite' },
      'glamping': { room: 5000, park: 0, label: 'Glamping Tent' }
    };

    function updateCalculator() {
      const type = roomTypeSelect ? roomTypeSelect.value : 'waterpark';
      const adults = parseInt(adultsInput?.value) || 1;
      const children = parseInt(childrenInput?.value) || 0;
      const nights = parseInt(nightsInput?.value) || 1;
      const price = PRICES[type] || PRICES['waterpark'];

      const totalGuests = adults + children;
      let roomCost = 0;
      let parkCost = 0;

      if (type === 'waterpark') {
        // Water park only — per person
        parkCost = price.park * totalGuests;
      } else {
        // Room booking — includes water park
        roomCost = price.room * nights;
        parkCost = 0; // included
      }

      const total = roomCost + parkCost;

      if (roomCostEl) roomCostEl.textContent = '₹' + roomCost.toLocaleString('en-IN');
      if (parkCostEl) parkCostEl.textContent = type === 'waterpark' ? '₹' + parkCost.toLocaleString('en-IN') : 'Included';
      if (totalEl) totalEl.textContent = '₹' + total.toLocaleString('en-IN');
    }

    [roomTypeSelect, adultsInput, childrenInput, nightsInput].forEach(input => {
      if (input) {
        input.addEventListener('input', updateCalculator);
        input.addEventListener('change', updateCalculator);
      }
    });

    updateCalculator(); // Initial calculation

    // Proceed to inquiry
    const proceedBtn = calcForm.querySelector('.btn-primary');
    if (proceedBtn) {
      proceedBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'contact.html';
      });
    }

    // Book on WhatsApp from calculator
    const calcWhatsappBtn = calcForm.querySelector('.btn-whatsapp');
    if (calcWhatsappBtn) {
      calcWhatsappBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const type = roomTypeSelect?.value || 'waterpark';
        const adults = adultsInput?.value || '1';
        const children = childrenInput?.value || '0';
        const nights = nightsInput?.value || '1';
        const total = totalEl?.textContent || '';
        const label = PRICES[type]?.label || 'Water Park';

        const message = `Hi! I'd like to book at Ashoka Water Park & Resort.\n\n` +
          `📋 *Booking Details:*\n` +
          `• Package: ${label}\n` +
          `• Adults: ${adults}\n` +
          `• Children: ${children}\n` +
          `• Nights: ${nights}\n` +
          `• Estimated Total: ${total}\n\n` +
          `Please confirm availability and pricing.`;

        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/919619900019?text=${encoded}`, '_blank');
      });
    }
  }

  // ---------- Inquiry Form ----------
  const inquiryForm = document.getElementById('inquiry-form');

  if (inquiryForm) {
    inquiryForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = {
        name: inquiryForm.querySelector('#inquiry-name')?.value?.trim() || '',
        phone: inquiryForm.querySelector('#inquiry-phone')?.value?.trim() || '',
        email: inquiryForm.querySelector('#inquiry-email')?.value?.trim() || '',
        type: inquiryForm.querySelector('#inquiry-type')?.value || 'General Inquiry',
        checkin: inquiryForm.querySelector('#inquiry-checkin')?.value || '',
        guests: inquiryForm.querySelector('#inquiry-guests')?.value || '1',
        message: inquiryForm.querySelector('#inquiry-message')?.value?.trim() || ''
      };

      // Validation
      if (!formData.name || !formData.phone) {
        window.showToast?.('Please fill in your name and phone number.', 'error');
        return;
      }

      if (formData.phone.length < 10) {
        window.showToast?.('Please enter a valid phone number.', 'error');
        return;
      }

      // Save to database
      try {
        const submitBtn = inquiryForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting...';
        }

        if (window.ashokaDB) {
          await window.ashokaDB.add('inquiries', formData);
        }

        window.showToast?.('Your inquiry has been submitted successfully! We will contact you soon.', 'success');
        inquiryForm.reset();

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Inquiry';
        }

        // Offer WhatsApp redirect
        setTimeout(() => {
          const shouldRedirect = confirm(
            'Would you like to also reach us on WhatsApp for a faster response?'
          );
          if (shouldRedirect) {
            sendWhatsAppInquiry(formData);
          }
        }, 1000);

      } catch (error) {
        console.error('Form submission error:', error);
        window.showToast?.('Something went wrong. Please try again or contact us on WhatsApp.', 'error');
      }
    });
  }

  // ---------- WhatsApp Booking Button ----------
  const whatsappBookingBtn = document.getElementById('whatsapp-booking-btn');

  if (whatsappBookingBtn) {
    whatsappBookingBtn.addEventListener('click', () => {
      const form = document.getElementById('inquiry-form');
      if (!form) {
        window.open('https://wa.me/919619900019?text=Hi! I\'d like to book at Ashoka Water Park %26 Resort.', '_blank');
        return;
      }

      const formData = {
        name: form.querySelector('#inquiry-name')?.value?.trim() || '',
        phone: form.querySelector('#inquiry-phone')?.value?.trim() || '',
        email: form.querySelector('#inquiry-email')?.value?.trim() || '',
        type: form.querySelector('#inquiry-type')?.value || 'General Inquiry',
        checkin: form.querySelector('#inquiry-checkin')?.value || '',
        guests: form.querySelector('#inquiry-guests')?.value || '',
        message: form.querySelector('#inquiry-message')?.value?.trim() || ''
      };

      sendWhatsAppInquiry(formData);
    });
  }

  // ---------- WhatsApp Message Builder ----------
  function sendWhatsAppInquiry(data) {
    let message = `Hi! I'd like to make a booking at Ashoka Water Park & Resort.\n\n`;
    message += `📋 *Inquiry Details:*\n`;

    if (data.name) message += `• Name: ${data.name}\n`;
    if (data.phone) message += `• Phone: ${data.phone}\n`;
    if (data.email) message += `• Email: ${data.email}\n`;
    if (data.type) message += `• Inquiry Type: ${data.type}\n`;
    if (data.checkin) message += `• Preferred Date: ${data.checkin}\n`;
    if (data.guests) message += `• Number of Guests: ${data.guests}\n`;
    if (data.message) message += `\n💬 *Message:*\n${data.message}\n`;

    message += `\nPlease confirm availability. Thank you!`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/919619900019?text=${encoded}`, '_blank');
  }

  // ---------- Room Booking Buttons ----------
  document.querySelectorAll('[data-book-room]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const roomType = btn.getAttribute('data-book-room') || 'Room';
      const price = btn.getAttribute('data-price') || '';

      const message = `Hi! I'd like to book a *${roomType}* at Ashoka Water Park & Resort.\n\n` +
        (price ? `💰 Listed Price: ${price}\n\n` : '') +
        `Please let me know about availability and confirm the booking. Thank you!`;

      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/919619900019?text=${encoded}`, '_blank');
    });
  });

});
