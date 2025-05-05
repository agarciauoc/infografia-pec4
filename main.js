async function drawStackedBarChartWithLabels() {

    // 1. Configuración (sin cambios)
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const container = d3.select(".chart-container");
    const windowWidth = window.innerWidth;
    const width = Math.max(0, windowWidth - margin.left - margin.right);
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("#tooltip");

    // --- Constante para tamaño mínimo de etiqueta ---
    const minHeightForLabel = 12; // px. No mostrar etiqueta si el segmento es más bajo que esto.

    // 2. Cargar y Procesar Datos (sin cambios)
    const rawData = await d3.csv("datos_vasos.csv", d => ({
        año: +d.Año,
        tipo: d['Tipo de vaso'].trim(),
        total: +d.Total
    }));

     if (!rawData || rawData.length === 0) {
         svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle")
            .text("Error al cargar datos.").style("fill", "red");
         console.error("Error loading data");
         return;
     }

    const keys = Array.from(new Set(rawData.map(d => d.tipo))).sort();
    const years = Array.from(new Set(rawData.map(d => d.año))).sort((a,b) => a - b);

    const dataByYear = d3.group(rawData, d => d.año);
    const pivotedData = Array.from(dataByYear, ([year, values]) => {
        const obj = { año: year };
        keys.forEach(key => {
            const entry = values.find(d => d.tipo === key);
            obj[key] = entry ? entry.total : 0;
        });
        return obj;
    }).sort((a, b) => a.año - b.año);

    // 3. Stack Generator (sin cambios)
    const stack = d3.stack()
        .keys(keys)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);
    const stackedSeries = stack(pivotedData);

     if (!stackedSeries || stackedSeries.length === 0) {
         svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle")
            .text("Error al procesar datos apilados.").style("fill", "red");
         console.error("Stacking failed", stackedSeries);
         return;
     }

    // 4. Escalas (sin cambios)
    const xScale = d3.scaleBand().domain(years).range([0, width]).padding(0.2);
    const maxTotalStacked = d3.max(stackedSeries, series => d3.max(series, d => d[1]));
    const yScale = d3.scaleLinear().domain([0, maxTotalStacked * 1.05]).nice().range([height, 0]);
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(keys);

    // 5. Ejes y Gridlines (sin cambios)
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(yScale).ticks(10);
    svg.append("g").attr("class", "grid").call(d3.axisLeft(yScale).ticks(10).tickSize(-width).tickFormat(""));
    svg.append("g").attr("class", "axis x-axis").attr("transform", `translate(0,${height})`).call(xAxis);
    svg.append("g").attr("class", "axis y-axis").call(yAxis);
    svg.append("text").attr("text-anchor", "middle").attr("x", width / 2).attr("y", height + margin.bottom - 10).text("Año").style("font-size", "12px").attr("fill", "#333");
    svg.append("text").attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("y", -margin.left + 15).attr("x", -height / 2).text("Total").style("font-size", "12px").attr("fill", "#333");


    // 6. Dibujar las Barras Apiladas y SUS ETIQUETAS ---> MODIFICACIONES AQUÍ <---

    // Crear un grupo para cada serie (tipo de vaso)
    const serieGroups = svg.selectAll(".serie-group")
        .data(stackedSeries)
        .join("g")
        .attr("fill", d => colorScale(d.key))
        .attr("class", "serie-group")
         // Guardar la clave (tipo) en el grupo para referencia fácil en las etiquetas
        .attr("data-key", d => d.key);


    // DIBUJAR LOS RECTÁNGULOS (SEGMENTOS)
    serieGroups.selectAll("rect.bar-segment")
        .data(d => d) // Bind segment data [y0, y1, data]
        .join("rect")
        .attr("class", "bar-segment")
        .attr("x", d => xScale(d.data.año))
        .attr("y", d => yScale(d[1]))
        .attr("height", d => {
            const h = yScale(d[0]) - yScale(d[1]);
            return h > 0 ? h : 0; // Avoid negative height if data is odd
         })
        .attr("width", xScale.bandwidth())
         // --- Tooltip (sin cambios) ---
        .on("mouseover", (event, d) => {
            const key = d3.select(event.currentTarget.parentNode).attr("data-key"); // Get type key from parent
            const value = d.data[key];
            tooltip.transition().duration(100).style("opacity", .9);
            tooltip.html(`<strong>${key}</strong><br/>Año: ${d.data.año}<br/>Total: ${d3.format(",")(value)}`)
                   .style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 15) + "px");
            d3.select(event.currentTarget).style("opacity", 0.7);
        })
        .on("mouseout", (event, d) => {
             tooltip.transition().duration(200).style("opacity", 0);
             d3.select(event.currentTarget).style("opacity", 1.0);
        });


    // ---- NUEVO: DIBUJAR LAS ETIQUETAS DE TEXTO DENTRO DE LAS BARRAS ----
    serieGroups.selectAll("text.bar-label")
         // Bind the same segment data
        .data(d => d)
         // Filter data: only bind if the segment height is sufficient
        .filter(d => (yScale(d[0]) - yScale(d[1])) >= minHeightForLabel)
        .join("text")
        .attr("class", "bar-label")
         // Horizontal center: center of the bar's width
        .attr("x", d => xScale(d.data.año) + xScale.bandwidth() / 2)
         // Vertical center: midpoint between the segment's top and bottom
        .attr("y", d => yScale(d[1]) + (yScale(d[0]) - yScale(d[1])) / 2)
         // Get the actual value for THIS segment using the key stored in the parent group
        .text(function(d) { // Use function to access parent node's data
            const key = d3.select(this.parentNode).attr("data-key");
            const value = d.data[key];
            return value > 0 ? d3.format(",")(value) : ""; // Show value if > 0, else empty
         });
     // ---- FIN DE NUEVAS ETIQUETAS DE TEXTO ----


    // 7. Leyenda (sin cambios)
    const legendContainer = d3.select("#legend");
    const legendItems = legendContainer.selectAll(".legend-item")
        .data(keys)
        .enter().append("div").attr("class", "legend-item");
    legendItems.append("span").attr("class", "legend-color").style("background-color", d => colorScale(d));
    legendItems.append("span").attr("class", "legend-text").text(d => d);

} // Fin de drawStackedBarChartWithLabels

drawStackedBarChartWithLabels();