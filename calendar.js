/* =============================================
   AGROMÁQUINAS – CALENDAR.JS
   Calendário do cliente + mini-calendário admin

   DEPENDE DE: utils.js (carregado antes)

   CONEXÃO COM O BACKEND:
   Consulta slots ocupados via:
     GET /api/agendamentos/slots?year=YYYY&month=MM
   Retorno: { slots: { "YYYY-MM-DD": ["07:00",...] } }
   ============================================= */

// ATENÇÃO: deve ser IDÊNTICO à lista WORK_HOURS em app.py
// Se alterar aqui, altere lá também (e vice-versa).
const WORK_HOURS = [
  '07:00','08:00','09:00','10:00','11:00',
  '13:00','14:00','15:00','16:00','17:00'
];

// ══════════════════════════════════════════════
//  CALENDÁRIO DE AGENDAMENTO (cliente)
// ══════════════════════════════════════════════
class BookingCalendar {
  constructor({ gridId, monthLabelId, prevId, nextId,
                slotsContainerId, slotsGridId, dateLabelId,
                hiddenDateId, hiddenTimeId, errorId }) {
    this.grid         = document.getElementById(gridId);
    this.monthLabel   = document.getElementById(monthLabelId);
    this.slotsSection = document.getElementById(slotsContainerId);
    this.slotsGrid    = document.getElementById(slotsGridId);
    this.dateLabel    = document.getElementById(dateLabelId);
    this.hiddenDate   = document.getElementById(hiddenDateId);
    this.hiddenTime   = document.getElementById(hiddenTimeId);
    this.errorEl      = document.getElementById(errorId);
    this.today        = new Date();
    this.viewYear     = this.today.getFullYear();
    this.viewMonth    = this.today.getMonth();
    this.selectedDate = null;
    this.selectedTime = null;
    this.bookedSlots  = {};

    document.getElementById(prevId)?.addEventListener('click', () => this.changeMonth(-1));
    document.getElementById(nextId)?.addEventListener('click', () => this.changeMonth(1));
  }

  // Busca slots ocupados do backend
  // Se o backend não responder, assume todos disponíveis (não quebra o calendário)
  async loadBookedSlots(year, month) {
    try {
      const data = await api.get(`/agendamentos/slots?year=${year}&month=${month + 1}`);
      this.bookedSlots = data.slots || {};
    } catch {
      this.bookedSlots = {};
    }
  }

  async render() {
    await this.loadBookedSlots(this.viewYear, this.viewMonth);
    this._renderGrid();
  }

  _renderGrid() {
    this.monthLabel.textContent = `${MONTHS_PT[this.viewMonth]} ${this.viewYear}`;
    this.grid.innerHTML = '';

    const firstDay    = new Date(this.viewYear, this.viewMonth, 1).getDay();
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const todayKey    = this.today.toISOString().slice(0, 10);

    for (let i = 0; i < firstDay; i++) {
      const e = document.createElement('div');
      e.className = 'cal-day empty';
      this.grid.appendChild(e);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mm      = String(this.viewMonth + 1).padStart(2,'0');
      const dd      = String(d).padStart(2,'0');
      const dateKey = `${this.viewYear}-${mm}-${dd}`;
      const dow     = new Date(this.viewYear, this.viewMonth, d).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isPast    = dateKey < todayKey;
      const booked    = this.bookedSlots[dateKey] || [];
      const hasSlots  = !isWeekend && !isPast && booked.length < WORK_HOURS.length;

      const el = document.createElement('div');
      el.className = 'cal-day';
      el.textContent = d;

      if (dateKey === todayKey)          el.classList.add('today');
      if (dateKey === this.selectedDate) el.classList.add('selected');
      if (isPast)                        el.classList.add('past');
      if (isWeekend)                     el.classList.add('disabled');
      else if (hasSlots)                 el.classList.add('has-slots');

      if (!isPast && !isWeekend) el.addEventListener('click', () => this._selectDate(dateKey));
      this.grid.appendChild(el);
    }
  }

