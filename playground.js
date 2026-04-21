/* =====================================================
   PLAYGROUND — ATELIER SPHÈRE GÉNÉRATIVE  v2
   WebGL pur — aucune dépendance CDN
   ===================================================== */

if (document.body.classList.contains('atelier-body')) {
    initAtelier();
}

function initAtelier() {

/* ═══════════════════════════════════════════════════════
   VARIABLES GLOBALES
   ═══════════════════════════════════════════════════════ */
const drawCanvas   = document.getElementById('draw-canvas');
const drawCtx      = drawCanvas.getContext('2d');
const sphereCanvas = document.getElementById('sphere-canvas');

let isDrawing     = false;
let lastX = 0, lastY = 0;
let brushColorHex = '#f95319';
let brushSize     = 16;

let activeColors = [
    [160, 160, 160],
    [100, 100, 100],
];

// WebGL refs
let gl         = null;
let glProgram  = null;
let glUniforms = {};    // { uTime, uGrain, uSoftness, uSpeed, uC0..uC5, uN }
let glBuffers  = {};
let sphereSize = 380;
let rotY = 0, rotX = 0;
let grainVal    = 0.04;   // grain fixe subtil — plus de slider
let softnessVal = 1.8;
let speedVal    = 1.0;
let turbVal     = 1.2;    // intensité du warp FBM (anciennement hardcodé à 1.2)


/* ═══════════════════════════════════════════════════════
   1. DRAWING BOARD
   ═══════════════════════════════════════════════════════ */

function resizeDrawCanvas() {
    const panel = document.querySelector('.draw-panel');
    if (!panel) return;
    const maxH = panel.clientHeight - 290;
    const maxW = panel.clientWidth  -  60;
    const size = Math.max(160, Math.min(maxW, maxH, 420));

    let saved = null;
    if (drawCanvas.width > 0 && drawCanvas.height > 0) {
        saved = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    }
    drawCanvas.width  = size;
    drawCanvas.height = size;
    drawCanvas.style.width  = size + 'px';
    drawCanvas.style.height = size + 'px';
    drawCtx.fillStyle = '#0d0d0d';
    drawCtx.fillRect(0, 0, size, size);
    if (saved) {
        drawCtx.putImageData(saved, 0, 0);
    } else {
        drawIntroText();
    }
}

function drawIntroText() {
    const w = drawCanvas.width, h = drawCanvas.height;
    drawCtx.textAlign    = 'center';
    drawCtx.textBaseline = 'middle';
    drawCtx.fillStyle    = 'rgba(255,255,255,0.08)';
    drawCtx.font         = `400 ${Math.round(w * 0.075)}px Inter, sans-serif`;
    drawCtx.fillText('Peignez vos couleurs', w / 2, h / 2 - 14);
    drawCtx.fillStyle = 'rgba(255,255,255,0.04)';
    drawCtx.font      = `400 ${Math.round(w * 0.055)}px Inter, sans-serif`;
    drawCtx.fillText('→ la sphère les absorbe', w / 2, h / 2 + 16);
    drawCtx.textAlign = 'left';
}

function drawStroke(x, y, px, py) {
    drawCtx.lineWidth   = brushSize;
    drawCtx.lineCap     = 'round';
    drawCtx.lineJoin    = 'round';
    drawCtx.strokeStyle = brushColorHex;
    drawCtx.shadowBlur  = brushSize * 1.2;
    drawCtx.shadowColor = brushColorHex;
    drawCtx.beginPath();
    drawCtx.moveTo(px, py);
    drawCtx.lineTo(x, y);
    drawCtx.stroke();
    drawCtx.shadowBlur = 0;
}

function getCanvasPos(e, canvas) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
}

let _sampleTimer = null;
function scheduleSample() {
    // Throttle : re-sample 200ms après le dernier tracé
    clearTimeout(_sampleTimer);
    _sampleTimer = setTimeout(sampleCanvasColors, 200);
}

