let globalData = []; // Store raw data globally

// 1. Fetch and Parse the CSV Data
Papa.parse('Tesla EV Energy_51890224.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function(results) {
        globalData = results.data.filter(row => row.Date); // Filter out empty rows
        processDataAndRender(globalData);
    }
});

// 2. Filter Logic
document.getElementById('factoryFilter').addEventListener('change', function(e) {
    const selectedFactory = e.target.value;
    if (selectedFactory === 'All') {
        processDataAndRender(globalData);
    } else {
        const filteredData = globalData.filter(row => row.Factory_Location === selectedFactory);
        processDataAndRender(filteredData);
    }
});

// 3. Add New Data Logic (Form Submit)
document.getElementById('dataForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Prevent page refresh

    // Create a new data row matching the CSV structure
    const newRow = {
        Date: document.getElementById('newDate').value,
        Factory_Location: document.getElementById('newFactory').value,
        Vehicles_Produced: parseInt(document.getElementById('newProduced').value),
        EV_Revenue_MillionUSD: parseFloat(document.getElementById('newRev').value),
        // Adding dummy data for the rest to prevent the charts from breaking
        Software_Update_Releases: 2,
        Battery_Output_GWh: 30,
        Manufacturing_Automation_Index: 85,
        Autopilot_Active_Vehicles_Thousands: 1200,
        Charging_Stations_Installed: 50,
        Factory_Efficiency_Index: 90,
        Operating_Margin_Percent: 20
    };

    // Add to global memory and re-render
    globalData.push(newRow);
    
    // Re-trigger the filter to respect current dropdown state
    const currentFilter = document.getElementById('factoryFilter').value;
    if (currentFilter === 'All' || currentFilter === newRow.Factory_Location) {
        processDataAndRender(globalData.filter(row => currentFilter === 'All' || row.Factory_Location === currentFilter));
    }

    alert("Data added successfully! Charts have been updated.");
});

// 4. Core Processing & Charting Function
function processDataAndRender(data) {
    const monthlyMap = {};

    data.forEach(row => {
        const date = new Date(row.Date);
        // Safely format date to YYYY-MM
        if (isNaN(date.getTime())) return; 
        const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap[ym]) {
            monthlyMap[ym] = {
                DateStr: ym,
                Software_Updates: 0, Battery_Output_GWh: 0, Auto_Index_Sum: 0,
                Autopilot_Active: 0, Charging_Stations: 0,
                Vehicles_Produced: 0, Eff_Index_Sum: 0,
                EV_Rev: 0, Op_Margin_Sum: 0, Count: 0
            };
        }
        
        let m = monthlyMap[ym];
        m.Software_Updates += row.Software_Update_Releases || 0;
        m.Battery_Output_GWh += row.Battery_Output_GWh || 0;
        m.Auto_Index_Sum += row.Manufacturing_Automation_Index || 0;
        m.Autopilot_Active = Math.max(m.Autopilot_Active, row.Autopilot_Active_Vehicles_Thousands || 0);
        m.Charging_Stations += row.Charging_Stations_Installed || 0;
        m.Vehicles_Produced += row.Vehicles_Produced || 0;
        m.Eff_Index_Sum += row.Factory_Efficiency_Index || 0;
        m.EV_Rev += row.EV_Revenue_MillionUSD || 0;
        m.Op_Margin_Sum += row.Operating_Margin_Percent || 0;
        m.Count += 1;
    });

    const monthlyData = Object.values(monthlyMap).sort((a, b) => a.DateStr.localeCompare(b.DateStr));

    const dates = [], softwareUpdates = [], batteryGwh = [], automationIndex = [];
    const autopilotActive = [], chargingStations = [], vehiclesProduced = [], factoryEfficiency = [];
    const evRevenue = [], opMargin = [];

    monthlyData.forEach(m => {
        dates.push(m.DateStr);
        softwareUpdates.push(m.Software_Updates);
        batteryGwh.push(m.Battery_Output_GWh);
        automationIndex.push(m.Auto_Index_Sum / m.Count);
        autopilotActive.push(m.Autopilot_Active);
        chargingStations.push(m.Charging_Stations);
        vehiclesProduced.push(m.Vehicles_Produced);
        factoryEfficiency.push(m.Eff_Index_Sum / m.Count);
        evRevenue.push(m.EV_Rev);
        opMargin.push(m.Op_Margin_Sum / m.Count);
    });

    // Handle empty data cases safely
    if (dates.length === 0) return;

    // Update KPI Cards
    document.getElementById('kpi-automation').innerText = `${(automationIndex.reduce((a,b)=>a+b,0)/automationIndex.length).toFixed(1)} / 100`;
    document.getElementById('kpi-autopilot').innerText = `${Math.max(...autopilotActive).toLocaleString()}K`;
    document.getElementById('kpi-production').innerText = `${(vehiclesProduced.reduce((a,b)=>a+b,0)/1000000).toFixed(2)}M`;
    document.getElementById('kpi-revenue').innerText = `$${(evRevenue.reduce((a,b)=>a+b,0)/1000).toFixed(1)}B`;

    const layoutObj = { margin: {t: 10, l: 40, r: 40, b: 40}, legend: {orientation: 'h', y: 1.15} };

    Plotly.newPlot('chart1', [
        { x: dates, y: softwareUpdates, type: 'bar', name: 'Software Updates', marker: {color: '#3b82f6'} },
        { x: dates, y: batteryGwh, type: 'scatter', mode: 'lines+markers', name: 'Battery (GWh)', yaxis: 'y2', line: {color: '#06b6d4', width: 2} }
    ], { ...layoutObj, yaxis2: {overlaying: 'y', side: 'right'} });

    Plotly.newPlot('chart2', [
        { x: dates, y: chargingStations, type: 'bar', name: 'Charging Stations', marker: {color: '#8b5cf6'} },
        { x: dates, y: autopilotActive, type: 'scatter', mode: 'lines+markers', name: 'Autopilot (K)', yaxis: 'y2', line: {color: '#ef4444', width: 2} }
    ], { ...layoutObj, yaxis2: {overlaying: 'y', side: 'right'} });

    Plotly.newPlot('chart3', [
        { x: dates, y: vehiclesProduced, type: 'bar', name: 'Vehicles Produced', marker: {color: '#64748b'} },
        { x: dates, y: factoryEfficiency, type: 'scatter', mode: 'lines', name: 'Efficiency Index', yaxis: 'y2', line: {color: '#84cc16', width: 2} }
    ], { ...layoutObj, yaxis2: {overlaying: 'y', side: 'right'} });

    Plotly.newPlot('chart4', [
        { x: dates, y: evRevenue, type: 'scatter', mode: 'lines', fill: 'tozeroy', name: 'EV Revenue ($M)', line: {color: '#22c55e'} },
        { x: dates, y: opMargin, type: 'scatter', mode: 'lines+markers', name: 'Op Margin (%)', yaxis: 'y2', line: {color: '#f59e0b', dash: 'dot'} }
    ], { ...layoutObj, yaxis2: {overlaying: 'y', side: 'right'} });
}