let globalData = []; 
let currentMonthlyData = []; 
let rawFilteredData = []; 

// 1. Fetch and Parse
Papa.parse('Tesla EV Energy_51890224.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function(results) {
        globalData = results.data.filter(row => row.Date); 
        processDataAndRender(globalData);
    }
});

// 2. Filters & Form
document.getElementById('factoryFilter').addEventListener('change', function(e) {
    const selectedFactory = e.target.value;
    if (selectedFactory === 'All') processDataAndRender(globalData);
    else processDataAndRender(globalData.filter(row => row.Factory_Location === selectedFactory));
});

document.getElementById('dataForm').addEventListener('submit', function(e) {
    e.preventDefault(); 
    const newRow = {
        Date: document.getElementById('newDate').value,
        Factory_Location: document.getElementById('newFactory').value,
        Vehicles_Produced: parseInt(document.getElementById('newProduced').value),
        EV_Revenue_MillionUSD: parseFloat(document.getElementById('newRev').value),
        Vehicles_Delivered: parseInt(document.getElementById('newProduced').value) * 0.95,
        Energy_Business_Revenue_MillionUSD: 50, Software_Update_Releases: 2, Battery_Output_GWh: 30,
        Manufacturing_Automation_Index: 85, Autopilot_Active_Vehicles_Thousands: 1200,
        Charging_Stations_Installed: 50, Factory_Efficiency_Index: 90, Operating_Margin_Percent: 20
    };
    globalData.push(newRow);
    const filter = document.getElementById('factoryFilter').value;
    processDataAndRender(globalData.filter(row => filter === 'All' || row.Factory_Location === filter));
});

// 3. Core Processing
function processDataAndRender(data) {
    rawFilteredData = data;
    const monthlyMap = {};

    data.forEach(row => {
        const date = new Date(row.Date);
        if (isNaN(date.getTime())) return; 
        const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap[ym]) {
            monthlyMap[ym] = {
                DateStr: ym, Software_Updates: 0, Battery_Output_GWh: 0, Auto_Index_Sum: 0,
                Autopilot_Active: 0, Charging_Stations: 0, Vehicles_Delivered: 0,
                Vehicles_Produced: 0, Eff_Index_Sum: 0, EV_Rev: 0, Energy_Rev: 0, Op_Margin_Sum: 0, Count: 0
            };
        }
        let m = monthlyMap[ym];
        m.Software_Updates += row.Software_Update_Releases || 0;
        m.Battery_Output_GWh += row.Battery_Output_GWh || 0;
        m.Auto_Index_Sum += row.Manufacturing_Automation_Index || 0;
        m.Autopilot_Active = Math.max(m.Autopilot_Active, row.Autopilot_Active_Vehicles_Thousands || 0);
        m.Charging_Stations += row.Charging_Stations_Installed || 0;
        m.Vehicles_Produced += row.Vehicles_Produced || 0;
        m.Vehicles_Delivered += row.Vehicles_Delivered || 0;
        m.Eff_Index_Sum += row.Factory_Efficiency_Index || 0;
        m.EV_Rev += row.EV_Revenue_MillionUSD || 0;
        m.Energy_Rev += row.Energy_Business_Revenue_MillionUSD || 0;
        m.Op_Margin_Sum += row.Operating_Margin_Percent || 0;
        m.Count += 1;
    });

    currentMonthlyData = Object.values(monthlyMap).sort((a, b) => a.DateStr.localeCompare(b.DateStr));
    if (currentMonthlyData.length === 0) return;

    // Update Top KPIs
    updateKPIs();

    // Render All 8 Charts based on their current Dropdown Selection
    updateChart('chart1', 'act', document.getElementById('type-chart1').value);
    updateChart('chart2', 'tech', document.getElementById('type-chart2').value);
    updateChart('chart3', 'ops', document.getElementById('type-chart3').value);
    updateChart('chart4', 'biz', document.getElementById('type-chart4').value);
    updateChart('chart5', 'mfg', document.getElementById('type-chart5').value);
    updateChart('chart6', 'eco', document.getElementById('type-chart6').value);
    updateChart('chart7', 'digi', document.getElementById('type-chart7').value);
    updateChart('chart8', 'fin', document.getElementById('type-chart8').value);
}