drawCanvas.addEventListener('mousedown', e => {
    isDrawing = true;
    const p = getCanvasPos(e, drawCanvas); lastX = p.x; lastY = p.y;
    addColorToPalette(brushColorHex); // feedback immédiat
});
window.addEventListener('mousemove', e => {
    if (!isDrawing) return;
    const p = getCanvasPos(e, drawCanvas);
    drawStroke(p.x, p.y, lastX, lastY); lastX = p.x; lastY = p.y;
    scheduleSample(); // sampling continu throttlé
});
window.addEventListener('mouseup', () => {
    if (isDrawing) sampleCanvasColors(); // sync final à la fin du tracé
    isDrawing = false;
});
drawCanvas.addEventListener('touchstart', e => {
    e.preventDefault(); isDrawing = true;
    const p = getCanvasPos(e, drawCanvas); lastX = p.x; lastY = p.y;
    addColorToPalette(brushColorHex);
}, { passive: false });
drawCanvas.addEventListener('touchmove', e => {
    if (!isDrawing) return; e.preventDefault();
    const p = getCanvasPos(e, drawCanvas);
    drawStroke(p.x, p.y, lastX, lastY); lastX = p.x; lastY = p.y;
    scheduleSample();
}, { passive: false });
drawCanvas.addEventListener('touchend', () => {
    if (isDrawing) sampleCanvasColors();
    isDrawing = false;
});


/* ═══════════════════════════════════════════════════════
   2. GESTION PALETTE
   ═══════════════════════════════════════════════════════ */

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function colorDist(a, b) {
    return Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]);
}
function addColorToPalette(hex) {
    const rgb = hexToRgb(hex);
    if (activeColors.some(c => colorDist(c, rgb) < 45)) return;
    // Remplacer les gris par défaut dès que l'user peint
    if (activeColors.length <= 2 && activeColors.every(c => Math.abs(c[0]-c[1]) < 10)) {
        activeColors = [rgb];
    } else {
        activeColors.push(rgb);
        if (activeColors.length > 6) activeColors.shift();
    }
    updatePaletteDisplay();
    syncSphereColors();
}

/* Analyse les pixels peints sur le canvas et extrait les couleurs dominantes */
function sampleCanvasColors() {
    const w = drawCanvas.width, h = drawCanvas.height;
    if (w === 0 || h === 0) return;
    const data = drawCtx.getImageData(0, 0, w, h).data;
    const buckets = {};
    const step = 6; // 1 pixel sur 6
    for (let i = 0; i < data.length; i += 4 * step) {
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        // Ignorer fond noir / pixels transparents / teintes quasi-neutres très sombres
        if (a < 200) continue;
        if (r < 25 && g < 25 && b < 25) continue;
        // Quantifier en buckets de 24 niveaux
        const br = Math.round(r / 24) * 24;
        const bg_ = Math.round(g / 24) * 24;
        const bb = Math.round(b / 24) * 24;
        const key = `${br},${bg_},${bb}`;
        buckets[key] = (buckets[key] || 0) + 1;
    }
    const sorted = Object.entries(buckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([key]) => key.split(',').map(Number));
    if (sorted.length >= 1) {
        activeColors = sorted;
        updatePaletteDisplay();
        syncSphereColors();
    }
}
function updatePaletteDisplay() {
    const container = document.getElementById('palette-dots');
    if (!container) return;
    container.innerHTML = '';
    activeColors.forEach(([r, g, b], i) => {
        const chip = document.createElement('div');
        chip.className = 'palette-chip';

        const dot = document.createElement('span');
        dot.className = 'palette-dot';
        dot.style.background = `rgb(${r},${g},${b})`;

        const btn = document.createElement('button');
        btn.className = 'chip-remove';
        btn.innerHTML = '×';
        btn.title = 'Supprimer cette couleur';
        btn.addEventListener('click', e => {
            e.stopPropagation();
            removeColorFromPalette(i);
        });

        chip.appendChild(dot);
        chip.appendChild(btn);
        container.appendChild(chip);
    });
}

