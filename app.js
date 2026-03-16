
const STRIPE_KEY = 'pk_live_51TBehPDMcmmj7Vo6WQPtdmOnZuN5QvocG43prYtIfwDZCaQpE62zPiimR9no6ssHqRYQaGMM8IC3VgWutc3TBVf300tg0SPlY0';
const HOLIDAYS = ["2025-01-01", "2025-01-20", "2025-02-17", "2025-05-26", "2025-06-19", "2025-07-04", "2025-09-01", "2025-10-13", "2025-11-11", "2025-11-27", "2025-12-25", "2026-01-01", "2026-01-19", "2026-02-16", "2026-05-25", "2026-06-19", "2026-07-04", "2026-09-07", "2026-10-12", "2026-11-11", "2026-11-26", "2026-12-25"];
const CALENDLY_LINKS = {
  beth: 'https://calendly.com/beth-notarybluegrass/signing',
  luiggi: 'https://calendly.com/luiggi-notarybluegrass/signing'
};
function getDuration(packageLabel) {
  if (packageLabel.includes('1-5')) return 30;
  if (packageLabel.includes('6-25')) return 60;
  if (packageLabel.includes('26-100')) return 90;
  if (packageLabel.includes('100-130') || packageLabel.includes('131+')) return 120;
  return 60;
}
let stripe, cardElement;
let booking = {agent:'',packageFee:0,packageLabel:'',mileageFee:0,afterHoursFee:0,holidayFee:0,witnessFee:0,signerFee:0,selectedTime:'',isAfterHours:false,isHoliday:false};
let currentStep = 1;
const TOTAL_STEPS = 6;

function initStripe() {
  if (!stripe) {
    if (typeof Stripe === 'undefined') {
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      s.onload = function() {
        stripe = Stripe(STRIPE_KEY);
        const elements = stripe.elements();
        cardElement = elements.create('card', {style:{base:{fontSize:'16px',color:'#1a2744','::placeholder':{color:'#9ca3af'}},invalid:{color:'#e53e3e'}}});
        cardElement.mount('#card-element');
        cardElement.on('change', e => { document.getElementById('card-errors').textContent = e.error ? e.error.message : ''; });
      };
      document.head.appendChild(s);
      return;
    }
    stripe = Stripe(STRIPE_KEY);
    const elements = stripe.elements();
    cardElement = elements.create('card', {style:{base:{fontSize:'16px',color:'#1a2744','::placeholder':{color:'#9ca3af'}},invalid:{color:'#e53e3e'}}});
    cardElement.mount('#card-element');
    cardElement.on('change', e => { document.getElementById('card-errors').textContent = e.error ? e.error.message : ''; });
  }
}

function openBooking(agent) {
  try {
    booking = {agent,packageFee:0,packageLabel:'',mileageFee:0,afterHoursFee:0,holidayFee:0,witnessFee:0,signerFee:0,selectedTime:'',isAfterHours:false,isHoliday:false};
    document.getElementById('bookingAgentLabel').textContent = 'with ' + (agent === 'beth' ? 'Beth' : 'Luiggi');
    document.getElementById('bookingOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    currentStep = 1;
    showStep(1);
    updateProgress();
  } catch(e) { alert('Error opening booking: ' + e.message); }
}

function closeBooking() {
  document.getElementById('bookingOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function goStep(n) {
  if (n === 2 && !booking.packageFee) { alert('Please select a package size first.'); return; }
  if (n === 3) loadCalendly();
  if (n === 5) buildPolicySummary();
  if (n === 6) { buildPaymentSummary(); initStripe(); }
  currentStep = n;
  showStep(n);
  updateProgress();
  document.querySelector('.booking-modal').scrollTop = 0;
}

function showStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(n === 'success' ? 'stepSuccess' : 'step' + n);
  if (el) el.classList.add('active');
}

function updateProgress() {
  const prog = document.getElementById('stepProgress');
  prog.innerHTML = '';
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const d = document.createElement('div');
    d.className = 'step-dot' + (i <= currentStep ? ' done' : '');
    prog.appendChild(d);
  }
}

function loadCalendly() {
  const embed = document.getElementById('calendlyEmbed');
  embed.innerHTML = '';
  const duration = getDuration(booking.packageLabel);
  const url = CALENDLY_LINKS[booking.agent] + '?hide_gdpr_banner=1&primary_color=c9a84c&duration=' + duration;
  embed.innerHTML = '<div class="calendly-inline-widget" data-url="' + url + '"></div>';
  const existing = document.getElementById('calendlyScript');
  if (existing) existing.remove();
  const s = document.createElement('script');
  s.id = 'calendlyScript';
  s.src = 'https://assets.calendly.com/assets/external/widget.js';
  s.async = true;
  document.head.appendChild(s);
}