  _selectDate(dateKey) {
    this.selectedDate = dateKey;
    this.selectedTime = null;
    this.hiddenDate.value = dateKey;
    this.hiddenTime.value = '';
    if (this.errorEl) this.errorEl.textContent = '';
    this._renderGrid();

    const [y,m,d] = dateKey.split('-');
    const dow = new Date(+y, +m-1, +d).getDay();
    this.dateLabel.textContent = `${DAYS_PT[dow]}, ${d}/${m}/${y}`;
    this.slotsSection.style.display = '';
    this._renderSlots(dateKey);
  }

  _renderSlots(dateKey) {
    this.slotsGrid.innerHTML = '';
    const booked = this.bookedSlots[dateKey] || [];

    WORK_HOURS.forEach(h => {
      const isOccupied = booked.includes(h);
      const el = document.createElement('div');
      el.className = 'time-slot' + (isOccupied ? ' occupied' : '');
      el.innerHTML = `${h}<span class="slot-label ${isOccupied?'busy-label':'free-label'}">${isOccupied?'Ocupado':'Disponível'}</span>`;
      if (!isOccupied) el.addEventListener('click', () => this._selectTime(h, el));
      this.slotsGrid.appendChild(el);
    });
  }

  _selectTime(time, el) {
    this.selectedTime = time;
    this.hiddenTime.value = time;
    if (this.errorEl) this.errorEl.textContent = '';
    this.slotsGrid.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
  }

  changeMonth(dir) {
    this.viewMonth += dir;
    if (this.viewMonth > 11) { this.viewMonth = 0; this.viewYear++; }
    if (this.viewMonth < 0)  { this.viewMonth = 11; this.viewYear--; }
    this.slotsSection.style.display = 'none';
    this.render();
  }

  validate() {
    if (!this.selectedDate || !this.selectedTime) {
      if (this.errorEl)
        this.errorEl.textContent = 'Por favor, selecione uma data e um horário disponíveis.';
      return false;
    }
    return true;
  }
}

// ══════════════════════════════════════════════
//  MINI CALENDÁRIO (sidebar admin)
// ══════════════════════════════════════════════
class MiniCalendar {
  constructor({ gridId, labelId, prevId, nextId, agendamentos = {}, onSelect }) {
    this.grid         = document.getElementById(gridId);
    this.label        = document.getElementById(labelId);
    this.agendamentos = agendamentos;
    this.onSelect     = onSelect || (() => {});
    this.today        = new Date();
    this.viewYear     = this.today.getFullYear();
    this.viewMonth    = this.today.getMonth();
    this.selected     = this.today.toISOString().slice(0,10);

    document.getElementById(prevId)?.addEventListener('click', () => this.changeMonth(-1));
    document.getElementById(nextId)?.addEventListener('click', () => this.changeMonth(1));
    this.render();
  }

  setAgendamentos(map) { this.agendamentos = map; this.render(); }

  render() {
    this.label.textContent = `${MONTHS_PT_SHORT[this.viewMonth]} ${this.viewYear}`;
    this.grid.innerHTML = '';

    const firstDay    = new Date(this.viewYear, this.viewMonth, 1).getDay();
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const todayKey    = this.today.toISOString().slice(0,10);

    for (let i = 0; i < firstDay; i++) {
      const el = document.createElement('button');
      el.className = 'mini-cal-day empty'; el.disabled = true;
      this.grid.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mm      = String(this.viewMonth+1).padStart(2,'0');
      const dd      = String(d).padStart(2,'0');
      const dateKey = `${this.viewYear}-${mm}-${dd}`;
      const isPast  = dateKey < todayKey;

      const el = document.createElement('button');
      el.className = 'mini-cal-day';
      el.textContent = d;
      if (dateKey === todayKey)      el.classList.add('today');
      if (dateKey === this.selected) el.classList.add('selected');
      if (isPast)                    el.classList.add('past');
      if (this.agendamentos[dateKey]) el.classList.add('has-agendamentos');

      el.addEventListener('click', () => {
        this.selected = dateKey;
        this.render();
        this.onSelect(dateKey);
      });
      this.grid.appendChild(el);
    }
  }

  changeMonth(dir) {
    this.viewMonth += dir;
    if (this.viewMonth > 11) { this.viewMonth = 0; this.viewYear++; }
    if (this.viewMonth < 0)  { this.viewMonth = 11; this.viewYear--; }
    this.render();
  }
}
