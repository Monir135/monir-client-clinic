// ================= VIDEO CONSULTATION CONFIG =================
const TELEMEDICINE_VIDEO_LINK = "https://meet.google.com/yvp-anrq-ozv";
const WEB3FORMS_KEY = "08036011-9e72-4aac-a92c-37c06349ab21";

// ================= APPOINTMENT FORM =================
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('appointmentForm');
  const confirmationBox = document.getElementById('confirmationBox');
  const yearEl = document.getElementById('year');

  if (yearEl) yearEl.textContent = new Date().getFullYear();
  if (!form) return;

  // ------------------ DOCTOR SLOTS ------------------
  const doctorSlots = {
    "Dr. Ayesha Rahman": ["09:00", "10:00", "11:00", "14:00", "15:00"],
    "Dr. Mohammed Ali": ["10:00", "11:30", "13:00", "15:00", "16:00"],
    "Dr. Samuel Joseph": ["09:30", "11:00", "12:30", "14:30", "16:00"]
  };

  const departmentSelect = form.querySelector('select[name="department"]');
  const doctorSelect = form.querySelector('select[name="doctor"]');
  const timeInput = form.querySelector('input[name="time"]');

  // Doctor time slots
  if (doctorSelect && timeInput) {
    doctorSelect.addEventListener('change', () => {
      const selectedDoctor = doctorSelect.value;
      let datalist = document.getElementById("timeSlots");

      if (doctorSlots[selectedDoctor]) {
        if (!datalist) {
          datalist = document.createElement("datalist");
          datalist.id = "timeSlots";
          document.body.appendChild(datalist);
          timeInput.setAttribute("list", "timeSlots");
        }

        datalist.innerHTML = "";
        doctorSlots[selectedDoctor].forEach(slot => {
          const option = document.createElement("option");
          option.value = slot;
          datalist.appendChild(option);
        });

        timeInput.value = "";
      } else {
        timeInput.removeAttribute("list");
      }
    });
  }

  // Payment label update
  const paymentLabel = document.querySelector('.payment-choice label');
  if (departmentSelect && paymentLabel) {
    departmentSelect.addEventListener('change', () => {
      paymentLabel.innerHTML =
        departmentSelect.value === 'Telemedicine'
          ? '<strong>Payment:</strong> Prepaid Consultation'
          : '<strong>Payment:</strong> Pay at Clinic';
    });
  }

  let latestAppointment = {};

  function generateRef() {
    return 'CLN-' + Math.floor(100000 + Math.random() * 900000);
  }

  // ------------------ SUBMIT APPOINTMENT ------------------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const ref = generateRef();
    const formData = new FormData(form);

    latestAppointment = {
      ref,
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      department: formData.get('department'),
      doctor: formData.get('doctor'),
      date: formData.get('date'),
      time: formData.get('time'),
      message: formData.get('message'),
      paymentMethod:
        formData.get('department') === 'Telemedicine'
          ? 'Online Consultation'
          : 'Pay at Clinic',
      paymentStatus:
        formData.get('department') === 'Telemedicine'
          ? 'Video consultation link sent'
          : 'Payment Due at Clinic',
      videoLink:
        formData.get('department') === 'Telemedicine'
          ? TELEMEDICINE_VIDEO_LINK
          : null
    };

    try {
      const web3FormData = new FormData();
      web3FormData.append('access_key', WEB3FORMS_KEY);
      Object.entries(latestAppointment).forEach(([k, v]) => {
        if (v) web3FormData.append(k, v);
      });

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: web3FormData
      });

      const data = await response.json();

      if (!data.success) throw new Error('Submission failed');

      // ---------- SUCCESS UI ----------
      form.style.display = 'none';
      confirmationBox.style.display = 'block';

      confirmationBox.innerHTML = `
        <h2>Appointment Confirmed ✅</h2>
        <img src="images/logo.png" alt="GreenCare Clinic" style="max-width:120px;margin:10px 0;">
        <div class="confirmation-details">
          <div><span>Reference</span><strong>${latestAppointment.ref}</strong></div>
          <div><span>Name</span><strong>${latestAppointment.name}</strong></div>
          <div><span>Email</span><strong>${latestAppointment.email}</strong></div>
          <div><span>Phone</span><strong>${latestAppointment.phone}</strong></div>
          <div><span>Department</span><strong>${latestAppointment.department}</strong></div>
          <div><span>Doctor</span><strong>${latestAppointment.doctor || 'Any Available'}</strong></div>
          <div><span>Date</span><strong>${latestAppointment.date}</strong></div>
          <div><span>Time</span><strong>${latestAppointment.time}</strong></div>
          <div><span>Payment</span><strong>${latestAppointment.paymentStatus}</strong></div>
          ${latestAppointment.department === 'Telemedicine'
          ? `<div><span>Video</span>
                   <strong><a href="${latestAppointment.videoLink}" target="_blank">Join Video Call</a></strong>
                 </div>`
          : ''
        }
        </div>
        <div id="qrCode" style="margin:20px 0;"></div>
        <div class="confirmation-buttons">
          <button class="btn-primary" onclick="goBack()">Book Another</button>
          <a href="#" class="btn-whatsapp" id="confirmWhatsapp">Send via WhatsApp</a>
        </div>
      `;

      new QRCode(document.getElementById("qrCode"), {
        text: JSON.stringify(latestAppointment),
        width: 140,
        height: 140
      });

      attachWhatsappHandler();
      attachPdfHandler();

    } catch (err) {
      alert('Appointment failed. Please try again.');
      console.error(err);
    }
  });

  // ------------------ WHATSAPP ------------------
  function attachWhatsappHandler() {
    const waBtn = document.getElementById('confirmWhatsapp');
    if (!waBtn) return;

    waBtn.onclick = () => {
      const msg = `🏥 GreenCare Clinic Appointment
Ref: ${latestAppointment.ref}
Name: ${latestAppointment.name}
Dept: ${latestAppointment.department}
Doctor: ${latestAppointment.doctor || 'Any'}
Date: ${latestAppointment.date}
Time: ${latestAppointment.time}
Payment: ${latestAppointment.paymentStatus}
${latestAppointment.videoLink || ''}`;

      window.open(`https://wa.me/918822030323?text=${encodeURIComponent(msg)}`);
    };
  }

  // ------------------ PDF ------------------
  function attachPdfHandler() {
    const btns = document.querySelector('.confirmation-buttons');
    if (!btns) return;

    // remove existing PDF button if already added
    const existingBtn = btns.querySelector('.pdf-btn');
    if (existingBtn) existingBtn.remove();

    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'btn-primary pdf-btn';

    pdfBtn.textContent = 'Download PDF';
    pdfBtn.className = 'btn-primary';
    btns.appendChild(pdfBtn);

    pdfBtn.onclick = () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      let y = 20;

      doc.setFontSize(16);
      doc.text('GreenCare Clinic – Appointment Receipt', 20, y);
      y += 12;

      doc.setFontSize(11);
      doc.text(`Reference: ${latestAppointment.ref}`, 20, y); y += 8;
      doc.text(`Name: ${latestAppointment.name}`, 20, y); y += 8;
      doc.text(`Email: ${latestAppointment.email}`, 20, y); y += 8;
      doc.text(`Phone: ${latestAppointment.phone}`, 20, y); y += 8;
      doc.text(`Department: ${latestAppointment.department}`, 20, y); y += 8;
      doc.text(`Doctor: ${latestAppointment.doctor || 'Any Available'}`, 20, y); y += 8;
      doc.text(`Date: ${latestAppointment.date}`, 20, y); y += 8;
      doc.text(`Time: ${latestAppointment.time}`, 20, y); y += 8;
      doc.text(`Payment: ${latestAppointment.paymentStatus}`, 20, y); y += 10;

      if (latestAppointment.videoLink) {
        doc.text(`Video Consultation Link:`, 20, y); y += 8;
        doc.text(latestAppointment.videoLink, 20, y);
        y += 10;
      }

      // ---------- QR CODE INTO PDF ----------
      const qrCanvas = document.querySelector('#qrCode canvas');

      if (qrCanvas) {
        const qrImg = qrCanvas.toDataURL('image/png');
        doc.text('Scan QR for appointment details:', 20, y);
        doc.addImage(qrImg, 'PNG', 20, y + 5, 50, 50);
      }

      doc.save(`Appointment_${latestAppointment.ref}.pdf`);
    };
  }

  // ------------------ GO BACK ------------------
  window.goBack = function () {
    confirmationBox.style.display = 'none';
    confirmationBox.innerHTML = ''; // ✅ clear QR & content
    form.reset();
    form.style.display = 'block';
  };



});