// Helper: Extract arrays
function ext(key, isAvg = false) { 
    return currentMonthlyData.map(m => isAvg ? parseFloat((m[key]/m.Count).toFixed(2)) : m[key]); 
}

function updateKPIs() {
    const autoIdx = ext('Auto_Index_Sum', true), apAct = ext('Autopilot_Active'), vProd = ext('Vehicles_Produced'), evRev = ext('EV_Rev');
    document.getElementById('kpi-automation').innerText = `${(autoIdx.reduce((a,b)=>a+b,0)/autoIdx.length).toFixed(1)} / 100`;
    document.getElementById('kpi-autopilot').innerText = `${Math.max(...apAct).toLocaleString()}K`;
    document.getElementById('kpi-production').innerText = `${(vProd.reduce((a,b)=>a+b,0)/1000000).toFixed(2)}M`;
    document.getElementById('kpi-revenue').innerText = `$${(evRev.reduce((a,b)=>a+b,0)/1000).toFixed(1)}B`;
}

// 4. Universal Interactive Chart Generator (Handles all 8 Charts)
function updateChart(divId, category, type) {
    const dates = currentMonthlyData.map(m => m.DateStr);
    let traces = [], layout = { margin: {t: 10, l: 40, r: 40, b: 30}, legend: {orientation: 'h', y: 1.15} };
    const chartMode = type === 'line' ? 'lines+markers' : type;

    // Build Data for Pie Charts (Aggregating by Factory)
    const factoryAgg = (col) => {
        const res = {};
        rawFilteredData.forEach(r => { res[r.Factory_Location] = (res[r.Factory_Location] || 0) + (r[col] || 0); });
        return { values: Object.values(res), labels: Object.keys(res), type: 'pie', hole: 0.4 };
    };

    if (category === 'act') {
        const sw = ext('Software_Updates'), batt = ext('Battery_Output_GWh');
        if (type === 'line' || type === 'bar') {
            traces = [{x: dates, y: sw, type: type, mode: chartMode, name: 'Software', marker: {color: '#3b82f6'}}, {x: dates, y: batt, type: type, mode: chartMode, name: 'Battery (GWh)', yaxis: 'y2', marker: {color: '#06b6d4'}}];
            layout.yaxis2 = {overlaying: 'y', side: 'right'};
        } else if (type === 'pie') traces = [factoryAgg('Battery_Output_GWh')];
        else if (type === 'table') traces = [{ type: 'table', header: {values: ['Date', 'Software Updates', 'Battery (GWh)']}, cells: {values: [dates, sw, batt]} }];
    }
    else if (category === 'tech') {
        const stn = ext('Charging_Stations'), ap = ext('Autopilot_Active');
        if (type === 'line' || type === 'bar') {
            traces = [{x: dates, y: stn, type: type, mode: chartMode, name: 'Stations', marker: {color: '#8b5cf6'}}, {x: dates, y: ap, type: type, mode: chartMode, name: 'Autopilot (K)', yaxis: 'y2', marker: {color: '#ef4444'}}];
            layout.yaxis2 = {overlaying: 'y', side: 'right'};
        } else if (type === 'pie') traces = [factoryAgg('Charging_Stations_Installed')];
        else if (type === 'table') traces = [{ type: 'table', header: {values: ['Date', 'Charging Stations', 'Autopilot (K)']}, cells: {values: [dates, stn, ap]} }];
    }
    else if (category === 'ops') {
        const prod = ext('Vehicles_Produced'), eff = ext('Eff_Index_Sum', true), deliv = ext('Vehicles_Delivered');
        if (type === 'line' || type === 'bar') {
            traces = [{x: dates, y: prod, type: type, mode: chartMode, name: 'Produced', marker: {color: '#64748b'}}, {x: dates, y: eff, type: type, mode: chartMode, name: 'Efficiency', yaxis: 'y2', marker: {color: '#84cc16'}}];
            layout.yaxis2 = {overlaying: 'y', side: 'right'};
        } else if (type === 'pie') traces = [{ values: [prod.reduce((a,b)=>a+b,0), deliv.reduce((a,b)=>a+b,0)], labels: ['Total Produced', 'Total Delivered'], type: 'pie', hole: 0.4 }];
        else if (type === 'table') traces = [{ type: 'table', header: {values: ['Date', 'Vehicles Produced', 'Efficiency Index']}, cells: {values: [dates, prod, eff]} }];
    }
    else if (category === 'biz') {
        const ev = ext('EV_Rev'), margin = ext('Op_Margin_Sum', true);
        if (type === 'line' || type === 'bar') {
            traces = [{x: dates, y: ev, type: type, mode: chartMode, name: 'EV Rev ($M)', marker: {color: '#22c55e'}, fill: type==='line'?'tozeroy':''}, {x: dates, y: margin, type: 'scatter', mode: 'lines+markers', name: 'Margin (%)', yaxis: 'y2', line: {color: '#f59e0b', dash: 'dot'}}];
            layout.yaxis2 = {overlaying: 'y', side: 'right'};
        } else if (type === 'pie') traces = [factoryAgg('EV_Revenue_MillionUSD')];
        else if (type === 'table') traces = [{ type: 'table', header: {values: ['Date', 'EV Rev ($M)', 'Margin (%)']}, cells: {values: [dates, ev, margin]} }];
    }
    else if (category === 'mfg') {
        const auto = ext('Auto_Index_Sum', true), eff = ext('Eff_Index_Sum', true), prod = ext('Vehicles_Produced');
        if (type === 'line' || type === 'bar') {
            traces = [{x: dates, y: auto, type: type, mode: chartMode, name: 'Automation Index', marker: {color: '#3b82f6'}}, {x: dates, y: eff, type: type, mode: chartMode, name: 'Efficiency Index', yaxis: 'y2', marker: {color: '#10b981'}}];
            layout.yaxis = {title: 'Automation'}; layout.yaxis2 = {title: 'Efficiency', overlaying: 'y', side: 'right'};
        } else if (type === 'pie') traces = [factoryAgg('Vehicles_Produced')];
        else if (type === 'table') traces = [{ type: 'table', header: {values: ['Date', 'Automation', 'Efficiency', 'Produced']}, cells: {values: [dates, auto, eff, prod]} }];
    } 
    else if (category === 'eco') {
        const deliv = ext('Vehicles_Delivered'), batt = ext('Battery_Output_GWh'), charge = ext('Charging_Stations');
        if (type === 'line' || type === 'bar') {
            traces = [{x: dates, y: deliv, type: type, mode: chartMode, name: 'Deliveries', marker: {color: '#94a3b8'}}, {x: dates, y: batt, type: type, mode: chartMode, name: 'Battery GWh', yaxis: 'y2', marker: {color: '#f97316'}}, {x: dates, y: charge, type: type, mode: chartMode, name: 'Charging Stn', yaxis: 'y2', marker: {color: '#ef4444'}}];
            layout.yaxis2 = {title: 'Infra Growth', overlaying: 'y', side: 'right'};
        } else if (type === 'pie') traces = [{ values: [batt.reduce((a,b)=>a+b,0), charge.reduce((a,b)=>a+b,0)], labels: ['Total Battery (GWh)', 'Total Charging Stations'], type: 'pie', hole: 0.4 }];
        else if (type === 'table') traces = [{ type: 'table', header: {values: ['Date', 'Deliveries', 'Battery GWh', 'Charging Stns']}, cells: {values: [dates, deliv, batt, charge]} }];
    }
    else if (category === 'digi') {
        const fleet = ext('Vehicles_Delivered'), ap = ext('Autopilot_Active');
        if (type === 'line' || type === 'bar') {
            traces = [{x: dates, y: fleet, type: type, mode: chartMode, name: 'Fleet Deliveries', marker: {color: '#cbd5e1'}}, {x: dates, y: ap, type: type, mode: chartMode, name: 'Active Autopilot (K)', yaxis: 'y2', marker: {color: '#a855f7'}}];
            layout.yaxis2 = {overlaying: 'y', side: 'right'};
        } else if (type === 'pie') {
            const totalFleet = fleet.reduce((a,b)=>a+b,0) / 1000, maxAp = Math.max(...ap);
            traces = [{ values: [maxAp, totalFleet - maxAp], labels: ['Active Autopilot', 'Hardware Only'], type: 'pie', hole: 0.4, marker: {colors: ['#a855f7', '#e2e8f0']} }];
        } else if (type === 'table') traces = [{ type: 'table', header: {values: ['Date', 'Fleet Delivered', 'Active Autopilot (K)']}, cells: {values: [dates, fleet, ap]} }];
    }
    else if (category === 'fin') {
        const ev = ext('EV_Rev'), eng = ext('Energy_Rev'), margin = ext('Op_Margin_Sum', true);
        if (type === 'line' || type === 'bar') {
            traces = [{x: dates, y: ev, type: type, mode: chartMode, name: 'EV Rev', marker: {color: '#22c55e'}}, {x: dates, y: eng, type: type, mode: chartMode, name: 'Energy Rev', marker: {color: '#10b981'}}, {x: dates, y: margin, type: 'scatter', mode: 'lines+markers', name: 'Margin (%)', yaxis: 'y2', line: {color: '#1e293b', dash: 'dot'}}];
            if (type === 'bar') layout.barmode = 'stack';
            layout.yaxis2 = {overlaying: 'y', side: 'right'};
        } else if (type === 'pie') traces = [{ values: [ev.reduce((a,b)=>a+b,0), eng.reduce((a,b)=>a+b,0)], labels: ['Total EV Revenue', 'Total Energy Revenue'], type: 'pie', hole: 0.4, marker: {colors: ['#22c55e', '#10b981']} }];
        else if (type === 'table') traces = [{ type: 'table', header: {values: ['Date', 'EV Rev ($M)', 'Energy Rev ($M)', 'Margin (%)']}, cells: {values: [dates, ev, eng, margin]} }];
    }

    Plotly.react(divId, traces, layout);
}

