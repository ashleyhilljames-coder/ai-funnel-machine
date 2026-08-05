document.addEventListener('DOMContentLoaded', () =>{
 // --- Authorization Session Gate ---
// --- DEV BYPASS FOR LOCAL TESTING ---
  if (!sessionStorage.getItem('authToken') || !sessionStorage.getItem('authClientId')) {
    console.warn('⚠️ No active session found. Applying Dev Bypass credentials...');
    sessionStorage.setItem('authToken', 'dev-bypass-token-12345');
    sessionStorage.setItem('authClientId', 'dev-client-id');
    sessionStorage.setItem('authClientName', 'Dev Admin');
  }

  const token = sessionStorage.getItem('authToken');
  const authClientId = sessionStorage.getItem('authClientId');
  const authClientName = sessionStorage.getItem('authClientName');
async function fetchRecentDispatches() {
    try {
      const response = await fetch('/api/telephony/recent-calls');
      const data = await response.json();

      if (data.success && data.calls) {
        renderDispatches(data.calls);
      }
    } catch (error) {
      console.error('Error fetching recent dispatches:', error);
    }
  }

  function renderDispatches(calls) {
    // Make sure 'dispatch-container' matches an ID in your dashboard.html
    const container = document.getElementById('dispatch-container');
    if (!container) return;

    if (calls.length === 0) {
      container.innerHTML = '<p class="text-gray-400">No dispatch records found.</p>';
      return;
    }

    container.innerHTML = calls.map(call => `
      <div class="p-4 bg-slate-800 rounded-lg border border-slate-700 mb-3 text-left">
        <div class="flex justify-between items-center mb-2">
          <span class="font-semibold text-emerald-400">${call.callerPhone || 'Unknown'}</span>
          <span class="px-2 py-1 text-xs font-bold rounded bg-amber-500/20 text-amber-300 uppercase">
            ${call.status}
          </span>
        </div>
        <p class="text-sm text-slate-300 mb-2">${call.summary}</p>
        <div class="flex justify-between text-xs text-slate-500">
          <span>Duration: ${call.callDuration}</span>
          <span>${call.createdAt ? new Date(call.createdAt).toLocaleTimeString() : ''}</span>
        </div>
      </div>
    `).join('');
  }

  // Trigger initial fetch & start polling
  fetchRecentDispatches();
  setInterval(fetchRecentDispatches, 10000);


 // Intercept Fetch to inject Session Token & catch 401s
 const originalFetch = window.fetch;
 window.fetch = function(url, options = {}) {
 if (url.toString().startsWith('/api/')) {
 options.headers = options.headers || {};
 if (options.headers instanceof Headers) {
 options.headers.set('Authorization', `Bearer ${token}`);
 } else if (Array.isArray(options.headers)) {
 options.headers.push(['Authorization', `Bearer ${token}`]);
 } else {
 options.headers['Authorization'] = `Bearer ${token}`;
 }
 }
 return originalFetch(url, options).then(response =>{
 if (response.status === 401) {
 sessionStorage.clear();
 window.location.href = 'login.html';
 }
 return response;
 });
 };

 // Logout button handler
 const logoutBtn = document.getElementById('logout-btn');
 if (logoutBtn) {
 logoutBtn.addEventListener('click', () =>{
 sessionStorage.clear();
 window.location.href = 'login.html';
 });
 }

 // --- UI Elements ---
 const statTotalLeads = document.getElementById('stat-total-leads');
 const statDuplicates = document.getElementById('stat-duplicates');
 const statPendingCsvs = document.getElementById('stat-pending-csvs');
 const statTotalCalls = document.getElementById('stat-total-calls');
 const statScheduledDispatches = document.getElementById('stat-scheduled-dispatches');
 const statOutreachDispatched = document.getElementById('stat-outreach-dispatched');

 const funnelLeadsVal = document.getElementById('funnel-leads-val');
 const funnelLeadsBar = document.getElementById('funnel-leads-bar');
 const funnelOutreachVal = document.getElementById('funnel-outreach-val');
 const funnelOutreachBar = document.getElementById('funnel-outreach-bar');
 const funnelOutreachRate = document.getElementById('funnel-outreach-rate');
 const funnelCallsVal = document.getElementById('funnel-calls-val');
 const funnelCallsBar = document.getElementById('funnel-calls-bar');
 const funnelDispatchesVal = document.getElementById('funnel-dispatches-val');
 const funnelDispatchesBar = document.getElementById('funnel-dispatches-bar');
 const funnelDispatchRate = document.getElementById('funnel-dispatch-rate');

 const scraperForm = document.getElementById('scraper-form');
 const scraperSubmitBtn = document.getElementById('scraper-submit-btn');
 const scraperSubmitText = scraperSubmitBtn.querySelector('.btn-text');
 const scraperSpinner = scraperSubmitBtn.querySelector('.loading-spinner');
 const scraperReport = document.getElementById('scraper-report');

 const dropZone = document.getElementById('drop-zone');
 const fileInput = document.getElementById('file-input');
 const importerReport = document.getElementById('importer-report');

 const registryTbody = document.getElementById('registry-tbody');
 const searchInput = document.getElementById('search-registry');
 const clearRegistryBtn = document.getElementById('clear-registry-btn');
 const globalClientSelect = document.getElementById('global-client-select');

 if (globalClientSelect && authClientId && authClientId !== 'admin') {
 globalClientSelect.value = authClientId;
 globalClientSelect.disabled = true;
 const selectorContainer = document.querySelector('.client-selector-container');
 if (selectorContainer) {
 selectorContainer.style.display = 'none';
 }
 }

 let allLeads = []; // Store leads list locally for searching
 let allOutreachLogs = []; // Store outreach logs locally for searching

 let intakeTrendsChart = null;
 let qualificationFunnelChart = null;
 let billingSpendChart = null;

 // --- Helper Functions ---
 const drawRoundedRect = (ctx, x, y, width, height, radius) =>{
 ctx.beginPath();
 ctx.moveTo(x + radius, y);
 ctx.lineTo(x + width - radius, y);
 ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
 ctx.lineTo(x + width, y + height - radius);
 ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
 ctx.lineTo(x + radius, y + height);
 ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
 ctx.lineTo(x, y + radius);
 ctx.quadraticCurveTo(x, y, x + radius, y);
 ctx.closePath();
 };

 const drawDoughnutChart = (canvasId, qualifiedCount, blockedCount) =>{
 const canvas = document.getElementById(canvasId);
 if (!canvas) return;
 const ctx = canvas.getContext('2d');
 if (!ctx) return;

 const width = canvas.width;
 const height = canvas.height;
 ctx.clearRect(0, 0, width, height);

 const x = width / 2;
 const y = height / 2;
 const outerRadius = Math.min(x, y) - 10;
 const innerRadius = outerRadius * 0.65;
 const total = qualifiedCount + blockedCount;

 const legend = document.getElementById('legend-lead-quality');
 if (legend) {
 legend.innerHTML = `
 <div class="legend-item">
 <span class="legend-color qualified"></span>
 <span>Qualified: <strong>${qualifiedCount}</strong></span>
 </div>
 <div class="legend-item">
 <span class="legend-color blocked"></span>
 <span>Blocked: <strong>${blockedCount}</strong></span>
 </div>
 `;
 }

 if (total === 0) {
 // Draw empty state circle
 ctx.beginPath();
 ctx.arc(x, y, outerRadius, 0, 2 * Math.PI);
 ctx.arc(x, y, innerRadius, 2 * Math.PI, 0, true);
 ctx.closePath();
 ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
 ctx.fill();

 ctx.fillStyle = '#6b7280';
 ctx.font = '600 12px Outfit';
 ctx.textAlign = 'center';
 ctx.textBaseline = 'middle';
 ctx.fillText('No Leads Data', x, y);
 return;
 }

 // Segment 1: Qualified (Cyan)
 const startAngle = -Math.PI / 2;
 const qualifiedAngle = (qualifiedCount / total) * 2 * Math.PI;
 const endAngle1 = startAngle + qualifiedAngle;

 ctx.beginPath();
 ctx.arc(x, y, outerRadius, startAngle, endAngle1);
 ctx.arc(x, y, innerRadius, endAngle1, startAngle, true);
 ctx.closePath();
 ctx.fillStyle = '#06b6d4';
 ctx.fill();

 // Segment 2: Blocked (Purple)
 ctx.beginPath();
 ctx.arc(x, y, outerRadius, endAngle1, startAngle + 2 * Math.PI);
 ctx.arc(x, y, innerRadius, startAngle + 2 * Math.PI, endAngle1, true);
 ctx.closePath();
 ctx.fillStyle = '#a855f7';
 ctx.fill();

 // Center Text
 const pct = Math.round((qualifiedCount / total) * 100);
 ctx.fillStyle = '#ffffff';
 ctx.font = '800 24px Outfit';
 ctx.textAlign = 'center';
 ctx.textBaseline = 'middle';
 ctx.fillText(`${pct}%`, x, y - 5);

 ctx.fillStyle = '#9ca3af';
 ctx.font = '600 11px Outfit';
 ctx.fillText('QUALIFIED', x, y + 15);
 };

 const drawBarChart = (canvasId, damageTypes) =>{
 const canvas = document.getElementById(canvasId);
 if (!canvas) return;
 const ctx = canvas.getContext('2d');
 if (!ctx) return;

 const width = canvas.width;
 const height = canvas.height;
 ctx.clearRect(0, 0, width, height);

 const categories = [
 'Water Damage',
 'Fire Damage',
 'Mold Infestation',
 'Storm / Roof Leak',
 'General Restoration'
 ];

 const vals = categories.map(c =>damageTypes[c] || 0);
 const maxVal = Math.max(...vals, 1);
 const hasData = vals.some(v =>v >0);

 if (!hasData) {
 ctx.fillStyle = '#6b7280';
 ctx.font = '600 12px Outfit';
 ctx.textAlign = 'center';
 ctx.textBaseline = 'middle';
 ctx.fillText('No damage type data yet', width / 2, height / 2);
 return;
 }

 const barHeight = 16;
 const spacing = 38;
 const startY = 20;
 const labelWidth = 135;
 const rightPadding = 45;
 const availWidth = width - labelWidth - rightPadding;

 categories.forEach((cat, idx) =>{
 const val = damageTypes[cat] || 0;
 const y = startY + idx * spacing;

 // Draw label
 ctx.fillStyle = '#9ca3af';
 ctx.font = '600 12px Outfit';
 ctx.textAlign = 'left';
 ctx.textBaseline = 'middle';
 ctx.fillText(cat, 10, y + barHeight / 2);

 // Draw bar background track
 const barX = labelWidth;
 const barMaxW = availWidth;
 ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
 drawRoundedRect(ctx, barX, y, barMaxW, barHeight, 4);
 ctx.fill();

 // Draw actual filled bar
 const barW = (val / maxVal) * barMaxW;
 if (barW >0) {
 let barColor = '#06b6d4'; // Cyan
 if (cat.includes('Fire')) barColor = '#f97316'; // Orange
 if (cat.includes('Mold')) barColor = '#a855f7'; // Purple
 if (cat.includes('Storm') || cat.includes('Roof')) barColor = '#3b82f6'; // Blue
 if (cat.includes('General')) barColor = '#10b981'; // Green

 ctx.fillStyle = barColor;
 drawRoundedRect(ctx, barX, y, barW, barHeight, 4);
 ctx.fill();
 }

 // Draw value label
 ctx.fillStyle = '#ffffff';
 ctx.font = '800 12px Outfit';
 ctx.textAlign = 'left';
 ctx.fillText(val.toString(), barX + Math.max(barW + 8, 10), y + barHeight / 2);
 });
 };

 const fetchStats = async () =>{
 try {
 const clientId = globalClientSelect ? globalClientSelect.value : 'all';
 const res = await fetch(`/api/dashboard-stats?clientId=${clientId}`);
 const data = await res.json();
 if (data.success) {
 // Set counts on main cards
 statTotalLeads.textContent = data.stats.totalLeads;
 statDuplicates.textContent = data.stats.globalBlocks;
 statPendingCsvs.textContent = data.stats.pendingCsvs;
 statTotalCalls.textContent = data.stats.totalCalls;
 statScheduledDispatches.textContent = data.stats.scheduledDispatches;
 statOutreachDispatched.textContent = data.stats.outreachDispatched;

 // Doughnut chart rendering: Ingested - Blocked = Qualified leads
 const totalRegistered = data.stats.totalLeads;
 const blocked = data.stats.globalBlocks;
 const qualified = Math.max(totalRegistered - blocked, 0);
 drawDoughnutChart('chart-lead-quality', qualified, blocked);

 // Bar chart rendering: group by damage types
 drawBarChart('chart-damage-types', data.stats.damageTypes || {});

 // Funnel Visualizations calculations
 const totalLeads = data.stats.totalLeads || 0;
 const outreach = data.stats.outreachDispatched || 0;
 const calls = data.stats.totalCalls || 0;
 const dispatches = data.stats.scheduledDispatches || 0;

 // Set textual values in funnel
 funnelLeadsVal.textContent = totalLeads;
 funnelOutreachVal.textContent = outreach;
 funnelCallsVal.textContent = calls;
 funnelDispatchesVal.textContent = dispatches;

 // Animate progress widths
 // Ingested leads is baseline 100%
 funnelLeadsBar.style.width = totalLeads >0 ? '100%': '0%';

 // Outreach dispatched conversion rate
 const outreachPct = totalLeads >0 ? Math.round((outreach / totalLeads) * 100) : 0;
 funnelOutreachBar.style.width = `${outreachPct}%`;
 funnelOutreachRate.textContent = `Outreach Conversion: ${outreachPct}%`;

 // Voice Call Intake is baseline 100% for phone channel
 funnelCallsBar.style.width = calls >0 ? '100%': '0%';

 // Dispatches conversion rate
 const dispatchPct = calls >0 ? Math.round((dispatches / calls) * 100) : 0;
 funnelDispatchesBar.style.width = `${dispatchPct}%`;
 funnelDispatchRate.textContent = `Dispatch Booking Rate: ${dispatchPct}%`;
 }
 } catch (err) {
 console.error('Error fetching dashboard stats:', err);
 }
 };

 const renderRegistryTable = (leads) =>{
 if (!leads || leads.length === 0) {
 registryTbody.innerHTML = `<tr><td colspan="7"class="loading-text">No duplicate guard logs found.</td></tr>`;
 return;
 }

 registryTbody.innerHTML = leads.map(lead =>{
 const dateStr = new Date(lead.processed_at).toLocaleString();
 
 const statusClass = lead.status === 'contacted'? 'badge-contacted': 'badge-pending';
 const statusText = lead.status === 'contacted'? 'Sent': 'Pending';
 
 const actionButtonHtml = lead.status === 'contacted'
 ? `<span style="color: #10b981; font-weight: 600; font-size: 0.85rem;">Dispatched</span>`
 : `<button class="btn btn-primary btn-table send-campaign-btn"
 data-email="${lead.email}"
 data-name="${lead.name || ''}"
 data-niche="${lead.niche || ''}"
 data-client="${lead.client_id}">Draft</button>`;

 return `
 <tr>
 <td>${lead.id}</td>
 <td style="font-weight: 600; color: #fff;">${lead.name || 'Unknown'}</td>
 <td>${lead.niche || 'General Restoration'}</td>
 <td style="font-family: monospace;">${lead.email}</td>
 <td>${lead.client_id}</td>
 <td><span class="badge ${statusClass}">${statusText}</span></td>
 <td>${actionButtonHtml}</td>
 </tr>
 `;
 }).join('');
 };

 const fetchRegistry = async () =>{
 try {
 const clientId = globalClientSelect ? globalClientSelect.value : 'all';
 const res = await fetch(`/api/leads-registry?clientId=${clientId}`);
 const data = await res.json();
 if (data.success) {
 allLeads = data.leads;
 renderRegistryTable(allLeads);
 }
 } catch (err) {
 console.error('Error fetching lead registry:', err);
 registryTbody.innerHTML = `<tr><td colspan="7"class="loading-text"style="color: #fca5a5;">Failed to load logs registry.</td></tr>`;
 }
 };

 // --- Scraper Submission ---
 scraperForm.addEventListener('submit', async (e) =>{
 e.preventDefault();
 const queryInput = document.getElementById('query');
 const query = queryInput.value.trim();
 if (!query) return;

 // UI Loading State
 scraperSubmitBtn.disabled = true;
 scraperSubmitText.textContent = 'Scraping Google Maps...';
 scraperSpinner.classList.remove('hidden');
 scraperReport.classList.add('hidden');
 scraperReport.classList.remove('error');

 try {
 const res = await fetch('/api/scrape-leads', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json'},
 body: JSON.stringify({ query })
 });

 const data = await res.json();

 scraperReport.classList.remove('hidden');
 if (res.ok && data.success) {
 scraperReport.innerHTML = `
 Google Places Scraper Campaign Report
--------------------------------------
Query: "${query}"
Total Scraped: ${data.totalScraped} leads
Appended to Sheet: ${data.totalImported} leads
Duplicates Blocked: ${data.totalDuplicates} duplicates
Ingestion Failures: ${data.totalFailed} failures
Execution Time: ${data.executionTime} seconds
 `;
 queryInput.value = ''; // Clear search bar
 } else {
 throw new Error(data.error || 'Server error running scraper');
 }
 } catch (err) {
 scraperReport.classList.remove('hidden');
 scraperReport.classList.add('error');
 scraperReport.textContent = `Scraper Execution Error: ${err.message}`;
 } finally {
 scraperSubmitBtn.disabled = false;
 scraperSubmitText.textContent = 'Run Google Search';
 scraperSpinner.classList.add('hidden');
 refreshDashboard();
 }
 });

 // --- CSV Drag & Drop / Upload ---
 const handleCSVUpload = async (file) =>{
 if (!file) return;

 // Visual loading state inside drop zone
 const originalText = dropZone.innerHTML;
 dropZone.innerHTML = `<span class="loading-spinner"></span><span class="drop-text"style="margin-top: 8px;">Processing CSV Sheet...</span>`;
 importerReport.classList.add('hidden');
 importerReport.classList.remove('error');

 const reader = new FileReader();
 reader.onload = async (e) =>{
 const content = e.target.result;
 try {
 const res = await fetch('/api/upload-csv', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json'},
 body: JSON.stringify({
 fileName: file.name,
 content: content
 })
 });

 const data = await res.json();

 importerReport.classList.remove('hidden');
 if (res.ok && data.success) {
 importerReport.innerHTML = `
 CSV Importer Ingestion Report
-----------------------------------
File: "${file.name}"
Parsed Rows: ${data.totalParsed} records
Appended to Sheet: ${data.totalImported} leads
Duplicates Blocked: ${data.totalDuplicates} duplicates
Ingestion Failures: ${data.totalFailed} failures
Execution Time: ${data.executionTime} seconds
 `;
 } else {
 throw new Error(data.error || 'CSV Ingestion Failed');
 }
 } catch (err) {
 importerReport.classList.remove('hidden');
 importerReport.classList.add('error');
 importerReport.textContent = `CSV Ingestion Error: ${err.message}`;
 } finally {
 // Restore drop zone markup
 dropZone.innerHTML = originalText;
 refreshDashboard();
 }
 };

 reader.onerror = () =>{
 importerReport.classList.remove('hidden');
 importerReport.classList.add('error');
 importerReport.textContent = `Error reading local CSV file.`;
 dropZone.innerHTML = originalText;
 };

 reader.readAsText(file);
 };

 dropZone.addEventListener('click', () =>fileInput.click());

 fileInput.addEventListener('change', (e) =>{
 const file = e.target.files[0];
 if (file) {
 handleCSVUpload(file);
 fileInput.value = ''; // Reset file input
 }
 });

 dropZone.addEventListener('dragover', (e) =>{
 e.preventDefault();
 dropZone.classList.add('dragover');
 });

 dropZone.addEventListener('dragleave', () =>{
 dropZone.classList.remove('dragover');
 });

 dropZone.addEventListener('drop', (e) =>{
 e.preventDefault();
 dropZone.classList.remove('dragover');
 const file = e.dataTransfer.files[0];
 if (file && file.name.endsWith('.csv')) {
 handleCSVUpload(file);
 } else {
 alert('Please drop a valid .csv file.');
 }
 });

 // --- Search / Filter Registry ---
 searchInput.addEventListener('input', () =>{
 const query = searchInput.value.toLowerCase().trim();
 if (!query) {
 renderRegistryTable(allLeads);
 return;
 }

 const filtered = allLeads.filter(lead =>
 lead.email.toLowerCase().includes(query) || 
 lead.client_id.toLowerCase().includes(query)
 );
 renderRegistryTable(filtered);
 });

 // --- Clear Registry DB ---
 clearRegistryBtn.addEventListener('click', async () =>{
 if (!confirm('Are you absolutely sure you want to clear the entire Lead Guard registry? This will reset all duplicate check protections for campaigns.')) {
 return;
 }

 try {
 const res = await fetch('/api/clear-registry', { method: 'POST'});
 const data = await res.json();
 if (data.success) {
 alert('SQLite Lead Registry reset successfully.');
 refreshDashboard();
 } else {
 throw new Error(data.error);
 }
 } catch (err) {
 alert(`Failed to clear database: ${err.message}`);
 }
 });

 // --- Side Drawer Controls & Ingestion Triggers ---
 const campaignDrawer = document.getElementById('campaign-drawer');
 const closeDrawerBtn = document.getElementById('close-drawer-btn');
 const drawerOverlay = document.getElementById('drawer-overlay');

 const campaignTemplateSelect = document.getElementById('campaign-template');
 const campaignSubjectInput = document.getElementById('campaign-subject');
 const campaignBodyTextarea = document.getElementById('campaign-body');
 const sendCampaignEmailBtn = document.getElementById('send-campaign-email-btn');

 let activeCampaignLead = null;

 const closeDrawer = () =>{
 campaignDrawer.classList.add('hidden');
 activeCampaignLead = null;
 if (campaignTemplateSelect) campaignTemplateSelect.disabled = false;
 if (campaignSubjectInput) campaignSubjectInput.disabled = false;
 if (campaignBodyTextarea) campaignBodyTextarea.disabled = false;
 if (sendCampaignEmailBtn) {
 sendCampaignEmailBtn.disabled = false;
 sendCampaignEmailBtn.innerHTML = `Confirm & Send Campaign`;
 }
 };

 closeDrawerBtn.addEventListener('click', closeDrawer);
 drawerOverlay.addEventListener('click', closeDrawer);

 // Helper to fetch draft and populate editor
 const fetchAndLoadDraft = async (email, name, niche, client, template) =>{
 try {
 // Disable controls during load
 campaignTemplateSelect.disabled = true;
 campaignSubjectInput.disabled = true;
 campaignBodyTextarea.disabled = true;
 sendCampaignEmailBtn.disabled = true;
 sendCampaignEmailBtn.innerHTML = `<span class="loading-spinner"style="width:12px; height:12px; border-width:1.5px;"></span>Generating Draft...`;

 const res = await fetch('/api/generate-campaign-draft', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json'},
 body: JSON.stringify({ email, name, niche, template, clientId: client })
 });

 const data = await res.json();
 if (res.ok && data.success) {
 campaignSubjectInput.value = data.subject || '';
 campaignBodyTextarea.value = data.body || '';
 } else {
 throw new Error(data.error || 'Failed to fetch draft.');
 }
 } catch (err) {
 console.error('Draft error:', err);
 alert(`Error generating draft: ${err.message}`);
 } finally {
 // Re-enable controls
 campaignTemplateSelect.disabled = false;
 campaignSubjectInput.disabled = false;
 campaignBodyTextarea.disabled = false;
 sendCampaignEmailBtn.disabled = false;
 sendCampaignEmailBtn.innerHTML = `Confirm & Send Campaign`;
 }
 };

 // Live template swapping listener
 campaignTemplateSelect.addEventListener('change', async () =>{
 if (!activeCampaignLead) return;
 const selectedTemplate = campaignTemplateSelect.value;
 await fetchAndLoadDraft(
 activeCampaignLead.email,
 activeCampaignLead.name,
 activeCampaignLead.niche,
 activeCampaignLead.client,
 selectedTemplate
 );
 });

 // Event delegation for campaign sending in registry table
 registryTbody.addEventListener('click', async (e) =>{
 if (e.target.classList.contains('send-campaign-btn')) {
 const btn = e.target;
 const email = btn.getAttribute('data-email');
 const name = btn.getAttribute('data-name');
 const niche = btn.getAttribute('data-niche');
 const client = btn.getAttribute('data-client');

 // Set Loading UI state on button
 const originalText = btn.innerHTML;
 btn.disabled = true;
 btn.innerHTML = `<span class="loading-spinner"style="width:12px; height:12px; border-width:1.5px;"></span>`;

 try {
 
 // Set active campaign lead reference for template swapping
      activeCampaignLead = { email, name, niche, client };

      // Set default template option based on lead's niche vertical
      if (niche && niche.toLowerCase().includes('property')) {
        campaignTemplateSelect.value = 'property';
      } else if (niche && (niche.toLowerCase().includes('roof') || niche.toLowerCase().includes('storm'))) {
        campaignTemplateSelect.value = 'roofing';
      } else {
        campaignTemplateSelect.value = 'mitigation';
      }

      // Open campaign sliding side drawer
      campaignDrawer.classList.remove('hidden');

      // Trigger asynchronous draft copywriting generation via OpenAI
      await fetchAndLoadDraft(email, name, niche, client, campaignTemplateSelect.value);

    } catch (err) {
      console.error('Error initiating campaign workflow:', err);
      alert(`Failed to set up template draft: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
 });

 // --- Confirm and Dispatch Outbound Campaign Email ---
 sendCampaignEmailBtn.addEventListener('click', async () => {
   if (!activeCampaignLead) return;

   const subject = campaignSubjectInput.value.trim();
   const body = campaignBodyTextarea.value.trim();
   const template = campaignTemplateSelect.value;

   if (!subject || !body) {
     alert('Subject and body layers cannot be left empty.');
     return;
   }

   sendCampaignEmailBtn.disabled = true;
   sendCampaignEmailBtn.innerHTML = `<span class="loading-spinner" style="width:14px; height:14px; border-width:1.5px;"></span>Dispatching Email...`;

   try {
     const res = await fetch('/api/send-campaign-outreach', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         email: activeCampaignLead.email,
         name: activeCampaignLead.name,
         clientId: activeCampaignLead.client,
         subject,
         body,
         template
       })
     });

     const data = await res.json();
     if (res.ok && data.success) {
       alert(`Campaign email successfully queued & dispatched to ${activeCampaignLead.email}`);
       closeDrawer();
       refreshDashboard();
     } else {
       throw new Error(data.error || 'Failed to dispatch email execution.');
     }
   } catch (err) {
     alert(`Outreach Dispatch Failure: ${err.message}`);
     sendCampaignEmailBtn.disabled = false;
     sendCampaignEmailBtn.innerHTML = `Confirm & Send Campaign`;
   }
 });

 // --- Live Conversation Stream Telemetry & Intercept Layer ---
 const activeCallsContainer = document.getElementById('active-calls-container');
 const traitsTimelineContent = document.getElementById('traits-timeline-content');
 const activeProfileCard = document.getElementById('active-profile-card');
 const noProfileSelectedMsg = document.getElementById('no-profile-selected-msg');
 const interceptCallBtn = document.getElementById('intercept-call-btn');
 const activeSessionMetaBadge = document.getElementById('active-session-meta-badge');

 let pollingIntervalId = null;
 let activeSelectedSessionId = null;

 // --- Telephony WebSocket ---
 const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
 let telephonyWs;
 function connectTelephonyWs() {
   telephonyWs = new WebSocket(`${wsProtocol}//${window.location.host}/ws/telephony-monitor`);
   
   telephonyWs.onopen = () => {
     console.log('Connected to Live Telephony Monitor WS');
   };

   telephonyWs.onmessage = (event) => {
     try {
       const msg = JSON.parse(event.data);
       if (msg.event === 'active_sessions') {
         // initial state handled here if needed, but we rely on fetchLiveTelemetry for full metrics currently
         fetchLiveTelemetry();
       } else if (msg.event === 'transcript_updated' || msg.event === 'call_connected' || msg.event === 'call_disconnected' || msg.event === 'call_takeover') {
         fetchLiveTelemetry();
       }
     } catch (e) {
       console.error('Error parsing telephony WS message:', e);
     }
   };

   telephonyWs.onclose = () => {
     setTimeout(connectTelephonyWs, 3000); // Reconnect
   };
 }
 connectTelephonyWs();


 const fetchLiveTelemetry = async () => {
   try {
     const clientId = globalClientSelect ? globalClientSelect.value : 'all';
     const res = await fetch(`/api/telemetry/live-sessions?clientId=${clientId}`);
     const data = await res.json();

     if (data.success) {
       // Bind upper metric averages cards
       document.getElementById('telemetry-avg-stt').textContent = data.metrics.avgStt ? `${data.metrics.avgStt}ms` : '--';
       document.getElementById('telemetry-avg-llm').textContent = data.metrics.avgLlm ? `${data.metrics.avgLlm}ms` : '--';
       document.getElementById('telemetry-avg-tts').textContent = data.metrics.avgTts ? `${data.metrics.avgTts}ms` : '--';
       document.getElementById('telemetry-avg-ttft').textContent = data.metrics.avgTtft ? `${data.metrics.avgTtft}ms` : '--';
       document.getElementById('telemetry-interrupted-rate').textContent = data.metrics.interruptionRate ? `${data.metrics.interruptionRate}%` : '--';

       // Render Connections Queue
       if (!data.sessions || data.sessions.length === 0) {
         activeCallsContainer.innerHTML = `<p class="no-calls-msg" style="font-size: 0.85rem; color: var(--text-secondary); font-style: italic; text-align: center; margin: auto;">No active sessions currently.</p>`;
         if (activeSelectedSessionId) {
           resetLiveInsightsPanel();
         }
         return;
       }

       activeCallsContainer.innerHTML = data.sessions.map(session => {
         const isActive = session.id === activeSelectedSessionId ? 'border: 1px solid var(--accent-cyan); background: rgba(6,182,212,0.05);' : '';
         return `
           <div class="glass-card session-queue-item" data-id="${session.id}" style="padding: 12px; cursor: pointer; border-radius: var(--border-radius-sm); transition: all 0.2s; ${isActive}">
             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
               <strong style="color: #fff; font-size: 0.9rem;">${session.name || 'Unknown Caller'}</strong>
               <span style="font-size: 0.75rem; color: var(--accent-cyan); font-weight: bold;">${session.duration}</span>
             </div>
             <div style="font-size: 0.8rem; color: var(--text-secondary); display: flex; justify-content: space-between;">
               <span>Channel: ${session.source}</span>
               <span>Niche: ${session.niche || 'General'}</span>
             </div>
           </div>
         `;
       }).join('');

       // If an active session profile is currently open, refresh its dynamic timeline view
       if (activeSelectedSessionId) {
         const currentSession = data.sessions.find(s => s.id === activeSelectedSessionId);
         if (currentSession) {
           renderLiveInsights(currentSession);
         } else {
           resetLiveInsightsPanel();
         }
       }
     }
   } catch (err) {
     console.error('Error fetching voice pipeline telemetry:', err);
   }
 };

 const renderLiveInsights = (session) => {
   noProfileSelectedMsg.style.display = 'none';
   activeProfileCard.style.display = 'block';
   activeSessionMetaBadge.style.display = 'block';
   
   // Enable live human override switch visibility
   interceptCallBtn.style.display = 'block';
   interceptCallBtn.setAttribute('data-session-id', session.id);

   document.getElementById('profile-name').textContent = session.name || 'Unknown Caller';
   document.getElementById('profile-phone').textContent = session.phone || '-';
   document.getElementById('profile-email').textContent = session.email || '-';

   // Render dynamically extracted structured entity data fields
   const traitsContainer = document.getElementById('profile-traits');
   if (session.traits && Object.keys(session.traits).length > 0) {
     traitsContainer.innerHTML = Object.entries(session.traits).map(([key, value]) => `
       <div style="background: rgba(255,255,255,0.02); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.04);">
         <span style="display: block; font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase;">${key}</span>
         <span style="font-size: 0.85rem; color: #fff; font-weight: 600;">${value}</span>
       </div>
     `).join('');
   } else {
     traitsContainer.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-secondary); grid-column: span 2; font-style: italic; margin: 0;">Extracting conversation traits...</p>`;
   }

   // Render real-time chronological step milestones logs
   const observationsList = document.getElementById('profile-observations');
   if (session.observations && session.observations.length > 0) {
     observationsList.innerHTML = session.observations.map(obs => `
       <li style="margin-bottom: 6px; padding-left: 5px;">
         <span style="color: var(--accent-blue); font-family: monospace; font-size: 0.8rem; margin-right: 6px;">[${obs.time}]</span>
         <span>${obs.text}</span>
       </li>
     `).join('');
   } else {
     observationsList.innerHTML = `<li style="font-style: italic; color: var(--text-secondary); font-size: 0.85rem;">Listening to connection stream...</li>`;
   }
 };

 const resetLiveInsightsPanel = () => {
   activeSelectedSessionId = null;
   noProfileSelectedMsg.style.display = 'margin';
   activeProfileCard.style.display = 'none';
   interceptCallBtn.style.display = 'none';
   activeSessionMetaBadge.style.display = 'none';
 };

 // Handle connection list targeting selections
 activeCallsContainer.addEventListener('click', (e) => {
   const item = e.target.closest('.session-queue-item');
   if (!item) return;
   activeSelectedSessionId = item.getAttribute('data-id');
   fetchLiveTelemetry();
 });

 // Live Telemetry Intercept Action Execution Layer
 interceptCallBtn.addEventListener('click', async () => {
   const sessionId = interceptCallBtn.getAttribute('data-session-id');
   if (!sessionId) return;

   if (confirm('⚡ Warn: Intercepting this call will disconnect the automated Voice Agent pipeline and route the live WebRTC/Twilio stream node directly to your workstation layout. Proceed?')) {
     try {
       if (telephonyWs && telephonyWs.readyState === WebSocket.OPEN) {
         telephonyWs.send(JSON.stringify({
           event: 'takeover',
           callId: sessionId
         }));
         alert('Pipeline detached successfully. Takeover command issued.');
         resetLiveInsightsPanel();
         fetchLiveTelemetry();
       } else {
         throw new Error('WebSocket not connected');
       }
     } catch (err) {
       alert(`Could not intercept active call pipeline: ${err.message}`);
     }
   }
 });

 // --- Historical Logs Feed Ingestion ---
 const callsTbody = document.getElementById('calls-tbody');
 const searchCallsInput = document.getElementById('search-calls');
 let historicalConversations = [];

 const fetchHistoricalLogs = async () => {
   try {
     const clientId = globalClientSelect ? globalClientSelect.value : 'all';
     const res = await fetch(`/api/historical-conversations?clientId=${clientId}`);
     const data = await res.json();
     if (data.success) {
       historicalConversations = data.logs;
       renderHistoricalTable(historicalConversations);
     }
   } catch (err) {
     callsTbody.innerHTML = `<tr><td colspan="6" class="loading-text" style="color: #fca5a5;">Failed to load historic pipeline conversation stream logs.</td></tr>`;
   }
 };

 const renderHistoricalTable = (logs) => {
   if (!logs || logs.length === 0) {
     callsTbody.innerHTML = `<tr><td colspan="6" class="loading-text">No previous communication sessions mapped yet.</td></tr>`;
     return;
   }

   callsTbody.innerHTML = logs.map(log => {
     return `
       <tr>
         <td style="font-size: 0.85rem; font-family: monospace;">${new Date(log.created_at).toLocaleString()}</td>
         <td><span class="badge badge-pending" style="background: rgba(255,255,255,0.05); color:#fff; border: 1px solid var(--glass-border);">${log.source}</span></td>
         <td>
           <div style="font-weight:600; color:#fff;">${log.customer_name || 'Anonymous'}</div>
           <div style="font-size:0.75rem; color:var(--text-secondary); font-family:monospace;">${log.customer_phone || log.customer_email || ''}</div>
         </td>
         <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size:0.85rem;">${log.summary_intent || 'General Intake Inquiry'}</td>
         <td><span class="badge" style="background:${log.status === 'Dispatched' ? 'rgba(16,185,129,0.1)' : 'rgba(6,182,212,0.1)'}; color:${log.status === 'Dispatched' ? '#10b981' : '#06b6d4'}; border: 1px solid ${log.status === 'Dispatched' ? 'rgba(16,185,129,0.2)' : 'rgba(6,182,212,0.2)'};">${log.status}</span></td>
         <td><button class="btn btn-secondary btn-table view-transcript-btn" data-id="${log.id}">View Log</button></td>
       </tr>
     `;
   }).join('');
 };

 searchCallsInput.addEventListener('input', () => {
   const query = searchCallsInput.value.toLowerCase().trim();
   if (!query) {
     renderHistoricalTable(historicalConversations);
     return;
   }
   const filtered = historicalConversations.filter(log => 
     (log.customer_name && log.customer_name.toLowerCase().includes(query)) ||
     (log.summary_intent && log.summary_intent.toLowerCase().includes(query))
   );
   renderHistoricalTable(filtered);
 });

 // --- Historical Deep Transcript Drawer Display Mappings ---
 const callDrawer = document.getElementById('call-drawer');
 const closeCallDrawerBtn = document.getElementById('close-call-drawer-btn');
 const callDrawerOverlay = document.getElementById('call-drawer-overlay');
 const drawerAudioPlayer = document.getElementById('drawer-audio-player');

 callsTbody.addEventListener('click', async (e) => {
   if (e.target.classList.contains('view-transcript-btn')) {
     const logId = e.target.getAttribute('data-id');
     try {
       const res = await fetch(`/api/conversation-transcript/${logId}`);
       const data = await res.json();
       if (data.success) {
         document.getElementById('drawer-caller-name').textContent = data.record.customer_name || 'Unknown';
         document.getElementById('drawer-caller-phone').textContent = data.record.customer_phone || '-';
         document.getElementById('drawer-caller-email').textContent = data.record.customer_email || '-';
         document.getElementById('drawer-caller-address').textContent = data.record.customer_address || '-';
         document.getElementById('drawer-damage-type').textContent = data.record.niche || 'General Restoration';
         document.getElementById('drawer-scheduled-dispatch').textContent = data.record.scheduled_dispatch || 'None Mapped';
         document.getElementById('drawer-call-duration').textContent = data.record.duration || '0:00';

         if (data.record.recording_url) {
           drawerAudioPlayer.style.display = 'block';
           drawerAudioPlayer.src = data.record.recording_url;
         } else {
           drawerAudioPlayer.style.display = 'none';
           drawerAudioPlayer.src = '';
         }

         const linesBox = document.getElementById('drawer-transcript-body');
         if (data.transcript && data.transcript.length > 0) {
           linesBox.innerHTML = data.transcript.map(line => `
             <div style="margin-bottom:10px; font-size:0.85rem; line-height:1.4;">
               <strong style="color:${line.speaker === 'Agent' ? 'var(--accent-cyan)' : '#a855f7'}; text-transform:uppercase; font-size:0.75rem; display:block; margin-bottom:2px;">${line.speaker}:</strong>
               <span style="color:#fff;">${line.text}</span>
             </div>
           `).join('');
         } else {
           linesBox.innerHTML = `<p style="font-style:italic; color:var(--text-secondary); font-size:0.85rem; text-align:center;">No parsed text transcripts available for this interaction type.</p>`;
         }

         callDrawer.classList.remove('hidden');
       }
     } catch (err) {
       alert(`Could not extract complete call log context data: ${err.message}`);
     }
   }
 });

 const closeCallDrawer = () => {
   callDrawer.classList.add('hidden');
   drawerAudioPlayer.pause();
   drawerAudioPlayer.src = '';
 };
 closeCallDrawerBtn.addEventListener('click', closeCallDrawer);
 callDrawerOverlay.addEventListener('click', closeCallDrawer);

 // --- Multi-Tab Navigation Management Layer ---
 const tabButtons = document.querySelectorAll('.tab-btn');
 const tabPanes = document.querySelectorAll('.tab-pane');

 tabButtons.forEach(btn => {
   btn.addEventListener('click', () => {
     const selectedTabId = btn.getAttribute('data-tab');

     tabButtons.forEach(b => b.classList.remove('active'));
     tabPanes.forEach(p => p.classList.remove('active'));

     btn.classList.add('active');
     document.getElementById(selectedTabId).classList.add('active');

     // Handle polling state triggers based on active navigation window layout
     if (selectedTabId === 'calls-tab') {
       fetchLiveTelemetry();
       fetchHistoricalLogs();
       if (!pollingIntervalId) {
         pollingIntervalId = setInterval(fetchLiveTelemetry, 3000); // Poll connections stream every 3s
       }
     } else {
       if (pollingIntervalId) {
         clearInterval(pollingIntervalId);
         pollingIntervalId = null;
       }
     }

     if (selectedTabId === 'billing-tab') fetchBillingLedgerData();
     if (selectedTabId === 'knowledge-tab') fetchKnowledgeDirectory();
     if (selectedTabId === 'settings-tab') handleSettingsViewRouting();
   });
 });

 // --- Stripe Billing Control Sandbox Flow Mappings ---
 const stripeCheckoutModal = document.getElementById('stripe-checkout-modal');
 const closeCheckoutBtn = document.getElementById('close-checkout-btn');
 const stripeCheckoutOverlay = document.getElementById('stripe-checkout-overlay');
 const checkoutForm = document.getElementById('checkout-form');
 const stripeSubscribeBtn = document.getElementById('stripe-subscribe-btn');

 stripeSubscribeBtn.addEventListener('click', () => {
   stripeCheckoutModal.style.display = 'flex';
   stripeCheckoutModal.classList.remove('hidden');
 });

 const closeCheckoutModal = () => {
   stripeCheckoutModal.style.display = 'none';
   stripeCheckoutModal.classList.add('hidden');
 };
 closeCheckoutBtn.addEventListener('click', closeCheckoutModal);
 stripeCheckoutOverlay.addEventListener('click', closeCheckoutModal);

 checkoutForm.addEventListener('submit', async (e) => {
   e.preventDefault();
   const submitBtn = document.getElementById('checkout-submit-btn');
   submitBtn.disabled = true;
   submitBtn.textContent = 'Processing Secure Tokenization...';

   try {
     const res = await fetch('/api/billing/stripe-subscribe', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ name: document.getElementById('checkout-name').value })
     });
     const data = await res.json();
     if (data.success) {
       alert('Subscription authenticated via Stripe Webhook successfully.');
       closeCheckoutModal();
       fetchBillingLedgerData();
     }
   } catch (err) {
     alert(`Checkout Processing Fault: ${err.message}`);
   } finally {
     submitBtn.disabled = false;
     submitBtn.textContent = 'Pay & Subscribe';
   }
 });

 const fetchBillingLedgerData = async () => {
   try {
     const clientId = globalClientSelect ? globalClientSelect.value : 'all';
     const res = await fetch(`/api/billing/ledger?clientId=${clientId}`);
     const data = await res.json();
     if (data.success) {
       document.getElementById('billing-total-calls').textContent = data.ledger.totalSessions;
       document.getElementById('billing-voice-minutes').textContent = data.ledger.voiceMinutes;
       document.getElementById('billing-tokens-used').textContent = data.ledger.tokensConsumed;
       document.getElementById('billing-grand-total').textContent = `$${data.ledger.grandTotal.toFixed(2)}`;

       // Render conditional view based on sub state
       if (data.subscribed) {
         document.getElementById('stripe-inactive-view').classList.add('hidden');
         document.getElementById('stripe-active-view').classList.remove('hidden');
         document.getElementById('stripe-customer-id').textContent = data.stripeCustomerId || 'cus_live_2026X';
         document.getElementById('stripe-card-on-file').textContent = 'Visa ending in 4242';
       } else {
         document.getElementById('stripe-inactive-view').classList.remove('hidden');
         document.getElementById('stripe-active-view').classList.add('hidden');
       }

       // Populate dynamic rows for breakdown matrices
       const invoiceTbody = document.getElementById('invoice-tbody');
       invoiceTbody.innerHTML = `
         <tr><td>Core Pro Account Line</td><td style="text-align:center;">1 Base</td><td style="text-align:right;">$299.00</td><td style="text-align:right;">$${data.subscribed ? '299.00' : '0.00'}</td></tr>
         <tr><td>Realtime Voice Connect</td><td style="text-align:center;">${data.ledger.voiceMinutes} mins</td><td style="text-align:right;">$0.22/min</td><td style="text-align:right;">$${data.ledger.costVoice.toFixed(2)}</td></tr>
         <tr><td>Cognitive Token Pipeline</td><td style="text-align:center;">${data.ledger.tokensConsumed} tokens</td><td style="text-align:right;">$0.01/k</td><td style="text-align:right;">$${data.ledger.costTokens.toFixed(2)}</td></tr>
         <tr><td>CRM Automations Hook</td><td style="text-align:center;">${data.ledger.scheduledDispatches} dispatches</td><td style="text-align:right;">$0.50/ea</td><td style="text-align:right;">$${data.ledger.costCrm.toFixed(2)}</td></tr>
       `;
     }
   } catch (err) {
     console.error('Error fetching metered billing profiles:', err);
   }
 };

 // --- Knowledge Base Document Vector Management Layer ---
 const ragUploadForm = document.getElementById('rag-upload-form');
 const ragDropzone = document.getElementById('rag-dropzone');
 const ragFileInput = document.getElementById('rag-file-input');
 const ragFilenameLabel = document.getElementById('rag-filename-label');
 const ragUploadBtn = document.getElementById('rag-upload-btn');
 const ragFilesList = document.getElementById('rag-files-list');

 ragDropzone.addEventListener('click', () => ragFileInput.click());
 ragFileInput.addEventListener('change', () => {
   if (ragFileInput.files[0]) {
     ragFilenameLabel.textContent = ragFileInput.files[0].name;
     ragUploadBtn.disabled = false;
   }
 });

 ragUploadForm.addEventListener('submit', async (e) => {
   e.preventDefault();
   const file = ragFileInput.files[0];
   if (!file) return;

   ragUploadBtn.disabled = true;
   ragUploadBtn.innerHTML = `<span class="loading-spinner" style="margin-right:8px;"></span>Embedding Chunks...`;

   const formData = new FormData();
   formData.append('document', file);
   formData.append('clientId', globalClientSelect.value);

   try {
     const res = await fetch('/api/knowledge/embed-file', {
       method: 'POST',
       body: formData
     });
     const data = await res.json();
     if (data.success) {
       alert(`Document segmented into ${data.chunks} vector vectors stored seamlessly in Pinecone schema.`);
       ragFileInput.value = '';
       ragFilenameLabel.textContent = 'Drag & drop or click to browse';
       fetchKnowledgeDirectory();
     }
   } catch (err) {
     alert(`Vector parsing configuration layer fault: ${err.message}`);
   } finally {
     ragUploadBtn.innerHTML = `<span class="btn-text">Chunk & Embed Document</span>`;
   }
 });

 const fetchKnowledgeDirectory = async () => {
   try {
     const clientId = globalClientSelect.value;
     const res = await fetch(`/api/knowledge/directory?clientId=${clientId}`);
     const data = await res.json();
     if (data.success && data.files.length > 0) {
       ragFilesList.innerHTML = data.files.map(f => `
         <div class="glass-card" style="padding:10px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; border: 1px solid rgba(255,255,255,0.04);">
           <span style="font-size:0.85rem; color:#fff; font-family:monospace; overflow:hidden; text-overflow:ellipsis;">📂 ${f.name}</span>
           <span style="font-size:0.75rem; color:var(--text-secondary);">${f.size} • ${f.chunks} Chunks</span>
         </div>
       `).join('');
     } else {
       ragFilesList.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; margin-top: 20px;">No custom knowledge vectors mapped to this context.</p>`;
     }
   } catch (err) {
     console.error('Error mapping files system:', err);
   }
 };

 // --- Multi-Tenant Settings Engine Routing ---
 const settingsForm = document.getElementById('settings-form');
 const settingsAllWarning = document.getElementById('settings-all-warning');

 const handleSettingsViewRouting = async () => {
   const selectedClient = globalClientSelect.value;
   if (selectedClient === 'all') {
     settingsForm.classList.add('hidden');
     settingsAllWarning.style.display = 'flex';
   } else {
     settingsAllWarning.style.display = 'none';
     settingsForm.classList.remove('hidden');

     try {
       const res = await fetch(`/api/settings/fetch?clientId=${selectedClient}`);
       const data = await res.json();
       if (data.success && data.config) {
         document.getElementById('settings-name').value = data.config.name || '';
         document.getElementById('settings-niche').value = data.config.niche || '';
         document.getElementById('settings-logo').value = data.config.logo_text || '';
         document.getElementById('settings-phone').value = data.config.hotline_phone || '';
         document.getElementById('settings-greeting').value = data.config.voice_greeting || '';
         document.getElementById('settings-chat-greeting').value = data.config.chat_greeting || '';
         document.getElementById('settings-slack-webhook').value = data.config.slack_webhook || '';
         document.getElementById('settings-sms-phone').value = data.config.alert_sms_phone || '';
         document.getElementById('settings-notify-on-lead').checked = !!data.config.notifications_enabled;
         document.getElementById('settings-voice-tone').value = data.config.voice_model_tone || 'alloy';
         document.getElementById('settings-voice-instructions').value = data.config.system_prompt_override || '';
       }
     } catch (err) {
       console.error('Failed structural parameters injection settings panel:', err);
     }
   }
 };

 settingsForm.addEventListener('submit', async (e) => {
   e.preventDefault();
   const saveBtn = document.getElementById('save-settings-btn');
   saveBtn.disabled = true;
   saveBtn.innerHTML = `<span class="loading-spinner"></span>Saving Variables...`;

   const payload = {
     clientId: globalClientSelect.value,
     name: document.getElementById('settings-name').value,
     niche: document.getElementById('settings-niche').value,
     logoText: document.getElementById('settings-logo').value,
     hotlinePhone: document.getElementById('settings-phone').value,
     voiceGreeting: document.getElementById('settings-greeting').value,
     chatGreeting: document.getElementById('settings-chat-greeting').value,
     slackWebhook: document.getElementById('settings-slack-webhook').value,
     alertSmsPhone: document.getElementById('settings-sms-phone').value,
     notificationsEnabled: document.getElementById('settings-notify-on-lead').checked,
     voiceTone: document.getElementById('settings-voice-tone').value,
     systemPromptOverride: document.getElementById('settings-voice-instructions').value
   };

   try {
     const res = await fetch('/api/settings/save', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload)
     });
     const data = await res.json();
     if (data.success) {
       alert('Client application profile parameters synced and committed to SQLite layer config properties successfully.');
       refreshDashboard();
     }
   } catch (err) {
     alert(`Settings Synchronization Layer Error: ${err.message}`);
   } finally {
     saveBtn.disabled = false;
     saveBtn.innerHTML = 'Save Settings';
   }
 });

 // --- Master Dashboard Orchestrator Refresh Trigger Routine ---
 const refreshDashboard = () => {
   fetchStats();
   fetchRegistry();
   fetchRecentDispatches();
   const activeTabButton = document.querySelector('.tab-btn.active');
   if (activeTabButton) {
     const activeTabId = activeTabButton.getAttribute('data-tab');
     if (activeTabId === 'calls-tab') { fetchLiveTelemetry(); fetchHistoricalLogs(); }
     if (activeTabId === 'billing-tab') fetchBillingLedgerData();
     if (activeTabId === 'knowledge-tab') fetchKnowledgeDirectory();
     if (activeTabId === 'settings-tab') handleSettingsViewRouting();
   }
 };

 // Wire Account Context Selection Changes
 if (globalClientSelect) {
   globalClientSelect.addEventListener('change', refreshDashboard);
 }

 // Initial Sync Core Run Execution Mappings
 refreshDashboard();
});