function selectPackage(el, fee, label) {
  document.querySelectorAll('.radio-option').forEach(r => r.classList.remove('selected'));
  el.classList.add('selected');
  booking.packageFee = fee;
  booking.packageLabel = label;
  booking.extraPagesFee = 0;
  document.getElementById('copyOptionWrap').style.display = 'block';
  const isExtra = label === '131+ pages';
  document.getElementById('extraPagesWrap').style.display = isExtra ? 'block' : 'none';
  if (!isExtra) { document.getElementById('extraPages').value = ''; document.getElementById('extraPagesResult').textContent = ''; }
}
function calcExtraPages() {
  const pages = parseInt(document.getElementById('extraPages').value) || 0;
  booking.extraPagesFee = Math.round(pages * 0.50 * 100) / 100;
  document.getElementById('extraPagesResult').textContent = pages > 0 ?
    pages + ' extra pages x $0.50 = $' + booking.extraPagesFee.toFixed(2) + ' added to total' : '';
}

function toggleCopy(el) { el.classList.toggle('selected'); }
function toggleTable(el) { el.classList.toggle('selected'); }
function toggleWitness(el) {
  el.classList.toggle('selected');
  booking.witnessFee = document.getElementById('needsWitness').checked ? 50 : 0;
}
function calcSigners() {
  const count = parseInt(document.getElementById('signerCount').value);
  booking.signerFee = count > 2 ? (count - 2) * 25 : 0;
}

window.addEventListener('message', function(e) {
  if (e.data && e.data.event === 'calendly.event_scheduled') {
    const startTime = e.data.payload && e.data.payload.event ? e.data.payload.event.start_time : '';
    if (startTime) {
      booking.selectedTime = startTime;
      const d = new Date(startTime);
      const h = d.getHours();
      booking.isAfterHours = (h >= 20 || h < 8);
      booking.afterHoursFee = booking.isAfterHours ? 25 : 0;
      const dateOnly = startTime.split('T')[0];
      booking.isHoliday = HOLIDAYS.includes(dateOnly);
      booking.holidayFee = booking.isHoliday ? 35 : 0;
      const display = d.toLocaleString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
      const el = document.getElementById('selectedTimeDisplay');
      el.style.display = 'block';
      el.innerHTML = '&#x2705; Selected: <strong>' + display + '</strong>' +
        (booking.isAfterHours ? ' <span style="color:#e53e3e;">&middot; After Hours (+$25)</span>' : '') +
        (booking.isHoliday ? ' <span style="color:#e53e3e;">&middot; Holiday (+$35)</span>' : '');
      document.getElementById('step3Next').style.display = 'flex';
    }
  }
});

function calcTotal() {
  return booking.packageFee + (booking.extraPagesFee || 0) + booking.mileageFee + booking.afterHoursFee + booking.holidayFee + booking.witnessFee + booking.signerFee;
}

function buildPriceSummaryHTML() {
  const lines = [
    ['Package (' + booking.packageLabel + ')', '$' + booking.packageFee],
    (booking.extraPagesFee > 0) ? ['Extra pages fee', '+$' + (booking.extraPagesFee||0).toFixed(2)] : null,
    booking.mileageFee > 0 ? ['Travel fee', '+$' + booking.mileageFee] : null,
    booking.afterHoursFee > 0 ? ['After-hours fee', '+$25'] : null,
    booking.holidayFee > 0 ? ['Holiday fee', '+$35'] : null,
    booking.witnessFee > 0 ? ['Witness fee', '+$50'] : null,
    booking.signerFee > 0 ? ['Additional signers', '+$' + booking.signerFee] : null,
  ].filter(Boolean);
  let html = '<div class="price-summary"><div class="price-summary-title">Booking Summary</div>';
  lines.forEach(l => html += '<div class="price-line"><span>' + l[0] + '</span><span>' + l[1] + '</span></div>');
  html += '<div class="price-line total"><span>Total Due</span><span>$' + calcTotal() + '</span></div></div>';
  return html;
}

function buildPolicySummary() { document.getElementById('finalPriceSummary').innerHTML = buildPriceSummaryHTML(); }
function buildPaymentSummary() {
  document.getElementById('paymentSummary').innerHTML =
    '<div class="price-summary"><div class="price-summary-title">Amount to Charge</div>' +
    '<div class="price-line total"><span>Total</span><span>$' + calcTotal() + '</span></div></div>';
}

function checkAgree() {
  const btn = document.getElementById('proceedPayBtn');
  const checked = document.getElementById('agreeBox').checked;
  btn.disabled = !checked;
  btn.style.opacity = checked ? '1' : '0.5';
  btn.style.cursor = checked ? 'pointer' : 'not-allowed';
}