function removeColorFromPalette(index) {
    activeColors.splice(index, 1);
    // Si palette vide → revenir aux gris par défaut
    if (activeColors.length === 0) {
        activeColors = [[160, 160, 160], [100, 100, 100]];
    }
    updatePaletteDisplay();
    syncSphereColors();
}
function syncSphereColors() {
    if (!gl || !glProgram) return;
    gl.useProgram(glProgram);
    const n = Math.min(activeColors.length, 6);
    gl.uniform1i(glUniforms.uN, n);
    for (let i = 0; i < 6; i++) {
        const c = activeColors[i] || activeColors[activeColors.length - 1] || [128,128,128];
        gl.uniform3f(glUniforms['uC' + i], c[0]/255, c[1]/255, c[2]/255);
    }
    // Shadow dynamique : couleur dominante de la palette → box-shadow design
    updateSphereShadow();
}

function updateSphereShadow() {
    if (!sphereCanvas || activeColors.length === 0) return;
    // Mélange les 2 premières couleurs pour l'ombre
    const c1 = activeColors[0] || [140,130,120];
    const c2 = activeColors[Math.min(1, activeColors.length-1)] || c1;
    // Ombre principale (couleur 1) + ombre secondaire (couleur 2)
    const s1 = `0 55px 130px rgba(${c1[0]},${c1[1]},${c1[2]},0.32)`;
    const s2 = `0 20px 60px rgba(${c2[0]},${c2[1]},${c2[2]},0.18)`;
    const s3 = `0 4px 16px rgba(0,0,0,0.10)`;
    sphereCanvas.style.boxShadow = `${s1}, ${s2}, ${s3}`;
}
function clearDrawing() {
    drawCtx.fillStyle = '#0d0d0d';
    drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawIntroText();
    activeColors = [[160,160,160],[100,100,100]];
    updatePaletteDisplay();
    syncSphereColors();
}


/* ═══════════════════════════════════════════════════════
   3. SPHÈRE — WebGL PUR
   ═══════════════════════════════════════════════════════ */

/* ── Matrices 4×4 column-major ─ */
function m4identity()          { const m=new Float32Array(16); m[0]=m[5]=m[10]=m[15]=1; return m; }
function m4mul(a, b) {
    const o = new Float32Array(16);
    for (let c=0;c<4;c++) for(let r=0;r<4;r++) {
        let s=0; for(let k=0;k<4;k++) s+=a[k*4+r]*b[c*4+k]; o[c*4+r]=s;
    }
    return o;
}
function m4perspective(fovY, near, far) {
    const f=1/Math.tan(fovY/2), nf=1/(near-far);
    return new Float32Array([f,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
}
function m4translation(tx,ty,tz) {
    const m=m4identity(); m[12]=tx; m[13]=ty; m[14]=tz; return m;
}
function m4rotX(a) {
    const c=Math.cos(a),s=Math.sin(a);
    return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);
}
function m4rotY(a) {
    const c=Math.cos(a),s=Math.sin(a);
    return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);
}
function m3fromM4(m) {
    return new Float32Array([m[0],m[1],m[2], m[4],m[5],m[6], m[8],m[9],m[10]]);
}

/* ── Génération sphère UV ─ */
function buildSphere(seg) {
    const positions=[], normals=[], indices=[];
    for(let i=0;i<=seg;i++) {
        const theta=i/seg*Math.PI, sinT=Math.sin(theta), cosT=Math.cos(theta);
        for(let j=0;j<=seg;j++) {
            const phi=j/seg*2*Math.PI;
            const x=sinT*Math.cos(phi), y=cosT, z=sinT*Math.sin(phi);
            positions.push(x,y,z); normals.push(x,y,z);
        }
    }
    for(let i=0;i<seg;i++) for(let j=0;j<seg;j++) {
        const a=i*(seg+1)+j, b=a+(seg+1);
        indices.push(a,b,a+1, b,b+1,a+1);
    }
    return {
        pos: new Float32Array(positions),
        nor: new Float32Array(normals),
        idx: new Uint16Array(indices),
        count: indices.length
    };
}