// 5. Universal CSV Exporter
function downloadCSV(category) {
    let csv = "data:text/csv;charset=utf-8,";
    const dates = currentMonthlyData.map(m => m.DateStr);
    
    const rows = dates.map((d, i) => {
        if (category === 'act') return `${d},${ext('Software_Updates')[i]},${ext('Battery_Output_GWh')[i]}`;
        if (category === 'tech') return `${d},${ext('Charging_Stations')[i]},${ext('Autopilot_Active')[i]}`;
        if (category === 'ops') return `${d},${ext('Vehicles_Produced')[i]},${ext('Eff_Index_Sum',true)[i]}`;
        if (category === 'biz') return `${d},${ext('EV_Rev')[i]},${ext('Op_Margin_Sum',true)[i]}`;
        if (category === 'mfg') return `${d},${ext('Auto_Index_Sum',true)[i]},${ext('Eff_Index_Sum',true)[i]},${ext('Vehicles_Produced')[i]}`;
        if (category === 'eco') return `${d},${ext('Vehicles_Delivered')[i]},${ext('Battery_Output_GWh')[i]},${ext('Charging_Stations')[i]}`;
        if (category === 'digi') return `${d},${ext('Vehicles_Delivered')[i]},${ext('Autopilot_Active')[i]}`;
        if (category === 'fin') return `${d},${ext('EV_Rev')[i]},${ext('Energy_Rev')[i]},${ext('Op_Margin_Sum',true)[i]}`;
    });

    if (['act'].includes(category)) csv += "Date,Software_Updates,Battery_GWh\n";
    else if (['tech'].includes(category)) csv += "Date,Charging_Stations,Autopilot_Active_K\n";
    else if (['ops'].includes(category)) csv += "Date,Vehicles_Produced,Efficiency_Index\n";
    else if (['biz'].includes(category)) csv += "Date,EV_Revenue_M,Operating_Margin\n";
    else if (['mfg'].includes(category)) csv += "Date,Automation_Index,Efficiency_Index,Vehicles_Produced\n";
    else if (['eco'].includes(category)) csv += "Date,Vehicles_Delivered,Battery_GWh,Charging_Stations\n";
    else if (['digi'].includes(category)) csv += "Date,Fleet_Delivered,Autopilot_Active_K\n";
    else if (['fin'].includes(category)) csv += "Date,EV_Revenue_M,Energy_Revenue_M,Operating_Margin\n";

    csv += rows.join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `Tesla_Data_${category}.csv`;
    document.body.appendChild(link);
    link.click();
}