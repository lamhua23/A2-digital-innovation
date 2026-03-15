// 1. Fetch and Parse the CSV Data
Papa.parse('Tesla EV Energy_51890224.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function(results) {
        const rawData = results.data.filter(row => row.Date); // Filter out empty rows at the end of CSV
        processDataAndRender(rawData);
    }
});

function processDataAndRender(data) {
    // 2. Aggregate Data by Month
    const monthlyMap = {};

    data.forEach(row => {
        const date = new Date(row.Date);
        const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap[ym]) {
            monthlyMap[ym] = {
                DateStr: ym,
                // 1. Innovation
                Software_Updates: 0,
                Battery_Output_GWh: 0,
                Auto_Index_Sum: 0,
                // 2. Adoption
                Autopilot_Active: 0,
                Charging_Stations: 0,
                // 3. Operational
                Vehicles_Produced: 0,
                Eff_Index_Sum: 0,
                // 4. Financial
                EV_Rev: 0,
                Op_Margin_Sum: 0,
                Count: 0
            };
        }
        
        let m = monthlyMap[ym];
        
        // Accumulate values
        m.Software_Updates += row.Software_Update_Releases || 0;
        m.Battery_Output_GWh += row.Battery_Output_GWh || 0;
        m.Auto_Index_Sum += row.Manufacturing_Automation_Index || 0;
        
        // For autopilot and charging stations, finding the peak active/cumulative for the month
        m.Autopilot_Active = Math.max(m.Autopilot_Active, row.Autopilot_Active_Vehicles_Thousands || 0);
        m.Charging_Stations += row.Charging_Stations_Installed || 0;
        
        m.Vehicles_Produced += row.Vehicles_Produced || 0;
        m.Eff_Index_Sum += row.Factory_Efficiency_Index || 0;
        
        m.EV_Rev += row.EV_Revenue_MillionUSD || 0;
        m.Op_Margin_Sum += row.Operating_Margin_Percent || 0;
        
        m.Count += 1;
    });

    // Convert to sorted array
    const monthlyData = Object.values(monthlyMap).sort((a, b) => a.DateStr.localeCompare(b.DateStr));

    // 3. Extract Arrays for Plotly
    const dates = [];
    const softwareUpdates = [], batteryGwh = [], automationIndex = [];
    const autopilotActive = [], chargingStations = [];
    const vehiclesProduced = [], factoryEfficiency = [];
    const evRevenue = [], opMargin = [];

    monthlyData.forEach(m => {
        dates.push(m.DateStr);
        
        // Innovation
        softwareUpdates.push(m.Software_Updates);
        batteryGwh.push(m.Battery_Output_GWh);
        automationIndex.push(m.Auto_Index_Sum / m.Count);
        
        // Adoption
        autopilotActive.push(m.Autopilot_Active);
        chargingStations.push(m.Charging_Stations);
        
        // Operational
        vehiclesProduced.push(m.Vehicles_Produced);
        factoryEfficiency.push(m.Eff_Index_Sum / m.Count);
        
        // Business
        evRevenue.push(m.EV_Rev);
        opMargin.push(m.Op_Margin_Sum / m.Count);
    });

    // 4. Update KPI Cards 
    const avgAutomation = automationIndex.reduce((a,b)=>a+b,0) / automationIndex.length;
    const maxAutopilot = Math.max(...autopilotActive);
    const totalVehicles = vehiclesProduced.reduce((a,b)=>a+b,0);
    const totalRev = evRevenue.reduce((a,b)=>a+b,0);

    document.getElementById('kpi-automation').innerText = `${avgAutomation.toFixed(1)} / 100`;
    document.getElementById('kpi-autopilot').innerText = `${maxAutopilot.toLocaleString()}K`;
    document.getElementById('kpi-production').innerText = `${(totalVehicles/1000000).toFixed(2)}M`;
    document.getElementById('kpi-revenue').innerText = `$${(totalRev/1000).toFixed(1)}B`;

    // 5. Render Chart 1: Innovation Activity
    Plotly.newPlot('chart1', [
        { x: dates, y: softwareUpdates, type: 'bar', name: 'Software Updates', marker: {color: '#3b82f6'}, opacity: 0.7 },
        { x: dates, y: batteryGwh, type: 'scatter', mode: 'lines+markers', name: 'Battery (GWh)', yaxis: 'y2', line: {color: '#06b6d4', width: 3} }
    ], {
        margin: {t: 10, l: 40, r: 40, b: 40},
        yaxis: {title: 'Updates'},
        yaxis2: {title: 'Battery (GWh)', overlaying: 'y', side: 'right'},
        legend: {orientation: 'h', y: 1.15}
    });

    // 6. Render Chart 2: Technology Adoption
    Plotly.newPlot('chart2', [
        { x: dates, y: chargingStations, type: 'bar', name: 'Charging Stations', marker: {color: '#8b5cf6'}, opacity: 0.6 },
        { x: dates, y: autopilotActive, type: 'scatter', mode: 'lines+markers', name: 'Autopilot (K)', yaxis: 'y2', line: {color: '#ef4444', width: 3} }
    ], {
        margin: {t: 10, l: 40, r: 40, b: 40},
        yaxis: {title: 'Stations Installed'},
        yaxis2: {title: 'Autopilot Active (K)', overlaying: 'y', side: 'right'},
        legend: {orientation: 'h', y: 1.15}
    });

    // 7. Render Chart 3: Operational Impact
    Plotly.newPlot('chart3', [
        { x: dates, y: vehiclesProduced, type: 'bar', name: 'Vehicles Produced', marker: {color: '#64748b'}, opacity: 0.7 },
        { x: dates, y: factoryEfficiency, type: 'scatter', mode: 'lines', name: 'Efficiency Index', yaxis: 'y2', line: {color: '#84cc16', width: 3} }
    ], {
        margin: {t: 10, l: 50, r: 40, b: 40},
        yaxis: {title: 'Vehicles Produced'},
        yaxis2: {title: 'Efficiency (0-100)', overlaying: 'y', side: 'right', range: [0, 100]},
        legend: {orientation: 'h', y: 1.15}
    });

    // 8. Render Chart 4: Business (Financial) Impact
    Plotly.newPlot('chart4', [
        { x: dates, y: evRevenue, type: 'scatter', mode: 'lines', fill: 'tozeroy', name: 'EV Revenue ($M)', line: {color: '#22c55e'}, fillcolor: 'rgba(34, 197, 94, 0.2)' },
        { x: dates, y: opMargin, type: 'scatter', mode: 'lines+markers', name: 'Op Margin (%)', yaxis: 'y2', line: {color: '#f59e0b', dash: 'dot', width: 3} }
    ], {
        margin: {t: 10, l: 50, r: 40, b: 40},
        yaxis: {title: 'Revenue ($M)'},
        yaxis2: {title: 'Margin (%)', overlaying: 'y', side: 'right'},
        legend: {orientation: 'h', y: 1.15}
    });
}