/* ── Shaders ─ */
const VS = `
    attribute vec3 aPos;
    attribute vec3 aNor;
    uniform mat4 uMVP;
    uniform mat4 uMV;
    uniform mat3 uNM;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewDir;
    void main(){
        vNormal   = normalize(uNM * aNor);
        vPosition = aPos;
        vec4 mvp  = uMV * vec4(aPos, 1.0);
        vViewDir  = normalize(-mvp.xyz);
        gl_Position = uMVP * vec4(aPos, 1.0);
    }
`;

const FS = `
    precision highp float;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewDir;

    uniform vec3  uC0, uC1, uC2, uC3, uC4, uC5;
    uniform int   uN;
    uniform float uTime;
    uniform float uGrain;
    uniform float uSoftness;
    uniform float uSpeed;
    uniform float uTurb;

    float hash(float n){ return fract(sin(n)*43758.5453); }
    float hash2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

    float noise(vec3 p){
        vec3 i=floor(p), f=fract(p);
        f=f*f*(3.0-2.0*f);
        float n=i.x+i.y*57.0+113.0*i.z;
        return mix(
            mix(mix(hash(n),hash(n+1.0),f.x),mix(hash(n+57.0),hash(n+58.0),f.x),f.y),
            mix(mix(hash(n+113.0),hash(n+114.0),f.x),mix(hash(n+170.0),hash(n+171.0),f.x),f.y),
            f.z);
    }
    float fbm(vec3 p){
        float v=0.0,a=0.5;
        for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.1; a*=0.5; }
        return v;
    }

    vec3 palette(float t){
        float pos = clamp(t,0.0,0.9999)*float(uN<=1?1:uN-1);
        vec3 lo=uC0, hi=uC1;
        float f=pos;
        if(pos>=4.0){lo=uC4;hi=uC5;f=pos-4.0;}
        else if(pos>=3.0){lo=uC3;hi=uC4;f=pos-3.0;}
        else if(pos>=2.0){lo=uC2;hi=uC3;f=pos-2.0;}
        else if(pos>=1.0){lo=uC1;hi=uC2;f=pos-1.0;}
        return mix(lo,hi,clamp(f,0.0,1.0));
    }

    void main(){
        float NdotV = max(dot(vNormal,vViewDir),0.0);
        float s = 0.055*uSpeed;
        vec3 p0 = vPosition*uSoftness + vec3(uTime*s,uTime*s*0.7,uTime*s*0.5);
        vec3 warp = vec3(fbm(p0),fbm(p0+vec3(1.7,9.2,3.4)),fbm(p0+vec3(8.3,2.8,5.1)));
        float n   = fbm(p0+warp*uTurb);
        float t   = (vPosition.y+1.0)*0.5;
        float blend = clamp(t+(n-0.5)*0.88,0.0,1.0);
        vec3 color  = palette(blend);

        color *= 0.72+0.28*pow(NdotV,0.35);
        float fresnel = pow(1.0-NdotV,2.2);
        color += fresnel*palette(1.0-blend)*0.45;

        vec3 light = normalize(vec3(-0.8,1.5,2.0));
        color += pow(max(dot(vNormal,light),0.0),52.0)*0.4*vec3(1.0,0.96,0.9);
        color += (hash2(gl_FragCoord.xy)*2.0-1.0)*uGrain;

        /* Fondu aux bords vers le fond crème */
        vec3 bg = vec3(0.941,0.933,0.922);
        color   = mix(bg, clamp(color,0.0,1.0), pow(NdotV,0.38));

        gl_FragColor = vec4(color, 1.0);
    }
`;

function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
    }
    return s;
}

