document.addEventListener('DOMContentLoaded', function() {

    const svgContainer = d3.select("#svg-container");
    const tooltip = d3.select("#tooltip");
    const legendContainer = d3.select("#legend-container");
    const colorSelect = d3.select("#selectedColor");
    const datasetSelect = d3.select("#selectedDataset");

    let GAMA_DE_COLORES_ACTUAL, COLOR_ACTUAL, CONFIG, DATASET_ACTUAL, VALUES_MAP, DATASET_NAMES;

    function crearEscalaColorD3(colors,nombreColor, dominio = [0, 1], invertirPaleta = false) {
        if (!colors.hasOwnProperty(nombreColor)) {
            nombreColor = 'neutral'
        }

        const shadesObject = colors[nombreColor];
        const shadeKeys = Object.keys(shadesObject)
            .filter(key => !["950","900"].includes(key))
            .sort((a, b) => parseInt(a) - parseInt(b));

        let palette = shadeKeys.map(key => shadesObject[key]);

        if (invertirPaleta) {
            palette.reverse(); // Invierte el array si se solicita
        }

        // Crear un interpolador que se mueva a través de los colores de la paleta
        const interpolador = d3.interpolateRgbBasis(palette);

        // Crear y devolver la escala secuencial
        return d3.scaleSequential(interpolador).domain(dominio);
    }

    function pintarLeyenda(title, minValor, maxValor) {
        const legendHeight = 200; // Altura de la barra de color de la leyenda
        const legendWidth = 20;  // Ancho de la barra de color
        const margin = { top: 20, right: 40, bottom: 20, left: 10 }; // Márgenes para el SVG de la leyenda

        legendContainer.html(""); // Limpiar leyenda anterior si existiera

        legendContainer.append("div")
            .attr("class", "legend-title")
            .text(title);

        const legendSvg = legendContainer.append("svg")
            .attr("width", legendWidth + margin.left + margin.right)
            .attr("height", legendHeight + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Definir el gradiente para la leyenda
        const defs = legendSvg.append("defs");
        const linearGradient = defs.append("linearGradient")
            .attr("id", "legend-gradient")
            .attr("x1", "0%") // De arriba
            .attr("y1", "100%") // hacia
            .attr("x2", "0%") // abajo
            .attr("y2", "0%");

        // Puntos de parada para el gradiente
        // Muestreamos la escala de color para crear el gradiente
        const numStops = 10; // Número de puntos de color para definir el gradiente
        const stopValues = d3.range(numStops).map(i => minValor + (i / (numStops - 1)) * (maxValor - minValor));

        linearGradient.selectAll("stop")
            .data(stopValues)
            .enter().append("stop")
            .attr("offset", (d, i) => `${(i / (numStops - 1)) * 100}%`)
            .attr("stop-color", d => GAMA_DE_COLORES_ACTUAL(d));

        // Dibujar el rectángulo de la leyenda con el gradiente
        legendSvg.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#legend-gradient)");

        // Crear una escala para el eje de la leyenda
        const legendScale = d3.scaleLinear()
            .domain([minValor, maxValor])
            .range([legendHeight, 0]); // Invertido porque el eje Y del SVG va de arriba a abajo

        // Crear el eje de la leyenda
        const legendAxis = d3.axisRight(legendScale)
            .ticks(5) // Número de ticks deseados (ajusta según necesites)
            .tickFormat(d3.format(".1f")); // Formato de los números (e.g., 70.0)

        legendSvg.append("g")
            .attr("class", "legend-axis")
            .attr("transform", `translate(${legendWidth}, 0)`) // Posicionar el eje a la derecha de la barra
            .call(legendAxis);
    }

    function asignarEventos(valores, tooltipFN) {
        for (const groupId in valores) {
            const group = d3.select("#" + groupId);
            if (group.empty()) { continue }
            const valorDelGrupo = valores[groupId];
            //console.log('valorDelGrupo',valorDelGrupo)
            group
                .on("mouseover", function(event) {
                    const colorBaseActual = GAMA_DE_COLORES_ACTUAL(valorDelGrupo);
                    const colorHover = d3.color(colorBaseActual).brighter(0.6).toString();
                    // En este contexto 'this' es el elemento <g> del <svg>
                    d3.select(this).selectAll("path").style("fill", colorHover);

                    const tooltipHtml = tooltipFN(groupId,valorDelGrupo)
                    tooltip.transition().duration(200).style("opacity", .9);
                    tooltip.html(tooltipHtml)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mousemove", function(event) {
                    tooltip.style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function(event) {
                    const colorBaseActual = GAMA_DE_COLORES_ACTUAL(valorDelGrupo);
                    d3.select(this).selectAll("path").style("fill", colorBaseActual);
                    tooltip.transition().duration(500).style("opacity", 0);
                });
        }
    }

    function pintarMapa({ legendTitle, valores, minValor, maxValor }) {

        for (const groupId in valores) {
            const group = d3.select("#" + groupId);
            if (group.empty()) { continue }

            const valorActual = valores[groupId];
            const colorOriginal = GAMA_DE_COLORES_ACTUAL(valorActual);

            group.selectAll("path").style("fill", colorOriginal);
        }
        pintarLeyenda(legendTitle, minValor, maxValor);
    }

    function obtenerValoresTrabajo() {
        const legendTitle = 'HORAS x MES'
        let valores = {}
        let minValor = Infinity;
        let maxValor =  -Infinity;
        for(let t of VALUES_MAP.trabajo) {
            if(t["tipo_jornada"] == "Ambas jornadas" && t["tiempo_jornada"] == "Horas efectivas") {
                const horas_trimestre = t.horas
                if(!valores[`cc-${t.ca_code}`]) {
                    valores[`cc-${t.ca_code}`] = horas_trimestre
                } else {
                    if(horas_trimestre>valores[`cc-${t.ca_code}`]) {
                        valores[`cc-${t.ca_code}`] = horas_trimestre
                        if(horas_trimestre<minValor) { minValor = horas_trimestre }
                        if(horas_trimestre>maxValor) { maxValor = horas_trimestre }
                    }
                }
            }
        }
        asignarEventos(valores, (groupId,valorActual) => `<strong>ID:</strong> ${groupId}<br/><strong>Valor:</strong> ${valorActual.toFixed(1)}`)
        return {legendTitle, valores,minValor,maxValor}
    }

    function obtenerValoresEpa() {
        const legendTitle = 'TASA EMPLEO'
        let valores = {}
        let minValor = Infinity;
        let maxValor =  -Infinity;
        for(let t of VALUES_MAP.epa) {
            if(t["genero"] == "Hombres" && t["año"] == 2024) {
                const tasa_empleo = t.tasa_empleo
                //console.log('T',t)
                if(!valores[`cc-${t.id_comunidad}`]) {
                    valores[`cc-${t.id_comunidad}`] = tasa_empleo
                    if(tasa_empleo<minValor) { minValor = tasa_empleo }
                    if(tasa_empleo>maxValor) { maxValor = tasa_empleo }
                } else {
                    if(tasa_empleo>valores[`cc-${t.id_comunidad}`]) {
                        valores[`cc-${t.id_comunidad}`] = tasa_empleo
                        if(tasa_empleo<minValor) { minValor = tasa_empleo }
                        if(tasa_empleo>maxValor) { maxValor = tasa_empleo }
                    }
                }
            }
        }
        asignarEventos(valores, (groupId,valorActual) => `<strong>ID:</strong> ${groupId}<br/><strong>Valor:</strong> ${valorActual.toFixed(1)}`)
        return {legendTitle, valores,minValor,maxValor}
    }

    function obtenerValoresEes() {
        const legendTitle = 'SALARIO MEDIO'
        let valores = {}
        let minValor = Infinity;
        let maxValor =  -Infinity;
        for(let t of VALUES_MAP.ees) {
            if(t["genero"] == "Hombres" && t["año"] == 2022) {
                const salario = t.salario
                //console.log('T',t)
                if(!valores[`cc-${t.id_comunidad}`]) {
                    valores[`cc-${t.id_comunidad}`] = salario
                    if(salario<minValor) { minValor = salario }
                    if(salario>maxValor) { maxValor = salario }
                } else {
                    if(salario>valores[`cc-${t.id_comunidad}`]) {
                        valores[`cc-${t.id_comunidad}`] = salario
                        if(salario<minValor) { minValor = salario }
                        if(salario>maxValor) { maxValor = salario }
                    }
                }
            }
        }
        asignarEventos(valores, (groupId,valorActual) => `<strong>ID:</strong> ${groupId}<br/><strong>Valor:</strong> ${valorActual.toFixed(1)}`)
        return {legendTitle, valores,minValor,maxValor}
    }

    function obtenerValoresGastos() {
        const legendTitle = 'Medio X hogar'
        let valores = {}
        let minValor = Infinity;
        let maxValor =  -Infinity;
        for(let t of VALUES_MAP.gastos) {
            if(t["año"] == 2022) {
                const gasto = t.gasto
                if(!valores[`cc-${t.id_comunidad}`]) {
                    valores[`cc-${t.id_comunidad}`] = gasto
                    if(gasto<minValor) { minValor = gasto }
                    if(gasto>maxValor) { maxValor = gasto }
                } else {
                    if(gasto>valores[`cc-${t.id_comunidad}`]) {
                        valores[`cc-${t.id_comunidad}`] = gasto
                        if(gasto<minValor) { minValor = gasto }
                        if(gasto>maxValor) { maxValor = gasto }
                    }
                }
            }
        }
        asignarEventos(valores, (groupId,valorActual) => `<strong>ID:</strong> ${groupId}<br/><strong>Valor:</strong> ${valorActual.toFixed(1)}`)
        //console.log({legendTitle, valores,minValor,maxValor})
        return {legendTitle, valores,minValor,maxValor}
    }

    function obtenerValoresTest() {
        const valores = {
            "cc-01": 80.4,
            "cc-02": 82.3,
            "cc-03": 84.6,
            "cc-04": 71.0,
            "cc-05": 90.0,
            "cc-06": 75.0,
            "cc-07": 85.0,
            "cc-08": 79.0,
            "cc-09": 78.0,
            "cc-10": 85.0,
            "cc-11": 81.0,
            "cc-12": 75.0,
            "cc-13": 89.9,
            "cc-14": 81.0,
            "cc-15": 83.0,
            "cc-16": 79.0,
            "cc-17": 77.0,
        };
        asignarEventos(valores, (groupId,valorActual) => `<strong>ID:</strong> ${groupId}<br/><strong>Valor:</strong> ${valorActual.toFixed(1)}`)
        return {
            valores: valores,
            minValor: 70.0,
            maxValor: 90.0,
        }
    }

    function getValues() {
        switch (DATASET_ACTUAL) {
            case 'trabajo':
                return obtenerValoresTrabajo()
            case 'epa':
                return obtenerValoresEpa()
            case 'ees':
                return obtenerValoresEes()
            case 'gastos':
                return obtenerValoresGastos()
        }
        return obtenerValoresTest()
    }

    Promise.all([
        d3.json("colors.json"),
        d3.xml("spain.svg"),
        d3.json("data_output/tiempo_trabajo_por_comunidad.json"),
        d3.json("data_output/epa.json"),
        d3.json("data_output/ees.json"),
        d3.json("data_output/gastos.json"),
    ])
    .then(([colors,xml,trabajo,epa,ees,gastos]) => {
        const nombresColoresDisponibles = Object.keys(colors);
        COLOR_ACTUAL = "orange";

        VALUES_MAP = {
            epa,
            trabajo,
            ees,
            gastos,
        }
        DATASET_NAMES = {
            epa: "Encuesta de Población Activa",
            trabajo: "Horas trabajadas",
            ees: "Encuesta de Estructura Salarial",
            gastos: "Gastos medio por Familias",
        }
        DATASET_ACTUAL = 'epa' // trabajo epa ees gastos

        colorSelect.selectAll("option")
            .data(nombresColoresDisponibles)
            .enter()
            .append("option")
            .attr("value", d => d)
            .attr("selected", d => (d === COLOR_ACTUAL ? "selected" : null))
            .text(d => d.charAt(0).toUpperCase() + d.slice(1));

        datasetSelect.selectAll("option")
            .data(Object.keys(VALUES_MAP))
            .enter()
            .append('option')
            .attr('value', d => d)
            .attr('selected', d => (d==DATASET_ACTUAL ? 'selected' : null))
            .text(d => DATASET_NAMES[d])


        CONFIG = getValues()
        const loadedSvgNode = xml.documentElement;
        svgContainer.node().append(loadedSvgNode);
        GAMA_DE_COLORES_ACTUAL = crearEscalaColorD3(colors,COLOR_ACTUAL,[CONFIG.minValor, CONFIG.maxValor]);
        pintarMapa(CONFIG)

        asignarEventos(CONFIG.valores, (groupId,valorActual) => `<strong>ID:</strong> ${groupId}<br/><strong>Valor:</strong> ${valorActual.toFixed(1)}`)

        // Event listener para el cambio en el <select>
        colorSelect.on("change", function(event) {
            COLOR_ACTUAL = d3.select(this).property("value");
            GAMA_DE_COLORES_ACTUAL = crearEscalaColorD3(colors,COLOR_ACTUAL,[CONFIG.minValor, CONFIG.maxValor]);
            pintarMapa(CONFIG)
        });

        datasetSelect.on('change', function(event) {
            DATASET_ACTUAL = d3.select(this).property("value");
            CONFIG = getValues()
            GAMA_DE_COLORES_ACTUAL = crearEscalaColorD3(colors,COLOR_ACTUAL,[CONFIG.minValor, CONFIG.maxValor]);
            pintarMapa(CONFIG)
        });
    })
    .catch(function(error) {
        console.error("Error al cargar los datos:", error);
        svgContainer.html("<p>Error al cargar los datos. Revisa la consola.</p>");
    });
});