// =============================================================
// LIVE CONVERSATION STREAM & INTERJECTION LOGIC
// =============================================================
let liveSocket = null;
let audioContext = null;
let mediaStream = null;
let processor = null;

const toggleMicBtn = document.getElementById('toggle-mic-btn');
const streamStatus = document.getElementById('stream-status');
const transcriptBox = document.getElementById('live-transcript-box');
const interjectInput = document.getElementById('interject-note-input');
const sendInterjectBtn = document.getElementById('send-interject-btn');

toggleMicBtn?.addEventListener('click', async () => {
  if (liveSocket && liveSocket.readyState === WebSocket.OPEN) {
    stopMicStream();
  } else {
    await startMicStream();
  }
});

async function startMicStream() {
  try {
    // 1. Establish WebSocket to backend
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    liveSocket = new WebSocket(`${protocol}//${window.location.host}/voice-stream`);

    liveSocket.onopen = async () => {
      streamStatus.textContent = 'Live Streaming';
      streamStatus.style.background = 'rgba(16, 185, 129, 0.2)';
      streamStatus.style.color = '#34d399';
      
      toggleMicBtn.textContent = '⏹️ End Stream';
      toggleMicBtn.style.background = '#e11d48';
      
      transcriptBox.innerHTML = '<p style="color: #34d399; font-weight: 600;">[Connected to Realtime Voice Engine]</p>';

      // 2. Request Laptop Microphone Access
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      
      const source = audioContext.createMediaStreamSource(mediaStream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!liveSocket || liveSocket.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 audio to PCM16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send raw audio buffer to Express server
        liveSocket.send(pcm16.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    };

    liveSocket.onmessage = (event) => {
      // Append AI stream packets to live transcript log
      const p = document.createElement('p');
      p.style.color = '#22d3ee';
      p.textContent = `🤖 AI Response Packet (${event.data.byteLength || event.data.length} bytes)`;
      transcriptBox.appendChild(p);
      transcriptBox.scrollTop = transcriptBox.scrollHeight;
    };

    liveSocket.onclose = () => {
      stopMicStream();
    };

  } catch (err) {
    console.error('Microphone stream error:', err);
    alert('Microphone access denied or connection failed.');
  }
}

function stopMicStream() {
  if (processor) processor.disconnect();
  if (audioContext) audioContext.close();
  if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
  if (liveSocket) liveSocket.close();

  liveSocket = null;
  streamStatus.textContent = 'Offline';
  streamStatus.style.background = 'rgba(255, 255, 255, 0.1)';
  streamStatus.style.color = '#888';
  
  toggleMicBtn.textContent = '🎙️ Start Mic Stream';
  toggleMicBtn.style.background = '#06b6d4';
}

// 3. Handle Mid-Call Interjection Note Injection
sendInterjectBtn?.addEventListener('click', () => {
  const note = interjectInput.value.trim();
  if (!note || !liveSocket || liveSocket.readyState !== WebSocket.OPEN) return;

  liveSocket.send(JSON.stringify({
    type: 'system_interjection',
    note: note
  }));

  const p = document.createElement('p');
  p.style.color = '#fbbf24';
  p.style.fontWeight = '500';
  p.textContent = `📝 [Injected Note]: "${note}"`;
  transcriptBox.appendChild(p);
  interjectInput.value = '';
});