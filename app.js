// ==========================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================
let curG = "Ambos";
let curY = years[years.length - 1];

// Variables para el hardware
let puertoSerial;
let lector;
let pesoMeta = 0; 
let pesoActual = 0;

// Variables de Audio
let reproductorTos;
let reproductorVictoria;
let audioHabilitado = false;

// Configuración inicial del Slider
const slider = document.getElementById("ySlider");
slider.min = 0; 
slider.max = years.length - 1; 
slider.value = years.length - 1;

// ==========================================
// LÓGICA DE AUDIO (Tone.js)
// ==========================================
async function activarAudio() {
    await Tone.start();
    audioHabilitado = true;
    
    // Sonido 1: Tos
    reproductorTos = new Tone.Sampler({
        urls: { "C4": "Audios/sfx-cough15.mp3" },
        release: 1
    }).toDestination();

    // Sonido 2: Victoria 
    reproductorVictoria = new Tone.Sampler({
        urls: { "C4": "Audios/fnaf_sound.mp3" },
        release: 1
    }).toDestination()
    const btn = document.getElementById("btnAudio");
    btn.innerText = "🔊 Audio Listo";
    btn.classList.add("active");
}

// ==========================================
// LÓGICA DE GRÁFICOS (Plotly)
// ==========================================
function getPieLayout(textoCentral, textColor) {
    return {
        showlegend: false,
        margin: {t:20, b:20, l:10, r:10},
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        annotations: [{
            font: {size: 11, color: textColor, weight: "bold"},
            showarrow: false,
            text: textoCentral,
            x: 0.5, y: 0.5
        }]
    };
}

function drawPie(divId, val, label, color) {
    const isLight = document.body.classList.contains("light-mode");
    const textColor = isLight ? "#1f2328" : "#ffffff";
    const emptyColor = isLight ? "#e1e4e8" : "#21262d";
    
    const trace = [{
        values: [val, 100 - val],
        labels: ["Fuman", "No Fuman"],
        type: "pie",
        hole: 0.6,
        marker: { colors: [color, emptyColor] },
        textinfo: "percent",
        hoverinfo: "label"
    }];
    Plotly.react(divId, trace, getPieLayout(label, textColor), {displayModeBar: false});
}

function update() {
    const isLight = document.body.classList.contains("light-mode");
    const themeBg = isLight ? "#ffffff" : "#0e1117";
    const themeText = isLight ? "#1f2328" : "#8b949e";
    
    const data = curG === "Mujeres" ? dataM : (curG === "Hombres" ? dataH : dataA);
    const col = curG === "Mujeres" ? "Porcentaje de mujeres que fuman" : (curG === "Hombres" ? "Distribución de hombres que fuman (%)" : "Promedio");
    const filtered = data.filter(d => d.Year == curY && d[col] !== null);
    
    document.getElementById("yVal").innerText = curY;

    const mapTrace = [{
        type: "choropleth",
        locations: filtered.map(d => d.Code),
        z: filtered.map(d => d[col]),
        text: filtered.map(d => d.Entity),
        colorscale: paletaConfigurada,
        zmin: 0, zmax: 60,
        marker: { line: { color: isLight ? "#d0d7de" : "#30363d", width: 0.5 } },
        colorbar: { title: "%", tickfont: { color: themeText } }
    }];

    const mapLayout = {
        geo: { 
            projection: { type: "natural earth" }, 
            bgcolor: themeBg, 
            showland: true, 
            landcolor: isLight ? "#f6f8fa" : "#21262d", 
            showocean: true, 
            oceancolor: themeBg 
        },
        paper_bgcolor: themeBg, 
        margin: { t: 0, b: 0, l: 0, r: 0 }
    };

    Plotly.react("mapa", mapTrace, mapLayout, {displayModeBar: false}).then(gd => {
        // Evento HOVER (gráficos emergentes)
        gd.on("plotly_hover", d => {
            const pt = d.points[0];
            const val = pt.z;
            const name = pt.text; 
            const hoverDiv = document.getElementById("hover-info");
            
            hoverDiv.style.display = "block";
            drawPie("hover-info", val, name, "#3b8fe8");
        });
        
        gd.on("plotly_unhover", () => {
            document.getElementById("hover-info").style.display = "none";
        });

        gd.on("plotly_click", d => {
            const pt = d.points[0];
            const val = pt.z;

            // 1. Sonido de la Tos (Mapa)
            if (audioHabilitado && reproductorTos) {
                let vol = -40 + ((val || 0) * 0.4); 
                reproductorTos.volume.value = Math.min(vol, 5); 
                reproductorTos.triggerAttackRelease("C4", "8n");
            }

            // 2. Matemática oculta: Porcentaje -> 49 Cigarros -> 4 gramos
            let porcentaje = Math.round(pt.z || 0); 
            let cigarrosMeta = Math.round((porcentaje / 100) * 49); 
            pesoMeta = cigarrosMeta * 4; 

            // 3. Mostrar y actualizar el Panel Flotante
            document.getElementById("panel-hardware").style.display = "block";
            
            document.getElementById("ui-nombre-pais").innerText = pt.text; // País centrado
            document.getElementById("ui-porcentaje-progreso").innerText = "0%"; // Reinicia el progreso
            document.getElementById("ui-porcentaje-progreso").style.color = "#c0392b"; // Color rojo
            
            document.getElementById("ui-peso-meta").innerText = pesoMeta;
            document.getElementById("ui-peso-actual").innerText = pesoActual;
            
            document.getElementById("ui-barra-peso").max = pesoMeta;
            document.getElementById("ui-barra-peso").value = pesoActual;
            
            document.getElementById("ui-mensaje-exito").style.display = "none";
        });
    });

    const sorted = [...filtered].sort((a,b) => b[col] - a[col]);
    const chile = filtered.find(d => d.Entity === "Chile");
    const avgGlobal = filtered.reduce((a,b) => a + b[col], 0) / filtered.length;

    drawPie("pieMax", sorted[0][col], sorted[0].Entity, "#c0392b");
    drawPie("pieAvg", avgGlobal, "Mundial", "#e8a235");
    drawPie("pieChi", chile ? chile[col] : 0, "Chile", "#3b8fe8");
    drawPie("pieMin", sorted[sorted.length-1][col], sorted[sorted.length-1].Entity, "#27ae60");
}