function resizeSphereCanvas() {
    if (!gl) return;
    const panel = document.querySelector('.sphere-panel');
    const w = panel ? panel.clientWidth  : window.innerWidth  * 0.45;
    const h = panel ? panel.clientHeight : window.innerHeight;
    // Sphère plus petite et bien centrée dans le panneau
    const computed = Math.floor(Math.min(w * 0.58, h * 0.58, 360));
    const displaySize = computed >= 80 ? computed : 300;
    // ⚠️ Ne JAMAIS changer canvas.width/height après getContext → reset WebGL sur Safari
    sphereCanvas.style.width  = displaySize + 'px';
    sphereCanvas.style.height = displaySize + 'px';
}

function setStatus(msg) {
    // Debug supprimé — console uniquement
    console.log('[Sphere]', msg);
}

function initThree() {
    setStatus('initThree() démarré');
    if (!sphereCanvas) { setStatus('ERREUR: canvas introuvable'); return; }

    /* ── Taille fixée AVANT getContext pour éviter le reset WebGL sur Safari ─ */
    sphereCanvas.width  = sphereSize;   // 380 — résolution interne fixe
    sphereCanvas.height = sphereSize;
    sphereCanvas.style.width  = sphereSize + 'px';
    sphereCanvas.style.height = sphereSize + 'px';

    /* ── Contexte WebGL — créé APRÈS avoir fixé la taille ─ */
    gl = sphereCanvas.getContext('webgl', { preserveDrawingBuffer: true })
      || sphereCanvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
    if (!gl) { setStatus('ERREUR: WebGL non supporté'); return; }
    setStatus('WebGL OK');

    gl.viewport(0, 0, sphereSize, sphereSize);

    /* ── Compilation shaders ─ */
    setStatus('Compilation shaders...');
    const vs = compileShader(gl.VERTEX_SHADER,   VS);
    const fs = compileShader(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { setStatus('ERREUR: shader invalide — voir console'); return; }
    setStatus('Shaders OK');

    glProgram = gl.createProgram();
    gl.attachShader(glProgram, vs);
    gl.attachShader(glProgram, fs);
    gl.linkProgram(glProgram);
    if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
        setStatus('ERREUR: link — ' + gl.getProgramInfoLog(glProgram));
        return;
    }
    gl.useProgram(glProgram);
    setStatus('Programme lié OK');

    /* ── Uniforms ─ */
    ['uMVP','uMV','uNM','uTime','uGrain','uSoftness','uSpeed','uTurb',
     'uN','uC0','uC1','uC2','uC3','uC4','uC5'].forEach(name => {
        glUniforms[name] = gl.getUniformLocation(glProgram, name);
    });

    /* ── Géométrie sphère ─ */
    const sphere = buildSphere(64);
    glBuffers.count = sphere.count;

    const posVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posVBO);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.pos, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(glProgram, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

    const norVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, norVBO);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.nor, gl.STATIC_DRAW);
    const aNor = gl.getAttribLocation(glProgram, 'aNor');
    gl.enableVertexAttribArray(aNor);
    gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);

    const idxVBO = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxVBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.idx, gl.STATIC_DRAW);

    /* ── État GL ─ */
    gl.clearColor(0.941, 0.933, 0.922, 1.0);  // #f0eeeb crème
    gl.enable(gl.DEPTH_TEST);

    /* ── Matrices de caméra (fixes) ─ */
    const proj = m4perspective(45 * Math.PI / 180, 0.1, 100.0);
    // camZ=2.35 : la sphère remplit exactement le canvas → plus d'anneau blanc
    const camZ = 2.35;

    /* ── Couleurs initiales ─ */
    syncSphereColors();
    gl.uniform1f(glUniforms.uGrain,    grainVal);
    gl.uniform1f(glUniforms.uSoftness, softnessVal);
    gl.uniform1f(glUniforms.uSpeed,    speedVal);
    gl.uniform1f(glUniforms.uTurb,     turbVal);

    /* ── Boucle d'animation ─ */
    let time = 0;
    (function animate() {
        requestAnimationFrame(animate);
        time  += 0.010;
        rotY  += 0.004 * speedVal;
        rotX  += 0.001 * speedVal;

        /* Matrices modèle + vue */
        const model = m4mul(m4rotY(rotY), m4rotX(rotX));
        const view  = m4translation(0, 0, -camZ);
        const mv    = m4mul(view, model);
        const mvp   = m4mul(proj, mv);
        const nm    = m3fromM4(mv);

        gl.uniformMatrix4fv(glUniforms.uMVP, false, mvp);
        gl.uniformMatrix4fv(glUniforms.uMV,  false, mv);
        gl.uniformMatrix3fv(glUniforms.uNM,  false, nm);
        gl.uniform1f(glUniforms.uTime, time);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, glBuffers.count, gl.UNSIGNED_SHORT, 0);
    })();

    setStatus('Rendu actif ✓');

    /* ── Ajustement CSS uniquement (pas de reset canvas) ─ */
    setTimeout(resizeSphereCanvas, 100);
}