// ================= CONTACT FORM =================

// ------------------ CONTACT FORM RESET ------------------
function resetContactForm() {
  const contactForm = document.getElementById('contactForm');
  const contactSuccess = document.getElementById('contactSuccess');

  if (!contactForm || !contactSuccess) return;

  contactForm.reset(); // reset form fields
  contactForm.style.display = 'block'; // show form
  contactSuccess.style.display = 'none'; // hide success message
}

document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contactForm');
  const contactSuccess = document.getElementById('contactSuccess');
  if (!contactForm) return;
contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = contactForm.querySelector('button[type="submit"]');

  // 🛑 stop double-click submission
  if (submitBtn.disabled) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  const formData = new FormData(contactForm);
  formData.append('access_key', WEB3FORMS_KEY);
  formData.append('subject', 'New Contact Message - GreenCare Clinic');

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!data.success) throw new Error();

    contactForm.reset();
    contactForm.style.display = 'none';
    contactSuccess.style.display = 'block';

    setTimeout(() => {
      resetContactForm();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }, 6000);

  } catch {
    alert('Message failed. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Message';
  }
});

 
});

// ================= TELEMEDICINE QUICK SELECT =================
function selectTelemedicine() {
  const departmentSelect = document.querySelector('select[name="department"]');
  const paymentLabel = document.querySelector('.payment-choice label');

  if (departmentSelect) departmentSelect.value = 'Telemedicine';
  if (paymentLabel)
    paymentLabel.innerHTML = '<strong>Payment:</strong> Prepaid Consultation';

  document.getElementById('appointments')
    ?.scrollIntoView({ behavior: 'smooth' });
}