// ==========================================
// LÓGICA DE INTERFAZ (Botones y Sliders)
// ==========================================
function setG(g) {
    curG = g;
    document.getElementById("btnM").classList.remove("active");
    document.getElementById("btnH").classList.remove("active");
    document.getElementById("btnA").classList.remove("active");
    
    if (g === "Mujeres") document.getElementById("btnM").classList.add("active");
    if (g === "Hombres") document.getElementById("btnH").classList.add("active");
    if (g === "Ambos") document.getElementById("btnA").classList.add("active");
    update();
}

function toggleTheme() {
    const body = document.body;
    body.classList.toggle("light-mode");
    const btn = document.getElementById("btnTheme");
    btn.innerText = body.classList.contains("light-mode") ? "☀️" : "🌙";
    update(); 
}

function setY(idx) {
    curY = years[idx];
    update();
}

// ==========================================
// LÓGICA DE HARDWARE
// ==========================================
const btnConectar = document.getElementById('btnConectarBalanza');

btnConectar.addEventListener('click', async () => {
    try {
        puertoSerial = await navigator.serial.requestPort();
        await puertoSerial.open({ baudRate: 9600 });
        
        console.log("Cajetilla conectada exitosamente");
        btnConectar.style.backgroundColor = "green";
        btnConectar.style.color = "white";
        btnConectar.innerText = "Cajetilla Conectada ✓";

        leerDatosDelArduino();
    } catch (error) {
        console.error("Error de conexión:", error);
    }
});

async function leerDatosDelArduino() {
    const decodificador = new TextDecoderStream();
    const inputDone = puertoSerial.readable.pipeTo(decodificador.writable);
    const inputStream = decodificador.readable;
    lector = inputStream.getReader();
    let buffer = ""; 

    while (true) {
        const { value, done } = await lector.read();
        if (done) break;

        buffer += value;
        let lineas = buffer.split('\n');

        while (lineas.length > 1) {
            let datoLimpio = lineas.shift().trim();
            
            if (datoLimpio !== "") {
                pesoActual = parseFloat(datoLimpio);

                // ACTUALIZAR INTERFAZ EN TIEMPO REAL (Si el panel está visible)
                if (!isNaN(pesoActual) && document.getElementById("panel-hardware").style.display === "block") {
                    
                    // 1. Calcular el porcentaje de logro (0 a 100%)
                    let porcentajeLogro = 0;
                    if (pesoMeta > 0) {
                        porcentajeLogro = Math.round((pesoActual / pesoMeta) * 100);
                        if (porcentajeLogro < 0) porcentajeLogro = 0;
                        if (porcentajeLogro > 100) porcentajeLogro = 100;
                    }

                    // 2. Actualizar los números en pantalla
                    document.getElementById("ui-porcentaje-progreso").innerText = porcentajeLogro + "%";
                    document.getElementById("ui-peso-actual").innerText = pesoActual;
                    document.getElementById("ui-barra-peso").value = pesoActual;

                    // CONDICIÓN DE VICTORIA (Tolerancia de 2 gramos)
                    if (pesoMeta > 0 && pesoActual >= (pesoMeta - 3)) {
                        
                        // Forzamos que se vea el 100% en verde al ganar
                        document.getElementById("ui-porcentaje-progreso").innerText = "100%";
                        document.getElementById("ui-porcentaje-progreso").style.color = "#27ae60"; 
                        
                        document.getElementById("ui-mensaje-exito").style.display = "block";
                        
                        if (audioHabilitado && reproductorVictoria) {
                            reproductorVictoria.volume.value = 0; 
                            reproductorVictoria.triggerAttackRelease("C4", "1n"); 
                        }

                    if (pesoMeta > 0 && pesoActual >= (pesoMeta + 3)) {
                        
                    }
                        
                        pesoMeta = 0; 
                    }
                }
            }
        }
        buffer = lineas[0]; 
    }
}

// Inicializar la aplicación
update();