/* ═══════════════════════════════════════════════════════
   4. CONTRÔLES UI
   ═══════════════════════════════════════════════════════ */

/* ── Swatches ─ */
document.querySelectorAll('.preset-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
        brushColorHex = btn.dataset.color;
        document.querySelectorAll('.preset-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const inp = document.getElementById('brush-color');
        if (inp) inp.value = brushColorHex;
    });
});

/* ── Color picker ─ */
const brushColorInput = document.getElementById('brush-color');
if (brushColorInput) {
    brushColorInput.value = brushColorHex;
    brushColorInput.addEventListener('input', e => {
        brushColorHex = e.target.value;
        document.querySelectorAll('.preset-swatch').forEach(b => b.classList.remove('active'));
    });
}

/* ── Effacer ─ */
const clearBtn = document.getElementById('clear-draw');
if (clearBtn) clearBtn.addEventListener('click', clearDrawing);

/* ── Turbulence ─ */
const turbSlider = document.getElementById('turb-slider');
if (turbSlider) {
    turbSlider.addEventListener('input', e => {
        turbVal = (e.target.value / 100) * 3.5;  // 0 = lisse, 3.5 = très tourbillonnant
        if (gl && glProgram) { gl.useProgram(glProgram); gl.uniform1f(glUniforms.uTurb, turbVal); }
    });
}

/* ── Douceur ─ */
const douceurSlider = document.getElementById('douceur-slider');
if (douceurSlider) {
    douceurSlider.addEventListener('input', e => {
        const v = e.target.value / 100;
        softnessVal = 3.0 - v * 2.2;
        if (gl && glProgram) { gl.useProgram(glProgram); gl.uniform1f(glUniforms.uSoftness, softnessVal); }
        if (sphereCanvas) sphereCanvas.style.filter = `blur(${v * 14}px)`;
    });
}

/* ── Vitesse ─ */
const speedSlider = document.getElementById('speed-slider');
if (speedSlider) {
    speedSlider.addEventListener('input', e => {
        speedVal = (e.target.value / 100) * 2.5;
        if (gl && glProgram) { gl.useProgram(glProgram); gl.uniform1f(glUniforms.uSpeed, speedVal); }
    });
}

/* ── Exporter ─ */
const exportBtn = document.getElementById('export-btn');
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        if (!sphereCanvas) return;
        const link    = document.createElement('a');
        link.download = `sphere-${Date.now()}.png`;
        link.href     = sphereCanvas.toDataURL('image/png');
        link.click();
    });
}


/* ═══════════════════════════════════════════════════════
   5. INIT & RESIZE
   ═══════════════════════════════════════════════════════ */

function init() {
    resizeDrawCanvas();
    initThree();
    updatePaletteDisplay();
    syncSphereColors();
}

window.addEventListener('resize', () => {
    resizeDrawCanvas();
    resizeSphereCanvas();
});

init();

} // fin initAtelier
