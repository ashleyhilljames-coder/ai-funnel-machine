document.addEventListener('DOMContentLoaded', () => {
    // --- Authorization Session Gate ---
    const token = sessionStorage.getItem('authToken');
    const authClientId = sessionStorage.getItem('authClientId');
    const authClientName = sessionStorage.getItem('authClientName');

    if (!token || !authClientId) {
        window.location.href = 'login.html';
        return;
    }

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
        return originalFetch(url, options).then(response => {
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
        logoutBtn.addEventListener('click', () => {
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
    const drawRoundedRect = (ctx, x, y, width, height, radius) => {
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

    const drawDoughnutChart = (canvasId, qualifiedCount, blockedCount) => {
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

    const drawBarChart = (canvasId, damageTypes) => {
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

        const vals = categories.map(c => damageTypes[c] || 0);
        const maxVal = Math.max(...vals, 1);
        const hasData = vals.some(v => v > 0);

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

        categories.forEach((cat, idx) => {
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
            if (barW > 0) {
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

    const fetchStats = async () => {
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
                funnelLeadsBar.style.width = totalLeads > 0 ? '100%' : '0%';

                // Outreach dispatched conversion rate
                const outreachPct = totalLeads > 0 ? Math.round((outreach / totalLeads) * 100) : 0;
                funnelOutreachBar.style.width = `${outreachPct}%`;
                funnelOutreachRate.textContent = `Outreach Conversion: ${outreachPct}%`;

                // Voice Call Intake is baseline 100% for phone channel
                funnelCallsBar.style.width = calls > 0 ? '100%' : '0%';

                // Dispatches conversion rate
                const dispatchPct = calls > 0 ? Math.round((dispatches / calls) * 100) : 0;
                funnelDispatchesBar.style.width = `${dispatchPct}%`;
                funnelDispatchRate.textContent = `Dispatch Booking Rate: ${dispatchPct}%`;
            }
        } catch (err) {
            console.error('❌ Error fetching dashboard stats:', err);
        }
    };

    const renderRegistryTable = (leads) => {
        if (!leads || leads.length === 0) {
            registryTbody.innerHTML = `<tr><td colspan="7" class="loading-text">No duplicate guard logs found.</td></tr>`;
            return;
        }

        registryTbody.innerHTML = leads.map(lead => {
            const dateStr = new Date(lead.processed_at).toLocaleString();
            
            const statusClass = lead.status === 'contacted' ? 'badge-contacted' : 'badge-pending';
            const statusText = lead.status === 'contacted' ? 'Sent' : 'Pending';
            
            const actionButtonHtml = lead.status === 'contacted' 
                ? `<span style="color: #10b981; font-weight: 600; font-size: 0.85rem;">✓ Dispatched</span>`
                : `<button class="btn btn-primary btn-table send-campaign-btn" 
                      data-email="${lead.email}" 
                      data-name="${lead.name || ''}" 
                      data-niche="${lead.niche || ''}" 
                      data-client="${lead.client_id}">📝 Draft</button>`;

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

    const fetchRegistry = async () => {
        try {
            const clientId = globalClientSelect ? globalClientSelect.value : 'all';
            const res = await fetch(`/api/leads-registry?clientId=${clientId}`);
            const data = await res.json();
            if (data.success) {
                allLeads = data.leads;
                renderRegistryTable(allLeads);
            }
        } catch (err) {
            console.error('❌ Error fetching lead registry:', err);
            registryTbody.innerHTML = `<tr><td colspan="7" class="loading-text" style="color: #fca5a5;">Failed to load logs registry.</td></tr>`;
        }
    };

    // --- Scraper Submission ---
    scraperForm.addEventListener('submit', async (e) => {
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            const data = await res.json();

            scraperReport.classList.remove('hidden');
            if (res.ok && data.success) {
                scraperReport.innerHTML = `
📝 Google Places Scraper Campaign Report
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
            scraperReport.textContent = `❌ Scraper Execution Error: ${err.message}`;
        } finally {
            scraperSubmitBtn.disabled = false;
            scraperSubmitText.textContent = 'Run Google Search';
            scraperSpinner.classList.add('hidden');
            refreshDashboard();
        }
    });

    // --- CSV Drag & Drop / Upload ---
    const handleCSVUpload = async (file) => {
        if (!file) return;

        // Visual loading state inside drop zone
        const originalText = dropZone.innerHTML;
        dropZone.innerHTML = `<span class="loading-spinner"></span> <span class="drop-text" style="margin-top: 8px;">Processing CSV Sheet...</span>`;
        importerReport.classList.add('hidden');
        importerReport.classList.remove('error');

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            try {
                const res = await fetch('/api/upload-csv', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: file.name,
                        content: content
                    })
                });

                const data = await res.json();

                importerReport.classList.remove('hidden');
                if (res.ok && data.success) {
                    importerReport.innerHTML = `
📝 CSV Importer Ingestion Report
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
                importerReport.textContent = `❌ CSV Ingestion Error: ${err.message}`;
            } finally {
                // Restore drop zone markup
                dropZone.innerHTML = originalText;
                refreshDashboard();
            }
        };

        reader.onerror = () => {
            importerReport.classList.remove('hidden');
            importerReport.classList.add('error');
            importerReport.textContent = `❌ Error reading local CSV file.`;
            dropZone.innerHTML = originalText;
        };

        reader.readAsText(file);
    };

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleCSVUpload(file);
            fileInput.value = ''; // Reset file input
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
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
    searchInput.addEventListener('input', () => {
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
    clearRegistryBtn.addEventListener('click', async () => {
        if (!confirm('Are you absolutely sure you want to clear the entire Lead Guard registry? This will reset all duplicate check protections for campaigns.')) {
            return;
        }

        try {
            const res = await fetch('/api/clear-registry', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert('🧹 SQLite Lead Registry reset successfully.');
                refreshDashboard();
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            alert(`❌ Failed to clear database: ${err.message}`);
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

    const closeDrawer = () => {
        campaignDrawer.classList.add('hidden');
        activeCampaignLead = null;
        if (campaignTemplateSelect) campaignTemplateSelect.disabled = false;
        if (campaignSubjectInput) campaignSubjectInput.disabled = false;
        if (campaignBodyTextarea) campaignBodyTextarea.disabled = false;
        if (sendCampaignEmailBtn) {
            sendCampaignEmailBtn.disabled = false;
            sendCampaignEmailBtn.innerHTML = `🚀 Confirm & Send Campaign`;
        }
    };

    closeDrawerBtn.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);

    // Helper to fetch draft and populate editor
    const fetchAndLoadDraft = async (email, name, niche, client, template) => {
        try {
            // Disable controls during load
            campaignTemplateSelect.disabled = true;
            campaignSubjectInput.disabled = true;
            campaignBodyTextarea.disabled = true;
            sendCampaignEmailBtn.disabled = true;
            sendCampaignEmailBtn.innerHTML = `<span class="loading-spinner" style="width:12px; height:12px; border-width:1.5px;"></span> Generating Draft...`;

            const res = await fetch('/api/generate-campaign-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            console.error('❌ Draft error:', err);
            alert(`❌ Error generating draft: ${err.message}`);
        } finally {
            // Re-enable controls
            campaignTemplateSelect.disabled = false;
            campaignSubjectInput.disabled = false;
            campaignBodyTextarea.disabled = false;
            sendCampaignEmailBtn.disabled = false;
            sendCampaignEmailBtn.innerHTML = `🚀 Confirm & Send Campaign`;
        }
    };

    // Live template swapping listener
    campaignTemplateSelect.addEventListener('change', async () => {
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
    registryTbody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('send-campaign-btn')) {
            const btn = e.target;
            const email = btn.getAttribute('data-email');
            const name = btn.getAttribute('data-name');
            const niche = btn.getAttribute('data-niche');
            const client = btn.getAttribute('data-client');

            // Set Loading UI state on button
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<span class="loading-spinner" style="width:12px; height:12px; border-width:1.5px;"></span>`;

            try {
                // Save active lead details
                activeCampaignLead = { email, name, niche, client };

                // Infer initial template based on niche
                const nicheLower = (niche || '').toLowerCase();
                let initialTemplate = 'mitigation';
                if (nicheLower.includes('roof')) {
                    initialTemplate = 'roofing';
                } else if (nicheLower.includes('property')) {
                    initialTemplate = 'property';
                }
                campaignTemplateSelect.value = initialTemplate;

                // Load the initial draft in the editor
                await fetchAndLoadDraft(email, name, niche, client, initialTemplate);

                // Open the drawer
                campaignDrawer.classList.remove('hidden');
            } catch (err) {
                alert(`❌ Campaign Error: ${err.message}`);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    });

    // Submit campaign email send listener
    sendCampaignEmailBtn.addEventListener('click', async () => {
        if (!activeCampaignLead) return;

        const subject = campaignSubjectInput.value.trim();
        const body = campaignBodyTextarea.value.trim();

        if (!subject || !body) {
            alert('⚠️ Subject and body cannot be empty.');
            return;
        }

        const originalText = sendCampaignEmailBtn.innerHTML;
        sendCampaignEmailBtn.disabled = true;
        sendCampaignEmailBtn.innerHTML = `<span class="loading-spinner" style="width:12px; height:12px; border-width:1.5px;"></span> Dispatched...`;

        try {
            const res = await fetch('/api/send-campaign-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: activeCampaignLead.email,
                    clientId: activeCampaignLead.client,
                    subject,
                    body
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                closeDrawer();
                refreshDashboard();
            } else {
                throw new Error(data.error || 'Failed to send campaign email.');
            }
        } catch (err) {
            alert(`❌ Error sending email: ${err.message}`);
            sendCampaignEmailBtn.disabled = false;
            sendCampaignEmailBtn.innerHTML = originalText;
        }
    });

    // --- Tabs Navigation ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // --- Call History Logs ---
    const callsTbody = document.getElementById('calls-tbody');
    const searchCallsInput = document.getElementById('search-calls');
    let allCalls = [];

    const fetchCallLogs = async () => {
        try {
            const clientId = globalClientSelect ? globalClientSelect.value : 'all';
            const res = await fetch(`/api/call-logs?clientId=${clientId}`);
            const data = await res.json();
            if (data.success) {
                allCalls = data.logs;
                renderCallsTable(allCalls);
            }
        } catch (err) {
            console.error('❌ Error fetching call logs:', err);
            callsTbody.innerHTML = `<tr><td colspan="6" class="loading-text" style="color: #fca5a5;">Failed to load conversation logs.</td></tr>`;
        }
    };

    const renderCallsTable = (calls) => {
        if (!calls || calls.length === 0) {
            callsTbody.innerHTML = `<tr><td colspan="6" class="loading-text">No conversations found.</td></tr>`;
            return;
        }

        callsTbody.innerHTML = calls.map(call => {
            const dateStr = new Date(call.started_at).toLocaleString();
            
            // Format source badge
            let badgeClass = 'badge-pending';
            let sourceText = call.source;
            if (call.source === 'telephony') {
                badgeClass = 'badge-contacted'; // Blue-ish
                sourceText = '📞 Voice (Phone)';
            } else if (call.source === 'browser') {
                badgeClass = 'badge-pending'; // Orange-ish
                sourceText = '🎙️ Voice (Web)';
            } else if (call.source === 'web_chat') {
                badgeClass = 'badge-scheduled'; // Purple accent
                sourceText = '💬 Web Chat';
            } else if (call.source === 'sms') {
                badgeClass = 'badge-scheduled';
                sourceText = '📱 SMS Chat';
            }

            // Format lead info
            let infoHtml = `<strong style="color: #fff;">${call.caller_name || 'Anonymous Prospect'}</strong>`;
            const contactDetails = [];
            if (call.caller_phone) contactDetails.push(`📞 ${call.caller_phone}`);
            if (call.caller_email) contactDetails.push(`✉️ ${call.caller_email}`);
            if (call.caller_address) contactDetails.push(`📍 ${call.caller_address}`);
            if (contactDetails.length > 0) {
                infoHtml += `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.3;">${contactDetails.join(' | ')}</div>`;
            }

            // Format AI agent activity
            let activityHtml = `<div style="font-size: 0.85rem; color: #e5e7eb; line-height: 1.4;">${call.agent_activity || '<span style="color:#6b7280;">Conversing with prospect...</span>'}</div>`;
            if (call.damage_type) {
                activityHtml += `<div style="font-size: 0.75rem; color: var(--accent-orange); margin-top: 4px; font-weight: 600;">Preference/Damage: ${call.damage_type}</div>`;
            }

            // Format status badge
            let statusHtml = '<span class="badge badge-unscheduled">No Sync</span>';
            if (call.action_taken) {
                let badgeStyle = 'background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: #fff;';
                if (call.action_taken.includes('FieldPulse') || call.action_taken.includes('Dispatched')) {
                    badgeStyle = 'background: rgba(249,115,22,0.15); border: 1px solid var(--accent-orange); color: var(--accent-orange);';
                } else if (call.action_taken.includes('Calendly') || call.action_taken.includes('Booked')) {
                    badgeStyle = 'background: rgba(16,185,129,0.15); border: 1px solid var(--success-green); color: var(--success-green);';
                } else if (call.action_taken.includes('CRM') || call.action_taken.includes('KVCore') || call.action_taken.includes('Lofty')) {
                    badgeStyle = 'background: rgba(59,130,246,0.15); border: 1px solid var(--accent-blue); color: var(--accent-blue);';
                }
                statusHtml = `<span class="badge" style="font-size:0.8rem; font-weight:700; ${badgeStyle}">${call.action_taken}</span>`;
            } else if (call.scheduled_dispatch) {
                statusHtml = `<span class="badge badge-scheduled" style="font-size:0.8rem;">📅 ${call.scheduled_dispatch}</span>`;
            }

            const actionButtonHtml = `<button class="btn btn-primary btn-table view-call-btn" data-id="${call.id}">📄 Details</button>`;

            return `
                <tr>
                    <td style="font-family: monospace; font-size: 0.85rem;">${dateStr}</td>
                    <td><span class="badge ${badgeClass}">${sourceText}</span></td>
                    <td>${infoHtml}</td>
                    <td>${activityHtml}</td>
                    <td>${statusHtml}</td>
                    <td>${actionButtonHtml}</td>
                </tr>
            `;
        }).join('');
    };

    searchCallsInput.addEventListener('input', () => {
        const query = searchCallsInput.value.toLowerCase().trim();
        if (!query) {
            renderCallsTable(allCalls);
            return;
        }

        const filtered = allCalls.filter(call => 
            (call.caller_name || '').toLowerCase().includes(query) || 
            (call.caller_phone || '').toLowerCase().includes(query) || 
            (call.caller_email || '').toLowerCase().includes(query) || 
            (call.caller_address || '').toLowerCase().includes(query) ||
            (call.damage_type || '').toLowerCase().includes(query)
        );
        renderCallsTable(filtered);
    });

    // --- Call Drawer controls ---
    const callDrawer = document.getElementById('call-drawer');
    const closeCallDrawerBtn = document.getElementById('close-call-drawer-btn');
    const callDrawerOverlay = document.getElementById('call-drawer-overlay');
    const drawerAudioPlayer = document.getElementById('drawer-audio-player');
    
    const closeCallDrawer = () => {
        callDrawer.classList.add('hidden');
        drawerAudioPlayer.pause();
        drawerAudioPlayer.src = '';
    };

    closeCallDrawerBtn.addEventListener('click', closeCallDrawer);
    callDrawerOverlay.addEventListener('click', closeCallDrawer);

    // Event delegation for table click to open call details drawer
    callsTbody.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-call-btn')) {
            const callId = e.target.getAttribute('data-id');
            const call = allCalls.find(c => c.id === callId);
            if (!call) return;

            // Load meta details
            document.getElementById('drawer-caller-name').textContent = call.caller_name || 'Anonymous Caller';
            document.getElementById('drawer-caller-phone').textContent = call.caller_phone || '--';
            document.getElementById('drawer-caller-email').textContent = call.caller_email || '--';
            document.getElementById('drawer-caller-address').textContent = call.caller_address || '--';
            document.getElementById('drawer-damage-type').textContent = call.damage_type || '--';
            document.getElementById('drawer-scheduled-dispatch').textContent = call.scheduled_dispatch || '--';
            
            const minutes = Math.floor(call.duration / 60);
            const seconds = call.duration % 60;
            document.getElementById('drawer-call-duration').textContent = `${minutes}m ${seconds}s`;

            // Load audio player
            if (call.recording_path) {
                drawerAudioPlayer.src = call.recording_path;
                drawerAudioPlayer.parentElement.classList.remove('hidden');
            } else {
                drawerAudioPlayer.src = '';
                drawerAudioPlayer.parentElement.classList.add('hidden');
            }

            // Load transcript formatted
            const transcriptBody = document.getElementById('drawer-transcript-body');
            if (call.transcript) {
                const lines = call.transcript.split('\n');
                transcriptBody.innerHTML = lines.map(line => {
                    if (line.startsWith('[User]:')) {
                        return `<div class="transcript-line user-line">👤 <strong>Customer:</strong> ${line.substring(7).trim()}</div>`;
                    } else if (line.startsWith('[AI]:')) {
                        return `<div class="transcript-line ai-line">🤖 <strong>Assistant:</strong> ${line.substring(5).trim()}</div>`;
                    }
                    return `<div class="transcript-line">${line}</div>`;
                }).join('');
            } else {
                transcriptBody.innerHTML = `<p style="color:#6b7280; text-align:center; font-style:italic;">No transcript available for this call.</p>`;
            }

            // Open drawer
            callDrawer.classList.remove('hidden');
        }
    });

    const updateWebhookUrlInput = () => {
        const webhookUrlInput = document.getElementById('webhook-url-input');
        if (!webhookUrlInput) return;
        const clientId = globalClientSelect ? globalClientSelect.value : 'all';
        const queryParam = clientId === 'all' ? '?clientId=YOUR_CLIENT_ID' : `?clientId=${clientId}`;
        webhookUrlInput.value = `${window.location.origin}/api/webhooks/meta-lead${queryParam}`;
    };

    // Webhook Copy Button
    const copyWebhookBtn = document.getElementById('copy-webhook-btn');
    if (copyWebhookBtn) {
        copyWebhookBtn.addEventListener('click', () => {
            const webhookUrlInput = document.getElementById('webhook-url-input');
            if (webhookUrlInput) {
                navigator.clipboard.writeText(webhookUrlInput.value);
                const originalText = copyWebhookBtn.innerHTML;
                copyWebhookBtn.innerHTML = '✅ Copied!';
                setTimeout(() => {
                    copyWebhookBtn.innerHTML = originalText;
                }, 2000);
            }
        });
    }

    // --- Meta Ads Simulator ---
    const simulatorForm = document.getElementById('simulator-form');
    const simulatorSubmitBtn = document.getElementById('simulator-submit-btn');
    const simulatorReport = document.getElementById('simulator-report');

    if (simulatorForm) {
        simulatorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const client = document.getElementById('sim-client').value;
            const damage = document.getElementById('sim-damage').value;
            const name = document.getElementById('sim-name').value.trim();
            const phone = document.getElementById('sim-phone').value.trim();
            const email = document.getElementById('sim-email').value.trim();

            if (!name || !phone || !email) {
                alert('⚠️ Please fill out all required fields.');
                return;
            }

            // Show loading
            const spinner = simulatorSubmitBtn.querySelector('.loading-spinner');
            const btnText = simulatorSubmitBtn.querySelector('.btn-text');
            if (spinner) spinner.classList.remove('hidden');
            if (btnText) btnText.textContent = 'Triggering Ingestion...';
            simulatorSubmitBtn.disabled = true;
            simulatorReport.classList.add('hidden');
            simulatorReport.classList.remove('error');

            try {
                const res = await fetch(`/api/webhooks/meta-lead?clientId=${client}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        phone,
                        email,
                        damageType: damage,
                        clientId: client
                    })
                });

                const data = await res.json();
                simulatorReport.classList.remove('hidden');

                if (res.ok && data.success) {
                    if (data.blocked) {
                        simulatorReport.innerHTML = `🛡️ [Lead Guard Blocked]\n-------------------------\nStatus: Success (Blocked duplicate)\nMessage: ${data.message}\nClient: ${client}\nNiche: ${damage}\nLead: ${name} (${email})`;
                        simulatorReport.style.borderColor = '#eab308';
                        simulatorReport.style.color = '#eab308';
                    } else {
                        simulatorReport.innerHTML = `✅ [Lead Ingested Successfully]\n--------------------------------\nStatus: Success\nMessage: ${data.message}\nClient: ${client}\nNiche: ${damage}\nLead: ${name} (${email})\nSMS/Email notification dispatched.`;
                        simulatorReport.style.borderColor = '#10b981';
                        simulatorReport.style.color = '#34d399';
                        
                        // Clear inputs
                        document.getElementById('sim-name').value = '';
                        document.getElementById('sim-phone').value = '';
                        document.getElementById('sim-email').value = '';
                    }
                    
                    // Refresh dashboard to show the new lead
                    refreshDashboard();
                } else {
                    throw new Error(data.error || 'Webhook returned error status');
                }
            } catch (err) {
                console.error(err);
                simulatorReport.classList.remove('hidden');
                simulatorReport.style.borderColor = '#ef4444';
                simulatorReport.style.color = '#f87171';
                simulatorReport.innerHTML = `❌ [Ingestion Failed]\n---------------------\nError: ${err.message}`;
            } finally {
                if (spinner) spinner.classList.add('hidden');
                if (btnText) btnText.textContent = '🚀 Trigger Mock Meta Ad Ingestion';
                simulatorSubmitBtn.disabled = false;
            }
        });
    }

    if (globalClientSelect) {
        globalClientSelect.addEventListener('change', () => {
            updateWebhookUrlInput();
            refreshDashboard();
            loadClientSettings();
        });
    }

    // --- Knowledge Base RAG Management ---
    const ragUploadForm = document.getElementById('rag-upload-form');
    const ragDropzone = document.getElementById('rag-dropzone');
    const ragFileInput = document.getElementById('rag-file-input');
    const ragFilenameLabel = document.getElementById('rag-filename-label');
    const ragUploadBtn = document.getElementById('rag-upload-btn');
    const ragFilesList = document.getElementById('rag-files-list');
    const ragQueryForm = document.getElementById('rag-query-form');
    const ragSandboxQuery = document.getElementById('rag-sandbox-query');
    const ragResultsContainer = document.getElementById('rag-results-container');
    const ragLatencyLabel = document.getElementById('rag-sandbox-latency');

    let selectedFileContent = null;
    let selectedFileName = null;

    // Dropzone Interactivity
    if (ragDropzone && ragFileInput) {
        ragDropzone.addEventListener('click', () => ragFileInput.click());

        ragDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            ragDropzone.style.borderColor = 'var(--accent-orange)';
            ragDropzone.style.background = 'rgba(249, 115, 22, 0.05)';
        });

        ragDropzone.addEventListener('dragleave', () => {
            ragDropzone.style.borderColor = 'var(--glass-border)';
            ragDropzone.style.background = 'rgba(0,0,0,0.1)';
        });

        ragDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            ragDropzone.style.borderColor = 'var(--glass-border)';
            ragDropzone.style.background = 'rgba(0,0,0,0.1)';
            if (e.dataTransfer.files.length > 0) {
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        ragFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });
    }

    const handleFileSelect = (file) => {
        if (!file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
            alert('⚠️ Only .txt and .md text files are supported.');
            return;
        }

        selectedFileName = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedFileContent = e.target.result;
            ragFilenameLabel.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            ragUploadBtn.disabled = false;
        };
        reader.readAsText(file);
    };

    // File Upload Handler
    if (ragUploadForm) {
        ragUploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!selectedFileContent || !selectedFileName) return;

            const clientId = globalClientSelect ? globalClientSelect.value : 'all';
            if (clientId === 'all') {
                alert('⚠️ Please select a specific client account from the header to assign this knowledge base.');
                return;
            }

            const btnText = ragUploadBtn.querySelector('.btn-text');
            const spinner = ragUploadBtn.querySelector('.loading-spinner');
            const originalText = btnText ? btnText.textContent : 'Chunk & Embed Document';

            ragUploadBtn.disabled = true;
            if (btnText) btnText.textContent = 'Chunking & embedding...';
            if (spinner) spinner.classList.remove('hidden');

            try {
                const res = await fetch('/api/knowledge/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientId,
                        filename: selectedFileName,
                        content: selectedFileContent
                    })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    alert(`✅ Document chunked and embedded successfully! Total: ${data.chunkCount} vector blocks.`);
                    
                    // Reset upload states
                    selectedFileContent = null;
                    selectedFileName = null;
                    ragFilenameLabel.textContent = 'Drag & drop or click to browse';
                    ragUploadBtn.disabled = true;
                    if (ragFileInput) ragFileInput.value = '';
                    
                    fetchRagFiles();
                } else {
                    throw new Error(data.error || 'Server upload failed.');
                }
            } catch (err) {
                alert(`❌ Ingestion failed: ${err.message}`);
            } finally {
                if (spinner) spinner.classList.add('hidden');
                if (btnText) btnText.textContent = originalText;
            }
        });
    }

    // List Files Directory
    const fetchRagFiles = async () => {
        const clientId = globalClientSelect ? globalClientSelect.value : 'all';
        if (clientId === 'all') {
            ragFilesList.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; margin-top: 20px;">Select a specific client account to view directory.</p>`;
            return;
        }

        try {
            const res = await fetch(`/api/knowledge/files?clientId=${clientId}`);
            const data = await res.json();
            if (res.ok && data.success) {
                renderRagFiles(data.files);
            }
        } catch (err) {
            console.error('❌ Failed to fetch RAG files list:', err);
        }
    };

    const renderRagFiles = (files) => {
        if (!files || files.length === 0) {
            ragFilesList.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; margin-top: 20px;">No files uploaded yet.</p>`;
            return;
        }

        ragFilesList.innerHTML = files.map(f => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 8px 12px; border-radius: var(--border-radius-sm); font-size: 0.85rem;">
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                    <span style="font-size: 1rem;">📄</span>
                    <span style="font-weight: 600; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${f.filename}</span>
                    <span style="font-size: 0.75rem; color: var(--text-secondary); background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 10px;">${f.chunk_count} chunks</span>
                </div>
                <button class="delete-rag-btn" data-filename="${f.filename}" style="background: transparent; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.1rem; line-height: 1; transition: color var(--transition-fast);">🗑️</button>
            </div>
        `).join('');
    };

    // Delete File delegation
    if (ragFilesList) {
        ragFilesList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-rag-btn')) {
                const filename = e.target.getAttribute('data-filename');
                const clientId = globalClientSelect ? globalClientSelect.value : 'all';
                if (clientId === 'all') return;

                if (!confirm(`🧹 Delete knowledge base file "${filename}"? This removes all vector embeddings from memory.`)) return;

                try {
                    const res = await fetch('/api/knowledge/files', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ clientId, filename })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        fetchRagFiles();
                    } else {
                        throw new Error(data.error || 'Delete failed.');
                    }
                } catch (err) {
                    alert(`❌ Failed to delete file: ${err.message}`);
                }
            }
        });
    }

    // Vector Sandbox Testing Form
    if (ragQueryForm) {
        ragQueryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = ragSandboxQuery.value.trim();
            const clientId = globalClientSelect ? globalClientSelect.value : 'all';
            if (clientId === 'all') {
                alert('⚠️ Please select a specific client account in the header first.');
                return;
            }

            ragResultsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; margin-top: 50px;">Scoring matching vectors...</p>';
            ragLatencyLabel.textContent = 'Latency: --ms';

            try {
                const res = await fetch('/api/knowledge/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId, query })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    ragLatencyLabel.textContent = `Latency: ${data.latencyMs}ms`;
                    if (!data.matches || data.matches.length === 0) {
                        ragResultsContainer.innerHTML = '<p style="color: #fca5a5; text-align: center; margin-top: 50px;">No vector matches. Try seeding documents in the left column.</p>';
                        return;
                    }

                    ragResultsContainer.innerHTML = data.matches.map((m, index) => {
                        const matchPct = (m.score * 100).toFixed(1);
                        let matchColor = '#9ca3af'; // default grey
                        if (m.score > 0.8) matchColor = '#34d399'; // green for high match
                        else if (m.score > 0.6) matchColor = '#60a5fa'; // blue for medium

                        return `
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 12px; border-radius: var(--border-radius-sm);">
                                <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.8rem; margin-bottom: 6px;">
                                    <span style="color: var(--accent-orange);">MATCH #${index + 1}</span>
                                    <span style="color: ${matchColor};">Cosine Similarity: ${matchPct}%</span>
                                </div>
                                <div style="color: #fff; white-space: pre-wrap; word-break: break-word; font-family: sans-serif; font-size: 0.85rem; line-height: 1.4;">${m.content}</div>
                            </div>
                        `;
                    }).join('');
                } else {
                    throw new Error(data.error || 'Sandbox query returned error');
                }
            } catch (err) {
                console.error(err);
                ragResultsContainer.innerHTML = `<p style="color: #f87171; text-align: center; margin-top: 50px;">❌ Query Error: ${err.message}</p>`;
            }
        });
    }

    // --- Usage & Billing Tab Handling ---
    const billingTotalCalls = document.getElementById('billing-total-calls');
    const billingVoiceMinutes = document.getElementById('billing-voice-minutes');
    const billingTokensUsed = document.getElementById('billing-tokens-used');
    const billingGrandTotal = document.getElementById('billing-grand-total');
    const invoiceTbody = document.getElementById('invoice-tbody');
    const billingSessionsTbody = document.getElementById('billing-sessions-tbody');
    const simulateChargeBtn = document.getElementById('simulate-charge-btn');
    const downloadInvoiceBtn = document.getElementById('download-invoice-btn');

    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const fetchBillingData = async () => {
        try {
            const clientId = globalClientSelect ? globalClientSelect.value : 'all';
            const res = await fetch(`/api/dashboard-billing?clientId=${clientId}`);
            const data = await res.json();
            if (res.ok && data.success) {
                const b = data.billing;
                
                // Set metrics cards
                if (billingTotalCalls) billingTotalCalls.textContent = b.totalCalls;
                if (billingVoiceMinutes) billingVoiceMinutes.textContent = formatTime(b.totalVoiceDurationSeconds);
                if (billingTokensUsed) billingTokensUsed.textContent = b.totalTokens.toLocaleString();
                if (billingGrandTotal) billingGrandTotal.textContent = `$${b.costs.total.toFixed(2)}`;

                // Render Invoice table
                const voiceMins = (b.totalVoiceDurationSeconds / 60).toFixed(2);
                if (invoiceTbody) {
                    invoiceTbody.innerHTML = `
                        <tr>
                            <td style="text-align: left; font-weight: 600;">🎙️ AI Voice Stream</td>
                            <td style="text-align: center;">${voiceMins} mins</td>
                            <td style="text-align: right; color: var(--text-secondary);">$${b.rates.voiceMinute.toFixed(2)}/min</td>
                            <td style="text-align: right; font-weight: bold; color: #fff;">$${b.costs.voice.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="text-align: left; font-weight: 600;">🧠 OpenAI LLM Tokens</td>
                            <td style="text-align: center;">${b.totalTokens.toLocaleString()} tokens</td>
                            <td style="text-align: right; color: var(--text-secondary);">$${(b.rates.token * 1000).toFixed(4)}/1K</td>
                            <td style="text-align: right; font-weight: bold; color: #fff;">$${b.costs.tokens.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="text-align: left; font-weight: 600;">🔌 3rd-Party Dispatches</td>
                            <td style="text-align: center;">${b.totalDispatches} dispatches</td>
                            <td style="text-align: right; color: var(--text-secondary);">$${b.rates.dispatch.toFixed(2)}/each</td>
                            <td style="text-align: right; font-weight: bold; color: #fff;">$${b.costs.dispatches.toFixed(2)}</td>
                        </tr>
                        <tr style="border-top: 2px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.02);">
                            <td colspan="3" style="text-align: left; font-weight: 800; color: #fff; text-transform: uppercase;">Total Invoice Due</td>
                            <td style="text-align: right; font-weight: 800; color: var(--primary-color); font-size: 1.1rem;">$${b.costs.total.toFixed(2)}</td>
                        </tr>
                    `;
                }

                // Render Metered Sessions
                if (billingSessionsTbody) {
                    if (b.sessions.length === 0) {
                        billingSessionsTbody.innerHTML = `<tr><td colspan="6" class="loading-text" style="color: var(--text-secondary); text-align: center; padding: 20px;">No sessions metered yet.</td></tr>`;
                    } else {
                        billingSessionsTbody.innerHTML = b.sessions.map(s => {
                            const sourceEmoji = s.source === 'browser' ? '🎙️ Browser' : (s.source === 'telephony' ? '📞 Twilio' : '💬 Chat');
                            return `
                                <tr>
                                    <td style="text-align: left; font-family: monospace; font-size: 0.8rem; color: var(--text-secondary);">${s.id}</td>
                                    <td style="text-align: center; font-size: 0.85rem; font-weight: 500;">${sourceEmoji}</td>
                                    <td style="text-align: center;">${formatTime(s.durationSeconds)}</td>
                                    <td style="text-align: center; color: var(--text-secondary);">${s.tokensUsed.toLocaleString()}</td>
                                    <td style="text-align: center;">${s.dispatchCount > 0 ? '✅ Yes (' + s.dispatchCount + ')' : '❌ None'}</td>
                                    <td style="text-align: right; font-weight: 700; color: #fff;">$${s.cost.toFixed(2)}</td>
                                </tr>
                            `;
                        }).join('');
                    }
                }

                // Render Stripe Details
                const stripe = b.stripe;
                const stripeInactiveView = document.getElementById('stripe-inactive-view');
                const stripeActiveView = document.getElementById('stripe-active-view');
                const stripeCustomerIdEl = document.getElementById('stripe-customer-id');
                const stripeCardEl = document.getElementById('stripe-card-on-file');
                const stripeInvoicesTbody = document.getElementById('stripe-invoices-tbody');

                if (stripe) {
                    if (stripe.status === 'active') {
                        if (stripeInactiveView) stripeInactiveView.classList.add('hidden');
                        if (stripeActiveView) stripeActiveView.classList.remove('hidden');
                        if (stripeCustomerIdEl) stripeCustomerIdEl.textContent = stripe.customerId;
                        if (stripeCardEl) stripeCardEl.textContent = `💳 ${stripe.cardBrand} ending in ${stripe.cardLast4}`;
                    } else {
                        if (stripeInactiveView) stripeInactiveView.classList.remove('hidden');
                        if (stripeActiveView) stripeActiveView.classList.add('hidden');
                    }

                    // Render invoices history table
                    if (stripeInvoicesTbody) {
                        if (stripe.invoices.length === 0) {
                            stripeInvoicesTbody.innerHTML = `<tr><td colspan="5" class="loading-text" style="color: var(--text-secondary); text-align: center; padding: 15px;">No invoice receipts processed yet.</td></tr>`;
                        } else {
                            stripeInvoicesTbody.innerHTML = stripe.invoices.map(inv => {
                                const specStr = `⏱️ ${inv.voice_minutes}m | 🧠 ${(inv.tokens_used/1000).toFixed(0)}k | 🔌 ${inv.dispatches}`;
                                return `
                                    <tr>
                                        <td style="text-align: left; font-family: monospace; font-size: 0.85rem; color: var(--accent-purple);">${inv.invoice_id}</td>
                                        <td style="text-align: center; font-size: 0.85rem;">${inv.created_at}</td>
                                        <td style="text-align: center; font-size: 0.8rem; color: var(--text-secondary);">${specStr}</td>
                                        <td style="text-align: right; font-weight: 700; color: #fff;">$${inv.amount.toFixed(2)}</td>
                                        <td style="text-align: center;">
                                            <span style="font-size: 0.75rem; background: rgba(34, 197, 94, 0.2); padding: 2px 8px; border-radius: 4px; color: #86efac; font-weight: bold; text-transform: uppercase;">PAID</span>
                                        </td>
                                    </tr>
                                `;
                            }).join('');
                        }
                    }
                }
            }
        } catch (err) {
            console.error('❌ Error fetching billing data:', err);
        }
    };

    // Bind Simulator action
    if (simulateChargeBtn) {
        simulateChargeBtn.addEventListener('click', async () => {
            const clientId = globalClientSelect ? globalClientSelect.value : 'restoration_lv';
            if (clientId === 'all') {
                alert('Please select a specific Client Workspace above to simulate a metered call charge.');
                return;
            }
            simulateChargeBtn.disabled = true;
            const originalText = simulateChargeBtn.innerHTML;
            simulateChargeBtn.innerHTML = '⚡ Simulating...';
            try {
                const res = await fetch('/api/simulate-call-log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId })
                });
                if (res.ok) {
                    await refreshDashboard();
                } else {
                    alert('❌ Failed to simulate call.');
                }
            } catch (err) {
                console.error(err);
            } finally {
                simulateChargeBtn.disabled = false;
                simulateChargeBtn.innerHTML = originalText;
            }
        });
    }

    // Bind Download PDF Mock action
    if (downloadInvoiceBtn) {
        downloadInvoiceBtn.addEventListener('click', () => {
            const clientId = globalClientSelect ? globalClientSelect.value : 'all';
            const clientName = clientId === 'all' ? 'All Clients Summary' : (clientId === 'restoration_lv' ? 'Restoration Pro Las Vegas' : (clientId === 'roofing_sc' ? 'Sin City Roof Crew' : (clientId === 'property_apex' ? 'Apex Property Management' : 'Nexus Realty Group')));
            
            const grandTotalStr = billingGrandTotal ? billingGrandTotal.textContent : '$0.00';
            const voiceMinutesStr = billingVoiceMinutes ? billingVoiceMinutes.textContent : '0:00';
            const tokensUsedStr = billingTokensUsed ? billingTokensUsed.textContent : '0';
            const totalCallsStr = billingTotalCalls ? billingTotalCalls.textContent : '0';

            const invoiceText = `
=========================================
            SIMULATED SAAS INVOICE
=========================================
Client: ${clientName}
Client ID: ${clientId}
Billing Period: June 1 - June 30, 2026
Status: Simulated / Pending Approval
-----------------------------------------
Meters Breakdown:
- Voice Call Stream: ${voiceMinutesStr} mins
- OpenAI LLM Tokens: ${tokensUsedStr} tokens
- 3rd-Party Dispatches: ${totalCallsStr} sessions
-----------------------------------------
GRAND TOTAL: ${grandTotalStr}
=========================================
Thank you for using Agentic Funnel Machine!
`;
            
            const blob = new Blob([invoiceText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice_${clientId}_June_2026.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // --- Outbound Templates & Outreach Logs Logic ---
    const fetchTemplates = async () => {
        const grid = document.getElementById('campaign-templates-grid');
        if (!grid) return;

        try {
            const clientId = globalClientSelect ? globalClientSelect.value : 'all';
            const res = await fetch(`/api/outbound/templates?clientId=${clientId}`);
            const data = await res.json();
            if (data.success) {
                renderTemplates(data.templates);
            }
        } catch (err) {
            console.error('❌ Error fetching templates:', err);
            grid.innerHTML = `<p style="color:#fca5a5; text-align:center;">Failed to load templates.</p>`;
        }
    };

    const renderTemplates = (templates) => {
        const grid = document.getElementById('campaign-templates-grid');
        if (!grid) return;

        if (!templates || templates.length === 0) {
            grid.innerHTML = `<p style="color:var(--text-secondary); text-align:center; grid-column:span 2; padding:30px 0;">No templates configured.</p>`;
            return;
        }

        grid.innerHTML = templates.map(t => {
            const typeLabel = t.is_static === 1 ? '📄 Static HTML' : '🤖 AI Personalized';
            return `
                <div class="glass-card" style="padding: 20px; border-radius: var(--border-radius-md); border: 1px solid var(--glass-border); background: rgba(255,255,255,0.01); display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <h3 style="color: #fff; font-size: 1.15rem; font-weight: 600; margin: 0;">${t.name}</h3>
                            <span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.75rem; padding: 3px 8px; border-radius: 4px;">${typeLabel}</span>
                        </div>
                        <p style="color: var(--text-secondary); font-size: 0.85rem; font-family: monospace; word-break: break-all; margin: 5px 0 12px 0;">
                            <strong>Subject:</strong> ${t.subject_template}
                        </p>
                        <div style="background: rgba(0,0,0,0.15); border-radius: 4px; padding: 10px; font-family: monospace; font-size: 0.75rem; line-height: 1.4; color: var(--text-secondary); max-height: 80px; overflow-y: auto; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.03);">
                            ${t.body_prompt}
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: auto; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
                        <button class="btn btn-secondary edit-template-btn" 
                                data-id="${t.id}" 
                                data-client="${t.client_id}"
                                data-name="${t.name}" 
                                data-subject="${t.subject_template}" 
                                data-prompt="${t.body_prompt.replace(/"/g, '&quot;')}" 
                                data-static="${t.is_static}"
                                style="flex: 1; justify-content: center; font-size: 0.8rem; padding: 6px 12px; cursor: pointer;">
                            ⚙️ Customize
                        </button>
                        <button class="btn btn-primary run-campaign-btn" 
                                data-id="${t.id}" 
                                data-client="${t.client_id}"
                                style="flex: 1.2; justify-content: center; font-size: 0.8rem; padding: 6px 12px; cursor: pointer;">
                            🚀 Run Outreach
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    };

    const fetchOutreachLogs = async () => {
        const tbody = document.getElementById('outreach-logs-tbody');
        if (!tbody) return;

        try {
            const clientId = globalClientSelect ? globalClientSelect.value : 'all';
            const res = await fetch(`/api/outbound/logs?clientId=${clientId}`);
            const data = await res.json();
            if (data.success) {
                allOutreachLogs = data.logs;
                renderOutreachLogs(allOutreachLogs);
            }
        } catch (err) {
            console.error('❌ Error fetching outreach logs:', err);
            tbody.innerHTML = `<tr><td colspan="6" class="loading-text" style="color: #fca5a5;">Failed to load outreach logs.</td></tr>`;
        }
    };

    const renderOutreachLogs = (logs) => {
        const tbody = document.getElementById('outreach-logs-tbody');
        if (!tbody) return;

        if (!logs || logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="loading-text" style="color: var(--text-secondary); text-align: center; padding: 20px;">No outbound dispatches logged yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = logs.map(log => {
            const dateStr = new Date(log.created_at).toLocaleString();
            const statusClass = log.status === 'sent' ? 'badge-contacted' : 'badge-pending';
            const statusLabel = log.status === 'sent' ? 'Sent' : 'Failed';
            
            return `
                <tr>
                    <td style="font-family: monospace; font-size: 0.8rem;">${log.id}</td>
                    <td style="font-weight: 600; color: #fff;">${log.email}</td>
                    <td style="font-family: monospace; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.subject}</td>
                    <td>${dateStr}</td>
                    <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                    <td>
                        <button class="btn btn-secondary btn-table view-outreach-btn" 
                                data-subject="${log.subject.replace(/"/g, '&quot;')}" 
                                data-body="${log.body.replace(/"/g, '&quot;').replace(/\n/g, '\\n')}" 
                                style="font-size: 0.75rem; padding: 4px 8px; cursor: pointer;">🔍 View Email</button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    const searchOutreachInput = document.getElementById('search-outreach');
    if (searchOutreachInput) {
        searchOutreachInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = allOutreachLogs.filter(log => 
                log.email.toLowerCase().includes(query) ||
                log.subject.toLowerCase().includes(query)
            );
            renderOutreachLogs(filtered);
        });
    }

    // --- Outbound Templates Modal Logic ---
    const editTemplateModal = document.getElementById('edit-template-modal');
    const editTemplateForm = document.getElementById('edit-template-form');
    const editTemplateOverlay = document.getElementById('edit-template-overlay');
    const closeTemplateModalBtn = document.getElementById('close-template-modal-btn');
    const cancelTemplateBtn = document.getElementById('cancel-template-btn');
    const editTemplateBodyLabel = document.getElementById('edit-template-body-label');
    const editTemplateType = document.getElementById('edit-template-type');

    const openTemplateModal = (template) => {
        document.getElementById('edit-template-id').value = template.id;
        document.getElementById('edit-template-name').value = template.name;
        document.getElementById('edit-template-subject').value = template.subject;
        document.getElementById('edit-template-body').value = template.prompt;
        editTemplateType.value = template.isStatic;
        
        updateTextareaLabel(template.isStatic);

        if (editTemplateModal) {
            editTemplateModal.style.display = 'flex';
            editTemplateModal.classList.remove('hidden');
        }
    };

    const closeTemplateModal = () => {
        if (editTemplateModal) {
            editTemplateModal.style.display = 'none';
            editTemplateModal.classList.add('hidden');
        }
    };

    const updateTextareaLabel = (isStatic) => {
        if (!editTemplateBodyLabel) return;
        if (Number(isStatic) === 1) {
            editTemplateBodyLabel.textContent = 'Static Email Body Copy';
        } else {
            editTemplateBodyLabel.textContent = 'AI Copywriting System Prompt';
        }
    };

    if (editTemplateType) {
        editTemplateType.addEventListener('change', (e) => {
            updateTextareaLabel(e.target.value);
        });
    }

    if (closeTemplateModalBtn) closeTemplateModalBtn.addEventListener('click', closeTemplateModal);
    if (cancelTemplateBtn) cancelTemplateBtn.addEventListener('click', closeTemplateModal);
    if (editTemplateOverlay) editTemplateOverlay.addEventListener('click', closeTemplateModal);

    const campaignTemplatesGrid = document.getElementById('campaign-templates-grid');
    if (campaignTemplatesGrid) {
        campaignTemplatesGrid.addEventListener('click', async (e) => {
            const target = e.target;
            if (target.classList.contains('edit-template-btn')) {
                const id = target.getAttribute('data-id');
                const name = target.getAttribute('data-name');
                const subject = target.getAttribute('data-subject');
                const prompt = target.getAttribute('data-prompt');
                const isStatic = target.getAttribute('data-static');
                openTemplateModal({ id, name, subject, prompt, isStatic });
            } else if (target.classList.contains('run-campaign-btn')) {
                const templateId = target.getAttribute('data-id');
                const clientId = target.getAttribute('data-client');
                
                if (clientId === 'all') {
                    alert('⚠️ Please select a specific client account in the top selector to trigger a campaign.');
                    return;
                }

                if (!confirm(`🚀 Are you sure you want to run outreach on all pending leads for campaign template "${templateId}"?`)) {
                    return;
                }

                const originalText = target.innerHTML;
                target.disabled = true;
                target.innerHTML = `<span class="loading-spinner" style="width:12px; height:12px; border-width:1.5px;"></span> Dispatching...`;

                try {
                    const res = await fetch('/api/outbound/run-campaign', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ clientId, templateId })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        alert(`📧 Campaign outreach complete! ${data.message}`);
                        refreshDashboard();
                    } else {
                        throw new Error(data.error || 'Outreach execution failed.');
                    }
                } catch (err) {
                    alert(`❌ Campaign run error: ${err.message}`);
                } finally {
                    target.disabled = false;
                    target.innerHTML = originalText;
                }
            }
        });
    }

    if (editTemplateForm) {
        editTemplateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-template-id').value;
            const name = document.getElementById('edit-template-name').value.trim();
            const subjectTemplate = document.getElementById('edit-template-subject').value.trim();
            const bodyPrompt = document.getElementById('edit-template-body').value.trim();
            const isStatic = Number(editTemplateType.value);
            const clientId = globalClientSelect ? globalClientSelect.value : 'all';

            if (clientId === 'all') {
                alert('⚠️ Please select a specific client tenant in the top selector to configure a template.');
                return;
            }

            try {
                const res = await fetch('/api/outbound/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, clientId, name, subjectTemplate, bodyPrompt, isStatic })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    closeTemplateModal();
                    fetchTemplates();
                } else {
                    throw new Error(data.error || 'Failed to save template.');
                }
            } catch (err) {
                alert(`❌ Save error: ${err.message}`);
            }
        });
    }

    const outreachLogsTbody = document.getElementById('outreach-logs-tbody');
    if (outreachLogsTbody) {
        outreachLogsTbody.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('view-outreach-btn')) {
                const subject = target.getAttribute('data-subject');
                const body = target.getAttribute('data-body').replace(/\\n/g, '\n');
                
                if (campaignTemplateSelect) campaignTemplateSelect.disabled = true;
                if (campaignSubjectInput) {
                    campaignSubjectInput.value = subject;
                    campaignSubjectInput.disabled = true;
                }
                if (campaignBodyTextarea) {
                    campaignBodyTextarea.value = body;
                    campaignBodyTextarea.disabled = true;
                }
                if (sendCampaignEmailBtn) {
                    sendCampaignEmailBtn.disabled = true;
                    sendCampaignEmailBtn.innerHTML = '✉️ Outreach Already Dispatched';
                }
                
                if (campaignDrawer) {
                    campaignDrawer.classList.remove('hidden');
                }
            }
        });
    }

    const fetchAnalyticsData = async () => {
        const clientId = globalClientSelect ? globalClientSelect.value : 'all';
        try {
            const res = await fetch(`/api/analytics-data?clientId=${clientId}`);
            const result = await res.json();
            if (!result.success || !result.data) return;
            const data = result.data;

            // Common Chart.js options for dark mode
            const gridOpts = {
                color: 'rgba(255, 255, 255, 0.05)',
                drawBorder: false
            };
            const tickOpts = {
                color: '#9ca3af',
                font: {
                    family: 'Outfit, sans-serif',
                    size: 11
                }
            };
            const legendOpts = {
                labels: {
                    color: '#fff',
                    font: {
                        family: 'Outfit, sans-serif',
                        weight: '600'
                    }
                }
            };

            // --- 1. Intake Trends (Line Chart) ---
            if (intakeTrendsChart) {
                intakeTrendsChart.destroy();
            }
            const ctxIntake = document.getElementById('chart-intake-trends');
            if (ctxIntake) {
                const ctx = ctxIntake.getContext('2d');
                intakeTrendsChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.dates.map(d => {
                            const parts = d.split('-');
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            return `${monthNames[parseInt(parts[1]) - 1]} ${parts[2]}`;
                        }),
                        datasets: [
                            {
                                label: 'Total Conversations',
                                data: data.trends.conversations,
                                borderColor: '#a855f7',
                                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                fill: true,
                                tension: 0.3,
                                borderWidth: 2.5
                            },
                            {
                                label: 'Qualified Leads',
                                data: data.trends.leads,
                                borderColor: '#06b6d4',
                                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                                fill: true,
                                tension: 0.3,
                                borderWidth: 2.5
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: legendOpts,
                            tooltip: {
                                backgroundColor: '#0c0f16',
                                titleFont: { family: 'Outfit, sans-serif' },
                                bodyFont: { family: 'Outfit, sans-serif' },
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                borderWidth: 1
                            }
                        },
                        scales: {
                            x: { grid: gridOpts, ticks: tickOpts },
                            y: { 
                                grid: gridOpts, 
                                ticks: {
                                    ...tickOpts,
                                    stepSize: 1,
                                    precision: 0
                                }
                            }
                        }
                    }
                });
            }

            // --- 2. Qualification Funnel (Doughnut Chart) ---
            if (qualificationFunnelChart) {
                qualificationFunnelChart.destroy();
            }
            const ctxFunnel = document.getElementById('chart-qualification-funnel');
            if (ctxFunnel) {
                const ctx = ctxFunnel.getContext('2d');
                const funnel = data.funnel;
                const inProgress = Math.max(0, funnel.conversations - (funnel.qualified + funnel.booked));

                qualificationFunnelChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Booked Appointments', 'Qualified (Pending)', 'Duplicate Blocked', 'In-Progress Sessions'],
                        datasets: [{
                            data: [funnel.booked, funnel.qualified, funnel.blocked, inProgress],
                            backgroundColor: [
                                '#22c55e', // Success Green
                                '#06b6d4', // Cyan
                                '#ef4444', // Red
                                'rgba(255, 255, 255, 0.15)' // Muted
                            ],
                            borderWidth: 1,
                            borderColor: '#0c0f16'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                ...legendOpts,
                                position: 'bottom',
                                labels: {
                                    ...legendOpts.labels,
                                    padding: 15
                                }
                            },
                            tooltip: {
                                backgroundColor: '#0c0f16',
                                titleFont: { family: 'Outfit, sans-serif' },
                                bodyFont: { family: 'Outfit, sans-serif' },
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                borderWidth: 1
                            }
                        },
                        cutout: '65%'
                    }
                });
            }

            // --- 3. Billing Spend (Stacked Bar Chart) ---
            if (billingSpendChart) {
                billingSpendChart.destroy();
            }
            const ctxBilling = document.getElementById('chart-billing-spend');
            if (ctxBilling) {
                const ctx = ctxBilling.getContext('2d');
                billingSpendChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.dates.map(d => {
                            const parts = d.split('-');
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            return `${monthNames[parseInt(parts[1]) - 1]} ${parts[2]}`;
                        }),
                        datasets: [
                            {
                                label: 'Voice Reception Connection ($0.15/min)',
                                data: data.billing.voice,
                                backgroundColor: '#3b82f6',
                                stack: 'spend'
                            },
                            {
                                label: 'AI Token Computation ($0.00003/tok)',
                                data: data.billing.token,
                                backgroundColor: '#a855f7',
                                stack: 'spend'
                            },
                            {
                                label: 'CRM Integration Dispatch ($10.00/ea)',
                                data: data.billing.dispatch,
                                backgroundColor: '#22c55e',
                                stack: 'spend'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: legendOpts,
                            tooltip: {
                                backgroundColor: '#0c0f16',
                                titleFont: { family: 'Outfit, sans-serif' },
                                bodyFont: { family: 'Outfit, sans-serif' },
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                borderWidth: 1,
                                callbacks: {
                                    label: function(context) {
                                        let label = context.dataset.label || '';
                                        if (label) {
                                            label = label.split(' ($')[0] + ': ';
                                        }
                                        if (context.parsed.y !== null) {
                                            label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                                        }
                                        return label;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: { grid: gridOpts, ticks: tickOpts },
                            y: { 
                                grid: gridOpts, 
                                ticks: {
                                    ...tickOpts,
                                    callback: function(value) {
                                        return '$' + value;
                                    }
                                }
                            }
                        }
                    }
                });
            }

        } catch (err) {
            console.error('❌ Failed to load analytics data:', err);
        }
    };

    const refreshDashboard = async () => {
        await Promise.all([
            fetchStats(), 
            fetchRegistry(), 
            fetchCallLogs(), 
            fetchRagFiles(), 
            fetchBillingData(),
            fetchTemplates(),
            fetchOutreachLogs(),
            fetchAnalyticsData()
        ]);
    };

    // --- Client Settings Tab Logic ---
    const settingsForm = document.getElementById('settings-form');
    const settingsAllWarning = document.getElementById('settings-all-warning');

    const loadClientSettings = async () => {
        const clientId = globalClientSelect ? globalClientSelect.value : 'all';
        
        if (clientId === 'all') {
            if (settingsAllWarning) settingsAllWarning.classList.remove('hidden');
            if (settingsForm) settingsForm.classList.add('hidden');
            return;
        }

        if (settingsAllWarning) settingsAllWarning.classList.add('hidden');
        if (settingsForm) settingsForm.classList.remove('hidden');

        try {
            const res = await fetch(`/api/client-settings?clientId=${clientId}`);
            const data = await res.json();
            if (data.success && data.settings) {
                const s = data.settings;
                document.getElementById('settings-name').value = s.name || '';
                document.getElementById('settings-niche').value = s.niche || '';
                document.getElementById('settings-logo').value = s.logo || '';
                document.getElementById('settings-phone').value = s.phone || '';
                document.getElementById('settings-greeting').value = s.greeting || '';
                document.getElementById('settings-chat-greeting').value = s.chatGreeting || '';
                document.getElementById('settings-hero-title').value = s.heroTitle || '';
                document.getElementById('settings-subtitle').value = s.subtitle || '';
                document.getElementById('settings-primary-color').value = s.primaryColor || '';
                document.getElementById('settings-primary-hover').value = s.primaryHover || '';
                document.getElementById('settings-primary-glow').value = s.primaryGlow || '';
                document.getElementById('settings-secondary-color').value = s.secondaryColor || '';
                document.getElementById('settings-secondary-hover').value = s.secondaryHover || '';
                document.getElementById('settings-secondary-glow').value = s.secondaryGlow || '';
                document.getElementById('settings-bg-primary').value = s.bgPrimary || '';
                document.getElementById('settings-bg-secondary').value = s.bgSecondary || '';
                document.getElementById('settings-slack-webhook').value = s.slackWebhookUrl || '';
                document.getElementById('settings-sms-phone').value = s.notificationPhone || '';
                document.getElementById('settings-notify-on-lead').checked = s.notifyOnLead === 1;
                document.getElementById('settings-google-sheet-id').value = s.googleSheetId || '';
                document.getElementById('settings-google-calendar-id').value = s.googleCalendarId || '';
                document.getElementById('settings-twilio-account-sid').value = s.twilioAccountSid || '';
                document.getElementById('settings-twilio-auth-token').value = s.twilioAuthToken || '';
                document.getElementById('settings-twilio-phone-number').value = s.twilioPhoneNumber || '';
                document.getElementById('settings-resend-api-key').value = s.resendApiKey || '';
                document.getElementById('settings-voice-tone').value = s.voiceTone || 'alloy';
                document.getElementById('settings-voice-instructions').value = s.voiceInstructions || '';
                document.getElementById('settings-client-password').value = s.password || '';
            }

            // Load simulated CRM/Calendly settings from localStorage
            const storedCrm = localStorage.getItem(`${clientId}_crmType`) || 
                (clientId === 'realestate_nexus' ? 'kvcore' : (clientId === 'default_client' ? 'simulated' : 'fieldpulse'));
            const storedCalendly = localStorage.getItem(`${clientId}_calendlyUrl`) || 'https://calendly.com/simulated-booking';

            document.getElementById('settings-crm-type').value = storedCrm;
            document.getElementById('settings-calendly').value = storedCalendly;

        } catch (err) {
            console.error('❌ Error loading client settings:', err);
        }
    };

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const clientId = globalClientSelect ? globalClientSelect.value : '';
            if (!clientId || clientId === 'all') return;

            const saveBtn = document.getElementById('save-settings-btn');
            const originalText = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = `⏳ Saving Settings...`;

            const settings = {
                name: document.getElementById('settings-name').value,
                niche: document.getElementById('settings-niche').value,
                logo: document.getElementById('settings-logo').value,
                phone: document.getElementById('settings-phone').value,
                greeting: document.getElementById('settings-greeting').value,
                chatGreeting: document.getElementById('settings-chat-greeting').value,
                heroTitle: document.getElementById('settings-hero-title').value,
                subtitle: document.getElementById('settings-subtitle').value,
                primaryColor: document.getElementById('settings-primary-color').value,
                primaryHover: document.getElementById('settings-primary-hover').value,
                primaryGlow: document.getElementById('settings-primary-glow').value,
                secondaryColor: document.getElementById('settings-secondary-color').value,
                secondaryHover: document.getElementById('settings-secondary-hover').value,
                secondaryGlow: document.getElementById('settings-secondary-glow').value,
                bgPrimary: document.getElementById('settings-bg-primary').value,
                bgSecondary: document.getElementById('settings-bg-secondary').value,
                slackWebhookUrl: document.getElementById('settings-slack-webhook').value,
                notificationPhone: document.getElementById('settings-sms-phone').value,
                notifyOnLead: document.getElementById('settings-notify-on-lead').checked ? 1 : 0,
                googleSheetId: document.getElementById('settings-google-sheet-id').value,
                googleCalendarId: document.getElementById('settings-google-calendar-id').value,
                twilioAccountSid: document.getElementById('settings-twilio-account-sid').value,
                twilioAuthToken: document.getElementById('settings-twilio-auth-token').value,
                twilioPhoneNumber: document.getElementById('settings-twilio-phone-number').value,
                resendApiKey: document.getElementById('settings-resend-api-key').value,
                voiceTone: document.getElementById('settings-voice-tone').value,
                voiceInstructions: document.getElementById('settings-voice-instructions').value,
                password: document.getElementById('settings-client-password').value
            };

            const crmType = document.getElementById('settings-crm-type').value;
            const calendlyUrl = document.getElementById('settings-calendly').value;

            try {
                const res = await fetch('/api/client-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId, settings })
                });
                const data = await res.json();
                if (data.success) {
                    // Save simulated settings to localstorage
                    localStorage.setItem(`${clientId}_crmType`, crmType);
                    localStorage.setItem(`${clientId}_calendlyUrl`, calendlyUrl);

                    alert(`⚙️ Settings for client "${clientId}" updated successfully!`);
                    
                    // Trigger a dashboard refresh to sync elements
                    refreshDashboard();
                } else {
                    alert(`❌ Failed to save settings: ${data.error}`);
                }
            } catch (err) {
                console.error('❌ Error saving settings:', err);
                alert(`❌ Error saving settings: ${err.message}`);
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }
        });
    }

    const testNotificationBtn = document.getElementById('test-notification-btn');
    if (testNotificationBtn) {
        testNotificationBtn.addEventListener('click', async () => {
            const clientId = globalClientSelect ? globalClientSelect.value : '';
            if (!clientId || clientId === 'all') {
                alert('⚠️ Please select a specific client from the dropdown first.');
                return;
            }

            const originalText = testNotificationBtn.innerHTML;
            testNotificationBtn.disabled = true;
            testNotificationBtn.innerHTML = `⏳ Testing...`;

            try {
                const res = await fetch('/api/outbound/test-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId })
                });
                const data = await res.json();
                if (data.success) {
                    alert(`🚀 Test notification dispatched successfully!\nSlack: ${data.slackWebhookUrl ? 'Configured' : 'Not Configured'}\nSMS: ${data.notificationPhone ? data.notificationPhone : 'Not Configured'}\nCheck console/Slack channel for output.`);
                } else {
                    alert(`❌ Failed to test notification: ${data.error}`);
                }
            } catch (err) {
                console.error('❌ Error testing notification:', err);
                alert(`❌ Error testing notification: ${err.message}`);
            } finally {
                testNotificationBtn.disabled = false;
                testNotificationBtn.innerHTML = originalText;
            }
        });
    }

    // --- Stripe Subscriptions UI Logic ---
    const stripeCheckoutModal = document.getElementById('stripe-checkout-modal');
    const stripeSubscribeBtn = document.getElementById('stripe-subscribe-btn');
    const closeCheckoutBtn = document.getElementById('close-checkout-btn');
    const stripeCheckoutOverlay = document.getElementById('stripe-checkout-overlay');
    const checkoutForm = document.getElementById('checkout-form');
    const stripeCancelBtn = document.getElementById('stripe-cancel-btn');
    const stripeTriggerInvoiceBtn = document.getElementById('stripe-trigger-invoice-btn');

    const openCheckout = () => {
        if (stripeCheckoutModal) {
            stripeCheckoutModal.style.display = 'flex';
            stripeCheckoutModal.classList.remove('hidden');
        }
    };

    const closeCheckout = () => {
        if (stripeCheckoutModal) {
            stripeCheckoutModal.style.display = 'none';
            stripeCheckoutModal.classList.add('hidden');
        }
    };

    if (stripeSubscribeBtn) stripeSubscribeBtn.addEventListener('click', openCheckout);
    if (closeCheckoutBtn) closeCheckoutBtn.addEventListener('click', closeCheckout);
    if (stripeCheckoutOverlay) stripeCheckoutOverlay.addEventListener('click', closeCheckout);

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const clientId = globalClientSelect ? globalClientSelect.value : '';
            if (!clientId || clientId === 'all') return;

            const submitBtn = document.getElementById('checkout-submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '⏳ Processing Payment...';

            const cardBrand = 'Visa';
            const cardLast4 = '4242';

            try {
                const res = await fetch('/api/stripe/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId, cardBrand, cardLast4 })
                });
                const data = await res.json();
                if (data.success) {
                    alert(`💳 Subscription activated! Customer ID: ${data.customerId}`);
                    closeCheckout();
                    fetchBillingData();
                } else {
                    alert(`❌ Subscription failed: ${data.error}`);
                }
            } catch (err) {
                console.error('❌ Checkout submit error:', err);
                alert(`❌ Checkout submit error: ${err.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    if (stripeCancelBtn) {
        stripeCancelBtn.addEventListener('click', async () => {
            const clientId = globalClientSelect ? globalClientSelect.value : '';
            if (!clientId || clientId === 'all') return;

            if (!confirm('Are you sure you want to cancel your Pro Plan subscription? This will disable automatic CRM dispatches.')) {
                return;
            }

            stripeCancelBtn.disabled = true;
            try {
                const res = await fetch('/api/stripe/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId })
                });
                const data = await res.json();
                if (data.success) {
                    alert('❌ Subscription cancelled successfully.');
                    fetchBillingData();
                } else {
                    alert(`❌ Failed to cancel subscription: ${data.error}`);
                }
            } catch (err) {
                console.error('❌ Cancellation error:', err);
                alert(`❌ Cancellation error: ${err.message}`);
            } finally {
                stripeCancelBtn.disabled = false;
            }
        });
    }

    if (stripeTriggerInvoiceBtn) {
        stripeTriggerInvoiceBtn.addEventListener('click', async () => {
            const clientId = globalClientSelect ? globalClientSelect.value : '';
            if (!clientId || clientId === 'all') return;

            stripeTriggerInvoiceBtn.disabled = true;
            const originalText = stripeTriggerInvoiceBtn.innerHTML;
            stripeTriggerInvoiceBtn.innerHTML = '⚡ Processing Charge...';

            try {
                const res = await fetch('/api/stripe/charge-invoice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId })
                });
                const data = await res.json();
                if (data.success) {
                    alert(`🧾 Stripe webhook triggered! Invoice ${data.invoice.id} for $${data.invoice.amount} charged to card on file.`);
                    fetchBillingData();
                } else {
                    alert(`❌ Failed to trigger invoice charge: ${data.error}`);
                }
            } catch (err) {
                console.error('❌ Invoice webhook error:', err);
                alert(`❌ Invoice webhook error: ${err.message}`);
            } finally {
                stripeTriggerInvoiceBtn.disabled = false;
                stripeTriggerInvoiceBtn.innerHTML = originalText;
            }
        });
    }

    // --- Initialize ---
    updateWebhookUrlInput();
    refreshDashboard();
    loadClientSettings();
});