async function processPayment() {
  const btn = document.getElementById('payBtn');
  btn.disabled = true;
  btn.textContent = 'Processing…';
  const name = document.getElementById('cardName').value;
  if (!name) { btn.disabled = false; btn.textContent = 'Pay & Confirm Booking'; document.getElementById('card-errors').textContent = 'Please enter the name on your card.'; return; }
  const {paymentMethod, error} = await stripe.createPaymentMethod({type:'card',card:cardElement,billing_details:{name}});
  if (error) {
    document.getElementById('card-errors').textContent = error.message;
    btn.disabled = false; btn.textContent = 'Pay & Confirm Booking';
    return;
  }
  try {
    await fetch('https://formspree.io/f/mdalpydd', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        _subject: 'NEW BOOKING - NotaryBluegrass.com',
        agent: booking.agent,
        customer_name: document.getElementById('customerName').value,
        customer_phone: document.getElementById('customerPhone').value,
        customer_email: document.getElementById('customerEmail').value,
        package: booking.packageLabel,
        address: document.getElementById('signingAddress').value,
        scheduled_time: booking.selectedTime,
        document_type: document.getElementById('docType').value,
        comments: document.getElementById('comments').value,
        total_charged: '$' + calcTotal(),
        after_hours: booking.isAfterHours,
        holiday: booking.isHoliday,
        ng.witnessFee > 0,
        stripe_payment_method: paymentMethod.id
      })
    });
  } catch(e) {}
  currentStep = 'success';
  showStep('success');
}

function toggleForm(formId, btnId) {
  const wrap = document.getElementById(formId);
  const btn = document.getElementById(btnId);
  wrap.classList.toggle('open');
  btn.classList.toggle('open');
}

document.getElementById('bookingOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeBooking();
});

// EVENT DELEGATION - handles all button clicks without inline onclick
document.addEventListener('DOMContentLoaded', function() {

  // Toggle fee/message sections
  document.querySelectorAll('[data-toggle]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = this.getAttribute('data-toggle');
      var wrap = document.getElementById(id);
      if (wrap) { wrap.classList.toggle('open'); this.classList.toggle('open'); }
    });
  });

  // Simple checkbox toggles
  document.querySelectorAll('[data-toggle-simple]').forEach(function(el) {
    el.addEventListener('click', function() { this.classList.toggle('selected'); });
  });

  // Book with agent buttons
  document.querySelectorAll('[data-booking]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      openBooking(this.getAttribute('data-booking'));
    });
  });

  // Close booking
  var closeBtn = document.getElementById('bookingClose');
  if (closeBtn) closeBtn.addEventListener('click', closeBooking);

  // Step navigation
  document.querySelectorAll('[data-step]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      goStep(parseInt(this.getAttribute('data-step')));
    });
  });

  // Package selection
  document.querySelectorAll('[data-pkg-fee]').forEach(function(el) {
    el.addEventListener('click', function() {
      var fee = parseInt(this.getAttribute('data-pkg-fee'));
      var label = this.getAttribute('data-pkg-label');
      document.querySelectorAll('.radio-option').forEach(function(r) { r.classList.remove('selected'); });
      this.classList.add('selected');
      booking.packageFee = fee;
      booking.packageLabel = label;
      booking.extraPagesFee = 0;
      document.getElementById('copyOptionWrap').style.display = 'block';
      var isExtra = label === '131+ pages';
      document.getElementById('extraPagesWrap').style.display = isExtra ? 'block' : 'none';
      if (!isExtra) { document.getElementById('extraPages').value = ''; document.getElementById('extraPagesResult').textContent = ''; }
    });
  });

  // Extra pages calc
  var extraInput = document.querySelector('[data-calc="extraPages"]');
  if (extraInput) {
    extraInput.addEventListener('input', function() {
      var pages = parseInt(this.value) || 0;
      booking.extraPagesFee = Math.round(pages * 0.50 * 100) / 100;
      document.getElementById('extraPagesResult').textContent = pages > 0 ?
        pages + ' extra pages x $0.50 = $' + booking.extraPagesFee.toFixed(2) + ' added to total' : '';
    });
  }

  // Signer count calc
  var signerSelect = document.getElementById('signerCount');
  if (signerSelect) {
    signerSelect.addEventListener('change', function() {
      var count = parseInt(this.value);
      booking.signerFee = count > 2 ? (count - 2) * 25 : 0;
    });
  }

  // Char count
  var commentBox = document.querySelector('[data-charcount]');
  if (commentBox) {
    commentBox.addEventListener('input', function() {
      var id = this.getAttribute('data-charcount');
      document.getElementById(id).textContent = (300 - this.value.length) + ' characters remaining';
    });
  }

  // Agree checkbox
  var agreeBox = document.getElementById('agreeBox');
  if (agreeBox) {
    agreeBox.addEventListener('change', checkAgree);
  }

  // Pay button
  var payBtn = document.getElementById('payBtn');
  if (payBtn) {
    payBtn.addEventListener('click', processPayment);
  }

  // Witness toggle
  var witnessOption = document.getElementById('witnessOption');
  if (witnessOption) {
    witnessOption.addEventListener('click', function() {
      this.classList.toggle('selected');
      booking.witnessFee = document.getElementById('needsWitness').checked ? 50 : 0;
    });
  }

});
