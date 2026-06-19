document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('emergency-intake-form');
    const successScreen = document.getElementById('success-screen');
    const resetBtn = document.getElementById('reset-form-btn');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
    const spinner = submitBtn ? submitBtn.querySelector('.loading-spinner') : null;
    const formAlert = document.getElementById('form-error-alert');

    // Form Field Elements
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const emailInput = document.getElementById('email');
    const addressInput = document.getElementById('address');
    const damageTypeInput = document.getElementById('damageType');

    // Dynamic White-Label Ingestion
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('clientId') || 'default_client';

    const CLIENT_THEMES = {
        restoration_lv: {
            name: "Restoration Pro Las Vegas",
            niche: "Emergency Water & Fire Mitigation",
            heroTitle: "Water or Fire Damage?<br><span class=\"text-glow\">Las Vegas Pro Team On Site.</span>",
            subtitle: "Fast, certified mitigation and structural restoration. We process direct insurance billing to safeguard your Las Vegas property.",
            logo: "Restoration Pro Las Vegas",
            phone: "📞 Urgent: Call (702) 555-0100",
            primaryColor: "hsl(14, 90%, 55%)",
            primaryHover: "hsl(14, 90%, 48%)",
            primaryGlow: "rgba(239, 68, 68, 0.15)",
            secondaryColor: "hsl(210, 90%, 60%)",
            secondaryHover: "hsl(210, 90%, 52%)",
            secondaryGlow: "rgba(59, 130, 246, 0.15)",
            bgPrimary: "#0a0808",
            bgSecondary: "#130f0f"
        },
        roofing_sc: {
            name: "Sin City Roof Crew",
            niche: "Storm Damage & Emergency Roof Leaks",
            heroTitle: "Emergency Roof Leak?<br><span class=\"text-glow\">Tarping & Repair Crews Ready.</span>",
            subtitle: "Fast, specialized storm damage responses, structural roof inspections, and leak mitigation. We protect your Sin City home.",
            logo: "Sin City Roof Crew",
            phone: "📞 Emergency Tarping: Call (702) 555-0200",
            primaryColor: "hsl(190, 95%, 50%)",
            primaryHover: "hsl(190, 95%, 43%)",
            primaryGlow: "rgba(6, 182, 212, 0.15)",
            secondaryColor: "hsl(280, 85%, 60%)",
            secondaryHover: "hsl(280, 85%, 52%)",
            secondaryGlow: "rgba(168, 85, 247, 0.15)",
            bgPrimary: "#050811",
            bgSecondary: "#0a1122"
        },
        property_apex: {
            name: "Apex Property Management",
            niche: "Tenant Emergency Repair Hotline",
            heroTitle: "Tenant Maintenance Emergency?<br><span class=\"text-glow\">Rapid Resolution & Repair.</span>",
            subtitle: "24/7 central repair line for Apex managed tenants. Submit your repair request below to dispatch a maintenance technician.",
            logo: "Apex Property Management",
            phone: "📞 Maintenance: Call (702) 555-0300",
            primaryColor: "hsl(150, 85%, 45%)",
            primaryHover: "hsl(150, 85%, 38%)",
            primaryGlow: "rgba(16, 185, 129, 0.15)",
            secondaryColor: "hsl(45, 95%, 55%)",
            secondaryHover: "hsl(45, 95%, 48%)",
            secondaryGlow: "rgba(234, 179, 8, 0.15)",
            bgPrimary: "#060a08",
            bgSecondary: "#0e1612"
        },
        realestate_nexus: {
            name: "Nexus Realty Group",
            niche: "Residential Property Sales & virtual tours",
            heroTitle: "Find Your Dream Home.<br><span class=\"text-glow\">Nexus Realty Group Virtual Showings.</span>",
            subtitle: "Elite residential sales, leasing, and immersive virtual tours. Book your showing below and let us guide you home.",
            logo: "Nexus Realty Group",
            phone: "📞 Inquiries: Call (702) 555-0400",
            primaryColor: "hsl(270, 80%, 55%)",
            primaryHover: "hsl(270, 80%, 48%)",
            primaryGlow: "rgba(168, 85, 247, 0.15)",
            secondaryColor: "hsl(160, 85%, 45%)",
            secondaryHover: "hsl(160, 85%, 38%)",
            secondaryGlow: "rgba(16, 185, 129, 0.15)",
            bgPrimary: "#07050a",
            bgSecondary: "#100d16"
        },
        default_client: {
            name: "Syncro Scale",
            niche: "Smart Automation & AI Agent Integrations",
            heroTitle: "",
            subtitle: "Redefining efficiency through scalable agents",
            logo: "Syncro Scale",
            phone: "",
            primaryColor: "#2CEE76",
            primaryHover: "#1DD962",
            primaryGlow: "rgba(44, 238, 118, 0.1)",
            secondaryColor: "#0D2240",
            secondaryHover: "#0a1a30",
            secondaryGlow: "rgba(13, 34, 64, 0.1)",
            bgPrimary: "#F9F6F0",
            bgSecondary: "#FAF8F5"
        }
    };

    const theme = CLIENT_THEMES[clientId] || CLIENT_THEMES.default_client;
    const isDefaultOrSyncro = (!urlParams.has('clientId') || clientId === 'default_client');

    // Apply branding to page ONLY if a custom white-label client is requested
    if (!isDefaultOrSyncro) {
        document.title = `${theme.name} - ${theme.niche}`;
        
        const logoEl = document.getElementById('header-logo');
        if (logoEl) {
            logoEl.innerHTML = `<span class="logo-accent">${theme.logo.split(' ')[0]}</span> ${theme.logo.split(' ').slice(1).join(' ')}`;
        }
        
        const heroTitleEl = document.querySelector('.hero-title, .hero-title-main');
        if (heroTitleEl) {
            heroTitleEl.innerHTML = theme.heroTitle;
        }
        
        const heroSubtitleEl = document.querySelector('.hero-subtitle, .hero-subtitle-main');
        if (heroSubtitleEl) {
            heroSubtitleEl.textContent = theme.subtitle;
        }

        const phoneBtn = document.getElementById('call-emergency-btn');
        if (phoneBtn) {
            phoneBtn.innerHTML = `<span class="btn-icon">📞</span> ${theme.phone.replace('📞 ', '')}`;
        }

        // Apply styling custom properties to root document
        const root = document.documentElement;
        root.style.setProperty('--accent-purple', theme.primaryColor);
        root.style.setProperty('--accent-purple-hover', theme.primaryHover);
        root.style.setProperty('--accent-blue', theme.secondaryColor);
        root.style.setProperty('--accent-blue-hover', theme.secondaryHover);
        root.style.setProperty('--bg-dark', theme.bgPrimary);
        root.style.setProperty('--bg-card', theme.bgSecondary);

        // Define professional copywriting sections for client tenants
        const CLIENT_SECTIONS = {
            restoration_lv: {
                introText: "Restoration Pro Las Vegas is your premier certified disaster response agency. We specialize in 24/7 emergency water damage restoration, structural drying, fire and smoke damage mitigation, and certified mold remediation across the Las Vegas valley.",
                servicesBadge: "Mitigation & Remediation Services",
                heroLearnMoreText: "Our Services",
                featuresText: "Services",
                detailsText: "Why Choose Us",
                services: [
                    {
                        title: "Water Damage Mitigation",
                        desc: "High-powered extraction, structural dry-out, structural dehumidification, and advanced thermal moisture scans.",
                        tag: "24/7 Response"
                    },
                    {
                        title: "Fire & Smoke Cleanup",
                        desc: "Board-up structural security, soot removal, smoke odor neutralizers, and full structural content cleaning.",
                        tag: "Mitigation"
                    },
                    {
                        title: "Mold Remediation",
                        desc: "Containment setups, HEPA vacuuming, professional mold removal, and negative air scrubbing to restore healthy environments.",
                        tag: "Certified"
                    }
                ],
                details: [
                    {
                        badge: "Direct Billing",
                        title: "Direct insurance claims coordination",
                        desc: "We simplify your recovery by coordinating directly with all major homeowners insurance carriers. Our coordinators handle the estimates, document the losses, and submit claims directly, leaving you with zero out-of-pocket stress.",
                        infographic: `
                            <div class="infographic-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--border-radius-md); padding: 25px; text-align: center; box-shadow: var(--shadow-lg); backdrop-filter: blur(10px); width: 100%; max-width: 320px; margin: 0 auto;">
                                <div style="font-size: 2.5rem; margin-bottom: 10px;">💳</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-purple); margin-bottom: 5px;">$0 Upfront Cost</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">Direct Insurance Billing. We file all paperwork and bill carriers directly.</div>
                            </div>
                        `
                    },
                    {
                        badge: "Emergency Dispatch",
                        title: "24/7 on-call dispatchers & 60-min response",
                        desc: "When disaster strikes, every second matters. We maintain a fleet of fully equipped response vehicles in Las Vegas, Henderson, and North Las Vegas, ensuring our certified technicians arrive at your door in 60 minutes or less.",
                        infographic: `
                            <div class="infographic-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--border-radius-md); padding: 25px; text-align: center; box-shadow: var(--shadow-lg); backdrop-filter: blur(10px); width: 100%; max-width: 320px; margin: 0 auto;">
                                <div style="font-size: 2.5rem; margin-bottom: 10px;">⚡</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-blue); margin-bottom: 5px;">60 Mins or Less</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">On Site Response. 24/7 emergency dispatch across the Las Vegas valley.</div>
                            </div>
                        `
                    },
                    {
                        badge: "Certified Remediation",
                        title: "IICRC Certified structural restoration",
                        desc: "All restoration procedures are performed in strict accordance with IICRC standards. We use state-of-the-art air scrubbers, commercial dehumidifiers, and EPA-registered antimicrobial treatments to ensure your property is thoroughly sanitized and safe.",
                        infographic: `
                            <div class="infographic-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--border-radius-md); padding: 25px; text-align: center; box-shadow: var(--shadow-lg); backdrop-filter: blur(10px); width: 100%; max-width: 320px; margin: 0 auto;">
                                <div style="font-size: 2.5rem; margin-bottom: 10px;">🏆</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-purple); margin-bottom: 5px;">IICRC Certified</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">Industry standards strictly followed. Licensed, bonded, and insured team.</div>
                            </div>
                        `
                    }
                ],
                faqs: [
                    {
                        q: "HOW FAST CAN YOU ARRIVE AT MY LAS VEGAS PROPERTY?",
                        a: "Our emergency crews are on call 24/7 and will arrive within 60 minutes or less anywhere in Las Vegas, Henderson, and North Las Vegas."
                    },
                    {
                        q: "DO YOU BILL MY INSURANCE COMPANY DIRECTLY?",
                        a: "Yes! We handle all communications, documentation, and estimates directly with your insurance provider. We bill them directly so you don't have to pay out of pocket."
                    },
                    {
                        q: "WHAT SHOULD I DO IMMEDIATELY AFTER A WATER LEAK?",
                        a: "First, if safe, turn off your main water valve to stop the flow. Avoid contact with standing water if it is contaminated, and contact Restoration Pro Las Vegas immediately to begin emergency extraction."
                    },
                    {
                        q: "ARE YOUR MITIGATION TECHNICIANS CERTIFIED?",
                        a: "Yes, every technician on our team is fully licensed, insured, and certified by the IICRC (Institute of Inspection, Cleaning and Restoration Certification)."
                    }
                ]
            },
            roofing_sc: {
                introText: "Sin City Roof Crew is your trusted emergency roofing partner in Clark County. We provide 24/7 emergency roof leak repair, storm damage tarping, and full roof inspections to safeguard your home or commercial building.",
                servicesBadge: "Emergency Roofing & Storm Services",
                heroLearnMoreText: "Our Services",
                featuresText: "Services",
                detailsText: "Storm Response",
                services: [
                    {
                        title: "Emergency Tarping",
                        desc: "Rapid tarp installations to seal active roof breaches and leaks during heavy rain or high winds.",
                        tag: "24/7 Response"
                    },
                    {
                        title: "Storm Damage Repair",
                        desc: "Complete shingle replacements, structural tile repairs, and wind damage restoration.",
                        tag: "Mitigation"
                    },
                    {
                        title: "Drone Roof Inspections",
                        desc: "Advanced high-definition aerial scans that pinpoint leak origins and provide digital reports for adjusters.",
                        tag: "Certified"
                    }
                ],
                details: [
                    {
                        badge: "Storm Response",
                        title: "Rapid leak mitigation & structural tarping",
                        desc: "Active leaks can cause thousands in structural water damage in minutes. Our on-call roofers respond immediately to tarp, seal, and protect your home during or after severe desert storms.",
                        infographic: `
                            <div class="infographic-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--border-radius-md); padding: 25px; text-align: center; box-shadow: var(--shadow-lg); backdrop-filter: blur(10px); width: 100%; max-width: 320px; margin: 0 auto;">
                                <div style="font-size: 2.5rem; margin-bottom: 10px;">🏠</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-purple); margin-bottom: 5px;">Active Leak Seals</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">Emergency roof tarping to block leaks during severe rain storms.</div>
                            </div>
                        `
                    },
                    {
                        badge: "Adjuster Support",
                        title: "Complete documentation for insurance adjusters",
                        desc: "We provide comprehensive damage logs, wind damage photo evidence, and certified roof inspection reports to help simplify your roofing insurance claims and secure approval.",
                        infographic: `
                            <div class="infographic-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--border-radius-md); padding: 25px; text-align: center; box-shadow: var(--shadow-lg); backdrop-filter: blur(10px); width: 100%; max-width: 320px; margin: 0 auto;">
                                <div style="font-size: 2.5rem; margin-bottom: 10px;">📋</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-blue); margin-bottom: 5px;">Adjuster Claims Logs</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">High-definition reports, photos, and drone data ready for adjusters.</div>
                            </div>
                        `
                    },
                    {
                        badge: "Quality Guarantee",
                        title: "Licensed roof replacement & certified repairs",
                        desc: "From shingle patches to full structural tile replacements, our roofing work is carried out by licensed, bonded, and insured NV contractors using top-grade weather-resistant materials.",
                        infographic: `
                            <div class="infographic-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--border-radius-md); padding: 25px; text-align: center; box-shadow: var(--shadow-lg); backdrop-filter: blur(10px); width: 100%; max-width: 320px; margin: 0 auto;">
                                <div style="font-size: 2.5rem; margin-bottom: 10px;">🛡️</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-purple); margin-bottom: 5px;">Licensed & Insured</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">NV Contractor licensed roofing team using weather-resistant materials.</div>
                            </div>
                        `
                    }
                ],
                faqs: [
                    {
                        q: "DO YOU PROVIDE EMERGENCY TARPING DURING STORMS?",
                        a: "Yes, we provide emergency tarping 24/7 to secure active roof breaches and prevent interior water damage."
                    },
                    {
                        q: "HOW DO DRONE ROOF INSPECTIONS WORK?",
                        a: "We deploy drones equipped with high-resolution cameras to safely inspect your roof's condition, capturing high-definition footage of wind or hail damage for your adjuster."
                    },
                    {
                        q: "WILL MY INSURANCE POLICY COVER ROOF REPAIRS?",
                        a: "Most homeowner insurance policies cover roof repairs caused by storm damage, high winds, or falling debris. We work directly with adjusters to provide all required photos and repair estimates."
                    },
                    {
                        q: "ARE YOU LICENSED NEVADA CONTRACTORS?",
                        a: "Yes, Sin City Roof Crew is fully licensed, bonded, and insured in Nevada for all residential and commercial roofing repairs and replacements."
                    }
                ]
            },
            property_apex: {
                introText: "Rapid repair coordination and property maintenance triage. Helping Apex landlords and tenants coordinate dispatches, secure estimates, and resolve property maintenance requests.",
                servicesBadge: "Tenant Triage & Repair Services",
                heroLearnMoreText: "Services Offered",
                featuresText: "Services",
                detailsText: "Resolution Flow",
                services: [
                    {
                        title: "Maintenance Triage",
                        desc: "24/7 emergency call sorting and urgent dispatches for active property maintenance requests.",
                        tag: "24/7 Line"
                    },
                    {
                        title: "Vendor Network",
                        desc: "Pre-screened plumbers, electricians, handymen, and HVAC contractors ready for deployment.",
                        tag: "Screened"
                    },
                    {
                        title: "Compliance Tracking",
                        desc: "Detailed logs, photos, and maintenance tickets stored directly in the property owner portal.",
                        tag: "Compliance"
                    }
                ],
                details: [
                    {
                        badge: "Rapid Response",
                        title: "24/7 maintenance triage & emergency dispatch",
                        desc: "Active maintenance issues are sorted immediately. Emergency dispatches are sent to our on-call plumbers or technicians within minutes to prevent property damage.",
                        infographic: `
                            <div class="infographic-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--border-radius-md); padding: 25px; text-align: center; box-shadow: var(--shadow-lg); backdrop-filter: blur(10px); width: 100%; max-width: 320px; margin: 0 auto;">
                                <div style="font-size: 2.5rem; margin-bottom: 10px;">🔧</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-purple); margin-bottom: 5px;">24/7 Triage</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">Rapid dispatching of licensed technicians for urgent repair requests.</div>
                            </div>
                        `
                    },
                    {
                        badge: "Vendor Network",
                        title: "Pre-screened & qualified contractors",
                        desc: "No more waiting for unreliable vendors. Our network features vetted local NV specialists ensuring repair quality, speed, and competitive pricing for all property maintenance tasks.",
                        infographic: `
                            <div class="infographic-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--border-radius-md); padding: 25px; text-align: center; box-shadow: var(--shadow-lg); backdrop-filter: blur(10px); width: 100%; max-width: 320px; margin: 0 auto;">
                                <div style="font-size: 2.5rem; margin-bottom: 10px;">👥</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-blue); margin-bottom: 5px;">Vetted Network</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">Pre-screened local handymen, plumbers, and HVAC specialists.</div>
                            </div>
                        `
                    },
                    {
                        badge: "Compliance Logs",
                        title: "Detailed maintenance ticket logging",
                        desc: "Every service ticket includes structured logs, photos, and time-stamped activity records, keeping property owners fully updated in compliance with housing regulations.",
                        infographic: `
                            <div class="infographic-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--border-radius-md); padding: 25px; text-align: center; box-shadow: var(--shadow-lg); backdrop-filter: blur(10px); width: 100%; max-width: 320px; margin: 0 auto;">
                                <div style="font-size: 2.5rem; margin-bottom: 10px;">📋</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-purple); margin-bottom: 5px;">Owner Portal Sync</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">Direct reporting, logs, invoices, and photos synced automatically.</div>
                            </div>
                        `
                    }
                ],
                faqs: [
                    {
                        q: "WHAT CONSTITUTES A MAINTENANCE EMERGENCY?",
                        a: "Emergencies include active water flooding, lack of heating during extreme cold, complete power failure, or fire hazards. For general repairs, submit a ticket for next-day dispatch."
                    },
                    {
                        q: "HOW DO I REPORT A REPAIR REQUEST?",
                        a: "Simply fill out our emergency intake form below, or use the interactive assistant. For active flooding, call the hotline immediately."
                    },
                    {
                        q: "HOW LONG DOES A GENERAL REPAIR TAKE TO DISPATCH?",
                        a: "Routine maintenance tickets are reviewed within 4 hours, and standard service calls are scheduled within 24 to 48 hours."
                    },
                    {
                        q: "ARE VENDORS LICENSED IN NEVADA?",
                        a: "Yes! Every plumber, electrician, and specialist we dispatch is fully licensed, bonded, and insured in compliance with Nevada board standards."
                    }
                ]
            },
            realestate_nexus: {
                introText: "Virtual tours and residential brokerage services across Las Vegas. Schedule an in-person or live video tour of any premium listing with our licensed advisors.",
                servicesBadge: "Premium Residential & Brokerage Services",
                heroLearnMoreText: "Explore Services",
                featuresText: "Advisory",
                detailsText: "Interactive Tour",
                services: [
                    {
                        title: "Virtual 3D Tours",
                        desc: "High-fidelity walk-throughs of active listings, allowing remote buyers to inspect properties.",
                        tag: "Immersive"
                    },
                    {
                        title: "Market Valuations",
                        desc: "Real-time comparative market analysis reports for buying, selling, or leasing properties.",
                        tag: "Real-time"
                    },
                    {
                        title: "Agent Escorts",
                        desc: "Safe, private showings and guided tours scheduled around your convenience.",
                        tag: "Broker Escort"
                    }
                ],
                details: [
                    {
                        badge: "Virtual Reality",
                        title: "High-fidelity immersive home tours",
                        desc: "Experience listings in stunning detail. Our digital VR tours let you inspect room dimensions, finishes, and property views from the comfort of your couch.",
                        infographic: `
                            <div class="infographic-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--border-radius-md); padding: 25px; text-align: center; box-shadow: var(--shadow-lg); backdrop-filter: blur(10px); width: 100%; max-width: 320px; margin: 0 auto;">
                                <div style="font-size: 2.5rem; margin-bottom: 10px;">🕶️</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-purple); margin-bottom: 5px;">Immersive 3D Tours</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">Interactive 3D structural tour walkthroughs of luxury listings.</div>
                            </div>
                        `
                    },
                    {
                        badge: "Market Analytics",
                        title: "Expert local neighborhood insights",
                        desc: "Our licensed advisors provide key market trends, comparative prices, school districts, and resale predictions to help you make informed decisions.",
                        infographic: `
                            <div class="infographic-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--border-radius-md); padding: 25px; text-align: center; box-shadow: var(--shadow-lg); backdrop-filter: blur(10px); width: 100%; max-width: 320px; margin: 0 auto;">
                                <div style="font-size: 2.5rem; margin-bottom: 10px;">📊</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-blue); margin-bottom: 5px;">Market Valuations</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">Real-time Comparative Market Analysis (CMA) report valuations.</div>
                            </div>
                        `
                    },
                    {
                        badge: "Showings",
                        title: "Seamless scheduling & private agent escorts",
                        desc: "Found a home you love? Fill in the details below to schedule an in-person showing. A licensed realtor will coordinate entry and escort you through.",
                        infographic: `
                            <div class="infographic-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--border-radius-md); padding: 25px; text-align: center; box-shadow: var(--shadow-lg); backdrop-filter: blur(10px); width: 100%; max-width: 320px; margin: 0 auto;">
                                <div style="font-size: 2.5rem; margin-bottom: 10px;">🔑</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-purple); margin-bottom: 5px;">Private Showings</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">Realtor-escorted onsite tours matching your schedule.</div>
                            </div>
                        `
                    }
                ],
                faqs: [
                    {
                        q: "HOW DO I VIEW A PROPERTY VIRTUALLY?",
                        a: "Simply contact us or fill out the showing request below. We will send you an interactive 3D tour link, or arrange a live video tour with a licensed realtor."
                    },
                    {
                        q: "WHAT COMMISSIONS DO YOU CHARGE TO BUYERS?",
                        a: "Buyer representation is typically covered by standard listing agreements, meaning our home advisory services are completely free for home buyers."
                    },
                    {
                        q: "CAN YOU PROVIDE A COMPARATIVE MARKET ANALYSIS?",
                        a: "Yes! We compile real-time comparative market analysis reports for properties you wish to sell, buy, or lease to negotiate the best terms."
                    },
                    {
                        q: "ARE YOUR REAL ESTATE AGENTS LICENSED IN NEVADA?",
                        a: "Yes, Nexus Realty Group is a licensed brokerage, and all our realtors are registered with the Nevada Division of Real Estate."
                    }
                ]
            }
        };

        const clientContent = CLIENT_SECTIONS[clientId];
        if (clientContent) {
            // Update Intro section
            const introTextEl = document.querySelector('.section-intro .intro-large-text');
            if (introTextEl) introTextEl.textContent = clientContent.introText;

            // Update Services badge
            const servicesBadgeEl = document.querySelector('.section-core-features .section-badge-dark');
            if (servicesBadgeEl) {
                servicesBadgeEl.innerHTML = `<span class="badge-dot-purple"></span> ${clientContent.servicesBadge}`;
            }

            // Update Services cards
            const serviceCards = document.querySelectorAll('.core-feature-card');
            clientContent.services.forEach((service, idx) => {
                const card = serviceCards[idx];
                if (card) {
                    const cardTitle = card.querySelector('h3');
                    if (cardTitle) cardTitle.textContent = service.title;

                    const cardDesc = card.querySelector('p');
                    if (cardDesc) cardDesc.textContent = service.desc;

                    const cardTag = card.querySelector('.card-tag');
                    if (cardTag) cardTag.textContent = service.tag;
                }
            });

            // Update Details Rows and inject Infographics
            const detailRows = document.querySelectorAll('.detail-row');
            clientContent.details.forEach((detail, idx) => {
                const row = detailRows[idx];
                if (row) {
                    const badgeEl = row.querySelector('.detail-badge-red, .detail-badge-blue, .detail-badge-purple');
                    if (badgeEl) badgeEl.textContent = detail.badge;

                    const titleEl = row.querySelector('.detail-title');
                    if (titleEl) titleEl.textContent = detail.title;

                    const descEl = row.querySelector('.detail-desc');
                    if (descEl) descEl.textContent = detail.desc;

                    // Inject infographic card in place of default image column
                    const imgColumn = row.querySelector('.detail-image-column');
                    if (imgColumn) {
                        imgColumn.innerHTML = detail.infographic;
                    }
                }
            });

            // Update FAQs
            const faqItems = document.querySelectorAll('.faq-item');
            clientContent.faqs.forEach((faq, idx) => {
                const item = faqItems[idx];
                if (item) {
                    const questionEl = item.querySelector('.faq-question');
                    if (questionEl) questionEl.textContent = faq.q;

                    const answerEl = item.querySelector('.faq-answer');
                    if (answerEl) answerEl.textContent = faq.a;
                }
            });

            // Update "Learn More" CTA in hero
            const learnMoreBtn = document.querySelector('.hero-cta-group .btn-outline-dark');
            if (learnMoreBtn) {
                learnMoreBtn.textContent = clientContent.heroLearnMoreText;
            }

            // Rewrite Header Navigation Links
            const featuresLink = document.querySelector('.nav-links a[href="#features"]');
            if (featuresLink) featuresLink.textContent = clientContent.featuresText;

            const detailsLink = document.querySelector('.nav-links a[href="#details"]');
            if (detailsLink) detailsLink.textContent = clientContent.detailsText;

            const faqLink = document.querySelector('.nav-links a[href="#faq"]');
            if (faqLink) faqLink.textContent = "FAQs";

            const sandboxLink = document.querySelector('.nav-links a[href="#sandbox"]');
            if (sandboxLink) sandboxLink.style.display = 'none';

            const contactLink = document.querySelector('.nav-links a[href="#contact"]');
            if (contactLink) {
                if (clientId === 'restoration_lv') {
                    contactLink.textContent = "Emergency Intake";
                } else if (clientId === 'roofing_sc') {
                    contactLink.textContent = "Request Tarping";
                } else if (clientId === 'property_apex') {
                    contactLink.textContent = "Submit Repair";
                } else if (clientId === 'realestate_nexus') {
                    contactLink.textContent = "Schedule Showing";
                }
            }
        }

        // Hide purely agency-level sections (metrics, simulation sandbox)
        const agencySelectors = [
            '.section-metrics',
            '.section-sandbox'
        ];
        agencySelectors.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) el.style.display = 'none';
        });

        // Customize the primary hero button text based on client
        const primaryHeroBtn = document.querySelector('.hero-cta-group .btn-primary-glow');
        if (primaryHeroBtn) {
            if (clientId === 'restoration_lv') {
                primaryHeroBtn.textContent = "Report Damage";
            } else if (clientId === 'roofing_sc') {
                primaryHeroBtn.textContent = "Request Tarping";
            } else if (clientId === 'property_apex') {
                primaryHeroBtn.textContent = "Submit Repair";
            } else if (clientId === 'realestate_nexus') {
                primaryHeroBtn.textContent = "Schedule Showing";
            }
        }

        // Update form disclaimer with client name
        const formDisclaimer = document.querySelector('.form-disclaimer');
        if (formDisclaimer) {
            formDisclaimer.textContent = `By submitting this form, you agree to our privacy policy and consent to receiving communications from ${theme.name}.`;
        }

        // Update success screen message for client
        const successTitle = document.querySelector('#success-screen h3');
        const successDesc = document.querySelector('#success-screen p:not(.success-subtext)');
        const successSubtext = document.querySelector('#success-screen .success-subtext');

        if (successTitle && successDesc && successSubtext) {
            if (clientId === 'restoration_lv') {
                successTitle.textContent = "Emergency Request Received!";
                successDesc.textContent = "Our emergency water & fire mitigation dispatchers have captured your details.";
                successSubtext.textContent = "A restoration crew leader will contact you immediately at the number provided.";
            } else if (clientId === 'roofing_sc') {
                successTitle.textContent = "Tarping Request Received!";
                successDesc.textContent = "Our emergency roof response dispatchers have captured your details.";
                successSubtext.textContent = "A tarping supervisor will contact you immediately at the number provided.";
            } else if (clientId === 'property_apex') {
                successTitle.textContent = "Repair Ticket Created!";
                successDesc.textContent = "A maintenance work ticket has been opened in the system.";
                successSubtext.textContent = "A maintenance coordinator or technician will follow up at the number provided shortly.";
            } else if (clientId === 'realestate_nexus') {
                successTitle.textContent = "Showing Requested!";
                successDesc.textContent = "Our tour scheduling team has received your property showing request.";
                successSubtext.textContent = "A real estate advisor will call you to confirm your showing window.";
            }
        }

        // Hide agency-specific top part of the footer
        const footerTop = document.querySelector('.footer-top');
        if (footerTop) footerTop.style.display = 'none';

        // Update footer copyright
        const footerCopyright = document.querySelector('.footer-copyright p');
        if (footerCopyright) {
            footerCopyright.innerHTML = `&copy; 2026 ${theme.name}. All rights reserved.`;
        }
    }

    function updateUIWithTheme(t) {
        if (isDefaultOrSyncro) return;
        
        document.title = `${t.name} - ${t.niche}`;
        
        const logoEl = document.getElementById('header-logo');
        if (logoEl && t.logo) {
            const parts = t.logo.split(' ');
            logoEl.innerHTML = `<span class="logo-accent">${parts[0]}</span> ${parts.slice(1).join(' ')}`;
        }
        
        const heroTitleEl = document.querySelector('.hero-title, .hero-title-main');
        if (heroTitleEl && t.heroTitle) {
            heroTitleEl.innerHTML = t.heroTitle;
        }
        
        const heroSubtitleEl = document.querySelector('.hero-subtitle, .hero-subtitle-main');
        if (heroSubtitleEl && t.subtitle) {
            heroSubtitleEl.textContent = t.subtitle;
        }

        const phoneBtn = document.getElementById('call-emergency-btn');
        if (phoneBtn && t.phone) {
            phoneBtn.innerHTML = `<span class="btn-icon">📞</span> ${t.phone.replace('📞 ', '')}`;
        }

        const root = document.documentElement;
        if (t.primaryColor) root.style.setProperty('--accent-purple', t.primaryColor);
        if (t.primaryHover) root.style.setProperty('--accent-purple-hover', t.primaryHover);
        if (t.secondaryColor) root.style.setProperty('--accent-blue', t.secondaryColor);
        if (t.secondaryHover) root.style.setProperty('--accent-blue-hover', t.secondaryHover);
        if (t.bgPrimary) root.style.setProperty('--bg-dark', t.bgPrimary);
        if (t.bgSecondary) root.style.setProperty('--bg-card', t.bgSecondary);

        const formDisclaimer = document.querySelector('.form-disclaimer');
        if (formDisclaimer) {
            formDisclaimer.textContent = `By submitting this form, you agree to our privacy policy and consent to receiving communications from ${t.name}.`;
        }

        const footerCopyright = document.querySelector('.footer-copyright p');
        if (footerCopyright) {
            footerCopyright.innerHTML = `&copy; 2026 ${t.name}. All rights reserved.`;
        }

        const chatAssistantName = document.getElementById('chat-assistant-name');
        if (chatAssistantName) {
            chatAssistantName.textContent = `${t.name} AI Assistant`;
        }

        const chatBubble = document.getElementById('chat-widget-bubble');
        if (chatBubble && t.primaryColor) {
            chatBubble.style.background = t.primaryColor;
        }
        
        const chatSendBtn = document.getElementById('chat-send-btn');
        if (chatSendBtn && t.primaryColor) {
            chatSendBtn.style.background = t.primaryColor;
        }
    }

    const loadDynamicSettings = async () => {
        try {
            const res = await fetch(`/api/client-settings?clientId=${clientId}`);
            const data = await res.json();
            if (data.success && data.settings) {
                const dbSettings = data.settings;
                const mergedTheme = {
                    ...theme,
                    ...dbSettings
                };
                updateUIWithTheme(mergedTheme);
            }
        } catch (err) {
            console.error('❌ Failed to fetch dynamic client settings:', err);
        }
    };
    loadDynamicSettings();


    // Dynamic Real Estate Niche Form Alterations (only if active)
    if (clientId === 'realestate_nexus') {
        // Change form header title
        const formHeaderTitle = document.querySelector('.card-header h2');
        if (formHeaderTitle) formHeaderTitle.textContent = "Schedule a Property Showing";

        // Change form header subtitle
        const formHeaderSub = document.querySelector('.card-header p');
        if (formHeaderSub) formHeaderSub.textContent = "Fill in the details below to sync with our CRM and schedule a home tour.";

        // Change Property Address Label and Placeholder
        const addressLabel = document.querySelector('label[for="address"]');
        if (addressLabel) addressLabel.textContent = "Preferred Neighborhood / Listing Address";
        if (addressInput) addressInput.placeholder = "e.g., Summerlin / 123 Luxury Lane";

        // Change Damage Type Label and Select Options
        const damageLabel = document.querySelector('label[for="damageType"]');
        if (damageLabel) damageLabel.textContent = "Property Preferences";
        if (damageTypeInput) {
            damageTypeInput.innerHTML = `
                <option value="" disabled selected>Select property preference...</option>
                <option value="Looking for 3B/2B home, budget $450k">3B/2B Single Family ($450k+)</option>
                <option value="Looking for luxury condo, budget $800k">Luxury High-rise Condo</option>
                <option value="Looking to lease 2B/2B condo, budget $2.5k">Rental / Lease (2B/2B)</option>
                <option value="Looking for townhome, budget $350k">Townhouse / Starter Home</option>
                <option value="Other property request">Other Inquiry</option>
            `;
        }

        // Change Form Submit Button text
        const submitBtnText = submitBtn.querySelector('.btn-text');
        if (submitBtnText) submitBtnText.textContent = "Schedule Showing";
    }

    // RegEx patterns for validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/; // matches US formats easily

    // Clear error for a specific field
    const clearError = (inputEl, errorEl) => {
        inputEl.classList.remove('invalid');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.add('hidden');
        }
    };

    // Show error for a specific field
    const showError = (inputEl, errorEl, message) => {
        inputEl.classList.add('invalid');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
        }
    };

    // Validate form inputs
    const validateForm = () => {
        let isValid = true;

        // Validate Name
        const nameVal = nameInput.value.trim();
        const nameError = document.getElementById('name-error');
        if (!nameVal) {
            showError(nameInput, nameError, 'Full name is required.');
            isValid = false;
        } else if (nameVal.length < 2) {
            showError(nameInput, nameError, 'Name must be at least 2 characters.');
            isValid = false;
        } else {
            clearError(nameInput, nameError);
        }

        // Validate Phone
        const phoneVal = phoneInput.value.trim();
        const phoneError = document.getElementById('phone-error');
        if (!phoneVal) {
            showError(phoneInput, phoneError, 'Phone number is required.');
            isValid = false;
        } else if (!phoneRegex.test(phoneVal)) {
            showError(phoneInput, phoneError, 'Please enter a valid phone number.');
            isValid = false;
        } else {
            clearError(phoneInput, phoneError);
        }

        // Validate Email
        const emailVal = emailInput.value.trim();
        const emailError = document.getElementById('email-error');
        if (!emailVal) {
            showError(emailInput, emailError, 'Email address is required.');
            isValid = false;
        } else if (!emailRegex.test(emailVal)) {
            showError(emailInput, emailError, 'Please enter a valid email address.');
            isValid = false;
        } else {
            clearError(emailInput, emailError);
        }

        // Validate Address (Budget selection for default Syncro Scale page)
        const addressVal = addressInput.value;
        const addressError = document.getElementById('address-error');
        if (!addressVal) {
            showError(addressInput, addressError, isDefaultOrSyncro ? 'Please choose your budget.' : 'Property address is required.');
            isValid = false;
        } else if (!isDefaultOrSyncro && addressVal.length < 5) {
            showError(addressInput, addressError, 'Please enter a full, valid address.');
            isValid = false;
        } else {
            clearError(addressInput, addressError);
        }

        // Validate Damage Type (Automation Needs for default Syncro Scale page)
        const damageVal = damageTypeInput.value.trim();
        const damageError = document.getElementById('damageType-error');
        if (!damageVal) {
            showError(damageTypeInput, damageError, isDefaultOrSyncro ? 'Please describe what you want us to do.' : 'Please select a damage type.');
            isValid = false;
        } else {
            clearError(damageTypeInput, damageError);
        }

        return isValid;
    };

    // Attach real-time validation listeners on input events
    [nameInput, phoneInput, emailInput, addressInput, damageTypeInput].forEach(inputEl => {
        if (inputEl) {
            inputEl.addEventListener('input', () => {
                const errorEl = document.getElementById(`${inputEl.id}-error`);
                if (inputEl.value.trim()) {
                    clearError(inputEl, errorEl);
                }
            });
        }
    });

    // FAQ Accordion Toggle Logic
    const faqTriggers = document.querySelectorAll('.faq-trigger');
    faqTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
            const panel = trigger.nextElementSibling;
            
            // Close all other panels
            faqTriggers.forEach(otherTrigger => {
                if (otherTrigger !== trigger) {
                    otherTrigger.setAttribute('aria-expanded', 'false');
                    const otherPanel = otherTrigger.nextElementSibling;
                    if (otherPanel) otherPanel.style.maxHeight = null;
                }
            });
            
            if (isExpanded) {
                trigger.setAttribute('aria-expanded', 'false');
                panel.style.maxHeight = null;
            } else {
                trigger.setAttribute('aria-expanded', 'true');
                panel.style.maxHeight = `${panel.scrollHeight}px`;
            }
        });
    });


    // Handle Form Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. Run Client-side validation checks
            if (!validateForm()) {
                formAlert.classList.remove('hidden');
                return;
            }

            formAlert.classList.add('hidden');

            // 2. Set UI Loading States
            if (submitBtn) submitBtn.disabled = true;
            if (btnText) btnText.textContent = 'Triggering Ingestion...';
            if (spinner) spinner.classList.remove('hidden');

            const payload = {
                name: nameInput.value.trim(),
                phone: phoneInput.value.trim(),
                email: emailInput.value.trim(),
                address: addressInput.value.trim(),
                damageType: damageTypeInput.value,
                clientId: clientId
            };

            try {
                // 3. Post lead to clean backend API
                const response = await fetch('/api/web-lead', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // 4. Show success screen
                    form.classList.add('hidden');
                    if (successScreen) successScreen.classList.remove('hidden');
                } else {
                    throw new Error(result.error || 'Server ingestion failure.');
                }
            } catch (error) {
                console.error('❌ Ingestion Error:', error);
                if (formAlert) {
                    const alertMsg = formAlert.querySelector('.alert-message');
                    if (alertMsg) alertMsg.textContent = `System Error: ${error.message}`;
                    formAlert.classList.remove('hidden');
                }
            } finally {
                // 5. Restore submit button states
                if (submitBtn) submitBtn.disabled = false;
                if (btnText) btnText.textContent = 'Submit Request';
                if (spinner) spinner.classList.add('hidden');
            }
        });
    }

    // Handle Reset Button (Success Screen -> Form Screen)
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (form) form.reset();
            if (successScreen) successScreen.classList.add('hidden');
            if (form) form.classList.remove('hidden');
            if (formAlert) formAlert.classList.add('hidden');
        });
    }

    // --- Floating Web Chat Widget Implementation ---
    const chatBubble = document.getElementById('chat-widget-bubble');
    const chatContainer = document.getElementById('chat-widget-container');
    const chatClose = document.getElementById('chat-close-btn');
    const chatForm = document.getElementById('chat-input-form');
    const chatInput = document.getElementById('chat-user-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const chatStatus = document.getElementById('chat-status-indicator');
    const chatStatusText = document.getElementById('chat-status-text');
    const chatAssistantName = document.getElementById('chat-assistant-name');

    if (chatAssistantName) {
        chatAssistantName.textContent = `${theme.name} AI Assistant`;
    }

    const chatHeaderStatus = document.querySelector('.chat-header .chat-status-text');
    if (chatHeaderStatus) {
        if (clientId === 'restoration_lv' || clientId === 'roofing_sc') {
            chatHeaderStatus.textContent = 'Emergency Dispatch Assistant';
        } else if (clientId === 'property_apex') {
            chatHeaderStatus.textContent = 'Maintenance Assistant';
        } else if (clientId === 'realestate_nexus') {
            chatHeaderStatus.textContent = 'Real Estate Booking Assistant';
        } else {
            chatHeaderStatus.textContent = 'Smart Automation Assistant';
        }
    }

    if (chatInput) {
        if (clientId === 'restoration_lv' || clientId === 'roofing_sc') {
            chatInput.placeholder = 'Describe your emergency...';
        } else if (clientId === 'property_apex') {
            chatInput.placeholder = 'Describe your repair issue...';
        } else if (clientId === 'realestate_nexus') {
            chatInput.placeholder = 'Ask about homes or schedule a showing...';
        } else {
            chatInput.placeholder = 'Ask about automations...';
        }
    }

    // Set custom theme styling for chat bubble and buttons dynamically ONLY if custom client is requested
    if (!isDefaultOrSyncro) {
        if (chatBubble) {
            chatBubble.style.background = theme.primaryColor;
        }
        if (chatSendBtn) {
            chatSendBtn.style.background = theme.primaryColor;
        }
    }

    let ws = null;
    let reconnectTimeout = null;

    const appendMessage = (sender, text) => {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('chat-message', 'message-' + sender);
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const connectWebSocket = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/chat-stream?clientId=${clientId}`;
        
        console.log(`Connecting chat WebSocket to ${wsUrl}`);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Chat WebSocket connected.');
            chatMessages.innerHTML = ''; // Clear prior chat history on reconnect/connect
        };

        let currentAssistantMessageElement = null;

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.event === 'text_chunk') {
                    chatStatus.classList.add('hidden'); // Hide thinking indicator when text streams
                    
                    if (!currentAssistantMessageElement) {
                        currentAssistantMessageElement = document.createElement('div');
                        currentAssistantMessageElement.classList.add('chat-message', 'message-assistant');
                        chatMessages.appendChild(currentAssistantMessageElement);
                    }
                    currentAssistantMessageElement.textContent += data.text;
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                } else if (data.event === 'status_update') {
                    chatStatus.classList.remove('hidden');
                    chatStatusText.textContent = data.text;
                } else if (data.event === 'response_done') {
                    currentAssistantMessageElement = null;
                    chatStatus.classList.add('hidden');
                } else if (data.event === 'rich_card') {
                    chatStatus.classList.add('hidden');
                    currentAssistantMessageElement = null; // Break text stream chunking

                    const cardDiv = document.createElement('div');
                    cardDiv.classList.add('chat-message', 'message-assistant', 'rich-card-message');
                    cardDiv.style.background = 'transparent';
                    cardDiv.style.border = 'none';
                    cardDiv.style.padding = '0';
                    cardDiv.style.maxWidth = '100%';

                    if (data.cardType === 'property_carousel') {
                        const carouselContainer = document.createElement('div');
                        carouselContainer.classList.add('chat-carousel-container');

                        data.data.forEach(item => {
                            const listingCard = document.createElement('div');
                            listingCard.classList.add('chat-listing-card');
                            listingCard.innerHTML = `
                                <div class="listing-image" style="background: ${item.imageGradient}; height: 110px; border-radius: 8px; position: relative; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; color: rgba(255,255,255,0.75); font-family: Outfit, sans-serif; font-weight: 800;">
                                    🏠
                                    <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.65); padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; color: #fff; font-weight: 500; backdrop-filter: blur(4px);">
                                        ${item.neighborhood}
                                    </div>
                                </div>
                                <div class="listing-details" style="padding: 12px 0 0 0;">
                                    <div style="font-size: 1.15rem; font-weight: bold; color: var(--accent-purple); margin-bottom: 2px;">${item.priceStr}</div>
                                    <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-light); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px;">🛏️ ${item.beds} Beds | 🛁 ${item.baths} Baths | 📐 ${item.sqft} SqFt</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 12px;">📍 ${item.address}</div>
                                    <button class="btn-card-action" data-address="${item.address}" data-pref="${item.beds}B/${item.baths}B, ${item.priceStr}" style="width: 100%; padding: 8px; background: var(--accent-purple); color: #fff; border: none; border-radius: 6px; font-size: 0.8rem; font-weight: bold; cursor: pointer; transition: all var(--transition-fast);">Request Showing</button>
                                </div>
                            `;
                            carouselContainer.appendChild(listingCard);
                        });

                        cardDiv.appendChild(carouselContainer);

                        // Bind actions
                        const actionBtns = cardDiv.querySelectorAll('.btn-card-action');
                        actionBtns.forEach(btn => {
                            btn.addEventListener('click', () => {
                                const targetAddress = btn.getAttribute('data-address');
                                const targetPref = btn.getAttribute('data-pref');

                                if (addressInput) addressInput.value = targetAddress;
                                if (damageTypeInput) {
                                    const options = Array.from(damageTypeInput.options);
                                    let matched = false;
                                    options.forEach(opt => {
                                        if (opt.value.toLowerCase().includes(targetAddress.toLowerCase()) || 
                                            opt.text.toLowerCase().includes(targetAddress.toLowerCase())) {
                                            damageTypeInput.value = opt.value;
                                            matched = true;
                                        }
                                    });
                                    if (!matched) {
                                        const newOpt = new Option(targetPref, `Showing request for ${targetAddress}`);
                                        damageTypeInput.add(newOpt);
                                        damageTypeInput.value = newOpt.value;
                                    }
                                }

                                const formContainer = document.querySelector('.form-wrapper');
                                if (formContainer) {
                                    formContainer.classList.add('pulse-highlight');
                                    setTimeout(() => {
                                        formContainer.classList.remove('pulse-highlight');
                                    }, 3000);
                                }

                                const contactSection = document.getElementById('contact');
                                if (contactSection) {
                                    contactSection.scrollIntoView({ behavior: 'smooth' });
                                }

                                appendMessage('assistant', `📍 Selected showing for ${targetAddress}! I have prefilled the showing request form for you. Please enter your name and contact details below to finalize.`);
                            });
                        });
                    } else if (data.cardType === 'pricing_table') {
                        const pricingCard = document.createElement('div');
                        pricingCard.classList.add('chat-pricing-card');
                        
                        let rowsHtml = data.data.rates.map(r => `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <td style="padding: 8px 0; color: var(--text-light); font-weight: 500; text-align: left;">${r.service}</td>
                                <td style="padding: 8px 0; text-align: right; color: var(--accent-blue); font-weight: bold;">${r.rate}</td>
                                <td style="padding: 8px 0; text-align: right; color: var(--text-secondary); font-size: 0.8rem;">${r.unit}</td>
                            </tr>
                        `).join('');

                        pricingCard.innerHTML = `
                            <h4 style="margin: 0 0 12px 0; font-size: 1rem; color: var(--text-light); border-bottom: 1px solid var(--glass-border); padding-bottom: 8px; display: flex; align-items: center; gap: 8px; text-align: left;">📊 ${data.data.title}</h4>
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 12px;">
                                <thead>
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase;">
                                        <th style="text-align: left; padding-bottom: 6px;">Service</th>
                                        <th style="text-align: right; padding-bottom: 6px;">Rate</th>
                                        <th style="text-align: right; padding-bottom: 6px;">Unit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 8px 10px; border-radius: 6px; line-height: 1.4; text-align: left;">
                                ℹ️ <strong>Billing Info:</strong> ${data.data.billingNotice}
                            </div>
                        `;
                        cardDiv.appendChild(pricingCard);
                    }

                    chatMessages.appendChild(cardDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                } else if (data.event === 'error') {
                    console.error('Chat AI error:', data.message);
                    chatStatus.classList.add('hidden');
                    appendMessage('assistant', `⚠️ Sorry, I encountered an error: ${data.message}`);
                }
            } catch (err) {
                console.error('Failed to parse WebSocket message:', err);
            }
        };

        ws.onclose = () => {
            console.log('Chat WebSocket disconnected. Reconnecting...');
            // Auto reconnect after 3 seconds if not closed by user
            if (ws && chatContainer && !chatContainer.classList.contains('hidden')) {
                chatStatus.classList.remove('hidden');
                chatStatusText.textContent = 'Reconnecting connection...';
                reconnectTimeout = setTimeout(connectWebSocket, 3000);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };
    };

    // Toggle Chat visibility
    if (chatBubble && chatContainer) {
        chatBubble.addEventListener('click', () => {
            const isHidden = chatContainer.classList.contains('hidden');
            if (isHidden) {
                chatContainer.classList.remove('hidden');
                chatBubble.classList.add('hidden'); // Hide the bubble when chat is open
                
                // Initialize WebSocket if not already active
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    connectWebSocket();
                }
            }
        });
    }

    if (chatClose && chatContainer && chatBubble) {
        chatClose.addEventListener('click', () => {
            chatContainer.classList.add('hidden');
            chatBubble.classList.remove('hidden'); // Show back the bubble
            
            // Close WebSocket connection to save session on disconnect
            if (ws) {
                const tempWs = ws;
                ws = null;
                clearTimeout(reconnectTimeout);
                tempWs.close();
            }
        });
    }

    if (chatForm && chatInput) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;

            // Render user message instantly in chat window
            appendMessage('user', text);
            chatInput.value = '';

            // Show temporary thinking state
            chatStatus.classList.remove('hidden');
            chatStatusText.textContent = 'Agent is typing...';

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ event: 'user_message', text }));
            } else {
                appendMessage('assistant', '⚠️ Connection offline. Attempting to reconnect...');
                connectWebSocket();
            }
        });
    }

    // --- Interactive Pipeline Sandbox Implementation ---
    const presetButtons = document.querySelectorAll('.btn-preset');
    const sbName = document.getElementById('sb-name');
    const sbCompany = document.getElementById('sb-company');
    const sbBudget = document.getElementById('sb-budget');
    const sbScope = document.getElementById('sb-scope');
    const sandboxForm = document.getElementById('sandbox-form');
    const btnRunSimulation = document.getElementById('btn-run-simulation');
    const terminalLog = document.getElementById('terminal-log');
    
    // Nodes & connectors
    const nodes = {
        ingest: document.getElementById('node-ingest'),
        qualify: document.getElementById('node-qualify'),
        evaluate: document.getElementById('node-evaluate'),
        calendar: document.getElementById('node-calendar')
    };
    const connectors = {
        conn1: document.getElementById('conn-1'),
        conn2: document.getElementById('conn-2'),
        conn3: document.getElementById('conn-3')
    };

    const presetsData = {
        enterprise: {
            name: "Anthony Miller",
            company: "Vegas Highrise",
            budget: "$15,000 - $50,000",
            scope: "Need to build a custom AI scoring pipeline to qualify property manager requests and dispatch local HVAC restoration technicians automatically."
        },
        "low-budget": {
            name: "Mike Brown",
            company: "Local Bakery",
            budget: "Under $5,000",
            scope: "I just need a simple portfolio website to show our bakery items and address. No custom automations or AI engines."
        },
        spam: {
            name: "John SEO",
            company: "PromoRanker",
            budget: "Under $5,000",
            scope: "BOOST YOUR SEARCH TRAFFIC! High-quality link building service for syncroscale.com. Click here http://seo-promo-ranker.com/discount for 50% off."
        }
    };

    // Toggle presets click handler
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const presetId = btn.getAttribute('data-preset');
            const data = presetsData[presetId];
            if (data) {
                sbName.value = data.name;
                sbCompany.value = data.company;
                sbBudget.value = data.budget;
                sbScope.value = data.scope;
            }
        });
    });

    const addLogLine = (type, text) => {
        const line = document.createElement('div');
        line.classList.add('log-line', type);
        line.textContent = text;
        terminalLog.appendChild(line);
        terminalLog.scrollTop = terminalLog.scrollHeight;
    };

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    if (sandboxForm) {
        sandboxForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Disable inputs
            btnRunSimulation.disabled = true;
            presetButtons.forEach(btn => btn.disabled = true);
            sbName.disabled = true;
            sbCompany.disabled = true;
            sbBudget.disabled = true;
            sbScope.disabled = true;
            
            // Reset nodes
            Object.values(nodes).forEach(n => {
                n.className = 'flow-node';
                n.querySelector('.node-status').textContent = 'Pending';
            });
            Object.values(connectors).forEach(c => c.className = 'flow-connector');
            
            // Clear terminal
            terminalLog.innerHTML = '';
            
            // Determine outcome based on budget & scope
            const budgetVal = sbBudget.value;
            const scopeVal = sbScope.value.toLowerCase();
            
            let isSpam = scopeVal.includes('http') || scopeVal.includes('discount') || scopeVal.includes('seo');
            let isLowBudget = budgetVal === 'Under $5,000';
            
            // Step 1: Ingest
            nodes.ingest.classList.add('active');
            nodes.ingest.querySelector('.node-status').textContent = 'Active';
            addLogLine('system', `[${new Date().toLocaleTimeString()}] INGESTION LAYER INITIALIZED`);
            await delay(600);
            addLogLine('info', `--> POST /api/web-lead containing payload for "${sbName.value}"`);
            await delay(600);
            addLogLine('info', `--> Schema Validation (Zod): name, email, phone, company, budget, scope... [OK]`);
            await delay(600);
            const trackingId = 'prospect_' + Math.random().toString(36).substring(2, 11);
            addLogLine('success', `--> Lead successfully published to Pub/Sub. Tracking ID: ${trackingId}`);
            nodes.ingest.classList.remove('active');
            nodes.ingest.classList.add('success');
            nodes.ingest.querySelector('.node-status').textContent = 'Success';
            connectors.conn1.classList.add('active');
            
            await delay(800);
            
            // Step 2: Qualify
            nodes.qualify.classList.add('active');
            nodes.qualify.querySelector('.node-status').textContent = 'Active';
            addLogLine('system', `[${new Date().toLocaleTimeString()}] SUBSCRIBER CONSUMING: ${trackingId}`);
            await delay(600);
            addLogLine('agent', `--> Running QualifierAgent (Claude 3.5 Haiku)...`);
            await delay(1000);
            
            if (isSpam) {
                addLogLine('warning', `--> Claude evaluation: Lead matches spam indicators or unsolicited advertisement.`);
                addLogLine('error', `--> Qualifier Score: 5/100 (Required: >= 60) -> [FAILED]`);
                addLogLine('system', `--> Lead qualification failed. Terminating pipeline execution.`);
                nodes.qualify.classList.remove('active');
                nodes.qualify.classList.add('failed');
                nodes.qualify.querySelector('.node-status').textContent = 'Rejected';
                connectors.conn1.className = 'flow-connector failed';
                addLogLine('error', `Pipeline complete. Outcome: DISQUALIFIED (SPAM)`);
            } else if (isLowBudget) {
                addLogLine('warning', `--> Claude evaluation: Budget of "${sbBudget.value}" is below agency threshold ($5,000).`);
                addLogLine('error', `--> Qualifier Score: 45/100 (Required: >= 60) -> [FAILED]`);
                addLogLine('system', `--> Lead qualification failed. Terminating pipeline execution.`);
                nodes.qualify.classList.remove('active');
                nodes.qualify.classList.add('failed');
                nodes.qualify.querySelector('.node-status').textContent = 'Low Score';
                connectors.conn1.className = 'flow-connector failed';
                addLogLine('error', `Pipeline complete. Outcome: DISQUALIFIED (LOW_BUDGET)`);
            } else {
                addLogLine('success', `--> Claude evaluation: Highly qualified automation project scope.`);
                addLogLine('success', `--> Qualifier Score: 92/100 (Required: >= 60) -> [PASSED]`);
                nodes.qualify.classList.remove('active');
                nodes.qualify.classList.add('success');
                nodes.qualify.querySelector('.node-status').textContent = '92/100';
                connectors.conn2.classList.add('active');
                
                await delay(800);
                
                // Step 3: Evaluate
                nodes.evaluate.classList.add('active');
                nodes.evaluate.querySelector('.node-status').textContent = 'Active';
                addLogLine('system', `[${new Date().toLocaleTimeString()}] EVALUATOR LAYER INITIALIZED`);
                await delay(600);
                addLogLine('agent', `--> Running EvaluatorAgent (Claude 3.5 Haiku)...`);
                await delay(1000);
                addLogLine('info', `--> Checking technical service alignment and brand compliance...`);
                await delay(800);
                addLogLine('success', `--> Claude evaluation: Custom integrations & multi-agent flow match agency stack.`);
                addLogLine('success', `--> Brand Fit Confidence: 0.88 (Required: >= 0.65) -> [APPROVED]`);
                nodes.evaluate.classList.remove('active');
                nodes.evaluate.classList.add('success');
                nodes.evaluate.querySelector('.node-status').textContent = 'Approved';
                connectors.conn3.classList.add('active');
                
                await delay(800);
                
                // Step 4: Calendar Booking
                nodes.calendar.classList.add('active');
                nodes.calendar.querySelector('.node-status').textContent = 'Active';
                addLogLine('system', `[${new Date().toLocaleTimeString()}] CALENDAR BROKER DISPATCHED`);
                await delay(600);
                addLogLine('info', `--> Retrieving real-time slot availability from Google Calendar API...`);
                await delay(800);
                addLogLine('success', `--> Found free slot on solutions architect's calendar.`);
                addLogLine('success', `--> Created calendar event: "Syncro Scale Discovery Call - ${sbCompany.value}"`);
                await delay(600);
                addLogLine('info', `--> Syncing prospect parameters to client CRM DB...`);
                await delay(600);
                addLogLine('success', `--> Slack notification dispatched to #leads-pipeline successfully.`);
                nodes.calendar.classList.remove('active');
                nodes.calendar.classList.add('success');
                nodes.calendar.querySelector('.node-status').textContent = 'Booked';
                addLogLine('success', `Pipeline complete. Outcome: BOOKED (SUCCESS)`);
            }
            
            // Re-enable inputs
            btnRunSimulation.disabled = false;
            presetButtons.forEach(btn => btn.disabled = false);
            sbName.disabled = false;
            sbCompany.disabled = false;
            sbBudget.disabled = false;
            sbScope.disabled = false;
        });
    }

    // Automatically preserve clientId query parameter across internal link navigations
    if (clientId && clientId !== 'default_client') {
        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                try {
                    const url = new URL(href, window.location.origin);
                    url.searchParams.set('clientId', clientId);
                    link.setAttribute('href', url.pathname + url.search + url.hash);
                } catch (e) {
                    console.error('Error rewriting link href:', e);
                }
            }
        });
    }
});
